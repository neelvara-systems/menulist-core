export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getOutletSessionScope } from '@lib/multiOutlet/outletSessionScope';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { logSecurityFailure } from '@lib/security/securityDiagnostics';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const TENANT_NAME_MAX_BODY_BYTES = 32 * 1024;
const MAX_TENANT_NAME_STORES = 200;
const TENANT_NAME_EFFECT_CHUNK_SIZE = 20;
const storeListNameSchema = z.object({
    name: z.string().trim().min(1).max(200).optional(),
    storeId: z.union([z.string().regex(/^[1-9][0-9]*$/), z.number().int().positive()]),
}).strict();
const schema = z.object({
    name: z.string().trim().min(1).max(200),
    storesList: z.array(storeListNameSchema).max(MAX_TENANT_NAME_STORES).optional(),
    tenantId: z.union([z.string().regex(/^[1-9][0-9]*$/), z.number().int().positive()]),
}).strict();

const isPlatformSession = (session: any): boolean => (
    session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
    || session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
);

export const POST = withAuth(async (request, session) => {
    const platformSession = isPlatformSession(session);
    const sessionScope = getOutletSessionScope(session);
    if (!platformSession && !sessionScope) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const limiterHash = hashPublicRateLimitValue(platformSession
        ? session?.uId || session?.user?.id || 'platform'
        : `${sessionScope!.tenantDocumentId}:${sessionScope!.storeDocumentId}`);
    const rateLimit = await checkRateLimit({
        key: `tenant-name:${limiterHash}`,
        limit: 20,
        window: 3600,
    });
    if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const bodyResult = await readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    const tenantDocumentId = String(validation.data.tenantId);
    if (String(Number(tenantDocumentId)) !== tenantDocumentId || !Number.isSafeInteger(Number(tenantDocumentId))) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    if (!platformSession && (!sessionScope || sessionScope.tenantDocumentId !== tenantDocumentId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = admin.firestore();
    if (!platformSession) {
        const currentStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(sessionScope!.storeDocumentId).get();
        const currentStore = currentStoreSnap.exists ? currentStoreSnap.data() || {} : {};
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            currentStore,
            [PERMISSIONS.MANAGE_STORE],
            'Tenant name',
            sessionScope!.storeId,
            sessionScope!.tenantId,
        );
        if (permissionError) return permissionError;
    }

    let committed = false;
    try {
        const requestedNames = new Map(validation.data.storesList?.map((store) => [
            String(store.storeId),
            store.name,
        ]) || []);
        const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);
        const storeQuery = db.collection(DB_COLLECTIONS.STORES)
            .where('tenantId', '==', Number(tenantDocumentId))
            .limit(MAX_TENANT_NAME_STORES + 1);
        const result = await db.runTransaction(async (transaction) => {
            const [tenantSnap, storeSnapshot] = await Promise.all([
                transaction.get(tenantRef),
                transaction.get(storeQuery),
            ]);
            if (!tenantSnap.exists || storeSnapshot.size > MAX_TENANT_NAME_STORES) {
                throw new Error('tenant_name_scope_invalid');
            }
            if (!platformSession) {
                const currentStore = storeSnapshot.docs.find((store) => store.id === sessionScope!.storeDocumentId);
                const currentStoreData = currentStore?.data() || {};
                const freshPermissionError = requireAnyStorePermissionForStoreData(
                    request,
                    session,
                    currentStoreData,
                    [PERMISSIONS.MANAGE_STORE],
                    'Tenant name',
                    sessionScope!.storeId,
                    sessionScope!.tenantId,
                );
                if (
                    !currentStore
                    || currentStoreData.active === false
                    || currentStoreData.deleted === true
                    || isPlatformEntityBlocked(currentStoreData)
                    || freshPermissionError
                ) {
                    throw new Error('tenant_name_scope_invalid');
                }
            }

            const currentStoresList = Array.isArray(tenantSnap.data()?.storesList)
                ? tenantSnap.data()?.storesList
                : [];
            const updatedStoresList = currentStoresList.map((store: unknown) => {
                if (!store || typeof store !== 'object' || Array.isArray(store)) return store;
                const record = store as Record<string, unknown>;
                const requestedName = requestedNames.get(String(record.storeId || ''));
                return {
                    ...record,
                    ...(requestedName ? { name: requestedName } : {}),
                    tenantName: validation.data.name,
                };
            });
            const now = admin.firestore.Timestamp.now();
            transaction.update(tenantRef, {
                name: validation.data.name,
                storesList: updatedStoresList,
                modifiedOn: now,
            });
            const summaryEntries: Record<string, Record<string, unknown>> = {};
            for (const store of storeSnapshot.docs) {
                transaction.set(store.ref, { tenantName: validation.data.name, modifiedOn: now }, { merge: true });
                summaryEntries[store.id] = { tenantName: validation.data.name, modifiedOn: now };
            }
            if (Object.keys(summaryEntries).length > 0) {
                transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
                    lastUpdated: now,
                    stores: summaryEntries,
                }, { merge: true });
            }
            return { storeIds: storeSnapshot.docs.map((store) => store.id) };
        });
        committed = true;

        for (let offset = 0; offset < result.storeIds.length; offset += TENANT_NAME_EFFECT_CHUNK_SIZE) {
            const storeIds = result.storeIds.slice(offset, offset + TENANT_NAME_EFFECT_CHUNK_SIZE);
            storeIds.forEach((storeId) => {
                revalidateTag(`menu-store-${storeId}`);
                revalidateTag(`store-${storeId}`);
            });
            await Promise.all(storeIds.flatMap((storeId) => [
                touchDigitalScreenContentVersionForStoreServer(storeId, 'tenantName'),
                invalidateOwnerBusinessAssistantPacketCache({ tId: tenantDocumentId, sId: storeId }),
            ]));
        }
        revalidateTag('client-stores');
        revalidateTag('screen-data');
        return NextResponse.json({ name: validation.data.name, storeIds: result.storeIds, success: true, tenantId: tenantDocumentId });
    } catch (error) {
        logSecurityFailure('tenant_name_update_failed', error, {
            route: '/api/tenants/name',
            committed,
            storeCount: validation.data.storesList?.length || 0,
            tenantNameLength: validation.data.name.length,
        });
        return NextResponse.json({ error: 'Tenant name update failed' }, { status: committed ? 500 : 409 });
    }
});
