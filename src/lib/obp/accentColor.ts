const DEFAULT_OBP_ACCENT_COLOR = '#111';

export function resolveOBPAccentColor(publicPresence?: Record<string, any> | null): string {
    const accentColor = typeof publicPresence?.accentColor === 'string'
        ? publicPresence.accentColor.trim()
        : '';

    return accentColor || DEFAULT_OBP_ACCENT_COLOR;
}

