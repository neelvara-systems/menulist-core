import { useEffect, useRef } from 'react';

export interface ShortcutConfig {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    action: () => void;
    description: string;
}

export function matchesKeyboardShortcut(
    event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
    shortcut: Pick<ShortcutConfig, 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'>,
): boolean {
    const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
    const ctrlMatch = shortcut.ctrlKey
        ? (event.ctrlKey || event.metaKey)
        : shortcut.metaKey
            ? !event.ctrlKey
            : (!event.ctrlKey && !event.metaKey);
    const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
    const metaMatch = shortcut.metaKey ? event.metaKey : true;
    return keyMatch && ctrlMatch && shiftMatch && metaMatch;
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

            for (const shortcut of shortcuts) {
                if (matchesKeyboardShortcut(e, shortcut)) {
                    e.preventDefault();
                    e.stopPropagation(); // Prevent event bubbling
                    shortcut.action();
                    return;
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts, enabled]);
};

/**
 * Hook for sequence-based shortcuts (e.g., "g" + "h")
 */
export const useSequenceShortcuts = (
    shortcuts: Array<{ sequence: string[]; action: () => void; description: string }>,
    enabled: boolean = true
) => {
    const sequenceBufferRef = useRef<string[]>([]);
    const sequenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!enabled) {
            sequenceBufferRef.current = [];
            if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
            sequenceTimerRef.current = null;
            return;
        }

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
            sequenceBufferRef.current.push(e.key.toLowerCase());

            // Clear buffer after 1 second of inactivity
            if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
            sequenceTimerRef.current = setTimeout(() => {
                sequenceBufferRef.current = [];
                sequenceTimerRef.current = null;
            }, 1000);

            // Check if any shortcut matches
            shortcuts.forEach(shortcut => {
                const sequenceStr = sequenceBufferRef.current.join(' ');
                const shortcutStr = shortcut.sequence.join(' ');

                if (sequenceStr === shortcutStr) {
                    e.preventDefault();
                    shortcut.action();
                    sequenceBufferRef.current = []; // Reset buffer
                }
            });
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            sequenceBufferRef.current = [];
            if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current);
            sequenceTimerRef.current = null;
        };
    }, [shortcuts, enabled]);
};
