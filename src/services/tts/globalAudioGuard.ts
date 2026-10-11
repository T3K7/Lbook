/**
 * GlobalAudioGuard - Master Mutex & Registry for All Audio in StoryTTS
 *
 * Guarantees that:
 * 1. ONLY ONE single audio source (HTML5 Audio or Web SpeechSynthesis) can EVER play at any moment.
 * 2. Whenever user clicks to seek ("túa đến đó"), resumes, plays preview, or switches chapters,
 *    ALL previous audio sources, pending promises, and audio elements are brutally terminated.
 * 3. An execution epoch token (session ID) invalidates any async task in flight.
 */

export class GlobalAudioGuard {
  private static instance: GlobalAudioGuard;
  private activeAudioElements: Set<HTMLAudioElement> = new Set();
  private epoch: number = 0;
  private onStopCallbacks: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): GlobalAudioGuard {
    if (!GlobalAudioGuard.instance) {
      GlobalAudioGuard.instance = new GlobalAudioGuard();
    }
    return GlobalAudioGuard.instance;
  }

  /**
   * Returns current global epoch. If this changes during an async operation,
   * that operation MUST abort immediately and produce no audio.
   */
  public getEpoch(): number {
    return this.epoch;
  }

  /**
   * Register a callback to run whenever a global stop is executed
   */
  public registerStopCallback(cb: () => void): () => void {
    this.onStopCallbacks.add(cb);
    return () => this.onStopCallbacks.delete(cb);
  }

  /**
   * Registers an active HTMLAudioElement.
   */
  public registerAudio(audio: HTMLAudioElement): void {
    this.activeAudioElements.add(audio);
  }

  /**
   * Unregisters an HTMLAudioElement when naturally ended or removed.
   */
  public unregisterAudio(audio: HTMLAudioElement): void {
    this.activeAudioElements.delete(audio);
  }

  /**
   * HARD STOP EVERYTHING ACROSS THE ENTIRE APPLICATION:
   * - Increments epoch token (cancelling all in-flight synthesis and chunk loops)
   * - Immediately halts, mutes, clears src, and detaches listeners from all Audio elements
   * - Cancels Web SpeechSynthesis queue
   * - Fires stop callbacks
   */
  public stopEverything(): number {
    this.epoch++;
    const currentEpoch = this.epoch;

    // 1. Terminate all tracked HTMLAudioElements
    this.activeAudioElements.forEach((audio) => {
      try {
        audio.onended = null;
        audio.onerror = null;
        audio.onplay = null;
        audio.onpause = null;
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // ignore errors during cleanup
      }
    });
    this.activeAudioElements.clear();

    // 2. Terminate Web SpeechSynthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        // WebKit workaround: cancel twice to guarantee queue flush
        setTimeout(() => {
          try {
            window.speechSynthesis.cancel();
          } catch {
            // ignore
          }
        }, 50);
      } catch {
        // ignore
      }
    }

    // 3. Trigger listeners
    this.onStopCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });

    return currentEpoch;
  }
}
