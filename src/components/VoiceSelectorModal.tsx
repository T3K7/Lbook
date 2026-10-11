import React, { useState, useEffect } from 'react';
import { Search, Play, Pause, Sparkles } from 'lucide-react';
import { TtsVoice } from '../types';
import { AudioPreviewManager } from '../services/tts/audioPreviewManager';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

interface VoiceSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProviderId: string;
  activeVoiceId: string;
  systemVoices: TtsVoice[];
  onSelectVoice: (providerId: string, voiceId: string) => void;
  onPreviewVoice: (providerId: string, voiceId: string, text: string) => void;
}

export interface VoiceItem {
  id: string;
  name: string;
  provider: 'google' | 'microsoft' | 'tiktok';
  providerName: string;
  lang: string;
  gender: 'female' | 'male';
  desc: string;
}

export const VIETNAMESE_VOICE_CATALOG: VoiceItem[] = [
  // Google TTS (Native, Fast, Highly Accurate)
  {
    provider: 'google',
    providerName: 'Google',
    id: 'vi-VN-default',
    name: 'Google Tiếng Việt (Nữ Chuẩn)',
    lang: 'vi-VN',
    gender: 'female',
    desc: 'Giọng đọc Google chuẩn xác, rõ ràng, phát âm tự nhiên nhất cho tiểu thuyết',
  },
  {
    provider: 'google',
    providerName: 'Google',
    id: 'vi-VN-Standard-A',
    name: 'Google Tiếng Việt (Nữ Truyền Cảm)',
    lang: 'vi-VN',
    gender: 'female',
    desc: 'Âm sắc ấm áp, thích hợp cho truyện ngôn tình, tiên hiệp, đô thị',
  },
  {
    provider: 'google',
    providerName: 'Google',
    id: 'vi-VN-Standard-B',
    name: 'Google Tiếng Việt (Nam Trầm)',
    lang: 'vi-VN',
    gender: 'male',
    desc: 'Giọng nam trầm ấm, phát âm mạnh mẽ, thích hợp truyện kiếm hiệp, lịch sử',
  },
  {
    provider: 'google',
    providerName: 'Google',
    id: 'vi-VN-Standard-C',
    name: 'Google Tiếng Việt (Nữ Nhẹ Nhàng)',
    lang: 'vi-VN',
    gender: 'female',
    desc: 'Giọng đọc thanh thoát, tốc độ vừa phải, dễ chịu khi nghe lâu',
  },
  {
    provider: 'google',
    providerName: 'Google',
    id: 'vi-VN-Standard-D',
    name: 'Google Tiếng Việt (Nam Hào Sảng)',
    lang: 'vi-VN',
    gender: 'male',
    desc: 'Giọng đọc dứt khoát, âm vực cao, phù hợp các chương hành động',
  },

  // Microsoft Edge Neural Voices
  {
    provider: 'microsoft',
    providerName: 'Microsoft Neural',
    id: 'vi-VN-NamMinhNeural',
    name: 'Microsoft Nam Minh (Neural)',
    lang: 'vi-VN',
    gender: 'male',
    desc: 'Nam Minh — Giọng đọc Neural cao cấp, diễn cảm truyền thanh chuyên nghiệp',
  },
  {
    provider: 'microsoft',
    providerName: 'Microsoft Neural',
    id: 'vi-VN-HoaiMyNeural',
    name: 'Microsoft Hoài My (Neural)',
    lang: 'vi-VN',
    gender: 'female',
    desc: 'Hoài My — Giọng đọc Neural dịu dàng, tự nhiên như người thật',
  },

  // TikTok Voices
  {
    provider: 'tiktok',
    providerName: 'TikTok',
    id: 'vi-VN-tiktok-female',
    name: 'TikTok Nữ (Trending)',
    lang: 'vi-VN',
    gender: 'female',
    desc: 'Giọng đọc TikTok viral, tươi tắn, nhấn nhá thu hút',
  },
  {
    provider: 'tiktok',
    providerName: 'TikTok',
    id: 'vi-VN-tiktok-male',
    name: 'TikTok Nam (MC Tin Tức)',
    lang: 'vi-VN',
    gender: 'male',
    desc: 'Giọng đọc tin tức TikTok phong cách phóng sự',
  },
];

export const VoiceSelectorModal: React.FC<VoiceSelectorModalProps> = ({
  isOpen,
  onClose,
  activeProviderId,
  activeVoiceId,
  systemVoices,
  onSelectVoice,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'online' | 'offline' | 'ai'>('online');
  const [selectedProvider, setSelectedProvider] = useState<'google' | 'microsoft' | 'tiktok'>('google');
  const [searchQuery, setSearchQuery] = useState('');

  const [tempVoiceId, setTempVoiceId] = useState(activeVoiceId || 'vi-VN-default');
  const [tempProviderId, setTempProviderId] = useState(activeProviderId || 'google');
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      AudioPreviewManager.getInstance().stopAll();
      setPlayingVoiceId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredVoices = VIETNAMESE_VOICE_CATALOG.filter((v) => {
    if (activeTab === 'online') {
      const matchProvider = v.provider === selectedProvider;
      const matchSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.lang.toLowerCase().includes(searchQuery.toLowerCase());
      return matchProvider && matchSearch;
    }
    return true;
  });

  const handleApply = () => {
    AudioPreviewManager.getInstance().stopAll();
    setPlayingVoiceId(null);
    onSelectVoice(tempProviderId, tempVoiceId);
    onClose();
  };

  const handlePreview = (e: React.MouseEvent, voiceId: string, provider: string) => {
    e.stopPropagation();
    const sampleText =
      'Xin chào bạn, đây là giọng đọc tiếng Việt của Lbook. Chúc bạn có trải nghiệm nghe truyện thật tuyệt vời.';

    AudioPreviewManager.getInstance().playPreview(
      voiceId,
      provider,
      sampleText,
      () => setPlayingVoiceId(voiceId),
      () => setPlayingVoiceId(null)
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        AudioPreviewManager.getInstance().stopAll();
        setPlayingVoiceId(null);
        onClose();
      }}
      title={t('voiceModal.title')}
      maxWidth="lg"
    >
      <div className="space-y-4 text-[var(--text-primary)]">
        {/* Mode Tabs */}
        <div className="flex p-1 bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border)]">
          <button
            onClick={() => {
              AudioPreviewManager.getInstance().stopAll();
              setPlayingVoiceId(null);
              setActiveTab('online');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'online'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            Online (Google / MS Neural)
          </button>
          <button
            onClick={() => {
              AudioPreviewManager.getInstance().stopAll();
              setPlayingVoiceId(null);
              setActiveTab('offline');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'offline'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            Offline (Windows SAPI)
          </button>
          <button
            onClick={() => {
              AudioPreviewManager.getInstance().stopAll();
              setPlayingVoiceId(null);
              setActiveTab('ai');
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            AI Mô hình (VinaTTS)
          </button>
        </div>

        {activeTab === 'online' ? (
          <>
            {/* Provider Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  AudioPreviewManager.getInstance().stopAll();
                  setPlayingVoiceId(null);
                  setSelectedProvider('google');
                  setTempProviderId('google');
                  setTempVoiceId('vi-VN-default');
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedProvider === 'google'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-[var(--border)]'
                }`}
              >
                Google Tiếng Việt
              </button>
              <button
                onClick={() => {
                  AudioPreviewManager.getInstance().stopAll();
                  setPlayingVoiceId(null);
                  setSelectedProvider('microsoft');
                  setTempProviderId('edge-online');
                  setTempVoiceId('vi-VN-NamMinhNeural');
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedProvider === 'microsoft'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-[var(--border)]'
                }`}
              >
                Microsoft Neural
              </button>
              <button
                onClick={() => {
                  AudioPreviewManager.getInstance().stopAll();
                  setPlayingVoiceId(null);
                  setSelectedProvider('tiktok');
                  setTempProviderId('google');
                  setTempVoiceId('vi-VN-tiktok-female');
                }}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedProvider === 'tiktok'
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-[var(--border)]'
                }`}
              >
                TikTok Trending
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('voiceModal.searchVoice')}
                className="w-full h-10 pl-9 pr-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {/* Voice List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredVoices.map((voice) => {
                const isSelected = tempVoiceId === voice.id;
                const isAudioPlaying = playingVoiceId === voice.id;

                return (
                  <div
                    key={voice.id}
                    onClick={() => {
                      setTempVoiceId(voice.id);
                      setTempProviderId(voice.provider === 'microsoft' ? 'edge-online' : 'google');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {voice.name}
                        </span>
                        <span className="text-[10px] text-[var(--accent)] font-mono font-semibold bg-[var(--accent-soft)] px-1.5 py-0.5 rounded border border-[var(--accent-border)]">
                          {voice.lang}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
                        {voice.desc}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      {/* Preview Button */}
                      <button
                        onClick={(e) => handlePreview(e, voice.id, voice.provider)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          isAudioPlaying
                            ? 'bg-[var(--accent)] text-white animate-pulse'
                            : 'bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] hover:bg-[var(--accent)] hover:text-white'
                        }`}
                        title={t('voiceModal.previewVoice')}
                      >
                        {isAudioPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Radio Circle */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border)]'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : activeTab === 'offline' ? (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {systemVoices.length === 0 ? (
              <div className="p-4 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border)]">
                Đang quét giọng đọc máy tính... Nếu thiết bị chưa cài giọng Tiếng Việt offline, vui lòng dùng tab "Online" (Google Tiếng Việt).
              </div>
            ) : (
              systemVoices.map((v) => {
                const isSelected = tempVoiceId === v.id;
                const isAudioPlaying = playingVoiceId === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      setTempVoiceId(v.id);
                      setTempProviderId('browser');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] ring-1 ring-[var(--accent-border)]'
                        : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-[var(--accent-border)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[var(--text-primary)]">
                        {v.name}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] font-medium">{v.lang} · Offline SAPI</div>
                    </div>

                    <div className="flex items-center gap-3 ml-3 shrink-0">
                      <button
                        onClick={(e) => handlePreview(e, v.id, 'browser')}
                        className="w-8 h-8 rounded-full bg-[var(--bg-surface-secondary)] hover:bg-[var(--accent)] hover:text-white flex items-center justify-center transition-colors cursor-pointer text-[var(--text-secondary)]"
                      >
                        {isAudioPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                            : 'border-[var(--border)]'
                        }`}
                      >
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-4 bg-[var(--bg-surface-secondary)] border border-[var(--border)] rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-[var(--accent)] font-semibold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>{t('voiceModal.offlineAiModel')}</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t('voiceModal.offlineAiDesc')}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="mt-2 w-full"
              onClick={() => {
                setTempVoiceId('vi_piper_vits');
                setTempProviderId('offline-ai');
              }}
            >
              {t('voiceModal.selectOfflineAi')}
            </Button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <div className="text-xs text-[var(--text-secondary)] truncate max-w-xs">
            {t('voiceModal.currentSelection', {
              voice: VIETNAMESE_VOICE_CATALOG.find((v) => v.id === tempVoiceId)?.name || tempVoiceId,
            })}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                AudioPreviewManager.getInstance().stopAll();
                setPlayingVoiceId(null);
                onClose();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={handleApply}>
              {t('common.apply')}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
