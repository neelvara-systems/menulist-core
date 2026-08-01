export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { admin } from '@lib/firebase/firebaseAdmin';
import { runStorePublicTruthPostCommitEffects } from '@lib/cache/storePublicTruthPostCommit';
import {
    buildBrandPropagationValues,
    buildStoreSummaryBrandPropagationValues,
    hasDigitalScreenBrandPropagationFields,
    normalizeMasterStorePropagationFields,
} from '@lib/multiOutlet/brandPropagationBoundary';
import {
    getBoundedMultiOutletStringContext,
    logMultiOutletFailure,
    type MultiOutletLogContext,
} from '@lib/multiOutlet/diagnostics';
import { getOutletSessionScope } from '@lib/multiOutlet/outletSessionScope';
import { normalizeMultiOutletNumericDocumentId } from '@lib/multiOutlet/projectIdBoundary';
import { invalidateOwnerBusinessAssistantPacketCache } from '@lib/ownerBusinessAssistant/server/contextPacketCache';
import { requireAnyStorePermissionForStoreData } from '@lib/permissions/server';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { touchDigitalScreenContentVersionForStoreServer } from '@lib/screen/serverScreenInvalidation';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';

const BRAND_PROPAGATION_MAX_BODY_BYTES = 8 * 1024;
const MAX_BRAND_PROPAGATION_OUTLETS = 200;
const BRAND_PROPAGATION_EFFECT_CHUNK_SIZE = 20;
const BRAND_PROPAGATION_SCOPE_CHANGED_CODE = 'BRAND_PROPAGATION_SCOPE_CHANGED';
const BRAND_PROPAGATION_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

function applyPrivateResponseHeaders<T extends Response>(response: T): T {
    Object.entries(BRAND_PROPAGATION_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
}

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    Object.entries(BRAND_PROPAGATION_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

class BrandPropagationScopeChangedError extends Error {
    readonly code = BRAND_PROPAGATION_SCOPE_CHANGED_CODE;

    constructor() {
        super(BRAND_PROPAGATION_SCOPE_CHANGED_CODE);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = 'BrandPropagationScopeChangedError';
    }
}

const isBrandPropagationScopeChangedError = (error: unknown): error is BrandPropagationScopeChangedError => (
    error instanceof BrandPropagationScopeChangedError
    || (
        Boolean(error)
        && typeof error === 'object'
        && (error as { code?: unknown }).code === BRAND_PROPAGATION_SCOPE_CHANGED_CODE
    )
);

const nullableString = (max: number) => z.string().trim().max(max).nullable().optional();
const propagationValuesSchema = z.object({
    logo: nullableString(4096),
    phoneNumber: nullableString(100),
    currencyCode: nullableString(20),
    currencySymbol: nullableString(20),
    country: nullableString(120),
    timeZone: nullableString(120),
    defaultLanguage: nullableString(40),
    businessType: nullableString(200),
    businessCategory: nullableString(200),
}).strict().refine((values) => Object.keys(values).length > 0, 'At least one field is required');

const schema = z.object({
    masterStoreId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    tenantId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    values: propagationValuesSchema,
}).strict();

const isPlatformSession = (session: any): boolean => (
    resolveExactSessionPlatformRole(session) === ECOMSAI_PLATFORM_USER_ROLE
);

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return privateJson({ error: 'Multi-outlet disabled' }, { status: 403 });
    }

    const platformSession = isPlatformSession(session);
    const sessionScope = getOutletSessionScope(session);
    if (!platformSession && !sessionScope) {
        return privateJson({ error: 'Not onboarded' }, { status: 400 });
    }

    const platformActorId = platformSession ? resolveCurrentSessionUserDocumentId(session) : null;
    if (platformSession && !platformActorId) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }
    const limiterScope = platformSession
        ? platformActorId!
        : sessionScope!.tenantDocumentId;
    const limiterHash = hashPublicRateLimitValue(limiterScope);
    const rateLimit = await checkRateLimit({
        key: `outlet-brand-propagation:${limiterHash}`,
        limit: 30,
        window: 3600,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const providerUnavailable = rateLimit.reason === 'provider_unavailable';
        return privateJson(
            {
                error: providerUnavailable
                    ? 'Brand propagation is temporarily unavailable'
                    : 'Too many requests',
            },
            { status: providerUnavailable ? 503 : 429 },
        );
    }

    const bodyResult = await readBoundedJsonBody(request, BRAND_PROPAGATION_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return applyPrivateResponseHeaders(bodyResult.response);
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) {
        return privateJson({ error: 'Invalid input' }, { status: 400 });
    }

    const tenantScope = normalizeMultiOutletNumericDocumentId(validation.data.tenantId);
    const masterStoreScope = normalizeMultiOutletNumericDocumentId(validation.data.masterStoreId);
    if (!tenantScope || !masterStoreScope) {
        return privateJson({ error: 'Invalid input' }, { status: 400 });
    }
    if (
        !platformSession
        && (
            sessionScope!.tenantDocumentId !== tenantScope.documentId
            || sessionScope!.storeDocumentId !== masterStoreScope.documentId
            || !verifyTenantAccess(
                session,
                tenantScope.numericId,
                masterStoreScope.numericId,
                request,
            )
        )
    ) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }

    const failureContext: MultiOutletLogContext = {
        endpoint: '/api/outlets/brand-propagation',
        ...getBoundedMultiOutletStringContext('tenantId', tenantScope.documentId),
        ...getBoundedMultiOutletStringContext('masterStoreId', masterStoreScope.documentId),
        propagatedFieldCount: Object.keys(validation.data.values).length,
    };

    try {
        const db = admin.firestore();
        const masterStoreRef = db.collection(DB_COLLECTIONS.STORES).doc(masterStoreScope.documentId);
        const masterStoreSnap = await masterStoreRef.get();
        const masterStore = masterStoreSnap.data();
        if (
            !masterStoreSnap.exists
            || masterStore?.tenantId !== tenantScope.numericId
            || masterStore?.isMaster !== true
            || masterStore?.active === false
            || masterStore?.deleted === true
            || isPlatformEntityBlocked(masterStore)
        ) {
            return privateJson({ error: 'Master store not found' }, { status: 404 });
        }

        const permissionError = await requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_OUTLETS],
            'Brand propagation',
            masterStoreScope.numericId,
            tenantScope.numericId,
        );
        if (permissionError) return applyPrivateResponseHeaders(permissionError);

        const fields = normalizeMasterStorePropagationFields(Object.keys(validation.data.values));
        if (fields.length === 0) {
            return privateJson({ error: 'Invalid input' }, { status: 400 });
        }
        const propagatedValues = buildBrandPropagationValues(validation.data.values, fields);
        const summaryValues = buildStoreSummaryBrandPropagationValues(propagatedValues);
        const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId);
        const outletQuery = db.collection(DB_COLLECTIONS.STORES)
            .where('tenantId', '==', tenantScope.numericId)
            .limit(MAX_BRAND_PROPAGATION_OUTLETS + 2);
        const propagationResult = await db.runTransaction(async (transaction) => {
            const [freshMasterSnap, freshTenantSnap, outletSnapshot] = await Promise.all([
                transaction.get(masterStoreRef),
                transaction.get(tenantRef),
                transaction.get(outletQuery),
            ]);
            const freshMaster = freshMasterSnap.exists ? freshMasterSnap.data() || {} : {};
            const freshTenant = freshTenantSnap.exists ? freshTenantSnap.data() || {} : {};
            if (
                !freshMasterSnap.exists
                || !freshTenantSnap.exists
                || freshMaster.tenantId !== tenantScope.numericId
                || freshMaster.isMaster !== true
                || freshMaster.active === false
                || freshMaster.deleted === true
                || isPlatformEntityBlocked(freshMaster)
                || freshTenant.active === false
                || freshTenant.deleted === true
                || isPlatformEntityBlocked(freshTenant)
            ) {
                throw new BrandPropagationScopeChangedError();
            }
            const freshPermissionError = await requireAnyStorePermissionForStoreData(
                request,
                session,
                freshMaster,
                [PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_OUTLETS],
                'Brand propagation',
                masterStoreScope.numericId,
                tenantScope.numericId,
            );
            if (freshPermissionError) throw new BrandPropagationScopeChangedError();
            if (outletSnapshot.size > MAX_BRAND_PROPAGATION_OUTLETS + 1) {
                throw new Error('brand_propagation_outlet_limit_exceeded');
            }
            const storesList = Array.isArray(freshTenant.storesList) ? freshTenant.storesList : [];
            const masterSummary = storesList.find((store: any) => (
                String(store?.storeId) === masterStoreScope.documentId
            ));
            if (
                !masterSummary
                || masterSummary.isMaster !== true
                || masterSummary.active === false
            ) {
                throw new BrandPropagationScopeChangedError();
            }
            const canonicalOutletIds = storesList
                .filter((store: any) => (
                    String(store?.storeId) !== masterStoreScope.documentId
                    && store?.isMaster !== true
                    && store?.active !== false
                    && store?.deleted !== true
                    && store?.blocked !== true
                ))
                .map((store: any) => String(store.storeId));
            if (canonicalOutletIds.length > MAX_BRAND_PROPAGATION_OUTLETS) {
                throw new Error('brand_propagation_outlet_limit_exceeded');
            }
            const queriedStores = new Map(outletSnapshot.docs.map((storeDoc) => [storeDoc.id, storeDoc]));
            const activeOutlets = canonicalOutletIds.map((outletId) => {
                const storeDoc = queriedStores.get(outletId);
                const storeData = storeDoc?.data();
                if (
                    !storeDoc
                    || storeData?.tenantId !== tenantScope.numericId
                    || storeData?.isMaster === true
                    || storeData?.active === false
                    || storeData?.deleted === true
                    || isPlatformEntityBlocked(storeData)
                ) {
                    throw new BrandPropagationScopeChangedError();
                }
                return storeDoc;
            });
            const outletPolicy = freshMaster.outletPolicy as Record<string, unknown> | undefined;
            const overrideAllowed = outletPolicy?.canOverrideBrandIdentity === true
                || outletPolicy?.allowBrandingOverride === true;
            const targetOutlets = overrideAllowed ? [] : activeOutlets;
            const now = admin.firestore.Timestamp.now();
            const summaryEntries: Record<string, Record<string, unknown>> = {};
            transaction.set(masterStoreRef, { ...propagatedValues, modifiedOn: now }, { merge: true });
            if (Object.keys(summaryValues).length > 0) {
                summaryEntries[masterStoreScope.documentId] = { ...summaryValues, modifiedOn: now };
            }
            for (const outlet of targetOutlets) {
                transaction.set(outlet.ref, { ...propagatedValues, modifiedOn: now }, { merge: true });
                if (Object.keys(summaryValues).length > 0) {
                    summaryEntries[outlet.id] = { ...summaryValues, modifiedOn: now };
                }
            }
            if (Object.keys(summaryEntries).length > 0) {
                transaction.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'), {
                    lastUpdated: now,
                    stores: summaryEntries,
                }, { merge: true });
            }
            return {
                activeOutletCount: activeOutlets.length,
                overrideAllowed,
                targetOutletIds: targetOutlets.map((outlet) => outlet.id),
            };
        });

        const refreshScreens = hasDigitalScreenBrandPropagationFields(fields);
        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: BRAND_PROPAGATION_EFFECT_CHUNK_SIZE,
            storeIds: [masterStoreScope.documentId, ...propagationResult.targetOutletIds],
            tenantId: tenantScope.documentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: refreshScreens
                    ? (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, 'brandPropagation')
                    : async () => undefined,
            },
        });
        if (postCommit.effectsPending) {
            logMultiOutletFailure('multi_outlet_brand_propagation_post_commit_effect_failed', postCommit.firstError, {
                ...failureContext,
                failedEffectCount: postCommit.failedEffectCount,
                storeCount: propagationResult.targetOutletIds.length + 1,
            });
        }

        return privateJson({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            failed: 0,
            propagated: propagationResult.targetOutletIds.length,
            skipped: propagationResult.overrideAllowed ? propagationResult.activeOutletCount : 0,
            success: true,
        });
    } catch (error) {
        if (isBrandPropagationScopeChangedError(error)) {
            return privateJson({ error: 'Brand propagation scope changed' }, { status: 409 });
        }
        logMultiOutletFailure('multi_outlet_brand_propagation_failed', error, failureContext);
        return privateJson({ error: 'Brand propagation failed' }, { status: 500 });
    }
});
