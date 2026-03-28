'use client';

/**
 * 🎯 Global Keyboard Shortcuts Provider
 * 
 * Single source of truth for ALL keyboard shortcuts - config AND implementation.
 * Everything keyboard-related is in this one file.
 * 
 * Benefits:
 * - ✅ One file for all keyboard shortcuts
 * - ✅ Config + implementation together
 * - ✅ Easy to see all active shortcuts
 * - ✅ Centralized state access
 * - ✅ Easy to maintain
 * 
 * Usage:
 * Mount once in root layout - shortcuts work everywhere!
 */

import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { ShortcutConfig, useKeyboardShortcuts } from '@hook/useKeyboardShortcuts';
import { getAppSettingsPanelStatus, getDarkModeState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { showSuccessToast } from '@reduxSlices/toast';
import { ReactNode, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════
// 📋 KEYBOARD SHORTCUTS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

/**
 * Global keyboard shortcuts that work from anywhere in the application
 */
const GLOBAL_SHORTCUTS = {
    // ───────────────────────────────────────────────────────────
    // THEME & APPEARANCE
    // ───────────────────────────────────────────────────────────
    TOGGLE_DARK_MODE: {
        key: 'd',
        ctrlKey: true,  // Auto-detects: Cmd on Mac, Ctrl on Windows/Linux
        shiftKey: true,
        description: 'Toggle dark/light mode'
    } as Omit<ShortcutConfig, 'action'>,

    // ───────────────────────────────────────────────────────────
    // NAVIGATION & PANELS
    // ───────────────────────────────────────────────────────────
    TOGGLE_SETTINGS: {
        key: 'k',
        ctrlKey: true,  // Cmd+K on Mac, Ctrl+K on Windows/Linux
        description: 'Toggle settings panel'
    } as Omit<ShortcutConfig, 'action'>,

    CLOSE_MODAL: {
        key: 'Escape',
        description: 'Close modal/panel'
    } as Omit<ShortcutConfig, 'action'>,

    // ───────────────────────────────────────────────────────────
    // FUTURE SHORTCUTS (Uncomment when ready)
    // ───────────────────────────────────────────────────────────
    // GLOBAL_SEARCH: {
    //     key: '/',
    //     ctrlKey: true,
    //     description: 'Open global search'
    // } as Omit<ShortcutConfig, 'action'>,

    // NEW_PROJECT: {
    //     key: 'n',
    //     ctrlKey: true,
    //     description: 'Create new project'
    // } as Omit<ShortcutConfig, 'action'>,

    // OPEN_HELP: {
    //     key: '?',
    //     shiftKey: true,
    //     description: 'Show keyboard shortcuts help'
    // } as Omit<ShortcutConfig, 'action'>,
} as const;

/**
 * Feature-specific shortcuts that only work in certain contexts.
 * Export these if needed by feature components (e.g., Editor)
 */
export const FEATURE_SHORTCUTS = {
    EDITOR: {
        SAVE: {
            key: 's',
            ctrlKey: true,
            description: 'Save editor changes'
        },
        UNDO: {
            key: 'z',
            ctrlKey: true,
            description: 'Undo last change'
        },
        REDO: {
            key: 'z',
            ctrlKey: true,
            shiftKey: true,
            description: 'Redo last change'
        }
    }
} as const;

/**
 * Helper to get formatted shortcut display for UI
 * @example getShortcutDisplay('d', true, true) => "Cmd+Shift+D" (Mac) or "Ctrl+Shift+D" (Windows)
 */
export const getShortcutDisplay = (
    key: string,
    ctrlKey?: boolean,
    shiftKey?: boolean,
    metaKey?: boolean
): string => {
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const parts: string[] = [];

    if (ctrlKey) parts.push(isMac ? 'Cmd' : 'Ctrl');
    if (shiftKey) parts.push('Shift');
    if (metaKey) parts.push('Meta');
    parts.push(key.toUpperCase());

    return parts.join('+');
};

/**
 * Get all shortcuts as a flat array for display in help modal
 */
export const getAllShortcuts = () => {
    return Object.entries(GLOBAL_SHORTCUTS).map(([name, config]) => ({
        name,
        ...config,
        display: getShortcutDisplay(config.key, config.ctrlKey, config.shiftKey, config.metaKey)
    }));
};

// ═══════════════════════════════════════════════════════════════
// 🎯 PROVIDER COMPONENT
// ═══════════════════════════════════════════════════════════════

interface GlobalKeyboardShortcutsProviderProps {
    children: ReactNode;
}

export default function GlobalKeyboardShortcutsProvider({ children }: GlobalKeyboardShortcutsProviderProps) {
    const dispatch = useAppDispatch();

    // Get state needed for shortcuts
    const isDarkMode = useAppSelector(getDarkModeState);
    const isSettingsPanelOpen = useAppSelector(getAppSettingsPanelStatus);

    // ═══════════════════════════════════════════════════════════
    // 🌐 GLOBAL SHORTCUTS - Work from anywhere in the app
    // ═══════════════════════════════════════════════════════════

    // Memoize shortcuts array to prevent re-creation on every render
    const shortcuts = useMemo(() => [
        // ───────────────────────────────────────────────────────
        // THEME & APPEARANCE
        // ───────────────────────────────────────────────────────
        {
            ...GLOBAL_SHORTCUTS.TOGGLE_DARK_MODE,
            action: () => {
                const newMode = !isDarkMode;
                dispatch(toggleDarkMode(newMode));
                dispatch(showSuccessToast(`${newMode ? 'Dark' : 'Light'} mode enabled`));
            }
        },

        // ───────────────────────────────────────────────────────
        // NAVIGATION & PANELS
        // ───────────────────────────────────────────────────────
        {
            ...GLOBAL_SHORTCUTS.TOGGLE_SETTINGS,
            action: () => {
                dispatch(toggleAppSettingsPanel(!isSettingsPanelOpen));
            }
        },
        {
            ...GLOBAL_SHORTCUTS.CLOSE_MODAL,
            action: () => {
                // Close settings panel if open
                if (isSettingsPanelOpen) {
                    dispatch(toggleAppSettingsPanel(false));
                }
                // Add other closable panels here as needed
            }
        },

        // ───────────────────────────────────────────────────────
        // FUTURE SHORTCUTS - Uncomment when ready
        // ───────────────────────────────────────────────────────
        // {
        //     ...GLOBAL_SHORTCUTS.GLOBAL_SEARCH,
        //     action: () => {
        //         // Open global search modal
        //     }
        // },
        // {
        //     ...GLOBAL_SHORTCUTS.NEW_PROJECT,
        //     action: () => {
        //         router.push('/projects/new');
        //     }
        // },
    ], [isDarkMode, isSettingsPanelOpen]);

    useKeyboardShortcuts(shortcuts);

    // This provider doesn't render anything - just registers shortcuts
    return <>{children}</>;
}
