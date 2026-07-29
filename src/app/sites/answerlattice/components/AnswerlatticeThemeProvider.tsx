'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
    ANSWERLATTICE_DARK_THEME_COLOR,
    ANSWERLATTICE_LIGHT_THEME_COLOR,
    ANSWERLATTICE_THEME_CHOICES,
    ANSWERLATTICE_THEME_STORAGE_KEY,
    type AnswerlatticeResolvedTheme,
    type AnswerlatticeThemeChoice,
} from '../theme';

interface AnswerlatticeThemeContextValue {
    theme: AnswerlatticeThemeChoice;
    resolvedTheme: AnswerlatticeResolvedTheme;
    setTheme: (theme: AnswerlatticeThemeChoice) => void;
}

const AnswerlatticeThemeContext = createContext<AnswerlatticeThemeContextValue | null>(null);
const reportedAnswerlatticeThemeStorageFailures = new Set<'read' | 'remove' | 'write'>();

function logAnswerlatticeThemeStorageFailure(operation: 'read' | 'remove' | 'write', error: unknown) {
    if (reportedAnswerlatticeThemeStorageFailures.has(operation)) return;
    reportedAnswerlatticeThemeStorageFailures.add(operation);
    logRuntimeFailure(`answerlattice_theme_storage_${operation}_failed`, error, {
        fallbackPolicy: operation === 'write' ? 'memory_only' : 'system_theme',
    });
}

function readStoredTheme(): AnswerlatticeThemeChoice {
    try {
        const storedTheme = window.localStorage.getItem(ANSWERLATTICE_THEME_STORAGE_KEY);
        if (storedTheme === null) return 'system';
        if (isThemeChoice(storedTheme)) return storedTheme;
        try {
            window.localStorage.removeItem(ANSWERLATTICE_THEME_STORAGE_KEY);
        } catch (error) {
            logAnswerlatticeThemeStorageFailure('remove', error);
        }
    } catch (error) {
        logAnswerlatticeThemeStorageFailure('read', error);
    }
    return 'system';
}

function isThemeChoice(value: string | null): value is AnswerlatticeThemeChoice {
    return value !== null && ANSWERLATTICE_THEME_CHOICES.includes(value as AnswerlatticeThemeChoice);
}

function resolveSystemTheme(): AnswerlatticeResolvedTheme {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyDocumentTheme(resolvedTheme: AnswerlatticeResolvedTheme) {
    if (typeof document === 'undefined') return;

    document.documentElement.dataset.answerlatticeTheme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;

    const themeColor = resolvedTheme === 'light' ? ANSWERLATTICE_LIGHT_THEME_COLOR : ANSWERLATTICE_DARK_THEME_COLOR;
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
        meta.content = themeColor;
    });
}

export function AnswerlatticeThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<AnswerlatticeThemeChoice>('system');
    const [resolvedTheme, setResolvedTheme] = useState<AnswerlatticeResolvedTheme>('dark');

    useEffect(() => {
        const initialTheme = readStoredTheme();
        const initialResolvedTheme = initialTheme === 'system' ? resolveSystemTheme() : initialTheme;

        setThemeState(initialTheme);
        setResolvedTheme(initialResolvedTheme);
        applyDocumentTheme(initialResolvedTheme);
    }, []);

    useEffect(() => {
        if (theme !== 'system') {
            setResolvedTheme(theme);
            applyDocumentTheme(theme);
            return undefined;
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
        const updateFromSystem = () => {
            const nextResolvedTheme = resolveSystemTheme();
            setResolvedTheme(nextResolvedTheme);
            applyDocumentTheme(nextResolvedTheme);
        };

        updateFromSystem();
        mediaQuery.addEventListener('change', updateFromSystem);
        return () => mediaQuery.removeEventListener('change', updateFromSystem);
    }, [theme]);

    const value = useMemo<AnswerlatticeThemeContextValue>(() => ({
        theme,
        resolvedTheme,
        setTheme: (nextTheme) => {
            setThemeState(nextTheme);
            try {
                window.localStorage.setItem(ANSWERLATTICE_THEME_STORAGE_KEY, nextTheme);
            } catch (error) {
                logAnswerlatticeThemeStorageFailure('write', error);
            }
            const nextResolvedTheme = nextTheme === 'system' ? resolveSystemTheme() : nextTheme;
            setResolvedTheme(nextResolvedTheme);
            applyDocumentTheme(nextResolvedTheme);
        },
    }), [theme, resolvedTheme]);

    return (
        <AnswerlatticeThemeContext.Provider value={value}>
            <div
                className="answerlattice-site antialiased"
                data-al-theme={resolvedTheme}
                data-al-theme-choice={theme}
                suppressHydrationWarning
            >
                {children}
            </div>
        </AnswerlatticeThemeContext.Provider>
    );
}

export function useAnswerlatticeTheme() {
    const context = useContext(AnswerlatticeThemeContext);
    if (!context) {
        throw new Error('useAnswerlatticeTheme must be used inside AnswerlatticeThemeProvider');
    }
    return context;
}
