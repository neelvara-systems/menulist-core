'use client';

import { useEffect, useState } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';
import { secureError } from '@lib/security/secureLogger';
import styles from './obp.module.scss';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

type OBPTheme = 'light' | 'dark';
type OBPThemeStorageOperation = 'read' | 'remove' | 'write';

const STORAGE_KEY = 'menulist:obp-theme';
const reportedOBPThemeStorageFailures = new Set<OBPThemeStorageOperation>();

function logOBPThemeStorageFailure(
    operation: OBPThemeStorageOperation,
    error: unknown,
    theme?: OBPTheme,
) {
    if (reportedOBPThemeStorageFailures.has(operation)) return;
    reportedOBPThemeStorageFailures.add(operation);

    const storageKey = STORAGE_KEY;
    const themeValue = String(theme ?? '').trim();

    secureError('[OBP Theme] Preference storage failed', new Error(`obp_theme_storage_${operation}_failed`), {
        operation,
        storageKeyPresent: Boolean(storageKey),
        storageKeyLength: storageKey.length,
        themePresent: Boolean(themeValue),
        themeLength: themeValue.length,
        errorName: getBoundedErrorName(error) || typeof error,
    });
}

function getStoredTheme(): OBPTheme | null {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        if (value === 'dark' || value === 'light') return value;
        if (value === null) return null;
        try {
            window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            logOBPThemeStorageFailure('remove', error);
        }
        return null;
    } catch (error) {
        logOBPThemeStorageFailure('read', error);
        return null;
    }
}

function getSystemTheme(): OBPTheme {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: OBPTheme | null) {
    document.querySelectorAll<HTMLElement>('[data-obp-page="true"]').forEach((page) => {
        if (theme) {
            page.dataset.obpTheme = theme;
        } else {
            delete page.dataset.obpTheme;
        }
    });
}

interface OBPThemeToggleProps {
    switchToDarkLabel: string;
    switchToLightLabel: string;
}

export default function OBPThemeToggle({
    switchToDarkLabel,
    switchToLightLabel,
}: OBPThemeToggleProps) {
    const [theme, setTheme] = useState<OBPTheme>('light');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const storedTheme = getStoredTheme();
        applyTheme(storedTheme);
        setTheme(storedTheme || getSystemTheme());
        setMounted(true);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleSystemThemeChange = () => {
            if (!getStoredTheme()) {
                applyTheme(null);
                setTheme(mediaQuery.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleSystemThemeChange);
        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    const toggleTheme = () => {
        const nextTheme: OBPTheme = theme === 'dark' ? 'light' : 'dark';
        try {
            window.localStorage.setItem(STORAGE_KEY, nextTheme);
        } catch (error) {
            logOBPThemeStorageFailure('write', error, nextTheme);
        }
        applyTheme(nextTheme);
        setTheme(nextTheme);
    };

    return (
        <button
            type="button"
            className={styles.themeToggle}
            aria-label={theme === 'dark' ? switchToLightLabel : switchToDarkLabel}
            onClick={toggleTheme}
            suppressHydrationWarning
        >
            {mounted && theme === 'dark' ? (
                <LuSun aria-hidden="true" size={19} strokeWidth={2.4} />
            ) : (
                <LuMoon aria-hidden="true" size={19} strokeWidth={2.4} />
            )}
        </button>
    );
}
