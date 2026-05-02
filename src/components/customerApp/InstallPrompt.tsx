'use client';

/**
 * Install Prompt — Customer App (Installable PWA)
 *
 * Bottom-sheet banner shown on the customer menu once:
 *   - FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA is on
 *   - store.pwaSettings.promoteInstallation !== false
 *   - The customer is not already in standalone mode
 *   - canShowPrompt(storeId) passes (visit threshold + dismiss window)
 *
 * Events fired:
 *   CUSTOMER_APP_PROMPT_SHOWN       on render
 *   CUSTOMER_APP_PROMPT_DISMISSED   on dismiss tap
 *   CUSTOMER_APP_INSTALL_STARTED    on install CTA tap (before native prompt/instructions)
 *   CUSTOMER_APP_INSTALLED          fired by the global `appinstalled` listener
 *                                    in CustomerAppController via fireInstalledEventOnce()
 *
 * Design: minimal inline styles, no external UI dep, mobile-first sheet.
 */

import { getSessionId } from '@lib/analytics/session';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import type { BeforeInstallPromptEvent } from '@lib/pwa/installDetection';
import { recordPromptShown } from '@lib/pwa/installTracker';
import { detectPlatform } from '@lib/pwa/platformDetection';
import { useCallback, useEffect, useMemo, useState } from 'react';
import InstallInstructions from './InstallInstructions';

interface Props {
    storeId: string | number;
    tenantId: string | number;
    storeName: string;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    /** Deferred Chromium install prompt event captured by the controller. Null on iOS. */
    deferredPrompt: BeforeInstallPromptEvent | null;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
    onDismiss: () => void;
    onInstallAccepted: () => void;
}

export default function InstallPrompt({
    storeId,
    tenantId,
    storeName,
    storeTimeZone,
    businessDayEndTime,
    deferredPrompt,
    trackingEnabled,
    locationTrackingEnabled = true,
    onDismiss,
    onInstallAccepted,
}: Props) {
    const platform = useMemo(() => detectPlatform(), []);
    const [showIosInstructions, setShowIosInstructions] = useState(false);
    const [busy, setBusy] = useState(false);

    // Fire PROMPT_SHOWN exactly once when the banner mounts (trackEvent's built-in
    // debounce will swallow any accidental re-fire).
    // Also stamp localStorage — iOS install inference in standaloneDetector.ts
    // checks this timestamp to decide whether a later standalone launch
    // qualifies as a confirmed install.
    useEffect(() => {
        if (!trackingEnabled) return;
        void trackEvent(TrackingEvent.CUSTOMER_APP_PROMPT_SHOWN, {
            storeId: String(storeId),
            tenantId,
            sessionId: getSessionId(),
            storeTimeZone,
            businessDayEndTime,
            includeLocation: locationTrackingEnabled,
        });
        recordPromptShown(storeId);
    }, [storeId, tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, locationTrackingEnabled]);

    const handleDismiss = useCallback(() => {
        if (trackingEnabled) {
            void trackEvent(TrackingEvent.CUSTOMER_APP_PROMPT_DISMISSED, {
                storeId: String(storeId),
                tenantId,
                sessionId: getSessionId(),
                storeTimeZone,
                businessDayEndTime,
                includeLocation: locationTrackingEnabled,
            });
        }
        onDismiss();
    }, [storeId, tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, locationTrackingEnabled, onDismiss]);

    const handleInstall = useCallback(async () => {
        if (busy) return;
        setBusy(true);

        if (trackingEnabled) {
            void trackEvent(TrackingEvent.CUSTOMER_APP_INSTALL_STARTED, {
                storeId: String(storeId),
                tenantId,
                sessionId: getSessionId(),
                storeTimeZone,
                businessDayEndTime,
                includeLocation: locationTrackingEnabled,
            });
        }

        // Chromium path — native prompt available
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    onInstallAccepted();
                }
            } catch (err) {
                console.warn('[pwa] native install prompt failed:', err);
            } finally {
                setBusy(false);
            }
            return;
        }

        // iOS path — show manual instructions
        if (platform.platform === 'ios') {
            setShowIosInstructions(true);
            setBusy(false);
            return;
        }

        // Fallback (desktop Firefox, etc.) — just show instructions hint
        setShowIosInstructions(true);
        setBusy(false);
    }, [busy, deferredPrompt, platform.platform, storeId, tenantId, storeTimeZone, businessDayEndTime, trackingEnabled, locationTrackingEnabled, onInstallAccepted]);

    return (
        <>
            <div
                role="dialog"
                aria-label={`Install ${storeName} app`}
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9500,
                    padding: '12px',
                    pointerEvents: 'none',
                    fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
                }}
            >
                <div
                    style={{
                        pointerEvents: 'auto',
                        maxWidth: 480,
                        margin: '0 auto',
                        background: '#ffffff',
                        borderRadius: 16,
                        boxShadow:
                            '0 10px 30px rgba(15, 23, 42, 0.18), 0 2px 6px rgba(15, 23, 42, 0.06)',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        color: '#0f172a',
                    }}
                >
                    <div
                        style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            background: '#0f172a',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 22,
                            fontWeight: 700,
                            flexShrink: 0,
                            letterSpacing: '-0.03em',
                        }}
                        aria-hidden="true"
                    >
                        {(storeName || 'M').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
                            Install {storeName}
                        </div>
                        <div
                            style={{
                                fontSize: 12,
                                color: '#64748b',
                                marginTop: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            One-tap access from your home screen.
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label="Dismiss install prompt"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#64748b',
                            fontSize: 14,
                            padding: '10px 8px',
                            cursor: 'pointer',
                            minWidth: 44,
                            minHeight: 44,
                            flexShrink: 0,
                        }}
                    >
                        Not now
                    </button>
                    <button
                        type="button"
                        onClick={handleInstall}
                        disabled={busy}
                        style={{
                            background: '#0f172a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 10,
                            padding: '12px 18px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: busy ? 'wait' : 'pointer',
                            minHeight: 44,
                            flexShrink: 0,
                        }}
                    >
                        {busy ? '…' : 'Install'}
                    </button>
                </div>
            </div>

            <InstallInstructions
                open={showIosInstructions}
                onClose={() => setShowIosInstructions(false)}
                storeName={storeName}
            />
        </>
    );
}
