/**
 * PWA Entry Source Detection
 *
 * Customer App is one store-level installed app per tenant origin. This helper
 * only classifies the public route that initiated an install/open/shortcut
 * event so analytics can attribute entry context. It must never be used to
 * derive manifest identity.
 *
 * Classification (client-side, heuristic — the resolver owns the truth):
 *   - `/`             → 'obp'           (brand OBP root)
 *   - `/menu`         → 'menu-alias'    (Layer-2 universal alias)
 *   - `/{a}`          → 'project'       (single segment — canonical project URL)
 *   - `/{a}/menu`     → 'menu-alias'    (Layer-2 alias, outlet-scoped)
 *   - `/{a}/{b}`      → 'project'       (outlet + project canonical URL)
 *   - everything else → 'unknown'
 *
 * Rationale: we cannot distinguish outlet-OBP (`/{outletSlug}`) from a
 * project URL (`/{projectSlug}`) without a Firestore round-trip, and the
 * client wants to fire install analytics synchronously. The 'project' bucket
 * includes outlet-OBP clicks; this is accepted imprecision — multi-outlet
 * tenants can cross-reference against the outlet-OBP click analytics
 * (T2-N-02) to isolate outlet vs project installs.
 */

export type InstallSurface =
    | 'obp'
    | 'menu-alias'
    | 'project'
    | 'unknown';

/**
 * Classify the current pathname into a coarse install-surface bucket.
 *
 * @param pathname Path portion of the URL (no query, no hash). When omitted,
 *                 falls back to `window.location.pathname` — SSR-safe: returns
 *                 'unknown' outside the browser.
 */
export function detectInstallSurface(pathname?: string): InstallSurface {
    const path = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '');
    if (!path) return 'unknown';

    // Normalize: strip trailing slashes, collapse leading slashes.
    const cleaned = path.replace(/\/+$/, '') || '/';

    if (cleaned === '/') return 'obp';

    const segments = cleaned.split('/').filter(Boolean);
    if (segments.length === 0) return 'obp';

    // `/menu` — Layer 2 universal alias (R5 §9).
    if (segments.length === 1 && segments[0].toLowerCase() === 'menu') {
        return 'menu-alias';
    }

    // `/{outletSlug}/menu` — outlet-scoped Layer 2 alias.
    if (segments.length === 2 && segments[1].toLowerCase() === 'menu') {
        return 'menu-alias';
    }

    // `/{slug}` — either a canonical project URL or an outlet OBP. We can't
    // distinguish without server state; classify as 'project' conservatively
    // (installs from outlet OBPs are the less common path).
    if (segments.length === 1 || segments.length === 2) {
        return 'project';
    }

    return 'unknown';
}
