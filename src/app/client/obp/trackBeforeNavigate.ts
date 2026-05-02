'use client';

import type { MouseEvent } from 'react';

const TRACK_BEFORE_NAVIGATE_TIMEOUT_MS = 800;

const waitForTracking = async (track: () => Promise<void>) => {
    await Promise.race([
        track(),
        new Promise<void>((resolve) => {
            window.setTimeout(resolve, TRACK_BEFORE_NAVIGATE_TIMEOUT_MS);
        }),
    ]);
};

interface TrackBeforeNavigateOptions {
    event: MouseEvent<HTMLAnchorElement>;
    href: string;
    target?: string;
    track: () => Promise<void>;
}

export function trackBeforeNavigate({
    event,
    href,
    target,
    track,
}: TrackBeforeNavigateOptions) {
    if (event.defaultPrevented) return;

    // Preserve browser-native alternate open behavior. These paths may still
    // undercount, but they should not break expected link gestures.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        void track().catch(() => { });
        return;
    }

    event.preventDefault();

    const reservedWindow = target === '_blank'
        ? window.open('', '_blank', 'noopener,noreferrer')
        : null;

    void (async () => {
        try {
            await waitForTracking(track);
        } catch {
            // Analytics must never block customer navigation.
        } finally {
            if (target === '_blank') {
                if (reservedWindow) {
                    reservedWindow.location.href = href;
                    return;
                }
                const opened = window.open(href, '_blank', 'noopener,noreferrer');
                if (!opened) window.location.assign(href);
                return;
            }

            window.location.assign(href);
        }
    })();
}
