/**
 * Migration Script: Backfill Outlet Slugs
 *
 * T3-N-05 / G-12 PUBLIC-ROUTING-DOCTRINE: one-time backfill for outlet
 * stores created before `outletSlug` was enforced at outlet creation.
 * Post G-12, any outlet without an `outletSlug` is silently filtered from
 * `BrandOBPContent` and has no canonical URL. This script assigns a
 * deterministic slug (derived from the store name) to every such outlet.
 *
 * Scope:
 *   - Only non-master stores (isMaster !== true)
 *   - Skip stores that already have an outletSlug
 *   - Skip stores soft-deleted or inactive (active === false)
 *   - Reserve-slug + uniqueness-within-tenant checks (same rules as
 *     /api/outlets/create)
 *
 * Usage:
 *   npx ts-node scripts/backfill-outlet-slugs.ts --project-id menulist-qa --all-outlets
 *   npx ts-node scripts/backfill-outlet-slugs.ts --project-id menulist-qa --store-id 42 --write --confirm-project menulist-qa
 *
 * Idempotent: re-running after a successful apply is a no-op.
 *
 * Safety:
 *   - Dry-run by default.
 *   - Logs every intended write before executing.
 *   - Skips without writing when the derived slug would collide with an
 *     existing outletSlug in the same tenant (operator must resolve
 *     manually — likely rename the store first).
 *
 * @see src/app/api/outlets/create/route.ts — live outlet-slug rules
 * @see src/constants/reservedSlugs.ts — reserved outlet names
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

// Must stay in lock-step with src/constants/reservedSlugs.ts
// (copied inline — script runs standalone, not through Next.js path aliases).
const RESERVED_PROJECT_SLUGS = [
    'info', 'about', 'contact', 'reviews', 'photos', 'gallery',
    'offers', 'updates', 'order', 'book', 'events', 'jobs', 'careers',
    'screen', 'feedback', 'admin', 'api', 'settings', 'dashboard',
    'login', 'signup', 'auth', 'webhook', 'health', 'status',
    'sitemap', 'robots', 'manifest', 'sw', '_next', 'client',
    'customerapp', 'pwa', 'campaigncue',
];
const RESERVED_OUTLET_SLUGS = [
    ...RESERVED_PROJECT_SLUGS,
    'menu', 'locations', 'stores', 'outlets', 'branches', 'main',
];

const args = process.argv.slice(2);
const MAX_SLUG_LENGTH = 60;

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1] || null;
}

function getRequiredProjectId(): string {
    const projectId = getArg('--project-id') || process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID || process.env.MENULIST_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running the outlet-slug backfill.');
    }
    return projectId;
}

function resolveName(value: unknown): string {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const localized = value as Record<string, unknown>;
    for (const candidate of [localized.en, localized.en_US, localized.default, ...Object.values(localized)]) {
        if (typeof candidate === 'string' && candidate.trim()) return candidate;
    }
    return '';
}

export function slugifyOutletBackfillValue(text: unknown): string {
    const resolved = resolveName(text);
    if (!resolved) return '';
    return resolved
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function isReservedOutletSlug(slug: string): boolean {
    return RESERVED_OUTLET_SLUGS.includes(slug.toLowerCase());
}

export function deriveOutletBackfillSlug(name: unknown, fallback: string): string {
    let slug = slugifyOutletBackfillValue(name);
    if (!slug || slug.length < 2) slug = slugifyOutletBackfillValue(fallback);
    if (!slug) slug = 'outlet';
    if (isReservedOutletSlug(slug)) slug = `${slug}-outlet`;
    // Max 60 chars matches outlet rename endpoint validation
    return slug.slice(0, MAX_SLUG_LENGTH);
}

interface OutletDoc {
    ref: FirebaseFirestore.DocumentReference;
    storeId: string;
    tenantId: string;
    name?: unknown;
    existingSlug?: string;
    active?: boolean;
    isMaster?: boolean;
}

async function listOutletsNeedingBackfill(
    storesSnap: FirebaseFirestore.QuerySnapshot,
    targetStoreId: string | null,
): Promise<OutletDoc[]> {
    const out: OutletDoc[] = [];
    for (const doc of storesSnap.docs) {
        if (targetStoreId && doc.id !== targetStoreId) continue;
        const data = doc.data() || {};
        if (data.isMaster === true) continue;
        if (data.active === false) continue;
        if (data.outletSlug) continue; // already has a slug — skip
        if (!data.tenantId) continue;  // orphan — skip with warning below
        out.push({
            ref: doc.ref,
            storeId: doc.id,
            tenantId: String(data.tenantId),
            name: data.name,
            existingSlug: data.outletSlug,
            active: data.active,
            isMaster: data.isMaster,
        });
    }
    return out;
}

async function loadExistingSlugsByTenant(
    storesSnap: FirebaseFirestore.QuerySnapshot,
): Promise<Record<string, Set<string>>> {
    const byTenant: Record<string, Set<string>> = {};
    for (const doc of storesSnap.docs) {
        const data = doc.data() || {};
        const tenantId = data.tenantId ? String(data.tenantId) : null;
        const slug = data.outletSlug ? String(data.outletSlug).toLowerCase() : null;
        if (!tenantId || !slug) continue;
        if (!byTenant[tenantId]) byTenant[tenantId] = new Set();
        byTenant[tenantId].add(slug);
    }
    return byTenant;
}

export function resolveUniqueOutletBackfillSlug(
    baseSlug: string,
    tenantId: string,
    taken: Record<string, Set<string>>,
): string | null {
    const tenantTaken = taken[tenantId] || new Set<string>();
    if (!tenantTaken.has(baseSlug)) return baseSlug;
    for (let i = 2; i <= 20; i++) {
        const suffix = `-${i}`;
        const candidate = `${baseSlug.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
        if (!tenantTaken.has(candidate)) return candidate;
    }
    return null; // give up — operator will need to handle manually
}

async function backfill() {
    const projectId = getRequiredProjectId();
    const write = hasFlag('--write');
    const storeId = getArg('--store-id');
    const allOutlets = hasFlag('--all-outlets');
    if (storeId && allOutlets) throw new Error('Use either --store-id or --all-outlets, not both.');
    if (!storeId && !allOutlets) throw new Error('Pass --store-id or --all-outlets before running the outlet-slug backfill.');
    if (storeId && !/^[1-9]\d*$/.test(storeId)) throw new Error('--store-id must be a positive numeric document ID.');
    if (write && getArg('--confirm-project') !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId}.`);
    }
    if (!getApps().length) initializeApp({ projectId });
    const db = getFirestore();
    const storesSnap = await db.collection('stores').get();

    console.log('\n=== T3-N-05 Backfill Outlet Slugs ===');
    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'LIVE (writing to Firestore)' : 'DRY RUN (no writes)'}\n`);

    const candidates = await listOutletsNeedingBackfill(storesSnap, storeId);
    console.log(`Found ${candidates.length} outlet(s) missing outletSlug\n`);

    if (candidates.length === 0) {
        console.log('Nothing to do. ✅');
        return;
    }

    const taken = await loadExistingSlugsByTenant(storesSnap);

    let written = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const outlet of candidates) {
        const base = deriveOutletBackfillSlug(outlet.name || '', outlet.storeId);
        const resolved = resolveUniqueOutletBackfillSlug(base, outlet.tenantId, taken);

        if (!resolved) {
            failures.push(
                `  ✗ ${outlet.storeId} (${outlet.name || 'unnamed'}) — ` +
                `could not derive unique slug in tenant ${outlet.tenantId} (base="${base}")`,
            );
            skipped++;
            continue;
        }

        console.log(
            `  ${write ? '[WRITE]' : '[DRY]'} ${outlet.storeId} ` +
            `(${outlet.name || 'unnamed'}) → outletSlug="${resolved}" ` +
            `(tenant=${outlet.tenantId})`,
        );

        if (write) {
            await outlet.ref.set(
                {
                    outletSlug: resolved,
                    modifiedOn: FieldValue.serverTimestamp(),
                    outletSlugBackfilledAt: FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
        }
        // Reserve in both modes so dry-run exactly previews live allocation.
        if (!taken[outlet.tenantId]) taken[outlet.tenantId] = new Set();
        taken[outlet.tenantId].add(resolved);
        written++;
    }

    console.log(`\n=== Summary ===`);
    console.log(`Outlets processed:    ${candidates.length}`);
    console.log(`Slugs assigned:       ${written}`);
    console.log(`Skipped (conflict):   ${skipped}`);
    if (failures.length > 0) {
        console.log('\nUnresolved failures (operator action required):');
        failures.forEach((f) => console.log(f));
    }
    if (!write && written > 0) {
        console.log(
            `\nTo apply: rerun with --write --confirm-project ${projectId}.`,
        );
    }
}

if (require.main === module) {
    backfill()
        .catch((error) => {
            const message = error instanceof Error ? error.message.slice(0, 240) : 'Outlet-slug backfill failed.';
            console.error('outlet_slug_backfill_failed', message);
            process.exitCode = 1;
        });
}
