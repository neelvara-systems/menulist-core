'use client';

import { useEffect, useState } from 'react';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { getSafePwaWhatsAppUrl } from '../shortcutHandoffUrl';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    waUrl: string;
    storeName: string;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
    activeLanguage?: string | null;
}

export default function PwaWhatsAppHandoffClient({
    storeId,
    tenantId,
    waUrl,
    storeName,
    trackingEnabled,
    locationTrackingEnabled = true,
    activeLanguage,
}: Props) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);
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
                {t('menu.messageBusiness', { businessName: storeName })}
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
                {ready
                    ? (safeWaUrl ? t('menu.openingWhatsApp') : t('menu.shortcutUnavailable'))
                    : t('menu.preparing')}
            </p>
            {safeWaUrl ? (
                <noscript>
                    <p style={{ marginTop: 16 }}>
                        <a href={safeWaUrl}>{t('menu.openInWhatsApp')}</a>
                    </p>
                </noscript>
            ) : null}
        </div>
    );
}
