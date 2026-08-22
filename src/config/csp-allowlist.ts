/**
 * CSP (Content Security Policy) Allowlist Configuration
 * ═══════════════════════════════════════════════════════════════
 * 
 * Centralized place to manage all external URLs allowed in your app.
 * Add URLs here whenever you see CSP violation warnings in dev console.
 * 
 * HOW TO USE:
 * 1. See CSP violation in console (highlighted in RED)
 * 2. Copy the blocked URL
 * 3. Add it to the appropriate array below
 * 4. Restart dev server
 * 
 * OWASP A03: Injection Prevention via CSP
 */

export const CSP_ALLOWLIST = {
    /**
     * script-src: JavaScript sources
     * Add CDNs, analytics, tag managers, etc.
     */
    scriptSources: [
        'https://vercel.live',
        'https://*.google.com',
        'https://*.googletagmanager.com',
        'https://www.google.com/recaptcha/',
        'https://www.gstatic.com/recaptcha/',
        'https://cdnjs.cloudflare.com', // Animate.css and other libraries
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        'https://*.clarity.ms', // Microsoft Clarity analytics (scripts.clarity.ms + www.clarity.ms)
        'https://plausible.io', // Plausible Cloud website analytics
        'https://*.plausible.io', // Plausible site-specific script hosts
        // Add more script sources here as needed
    ],

    /**
     * style-src: CSS/Stylesheet sources
     * Add Google Fonts, CDN stylesheets, etc.
     */
    styleSources: [
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com', // Animate.css - now allowed
        // Add more style sources here as needed
    ],

    /**
     * font-src: Font file sources
     * Add Google Fonts, custom font CDNs, etc.
     */
    fontSources: [
        'https://fonts.gstatic.com',
        'data:', // For inline fonts
        // Add more font sources here as needed
    ],

    /**
     * img-src: Image sources
     * Usually kept permissive with 'https:' for flexibility
     */
    imageSources: [
        'data:',
        'https:', // Allow all HTTPS images
        'blob:', // For client-side image processing
        // Add specific sources if you want stricter control
    ],

    /**
     * connect-src: AJAX/Fetch/WebSocket sources
     * Add APIs, Firebase, WebSocket servers, etc.
     */
    connectSources: [
        'https://*.firebaseio.com',
        'https://*.googleapis.com',
        'https://*.google.com',
        'https://*.google-analytics.com',
        'https://*.analytics.google.com',
        'https://vercel.live',
        'wss://*.firebaseio.com', // Firebase Realtime Database WebSocket
        'https://*.upstash.io', // Upstash Redis for rate limiting
        'https://*.clarity.ms', // Microsoft Clarity analytics reporting
        'https://plausible.io', // Plausible Cloud event endpoint
        'https://*.plausible.io', // Plausible site-specific event endpoints
        'https://*.razorpay.com', // Razorpay payment processing API calls
        'https://us-central1-menulist-qa.cloudfunctions.net', // MenuList QA callable Cloud Functions
        'https://us-central1-menulist.cloudfunctions.net', // MenuList production callable Cloud Functions
        'https://us-central1-neelvara-answerlattice-qa.cloudfunctions.net', // Answerlattice QA callable Cloud Functions
        'https://us-central1-neelvara-answerlattice-prod.cloudfunctions.net', // Answerlattice production callable Cloud Functions
        'https://*.sentry.io', // Sentry client event transport
        'https://*.ingest.sentry.io', // Sentry ingest endpoints
        'https://*.ingest.us.sentry.io', // Sentry US region ingest endpoints
        // Add more API endpoints here as needed
    ],

    /**
     * frame-src: iframe sources
     * Add Google reCAPTCHA, embedded videos, etc.
     */
    frameSources: [
        'https://*.google.com',
        'https://apis.google.com',
        'https://www.google.com/recaptcha/',
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        'https://vercel.live',
        'https://menulist-qa.firebaseapp.com',
        'https://menulist.firebaseapp.com',
        'https://www.youtube.com',
        'https://www.youtube-nocookie.com',
    ],

    /**
     * media-src: Audio/Video sources
     * Add CDNs for media files
     */
    mediaSources: [
        // Add media sources here as needed
    ],

    /**
     * worker-src: Web Worker sources
     * Add CDNs for worker scripts (e.g., PDF.js workers)
     */
    workerSources: [
        'https://cdnjs.cloudflare.com', // PDF.js worker CDN
        'blob:', // For blob URLs created by PDF.js
        // Add more worker sources here as needed
    ],
} as const;

/**
 * Development-only settings
 * These are ONLY used in development mode
 */
export const CSP_DEV_SETTINGS = {
    /**
     * Local emulator connections must never be admitted to a production CSP.
     */
    connectSources: [
        'http://127.0.0.1:9099',
        'http://localhost:9099',
        'http://127.0.0.1:5001',
        'http://localhost:5001',
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:9199',
        'http://localhost:9199',
    ],

    /**
     * Allow 'unsafe-inline' for styles in dev
     * (Next.js dev mode needs this for CSS injection)
     */
    allowInlineStyles: true,

    /**
     * Allow 'unsafe-inline' and 'unsafe-eval' for scripts in dev
     * (Next.js Hot Module Replacement needs this)
     */
    allowInlineScripts: true,
    allowEval: true,

    /**
     * Show prominent console warnings for CSP violations
     * Helps you know when to add URLs to allowlist
     */
    showViolationWarnings: true,
} as const;

/**
 * Helper to build CSP directive from allowlist
 */
export function buildCSPDirective(
    directive: string,
    sources: readonly string[],
    options?: {
        allowSelf?: boolean;
        allowInline?: boolean;
        allowEval?: boolean;
    }
): string {
    const parts: string[] = [directive];

    if (options?.allowSelf !== false) {
        parts.push("'self'");
    }

    if (options?.allowInline) {
        parts.push("'unsafe-inline'");
    }

    if (options?.allowEval) {
        parts.push("'unsafe-eval'");
    }

    parts.push(...sources);

    return parts.join(' ');
}
