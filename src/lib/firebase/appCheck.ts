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
import { CustomProvider, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { firebaseApp } from './firebaseClient';

const appCheckDebugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
const APP_CHECK_BADGE = 'background: #14532d; color: #bbf7d0; padding: 2px 6px; border-radius: 999px; font-weight: 700;';
const APP_CHECK_INFO = 'color: #15803d; font-weight: 700;';
const APP_CHECK_WARN = 'color: #d97706; font-weight: 700;';
const APP_CHECK_ERROR = 'color: #dc2626; font-weight: 700;';
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
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN =
        appCheckDebugToken === 'true' ? true : appCheckDebugToken;
    console.log(`%c🛡️ App Check%c debug mode enabled`, APP_CHECK_BADGE, APP_CHECK_INFO);
}

/**
 * Initialize App Check with reCAPTCHA v3
 * 
 * Setup:
 * 1. Get reCAPTCHA v3 site key from https://www.google.com/recaptcha/admin
 * 2. Add NEXT_PUBLIC_RECAPTCHA_SITE_KEY to .env.local
 * 3. Enable App Check in Firebase Console
 */
export function initAppCheck() {
    if (typeof window === 'undefined') {
        // Server-side - skip App Check
        return null;
    }

    if (appCheckInstance) {
        return appCheckInstance;
    }

    // Check feature flag first
    if (!FEATURE_FLAGS.ENABLE_APP_CHECK) {
        console.log(`%c🛡️ App Check%c disabled via feature flag`, APP_CHECK_BADGE, APP_CHECK_WARN);
        return null;
    }

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
        console.warn(`%c🛡️ App Check%c site key missing`, APP_CHECK_BADGE, APP_CHECK_WARN);
        return null;
    }

    const hostname = window.location.hostname;
    const hasDebugToken = Boolean(appCheckDebugToken);
    if (isLocalOrPreviewHost(hostname) && !hasDebugToken) {
        console.warn(`%c🛡️ App Check%c skipped on ${hostname}. Use a debug token locally or on preview environments.`, APP_CHECK_BADGE, APP_CHECK_WARN);
        return null;
    }

    try {
        appCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),

            // Automatically refresh tokens before they expire
            isTokenAutoRefreshEnabled: true
        });

        console.log(`%c🛡️ App Check%c initialized with reCAPTCHA v3`, APP_CHECK_BADGE, APP_CHECK_INFO);
        return appCheckInstance;
    } catch (error) {
        console.error(`%c🛡️ App Check%c initialization failed`, APP_CHECK_BADGE, APP_CHECK_ERROR, error);
        return null;
    }
}

/**
 * Custom provider for testing (optional)
 * Use in development/staging to bypass reCAPTCHA
 */
export function initAppCheckWithCustomProvider(getToken: () => Promise<{ token: string; expireTimeMillis: number }>) {
    if (typeof window === 'undefined') return null;
    if (appCheckInstance) return appCheckInstance;

    try {
        appCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new CustomProvider({ getToken }),
            isTokenAutoRefreshEnabled: true
        });

        console.log(`%c🛡️ App Check%c initialized with custom provider`, APP_CHECK_BADGE, APP_CHECK_INFO);
        return appCheckInstance;
    } catch (error) {
        console.error(`%c🛡️ App Check%c custom provider failed`, APP_CHECK_BADGE, APP_CHECK_ERROR, error);
        return null;
    }
}
