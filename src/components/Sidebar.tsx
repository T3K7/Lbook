import React from 'react';
import {
  Library,
  HardDriveDownload,
  Settings,
  BookOpen,
  ChevronRight,
  Volume2,
  Music,
} from 'lucide-react';
import { useTranslation } from '../i18n';

export type NavView =
  | 'library'
  | 'book-detail'
  | 'reader'
  | 'audio-download'
  | 'backup'
  | 'settings';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  hasActiveBook: boolean;
  activeBookTitle?: string;
  totalBooksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  hasActiveBook,
  activeBookTitle,
  totalBooksCount,
}) => {
  const { t } = useTranslation();

  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    {
      id: 'library',
      label: t('nav.library'),
      icon: <Library className="w-4 h-4 shrink-0 stroke-[2]" />,
      badge: totalBooksCount,
    },
    ...(hasActiveBook
      ? [
          {
            id: 'reader' as NavView,
            label: t('nav.reader'),
            icon: <BookOpen className="w-4 h-4 shrink-0 stroke-[2]" />,
          },
        ]
      : []),
    {
      id: 'audio-download',
      label: t('nav.audioDownload'),
      icon: <Music className="w-4 h-4 shrink-0 stroke-[2]" />,
    },
    {
      id: 'backup',
      label: t('nav.backup'),
      icon: <HardDriveDownload className="w-4 h-4 shrink-0 stroke-[2]" />,
    },
    {
      id: 'settings',
      label: t('nav.settings'),
      icon: <Settings className="w-4 h-4 shrink-0 stroke-[2]" />,
    },
  ];

  return (
    <aside
      className="w-72 bg-[var(--glass-bg-sidebar)] border-r border-[var(--glass-border)] flex flex-col shrink-0 select-none z-30 transition-all duration-300"
      style={{
        backdropFilter: 'blur(var(--glass-blur-sidebar)) saturate(var(--glass-saturate))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-sidebar)) saturate(var(--glass-saturate))',
        boxShadow: 'inset -1px 0 0 0 var(--glass-border)',
      }}
    >
      {/* Brand Identity */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-xs">
          <Volume2 className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
            <span>{t('common.appTitle')}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--accent-soft)] text-[var(--accent)] font-bold border border-[var(--accent-border)]">
              {t('common.proBadge')}
            </span>
          </div>
          <div className="text-xs text-[var(--text-secondary)] font-medium">
            {t('common.appSubtitle')}
          </div>
        </div>
      </div>

      {/* Now Playing Widget if active book */}
      {hasActiveBook && activeBookTitle && (
        <div className="p-3 border-b border-[var(--glass-border)] bg-[var(--glass-bg-soft)]">
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center justify-between px-1">
            <span>{t('common.nowReading')}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          </div>
          <button
            onClick={() => onSelectView('reader')}
            className="w-full text-left flex items-center justify-between p-2.5 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-strong)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] transition-all cursor-pointer group shadow-xs"
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent-border)]">
                <BookOpen className="w-3.5 h-3.5 stroke-[2]" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                {activeBookTitle}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      )}

      {/* Main Navigation Menu with independent scroll */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider px-3 py-1.5">
          {t('nav.mainMenu')}
        </div>

        {navItems.map((item) => {
          const isActive =
            currentView === item.id ||
            (item.id === 'library' && currentView === 'book-detail');

          return (
            <button
              key={item.id}
              onClick={() => onSelectView(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-xs rounded-xl transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)] font-bold shadow-xs'
                  : 'text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg-soft)] hover:border-[var(--glass-border)] border border-transparent'
              }`}
            >
              <span
                className={`p-1 rounded-lg ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                }`}
              >
                {item.icon}
              </span>
              <span className="truncate flex-1">{item.label}</span>

              {item.badge !== undefined && (
                <span
                  className={`text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-md font-semibold ${
                    isActive
                      ? 'bg-[var(--accent)] text-white font-bold'
                      : 'bg-[var(--glass-bg-soft)] text-[var(--text-secondary)] border border-[var(--glass-border)]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3.5 border-t border-[var(--glass-border)] text-xs text-[var(--text-secondary)] space-y-1.5 bg-[var(--glass-bg-soft)]/50">
        <div className="flex items-center justify-between text-[11px] font-medium">
          <span>{t('nav.readingEngine')}</span>
          <span className="text-[var(--accent)] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            Google Tiếng Việt
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium pt-1 border-t border-[var(--glass-border)]">
          <span>{t('common.appTitle')}</span>
          <span className="font-mono font-semibold">v0.1.1</span>
        </div>
      </div>
    </aside>
  );
};
