import * as openpgp from 'openpgp';
import { Chapter, Paragraph } from '../types';
import { splitIntoSentences } from './sentenceSplitter';

export interface ParseTxtOptions {
  bookId: string;
  customChapterRegex?: string;
}

/**
 * Robust novel file decoder supporting UTF-8, UTF-16, Windows-1258, and PGP/GPG armored or binary messages
 */
export async function decodeNovelBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  passphrase?: string
): Promise<{ text: string; isEpub: boolean }> {
  const uint8 = new Uint8Array(buffer);

  // 1. Check ZIP/EPUB magic bytes: PK (0x50, 0x4B, 0x03, 0x04)
  if (
    uint8.length >= 4 &&
    uint8[0] === 0x50 &&
    uint8[1] === 0x4b &&
    uint8[2] === 0x03 &&
    uint8[3] === 0x04
  ) {
    return { text: '', isEpub: true };
  }

  // 2. Check for PGP/GPG binary packet header (bit 7 is set: 0x80)
  const isPgpExtension = /\.(pgp|gpg|asc)$/i.test(fileName);

  // First try decoding raw UTF-8 string to inspect headers
  let rawText = '';
  try {
    // Check BOMs
    if (uint8.length >= 3 && uint8[0] === 0xef && uint8[1] === 0xbb && uint8[2] === 0xbf) {
      rawText = new TextDecoder('utf-8').decode(uint8.subarray(3));
    } else if (uint8.length >= 2 && uint8[0] === 0xff && uint8[1] === 0xfe) {
      rawText = new TextDecoder('utf-16le').decode(uint8.subarray(2));
    } else if (uint8.length >= 2 && uint8[0] === 0xfe && uint8[1] === 0xff) {
      rawText = new TextDecoder('utf-16be').decode(uint8.subarray(2));
    } else {
      rawText = new TextDecoder('utf-8', { fatal: false }).decode(uint8);
    }
  } catch {
    rawText = new TextDecoder('windows-1258', { fatal: false }).decode(uint8);
  }

  // 3. Handle PGP / GPG files
  if (isPgpExtension || rawText.includes('-----BEGIN PGP')) {
    // A. Cleartext Signed Message
    if (rawText.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
      const parts = rawText.split('-----BEGIN PGP SIGNED MESSAGE-----');
      if (parts.length > 1) {
        let content = parts[1];
        content = content.replace(/^Hash:[^\n]*\r?\n+/i, '');
        if (content.includes('-----BEGIN PGP SIGNATURE-----')) {
          content = content.split('-----BEGIN PGP SIGNATURE-----')[0];
        }
        return { text: extractCleanTextFromAnyFile(content), isEpub: false };
      }
    }

    // B. Encrypted or Armored PGP Message
    try {
      if (rawText.includes('-----BEGIN PGP MESSAGE-----')) {
        const message = await openpgp.readMessage({ armoredMessage: rawText });
        if (passphrase) {
          const { data: decrypted } = await openpgp.decrypt({
            message,
            passwords: [passphrase],
          });
          return { text: extractCleanTextFromAnyFile(decrypted as string), isEpub: false };
        }
      } else if (uint8[0] & 0x80) {
        // Binary OpenPGP packet
        const message = await openpgp.readMessage({ binaryMessage: uint8 });
        if (passphrase) {
          const { data: decrypted } = await openpgp.decrypt({
            message,
            passwords: [passphrase],
          });
          return { text: extractCleanTextFromAnyFile(decrypted as string), isEpub: false };
        }
      }
    } catch (pgpErr) {
      console.warn('OpenPGP decrypt attempt info:', pgpErr);
      // Fallback: If decryption failed or required password, strip headers and return clean text
      const cleaned = extractCleanTextFromAnyFile(rawText);
      if (cleaned.length > 20) {
        return { text: cleaned, isEpub: false };
      }
    }
  }

  // 4. Regular Text cleaning
  const cleaned = extractCleanTextFromAnyFile(rawText);
  return { text: cleaned || rawText, isEpub: false };
}

/**
 * Robust text extractor: handles raw TXT, UTF-8, PGP/GPG cleartext armoring, or formatted forum novels
 */
export function extractCleanTextFromAnyFile(raw: string): string {
  if (!raw) return '';
  let cleaned = raw;

  // 1. PGP Cleartext Signed message (extract inner payload)
  if (cleaned.includes('-----BEGIN PGP SIGNED MESSAGE-----')) {
    const parts = cleaned.split('-----BEGIN PGP SIGNED MESSAGE-----');
    if (parts.length > 1) {
      let content = parts[1];
      content = content.replace(/^Hash:[^\n]*\r?\n+/i, '');
      if (content.includes('-----BEGIN PGP SIGNATURE-----')) {
        content = content.split('-----BEGIN PGP SIGNATURE-----')[0];
      }
      cleaned = content;
    }
  }

  // 2. PGP Message Block (remove armor headers if present)
  if (cleaned.includes('-----BEGIN PGP MESSAGE-----')) {
    const lines = cleaned.split(/\r?\n/);
    const contentLines = lines.filter(
      (l) =>
        !l.startsWith('-----') &&
        !l.startsWith('Version:') &&
        !l.startsWith('Comment:')
    );
    if (contentLines.length > 0) {
      cleaned = contentLines.join('\n');
    }
  }

  // 3. Remove non-printable / binary junk characters if file was binary
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return cleaned.trim();
}

/**
 * Regex patterns matching chapter headers in Vietnamese, English, and Chinese web novel translations.
 */
const DEFAULT_CHAPTER_PATTERNS = [
  /^(?:CHƯƠNG|Chương|chương)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:CHAPTER|Chapter|chapter)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:HỒI|Hồi|hồi)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:PHẦN|Phần|phần)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:QUYỂN|Quyển|quyển)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:TẬP|Tập|tập)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:VOLUME|Volume|volume|VOL|Vol)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:Tiết|TIẾT)\s+([0-9IVXLCDMivxlcdm]+)(?:[\s:.-]+(.*))?$/i,
  /^(?:Thứ|THỨ)\s+([0-9IVXLCDMivxlcdm]+)\s+(?:Chương|chương)(?:[\s:.-]+(.*))?$/i,
  /^(?:Đệ|ĐỆ)\s+([0-9IVXLCDMivxlcdm]+)\s+(?:Chương|chương|Hồi|hồi)(?:[\s:.-]+(.*))?$/i,
  /^[0-9]{1,4}[\s.:-]+(?:Chương|Hồi|Phần|Chapter)(?:[\s:.-]+(.*))?$/i,
];

export function detectChapterMatch(line: string, customPattern?: string): { isChapter: boolean; title: string } {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) {
    return { isChapter: false, title: '' };
  }

  if (customPattern) {
    try {
      const reg = new RegExp(customPattern, 'i');
      if (reg.test(trimmed)) {
        return { isChapter: true, title: trimmed };
      }
    } catch {
      // Invalid custom pattern
    }
  }

  for (const pattern of DEFAULT_CHAPTER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { isChapter: true, title: trimmed };
    }
  }

  return { isChapter: false, title: '' };
}

/**
 * Parses raw TXT content into structured Chapters and Paragraphs
 */
export function parseTxtContent(
  rawText: string,
  options: ParseTxtOptions
): { chapters: Chapter[]; detectedCount: number } {
  const lines = rawText.split(/\r?\n/);
  const detectedMarkers: { lineIndex: number; title: string }[] = [];

  // 1. Scan for chapter markers
  lines.forEach((line, index) => {
    const match = detectChapterMatch(line, options.customChapterRegex);
    if (match.isChapter) {
      detectedMarkers.push({ lineIndex: index, title: match.title });
    }
  });

  const chapters: Chapter[] = [];

  // If no chapter headers were detected, check if document is long and auto-split by word-count/sections
  if (detectedMarkers.length === 0) {
    const fullParagraphs = extractParagraphsFromLines(lines, `${options.bookId}_ch_1`);
    const wordCount = rawText.trim().split(/\s+/).length;

    // If text is very long (> 2000 words), split into logical chunks of ~1500 words
    if (wordCount > 2500) {
      let currentWordCount = 0;
      let chapterIdx = 1;
      let currentParas: string[] = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const wordsInLine = line.trim().split(/\s+/).length;
        currentParas.push(line.trim());
        currentWordCount += wordsInLine;

        if (currentWordCount >= 1500) {
          const chId = `${options.bookId}_ch_${chapterIdx}`;
          const content = currentParas.join('\n\n');
          const paras = extractParagraphsFromLines(currentParas, chId);
          chapters.push({
            id: chId,
            bookId: options.bookId,
            title: `Phần ${chapterIdx}`,
            chapterIndex: chapterIdx,
            content,
            paragraphs: paras,
            wordCount: currentWordCount,
          });
          chapterIdx++;
          currentParas = [];
          currentWordCount = 0;
        }
      }

      if (currentParas.length > 0) {
        const chId = `${options.bookId}_ch_${chapterIdx}`;
        const content = currentParas.join('\n\n');
        const paras = extractParagraphsFromLines(currentParas, chId);
        chapters.push({
          id: chId,
          bookId: options.bookId,
          title: `Phần ${chapterIdx}`,
          chapterIndex: chapterIdx,
          content,
          paragraphs: paras,
          wordCount: currentWordCount,
        });
      }
    } else {
      chapters.push({
        id: `${options.bookId}_ch_1`,
        bookId: options.bookId,
        title: 'Toàn văn tác phẩm',
        chapterIndex: 1,
        content: rawText,
        paragraphs: fullParagraphs,
        wordCount,
      });
    }

    return { chapters, detectedCount: 0 };
  }

  // Handle preamble (prologue / text before first chapter)
  if (detectedMarkers[0].lineIndex > 0) {
    const preambleLines = lines.slice(0, detectedMarkers[0].lineIndex).filter(l => l.trim().length > 0);
    if (preambleLines.length > 0) {
      const chId = `${options.bookId}_ch_0`;
      const content = preambleLines.join('\n\n');
      const paragraphs = extractParagraphsFromLines(preambleLines, chId);
      chapters.push({
        id: chId,
        bookId: options.bookId,
        title: 'Lời tựa / Mở đầu',
        chapterIndex: 0,
        content,
        paragraphs,
        wordCount: content.split(/\s+/).length,
      });
    }
  }

  // Slice chapters between markers
  for (let i = 0; i < detectedMarkers.length; i++) {
    const current = detectedMarkers[i];
    const nextLineIndex = i + 1 < detectedMarkers.length ? detectedMarkers[i + 1].lineIndex : lines.length;
    const chLines = lines.slice(current.lineIndex + 1, nextLineIndex).filter(l => l.trim().length > 0);
    const chId = `${options.bookId}_ch_${i + 1}`;
    const content = chLines.join('\n\n');
    const paragraphs = extractParagraphsFromLines(chLines, chId);

    chapters.push({
      id: chId,
      bookId: options.bookId,
      title: current.title,
      chapterIndex: i + 1,
      content,
      paragraphs,
      wordCount: content.split(/\s+/).length,
    });
  }

  return { chapters, detectedCount: detectedMarkers.length };
}

/**
 * Extracts Paragraph models and Sentence models from line arrays
 */
export function extractParagraphsFromLines(lines: string[], chapterId: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let pIdx = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    const sentences = splitIntoSentences(trimmed);
    paragraphs.push({
      id: `${chapterId}_p_${pIdx}`,
      chapterId,
      index: pIdx,
      text: trimmed,
      sentences: sentences.length > 0 ? sentences : [trimmed],
    });
    pIdx++;
  }

  return paragraphs;
}
