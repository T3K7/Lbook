/**
 * Lbook Unified Design Tokens
 * 
 * Strict Single-Accent System:
 * Primary Accent: Emerald (#10B981)
 * Background Dark: #080B12
 * Surface Dark: #111827
 * Surface Dark Secondary: #172033
 * Background Light: #F7F8FA
 * Surface Light: #FFFFFF
 * 
 * Semantic Status Only:
 * Danger: #EF4444
 * Warning: #F59E0B
 * Info: #3B82F6
 * Success: #10B981
 */

export const DESIGN_TOKENS = {
  colors: {
    primary: {
      DEFAULT: '#10B981',
      hover: '#059669',
      active: '#047857',
      subtle: 'rgba(16, 185, 129, 0.12)',
      border: 'rgba(16, 185, 129, 0.25)',
    },
    dark: {
      app: '#0B1220',
      sidebar: '#0F172A',
      header: '#0F172A',
      surface: '#111827',
      surfaceSecondary: '#1E293B',
      card: 'rgba(17, 24, 39, 0.88)',
      textPrimary: '#FFFFFF',
      textSecondary: '#F1F5F9',
      textMuted: '#CBD5E1',
      border: 'rgba(255, 255, 255, 0.08)',
    },
    light: {
      app: '#F4F6F8',
      sidebar: '#F8FAFC',
      header: '#FFFFFF',
      surface: '#FFFFFF',
      surfaceSecondary: '#F1F5F9',
      card: 'rgba(255, 255, 255, 0.88)',
      textPrimary: '#070B14',
      textSecondary: '#1E293B',
      textMuted: '#334155',
      border: 'rgba(15, 23, 42, 0.08)',
    },
    semantic: {
      danger: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
      success: '#059669',
    },
  },
  glass: {
    light: {
      bg: 'rgba(255, 255, 255, 0.36)',
      bgStrong: 'rgba(255, 255, 255, 0.54)',
      bgSoft: 'rgba(255, 255, 255, 0.22)',
      bgCard: 'rgba(255, 255, 255, 0.30)',
      bgDropdown: 'rgba(255, 255, 255, 0.72)',
      border: 'rgba(255, 255, 255, 0.60)',
      shadow: '0 8px 32px rgba(15, 23, 42, 0.08)',
    },
    dark: {
      bg: 'rgba(15, 23, 42, 0.36)',
      bgStrong: 'rgba(15, 23, 42, 0.52)',
      bgSoft: 'rgba(15, 23, 42, 0.22)',
      bgCard: 'rgba(15, 23, 42, 0.28)',
      bgDropdown: 'rgba(15, 23, 42, 0.72)',
      border: 'rgba(255, 255, 255, 0.12)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.30)',
    },
    blur: {
      card: '16px',
      header: '18px',
      sidebar: '20px',
      player: '20px',
      dialog: '24px',
    },
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    full: '9999px',
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48],
  typography: {
    display: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
    pageTitle: 'text-xl sm:text-2xl font-extrabold tracking-tight',
    sectionTitle: 'text-base sm:text-lg font-bold tracking-tight',
    cardTitle: 'text-sm sm:text-base font-bold leading-snug',
    body: 'text-sm font-medium leading-relaxed',
    secondary: 'text-xs font-medium text-[var(--text-secondary)]',
    caption: 'text-[11px] font-semibold text-[var(--text-muted)]',
  },
};

export interface BackgroundPreset {
  id: string;
  name: string;
  description: string;
  url: string;
  thumb: string;
}

export const PRESET_BACKGROUNDS: BackgroundPreset[] = [
  {
    id: 'none',
    name: 'Trống (Mặc định)',
    description: 'Nền thuần tối giản, không hình nền',
    url: '',
    thumb: '',
  },
  {
    id: 'fantasy_heroine',
    name: 'Tùy chỉnh (Nữ thần)',
    description: 'Họa phẩm nữ hiệp huyễn tưởng',
    url: '/src/assets/images/bg_fantasy_heroine_1791194675927.jpg',
    thumb: '/src/assets/images/bg_fantasy_heroine_1791194675927.jpg',
  },
  {
    id: 'emerald_silk',
    name: 'Thanh lịch (Lụa ngọc)',
    description: 'Lụa mềm ngọc bích ánh kim tinh tế',
    url: '/src/assets/images/bg_emerald_silk_1791194655427.jpg',
    thumb: '/src/assets/images/bg_emerald_silk_1791194655427.jpg',
  },
];
