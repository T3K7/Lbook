#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const MAX_LINES = 300;

export const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  'build',
  '.git',
  '.cache',
  '.turbo',
  '.aistudio'
]);

/**
 * Accurately counts the lines of a text file.
 * - Handles empty files (0 lines).
 * - Handles CRLF (\r\n), CR (\r), and LF (\n).
 * - Does not falsely count a single trailing newline as an extra line:
 *   e.g. 300 lines terminated by newline -> 300 lines.
 *   e.g. 301 lines terminated by newline -> 301 lines.
 *   e.g. 300 lines with an extra trailing blank line -> 301 lines.
 */
export function countLines(content) {
  if (!content) return 0;
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (normalized.length === 0) return 0;
  const contentToSplit = normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized;
  return contentToSplit.split('\n').length;
}

/**
 * Standard GitHub/CommonMark slugifier with Unicode letter support.
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '') // Keep Unicode letters, digits, whitespace, and hyphens
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Accent-folding helper for Vietnamese/diacritic-insensitive anchor matching fallback.
 */
export function foldDiacritics(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gu, 'd')
    .replace(/Đ/gu, 'd');
}

/**
 * Extracts valid anchor slugs (headings and explicit HTML anchors) from Markdown content.
 */
export function extractAnchors(content) {
  // Strip fenced code blocks (```...``` and ~~~...~~~) to avoid false heading matches
  const stripped = content
    .replace(/^```[\s\S]*?^```/gm, '')
    .replace(/^~~~[\s\S]*?^~~~/gm, '');

  const validAnchors = new Set();
  const rawCounts = new Map();

  // 1. Markdown headings (# Heading)
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(stripped)) !== null) {
    const rawHeading = match[2]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) -> text
      .replace(/`([^`]+)`/g, '$1')              // `code` -> code
      .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, '$1') // formatting
      .trim();

    const baseSlug = slugify(rawHeading);
    if (!baseSlug) continue;

    const count = rawCounts.get(baseSlug) || 0;
    const slug = count > 0 ? `${baseSlug}-${count}` : baseSlug;
    rawCounts.set(baseSlug, count + 1);

    validAnchors.add(slug);
    validAnchors.add(encodeURIComponent(slug));
    validAnchors.add(foldDiacritics(slug));
  }

  // 2. Explicit HTML anchors: <a id="..."> or <a name="...">
  const htmlTagRegex = /<(?:a|span|div)\s+[^>]*(?:id|name)=["']([^"']+)["'][^>]*>/gi;
  while ((match = htmlTagRegex.exec(stripped)) !== null) {
    const idVal = match[1].trim();
    validAnchors.add(idVal);
    validAnchors.add(idVal.toLowerCase());
    validAnchors.add(slugify(idVal));
  }

  return validAnchors;
}

/**
 * Finds all Markdown files in the managed scope recursively.
 */
export function findManagedMarkdownFiles(rootDir, excludedDirs = EXCLUDED_DIRS) {
  const results = [];

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (excludedDirs.has(entry.name)) {
          continue;
        }
        walk(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return results.sort();
}

/**
 * Extracts links from Markdown content with line numbers.
 */
export function extractLinks(content) {
  const links = [];
  // Match standard inline links: [text](target) and images ![alt](target)
  const linkRegex = /!?\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const rawTarget = match[2].trim();
    const line = content.substring(0, match.index).split('\n').length;

    let target = rawTarget.trim();

    // Clean optional title: target "Optional Title" or <target> "Optional Title"
    const titleMatch = target.match(/^(\S+)\s+["'].*["']$/);
    if (titleMatch) {
      target = titleMatch[1];
    }

    // Clean enclosed brackets: <path/to/file>
    target = target.replace(/^<|>$/g, '').trim();

    links.push({
      text: match[1],
      target,
      line
    });
  }

  return links;
}

/**
 * Validates a single link against the file system and anchor definitions.
 */
export function validateLink(sourceFilePath, linkItem, anchorCache) {
  const { target, line, text } = linkItem;

  // 1. Filter out external schemes
  const externalSchemes = ['http://', 'https://', 'ftp://', 'mailto:', 'tel:', 'javascript:', 'data:', '//'];
  if (externalSchemes.some(scheme => target.toLowerCase().startsWith(scheme))) {
    return { type: 'external', valid: true };
  }

  let filePathPart = target;
  let anchorPart = null;

  if (target.includes('#')) {
    const hashIdx = target.indexOf('#');
    filePathPart = target.substring(0, hashIdx);
    anchorPart = target.substring(hashIdx + 1);
  }

  // 2. Pure fragment anchor within the same file: [Section](#heading)
  if (!filePathPart) {
    if (!anchorPart) {
      return {
        type: 'internal',
        valid: false,
        error: `Empty anchor link [#]`,
        line
      };
    }

    let anchors = anchorCache.get(sourceFilePath);
    if (!anchors) {
      anchors = extractAnchors(fs.readFileSync(sourceFilePath, 'utf-8'));
      anchorCache.set(sourceFilePath, anchors);
    }

    const decodedAnchor = decodeURIComponent(anchorPart).toLowerCase();
    const isAnchorValid = anchors.has(anchorPart) ||
                          anchors.has(decodedAnchor) ||
                          anchors.has(foldDiacritics(decodedAnchor));

    if (!isAnchorValid) {
      return {
        type: 'internal',
        valid: false,
        error: `Anchor "#${anchorPart}" not found in current file`,
        line
      };
    }

    return { type: 'internal', valid: true, line };
  }

  // 3. Relative or repository-absolute path to file or directory
  let decodedPathPart;
  try {
    decodedPathPart = decodeURIComponent(filePathPart);
  } catch {
    decodedPathPart = filePathPart;
  }

  let resolvedPath;
  if (decodedPathPart.startsWith('/')) {
    // Treat absolute slash as relative to repo root
    resolvedPath = path.join(ROOT_DIR, decodedPathPart.slice(1));
  } else {
    resolvedPath = path.resolve(path.dirname(sourceFilePath), decodedPathPart);
  }

  if (!fs.existsSync(resolvedPath)) {
    return {
      type: 'internal',
      valid: false,
      error: `Target path does not exist: "${path.relative(ROOT_DIR, resolvedPath)}"`,
      target,
      resolvedPath,
      line
    };
  }

  // Check target if it's a directory
  const stat = fs.statSync(resolvedPath);
  if (stat.isDirectory()) {
    return { type: 'internal', valid: true, line };
  }

  // 4. Target is a file: if anchor is present and file is Markdown, validate anchor
  if (anchorPart && (resolvedPath.endsWith('.md') || resolvedPath.endsWith('.markdown'))) {
    let anchors = anchorCache.get(resolvedPath);
    if (!anchors) {
      anchors = extractAnchors(fs.readFileSync(resolvedPath, 'utf-8'));
      anchorCache.set(resolvedPath, anchors);
    }

    const decodedAnchor = decodeURIComponent(anchorPart).toLowerCase();
    const isAnchorValid = anchors.has(anchorPart) ||
                          anchors.has(decodedAnchor) ||
                          anchors.has(foldDiacritics(decodedAnchor));

    if (!isAnchorValid) {
      return {
        type: 'internal',
        valid: false,
        error: `Anchor "#${anchorPart}" not found in target file "${path.relative(ROOT_DIR, resolvedPath)}"`,
        target,
        resolvedPath,
        line
      };
    }
  }

  return { type: 'internal', valid: true, line };
}

/**
 * Self-test suite to verify countLines, anchor extraction, and link validation logic.
 */
export function runSelfTest() {
  console.log('🧪 Running check-docs internal self-tests...\n');
  let testCount = 0;
  let passCount = 0;

  function assert(condition, message) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✅ [PASS] ${message}`);
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // Test line counting
  assert(countLines('') === 0, 'Empty content produces 0 lines');
  assert(countLines('hello') === 1, 'Single line without newline produces 1 line');
  assert(countLines('hello\n') === 1, 'Single line with trailing LF newline produces 1 line (not 2)');
  assert(countLines('hello\r\n') === 1, 'Single line with trailing CRLF newline produces 1 line (not 2)');
  assert(countLines('line1\nline2\n') === 2, 'Two lines with trailing newline produces 2 lines (not 3)');
  assert(countLines('line1\r\nline2\r\n') === 2, 'Two lines CRLF produces 2 lines');

  const lines300 = Array(300).fill('const x = 1;').join('\n') + '\n';
  assert(countLines(lines300) === 300, '300 lines with trailing newline produces exactly 300 lines');

  const lines301 = Array(301).fill('const x = 1;').join('\n') + '\n';
  assert(countLines(lines301) === 301, '301 lines with trailing newline produces 301 lines (detected)');

  const lines300WithExtraBlank = Array(300).fill('const x = 1;').join('\n') + '\n\n';
  assert(countLines(lines300WithExtraBlank) === 301, '300 lines + extra newline at EOF is detected as 301 lines');

  // Test slugifier & anchors
  assert(slugify('1. Mục tiêu dự án') === '1-mục-tiêu-dự-án', 'Slugify preserves Unicode diacritics and removes dot');
  assert(slugify('TTS & Audio Pipeline!') === 'tts-audio-pipeline', 'Slugify handles symbols & ampersand');

  const sampleMd = `
# Lbook System
## 1. Mục tiêu & Giới hạn
<a id="custom-anchor"></a>
### Chi tiết
## 1. Mục tiêu & Giới hạn
\`\`\`bash
# Not a heading
\`\`\`
`;
  const anchors = extractAnchors(sampleMd);
  assert(anchors.has('1-mục-tiêu-giới-hạn'), 'Extracts primary heading slug');
  assert(anchors.has('1-muc-tieu-gioi-han'), 'Extracts accent-folded fallback slug');
  assert(anchors.has('1-mục-tiêu-giới-hạn-1'), 'Handles duplicate heading with -1 suffix');
  assert(anchors.has('custom-anchor'), 'Extracts HTML id anchor');
  assert(!anchors.has('not-a-heading'), 'Ignores comment inside fenced code block');

  // Test link parser
  const links = extractLinks('See [Status](./PROJECT_STATUS.md) and [Guide](<./PACKAGING_GUIDE.md> "Guide").');
  assert(links.length === 2, 'Extracts 2 inline links correctly');
  assert(links[0].target === './PROJECT_STATUS.md', 'Extracts target 1');
  assert(links[1].target === './PACKAGING_GUIDE.md', 'Extracts target with angle brackets and title');

  console.log(`\nSelf-test Results: ${passCount}/${testCount} tests passed.\n`);
  return passCount === testCount;
}

/**
 * Main execution function.
 */
export function runCheck() {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    const success = runSelfTest();
    process.exit(success ? 0 : 1);
  }

  console.log('================================================================');
  console.log(' 📚 LBOOK DOCUMENTATION AUDIT & LINK INTEGRITY CHECKER');
  console.log('================================================================');
  console.log(`📋 Scanning scope: Managed Markdown files across repository`);
  console.log(`🚫 Excluded folders: ${Array.from(EXCLUDED_DIRS).join(', ')}`);
  console.log(`📏 Line limit rule : Maximum ${MAX_LINES} lines per file (Strict)`);
  console.log(`🔗 Link validator  : File paths, relative paths, directories & anchors`);
  console.log(`ℹ️ Known limits    : External URLs (http/https/mailto) skipped (offline-safe).`);
  console.log('----------------------------------------------------------------\n');

  const files = findManagedMarkdownFiles(ROOT_DIR);
  if (files.length === 0) {
    console.error('❌ Error: No managed Markdown files found to audit.');
    process.exit(1);
  }

  let lineViolations = [];
  let brokenLinks = [];
  let totalCheckedLinks = 0;
  let totalSkippedExternalLinks = 0;

  const anchorCache = new Map();

  console.log(`🔍 [Phase 1/2] Checking ${files.length} Markdown files for ${MAX_LINES}-line limit...\n`);

  for (const filePath of files) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = countLines(content);

    if (lines > MAX_LINES) {
      lineViolations.push({ path: relativePath, lines });
      console.error(`  ❌ ${relativePath}: ${lines} lines (EXCEEDS ${MAX_LINES})`);
    } else {
      console.log(`  ✅ ${relativePath.padEnd(52)} : ${String(lines).padStart(3)} lines`);
    }
  }

  console.log(`\n🔍 [Phase 2/2] Checking link & anchor integrity across all files...\n`);

  for (const filePath of files) {
    const relativePath = path.relative(ROOT_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const links = extractLinks(content);

    for (const linkItem of links) {
      const result = validateLink(filePath, linkItem, anchorCache);
      if (result.type === 'external') {
        totalSkippedExternalLinks++;
      } else {
        totalCheckedLinks++;
        if (!result.valid) {
          brokenLinks.push({
            sourceFile: relativePath,
            line: result.line,
            target: linkItem.target,
            text: linkItem.text,
            error: result.error
          });
          console.error(`  ❌ ${relativePath}:${result.line}: [${linkItem.text}](${linkItem.target}) -> ${result.error}`);
        }
      }
    }
  }

  console.log('\n================================================================');
  console.log(' 📊 AUDIT SUMMARY REPORT');
  console.log('================================================================');
  console.log(`📁 Total Markdown files audited : ${files.length}`);
  console.log(`📏 Line limit violations         : ${lineViolations.length}`);
  console.log(`🔗 Internal links verified       : ${totalCheckedLinks}`);
  console.log(`🌐 External links skipped (safe) : ${totalSkippedExternalLinks}`);
  console.log(`💔 Broken internal links found   : ${brokenLinks.length}`);
  console.log('----------------------------------------------------------------');

  let hasErrors = false;

  if (lineViolations.length > 0) {
    hasErrors = true;
    console.error(`\n❌ FAILED: ${lineViolations.length} file(s) exceeded the ${MAX_LINES}-line limit:`);
    for (const v of lineViolations) {
      console.error(`   - ${v.path}: ${v.lines} lines (Limit: ${MAX_LINES})`);
    }
  } else {
    console.log(`🎉 Line Limit Check : PASSED (All ${files.length} files $\\le$ ${MAX_LINES} lines)`);
  }

  if (brokenLinks.length > 0) {
    hasErrors = true;
    console.error(`\n❌ FAILED: ${brokenLinks.length} broken internal link(s) detected:`);
    for (const b of brokenLinks) {
      console.error(`   - In ${b.sourceFile}:${b.line}: [${b.text}](${b.target})`);
      console.error(`     Reason: ${b.error}`);
    }
  } else {
    console.log(`🎉 Link Integrity   : PASSED (All ${totalCheckedLinks} internal links verified valid)`);
  }

  console.log('================================================================\n');

  if (hasErrors) {
    console.error('⛔ DOCUMENTATION AUDIT FAILED.\n');
    process.exit(1);
  } else {
    console.log('✅ ALL DOCUMENTATION CHECKS PASSED (100% Health Status).\n');
    process.exit(0);
  }
}

// Auto-run when executed directly
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  runCheck();
}
