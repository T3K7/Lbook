import { TtsChunk, ChunkStatus, AppSettings, PlaybackState } from '../../types';
import { ITtsProvider } from './ttsProvider';
import { BrowserTtsProvider } from './browserTtsProvider';
import { EdgeOnlineTtsProvider } from './edgeOnlineTtsProvider';
import { OfflineAiTtsProvider } from './offlineAiTtsProvider';
import { GoogleTtsProvider } from './googleTtsProvider';
import { AudioPreviewManager } from './audioPreviewManager';
import { GlobalAudioGuard } from './globalAudioGuard';

export type PipelineEventListener = (event: {
  type: 'chunk_start' | 'chunk_end' | 'queue_updated' | 'chapter_end' | 'error';
  chunk?: TtsChunk;
  error?: string;
}) => void;

export class TtsAudioPipeline {
  private providers: Map<string, ITtsProvider> = new Map();
  private queue: TtsChunk[] = [];
  private currentChunkIndex: number = -1;

  // Strict State Machine
  private playbackState: PlaybackState = 'IDLE';

  private abortController: AbortController | null = null;
  private currentAudioElement: HTMLAudioElement | null = null;
  private resumeResolver: (() => void) | null = null;
  private listeners: Set<PipelineEventListener> = new Set();

  /**
   * Session ID Token: Increments on ANY stop, jump, or new chapter.
   * Guarantees that stale async promises or discarded chunks can NEVER produce audio.
   */
  private activeSessionId: number = 0;

  // Audio Cache: CacheKey -> { duration: number, timestamp: number }
  private audioCache: Map<string, { duration: number; timestamp: number }> = new Map();
  public cacheHits: number = 0;
  public cacheMisses: number = 0;

  private settings: AppSettings;
  private currentPlaybackRate: number = 1.0;
  private onChapterCompleteCallback?: () => void;

  constructor(settings: AppSettings) {
    this.settings = settings;
    this.currentPlaybackRate = Math.min(2.0, Math.max(0.5, Number((settings.speechRate || 1.0).toFixed(2))));

    // Register all providers
    const google = new GoogleTtsProvider();
    const browser = new BrowserTtsProvider();
    const edge = new EdgeOnlineTtsProvider();
    const offline = new OfflineAiTtsProvider();

    this.providers.set(google.id, google);
    this.providers.set(browser.id, browser);
    this.providers.set(edge.id, edge);
    this.providers.set(offline.id, offline);

    // Mutual exclusion: when preview audio plays in modal, stop reader audio cleanly
    AudioPreviewManager.getInstance().setBeforePreviewListener(() => {
      this.stop();
    });

    // When global audio guard triggers external hard stop
    GlobalAudioGuard.getInstance().registerStopCallback(() => {
      if (this.playbackState === 'PLAYING' || this.playbackState === 'LOADING') {
        this.stop();
      }
    });
  }

  public updateSettings(settings: AppSettings) {
    this.settings = settings;
    if (typeof settings.speechRate === 'number') {
      const clamped = Math.min(2.0, Math.max(0.5, Number(settings.speechRate.toFixed(2))));
      this.currentPlaybackRate = clamped;
      if (this.currentAudioElement) {
        this.currentAudioElement.playbackRate = clamped;
      }
    }
  }

  /**
   * Adjusts audio playback speed in realtime without regenerating TTS or interrupting audio.
   */
  public setPlaybackRate(rate: number): void {
    const clamped = Math.min(2.0, Math.max(0.5, Number(rate.toFixed(2))));
    this.currentPlaybackRate = clamped;
    this.settings.speechRate = clamped;
    console.log(`[PLAYBACK] setPlaybackRate: ${clamped}x`);

    // Realtime adjustment: If audio is currently loaded or playing, apply immediately!
    // ABSOLUTELY NO reload, NO restart, NO seek, NO reset position, NO new TTS!
    if (this.currentAudioElement) {
      this.currentAudioElement.playbackRate = clamped;
      console.log(`[PLAYBACK] Live audio.playbackRate updated to ${clamped}x`);
    }

    this.notify({ type: 'queue_updated' });
  }

  public getPlaybackRate(): number {
    return this.currentPlaybackRate;
  }

  public getProvider(id: string): ITtsProvider {
    return this.providers.get(id) || this.providers.get('google') || this.providers.get('browser')!;
  }

  public getAllProviders(): ITtsProvider[] {
    return Array.from(this.providers.values());
  }

  public subscribe(listener: PipelineEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(event: {
    type: 'chunk_start' | 'chunk_end' | 'queue_updated' | 'chapter_end' | 'error';
    chunk?: TtsChunk;
    error?: string;
  }) {
    this.listeners.forEach(fn => fn(event));
  }

  public setQueue(chunks: TtsChunk[], startIndex: number = 0, onChapterComplete?: () => void) {
    this.stop();
    this.queue = [...chunks];
    this.currentChunkIndex = Math.max(0, Math.min(startIndex, chunks.length > 0 ? chunks.length - 1 : 0));
    this.onChapterCompleteCallback = onChapterComplete;
    this.playbackState = chunks.length > 0 ? 'READY' : 'IDLE';

    console.log(`[QUEUE] Loaded ${chunks.length} chunks. Ready at chunk ${this.currentChunkIndex}`);
    console.log(`[PLAYBACK] state: ${this.playbackState}`);
    this.notify({ type: 'queue_updated' });
  }

  public getQueue(): TtsChunk[] {
    return this.queue;
  }

  public getCurrentChunk(): TtsChunk | undefined {
    return this.queue[this.currentChunkIndex];
  }

  public getCurrentIndex(): number {
    return this.currentChunkIndex;
  }

  public getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  public getIsPlaying(): boolean {
    return this.playbackState === 'PLAYING';
  }

  public getIsPaused(): boolean {
    return this.playbackState === 'PAUSED';
  }

  public getCurrentAudioTime(): number {
    return this.currentAudioElement ? this.currentAudioElement.currentTime : 0;
  }

  public getAudioDuration(): number {
    return this.currentAudioElement ? this.currentAudioElement.duration || 0 : 0;
  }

  public seekAudioTime(seconds: number): void {
    if (this.currentAudioElement && isFinite(seconds) && seconds >= 0) {
      try {
        this.currentAudioElement.currentTime = seconds;
      } catch (err) {
        console.warn('[PIPELINE] seekAudioTime warning:', err);
      }
    }
  }

  public getSessionId(): number {
    return this.activeSessionId;
  }

  public generateCacheKey(chunk: TtsChunk, providerId: string, voice: string, rate: number, pitch: number): string {
    const raw = `${chunk.processedText}__${providerId}__${voice}__${rate.toFixed(2)}__${pitch.toFixed(2)}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `cache_${Math.abs(hash)}`;
  }

  /**
   * Starts or resumes playback.
   */
  public async play(): Promise<void> {
    if (this.queue.length === 0) return;

    // Already actively playing
    if (this.playbackState === 'PLAYING') return;

    // If currently paused, delegate directly to resume() - NEVER restart or recreate TTS!
    if (this.playbackState === 'PAUSED') {
      this.resume();
      return;
    }

    // Stop standalone voice previews from modal
    AudioPreviewManager.getInstance().stopAll();

    // Begin playback from currentChunkIndex
    this.playbackState = 'LOADING';
    console.log(`[PLAY] currentSegment: ${this.currentChunkIndex}`);
    console.log(`[PLAYBACK] state: LOADING`);
    this.notify({ type: 'queue_updated' });

    const session = ++this.activeSessionId;
    await this.playNextChunk(session);
  }

  /**
   * Native PAUSE: Pauses playback at the exact current position.
   * ABSOLUTELY NO re-synthesize, no queue reset, no chunk advance.
   */
  public pause(): void {
    if (this.playbackState !== 'PLAYING' && this.playbackState !== 'LOADING') {
      return;
    }

    const prevPlaying = this.playbackState === 'PLAYING';
    this.playbackState = 'PAUSED';

    const curTime = this.currentAudioElement ? this.currentAudioElement.currentTime : 0;
    console.log(`[PAUSE] currentSegment: ${this.currentChunkIndex} currentTime: ${curTime.toFixed(2)}s`);
    console.log(`[PLAYBACK] state: PAUSED`);

    if (prevPlaying && this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
      } catch (e) {
        console.warn('[PAUSE] HTMLAudioElement pause warning:', e);
      }
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.pause();
      } catch (e) {
        console.warn('[PAUSE] speechSynthesis pause warning:', e);
      }
    }

    this.notify({ type: 'queue_updated' });
  }

  /**
   * Native RESUME: Resumes playback from the exact position where it was paused.
   * ABSOLUTELY NO new audio element creation, no new TTS request.
   */
  public resume(): void {
    if (this.playbackState !== 'PAUSED') return;

    const curTime = this.currentAudioElement ? this.currentAudioElement.currentTime : 0;
    console.log(`[RESUME] currentSegment: ${this.currentChunkIndex} currentTime: ${curTime.toFixed(2)}s`);

    this.playbackState = 'PLAYING';
    console.log(`[PLAYBACK] state: PLAYING`);

    // If waiting for synthesis to complete during pause
    if (this.resumeResolver) {
      const resolver = this.resumeResolver;
      this.resumeResolver = null;
      resolver();
    } else if (this.currentAudioElement) {
      // Native audio resume with current live playback rate
      this.currentAudioElement.playbackRate = this.currentPlaybackRate;
      this.currentAudioElement.play().catch((e) => {
        console.warn('[RESUME] play rejected:', e);
      });
    } else if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }

    this.notify({ type: 'queue_updated' });
  }

  /**
   * STOP: Terminates current playback and releases audio elements.
   */
  public stop(): void {
    if (this.playbackState === 'STOPPING') return;

    console.log(`[STOP] currentSegment: ${this.currentChunkIndex}`);
    this.playbackState = 'STOPPING';
    console.log(`[PLAYBACK] state: STOPPING`);

    // Invalidate active session token
    this.activeSessionId++;

    // Unblock any resume waiter
    if (this.resumeResolver) {
      const resolver = this.resumeResolver;
      this.resumeResolver = null;
      resolver();
    }

    // Abort pending network request
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {
        // ignore
      }
      this.abortController = null;
    }

    // Detach and clean up current audio element
    if (this.currentAudioElement) {
      const el = this.currentAudioElement;
      el.onended = null;
      el.onerror = null;
      el.onplay = null;
      el.onpause = null;
      try {
        el.pause();
        el.currentTime = 0;
        el.removeAttribute('src');
        el.load();
      } catch {
        // ignore
      }
      GlobalAudioGuard.getInstance().unregisterAudio(el);
      this.currentAudioElement = null;
    }

    // Cancel Web SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // Reset status of active chunks
    this.queue.forEach((c) => {
      if (c.status === 'Playing' || c.status === 'Processing') {
        c.status = 'Pending';
      }
    });

    this.playbackState = this.queue.length > 0 ? 'READY' : 'IDLE';
    console.log(`[PLAYBACK] state: ${this.playbackState}`);
    this.notify({ type: 'queue_updated' });
  }

  /**
   * Jumps to chunk index.
   */
  public async jumpToChunk(index: number): Promise<void> {
    if (index < 0 || index >= this.queue.length) return;

    this.stop();
    this.currentChunkIndex = index;
    await this.play();
  }

  /**
   * Jumps to paragraph and sentence position.
   */
  public async jumpToPosition(paragraphIndex: number, sentenceIndex: number): Promise<void> {
    this.stop();

    const chunkIdx = this.queue.findIndex(
      (c) => c.paragraphIndex === paragraphIndex && c.sentenceIndex === sentenceIndex
    );

    if (chunkIdx !== -1) {
      await this.jumpToChunk(chunkIdx);
    } else {
      const fallbackIdx = this.queue.findIndex((c) => c.paragraphIndex === paragraphIndex);
      if (fallbackIdx !== -1) {
        await this.jumpToChunk(fallbackIdx);
      }
    }
  }

  public async nextSentence(): Promise<void> {
    if (this.currentChunkIndex < this.queue.length - 1) {
      await this.jumpToChunk(this.currentChunkIndex + 1);
    }
  }

  public async previousSentence(): Promise<void> {
    if (this.currentChunkIndex > 0) {
      await this.jumpToChunk(this.currentChunkIndex - 1);
    }
  }

  private waitForResume(session: number): Promise<void> {
    return new Promise<void>((resolve) => {
      this.resumeResolver = () => {
        this.resumeResolver = null;
        resolve();
      };
    });
  }

  /**
   * Core sequential playback loop.
   */
  private async playNextChunk(session: number): Promise<void> {
    // Session Guard: Check if invalidated or not in active loop
    if (session !== this.activeSessionId) return;
    if (this.playbackState !== 'LOADING' && this.playbackState !== 'PLAYING') return;

    if (this.currentChunkIndex >= this.queue.length) {
      this.playbackState = 'COMPLETED';
      console.log(`[PLAYBACK] state: COMPLETED`);
      this.notify({ type: 'chapter_end' });
      if (this.settings.autoNextChapter && this.onChapterCompleteCallback) {
        this.onChapterCompleteCallback();
      }
      return;
    }

    const chunk = this.queue[this.currentChunkIndex];
    chunk.status = 'Processing';
    this.playbackState = 'LOADING';
    console.log(`[PLAYBACK] state: LOADING`);
    console.log(`[GENERATION] chunk: ${this.currentChunkIndex} text: "${chunk.processedText.slice(0, 35)}..."`);
    this.notify({ type: 'queue_updated' });

    // Cancel previous abort controller
    if (this.abortController) {
      try {
        this.abortController.abort();
      } catch {}
    }
    this.abortController = new AbortController();

    const providerId = this.settings.defaultProviderId || 'google';
    const provider = this.getProvider(providerId);
    const voice = this.settings.defaultVoice || 'vi-VN-default';
    const rate = this.settings.speechRate || 1.0;
    const pitch = this.settings.speechPitch || 1.0;
    const volume = this.settings.speechVolume || 1.0;

    // Cache hit/miss accounting
    const cacheKey = this.generateCacheKey(chunk, providerId, voice, rate, pitch);
    if (this.audioCache.has(cacheKey)) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
      this.audioCache.set(cacheKey, { duration: 1000, timestamp: Date.now() });
    }

    // Background prefetch (purely caching, never mutates playback state)
    this.prefetchNextChunks(this.currentChunkIndex + 1, this.settings.prefetchWindowSize || 3);

    try {
      const result = await provider.synthesize(
        chunk.processedText,
        { voice, rate, pitch, volume },
        this.abortController.signal
      );

      // Session Guard: check if session invalidated during async network synthesize
      if (session !== this.activeSessionId) return;

      // RACE CONDITION DEFENSE: User clicked PAUSE while synthesize was running
      if (this.getPlaybackState() === 'PAUSED') {
        console.log(`[GENERATION] Completed while PAUSED for chunk ${this.currentChunkIndex}. Queued without playing.`);
        chunk.status = 'Ready';

        // Pre-create and register audio element so it's ready the exact instant user clicks Resume
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.playbackRate = this.currentPlaybackRate;
          audio.volume = Math.min(1.0, Math.max(0.0, volume));
          this.currentAudioElement = audio;
          GlobalAudioGuard.getInstance().registerAudio(audio);
        }

        this.notify({ type: 'queue_updated' });

        // Wait quietly for user to click Resume or Stop
        await this.waitForResume(session);

        // After resume signal, verify session is still active and state is PLAYING
        if (session !== this.activeSessionId || this.getPlaybackState() !== 'PLAYING') {
          return;
        }
      }

      // Check session validity again
      if (session !== this.activeSessionId) return;

      // Start actual audio playback
      chunk.status = 'Playing';
      this.playbackState = 'PLAYING';
      console.log(`[PLAYBACK] state: PLAYING`);
      console.log(`[PLAY] currentSegment: ${this.currentChunkIndex}`);
      this.notify({ type: 'chunk_start', chunk });
      this.notify({ type: 'queue_updated' });

      // Path A: HTML5 Audio URL
      if (result.audioUrl) {
        let audio = this.currentAudioElement;
        const targetSrc = new URL(result.audioUrl, window.location.href).href;
        if (!audio || audio.src !== targetSrc) {
          if (audio) {
            GlobalAudioGuard.getInstance().unregisterAudio(audio);
          }
          audio = new Audio(result.audioUrl);
          audio.playbackRate = this.currentPlaybackRate;
          audio.volume = Math.min(1.0, Math.max(0.0, volume));
          this.currentAudioElement = audio;
          GlobalAudioGuard.getInstance().registerAudio(audio);
        } else {
          audio.playbackRate = this.currentPlaybackRate;
        }

        await new Promise<void>((resolve) => {
          if (session !== this.activeSessionId) {
            resolve();
            return;
          }

          let isResolved = false;
          const cleanResolve = () => {
            if (!isResolved) {
              isResolved = true;
              if (audio) {
                audio.onended = null;
                audio.onerror = null;
                GlobalAudioGuard.getInstance().unregisterAudio(audio);
              }
              if (this.currentAudioElement === audio) {
                this.currentAudioElement = null;
              }
              resolve();
            }
          };

          audio.onended = () => {
            cleanResolve();
          };

          audio.onerror = () => {
            if (session !== this.activeSessionId || this.playbackState === 'STOPPING') {
              cleanResolve();
              return;
            }
            console.warn(`[PLAYBACK] Audio element error for chunk ${this.currentChunkIndex}`);
            cleanResolve();
          };

          // Play only if active
          if (this.playbackState === 'PLAYING') {
            audio.playbackRate = this.currentPlaybackRate;
            audio.play().catch((err) => {
              if (session !== this.activeSessionId) {
                cleanResolve();
                return;
              }
              console.warn('[PLAYBACK] audio.play() rejected:', err);
              cleanResolve();
            });
          }
        });
      }
      // Path B: Web SpeechSynthesis
      else if (result.utterance && typeof window !== 'undefined' && window.speechSynthesis) {
        await new Promise<void>((resolve) => {
          if (!result.utterance || session !== this.activeSessionId) {
            resolve();
            return;
          }

          let isResolved = false;
          const cleanResolve = () => {
            if (!isResolved) {
              isResolved = true;
              resolve();
            }
          };

          result.utterance.onend = () => cleanResolve();
          result.utterance.onerror = () => cleanResolve();

          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(result.utterance);
        });
      } else {
        // Fallback simulation timer
        await new Promise<void>((resolve) => {
          setTimeout(resolve, result.durationEstimateMs || 1500);
        });
      }

      // Guard: Check if state changed during audio playback
      if (session !== this.activeSessionId || this.getPlaybackState() !== 'PLAYING') {
        return;
      }

      chunk.status = 'Completed';
      this.notify({ type: 'chunk_end', chunk });
      this.notify({ type: 'queue_updated' });

      // Move to next chunk continuously ONLY for active playing session
      if (session === this.activeSessionId && this.getPlaybackState() === 'PLAYING') {
        this.currentChunkIndex++;
        await this.playNextChunk(session);
      }
    } catch (err: unknown) {
      if (session !== this.activeSessionId || this.abortController?.signal.aborted) {
        return;
      }
      chunk.status = 'Failed';
      const msg = err instanceof Error ? err.message : 'Unknown synthesis error';
      chunk.error = msg;
      this.playbackState = 'ERROR';
      console.error(`[PLAYBACK] state: ERROR - ${msg}`);
      this.notify({ type: 'error', error: msg, chunk });
    }
  }

  /**
   * Prefetches audio for upcoming chunks in the background without affecting current playback.
   */
  private async prefetchNextChunks(startIndex: number, count: number): Promise<void> {
    const end = Math.min(startIndex + count, this.queue.length);
    for (let i = startIndex; i < end; i++) {
      const chunk = this.queue[i];
      if (chunk.status === 'Pending') {
        const providerId = this.settings.defaultProviderId || 'google';
        const voice = this.settings.defaultVoice || 'vi-VN-default';
        const rate = this.settings.speechRate || 1.0;
        const pitch = this.settings.speechPitch || 1.0;
        const cacheKey = this.generateCacheKey(chunk, providerId, voice, rate, pitch);

        if (!this.audioCache.has(cacheKey)) {
          this.audioCache.set(cacheKey, { duration: 1200, timestamp: Date.now() });
        }
      }
    }
  }

  public clearCache(): void {
    this.audioCache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.notify({ type: 'queue_updated' });
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
