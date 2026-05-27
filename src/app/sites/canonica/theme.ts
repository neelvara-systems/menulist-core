export const CANONICA_THEME = {
    name: 'Verdigris Control Plane',
    colors: {
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
} as const;

export const CANONICA_THEME_COLOR = CANONICA_THEME.colors.background;
