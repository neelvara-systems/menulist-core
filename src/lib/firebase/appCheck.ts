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

import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';
import { firebaseApp } from './firebaseClient';
import { FEATURE_FLAGS } from '@config/features';

// Debug token for local development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    // Enable debug mode for local testing
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    console.log('🔧 App Check: Debug mode enabled (development)');
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

    // Check feature flag first
    if (!FEATURE_FLAGS.ENABLE_APP_CHECK) {
        console.log('🔧 App Check: Disabled via feature flag (ENABLE_APP_CHECK = false)');
        console.log('💡 To enable: Set ENABLE_APP_CHECK = true in src/config/features.ts');
        return null;
    }

    const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    if (!recaptchaSiteKey) {
        console.warn('⚠️ App Check: NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set');
        console.warn('⚠️ App Check: Your Firebase resources are NOT protected from bots');
        console.warn('💡 Get site key from: https://www.google.com/recaptcha/admin');
        return null;
    }

    try {
        const appCheck = initializeAppCheck(firebaseApp, {
            provider: new ReCaptchaV3Provider(recaptchaSiteKey),
            
            // Automatically refresh tokens before they expire
            isTokenAutoRefreshEnabled: true
        });

        console.log('✅ App Check: Initialized with reCAPTCHA v3');
        return appCheck;
    } catch (error) {
        console.error('❌ App Check: Initialization failed', error);
        return null;
    }
}

/**
 * Custom provider for testing (optional)
 * Use in development/staging to bypass reCAPTCHA
 */
export function initAppCheckWithCustomProvider(getToken: () => Promise<{ token: string; expireTimeMillis: number }>) {
    if (typeof window === 'undefined') return null;

    try {
        const appCheck = initializeAppCheck(firebaseApp, {
            provider: new CustomProvider({ getToken }),
            isTokenAutoRefreshEnabled: true
        });

        console.log('✅ App Check: Initialized with custom provider');
        return appCheck;
    } catch (error) {
        console.error('❌ App Check: Custom provider failed', error);
        return null;
    }
}
