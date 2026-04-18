/**
 * useMenuFreshness
 * ═══════════════════════════════════════════════════════════════
 *
 * Keeps the customer-facing menu fresh **without** listeners, polling,
 * or new Firestore reads. Piggybacks on existing server infrastructure:
 *
 *   - `unstable_cache` wraps the menu project + store fetches
 *     (@see src/app/client/[[...slug]]/page.tsx)
 *   - `revalidateMenuCache(storeId)` invalidates the per-store tag
 *     every time an owner saves menu data
 *     (@see src/lib/actions/revalidateMenuCache.ts)
 *
 * Behavior:
 *   - When the customer's tab becomes visible AFTER being hidden
 *     for at least `minHiddenMs` (default 60s), we call
 *     `router.refresh()`.
 *   - When the network transitions from offline → online while the
 *     tab is visible, we also call `router.refresh()`.
 *   - `router.refresh()` re-runs the server component on the current
 *     route. If the per-store cache tag is still valid (no owner
 *     changes), Vercel's Edge Data Cache serves the cached result —
 *     ZERO Firestore reads. If the owner changed the menu and the
 *     tag was invalidated, exactly one fresh SSR runs (same read
 *     count as any normal first visit — not an incremental cost).
 *
 * What this hook does NOT do (by frozen policy):
 *   - No Firestore listeners
 *   - No periodic polling
 *   - No version-check endpoint
 *   - No update banner / forced reload UI
 *   - Client state (scroll position, open modals, selected language)
 *     is preserved because `router.refresh()` re-runs server
 *     components without a full page reload.
 *
 * Why this solves the sold-out flow:
 *   Owner marks an item unavailable → `revalidateMenuCache(storeId)`
 *   fires → edge cache invalidated. When the customer returns to the
 *   tab (even after hours), the next refresh pulls the fresh HTML and
 *   the availability flag flips.
 *
 * @see __docs__/customer-app/customer-app_spec.md § Menu Update Behavior
 */

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

export const CUSTOMER_MENU_REFRESH_EVENT = 'menulist:customer-menu-refresh';

export interface UseMenuFreshnessOptions {
    /**
     * Minimum number of milliseconds the tab must have been hidden
     * before a visibilitychange → visible will trigger a refresh.
     * Prevents refresh spam when users briefly switch tabs.
     * Default: 60_000 (60 seconds).
     */
    minHiddenMs?: number;
    /**
     * Global cooldown between consecutive refreshes, regardless of
     * trigger (visibility or network reconnect). Protects against
     * repeated `router.refresh()` calls when a user rapidly
     * app-switches (e.g. WhatsApp ↔ menu ↔ WhatsApp) or toggles
     * airplane mode. Default: 60_000 (60 seconds).
     */
    minRefreshIntervalMs?: number;
    /**
     * Whether to refresh when the network transitions offline → online.
     * Default: true.
     */
    refreshOnReconnect?: boolean;
    /**
     * When false, the hook becomes a no-op. Use this to gate behavior
     * behind feature flags or tenant eligibility.
     * Default: true.
     */
    enabled?: boolean;
}

export function useMenuFreshness(options: UseMenuFreshnessOptions = {}): void {
    const {
        minHiddenMs = 60_000,
        minRefreshIntervalMs = 60_000,
        refreshOnReconnect = true,
        enabled = true,
    } = options;

    const router = useRouter();
    const hiddenAtRef = useRef<number | null>(null);
    const lastRefreshAtRef = useRef<number>(0);

    useEffect(() => {
        if (!enabled) return;
        if (typeof document === 'undefined') return;

        // Debounced refresh — respects the global cooldown regardless of
        // which trigger fired. Prevents repeated refreshes when a user
        // rapidly app-switches (e.g. every few seconds between WhatsApp
        // and the menu). Cooldown starts from the LAST successful refresh.
        const triggerRefresh = () => {
            const now = Date.now();
            if (now - lastRefreshAtRef.current < minRefreshIntervalMs) {
                return; // suppressed by cooldown
            }
            lastRefreshAtRef.current = now;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(CUSTOMER_MENU_REFRESH_EVENT));
            }
            // router.refresh() re-runs server components for the current
            // route. Hits Vercel Edge Data Cache first (free if tag still
            // valid), only touches Firestore if owner actually changed
            // menu data and the tag was invalidated.
            router.refresh();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAtRef.current = Date.now();
                return;
            }
            if (document.visibilityState === 'visible') {
                const hiddenAt = hiddenAtRef.current;
                hiddenAtRef.current = null;
                if (hiddenAt === null) return;
                const hiddenFor = Date.now() - hiddenAt;
                if (hiddenFor >= minHiddenMs) {
                    triggerRefresh();
                }
            }
        };

        const onOnline = () => {
            if (!refreshOnReconnect) return;
            if (document.visibilityState !== 'visible') return;
            triggerRefresh();
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        if (refreshOnReconnect && typeof window !== 'undefined') {
            window.addEventListener('online', onOnline);
        }

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (refreshOnReconnect && typeof window !== 'undefined') {
                window.removeEventListener('online', onOnline);
            }
        };
    }, [router, minHiddenMs, minRefreshIntervalMs, refreshOnReconnect, enabled]);
}

export default useMenuFreshness;
