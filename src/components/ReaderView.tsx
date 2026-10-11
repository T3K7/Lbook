import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Mic,
  Clock,
  BookOpen,
  Type,
  Download,
  Music,
  RefreshCw,
  Check,
  X,
} from 'lucide-react';
import {
  Book,
  Chapter,
  AppSettings,
  PlaybackState,
} from '../types';
import { StorageService } from '../services/storage';
import { AudioExportService } from '../services/audioExportService';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

interface ReaderViewProps {
  book: Book;
  chapters: Chapter[];
  currentChapterId: string;
  activeParagraphIndex: number;
  activeSentenceIndex: number;
  isPlaying: boolean;
  isPaused: boolean;
  playbackState?: PlaybackState;
  settings: AppSettings;
  activeVoiceLabel: string;
  onBackToBookDetail: () => void;
  onSelectChapter: (chapterId: string) => void;
  onJumpToPosition: (paragraphIndex: number, sentenceIndex: number) => void;
  onPlay: () => void;
  onPause: () => void;
  onNextSentence: () => void;
  onPreviousSentence: () => void;
  onNextChapter: () => void;
  onPreviousChapter: () => void;
  onOpenVoiceModal: () => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  chapters,
  currentChapterId,
  activeParagraphIndex,
  activeSentenceIndex,
  isPlaying,
  isPaused,
  playbackState,
  settings,
  activeVoiceLabel,
  onBackToBookDetail,
  onSelectChapter,
  onJumpToPosition,
  onPlay,
  onPause,
  onNextSentence,
  onPreviousSentence,
  onNextChapter,
  onPreviousChapter,
  onOpenVoiceModal,
  onUpdateSettings,
}) => {
  const { t } = useTranslation();
  const [showTocDrawer, setShowTocDrawer] = useState(false);
  const [showAppearancePopover, setShowAppearancePopover] = useState(false);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState<number | null>(null);

  // Quick MP3 download state
  const [isDownloadingMp3, setIsDownloadingMp3] = useState(false);
  const [mp3Progress, setMp3Progress] = useState(0);
  const [mp3Success, setMp3Success] = useState(false);

  const activeElementRef = useRef<HTMLSpanElement>(null);
  const readerScrollContainerRef = useRef<HTMLDivElement>(null);

  const currentChapter = chapters.find((c) => c.id === currentChapterId) || chapters[0];
  const currentChapterIdx = chapters.findIndex((c) => c.id === currentChapterId);

  // Auto-scroll to active sentence if enabled
  useEffect(() => {
    if (settings.autoScrollToSpeech && isPlaying && activeElementRef.current) {
      activeElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeParagraphIndex, activeSentenceIndex, isPlaying, settings.autoScrollToSpeech]);

  // Sleep timer handler
  useEffect(() => {
    if (sleepTimerMinutes && sleepTimerMinutes > 0) {
      const timer = setTimeout(() => {
        onPause();
        setSleepTimerMinutes(null);
      }, sleepTimerMinutes * 60 * 1000);
      return () => clearTimeout(timer);
    }
  }, [sleepTimerMinutes, onPause]);

  const totalChars = currentChapter?.content?.length || 1000;
  const currentChars = Math.min(
    totalChars,
    Math.round(((activeParagraphIndex + 1) / (currentChapter?.paragraphs?.length || 1)) * totalChars)
  );

  const handleQuickDownloadMp3 = async () => {
    if (!currentChapter || isDownloadingMp3) return;
    setIsDownloadingMp3(true);
    setMp3Progress(0);
    setMp3Success(false);

    try {
      const dictionaries = StorageService.getDictionaries();
      const rules = dictionaries.flatMap((d) => d.rules.filter((r) => r.enabled));

      const result = await AudioExportService.synthesizeChapterToMp3(
        currentChapter,
        {
          bookTitle: book.title,
          voice: settings.defaultVoice,
          rate: settings.speechRate,
        },
        rules,
        (progress) => {
          setMp3Progress(progress.percent);
        }
      );

      AudioExportService.triggerDownload(result.blob, result.filename);
      setMp3Success(true);
      setTimeout(() => setMp3Success(false), 3000);
    } catch (err: any) {
      console.error('Lỗi tải MP3:', err);
    } finally {
      setIsDownloadingMp3(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none text-[var(--text-primary)] relative">
      {/* Top Header */}
      <header
        className="h-12 px-4 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0 bg-[var(--glass-bg-header)] z-30 transition-all duration-300"
        style={{
          backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        }}
      >
        <button
          onClick={onBackToBookDetail}
          className="p-1.5 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          title={t('reader.backToBookDetail')}
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-xs sm:text-sm font-semibold tracking-tight text-[var(--text-primary)]">
          {t('reader.chapterOf', { current: currentChapterIdx + 1, total: chapters.length })}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAppearancePopover(!showAppearancePopover)}
            className="p-1.5 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1"
            title={t('reader.fontSettings')}
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Reader Text Area with generous readability margins */}
      <div
        ref={readerScrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-12 flex justify-center relative select-text"
      >
        <div
          className="w-full max-w-2xl space-y-5 p-6 sm:p-10 rounded-[28px] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-lg backdrop-blur-xl h-fit mb-24"
          style={{
            fontSize: `${settings.fontSize}px`,
            lineHeight: settings.lineSpacing,
            backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            boxShadow: 'var(--glass-shadow)',
          }}
        >
          {/* Chapter badge box */}
          <div
            className="p-3.5 rounded-[18px] bg-[var(--glass-bg-soft)] border border-[var(--glass-border)] flex items-center justify-between shadow-xs select-none"
            style={{
              backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
              boxShadow: 'var(--glass-shadow)',
            }}
          >
            <span className="text-xs sm:text-sm font-bold text-[var(--accent)]">
              {currentChapter?.title || `${t('common.chapter')} 1`}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-mono font-medium">
              {t('common.wordsCount', { count: currentChapter?.wordCount || 100 })}
            </span>
          </div>

          {/* Paragraphs and Sentences */}
          <div className="space-y-4 pt-2">
            {currentChapter?.paragraphs.map((para) => {
              const isCurrentPara = para.index === activeParagraphIndex;

              return (
                <p key={para.id} className="leading-relaxed font-medium text-[var(--text-primary)]">
                  {para.sentences && para.sentences.length > 0 ? (
                    para.sentences.map((sentence, sIdx) => {
                      const isCurrentSentence =
                        isCurrentPara && sIdx === activeSentenceIndex && isPlaying;

                      return (
                        <span
                          key={sIdx}
                          ref={isCurrentSentence ? activeElementRef : undefined}
                          onClick={() => onJumpToPosition(para.index, sIdx)}
                          className={`transition-all rounded px-0.5 cursor-pointer ${
                            isCurrentSentence && settings.karaokeHighlight
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-bold ring-1 ring-[var(--accent-border)] rounded-sm'
                              : 'hover:bg-[var(--accent-soft)]'
                          }`}
                          title={t('reader.clickToPlayFromSentence')}
                        >
                          {sentence}{' '}
                        </span>
                      );
                    })
                  ) : (
                    <span
                      onClick={() => onJumpToPosition(para.index, 0)}
                      className="cursor-pointer hover:bg-[var(--accent-soft)]"
                    >
                      {para.text}
                    </span>
                  )}
                </p>
              );
            })}
          </div>

          <div className="h-44" />
        </div>
      </div>

      {/* Persistent Floating Bottom Audio Player */}
      <div
        className="border-t border-[var(--glass-border)] bg-[var(--glass-bg-player)] px-4 pt-2 pb-3 shrink-0 z-40 select-none transition-all duration-300"
        style={{
          backdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
          boxShadow: 'var(--glass-shadow-player)',
        }}
      >
        <div className="max-w-xl mx-auto space-y-2">
          {/* Progress Slider Line */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--accent)] font-bold tabular-nums">
              • {currentChars} / {totalChars}
            </span>
            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full relative overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${Math.min(100, (currentChars / totalChars) * 100)}%` }}
              />
            </div>
          </div>

          {/* Central Controls: ⏮ | ◀ | ▶/⏸ | ▶ | ⏭ | ⇶ */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              onClick={onPreviousChapter}
              disabled={currentChapterIdx <= 0}
              className="p-2 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={t('reader.previousChapter')}
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onPreviousSentence}
              className="p-2 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title={t('reader.previousSentence')}
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            {/* Big Emerald Play/Pause Button */}
            {playbackState === 'LOADING' ? (
              <button
                disabled
                className="w-13 h-13 rounded-full bg-[var(--accent)] text-white flex items-center justify-center opacity-80 shadow-lg cursor-wait"
                title={t('reader.loadingVoice')}
              >
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </button>
            ) : isPlaying && !isPaused ? (
              <button
                onClick={onPause}
                className="w-13 h-13 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title={t('reader.pauseVoice')}
              >
                <Pause className="w-6 h-6 fill-current" />
              </button>
            ) : (
              <button
                onClick={onPlay}
                className="w-13 h-13 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                title={isPaused ? t('reader.resumeVoice') : t('reader.playVoice')}
              >
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </button>
            )}

            <button
              onClick={onNextSentence}
              className="p-2 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              title={t('reader.nextSentence')}
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              onClick={onNextChapter}
              disabled={currentChapterIdx >= chapters.length - 1}
              className="p-2 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title={t('reader.nextChapter')}
            >
              <SkipForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => onUpdateSettings({ autoNextChapter: !settings.autoNextChapter })}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                settings.autoNextChapter ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
              }`}
              title={settings.autoNextChapter ? t('reader.autoNextChapterOn') : t('reader.autoNextChapterOff')}
            >
              <Repeat className="w-4 h-4" />
            </button>
          </div>

          {/* Subtitle Line */}
          <div className="text-center text-[11px] text-[var(--text-secondary)] truncate px-2 font-medium">
            {book.title} · {activeVoiceLabel} · {currentChapter?.title}
          </div>

          {/* Bottom Toolbar */}
          <div className="flex items-center justify-around pt-1 text-[var(--text-secondary)]">
            {/* Voice button */}
            <button
              onClick={onOpenVoiceModal}
              className="flex flex-col items-center justify-center w-10 h-10 rounded-xl hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
              title={t('reader.selectVoice')}
            >
              <Mic className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-[8px] font-bold uppercase text-[var(--accent)] leading-none mt-0.5">
                Onl
              </span>
            </button>

            {/* Sleep timer button */}
            <button
              onClick={() => setShowSleepTimerModal(!showSleepTimerModal)}
              className={`w-10 h-10 rounded-xl hover:bg-[var(--accent-soft)] flex items-center justify-center transition-colors cursor-pointer ${
                sleepTimerMinutes ? 'text-[var(--accent)] font-bold' : ''
              }`}
              title={t('reader.sleepTimer')}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Chapter TOC Drawer button */}
            <button
              onClick={() => setShowTocDrawer(!showTocDrawer)}
              className="w-10 h-10 rounded-xl hover:bg-[var(--accent-soft)] flex items-center justify-center transition-colors cursor-pointer"
              title={t('reader.tableOfContents')}
            >
              <BookOpen className="w-4 h-4" />
            </button>

            {/* Typography customizer */}
            <button
              onClick={() => setShowAppearancePopover(!showAppearancePopover)}
              className="w-10 h-10 rounded-xl hover:bg-[var(--accent-soft)] flex items-center justify-center transition-colors cursor-pointer"
              title={t('reader.readingAppearance')}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Download chapter MP3 */}
            <button
              onClick={handleQuickDownloadMp3}
              disabled={isDownloadingMp3}
              className={`h-10 px-3 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                mp3Success
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isDownloadingMp3
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]'
                  : 'hover:bg-[var(--accent-soft)] text-[var(--text-secondary)] hover:text-[var(--accent)]'
              }`}
              title={t('reader.quickDownloadMp3')}
            >
              {isDownloadingMp3 ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                  <span className="text-xs font-mono font-medium">{mp3Progress}%</span>
                </>
              ) : mp3Success ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium">{t('reader.downloadedMp3')}</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs font-medium hidden sm:inline">{t('reader.quickDownloadMp3')}</span>
                </>
              )}
            </button>

            {/* Download chapter text */}
            <button
              onClick={() => {
                const blob = new Blob([currentChapter?.content || ''], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentChapter?.title || 'chapter'}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="w-10 h-10 rounded-xl hover:bg-[var(--accent-soft)] flex items-center justify-center transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title={t('reader.downloadText')}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Chapter Drawer Modal */}
      <Modal
        isOpen={showTocDrawer}
        onClose={() => setShowTocDrawer(false)}
        title={t('reader.tocWithCount', { count: chapters.length })}
        maxWidth="md"
      >
        <div className="space-y-1">
          {chapters.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => {
                onSelectChapter(ch.id);
                setShowTocDrawer(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs sm:text-sm transition-colors flex items-center justify-between cursor-pointer ${
                ch.id === currentChapterId
                  ? 'bg-[var(--accent)] text-white font-bold'
                  : 'text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <span className="truncate flex-1">{ch.title}</span>
              <span className="text-[11px] opacity-70 ml-2 font-mono">#{idx + 1}</span>
            </button>
          ))}
        </div>
      </Modal>

      {/* Sleep Timer Modal */}
      <Modal
        isOpen={showSleepTimerModal}
        onClose={() => setShowSleepTimerModal(false)}
        title={t('reader.sleepTimerTitle')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSleepTimerMinutes(m);
                  setShowSleepTimerModal(false);
                }}
                className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                  sleepTimerMinutes === m
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-surface-secondary)] border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                {t('reader.minutes', { count: m })}
              </button>
            ))}
          </div>
          {sleepTimerMinutes && (
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={() => {
                setSleepTimerMinutes(null);
                setShowSleepTimerModal(false);
              }}
            >
              {t('reader.cancelTimer')}
            </Button>
          )}
        </div>
      </Modal>

      {/* Typography Appearance Popover */}
      {showAppearancePopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAppearancePopover(false)}
          />
          <div
            className="absolute top-14 right-4 w-72 bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] rounded-2xl p-4 z-50 space-y-4 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-100"
            style={{
              backdropFilter: 'blur(var(--glass-blur-dialog)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur-dialog)) saturate(var(--glass-saturate))',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
              <span className="text-xs font-bold">{t('reader.fontSizeAndSpeed')}</span>
              <button
                onClick={() => setShowAppearancePopover(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{t('reader.readingFontSize')}</span>
                <span className="font-mono text-[var(--accent)] font-bold">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="28"
                step="1"
                value={settings.fontSize}
                onChange={(e) => onUpdateSettings({ fontSize: parseInt(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>{t('reader.readingSpeed')}</span>
                <span className="font-mono text-[var(--accent)] font-bold tabular-nums">
                  {typeof settings.speechRate === 'number' ? settings.speechRate.toFixed(2) : '1.00'}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={settings.speechRate}
                onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                className="w-full accent-[var(--accent)] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
              <span className="text-xs">{t('reader.karaokeColor')}</span>
              <input
                type="checkbox"
                checked={settings.karaokeHighlight}
                onChange={(e) => onUpdateSettings({ karaokeHighlight: e.target.checked })}
                className="accent-[var(--accent)] rounded cursor-pointer"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
