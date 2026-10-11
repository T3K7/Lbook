import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Gauge,
  Zap,
  RotateCcw,
  Minus,
  Plus,
} from 'lucide-react';
import { TtsChunk, TtsVoice, PlaybackState } from '../types';
import { useTranslation } from '../i18n';

interface TtsControlsBarProps {
  currentChunk?: TtsChunk;
  currentChunkIndex: number;
  totalChunksCount: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackState?: PlaybackState;
  bookTitle?: string;
  chapterTitle?: string;
  speechRate: number;
  autoNextChapter: boolean;
  voices: TtsVoice[];
  activeVoice: string;
  cacheHitStats: { hitRate: string; cacheHits: number; cacheMisses: number };
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNextSentence: () => void;
  onPreviousSentence: () => void;
  onRateChange: (rate: number) => void;
  onVoiceChange: (voiceId: string) => void;
  onToggleAutoNext: () => void;
  onSeekChunk: (index: number) => void;
}

export const TtsControlsBar: React.FC<TtsControlsBarProps> = ({
  currentChunk,
  currentChunkIndex,
  totalChunksCount,
  isPlaying,
  isPaused,
  playbackState,
  bookTitle,
  chapterTitle,
  speechRate,
  autoNextChapter,
  voices,
  activeVoice,
  cacheHitStats,
  onPlay,
  onPause,
  onStop,
  onNextSentence,
  onPreviousSentence,
  onRateChange,
  onVoiceChange,
  onToggleAutoNext,
  onSeekChunk,
}) => {
  const { t } = useTranslation();
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [previewRate, setPreviewRate] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const speedPresets = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const displayedRate = previewRate !== null ? previewRate : speechRate;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPreviewRate(val);
    if (!isDragging) {
      onRateChange(val);
    }
  };

  const handleSliderRelease = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const val = parseFloat(e.currentTarget.value);
    setIsDragging(false);
    setPreviewRate(null);
    onRateChange(val);
  };

  const handlePresetSelect = (preset: number) => {
    setPreviewRate(null);
    setIsDragging(false);
    onRateChange(preset);
  };

  const handleStepDelta = (delta: number) => {
    const current = previewRate !== null ? previewRate : speechRate;
    const next = Math.min(2.0, Math.max(0.5, Math.round((current + delta) * 100) / 100));
    setPreviewRate(null);
    setIsDragging(false);
    onRateChange(next);
  };

  const progressPercent = totalChunksCount > 0 ? ((currentChunkIndex + 1) / totalChunksCount) * 100 : 0;

  return (
    <div
      className="h-18 bg-[var(--glass-bg-player)] border-t border-[var(--glass-border)] flex flex-col shrink-0 select-none z-40 text-[var(--text-primary)] transition-all duration-300"
      style={{
        backdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
        boxShadow: 'var(--glass-shadow-player)',
      }}
    >
      {/* Seekable timeline bar */}
      <div
        className="w-full h-1 bg-[var(--border)] hover:h-1.5 transition-all cursor-pointer relative group"
        onClick={(e) => {
          if (totalChunksCount === 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
          const targetIndex = Math.floor(ratio * totalChunksCount);
          onSeekChunk(targetIndex);
        }}
        title="Nhấp để tua nhanh câu"
      >
        <div
          className="h-full bg-[var(--accent)] transition-all relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white border border-[var(--accent)] rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex-1 px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6 min-w-0">
        {/* Left Zone: Book info */}
        <div className="w-56 sm:w-72 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-[var(--text-primary)] truncate">
              {bookTitle || t('player.notOpened')}
            </span>
            {chapterTitle && (
              <>
                <span className="text-[var(--text-muted)] text-xs" aria-hidden="true">·</span>
                <span className="text-xs text-[var(--text-secondary)] font-semibold truncate">
                  {chapterTitle}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--text-secondary)]">
            <span className="font-mono tabular-nums text-[var(--accent)] font-bold">
              {t('player.sentenceOf', {
                current: totalChunksCount > 0 ? currentChunkIndex + 1 : 0,
                total: totalChunksCount,
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[150px] sm:max-w-[180px] text-[var(--text-primary)] font-semibold">
              {currentChunk?.processedText || t('player.readyToPlay')}
            </span>
          </div>
        </div>

        {/* Center Zone: Playback Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={onPreviousSentence}
            disabled={currentChunkIndex <= 0}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-[var(--glass-border)]"
            title={t('player.previousSentence')}
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {playbackState === 'LOADING' ? (
            <button
              disabled
              className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center opacity-80 shadow-md cursor-wait"
              title={t('player.loadingVoice')}
            >
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </button>
          ) : isPlaying && !isPaused ? (
            <button
              onClick={onPause}
              className="w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
              title={t('player.pauseVoice')}
            >
              <Pause className="w-5 h-5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onPlay}
              disabled={totalChunksCount === 0}
              className="w-10 h-10 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-transform active:scale-95 disabled:cursor-not-allowed cursor-pointer"
              title={isPaused ? t('player.resumeVoice') : t('player.playVoice')}
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          )}

          <button
            onClick={onStop}
            disabled={!isPlaying && !isPaused}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-[var(--glass-border)]"
            title={t('player.stopVoice')}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          <button
            onClick={onNextSentence}
            disabled={currentChunkIndex >= totalChunksCount - 1}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-transparent hover:border-[var(--glass-border)]"
            title={t('player.nextSentence')}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right Zone: Controls & Metadata */}
        <div className="flex items-center gap-2 relative shrink-0">
          {/* Audio Cache indicator */}
          <div
            className="hidden xl:flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-mono font-semibold tabular-nums px-2 py-0.5 rounded-md bg-[var(--glass-bg-soft)] border border-[var(--glass-border)]"
            title={`Cache: ${cacheHitStats.hitRate} (${cacheHitStats.cacheHits} / ${cacheHitStats.cacheMisses})`}
          >
            <Zap className="w-3 h-3 text-[var(--accent)]" />
            <span>{t('player.cacheLabel', { rate: cacheHitStats.hitRate })}</span>
          </div>

          {/* Auto Next Chapter toggle */}
          <button
            onClick={onToggleAutoNext}
            className={`hidden sm:inline-flex px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
              autoNextChapter
                ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                : 'bg-[var(--glass-bg-soft)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title={t('settings.autoNextDesc')}
          >
            {t('player.autoNextChapter')} {autoNextChapter ? t('player.autoNextOn') : t('player.autoNextOff')}
          </button>

          {/* Realtime Speed Controls */}
          <div className="relative flex items-center">
            {/* Inline Slider for wide screens */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[var(--glass-bg-soft)] border border-[var(--glass-border)]">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowVoiceMenu(false);
                }}
                className="flex items-center gap-1 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                title="Mở menu chi tiết tốc độ đọc"
              >
                <Gauge className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              </button>
              <span className="text-[10px] font-mono font-semibold text-[var(--text-secondary)] select-none">0.5x</span>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={displayedRate}
                onPointerDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
                onMouseDown={() => setIsDragging(true)}
                onChange={handleSliderChange}
                onPointerUp={handleSliderRelease}
                onMouseUp={handleSliderRelease}
                onTouchEnd={handleSliderRelease}
                className="w-20 xl:w-28 h-1.5 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                title={`Tốc độ: ${displayedRate.toFixed(2)}x (Kéo để chỉnh, thả để áp dụng realtime)`}
              />
              <span className="text-[10px] font-mono font-semibold text-[var(--text-secondary)] select-none">2.0x</span>
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowVoiceMenu(false);
                }}
                className="ml-0.5 px-1.5 py-0.5 text-xs font-bold font-mono text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent)] hover:text-white border border-[var(--accent-border)] rounded-md cursor-pointer transition-colors tabular-nums"
                title="Tùy chọn nhanh & chi tiết tốc độ"
              >
                {displayedRate.toFixed(2)}x
              </button>
            </div>

            {/* Compact Speed Button for small screens */}
            <button
              onClick={() => {
                setShowSpeedMenu(!showSpeedMenu);
                setShowVoiceMenu(false);
              }}
              className="lg:hidden flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] bg-[var(--glass-bg-soft)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] rounded-lg transition-colors cursor-pointer"
              title="Điều chỉnh tốc độ đọc"
            >
              <Gauge className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-mono tabular-nums">{displayedRate.toFixed(2)}x</span>
            </button>

            {/* Expanded Realtime Speed Popover */}
            {showSpeedMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSpeedMenu(false)}
                />
                <div
                  className="absolute right-0 bottom-full mb-3 w-80 max-w-[calc(100vw-32px)] bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] rounded-2xl shadow-2xl p-4 z-50 text-xs backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    backdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                    WebkitBackdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                    boxShadow: 'var(--shadow-md), 0 20px 40px -8px rgba(0,0,0,0.35)',
                  }}
                >
                  {/* Popover Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                      <Gauge className="w-4 h-4 text-[var(--accent)]" />
                      <span>{t('player.speedControlsTitle')}</span>
                    </div>
                    <button
                      onClick={() => handlePresetSelect(1.0)}
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)] rounded-md border border-[var(--accent-border)] transition-colors cursor-pointer"
                      title={t('player.standardSpeed')}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('player.standardSpeed')}</span>
                    </button>
                  </div>

                  {/* Large Readout with Stepper Buttons */}
                  <div className="flex items-center justify-between my-3 px-1">
                    <button
                      onClick={() => handleStepDelta(-0.05)}
                      disabled={displayedRate <= 0.5}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--glass-bg-soft)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
                      title="-0.05x"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="text-center">
                      <div className="text-2xl font-bold font-mono text-[var(--accent)] tabular-nums tracking-tight">
                        {displayedRate.toFixed(2)}x
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {isDragging ? '...' : t('player.currentSpeed')}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStepDelta(0.05)}
                      disabled={displayedRate >= 2.0}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--glass-bg-soft)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
                      title="+0.05x"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Continuous Slider [ 0.5x ───────●──────── 2.0x ] */}
                  <div className="space-y-1.5 px-1 py-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] select-none">
                      <span>0.50x</span>
                      <span className="text-[10px]">{t('player.speedStep')}</span>
                      <span>2.00x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={displayedRate}
                      onPointerDown={() => setIsDragging(true)}
                      onTouchStart={() => setIsDragging(true)}
                      onMouseDown={() => setIsDragging(true)}
                      onChange={handleSliderChange}
                      onPointerUp={handleSliderRelease}
                      onMouseUp={handleSliderRelease}
                      onTouchEnd={handleSliderRelease}
                      className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
                    />
                    <div className="flex justify-between px-1 text-[9px] font-mono text-[var(--text-muted)]">
                      <span>0.5x</span>
                      <span>0.75x</span>
                      <span className="font-bold text-[var(--text-primary)]">1.0x</span>
                      <span>1.25x</span>
                      <span>1.5x</span>
                      <span>1.75x</span>
                      <span>2.0x</span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="mt-3 pt-3 border-t border-[var(--glass-border)]">
                    <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mb-1.5 tracking-wider">
                      {t('player.quickPick')}
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {speedPresets.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => handlePresetSelect(preset)}
                          className={`py-1.5 rounded-lg text-center font-mono text-xs transition-all cursor-pointer ${
                            Math.abs(displayedRate - preset) < 0.02
                              ? 'bg-[var(--accent)] text-white font-bold shadow-sm'
                              : 'bg-[var(--glass-bg-soft)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] border border-[var(--glass-border)]'
                          }`}
                        >
                          {preset}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Realtime hint */}
                  <div className="mt-3 pt-2 text-[10px] text-[var(--text-muted)] border-t border-[var(--glass-border)] text-center">
                    {t('player.speedRealtimeHint')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Voice Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setShowVoiceMenu(!showVoiceMenu);
                setShowSpeedMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] bg-[var(--glass-bg-soft)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] rounded-lg transition-colors cursor-pointer max-w-[130px] truncate"
              title={t('player.selectVoice')}
            >
              <span className="truncate">
                {voices.find((v) => v.id === activeVoice)?.name || t('player.selectVoice')}
              </span>
            </button>

            {showVoiceMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowVoiceMenu(false)}
                />
                <div
                  className="absolute right-0 bottom-full mb-2 w-56 max-h-64 overflow-y-auto bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] rounded-2xl shadow-2xl p-1 z-50 text-xs backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-100"
                  style={{
                    backdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                    WebkitBackdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                    boxShadow: 'var(--shadow-md), 0 20px 40px -8px rgba(0,0,0,0.3)',
                  }}
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[var(--text-muted)] border-b border-[var(--glass-border)] tracking-wider">
                    {t('player.voicesList', { count: voices.length })}
                  </div>
                  <div className="space-y-0.5 mt-1">
                    {voices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => {
                          onVoiceChange(v.id);
                          setShowVoiceMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                          activeVoice === v.id
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--accent-border)]'
                            : 'text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)]'
                        }`}
                      >
                        <span className="truncate flex-1">{v.name}</span>
                        {activeVoice === v.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 ml-1.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
