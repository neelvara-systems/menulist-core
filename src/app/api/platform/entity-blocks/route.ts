export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    getBoundedFirebaseAdminStringContext,
    logFirebaseAdminDiagnostic,
} from "@lib/firebase/firebaseAdminDiagnostics";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { buildPlatformBlockDetails } from "@lib/platform/entityBlock";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withPlatformAuth } from "../../../../middleware/auth";

const PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES = 64 * 1024;
const PLATFORM_ENTITY_BLOCK_RATE_LIMIT_KEY = 'platform-entity-block';
const TENANT_STORE_BLOCK_BATCH_LIMIT = 450;
const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;

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

function getPlatformEntityBlockOperatorId(session: any): string {
    return String(session?.uId || session?.user?.id || session?.user?.email || 'platform');
}

const EntityBlockRequestSchema = z.object({
    blocked: z.boolean(),
    entity: z.record(z.any()).optional(),
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

async function getDirectTenantStoreIds(db: admin.firestore.Firestore, tenantScope: PlatformEntityBlockDocumentScope): Promise<string[]> {
    const storeIds = new Set<string>();
    const snapshots = await Promise.all(
        getTenantStoreQueryValues(tenantScope).flatMap((tenantQueryValue) => TENANT_STORE_SCOPE_FIELDS.map((field) => db
            .collection(DB_COLLECTIONS.STORES)
            .where(field, '==', tenantQueryValue)
            .get())),
    );

    snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((doc) => {
            const storeScope = normalizePlatformEntityBlockTargetDocumentId('store', doc.id);
            if (storeScope) storeIds.add(storeScope.documentId);
        });
    });

    return Array.from(storeIds);
}

async function syncTenantBlockedToStoreDocs(
    db: admin.firestore.Firestore,
    directStoreIds: string[],
    tenantBlocked: boolean,
): Promise<void> {
    if (!directStoreIds.length) return;

    let batch = db.batch();
    let operations = 0;

    for (const storeId of directStoreIds) {
        const storeScope = normalizePlatformEntityBlockTargetDocumentId('store', storeId);
        if (!storeScope) continue;

        batch.update(db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId), {
            tenantBlocked,
            tenantBlockedSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        operations += 1;

        if (operations >= TENANT_STORE_BLOCK_BATCH_LIMIT) {
            await batch.commit();
            batch = db.batch();
            operations = 0;
        }
    }

    if (operations > 0) {
        await batch.commit();
    }
}

async function syncTenantStoreBlockState(db: admin.firestore.Firestore, tenantScope: PlatformEntityBlockDocumentScope, tenantBlocked: boolean): Promise<string[]> {
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const [summarySnap, directStoreIds] = await Promise.all([
        summaryRef.get(),
        getDirectTenantStoreIds(db, tenantScope),
    ]);
    const stores = summarySnap.exists ? (summarySnap.data()?.stores || {}) : {};
    const summaryStoreIds = Object.entries(stores)
        .filter(([, store]: [string, any]) => String(store?.tId ?? store?.tenantId ?? '') === tenantScope.documentId)
        .map(([storeId]) => normalizePlatformEntityBlockTargetDocumentId('store', storeId)?.documentId)
        .filter((storeId): storeId is string => Boolean(storeId));
    const affectedStoreIds = Array.from(new Set([...summaryStoreIds, ...directStoreIds]));

    if (affectedStoreIds.length) {
        await syncTenantBlockedToStoreDocs(db, directStoreIds, tenantBlocked);
        await summaryRef.set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            stores: Object.fromEntries(
                affectedStoreIds.map((storeId) => [storeId, { tenantBlocked }]),
            ),
        }, { merge: true });
    }

    return affectedStoreIds;
}

async function revalidateStorePublicCache(storeId: string | number, tenantId?: string | number) {
    revalidateTag(`menu-store-${storeId}`);
    revalidateTag(`store-${storeId}`);
    revalidateTag('client-stores');
    revalidateTag('screen-data');
    await touchDigitalScreenContentVersionForStoreServer(storeId, 'platformEntityBlocks');
    await invalidateOwnerBusinessAssistantPacketCache({
        tId: tenantId,
        sId: storeId,
    });
}

async function syncUserBlockAuthState({
    blocked,
    entity,
    reason,
}: {
    blocked: boolean;
    entity: Record<string, any>;
    reason: string;
}) {
    const firebaseUid = entity?.firebaseUid ? String(entity.firebaseUid) : "";
    const email = String(entity?.email || "").toLowerCase().trim();
    if (!firebaseUid && !email) return { authDisabled: blocked, authSynced: false };

    try {
        const firebaseUser = firebaseUid
            ? await authAdmin.getUser(firebaseUid)
            : await authAdmin.getUserByEmail(email);
        const shouldDisable = blocked || entity.active === false || entity.deleted === true || entity.isVerified === false;

        if (firebaseUser.disabled !== shouldDisable) {
            await authAdmin.updateUser(firebaseUser.uid, { disabled: shouldDisable });
        }
        if (blocked) {
            await authAdmin.revokeRefreshTokens(firebaseUser.uid);
        }

        return { authDisabled: shouldDisable, authSynced: true };
    } catch (error: any) {
        if (error?.code === "auth/user-not-found") {
            logFirebaseAdminDiagnostic("platform_entity_block_auth_user_missing", {
                blocked,
                hasEmail: email.length > 0,
                hasFirebaseUid: firebaseUid.length > 0,
                ...getBoundedFirebaseAdminStringContext("reason", reason),
                ...getBoundedFirebaseAdminStringContext("userId", entity?.id),
            });
            return { authDisabled: blocked, authSynced: false };
        }

        throw error;
    }
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
            { error: "Too many entity block attempts. Please try again later.", retryAfter: waitSeconds },
            {
                status: 429,
                headers: {
                    'Retry-After': String(waitSeconds),
                    'X-RateLimit-Limit': String(rateLimitConfig.limit),
                    'X-RateLimit-Remaining': String(rateLimit.remaining),
                    'X-RateLimit-Reset': String(rateLimit.resetAt),
                },
            },
        );
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
        entity,
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

    const existingEntity: Record<string, any> = {
        ...(entity || {}),
        ...entitySnap.data(),
        id: entitySnap.id,
    };
    const blockDetails = buildPlatformBlockDetails({
        actorEmail: session?.user?.email,
        actorUserId: session?.uId || session?.user?.id,
        blocked,
        previousBlockDetails: existingEntity?.blockDetails,
        reason,
    });

    if (entityType === 'tenant') {
        const tenantScope = normalizePlatformEntityBlockTargetDocumentId('tenant', existingEntity.tenantId) || entityScope;
        const tenantId = tenantScope.numericId ?? tenantScope.documentId;
        let affectedStoreIds: string[] = [];

        if (blocked) {
            affectedStoreIds = await syncTenantStoreBlockState(db, tenantScope, true);
            await docRef.update({
                blocked,
                blockDetails,
            });
        } else {
            await docRef.update({
                blocked,
                blockDetails,
            });
            affectedStoreIds = await syncTenantStoreBlockState(db, tenantScope, false);
        }

        await Promise.all(affectedStoreIds.map((storeId) => revalidateStorePublicCache(storeId, tenantScope.documentId)));

        return NextResponse.json({
            entity: {
                ...existingEntity,
                tenantId,
                blocked,
                blockDetails,
            },
            success: true,
        });
    }

    if (entityType === 'store') {
        const storeScope = normalizePlatformEntityBlockTargetDocumentId('store', existingEntity.storeId) || entityScope;
        const storeId = storeScope.numericId;
        if (typeof storeId !== 'number') {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }
        const tenantScope = normalizePlatformEntityBlockTargetDocumentId('tenant', existingEntity.tenantId);
        const modifiedOn = blockDetails.updatedAt;

        await docRef.update({
            blocked,
            blockDetails,
            modifiedOn,
        });
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            stores: {
                [storeId]: {
                    blocked,
                    modifiedOn,
                },
            },
        }, { merge: true });
        await revalidateStorePublicCache(storeScope.documentId, tenantScope?.documentId);

        return NextResponse.json({
            entity: {
                ...existingEntity,
                storeId,
                blocked,
                blockDetails,
                modifiedOn,
            },
            success: true,
        });
    }

    const now = admin.firestore.Timestamp.now();
    const authSync = await syncUserBlockAuthState({
        blocked,
        entity: existingEntity,
        reason,
    });
    const updateData: Record<string, any> = {
        authDisabled: authSync.authDisabled,
        blocked,
        blockDetails,
        modifiedOn: now,
    };
    if (blocked) {
        updateData.authTokensRevokedAt = now;
        updateData.sessionRevokedAt = now;
        if (session?.uId || session?.user?.id) updateData.sessionRevokedBy = session?.uId || session?.user?.id;
        if (session?.user?.email) updateData.sessionRevokedByEmail = session.user.email;
        updateData.sessionRevokedReason = "platform_user_block";
    }

    await docRef.update(updateData);

    return NextResponse.json({
        entity: {
            ...existingEntity,
            authDisabled: authSync.authDisabled,
            blocked,
            blockDetails,
            modifiedOn: now,
        },
        success: true,
    });
});
