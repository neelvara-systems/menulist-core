'use client';

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import { getSafePwaWhatsAppUrl } from '../shortcutHandoffUrl';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    waUrl: string;
    storeName: string;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
}

export default function PwaWhatsAppHandoffClient({
    storeId,
    tenantId,
    waUrl,
    storeName,
    trackingEnabled,
    locationTrackingEnabled = true,
}: Props) {
    const [ready, setReady] = useState(false);
    const safeWaUrl = getSafePwaWhatsAppUrl(waUrl);

    useEffect(() => {
        if (!safeWaUrl) {
            setReady(true);
            return;
        }

        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled, includeLocation: locationTrackingEnabled });

        const t = window.setTimeout(() => {
            window.location.replace(safeWaUrl);
        }, 80);

        setReady(true);
        return () => window.clearTimeout(t);
    }, [storeId, tenantId, safeWaUrl, trackingEnabled, locationTrackingEnabled]);

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
            <h1 style={{ fontSize: 20, margin: '0 0 12px', fontWeight: 600 }}>
                Message {storeName}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {ready ? (safeWaUrl ? 'Opening WhatsApp…' : 'This shortcut is unavailable.') : 'Preparing…'}
            </p>
            {safeWaUrl ? (
                <noscript>
                    <p style={{ marginTop: 16 }}>
                        <a href={safeWaUrl}>Open in WhatsApp</a>
                    </p>
                </noscript>
            ) : null}
        </div>
    );
}
