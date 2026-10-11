/**
 * Custom Background Storage Service for Lbook
 * Uses IndexedDB for persistent, high-capacity local image storage
 * Automatically compresses/resizes large images for optimal performance
 */

export interface CustomBackground {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: number;
  sizeBytes: number;
}

const DB_NAME = 'Lbook_Backgrounds_DB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_backgrounds';
const FALLBACK_STORAGE_KEY = 'lbook_custom_backgrounds_fallback';

export const MAX_IMAGE_FILE_SIZE = 12 * 1024 * 1024; // 12 MB limit
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

class CustomBackgroundService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB not available'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  /**
   * Retrieve all saved custom backgrounds
   */
  async getAll(): Promise<CustomBackground[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      return new Promise((resolve) => {
        req.onsuccess = () => {
          const results: CustomBackground[] = req.result || [];
          // Sort newest first
          results.sort((a, b) => b.createdAt - a.createdAt);
          resolve(results);
        };
        req.onerror = () => {
          resolve(this.getFallbackStorage());
        };
      });
    } catch {
      return this.getFallbackStorage();
    }
  }

  /**
   * Save a new image file as a custom background
   */
  async save(file: File): Promise<CustomBackground> {
    // 1. Validate MIME type & file extension
    const isValidType =
      SUPPORTED_IMAGE_TYPES.includes(file.type.toLowerCase()) ||
      /\.(jpe?g|png|webp)$/i.test(file.name);

    if (!isValidType) {
      throw new Error('INVALID_FORMAT');
    }

    // 2. Validate file size
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE');
    }

    // 3. Check for duplicates in existing backgrounds
    const existing = await this.getAll();
    const duplicate = existing.find(
      (bg) => bg.name === file.name && Math.abs(bg.sizeBytes - file.size) < 1024
    );
    if (duplicate) {
      return duplicate;
    }

    // 4. Read file and optimize/resize if huge
    const dataUrl = await this.optimizeImage(file);

    const newBg: CustomBackground = {
      id: `custom_bg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name.replace(/\.[^/.]+$/, '').trim() || 'Ảnh tùy chỉnh',
      dataUrl,
      createdAt: Date.now(),
      sizeBytes: file.size,
    };

    // 5. Persist to IndexedDB
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(newBg);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn('IndexedDB write failed, using fallback storage:', err);
      this.saveFallbackStorage(newBg);
    }

    return newBg;
  }

  /**
   * Delete a custom background by ID
   */
  async delete(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      this.removeFallbackStorage(id);
    }
  }

  /**
   * Resizes image if dimension exceeds 2560px to maintain peak desktop performance
   */
  private optimizeImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const rawUrl = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const maxDim = 2560;
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          // If image is already reasonable size (< 2560 on either axis and < 2MB), keep as is
          if (width <= maxDim && height <= maxDim && file.size < 2.5 * 1024 * 1024) {
            resolve(rawUrl);
            return;
          }

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality = mimeType === 'image/png' ? undefined : 0.88;
          resolve(canvas.toDataURL(mimeType, quality));
        };
        img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
        img.src = rawUrl;
      };
      reader.onerror = () => reject(new Error('FILE_READ_FAILED'));
      reader.readAsDataURL(file);
    });
  }

  // --- LocalStorage Fallback Handlers ---
  private getFallbackStorage(): CustomBackground[] {
    try {
      const raw = localStorage.getItem(FALLBACK_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }

  private saveFallbackStorage(item: CustomBackground) {
    try {
      const list = this.getFallbackStorage().filter((x) => x.id !== item.id);
      list.unshift(item);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list.slice(0, 5)));
    } catch {}
  }

  private removeFallbackStorage(id: string) {
    try {
      const list = this.getFallbackStorage().filter((x) => x.id !== id);
      localStorage.setItem(FALLBACK_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }
}

export const customBgService = new CustomBackgroundService();
