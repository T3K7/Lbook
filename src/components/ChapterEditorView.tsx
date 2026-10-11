import React, { useState } from 'react';
import {
  Split,
  Merge,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  FileText,
} from 'lucide-react';
import { Book, Chapter } from '../types';
import { ChapterEngine } from '../services/chapterEngine';
import { StorageService } from '../services/storage';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ChapterEditorViewProps {
  book: Book;
  chapters: Chapter[];
  onUpdateChapters: (updatedChapters: Chapter[]) => void;
  onSelectChapterToRead: (chapterId: string) => void;
}

export const ChapterEditorView: React.FC<ChapterEditorViewProps> = ({
  book,
  chapters,
  onUpdateChapters,
  onSelectChapterToRead,
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    chapters[0]?.id || ''
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  // Split dialog state
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitParaIndex, setSplitParaIndex] = useState(1);
  const [newSplitTitle, setNewSplitTitle] = useState('');

  // Edit raw text dialog state
  const [showEditTextDialog, setShowEditTextDialog] = useState(false);
  const [rawTextContent, setRawTextContent] = useState('');

  // Re-detect with regex dialog
  const [showReDetectDialog, setShowReDetectDialog] = useState(false);
  const [customRegex, setCustomRegex] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const selectedChapter = chapters.find(c => c.id === selectedChapterId) || chapters[0];

  const handleRename = () => {
    if (!newTitle.trim() || !selectedChapter) return;
    const updated = ChapterEngine.renameChapter(chapters, selectedChapter.id, newTitle.trim());
    StorageService.saveChapters(book.id, updated);
    onUpdateChapters(updated);
    setEditingTitle(false);
    showNotice(`Đã đổi tên chương thành: "${newTitle.trim()}"`);
  };

  const handleMove = (direction: 'up' | 'down') => {
    if (!selectedChapter) return;
    const updated = ChapterEngine.moveChapter(chapters, selectedChapter.id, direction);
    StorageService.saveChapters(book.id, updated);
    onUpdateChapters(updated);
  };

  const handleMergeNext = () => {
    if (!selectedChapter) return;
    if (window.confirm(`Bạn có chắc chắn muốn gộp chương này với chương liền kề phía sau?`)) {
      const updated = ChapterEngine.mergeWithNext(chapters, selectedChapter.id);
      StorageService.saveChapters(book.id, updated);
      onUpdateChapters(updated);
      showNotice('Đã gộp hai chương thành công.');
    }
  };

  const handleConfirmSplit = () => {
    if (!selectedChapter) return;
    const updated = ChapterEngine.splitChapter(
      chapters,
      selectedChapter.id,
      splitParaIndex,
      newSplitTitle
    );
    StorageService.saveChapters(book.id, updated);
    onUpdateChapters(updated);
    setShowSplitDialog(false);
    showNotice('Đã tách chương thành công.');
  };

  const handleDelete = () => {
    if (!selectedChapter) return;
    if (chapters.length <= 1) {
      alert('Không thể xóa chương duy nhất của cuốn sách.');
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa chương "${selectedChapter.title}"?`)) {
      const updated = ChapterEngine.deleteChapter(chapters, selectedChapter.id);
      StorageService.saveChapters(book.id, updated);
      onUpdateChapters(updated);
      setSelectedChapterId(updated[0]?.id || '');
      showNotice('Đã xóa chương.');
    }
  };

  const handleOpenRawTextEditor = () => {
    if (!selectedChapter) return;
    const fullText = selectedChapter.paragraphs.map(p => p.text).join('\n\n');
    setRawTextContent(fullText);
    setShowEditTextDialog(true);
  };

  const handleSaveRawText = () => {
    if (!selectedChapter) return;
    const updated = ChapterEngine.updateContent(
      chapters,
      selectedChapter.id,
      rawTextContent
    );
    StorageService.saveChapters(book.id, updated);
    onUpdateChapters(updated);
    setShowEditTextDialog(false);
    showNotice('Đã cập nhật lại nội dung văn bản và cấu trúc câu.');
  };

  const handleReDetect = () => {
    if (window.confirm('Hành động này sẽ phân tích lại toàn bộ các chương trong sách dựa theo bộ nhận diện. Tiếp tục?')) {
      const fullText = chapters.map(c => `${c.title}\n\n${c.content}`).join('\n\n');
      const updated = ChapterEngine.reDetectAll(book.id, fullText, customRegex.trim() || undefined);
      StorageService.saveChapters(book.id, updated);
      onUpdateChapters(updated);
      setSelectedChapterId(updated[0]?.id || '');
      setShowReDetectDialog(false);
      showNotice(`Đã phân tích lại! Nhận diện được ${updated.length} chương.`);
    }
  };

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <span>Quản Lý Cấu Trúc Chương: {book.title}</span>
          </h1>
          <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Tổng cộng {chapters.length} chương · Đổi tên, tách, gộp, sắp xếp và sửa lỗi ngắt chương
          </div>
        </div>

        <div className="flex items-center gap-2">
          {statusMessage && (
            <div className="px-3 py-1 bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[var(--accent)] text-xs rounded-xl flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowReDetectDialog(true)}
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-[var(--accent)]" />}
          >
            Quét lại toàn bộ chương
          </Button>
        </div>
      </div>

      {/* Main split layout: Left list, Right detail & actions */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chapter List Column */}
        <div className="w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col shrink-0">
          <div className="p-3 border-b border-[var(--border)] text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Danh sách chương ({chapters.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((ch, idx) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChapterId(ch.id)}
                className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-start justify-between cursor-pointer ${
                  ch.id === selectedChapter?.id
                    ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-semibold shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] border border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate">{ch.title}</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {ch.paragraphs.length} đoạn · {ch.wordCount} từ
                  </div>
                </div>
                <span className="text-[10px] font-mono opacity-60 ml-2">#{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Chapter Details & Action Workbench */}
        {selectedChapter ? (
          <div className="flex-1 flex flex-col overflow-y-auto p-6 bg-[var(--bg-app)]">
            {/* Chapter Header Controls */}
            <Card padding="md" className="mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        autoFocus
                        className="px-3 py-1.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] flex-1"
                      />
                      <Button variant="primary" size="sm" onClick={handleRename}>
                        Lưu
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTitle(false)}>
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-[var(--text-primary)]">
                        {selectedChapter.title}
                      </h2>
                      <button
                        onClick={() => {
                          setNewTitle(selectedChapter.title);
                          setEditingTitle(true);
                        }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                        title="Đổi tên chương"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                    <span>Thứ tự: Chương {selectedChapter.chapterIndex}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedChapter.paragraphs.length} đoạn</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{selectedChapter.wordCount} từ</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onSelectChapterToRead(selectedChapter.id)}
                  >
                    Đọc &amp; Nghe chương này
                  </Button>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMove('up')}
                  disabled={selectedChapter.chapterIndex <= 1}
                  leftIcon={<ArrowUp className="w-3.5 h-3.5" />}
                >
                  Lên trên
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleMove('down')}
                  disabled={selectedChapter.chapterIndex >= chapters.length}
                  leftIcon={<ArrowDown className="w-3.5 h-3.5" />}
                >
                  Xuống dưới
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSplitParaIndex(Math.max(1, Math.floor(selectedChapter.paragraphs.length / 2)));
                    setNewSplitTitle(`${selectedChapter.title} (Phần 2)`);
                    setShowSplitDialog(true);
                  }}
                  leftIcon={<Split className="w-3.5 h-3.5" />}
                >
                  Tách chương
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleMergeNext}
                  disabled={selectedChapter.chapterIndex >= chapters.length}
                  leftIcon={<Merge className="w-3.5 h-3.5" />}
                >
                  Gộp với chương sau
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenRawTextEditor}
                  leftIcon={<FileText className="w-3.5 h-3.5" />}
                >
                  Sửa nội dung văn bản
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Xóa
                </Button>
              </div>
            </Card>

            {/* Paragraph Preview in Chapter */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Xem trước các đoạn văn trong chương
              </div>

              <div className="space-y-2">
                {selectedChapter.paragraphs.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-xs leading-relaxed text-[var(--text-primary)]"
                  >
                    <span className="font-mono text-[10px] text-[var(--text-muted)] mr-2 select-none">
                      #{idx + 1}
                    </span>
                    <span>{p.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Edit Raw Text Dialog */}
      <Modal
        isOpen={showEditTextDialog}
        onClose={() => setShowEditTextDialog(false)}
        title={`Chỉnh sửa văn bản: ${selectedChapter?.title}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <textarea
            value={rawTextContent}
            onChange={(e) => setRawTextContent(e.target.value)}
            rows={12}
            className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditTextDialog(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveRawText}>
              Lưu &amp; Phân tích lại câu
            </Button>
          </div>
        </div>
      </Modal>

      {/* Split Dialog */}
      <Modal
        isOpen={showSplitDialog}
        onClose={() => setShowSplitDialog(false)}
        title="Tách chương thành 2 phần"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Tên chương mới sau khi tách:
            </label>
            <input
              type="text"
              value={newSplitTitle}
              onChange={(e) => setNewSplitTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Điểm cắt (từ đoạn số):
            </label>
            <input
              type="number"
              min={1}
              max={Math.max(1, (selectedChapter?.paragraphs.length || 2) - 1)}
              value={splitParaIndex}
              onChange={(e) => setSplitParaIndex(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowSplitDialog(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmSplit}>
              Xác nhận tách
            </Button>
          </div>
        </div>
      </Modal>

      {/* Re-detect Dialog */}
      <Modal
        isOpen={showReDetectDialog}
        onClose={() => setShowReDetectDialog(false)}
        title="Quét lại toàn bộ chương"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-[var(--text-secondary)] mb-1">
              Regex phát hiện chương (tùy chọn):
            </label>
            <input
              type="text"
              value={customRegex}
              onChange={(e) => setCustomRegex(e.target.value)}
              placeholder="Mặc định: /(Chương|Hồi|Phần|Quyển|Tiết|Bồi)\s*\d+/i"
              className="w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setShowReDetectDialog(false)}>
              Hủy
            </Button>
            <Button variant="primary" size="sm" onClick={handleReDetect}>
              Bắt đầu quét
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
