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

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../src/constants/database';

const args = process.argv.slice(2);
const WRITE_BATCH_LIMIT = 450;
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
    const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;
    if (!projectId) {
        throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running tenant-block backfill.');
    }
    return projectId;
}

function hasExplicitWriteScope(): boolean {
    return Boolean(getArg('--tenant-id') || getArg('--store-id') || hasFlag('--all-stores'));
}

let db: FirebaseFirestore.Firestore;

function initializeFirestore(projectId: string): FirebaseFirestore.Firestore {
    if (!admin.apps.length) {
        admin.initializeApp({ projectId });
    }
    return admin.firestore();
}

function getTenantStoreQueryValues(tenantId: string): Array<string | number> {
    const tenantIdNumber = Number(tenantId);
    if (!Number.isFinite(tenantIdNumber)) return [tenantId];
    return [tenantIdNumber, tenantId];
}

function isPlatformBlocked(value: Record<string, any> | undefined): boolean {
    return value?.blocked === true || value?.tenantBlocked === true || value?.blockDetails?.blocked === true;
}

function getBoundedErrorString(value: unknown, maxLength = 180): string | null {
    if (typeof value !== 'string' || !value.trim()) return null;
    return value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function getBackfillErrorSummary(error: any) {
    return {
        code: typeof error?.code === 'number' || typeof error?.code === 'string' ? error.code : null,
        domain: getBoundedErrorString(error?.domain),
        reason: getBoundedErrorString(error?.reason),
        message: getBoundedErrorString(error?.message),
        details: getBoundedErrorString(error?.details),
        errorName: getBoundedErrorString(error?.name),
    };
}

async function loadStoreDocs(): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const storeId = getArg('--store-id');
    if (storeId) {
        const snap = await db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
        return snap.exists ? [snap as FirebaseFirestore.QueryDocumentSnapshot] : [];
    }

    const tenantId = getArg('--tenant-id');
    const limitArg = getArg('--limit');
    const limit = limitArg ? Number(limitArg) : null;

    if (tenantId) {
        const storeDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        for (const tenantQueryValue of getTenantStoreQueryValues(tenantId)) {
            for (const field of TENANT_STORE_SCOPE_FIELDS) {
                let query: FirebaseFirestore.Query = db
                    .collection(DB_COLLECTIONS.STORES)
                    .where(field, '==', tenantQueryValue);
                if (Number.isFinite(limit) && limit && limit > 0) query = query.limit(limit);
                const snap = await query.get();
                snap.docs.forEach((doc) => storeDocs.set(doc.id, doc));
            }
        }
        return Array.from(storeDocs.values());
    }

    let query: FirebaseFirestore.Query = db.collection(DB_COLLECTIONS.STORES);
    if (Number.isFinite(limit) && limit && limit > 0) query = query.limit(limit);
    const snap = await query.get();
    return snap.docs;
}

async function getTenantData(
    tenantCache: Map<string, Record<string, any> | null>,
    tenantId: string,
): Promise<Record<string, any> | null> {
    if (tenantCache.has(tenantId)) return tenantCache.get(tenantId) || null;

    const snap = await db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId).get();
    const data = snap.exists ? (snap.data() || {}) : null;
    tenantCache.set(tenantId, data);
    return data;
}

async function main() {
    const projectId = getRequiredProjectId();
    const write = hasFlag('--write');
    const confirmedProjectId = getArg('--confirm-project');
    if (write && confirmedProjectId !== projectId) {
        throw new Error(`Refusing write: pass --confirm-project ${projectId} to confirm the target Firebase project.`);
    }
    if (write && !hasExplicitWriteScope()) {
        throw new Error('Refusing write: pass --tenant-id, --store-id, or --all-stores after reviewing dry-run output.');
    }

    db = initializeFirestore(projectId);

    console.log(`Project: ${projectId}`);
    console.log(`Mode: ${write ? 'WRITE' : 'DRY RUN'}`);

    const tenantCache = new Map<string, Record<string, any> | null>();
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
        const storeId = String(store.storeId ?? storeDoc.id);
        const tenantId = String(store.tenantId ?? store.tId ?? '');

        if (!tenantId) {
            skippedMissingTenantId += 1;
            console.log(`[skip] store=${storeId}: missing tenantId`);
            continue;
        }

        const tenant = await getTenantData(tenantCache, tenantId);
        if (!tenant) {
            skippedMissingTenant += 1;
            console.log(`[skip] store=${storeId} tenant=${tenantId}: tenant not found`);
            continue;
        }

        const tenantBlocked = isPlatformBlocked(tenant);
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

main().catch((error) => {
    console.error('tenant_block_backfill_failed', JSON.stringify(getBackfillErrorSummary(error)));
    process.exitCode = 1;
});
