'use client'

export function openMobilePublicLink(url?: string | null) {
    if (!url || typeof window === 'undefined') return;

    // In installed PWAs, same-window public navigation remounts the owner shell
    // when the external view is dismissed. A blank context preserves shell state.
    window.open(url, '_blank', 'noopener,noreferrer');
}
