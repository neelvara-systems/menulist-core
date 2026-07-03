export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import {
    getBoundedFirebaseAdminStringContext,
    logFirebaseAdminDiagnostic,
} from "@lib/firebase/firebaseAdminDiagnostics";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { buildPlatformBlockDetails } from "@lib/platform/entityBlock";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getSafeZodValidationDetails } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformAuth } from "../../../../middleware/auth";

const EntityBlockRequestSchema = z.object({
    blocked: z.boolean(),
    entity: z.record(z.any()).optional(),
    entityId: z.union([
        z.string().trim().min(1).max(160).refine((value) => !value.includes('/')),
        z.number(),
    ]),
    entityType: z.enum(['tenant', 'store', 'user']),
    reason: z.string().trim().min(1).max(500),
});
const PLATFORM_ENTITY_BLOCK_MAX_BODY_BYTES = 64 * 1024;
const TENANT_STORE_BLOCK_BATCH_LIMIT = 450;
const TENANT_STORE_SCOPE_FIELDS = ['tenantId', 'tId'] as const;

function getEntityDocRef(db: admin.firestore.Firestore, entityType: 'tenant' | 'store' | 'user', entityId: string | number) {
    if (entityType === 'tenant') {
        return db.collection(DB_COLLECTIONS.TENANTS).doc(String(entityId));
    }
    if (entityType === 'store') {
        return db.collection(DB_COLLECTIONS.STORES).doc(String(entityId));
    }
    return db.collection(DB_COLLECTIONS.USERS).doc(String(entityId));
}

function getTenantStoreQueryValues(tenantId: string | number): Array<string | number> {
    const tenantIdString = String(tenantId);
    const tenantIdNumber = Number(tenantId);

    if (!Number.isFinite(tenantIdNumber)) {
        return [tenantIdString];
    }

    return [tenantIdNumber, tenantIdString];
}

async function getDirectTenantStoreIds(db: admin.firestore.Firestore, tenantId: string | number): Promise<string[]> {
    const storeIds = new Set<string>();
    const snapshots = await Promise.all(
        getTenantStoreQueryValues(tenantId).flatMap((tenantQueryValue) => TENANT_STORE_SCOPE_FIELDS.map((field) => db
            .collection(DB_COLLECTIONS.STORES)
            .where(field, '==', tenantQueryValue)
            .get())),
    );

    snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((doc) => storeIds.add(doc.id));
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
        batch.update(db.collection(DB_COLLECTIONS.STORES).doc(String(storeId)), {
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

async function syncTenantStoreBlockState(db: admin.firestore.Firestore, tenantId: string | number, tenantBlocked: boolean): Promise<string[]> {
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const [summarySnap, directStoreIds] = await Promise.all([
        summaryRef.get(),
        getDirectTenantStoreIds(db, tenantId),
    ]);
    const stores = summarySnap.exists ? (summarySnap.data()?.stores || {}) : {};
    const summaryStoreIds = Object.entries(stores)
        .filter(([, store]: [string, any]) => String(store?.tId ?? store?.tenantId ?? '') === String(tenantId))
        .map(([storeId]) => storeId);
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
    const db = admin.firestore();
    const docRef = getEntityDocRef(db, entityType, entityId);
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
        const tenantId = existingEntity.tenantId ?? entityId;
        let affectedStoreIds: string[] = [];

        if (blocked) {
            affectedStoreIds = await syncTenantStoreBlockState(db, tenantId, true);
            await docRef.update({
                blocked,
                blockDetails,
            });
        } else {
            await docRef.update({
                blocked,
                blockDetails,
            });
            affectedStoreIds = await syncTenantStoreBlockState(db, tenantId, false);
        }

        await Promise.all(affectedStoreIds.map((storeId) => revalidateStorePublicCache(storeId, tenantId)));

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
        const storeId = Number(existingEntity.storeId ?? entityId);
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
        await revalidateStorePublicCache(storeId, existingEntity.tenantId);

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
