'use client';

import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLocale,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import { useEffect, useState } from 'react';
import { LuMessageSquareDashed } from 'react-icons/lu';

export default function GuestFeedbackNotFound() {
    const [activeLanguage, setActiveLanguage] = useState('en');

    useEffect(() => {
        const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
        if (requestedLanguage) {
            setActiveLanguage(getPublicCustomerLocale(requestedLanguage).split('-')[0] || 'en');
        }
    }, []);

    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);

    return (
        <main
            dir={direction}
            lang={activeLanguage}
            style={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))',
                background: '#fafafa',
                color: '#333',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textAlign: 'center',
            }}
        >
            <div
                aria-hidden="true"
                style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: '#e3f2fd',
                    color: '#1565c0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                }}
            >
                <LuMessageSquareDashed size={28} />
            </div>

            <h1
                style={{
                    fontSize: 22,
                    fontWeight: 600,
                    margin: '0 0 8px',
                    color: '#1a1a1a',
                }}
            >
                {t('feedback.pageTitle')} — {t('menu.pageNotYetAvailable')}
            </h1>

            <p
                style={{
                    maxWidth: 360,
                    margin: '0 0 24px',
                    color: '#666',
                    fontSize: 15,
                    lineHeight: 1.5,
                }}
            >
                {t('menu.publicLinkInactive')}
            </p>

            <a
                href={appendPublicLanguageParam('/', activeLanguage)}
                style={{
                    display: 'inline-block',
                    minHeight: 44,
                    padding: '12px 32px',
                    marginBottom: 16,
                    borderRadius: 8,
                    background: '#1a1a1a',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 500,
                    textDecoration: 'none',
                }}
            >
                {t('menu.goToHomepage')}
            </a>

            <p
                style={{
                    margin: 0,
                    color: '#999',
                    fontSize: 13,
                }}
            >
                {t('menu.askBusinessCorrectLink')}
            </p>

            <PublicMenuListAttribution
                ariaLabel={t('common.createOfficialCustomerLink')}
                rightsLabel={t('common.allRightsReserved')}
                surfaceLabel={t('common.poweredByMenuList')}
            />
        </main>
    );
}
