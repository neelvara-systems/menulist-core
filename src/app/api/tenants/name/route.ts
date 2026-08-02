export const dynamic = 'force-dynamic';

import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { MENULIST_PLATFORM_USER_ROLE } from '@constant/user';
import {
    getCurrentPlatformUser,
    resolveCurrentSessionUserDocumentId,
} from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getOutletSessionScope } from '@lib/multiOutlet/outletSessionScope';
import { runTenantNamePostCommitEffects } from '@lib/multiTenant/tenantNamePostCommit';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { isMenuListPublicEntityEligible } from '@lib/publicTruth/entityEligibility';
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
const TENANT_NAME_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

function applyPrivateResponseHeaders<T extends Response>(response: T): T {
    Object.entries(TENANT_NAME_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    Object.entries(TENANT_NAME_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}
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
    resolveExactSessionPlatformRole(session) === MENULIST_PLATFORM_USER_ROLE
);

export const POST = withAuth(async (request, session) => {
    const platformSession = isPlatformSession(session);
    const sessionScope = getOutletSessionScope(session);
    if (!platformSession && !sessionScope) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }
    const platformActorId = platformSession ? resolveCurrentSessionUserDocumentId(session) : null;
    if (platformSession && (!platformActorId || !(await getCurrentPlatformUser(session)))) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }
    const limiterHash = hashPublicRateLimitValue(platformSession
        ? platformActorId!
        : `${sessionScope!.tenantDocumentId}:${sessionScope!.storeDocumentId}`);
    const rateLimit = await checkRateLimit({
        key: `tenant-name:${limiterHash}`,
        limit: 20,
        window: 3600,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const providerUnavailable = rateLimit.reason === 'provider_unavailable';
        return privateJson(
            {
                error: providerUnavailable
                    ? 'Tenant name update is temporarily unavailable'
                    : 'Too many requests',
            },
            { status: providerUnavailable ? 503 : 429 },
        );
    }

    const bodyResult = await readBoundedJsonBody(request, TENANT_NAME_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return applyPrivateResponseHeaders(bodyResult.response);
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) return privateJson({ error: 'Invalid input' }, { status: 400 });

    const tenantDocumentId = String(validation.data.tenantId);
    if (String(Number(tenantDocumentId)) !== tenantDocumentId || !Number.isSafeInteger(Number(tenantDocumentId))) {
        return privateJson({ error: 'Invalid input' }, { status: 400 });
    }
    if (!platformSession && (!sessionScope || sessionScope.tenantDocumentId !== tenantDocumentId)) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }

    const db = admin.firestore();
    if (!platformSession) {
        const currentStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(sessionScope!.storeDocumentId).get();
        const currentStore = currentStoreSnap.exists ? currentStoreSnap.data() || {} : {};
        const permissionError = await requireAnyStorePermissionForStoreData(
            request,
            session,
            currentStore,
            [PERMISSIONS.MANAGE_STORE],
            'Tenant name',
            sessionScope!.storeId,
            sessionScope!.tenantId,
        );
        if (permissionError) return applyPrivateResponseHeaders(permissionError);
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
            const tenantData = tenantSnap.data();
            if (
                !tenantSnap.exists
                || !isMenuListPublicEntityEligible(tenantData)
                || storeSnapshot.size > MAX_TENANT_NAME_STORES
            ) {
                throw new Error('tenant_name_scope_invalid');
            }
            if (!platformSession) {
                const currentStore = storeSnapshot.docs.find((store) => store.id === sessionScope!.storeDocumentId);
                const currentStoreData = currentStore?.data() || {};
                const freshPermissionError = await requireAnyStorePermissionForStoreData(
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

        const postCommit = await runTenantNamePostCommitEffects({
            chunkSize: TENANT_NAME_EFFECT_CHUNK_SIZE,
            storeIds: result.storeIds,
            tenantId: tenantDocumentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, 'tenantName'),
            },
        });
        if (postCommit.effectsPending) {
            logSecurityFailure('tenant_name_post_commit_effect_failed', postCommit.firstError, {
                route: '/api/tenants/name',
                committed: true,
                failedEffectCount: postCommit.failedEffectCount,
                storeCount: result.storeIds.length,
            });
        }
        return privateJson({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            name: validation.data.name,
            storeIds: result.storeIds,
            success: true,
            tenantId: tenantDocumentId,
        });
    } catch (error) {
        logSecurityFailure('tenant_name_update_failed', error, {
            route: '/api/tenants/name',
            committed,
            storeCount: validation.data.storesList?.length || 0,
            tenantNameLength: validation.data.name.length,
        });
        return privateJson({ error: 'Tenant name update failed' }, { status: committed ? 500 : 409 });
    }
});
