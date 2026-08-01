import { DEFAULT_DARK_COLOR, DEFAULT_LIGHT_COLOR } from '@constant/common';
import {
    defaultLocale,
    normalizeLocalePreference,
} from '@lib/localization/config';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function projectPersistedThemeBoolean(value: unknown): boolean {
    return value === true;
}

export function projectPersistedThemeColor(
    value: unknown,
    mode: 'dark' | 'light',
): string {
    const fallback = mode === 'dark' ? DEFAULT_DARK_COLOR : DEFAULT_LIGHT_COLOR;
    return typeof value === 'string' && HEX_COLOR.test(value.trim())
        ? value.trim()
        : fallback;
}

export function resolveAntdLocaleKey(value: unknown): string {
    return normalizeLocalePreference(
        typeof value === 'string' ? value : null,
    ) || defaultLocale;
}
