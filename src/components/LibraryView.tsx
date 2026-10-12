import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal,
  LayoutGrid,
  List as ListIcon,
  Plus,
  FileText,
  UploadCloud,
  CheckCircle2,
  KeyRound,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { Book, Chapter } from '../types';
import { parseTxtContent, decodeNovelBuffer, extractCleanTextFromAnyFile } from '../services/txtParser';
import { parseEpubFile } from '../services/epubParser';
import { StorageService } from '../services/storage';
import { BackupService } from '../services/backupService';
import { SearchBar } from './ui/Input';
import { BookCard } from './ui/BookCard';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

export type SortOption = 'newest' | 'recent' | 'most-listened' | 'chapters-count';

interface LibraryViewProps {
  books: Book[];
  onOpenBook: (bookId: string) => void;
  onQuickPlay: (bookId: string) => void;
  onRefreshBooks: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onOpenBook,
  onQuickPlay,
  onRefreshBooks,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Custom delete modal state
  const [bookToDelete, setBookToDelete] = useState<{ id: string; title: string } | null>(null);

  // Import State
  const [importFileName, setImportFileName] = useState('');
  const [importFileBuffer, setImportFileBuffer] = useState<ArrayBuffer | null>(null);
  const [importFileType, setImportFileType] = useState<'txt' | 'epub'>('txt');
  const [customRegex, setCustomRegex] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [pgpPassphrase, setPgpPassphrase] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Drag and drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMethod, setImportMethod] = useState<'file' | 'paste'>('file');
  const [pastedText, setPastedText] = useState('');

  // Auto dismiss success toast
  useEffect(() => {
    if (importSuccessMsg) {
      const timer = setTimeout(() => setImportSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [importSuccessMsg]);

  // Filter & Sort Books
  const processedBooks = useMemo(() => {
    let result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'recent':
          return (
            new Date(b.lastReadTime || b.updatedAt || 0).getTime() -
            new Date(a.lastReadTime || a.updatedAt || 0).getTime()
          );
        case 'most-listened':
          return (b.listenCount || 0) - (a.listenCount || 0);
        case 'chapters-count':
          return (b.totalChapters || 0) - (a.totalChapters || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [books, searchQuery, sortBy]);

  const processFile = async (file: File) => {
    setImportFileName(file.name);
    setImportError(null);

    const baseName = file.name.replace(/\.[^/.]+$/, '');
    setBookTitle(baseName);
    setBookAuthor('Tác giả');

    try {
      const buffer = await file.arrayBuffer();
      setImportFileBuffer(buffer);

      const isZipOrEpub =
        file.name.toLowerCase().endsWith('.epub') ||
        file.name.toLowerCase().endsWith('.zip');

      if (isZipOrEpub) {
        setImportFileType('epub');
      } else {
        setImportFileType('txt');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể đọc tệp tin';
      setImportError(`Lỗi đọc file: ${msg}`);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setShowImportModal(true);
      setImportMethod('file');
      await processFile(files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (importMethod === 'file' && !importFileBuffer) {
      setImportError('Vui lòng chọn một tệp truyện (.txt, .epub, .pgp, .gpg, ...)');
      return;
    }

    if (importMethod === 'paste' && !pastedText.trim()) {
      setImportError('Vui lòng dán nội dung truyện vào khung văn bản.');
      return;
    }

    setIsProcessing(true);
    setImportError(null);

    try {
      const bookId = `book_${Date.now()}`;
      let finalChapters: Chapter[] = [];
      let finalTitle = bookTitle.trim() || 'Tác phẩm mới';
      let finalAuthor = bookAuthor.trim() || 'Khuyết danh';
      let finalDescription = '';
      let coverImage: string | undefined;

      if (importMethod === 'paste') {
        const cleaned = extractCleanTextFromAnyFile(pastedText.trim());
        const parsed = parseTxtContent(cleaned, {
          bookId,
          customChapterRegex: customRegex.trim() || undefined,
        });
        finalChapters = parsed.chapters;
      } else if (importFileBuffer) {
        const decoded = await decodeNovelBuffer(
          importFileBuffer,
          importFileName,
          pgpPassphrase.trim() || undefined
        );

        if (decoded.isEpub) {
          const epubData = await parseEpubFile(importFileBuffer, bookId);
          finalChapters = epubData.chapters;
          finalTitle = epubData.title || finalTitle;
          finalAuthor = epubData.author || finalAuthor;
          finalDescription = epubData.description;
          coverImage = epubData.coverImage;
        } else {
          const parsed = parseTxtContent(decoded.text, {
            bookId,
            customChapterRegex: customRegex.trim() || undefined,
          });
          finalChapters = parsed.chapters;
        }
      }

      if (finalChapters.length === 0) {
        const str = importMethod === 'paste' ? pastedText : 'Nội dung truyện';
        finalChapters = [
          {
            id: `${bookId}_ch_1`,
            bookId,
            title: 'Chương 1',
            chapterIndex: 1,
            content: str,
            paragraphs: [
              {
                id: `${bookId}_ch_1_p_0`,
                chapterId: `${bookId}_ch_1`,
                index: 0,
                text: str,
                sentences: [str],
              },
            ],
            wordCount: str.split(/\s+/).filter(Boolean).length,
          },
        ];
      }

      const newBook: Book = {
        id: bookId,
        title: finalTitle,
        author: finalAuthor,
        description: finalDescription || `Nhập từ file ${importFileName || 'văn bản người dùng'}`,
        language: 'vi',
        coverImagePath: coverImage,
        totalChapters: finalChapters.length,
        lastReadChapterId: finalChapters[0].id,
        lastReadPosition: 1,
        lastReadSentenceIndex: 0,
        listenCount: 0,
        sourceType: importFileType,
        sourcePath: importFileName,
        tags: ['VI-VN', importFileType.toUpperCase()],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      StorageService.saveBook(newBook);
      StorageService.saveChapters(bookId, finalChapters);

      onRefreshBooks();
      setSearchQuery('');
      setShowImportModal(false);
      resetImportForm();
      setImportSuccessMsg(`Đã thêm thành công "${finalTitle}" (${finalChapters.length} chương)!`);
    } catch (err: unknown) {
      console.error('Import failed:', err);
      const msg = err instanceof Error ? err.message : 'Lỗi không xác định khi nạp sách';
      setImportError(`Không thể nạp sách: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImportForm = () => {
    setImportFileName('');
    setImportFileBuffer(null);
    setCustomRegex('');
    setBookTitle('');
    setBookAuthor('');
    setPgpPassphrase('');
    setPastedText('');
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecuteDelete = () => {
    if (!bookToDelete) return;
    try {
      StorageService.deleteBook(bookToDelete.id);
      onRefreshBooks();
      setImportSuccessMsg(`Đã xóa tác phẩm "${bookToDelete.title}".`);
    } catch (e) {
      console.error('Failed to delete book:', e);
    } finally {
      setBookToDelete(null);
    }
  };

  const handleExportTxt = async (book: Book) => {
    const chapters = await StorageService.loadChaptersAsync(book.id);
    const content = BackupService.exportBookAsTxt(book, chapters);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sortLabels: Record<SortOption, string> = {
    newest: t('library.sortNewest'),
    recent: t('library.sortRecent'),
    'most-listened': t('library.sortMostListened'),
    'chapters-count': t('library.sortChaptersCount'),
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className="flex-1 flex flex-col overflow-hidden select-none relative"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 bg-[var(--accent-soft)] border-2 border-dashed border-[var(--accent)] rounded-3xl z-40 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center pointer-events-none m-4">
          <UploadCloud className="w-16 h-16 text-[var(--accent)] animate-bounce mb-2" />
          <div className="text-base font-bold text-[var(--accent)]">
            Thả tệp truyện vào đây để nạp tự động
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            Hỗ trợ .txt, .epub, .pgp, .gpg, .zip
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {importSuccessMsg && (
        <div className="absolute top-4 right-4 z-50 bg-[var(--accent)] text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{importSuccessMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {t('library.title')}
            </h1>
          </div>

          {/* Plus Add Button */}
          <button
            onClick={() => setShowImportModal(true)}
            className="w-11 h-11 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
            title={t('library.addBook')}
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Search Bar + Filter/Sort Button + View Switcher */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={t('library.searchPlaceholder')}
            />
          </div>

          {/* Filter / Sort Button */}
          <button
            onClick={() => setShowSortModal(true)}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0 ${
              showSortModal
                ? 'bg-[var(--accent-soft)] border-[var(--accent-border)] text-[var(--accent)]'
                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-border)]'
            }`}
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            title={`${t('library.sort')}: ${sortLabels[sortBy]}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* View Mode Toggle Button */}
          <button
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-xs transition-colors cursor-pointer shrink-0 ${
              viewMode === 'grid'
                ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm'
                : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-border)]'
            }`}
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            title={viewMode === 'list' ? t('library.viewGrid') : t('library.viewList')}
          >
            {viewMode === 'list' ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <ListIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Books Content with proper bottom clearance */}
      <div className="flex-1 overflow-y-auto p-4 md:px-8">
        {processedBooks.length === 0 ? (
          <div
            className="h-64 flex flex-col items-center justify-center text-center p-6 bg-[var(--glass-bg)] backdrop-blur-md rounded-[22px] border border-[var(--glass-border)]"
            style={{ boxShadow: 'var(--glass-shadow)' }}
          >
            <FileText className="w-12 h-12 text-[var(--text-muted)] mb-2 opacity-60" />
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {t('library.noBooksTitle')}
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
              {t('library.noBooksDesc')}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowImportModal(true)}
              className="mt-4"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              {t('library.addBookNow')}
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="space-y-3 pb-20">
            {processedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                variant="list"
                onOpen={onOpenBook}
                onPlay={onQuickPlay}
                onExport={handleExportTxt}
                onDelete={(id, title) => setBookToDelete({ id, title })}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
            {processedBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                variant="grid"
                onOpen={onOpenBook}
                onPlay={onQuickPlay}
                onExport={handleExportTxt}
                onDelete={(id, title) => setBookToDelete({ id, title })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sort Options Modal */}
      <Modal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        title={t('library.sort')}
        maxWidth="sm"
      >
        <div className="space-y-1">
          {(
            [
              { id: 'newest', label: t('library.sortNewest') },
              { id: 'recent', label: t('library.sortRecent') },
              { id: 'most-listened', label: t('library.sortMostListened') },
              { id: 'chapters-count', label: t('library.sortChaptersCount') },
            ] as const
          ).map((option) => {
            const isSelected = sortBy === option.id;

            return (
              <button
                key={option.id}
                onClick={() => {
                  setSortBy(option.id);
                  setShowSortModal(false);
                }}
                className={`w-full py-3 px-3.5 flex items-center justify-between text-xs sm:text-sm rounded-xl transition-colors cursor-pointer ${
                  isSelected
                    ? 'text-[var(--accent)] font-semibold bg-[var(--accent-soft)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-[var(--accent)] stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!bookToDelete}
        onClose={() => setBookToDelete(null)}
        title={t('library.confirmDeleteTitle')}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)] flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>

          <p className="text-xs text-[var(--text-secondary)] text-center leading-relaxed">
            {t('library.confirmDeleteDesc', { title: bookToDelete?.title || '' })}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setBookToDelete(null)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={handleExecuteDelete}
            >
              {t('library.deleteConfirmBtn')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          resetImportForm();
        }}
        title={t('library.importModalTitle')}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)]">
            {t('library.dragDropHint')}
          </p>

          {/* Import Method Tabs */}
          <div className="flex p-1 bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setImportMethod('file')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                importMethod === 'file'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('library.importMethodFile')}
            </button>
            <button
              type="button"
              onClick={() => setImportMethod('paste')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                importMethod === 'paste'
                  ? 'bg-[var(--bg-card)] text-[var(--accent)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t('library.importMethodPaste')}
            </button>
          </div>

          {importError && (
            <div className="p-3 bg-[var(--danger-soft)] border border-[var(--danger)]/25 rounded-xl text-xs text-[var(--danger)] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {importMethod === 'file' ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                {t('library.chooseFile')}
              </label>
              <div className="border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-2xl p-6 text-center bg-[var(--bg-card)] transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.epub,.pgp,.gpg,.zip,.md,*/*"
                  onChange={handleFileSelected}
                  className="hidden"
                  id="novel-file-input"
                />
                <label
                  htmlFor="novel-file-input"
                  className="flex flex-col items-center justify-center cursor-pointer space-y-2"
                >
                  <UploadCloud className="w-9 h-9 text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {importFileName || t('library.chooseFile')}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {t('library.dragDropHint')}
                  </span>
                </label>
              </div>

              {importFileName && (
                <div className="text-xs text-[var(--accent)] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('common.selected')}: {importFileName}</span>
                </div>
              )}

              {/\.(pgp|gpg|asc)$/i.test(importFileName) && (
                <div className="p-3 bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border)] space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[var(--warning)]" />
                    <span>Mật mã giải mã PGP/GPG</span>
                  </label>
                  <input
                    type="password"
                    value={pgpPassphrase}
                    onChange={(e) => setPgpPassphrase(e.target.value)}
                    placeholder="Để trống nếu là văn bản ký rõ..."
                    className="w-full px-3 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-primary)]">
                {t('library.pastePlaceholder')}
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={t('library.pastePlaceholder')}
                rows={6}
                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none font-mono"
              />
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                {t('library.bookTitleLabel')}
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder={t('library.bookTitleLabel')}
                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                {t('library.authorLabel')}
              </label>
              <input
                type="text"
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder={t('library.authorLabel')}
                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Regex (Regex - Optional)
              </label>
              <input
                type="text"
                value={customRegex}
                onChange={(e) => setCustomRegex(e.target.value)}
                placeholder="Chương \d+, Chapter \d+..."
                className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
            <Button
              variant="secondary"
              size="sm"
              disabled={isProcessing}
              onClick={() => {
                setShowImportModal(false);
                resetImportForm();
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isProcessing}
              disabled={importMethod === 'file' ? !importFileBuffer : !pastedText.trim()}
              onClick={handleConfirmImport}
            >
              {t('library.startImport')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
