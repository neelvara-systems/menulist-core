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

import { FEATURE_FLAGS } from '@config/features';
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';
import { detectInstalled, type BeforeInstallPromptEvent } from '@lib/pwa/installDetection';
import { fireInstalledEventOnce } from '@lib/pwa/installTracker';
import { detectAndTrackShortcutLaunch } from '@lib/pwa/shortcutSourceDetector';
import { detectAndTrackAppOpen } from '@lib/pwa/standaloneDetector';
import {
    canShowPrompt,
    hasDirectInstallIntent,
    incrementVisitCount,
    markPromptDismissed
} from '@lib/pwa/visitCounter';
import { useEffect, useRef, useState } from 'react';
import InstallPrompt from './InstallPrompt';

interface Props {
    activeLanguage?: string;
    storeId: string | number;
    tenantId: string | number;
    storeName: string;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    /** From store.pwaSettings.promoteInstallation — default true. */
    promoteInstallation?: boolean;
    /** From store.analytics.trackMenuViews !== false (default true). */
    trackingEnabled?: boolean;
    locationTrackingEnabled?: boolean;
    themeColor?: string;
}

export default function CustomerAppController({
    activeLanguage,
    storeId,
    tenantId,
    storeName,
    storeTimeZone,
    businessDayEndTime,
    promoteInstallation = true,
    trackingEnabled = true,
    locationTrackingEnabled = true,
    themeColor,
}: Props) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
    const [installedInThisSession, setInstalledInThisSession] = useState(false);
    const processedPromptScopeRef = useRef<string | null>(null);

    const promptScopeKey = getTenantStoreStorageKey(
        'customer-app-controller',
        tenantId,
        storeId,
    );
    // Guard every listener, side effect and render path when feature or
    // canonical tenant/store identity is unavailable.
    const featureOn = FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && Boolean(promptScopeKey);

    // ── One-time visit counting + standalone + shortcut detection ──
    useEffect(() => {
        if (!featureOn) return;
        if (typeof window === 'undefined') return;
        if (!promptScopeKey) {
            setDeferredPrompt(null);
            setShouldShowPrompt(false);
            setInstalledInThisSession(false);
            return;
        }
        if (processedPromptScopeRef.current === promptScopeKey) return;
        processedPromptScopeRef.current = promptScopeKey;
        setDeferredPrompt(null);
        setShouldShowPrompt(false);
        setInstalledInThisSession(false);

        // 1. Increment visit count (this visit counts even if we don't show the prompt).
        incrementVisitCount(tenantId, storeId);

        // 2. Fire OPENED event if this is a standalone-mode launch.
        void detectAndTrackAppOpen(storeId, { tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, includeLocation: locationTrackingEnabled });

        // 3. Fire SHORTCUT_* event if launched from a manifest shortcut.
        void detectAndTrackShortcutLaunch(storeId, { tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, includeLocation: locationTrackingEnabled });

        // 4. Compute prompt eligibility AFTER incrementing visits.
        //    Direct-install intent (?pwa=install on the URL) bypasses the visit
        //    threshold — owner-shared links / QR codes reach intent customers
        //    who shouldn't need to visit 3 times before they can install.
        const directIntent = hasDirectInstallIntent(window.location.search);
        const eligible =
            promoteInstallation &&
            !detectInstalled() &&
            canShowPrompt(tenantId, storeId, directIntent);
        if (eligible) setShouldShowPrompt(true);
    }, [featureOn, promptScopeKey, storeId, tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, locationTrackingEnabled, promoteInstallation]);

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
            void fireInstalledEventOnce(storeId, { tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, includeLocation: locationTrackingEnabled });
        };
        window.addEventListener('appinstalled', handler);
        return () => window.removeEventListener('appinstalled', handler);
    }, [featureOn, storeId, tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, locationTrackingEnabled]);

    if (!featureOn) return null;
    if (installedInThisSession) return null;
    if (!shouldShowPrompt) return null;

    return (
        <InstallPrompt
            activeLanguage={activeLanguage}
            storeId={storeId}
            tenantId={tenantId}
            storeName={storeName}
            storeTimeZone={storeTimeZone}
            businessDayEndTime={businessDayEndTime}
            themeColor={themeColor}
            deferredPrompt={deferredPrompt}
            trackingEnabled={trackingEnabled}
            locationTrackingEnabled={locationTrackingEnabled}
            onDismiss={() => {
                markPromptDismissed(tenantId, storeId);
                setShouldShowPrompt(false);
            }}
            onInstallAccepted={() => {
                // The appinstalled listener handles INSTALLED tracking; we just hide the UI.
                setShouldShowPrompt(false);
            }}
        />
    );
}
