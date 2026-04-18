'use client';

/**
 * Customer App Controller
 *
 * Central client-side glue that runs ONCE on the customer menu page:
 *
 *   1. Increments the visit counter (visitCounter.ts) — gates prompt eligibility
 *   2. Fires CUSTOMER_APP_OPENED if launched in standalone mode (detectAndTrackAppOpen)
 *   3. Fires CUSTOMER_APP_SHORTCUT_* if launched from a PWA shortcut
 *      (detectAndTrackShortcutLaunch)
 *   4. Captures `beforeinstallprompt` for the native install flow (Chromium)
 *   5. Listens for `appinstalled` and fires CUSTOMER_APP_INSTALLED (deduped via localStorage)
 *   6. Renders <InstallPrompt /> when all eligibility checks pass:
 *        - Feature flag ON (global)
 *        - pwaSettings.promoteInstallation !== false
 *        - Not already installed (detectInstalled)
 *        - Visits >= threshold
 *        - Not dismissed in the last 30 days
 *
 * All analytics calls respect the owner-level `trackMenuViews !== false` gate
 * (propagated via `trackingEnabled`).
 *
 * Renders nothing when feature is disabled — zero DOM cost.
 */

import { useEffect, useState } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { detectInstalled, type BeforeInstallPromptEvent } from '@lib/pwa/installDetection';
import { detectAndTrackAppOpen } from '@lib/pwa/standaloneDetector';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import { fireInstalledEventOnce } from '@lib/pwa/installTracker';
import {
    canShowPrompt,
    incrementVisitCount,
    markPromptDismissed,
} from '@lib/pwa/visitCounter';
import InstallPrompt from './InstallPrompt';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    storeName: string;
    /** From store.pwaSettings.promoteInstallation — default true. */
    promoteInstallation?: boolean;
    /** From store.analytics.trackMenuViews !== false (default true). */
    trackingEnabled?: boolean;
}

export default function CustomerAppController({
    storeId,
    tenantId,
    storeName,
    promoteInstallation = true,
    trackingEnabled = true,
}: Props) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
    const [installedInThisSession, setInstalledInThisSession] = useState(false);

    // Guard: feature off entirely → render nothing, do nothing.
    const featureOn = FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA;

    // ── One-time visit counting + standalone + shortcut detection ──
    useEffect(() => {
        if (!featureOn) return;
        if (typeof window === 'undefined') return;

        // 1. Increment visit count (this visit counts even if we don't show the prompt).
        incrementVisitCount(storeId);

        // 2. Fire OPENED event if this is a standalone-mode launch.
        void detectAndTrackAppOpen(storeId, { tenantId, trackingEnabled });

        // 3. Fire SHORTCUT_* event if launched from a manifest shortcut.
        void detectAndTrackShortcutLaunch(storeId, { tenantId, trackingEnabled });

        // 4. Compute prompt eligibility AFTER incrementing visits.
        const eligible =
            promoteInstallation &&
            !detectInstalled() &&
            canShowPrompt(storeId);
        if (eligible) setShouldShowPrompt(true);
    }, [featureOn, storeId, tenantId, trackingEnabled, promoteInstallation]);

    // ── beforeinstallprompt capture (Chromium only) ──
    useEffect(() => {
        if (!featureOn) return;
        if (typeof window === 'undefined') return;

        const handler = (e: Event) => {
            // Prevent browser's default mini-infobar so we can control timing.
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, [featureOn]);

    // ── appinstalled listener — fires CUSTOMER_APP_INSTALLED (deduped) ──
    useEffect(() => {
        if (!featureOn) return;
        if (typeof window === 'undefined') return;

        const handler = () => {
            setInstalledInThisSession(true);
            void fireInstalledEventOnce(storeId, { tenantId, trackingEnabled });
        };
        window.addEventListener('appinstalled', handler);
        return () => window.removeEventListener('appinstalled', handler);
    }, [featureOn, storeId, tenantId, trackingEnabled]);

    if (!featureOn) return null;
    if (installedInThisSession) return null;
    if (!shouldShowPrompt) return null;

    return (
        <InstallPrompt
            storeId={storeId}
            tenantId={tenantId}
            storeName={storeName}
            deferredPrompt={deferredPrompt}
            trackingEnabled={trackingEnabled}
            onDismiss={() => {
                markPromptDismissed(storeId);
                setShouldShowPrompt(false);
            }}
            onInstallAccepted={() => {
                // The appinstalled listener handles INSTALLED tracking; we just hide the UI.
                setShouldShowPrompt(false);
            }}
        />
    );
}
