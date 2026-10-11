import React from 'react';

interface BackgroundArtworkProps {
  url: string;
  isDark: boolean;
  overlayOpacity?: number; // 0.05 to 0.50
}

export const BackgroundArtwork: React.FC<BackgroundArtworkProps> = ({
  url,
  isDark,
  overlayOpacity = 0.20,
}) => {
  if (!url) {
    return (
      <div
        className="fixed inset-0 pointer-events-none z-0 select-none transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-app)' }}
      />
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* LAYER 1: Artwork Background (Full-bleed, aspect-cover, pristine visibility) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-500 ease-out"
        style={{
          backgroundImage: `url(${url})`,
          filter: isDark ? 'brightness(0.92) contrast(1.05)' : 'brightness(1.02) saturate(1.05)',
          transform: 'scale(1.02)', // Avoid sub-pixel edge bleeding
        }}
      />

      {/* LAYER 2: Calibrated Theme Tint Overlay (Allows artwork to shine through with rich atmosphere) */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          backgroundColor: isDark ? '#070B14' : '#F1F4F8',
          opacity: overlayOpacity,
        }}
      />

      {/* LAYER 2.5: Ambient Vignette & Emerald Accent Atmospheric Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.08) 0%, transparent 60%), linear-gradient(180deg, rgba(7, 11, 20, 0.25) 0%, transparent 40%, rgba(7, 11, 20, 0.50) 100%)'
            : 'radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.05) 0%, transparent 60%), linear-gradient(180deg, rgba(241, 244, 248, 0.20) 0%, transparent 40%, rgba(241, 244, 248, 0.45) 100%)',
        }}
      />
    </div>
  );
};
