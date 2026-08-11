/**
 * Backfill denormalized tenant block state onto store docs.
 *
 * Runtime platform tenant block/unblock now mirrors inherited `tenantBlocked`
 * state onto `stores/{storeId}` so public store lookup can avoid a tenant-doc
 * read after the store has been synced. This script fills that mirror for
 * legacy stores.
 *
 * Dry-run by default; pass `--write` to mutate Firestore.
 * A Firebase project is required for dry-run and write modes. Write mode also
 * requires `--confirm-project <projectId>` so a stale shell environment cannot
 * silently target the wrong project.
 *
 * Usage:
 *   FIREBASE_PROJECT_ID=menulist-qa npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --tenant-id 17
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --tenant-id 17 --write --confirm-project menulist-qa
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --store-id 42 --write --confirm-project menulist-qa
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-store-tenant-block-state.ts --project-id menulist-qa --all-stores --write --confirm-project menulist-qa
 */

import { getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../src/constants/database';

const args = process.argv.slice(2);
const WRITE_BATCH_LIMIT = 450;
const MAX_READ_LIMIT = 1_500;
const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;

function hasFlag(name: string): boolean {
    return args.includes(name);
}

function getArg(name: string): string | null {
    const index = args.indexOf(name);
    if (index === -1) return null;
    return args[index + 1] || null;
}

function getRequiredProjectId(): string {
    const projectId = getArg('--project-id') || process.env.NEXT_PUBLIC_MENULIST_FIREBASE_PROJECT_ID || process.env.MENULIST_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running tenant-block backfill.');
    }
    return projectId;
}

function normalizePositiveNumericDocumentId(value: unknown): { documentId: string; numericId: number } | null {
    const documentId = typeof value === 'number' ? String(value) : value;
    if (typeof documentId !== 'string' || !/^[1-9]\d*$/.test(documentId)) return null;
    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
}

function normalizePositiveNumericDocumentIdAliases(
    values: readonly unknown[],
): { documentId: string; numericId: number } | null {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;
    const normalized = supplied.map(normalizePositiveNumericDocumentId);
    const [first] = normalized;
    return first && normalized.every((identity) => identity?.documentId === first.documentId)
        ? first
        : null;
}

export function resolveTenantBlockBackfillStoreIdentity(
    documentId: unknown,
    store: Record<string, unknown>,
): { storeId: string; tenantId: string } | null {
    const storeIdentity = normalizePositiveNumericDocumentId(documentId);
    if (!storeIdentity) return null;

    const embeddedStoreValues = [store.storeId, store.sId]
        .filter((value) => value !== undefined && value !== null);
    const embeddedStoreIdentity = embeddedStoreValues.length === 0
        ? storeIdentity
        : normalizePositiveNumericDocumentIdAliases(embeddedStoreValues);
    const tenantIdentity = normalizePositiveNumericDocumentIdAliases([
        store.tenantId,
        store.tId,
    ]);
    return embeddedStoreIdentity?.documentId === storeIdentity.documentId && tenantIdentity
        ? { storeId: storeIdentity.documentId, tenantId: tenantIdentity.documentId }
        : null;
}

let db: FirebaseFirestore.Firestore;

function initializeFirestore(projectId: string): FirebaseFirestore.Firestore {
    if (!getApps().length) initializeApp({ projectId });
    return getFirestore();
}

function getTenantStoreQueryValues(tenantId: string): Array<string | number> {
    const normalized = normalizePositiveNumericDocumentId(tenantId);
    if (!normalized) throw new Error('--tenant-id must be an exact positive numeric document ID.');
    return [normalized.numericId, normalized.documentId];
}

export function isTenantBlockBackfillBlocked(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const blockDetails = record.blockDetails;
    return record.blocked === true
        || record.tenantBlocked === true
        || (
            blockDetails != null
            && typeof blockDetails === 'object'
            && !Array.isArray(blockDetails)
            && (blockDetails as Record<string, unknown>).blocked === true
        );
}

function getBoundedErrorString(value: unknown, maxLength = 180): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function getBackfillErrorSummary(error: unknown) {
    const source = error && typeof error === 'object'
        ? error as Record<string, unknown>
        : {};
    return {
        code: typeof source.code === 'number' || typeof source.code === 'string' ? source.code : null,
        domain: getBoundedErrorString(source.domain),
        reason: getBoundedErrorString(source.reason),
        message: getBoundedErrorString(source.message),
        details: getBoundedErrorString(source.details),
        errorName: getBoundedErrorString(source.name),
    };
}

async function loadStoreDocs(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const storeId = getArg('--store-id');
    if (storeId) {
        const normalizedStoreId = normalizePositiveNumericDocumentId(storeId);
        if (!normalizedStoreId) throw new Error('--store-id must be an exact positive numeric document ID.');
        const snap = await db.collection(DB_COLLECTIONS.STORES).doc(normalizedStoreId.documentId).get();
        return snap.exists ? [snap as FirebaseFirestore.QueryDocumentSnapshot] : [];
    }

    const tenantId = getArg('--tenant-id');
    const limitArg = getArg('--limit');
    const limit = limitArg ? Number(limitArg) : null;
    if (
        limitArg
        && (!Number.isSafeInteger(limit) || limit == null || limit <= 0 || limit > MAX_READ_LIMIT)
    ) {
        throw new Error(`--limit must be a positive integer no greater than ${MAX_READ_LIMIT}.`);
    }

    if (tenantId) {
        const storeDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        for (const tenantQueryValue of getTenantStoreQueryValues(tenantId)) {
            for (const field of TENANT_STORE_SCOPE_FIELDS) {
                let query: FirebaseFirestore.Query = db
                    .collection(DB_COLLECTIONS.STORES)
                    .where(field, '==', tenantQueryValue);
                if (limit) query = query.limit(limit);
                const snap = await query.get();
                snap.docs.forEach((doc) => storeDocs.set(doc.id, doc));
            }
        }
        return Array.from(storeDocs.values());
    }

    let query: FirebaseFirestore.Query = db.collection(DB_COLLECTIONS.STORES);
    if (limit) query = query.limit(limit);
    const snap = await query.get();
    return snap.docs;
}

async function getTenantData(
    tenantCache: Map<string, Record<string, unknown> | null>,
    tenantId: string,
): Promise<Record<string, unknown> | null> {
    if (tenantCache.has(tenantId)) return tenantCache.get(tenantId) || null;

    const snap = await db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId).get();
    const data = snap.exists ? (snap.data() || {}) : null;
    tenantCache.set(tenantId, data);
    return data;
}

async function main() {
    const projectId = getRequiredProjectId();
    const write = hasFlag('--write');
    const tenantScope = getArg('--tenant-id');
    const storeScope = getArg('--store-id');
    const allStores = hasFlag('--all-stores');
    const scopeCount = Number(Boolean(tenantScope)) + Number(Boolean(storeScope)) + Number(allStores);
    if (scopeCount !== 1) {
        throw new Error('Pass exactly one of --tenant-id, --store-id, or --all-stores.');
    }
    if (tenantScope && !normalizePositiveNumericDocumentId(tenantScope)) {
        throw new Error('--tenant-id must be an exact positive numeric document ID.');
    }
    if (storeScope && !normalizePositiveNumericDocumentId(storeScope)) {
        throw new Error('--store-id must be an exact positive numeric document ID.');
    }
    const confirmedProjectId = getArg('--confirm-project');
    if (write && confirmedProjectId !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
    }
    db = initializeFirestore(projectId);

    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);

    const tenantCache = new Map<string, Record<string, unknown> | null>();
    const storeDocs = await loadStoreDocs();
    let batch = db.batch();
    let batchOperations = 0;
    let scannedStores = 0;
    let candidateStores = 0;
    let updatedStores = 0;
    let skippedMissingTenant = 0;
    let skippedMissingTenantId = 0;
    let skippedAlreadySynced = 0;

    for (const storeDoc of storeDocs) {
        scannedStores += 1;
        const store = storeDoc.data() || {};
        const identity = resolveTenantBlockBackfillStoreIdentity(storeDoc.id, store);
        if (!identity) {
            skippedMissingTenantId += 1;
            console.log(`[skip] store=${storeDoc.id}: invalid or conflicting store/tenant identity`);
            continue;
        }
        const { storeId, tenantId } = identity;

        const tenant = await getTenantData(tenantCache, tenantId);
        if (!tenant) {
            skippedMissingTenant += 1;
            console.log(`[skip] store=${storeId} tenant=${tenantId}: tenant not found`);
            continue;
        }

        const tenantBlocked = isTenantBlockBackfillBlocked(tenant);
        const needsUpdate = store.tenantBlocked !== tenantBlocked || !store.tenantBlockedSyncedAt;
        if (!needsUpdate) {
            skippedAlreadySynced += 1;
            continue;
        }

        candidateStores += 1;
        console.log(`${write ? '[write]' : '[dry]'} store=${storeId} tenant=${tenantId}: tenantBlocked=${tenantBlocked}`);

        if (!write) continue;

        batch.update(storeDoc.ref, {
            tenantBlocked,
            tenantBlockedSyncedAt: FieldValue.serverTimestamp(),
        });
        batchOperations += 1;
        updatedStores += 1;

        if (batchOperations >= WRITE_BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            batchOperations = 0;
        }
    }

    if (write && batchOperations > 0) {
        await batch.commit();
    }

    console.log(JSON.stringify({
        ok: true,
        write,
        scannedStores,
        candidateStores,
        updatedStores,
        skippedAlreadySynced,
        skippedMissingTenant,
        skippedMissingTenantId,
    }, null, 2));
}

if (require.main === module) {
    main().catch((error) => {
        console.error('tenant_block_backfill_failed', JSON.stringify(getBackfillErrorSummary(error)));
        process.exitCode = 1;
    });
}
