import React, { useState, useRef, useEffect } from 'react';
import {
  Volume2,
  Trash2,
  RotateCcw,
  Check,
  Zap,
  Palette,
  BookOpen,
  Sun,
  Moon,
  Laptop,
  Globe,
  ChevronDown,
  CheckCircle2,
  Plus,
  Loader2,
  AlertCircle,
  X,
  Download,
  Monitor,
  Github,
  ExternalLink,
} from 'lucide-react';
import { AppSettings, TtsVoice } from '../types';
import { DEFAULT_SETTINGS, StorageService } from '../services/storage';
import { useTheme } from '../design-system/ThemeContext';
import { PRESET_BACKGROUNDS } from '../design-system/tokens';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '../i18n';

interface SettingsViewProps {
  settings: AppSettings;
  voices: TtsVoice[];
  cacheStats: { hitRate: string; entriesCount: number; cacheHits: number; cacheMisses: number };
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearAudioCache: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  voices,
  cacheStats,
  onUpdateSettings,
  onClearAudioCache,
}) => {
  const [saveNotice, setSaveNotice] = useState(false);
  const {
    themeMode,
    setThemeMode,
    backgroundImage,
    setBackgroundImage,
    customBackgrounds,
    addCustomBackground,
    removeCustomBackground,
  } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // Custom Background Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [bgToast, setBgToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showBgToast = (type: 'success' | 'error', message: string) => {
    setBgToast({ type, message });
    setTimeout(() => setBgToast(null), 3500);
  };

  const handleCustomBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset so same file can be re-selected if necessary
    e.target.value = '';

    setIsUploadingBg(true);
    try {
      await addCustomBackground(file);
      showBgToast('success', t('settings.customImageAdded'));
    } catch (err: any) {
      if (err?.message === 'INVALID_FORMAT') {
        showBgToast('error', t('settings.invalidImageFormat'));
      } else if (err?.message === 'FILE_TOO_LARGE') {
        showBgToast('error', t('settings.imageTooLarge'));
      } else {
        showBgToast('error', t('settings.invalidImageFormat'));
      }
    } finally {
      setIsUploadingBg(false);
    }
  };

  const handleDeleteCustomBg = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeCustomBackground(id);
      showBgToast('success', t('settings.deleteCustomBg'));
    } catch (err) {
      console.error('Delete custom background error:', err);
    }
  };

  // Language Dropdown state
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const langButtonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isLangDropdownOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLangDropdownOpen(false);
        langButtonRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLangDropdownOpen]);

  const handleSelectLanguage = (newLang: Language) => {
    setLanguage(newLang);
    handleSave({ language: newLang });
    setIsLangDropdownOpen(false);
    langButtonRef.current?.focus();
  };

  const handleSave = (updated: Partial<AppSettings>) => {
    onUpdateSettings(updated);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2000);
  };

  const handleReset = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    StorageService.saveSettings(DEFAULT_SETTINGS);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 2000);
  };

  const currentLangOption = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="flex-1 flex flex-col overflow-hidden select-none text-[var(--text-primary)]">
      {/* Top Header */}
      <div
        className="p-4 md:px-8 md:pt-8 pb-3 border-b border-[var(--glass-border)] flex items-center justify-between shrink-0 bg-[var(--glass-bg-header)] transition-all duration-300"
        style={{
          backdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
          WebkitBackdropFilter: 'blur(var(--glass-blur-header)) saturate(var(--glass-saturate))',
        }}
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {t('settings.title')}
          </h1>
          <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
            {t('settings.subtitle')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveNotice && (
            <span className="text-xs text-[var(--accent)] font-semibold flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>{t('settings.saveNotice')}</span>
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {t('settings.resetDefault')}
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6 pb-16">
          {/* Section 1: Language (Ngôn ngữ) - Prominently Displayed & Non-overlapping Popover */}
          <Card padding="md" className="relative z-30 overflow-visible">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <Globe className="w-4 h-4 text-[var(--accent)]" />
              <span>{t('settings.languageSection')}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  {t('settings.selectLanguage')}
                </label>
                <div className="text-[11px] text-[var(--text-secondary)] font-medium mb-3">
                  {t('settings.languageDesc')}
                </div>

                {/* Accessible Custom Language Popover Dropdown */}
                <div ref={langDropdownRef} className="relative w-64 max-w-full">
                  <button
                    ref={langButtonRef}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={isLangDropdownOpen}
                    onClick={() => setIsLangDropdownOpen((prev) => !prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setIsLangDropdownOpen(true);
                      }
                    }}
                    className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-card-hover)] border border-[var(--glass-border)] hover:border-[var(--accent-border)] text-xs font-semibold text-[var(--text-primary)] transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent-border)]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none select-none">{currentLangOption.flag}</span>
                      <span className="font-bold truncate">{currentLangOption.label}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 shrink-0 ${
                        isLangDropdownOpen ? 'rotate-180 text-[var(--accent)]' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Options Popup - Floating cleanly above subsequent cards */}
                  {isLangDropdownOpen && (
                    <div
                      role="listbox"
                      aria-label={t('settings.selectLanguage')}
                      className="absolute left-0 top-full mt-2 w-full bg-[var(--glass-bg-dropdown)] border border-[var(--glass-border-strong)] rounded-2xl shadow-2xl z-50 p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                      style={{
                        backdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                        WebkitBackdropFilter: 'blur(28px) saturate(var(--glass-saturate))',
                        boxShadow: 'var(--shadow-md), 0 20px 40px -10px rgba(0,0,0,0.5)',
                      }}
                    >
                      {SUPPORTED_LANGUAGES.map((opt) => {
                        const isSelected = language === opt.code;
                        return (
                          <div
                            key={opt.code}
                            role="option"
                            tabIndex={0}
                            aria-selected={isSelected}
                            onClick={() => handleSelectLanguage(opt.code)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleSelectLanguage(opt.code);
                              }
                            }}
                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors focus:outline-none ${
                              isSelected
                                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold border border-[var(--accent-border)]'
                                : 'text-[var(--text-primary)] hover:bg-[var(--glass-bg-card-hover)] border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="text-base leading-none select-none">{opt.flag}</span>
                              <span className="font-medium">{opt.label}</span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[var(--accent)] stroke-[2.5] shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Section 2: Appearance & Display */}
          <Card padding="md" className="relative z-20">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <Palette className="w-4 h-4 text-[var(--accent)]" />
              <span>{t('settings.appearanceSection')}</span>
            </div>

            <div className="space-y-5">
              {/* Theme mode toggle */}
              <div>
                <div className="text-xs font-bold text-[var(--text-primary)] mb-1">
                  {t('settings.themeMode')}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mb-2">
                  {t('appearanceModal.displayModeTitle')}
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-md p-1 bg-[var(--bg-surface-secondary)] rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setThemeMode('light')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      themeMode === 'light'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>{t('settings.themeLight')}</span>
                  </button>

                  <button
                    onClick={() => setThemeMode('dark')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      themeMode === 'dark'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>{t('settings.themeDark')}</span>
                  </button>

                  <button
                    onClick={() => setThemeMode('system')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      themeMode === 'system'
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>{t('settings.themeSystem')}</span>
                  </button>
                </div>
              </div>

              {/* Background Artwork selector with Custom Backgrounds */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-[var(--text-primary)]">
                    {t('settings.presetBackground')}
                  </div>
                  {bgToast && (
                    <div
                      className={`text-[11px] font-medium flex items-center gap-1 animate-in fade-in ${
                        bgToast.type === 'success' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {bgToast.type === 'success' ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      <span>{bgToast.message}</span>
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mb-3">
                  {t('settings.overlayDimmingDesc')}
                </div>

                {/* Hidden File Input for Native Desktop File Picker */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleCustomBgUpload}
                  className="hidden"
                />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                  {/* Presets */}
                  {PRESET_BACKGROUNDS.map((bg) => {
                    const isSelected = backgroundImage === bg.id;
                    return (
                      <div
                        key={bg.id}
                        onClick={() => setBackgroundImage(bg.id)}
                        className={`group aspect-[4/3] rounded-xl border relative overflow-hidden cursor-pointer transition-all shadow-xs ${
                          isSelected
                            ? 'border-[var(--accent)] ring-2 ring-[var(--accent-border)] scale-[1.02]'
                            : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:shadow-md'
                        }`}
                        title={bg.name}
                      >
                        {bg.url ? (
                          <img
                            src={bg.url}
                            alt={bg.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-[var(--bg-surface-secondary)] flex items-center justify-center text-[10px] text-[var(--text-muted)] font-mono">
                            {t('appearanceModal.emptyBackground')}
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-black/65 backdrop-blur-[2px] text-white text-[10px] text-center truncate">
                          {bg.name}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
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
                        className={`group aspect-[4/3] rounded-xl border relative overflow-hidden cursor-pointer transition-all shadow-xs ${
                          isSelected
                            ? 'border-[var(--accent)] ring-2 ring-[var(--accent-border)] scale-[1.02]'
                            : 'border-[var(--border)] hover:border-[var(--accent-border)] hover:shadow-md'
                        }`}
                        title={bg.name}
                      >
                        <img
                          src={bg.dataUrl}
                          alt={bg.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 p-1 bg-black/70 backdrop-blur-[2px] text-white text-[10px] text-center truncate px-1.5">
                          {bg.name}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        {/* Delete Custom Background Button */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomBg(e, bg.id)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-sm hover:scale-110"
                          title={t('settings.deleteCustomBg')}
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    );
                  })}

                  {/* "+ Thêm ảnh của tôi" / "Chọn ảnh từ máy tính" Button */}
                  <div
                    onClick={() => !isUploadingBg && fileInputRef.current?.click()}
                    className={`group aspect-[4/3] rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all bg-[var(--glass-bg-soft)] hover:bg-[var(--accent-soft)] ${
                      isUploadingBg ? 'opacity-70 pointer-events-none' : ''
                    }`}
                    title={t('settings.chooseFromComputer')}
                  >
                    {isUploadingBg ? (
                      <>
                        <Loader2 className="w-5 h-5 text-[var(--accent)] animate-spin mb-1.5" />
                        <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                          {t('settings.uploadingImage')}
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <span className="text-[11px] font-bold text-[var(--text-primary)] leading-tight">
                          {t('settings.addCustomBackground')}
                        </span>
                        <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                          JPG, PNG, WebP
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Section 3: TTS Engine & Voices */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <Volume2 className="w-4 h-4 text-[var(--accent)]" />
              <span>{t('settings.ttsEngineSection')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('settings.defaultVoiceLabel')}
                </label>
                <select
                  value={settings.defaultProviderId}
                  onChange={(e) => handleSave({ defaultProviderId: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="google">Google Tiếng Việt (Native Cloud, HQ)</option>
                  <option value="edge-online">Microsoft Edge Neural TTS</option>
                  <option value="browser">Windows SAPI / Browser TTS (Offline)</option>
                  <option value="offline-ai">VinaTTS ONNX (Piper Neural Offline)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  {t('settings.defaultVoiceDesc')}
                </label>
                <select
                  value={settings.defaultVoice}
                  onChange={(e) => handleSave({ defaultVoice: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                >
                  <option value="vi-VN-default">Google Tiếng Việt (Default)</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] mb-1">
                  <span>{t('settings.defaultSpeed')}</span>
                  <span className="font-mono text-[var(--accent)] font-bold tabular-nums">
                    {typeof settings.speechRate === 'number' ? settings.speechRate.toFixed(2) : '1.00'}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={settings.speechRate}
                  onChange={(e) => handleSave({ speechRate: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] mb-1">
                  <span>Pitch</span>
                  <span className="font-mono text-[var(--accent)] font-bold">{settings.speechPitch.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={settings.speechPitch}
                  onChange={(e) => handleSave({ speechPitch: parseFloat(e.target.value) })}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] mb-1">
                  <span>Prefetch Window</span>
                  <span className="font-mono text-[var(--accent)] font-bold">{settings.prefetchWindowSize} chunks</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={settings.prefetchWindowSize}
                  onChange={(e) => handleSave({ prefetchWindowSize: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)] mb-1">
                  <span>Max Chunk Size</span>
                  <span className="font-mono text-[var(--accent)] font-bold">{settings.chunkMaxChars} chars</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="450"
                  step="10"
                  value={settings.chunkMaxChars}
                  onChange={(e) => handleSave({ chunkMaxChars: parseInt(e.target.value) })}
                  className="w-full accent-[var(--accent)] cursor-pointer"
                />
              </div>
            </div>
          </Card>

          {/* Section 4: Reader & Playback Behaviors */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <BookOpen className="w-4 h-4 text-[var(--accent)]" />
              <span>{t('settings.systemBehaviorSection')}</span>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between text-xs text-[var(--text-primary)] cursor-pointer p-2.5 rounded-xl hover:bg-[var(--accent-soft)] transition-colors">
                <div>
                  <div className="font-semibold">{t('player.autoNextChapter')}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">
                    {t('settings.autoNextDesc')}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoNextChapter}
                  onChange={(e) => handleSave({ autoNextChapter: e.target.checked })}
                  className="accent-[var(--accent)] w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-[var(--text-primary)] cursor-pointer p-2.5 rounded-xl hover:bg-[var(--accent-soft)] transition-colors">
                <div>
                  <div className="font-semibold">{t('reader.karaokeHighlight')}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">
                    {t('settings.karaokeHighlightDesc')}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.karaokeHighlight}
                  onChange={(e) => handleSave({ karaokeHighlight: e.target.checked })}
                  className="accent-[var(--accent)] w-4 h-4 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-[var(--text-primary)] cursor-pointer p-2.5 rounded-xl hover:bg-[var(--accent-soft)] transition-colors">
                <div>
                  <div className="font-semibold">{t('reader.autoScroll')}</div>
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">
                    {t('settings.autoScrollDesc')}
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoScrollToSpeech}
                  onChange={(e) => handleSave({ autoScrollToSpeech: e.target.checked })}
                  className="accent-[var(--accent)] w-4 h-4 rounded cursor-pointer"
                />
              </label>
            </div>
          </Card>

          {/* Section 5: Audio Cache */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <Zap className="w-4 h-4 text-[var(--accent)]" />
              <span>{t('settings.cacheSection')}</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {t('settings.cacheStats')}{' '}
                  <span className="font-mono font-bold text-[var(--text-primary)]">
                    {cacheStats.entriesCount}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-1">
                  Hit rate:{' '}
                  <span className="font-mono text-[var(--accent)] font-semibold">
                    {cacheStats.hitRate}
                  </span>{' '}
                  ({cacheStats.cacheHits} / {cacheStats.cacheMisses})
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={onClearAudioCache}
                leftIcon={<Trash2 className="w-3.5 h-3.5 text-[var(--danger)]" />}
              >
                {t('settings.clearCache')}
              </Button>
            </div>
          </Card>

          {/* Section 6: Windows Desktop Release & GitHub */}
          <Card padding="md">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-3 mb-4">
              <Monitor className="w-4 h-4 text-[var(--accent)]" />
              <span>Bản phát hành Windows (.EXE / .ZIP) & GitHub</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Ứng dụng máy tính Lbook đã được đóng gói hoàn chỉnh thành bản Windows Desktop 64-bit độc lập. Bạn có thể tải trực tiếp file cài đặt bên dưới:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="/api/release/download/Lbook-Setup.exe"
                  download="Lbook-Setup.exe"
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-sunken)] hover:bg-[var(--accent-soft)] transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)]">Lbook-Setup.exe</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Bộ cài đặt Windows NSIS</div>
                  </div>
                </a>

                <a
                  href="/api/release/download/Lbook-1.0.0-win.zip"
                  download="Lbook-1.0.0-win.zip"
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-sunken)] hover:bg-[var(--accent-soft)] transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[var(--text-primary)]">Lbook-1.0.0-win.zip</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Bản Portable (146 MB) chạy ngay</div>
                  </div>
                </a>
              </div>

              <div className="p-3 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border)] text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Github className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span>Xuất mã nguồn qua GitHub</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                  Đã cấu hình <code className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">.gitignore</code> để loại trừ thư mục tệp lớn <code className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">release/</code> (&gt; 100MB), giúp nút <strong>Export to GitHub</strong> trong AI Studio hoạt động mượt mà mà không bị GitHub từ chối. File CI/CD GitHub Actions <code className="px-1 py-0.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]">build-release.yml</code> cũng đã được tích hợp sẵn.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
