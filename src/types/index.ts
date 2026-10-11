export type BookProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  language: string;
  coverImagePath?: string;
  totalChapters: number;
  lastReadChapterId?: string;
  lastReadPosition?: number; // 1-based chapter number or position
  lastReadParagraphIndex?: number;
  lastReadSentenceIndex?: number;
  lastReadPlaybackSeconds?: number;
  progressStatus?: BookProgressStatus;
  listenCount: number;
  lastReadTime?: string;
  sourcePath?: string;
  sourceType: 'txt' | 'epub' | 'manual';
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Paragraph {
  id: string;
  chapterId: string;
  index: number;
  text: string;
  sentences: string[];
}

export interface Chapter {
  id: string;
  bookId: string;
  title: string;
  chapterIndex: number;
  content: string;
  paragraphs: Paragraph[];
  wordCount: number;
  sourceUrl?: string;
}

export interface ReadingProgress {
  bookId: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle?: string;
  paragraphIndex: number;
  sentenceIndex: number;
  chunkIndex?: number;
  playbackSeconds: number; // thời gian phát tính bằng giây
  status: BookProgressStatus;
  characterOffset?: number;
  lastReadAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  paragraphIndex: number;
  sentenceIndex: number;
  snippet: string;
  note?: string;
  createdAt: string;
}

export type SearchMode = 'Exact' | 'Contains' | 'StartsWith' | 'Regex';

export interface DictionaryRule {
  id: string;
  dictionaryId: string;
  searchTerm: string;
  replaceTerm: string;
  searchMode: SearchMode;
  caseInsensitive: boolean;
  enabled: boolean;
}

export interface Dictionary {
  id: string;
  name: string;
  description: string;
  isGlobal: boolean;
  bookId?: string; // If specific to a book
  rules: DictionaryRule[];
  createdAt: string;
}

export type PlaybackState = 'IDLE' | 'LOADING' | 'READY' | 'PLAYING' | 'PAUSED' | 'STOPPING' | 'COMPLETED' | 'ERROR';
export type PlaybackMachineStatus = PlaybackState;

export interface ChapterAudioConfig {
  providerId: string;
  voice: string;
  language: string;
  speed: number;
  pitch: number;
  volume: number;
}

export interface ChapterSession {
  sessionId: string;
  generationId: number;
  bookId: string;
  chapterId: string;
  chapterTitle: string;
  config: ChapterAudioConfig;
  chunks: TtsChunk[];
  currentChunkIndex: number;
  status: PlaybackMachineStatus;
  createdAt: number;
  cacheKey: string;
}

export type ChunkStatus = 'Pending' | 'Processing' | 'Ready' | 'Playing' | 'Completed' | 'Failed';

export interface TtsChunk {
  id: string;
  chapterId: string;
  paragraphIndex: number;
  sentenceIndex: number;
  sequence: number;
  rawText: string;
  processedText: string;
  characterCount: number;
  status: ChunkStatus;
  providerId: string;
  voice: string;
  audioUrl?: string;
  audioDuration?: number;
  error?: string;
}

export interface AudioCacheItem {
  id: string;
  cacheKey: string;
  textHash: string;
  provider: string;
  voice: string;
  language: string;
  rate: number;
  pitch: number;
  duration: number;
  audioBlobUrl?: string;
  createdAt: string;
  lastAccessedAt: string;
}

export interface TtsVoice {
  id: string;
  name: string;
  lang: string;
  gender?: 'male' | 'female' | 'neutral';
  provider: string;
  isDefault?: boolean;
  isLocal?: boolean;
}

export interface AiModelItem {
  id: string;
  modelName: string;
  displayName: string;
  language: string;
  fileSizeMb: number;
  downloadStatus: 'available' | 'downloading' | 'downloaded' | 'ready';
  downloadProgress: number;
  numSpeakers: number;
  sampleRate: number;
  source: string;
  description: string;
}

export interface VisitHistoryItem {
  id: string;
  bookId: string;
  bookTitle: string;
  chapterId: string;
  chapterTitle: string;
  paragraphIndex: number;
  timestamp: string;
}

export type ReaderTheme = 'light' | 'sepia' | 'dark' | 'nord' | 'black' | 'mint' | 'sunset';
export type ReaderFont = 'serif' | 'sans' | 'mono' | 'merriweather' | 'playfair' | 'be-vietnam';
export type AppThemeStyle = 'fluent-dark' | 'fluent-light' | 'midnight-emerald' | 'warm-amber';

export interface AppSettings {
  // Appearance & Reader Design
  theme: ReaderTheme;
  appTheme: AppThemeStyle;
  glassMode: 'dark' | 'light' | 'system';
  wallpaperId: string;
  customWallpaperUrl?: string;
  wallpaperBlur: number; // 0 to 20px
  wallpaperOpacity: number; // 0.2 to 0.95
  fontFamily: ReaderFont;
  fontSize: number; // 14 to 36px
  lineSpacing: number; // 1.4 to 2.4
  paragraphSpacing: number; // 8 to 32px
  readerMaxWidth: number; // 600 to 1200px
  textAlign: 'left' | 'justify';
  karaokeHighlightStyle: 'emerald' | 'amber' | 'violet' | 'underline';
  
  // Reader behavior
  autoNextChapter: boolean;
  karaokeHighlight: boolean;
  autoScrollToSpeech: boolean;

  // TTS Settings
  defaultProviderId: string;
  defaultVoice: string;
  speechRate: number; // 0.5 to 2.5
  speechPitch: number; // 0.5 to 1.5
  speechVolume: number; // 0 to 1.0
  prefetchWindowSize: number; // 2 to 5 chunks
  chunkMaxChars: number; // 150 to 500 chars

  // Data & Localization
  language?: 'vi' | 'en';
  enableAudioCache: boolean;
  logLevel: 'Trace' | 'Debug' | 'Info' | 'Warning' | 'Error';
}
