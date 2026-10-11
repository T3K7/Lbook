import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customBgService, CustomBackground } from '../services/customBackgroundService';
import { PRESET_BACKGROUNDS } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  backgroundImage: string;
  setBackgroundImage: (bg: string) => void;
  overlayOpacity: number;
  setOverlayOpacity: (opacity: number) => void;
  customBackgrounds: CustomBackground[];
  addCustomBackground: (file: File) => Promise<CustomBackground>;
  removeCustomBackground: (id: string) => Promise<void>;
  isLoadingBackgrounds: boolean;
}

const THEME_STORAGE_KEY = 'storytts_theme_mode';
const BG_STORAGE_KEY = 'storytts_bg_image';
const OVERLAY_STORAGE_KEY = 'storytts_bg_overlay';

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'dark',
  setThemeMode: () => {},
  isDark: true,
  backgroundImage: 'fantasy_heroine',
  setBackgroundImage: () => {},
  overlayOpacity: 0.14,
  setOverlayOpacity: () => {},
  customBackgrounds: [],
  addCustomBackground: async () => {
    throw new Error('Not implemented');
  },
  removeCustomBackground: async () => {},
  isLoadingBackgrounds: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {}
    return 'dark';
  });

  const [backgroundImage, setBackgroundImageState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (saved !== null) return saved;
    } catch {}
    return 'fantasy_heroine';
  });

  const [overlayOpacity, setOverlayOpacityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(OVERLAY_STORAGE_KEY);
      if (saved) {
        const val = parseFloat(saved);
        if (val > 0.30) return 0.14;
        return val;
      }
    } catch {}
    return 0.14;
  });

  const [customBackgrounds, setCustomBackgrounds] = useState<CustomBackground[]>([]);
  const [isLoadingBackgrounds, setIsLoadingBackgrounds] = useState<boolean>(true);

  // Load custom backgrounds from persistent IndexedDB
  useEffect(() => {
    let isMounted = true;
    customBgService
      .getAll()
      .then((bgs) => {
        if (!isMounted) return;
        setCustomBackgrounds(bgs);
        setIsLoadingBackgrounds(false);

        // Validate currently selected background
        try {
          const currentBg = localStorage.getItem(BG_STORAGE_KEY);
          if (currentBg && currentBg.startsWith('custom_bg_')) {
            const exists = bgs.some((b) => b.id === currentBg);
            if (!exists) {
              // Deleted or inaccessible, safely revert to default
              setBackgroundImageState('fantasy_heroine');
              localStorage.setItem(BG_STORAGE_KEY, 'fantasy_heroine');
            }
          }
        } catch {}
      })
      .catch((err) => {
        console.warn('Failed to load custom backgrounds:', err);
        if (isMounted) setIsLoadingBackgrounds(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const isDark = themeMode === 'system' ? systemIsDark : themeMode === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {}
  };

  const setBackgroundImage = useCallback((bg: string) => {
    setBackgroundImageState(bg);
    try {
      localStorage.setItem(BG_STORAGE_KEY, bg);
    } catch {}
  }, []);

  const setOverlayOpacity = (opacity: number) => {
    setOverlayOpacityState(opacity);
    try {
      localStorage.setItem(OVERLAY_STORAGE_KEY, opacity.toString());
    } catch {}
  };

  const addCustomBackground = useCallback(
    async (file: File): Promise<CustomBackground> => {
      const saved = await customBgService.save(file);
      setCustomBackgrounds((prev) => {
        const filtered = prev.filter((b) => b.id !== saved.id);
        return [saved, ...filtered];
      });
      // Apply immediately upon selection as specified in requirements
      setBackgroundImage(saved.id);
      return saved;
    },
    [setBackgroundImage]
  );

  const removeCustomBackground = useCallback(
    async (id: string): Promise<void> => {
      await customBgService.delete(id);
      setCustomBackgrounds((prev) => prev.filter((b) => b.id !== id));

      // If the removed image was currently active, fall back to fantasy_heroine
      if (backgroundImage === id) {
        setBackgroundImage('fantasy_heroine');
      }
    },
    [backgroundImage, setBackgroundImage]
  );

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        setThemeMode,
        isDark,
        backgroundImage,
        setBackgroundImage,
        overlayOpacity,
        setOverlayOpacity,
        customBackgrounds,
        addCustomBackground,
        removeCustomBackground,
        isLoadingBackgrounds,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
