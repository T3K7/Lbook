import React, { useRef } from 'react';
import { Sun, Moon, Laptop, Plus, Check, Image as ImageIcon } from 'lucide-react';
import { useTheme } from '../../design-system/ThemeContext';
import { PRESET_BACKGROUNDS } from '../../design-system/tokens';
import { Modal } from './Modal';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({ isOpen, onClose }) => {
  const {
    themeMode,
    setThemeMode,
    isDark,
    backgroundImage,
    setBackgroundImage,
    overlayOpacity,
    setOverlayOpacity,
  } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setBackgroundImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const currentBgItem = PRESET_BACKGROUNDS.find((b) => b.id === backgroundImage);
  const isCustomUpload =
    backgroundImage.startsWith('data:') ||
    (!currentBgItem && backgroundImage !== 'none');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Giao diện đọc &amp; Hiển thị" maxWidth="lg">
      <div className="space-y-6 text-[var(--text-primary)]">
        {/* 1. Preview Area */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>Xem trước giao diện</span>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-[var(--border)] p-4 bg-[var(--bg-card)] backdrop-blur-md flex items-center gap-4 shadow-xs">
            {/* Phone mini mockup */}
            <div className="w-18 h-28 rounded-xl overflow-hidden border border-[var(--border)] relative shadow-md shrink-0 bg-[var(--bg-app)]">
              {backgroundImage !== 'none' && (
                <img
                  src={
                    currentBgItem?.url ||
                    (isCustomUpload
                      ? backgroundImage
                      : '/src/assets/images/bg_fantasy_heroine_1791194675927.jpg')
                  }
                  alt="Preview"
                  className="w-full h-full object-cover filter blur-[1px]"
                />
              )}
              <div
                className="absolute inset-0 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  opacity: backgroundImage !== 'none' ? overlayOpacity : 1,
                }}
              />
              <div className="absolute inset-0 p-1.5 flex flex-col justify-between z-10 pointer-events-none">
                <div className="space-y-1">
                  <div className="w-8 h-1.5 rounded bg-[var(--accent)]" />
                  <div className="w-12 h-1 rounded bg-[var(--text-muted)] opacity-40" />
                </div>
                <div className="w-10 h-1 rounded bg-[var(--text-muted)] opacity-40" />
              </div>
            </div>

            {/* Preview Status text */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {themeMode === 'light'
                  ? 'Chế độ Sáng'
                  : themeMode === 'dark'
                  ? 'Chế độ Tối'
                  : 'Theo Hệ Thống'}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                {backgroundImage === 'none'
                  ? 'Đang dùng nền thuần tối giản của hệ thống.'
                  : 'Đang áp dụng hình nền nghệ thuật với lớp phủ bảo đảm độ tương phản chữ tuyệt đối.'}
              </div>
              <div className="w-12 h-0.5 bg-[var(--accent)] rounded-full mt-2" />
            </div>
          </div>
        </div>

        {/* 2. Display Mode: Sáng | Tối | Hệ thống */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Chế độ hiển thị
          </div>
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-[var(--bg-surface-secondary)] rounded-2xl border border-[var(--border)]">
            <button
              onClick={() => setThemeMode('light')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>Sáng</span>
            </button>

            <button
              onClick={() => setThemeMode('dark')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>Tối</span>
            </button>

            <button
              onClick={() => setThemeMode('system')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                themeMode === 'system'
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
              }`}
            >
              <Laptop className="w-4 h-4" />
              <span>Hệ thống</span>
            </button>
          </div>
        </div>

        {/* 3. Background Artworks Selection */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
            Hình nền cơ bản
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Upload Custom Image */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="group aspect-[3/4] rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all bg-[var(--bg-card)] hover:bg-[var(--accent-soft)]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCustomUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Tải lên
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Từ máy tính</span>
            </div>

            {/* Presets */}
            {PRESET_BACKGROUNDS.map((bg) => {
              const isSelected = backgroundImage === bg.id;

              return (
                <div
                  key={bg.id}
                  onClick={() => setBackgroundImage(bg.id)}
                  className={`group aspect-[3/4] rounded-2xl border relative overflow-hidden cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? 'border-[var(--accent)] ring-2 ring-[var(--accent-border)] scale-[1.02]'
                      : 'border-[var(--border)] hover:border-[var(--accent-border)]'
                  }`}
                >
                  {bg.url ? (
                    <img
                      src={bg.url}
                      alt={bg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--bg-surface-secondary)] flex flex-col items-center justify-center p-2 text-center text-[var(--text-muted)]">
                      <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                      <span className="text-[10px] font-mono uppercase">Trống</span>
                    </div>
                  )}

                  {/* Overlay Title */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-center">
                    <span className="text-[11px] font-semibold block truncate">
                      {bg.name}
                    </span>
                  </div>

                  {/* Selected check circle */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Overlay Dimming Slider */}
        {backgroundImage !== 'none' && (
          <div className="pt-2 border-t border-[var(--border)] space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-[var(--text-primary)]">
                Độ mờ phủ hình nền (Overlay Scrim)
              </span>
              <span className="font-mono text-[var(--accent)]">
                {Math.round(overlayOpacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.60"
              step="0.05"
              value={overlayOpacity}
              onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
            <div className="text-[11px] text-[var(--text-muted)]">
              Lớp phủ làm mờ tự động cân chỉnh để chữ luôn sắc nét và tuyệt đối không bị chìm.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
