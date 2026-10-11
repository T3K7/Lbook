import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  FileText,
  Play,
  Volume2,
  Headphones,
  Clock,
} from 'lucide-react';
import { Book, Chapter, ReadingProgress } from '../types';
import { StorageService } from '../services/storage';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { useTranslation } from '../i18n';

interface BookDetailViewProps {
  book: Book;
  chapters: Chapter[];
  currentChapterId: string;
  onBackToLibrary: () => void;
  onSelectChapter: (chapterId: string) => void;
  onQuickPlay: (chapterId: string, paragraphIndex?: number, sentenceIndex?: number, playbackSeconds?: number) => void;
  onOpenVoiceSelector?: () => void;
  currentVoiceName?: string;
}

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  chapters,
  currentChapterId,
  onBackToLibrary,
  onSelectChapter,
  onQuickPlay,
  onOpenVoiceSelector,
  currentVoiceName = 'Google Tiếng Việt',
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  // Per-book persistent reading progress
  const progress: ReadingProgress | null = useMemo(() => {
    return StorageService.getProgress(book.id);
  }, [book.id, book.updatedAt, book.lastReadChapterId, book.lastReadPosition]);

  // Determine the target resume chapter
  const resumeChapter = useMemo(() => {
    if (progress?.chapterId) {
      const found = chapters.find((c) => c.id === progress.chapterId);
      if (found) return found;
    }
    if (book.lastReadChapterId) {
      const found = chapters.find((c) => c.id === book.lastReadChapterId);
      if (found) return found;
    }
    if (typeof book.lastReadPosition === 'number' && book.lastReadPosition > 0 && chapters.length > 0) {
      const idx = Math.min(book.lastReadPosition - 1, chapters.length - 1);
      return chapters[idx];
    }
    return chapters[0] || null;
  }, [chapters, progress?.chapterId, book.lastReadChapterId, book.lastReadPosition]);

  const resumeChapterIdx = useMemo(() => {
    if (!resumeChapter) return 0;
    const idx = chapters.findIndex((c) => c.id === resumeChapter.id);
    return idx >= 0 ? idx : 0;
  }, [chapters, resumeChapter]);

  // Determine if book has ongoing listening progress
  const hasProgress = useMemo(() => {
    if (progress) {
      return (
        progress.chapterIndex > 0 ||
        progress.paragraphIndex > 0 ||
        progress.sentenceIndex > 0 ||
        progress.playbackSeconds > 0 ||
        progress.status === 'in_progress'
      );
    }
    return Boolean(book.lastReadPosition && book.lastReadPosition > 1);
  }, [progress, book.lastReadPosition]);

  const filteredChapters = chapters.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.chapterIndex.toString().includes(searchQuery)
  );

  const activeChapter = chapters.find((c) => c.id === currentChapterId) || resumeChapter || chapters[0];

  const handleStartOrResume = () => {
    const targetChapter = resumeChapter || activeChapter || chapters[0];
    if (!targetChapter) return;

    if (hasProgress && progress) {
      onQuickPlay(
        targetChapter.id,
        progress.paragraphIndex,
        progress.sentenceIndex,
        progress.playbackSeconds
      );
    } else {
      onQuickPlay(targetChapter.id, 0, 0, 0);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none text-[var(--text-primary)]">
      {/* Top Header */}
      <header
        className="h-12 px-4 sm:px-6 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0 bg-[var(--glass-bg-header)] transition-all duration-300"
        style={{
          backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={onBackToLibrary}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          {t('bookDetail.backToLibrary')}
        </Button>

        <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate max-w-sm">
          {book.title}
        </span>

        {onOpenVoiceSelector && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenVoiceSelector}
            leftIcon={<Volume2 className="w-3.5 h-3.5 text-[var(--accent)]" />}
          >
            <span className="truncate max-w-[120px]">{currentVoiceName}</span>
          </Button>
        )}
      </header>

      {/* Content Area with ample bottom clearance */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 max-w-4xl mx-auto w-full pb-24">
        {/* Book Overview Card */}
        <Card padding="md">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Book Cover */}
            <div className="w-24 h-32 sm:w-28 sm:h-38 rounded-xl overflow-hidden bg-[var(--glass-bg-soft)] shrink-0 border border-[var(--border)] relative" style={{ boxShadow: 'var(--shadow)' }}>
              {book.coverImagePath ? (
                <img
                  src={book.coverImagePath}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-surface-secondary)] text-[var(--text-primary)] p-2 text-center">
                  <FileText className="w-8 h-8 mb-1 text-[var(--accent)] opacity-80" />
                  <span className="text-[10px] font-medium line-clamp-2 leading-tight">
                    {book.title}
                  </span>
                </div>
              )}
            </div>

            {/* Book Information */}
            <div className="flex-1 min-w-0 space-y-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-[var(--text-primary)] leading-snug">
                {book.title}
              </h1>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <Badge variant="emerald">VI-VN</Badge>
                <Badge variant="neutral">{t('bookDetail.totalChapters', { count: chapters.length })}</Badge>
                <Badge variant={hasProgress ? 'emerald' : 'neutral'}>
                  {hasProgress
                    ? `${t('bookDetail.inProgress')}: Chương ${resumeChapterIdx + 1}`
                    : t('bookDetail.notStarted')}
                </Badge>
              </div>

              <div className="text-xs text-[var(--text-secondary)] font-medium">
                {t('common.author')}: {book.author || t('bookDetail.unknownAuthor')} · {t('bookDetail.source')}:{' '}
                {book.sourceType?.toUpperCase() || 'TXT'}
              </div>

              {book.description && (
                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed pt-1 font-medium">
                  {book.description}
                </p>
              )}

              {/* Progress Detail snippet if listening in progress */}
              {hasProgress && progress && (
                <div className="flex items-center gap-2 text-xs text-[var(--accent)] font-semibold bg-[var(--accent-soft)] px-3 py-1.5 rounded-xl border border-[var(--accent-border)] w-fit mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {progress.chapterTitle || `Chương ${resumeChapterIdx + 1}`} • {t('bookDetail.progressSubtitle', { para: progress.paragraphIndex + 1, sentence: progress.sentenceIndex + 1 })}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-[var(--border)]">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleStartOrResume}
                  leftIcon={<Play className="w-4 h-4 fill-current ml-0.5" />}
                >
                  {hasProgress
                    ? t('bookDetail.continueChapter', { number: resumeChapterIdx + 1 })
                    : t('bookDetail.playChapter', { number: 1 })}
                </Button>

                {onOpenVoiceSelector && (
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={onOpenVoiceSelector}
                    leftIcon={<Volume2 className="w-4 h-4 text-[var(--accent)]" />}
                  >
                    <span>{t('bookDetail.changeVoice')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Chapters Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
              {t('bookDetail.chaptersList', { count: chapters.length })}
            </h2>

            <div className="w-48 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('bookDetail.searchChapters')}
                className="w-full h-9 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          {/* Chapters List */}
          <div className="space-y-2">
            {filteredChapters.map((ch, idx) => {
              const isCurrent = ch.id === currentChapterId;

              return (
                <div
                  key={ch.id}
                  onClick={() => onSelectChapter(ch.id)}
                  className={`p-3.5 rounded-[18px] border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    isCurrent
                      ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)] font-semibold shadow-xs'
                      : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border)] hover:border-[var(--accent-border)] text-[var(--text-primary)]'
                  }`}
                  style={{
                    backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                    WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
                    boxShadow: 'var(--glass-shadow)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-semibold truncate group-hover:text-[var(--accent)] transition-colors">
                      {ch.title.startsWith('Phần') || ch.title.startsWith('Chương') || ch.title.startsWith('Chapter') || ch.title.startsWith('Part')
                        ? ch.title
                        : `${t('common.chapter')} ${idx + 1}: ${ch.title}`}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                      {t('common.wordsCount', { count: ch.wordCount || 120 })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    {isCurrent && (
                      <Badge variant="emerald" icon={<Headphones className="w-3 h-3" />}>
                        {t('bookDetail.currentReading')}
                      </Badge>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickPlay(ch.id);
                      }}
                      className="w-8 h-8 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
                      title={t('bookDetail.playThisChapter')}
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
