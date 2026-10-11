import JSZip from 'jszip';
import { Chapter, Paragraph } from '../types';
import { splitIntoSentences } from './sentenceSplitter';

export interface EpubParseResult {
  title: string;
  author: string;
  description: string;
  language: string;
  coverImage?: string;
  chapters: Chapter[];
}

export async function parseEpubFile(fileBuffer: ArrayBuffer, bookId: string): Promise<EpubParseResult> {
  const zip = await JSZip.loadAsync(fileBuffer);

  // 1. Locate container.xml to find OPF path
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) {
    throw new Error('Không tìm thấy META-INF/container.xml trong tệp EPUB.');
  }

  const opfPathMatch = containerXml.match(/full-path=["']([^"']+)["']/i);
  const opfPath = opfPathMatch ? opfPathMatch[1] : 'OEBPS/content.opf';
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  const opfContent = await zip.file(opfPath)?.async('text');
  if (!opfContent) {
    throw new Error(`Không thể đọc tệp thông tin sách tại ${opfPath}`);
  }

  // 2. Extract Metadata
  const titleMatch = opfContent.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/i);
  const title = titleMatch ? decodeXml(titleMatch[1].trim()) : 'Sách chưa đặt tên';

  const authorMatch = opfContent.match(/<dc:creator[^>]*>([^<]+)<\/dc:creator>/i);
  const author = authorMatch ? decodeXml(authorMatch[1].trim()) : 'Khuyết danh';

  const descMatch = opfContent.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);
  const description = descMatch ? stripHtml(descMatch[1].trim()) : '';

  const langMatch = opfContent.match(/<dc:language[^>]*>([^<]+)<\/dc:language>/i);
  const language = langMatch ? langMatch[1].trim() : 'vi';

  // 3. Manifest items
  const manifestItems: Record<string, { href: string; mediaType: string }> = {};
  const itemRegex = /<item\s+[^>]*?id=["']([^"']+)["'][^>]*?href=["']([^"']+)["'][^>]*?media-type=["']([^"']+)["'][^>]*?>/gi;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemRegex.exec(opfContent)) !== null) {
    manifestItems[itemMatch[1]] = {
      href: itemMatch[2],
      mediaType: itemMatch[3],
    };
  }

  // Cover image extraction
  let coverImage: string | undefined;
  const coverMetaMatch = opfContent.match(/<meta\s+name=["']cover["']\s+content=["']([^"']+)["']/i);
  let coverHref = coverMetaMatch ? manifestItems[coverMetaMatch[1]]?.href : undefined;
  if (!coverHref) {
    // Check manifest for cover id or image item
    for (const id in manifestItems) {
      if (id.toLowerCase().includes('cover') && manifestItems[id].mediaType.startsWith('image/')) {
        coverHref = manifestItems[id].href;
        break;
      }
    }
  }

  if (coverHref) {
    const fullCoverPath = resolveZipPath(opfDir, coverHref);
    const coverFile = zip.file(fullCoverPath);
    if (coverFile) {
      const base64 = await coverFile.async('base64');
      const mediaType = manifestItems[coverMetaMatch?.[1] || '']?.mediaType || 'image/jpeg';
      coverImage = `data:${mediaType};base64,${base64}`;
    }
  }

  // 4. Spine items (reading order)
  const spineIds: string[] = [];
  const spineRegex = /<itemref\s+[^>]*?idref=["']([^"']+)["'][^>]*?>/gi;
  let spineMatch: RegExpExecArray | null;
  while ((spineMatch = spineRegex.exec(opfContent)) !== null) {
    spineIds.push(spineMatch[1]);
  }

  // 5. Read Chapters
  const chapters: Chapter[] = [];
  let chapterIndex = 1;

  for (const spineId of spineIds) {
    const item = manifestItems[spineId];
    if (!item) continue;

    const fullChapterPath = resolveZipPath(opfDir, item.href);
    const file = zip.file(fullChapterPath);
    if (!file) continue;

    const html = await file.async('text');
    const { title: chTitle, paragraphs, textContent } = extractFromHtml(html, `${bookId}_ch_${chapterIndex}`);

    if (textContent.trim().length === 0) continue;

    const finalTitle = chTitle || `Chương ${chapterIndex}`;
    chapters.push({
      id: `${bookId}_ch_${chapterIndex}`,
      bookId,
      title: finalTitle,
      chapterIndex,
      content: textContent,
      paragraphs,
      wordCount: textContent.split(/\s+/).filter(Boolean).length,
    });

    chapterIndex++;
  }

  return {
    title,
    author,
    description,
    language,
    coverImage,
    chapters: chapters.length > 0 ? chapters : [{
      id: `${bookId}_ch_1`,
      bookId,
      title: 'Chương 1',
      chapterIndex: 1,
      content: 'Nội dung sách trống hoặc định dạng không hỗ trợ.',
      paragraphs: [{
        id: `${bookId}_ch_1_p_0`,
        chapterId: `${bookId}_ch_1`,
        index: 0,
        text: 'Nội dung sách trống hoặc định dạng không hỗ trợ.',
        sentences: ['Nội dung sách trống hoặc định dạng không hỗ trợ.'],
      }],
      wordCount: 9,
    }],
  };
}

function resolveZipPath(baseDir: string, relativePath: string): string {
  if (relativePath.startsWith('/')) return relativePath.substring(1);
  return (baseDir + relativePath).replace(/\/+/g, '/');
}

function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

function extractFromHtml(html: string, chapterId: string): { title?: string; paragraphs: Paragraph[]; textContent: string } {
  // Extract title from <title> or <h1> or <h2>
  let title: string | undefined;
  const h1Match = html.match(/<h[1-2][^>]*>([\s\S]*?)<\/h[1-2]>/i);
  if (h1Match) {
    title = stripHtml(h1Match[1]);
  } else {
    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleTagMatch) {
      const t = stripHtml(titleTagMatch[1]);
      if (t && !t.toLowerCase().includes('.xhtml') && !t.toLowerCase().includes('.html')) {
        title = t;
      }
    }
  }

  // Extract paragraphs from <p>, <div>, <blockquote> or break lines
  const rawParagraphs: string[] = [];
  const pRegex = /<(?:p|div|blockquote)[^>]*>([\s\S]*?)<\/(?:p|div|blockquote)>/gi;
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(html)) !== null) {
    const text = stripHtml(pMatch[1]);
    if (text.length > 0) {
      rawParagraphs.push(text);
    }
  }

  // Fallback if no <p> tags
  if (rawParagraphs.length === 0) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyContent = bodyMatch ? bodyMatch[1] : html;
    const stripped = stripHtml(bodyContent);
    const splitLines = stripped.split(/\n+/).map(s => s.trim()).filter(Boolean);
    rawParagraphs.push(...splitLines);
  }

  const paragraphs: Paragraph[] = [];
  let pIdx = 0;

  rawParagraphs.forEach((pText) => {
    const sentences = splitIntoSentences(pText);
    paragraphs.push({
      id: `${chapterId}_p_${pIdx}`,
      chapterId,
      index: pIdx,
      text: pText,
      sentences,
    });
    pIdx++;
  });

  return {
    title,
    paragraphs,
    textContent: rawParagraphs.join('\n\n'),
  };
}
