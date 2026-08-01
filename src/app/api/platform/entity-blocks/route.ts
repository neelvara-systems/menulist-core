export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { parsePlatformStoreSummary } from "@data/shared/storeSummaryBoundary";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    getBoundedFirebaseAdminStringContext,
    logFirebaseAdminDiagnostic,
} from "@lib/firebase/firebaseAdminDiagnostics";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { buildPlatformBlockDetails } from "@lib/platform/entityBlock";
import { buildPlatformEntityBlockAcknowledgement } from "@lib/platform/entityBlockAcknowledgement";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import {
    prepareStaffAccessStateScope,
    readStaffAccessStateInTransaction,
    StaffConcurrencyError,
    writeStaffBlockedAccessStateInTransaction,
} from "@lib/staffManagement/concurrencyBoundary";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withPlatformAuth } from "../../../../middleware/auth";
import type { PlatformBlockDetails } from "@type/platform/blocking";
import { randomUUID } from "crypto";

const PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES = 64 * 1024;
const PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY = 'platform-entity-block';
const MAX_TENANT_BLOCK_STORES = 200;
const TENANT_BLOCK_EFFECT_CHUNK_SIZE = 20;
const USER_AUTH_RECONCILIATION_MAX_ATTEMPTS = 5;
const USER_AUTH_SYNC_LEASE_MS = 2 * 60 * 1000;
const PLATFORM_ENTITY_BLOCK_SCOPE_CONFLICT = 'platform_entity_block_scope_conflict';
const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;

class PlatformEntityBlockScopeConflictError extends Error {
    readonly code = PLATFORM_ENTITY_BLOCK_SCOPE_CONFLICT;

    constructor() {
        super('Entity block scope changed');
        this.name = 'PlatformEntityBlockScopeConflictError';
    }
}

class PlatformEntityBlockAuthReconciliationError extends Error {
    constructor() {
        super('Entity block auth reconciliation did not converge');
        this.name = 'PlatformEntityBlockAuthReconciliationError';
    }
}

type PlatformEntityBlockDocumentScope = {
    documentId: string;
    numericId?: number;
};

function normalizePlatformEntityBlockDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {
    if (typeof value === 'string') {
        return value === value.trim() && isValidFirestoreDocumentId(value)
            ? { documentId: value }
            : null;
    }

    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        return null;
    }

    const documentId = String(value);
    return isValidFirestoreDocumentId(documentId) ? { documentId, numericId: value } : null;
}

function normalizePlatformEntityBlockNumericDocumentId(value: string | number | undefined | null): PlatformEntityBlockDocumentScope | null {
    const scope = normalizePlatformEntityBlockDocumentId(value);
    if (!scope) return null;

    const numericId = Number(scope.documentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== scope.documentId) {
        return null;
    }

    return { documentId: scope.documentId, numericId };
}

function normalizePlatformEntityBlockTargetDocumentId(
    entityType: 'tenant' | 'store' | 'user',
    value: string | number | undefined | null,
): PlatformEntityBlockDocumentScope | null {
    if (entityType === 'tenant' || entityType === 'store') {
        return normalizePlatformEntityBlockNumericDocumentId(value);
    }

    return normalizePlatformEntityBlockDocumentId(value);
}

function normalizePreviousPlatformBlockDetails(value: unknown): PlatformBlockDetails | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const details = value as Record<string, unknown>;
    if (
        typeof details.blocked !== 'boolean'
        || typeof details.reason !== 'string'
        || details.source !== 'platform_settings'
        || typeof details.updatedAt !== 'string'
    ) {
        return undefined;
    }
    const optionalStringFields = [
        'blockedReason',
        'unblockedReason',
        'blockedAt',
        'blockedByUserId',
        'blockedByEmail',
        'unblockedAt',
        'unblockedByUserId',
        'unblockedByEmail',
        'updatedByUserId',
        'updatedByEmail',
    ] as const;
    if (optionalStringFields.some((field) => details[field] !== undefined && typeof details[field] !== 'string')) {
        return undefined;
    }
    return {
        blocked: details.blocked,
        reason: details.reason,
        source: details.source,
        updatedAt: details.updatedAt,
        ...Object.fromEntries(optionalStringFields
            .filter((field) => typeof details[field] === 'string')
            .map((field) => [field, details[field]])),
    };
}

function isPlatformEntityBlockScopeConflict(error: unknown): boolean {
    return error instanceof PlatformEntityBlockScopeConflictError;
}

function getPlatformEntityBlockOperatorId(session: any): string {
    return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

const EntityBlockRequestSchema = z.object({
    blocked: z.boolean(),
    entity: z.record(z.unknown()).optional(),
    entityId: z.union([
        z.string().min(1).max(160),
        z.number().finite(),
    ]),
    entityType: z.enum(['tenant', 'store', 'user']),
    reason: z.string().trim().min(1).max(500),
}).superRefine((value, ctx) => {
    if (!normalizePlatformEntityBlockTargetDocumentId(value.entityType, value.entityId)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid entity ID',
            path: ['entityId'],
        });
    }
});

function getEntityDocRef(db: admin.firestore.Firestore, entityType: 'tenant' | 'store' | 'user', entityDocumentId: string) {
    if (entityType === 'tenant') {
        return db.collection(DB_COLLECTIONS.TENANTS).doc(entityDocumentId);
    }
    if (entityType === 'store') {
        return db.collection(DB_COLLECTIONS.STORES).doc(entityDocumentId);
    }
    return db.collection(DB_COLLECTIONS.USERS).doc(entityDocumentId);
}

function getTenantStoreQueryValues(tenantScope: PlatformEntityBlockDocumentScope): Array<string | number> {
    if (typeof tenantScope.numericId === 'number') {
        return [tenantScope.numericId, tenantScope.documentId];
    }

    return [tenantScope.documentId];
}

function hasExactStoredEntityIdentity(
    entity: Record<string, unknown>,
    field: 'storeId' | 'tenantId',
    expectedScope: PlatformEntityBlockDocumentScope,
): boolean {
    const storedValue = entity[field];
    if (storedValue === undefined || storedValue === null) return true;
    const storedScope = normalizePlatformEntityBlockTargetDocumentId(
        field === 'storeId' ? 'store' : 'tenant',
        typeof storedValue === 'string' || typeof storedValue === 'number' ? storedValue : null,
    );
    return storedScope?.documentId === expectedScope.documentId;
}

function hasExactTenantOwnership(entity: Record<string, unknown>, tenantScope: PlatformEntityBlockDocumentScope): boolean {
    const storedScopes = TENANT_STORE_SCOPE_FIELDS
        .filter((field) => entity[field] !== undefined && entity[field] !== null)
        .map((field) => {
            const value = entity[field];
            return normalizePlatformEntityBlockTargetDocumentId(
                'tenant',
                typeof value === 'string' || typeof value === 'number' ? value : null,
            );
        });
    return storedScopes.length > 0
        && storedScopes.every((scope) => scope?.documentId === tenantScope.documentId);
}

async function updateTenantBlockStateAtomically({
    blocked,
    db,
    docRef,
    reason,
    session,
    tenantScope,
}: {
    blocked: boolean;
    db: admin.firestore.Firestore;
    docRef: admin.firestore.DocumentReference;
    reason: string;
    session: any;
    tenantScope: PlatformEntityBlockDocumentScope;
}): Promise<{ affectedStoreIds: string[]; blockDetails: ReturnType<typeof buildPlatformBlockDetails> }> {
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const storeQueries = getTenantStoreQueryValues(tenantScope).flatMap((tenantQueryValue) => (
        TENANT_STORE_SCOPE_FIELDS.map((field) => db
            .collection(DB_COLLECTIONS.STORES)
            .where(field, '==', tenantQueryValue)
            .limit(MAX_TENANT_BLOCK_STORES + 1))
    ));

    return db.runTransaction(async (transaction) => {
        const [tenantSnap, summarySnap, ...storeSnapshots] = await Promise.all([
            transaction.get(docRef),
            transaction.get(summaryRef),
            ...storeQueries.map((query) => transaction.get(query)),
        ]);
        if (!tenantSnap.exists) throw new PlatformEntityBlockScopeConflictError();
        const tenant = tenantSnap.data() || {};
        if (!hasExactStoredEntityIdentity(tenant, 'tenantId', tenantScope)) {
            throw new PlatformEntityBlockScopeConflictError();
        }

        const directStores = new Map<string, admin.firestore.QueryDocumentSnapshot>();
        for (const snapshot of storeSnapshots) {
            if (snapshot.size > MAX_TENANT_BLOCK_STORES) {
                throw new PlatformEntityBlockScopeConflictError();
            }
            for (const store of snapshot.docs) {
                const storeScope = normalizePlatformEntityBlockTargetDocumentId('store', store.id);
                const storeData = store.data();
                if (
                    !storeScope
                    || !hasExactStoredEntityIdentity(storeData, 'storeId', storeScope)
                    || !hasExactTenantOwnership(storeData, tenantScope)
                ) {
                    throw new PlatformEntityBlockScopeConflictError();
                }
                directStores.set(storeScope.documentId, store);
            }
        }

        const stores = parsePlatformStoreSummary(summarySnap.exists ? summarySnap.data() : undefined);
        const summaryStoreIds = Object.entries(stores)
            .filter(([, store]) => store.tId === tenantScope.documentId)
            .map(([storeId]) => normalizePlatformEntityBlockTargetDocumentId('store', storeId)?.documentId)
            .filter((storeId): storeId is string => Boolean(storeId));
        const affectedStoreIds = Array.from(new Set([...summaryStoreIds, ...Array.from(directStores.keys())]));
        if (directStores.size > MAX_TENANT_BLOCK_STORES || affectedStoreIds.length > MAX_TENANT_BLOCK_STORES) {
            throw new PlatformEntityBlockScopeConflictError();
        }

        const blockDetails = buildPlatformBlockDetails({
            actorEmail: session?.user?.email,
            actorUserId: session?.uId || session?.user?.id,
            blocked,
            previousBlockDetails: normalizePreviousPlatformBlockDetails(tenant.blockDetails),
            reason,
        });
        const now = admin.firestore.Timestamp.now();
        transaction.update(docRef, { blocked, blockDetails });
        directStores.forEach((store) => {
            transaction.update(store.ref, {
                tenantBlocked: blocked,
                tenantBlockedSyncedAt: now,
            });
        });
        if (affectedStoreIds.length) {
            transaction.set(summaryRef, {
                lastUpdated: now,
                stores: Object.fromEntries(
                    affectedStoreIds.map((storeId) => [storeId, { tenantBlocked: blocked }]),
                ),
            }, { merge: true });
        }

        return {
            affectedStoreIds,
            blockDetails,
        };
    });
}

async function syncUserBlockAuthState({
    desiredDisabled,
    entity,
    revokeTokens,
}: {
    desiredDisabled: boolean;
    entity: Record<string, unknown>;
    revokeTokens: boolean;
}) {
    const firebaseUid = typeof entity.firebaseUid === 'string' ? entity.firebaseUid.trim() : '';
    const email = typeof entity.email === 'string' ? entity.email.toLowerCase().trim() : '';
    if (!firebaseUid && !email) return { authDisabled: desiredDisabled, authSynced: false, status: 'auth_user_missing' as const };

    try {
        const firebaseUser = firebaseUid
            ? await authAdmin.getUser(firebaseUid)
            : await authAdmin.getUserByEmail(email);

        if (firebaseUser.disabled !== desiredDisabled) {
            await authAdmin.updateUser(firebaseUser.uid, { disabled: desiredDisabled });
        }
        if (revokeTokens) {
            await authAdmin.revokeRefreshTokens(firebaseUser.uid);
        }

        return { authDisabled: desiredDisabled, authSynced: true, status: 'synced' as const };
    } catch (error: any) {
        if (error?.code === "auth/user-not-found") {
            logFirebaseAdminDiagnostic("platform_entity_block_auth_user_missing", {
                desiredDisabled,
                hasEmail: email.length > 0,
                hasFirebaseUid: firebaseUid.length > 0,
                ...getBoundedFirebaseAdminStringContext("userId", entity?.id),
            });
            return { authDisabled: desiredDisabled, authSynced: false, status: 'auth_user_missing' as const };
        }

        throw error;
    }
}

function getDesiredUserAuthDisabled(entity: Record<string, unknown>): boolean {
    return entity.blocked === true
        || entity.active === false
        || entity.deleted === true
        || entity.isVerified === false;
}

function hasExactStoredUserIdentity(entity: Record<string, unknown>, userScope: PlatformEntityBlockDocumentScope): boolean {
    if (entity.id === undefined || entity.id === null) return true;
    const storedScope = normalizePlatformEntityBlockTargetDocumentId(
        'user',
        typeof entity.id === 'string' || typeof entity.id === 'number' ? entity.id : null,
    );
    return storedScope?.documentId === userScope.documentId;
}

function getPlatformEntityBlockTimestampMillis(value: unknown): number {
    if (value instanceof Date) return value.getTime();
    if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
        const millis = value.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }
    return 0;
}

function hasActiveUserAuthSyncLease(entity: Record<string, unknown>, nowMs: number): boolean {
    if (entity.authSyncStatus !== 'pending') return false;
    const pending = entity.authSyncPending;
    if (!pending || typeof pending !== 'object' || Array.isArray(pending)) return false;
    const leaseExpiresAt = (pending as Record<string, unknown>).leaseExpiresAt;
    return getPlatformEntityBlockTimestampMillis(leaseExpiresAt) > nowMs;
}

async function markUserAuthSyncFailed(
    db: admin.firestore.Firestore,
    docRef: admin.firestore.DocumentReference,
    operationId: string,
): Promise<void> {
    await db.runTransaction(async (transaction) => {
        const userSnap = await transaction.get(docRef);
        if (!userSnap.exists || userSnap.data()?.authSyncRevision !== operationId) return;
        transaction.update(docRef, {
            authSyncStatus: 'failed',
            modifiedOn: admin.firestore.Timestamp.now(),
        });
    });
}

async function reconcileUserBlockAuthState({
    db,
    docRef,
    requestedOperationId,
}: {
    db: admin.firestore.Firestore;
    docRef: admin.firestore.DocumentReference;
    requestedOperationId: string;
}): Promise<{ authDisabled: boolean; authSynced: boolean; entity: Record<string, unknown>; superseded: boolean }> {
    for (let attempt = 0; attempt < USER_AUTH_RECONCILIATION_MAX_ATTEMPTS; attempt += 1) {
        const userSnap = await docRef.get();
        if (!userSnap.exists) throw new PlatformEntityBlockScopeConflictError();
        const user: Record<string, unknown> = { ...(userSnap.data() || {}), id: userSnap.id };
        const revision = typeof user.authSyncRevision === 'string' ? user.authSyncRevision : '';
        if (!revision) throw new PlatformEntityBlockAuthReconciliationError();
        const desiredDisabled = getDesiredUserAuthDisabled(user);
        const authSync = await syncUserBlockAuthState({
            desiredDisabled,
            entity: user,
            revokeTokens: user.blocked === true,
        });
        const finalized = await db.runTransaction(async (transaction) => {
            const freshSnap = await transaction.get(docRef);
            if (!freshSnap.exists) throw new PlatformEntityBlockScopeConflictError();
            const freshUser: Record<string, unknown> = { ...(freshSnap.data() || {}), id: freshSnap.id };
            if (
                freshUser.authSyncRevision !== revision
                || getDesiredUserAuthDisabled(freshUser) !== desiredDisabled
            ) {
                return { stable: false as const };
            }
            const now = admin.firestore.Timestamp.now();
            transaction.update(docRef, {
                authDisabled: desiredDisabled,
                authSyncPending: admin.firestore.FieldValue.delete(),
                authSyncStatus: authSync.status,
                authSyncedAt: now,
                modifiedOn: now,
            });
            return {
                entity: freshUser,
                stable: true as const,
            };
        });
        if (finalized.stable) {
            return {
                authDisabled: desiredDisabled,
                authSynced: authSync.authSynced,
                entity: finalized.entity,
                superseded: revision !== requestedOperationId,
            };
        }
    }

    throw new PlatformEntityBlockAuthReconciliationError();
}

export const POST = withPlatformAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS) {
        return NextResponse.json({ error: "Platform entity blocks are disabled" }, { status: 404 });
    }

    const rateLimitConfig = getRateLimitForFeature('PLATFORM_ENTITY_BLOCK_MUTATION');
    const operatorRateLimitHash = hashPublicRateLimitValue(getPlatformEntityBlockOperatorId(session));
    const rateLimit = await checkRateLimit({
        key: `${PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY}:${operatorRateLimitHash}`,
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (!rateLimit.allowed) {
        const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        logger.security('Rate Limit Exceeded - Platform Entity Blocks', {
            ...getBoundedSecurityRouteContext(session, request),
            endpoint: '/api/platform/entity-blocks',
            error: 'Too many entity block attempts',
            feature: 'PLATFORM_ENTITY_BLOCK_MUTATION',
            limit: rateLimitConfig.limit,
            waitSeconds,
            window: rateLimitConfig.window,
        }, 'high');

        return NextResponse.json(
            {
                error: rateLimit.reason === 'provider_unavailable'
                    ? "Entity block controls are temporarily unavailable."
                    : "Too many entity block attempts. Please try again later.",
                retryAfter: waitSeconds,
            },
            {
                status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
                headers: {
                    'Retry-After': String(waitSeconds),
                    'X-RateLimit-Limit': String(rateLimitConfig.limit),
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-RateLimit-Reset': String(rateLimit.resetAt),
                },
            },
        );
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
        logger.security('Authorization Failed - Platform Entity Blocks Current Role', {
            ...getBoundedSecurityRouteContext(session, request),
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bodyResult = await readBoundedJsonBody(request, PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = EntityBlockRequestSchema.safeParse(bodyResult.data);

    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid input", details: getSafeZodValidationDetails(validation.error) },
            { status: 400 },
        );
    }

    const {
        blocked,
        entityId,
        entityType,
        reason,
    } = validation.data;
    const entityScope = normalizePlatformEntityBlockTargetDocumentId(entityType, entityId);
    if (!entityScope) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = admin.firestore();
    const docRef = getEntityDocRef(db, entityType, entityScope.documentId);
    const entitySnap = await docRef.get();

    if (!entitySnap.exists) {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    if (entityType === 'tenant') {
        const tenantScope = entityScope;
        const tenantId = tenantScope.numericId ?? tenantScope.documentId;
        let committed = false;
        try {
            const result = await updateTenantBlockStateAtomically({
                blocked,
                db,
                docRef,
                reason,
                session,
                tenantScope,
            });
            committed = true;
            const postCommit = await runStorePublicTruthPostCommitEffects({
                chunkSize: TENANT_BLOCK_EFFECT_CHUNK_SIZE,
                storeIds: result.affectedStoreIds.map(String),
                tenantId: tenantScope.documentId,
                deps: {
                    invalidateAssistant: (storeId, effectTenantId) => (
                        invalidateOwnerBusinessAssistantPacketCache({ tId: effectTenantId, sId: storeId })
                    ),
                    revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                    touchScreen: (storeId) => (
                        touchDigitalScreenContentVersionForStoreServer(storeId, 'platformEntityBlocks')
                    ),
                },
            });
            if (postCommit.effectsPending) {
                logFirebaseAdminDiagnostic('platform_entity_block_tenant_post_commit_effect_failed', {
                    blocked,
                    failedEffectCount: postCommit.failedEffectCount,
                    storeCount: result.affectedStoreIds.length,
                });
            }

            return NextResponse.json({
                effectsPending: postCommit.effectsPending,
                failedEffectCount: postCommit.failedEffectCount,
                entity: {
                    ...buildPlatformEntityBlockAcknowledgement({
                        blocked,
                        blockDetails: result.blockDetails,
                        entityId: tenantId,
                        entityType: 'tenant',
                    }),
                },
                success: true,
            });
        } catch (error) {
            const scopeConflict = isPlatformEntityBlockScopeConflict(error);
            logFirebaseAdminDiagnostic('platform_entity_block_tenant_update_failed', {
                blocked,
                committed,
                scopeConflict,
            });
            return NextResponse.json(
                { error: committed ? 'Entity block state saved but refresh failed' : 'Entity block update failed' },
                { status: committed ? 500 : scopeConflict ? 409 : 500 },
            );
        }
    }

    if (entityType === 'store') {
        const storeScope = entityScope;
        const storeId = storeScope.numericId;
        if (typeof storeId !== 'number') {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }
        let committed = false;
        try {
            const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
            const result = await db.runTransaction(async (transaction) => {
                const freshStoreSnap = await transaction.get(docRef);
                if (!freshStoreSnap.exists) throw new PlatformEntityBlockScopeConflictError();
                const freshStore = freshStoreSnap.data() || {};
                if (!hasExactStoredEntityIdentity(freshStore, 'storeId', storeScope)) {
                    throw new PlatformEntityBlockScopeConflictError();
                }
                const tenantScope = normalizePlatformEntityBlockTargetDocumentId(
                    'tenant',
                    typeof freshStore.tenantId === 'string' || typeof freshStore.tenantId === 'number'
                        ? freshStore.tenantId
                        : typeof freshStore.tId === 'string' || typeof freshStore.tId === 'number'
                            ? freshStore.tId
                            : null,
                );
                if (tenantScope && !hasExactTenantOwnership(freshStore, tenantScope)) {
                    throw new PlatformEntityBlockScopeConflictError();
                }
                const blockDetails = buildPlatformBlockDetails({
                    actorEmail: session?.user?.email,
                    actorUserId: session?.uId || session?.user?.id,
                    blocked,
                    previousBlockDetails: normalizePreviousPlatformBlockDetails(freshStore.blockDetails),
                    reason,
                });
                const modifiedOn = blockDetails.updatedAt;
                const now = admin.firestore.Timestamp.now();
                transaction.update(docRef, { blocked, blockDetails, modifiedOn });
                transaction.set(summaryRef, {
                    lastUpdated: now,
                    stores: {
                        [storeScope.documentId]: { blocked, modifiedOn },
                    },
                }, { merge: true });
                return {
                    blockDetails,
                    modifiedOn,
                    tenantDocumentId: tenantScope?.documentId,
                };
            });
            committed = true;
            const postCommit = await runStorePublicTruthPostCommitEffects({
                chunkSize: 1,
                storeIds: [storeScope.documentId],
                tenantId: result.tenantDocumentId || '',
                deps: {
                    invalidateAssistant: (effectStoreId, effectTenantId) => (
                        effectTenantId
                            ? invalidateOwnerBusinessAssistantPacketCache({ tId: effectTenantId, sId: effectStoreId })
                            : Promise.resolve()
                    ),
                    revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                    touchScreen: (effectStoreId) => (
                        touchDigitalScreenContentVersionForStoreServer(effectStoreId, 'platformEntityBlocks')
                    ),
                },
            });
            if (postCommit.effectsPending) {
                logFirebaseAdminDiagnostic('platform_entity_block_store_post_commit_effect_failed', {
                    blocked,
                    failedEffectCount: postCommit.failedEffectCount,
                });
            }

            return NextResponse.json({
                effectsPending: postCommit.effectsPending,
                failedEffectCount: postCommit.failedEffectCount,
                entity: {
                    ...buildPlatformEntityBlockAcknowledgement({
                        blocked,
                        blockDetails: result.blockDetails,
                        entityId: storeId,
                        entityType: 'store',
                    }),
                },
                success: true,
            });
        } catch (error) {
            const scopeConflict = isPlatformEntityBlockScopeConflict(error);
            logFirebaseAdminDiagnostic('platform_entity_block_store_update_failed', {
                blocked,
                committed,
                scopeConflict,
            });
            return NextResponse.json(
                { error: committed ? 'Entity block state saved but refresh failed' : 'Entity block update failed' },
                { status: committed ? 500 : scopeConflict ? 409 : 500 },
            );
        }
    }

    let staffAccessScope;
    try {
        staffAccessScope = await prepareStaffAccessStateScope(db, entitySnap.data() || {});
    } catch (error) {
        logFirebaseAdminDiagnostic('platform_entity_block_staff_access_prepare_failed', {
            hasStaffAccessScope: false,
        });
        return NextResponse.json({ error: 'Entity block update failed' }, { status: 500 });
    }

    const operationId = randomUUID();
    let committed = false;
    try {
        const started = await db.runTransaction(async (transaction) => {
            const staffAccessStates = staffAccessScope
                ? await readStaffAccessStateInTransaction(transaction, db, staffAccessScope)
                : [];
            const freshUserSnap = await transaction.get(docRef);
            if (!freshUserSnap.exists) throw new PlatformEntityBlockScopeConflictError();
            const freshUser: Record<string, unknown> = { ...(freshUserSnap.data() || {}), id: freshUserSnap.id };
            if (!hasExactStoredUserIdentity(freshUser, entityScope)) {
                throw new PlatformEntityBlockScopeConflictError();
            }
            const now = admin.firestore.Timestamp.now();
            if (hasActiveUserAuthSyncLease(freshUser, now.toMillis())) {
                throw new PlatformEntityBlockScopeConflictError();
            }
            const blockDetails = buildPlatformBlockDetails({
                actorEmail: session?.user?.email,
                actorUserId: session?.uId || session?.user?.id,
                blocked,
                previousBlockDetails: normalizePreviousPlatformBlockDetails(freshUser.blockDetails),
                reason,
            });
            const nextUser = { ...freshUser, blocked };
            const desiredDisabled = getDesiredUserAuthDisabled(nextUser);
            const updateData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
                authDisabled: desiredDisabled,
                authSyncPending: {
                    desiredDisabled,
                    leaseExpiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + USER_AUTH_SYNC_LEASE_MS),
                    operationId,
                    requestedAt: now,
                },
                authSyncRevision: operationId,
                authSyncStatus: 'pending',
                blocked,
                blockDetails,
                modifiedOn: now,
            };
            if (blocked) {
                updateData.authTokensRevokedAt = now;
                updateData.sessionRevokedAt = now;
                if (session?.uId || session?.user?.id) updateData.sessionRevokedBy = session?.uId || session?.user?.id;
                if (session?.user?.email) updateData.sessionRevokedByEmail = session.user.email;
                updateData.sessionRevokedReason = 'platform_user_block';
            }
            if (staffAccessScope) {
                writeStaffBlockedAccessStateInTransaction(
                    transaction,
                    staffAccessScope,
                    staffAccessStates,
                    freshUser,
                    freshUserSnap.id,
                    blocked,
                );
            }
            transaction.update(docRef, updateData);
            return { blockDetails, modifiedOn: now };
        });
        committed = true;
        const reconciled = await reconcileUserBlockAuthState({
            db,
            docRef,
            requestedOperationId: operationId,
        });
        if (reconciled.superseded) {
            logFirebaseAdminDiagnostic('platform_entity_block_user_update_superseded', {
                blocked,
                committed,
            });
            return NextResponse.json({ error: 'Entity block state changed during update' }, { status: 409 });
        }

        return NextResponse.json({
            entity: {
                ...buildPlatformEntityBlockAcknowledgement({
                    blocked,
                    blockDetails: started.blockDetails,
                    entityId: entityScope.documentId,
                    entityType: 'user',
                }),
            },
            success: true,
        });
    } catch (error) {
        const scopeConflict = isPlatformEntityBlockScopeConflict(error) || error instanceof StaffConcurrencyError;
        if (committed) {
            try {
                await markUserAuthSyncFailed(db, docRef, operationId);
            } catch {
                logFirebaseAdminDiagnostic('platform_entity_block_user_failure_marker_failed', {
                    blocked,
                });
            }
        }
        logFirebaseAdminDiagnostic('platform_entity_block_user_update_failed', {
            blocked,
            committed,
            reconciliationFailed: error instanceof PlatformEntityBlockAuthReconciliationError,
            scopeConflict,
        });
        return NextResponse.json(
            { error: committed ? 'Entity block state saved but authentication sync failed' : 'Entity block update failed' },
            { status: committed ? 500 : scopeConflict ? 409 : 500 },
        );
    }
});
