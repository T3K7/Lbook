import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Book, Chapter, AppSettings, TtsVoice, TtsChunk, PlaybackState } from './types';
import { StorageService } from './services/storage';
import { ProgressCoordinator } from './services/progressCoordinator';
import { createChunksFromParagraphs } from './services/chunker';
import { TtsAudioPipeline } from './services/tts/ttsAudioPipeline';
import { ThemeProvider, useTheme } from './design-system/ThemeContext';
import { PRESET_BACKGROUNDS } from './design-system/tokens';
import { LanguageProvider, useTranslation } from './i18n';

// Components
import { BackgroundArtwork } from './components/BackgroundArtwork';
import { TitleBar } from './components/TitleBar';
import { Sidebar, NavView } from './components/Sidebar';
import { TtsControlsBar } from './components/TtsControlsBar';
import { LibraryView } from './components/LibraryView';
import { BookDetailView } from './components/BookDetailView';
import { ReaderView } from './components/ReaderView';
import { BackupRestoreView } from './components/BackupRestoreView';
import { SettingsView } from './components/SettingsView';
import { AudioDownloaderView } from './components/AudioDownloaderView';
import { VoiceSelectorModal, VIETNAMESE_VOICE_CATALOG } from './components/VoiceSelectorModal';
import { AppearanceModal } from './components/ui/AppearanceModal';

function MainApp() {
  // Navigation & Data State
  const [books, setBooks] = useState<Book[]>([]);
  const [activeBookId, setActiveBookId] = useState<string>('');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapterId, setCurrentChapterId] = useState<string>('');
  const [currentView, setCurrentView] = useState<NavView>('library');

  // Reader speech position
  const [activeParagraphIndex, setActiveParagraphIndex] = useState<number>(0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState<number>(0);

  // Modals
  const [showVoiceModal, setShowVoiceModal] = useState<boolean>(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState<boolean>(false);

  // Settings & Dictionaries
  const [settings, setSettings] = useState<AppSettings>(() => StorageService.getSettings());
  const [dictionaries, setDictionaries] = useState(() => StorageService.getDictionaries());
  const [systemVoices, setSystemVoices] = useState<TtsVoice[]>([]);

  // Pipeline audio playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('IDLE');
  const [currentChunk, setCurrentChunk] = useState<TtsChunk | undefined>(undefined);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [totalChunksCount, setTotalChunksCount] = useState<number>(0);
  const [cacheStats, setCacheStats] = useState({
    hitRate: '0%',
    entriesCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  const { isDark, backgroundImage, overlayOpacity } = useTheme();
  const { t } = useTranslation();

  // TTS Audio Pipeline Instance
  const pipelineRef = useRef<TtsAudioPipeline | null>(null);

  if (!pipelineRef.current) {
    pipelineRef.current = new TtsAudioPipeline(settings);
  }

  // Active playback session & continuation target
  const currentSessionIdRef = useRef<number>(0);
  const resumeTargetRef = useRef<{
    bookId: string;
    chapterId: string;
    paragraphIndex: number;
    sentenceIndex: number;
    playbackSeconds: number;
    shouldPlay: boolean;
  } | null>(null);

  // Load Initial Data on Mount & Subscribe to reactive books updates
  useEffect(() => {
    const { books: initBooks, activeBookId: initActiveId } = StorageService.init();
    setBooks([...initBooks]);

    if (initActiveId) {
      setActiveBookId(initActiveId);
      const chs = StorageService.getChapters(initActiveId);
      setChapters(chs);
      
      const saved = StorageService.getProgress(initActiveId);
      if (saved && chs.some((c) => c.id === saved.chapterId)) {
        setCurrentChapterId(saved.chapterId);
        setActiveParagraphIndex(saved.paragraphIndex);
        setActiveSentenceIndex(saved.sentenceIndex);
      } else if (chs.length > 0) {
        const lastReadChId = initBooks[0]?.lastReadChapterId || chs[0].id;
        setCurrentChapterId(lastReadChId);
      }
    }

    // Subscribe to books changes from StorageService so all views update reactively immediately
    const unsubscribeBooks = StorageService.subscribeBooks((latestBooks) => {
      setBooks([...latestBooks]);
      setActiveBookId((prev) => prev || (latestBooks[0]?.id ?? ''));
    });

    // Load available voices
    pipelineRef.current?.getProvider('browser').getVoices().then((vList) => {
      setSystemVoices(vList);
    });

    return () => {
      unsubscribeBooks();
    };
  }, []);

  // Update pipeline settings when settings change
  useEffect(() => {
    if (pipelineRef.current) {
      pipelineRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Subscribe to pipeline events
  useEffect(() => {
    const pipeline = pipelineRef.current;
    if (!pipeline) return;

    const unsubscribe = pipeline.subscribe((event) => {
      setPlaybackState(pipeline.getPlaybackState());
      setIsPlaying(pipeline.getIsPlaying());
      setIsPaused(pipeline.getIsPaused());
      setCurrentChunk(pipeline.getCurrentChunk());
      setCurrentChunkIndex(pipeline.getCurrentIndex());
      setTotalChunksCount(pipeline.getQueue().length);
      setCacheStats(pipeline.getCacheStats());

      if (event.type === 'chunk_start' && event.chunk) {
        setActiveParagraphIndex(event.chunk.paragraphIndex);
        setActiveSentenceIndex(event.chunk.sentenceIndex);

        if (activeBookId && currentChapterId) {
          const currentSess = currentSessionIdRef.current;
          const currentAudioTime = pipeline.getCurrentAudioTime();
          const chIdx = chapters.findIndex((c) => c.id === currentChapterId);

          ProgressCoordinator.getInstance().updateProgress(
            {
              bookId: activeBookId,
              chapterId: currentChapterId,
              chapterIndex: chIdx >= 0 ? chIdx : 0,
              chapterTitle: chapters[chIdx]?.title || '',
              paragraphIndex: event.chunk.paragraphIndex,
              sentenceIndex: event.chunk.sentenceIndex,
              chunkIndex: pipeline.getCurrentIndex(),
              playbackSeconds: currentAudioTime,
              status: 'in_progress',
            },
            currentSess,
            false // Throttled periodic save
          );
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeBookId, currentChapterId, chapters]);

  // Flush progress when leaving Reader view
  useEffect(() => {
    if (currentView !== 'reader') {
      ProgressCoordinator.getInstance().flush();
    }
  }, [currentView]);

  const activeBook = useMemo(() => books.find((b) => b.id === activeBookId), [books, activeBookId]);
  const activeChapter = useMemo(() => chapters.find((c) => c.id === currentChapterId), [chapters, currentChapterId]);

  // Active voice readable name
  const activeVoiceLabel = useMemo(() => {
    const found = VIETNAMESE_VOICE_CATALOG.find((v) => v.id === settings.defaultVoice);
    if (found) return `${found.providerName} • ${found.name}`;
    const sys = systemVoices.find((v) => v.id === settings.defaultVoice);
    if (sys) return sys.name;
    return 'Google • vi-VN (Mặc định)';
  }, [settings.defaultVoice, systemVoices]);

  // Build TTS Queue whenever current chapter, dictionaries, or voice changes
  const lastLoadedChapterIdRef = useRef<string>('');
  const lastLoadedVoiceKeyRef = useRef<string>('');

  useEffect(() => {
    if (!activeChapter || !pipelineRef.current) return;

    const voiceKey = `${settings.defaultProviderId}_${settings.defaultVoice}`;
    const chapterSessionKey = `${activeBookId}_${activeChapter.id}`;
    if (
      lastLoadedChapterIdRef.current === chapterSessionKey &&
      lastLoadedVoiceKeyRef.current === voiceKey &&
      pipelineRef.current.getQueue().length > 0
    ) {
      return;
    }

    lastLoadedChapterIdRef.current = chapterSessionKey;
    lastLoadedVoiceKeyRef.current = voiceKey;

    const activeRules = dictionaries.flatMap((d) => d.rules.filter((r) => r.enabled));
    const newChunks = createChunksFromParagraphs(
      activeChapter.id,
      activeChapter.paragraphs,
      activeRules,
      {
        maxCharacters: settings.chunkMaxChars || 240,
        providerId: settings.defaultProviderId || 'google',
        voice: settings.defaultVoice || 'vi-VN-default',
      }
    );

    // Determine starting chunk index based on resume target or saved progress
    let startChunkIndex = 0;
    let seekSeconds = 0;
    let autoPlay = false;

    const target = resumeTargetRef.current;
    if (target && target.bookId === activeBookId && target.chapterId === activeChapter.id) {
      const matchIdx = newChunks.findIndex(
        (c) => c.paragraphIndex === target.paragraphIndex && c.sentenceIndex === target.sentenceIndex
      );
      if (matchIdx >= 0) {
        startChunkIndex = matchIdx;
      } else {
        const paraIdx = newChunks.findIndex((c) => c.paragraphIndex === target.paragraphIndex);
        if (paraIdx >= 0) startChunkIndex = paraIdx;
      }
      seekSeconds = target.playbackSeconds || 0;
      autoPlay = target.shouldPlay;
      resumeTargetRef.current = null;
    } else {
      // If book has saved progress matching this chapter
      const saved = StorageService.getProgress(activeBookId);
      if (saved && saved.chapterId === activeChapter.id && (saved.paragraphIndex > 0 || saved.sentenceIndex > 0)) {
        const matchIdx = newChunks.findIndex(
          (c) => c.paragraphIndex === saved.paragraphIndex && c.sentenceIndex === saved.sentenceIndex
        );
        if (matchIdx >= 0) {
          startChunkIndex = matchIdx;
        } else {
          const paraIdx = newChunks.findIndex((c) => c.paragraphIndex === saved.paragraphIndex);
          if (paraIdx >= 0) startChunkIndex = paraIdx;
        }
      }
    }

    pipelineRef.current.setQueue(newChunks, startChunkIndex, () => {
      handleAutoAdvanceToNextChapter();
    });

    setTotalChunksCount(newChunks.length);
    setCurrentChunkIndex(startChunkIndex);
    const chosenChunk = newChunks[startChunkIndex] || newChunks[0];
    setCurrentChunk(chosenChunk);
    if (chosenChunk) {
      setActiveParagraphIndex(chosenChunk.paragraphIndex);
      setActiveSentenceIndex(chosenChunk.sentenceIndex);
    }

    if (autoPlay) {
      setTimeout(() => {
        pipelineRef.current?.play().then(() => {
          if (seekSeconds > 0) {
            pipelineRef.current?.seekAudioTime(seekSeconds);
          }
        });
      }, 150);
    }
  }, [currentChapterId, activeChapter?.id, activeBookId, dictionaries, settings.defaultVoice, settings.defaultProviderId]);

  // Next chapter auto-advance
  const handleAutoAdvanceToNextChapter = () => {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
    if (currentIndex >= 0 && currentIndex < chapters.length - 1) {
      const nextChapter = chapters[currentIndex + 1];
      const newSession = ProgressCoordinator.getInstance().createSession(activeBookId, nextChapter.id);
      currentSessionIdRef.current = newSession;

      ProgressCoordinator.getInstance().updateProgress(
        {
          bookId: activeBookId,
          chapterId: nextChapter.id,
          chapterIndex: currentIndex + 1,
          chapterTitle: nextChapter.title,
          paragraphIndex: 0,
          sentenceIndex: 0,
          chunkIndex: 0,
          playbackSeconds: 0,
          status: 'in_progress',
        },
        newSession,
        true // Immediate flush!
      );

      setCurrentChapterId(nextChapter.id);
      setActiveParagraphIndex(0);
      setActiveSentenceIndex(0);

      setTimeout(() => {
        pipelineRef.current?.play();
      }, 300);
    } else if (currentIndex === chapters.length - 1 && activeBook) {
      // Completed all chapters of this book
      ProgressCoordinator.getInstance().updateProgress(
        {
          bookId: activeBook.id,
          chapterId: currentChapterId,
          chapterIndex: currentIndex,
          chapterTitle: activeChapter?.title || '',
          paragraphIndex: activeParagraphIndex,
          sentenceIndex: activeSentenceIndex,
          chunkIndex: pipelineRef.current?.getCurrentIndex() || 0,
          playbackSeconds: 0,
          status: 'completed',
        },
        currentSessionIdRef.current,
        true
      );
    }
  };

  const handleOpenBookDetail = (bookId: string) => {
    // Flush current progress before switching book/view
    ProgressCoordinator.getInstance().flush();

    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    setActiveBookId(bookId);
    const chs = StorageService.getChapters(bookId);
    setChapters(chs);

    const saved = StorageService.getProgress(bookId);
    let targetChapterId = '';
    if (saved?.chapterId && chs.some((c) => c.id === saved.chapterId)) {
      targetChapterId = saved.chapterId;
      setActiveParagraphIndex(saved.paragraphIndex);
      setActiveSentenceIndex(saved.sentenceIndex);
    } else {
      targetChapterId = book.lastReadChapterId || chs[0]?.id || '';
      setActiveParagraphIndex(0);
      setActiveSentenceIndex(0);
    }

    setCurrentChapterId(targetChapterId);
    setCurrentView('book-detail');
  };

  const handleContinuePlay = (
    bookId: string,
    chapterId: string,
    paragraphIndex: number = 0,
    sentenceIndex: number = 0,
    playbackSeconds: number = 0
  ) => {
    // 1. Flush previous progress and stop current pipeline
    ProgressCoordinator.getInstance().flush();
    pipelineRef.current?.stop();

    // 2. Set active book and chapters
    setActiveBookId(bookId);
    const chs = StorageService.getChapters(bookId);
    setChapters(chs);

    // 3. New session ID token
    const newSession = ProgressCoordinator.getInstance().createSession(bookId, chapterId);
    currentSessionIdRef.current = newSession;

    // 4. Set resume target
    resumeTargetRef.current = {
      bookId,
      chapterId,
      paragraphIndex,
      sentenceIndex,
      playbackSeconds,
      shouldPlay: true,
    };

    // 5. Update state
    setCurrentChapterId(chapterId);
    setActiveParagraphIndex(paragraphIndex);
    setActiveSentenceIndex(sentenceIndex);
    setCurrentView('reader');

    // 6. Save immediate progress for this start
    const chIdx = chs.findIndex((c) => c.id === chapterId);
    const chTitle = chs[chIdx]?.title || '';
    ProgressCoordinator.getInstance().updateProgress(
      {
        bookId,
        chapterId,
        chapterIndex: chIdx >= 0 ? chIdx : 0,
        chapterTitle: chTitle,
        paragraphIndex,
        sentenceIndex,
        chunkIndex: 0,
        playbackSeconds,
        status: 'in_progress',
      },
      newSession,
      true
    );
  };

  const handleQuickPlayBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (!book) return;

    const chs = StorageService.getChapters(bookId);
    const saved = StorageService.getProgress(bookId);

    let targetChapterId = chs[0]?.id || '';
    let targetPara = 0;
    let targetSentence = 0;
    let targetSecs = 0;

    if (saved && chs.some((c) => c.id === saved.chapterId)) {
      targetChapterId = saved.chapterId;
      targetPara = saved.paragraphIndex;
      targetSentence = saved.sentenceIndex;
      targetSecs = saved.playbackSeconds || 0;
    } else if (book.lastReadChapterId && chs.some((c) => c.id === book.lastReadChapterId)) {
      targetChapterId = book.lastReadChapterId;
    }

    handleContinuePlay(bookId, targetChapterId, targetPara, targetSentence, targetSecs);
  };

  const handleSelectChapterFromDetail = (chapterId: string) => {
    handleContinuePlay(activeBookId, chapterId, 0, 0, 0);

    const ch = chapters.find((c) => c.id === chapterId);
    if (activeBook && ch) {
      StorageService.logHistory({
        id: `hist_${Date.now()}`,
        bookId: activeBook.id,
        bookTitle: activeBook.title,
        chapterId: ch.id,
        chapterTitle: ch.title,
        paragraphIndex: 0,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleSelectChapterInReader = (chapterId: string) => {
    handleContinuePlay(activeBookId, chapterId, 0, 0, 0);
  };

  const handleNextChapter = () => {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
    if (currentIndex < chapters.length - 1) {
      handleSelectChapterInReader(chapters[currentIndex + 1].id);
    }
  };

  const handlePreviousChapter = () => {
    const currentIndex = chapters.findIndex((c) => c.id === currentChapterId);
    if (currentIndex > 0) {
      handleSelectChapterInReader(chapters[currentIndex - 1].id);
    }
  };

  const handleJumpToPosition = async (paragraphIndex: number, sentenceIndex: number) => {
    setActiveParagraphIndex(paragraphIndex);
    setActiveSentenceIndex(sentenceIndex);
    await pipelineRef.current?.jumpToPosition(paragraphIndex, sentenceIndex);

    const currentSess = currentSessionIdRef.current;
    const currentAudioTime = pipelineRef.current?.getCurrentAudioTime() || 0;
    const chIdx = chapters.findIndex((c) => c.id === currentChapterId);

    ProgressCoordinator.getInstance().updateProgress(
      {
        bookId: activeBookId,
        chapterId: currentChapterId,
        chapterIndex: chIdx >= 0 ? chIdx : 0,
        chapterTitle: activeChapter?.title || '',
        paragraphIndex,
        sentenceIndex,
        chunkIndex: pipelineRef.current?.getCurrentIndex() || 0,
        playbackSeconds: currentAudioTime,
        status: 'in_progress',
      },
      currentSess,
      true // Immediate flush on seek!
    );
  };

  const handlePlay = () => {
    if (pipelineRef.current?.getPlaybackState() === 'PAUSED') {
      pipelineRef.current?.resume();
    } else {
      pipelineRef.current?.play();
    }
  };

  const handlePause = () => {
    pipelineRef.current?.pause();

    const currentSess = currentSessionIdRef.current;
    const currentAudioTime = pipelineRef.current?.getCurrentAudioTime() || 0;
    const chIdx = chapters.findIndex((c) => c.id === currentChapterId);

    ProgressCoordinator.getInstance().updateProgress(
      {
        bookId: activeBookId,
        chapterId: currentChapterId,
        chapterIndex: chIdx >= 0 ? chIdx : 0,
        chapterTitle: activeChapter?.title || '',
        paragraphIndex: activeParagraphIndex,
        sentenceIndex: activeSentenceIndex,
        chunkIndex: pipelineRef.current?.getCurrentIndex() || 0,
        playbackSeconds: currentAudioTime,
        status: 'in_progress',
      },
      currentSess,
      true // Immediate flush on pause!
    );
  };

  const handleStop = () => {
    ProgressCoordinator.getInstance().flush();
    pipelineRef.current?.stop();
  };

  const handleNextSentence = async () => {
    await pipelineRef.current?.nextSentence();
    const curChunk = pipelineRef.current?.getCurrentChunk();
    if (curChunk) {
      setActiveParagraphIndex(curChunk.paragraphIndex);
      setActiveSentenceIndex(curChunk.sentenceIndex);
      const chIdx = chapters.findIndex((c) => c.id === currentChapterId);
      ProgressCoordinator.getInstance().updateProgress(
        {
          bookId: activeBookId,
          chapterId: currentChapterId,
          chapterIndex: chIdx >= 0 ? chIdx : 0,
          chapterTitle: activeChapter?.title || '',
          paragraphIndex: curChunk.paragraphIndex,
          sentenceIndex: curChunk.sentenceIndex,
          chunkIndex: pipelineRef.current?.getCurrentIndex() || 0,
          playbackSeconds: pipelineRef.current?.getCurrentAudioTime() || 0,
          status: 'in_progress',
        },
        currentSessionIdRef.current,
        true
      );
    }
  };

  const handlePreviousSentence = async () => {
    await pipelineRef.current?.previousSentence();
    const curChunk = pipelineRef.current?.getCurrentChunk();
    if (curChunk) {
      setActiveParagraphIndex(curChunk.paragraphIndex);
      setActiveSentenceIndex(curChunk.sentenceIndex);
      const chIdx = chapters.findIndex((c) => c.id === currentChapterId);
      ProgressCoordinator.getInstance().updateProgress(
        {
          bookId: activeBookId,
          chapterId: currentChapterId,
          chapterIndex: chIdx >= 0 ? chIdx : 0,
          chapterTitle: activeChapter?.title || '',
          paragraphIndex: curChunk.paragraphIndex,
          sentenceIndex: curChunk.sentenceIndex,
          chunkIndex: pipelineRef.current?.getCurrentIndex() || 0,
          playbackSeconds: pipelineRef.current?.getCurrentAudioTime() || 0,
          status: 'in_progress',
        },
        currentSessionIdRef.current,
        true
      );
    }
  };

  const handleSeekChunk = (index: number) => {
    pipelineRef.current?.jumpToChunk(index);
    const chunk = pipelineRef.current?.getQueue()[index];
    if (chunk) {
      setActiveParagraphIndex(chunk.paragraphIndex);
      setActiveSentenceIndex(chunk.sentenceIndex);
      const chIdx = chapters.findIndex((c) => c.id === currentChapterId);
      ProgressCoordinator.getInstance().updateProgress(
        {
          bookId: activeBookId,
          chapterId: currentChapterId,
          chapterIndex: chIdx >= 0 ? chIdx : 0,
          chapterTitle: activeChapter?.title || '',
          paragraphIndex: chunk.paragraphIndex,
          sentenceIndex: chunk.sentenceIndex,
          chunkIndex: index,
          playbackSeconds: 0,
          status: 'in_progress',
        },
        currentSessionIdRef.current,
        true
      );
    }
  };

  const handleRateChange = (rate: number) => {
    const clampedRate = Math.min(2.0, Math.max(0.5, Number(rate.toFixed(2))));
    const updated = { ...settings, speechRate: clampedRate };
    setSettings(updated);
    StorageService.saveSettings(updated);
    pipelineRef.current?.setPlaybackRate(clampedRate);
  };

  const handleVoiceChange = (providerId: string, voiceId: string) => {
    const updated = {
      ...settings,
      defaultProviderId: providerId,
      defaultVoice: voiceId,
    };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleToggleAutoNext = () => {
    const updated = { ...settings, autoNextChapter: !settings.autoNextChapter };
    setSettings(updated);
    StorageService.saveSettings(updated);
  };

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = { ...settings, ...newPartial };
    setSettings(updated);
    StorageService.saveSettings(updated);
    if (typeof newPartial.speechRate === 'number') {
      pipelineRef.current?.setPlaybackRate(newPartial.speechRate);
    }
  };

  const handleClearAudioCache = () => {
    pipelineRef.current?.clearCache();
    if (pipelineRef.current) {
      setCacheStats(pipelineRef.current.getCacheStats());
    }
  };

  const handlePreviewVoice = (providerId: string, voiceId: string, text: string) => {
    const provider = pipelineRef.current?.getProvider(providerId);
    if (provider) {
      provider
        .synthesize(text, {
          voice: voiceId,
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          volume: settings.speechVolume,
        })
        .then((res) => {
          if (res.audioUrl) {
            const audio = new Audio(res.audioUrl);
            audio.play().catch(console.warn);
          } else if (res.utterance && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(res.utterance);
          }
        });
    }
  };

  const refreshAllData = () => {
    const storedBooks = StorageService.getBooks();
    setBooks([...storedBooks]);
    if (activeBookId) {
      setChapters(StorageService.getChapters(activeBookId));
    }
    setDictionaries(StorageService.getDictionaries());
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden select-none font-sans antialiased relative"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
      }}
    >
      {/* LAYER 1 & LAYER 2: Shared Background Artwork & Theme Overlay */}
      <BackgroundArtwork />

      {/* LAYER 3 & LAYER 4: Glass Surfaces & Content */}
      <div className="relative z-10 flex flex-col h-full w-full">
        {/* 1. Title Bar */}
        <TitleBar
          activeViewTitle={
            currentView === 'library'
              ? t('nav.library')
              : currentView === 'book-detail'
              ? t('bookDetail.chaptersList', { count: chapters.length })
              : currentView === 'reader'
              ? t('nav.reader')
              : currentView === 'audio-download'
              ? t('nav.audioDownload')
              : currentView === 'backup'
              ? t('nav.backup')
              : t('nav.settings')
          }
          activeBookTitle={activeBook?.title}
          onOpenAppearanceModal={() => setShowAppearanceModal(true)}
        />

        {/* 2. Main Workspace Layout */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Sidebar */}
          <Sidebar
            currentView={currentView}
            onSelectView={(view) => {
              if (view === 'library') {
                setCurrentView('library');
              } else if (view === 'reader') {
                if (activeBook) setCurrentView('reader');
              } else {
                setCurrentView(view);
              }
            }}
            hasActiveBook={!!activeBook}
            activeBookTitle={activeBook?.title}
            totalBooksCount={books.length}
          />

          {/* Dynamic Main Viewport */}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
            {/* View 1: Library View */}
            {currentView === 'library' && (
              <LibraryView
                books={books}
                onOpenBook={handleOpenBookDetail}
                onQuickPlay={handleQuickPlayBook}
                onRefreshBooks={refreshAllData}
              />
            )}

            {/* View 2: Book Detail & Chapter List */}
            {currentView === 'book-detail' && activeBook && (
              <BookDetailView
                book={activeBook}
                chapters={chapters}
                currentChapterId={currentChapterId}
                onBackToLibrary={() => setCurrentView('library')}
                onSelectChapter={handleSelectChapterFromDetail}
                onQuickPlay={(chId, pIdx, sIdx, secs) => handleContinuePlay(activeBook.id, chId, pIdx, sIdx, secs)}
                onOpenVoiceSelector={() => setShowVoiceModal(true)}
                currentVoiceName={activeVoiceLabel}
              />
            )}

            {/* View 3: Reader & TTS Playback */}
            {currentView === 'reader' && activeBook && (
              <ReaderView
                book={activeBook}
                chapters={chapters}
                currentChapterId={currentChapterId}
                activeParagraphIndex={activeParagraphIndex}
                activeSentenceIndex={activeSentenceIndex}
                isPlaying={isPlaying}
                isPaused={isPaused}
                playbackState={playbackState}
                settings={settings}
                activeVoiceLabel={activeVoiceLabel}
                onBackToBookDetail={() => setCurrentView('book-detail')}
                onSelectChapter={handleSelectChapterInReader}
                onJumpToPosition={handleJumpToPosition}
                onPlay={handlePlay}
                onPause={handlePause}
                onNextSentence={handleNextSentence}
                onPreviousSentence={handlePreviousSentence}
                onNextChapter={handleNextChapter}
                onPreviousChapter={handlePreviousChapter}
                onOpenVoiceModal={() => setShowVoiceModal(true)}
                onUpdateSettings={handleUpdateSettings}
              />
            )}

            {/* View 3b: Audio Downloader */}
            {currentView === 'audio-download' && (
              <AudioDownloaderView
                books={books}
                activeBookId={activeBookId}
                onSelectBook={(bId) => {
                  setActiveBookId(bId);
                  const chs = StorageService.getChapters(bId);
                  setChapters(chs);
                  if (chs.length > 0) {
                    setCurrentChapterId(chs[0].id);
                  }
                }}
                onNavigateToLibrary={() => setCurrentView('library')}
                settings={settings}
              />
            )}

            {/* View 4: Backup & Restore */}
            {currentView === 'backup' && (
              <BackupRestoreView onDataRestored={refreshAllData} />
            )}

            {/* View 5: Settings */}
            {currentView === 'settings' && (
              <SettingsView
                settings={settings}
                voices={VIETNAMESE_VOICE_CATALOG.map((v) => ({
                  id: v.id,
                  name: `${v.providerName}: ${v.name}`,
                  lang: v.lang,
                  provider: v.provider,
                  gender: v.gender,
                }))}
                cacheStats={cacheStats}
                onUpdateSettings={handleUpdateSettings}
                onClearAudioCache={handleClearAudioCache}
              />
            )}
          </main>
        </div>

        {/* 3. Persistent Audio Playback Dock */}
        {currentView !== 'reader' && currentView !== 'audio-download' && activeBook && (
          <TtsControlsBar
            currentChunk={currentChunk}
            currentChunkIndex={currentChunkIndex}
            totalChunksCount={totalChunksCount}
            isPlaying={isPlaying}
            isPaused={isPaused}
            playbackState={playbackState}
            bookTitle={activeBook?.title}
            chapterTitle={activeChapter?.title}
            speechRate={settings.speechRate}
            autoNextChapter={settings.autoNextChapter}
            voices={VIETNAMESE_VOICE_CATALOG.map((v) => ({
              id: v.id,
              name: `${v.providerName}: ${v.name}`,
              lang: v.lang,
              provider: v.provider,
              gender: v.gender,
            }))}
            activeVoice={settings.defaultVoice}
            cacheHitStats={cacheStats}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onNextSentence={handleNextSentence}
            onPreviousSentence={handlePreviousSentence}
            onRateChange={handleRateChange}
            onVoiceChange={(voiceId) => {
              const matched = VIETNAMESE_VOICE_CATALOG.find((v) => v.id === voiceId);
              handleVoiceChange(
                matched?.provider === 'microsoft' ? 'edge-online' : 'google',
                voiceId
              );
            }}
            onToggleAutoNext={handleToggleAutoNext}
            onSeekChunk={handleSeekChunk}
          />
        )}

        {/* 4. Voice Selector Modal */}
        <VoiceSelectorModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          activeProviderId={settings.defaultProviderId}
          activeVoiceId={settings.defaultVoice}
          systemVoices={systemVoices}
          onSelectVoice={handleVoiceChange}
          onPreviewVoice={handlePreviewVoice}
        />

        {/* 5. Reading Theme & Appearance Modal */}
        <AppearanceModal
          isOpen={showAppearanceModal}
          onClose={() => setShowAppearanceModal(false)}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </LanguageProvider>
  );
}
