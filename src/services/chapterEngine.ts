import { Chapter, Paragraph } from '../types';
import { extractParagraphsFromLines, parseTxtContent } from './txtParser';

export class ChapterEngine {
  /**
   * Renames a chapter
   */
  static renameChapter(chapters: Chapter[], chapterId: string, newTitle: string): Chapter[] {
    return chapters.map((ch) => {
      if (ch.id === chapterId) {
        return { ...ch, title: newTitle.trim() };
      }
      return ch;
    });
  }

  /**
   * Re-indexes chapters sequentially
   */
  static reindex(chapters: Chapter[]): Chapter[] {
    return chapters.map((ch, idx) => ({
      ...ch,
      chapterIndex: idx + 1,
    }));
  }

  /**
   * Splits a single chapter into two chapters at a given paragraph index
   */
  static splitChapter(
    chapters: Chapter[],
    chapterId: string,
    splitAtParagraphIndex: number,
    newChapterTitle: string
  ): Chapter[] {
    const targetIdx = chapters.findIndex(c => c.id === chapterId);
    if (targetIdx === -1) return chapters;

    const target = chapters[targetIdx];
    if (splitAtParagraphIndex <= 0 || splitAtParagraphIndex >= target.paragraphs.length) {
      return chapters;
    }

    const firstParas = target.paragraphs.slice(0, splitAtParagraphIndex);
    const secondParas = target.paragraphs.slice(splitAtParagraphIndex);

    const firstContent = firstParas.map(p => p.text).join('\n\n');
    const secondContent = secondParas.map(p => p.text).join('\n\n');

    const firstChapter: Chapter = {
      ...target,
      content: firstContent,
      paragraphs: firstParas.map((p, idx) => ({ ...p, index: idx, id: `${target.id}_p_${idx}` })),
      wordCount: firstContent.split(/\s+/).filter(Boolean).length,
    };

    const newChapterId = `${target.bookId}_ch_${Date.now()}`;
    const secondChapter: Chapter = {
      id: newChapterId,
      bookId: target.bookId,
      title: newChapterTitle || `${target.title} (Phần 2)`,
      chapterIndex: target.chapterIndex + 1,
      content: secondContent,
      paragraphs: secondParas.map((p, idx) => ({
        ...p,
        chapterId: newChapterId,
        index: idx,
        id: `${newChapterId}_p_${idx}`,
      })),
      wordCount: secondContent.split(/\s+/).filter(Boolean).length,
    };

    const updated = [
      ...chapters.slice(0, targetIdx),
      firstChapter,
      secondChapter,
      ...chapters.slice(targetIdx + 1),
    ];

    return this.reindex(updated);
  }

  /**
   * Merges a chapter with the one immediately following it
   */
  static mergeWithNext(chapters: Chapter[], chapterId: string): Chapter[] {
    const index = chapters.findIndex(c => c.id === chapterId);
    if (index === -1 || index >= chapters.length - 1) return chapters;

    const current = chapters[index];
    const next = chapters[index + 1];

    const mergedContent = `${current.content}\n\n${next.content}`;
    const mergedParagraphs: Paragraph[] = [
      ...current.paragraphs,
      ...next.paragraphs.map((p, i) => ({
        ...p,
        chapterId: current.id,
        index: current.paragraphs.length + i,
        id: `${current.id}_p_${current.paragraphs.length + i}`,
      })),
    ];

    const mergedChapter: Chapter = {
      ...current,
      title: `${current.title} & ${next.title}`,
      content: mergedContent,
      paragraphs: mergedParagraphs,
      wordCount: mergedContent.split(/\s+/).filter(Boolean).length,
    };

    const updated = [
      ...chapters.slice(0, index),
      mergedChapter,
      ...chapters.slice(index + 2),
    ];

    return this.reindex(updated);
  }

  /**
   * Moves a chapter up or down in the book order
   */
  static moveChapter(chapters: Chapter[], chapterId: string, direction: 'up' | 'down'): Chapter[] {
    const index = chapters.findIndex(c => c.id === chapterId);
    if (index === -1) return chapters;

    if (direction === 'up' && index === 0) return chapters;
    if (direction === 'down' && index === chapters.length - 1) return chapters;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const cloned = [...chapters];
    const temp = cloned[index];
    cloned[index] = cloned[targetIdx];
    cloned[targetIdx] = temp;

    return this.reindex(cloned);
  }

  /**
   * Deletes a chapter
   */
  static deleteChapter(chapters: Chapter[], chapterId: string): Chapter[] {
    if (chapters.length <= 1) {
      throw new Error('Không thể xóa chương duy nhất của cuốn sách.');
    }
    const updated = chapters.filter(c => c.id !== chapterId);
    return this.reindex(updated);
  }

  /**
   * Updates raw content of a chapter and re-parses paragraphs and sentences
   */
  static updateContent(chapters: Chapter[], chapterId: string, newContent: string): Chapter[] {
    return chapters.map((ch) => {
      if (ch.id === chapterId) {
        const lines = newContent.split(/\r?\n/).filter(l => l.trim().length > 0);
        const paragraphs = extractParagraphsFromLines(lines, ch.id);
        return {
          ...ch,
          content: newContent,
          paragraphs,
          wordCount: newContent.split(/\s+/).filter(Boolean).length,
        };
      }
      return ch;
    });
  }

  /**
   * Re-runs detection on an entire book's combined text using a custom regex
   */
  static reDetectAll(bookId: string, fullText: string, customRegex?: string): Chapter[] {
    const { chapters } = parseTxtContent(fullText, { bookId, customChapterRegex: customRegex });
    return chapters;
  }
}
