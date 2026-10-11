import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div
        className={`w-full ${maxWidthStyles[maxWidth]} bg-[var(--glass-bg-strong)] border border-[var(--glass-border-strong)] rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh] text-[var(--text-primary)] animate-in zoom-in-95 duration-200`}
        style={{
          backdropFilter: 'blur(var(--glass-blur-dialog)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-dialog)) saturate(var(--glass-saturate))',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {title && (
          <div className="px-5 py-4 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0 bg-[var(--glass-bg-soft)]">
            <div className="text-base font-bold text-[var(--text-primary)]">{title}</div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
