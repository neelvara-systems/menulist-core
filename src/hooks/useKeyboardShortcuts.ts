import { useEffect } from 'react';

export interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    action: () => void;
    description: string;
}

/**
 * Hook for registering keyboard shortcuts
 * 
 * @param shortcuts - Array of shortcut configurations
 * @param enabled - Whether shortcuts are enabled (default: true)
 * 
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: '/',
 *     action: () => searchRef.current?.focus(),
 *     description: 'Focus search'
 *   },
 *   {
 *     key: 'Escape',
 *     action: () => closeModal(),
 *     description: 'Close modal'
 *   }
 * ]);
 */
export const useKeyboardShortcuts = (
    shortcuts: ShortcutConfig[],
    enabled: boolean = true
) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input/textarea
            // Exception: Escape key should always work (to blur/exit inputs)
            const target = e.target as HTMLElement;
            const isInInput = (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable
            );

            if (isInInput && e.key !== 'Escape') {
                return;
            }

            shortcuts.forEach(shortcut => {
                const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

                // Handle Ctrl/Cmd key: ctrlKey on Windows/Linux, metaKey on Mac
                const ctrlMatch = shortcut.ctrlKey
                    ? (e.ctrlKey || e.metaKey)
                    : (!e.ctrlKey && !e.metaKey);

                const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
                const metaMatch = shortcut.metaKey ? e.metaKey : true; // Allow if not specified

                if (keyMatch && ctrlMatch && shiftMatch && metaMatch) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    shortcut.action();
                }
            });
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, enabled]);
};

/**
 * Hook for sequence-based shortcuts (e.g., "g" + "h")
 */
let sequenceBuffer: string[] = [];
let sequenceTimer: NodeJS.Timeout;

export const useSequenceShortcuts = (
    shortcuts: Array<{ sequence: string[]; action: () => void; description: string }>,
    enabled: boolean = true
) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                target.isContentEditable
            ) {
                return;
            }

            // Add key to sequence buffer
            sequenceBuffer.push(e.key.toLowerCase());

            // Clear buffer after 1 second of inactivity
            clearTimeout(sequenceTimer);
            sequenceTimer = setTimeout(() => {
                sequenceBuffer = [];
            }, 1000);

            // Check if any shortcut matches
            shortcuts.forEach(shortcut => {
                const sequenceStr = sequenceBuffer.join(' ');
                const shortcutStr = shortcut.sequence.join(' ');

                if (sequenceStr === shortcutStr) {
                    e.preventDefault();
                    shortcut.action();
                    sequenceBuffer = []; // Reset buffer
                }
            });
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            clearTimeout(sequenceTimer);
        };
    }, [shortcuts, enabled]);
};
