/**
 * Manifest ID Differentiation — verification suite.
 *
 * T2-N-06 / A-06 PUBLIC-ROUTING-DOCTRINE: the PWA `id` field must be
 * UNIQUE per install surface. If two surfaces share `id`, Chrome treats
 * them as the same installable app and the second install silently
 * replaces the first — violating the install_context = launch_context
 * invariant (D-10) and breaking multi-surface installs for the same
 * brand (A-06).
 *
 * This file is structured to work BOTH as a runnable Node script and as
 * a Jest spec (if a test runner is added later):
 *   - Exported pure `assertManifestIdDifferentiation()` throws on failure.
 *   - Bottom `if (require.main === module)` executes the check with a
 *     human-readable pass/fail report when run via `ts-node` or similar.
 *
 * Scenarios covered (same store, same brand — different surfaces):
 *   1. Brand OBP         — `start=/`
 *   2. Outlet OBP        — `start=/{outletSlug}`
 *   3. Project (default) — `start=/{defaultSlug}`
 *   4. Project (other)   — `start=/{otherSlug}`
 *   5. Outlet + Project  — `start=/{outletSlug}/{slug}`
 *
 * Every pair must produce a DIFFERENT manifest `id`. The current
 * implementation encodes `start_url` inside the id; this spec is the
 * regression guard against someone stripping that encoding.
 *
 * @see __docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md §D-10, §A-06
 * @see src/lib/pwa/manifestGenerator.ts — authoritative implementation
 */

import { buildManifest } from '@lib/pwa/manifestGenerator';

type SurfaceCase = {
    label: string;
    startUrl: string;
};

const SURFACES: SurfaceCase[] = [
    { label: 'brand-obp', startUrl: '/' },
    { label: 'outlet-obp', startUrl: '/pune' },
    { label: 'project-default', startUrl: '/food-menu' },
    { label: 'project-other', startUrl: '/drinks' },
    { label: 'outlet-project', startUrl: '/pune/food-menu' },
];

function buildForSurface(surface: SurfaceCase) {
    return buildManifest({
        id: 42,
        displayName: 'Joe\'s Pizza',
        shortName: 'JoesPizza',
        startUrl: surface.startUrl,
        themeColor: '#111',
        backgroundColor: '#fff',
    });
}

export interface ManifestIdReport {
    ok: boolean;
    /** Per-surface computed manifest IDs. */
    idsBySurface: Record<string, string>;
    /** Pairs that share an id (empty when all are unique). */
    collisions: Array<{ a: string; b: string; id: string }>;
}

/**
 * Compute the manifest id for each surface and return a detailed report.
 * Pure — no side effects; safe to call from anywhere.
 */
export function checkManifestIdDifferentiation(): ManifestIdReport {
    const idsBySurface: Record<string, string> = {};
    for (const surface of SURFACES) {
        const manifest = buildForSurface(surface);
        idsBySurface[surface.label] = String(manifest.id || '');
    }

    const collisions: ManifestIdReport['collisions'] = [];
    const seen: Record<string, string> = {};
    for (const [label, id] of Object.entries(idsBySurface)) {
        if (seen[id]) {
            collisions.push({ a: seen[id], b: label, id });
        } else {
            seen[id] = label;
        }
    }

    return { ok: collisions.length === 0, idsBySurface, collisions };
}

/**
 * Throw on any manifest-id collision between the surface matrix above.
 * Callers that want a typed assertion instead of a full report can use this.
 */
export function assertManifestIdDifferentiation(): void {
    const report = checkManifestIdDifferentiation();
    if (report.ok) return;

    const lines = report.collisions
        .map((c) => `  ${c.a}  <collides with>  ${c.b}  (id=${c.id})`)
        .join('\n');
    throw new Error(
        'Manifest `id` collision detected — D-10 install-context invariant broken:\n' +
            lines,
    );
}

// Runnable mode: `npx ts-node src/__tests__/manifestIdDifferentiation.ts`
if (typeof require !== 'undefined' && require.main === module) {
    const report = checkManifestIdDifferentiation();
    // eslint-disable-next-line no-console
    console.log('Manifest IDs:', report.idsBySurface);
    if (report.ok) {
        // eslint-disable-next-line no-console
        console.log('✓ All surfaces produce distinct manifest IDs');
        process.exit(0);
    }
    // eslint-disable-next-line no-console
    console.error('✗ Collisions detected:', report.collisions);
    process.exit(1);
}
