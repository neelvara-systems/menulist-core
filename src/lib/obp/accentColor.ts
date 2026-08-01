const DEFAULT_OBP_ACCENT_COLOR = '#111';
const PUBLIC_ACCENT_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function normalizePublicAccentColor(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const accentColor = value.trim();
    if (!PUBLIC_ACCENT_COLOR_PATTERN.test(accentColor)) return null;

    const digits = accentColor.slice(1).toLowerCase();
    return digits.length === 3
        ? `#${digits.split('').map((digit) => `${digit}${digit}`).join('')}`
        : `#${digits}`;
}

export function resolveOBPAccentColor(publicPresence?: Record<string, unknown> | null): string {
    return normalizePublicAccentColor(publicPresence?.accentColor) || DEFAULT_OBP_ACCENT_COLOR;
}

export function resolvePublicMenuAccentColor(
    projectAccentColor: unknown,
    publicPresence?: Record<string, unknown> | null,
    fallback?: unknown,
): string | null {
    return normalizePublicAccentColor(projectAccentColor)
        || normalizePublicAccentColor(publicPresence?.accentColor)
        || normalizePublicAccentColor(fallback);
}
