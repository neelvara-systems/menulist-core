/**
 * Answerlattice App Check configuration for the dedicated Firebase app.
 *
 * MenuList keeps its existing default-app App Check integration. Answerlattice
 * uses a separate reCAPTCHA v3 credential so both products can coexist in the
 * shared Vercel project without sharing an attestation identity.
 */

import { FEATURE_FLAGS } from '@config/features';
import type { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { logFirebaseBootstrapFailure } from './firebaseDiagnostics';

let answerlatticeAppCheckInstance: ReturnType<typeof initializeAppCheck> | null = null;

const isLocalAnswerlatticeAppCheckHost = (hostname: string): boolean => {
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
};

export const initAnswerlatticeAppCheck = (firebaseApp: FirebaseApp | null) => {
    if (typeof window === 'undefined' || !firebaseApp) return null;
    if (answerlatticeAppCheckInstance) return answerlatticeAppCheckInstance;
    if (!FEATURE_FLAGS.ENABLE_APP_CHECK) return null;

    const siteKey = process.env.NEXT_PUBLIC_ANSWERLATTICE_RECAPTCHA_SITE_KEY;
    const hostname = window.location.hostname;

    if (!siteKey) {
        logFirebaseBootstrapFailure('answerlattice_app_check_site_key_missing', undefined, {
            isLocalHost: isLocalAnswerlatticeAppCheckHost(hostname),
            product: 'answerlattice',
        });
        return null;
    }

    if (isLocalAnswerlatticeAppCheckHost(hostname)) return null;

    try {
        answerlatticeAppCheckInstance = initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(siteKey),
            isTokenAutoRefreshEnabled: true,
        });
        return answerlatticeAppCheckInstance;
    } catch (error) {
        logFirebaseBootstrapFailure('answerlattice_app_check_initialize_failed', error, {
            isLocalHost: isLocalAnswerlatticeAppCheckHost(hostname),
            product: 'answerlattice',
        });
        return null;
    }
};
