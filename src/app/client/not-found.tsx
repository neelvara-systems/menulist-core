'use client';

/**
 * Client Menu Not Found Page (Customer Infra Hardening - TASK 8)
 *
 * Branded 404 page for customer-facing menu.
 * Lightweight — no Ant Design, no dashboard dependencies.
 * Shows professional message instead of generic Next.js 404.
 *
 * 3-Year Freeze: This is what customers see if they
 * hit a bad URL. Must look professional, not broken.
 */

import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLocale,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { appendPublicLanguageParam } from '@lib/localization/publicRenderLanguage';
import { useEffect, useState } from 'react';
import { LuBookX } from 'react-icons/lu';

export default function ClientMenuNotFound() {
    const [activeLanguage, setActiveLanguage] = useState('en');

    useEffect(() => {
        const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
        if (requestedLanguage) {
            setActiveLanguage(getPublicCustomerLocale(requestedLanguage).split('-')[0] || 'en');
        }
    }, []);

    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);
    const pageTitle = t('menu.menuNotFound');

    useEffect(() => {
        document.title = pageTitle;
    }, [pageTitle]);

    return (
        <div
            dir={direction}
            lang={activeLanguage}
            style={{
                minHeight: "100dvh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "calc(24px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom))",
                background: "#fafafa",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textAlign: "center",
                color: "#333",
            }}
        >
            <div
                style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#e3f2fd",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    color: "#1565c0",
                }}
                aria-hidden="true"
            >
                <LuBookX size={28} />
            </div>

            <h1
                style={{
                    fontSize: "22px",
                    fontWeight: 600,
                    margin: "0 0 8px",
                    color: "#1a1a1a",
                }}
            >
                {pageTitle}
            </h1>

            <p
                style={{
                    fontSize: "15px",
                    color: "#666",
                    margin: "0 0 24px",
                    maxWidth: "320px",
                    lineHeight: 1.5,
                }}
            >
                {t('menu.publicLinkInactive')}
            </p>

            <a
                href={appendPublicLanguageParam('/', activeLanguage)}
                style={{
                    padding: "12px 32px",
                    fontSize: "16px",
                    fontWeight: 500,
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    textDecoration: "none",
                    marginBottom: "16px",
                    display: "inline-block",
                }}
            >
                {t('menu.goToHomepage')}
            </a>

            <p
                style={{
                    fontSize: "13px",
                    color: "#999",
                    margin: 0,
                }}
            >
                {t('menu.askBusinessCorrectLink')}
            </p>

            <PublicMenuListAttribution
                ariaLabel={t('common.createOfficialCustomerLink')}
                rightsLabel={t('common.allRightsReserved')}
                surfaceLabel={t('common.poweredByMenuList')}
            />
        </div>
    );
}
