import { ITtsProvider, SynthesizeOptions, SynthesizeResult } from './ttsProvider';
import { TtsVoice } from '../../types';

export class GoogleTtsProvider implements ITtsProvider {
  id = 'google';
  name = 'Google TTS';
  type = 'edge-online' as const;
  description = 'Giọng đọc Google Tiếng Việt trực tuyến chất lượng cao, phát âm chuẩn xác, tự nhiên.';

  private voices: TtsVoice[] = [
    {
      id: 'vi-VN-default',
      name: 'vi-VN (Mặc định)',
      lang: 'vi-VN',
      gender: 'female',
      provider: 'Google',
      isDefault: true,
    },
    {
      id: 'vi-VN-gft',
      name: 'vi-VN (gft)',
      lang: 'vi-VN',
      gender: 'female',
      provider: 'Google',
    },
    {
      id: 'vi-VN-vic',
      name: 'vi-VN (vic)',
      lang: 'vi-VN',
      gender: 'male',
      provider: 'Google',
    },
    {
      id: 'vi-VN-vid',
      name: 'vi-VN (vid)',
      lang: 'vi-VN',
      gender: 'female',
      provider: 'Google',
    },
    {
      id: 'vi-VN-vie',
      name: 'vi-VN (vie)',
      lang: 'vi-VN',
      gender: 'male',
      provider: 'Google',
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

    const cleanText = text.trim();
    const wordsCount = cleanText.split(/\s+/).length;
    const durationEstimateMs = Math.max(600, Math.round((wordsCount / (140 * options.rate)) * 60 * 1000));

    // Construct Audio URL via our server-side proxy (supports speed stretching)
    const speedParam =
      typeof options.rate === 'number' && Math.abs(options.rate - 1.0) >= 0.01
        ? `&speed=${options.rate.toFixed(2)}`
        : '';
    const audioUrl = `/api/tts/google?text=${encodeURIComponent(cleanText)}&lang=vi${speedParam}`;

    return {
      audioUrl,
      durationEstimateMs,
    };
  }
}
