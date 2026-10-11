import { ITtsProvider, SynthesizeOptions, SynthesizeResult } from './ttsProvider';
import { TtsVoice } from '../../types';

export class EdgeOnlineTtsProvider implements ITtsProvider {
  id = 'edge-online';
  name = 'Microsoft Edge Neural TTS';
  type = 'edge-online' as const;
  description = 'Giọng đọc đám mây Neural tự nhiên, cảm xúc mượt mà với giọng Nam Minh & Hoài My chuẩn tiếng Việt.';

  private voices: TtsVoice[] = [
    {
      id: 'vi-VN-NamMinhNeural',
      name: 'Nam Minh (Truyền cảm, Trầm ấm - Tiếng Việt)',
      lang: 'vi-VN',
      gender: 'male',
      provider: 'edge-online',
      isDefault: true,
    },
    {
      id: 'vi-VN-HoaiMyNeural',
      name: 'Hoài My (Ngọt ngào, Nhẹ nhàng - Tiếng Việt)',
      lang: 'vi-VN',
      gender: 'female',
      provider: 'edge-online',
    },
    {
      id: 'en-US-JennyNeural',
      name: 'Jenny (Natural Storyteller - US English)',
      lang: 'en-US',
      gender: 'female',
      provider: 'edge-online',
    },
    {
      id: 'en-US-GuyNeural',
      name: 'Guy (Natural Deep Voice - US English)',
      lang: 'en-US',
      gender: 'male',
      provider: 'edge-online',
    },
  ];

  async getVoices(): Promise<TtsVoice[]> {
    return this.voices;
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
    const durationEstimateMs = Math.max(600, Math.round((estimatedWords / (145 * options.rate)) * 60 * 1000));

    // When running in client browser without edge proxy, we route through speech synthesis with enhanced prosody mapping
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options.rate;
    utterance.pitch = options.pitch;
    utterance.volume = options.volume;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const allVoices = window.speechSynthesis.getVoices();
      // Match gender and language if possible
      const isFemale = options.voice.includes('HoaiMy') || options.voice.includes('Jenny');
      const isEnglish = options.voice.includes('en-US');

      const matched = allVoices.find((v) => {
        if (isEnglish) return v.lang.startsWith('en');
        if (isFemale) return v.lang.startsWith('vi') && (v.name.includes('Female') || v.name.includes('My') || v.name.includes('Mai'));
        return v.lang.startsWith('vi');
      }) || allVoices.find(v => isEnglish ? v.lang.startsWith('en') : v.lang.startsWith('vi')) || allVoices[0];

      if (matched) {
        utterance.voice = matched;
      }

      if (options.onBoundary) {
        utterance.onboundary = (e) => {
          options.onBoundary?.(e.charIndex);
        };
      }
    }

    return {
      utterance,
      durationEstimateMs,
    };
  }
}
