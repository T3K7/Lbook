import { StorageService } from './storage';
import { Book, Chapter, Bookmark, Dictionary, AppSettings } from '../types';

export interface BackupPackage {
  manifest: {
    backupVersion: string;
    applicationVersion: string;
    createdAt: string;
    databaseVersion: number;
    appName: string;
    includedData: string[];
    bookCount: number;
  };
  data: {
    books: Book[];
    chaptersMap: Record<string, Chapter[]>;
    bookmarks: Bookmark[];
    dictionaries: Dictionary[];
    settings: AppSettings;
  };
}

export class BackupService {
  /**
   * Generates a full .storytts backup JSON blob
   */
  static createFullBackup(): string {
    const books = StorageService.getBooks();
    const chaptersMap: Record<string, Chapter[]> = {};

    books.forEach((b) => {
      chaptersMap[b.id] = StorageService.getChapters(b.id);
    });

    const bookmarks = StorageService.getBookmarks();
    const dictionaries = StorageService.getDictionaries();
    const settings = StorageService.getSettings();

    const backup: BackupPackage = {
      manifest: {
        backupVersion: '1.0.0',
        applicationVersion: '2.0.43-Desktop',
        createdAt: new Date().toISOString(),
        databaseVersion: 1,
        appName: 'Lbook',
        includedData: ['books', 'chapters', 'bookmarks', 'dictionaries', 'settings'],
        bookCount: books.length,
      },
      data: {
        books,
        chaptersMap,
        bookmarks,
        dictionaries,
        settings,
      },
    };

    return JSON.stringify(backup, null, 2);
  }

  /**
   * Restores data from a backup string with validation
   */
  static restoreBackup(jsonString: string): { success: boolean; message: string; restoredBooksCount: number } {
    try {
      const parsed = JSON.parse(jsonString) as BackupPackage;

      if (!parsed.manifest || !parsed.data) {
        throw new Error('Định dạng gói sao lưu không hợp lệ (thiếu manifest hoặc data).');
      }

      const { books, chaptersMap, bookmarks, dictionaries, settings } = parsed.data;

      if (Array.isArray(books)) {
        StorageService.saveBooks(books);
      }

      if (chaptersMap && typeof chaptersMap === 'object') {
        Object.entries(chaptersMap).forEach(([bookId, chapters]) => {
          if (Array.isArray(chapters)) {
            StorageService.saveChapters(bookId, chapters);
          }
        });
      }

      if (Array.isArray(bookmarks)) {
        StorageService.saveBookmarks(bookmarks);
      }

      if (Array.isArray(dictionaries)) {
        StorageService.saveDictionaries(dictionaries);
      }

      if (settings && typeof settings === 'object') {
        StorageService.saveSettings(settings);
      }

      return {
        success: true,
        message: `Phục hồi thành công! Đã nạp ${books?.length || 0} sách, ${bookmarks?.length || 0} dấu trang và ${dictionaries?.length || 0} bộ từ điển.`,
        restoredBooksCount: books?.length || 0,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi giải mã file backup';
      return {
        success: false,
        message: `Lỗi phục hồi: ${msg}`,
        restoredBooksCount: 0,
      };
    }
  }

  /**
   * Exports an individual book as clean structured text
   */
  static exportBookAsTxt(book: Book, chapters: Chapter[]): string {
    const lines: string[] = [
      `TIÊU ĐỀ: ${book.title}`,
      `TÁC GIẢ: ${book.author}`,
      `MÔ TẢ: ${book.description || 'Không có'}`,
      `XUẤT BẢN TỪ: Lbook`,
      `NGÀY XUẤT: ${new Date().toLocaleDateString('vi-VN')}`,
      '\n=========================================\n',
    ];

    chapters.forEach((ch) => {
      lines.push(`\n\n${ch.title}\n`);
      lines.push(ch.content);
    });

    return lines.join('\n');
  }
}
