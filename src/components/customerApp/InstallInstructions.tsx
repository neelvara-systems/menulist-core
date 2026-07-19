'use client';

/**
 * Install Instructions — iOS fallback.
 *
 * iOS Safari does not support `beforeinstallprompt`. The only way to "install"
 * a PWA on iOS is: Share → Add to Home Screen. This component shows that
 * visual instruction in a simple modal when the customer taps Install on iOS.
 */

import { useEffect } from 'react';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';

interface Props {
    activeLanguage?: string;
    open: boolean;
    onClose: () => void;
    storeName: string;
    themeColor?: string;
    textColor?: string;
}

export default function InstallInstructions({
    activeLanguage,
    open,
    onClose,
    storeName,
    themeColor,
    textColor,
}: Props) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const languageDirection = getPublicCustomerLanguageDirection(activeLanguage);
    // Close on Escape.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={t('menu.installTitle', { storeName })}
            dir={languageDirection}
            lang={activeLanguage}
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                background: 'rgba(15, 23, 42, 0.55)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 480,
                    background: '#ffffff',
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    padding: '24px 20px 32px',
                    boxShadow: '0 -8px 32px rgba(15, 23, 42, 0.18)',
                    color: '#0f172a',
                }}
            >
                <div
                    style={{
                        width: 40,
                        height: 4,
                        background: '#e2e8f0',
                        borderRadius: 4,
                        margin: '-8px auto 16px',
                    }}
                />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
                    {t('menu.addToHomeScreenTitle', { storeName })}
                </h2>
                <p style={{ fontSize: 14, color: '#475569', margin: '0 0 20px' }}>
                    {t('menu.followSafariSteps')}
                </p>

                <ol style={{ margin: 0, paddingInlineStart: 20, fontSize: 15, lineHeight: 1.6 }}>
                    <li style={{ marginBottom: 12 }}>
                        {t('menu.safariShareStep')}
                    </li>
                    <li style={{ marginBottom: 12 }}>
                        {t('menu.safariHomeScreenStep')}
                    </li>
                    <li>
                        {t('menu.safariAddStep')}
                    </li>
                </ol>

                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        width: '100%',
                        marginTop: 24,
                        padding: '14px 16px',
                        background: themeColor || '#0f172a',
                        color: textColor || '#ffffff',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    {t('menu.gotIt')}
                </button>
            </div>
        </div>
    );
}
