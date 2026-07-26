/**
 * Screen Utility Functions
 * Per impl.md: Screen token generation and helpers
 */

import { Timestamp } from "@firebase/firestore";
import { normalizeBaseUrl, getPublicBaseUrl } from "@constant/urls";
import { DigitalScreenState, ScreenSlide } from "@type/campaigns";
import { getBoundedScreenStringContext, logScreenDisplayFailure } from "./screenDiagnostics";
import { isScreenExpiryValueExpired } from "./screenTimestamp";

/**
 * Generate high-entropy screen token for URL security
 * Per ChatGPT review v3: 8-char tokens (~32-bit) are vulnerable to enumeration.
 * Now generates 22-char tokens (~130-bit entropy) using two UUIDs.
 * Format: URL-safe alphanumeric, no dashes.
 */
export function generateScreenToken(): string {
    // Combine two UUIDs and strip dashes for ~130-bit entropy in 22 chars
    const raw = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '');
    return raw.substring(0, 22);
}

/**
 * Create initial screen state for a store
 * Called on first access to enable Digital Screen
 */
export function createInitialScreenState(): DigitalScreenState {
    const now = Timestamp.now();
    return {
        enabled: true,
        screenToken: generateScreenToken(),
        lastRefreshed: now,
        contentVersion: 1,
        lastContentChangeAt: now,
        currentMinConfidence: 0,
        ownerOverrideEnabled: false,
        pinnedSlides: []
    };
}

/** Calculate owner-upload expiry from the shared feature contract. */
export function getOwnerUploadExpiry(expiryDays: number): Timestamp {
    const normalizedExpiryDays = Number.isFinite(expiryDays)
        ? Math.max(1, Math.floor(expiryDays))
        : 1;
    return Timestamp.fromMillis(Date.now() + normalizedExpiryDays * 24 * 60 * 60 * 1000);
}

/**
 * Check if a slide is expired
 */
export function isSlideExpired(slide: ScreenSlide): boolean {
    return isScreenExpiryValueExpired(slide.validUntil);
}

/**
 * Filter out expired slides
 */
export function filterExpiredSlides(slides: ScreenSlide[]): ScreenSlide[] {
    return slides.filter(slide => !isSlideExpired(slide));
}

/** Keep only currently usable slides within the configured owner-upload cap. */
export function getActiveScreenSlides(slides: ScreenSlide[], maxUploads: number): ScreenSlide[] {
    const normalizedMaxUploads = Number.isFinite(maxUploads)
        ? Math.max(0, Math.floor(maxUploads))
        : 0;
    return filterExpiredSlides(slides).slice(0, normalizedMaxUploads);
}

/**
 * Screen URL builder
 */
export function buildScreenUrl(token: string, baseUrlOverride?: string): string {
    const baseUrl = normalizeBaseUrl(baseUrlOverride) || getPublicBaseUrl();
    return `${baseUrl}/screen/${token}`;
}

/**
 * Validate screen token format
 * Accepts both legacy 8-char tokens and new 22-char tokens
 */
export function isValidScreenToken(token: string): boolean {
    return /^[a-z0-9]{6,24}$/i.test(token);
}

// HARDENING: Reload guard — prevents rapid consecutive reloads from multiple triggers
// (onSnapshot + 6hr timer + 30min offline can all fire close together)
const RELOAD_GUARD_MS = 30000; // Minimum 30s between reloads

/**
 * Guarded page reload for screen components
 * Throttles reloads to prevent rapid consecutive refreshes from multiple triggers
 * @param componentName - Unique name for localStorage key scoping (e.g. 'screen', 'menuboard')
 */
export function guardedReload(componentName: string): void {
    const guardKey = `menulist-${componentName}-last-reload`;
    try {
        const lastReload = parseInt(localStorage.getItem(guardKey) || '0', 10);
        if (Date.now() - lastReload < RELOAD_GUARD_MS) {
            return;
        }
        localStorage.setItem(guardKey, String(Date.now()));
    } catch (error) {
        logScreenDisplayFailure("screen_guarded_reload_storage_failed", error, {
            ...getBoundedScreenStringContext("componentName", componentName),
            reloadGuardMs: RELOAD_GUARD_MS,
        });
    }
    window.location.reload();
}

/**
 * Guarded reload with random jitter delay (0–60s)
 * Per ChatGPT review v3: When contentVersion changes, thousands of screens may reload
 * simultaneously causing SSR/Firestore spikes. Random jitter smooths the load.
 * Used for content-version-triggered reloads only (not 6-hour health refreshes).
 */
export function guardedReloadWithJitter(componentName: string): void {
    const jitterMs = Math.floor(Math.random() * 60000); // 0-60 seconds
    setTimeout(() => guardedReload(componentName), jitterMs);
}
