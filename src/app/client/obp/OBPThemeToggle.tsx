'use client';

import { useEffect, useState } from 'react';
import { LuMoon, LuSun } from 'react-icons/lu';
import styles from './obp.module.scss';

type OBPTheme = 'light' | 'dark';

const STORAGE_KEY = 'menulist:obp-theme';

function getStoredTheme(): OBPTheme | null {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        return value === 'dark' || value === 'light' ? value : null;
    } catch {
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
        } catch {
            // Theme switching is a visual preference; keep the page usable if storage is blocked.
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
                <LuSun aria-hidden="true" size={16} />
            ) : (
                <LuMoon aria-hidden="true" size={16} />
            )}
        </button>
    );
}
