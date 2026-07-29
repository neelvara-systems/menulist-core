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
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';
import { trackEvent, TrackingEvent } from '@lib/analytics/unified';
import { getLuminance } from '@lib/colorEnforcement';
import type { BeforeInstallPromptEvent } from '@lib/pwa/installDetection';
import { getBoundedPwaStringContext, logPwaTrackingFailure } from '@lib/pwa/pwaDiagnostics';
import { recordPromptShown } from '@lib/pwa/installTracker';
import { detectPlatform } from '@lib/pwa/platformDetection';
import { APP_THEME_COLOR } from '@constant/common';
import {
    createPublicCustomerTranslator,
    getPublicCustomerLanguageDirection,
} from '@lib/localization/publicCustomerMessages';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import InstallInstructions from './InstallInstructions';

interface Props {
    activeLanguage?: string;
    storeId: string | number;
    tenantId: string | number;
    storeName: string;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    /** Deferred Chromium install prompt event captured by the controller. Null on iOS. */
    deferredPrompt: BeforeInstallPromptEvent | null;
    trackingEnabled: boolean;
    locationTrackingEnabled?: boolean;
    themeColor?: string;
    onDismiss: () => void;
    onInstallAccepted: () => void;
}

const normalizeThemeColor = (value?: string): string => {
    if (typeof value !== 'string') return APP_THEME_COLOR;

    const trimmed = value.trim();
    const isValidHex = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed);
    if (!isValidHex) return APP_THEME_COLOR;

    return trimmed;
};

const getSafeContrastColor = (background: string) => {
    const luminance = getLuminance(background);
    return luminance > 0.5 ? '#0f172a' : '#ffffff';
};

export default function InstallPrompt({
    activeLanguage,
    storeId,
    tenantId,
    storeName,
    storeTimeZone,
    businessDayEndTime,
    deferredPrompt,
    trackingEnabled,
    locationTrackingEnabled = true,
    themeColor,
    onDismiss,
    onInstallAccepted,
}: Props) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const languageDirection = getPublicCustomerLanguageDirection(activeLanguage);
    const platform = useMemo(() => detectPlatform(), []);
    const [showIosInstructions, setShowIosInstructions] = useState(false);
    const [busy, setBusy] = useState(false);
    const reportedPromptScopeRef = useRef<string | null>(null);
    const resolvedThemeColor = normalizeThemeColor(themeColor);
    const installTextColor = getSafeContrastColor(resolvedThemeColor);

    // Fire PROMPT_SHOWN exactly once when the banner mounts (trackEvent's built-in
    // debounce will swallow any accidental re-fire).
    // Also stamp localStorage — iOS install inference in standaloneDetector.ts
    // checks this timestamp to decide whether a later standalone launch
    // qualifies as a confirmed install.
    useEffect(() => {
        const promptScopeKey = getTenantStoreStorageKey(
            'customer-app-prompt-shown',
            tenantId,
            storeId,
        );
        if (!promptScopeKey || reportedPromptScopeRef.current === promptScopeKey) return;
        reportedPromptScopeRef.current = promptScopeKey;
        recordPromptShown(tenantId, storeId);
        if (trackingEnabled) {
            void trackEvent(TrackingEvent.CUSTOMER_APP_PROMPT_SHOWN, {
                storeId: String(storeId),
                tenantId,
                sessionId: getSessionId(),
                storeTimeZone,
                businessDayEndTime,
                includeLocation: locationTrackingEnabled,
            });
        }
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
                logPwaTrackingFailure('customer_app_native_install_prompt_failed', err, {
                    ...getBoundedPwaStringContext('storeId', storeId),
                    ...getBoundedPwaStringContext('tenantId', tenantId),
                    ...getBoundedPwaStringContext('pwaPlatform', platform.platform),
                    ...getBoundedPwaStringContext('pwaBrowser', platform.browser),
                    includeLocation: locationTrackingEnabled,
                    trackingEnabled,
                });
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
                aria-label={t('menu.installAppAria', { storeName })}
                dir={languageDirection}
                lang={activeLanguage}
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
                            background: resolvedThemeColor,
                            color: installTextColor,
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
                            {t('menu.installTitle', { storeName })}
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
                            {t('menu.oneTapHomeScreen')}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        aria-label={t('menu.dismissInstallPrompt')}
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
                        {t('menu.notNow')}
                    </button>
                    <button
                        type="button"
                        onClick={handleInstall}
                        disabled={busy}
                        style={{
                            color: installTextColor,
                            background: resolvedThemeColor,
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
                        {busy ? '…' : t('menu.install')}
                    </button>
                </div>
            </div>

            <InstallInstructions
                activeLanguage={activeLanguage}
                open={showIosInstructions}
                onClose={() => setShowIosInstructions(false)}
                storeName={storeName}
                themeColor={resolvedThemeColor}
                textColor={installTextColor}
            />
        </>
    );
}
