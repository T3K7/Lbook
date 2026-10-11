import { TtsVoice } from '../../types';

export interface SynthesizeOptions {
  voice: string;
  rate: number;   // 0.5 - 2.5
  pitch: number;  // 0.5 - 1.5
  volume: number; // 0 - 1.0
  onBoundary?: (charIndex: number) => void;
  onEnd?: () => void;
}

export interface SynthesizeResult {
  audioUrl?: string;
  utterance?: SpeechSynthesisUtterance;
  durationEstimateMs: number;
  audioBuffer?: AudioBuffer;
}

export interface ITtsProvider {
  id: string;
  name: string;
  type: 'browser' | 'edge-online' | 'offline-ai';
  description: string;
  getVoices(): Promise<TtsVoice[]>;
  synthesize(
    text: string,
    options: SynthesizeOptions,
    signal?: AbortSignal
  ): Promise<SynthesizeResult>;
}
