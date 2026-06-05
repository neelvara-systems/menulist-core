export type AnswerlatticeThemeChoice = 'light' | 'system' | 'dark';
export type AnswerlatticeResolvedTheme = 'light' | 'dark';

export const ANSWERLATTICE_THEME_STORAGE_KEY = 'answerlattice-theme';

export const ANSWERLATTICE_THEME_CHOICES: AnswerlatticeThemeChoice[] = ['light', 'system', 'dark'];

export const ANSWERLATTICE_THEME_COLORS = {
    dark: {
        primary: '#0F766E',
        primaryHover: '#115E59',
        primaryLight: '#5EEAD4',
        background: '#0A0A1A',
        backgroundSubtle: '#0F0F23',
        backgroundDeep: '#080817',
        surface: 'rgba(255,255,255,0.03)',
        surfaceRaised: 'rgba(255,255,255,0.04)',
        border: 'rgba(255,255,255,0.06)',
        borderStrong: 'rgba(255,255,255,0.12)',
        textPrimary: '#FFFFFF',
        textBody: '#D6D6EF',
        textSecondary: '#A0A0C0',
        textMuted: '#6B6B8A',
        fieldBackground: '#111124',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
    },
    light: {
        primary: '#0F766E',
        primaryHover: '#115E59',
        primaryLight: '#0D9488',
        background: '#F8FAFC',
        backgroundSubtle: '#EEF5F7',
        backgroundDeep: '#DDEBEE',
        surface: 'rgba(15,23,42,0.045)',
        surfaceRaised: 'rgba(255,255,255,0.82)',
        border: 'rgba(15,23,42,0.10)',
        borderStrong: 'rgba(15,23,42,0.18)',
        textPrimary: '#0F172A',
        textBody: '#334155',
        textSecondary: '#475569',
        textMuted: '#64748B',
        fieldBackground: '#FFFFFF',
        success: '#15803D',
        warning: '#B45309',
        danger: '#DC2626',
    },
} as const;

export const ANSWERLATTICE_THEME = {
    name: 'Verdigris Answer Layer',
    colors: ANSWERLATTICE_THEME_COLORS.dark,
} as const;

export const ANSWERLATTICE_DARK_THEME_COLOR = ANSWERLATTICE_THEME_COLORS.dark.background;
export const ANSWERLATTICE_LIGHT_THEME_COLOR = ANSWERLATTICE_THEME_COLORS.light.background;
export const ANSWERLATTICE_THEME_COLOR = ANSWERLATTICE_DARK_THEME_COLOR;
