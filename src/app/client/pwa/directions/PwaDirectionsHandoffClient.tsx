'use client';

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    mapsUrl: string;
    storeName: string;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
}

export default function PwaDirectionsHandoffClient({
    storeId,
    tenantId,
    mapsUrl,
    storeName,
    trackingEnabled,
    locationTrackingEnabled = true,
}: Props) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled, includeLocation: locationTrackingEnabled });

        const t = window.setTimeout(() => {
            window.location.replace(mapsUrl);
        }, 80);

        setReady(true);
        return () => window.clearTimeout(t);
    }, [storeId, tenantId, mapsUrl, trackingEnabled, locationTrackingEnabled]);

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
                Directions to {storeName}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {ready ? 'Opening maps…' : 'Preparing…'}
            </p>
            <noscript>
                <p style={{ marginTop: 16 }}>
                    <a href={mapsUrl}>Open in Maps</a>
                </p>
            </noscript>
        </div>
    );
}
