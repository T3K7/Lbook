import React, { useMemo } from 'react';
import { useTheme } from '../design-system/ThemeContext';
import { PRESET_BACKGROUNDS } from '../design-system/tokens';

/**
 * Shared BackgroundArtwork Component
 * 
 * Layer Hierarchy:
 * LAYER 1: Artwork Background (full cover, center, no repeat, rich visibility)
 * LAYER 2: Theme Scrim & Overlay (controlled contrast for razor-sharp readability)
 * (LAYER 3 & 4: Translucent glass surfaces and content sit above this component)
 */
export const BackgroundArtwork: React.FC = () => {
  const { backgroundImage, customBackgrounds, overlayOpacity, isDark } = useTheme();

  const currentBgUrl = useMemo(() => {
    if (backgroundImage === 'none') return '';
    const preset = PRESET_BACKGROUNDS.find((b) => b.id === backgroundImage);
    if (preset && preset.url) return preset.url;
    const custom = customBackgrounds.find((b) => b.id === backgroundImage);
    if (custom && custom.dataUrl) return custom.dataUrl;
    if (backgroundImage.startsWith('data:') || backgroundImage.startsWith('/')) {
      return backgroundImage;
    }
    return '/src/assets/images/bg_fantasy_heroine_1791194675927.jpg';
  }, [backgroundImage, customBackgrounds]);

  if (!currentBgUrl) {
    return (
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none transition-colors duration-300"
        style={{ backgroundColor: isDark ? '#0B1220' : '#F4F6F8' }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* LAYER 1: Artwork Background - Crisp and vivid without blurring the artwork itself */}
      <div
        className="absolute inset-0 transition-all duration-500 ease-out"
        style={{
          backgroundImage: `url(${currentBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: 'scale(1.01)',
          opacity: 1,
        }}
      />

      {/* LAYER 2: Theme Overlay (Gentle translucent scrim letting artwork shine through clearly) */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: isDark ? '#0B1220' : '#F4F6F8',
          opacity: overlayOpacity ?? (isDark ? 0.14 : 0.08),
        }}
      />

      {/* Subtle Ambient Vignette for soft edge framing */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(11,18,32,0.10) 0%, transparent 40%, rgba(11,18,32,0.25) 100%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.03) 0%, transparent 70%), linear-gradient(180deg, rgba(244,246,248,0.10) 0%, transparent 40%, rgba(244,246,248,0.20) 100%)',
        }}
      />
    </div>
  );
};
