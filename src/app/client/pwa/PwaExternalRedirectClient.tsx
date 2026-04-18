'use client';

/**
 * Shared External-Redirect Handoff — Client Side
 *
 * Used by Reservation and Order shortcuts. Fires the analytics event via
 * shortcutSourceDetector (which reads ?source=shortcut-{kind} from the URL)
 * then redirects to the target external URL.
 *
 * Same pattern as PwaCallHandoffClient / PwaWhatsAppHandoffClient — extracted
 * because the branding/copy are the only differences.
 */

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    targetUrl: string;
    title: string;
    message: string;
    trackingEnabled: boolean;
}

export default function PwaExternalRedirectClient({
    storeId,
    tenantId,
    targetUrl,
    title,
    message,
    trackingEnabled,
}: Props) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Fire-and-forget analytics; never block the redirect.
        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled });

        // Small delay so the tracking write can leave before the navigation.
        const t = window.setTimeout(() => {
            window.location.replace(targetUrl);
        }, 80);

        setReady(true);
        return () => window.clearTimeout(t);
    }, [storeId, tenantId, targetUrl, trackingEnabled]);

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                padding: '24px',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                color: '#0f172a',
                textAlign: 'center',
                background: '#ffffff',
            }}
        >
            <h1 style={{ fontSize: 20, margin: '0 0 12px', fontWeight: 600 }}>{title}</h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {ready ? message : 'Preparing…'}
            </p>
            <noscript>
                <p style={{ marginTop: 16 }}>
                    <a href={targetUrl}>Continue</a>
                </p>
            </noscript>
        </div>
    );
}
