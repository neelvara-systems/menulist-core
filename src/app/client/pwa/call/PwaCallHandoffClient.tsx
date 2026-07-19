'use client';

/**
 * Call Shortcut Handoff — Client Side
 *
 * Fires the analytics event (via shortcutSourceDetector, which reads
 * ?entry_source=shortcut-call from the URL) and redirects to tel:.
 *
 * Shows a minimal "Connecting…" UI in case the OS takes a moment to handle
 * the tel: handoff — most devices redirect instantly.
 */

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { getSafePwaTelUrl } from '../shortcutHandoffUrl';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    telUrl: string;
    storeName: string;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
    activeLanguage?: string | null;
}

export default function PwaCallHandoffClient({
    storeId,
    tenantId,
    telUrl,
    storeName,
    trackingEnabled,
    locationTrackingEnabled = true,
    activeLanguage,
}: Props) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);
    const [ready, setReady] = useState(false);
    const safeTelUrl = getSafePwaTelUrl(telUrl);

    useEffect(() => {
        if (!safeTelUrl) {
            setReady(true);
            return;
        }

        // Fire-and-forget analytics; never block the redirect.
        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled, includeLocation: locationTrackingEnabled });

        // Give the event a tick to leave before navigating away.
        const t = window.setTimeout(() => {
            window.location.replace(safeTelUrl);
        }, 80);

        setReady(true);
        return () => window.clearTimeout(t);
    }, [storeId, tenantId, safeTelUrl, trackingEnabled, locationTrackingEnabled]);

    return (
        <div
            dir={direction}
            lang={activeLanguage || 'en'}
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
                {t('menu.callingBusiness', { businessName: storeName })}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {ready
                    ? (safeTelUrl ? t('menu.openingPhone') : t('menu.shortcutUnavailable'))
                    : t('menu.preparing')}
            </p>
            {safeTelUrl ? (
                <noscript>
                    <p style={{ marginTop: 16 }}>
                        <a href={safeTelUrl}>{t('menu.tapToCall')}</a>
                    </p>
                </noscript>
            ) : null}
        </div>
    );
}
