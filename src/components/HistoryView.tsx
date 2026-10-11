import React, { useState } from 'react';
import { History, Play, Trash2, BookOpen } from 'lucide-react';
import { Book } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface HistoryViewProps {
  books: Book[];
  onResumeReading: (bookId: string, chapterId?: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ books, onResumeReading }) => {
  const [historyItems, setHistoryItems] = useState(() =>
    books
      .filter((b) => b.lastReadTime)
      .map((b) => ({
        id: b.id,
        bookTitle: b.title,
        chapterTitle: `Chương ${b.lastReadPosition || 1}`,
        timeString: new Date(b.lastReadTime || Date.now()).toLocaleString('vi-VN'),
        progressPercent: Math.round(((b.lastReadPosition || 1) / Math.max(1, b.totalChapters || 1)) * 100),
      }))
  );

  const handleClearHistory = () => {
    setHistoryItems([]);
  };

  const totalListenCount = books.reduce((acc, b) => acc + (b.listenCount || 0), 0);

  return (
    <div className="flex-1 flex flex-col bg-[var(--bg-app)] text-[var(--text-primary)] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--border)] flex items-center justify-between shrink-0 bg-[var(--bg-header)] backdrop-blur-md">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
            <History className="w-5 h-5 text-[var(--accent)]" />
            <span>Lịch Sử Đọc &amp; Nghe Truyện</span>
          </h1>
          <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            Ghi nhận tiến trình phát âm thanh và các chương đã đọc
          </div>
        </div>

        {historyItems.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearHistory}
            leftIcon={<Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />}
          >
            Xóa lịch sử
          </Button>
        )}
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card padding="md">
              <div className="text-xs text-[var(--text-muted)]">Tổng số tác phẩm</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-mono tabular-nums mt-1">
                {books.length}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1 font-mono">
                {books.reduce((sum, b) => sum + (b.totalChapters || 0), 0)} chương đã nạp
              </div>
            </Card>

            <Card padding="md">
              <div className="text-xs text-[var(--text-muted)]">Tổng lượt nghe TTS</div>
              <div className="text-2xl font-bold text-[var(--accent)] font-mono tabular-nums mt-1">
                {totalListenCount}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Số lần phát giọng đọc tự động
              </div>
            </Card>

            <Card padding="md">
              <div className="text-xs text-[var(--text-muted)]">Lịch sử ghi nhận</div>
              <div className="text-2xl font-bold text-[var(--text-primary)] font-mono tabular-nums mt-1">
                {historyItems.length}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] mt-1">
                Mục đọc gần nhất
              </div>
            </Card>
          </div>

          {/* History Records Table */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Nhật ký đọc chi tiết
            </div>

            {historyItems.length === 0 ? (
              <Card padding="lg" className="text-center text-xs text-[var(--text-muted)]">
                Chưa có lịch sử đọc nào được ghi nhận. Hãy mở một cuốn truyện trong Thư viện để bắt đầu nghe.
              </Card>
            ) : (
              <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--bg-card)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)] font-semibold border-b border-[var(--border)]">
                    <tr>
                      <th className="p-3">Tác phẩm</th>
                      <th className="p-3">Tiến trình</th>
                      <th className="p-3">Thời gian</th>
                      <th className="p-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {historyItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[var(--accent-soft)] transition-colors">
                        <td className="p-3 font-semibold text-[var(--text-primary)]">{item.bookTitle}</td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-medium">
                            {item.chapterTitle} ({item.progressPercent}%)
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[var(--text-muted)]">
                          {item.timeString}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onResumeReading(item.id)}
                            leftIcon={<Play className="w-3.5 h-3.5 fill-current text-[var(--accent)]" />}
                          >
                            Đọc tiếp
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
