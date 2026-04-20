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
 *   DRY_RUN=true  npx ts-node scripts/backfill-outlet-slugs.ts   # default
 *   DRY_RUN=false npx ts-node scripts/backfill-outlet-slugs.ts   # apply
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

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

// Must stay in lock-step with src/constants/reservedSlugs.ts
// (copied inline — script runs standalone, not through Next.js path aliases).
const RESERVED_PROJECT_SLUGS = [
    'info', 'about', 'contact', 'reviews', 'photos', 'gallery',
    'offers', 'updates', 'order', 'book', 'events', 'jobs', 'careers',
    'screen', 'feedback', 'admin', 'api', 'settings', 'dashboard',
    'login', 'signup', 'auth', 'webhook', 'health', 'status',
    'sitemap', 'robots', 'manifest', 'sw', '_next', 'client',
    'customerapp', 'pwa',
];
const RESERVED_OUTLET_SLUGS = [
    ...RESERVED_PROJECT_SLUGS,
    'locations', 'stores', 'outlets', 'branches', 'main',
];

function slugify(text: string): string {
    if (!text) return '';
    return text
        .toString()
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

function deriveSlug(name: string, fallback: string): string {
    let slug = slugify(name);
    if (!slug || slug.length < 2) slug = slugify(fallback);
    if (!slug) slug = 'outlet';
    if (isReservedOutletSlug(slug)) slug = `${slug}-outlet`;
    // Max 60 chars matches outlet rename endpoint validation
    return slug.slice(0, 60);
}

const DRY_RUN = process.env.DRY_RUN !== 'false';

interface OutletDoc {
    ref: admin.firestore.DocumentReference;
    storeId: string;
    tenantId: string;
    name?: string;
    existingSlug?: string;
    active?: boolean;
    isMaster?: boolean;
}

async function listOutletsNeedingBackfill(): Promise<OutletDoc[]> {
    const storesSnap = await db.collection('stores').get();
    const out: OutletDoc[] = [];
    for (const doc of storesSnap.docs) {
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

async function loadExistingSlugsByTenant(): Promise<Record<string, Set<string>>> {
    const storesSnap = await db.collection('stores').get();
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

function resolveUniqueSlug(
    baseSlug: string,
    tenantId: string,
    taken: Record<string, Set<string>>,
): string | null {
    const tenantTaken = taken[tenantId] || new Set<string>();
    if (!tenantTaken.has(baseSlug)) return baseSlug;
    for (let i = 2; i <= 20; i++) {
        const candidate = `${baseSlug}-${i}`.slice(0, 60);
        if (!tenantTaken.has(candidate)) return candidate;
    }
    return null; // give up — operator will need to handle manually
}

async function backfill() {
    console.log('\n=== T3-N-05 Backfill Outlet Slugs ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (writing to Firestore)'}\n`);

    const candidates = await listOutletsNeedingBackfill();
    console.log(`Found ${candidates.length} outlet(s) missing outletSlug\n`);

    if (candidates.length === 0) {
        console.log('Nothing to do. ✅');
        return;
    }

    const taken = await loadExistingSlugsByTenant();

    let written = 0;
    let skipped = 0;
    const failures: string[] = [];

    for (const outlet of candidates) {
        const base = deriveSlug(outlet.name || '', outlet.storeId);
        const resolved = resolveUniqueSlug(base, outlet.tenantId, taken);

        if (!resolved) {
            failures.push(
                `  ✗ ${outlet.storeId} (${outlet.name || 'unnamed'}) — ` +
                `could not derive unique slug in tenant ${outlet.tenantId} (base="${base}")`,
            );
            skipped++;
            continue;
        }

        console.log(
            `  ${DRY_RUN ? '[DRY]' : '[WRITE]'} ${outlet.storeId} ` +
            `(${outlet.name || 'unnamed'}) → outletSlug="${resolved}" ` +
            `(tenant=${outlet.tenantId})`,
        );

        if (!DRY_RUN) {
            await outlet.ref.set(
                {
                    outletSlug: resolved,
                    modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
                    outletSlugBackfilledAt: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true },
            );
            // Reserve the slug locally so the next candidate doesn't pick it
            if (!taken[outlet.tenantId]) taken[outlet.tenantId] = new Set();
            taken[outlet.tenantId].add(resolved);
        }
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
    if (DRY_RUN && written > 0) {
        console.log(
            '\nTo apply: DRY_RUN=false npx ts-node scripts/backfill-outlet-slugs.ts',
        );
    }
}

backfill()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
