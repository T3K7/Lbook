import { ITtsProvider, SynthesizeOptions, SynthesizeResult } from './ttsProvider';
import { TtsVoice } from '../../types';

export class BrowserTtsProvider implements ITtsProvider {
  id = 'browser';
  name = 'Windows SAPI / Browser TTS';
  type = 'browser' as const;
  description = 'Bộ máy giọng đọc Windows tích hợp sẵn, độ trễ 0ms, hoạt động ngoại tuyến 100%.';

  private cachedVoices: TtsVoice[] = [];

  async getVoices(): Promise<TtsVoice[]> {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return [
        { id: 'default', name: 'Mặc định hệ thống', lang: 'vi-VN', provider: 'browser' },
      ];
    }

    if (this.cachedVoices.length > 0) {
      return this.cachedVoices;
    }

    return new Promise((resolve) => {
      const load = () => {
        const synthVoices = window.speechSynthesis.getVoices();
        if (synthVoices.length > 0) {
          const list: TtsVoice[] = synthVoices.map((v) => {
            const isVi = v.lang.toLowerCase().includes('vi');
            return {
              id: v.voiceURI || v.name,
              name: v.name,
              lang: v.lang,
              gender: v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('nữ') || v.name.toLowerCase().includes('my') || v.name.toLowerCase().includes('mai') ? 'female' : 'male',
              provider: 'browser',
              isDefault: v.default || isVi,
              isLocal: v.localService,
            };
          });

          // Sort Vietnamese voices to top
          list.sort((a, b) => {
            const aVi = a.lang.toLowerCase().includes('vi') ? -1 : 1;
            const bVi = b.lang.toLowerCase().includes('vi') ? -1 : 1;
            return aVi - bVi;
          });

          this.cachedVoices = list;
          resolve(list);
        } else {
          resolve([
            { id: 'default', name: 'Giọng đọc hệ thống Windows', lang: 'vi-VN', provider: 'browser', isDefault: true },
          ]);
        }
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        load();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          load();
        };
        // Fallback timeout in case onvoiceschanged does not fire
        setTimeout(load, 250);
      }
    });
  }

  async synthesize(
    text: string,
    options: SynthesizeOptions,
    signal?: AbortSignal
  ): Promise<SynthesizeResult> {
    if (signal?.aborted) {
      throw new Error('Synthesis aborted');
    }

    const estimatedWords = text.trim().split(/\s+/).length;
    // Average 150 words per minute at 1.0 rate
    const durationEstimateMs = Math.max(500, Math.round((estimatedWords / (150 * options.rate)) * 60 * 1000));

    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return { durationEstimateMs };
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;

    const voices = window.speechSynthesis.getVoices();
    if (options.voice) {
      const matched = voices.find(v => v.voiceURI === options.voice || v.name === options.voice);
      if (matched) {
        utterance.voice = matched;
      }
    } else {
      // Find default Vietnamese or first available
      const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
      if (viVoice) {
        utterance.voice = viVoice;
      }
    }

    if (options.onBoundary) {
      utterance.onboundary = (e) => {
        options.onBoundary?.(e.charIndex);
      };
    }

    return {
      utterance,
      durationEstimateMs,
    };
  }
}
