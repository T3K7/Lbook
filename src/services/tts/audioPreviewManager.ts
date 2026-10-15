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
    onEnd?: () => void,
    onError?: (errorMessage: string) => void
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

    // --- Provider Branch 1: Google TTS ---
    if (provider === 'google' || provider.toLowerCase().includes('google')) {
      if (voiceId === 'vi-VN-default') {
        const audioUrl = `/api/tts/google?text=${encodeURIComponent(sampleText)}&lang=vi&voice=${encodeURIComponent(voiceId)}`;
        const audio = new Audio();
        this.currentAudio = audio;
        GlobalAudioGuard.getInstance().registerAudio(audio);

        audio.onended = () => {
          finish();
        };

        audio.onerror = () => {
          if (reqId !== this.currentRequestId) return;
          finish();
          onError?.('Không thể kết nối đến máy chủ Google TTS. Vui lòng kiểm tra mạng.');
        };

        audio.src = audioUrl;
        audio.play().then(() => {
          if (reqId === this.currentRequestId) {
            onStart?.();
          }
        }).catch((err) => {
          if (reqId === this.currentRequestId) {
            finish();
            onError?.(`Lỗi phát âm thanh Google TTS: ${err.message || 'Không thể phát'}`);
          }
        });
        return;
      }

      // Other Google Cloud Standard voices require dedicated GCP credentials
      finish();
      onError?.(`Giọng đọc "${voiceId}" thuộc gói Google Cloud TTS (yêu cầu API Key). Ứng dụng hiện hỗ trợ chính thức giọng chuẩn Google Tiếng Việt (vi-VN-default).`);
      return;
    }

    // --- Provider Branch 2: Microsoft Neural TTS ---
    if (provider === 'microsoft' || provider === 'edge-online') {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        finish();
        onError?.('Trình duyệt hoặc hệ thống không hỗ trợ Web SpeechSynthesis.');
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) =>
        v.voiceURI === voiceId ||
        v.name === voiceId ||
        (voiceId.includes('NamMinh') && v.name.includes('NamMinh')) ||
        (voiceId.includes('HoaiMy') && v.name.includes('HoaiMy')) ||
        (voiceId.includes('Jenny') && v.name.includes('Jenny')) ||
        (voiceId.includes('Guy') && v.name.includes('Guy'))
      );

      if (matched) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(sampleText);
          utterance.voice = matched;
          utterance.lang = matched.lang || 'vi-VN';
          utterance.onstart = () => {
            if (reqId === this.currentRequestId) onStart?.();
          };
          utterance.onend = () => finish();
          utterance.onerror = (e) => {
            finish();
            onError?.(`Lỗi phát giọng Microsoft Neural: ${e.error || 'Speech error'}`);
          };
          window.speechSynthesis.speak(utterance);
        } catch (e: any) {
          finish();
          onError?.(`Lỗi phát giọng: ${e.message}`);
        }
        return;
      }

      // Voice not installed in OS
      finish();
      onError?.(`Giọng Microsoft Neural (${voiceId}) chưa được cài đặt trên thiết bị này. Vui lòng cài đặt gói giọng tiếng Việt trong Windows Settings > Time & Language > Speech, hoặc sử dụng Google Tiếng Việt.`);
      return;
    }

    // --- Provider Branch 3: TikTok Trending ---
    if (provider === 'tiktok') {
      finish();
      onError?.('Dịch vụ giọng đọc TikTok hiện chưa khả dụng (cần kết nối phiên TikTok API). Vui lòng chọn Google Tiếng Việt hoặc Windows SAPI.');
      return;
    }

    // --- Provider Branch 4: Windows SAPI / Browser TTS ---
    if (provider === 'browser') {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        finish();
        onError?.('Hệ thống không hỗ trợ Windows SAPI / SpeechSynthesis.');
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find((v) => v.voiceURI === voiceId || v.name === voiceId);

      if (matched) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(sampleText);
          utterance.voice = matched;
          utterance.lang = matched.lang;
          utterance.onstart = () => {
            if (reqId === this.currentRequestId) onStart?.();
          };
          utterance.onend = () => finish();
          utterance.onerror = () => finish();
          window.speechSynthesis.speak(utterance);
        } catch {
          finish();
        }
        return;
      }

      finish();
      onError?.(`Không tìm thấy giọng đọc Windows offline (${voiceId}) trên máy tính.`);
      return;
    }

    // --- Provider Branch 5: Offline AI (VinaTTS / Piper) ---
    if (provider === 'offline-ai') {
      finish();
      onError?.('Mô hình VinaTTS ONNX đang chuẩn bị tệp trọng số nén cho thiết bị. Đề xuất sử dụng Google Tiếng Việt.');
      return;
    }

    finish();
    onError?.(`Không nhận diện được engine giọng đọc: ${provider}`);
  }
}
