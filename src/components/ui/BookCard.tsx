import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, MoreVertical, BookOpen, Download, Trash2 } from 'lucide-react';
import { Book } from '../../types';
import { Badge } from './Badge';

interface BookCardProps {
  book: Book;
  variant?: 'list' | 'grid';
  onOpen: (bookId: string) => void;
  onPlay: (bookId: string) => void;
  onExport: (book: Book) => void;
  onDelete: (bookId: string, title: string) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  variant = 'list',
  onOpen,
  onPlay,
  onExport,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 16 });

  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showMenu && moreButtonRef.current) {
      const rect = moreButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 160;

      if (openUpward) {
        setMenuCoords({
          bottom: window.innerHeight - rect.top + 6,
          right: Math.max(12, window.innerWidth - rect.right),
        });
      } else {
        setMenuCoords({
          top: rect.bottom + 6,
          right: Math.max(12, window.innerWidth - rect.right),
        });
      }
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  // Close menu on scroll or resize to prevent detached floating menus
  useEffect(() => {
    if (!showMenu) return;
    const handleScrollOrResize = () => setShowMenu(false);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [showMenu]);

  // Portal Dropdown Menu rendered into document.body to guarantee zero clipping & proper stacking
  const renderDropdownPortal = () => {
    if (!showMenu || typeof document === 'undefined') return null;

    return createPortal(
      <>
        {/* Fullscreen Backdrop Dismissal */}
        <div
          className="fixed inset-0 z-[9998]"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(false);
          }}
        />

        {/* Floating Glass Dropdown Menu */}
        <div
          className="fixed z-[9999] w-48 bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] rounded-2xl shadow-2xl p-1.5 text-xs text-[var(--text-primary)] select-none animate-in fade-in zoom-in-95 duration-150"
          style={{
            backdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
            WebkitBackdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
            boxShadow: 'var(--shadow-md), 0 20px 40px -8px rgba(0,0,0,0.3)',
            ...(menuCoords.top !== undefined ? { top: `${menuCoords.top}px` } : {}),
            ...(menuCoords.bottom !== undefined ? { bottom: `${menuCoords.bottom}px` } : {}),
            right: `${menuCoords.right}px`,
          }}
        >
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider border-b border-[var(--glass-border)] mb-1">
            Tùy chọn tác phẩm
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onOpen(book.id);
            }}
            className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors font-semibold"
          >
            <BookOpen className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Mục lục tác phẩm</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onExport(book);
            }}
            className="w-full text-left px-3 py-2 text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors font-semibold"
          >
            <Download className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Xuất file .TXT</span>
          </button>

          <div className="my-1 border-t border-[var(--glass-border)]" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onDelete(book.id, book.title);
            }}
            className="w-full text-left px-3 py-2 text-[var(--danger)] hover:bg-[var(--danger-soft)] rounded-xl flex items-center gap-2.5 cursor-pointer transition-colors font-semibold"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Xóa truyện khỏi thư viện</span>
          </button>
        </div>
      </>,
      document.body
    );
  };

  // GRID VARIANT
  if (variant === 'grid') {
    return (
      <div
        onClick={() => onOpen(book.id)}
        className="group flex flex-col cursor-pointer transition-all duration-300 select-none p-2.5 rounded-[22px] bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] hover:bg-[var(--glass-bg-strong)] hover:-translate-y-1 hover:shadow-xl relative"
        style={{
          backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
          boxShadow: 'var(--glass-shadow)',
        }}
      >
        {/* Cover 3:4 */}
        <div className="aspect-[3/4] w-full rounded-[16px] overflow-hidden bg-[var(--glass-bg-soft)] relative border border-[var(--glass-border)] group-hover:border-[var(--accent-border)] transition-all duration-300">
          {book.coverImagePath ? (
            <img
              src={book.coverImagePath}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--glass-bg-soft)] text-[var(--text-primary)] p-3 text-center">
              <BookOpen className="w-8 h-8 mb-2 text-[var(--accent)] opacity-80" />
              <span className="text-xs font-bold line-clamp-3 leading-snug">
                {book.title}
              </span>
            </div>
          )}

          {/* Quick Play Overlay on Hover */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-xs">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlay(book.id);
              }}
              className="w-12 h-12 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
              title="Phát ngay"
            >
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>

          {/* Corner Language Badge */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <Badge variant="emerald">VI-VN</Badge>
          </div>

          {/* Grid More 3-Dot Button */}
          <button
            ref={moreButtonRef}
            onClick={handleToggleMenu}
            className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-[var(--glass-bg-strong)] hover:bg-[var(--accent-soft)] text-[var(--text-primary)] hover:text-[var(--accent)] flex items-center justify-center transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shadow-sm border border-[var(--glass-border)]"
            title="Tùy chọn tác phẩm"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info */}
        <div className="mt-2.5 min-w-0 space-y-1">
          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2 leading-snug">
            {book.title}
          </h4>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] font-medium">
            <span>{book.totalChapters} chương</span>
            <span className="text-[var(--accent)] font-semibold">
              {book.progressStatus === 'completed'
                ? 'Đã xong'
                : (book.lastReadPosition && book.lastReadPosition > 1) || book.progressStatus === 'in_progress'
                ? `Tiếp tục: C.${book.lastReadPosition || 1}`
                : `Chương ${book.lastReadPosition || 1}`}
            </span>
          </div>
        </div>

        {/* Render Portal Dropdown */}
        {renderDropdownPortal()}
      </div>
    );
  }

  // LIST VARIANT
  return (
    <div
      onClick={() => onOpen(book.id)}
      className="bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] hover:bg-[var(--glass-bg-strong)] rounded-[20px] p-3.5 sm:p-4 transition-all duration-300 cursor-pointer flex items-center gap-4 group relative select-none hover:-translate-y-0.5 hover:shadow-xl"
      style={{
        backdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(var(--glass-saturate))',
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {/* Cover */}
      <div className="w-16 h-22 sm:w-20 sm:h-26 rounded-[14px] overflow-hidden bg-[var(--glass-bg-soft)] shrink-0 relative border border-[var(--glass-border)] shadow-xs">
        {book.coverImagePath ? (
          <img
            src={book.coverImagePath}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--glass-bg-soft)] text-[var(--text-primary)] p-1 text-center">
            <BookOpen className="w-5 h-5 mb-1 text-[var(--accent)] opacity-80" />
            <span className="text-[9px] font-semibold line-clamp-2 leading-tight">
              {book.title}
            </span>
          </div>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {book.title}
          </h3>
          <Badge variant="emerald">VI-VN</Badge>
        </div>

        <div className="text-xs text-[var(--text-secondary)] font-medium truncate">
          Tác giả: {book.author || 'Khuyết danh'}
        </div>

        {book.description ? (
          <p className="text-xs text-[var(--text-secondary)] line-clamp-1 leading-relaxed font-medium">
            {book.description}
          </p>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
            <span className="text-[10px] font-mono text-[var(--text-secondary)] font-semibold uppercase px-1.5 py-0.5 rounded-md bg-[var(--glass-bg-soft)] border border-[var(--glass-border)]">
              {book.sourceType?.toUpperCase() || 'TXT'}
            </span>
            <span>{book.totalChapters} chương</span>
          </div>
        )}

        <div className="text-xs text-[var(--accent)] font-semibold pt-0.5">
          {book.progressStatus === 'completed'
            ? 'Đã hoàn thành'
            : (book.lastReadPosition && book.lastReadPosition > 1) || book.progressStatus === 'in_progress'
            ? `Tiếp tục: Chương ${book.lastReadPosition || 1}`
            : 'Chưa đọc'}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-2 shrink-0">
        {/* Play Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(book.id);
          }}
          className="w-11 h-11 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
          title="Phát giọng đọc chương đang nghe"
        >
          <Play className="w-5 h-5 fill-current ml-0.5" />
        </button>

        {/* More Actions 3-Dot Button */}
        <button
          ref={moreButtonRef}
          onClick={handleToggleMenu}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
            showMenu
              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]'
              : 'hover:bg-[var(--accent-soft)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
          title="Tùy chọn khác"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      {/* Render Portal Dropdown */}
      {renderDropdownPortal()}
    </div>
  );
};
