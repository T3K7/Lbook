import { Book, Chapter, ReadingProgress, Bookmark, Dictionary, AppSettings, VisitHistoryItem, AiModelItem } from '../types';

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

  static async clearStore(storeName: string): Promise<void> {
    try {
      const db = await this.getDB();
      if (!db.objectStoreNames.contains(storeName)) return;
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      return new Promise((res) => {
        tx.oncomplete = () => res();
        tx.onerror = () => res();
      });
    } catch (err) {
      console.warn(`IndexedDB clearStore ${storeName} error:`, err);
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
   * Initializes database with clean slate migration if needed, and hydrates memory cache.
   * Does NOT generate sample books, ensuring user starts with a pristine library.
   */
  static init(): { books: Book[]; activeBookId: string } {
    const CLEAN_MIGRATION_KEY = 'lbook_library_cleaned_v4';
    const isCleaned = localStorage.getItem(CLEAN_MIGRATION_KEY);

    // One-time clean migration: purge incomplete mock/test books and related chapters
    if (!isCleaned) {
      try {
        const rawOldBooks = localStorage.getItem(STORAGE_KEYS.BOOKS);
        if (rawOldBooks) {
          localStorage.setItem('lbook_library_backup_v3', rawOldBooks);
        }
        localStorage.removeItem(STORAGE_KEYS.BOOKS);

        // Remove all localStorage chapter chunks
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_KEYS.CHAPTERS_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        localStorage.setItem(STORAGE_KEYS.PROGRESS, '{}');
        localStorage.setItem(STORAGE_KEYS.BOOKMARKS, '[]');
        localStorage.setItem(STORAGE_KEYS.HISTORY, '[]');
        localStorage.removeItem('storytts_db_initialized');

        // Clear IndexedDB books and chapters stores
        IndexedDbHelper.clearStore('books');
        IndexedDbHelper.clearStore('chapters');

        // Reset memory cache
        memoryCache.books = [];
        memoryCache.chapters.clear();
      } catch (e) {
        console.warn('Migration cleanup error:', e);
      }
      localStorage.setItem(CLEAN_MIGRATION_KEY, 'true');
    }

    const books = this.getBooks();
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
    }
    IndexedDbHelper.clearStore('books');
    IndexedDbHelper.clearStore('chapters');
    this.saveBooks([]);
    memoryCache.chapters.clear();
    this.saveBookmarks([]);
    try {
      localStorage.setItem(STORAGE_KEYS.PROGRESS, '{}');
      localStorage.setItem(STORAGE_KEYS.HISTORY, '[]');
    } catch {}
  }

  // --- Chapters ---
  /**
   * Asynchronously loads all chapters for a book from memory cache, localStorage, or IndexedDB.
   * Guarantees complete chapter lists even for large novels that exceed localStorage quota.
   */
  static async loadChaptersAsync(bookId: string): Promise<Chapter[]> {
    if (!bookId) return [];

    // 1. In-memory cache is fastest
    if (memoryCache.chapters.has(bookId)) {
      const cached = memoryCache.chapters.get(bookId)!;
      if (cached && cached.length > 0) return cached;
    }

    // 2. Try localStorage
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHAPTERS_PREFIX + bookId);
      if (data) {
        const list = JSON.parse(data);
        if (Array.isArray(list) && list.length > 0) {
          memoryCache.chapters.set(bookId, list);
          return list;
        }
      }
    } catch {}

    // 3. Hydrate from IndexedDB
    const idbChapters = await IndexedDbHelper.getChapters(bookId);
    if (idbChapters && idbChapters.length > 0) {
      memoryCache.chapters.set(bookId, idbChapters);
      return idbChapters;
    }

    return [];
  }

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
