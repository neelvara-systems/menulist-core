import { CategorizedShortcut } from '@util/keyboardShortcuts.utils';

/**
 * 🎹 Editor Keyboard Shortcuts Configuration
 * 
 * Single source of truth for all editor shortcuts.
 * Used by both:
 * 1. useKeyboardShortcuts hook (for functionality)
 * 2. KeyboardShortcutsHelp modal (for display)
 */

export type EditorShortcutCategory = 'Creation' | 'Editing' | 'Navigation' | 'Deletion' | 'Batch Actions' | 'Help';

export interface EditorShortcutConfig extends CategorizedShortcut {
    category: EditorShortcutCategory;
}

/**
 * Editor keyboard shortcuts organized by category
 */
export const EDITOR_SHORTCUTS: Record<string, EditorShortcutConfig> = {
    // ═══════════════════════════════════════════════════
    // CREATION
    // ═══════════════════════════════════════════════════
    ADD_ITEM: {
        key: 'n',
        ctrlKey: true,
        description: 'Add new item to current category',
        category: 'Creation'
    },
    ADD_CATEGORY: {
        key: 'n',
        ctrlKey: true,
        shiftKey: true,
        description: 'Add new category',
        category: 'Creation'
    },

    // ═══════════════════════════════════════════════════
    // EDITING
    // ═══════════════════════════════════════════════════
    EDIT_ITEM: {
        key: 'e',
        description: 'Edit selected item',
        category: 'Editing'
    },
    SAVE_CHANGES: {
        key: 's',
        ctrlKey: true,
        description: 'Save changes',
        category: 'Editing'
    },
    TOGGLE_ACTIVE: {
        key: 'i',
        ctrlKey: true,
        description: 'Toggle item active/inactive',
        category: 'Editing'
    },

    // ═══════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════
    FOCUS_SEARCH: {
        key: 'f',
        ctrlKey: true,
        description: 'Focus search box',
        category: 'Navigation'
    },
    SELECT_PREVIOUS: {
        key: 'ArrowUp',
        description: 'Select previous item',
        category: 'Navigation'
    },
    SELECT_NEXT: {
        key: 'ArrowDown',
        description: 'Select next item',
        category: 'Navigation'
    },
    CLOSE_MODAL: {
        key: 'Escape',
        description: 'Close modal or clear selection',
        category: 'Navigation'
    },
    TOGGLE_VIEW: {
        key: '\\',
        ctrlKey: true,
        description: 'Toggle between Advanced/Traditional view',
        category: 'Navigation'
    },

    // ═══════════════════════════════════════════════════
    // DELETION
    // ═══════════════════════════════════════════════════
    DELETE_ITEM: {
        key: 'Delete',
        description: 'Delete selected item',
        category: 'Deletion'
    },

    // ═══════════════════════════════════════════════════
    // BATCH ACTIONS
    // ═══════════════════════════════════════════════════
    LANGUAGE_MODAL: {
        key: 'l',
        ctrlKey: true,
        description: 'Open language translation modal',
        category: 'Batch Actions'
    },
    DESCRIPTION_MODAL: {
        key: 'g',
        ctrlKey: true,
        description: 'Open AI description generator',
        category: 'Batch Actions'
    },
    IMAGES_MODAL: {
        key: 'u',
        ctrlKey: true,
        description: 'Open bulk image upload',
        category: 'Batch Actions'
    },
    BULK_STATUS_MODAL: {
        key: 'b',
        ctrlKey: true,
        description: 'Open bulk active/inactive status',
        category: 'Batch Actions'
    },
    REORDER_MODAL: {
        key: 'r',
        ctrlKey: true,
        description: 'Open reorder menu modal',
        category: 'Batch Actions'
    },

    // ═══════════════════════════════════════════════════
    // HELP
    // ═══════════════════════════════════════════════════
    SHOW_SHORTCUTS: {
        key: '?',
        shiftKey: true,
        description: 'Show keyboard shortcuts',
        category: 'Help'
    },
};

// ═══════════════════════════════════════════════════
// Re-export shared utilities for convenience
// ═══════════════════════════════════════════════════
export {
    detectMacOS, formatShortcut, getAllShortcuts, getCategories, getShortcutsByCategory as getEditorShortcutsByCategory, getShortcutDisplay, groupByCategory
} from '@util/keyboardShortcuts.utils';

/**
 * Get all editor shortcuts as an array
 */
export const getAllEditorShortcuts = (): EditorShortcutConfig[] => {
    return Object.values(EDITOR_SHORTCUTS);
};

/**
 * Get all unique editor shortcut categories
 */
export const getShortcutCategories = (): EditorShortcutCategory[] => {
    return ['Creation', 'Editing', 'Navigation', 'Deletion', 'Batch Actions', 'Help'];
};
