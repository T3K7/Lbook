import React, { useRef, useState } from 'react';
import { Sun, Moon, Laptop, Plus, Check, Image as ImageIcon, Trash2 } from 'lucide-react';
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
    backgroundImage,
    setBackgroundImage,
    overlayOpacity,
    setOverlayOpacity,
    customBackgrounds,
    addCustomBackground,
    removeCustomBackground,
  } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleCustomUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid =
      /\.(jpe?g|png|webp)$/i.test(file.name) ||
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase());

    if (!isValid) {
      setUploadError('Chỉ hỗ trợ tệp ảnh định dạng JPG, PNG hoặc WebP.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadError(null);
    setIsUploading(true);
    try {
      await addCustomBackground(file);
    } catch {
      setUploadError('Không thể nạp ảnh. Vui lòng thử lại với ảnh nhỏ hơn (< 12MB).');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentCustomBg = customBackgrounds.find((b) => b.id === backgroundImage);
  const activeBgUrl = currentCustomBg?.dataUrl || (backgroundImage.startsWith('data:') ? backgroundImage : '');

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
              {activeBgUrl ? (
                <img
                  src={activeBgUrl}
                  alt="Preview"
                  className="w-full h-full object-cover filter blur-[1px]"
                />
              ) : null}
              <div
                className="absolute inset-0 transition-opacity"
                style={{
                  backgroundColor: 'var(--bg-app)',
                  opacity: activeBgUrl ? overlayOpacity : 1,
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
                  : 'Đang áp dụng hình nền tùy chỉnh với lớp phủ bảo đảm độ tương phản chữ tuyệt đối.'}
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

        {/* 3. Background Selection: Trống + Thêm ảnh của tôi + Custom Backgrounds */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Hình nền ứng dụng
            </div>
            {uploadError && (
              <span className="text-[11px] text-rose-500 font-semibold">
                {uploadError}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Presets (Trống mặc định) */}
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
                  title={bg.name}
                >
                  <div className="w-full h-full bg-[var(--bg-surface-secondary)] flex flex-col items-center justify-center p-2 text-center text-[var(--text-muted)]">
                    <ImageIcon className="w-6 h-6 mb-1 opacity-50" />
                    <span className="text-[10px] font-mono uppercase">Trống</span>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-center">
                    <span className="text-[11px] font-semibold block truncate">
                      {bg.name}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Custom Backgrounds uploaded by user */}
            {customBackgrounds.map((bg) => {
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
                  title={bg.name}
                >
                  <img
                    src={bg.dataUrl}
                    alt={bg.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white text-center">
                    <span className="text-[11px] font-semibold block truncate">
                      {bg.name}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCustomBackground(bg.id);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm hover:scale-110"
                    title="Xóa hình nền này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Upload Custom Image (Thêm ảnh của tôi) */}
            <div
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`group aspect-[3/4] rounded-2xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all bg-[var(--bg-card)] hover:bg-[var(--accent-soft)] ${
                isUploading ? 'opacity-70 pointer-events-none' : ''
              }`}
              title="Chọn ảnh JPG, PNG hoặc WebP từ máy tính"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleCustomUpload}
                className="hidden"
              />
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">
                {isUploading ? 'Đang nạp...' : 'Thêm ảnh của tôi'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] mt-0.5">JPG, PNG, WebP</span>
            </div>
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
              Tăng độ mờ phủ khi dùng ảnh có nhiều chi tiết sáng để đọc văn bản rõ ràng nhất.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
