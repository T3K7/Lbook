import { Book, Chapter, ReadingProgress, Bookmark, Dictionary, AppSettings, VisitHistoryItem, AiModelItem } from '../types';
import { parseTxtContent } from './txtParser';

const STORAGE_KEYS = {
  BOOKS: 'storytts_books',
  CHAPTERS_PREFIX: 'storytts_chapters_',
  PROGRESS: 'storytts_progress',
  BOOKMARKS: 'storytts_bookmarks',
  DICTIONARIES: 'storytts_dictionaries',
  SETTINGS: 'storytts_settings',
  HISTORY: 'storytts_history',
  AI_MODELS: 'storytts_ai_models',
};

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  appTheme: 'fluent-dark',
  glassMode: 'dark',
  wallpaperId: 'wp_dark_nebula',
  wallpaperBlur: 6,
  wallpaperOpacity: 0.55,
  fontFamily: 'serif',
  fontSize: 18,
  lineSpacing: 1.8,
  paragraphSpacing: 16,
  readerMaxWidth: 820,
  textAlign: 'justify',
  karaokeHighlightStyle: 'emerald',
  autoNextChapter: true,
  karaokeHighlight: true,
  autoScrollToSpeech: true,
  defaultProviderId: 'google',
  defaultVoice: 'vi-VN-default',
  speechRate: 1.0,
  speechPitch: 1.0,
  speechVolume: 1.0,
  prefetchWindowSize: 3,
  chunkMaxChars: 240,
  language: 'vi',
  enableAudioCache: true,
  logLevel: 'Info',
};

// IndexedDB Helper for Unlimited Storage
const DB_NAME = 'StoryTTS_IndexedDB_v2';
const DB_VERSION = 1;

class IndexedDbHelper {
  private static dbPromise: Promise<IDBDatabase> | null = null;

  static getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB not supported'));
          return;
        }
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains('books')) {
            db.createObjectStore('books', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('chapters')) {
            db.createObjectStore('chapters', { keyPath: 'bookId' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  static async setChapters(bookId: string, chapters: Chapter[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('chapters', 'readwrite');
      const store = tx.objectStore('chapters');
      store.put({ bookId, chapters });
      return new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB setChapters error:', err);
    }
  }

  static async getChapters(bookId: string): Promise<Chapter[] | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('chapters', 'readonly');
      const store = tx.objectStore('chapters');
      const req = store.get(bookId);
      return new Promise((res) => {
        req.onsuccess = () => {
          res(req.result ? req.result.chapters : null);
        };
        req.onerror = () => res(null);
      });
    } catch {
      return null;
    }
  }

  static async setBook(book: Book): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('books', 'readwrite');
      const store = tx.objectStore('books');
      store.put(book);
    } catch (err) {
      console.warn('IndexedDB setBook error:', err);
    }
  }

  static async deleteBook(bookId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(['books', 'chapters'], 'readwrite');
      tx.objectStore('books').delete(bookId);
      tx.objectStore('chapters').delete(bookId);
    } catch (err) {
      console.warn('IndexedDB deleteBook error:', err);
    }
  }

  static async getAllBooks(): Promise<Book[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('books', 'readonly');
      const store = tx.objectStore('books');
      const req = store.getAll();
      return new Promise((res) => {
        req.onsuccess = () => res(req.result || []);
        req.onerror = () => res([]);
      });
    } catch {
      return [];
    }
  }
}

// In-Memory Synchronous Cache for Lightning Performance
const memoryCache = {
  books: [] as Book[],
  chapters: new Map<string, Chapter[]>(),
  isHydrated: false,
};

export class StorageService {
  /**
   * Initializes database with sample books if empty, and hydrates memory cache
   */
  static init(): { books: Book[]; activeBookId: string } {
    const isDbInitialized = localStorage.getItem('storytts_db_initialized');
    let books = this.getBooks();

    if (!isDbInitialized && books.length === 0) {
      localStorage.setItem('storytts_db_initialized', 'true');
      const book1Id = 'book_dai_chua_te';
      const book1Text = `CHƯƠNG 1: (1) - BẮT ĐẦU NÓN XANH
Mục Trần bước vào đại điện Bắc Thương Linh Viện, ánh mắt nhìn về phía xa xăm.
Trên đỉnh núi mây mù bao phủ, Lạc Ly đang đứng tĩnh lặng trong gió nhẹ.

CHƯƠNG 1: (2) - LẠC LY VÀ MỤC TRẦN
"Lão công... Nếu như bà bà biết chúng ta làm sự tình, như thế nào phạt chúng ta à?" Tựa vào Mục Trần trong lòng, Lạc Ly mặt ngoài khẩn trương nhưng nội tâm một chút mong chờ hỏi.
"Yên tâm đi! Có lão công tại, sẽ không bị phát hiện!" Mục Trần nhìn mặt ngoài khẩn trương, trên thực tế ước gì lập tức nhìn trộm mẫu thân và phụ thân hoan ái tình cảnh Lạc Ly nói.
Nhìn Lạc Ly rõ ràng muốn nhìn thật sự, lại giả vờ không thèm để ý bộ dạng, Mục Trần tâm lý nhịn không được muốn cười, lại nhịn không được vì có khả ái như vậy thê tử cảm thấy hạnh phúc.
Mục Trần cùng Lạc Ly đã thành thân hơn trăm năm. Lạc Ly đương năm thanh xuân thân thể, bây giờ đã thành thục mê người.
Trải qua hơn trăm năm tình yêu dễ chịu mục phù.

CHƯƠNG 1: (3) - BIẾN CỐ BẤT NGỜ
Đêm xuống, ánh trăng bạc chiếu rọi cung điện cổ kính. Tiếng côn trùng kêu rả rích khắp khu rừng tĩnh mịch.
Một luồng linh lực kỳ lạ bỗng nhiên từ chân trời xa xôi cuồn cuộn kéo tới.`;

      const book1Parsed = parseTxtContent(book1Text, { bookId: book1Id });

      const book1: Book = {
        id: book1Id,
        title: 'Đại chúa tể nón xanh sâu xanh biếc (1-65 chương)',
        author: 'Thiên Tằm Thổ Đậu (Biên dịch)',
        description: 'Đồng nhân tu tiên huyền huyễn hấp dẫn với hệ thống tình tiết phong phú và bất ngờ.',
        language: 'vi',
        coverImagePath: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
        totalChapters: 192,
        lastReadChapterId: book1Parsed.chapters[1]?.id || book1Parsed.chapters[0].id,
        lastReadPosition: 1,
        lastReadSentenceIndex: 0,
        listenCount: 42,
        lastReadTime: new Date(Date.now() - 3600000).toISOString(),
        sourceType: 'txt',
        tags: ['Huyền Huyễn', 'Đồng Nhân', 'Tu Tiên'],
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      const book2Id = 'book_marvel';
      const book2Text = `CHƯƠNG 1: XUYÊN QUA ĐẾN VŨ TRỤ MARVEL
Trần Phong mở mắt ra, nhìn thấy tòa tháp Stark Tower rực rỡ ánh đèn neon giữa thành phố New York sầm uất.
Hắn phát hiện mình vừa kích hoạt hệ thống bàn tay vàng có khả năng sao chép siêu năng lực.

CHƯƠNG 2: CUỘC GẶP GỠ ĐẦU TIÊN
Trên phố người qua lại tấp nập, tiếng còi xe inh ỏi. Một chiếc xe bọc thép bất ngờ lao tới với tốc độ kinh hoàng.`;

      const book2Parsed = parseTxtContent(book2Text, { bookId: book2Id });

      const book2: Book = {
        id: book2Id,
        title: 'nguoi-tai-marvel-ta-kim-thu-chi-la-chinh-ta_1-577.txt',
        author: 'Mặc Hắc Dạ',
        description: 'Xuyên qua vũ trụ Marvel sở hữu bàn tay vàng vô địch quét ngang chư thiên.',
        language: 'vi',
        coverImagePath: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=400',
        totalChapters: 455,
        lastReadChapterId: book2Parsed.chapters[1]?.id || book2Parsed.chapters[0].id,
        lastReadPosition: 2,
        lastReadSentenceIndex: 0,
        listenCount: 88,
        lastReadTime: new Date(Date.now() - 7200000).toISOString(),
        sourceType: 'txt',
        tags: ['Marvel', 'Xuyên không', 'Hệ thống'],
        createdAt: '2026-09-28T08:12:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      const book3Id = 'book_dau_pha';
      const book3Text = `CHƯƠNG 1: Ô THẢN THÀNH TIÊU GIA
Tiêu Viêm ngồi trên mỏm đá nhìn bầu trời đêm mênh mông u ám. Đấu khí tiêu tán ba năm nay khiến hắn nếm trải đủ thói đời nóng lạnh.

CHƯƠNG 2: DƯỢC LÃO TỈNH GIẤC
Một làn khói đen mờ ảo từ trong chiếc nhẫn cổ xưa bay ra, mang theo giọng cười già nua bí ẩn.

CHƯƠNG 3: HUÂN NHI ĐÊM ĐẾN THĂM
Ánh trăng nhẹ nhàng rọi qua khung cửa sổ. Huân nhi mang theo trà nóng đến bên Tiêu Viêm mỉm cười dịu dàng an ủi.`;

      const book3Parsed = parseTxtContent(book3Text, { bookId: book3Id });

      const book3: Book = {
        id: book3Id,
        title: 'Nón xanh chi đấu phá thương khung (1-64 chương)',
        author: 'Đấu Phá Đồng Nhân',
        description: 'Tác phẩm chuyển thể phong cách mới đầy kịch tính tại đại lục Đấu Khí.',
        language: 'vi',
        coverImagePath: 'https://images.unsplash.com/photo-1532012164546-f432f2e3edd4?auto=format&fit=crop&q=80&w=400',
        totalChapters: 163,
        lastReadChapterId: book3Parsed.chapters[2]?.id || book3Parsed.chapters[0].id,
        lastReadPosition: 3,
        lastReadSentenceIndex: 0,
        listenCount: 31,
        lastReadTime: new Date(Date.now() - 14400000).toISOString(),
        sourceType: 'txt',
        tags: ['Đấu khí', 'Đồng nhân'],
        createdAt: '2026-09-25T11:20:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      const book4Id = 'book_hokage';
      const book4Text = `CHƯƠNG 1: LÀNG LÁ HẬU CHIẾN
Cơn gió mang theo hương thơm của rừng thông thổi qua thung lũng Konoha.

CHƯƠNG 2: HUẤN LUYỆN NHẪN THUẬT
Boruto siết chặt dải băng trán, quyết tâm rèn luyện Rasengan biến dị.`;
      const book4Parsed = parseTxtContent(book4Text, { bookId: book4Id });

      const book4: Book = {
        id: book4Id,
        title: 'Xuyên qua Hokage thế giới biến thành Boruto (1-12 thiên)',
        author: 'Hokage Đồng Nhân',
        description: 'Hành trình khám phá thế giới Ninja với góc nhìn hoàn toàn mới lạ.',
        language: 'vi',
        coverImagePath: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=400',
        totalChapters: 123,
        lastReadChapterId: book4Parsed.chapters[0].id,
        lastReadPosition: 1,
        lastReadSentenceIndex: 0,
        listenCount: 95,
        lastReadTime: new Date(Date.now() - 28800000).toISOString(),
        sourceType: 'txt',
        tags: ['Ninja', 'Hokage'],
        createdAt: '2026-10-02T12:00:00.000Z',
        updatedAt: new Date().toISOString(),
      };

      books = [book1, book2, book3, book4];
      this.saveBooks(books);
      this.saveChapters(book1Id, book1Parsed.chapters);
      this.saveChapters(book2Id, book2Parsed.chapters);
      this.saveChapters(book3Id, book3Parsed.chapters);
      this.saveChapters(book4Id, book4Parsed.chapters);

      // Seed initial per-book progress records
      const initialProgressMap: Record<string, ReadingProgress> = {
        [book1Id]: {
          bookId: book1Id,
          chapterId: book1Parsed.chapters[1]?.id || book1Parsed.chapters[0].id,
          chapterIndex: 1,
          chapterTitle: book1Parsed.chapters[1]?.title || 'Chương 2',
          paragraphIndex: 1,
          sentenceIndex: 0,
          chunkIndex: 1,
          playbackSeconds: 15,
          status: 'in_progress',
          lastReadAt: new Date(Date.now() - 3600000).toISOString(),
        },
        [book2Id]: {
          bookId: book2Id,
          chapterId: book2Parsed.chapters[1]?.id || book2Parsed.chapters[0].id,
          chapterIndex: 1,
          chapterTitle: book2Parsed.chapters[1]?.title || 'Chương 2',
          paragraphIndex: 0,
          sentenceIndex: 0,
          chunkIndex: 0,
          playbackSeconds: 0,
          status: 'in_progress',
          lastReadAt: new Date(Date.now() - 7200000).toISOString(),
        },
        [book3Id]: {
          bookId: book3Id,
          chapterId: book3Parsed.chapters[2]?.id || book3Parsed.chapters[0].id,
          chapterIndex: 2,
          chapterTitle: book3Parsed.chapters[2]?.title || 'Chương 3',
          paragraphIndex: 0,
          sentenceIndex: 0,
          chunkIndex: 0,
          playbackSeconds: 0,
          status: 'in_progress',
          lastReadAt: new Date(Date.now() - 14400000).toISOString(),
        },
        [book4Id]: {
          bookId: book4Id,
          chapterId: book4Parsed.chapters[0].id,
          chapterIndex: 0,
          chapterTitle: book4Parsed.chapters[0].title || 'Chương 1',
          paragraphIndex: 0,
          sentenceIndex: 0,
          chunkIndex: 0,
          playbackSeconds: 0,
          status: 'not_started',
          lastReadAt: new Date(Date.now() - 28800000).toISOString(),
        },
      };
      try {
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(initialProgressMap));
      } catch {
        // ignore
      }
    }

    // Hydrate memory cache
    memoryCache.books = [...books];

    // Asynchronously sync from IndexedDB if any extra books exist
    IndexedDbHelper.getAllBooks().then((idbBooks) => {
      if (idbBooks && idbBooks.length > 0) {
        const merged = [...memoryCache.books];
        let hasNew = false;
        for (const ib of idbBooks) {
          if (!merged.some(b => b.id === ib.id)) {
            merged.push(ib);
            hasNew = true;
          }
        }
        if (hasNew) {
          memoryCache.books = merged;
          this.notifyBooksChange(merged);
        }
      }
    });

    return { books: [...books], activeBookId: books[0]?.id || '' };
  }

  // --- Reactive Books Pub/Sub Store ---
  private static booksListeners: Set<(books: Book[]) => void> = new Set();

  /**
   * Subscribe to books changes. The listener receives a fresh array copy whenever books are added, updated, or removed.
   */
  static subscribeBooks(listener: (books: Book[]) => void): () => void {
    this.booksListeners.add(listener);
    return () => this.booksListeners.delete(listener);
  }

  /**
   * Notifies all active subscribers with a fresh immutable copy of the books array.
   */
  static notifyBooksChange(books: Book[]): void {
    const copy = books.map(b => ({ ...b }));
    this.booksListeners.forEach(listener => {
      try {
        listener(copy);
      } catch (err) {
        console.warn('Error in books listener:', err);
      }
    });
  }

  // --- Books ---
  static getBooks(): Book[] {
    if (memoryCache.books.length > 0) {
      return memoryCache.books.map(b => ({ ...b }));
    }
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKS);
      const list = data ? JSON.parse(data) : [];
      memoryCache.books = list;
      return list.map((b: Book) => ({ ...b }));
    } catch {
      return (memoryCache.books || []).map(b => ({ ...b }));
    }
  }

  static saveBooks(books: Book[]): Book[] {
    const cloned = books.map(b => ({ ...b }));
    memoryCache.books = cloned;
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(cloned));
    } catch (e) {
      console.warn('localStorage books quota reached:', e);
    }
    // Also save to IndexedDB
    for (const b of cloned) {
      IndexedDbHelper.setBook(b);
    }
    // Notify all subscribers (React states, LibraryView, etc.)
    this.notifyBooksChange(cloned);
    return cloned;
  }

  static saveBook(book: Book): Book[] {
    const current = this.getBooks();
    const idx = current.findIndex(b => b.id === book.id);
    let updated: Book[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...book, updatedAt: new Date().toISOString() };
    } else {
      updated = [{ ...book }, ...current];
    }
    return this.saveBooks(updated);
  }

  static deleteBook(bookId: string): Book[] {
    const current = this.getBooks();
    const updated = current.filter(b => b.id !== bookId);
    this.saveBooks(updated);
    memoryCache.chapters.delete(bookId);

    try {
      localStorage.removeItem(STORAGE_KEYS.CHAPTERS_PREFIX + bookId);
    } catch {
      // ignore
    }

    IndexedDbHelper.deleteBook(bookId);

    const bookmarks = this.getBookmarks().filter(b => b.bookId !== bookId);
    this.saveBookmarks(bookmarks);
    localStorage.setItem('storytts_db_initialized', 'true');
    return updated;
  }

  static deleteAllBooks(): void {
    const books = this.getBooks();
    for (const b of books) {
      try {
        localStorage.removeItem(STORAGE_KEYS.CHAPTERS_PREFIX + b.id);
      } catch {
        // ignore
      }
      IndexedDbHelper.deleteBook(b.id);
    }
    this.saveBooks([]);
    memoryCache.chapters.clear();
    this.saveBookmarks([]);
    localStorage.setItem('storytts_db_initialized', 'true');
  }

  // --- Chapters ---
  static getChapters(bookId: string): Chapter[] {
    // 1. In-memory cache is fastest
    if (memoryCache.chapters.has(bookId)) {
      return memoryCache.chapters.get(bookId)!;
    }

    // 2. Try localStorage
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAPTERS_PREFIX + bookId);
      if (data) {
        const list = JSON.parse(data);
        memoryCache.chapters.set(bookId, list);
        return list;
      }
    } catch {
      // ignore
    }

    // 3. Fallback async hydrate from IndexedDB
    IndexedDbHelper.getChapters(bookId).then((chs) => {
      if (chs) {
        memoryCache.chapters.set(bookId, chs);
      }
    });

    return [];
  }

  static saveChapters(bookId: string, chapters: Chapter[]): void {
    // 1. Store in memory cache
    memoryCache.chapters.set(bookId, chapters);

    // 2. Store in IndexedDB (Unlimited capacity, handles 100+ MB novels without quota error!)
    IndexedDbHelper.setChapters(bookId, chapters);

    // 3. Try localStorage only if small (prevent QuotaExceededError from crashing user import)
    try {
      const serialized = JSON.stringify(chapters);
      if (serialized.length < 500000) {
        localStorage.setItem(STORAGE_KEYS.CHAPTERS_PREFIX + bookId, serialized);
      }
    } catch {
      // Safe to ignore quota exceeded in localStorage since IndexedDB and memoryCache hold it
    }

    // 4. Update book chapter count if changed
    const books = this.getBooks();
    const idx = books.findIndex(item => item.id === bookId);
    if (idx >= 0 && books[idx].totalChapters !== chapters.length) {
      const updated = [...books];
      updated[idx] = { ...updated[idx], totalChapters: chapters.length, updatedAt: new Date().toISOString() };
      this.saveBooks(updated);
    }
  }

  // --- Reading Progress ---
  static getProgress(bookId: string): ReadingProgress | null {
    if (!bookId) return null;
    try {
      const mapStr = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const map: Record<string, ReadingProgress> = mapStr ? JSON.parse(mapStr) : {};
      const found = map[bookId];
      if (found) return found;

      // Robust Fallback: If progress map entry not found yet, reconstruct from book metadata
      const book = this.getBooks().find(b => b.id === bookId);
      if (book) {
        const chapters = this.getChapters(bookId);
        let chIdx = -1;
        if (book.lastReadChapterId) {
          chIdx = chapters.findIndex(c => c.id === book.lastReadChapterId);
        }
        if (chIdx < 0 && typeof book.lastReadPosition === 'number' && book.lastReadPosition > 0) {
          chIdx = Math.min(book.lastReadPosition - 1, chapters.length - 1);
        }
        const chapter = chIdx >= 0 ? chapters[chIdx] : chapters[0];
        if (chapter) {
          const fallback: ReadingProgress = {
            bookId,
            chapterId: chapter.id,
            chapterIndex: chIdx >= 0 ? chIdx : 0,
            chapterTitle: chapter.title,
            paragraphIndex: book.lastReadParagraphIndex ?? 0,
            sentenceIndex: book.lastReadSentenceIndex ?? 0,
            chunkIndex: 0,
            playbackSeconds: book.lastReadPlaybackSeconds ?? 0,
            status: book.progressStatus ?? ((chIdx > 0 || (book.lastReadPosition && book.lastReadPosition > 1)) ? 'in_progress' : 'not_started'),
            lastReadAt: book.lastReadTime || new Date().toISOString(),
          };
          return fallback;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  static saveProgress(progress: ReadingProgress): void {
    if (!progress || !progress.bookId || !progress.chapterId) return;

    try {
      const mapStr = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      const map: Record<string, ReadingProgress> = mapStr ? JSON.parse(mapStr) : {};
      map[progress.bookId] = {
        ...progress,
        lastReadAt: progress.lastReadAt || new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(map));
    } catch (e) {
      console.warn('localStorage progress write warning:', e);
    }

    // Atomically sync progress to the Book record so that all reactive listeners and UI views update immediately
    try {
      const books = this.getBooks();
      const idx = books.findIndex(item => item.id === progress.bookId);
      if (idx >= 0) {
        const current = books[idx];
        const updatedBook: Book = {
          ...current,
          lastReadChapterId: progress.chapterId,
          lastReadPosition: progress.chapterIndex + 1,
          lastReadParagraphIndex: progress.paragraphIndex,
          lastReadSentenceIndex: progress.sentenceIndex,
          lastReadPlaybackSeconds: progress.playbackSeconds,
          progressStatus: progress.status,
          lastReadTime: progress.lastReadAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        books[idx] = updatedBook;
        this.saveBooks(books);
      }
    } catch (e) {
      console.warn('Error syncing progress to Book entity:', e);
    }
  }

  static deleteProgress(bookId: string): void {
    try {
      const mapStr = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (mapStr) {
        const map: Record<string, ReadingProgress> = JSON.parse(mapStr);
        delete map[bookId];
        localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(map));
      }
    } catch {
      // ignore
    }
  }

  static getAllProgress(): Record<string, ReadingProgress> {
    try {
      const mapStr = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return mapStr ? JSON.parse(mapStr) : {};
    } catch {
      return {};
    }
  }

  // --- Bookmarks ---
  static getBookmarks(): Bookmark[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveBookmarks(bookmarks: Bookmark[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }

  static addBookmark(bookmark: Bookmark): void {
    const list = this.getBookmarks();
    list.unshift(bookmark);
    this.saveBookmarks(list);
  }

  static removeBookmark(bookmarkId: string): void {
    const list = this.getBookmarks().filter(b => b.id !== bookmarkId);
    this.saveBookmarks(list);
  }

  // --- Dictionaries & Pronunciation Rules ---
  static getDictionaries(): Dictionary[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DICTIONARIES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static saveDictionaries(dicts: Dictionary[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DICTIONARIES, JSON.stringify(dicts));
    } catch {
      // ignore
    }
  }

  // --- Settings ---
  static getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  }

  static saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  // --- History & Stats ---
  static getHistory(): VisitHistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static addHistory(item: Omit<VisitHistoryItem, 'id' | 'timestamp'>): void {
    const list = this.getHistory();
    const newItem: VisitHistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newItem);
    if (list.length > 100) list.pop();
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  static logHistory(item: VisitHistoryItem): void {
    this.addHistory(item);
  }

  static clearHistory(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.HISTORY);
    } catch {
      // ignore
    }
  }

  // --- AI Models ---
  static getAiModels(): AiModelItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AI_MODELS);
      if (data) return JSON.parse(data);
    } catch {
      // ignore
    }
    return [
      {
        id: 'vi_piper_vits',
        modelName: 'vi_piper_vits',
        displayName: 'VinaTTS Northern Male',
        description: 'Piper / VITS Neural Vietnamese model',
        language: 'vi-VN',
        fileSizeMb: 62.4,
        downloadStatus: 'downloaded',
        downloadProgress: 100,
        numSpeakers: 1,
        source: 'VinaTTS',
        sampleRate: 22050,
      },
      {
        id: 'vi_southern_female',
        modelName: 'vi_southern_female',
        displayName: 'VinaTTS Southern Female',
        description: 'Piper / VITS Neural Vietnamese Southern Female',
        language: 'vi-VN',
        fileSizeMb: 64.1,
        downloadStatus: 'available',
        downloadProgress: 0,
        numSpeakers: 1,
        source: 'VinaTTS',
        sampleRate: 22050,
      },
      {
        id: 'en_piper_medium',
        modelName: 'en_piper_medium',
        displayName: 'Piper Medium English',
        description: 'Piper ONNX Medium English Voice',
        language: 'en-US',
        fileSizeMb: 58.2,
        downloadStatus: 'available',
        downloadProgress: 0,
        numSpeakers: 1,
        source: 'Piper',
        sampleRate: 22050,
      },
    ];
  }

  static saveAiModels(models: AiModelItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AI_MODELS, JSON.stringify(models));
    } catch {
      // ignore
    }
  }
}
