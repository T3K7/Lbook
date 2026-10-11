import { ReadingProgress, BookProgressStatus } from '../types';
import { StorageService } from './storage';

export interface ProgressSnapshot {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  paragraphIndex: number;
  sentenceIndex: number;
  chunkIndex: number;
  playbackSeconds: number;
  status: BookProgressStatus;
  sessionId: number;
}

export class ProgressCoordinator {
  private static instance: ProgressCoordinator | null = null;

  // Active in-memory session tracking
  private currentSnapshot: ProgressSnapshot | null = null;
  private currentSessionId: number = 0;

  // Throttled persistence (min 3.5s interval while continuously playing)
  private lastSavedTime: number = 0;
  private saveTimeout: any = null;
  private readonly THROTTLE_MS: number = 3500;

  private constructor() {
    // Desktop & Web lifecycle handlers: flush immediately when closing or hiding
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush();
      });
      window.addEventListener('pagehide', () => {
        this.flush();
      });
    }
  }

  public static getInstance(): ProgressCoordinator {
    if (!this.instance) {
      this.instance = new ProgressCoordinator();
    }
    return this.instance;
  }

  /**
   * Generates a new session ID when switching books or chapters.
   * Any async callback with an older session token is strictly rejected.
   */
  public createSession(bookId: string, chapterId: string): number {
    // Flush any pending progress for the previous session first
    this.flush();
    this.currentSessionId++;
    return this.currentSessionId;
  }

  public getCurrentSessionId(): number {
    return this.currentSessionId;
  }

  /**
   * Validates if a callback belongs to the currently active playback context.
   */
  public isValidCallback(sessionId: number, bookId: string, chapterId: string): boolean {
    if (sessionId !== this.currentSessionId) return false;
    if (this.currentSnapshot) {
      if (this.currentSnapshot.bookId !== bookId) return false;
      if (this.currentSnapshot.chapterId !== chapterId) return false;
    }
    return true;
  }

  /**
   * Updates playback progress.
   * If `immediate` is true (e.g. pause, seek, chapter switch, finish), saves to storage instantly.
   * If `immediate` is false (e.g. continuous chunk advancement or playback tick), throttles storage writes.
   */
  public updateProgress(
    snapshot: Omit<ProgressSnapshot, 'sessionId'>,
    sessionId: number,
    immediate: boolean = false
  ): void {
    // Stale callback guard: NEVER allow old book/chapter callback to overwrite current progress!
    if (sessionId !== this.currentSessionId) {
      return;
    }

    this.currentSnapshot = {
      ...snapshot,
      sessionId,
    };

    if (immediate) {
      this.flush();
    } else {
      this.scheduleThrottledSave();
    }
  }

  private scheduleThrottledSave(): void {
    const now = Date.now();
    if (now - this.lastSavedTime >= this.THROTTLE_MS) {
      this.flush();
    } else if (!this.saveTimeout) {
      const waitMs = Math.max(100, this.THROTTLE_MS - (now - this.lastSavedTime));
      this.saveTimeout = setTimeout(() => {
        this.saveTimeout = null;
        this.flush();
      }, waitMs);
    }
  }

  /**
   * Immediately commits current in-memory progress to durable storage.
   */
  public flush(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    if (!this.currentSnapshot) return;

    const snap = this.currentSnapshot;
    const progress: ReadingProgress = {
      bookId: snap.bookId,
      chapterId: snap.chapterId,
      chapterIndex: snap.chapterIndex,
      chapterTitle: snap.chapterTitle,
      paragraphIndex: snap.paragraphIndex,
      sentenceIndex: snap.sentenceIndex,
      chunkIndex: snap.chunkIndex,
      playbackSeconds: snap.playbackSeconds,
      status: snap.status,
      lastReadAt: new Date().toISOString(),
    };

    StorageService.saveProgress(progress);
    this.lastSavedTime = Date.now();
  }

  /**
   * Clears the current active session state (e.g., after full completion).
   */
  public clearActiveSession(): void {
    this.flush();
    this.currentSnapshot = null;
    this.currentSessionId++;
  }
}
