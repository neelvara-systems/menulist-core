/**
 * Screen Renderer - Client-side rotation logic
 * Per impl.md: Frontend-first, simple sequential loop is sufficient
 * Per spec: 8 seconds per slide, auto-refresh every 5 minutes
 */

import { ScreenAPIResponse, ScreenSlide, ScreenStoreInfo } from "@type/campaigns";

/**
 * Screen configuration constants
 * Per spec: FR-1 - Screen displays rotating slides (6-10 seconds each)
 */
export const SCREEN_CONFIG = {
    SLIDE_DURATION_MS: 8000,      // 8 seconds per slide
    REFRESH_INTERVAL_MS: 300000,  // 5 minutes
    TRANSITION_DURATION_MS: 500,  // Fade transition
    MIN_SLIDES: 3,
    MAX_SLIDES: 8
};

/**
 * Screen state for client-side rendering
 */
export interface ScreenRendererState {
    slides: ScreenSlide[];
    currentIndex: number;
    isLoading: boolean;
    isOffline: boolean;
    lastRefresh: number;
    contentVersion: number;
    storeInfo: ScreenStoreInfo | null;
    error: string | null;
}

/**
 * Create initial renderer state
 */
export function createInitialState(): ScreenRendererState {
    return {
        slides: [],
        currentIndex: 0,
        isLoading: true,
        isOffline: false,
        lastRefresh: 0,
        contentVersion: 0,
        storeInfo: null,
        error: null
    };
}

/**
 * Get next slide index (simple sequential loop)
 * Per impl.md: Frontend-first, simple sequential loop is sufficient
 */
export function getNextSlideIndex(currentIndex: number, totalSlides: number): number {
    if (totalSlides === 0) return 0;
    return (currentIndex + 1) % totalSlides;
}

/**
 * Check if data refresh is needed
 */
export function shouldRefresh(lastRefresh: number): boolean {
    return Date.now() - lastRefresh >= SCREEN_CONFIG.REFRESH_INTERVAL_MS;
}

/**
 * Check if content version changed (for invalidation)
 * Per spec: Event-based invalidation - when availability/menu changes, force refresh
 */
export function hasContentVersionChanged(
    currentVersion: number,
    newVersion: number
): boolean {
    return newVersion > currentVersion;
}

/**
 * Parse API response into renderer state
 */
export function parseAPIResponse(
    response: ScreenAPIResponse,
    previousState: ScreenRendererState
): Partial<ScreenRendererState> {
    return {
        slides: response.slides,
        storeInfo: response.storeInfo,
        contentVersion: response.contentVersion,
        lastRefresh: Date.now(),
        isLoading: false,
        isOffline: false,
        error: null,
        // Reset index if slides changed significantly
        currentIndex: slidesChanged(previousState.slides, response.slides)
            ? 0
            : previousState.currentIndex
    };
}

/**
 * Check if slides array changed (for index reset)
 */
function slidesChanged(oldSlides: ScreenSlide[], newSlides: ScreenSlide[]): boolean {
    if (oldSlides.length !== newSlides.length) return true;

    const oldIds = oldSlides.map(s => s.id).sort().join(',');
    const newIds = newSlides.map(s => s.id).sort().join(',');

    return oldIds !== newIds;
}

/**
 * Get slide label for display
 * Per spec: Labels like "Today", "Popular", "Always shown", "Your upload"
 */
export function getSlideLabel(slide: ScreenSlide): string {
    switch (slide.source) {
        case "pinned":
            return "Your Upload";
        case "campaign":
            return slide.caption || "Today";
        case "evergreen":
            if (slide.type === "brand_fallback") {
                return ""; // No label for brand
            }
            return slide.caption || "Always Available";
        default:
            return "";
    }
}

/**
 * Calculate progress for slide indicator
 */
export function calculateSlideProgress(
    elapsedMs: number,
    durationMs: number = SCREEN_CONFIG.SLIDE_DURATION_MS
): number {
    return Math.min(elapsedMs / durationMs, 1);
}
