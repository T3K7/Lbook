import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Music,
  Download,
  FileArchive,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Volume2,
  XCircle,
  BookOpen,
  Sliders,
  ChevronDown,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Book, Chapter, DictionaryRule, AppSettings } from '../types';
import { StorageService } from '../services/storage';
import { AudioExportService, ChapterProgressInfo } from '../services/audioExportService';
import { VIETNAMESE_VOICE_CATALOG } from './VoiceSelectorModal';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

interface AudioDownloaderViewProps {
  books: Book[];
  activeBookId?: string;
  onSelectBook?: (bookId: string) => void;
  onNavigateToLibrary: () => void;
  settings: AppSettings;
}

interface ChapterExportState {
  status: 'idle' | 'pending' | 'processing' | 'completed' | 'failed';
  percent: number;
  currentChunk: number;
  totalChunks: number;
  blob?: Blob;
  filename?: string;
  sizeBytes?: number;
  rate?: number;
  voice?: string;
  downloadUrl?: string;
  error?: string;
}

export const AudioDownloaderView: React.FC<AudioDownloaderViewProps> = ({
  books,
  activeBookId: initialActiveBookId,
  onSelectBook,
  onNavigateToLibrary,
  settings,
}) => {
  const { t } = useTranslation();

  // Selected Book state
  const [selectedBookId, setSelectedBookId] = useState<string>(() => {
    if (initialActiveBookId && books.some((b) => b.id === initialActiveBookId)) {
      return initialActiveBookId;
    }
    return books[0]?.id || '';
  });

  // Sync selected book if initialActiveBookId or books change
  useEffect(() => {
    if (initialActiveBookId && books.some((b) => b.id === initialActiveBookId)) {
      setSelectedBookId(initialActiveBookId);
    } else if (books.length > 0 && !books.some((b) => b.id === selectedBookId)) {
      setSelectedBookId(books[0].id);
    }
  }, [initialActiveBookId, books, selectedBookId]);

  const selectedBook = useMemo(
    () => books.find((b) => b.id === selectedBookId),
    [books, selectedBookId]
  );

  // Custom book dropdown state & ref
  const [isBookDropdownOpen, setIsBookDropdownOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const bookDropdownRef = useRef<HTMLDivElement>(null);

  // Filtered books in dropdown
  const filteredBooks = useMemo(() => {
    if (!bookSearchQuery.trim()) return books;
    const q = bookSearchQuery.toLowerCase().trim();
    return books.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author && b.author.toLowerCase().includes(q))
    );
  }, [books, bookSearchQuery]);

  // Click outside and Escape key handler for book dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bookDropdownRef.current && !bookDropdownRef.current.contains(e.target as Node)) {
        setIsBookDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBookDropdownOpen(false);
      }
    };
    if (isBookDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBookDropdownOpen]);

  // Load chapters of selected book
  const [chapters, setChapters] = useState<Chapter[]>([]);
  // Selected chapters for download - STRICT RULE: ALWAYS INITIALIZE TO EMPTY SET (0 chapters selected)
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<string>>(() => new Set());
  const [searchChapterQuery, setSearchChapterQuery] = useState('');

  // Range selection & Shift-click tracking
  const [rangeFrom, setRangeFrom] = useState<number>(1);
  const [rangeTo, setRangeTo] = useState<number>(10);
  const lastToggledIndexRef = useRef<number | null>(null);

  useEffect(() => {
    let isCancelled = false;
    // Always reset selection to strictly empty whenever selectedBookId changes or component mounts
    setSelectedChapterIds(new Set());
    lastToggledIndexRef.current = null;

    if (selectedBookId) {
      StorageService.loadChaptersAsync(selectedBookId).then((chs) => {
        if (isCancelled) return;
        setChapters(chs);
        // STRICT RULE: ABSOLUTELY ZERO AUTO-SELECTION. Must remain 0 selected until user manually chooses.
        setSelectedChapterIds(new Set());
        setRangeFrom(1);
        setRangeTo(chs.length > 0 ? Math.min(chs.length, 10) : 1);
        lastToggledIndexRef.current = null;
      });
      setSearchChapterQuery('');
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingChapterId(null);
    } else {
      setChapters([]);
      setSelectedChapterIds(new Set());
      setRangeFrom(1);
      setRangeTo(1);
      lastToggledIndexRef.current = null;
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedBookId]);

  // Audio generation settings
  const [selectedVoice, setSelectedVoice] = useState<string>(settings.defaultVoice || 'vi-VN-default');
  const [selectedRate, setSelectedRate] = useState<number>(settings.speechRate || 1.0);
  const [exportFormat, setExportFormat] = useState<'zip' | 'individual'>('zip');

  // Generation status per chapter
  const [chapterStates, setChapterStates] = useState<Record<string, ChapterExportState>>({});
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [singleDownloadingId, setSingleDownloadingId] = useState<string | null>(null);

  // Last finished download result to provide a 100% reliable direct download button
  const [lastFinishedDownload, setLastFinishedDownload] = useState<{
    filename: string;
    blob?: Blob;
    downloadUrl?: string;
    sizeBytes?: number;
    rate: number;
  } | null>(null);

  const [batchProgress, setBatchProgress] = useState<{
    completedCount: number;
    totalCount: number;
    currentChapterName: string;
    overallPercent: number;
  }>({
    completedCount: 0,
    totalCount: 0,
    currentChapterName: '',
    overallPercent: 0,
  });

  // Abort controller ref for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Audio preview player
  const [previewingChapterId, setPreviewingChapterId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup audio preview on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current = null;
      }
    };
  }, []);



  // Filtered chapters
  const filteredChapters = useMemo(() => {
    if (!searchChapterQuery.trim()) return chapters;
    const q = searchChapterQuery.toLowerCase().trim();
    return chapters.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        `chương ${c.chapterIndex + 1}`.includes(q)
    );
  }, [chapters, searchChapterQuery]);

  // Toggle chapter selection with Shift-Click multi-range support
  const handleToggleChapter = (chapterId: string, event?: React.MouseEvent) => {
    if (isGenerating || singleDownloadingId) return;
    const currentIndex = filteredChapters.findIndex((c) => c.id === chapterId);
    if (currentIndex === -1) return;

    if (event?.shiftKey && lastToggledIndexRef.current !== null && lastToggledIndexRef.current !== -1) {
      const start = Math.min(lastToggledIndexRef.current, currentIndex);
      const end = Math.max(lastToggledIndexRef.current, currentIndex);
      const shouldSelect = !selectedChapterIds.has(chapterId);

      setSelectedChapterIds((prev) => {
        const next = new Set(prev);
        for (let i = start; i <= end; i++) {
          const ch = filteredChapters[i];
          if (ch) {
            if (shouldSelect) {
              next.add(ch.id);
            } else {
              next.delete(ch.id);
            }
          }
        }
        return next;
      });
    } else {
      setSelectedChapterIds((prev) => {
        const next = new Set(prev);
        if (next.has(chapterId)) {
          next.delete(chapterId);
        } else {
          next.add(chapterId);
        }
        return next;
      });
      lastToggledIndexRef.current = currentIndex;
    }
  };

  const handleSelectAllFiltered = () => {
    if (isGenerating || singleDownloadingId) return;
    setSelectedChapterIds(new Set(filteredChapters.map((c) => c.id)));
    setRangeFrom(1);
    setRangeTo(chapters.length || 1);
  };

  const handleDeselectAll = () => {
    if (isGenerating || singleDownloadingId) return;
    setSelectedChapterIds(new Set());
    lastToggledIndexRef.current = null;
  };

  const handleApplyRange = (from: number, to: number) => {
    if (isGenerating || singleDownloadingId || chapters.length === 0) return;
    const clampedFrom = Math.max(1, Math.min(from, chapters.length));
    const clampedTo = Math.max(clampedFrom, Math.min(to, chapters.length));
    setRangeFrom(clampedFrom);
    setRangeTo(clampedTo);

    const targetIds = new Set<string>();
    for (let i = clampedFrom - 1; i < clampedTo; i++) {
      if (chapters[i]) {
        targetIds.add(chapters[i].id);
      }
    }
    setSelectedChapterIds(targetIds);
    lastToggledIndexRef.current = clampedFrom - 1;
  };

  const handleSelectRange = (count: number) => {
    if (isGenerating || singleDownloadingId) return;
    handleApplyRange(1, count);
  };

  const handleSelectNextBatch = (batchSize: number = 10) => {
    if (isGenerating || singleDownloadingId || chapters.length === 0) return;
    let maxIdx = 0;
    chapters.forEach((ch, idx) => {
      if (selectedChapterIds.has(ch.id)) {
        maxIdx = Math.max(maxIdx, idx + 1);
      }
    });
    const nextFrom = maxIdx >= chapters.length ? 1 : maxIdx + 1;
    const nextTo = Math.min(chapters.length, nextFrom + batchSize - 1);
    handleApplyRange(nextFrom, nextTo);
  };

  // Preview single generated chapter
  const handleTogglePreviewAudio = (chapterId: string) => {
    const chState = chapterStates[chapterId];
    if (!chState?.blob) return;

    if (previewingChapterId === chapterId) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingChapterId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      const url = URL.createObjectURL(chState.blob);
      const audio = new Audio(url);
      audio.onended = () => setPreviewingChapterId(null);
      audio.play().catch(() => setPreviewingChapterId(null));
      previewAudioRef.current = audio;
      setPreviewingChapterId(chapterId);
    }
  };

  // Single chapter download directly
  const handleDownloadSingleChapter = async (chapter: Chapter) => {
    // If already generated at this exact speed & voice, trigger direct browser download
    const existing = chapterStates[chapter.id];
    if (
      existing?.blob &&
      existing.filename &&
      existing.rate === selectedRate &&
      existing.voice === selectedVoice
    ) {
      setLastFinishedDownload({
        filename: existing.filename,
        blob: existing.blob,
        downloadUrl: existing.downloadUrl,
        sizeBytes: existing.sizeBytes,
        rate: selectedRate,
      });
      await AudioExportService.triggerDownload(existing.blob, existing.filename, existing.downloadUrl);
      return;
    }

    if (isGenerating || singleDownloadingId) return;

    try {
      setSingleDownloadingId(chapter.id);
      setChapterStates((prev) => ({
        ...prev,
        [chapter.id]: {
          status: 'processing',
          percent: 0,
          currentChunk: 0,
          totalChunks: 1,
        },
      }));

      const dictionaries = StorageService.getDictionaries();
      const rules: DictionaryRule[] = dictionaries.flatMap((d) => d.rules.filter((r) => r.enabled));

      const result = await AudioExportService.synthesizeChapterToMp3(
        chapter,
        {
          bookTitle: selectedBook?.title || 'Lbook',
          voice: selectedVoice,
          rate: selectedRate,
        },
        rules,
        (progress) => {
          setChapterStates((prev) => ({
            ...prev,
            [chapter.id]: {
              status: progress.status === 'completed' ? 'completed' : 'processing',
              percent: progress.percent,
              currentChunk: progress.currentChunk,
              totalChunks: progress.totalChunks,
            },
          }));
        }
      );

      setChapterStates((prev) => ({
        ...prev,
        [chapter.id]: {
          status: 'completed',
          percent: 100,
          currentChunk: 1,
          totalChunks: 1,
          blob: result.blob,
          filename: result.filename,
          sizeBytes: result.sizeBytes,
          rate: selectedRate,
          voice: selectedVoice,
          downloadUrl: result.downloadUrl,
        },
      }));

      setLastFinishedDownload({
        filename: result.filename,
        blob: result.blob,
        downloadUrl: result.downloadUrl,
        sizeBytes: result.sizeBytes,
        rate: selectedRate,
      });

      await AudioExportService.triggerDownload(result.blob, result.filename, result.downloadUrl);
    } catch (err: any) {
      setChapterStates((prev) => ({
        ...prev,
        [chapter.id]: {
          status: 'failed',
          percent: 0,
          currentChunk: 0,
          totalChunks: 1,
          error: err.message || 'Lỗi tạo audio',
        },
      }));
    } finally {
      setSingleDownloadingId(null);
    }
  };

  // Batch download selected chapters
  const handleStartBatchExport = async () => {
    if (selectedChapterIds.size === 0 || !selectedBook) return;

    const chaptersToExport = chapters.filter((c) => selectedChapterIds.has(c.id));
    if (chaptersToExport.length === 0) return;

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const totalToExport = chaptersToExport.length;
    setBatchProgress({
      completedCount: 0,
      totalCount: totalToExport,
      currentChapterName: chaptersToExport[0].title,
      overallPercent: 0,
    });

    const dictionaries = StorageService.getDictionaries();
    const rules: DictionaryRule[] = dictionaries.flatMap((d) => d.rules.filter((r) => r.enabled));

    const generatedResults: Array<{ filename: string; blob: Blob; downloadUrl?: string }> = [];

    try {
      for (let i = 0; i < totalToExport; i++) {
        if (signal.aborted) break;

        const ch = chaptersToExport[i];

        setBatchProgress({
          completedCount: i,
          totalCount: totalToExport,
          currentChapterName: ch.title,
          overallPercent: Math.round((i / totalToExport) * 100),
        });

        // Check if this chapter was already generated in this session at this exact speed & voice
        const existing = chapterStates[ch.id];
        let chapterBlob: Blob | null = null;
        let chapterFilename: string = '';
        let chapterDownloadUrl: string | undefined = undefined;

        if (
          existing?.blob &&
          existing.filename &&
          existing.rate === selectedRate &&
          existing.voice === selectedVoice
        ) {
          chapterBlob = existing.blob;
          chapterFilename = existing.filename;
          chapterDownloadUrl = existing.downloadUrl;
        } else {
          setChapterStates((prev) => ({
            ...prev,
            [ch.id]: {
              status: 'processing',
              percent: 0,
              currentChunk: 0,
              totalChunks: 1,
            },
          }));

          try {
            const res = await AudioExportService.synthesizeChapterToMp3(
              ch,
              {
                bookTitle: selectedBook.title,
                voice: selectedVoice,
                rate: selectedRate,
                signal,
              },
              rules,
              (progress: ChapterProgressInfo) => {
                setChapterStates((prev) => ({
                  ...prev,
                  [ch.id]: {
                    status: progress.status === 'completed' ? 'completed' : 'processing',
                    percent: progress.percent,
                    currentChunk: progress.currentChunk,
                    totalChunks: progress.totalChunks,
                  },
                }));
              }
            );

            chapterBlob = res.blob;
            chapterFilename = res.filename;
            chapterDownloadUrl = res.downloadUrl;

            setChapterStates((prev) => ({
              ...prev,
              [ch.id]: {
                status: 'completed',
                percent: 100,
                currentChunk: 1,
                totalChunks: 1,
                blob: res.blob,
                filename: res.filename,
                sizeBytes: res.sizeBytes,
                rate: selectedRate,
                voice: selectedVoice,
                downloadUrl: res.downloadUrl,
              },
            }));
          } catch (chapterErr: any) {
            if (signal.aborted) throw chapterErr;
            console.error(`Lỗi tạo audio cho ${ch.title}:`, chapterErr);
            setChapterStates((prev) => ({
              ...prev,
              [ch.id]: {
                status: 'failed',
                percent: 0,
                currentChunk: 0,
                totalChunks: 1,
                error: chapterErr.message || 'Lỗi tạo audio',
              },
            }));
            // Continue processing remaining chapters so batch doesn't abort
            continue;
          }
        }

        if (chapterBlob && chapterFilename) {
          generatedResults.push({
            filename: chapterFilename,
            blob: chapterBlob,
            downloadUrl: chapterDownloadUrl,
          });

          // If individual format requested, trigger file download immediately
          if (exportFormat === 'individual') {
            await AudioExportService.triggerDownload(chapterBlob, chapterFilename, chapterDownloadUrl);
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }

      // If ZIP format requested, bundle all chapters into a single ZIP archive
      if (exportFormat === 'zip' && generatedResults.length > 0 && !signal.aborted) {
        setBatchProgress((prev) => ({
          ...prev,
          currentChapterName: 'Đang nén file ZIP...',
          overallPercent: 98,
        }));

        const zipResult = await AudioExportService.bundleChaptersToZip(
          selectedBook.title,
          generatedResults,
          selectedRate
        );

        const dlUrl = await AudioExportService.triggerDownload(zipResult.blob, zipResult.filename);

        setLastFinishedDownload({
          filename: zipResult.filename,
          blob: zipResult.blob,
          downloadUrl: dlUrl,
          sizeBytes: zipResult.blob.size,
          rate: selectedRate,
        });
      } else if (exportFormat === 'individual' && generatedResults.length > 0) {
        const last = generatedResults[generatedResults.length - 1];
        setLastFinishedDownload({
          filename: `${selectedBook.title} — Hoàn tất ${generatedResults.length} file MP3 (${selectedRate.toFixed(2)}x)`,
          blob: last?.blob,
          downloadUrl: last?.downloadUrl,
          sizeBytes: last?.blob.size,
          rate: selectedRate,
        });
      }

      setBatchProgress({
        completedCount: totalToExport,
        totalCount: totalToExport,
        currentChapterName: 'Hoàn tất toàn bộ!',
        overallPercent: 100,
      });
    } catch (err: any) {
      if (signal.aborted) {
        console.log('Batch audio export canceled by user.');
      } else {
        console.error('Batch audio export error:', err);
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelExport = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  };

  // Helper formatting bytes
  const formatBytes = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (books.length === 0) {
    return (
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center select-none">
        <div className="w-20 h-20 rounded-3xl bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)] mb-4 border border-[var(--accent-border)] shadow-md">
          <Music className="w-10 h-10 stroke-[2]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          {t('library.noBooksTitle')}
        </h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
          {t('library.noBooksDesc')}
        </p>
        <Button
          variant="primary"
          onClick={onNavigateToLibrary}
          leftIcon={<BookOpen className="w-4 h-4" />}
        >
          {t('nav.library')}
        </Button>
      </div>
    );
  }

  const isBusy = isGenerating || !!singleDownloadingId;

  return (
    <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden bg-transparent text-[var(--text-primary)] select-none">
      {/* 1. THANH TIÊU ĐỀ GỌN GÀNG & CHỌN TRUYỆN (Compact Header + Story Selector) */}
      <header
        className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-[var(--glass-border)] flex items-center justify-between gap-3 shrink-0 bg-[var(--glass-bg-header)] backdrop-blur-md z-30 transition-colors"
        style={{
          backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        }}
      >
        {/* Tiêu đề ngắn gọn: 🎵 Tải âm thanh */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-xs shrink-0">
            <Music className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] tracking-tight whitespace-nowrap">
                {t('downloader.title')}
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--accent-border)] hidden xs:inline-block">
                MP3 HQ
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate hidden sm:block">
              {t('downloader.subtitle')}
            </p>
          </div>
        </div>

        {/* CHỌN TRUYỆN: Cố định góc trên bên phải, kích thước ổn định, 1 dòng duy nhất có ellipsis */}
        <div className="flex items-center gap-2.5 shrink-0 justify-end ml-auto">
          <div ref={bookDropdownRef} className="relative shrink-0">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setIsBookDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] rounded-xl px-3 h-9 sm:h-10 w-48 xs:w-56 sm:w-64 md:w-72 backdrop-blur-md transition-all cursor-pointer shadow-xs text-left group shrink-0"
              title={selectedBook ? `${selectedBook.title} (${selectedBook.totalChapters} ${t('common.chapter')})` : t('downloader.selectStory')}
            >
              {/* Icon bên trái: luôn giữ nguyên, không bị đẩy hay ẩn */}
              <div className="w-6 h-6 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent-border)] group-hover:scale-105 transition-transform">
                <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
              </div>

              {/* Title Container: min-w-0 flex-1 để CSS ellipsis hoạt động chuẩn xác 1 dòng */}
              <div className="min-w-0 flex-1 overflow-hidden">
                <span className="block text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate whitespace-nowrap">
                  {selectedBook ? selectedBook.title : t('downloader.notSelectedStory')}
                </span>
              </div>

              {/* Chevron bên phải: luôn giữ nguyên ở mép phải */}
              <ChevronDown
                className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-transform duration-200 ${
                  isBookDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                }`}
              />
            </button>

            {/* Menu Dropdown danh sách truyện: Kính mờ theo theme */}
            {isBookDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[92vw] bg-[var(--glass-bg-dropdown)] backdrop-blur-2xl border border-[var(--glass-border-strong)] rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn"
                style={{
                  backdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                  WebkitBackdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                  boxShadow: 'var(--shadow-md), 0 20px 40px -10px rgba(0,0,0,0.15)',
                }}
              >
                {/* Header dropdown */}
                <div className="px-3.5 py-2.5 bg-[var(--glass-bg-soft)] border-b border-[var(--glass-border)] flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
                    {t('downloader.storiesList', { count: books.length })}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)] font-medium">{t('downloader.selectToLoadChapters')}</span>
                </div>

                {/* Tìm kiếm nhanh nếu có trên 3 truyện */}
                {books.length > 3 && (
                  <div className="p-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg-soft)]/50">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                      <input
                        type="text"
                        placeholder={t('downloader.searchStoryPlaceholder')}
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)]"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Danh sách các tác phẩm */}
                <div className="max-h-72 overflow-y-auto divide-y divide-[var(--glass-border-subtle)] py-1">
                  {filteredBooks.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                      {t('downloader.noMatchingStory')}
                    </div>
                  ) : (
                    filteredBooks.map((b) => {
                      const isSelected = b.id === selectedBookId;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedBookId(b.id);
                            setSelectedChapterIds(new Set());
                            lastToggledIndexRef.current = null;
                            onSelectBook?.(b.id);
                            setIsBookDropdownOpen(false);
                            setBookSearchQuery('');
                          }}
                          className={`w-full text-left px-3.5 py-2.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border-l-4 border-[var(--accent)]'
                              : 'hover:bg-[var(--accent-soft)]/50 text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div
                              className={`text-xs sm:text-sm font-semibold truncate ${
                                isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                              }`}
                              title={b.title}
                            >
                              {b.title}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5 flex items-center gap-2">
                              <span className="font-mono text-[var(--accent)] font-semibold">
                                {t('common.chaptersCount', { count: b.totalChapters })}
                              </span>
                              {b.author && (
                                <>
                                  <span className="text-[var(--text-muted)]">•</span>
                                  <span className="truncate max-w-[160px] text-[var(--text-muted)]">{t('common.author')}: {b.author}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nếu đang xuất audio thì hiển thị nút Hủy nhỏ gọn ở header (KHÔNG có nút Tải trùng) */}
          {isGenerating && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancelExport}
              leftIcon={<XCircle className="w-3.5 h-3.5 text-[var(--danger)]" />}
              className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)] text-xs px-2.5 py-1.5"
            >
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </header>
          {/* Audio Config & Filter Toolbar: shrink-0 */}
          <div
            className="p-3 sm:p-4 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md space-y-3 shrink-0 transition-colors"
            style={{
              backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
            }}
          >
            {/* Top row: Chapter selection status & quick selection buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  {t('common.chapter')}:
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-mono">
                  {t('downloader.chaptersSelectedCount', { selected: selectedChapterIds.size, total: chapters.length })}
                </span>
              </div>

              {/* Quick Select Action Buttons & Range Input */}
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  disabled={isBusy}
                  className="px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 border border-[var(--accent-border)] text-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50 font-semibold shadow-xs"
                >
                  {t('common.selectAll')} ({filteredChapters.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  disabled={isBusy}
                  className="px-2.5 py-1 rounded-lg bg-[var(--glass-bg-soft)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50 font-semibold shadow-xs"
                >
                  {t('common.deselectAll')}
                </button>
                {chapters.length >= 10 && (
                  <button
                    type="button"
                    onClick={() => handleSelectRange(10)}
                    disabled={isBusy}
                    className="px-2 py-1 rounded-lg bg-[var(--glass-bg-soft)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50 font-semibold hidden sm:inline-block shadow-xs"
                  >
                    {t('downloader.first10Chapters')}
                  </button>
                )}
                {chapters.length >= 50 && (
                  <button
                    type="button"
                    onClick={() => handleSelectRange(50)}
                    disabled={isBusy}
                    className="px-2 py-1 rounded-lg bg-[var(--glass-bg-soft)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50 font-semibold hidden lg:inline-block shadow-xs"
                  >
                    {t('downloader.first50Chapters')}
                  </button>
                )}
                {chapters.length > 10 && (
                  <button
                    type="button"
                    onClick={() => handleSelectNextBatch(10)}
                    disabled={isBusy}
                    className="px-2 py-1 rounded-lg bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 border border-[var(--accent-border)] text-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50 font-semibold hidden md:inline-block shadow-xs"
                    title={t('downloader.next10Chapters') || '+10 chương kế tiếp'}
                  >
                    {t('downloader.next10Chapters') || '+10 chương kế'}
                  </button>
                )}

                {/* Range Selector Bar */}
                {chapters.length > 1 && (
                  <div className="flex items-center gap-1.5 bg-[var(--glass-bg-soft)] px-2 py-1 rounded-xl border border-[var(--glass-border)] shadow-xs">
                    <span className="text-[var(--text-secondary)] font-medium text-[11px]">{t('downloader.fromChapter') || 'Từ:'}</span>
                    <input
                      type="number"
                      min={1}
                      max={chapters.length || 1}
                      value={rangeFrom}
                      onChange={(e) => setRangeFrom(Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyRange(rangeFrom, rangeTo);
                      }}
                      className="w-12 px-1 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-mono font-bold text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                    <span className="text-[var(--text-secondary)] font-medium text-[11px]">{t('downloader.toChapter') || 'Đến:'}</span>
                    <input
                      type="number"
                      min={1}
                      max={chapters.length || 1}
                      value={rangeTo}
                      onChange={(e) => setRangeTo(Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyRange(rangeFrom, rangeTo);
                      }}
                      className="w-12 px-1 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] text-center font-mono font-bold text-xs focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button
                      type="button"
                      onClick={() => handleApplyRange(rangeFrom, rangeTo)}
                      disabled={isBusy || chapters.length === 0}
                      className="px-2 py-0.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold transition-all cursor-pointer disabled:opacity-50 text-xs shadow-xs"
                    >
                      {t('downloader.applyRange') || 'Chọn'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom row: Voice selector, speed, format, search chapter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-[var(--glass-border)]">
              {/* Voice select */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('downloader.voiceLabel')}
                </label>
                <select
                  value={selectedVoice}
                  disabled={isBusy}
                  onChange={(e) => {
                    const newVoice = e.target.value;
                    setSelectedVoice(newVoice);
                    setChapterStates((prev) => {
                      const next = { ...prev };
                      for (const id in next) {
                        if (next[id].voice !== newVoice || next[id].rate !== selectedRate) {
                          next[id] = {
                            status: 'idle',
                            percent: 0,
                            currentChunk: 0,
                            totalChunks: 1,
                          };
                        }
                      }
                      return next;
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent)] cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {VIETNAMESE_VOICE_CATALOG.map((v) => (
                    <option key={v.id} value={v.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-slate-900 dark:text-slate-100 py-1.5 font-sans">
                      {v.providerName}: {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Speed rate */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('downloader.speedLabel')} <span className="font-mono text-[var(--accent)] font-bold">{selectedRate.toFixed(2)}x</span>
                </label>
                <select
                  value={selectedRate}
                  disabled={isBusy}
                  onChange={(e) => {
                    const newRate = parseFloat(e.target.value);
                    setSelectedRate(newRate);
                    setChapterStates((prev) => {
                      const next = { ...prev };
                      for (const id in next) {
                        if (next[id].rate !== newRate || next[id].voice !== selectedVoice) {
                          next[id] = {
                            status: 'idle',
                            percent: 0,
                            currentChunk: 0,
                            totalChunks: 1,
                          };
                        }
                      }
                      return next;
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] font-medium focus:outline-none focus:border-[var(--accent)] cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {[0.5, 0.75, 0.9, 1.0, 1.1, 1.25, 1.35, 1.5, 1.75, 2.0].map((rate) => (
                    <option key={rate} value={rate} className="bg-[var(--bg-surface)] text-[var(--text-primary)] dark:bg-slate-900 dark:text-slate-100 py-1.5 font-sans">
                      {rate.toFixed(2)}x {rate === 1.0 ? `(${t('player.standardSpeed')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Format */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('downloader.formatLabel')}
                </label>
                <div className="flex items-center gap-1 bg-[var(--glass-bg-soft)] p-0.5 rounded-xl border border-[var(--glass-border)] shadow-xs">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setExportFormat('zip')}
                    className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      exportFormat === 'zip'
                        ? 'bg-[var(--accent)] text-white shadow-xs font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t('downloader.formatZip')}
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setExportFormat('individual')}
                    className={`flex-1 py-1 text-xs rounded-lg font-semibold transition-all cursor-pointer ${
                      exportFormat === 'individual'
                        ? 'bg-[var(--accent)] text-white shadow-xs font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t('downloader.formatIndividual')}
                  </button>
                </div>
              </div>

              {/* Chapter filter */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('bookDetail.searchChapters')}
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    placeholder={t('downloader.searchChapterPlaceholder')}
                    value={searchChapterQuery}
                    onChange={(e) => setSearchChapterQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--glass-border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors shadow-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Batch Progress Banner (when generating): shrink-0 */}
          {isGenerating && (
            <div className="p-3 bg-[var(--accent-soft)] border-b border-[var(--accent-border)] shrink-0 animate-fadeIn">
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <RefreshCw className="w-4 h-4 text-[var(--accent)] animate-spin shrink-0" />
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {batchProgress.currentChapterName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="text-[var(--text-muted)]">
                    {t('common.chapter')} {batchProgress.completedCount + 1}/{batchProgress.totalCount}
                  </span>
                  <span className="font-mono font-bold text-[var(--accent)]">
                    {batchProgress.overallPercent}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[var(--glass-bg-strong)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-300"
                  style={{ width: `${batchProgress.overallPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Download Success & Confirmation Banner: 100% Guaranteed Windows File Delivery */}
          {lastFinishedDownload && !isGenerating && (
            <div className="mx-3 sm:mx-5 my-2.5 p-3.5 sm:p-4 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent-border)] flex flex-wrap items-center justify-between gap-3 text-[var(--accent)] shrink-0 shadow-sm animate-fadeIn">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--accent)]">
                    {t('downloader.downloadCompletedBanner')}
                  </div>
                  <div className="text-sm font-bold text-[var(--text-primary)] truncate max-w-sm sm:max-w-xl font-mono mt-0.5">
                    {lastFinishedDownload.filename}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {t('downloader.actualRenderSpeed')} <span className="font-bold text-[var(--accent)] font-mono">{lastFinishedDownload.rate.toFixed(2)}x</span>
                    {lastFinishedDownload.sizeBytes ? ` • ${t('downloader.fileSize')} ${formatBytes(lastFinishedDownload.sizeBytes)}` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (lastFinishedDownload.blob) {
                      AudioExportService.triggerDownload(
                        lastFinishedDownload.blob,
                        lastFinishedDownload.filename,
                        lastFinishedDownload.downloadUrl
                      );
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  title={t('downloader.saveFileTooltip')}
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>{t('downloader.saveThisFile')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLastFinishedDownload(null)}
                  className="w-8 h-8 rounded-xl hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center transition cursor-pointer text-sm"
                  title={t('downloader.closeAlert')}
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* 3. VÙNG DANH SÁCH CHƯƠNG CHIẾM TOÀN BỘ CHIỀU RỘNG: Independent scrolling with full height and pb-32 */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 space-y-2.5 pb-32 sm:pb-28">
            {filteredChapters.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-muted)] text-sm">
                {t('downloader.noChaptersMatchFilter')}
              </div>
            ) : (
              filteredChapters.map((chapter) => {
                const isChecked = selectedChapterIds.has(chapter.id);
                const state = chapterStates[chapter.id] || { status: 'idle', percent: 0 };
                const isPreviewing = previewingChapterId === chapter.id;
                const isThisSingleDownloading = singleDownloadingId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    onClick={(e) => {
                      // Allow toggling selection by clicking anywhere on row (unless clicking buttons)
                      if ((e.target as HTMLElement).closest('button')) return;
                      handleToggleChapter(chapter.id, e);
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 sm:gap-4 cursor-pointer select-none ${
                      isChecked
                        ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] shadow-xs'
                        : 'bg-[var(--glass-bg-card)] hover:bg-[var(--glass-bg-card-hover)] border-[var(--glass-border)] hover:border-[var(--glass-border-strong)]'
                    }`}
                  >
                    {/* Left: Checkbox & Chapter Info */}
                    <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleChapter(chapter.id, e);
                        }}
                        className="cursor-pointer text-[var(--accent)] shrink-0 disabled:opacity-50 p-1"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--accent)] stroke-[2]" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--accent)] shrink-0 font-mono">
                            #{chapter.chapterIndex + 1}
                          </span>
                          <h4 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                            {chapter.title}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 text-xs text-[var(--text-secondary)] font-medium mt-1 flex-wrap">
                          <span>{t('downloader.wordsCount', { count: chapter.wordCount.toLocaleString() })}</span>
                          <span className="text-[var(--text-muted)]">•</span>
                          <span>
                            {chapter.paragraphs
                              ? t('downloader.paragraphsCount', { count: chapter.paragraphs.length })
                              : t('downloader.paragraph')}
                          </span>
                          {state.sizeBytes && (
                            <>
                              <span className="text-[var(--text-muted)]">•</span>
                              <span className="text-[var(--accent)] font-mono font-semibold">
                                {formatBytes(state.sizeBytes)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: State & Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Status Pill */}
                      {(state.status === 'processing' || isThisSingleDownloading) && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-mono font-bold border border-[var(--accent-border)]">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>{state.percent}%</span>
                        </div>
                      )}

                      {state.status === 'completed' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold border border-[var(--accent-border)]">
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span className="hidden sm:inline">{t('downloader.ready')}</span>
                        </div>
                      )}

                      {state.status === 'failed' && (
                        <div
                          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-semibold border border-[var(--danger)]/30"
                          title={state.error}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{t('downloader.error')}</span>
                        </div>
                      )}

                      {/* Listen preview button if blob available */}
                      {state.blob && (
                        <button
                          type="button"
                          onClick={() => handleTogglePreviewAudio(chapter.id)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                            isPreviewing
                              ? 'bg-[var(--accent)] text-white shadow-xs'
                              : 'bg-[var(--glass-bg-soft)] hover:bg-[var(--glass-bg-strong)] text-[var(--text-primary)] border border-[var(--glass-border)]'
                          }`}
                          title={isPreviewing ? t('downloader.pausePreview') : t('downloader.previewAudio')}
                        >
                          {isPreviewing ? (
                            <Pause className="w-3.5 h-3.5" />
                          ) : (
                            <Play className="w-3.5 h-3.5 ml-0.5" />
                          )}
                        </button>
                      )}

                      {/* Single Chapter Download Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadSingleChapter(chapter)}
                        disabled={isBusy && !isThisSingleDownloading && state.status !== 'completed'}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                          state.status === 'completed'
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent-soft)]/80 border border-[var(--accent-border)]'
                            : isThisSingleDownloading
                            ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]'
                            : 'bg-[var(--glass-bg-soft)] hover:bg-[var(--glass-bg-strong)] text-[var(--text-primary)] border border-[var(--glass-border)] hover:border-[var(--accent-border)]'
                        }`}
                        title={t('downloader.downloadThisChapterTooltip')}
                      >
                        {isThisSingleDownloading ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>MP3</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. BOTTOM SUMMARY FOOTER: Pinned at bottom, shrink-0, backdrop-blur */}
          <footer
            className="p-3 sm:p-4 border-t border-[var(--glass-border)] bg-[var(--glass-bg-player)] backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 z-10 shadow-lg text-[var(--text-primary)]"
            style={{
              backdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
              WebkitBackdropFilter: 'blur(var(--glass-blur-player)) saturate(var(--glass-saturate))',
            }}
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[var(--text-secondary)] font-medium">
              <span>
                {t('downloader.selectedCount')}{' '}
                <strong className="text-[var(--accent)] font-mono text-base font-bold">
                  {selectedChapterIds.size}
                </strong>{' '}
                {t('downloader.totalChaptersCount', { count: chapters.length })}
              </span>
              <span className="text-[var(--text-muted)]">
                {t('downloader.formatLabelShort')}{' '}
                <strong className="text-[var(--text-primary)] font-semibold">
                  {exportFormat === 'zip' ? t('downloader.zipPackage') : t('downloader.individualMp3Files')}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isGenerating ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelExport}
                  leftIcon={<XCircle className="w-4 h-4 text-[var(--danger)]" />}
                  className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger-soft)]"
                >
                  {t('downloader.cancelExport')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedChapterIds.size === 0 || isBusy}
                  onClick={handleStartBatchExport}
                  leftIcon={<Download className="w-4 h-4 stroke-[2.2]" />}
                  className="px-5 sm:px-6 py-2 shadow-md flex items-center gap-2 font-bold text-xs sm:text-sm"
                  title={selectedChapterIds.size === 0 ? 'Vui lòng chọn ít nhất 1 chương để xuất âm thanh' : undefined}
                >
                  <span>
                    {selectedChapterIds.size === 0
                      ? (exportFormat === 'zip'
                          ? t('downloader.selectChaptersPromptZip') || 'Chọn chương để tải ZIP'
                          : t('downloader.selectChaptersPromptMp3') || 'Chọn chương để tải MP3')
                      : exportFormat === 'zip'
                      ? t('downloader.generateAndDownloadZip', { count: selectedChapterIds.size })
                      : t('downloader.generateAndDownloadMp3', { count: selectedChapterIds.size })}
                  </span>
                </Button>
              )}
            </div>
          </footer>
        </div>
  );
};
