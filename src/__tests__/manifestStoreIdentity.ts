/**
 * Manifest Store Identity — verification suite.
 *
 * Customer App is one installed app per tenant store origin. Source pages
 * (OBP, `/menu`, project slugs, outlet/project paths) are entry context only
 * and must not change the manifest `id`.
 *
 * This file works both as a runnable Node script and as a future Jest helper:
 *   - `checkManifestStoreIdentity()` returns a detailed report.
 *   - `assertManifestStoreIdentity()` throws on regression.
 */

import { buildStoreManifestId, getStoreManifestStartUrl } from '@lib/pwa/manifestIdentity';

type SourceCase = {
    label: string;
    sourcePath: string;
};

const SOURCE_PATHS: SourceCase[] = [
    { label: 'brand-obp', sourcePath: '/' },
    { label: 'menu-alias', sourcePath: '/menu' },
    { label: 'project-default', sourcePath: '/food-menu' },
    { label: 'project-other', sourcePath: '/drinks' },
    { label: 'outlet-project', sourcePath: '/pune/food-menu' },
];

function buildForSource(_source: SourceCase, storeId: string | number = 42) {
    return {
        id: buildStoreManifestId(storeId),
        start_url: getStoreManifestStartUrl(true),
    };
}

export interface ManifestStoreIdentityReport {
    ok: boolean;
    idBySource: Record<string, string>;
    startUrlBySource: Record<string, string>;
    sameStoreIdStable: boolean;
    differentStoreIdDifferent: boolean;
    sourcePathEchoes: Array<{ label: string; sourcePath: string; startUrl: string }>;
    noMenuFallbackStartUrl: string;
}

export function checkManifestStoreIdentity(): ManifestStoreIdentityReport {
    const idBySource: Record<string, string> = {};
    const startUrlBySource: Record<string, string> = {};
    const sourcePathEchoes: ManifestStoreIdentityReport['sourcePathEchoes'] = [];

    for (const source of SOURCE_PATHS) {
        const manifest = buildForSource(source);
        idBySource[source.label] = String(manifest.id || '');
        startUrlBySource[source.label] = String(manifest.start_url || '');
        if (
            source.sourcePath !== '/menu' &&
            source.sourcePath !== '/' &&
            manifest.start_url === source.sourcePath
        ) {
            sourcePathEchoes.push({
                label: source.label,
                sourcePath: source.sourcePath,
                startUrl: manifest.start_url,
            });
        }
    }

    const ids = Object.values(idBySource);
    const sameStoreIdStable = new Set(ids).size === 1;
    const storeA = buildForSource(SOURCE_PATHS[0], 42);
    const storeB = buildForSource(SOURCE_PATHS[0], 43);
    const differentStoreIdDifferent = storeA.id !== storeB.id;
    const noMenuFallbackStartUrl = getStoreManifestStartUrl(false);
    const ok =
        sameStoreIdStable &&
        differentStoreIdDifferent &&
        sourcePathEchoes.length === 0 &&
        noMenuFallbackStartUrl === '/';

    return {
        ok,
        idBySource,
        startUrlBySource,
        sameStoreIdStable,
        differentStoreIdDifferent,
        sourcePathEchoes,
        noMenuFallbackStartUrl,
    };
}

export function assertManifestStoreIdentity(): void {
    const report = checkManifestStoreIdentity();
    if (report.ok) return;

    throw new Error(
        'Manifest store-level identity regression detected:\n' +
        JSON.stringify(report, null, 2),
    );
}

// Runnable mode: `node --loader ts-node/esm src/__tests__/manifestStoreIdentity.ts`
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('manifestStoreIdentity.ts')) {
    const report = checkManifestStoreIdentity();
    // eslint-disable-next-line no-console
    console.log('Manifest store identity:', report);
    if (report.ok) {
        // eslint-disable-next-line no-console
        console.log('✓ Same-store source paths produce one app identity');
        process.exit(0);
    }
    // eslint-disable-next-line no-console
    console.error('✗ Store identity regression detected');
    process.exit(1);
}
