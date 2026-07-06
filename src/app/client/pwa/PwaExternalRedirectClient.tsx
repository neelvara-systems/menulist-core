'use client';

/**
 * Shared External-Redirect Handoff — Client Side
 *
 * Used by Reservation and Order shortcuts. Fires the analytics event via
 * shortcutSourceDetector (which reads ?entry_source=shortcut-{kind} from the URL)
 * then redirects to the target external URL.
 *
 * Same pattern as PwaCallHandoffClient / PwaWhatsAppHandoffClient — extracted
 * because the branding/copy are the only differences.
 */

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import { getSafePwaExternalHttpsUrl } from './shortcutHandoffUrl';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    targetUrl: string;
    title: string;
    message: string;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
}

export default function PwaExternalRedirectClient({
    storeId,
    tenantId,
    targetUrl,
    title,
    message,
    trackingEnabled,
    locationTrackingEnabled = true,
}: Props) {
    const [ready, setReady] = useState(false);
    const safeTargetUrl = getSafePwaExternalHttpsUrl(targetUrl);

    useEffect(() => {
        if (!safeTargetUrl) {
            setReady(true);
            return;
        }

        // Fire-and-forget analytics; never block the redirect.
        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled, includeLocation: locationTrackingEnabled });

        // Small delay so the tracking write can leave before the navigation.
        const t = window.setTimeout(() => {
            window.location.replace(safeTargetUrl);
        }, 80);

        setReady(true);
        return () => window.clearTimeout(t);
    }, [storeId, tenantId, safeTargetUrl, trackingEnabled, locationTrackingEnabled]);

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
                {ready ? (safeTargetUrl ? message : 'This shortcut is unavailable.') : 'Preparing…'}
            </p>
            {safeTargetUrl ? (
                <noscript>
                    <p style={{ marginTop: 16 }}>
                        <a href={safeTargetUrl}>Continue</a>
                    </p>
                </noscript>
            ) : null}
        </div>
    );
}
