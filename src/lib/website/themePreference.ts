export type WebsiteThemePreference = 'light' | 'dark' | 'system';

export const WEBSITE_THEME_STORAGE_KEY = 'theme';

export function normalizeWebsiteThemePreference(value: unknown): WebsiteThemePreference | null {
    return value === 'light' || value === 'dark' || value === 'system'
        ? value
        : null;
}
