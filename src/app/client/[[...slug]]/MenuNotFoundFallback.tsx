'use client';

/**
 * Menu Not Found — Fallback Ladder (T1-N-03 / A-12 PUBLIC-ROUTING-DOCTRINE)
 *
 * When a requested project URL does not resolve, this client component
 * implements the A-12 PWA fallback ladder:
 *
 *   Requested project ─► `/menu` alias (Layer 2) ─► Outlet OBP ─► Brand OBP
 *
 * Each rung serves content (not a 404), so QR operational value survives any
 * single project deletion. The ladder is doctrine-locked for public rendering;
 * Customer App manifest identity remains store-level and does not participate
 * in this fallback.
 *
 * ─── Rendering behavior ──────────────────────────────────────────
 *  • Browser tabs (display-mode: browser): show the notice with visible
 *    "Go to …" link(s). No auto-redirect — the customer is in a normal tab
 *    and can decide.
 *  • Installed PWAs (display-mode: standalone): show the same notice plus a
 *    2-second countdown, then auto-redirect up the ladder. This prevents
 *    the "dead app icon" effect when a project is deleted.
 *
 * This component is the single source of truth for deleted-project fallback
 * UX. Manifest `start_url` stays `/menu` or `/` at the store level.
 */

import PublicMenuListAttribution from '@/components/customer/PublicMenuListAttribution';
import { useEffect, useMemo, useState } from 'react';

interface MenuNotFoundFallbackProps {
    /** The slug the customer typed (empty string when the path was just `/menu`). */
    requestedSlug: string;
    /** The outlet slug if the customer is already inside an outlet URL. */
    outletSlug?: string | null;
    /** Human-readable store / outlet name for the notice. */
    storeName?: string | null;
    /** Brand name shown as the top-level home link. */
    brandName?: string | null;
}

type LadderStep = {
    href: string;
    label: string;
};

function buildLadder({
    outletSlug,
    storeName,
    brandName,
}: Pick<MenuNotFoundFallbackProps, 'outletSlug' | 'storeName' | 'brandName'>): LadderStep[] {
    const steps: LadderStep[] = [];
    if (outletSlug) {
        steps.push({
            href: `/${outletSlug}`,
            label: storeName ? `Go to ${storeName}` : `Go to this location`,
        });
    }
    steps.push({
        href: '/',
        label: brandName ? `Go to ${brandName} home` : `Go to business home`,
    });
    return steps;
}

export default function MenuNotFoundFallback({
    requestedSlug,
    outletSlug,
    storeName,
    brandName,
}: MenuNotFoundFallbackProps) {
    const ladder = useMemo(
        () => buildLadder({ outletSlug, storeName, brandName }),
        [outletSlug, storeName, brandName],
    );

    const [isStandalone, setIsStandalone] = useState(false);
    const [countdown, setCountdown] = useState(2);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const match = window.matchMedia?.('(display-mode: standalone)');
        const iosStandalone = (window.navigator as any)?.standalone === true;
        setIsStandalone(Boolean(match?.matches) || iosStandalone);
    }, []);

    useEffect(() => {
        if (!isStandalone || ladder.length === 0) return;
        const target = ladder[0].href;
        const interval = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    // Visible 2s hint has elapsed — redirect up the ladder.
                    window.location.replace(target);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isStandalone, ladder]);

    const notice = requestedSlug
        ? `The menu at "/${requestedSlug}" is no longer available.`
        : `This menu is no longer available.`;

    return (
        <div
            style={{
                minHeight: '60vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
            }}
        >
            <div
                style={{
                    maxWidth: 420,
                    textAlign: 'center',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 12,
                    padding: '28px 24px',
                    background: '#fff',
                }}
            >
                <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                    Menu Not Available
                </h1>
                <p style={{ marginTop: 12, marginBottom: 20, color: 'rgba(0, 0, 0, 0.65)' }}>
                    {notice}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ladder.map((step) => (
                        <a
                            key={step.href}
                            href={step.href}
                            style={{
                                display: 'inline-block',
                                padding: '10px 16px',
                                borderRadius: 8,
                                background: '#111',
                                color: '#fff',
                                textDecoration: 'none',
                                fontWeight: 500,
                            }}
                        >
                            {step.label}
                        </a>
                    ))}
                </div>

                {isStandalone && ladder.length > 0 && countdown > 0 ? (
                    <p
                        style={{
                            marginTop: 16,
                            fontSize: '0.85rem',
                            color: 'rgba(0, 0, 0, 0.45)',
                        }}
                        aria-live="polite"
                    >
                        Redirecting in {countdown}s…
                    </p>
                ) : null}

                <PublicMenuListAttribution mode="compact" />
            </div>
        </div>
    );
}
