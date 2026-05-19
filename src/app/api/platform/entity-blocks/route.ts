export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from "@constant/database";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { buildPlatformBlockDetails } from "@lib/platform/entityBlock";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withPlatformAuth } from "../../../../middleware/auth";

const EntityBlockRequestSchema = z.object({
    blocked: z.boolean(),
    entity: z.record(z.any()).optional(),
    entityId: z.union([z.string().min(1), z.number()]),
    entityType: z.enum(['tenant', 'store', 'user']),
    reason: z.string().trim().min(1).max(500),
});

function getEntityDocRef(db: admin.firestore.Firestore, entityType: 'tenant' | 'store' | 'user', entityId: string | number) {
    if (entityType === 'tenant') {
        return db.collection(DB_COLLECTIONS.TENANTS).doc(String(entityId));
    }
    if (entityType === 'store') {
        return db.collection(DB_COLLECTIONS.STORES).doc(String(entityId));
    }
    return db.collection(DB_COLLECTIONS.USERS).doc(String(entityId));
}

async function getTenantStoreIds(db: admin.firestore.Firestore, tenantId: string | number, tenantBlocked: boolean): Promise<string[]> {
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary');
    const summarySnap = await summaryRef.get();
    const stores = summarySnap.exists ? (summarySnap.data()?.stores || {}) : {};
    const summaryStoreIds = Object.entries(stores)
        .filter(([, store]: [string, any]) => String(store?.tId ?? '') === String(tenantId))
        .map(([storeId]) => storeId);

    if (summaryStoreIds.length) {
        await summaryRef.set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            ...Object.fromEntries(
                summaryStoreIds.map((storeId) => [`stores.${storeId}.tenantBlocked`, tenantBlocked]),
            ),
        }, { merge: true });
        return summaryStoreIds;
    }

    const storesSnap = await db.collection(DB_COLLECTIONS.STORES)
        .where('tenantId', '==', Number(tenantId))
        .get();
    const fallbackStoreIds = storesSnap.docs.map((doc) => doc.id);

    if (fallbackStoreIds.length) {
        await summaryRef.set({
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            ...Object.fromEntries(
                fallbackStoreIds.map((storeId) => [`stores.${storeId}.tenantBlocked`, tenantBlocked]),
            ),
        }, { merge: true });
    }

    return fallbackStoreIds;
}

function revalidateStorePublicCache(storeId: string | number) {
    revalidateTag(`menu-store-${storeId}`);
    revalidateTag(`store-${storeId}`);
    revalidateTag('client-stores');
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
            logger.warn("[platform] Firebase Auth user missing during user block sync", {
                blocked,
                reason,
                userId: entity?.id,
            });
            return { authDisabled: blocked, authSynced: false };
        }

        throw error;
    }
}

export const POST = withPlatformAuth(async (request: NextRequest, session) => {
    const body = await request.json();
    const validation = EntityBlockRequestSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json(
            { error: "Invalid input", details: validation.error.flatten() },
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
        const tenantId = Number(existingEntity.tenantId ?? entityId);
        await docRef.update({
            blocked,
            blockDetails,
        });

        const affectedStoreIds = await getTenantStoreIds(db, tenantId, blocked);
        affectedStoreIds.forEach(revalidateStorePublicCache);

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
            [`stores.${storeId}.blocked`]: blocked,
            [`stores.${storeId}.modifiedOn`]: modifiedOn,
        }, { merge: true });
        revalidateStorePublicCache(storeId);

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
