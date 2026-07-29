/**
 * Firebase App Check Configuration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Protects against:
 * - Bot attacks
 * - DDoS
 * - Automated scraping
 * - Unauthorized API access
 * 
 * OWASP A06: Protection against automated attacks
 */

import { FEATURE_FLAGS } from '@config/features';
import type { FirebaseApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { logFirebaseBootstrapFailure } from './firebaseDiagnostics';

const appCheckDebugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
let appCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

function isLocalOrPreviewHost(hostname: string): boolean {
    const normalizedHost = hostname.toLowerCase();

    if (
        normalizedHost === 'localhost' ||
        normalizedHost === '0.0.0.0' ||
        normalizedHost.endsWith('.local')
    ) {
        return true;
    }

    if (/^127(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^192\.168(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;
    if (/^10(?:\.\d{1,3}){3}$/.test(normalizedHost)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(normalizedHost)) return true;

    return false;
}

// Debug token for local development - opt-in only
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && appCheckDebugToken) {
    const debugWindow = window as Window & {
        FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string;
    };
    debugWindow.FIREBASE_APPCHECK_DEBUG_TOKEN =
        appCheckDebugToken === 'true' ? true : appCheckDebugToken;
}

/**
 * Initialize App Check with reCAPTCHA v3
 * 
 * Setup:
 * 1. Get reCAPTCHA v3 site key from https://www.google.com/recaptcha/admin
 * 2. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to .env.local
 * 3. Enable App Check in Firebase Console
 */
export function initAppCheck(firebaseApp: FirebaseApp | null) {
    if (typeof window === 'undefined') {
        // Server-side - skip App Check
        return null;
    }

    if (!firebaseApp) {
        return null;
    }

    if (appCheckInstance) {
        return appCheckInstance;
    }

    // Check feature flag first
    if (!FEATURE_FLAGS.ENABLE_APP_CHECK) {
        return null;
    }

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
        logFirebaseBootstrapFailure('app_check_site_key_missing', undefined, {
            hasDebugToken: Boolean(appCheckDebugToken),
            isLocalHost: isLocalOrPreviewHost(window.location.hostname),
        });
        return null;
    }

    const hostname = window.location.hostname;
    const hasDebugToken = Boolean(appCheckDebugToken);
    if (isLocalOrPreviewHost(hostname) && !hasDebugToken) {
        return null;
    }

    try {
        appCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),

            // Automatically refresh tokens before they expire
            isTokenAutoRefreshEnabled: true
        });

        return appCheckInstance;
    } catch (error) {
        logFirebaseBootstrapFailure('app_check_initialize_failed', error, {
            hasDebugToken,
            isLocalHost: isLocalOrPreviewHost(hostname),
        });
        return null;
    }
}

/**
 * Custom provider for testing (optional)
 * Use in development/staging to bypass reCAPTCHA
 */
export function initAppCheckWithCustomProvider(
    firebaseApp: FirebaseApp | null,
    getToken: () => Promise<{ token: string; expireTimeMillis: number }>
) {
    if (typeof window === 'undefined') return null;
    if (!firebaseApp) return null;
    if (appCheckInstance) return appCheckInstance;

    try {
        appCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new CustomProvider({ getToken }),
            isTokenAutoRefreshEnabled: true
        });

        return appCheckInstance;
    } catch (error) {
        logFirebaseBootstrapFailure('app_check_custom_provider_failed', error, {
            hasCustomProvider: true,
        });
        return null;
    }
}
