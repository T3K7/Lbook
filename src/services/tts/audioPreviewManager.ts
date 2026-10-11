import { GlobalAudioGuard } from './globalAudioGuard';

/**
 * AudioPreviewManager - Singleton audio preview controller
 * Guarantees zero overlapping audio when clicking preview repeatedly.
 * Clicking preview once, twice, or many times stops the previous audio immediately
 * and starts fresh from the beginning.
 */
export class AudioPreviewManager {
  private static instance: AudioPreviewManager;
  private currentAudio: HTMLAudioElement | null = null;
  private currentRequestId: number = 0;
  private onEndCallbacks: Map<number, () => void> = new Map();
  private onBeforePreviewCallback: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): AudioPreviewManager {
    if (!AudioPreviewManager.instance) {
      AudioPreviewManager.instance = new AudioPreviewManager();
    }
    return AudioPreviewManager.instance;
  }

  public setBeforePreviewListener(cb: () => void): void {
    this.onBeforePreviewCallback = cb;
  }

  /**
   * Immediately stops any ongoing preview audio (both HTML5 Audio and Web SpeechSynthesis)
   */
  public stopAll(): void {
    // Invalidate any in-flight async callbacks
    this.currentRequestId++;

    if (this.currentAudio) {
      try {
        this.currentAudio.onended = null;
        this.currentAudio.onerror = null;
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio.removeAttribute('src');
        this.currentAudio.load();
        GlobalAudioGuard.getInstance().unregisterAudio(this.currentAudio);
      } catch {
        // ignore
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }

    // Call any pending onEnd callbacks to reset UI states
    this.onEndCallbacks.forEach((cb) => {
      try {
        cb();
      } catch {
        // ignore
      }
    });
    this.onEndCallbacks.clear();
  }

  /**
   * Plays a preview for a specific voice.
   * If called while audio is already playing, the previous audio stops immediately
   * and playback restarts from the beginning.
   */
  public playPreview(
    voiceId: string,
    provider: string,
    sampleText: string,
    onStart?: () => void,
    onEnd?: () => void
  ): void {
    // 1. HARD STOP previous preview and any other audio immediately
    GlobalAudioGuard.getInstance().stopEverything();
    this.stopAll();

    // 2. Stop any ongoing reading pipeline
    this.onBeforePreviewCallback?.();

    const reqId = ++this.currentRequestId;
    if (onEnd) {
      this.onEndCallbacks.set(reqId, onEnd);
    }

    onStart?.();

    const finish = () => {
      if (reqId === this.currentRequestId) {
        if (this.currentAudio) {
          GlobalAudioGuard.getInstance().unregisterAudio(this.currentAudio);
        }
        this.currentAudio = null;
        const cb = this.onEndCallbacks.get(reqId);
        this.onEndCallbacks.delete(reqId);
        cb?.();
      }
    };

    // Google Online Vietnamese Voice Stream
    if (provider === 'google' || provider.toLowerCase().includes('google')) {
      const audioUrl = `/api/tts/google?text=${encodeURIComponent(sampleText)}&lang=vi&voice=${encodeURIComponent(voiceId)}`;
      const audio = new Audio();
      this.currentAudio = audio;
      GlobalAudioGuard.getInstance().registerAudio(audio);

      audio.onended = () => {
        finish();
      };

      audio.onerror = () => {
        if (reqId !== this.currentRequestId) return;
        // Fallback to speech synthesis if audio stream fails
        this.fallbackSpeechSynthesis(sampleText, reqId, voiceId, finish);
      };

      audio.src = audioUrl;
      audio.play().catch(() => {
        if (reqId === this.currentRequestId) {
          this.fallbackSpeechSynthesis(sampleText, reqId, voiceId, finish);
        }
      });
    } else {
      // SpeechSynthesis for Browser/Windows voices
      this.fallbackSpeechSynthesis(sampleText, reqId, voiceId, finish);
    }
  }

  private fallbackSpeechSynthesis(
    text: string,
    reqId: number,
    voiceId: string,
    finish: () => void
  ): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      finish();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';

      const voices = window.speechSynthesis.getVoices();
      if (voiceId) {
        const matched = voices.find(
          (v) => v.voiceURI === voiceId || v.name === voiceId || v.lang.toLowerCase().includes('vi')
        );
        if (matched) utterance.voice = matched;
      }

      utterance.onend = () => {
        finish();
      };

      utterance.onerror = () => {
        finish();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      finish();
    }
  }
}
