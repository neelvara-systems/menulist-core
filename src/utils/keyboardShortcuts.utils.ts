import { ShortcutConfig } from '@hook/useKeyboardShortcuts';

/**
 * 🎹 Keyboard Shortcuts Utilities
 * 
 * Shared utilities for keyboard shortcuts across the application.
 * Used by:
 * - GlobalKeyboardShortcutsProvider (global shortcuts)
 * - Editor shortcuts (editor-specific shortcuts)
 * - Any other feature-specific shortcuts
 * 
 * Benefits:
 * - ✅ No code duplication
 * - ✅ Consistent behavior everywhere
 * - ✅ Single place to update logic
 * - ✅ Type-safe
 */

// ═══════════════════════════════════════════════════════════════
// 📋 TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Base shortcut configuration (without action)
 * Can be extended with category or other metadata
 */
export interface BaseShortcutConfig extends Omit<ShortcutConfig, 'action'> {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    description: string;
}

/**
 * Shortcut with category for organization
 */
export interface CategorizedShortcut extends BaseShortcutConfig {
    category: string;
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Convert shortcut config to display format (for UI)
 * Handles platform detection (Mac vs Windows)
 * 
 * @param shortcut - The shortcut configuration
 * @param isMac - Whether the platform is Mac (defaults to auto-detect)
 * @returns Array of key names to display
 * 
 * @example
 * getShortcutDisplay({ key: 's', ctrlKey: true }, true)
 * // Returns: ['Cmd', 'S'] on Mac
 * // Returns: ['Ctrl', 'S'] on Windows
 */
export const getShortcutDisplay = (
    shortcut: BaseShortcutConfig,
    isMac: boolean = detectMacOS()
): string[] => {
    const keys: string[] = [];

    // Add modifier keys in standard order: Ctrl/Cmd, Shift, Alt/Meta
    if (shortcut.ctrlKey) {
        keys.push(isMac ? 'Cmd' : 'Ctrl');
    }
    if (shortcut.shiftKey) {
        keys.push('Shift');
    }
    if (shortcut.metaKey) {
        keys.push(isMac ? 'Cmd' : 'Meta');
    }

    // Add the main key (capitalize single letters, keep special keys as-is)
    const mainKey = shortcut.key.length === 1
        ? shortcut.key.toUpperCase()
        : shortcut.key;
    keys.push(mainKey);

    return keys;
};

/**
 * Format shortcut for display as a string
 * 
 * @param shortcut - The shortcut configuration
 * @param isMac - Whether the platform is Mac
 * @param separator - Separator between keys (default: '+')
 * @returns Formatted shortcut string
 * 
 * @example
 * formatShortcut({ key: 's', ctrlKey: true }, true)
 * // Returns: "Cmd+S"
 */
export const formatShortcut = (
    shortcut: BaseShortcutConfig,
    isMac: boolean = detectMacOS(),
    separator: string = '+'
): string => {
    return getShortcutDisplay(shortcut, isMac).join(separator);
};

/**
 * Detect if the current platform is macOS
 * 
 * @returns true if Mac, false otherwise
 */
export const detectMacOS = (): boolean => {
    if (typeof navigator === 'undefined') return false;
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Get all shortcuts from a shortcuts object
 * 
 * @param shortcuts - Record of shortcut configurations
 * @returns Array of all shortcuts
 * 
 * @example
 * const shortcuts = { SAVE: { key: 's', ... }, COPY: { key: 'c', ... } };
 * getAllShortcuts(shortcuts);
 * // Returns: [{ key: 's', ... }, { key: 'c', ... }]
 */
export const getAllShortcuts = <T extends BaseShortcutConfig>(
    shortcuts: Record<string, T>
): T[] => {
    return Object.values(shortcuts);
};

/**
 * Get shortcuts filtered by category
 * 
 * @param shortcuts - Record of categorized shortcuts
 * @param category - Category to filter by
 * @returns Array of shortcuts in the category
 * 
 * @example
 * getShortcutsByCategory(EDITOR_SHORTCUTS, 'Creation')
 * // Returns: [{ key: 'n', category: 'Creation', ... }, ...]
 */
export const getShortcutsByCategory = <T extends CategorizedShortcut>(
    shortcuts: Record<string, T>,
    category: string
): T[] => {
    return getAllShortcuts(shortcuts).filter(shortcut => shortcut.category === category);
};

/**
 * Get all unique categories from shortcuts
 * 
 * @param shortcuts - Record of categorized shortcuts
 * @returns Array of unique category names
 * 
 * @example
 * getCategories(EDITOR_SHORTCUTS)
 * // Returns: ['Creation', 'Editing', 'Navigation', ...]
 */
export const getCategories = <T extends CategorizedShortcut>(
    shortcuts: Record<string, T>
): string[] => {
    const categories = new Set(
        getAllShortcuts(shortcuts).map(shortcut => shortcut.category)
    );
    return Array.from(categories);
};

/**
 * Find shortcut by key combination
 * 
 * @param shortcuts - Record of shortcuts
 * @param key - Main key
 * @param modifiers - Object with modifier keys
 * @returns Matching shortcut or undefined
 * 
 * @example
 * findShortcut(EDITOR_SHORTCUTS, 's', { ctrlKey: true })
 * // Returns: { key: 's', ctrlKey: true, description: 'Save', ... }
 */
export const findShortcut = <T extends BaseShortcutConfig>(
    shortcuts: Record<string, T>,
    key: string,
    modifiers: {
        ctrlKey?: boolean;
        shiftKey?: boolean;
        metaKey?: boolean;
    } = {}
): T | undefined => {
    return getAllShortcuts(shortcuts).find(
        shortcut =>
            shortcut.key.toLowerCase() === key.toLowerCase() &&
            !!shortcut.ctrlKey === !!modifiers.ctrlKey &&
            !!shortcut.shiftKey === !!modifiers.shiftKey &&
            !!shortcut.metaKey === !!modifiers.metaKey
    );
};

/**
 * Check if a keyboard event matches a shortcut
 * 
 * @param event - Keyboard event
 * @param shortcut - Shortcut to match against
 * @returns true if event matches shortcut
 * 
 * @example
 * const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true });
 * matchesShortcut(event, { key: 's', ctrlKey: true })
 * // Returns: true
 */
export const matchesShortcut = (
    event: KeyboardEvent,
    shortcut: BaseShortcutConfig
): boolean => {
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatch = shortcut.ctrlKey
        ? (event.ctrlKey || event.metaKey)  // Mac uses metaKey
        : (!event.ctrlKey && !event.metaKey);
    const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
    const metaMatch = shortcut.metaKey ? event.metaKey : true;

    return keyMatch && ctrlMatch && shiftMatch && metaMatch;
};

/**
 * Group shortcuts by category
 * 
 * @param shortcuts - Record of categorized shortcuts
 * @returns Object with categories as keys and shortcuts as values
 * 
 * @example
 * groupByCategory(EDITOR_SHORTCUTS)
 * // Returns: {
 * //   Creation: [{ key: 'n', ... }, ...],
 * //   Editing: [{ key: 's', ... }, ...],
 * //   ...
 * // }
 */
export const groupByCategory = <T extends CategorizedShortcut>(
    shortcuts: Record<string, T>
): Record<string, T[]> => {
    return getAllShortcuts(shortcuts).reduce((acc, shortcut) => {
        if (!acc[shortcut.category]) {
            acc[shortcut.category] = [];
        }
        acc[shortcut.category].push(shortcut);
        return acc;
    }, {} as Record<string, T[]>);
};

/**
 * Validate shortcut configuration
 * 
 * @param shortcut - Shortcut to validate
 * @returns Array of validation errors (empty if valid)
 * 
 * @example
 * validateShortcut({ key: '', description: 'Invalid' })
 * // Returns: ['Key is required']
 */
export const validateShortcut = (shortcut: Partial<BaseShortcutConfig>): string[] => {
    const errors: string[] = [];

    if (!shortcut.key || shortcut.key.trim() === '') {
        errors.push('Key is required');
    }

    if (!shortcut.description || shortcut.description.trim() === '') {
        errors.push('Description is required');
    }

    // Warn about single-key shortcuts without modifiers (easy to trigger accidentally)
    if (shortcut.key && shortcut.key.length === 1 &&
        !shortcut.ctrlKey && !shortcut.shiftKey && !shortcut.metaKey) {
        errors.push('Single-key shortcuts should have at least one modifier to avoid accidental triggers');
    }

    return errors;
};

// ═══════════════════════════════════════════════════════════════
// 🎨 DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get platform-specific modifier key symbol
 * 
 * @param modifier - Modifier key name
 * @param isMac - Whether platform is Mac
 * @returns Symbol for the modifier
 * 
 * @example
 * getModifierSymbol('ctrlKey', true)  // Returns: '⌘'
 * getModifierSymbol('ctrlKey', false) // Returns: 'Ctrl'
 */
export const getModifierSymbol = (
    modifier: 'ctrlKey' | 'shiftKey' | 'metaKey',
    isMac: boolean = detectMacOS()
): string => {
    const symbols: Record<string, { mac: string; other: string }> = {
        ctrlKey: { mac: '⌘', other: 'Ctrl' },
        shiftKey: { mac: '⇧', other: 'Shift' },
        metaKey: { mac: '⌘', other: 'Meta' },
    };

    return isMac ? symbols[modifier].mac : symbols[modifier].other;
};

/**
 * Get shortcut display with symbols (for compact display)
 * 
 * @param shortcut - Shortcut configuration
 * @param isMac - Whether platform is Mac
 * @returns Formatted string with symbols
 * 
 * @example
 * getShortcutWithSymbols({ key: 's', ctrlKey: true }, true)
 * // Returns: "⌘S"
 */
export const getShortcutWithSymbols = (
    shortcut: BaseShortcutConfig,
    isMac: boolean = detectMacOS()
): string => {
    let result = '';

    if (shortcut.ctrlKey) result += getModifierSymbol('ctrlKey', isMac);
    if (shortcut.shiftKey) result += getModifierSymbol('shiftKey', isMac);
    if (shortcut.metaKey) result += getModifierSymbol('metaKey', isMac);

    result += shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;

    return result;
};
