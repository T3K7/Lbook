import React from 'react';
import { Volume2, Minus, Square, X, Palette } from 'lucide-react';
import { Button } from './ui/Button';
import { useTranslation } from '../i18n';

interface TitleBarProps {
  activeViewTitle: string;
  activeBookTitle?: string;
  onOpenAppearanceModal?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  activeViewTitle,
  activeBookTitle,
  onOpenAppearanceModal,
}) => {
  const { t } = useTranslation();

  return (
    <header
      className="h-11 bg-[var(--glass-bg-header)] border-b border-[var(--glass-border)] flex items-center justify-between px-3 select-none shrink-0 z-40 text-[var(--text-primary)] transition-all duration-300"
      style={{
        backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        boxShadow: 'inset 0 -1px 0 0 var(--glass-border)',
      }}
    >
      {/* Zone 1: App Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-xs">
          <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <span className="text-xs font-extrabold tracking-tight text-[var(--text-primary)]">
          {t('common.appTitle')}
        </span>
        <span className="text-[var(--text-muted)] text-xs" aria-hidden="true">·</span>
        <span className="text-xs text-[var(--text-secondary)] truncate max-w-xs font-semibold">
          {activeBookTitle ? `${activeBookTitle} — ${activeViewTitle}` : activeViewTitle}
        </span>
      </div>

      {/* Zone 2: Fast Access (Reading Appearance) */}
      <div className="flex items-center gap-2">
        {onOpenAppearanceModal && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenAppearanceModal}
            leftIcon={<Palette className="w-3.5 h-3.5 text-[var(--accent)]" />}
            className="!h-7 !px-2.5 !text-[11px]"
          >
            <span className="hidden sm:inline">{t('titleBar.readingAppearance')}</span>
          </Button>
        )}
      </div>

      {/* Zone 3: Windows Window Controls */}
      <div className="flex items-center -mr-1 text-[var(--text-muted)]">
        <button
          onClick={() => window.lbookDesktop?.minimize?.()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--glass-bg-soft)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-lg"
          title={t('titleBar.minimize')}
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          onClick={() => window.lbookDesktop?.maximize?.()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--glass-bg-soft)] hover:text-[var(--text-primary)] transition-colors cursor-pointer rounded-lg"
          title={t('titleBar.maximize')}
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          onClick={() => window.lbookDesktop?.close?.()}
          className="w-8 h-8 flex items-center justify-center hover:bg-[var(--danger)] hover:text-white transition-colors cursor-pointer rounded-lg"
          title={t('titleBar.close')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
