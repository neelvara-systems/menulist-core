export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { admin } from '@lib/firebase/firebaseAdmin';
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
const BRAND_PROPAGATION_SCOPE_CHANGED_CODE = 'BRAND_PROPAGATION_SCOPE_CHANGED';

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
    session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
    || session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
);

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: 'Multi-outlet disabled' }, { status: 403 });
    }

    const platformSession = isPlatformSession(session);
    const sessionScope = getOutletSessionScope(session);
    if (!platformSession && !sessionScope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const limiterScope = platformSession
        ? session.uId || session.user?.id || 'platform'
        : sessionScope!.tenantDocumentId;
    const limiterHash = hashPublicRateLimitValue(limiterScope);
    const rateLimit = await checkRateLimit({
        key: `outlet-brand-propagation:${limiterHash}`,
        limit: 30,
        window: 3600,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const bodyResult = await readBoundedJsonBody(request, BRAND_PROPAGATION_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid input',
    });
    if (bodyResult.ok === false) return bodyResult.response;
    const validation = validateAPIInput(schema, bodyResult.data);
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const tenantScope = normalizeMultiOutletNumericDocumentId(validation.data.tenantId);
    const masterStoreScope = normalizeMultiOutletNumericDocumentId(validation.data.masterStoreId);
    if (!tenantScope || !masterStoreScope) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
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
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
            || Number(masterStore?.tenantId) !== tenantScope.numericId
            || masterStore?.isMaster !== true
            || masterStore?.active === false
            || isPlatformEntityBlocked(masterStore)
        ) {
            return NextResponse.json({ error: 'Master store not found' }, { status: 404 });
        }

        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            masterStore,
            [PERMISSIONS.MANAGE_STORE, PERMISSIONS.MANAGE_OUTLETS],
            'Brand propagation',
            masterStoreScope.numericId,
            tenantScope.numericId,
        );
        if (permissionError) return permissionError;

        const fields = normalizeMasterStorePropagationFields(Object.keys(validation.data.values));
        if (fields.length === 0) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        const propagatedValues = buildBrandPropagationValues(validation.data.values, fields);
        const summaryValues = buildStoreSummaryBrandPropagationValues(propagatedValues);
        const outletQuery = db.collection(DB_COLLECTIONS.STORES)
            .where('tenantId', '==', tenantScope.numericId)
            .limit(MAX_BRAND_PROPAGATION_OUTLETS + 2);
        const propagationResult = await db.runTransaction(async (transaction) => {
            const [freshMasterSnap, outletSnapshot] = await Promise.all([
                transaction.get(masterStoreRef),
                transaction.get(outletQuery),
            ]);
            const freshMaster = freshMasterSnap.exists ? freshMasterSnap.data() || {} : {};
            if (
                !freshMasterSnap.exists
                || Number(freshMaster.tenantId) !== tenantScope.numericId
                || freshMaster.isMaster !== true
                || freshMaster.active === false
                || isPlatformEntityBlocked(freshMaster)
            ) {
                throw new BrandPropagationScopeChangedError();
            }
            const freshPermissionError = requireAnyStorePermissionForStoreData(
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
            const activeOutlets = outletSnapshot.docs.filter((storeDoc) => (
                storeDoc.id !== masterStoreScope.documentId
                && storeDoc.data()?.isMaster !== true
                && storeDoc.data()?.active !== false
                && storeDoc.data()?.deleted !== true
                && !isPlatformEntityBlocked(storeDoc.data())
            ));
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
        revalidateTag(`menu-store-${masterStoreScope.documentId}`);
        revalidateTag(`store-${masterStoreScope.documentId}`);
        if (refreshScreens) {
            await touchDigitalScreenContentVersionForStoreServer(
                masterStoreScope.documentId,
                'brandPropagation',
            );
        }
        await invalidateOwnerBusinessAssistantPacketCache({
            tId: tenantScope.documentId,
            sId: masterStoreScope.documentId,
        });
        for (const outletId of propagationResult.targetOutletIds) {
            revalidateTag(`menu-store-${outletId}`);
            revalidateTag(`store-${outletId}`);
            if (refreshScreens) {
                await touchDigitalScreenContentVersionForStoreServer(outletId, 'brandPropagation');
            }
            await invalidateOwnerBusinessAssistantPacketCache({
                tId: tenantScope.documentId,
                sId: outletId,
            });
        }
        revalidateTag('client-stores');
        if (refreshScreens) revalidateTag('screen-data');

        return NextResponse.json({
            failed: 0,
            propagated: propagationResult.targetOutletIds.length,
            skipped: propagationResult.overrideAllowed ? propagationResult.activeOutletCount : 0,
            success: true,
        });
    } catch (error) {
        if (isBrandPropagationScopeChangedError(error)) {
            return NextResponse.json({ error: 'Brand propagation scope changed' }, { status: 409 });
        }
        logMultiOutletFailure('multi_outlet_brand_propagation_failed', error, failureContext);
        return NextResponse.json({ error: 'Brand propagation failed' }, { status: 500 });
    }
});
