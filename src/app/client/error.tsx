"use client";

/**
 * Client Menu Error Page (Customer Infra Hardening - TASK 8)
 *
 * Branded error page for customer-facing menu.
 * Lightweight — no Ant Design, no dashboard dependencies.
 * Shows professional message instead of generic Next.js error.
 *
 * 3-Year Freeze: This is what thousands of restaurant customers see
 * if something goes wrong. Must look professional, not broken.
 */

import ErrorReportButton from "@/components/shared/debug/ErrorReportButton";
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from "@lib/localization/publicCustomerMessages";
import { secureError } from "@lib/security/secureLogger";
import { useEffect, useState } from "react";
import { LuTriangle } from "react-icons/lu";

const buildClientMenuErrorLogContext = (error: Error & { digest?: string }) => {
    const digest = String(error.digest ?? "").trim();

    return {
        errorName: (error.name || "Error").slice(0, 80),
        hasDigest: Boolean(digest),
        digestLength: digest.length,
    };
};

export default function ClientMenuError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [isRetrying, setIsRetrying] = useState(false);
    const [activeLanguage, setActiveLanguage] = useState('en');

    useEffect(() => {
        secureError(
            "[Client Menu] Error boundary triggered",
            new Error("client_menu_error_boundary"),
            buildClientMenuErrorLogContext(error),
        );
    }, [error]);

    useEffect(() => {
        const requestedLanguage = new URLSearchParams(window.location.search).get('lang');
        if (requestedLanguage) setActiveLanguage(requestedLanguage);
    }, []);

    const t = createPublicCustomerTranslator(activeLanguage);
    const direction = getPublicCustomerLanguageDirection(activeLanguage);
    const pageTitle = t('menu.temporarilyUnavailable');

    useEffect(() => {
        document.title = pageTitle;
    }, [pageTitle]);

    const handleRetry = () => {
        setIsRetrying(true);
        reset();
        // Fallback: hard refresh if reset doesn't resolve
        setTimeout(() => {
            window.location.reload();
        }, 200);
    };

    return (
        <div
            dir={direction}
            lang={activeLanguage}
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "#fafafa",
                fontFamily: "system-ui, -apple-system, sans-serif",
                textAlign: "center",
                color: "#333",
            }}
        >
            {/* Icon */}
            <div
                style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    background: "#fff3e0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "20px",
                    color: "#e65100",
                }}
                aria-hidden="true"
            >
                <LuTriangle size={28} />
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
                {t('menu.loadingTrouble')}
            </p>

            <button
                onClick={handleRetry}
                disabled={isRetrying}
                style={{
                    padding: "12px 32px",
                    fontSize: "16px",
                    fontWeight: 500,
                    background: isRetrying ? "#ccc" : "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: isRetrying ? "not-allowed" : "pointer",
                    marginBottom: "16px",
                    transition: "background 0.2s",
                }}
            >
                {isRetrying ? t('menu.retrying') : t('menu.tryAgain')}
            </button>

            <ErrorReportButton
                error={error}
                label={t('menu.reportThisIssue')}
                source="client-menu-error-boundary"
                style={{
                    color: "#333",
                    marginBottom: 16,
                }}
            />

            <p
                style={{
                    fontSize: "13px",
                    color: "#999",
                    margin: 0,
                }}
            >
                {t('menu.askServerAssistance')}
            </p>
        </div>
    );
}
