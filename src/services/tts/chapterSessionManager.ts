import {
  Chapter,
  Paragraph,
  DictionaryRule,
  AppSettings,
  TtsChunk,
  ChapterSession,
  ChapterAudioConfig,
  PlaybackMachineStatus,
} from '../../types';
import { ITtsProvider } from './ttsProvider';
import { GoogleTtsProvider } from './googleTtsProvider';
import { BrowserTtsProvider } from './browserTtsProvider';
import { EdgeOnlineTtsProvider } from './edgeOnlineTtsProvider';
import { OfflineAiTtsProvider } from './offlineAiTtsProvider';
import { GlobalAudioGuard } from './globalAudioGuard';
import { AudioPreviewManager } from './audioPreviewManager';
import { createChunksFromParagraphs } from '../chunker';

export type ChapterSessionEventListener = (event: {
  type:
    | 'session_created'
    | 'status_changed'
    | 'chunk_start'
    | 'chunk_end'
    | 'chapter_completed'
    | 'error';
  session?: ChapterSession | null;
  chunk?: TtsChunk;
  chunkIndex?: number;
  totalChunks?: number;
  status?: PlaybackMachineStatus;
  error?: string;
}) => void;

/**
 * ChapterAudioManager
 * 
 * Implements the core architecture requirements:
 * 1. ONE ACTIVE PLAYBACK SESSION AT ALL TIMES.
 * 2. Playback Generation ID token cancels all stale requests & prevents audio overlap.
 * 3. Locked Audio Configuration per chapter (voice, speed, provider never change mid-chapter).
 * 4. Entire Chapter loaded into memory; segments are managed seamlessly underneath.
 * 5. Preloading pipeline with hash-based caching.
 * 6. Clean state machine transitions: IDLE, PREPARING, PLAYING, PAUSED, COMPLETED, ERROR.
 */
export class ChapterAudioManager {
  private static instance: ChapterAudioManager;

  private providers: Map<string, ITtsProvider> = new Map();
  private activeSession: ChapterSession | null = null;
  private activeGenerationId: number = 0;
  private activeAudioElement: HTMLAudioElement | null = null;
  private activeAbortController: AbortController | null = null;

  // In-memory audio URL / Blob cache: CacheKey -> { audioUrl?: string; timestamp: number; duration: number }
  private audioCache: Map<string, { audioUrl?: string; timestamp: number; duration: number }> = new Map();
  public cacheHits: number = 0;
  public cacheMisses: number = 0;

  private listeners: Set<ChapterSessionEventListener> = new Set();
  private onAutoNextChapterCallback?: () => void;

  private constructor() {
    // Register all providers
    const google = new GoogleTtsProvider();
    const browser = new BrowserTtsProvider();
    const edge = new EdgeOnlineTtsProvider();
    const offline = new OfflineAiTtsProvider();

    this.providers.set(google.id, google);
    this.providers.set(browser.id, browser);
    this.providers.set(edge.id, edge);
    this.providers.set(offline.id, offline);

    // Mutual exclusion: when voice preview modal plays, pause/stop reader
    AudioPreviewManager.getInstance().setBeforePreviewListener(() => {
      this.pause();
    });

    // When global audio guard signals stop
    GlobalAudioGuard.getInstance().registerStopCallback(() => {
      if (this.activeSession && this.activeSession.status === 'PLAYING') {
        this.updateStatus('PAUSED');
      }
    });
  }

  public static getInstance(): ChapterAudioManager {
    if (!ChapterAudioManager.instance) {
      ChapterAudioManager.instance = new ChapterAudioManager();
    }
    return ChapterAudioManager.instance;
  }

  public getProvider(id: string): ITtsProvider {
    return this.providers.get(id) || this.providers.get('google') || this.providers.get('browser')!;
  }

  public getAllProviders(): ITtsProvider[] {
    return Array.from(this.providers.values());
  }

  public subscribe(listener: ChapterSessionEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: {
    type:
      | 'session_created'
      | 'status_changed'
      | 'chunk_start'
      | 'chunk_end'
      | 'chapter_completed'
      | 'error';
    session?: ChapterSession | null;
    chunk?: TtsChunk;
    chunkIndex?: number;
    totalChunks?: number;
    status?: PlaybackMachineStatus;
    error?: string;
  }) {
    this.listeners.forEach((fn) => fn(event));
  }

  public getActiveSession(): ChapterSession | null {
    return this.activeSession;
  }

  public getStatus(): PlaybackMachineStatus {
    return this.activeSession ? this.activeSession.status : 'IDLE';
  }

  public getIsPlaying(): boolean {
    return this.activeSession?.status === 'PLAYING';
  }

  public getIsPaused(): boolean {
    return this.activeSession?.status === 'PAUSED';
  }

  public getCurrentChunk(): TtsChunk | undefined {
    if (!this.activeSession) return undefined;
    return this.activeSession.chunks[this.activeSession.currentChunkIndex];
  }

  public getCurrentChunkIndex(): number {
    return this.activeSession?.currentChunkIndex ?? 0;
  }

  public getTotalChunksCount(): number {
    return this.activeSession?.chunks.length ?? 0;
  }

  /**
   * Generates a deterministic hash for cache key
   */
  public generateCacheKey(
    text: string,
    providerId: string,
    voice: string,
    speed: number,
    pitch: number
  ): string {
    const raw = `${text}__${providerId}__${voice}__${speed.toFixed(2)}__${pitch.toFixed(2)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `tts_${Math.abs(hash)}`;
  }

  /**
   * Sets callback for chapter completion
   */
  public setAutoNextChapterCallback(cb: () => void) {
    this.onAutoNextChapterCallback = cb;
  }

  /**
   * Completely terminates all ongoing playback and cancels in-flight async operations
   */
  private hardStopCurrentPlayback(): void {
    // 1. Invalidate active generation ID so pending async tasks immediately drop their results
    this.activeGenerationId++;

    // 2. Abort network request if pending
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
      this.activeAbortController = null;
    }

    // 3. Stop and clean up current HTML5 Audio
    if (this.activeAudioElement) {
      const audio = this.activeAudioElement;
      audio.onended = null;
      audio.onerror = null;
      audio.onplay = null;
      audio.onpause = null;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {}
      GlobalAudioGuard.getInstance().unregisterAudio(audio);
      this.activeAudioElement = null;
    }

    // 4. Force stop global audio and Web SpeechSynthesis
    GlobalAudioGuard.getInstance().stopEverything();
  }

  /**
   * Updates current session status and notifies listeners
   */
  private updateStatus(status: PlaybackMachineStatus) {
    if (this.activeSession) {
      this.activeSession.status = status;
    }
    this.notify({
      type: 'status_changed',
      session: this.activeSession,
      status,
    });
  }

  /**
   * Loads a full chapter and creates a dedicated ChapterSession.
   * Locks the audio configuration for the entire chapter.
   */
  public async loadChapterSession(
    bookId: string,
    chapter: Chapter,
    rules: DictionaryRule[],
    settings: AppSettings,
    startParagraphIndex: number = 0,
    startSentenceIndex: number = 0,
    autoPlay: boolean = false
  ): Promise<ChapterSession> {
    // 1. Hard stop any previous audio session immediately
    this.hardStopCurrentPlayback();

    const generationId = this.activeGenerationId;

    // 2. Lock snapshot configuration for this entire chapter
    const lockedConfig: ChapterAudioConfig = {
      providerId: settings.defaultProviderId || 'google',
      voice: settings.defaultVoice || 'vi-VN-default',
      language: 'vi-VN',
      speed: settings.speechRate || 1.0,
      pitch: settings.speechPitch || 1.0,
      volume: settings.speechVolume ?? 1.0,
    };

    // 3. Segment the FULL chapter text into TTS segments
    const chunks = createChunksFromParagraphs(
      chapter.id,
      chapter.paragraphs,
      rules,
      {
        maxCharacters: settings.chunkMaxChars || 240,
        providerId: lockedConfig.providerId,
        voice: lockedConfig.voice,
      }
    );

    // Find initial starting chunk index based on paragraph & sentence index
    let startIndex = 0;
    if (startParagraphIndex > 0 || startSentenceIndex > 0) {
      const matchIdx = chunks.findIndex(
        (c) =>
          c.paragraphIndex === startParagraphIndex &&
          c.sentenceIndex === startSentenceIndex
      );
      if (matchIdx !== -1) {
        startIndex = matchIdx;
      } else {
        const paraMatch = chunks.findIndex(
          (c) => c.paragraphIndex >= startParagraphIndex
        );
        if (paraMatch !== -1) startIndex = paraMatch;
      }
    }

    const sessionKey = `${chapter.id}__${lockedConfig.providerId}__${lockedConfig.voice}__${lockedConfig.speed}`;

    const newSession: ChapterSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      generationId,
      bookId,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      config: lockedConfig,
      chunks,
      currentChunkIndex: startIndex,
      status: 'IDLE',
      createdAt: Date.now(),
      cacheKey: sessionKey,
    };

    this.activeSession = newSession;
    this.notify({
      type: 'session_created',
      session: newSession,
      chunkIndex: startIndex,
      totalChunks: chunks.length,
      chunk: chunks[startIndex],
    });

    if (autoPlay) {
      await this.play();
    }

    return newSession;
  }

  /**
   * Starts or resumes continuous chapter playback.
   */
  public async play(): Promise<void> {
    if (!this.activeSession || this.activeSession.chunks.length === 0) return;

    // Hard stop any standalone voice previews
    GlobalAudioGuard.getInstance().stopEverything();
    AudioPreviewManager.getInstance().stopAll();

    // If session was paused, resume existing audio element or speech synthesis
    if (this.activeSession.status === 'PAUSED') {
      this.updateStatus('PLAYING');
      if (this.activeAudioElement) {
        try {
          await this.activeAudioElement.play();
          return;
        } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.resume();
          return;
        } catch {}
      }
    }

    // Otherwise, start or restart continuous playback loop under a fresh generation ID
    this.activeGenerationId++;
    const currentGen = this.activeGenerationId;
    this.activeSession.generationId = currentGen;
    this.updateStatus('PLAYING');

    await this.playSegmentLoop(currentGen);
  }

  /**
   * Pauses the active session
   */
  public pause(): void {
    if (!this.activeSession || this.activeSession.status !== 'PLAYING') return;

    this.updateStatus('PAUSED');

    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
      } catch {}
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
      } catch {}
    }
  }

  /**
   * Stops playback completely and resets session status to IDLE
   */
  public stop(): void {
    this.hardStopCurrentPlayback();
    if (this.activeSession) {
      this.activeSession.chunks.forEach((c) => {
        if (c.status === 'Playing' || c.status === 'Processing') {
          c.status = 'Pending';
        }
      });
      this.updateStatus('IDLE');
    }
  }

  /**
   * Jumps to a specific segment within the current chapter session.
   * Audio stops immediately and resumes only at the target segment.
   */
  public async jumpToSegment(index: number): Promise<void> {
    if (!this.activeSession) return;
    if (index < 0 || index >= this.activeSession.chunks.length) return;

    // Hard stop previous audio
    this.hardStopCurrentPlayback();

    this.activeGenerationId++;
    const currentGen = this.activeGenerationId;
    this.activeSession.generationId = currentGen;
    this.activeSession.currentChunkIndex = index;
    this.updateStatus('PLAYING');

    await this.playSegmentLoop(currentGen);
  }

  /**
   * Jumps to paragraph and sentence position.
   */
  public async jumpToPosition(paragraphIndex: number, sentenceIndex: number): Promise<void> {
    if (!this.activeSession) return;

    const matchIdx = this.activeSession.chunks.findIndex(
      (c) =>
        c.paragraphIndex === paragraphIndex && c.sentenceIndex === sentenceIndex
    );

    if (matchIdx !== -1) {
      await this.jumpToSegment(matchIdx);
    } else {
      const fallbackIdx = this.activeSession.chunks.findIndex(
        (c) => c.paragraphIndex >= paragraphIndex
      );
      if (fallbackIdx !== -1) {
        await this.jumpToSegment(fallbackIdx);
      }
    }
  }

  public async nextSentence(): Promise<void> {
    if (!this.activeSession) return;
    if (this.activeSession.currentChunkIndex < this.activeSession.chunks.length - 1) {
      await this.jumpToSegment(this.activeSession.currentChunkIndex + 1);
    }
  }

  public async previousSentence(): Promise<void> {
    if (!this.activeSession) return;
    if (this.activeSession.currentChunkIndex > 0) {
      await this.jumpToSegment(this.activeSession.currentChunkIndex - 1);
    }
  }

  /**
   * Core continuous playback pipeline:
   * Segment 1 -> Segment 2 -> Segment 3 -> ... -> Segment N
   * Protected with activeGenerationId token at every async step.
   */
  private async playSegmentLoop(generationId: number): Promise<void> {
    // 1. Generation Check: If generation changed or session stopped, exit immediately!
    if (
      generationId !== this.activeGenerationId ||
      !this.activeSession ||
      this.activeSession.status !== 'PLAYING'
    ) {
      return;
    }

    const session = this.activeSession;
    const currentIndex = session.currentChunkIndex;

    // 2. Check if end of chapter reached
    if (currentIndex >= session.chunks.length) {
      this.updateStatus('COMPLETED');
      this.notify({
        type: 'chapter_completed',
        session,
      });

      if (this.onAutoNextChapterCallback) {
        this.onAutoNextChapterCallback();
      }
      return;
    }

    const chunk = session.chunks[currentIndex];
    chunk.status = 'Processing';
    this.notify({
      type: 'status_changed',
      session,
      status: 'PLAYING',
      chunk,
      chunkIndex: currentIndex,
      totalChunks: session.chunks.length,
    });

    // 3. Setup fresh AbortController for this segment
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch {}
    }
    this.activeAbortController = new AbortController();

    const config = session.config;
    const provider = this.getProvider(config.providerId);

    // 4. Check Cache
    const cacheKey = this.generateCacheKey(
      chunk.processedText,
      config.providerId,
      config.voice,
      config.speed,
      config.pitch
    );

    let audioUrlToPlay: string | undefined = undefined;
    if (this.audioCache.has(cacheKey)) {
      this.cacheHits++;
      const cached = this.audioCache.get(cacheKey)!;
      audioUrlToPlay = cached.audioUrl;
    } else {
      this.cacheMisses++;
    }

    // 5. Trigger background prefetch for upcoming segments
    this.prefetchUpcomingSegments(currentIndex + 1, 3, generationId);

    try {
      // If not cached, synthesize audio for this segment
      if (!audioUrlToPlay) {
        const result = await provider.synthesize(
          chunk.processedText,
          {
            voice: config.voice,
            rate: config.speed,
            pitch: config.pitch,
            volume: config.volume,
          },
          this.activeAbortController.signal
        );

        // Session Guard Check after network synthesize
        if (
          generationId !== this.activeGenerationId ||
          !this.activeSession ||
          this.activeSession.status !== 'PLAYING'
        ) {
          return;
        }

        if (result.audioUrl) {
          audioUrlToPlay = result.audioUrl;
          this.audioCache.set(cacheKey, {
            audioUrl: result.audioUrl,
            timestamp: Date.now(),
            duration: result.durationEstimateMs || 2000,
          });
        } else if (result.utterance) {
          // Fallback to SpeechSynthesis
          await this.playUtterance(result.utterance, generationId, chunk);
          return;
        }
      }

      // 6. Play HTML5 Audio URL
      if (audioUrlToPlay) {
        await this.playAudioElement(audioUrlToPlay, config.speed, config.volume, generationId, chunk);
      } else {
        // Fallback simulation timer if no audio URL could be obtained
        await new Promise((r) => setTimeout(r, 1200));
      }

      // Session Guard Check after playback finishes
      if (
        generationId !== this.activeGenerationId ||
        !this.activeSession ||
        this.activeSession.status !== 'PLAYING'
      ) {
        return;
      }

      chunk.status = 'Completed';
      this.notify({ type: 'chunk_end', chunk, session: this.activeSession });

      // 7. Advance to NEXT segment seamlessly!
      if (
        generationId === this.activeGenerationId &&
        this.activeSession &&
        this.activeSession.status === 'PLAYING'
      ) {
        this.activeSession.currentChunkIndex++;
        await this.playSegmentLoop(generationId);
      }
    } catch (err: unknown) {
      if (
        generationId !== this.activeGenerationId ||
        this.activeAbortController?.signal.aborted
      ) {
        return;
      }

      chunk.status = 'Failed';
      const msg = err instanceof Error ? err.message : 'Lỗi tạo âm thanh';
      chunk.error = msg;
      this.notify({ type: 'error', error: msg, chunk, session: this.activeSession });

      // On segment error, attempt to skip to next segment gracefully
      if (
        generationId === this.activeGenerationId &&
        this.activeSession &&
        this.activeSession.status === 'PLAYING'
      ) {
        this.activeSession.currentChunkIndex++;
        await this.playSegmentLoop(generationId);
      }
    }
  }

  /**
   * Plays an audio URL via HTMLAudioElement with strict resolution and cleanup
   */
  private playAudioElement(
    url: string,
    speed: number,
    volume: number,
    generationId: number,
    chunk: TtsChunk
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      if (
        generationId !== this.activeGenerationId ||
        !this.activeSession ||
        this.activeSession.status !== 'PLAYING'
      ) {
        resolve();
        return;
      }

      const audio = new Audio(url);
      audio.playbackRate = Math.min(2.0, Math.max(0.5, speed));
      audio.volume = Math.min(1.0, Math.max(0.0, volume));
      this.activeAudioElement = audio;

      GlobalAudioGuard.getInstance().registerAudio(audio);

      let isFinished = false;
      const finish = () => {
        if (!isFinished) {
          isFinished = true;
          GlobalAudioGuard.getInstance().unregisterAudio(audio);
          if (this.activeAudioElement === audio) {
            this.activeAudioElement = null;
          }
          resolve();
        }
      };

      audio.onended = () => {
        finish();
      };

      audio.onerror = () => {
        // If generation changed, drop without sound
        if (
          generationId !== this.activeGenerationId ||
          !this.activeSession ||
          this.activeSession.status !== 'PLAYING'
        ) {
          finish();
          return;
        }

        // Single fallback attempt with SpeechSynthesis
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(chunk.processedText);
          u.lang = 'vi-VN';
          u.rate = speed;
          u.onend = () => finish();
          u.onerror = () => finish();
          window.speechSynthesis.speak(u);
        } else {
          finish();
        }
      };

      chunk.status = 'Playing';
      this.notify({ type: 'chunk_start', chunk, session: this.activeSession });

      audio.play().catch(() => {
        if (
          generationId !== this.activeGenerationId ||
          !this.activeSession ||
          this.activeSession.status !== 'PLAYING'
        ) {
          finish();
          return;
        }

        // Web Speech Fallback on play promise rejection
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(chunk.processedText);
          u.lang = 'vi-VN';
          u.rate = speed;
          u.onend = () => finish();
          u.onerror = () => finish();
          window.speechSynthesis.speak(u);
        } else {
          finish();
        }
      });
    });
  }

  /**
   * Plays an utterance via window.speechSynthesis
   */
  private playUtterance(
    utterance: SpeechSynthesisUtterance,
    generationId: number,
    chunk: TtsChunk
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      if (
        generationId !== this.activeGenerationId ||
        !this.activeSession ||
        this.activeSession.status !== 'PLAYING' ||
        typeof window === 'undefined' ||
        !window.speechSynthesis
      ) {
        resolve();
        return;
      }

      let isFinished = false;
      const finish = () => {
        if (!isFinished) {
          isFinished = true;
          resolve();
        }
      };

      utterance.onend = () => finish();
      utterance.onerror = () => finish();

      chunk.status = 'Playing';
      this.notify({ type: 'chunk_start', chunk, session: this.activeSession });

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Background prefetch for upcoming segments in the active session
   */
  private async prefetchUpcomingSegments(
    startIndex: number,
    count: number,
    generationId: number
  ): Promise<void> {
    if (!this.activeSession) return;
    const end = Math.min(startIndex + count, this.activeSession.chunks.length);
    const config = this.activeSession.config;
    const provider = this.getProvider(config.providerId);

    for (let i = startIndex; i < end; i++) {
      if (generationId !== this.activeGenerationId) return;

      const nextChunk = this.activeSession.chunks[i];
      const key = this.generateCacheKey(
        nextChunk.processedText,
        config.providerId,
        config.voice,
        config.speed,
        config.pitch
      );

      if (!this.audioCache.has(key)) {
        try {
          const res = await provider.synthesize(nextChunk.processedText, {
            voice: config.voice,
            rate: config.speed,
            pitch: config.pitch,
            volume: config.volume,
          });

          if (generationId === this.activeGenerationId && res.audioUrl) {
            this.audioCache.set(key, {
              audioUrl: res.audioUrl,
              timestamp: Date.now(),
              duration: res.durationEstimateMs || 2000,
            });
          }
        } catch {
          // Pre-fetch failures are non-blocking
        }
      }
    }
  }

  public clearCache(): void {
    this.audioCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.notify({ type: 'status_changed', session: this.activeSession });
  }

  public getCacheStats() {
    const total = this.cacheHits + this.cacheMisses;
    const rate = total > 0 ? `${Math.round((this.cacheHits / total) * 100)}%` : '0%';
    return {
      hitRate: rate,
      entriesCount: this.audioCache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
    };
  }
}
