export const dynamic = 'force-dynamic';

/**
 * Answerlattice Client Onboarding API
 *
 * Creates a new Answerlattice tenant (tenant + store + subscription) for a SaaS founder.
 * Reuses the existing atomic transaction pattern from product subscription creation.
 *
 * Flow:
 * 1. User signs up via Google OAuth (existing NextAuth)
 * 2. User selects plan on answerlattice.com/get-started
 * 3. This route creates: tenant, store, user update, Razorpay subscription
 * 4. User completes payment → subscription activates via existing webhook
 *
 * Creates a paid Razorpay subscription in pending state. No unpaid plan is created.
 *
 * @see __docs__/answerlattice/client-onboarding/
 */

import {
    FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticePlanById } from '@data/answerlattice/plans';
import {
    BillingTaxConfigurationError,
    BillingTaxProfileError,
    normalizeBillingProfile,
} from '@data/shared/billingTaxPolicy';
import {
    SELF_REPORTED_DISCOVERY_CHANNELS,
    buildSelfReportedDiscoveryAttribution,
} from '@data/shared/selfReportedDiscovery';
import { getOwnerRoleId } from '@data/defaultRoles';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { repairAnswerlatticeStaffAccessProjections } from '@lib/answerlattice/staffAccessServer';
import { requireAnswerlatticeOnboardingUserId } from '@lib/answerlattice/onboardingUserIdBoundary';
import {
    ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS,
    ANSWERLATTICE_ONBOARDING_STATUS,
    answerlatticeProviderSubscriptionMatchesAttempt,
    buildAnswerlatticeOnboardingRequestFingerprint,
    findAnswerlatticeProviderSubscriptionForAttempt,
    getAnswerlatticeProviderSubscriptionCheckoutUrl,
    getAnswerlatticeOnboardingPositiveInteger,
    getAnswerlatticeOnboardingTimestampMillis,
    isAnswerlatticeTerminalProviderSubscriptionStatus,
    shouldHoldAnswerlatticeOnboardingProviderRecovery,
    type AnswerlatticeProviderSubscriptionCandidate,
    } from '@lib/answerlattice/onboardingProvisioning';
import {
    AnswerlatticeOnboardingConflictError,
    answerlatticeProvisioningOwnershipMatches,
    compensateAnswerlatticeOnboardingProvisioning,
    markAnswerlatticeOnboardingProviderRecoveryPending,
    persistAnswerlatticePendingSubscription,
    type AnswerlatticeProvisioningScope,
    } from '@lib/answerlattice/onboardingProvisioningServer';
import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';
import {
    calculateConfiguredAnswerlatticeTax,
    resolveAnswerlatticeBillingCurrency,
} from '@lib/billing/answerlatticeTaxServer';
import { ANSWERLATTICE_PRODUCT_ACCOUNT_KEY,
    normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { buildAnswerlatticeWidgetApiStateWithNewKey } from '@lib/answerlattice/widgetKeyManager';
import {
    getContextContentSummaryDocId,
    parseProductSurfaceSaveInput,
    } from '@lib/answerlattice/productSurfaceContent';
import { upsertAnswerlatticeTenantSummaryAdmin } from '@lib/answerlattice/tenantSummaryAdmin';
import {
    initializeAnswerlatticeCompiledContextControlPlaneAdmin,
    markAnswerlatticeCompiledContextSourceChangedAdmin,
    } from '@lib/answerlattice/compiledSourceVersionsAdmin';
import {
    normalizeAnswerlatticeBusinessDayEndTime,
    normalizeAnswerlatticeTimeZone,
    } from '@lib/answerlattice/schedulerSettings';
import { answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { shouldUseSharedAnswerlatticeFirebase } from '@lib/firebase/answerlatticeConfig';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getCurrentUser, isCurrentUserRecordEligible } from '@lib/auth/currentPlatformUser';
import { createTenantStoreInTransaction } from '@lib/onboarding/createTenantStore';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import {
    getBoundedRuntimeStringContext,
    logRuntimeFailure,
} from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { hashApiKey } from '@lib/publicApi/auth';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';
import { writeLogEntry } from 'logs/utils';
import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BillingProfileSchema } from '@lib/validation/apiSchemas';
import { withAuth } from '../../../../middleware/auth';

const LOG_FILE = 'answerlattice-onboarding.log';
const OptionalHttpUrlSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().url().max(300).refine((value) => {
        try {
            const parsed = new URL(value);
            return ['http:', 'https:'].includes(parsed.protocol)
                && !parsed.username
                && !parsed.password;
        } catch {
            return false;
        }
    }).optional(),
);
const OptionalEmailSchema = z.preprocess(
    (value) => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().trim().email().max(160).optional(),
);
const BillingModelSchema = z.enum(['subscription', 'usage', 'one_time', 'not_sure']);
const OnboardRequestSchema = z.object({
    companyName: z.string().trim().min(2).max(120),
    productName: z.string().trim().max(120).optional(),
    productUrl: OptionalHttpUrlSchema,
    supportEmail: OptionalEmailSchema,
    billingModel: BillingModelSchema.optional().default('subscription'),
    primarySurfaces: z.array(z.string().trim().min(1).max(80)).max(8).optional().default([]),
    timeZone: z.string().trim().max(80).optional(),
    businessDayEndTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
    planId: z.string().trim().max(80).optional().default('answerlattice_launch'),
    interval: z.literal('MONTH').optional().default('MONTH'),
    billingProfile: BillingProfileSchema,
    selfReportedDiscoveryChannel: z.enum(SELF_REPORTED_DISCOVERY_CHANNELS).optional(),
}).strict();
const ANSWERLATTICE_ONBOARD_MAX_BODY_BYTES = 32 * 1024;
const ANSWERLATTICE_ONBOARDING_ACTIVE_ATTEMPT_MS = 2 * 60 * 1000;
const ANSWERLATTICE_PROVIDER_RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const ANSWERLATTICE_PROVIDER_RECOVERY_PAGE_SIZE = 100;
const ANSWERLATTICE_PROVIDER_RECOVERY_MAX_PAGES = 3;
type AnswerlatticeOnboardingProviderContractErrorCode =
    | 'answerlattice_onboarding_provider_checkout_url_invalid'
    | 'answerlattice_onboarding_provider_subscription_id_missing'
    | 'answerlattice_onboarding_provider_subscription_invalid'
    | 'answerlattice_onboarding_provider_total_count_invalid';

class AnswerlatticeOnboardingProviderContractError extends Error {
    readonly code: AnswerlatticeOnboardingProviderContractErrorCode;

    constructor(code: AnswerlatticeOnboardingProviderContractErrorCode) {
        super(code);
        this.name = 'AnswerlatticeOnboardingProviderContractError';
        this.code = code;
    }
}

const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

const answerlatticeOnboardingJson = (body: unknown, init: ResponseInit = {}) => {
    const headers = new Headers(init.headers);
    Object.entries(PRIVATE_NO_STORE_HEADERS).forEach(([name, value]) => headers.set(name, value));
    return NextResponse.json(body, { ...init, headers });
};

type AnswerlatticeOnboardingResumeScope = AnswerlatticeProvisioningScope & {
    providerSubscriptionId: string | null;
    recoveryAvailableAt: unknown;
    startedAtMillis: number;
    storeName: string;
};

type AnswerlatticePendingSubscriptionSummary = {
    amount: number;
    creditsLastResetMonth: number;
    currency: FirestoreSubscriptionDoc['currency'];
    id: string;
    isBeta: false;
    monthlyCredits: number;
    monthlyCreditsAllowance: number;
    pId: typeof PRODUCT_IDS.ANSWERLATTICE;
    planId: string;
    planName: string;
    providerSubscriptionId: string;
    providerStatus: 'created';
    sId: number;
    shortUrl: string;
    status: 'pending';
    subscriptionEndDate: null;
    tId: number;
    topUpCredits: number;
    updatedAt: FirebaseFirestore.Timestamp;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const parseAnswerlatticePendingOnboardingSummary = (
    raw: unknown,
    scope: AnswerlatticeProvisioningScope,
) => {
    if (!isPlainRecord(raw)) throw new Error('answerlattice_onboarding_pending_summary_invalid');
    const subscriptionId = normalizeAnswerlatticeSubscriptionId(raw.id);
    const providerSubscriptionId = normalizeAnswerlatticeSubscriptionId(raw.providerSubscriptionId);
    const currency = raw.currency === 'INR' || raw.currency === 'USD' ? raw.currency : null;
    const amount = getAnswerlatticeOnboardingPositiveInteger(raw.amount);
    const planId = typeof raw.planId === 'string' ? raw.planId.trim() : '';
    const plan = getAnswerlatticePlanById(planId, 'MONTH');
    const shortUrl = normalizeRazorpaySubscriptionCheckoutUrl(raw.shortUrl);
    if (
        !subscriptionId
        || providerSubscriptionId !== subscriptionId
        || !currency
        || amount === null
        || !plan
        || !shortUrl
        || raw.status !== 'pending'
        || (raw.providerStatus !== undefined && raw.providerStatus !== 'created')
        || raw.pId !== PRODUCT_IDS.ANSWERLATTICE
        || normalizeAnswerlatticeScopeDocumentId(raw.tId) !== scope.tenantId
        || normalizeAnswerlatticeScopeDocumentId(raw.sId) !== scope.storeId
    ) {
        throw new Error('answerlattice_onboarding_pending_summary_invalid');
    }

    return {
        amount,
        currency,
        plan,
        shortUrl,
        subscriptionId,
    };
};

const ONBOARDING_SURFACE_TEMPLATES: Record<string, {
    label: string;
    routePatterns: string[];
    feature: string;
    page: string;
    workflow?: string;
    entityHints: string[];
    tags: string[];
    priority: number;
}> = {
    billing: {
        label: 'Billing',
        routePatterns: ['/billing', '/billing/*', '/settings/billing/*'],
        feature: 'billing',
        page: 'billing',
        workflow: 'manage_subscription',
        entityHints: ['invoice', 'subscription', 'payment'],
        tags: ['billing', 'subscription'],
        priority: 120,
    },
    onboarding: {
        label: 'Onboarding',
        routePatterns: ['/onboarding', '/setup/*', '/get-started/*'],
        feature: 'onboarding',
        page: 'setup',
        workflow: 'complete_setup',
        entityHints: ['setup', 'import', 'activation'],
        tags: ['onboarding', 'setup'],
        priority: 110,
    },
    settings: {
        label: 'Settings',
        routePatterns: ['/settings', '/settings/*'],
        feature: 'settings',
        page: 'settings',
        workflow: 'manage_workspace',
        entityHints: ['settings', 'workspace', 'configuration'],
        tags: ['settings'],
        priority: 100,
    },
    team: {
        label: 'Team',
        routePatterns: ['/team', '/settings/team/*', '/users/*'],
        feature: 'team',
        page: 'members',
        workflow: 'manage_team',
        entityHints: ['user', 'role', 'permission'],
        tags: ['team', 'permissions'],
        priority: 90,
    },
    integrations: {
        label: 'Integrations',
        routePatterns: ['/integrations', '/integrations/*', '/settings/integrations/*'],
        feature: 'integrations',
        page: 'integrations',
        workflow: 'connect_integration',
        entityHints: ['integration', 'api', 'connection'],
        tags: ['integrations'],
        priority: 80,
    },
    release_notes: {
        label: 'Release Notes',
        routePatterns: ['/releases', '/changelog', '/whats-new'],
        feature: 'release_notes',
        page: 'releases',
        workflow: 'review_changes',
        entityHints: ['release', 'change', 'update'],
        tags: ['release_notes', 'changelog'],
        priority: 70,
    },
};

const DEFAULT_ONBOARDING_SURFACES = ['billing', 'onboarding', 'settings'];

const normalizeOnboardingSurfaces = (values: string[]): string[] => {
    const selected = Array.from(new Set(
        values
            .map(value => value.trim().toLowerCase())
            .filter(value => Boolean(ONBOARDING_SURFACE_TEMPLATES[value]))
    ));

    return selected.length ? selected : DEFAULT_ONBOARDING_SURFACES;
};

const bootstrapInitialProductSurfaces = async (params: {
    db: FirebaseFirestore.Firestore;
    tId: number;
    sId: number;
    userId: string;
    surfaceKeys: string[];
}): Promise<{ createdCount: number; surfaceCount: number }> => {
    const surfaceKeys = normalizeOnboardingSurfaces(params.surfaceKeys);
    const userId = requireAnswerlatticeOnboardingUserId(params.userId);
    const surfaces = surfaceKeys.map((surfaceKey) => {
        const template = ONBOARDING_SURFACE_TEMPLATES[surfaceKey];
        const parsed = parseProductSurfaceSaveInput({
            key: surfaceKey,
            label: template.label,
            description: `Initial ${template.label.toLowerCase()} product surface from Answerlattice onboarding.`,
            routePatterns: template.routePatterns,
            feature: template.feature,
            page: template.page,
            workflow: template.workflow,
            entityHints: template.entityHints,
            tags: template.tags,
            active: true,
            priority: template.priority,
            visibility: { helpWidget: true, helpCenter: true, changelog: true },
        }, { tId: params.tId, sId: params.sId });
        const docId = `${params.tId}_${params.sId}_${parsed.key}`;
        return {
            docRef: params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_PRODUCT_SURFACES).doc(docId),
            parsed,
        };
    });
    const summaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getContextContentSummaryDocId(params.tId, params.sId));
    return params.db.runTransaction(async (transaction) => {
        const [surfaceSnapshots, summarySnapshot] = await Promise.all([
            Promise.all(surfaces.map(({ docRef }) => transaction.get(docRef))),
            transaction.get(summaryRef),
        ]);
        const now = admin.firestore.Timestamp.now();
        const surfaceSummary: Record<string, unknown> = {};
        let createdCount = 0;
        surfaces.forEach(({ docRef, parsed }, index) => {
            const snapshot = surfaceSnapshots[index];
            if (!snapshot.exists) {
                transaction.create(docRef, {
                    ...parsed,
                    createdOn: now,
                    modifiedOn: now,
                    createdBy: userId,
                    modifiedBy: userId,
                    uId: userId,
                    onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                });
                createdCount += 1;
            }
            surfaceSummary[parsed.key] = {
                key: parsed.key,
                label: parsed.label,
                routePatterns: parsed.routePatterns,
                feature: parsed.feature,
                page: parsed.page,
                workflow: parsed.workflow,
                entityHints: parsed.entityHints,
                entityIds: [],
                tags: parsed.tags,
                visibility: parsed.visibility,
                articles: [],
                changelogs: [],
                tickets: { total: 0, open: 0, recentDisplayIds: [] },
            };
        });
        if (!summarySnapshot.exists) {
            transaction.create(summaryRef, {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: params.tId,
                sId: params.sId,
                generatedAt: now,
                source: 'client_onboarding_surface_bootstrap',
                surfaceCount: surfaceKeys.length,
                articleCount: 0,
                changelogCount: 0,
                ticketCount: 0,
                surfaces: surfaceSummary,
            });
        }
        return { createdCount, surfaceCount: surfaceKeys.length };
    });
};

const getAnswerlatticeDb = () => {
    const db = shouldUseSharedAnswerlatticeFirebase
        ? admin.firestore()
        : answerlatticeFirestoreAdmin;

    return db && typeof (db as { collection?: unknown }).collection === 'function' ? db : null;
};

const getAnswerlatticeUserForOnboarding = async (
    db: FirebaseFirestore.Firestore,
    userId: string,
    email?: string | null,
) => {
    const directSnapshot = await db.collection(DB_COLLECTIONS.USERS).doc(userId).get();
    if (directSnapshot.exists) {
        return { id: directSnapshot.id, ...(directSnapshot.data() || {}) } as Record<string, unknown>;
    }

    const normalizedEmail = String(email || '').toLowerCase().trim();
    if (!normalizedEmail) return null;

    const snapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('email', '==', normalizedEmail)
        .limit(2)
        .get();

    if (snapshot.empty) return null;
    if (snapshot.size !== 1) {
        throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Record<string, unknown>;
};

const getProvisioningScopeFromUser = (
    user: Record<string, unknown>,
    userId: string,
): AnswerlatticeOnboardingResumeScope | null => {
    const tenantId = normalizeAnswerlatticeScopeDocumentId(user.tenantId);
    const compactTenantId = normalizeAnswerlatticeScopeDocumentId(user.tId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(user.storeId);
    const compactStoreId = normalizeAnswerlatticeScopeDocumentId(user.sId);
    const attemptId = String(user.onboardingAttemptId || '').trim();
    const requestFingerprint = String(user.onboardingRequestFingerprint || '').trim();
    if (
        user.id !== userId
        || user.pId !== PRODUCT_IDS.ANSWERLATTICE
        || user.productId !== PRODUCT_IDS.ANSWERLATTICE
        || !tenantId
        || compactTenantId !== tenantId
        || !storeId
        || compactStoreId !== storeId
        || !attemptId
        || !requestFingerprint
    ) {
        return null;
    }

    const matchingStore = Array.isArray(user.stores)
        ? user.stores.find((store) => (
            isPlainRecord(store) && normalizeAnswerlatticeScopeDocumentId(store.storeId) === storeId
        ))
        : undefined;
    const storeName = isPlainRecord(matchingStore) && typeof matchingStore.name === 'string'
        ? matchingStore.name.trim()
        : '';
    return {
        attemptId,
        providerSubscriptionId: normalizeAnswerlatticeSubscriptionId(user.onboardingProviderSubscriptionId),
        recoveryAvailableAt: user.onboardingProviderRecoveryAvailableAt,
        requestFingerprint,
        startedAtMillis: getAnswerlatticeOnboardingTimestampMillis(user.onboardingStartedAt),
        storeId,
        storeName,
        tenantId,
        userId,
    };
};

const recoverAnswerlatticeProviderSubscription = async (params: {
    attemptId: string;
    planId: string;
    providerPlanId: string;
    startedAtMillis: number;
    storeId: number;
    tenantId: number;
}): Promise<AnswerlatticeProviderSubscriptionCandidate | null> => {
    const { razorpayClient } = await import('@lib/razorpay/razorpay');
    const from = Math.max(946684800, Math.floor((params.startedAtMillis - ANSWERLATTICE_PROVIDER_RECOVERY_WINDOW_MS) / 1000));
    const to = Math.floor((Date.now() + ANSWERLATTICE_PROVIDER_RECOVERY_WINDOW_MS) / 1000);

    for (let page = 0; page < ANSWERLATTICE_PROVIDER_RECOVERY_MAX_PAGES; page += 1) {
        const response = await razorpayClient.subscriptions.all({
            count: ANSWERLATTICE_PROVIDER_RECOVERY_PAGE_SIZE,
            from,
            plan_id: params.providerPlanId,
            skip: page * ANSWERLATTICE_PROVIDER_RECOVERY_PAGE_SIZE,
            to,
        });
        const match = findAnswerlatticeProviderSubscriptionForAttempt({
            attemptId: params.attemptId,
            candidates: response.items,
            planId: params.planId,
            providerPlanId: params.providerPlanId,
            storeId: params.storeId,
            tenantId: params.tenantId,
        });
        if (match) return match;
        if (response.items.length < ANSWERLATTICE_PROVIDER_RECOVERY_PAGE_SIZE) break;
    }

    return null;
};

const writeAnswerlatticeOnboardingLog = async (
    logType: string,
    data: Record<string, unknown>,
): Promise<void> => {
    try {
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType,
            data,
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_onboard_log_write_failed', error, {
            ...getBoundedRuntimeStringContext('logType', logType),
        });
    }
};

class AnswerlatticeOnboardingAccessEndedError extends Error {
    constructor() {
        super('Answerlattice onboarding access ended');
        this.name = 'AnswerlatticeOnboardingAccessEndedError';
    }
}

const syncDefaultAuthProductAccount = async (params: {
    userId: string;
    session: unknown;
    tenantId: number;
    storeId: number;
    storeName: string;
}) => {
    const userId = requireAnswerlatticeOnboardingUserId(params.userId);
    const defaultDb = admin.firestore();
    await defaultDb.runTransaction(async (transaction) => {
        const userRef = defaultDb.collection(DB_COLLECTIONS.USERS).doc(userId);
        const userSnapshot = await transaction.get(userRef);
        const userData = userSnapshot.data();
        if (
            !userSnapshot.exists
            || !isCurrentUserRecordEligible({
                documentId: userSnapshot.id,
                session: params.session,
                userData,
            })
        ) {
            throw new AnswerlatticeOnboardingAccessEndedError();
        }

        const currentUserData = userData as Record<string, unknown>;
        if (
            currentUserData.productAccounts !== undefined
            && !isPlainRecord(currentUserData.productAccounts)
        ) {
            throw new AnswerlatticeOnboardingAccessEndedError();
        }
        const productAccounts = isPlainRecord(currentUserData.productAccounts)
            ? currentUserData.productAccounts
            : {};
        const existingProductAccount = productAccounts[ANSWERLATTICE_PRODUCT_ACCOUNT_KEY];
        if (existingProductAccount !== undefined) {
            if (
                !isPlainRecord(existingProductAccount)
                || normalizeAnswerlatticeScopeDocumentId(existingProductAccount.tenantId) !== params.tenantId
                || normalizeAnswerlatticeScopeDocumentId(existingProductAccount.storeId) !== params.storeId
            ) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
            }
        }

        const now = admin.firestore.Timestamp.now();
        const role = getOwnerRoleId();
        const defaultUserUpdate: Record<string, unknown> = {
            productAccounts: {
                ...productAccounts,
                [ANSWERLATTICE_PRODUCT_ACCOUNT_KEY]: {
                    active: true,
                    isVerified: true,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    tenantId: params.tenantId,
                    storeId: params.storeId,
                    role,
                    platformRole: 'OWNER',
                    storeIds: [params.storeId],
                    updatedAt: now,
                },
            },
            modifiedOn: now,
        };
        const rootTenantMissing = currentUserData.tenantId === undefined || currentUserData.tenantId === null || currentUserData.tenantId === '';
        const rootStoreMissing = currentUserData.storeId === undefined || currentUserData.storeId === null || currentUserData.storeId === '';
        if (rootTenantMissing && rootStoreMissing) {
            defaultUserUpdate.tenantId = params.tenantId;
            defaultUserUpdate.storeId = params.storeId;
            defaultUserUpdate.pId = PRODUCT_IDS.ANSWERLATTICE;
            defaultUserUpdate.productId = PRODUCT_IDS.ANSWERLATTICE;
            defaultUserUpdate.role = role;
            defaultUserUpdate.stores = [{
                storeId: params.storeId,
                name: params.storeName,
                role,
            }];
        }

        transaction.set(userRef, defaultUserUpdate, { merge: true });
    });
};

const syncAnswerlatticeOnboardingAccess = async (params: {
    db: FirebaseFirestore.Firestore;
    session: unknown;
    storeId: number;
    storeName: string;
    tenantId: number;
    userId: string;
}): Promise<void> => {
    await syncDefaultAuthProductAccount(params);

    const userSnapshot = await params.db
        .collection(DB_COLLECTIONS.USERS)
        .doc(requireAnswerlatticeOnboardingUserId(params.userId))
        .get();
    const userData = userSnapshot.data();
    if (!userSnapshot.exists || !userData) {
        throw new Error('ANSWERLATTICE_ONBOARDING_ACCESS_USER_MISSING');
    }

    const projectionsComplete = await repairAnswerlatticeStaffAccessProjections({
        data: userData,
        fallbackStoreId: params.storeId,
        operation: 'answerlattice_onboarding_finalization',
        syncClaims: true,
        userId: params.userId,
    });
    if (!projectionsComplete) {
        throw new Error('ANSWERLATTICE_ONBOARDING_ACCESS_SYNC_FAILED');
    }
};

const repairAnswerlatticePostFinalizationState = async (params: {
    businessDayEndTime: string;
    db: FirebaseFirestore.Firestore;
    storeId: number;
    surfaceKeys: string[];
    tenantId: number;
    timeZone: string;
    userId: string;
}): Promise<number> => {
    let initialSurfaceCount = 0;
    let createdSurfaceCount = 0;
    await bootstrapInitialProductSurfaces({
        db: params.db,
        tId: params.tenantId,
        sId: params.storeId,
        userId: params.userId,
        surfaceKeys: params.surfaceKeys,
    }).then((result) => {
        initialSurfaceCount = result.surfaceCount;
        createdSurfaceCount = result.createdCount;
    }).catch((surfaceError) => {
        logRuntimeFailure('answerlattice_onboard_initial_surface_bootstrap_failed', surfaceError, {
            ...getBoundedRuntimeStringContext('tenantId', params.tenantId),
            ...getBoundedRuntimeStringContext('storeId', params.storeId),
            ...getBoundedRuntimeStringContext('userId', params.userId),
        });
    });
    await upsertAnswerlatticeTenantSummaryAdmin({
        tId: params.tenantId,
        sId: params.storeId,
        source: 'client_onboarding',
        active: true,
        hasEntities: false,
        timeZone: params.timeZone,
        businessDayEndTime: params.businessDayEndTime,
    }).catch((summaryError) => {
        logRuntimeFailure('answerlattice_onboard_tenant_summary_sync_failed', summaryError, {
            ...getBoundedRuntimeStringContext('tenantId', params.tenantId),
            ...getBoundedRuntimeStringContext('storeId', params.storeId),
            ...getBoundedRuntimeStringContext('userId', params.userId),
        });
    });
    await initializeAnswerlatticeCompiledContextControlPlaneAdmin(params.tenantId, params.storeId, {
        reason: 'client_onboarding',
        sourceType: 'answerlattice_workspace',
    }).then(async () => {
        if (createdSurfaceCount > 0) {
            await markAnswerlatticeCompiledContextSourceChangedAdmin('surfaces', params.tenantId, params.storeId, {
                reason: 'initial_surfaces_created',
                sourceType: 'answerlattice_product_surfaces',
            });
        }
    }).catch((bundleInitError) => {
        logRuntimeFailure('answerlattice_onboard_context_control_plane_init_failed', bundleInitError, {
            ...getBoundedRuntimeStringContext('tenantId', params.tenantId),
            ...getBoundedRuntimeStringContext('storeId', params.storeId),
            ...getBoundedRuntimeStringContext('userId', params.userId),
        });
    });
    return initialSurfaceCount;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    const rawUserId = session.user.id;
    let db: FirebaseFirestore.Firestore | null = null;
    let localFinalizationComplete = false;
    let providerCreateAttempted = false;
    let providerOutcomeMayExist = false;
    let recoveryAvailableAtForRetry: unknown = null;
    let providerSubscriptionId: string | null = null;
    let provisioningScope: AnswerlatticeProvisioningScope | null = null;
    let tenantIdForLog: number | string | undefined;
    let storeIdForLog: number | string | undefined;
    let userIdForLog: string | undefined;

    try {
        const userId = requireAnswerlatticeOnboardingUserId(rawUserId);
        userIdForLog = userId;

        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
            return answerlatticeOnboardingJson(
                { code: 'ANSWERLATTICE_ONBOARDING_UNAVAILABLE', error: 'Answerlattice onboarding is not available yet.' },
                { status: 403 },
            );
        }

        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const rateLimitResult = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey('answerlattice-onboard', userId),
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            if (providerUnavailable) {
                return answerlatticeOnboardingJson({
                    code: 'ANSWERLATTICE_ONBOARDING_TEMPORARILY_UNAVAILABLE',
                    error: 'Answerlattice onboarding is temporarily unavailable. Please try again later.',
                }, { status: 503 });
            }
            const retryAfter = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
            return answerlatticeOnboardingJson({
                code: 'ANSWERLATTICE_ONBOARDING_RATE_LIMITED',
                error: 'Too many attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt,
            }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });
        }

        const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_ONBOARD_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Company name is required (min 2 chars).',
            tooLargeMessage: 'Request body too large.',
        });
        if (bodyResult.ok === false) {
            return answerlatticeOnboardingJson({
                code: bodyResult.response.status === 413
                    ? 'ANSWERLATTICE_ONBOARDING_BODY_TOO_LARGE'
                    : 'ANSWERLATTICE_ONBOARDING_INPUT_INVALID',
                error: bodyResult.response.status === 413
                    ? 'Request body too large.'
                    : 'Company name is required (min 2 chars).',
            }, { status: bodyResult.response.status });
        }

        const validation = OnboardRequestSchema.safeParse(bodyResult.data);
        if (!validation.success) {
            return answerlatticeOnboardingJson({
                code: 'ANSWERLATTICE_ONBOARDING_INPUT_INVALID',
                error: 'Company name is required (min 2 chars).',
            }, { status: 400 });
        }
        const {
            companyName,
            productName,
            productUrl,
            supportEmail,
            billingModel,
            primarySurfaces,
            planId,
            interval,
            billingProfile: rawBillingProfile,
            timeZone,
            businessDayEndTime,
            selfReportedDiscoveryChannel,
        } = validation.data;
        const billingProfile = normalizeBillingProfile(rawBillingProfile);
        const currency = resolveAnswerlatticeBillingCurrency(billingProfile.countryCode);
        const plan = getAnswerlatticePlanById(planId, interval);
        if (!plan) {
            return answerlatticeOnboardingJson({ code: 'ANSWERLATTICE_PLAN_NOT_FOUND', error: 'Plan not found.' }, { status: 404 });
        }
        const selectedPrice = currency === 'USD' ? plan.priceUSD.price : plan.priceINR.price;
        if (!Number.isFinite(selectedPrice) || selectedPrice <= 0) {
            return answerlatticeOnboardingJson({ code: 'ANSWERLATTICE_PAID_PLAN_REQUIRED', error: 'Paid plan is required.' }, { status: 400 });
        }

        db = getAnswerlatticeDb();
        if (!db) {
            return answerlatticeOnboardingJson(
                { code: 'ANSWERLATTICE_FIREBASE_UNAVAILABLE', error: 'Answerlattice Firebase is not configured.' },
                { status: 503 },
            );
        }

        const normalizedSurfaces = normalizeOnboardingSurfaces(primarySurfaces);
        const taxSnapshot = calculateConfiguredAnswerlatticeTax({
            baseUnitAmount: selectedPrice,
            billingProfile,
            currency,
            quantity: 1,
        });
        const schedulerTimeZone = normalizeAnswerlatticeTimeZone(timeZone);
        const schedulerBusinessDayEndTime = normalizeAnswerlatticeBusinessDayEndTime(businessDayEndTime);
        const selfReportedDiscovery = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SELF_REPORTED_DISCOVERY
            ? buildSelfReportedDiscoveryAttribution(selfReportedDiscoveryChannel)
            : null;
        const requestFingerprint = buildAnswerlatticeOnboardingRequestFingerprint({
            billingProfile,
            billingModel,
            businessDayEndTime: schedulerBusinessDayEndTime,
            companyName,
            currency,
            interval,
            planId: plan.planId,
            primarySurfaces: normalizedSurfaces,
            productName: productName || '',
            productUrl: productUrl || '',
            supportEmail: supportEmail || '',
            timeZone: schedulerTimeZone,
        });
        const currentAuthUser = await getCurrentUser(session);
        if (!currentAuthUser || currentAuthUser.documentId !== userId) {
            throw new AnswerlatticeOnboardingAccessEndedError();
        }
        if (
            currentAuthUser.userData.productAccounts !== undefined
            && !isPlainRecord(currentAuthUser.userData.productAccounts)
        ) {
            throw new AnswerlatticeOnboardingAccessEndedError();
        }
        const currentProductAccounts = isPlainRecord(currentAuthUser.userData.productAccounts)
            ? currentAuthUser.userData.productAccounts
            : {};
        const existingProductAccount = currentProductAccounts[ANSWERLATTICE_PRODUCT_ACCOUNT_KEY];
        const existingAnswerlatticeUser = await getAnswerlatticeUserForOnboarding(db, userId, session.user.email);
        const existingStatus = String(existingAnswerlatticeUser?.onboardingStatus || '');
        const existingScope = existingAnswerlatticeUser
            ? getProvisioningScopeFromUser(existingAnswerlatticeUser, userId)
            : null;
        const sessionHasAnswerlatticeAccount = isPlainRecord(existingProductAccount)
            && Boolean(existingProductAccount.tenantId && existingProductAccount.storeId);
        if (
            sessionHasAnswerlatticeAccount
            && existingStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PENDING
            && existingStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PROVIDER_RECOVERY_PENDING
            && existingStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING
        ) {
            throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
        }

        if (existingStatus === ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PENDING && existingScope) {
            if (existingScope.requestFingerprint !== requestFingerprint) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_SETUP_REQUEST_CHANGED');
            }
            const storeSnapshot = await db.collection(DB_COLLECTIONS.STORES).doc(String(existingScope.storeId)).get();
            const storeData = storeSnapshot.data() || {};
            if (
                !storeSnapshot.exists
                || !answerlatticeProvisioningOwnershipMatches(storeData, existingScope)
                || storeData.onboardingStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PENDING
                || storeData.active === false
            ) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
            }
            const summary = parseAnswerlatticePendingOnboardingSummary(
                storeData.answerlatticeSubscription,
                existingScope,
            );
            await syncAnswerlatticeOnboardingAccess({
                db,
                userId,
                session,
                tenantId: existingScope.tenantId,
                storeId: existingScope.storeId,
                storeName: String(storeData.productName || storeData.name || existingScope.storeName || 'Answerlattice'),
            });
            const initialSurfaceCount = await repairAnswerlatticePostFinalizationState({
                businessDayEndTime: schedulerBusinessDayEndTime,
                db,
                storeId: existingScope.storeId,
                surfaceKeys: normalizedSurfaces,
                tenantId: existingScope.tenantId,
                timeZone: schedulerTimeZone,
                userId,
            });
            return answerlatticeOnboardingJson({
                apiKey: null,
                billing: {
                    amount: summary.amount,
                    currency: summary.currency,
                    interval: 'MONTH',
                },
                initialSurfaceCount,
                plan: {
                    id: summary.plan.planId,
                    isBeta: false,
                    name: summary.plan.name,
                },
                recovered: true,
                subscription: {
                    id: summary.subscriptionId,
                    shortUrl: summary.shortUrl,
                    status: 'pending',
                },
                widgetKeyNeedsRotation: true,
                workspaceCreated: true,
            });
        }

        let result: { storeId: number; storeName: string; tenantId: number };
        let attemptStartedAtMillis: number;
        let resumedProvisioning = false;
        let storedProviderSubscriptionId: string | null = null;
        const isProviderRecovery = (
            existingStatus === ANSWERLATTICE_ONBOARDING_STATUS.PROVIDER_RECOVERY_PENDING
        );
        if (
            (
                existingStatus === ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING
                || isProviderRecovery
            )
            && existingScope
        ) {
            if (existingScope.requestFingerprint !== requestFingerprint) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_SETUP_REQUEST_CHANGED');
            }
            recoveryAvailableAtForRetry = existingScope.recoveryAvailableAt;
            const attemptAge = Date.now() - existingScope.startedAtMillis;
            if (
                existingStatus === ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING
                && (!existingScope.startedAtMillis || attemptAge < ANSWERLATTICE_ONBOARDING_ACTIVE_ATTEMPT_MS)
            ) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_SETUP_IN_PROGRESS');
            }
            if (
                isProviderRecovery
                && shouldHoldAnswerlatticeOnboardingProviderRecovery({
                    providerSubscriptionId: existingScope.providerSubscriptionId,
                    recoveryAvailableAt: existingScope.recoveryAvailableAt,
                })
            ) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_PROVIDER_RECOVERY_PENDING');
            }
            const storeSnapshot = await db.collection(DB_COLLECTIONS.STORES).doc(String(existingScope.storeId)).get();
            const storeData = storeSnapshot.data() || {};
            if (
                !storeSnapshot.exists
                || !answerlatticeProvisioningOwnershipMatches(storeData, existingScope)
                || storeData.onboardingStatus !== existingStatus
            ) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
            }
            provisioningScope = existingScope;
            attemptStartedAtMillis = existingScope.startedAtMillis;
            storedProviderSubscriptionId = existingScope.providerSubscriptionId;
            providerOutcomeMayExist = true;
            result = {
                storeId: existingScope.storeId,
                storeName: String(storeData.productName || storeData.name || existingScope.storeName || productName || companyName),
                tenantId: existingScope.tenantId,
            };
            resumedProvisioning = true;
        } else {
            const hasExistingScope = Boolean(existingAnswerlatticeUser?.tenantId && existingAnswerlatticeUser?.storeId);
            if (hasExistingScope && existingStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PROVIDER_FAILED) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_ACCOUNT_EXISTS');
            }

            const attemptId = `alo_${randomUUID().replace(/-/g, '')}`;
            attemptStartedAtMillis = Date.now();
            const attemptStartedAt = admin.firestore.Timestamp.fromMillis(attemptStartedAtMillis);
            const cleanCompany = companyName.trim();
            const storeName = productName || companyName;
            const ownerRole = getOwnerRoleId();
            const launchProfileCreatedAt = attemptStartedAt;
            result = await db.runTransaction(async (transaction) => {
                const userRef = db!.collection(DB_COLLECTIONS.USERS).doc(userId);
                const currentUserSnapshot = await transaction.get(userRef);
                const currentUserData = currentUserSnapshot.data() || {};
                const currentStatus = String(currentUserData.onboardingStatus || '');
                if (
                    currentUserSnapshot.exists
                    && currentUserData.tenantId
                    && currentUserData.storeId
                    && currentStatus !== ANSWERLATTICE_ONBOARDING_STATUS.PAYMENT_PROVIDER_FAILED
                ) {
                    throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_SETUP_IN_PROGRESS');
                }

                const core = await createTenantStoreInTransaction(transaction, db!, {
                    businessName: cleanCompany,
                    businessType: 'SaaS',
                    businessIndustry: 'B2B',
                    email: session.user.email,
                    onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                    storeName,
                    allowInitialCounters: true,
                    tenantExtra: {
                        active: true,
                        billingModel,
                        onboardingAttemptId: attemptId,
                        onboardingProviderCancellationPending: false,
                        onboardingProviderRecoveryAvailableAt: null,
                        onboardingProviderRecoveryReason: null,
                        onboardingProviderSubscriptionId: null,
                        onboardingRequestFingerprint: requestFingerprint,
                        onboardingStartedAt: attemptStartedAt,
                        onboardingStatus: ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        productId: PRODUCT_IDS.ANSWERLATTICE,
                        productName: productName || '',
                        productUrl: productUrl || '',
                        supportEmail: supportEmail || '',
                        ...(selfReportedDiscovery ? { selfReportedDiscovery } : {}),
                    },
                    storeExtra: {
                        active: true,
                        answerlatticeWorkspaceProfileRevision: 0,
                        answerlatticeLaunchProfile: {
                            billingModel,
                            businessDayEndTime: schedulerBusinessDayEndTime,
                            createdAt: launchProfileCreatedAt,
                            primarySurfaces: normalizedSurfaces,
                            productUrl: productUrl || '',
                            supportEmail: supportEmail || '',
                            timeZone: schedulerTimeZone,
                        },
                        billingModel,
                        businessDayEndTime: schedulerBusinessDayEndTime,
                        onboardingAttemptId: attemptId,
                        onboardingProviderCancellationPending: false,
                        onboardingProviderRecoveryAvailableAt: null,
                        onboardingProviderRecoveryReason: null,
                        onboardingProviderSubscriptionId: null,
                        onboardingRequestFingerprint: requestFingerprint,
                        onboardingStartedAt: attemptStartedAt,
                        onboardingStatus: ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING,
                        pId: PRODUCT_IDS.ANSWERLATTICE,
                        primarySurfaces: normalizedSurfaces,
                        productId: PRODUCT_IDS.ANSWERLATTICE,
                        productName: productName || storeName,
                        productUrl: productUrl || '',
                        supportEmail: supportEmail || '',
                        timeZone: schedulerTimeZone,
                    },
                });

                transaction.set(db!.collection(DB_COLLECTIONS.TENANTS).doc(String(core.tenantId)), {
                    tId: core.tenantId,
                }, { merge: true });
                transaction.set(db!.collection(DB_COLLECTIONS.STORES).doc(String(core.storeId)), {
                    sId: core.storeId,
                    tId: core.tenantId,
                }, { merge: true });

                transaction.set(userRef, {
                    active: true,
                    createdOn: currentUserSnapshot.exists ? currentUserData.createdOn || core.now : core.now,
                    email: String(session.user.email || '').toLowerCase().trim(),
                    id: userId,
                    image: session.user.image || '',
                    isVerified: true,
                    modifiedOn: core.now,
                    name: session.user.name || session.user.email || 'Answerlattice user',
                    onboardingAttemptId: attemptId,
                    onboardingProviderCancellationPending: false,
                    onboardingProviderRecoveryAvailableAt: null,
                    onboardingProviderRecoveryReason: null,
                    onboardingProviderSubscriptionId: null,
                    onboardingRequestFingerprint: requestFingerprint,
                    onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                    onboardingStartedAt: attemptStartedAt,
                    onboardingStatus: ANSWERLATTICE_ONBOARDING_STATUS.PROVISIONING,
                    pId: PRODUCT_IDS.ANSWERLATTICE,
                    platformRole: 'OWNER',
                    productId: PRODUCT_IDS.ANSWERLATTICE,
                    role: ownerRole,
                    sId: core.storeId,
                    storeId: core.storeId,
                    storeIds: [core.storeId],
                    stores: [{ name: core.storeName, role: ownerRole, storeId: core.storeId }],
                    tId: core.tenantId,
                    tenantId: core.tenantId,
                    uId: userId,
                }, { merge: true });

                return { storeId: core.storeId, storeName: core.storeName, tenantId: core.tenantId };
            });
            provisioningScope = {
                attemptId,
                requestFingerprint,
                storeId: result.storeId,
                tenantId: result.tenantId,
                userId,
            };
        }

        tenantIdForLog = result.tenantId;
        storeIdForLog = result.storeId;
        await writeAnswerlatticeOnboardingLog('ANSWERLATTICE_ONBOARD_STARTED', {
            attemptId: provisioningScope.attemptId,
            companyNameLength: companyName.length,
            planId: plan.planId,
            resumedProvisioning,
            storeId: result.storeId,
            tenantId: result.tenantId,
            userId,
        });

        const { getOrCreateRazorpayPlan } = await import('@lib/razorpay/plan-handler');
        const { razorpayClient } = await import('@lib/razorpay/razorpay');
        const price = selectedPrice;
        const providerPrice = taxSnapshot.grossUnitAmount;
        const monthlyCredits = currency === 'USD' ? plan.priceUSD.monthlyCredits : plan.priceINR.monthlyCredits;
        const razorpayPlanId = await getOrCreateRazorpayPlan({
            productId: PRODUCT_IDS.ANSWERLATTICE,
            price: providerPrice,
            currency,
            interval,
            userType: 'B2B',
            planId: plan.planId,
        });
        const totalCount = 36;
        let razorpaySubscription: AnswerlatticeProviderSubscriptionCandidate | null = null;
        if (storedProviderSubscriptionId) {
            providerSubscriptionId = storedProviderSubscriptionId;
            const providerCandidate = await razorpayClient.subscriptions.fetch(storedProviderSubscriptionId);
            if (!answerlatticeProviderSubscriptionMatchesAttempt({
                attemptId: provisioningScope.attemptId,
                candidate: providerCandidate,
                planId: plan.planId,
                providerPlanId: razorpayPlanId,
                storeId: result.storeId,
                tenantId: result.tenantId,
            })) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_PROVIDER_RECOVERY_PENDING');
            }
            if (isAnswerlatticeTerminalProviderSubscriptionStatus(providerCandidate.status)) {
                await compensateAnswerlatticeOnboardingProvisioning({
                    cancellationPending: false,
                    db,
                    providerSubscriptionId: storedProviderSubscriptionId,
                    reason: 'answerlattice_onboarding_provider_checkout_terminal',
                    scope: provisioningScope,
                });
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED');
            }
            razorpaySubscription = findAnswerlatticeProviderSubscriptionForAttempt({
                attemptId: provisioningScope.attemptId,
                candidates: [providerCandidate],
                planId: plan.planId,
                providerPlanId: razorpayPlanId,
                storeId: result.storeId,
                tenantId: result.tenantId,
            });
            if (!razorpaySubscription) {
                throw new AnswerlatticeOnboardingConflictError('ANSWERLATTICE_PROVIDER_RECOVERY_PENDING');
            }
        } else if (resumedProvisioning) {
            razorpaySubscription = await recoverAnswerlatticeProviderSubscription({
                attemptId: provisioningScope.attemptId,
                planId: plan.planId,
                providerPlanId: razorpayPlanId,
                startedAtMillis: attemptStartedAtMillis,
                storeId: result.storeId,
                tenantId: result.tenantId,
            });
            if (!razorpaySubscription) providerOutcomeMayExist = false;
        }

        if (!razorpaySubscription) {
            providerCreateAttempted = true;
            providerOutcomeMayExist = true;
            try {
                razorpaySubscription = await razorpayClient.subscriptions.create({
                    plan_id: razorpayPlanId,
                    total_count: totalCount,
                    quantity: 1,
                    notes: {
                        currency,
                        email: String(session.user.email || ''),
                        interval,
                        name: String(session.user.name || ''),
                        onboardingAttemptId: provisioningScope.attemptId,
                        onboardingSource: 'ANSWERLATTICE_ONBOARDING',
                        planId: plan.planId,
                        price: providerPrice,
                        productId: PRODUCT_IDS.ANSWERLATTICE,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                        userId,
                    },
                });
            } catch (providerError) {
                razorpaySubscription = await recoverAnswerlatticeProviderSubscription({
                    attemptId: provisioningScope.attemptId,
                    planId: plan.planId,
                    providerPlanId: razorpayPlanId,
                    startedAtMillis: attemptStartedAtMillis,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                }).catch((): null => null);
                if (!razorpaySubscription) throw providerError;
            }
        }

        providerSubscriptionId = normalizeAnswerlatticeSubscriptionId(razorpaySubscription.id);
        if (!providerSubscriptionId) {
            throw new AnswerlatticeOnboardingProviderContractError(
                'answerlattice_onboarding_provider_subscription_id_missing',
            );
        }
        const admittedProviderSubscription = findAnswerlatticeProviderSubscriptionForAttempt({
            attemptId: provisioningScope.attemptId,
            candidates: [razorpaySubscription],
            planId: plan.planId,
            providerPlanId: razorpayPlanId,
            storeId: result.storeId,
            tenantId: result.tenantId,
        });
        if (!admittedProviderSubscription) {
            throw new AnswerlatticeOnboardingProviderContractError(
                'answerlattice_onboarding_provider_subscription_invalid',
            );
        }
        razorpaySubscription = admittedProviderSubscription;
        const providerTotalCount = razorpaySubscription.total_count === undefined
            ? totalCount
            : getAnswerlatticeOnboardingPositiveInteger(razorpaySubscription.total_count);
        if (providerTotalCount === null) {
            throw new AnswerlatticeOnboardingProviderContractError(
                'answerlattice_onboarding_provider_total_count_invalid',
            );
        }
        const shortUrl = getAnswerlatticeProviderSubscriptionCheckoutUrl(razorpaySubscription);
        if (!shortUrl) {
            throw new AnswerlatticeOnboardingProviderContractError(
                'answerlattice_onboarding_provider_checkout_url_invalid',
            );
        }
        const creditsLastResetMonth = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, 'id'> = {
            paymentProvider: 'razorpay',
            providerSubscriptionId,
            providerPlanId: razorpayPlanId,
            userId,
            name: session.user.name || '',
            email: session.user.email || '',
            tenantId: result.tenantId,
            storeId: result.storeId,
            tId: result.tenantId,
            sId: result.storeId,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            planType: interval,
            userType: 'B2B',
            currency,
            amount: price,
            chargedUnitAmount: providerPrice,
            taxSnapshot,
            status: 'pending',
            providerStatus: 'created',
            lastWebhook: null,
            planId: plan.planId,
            planName: plan.name,
            cycleStartDate: null,
            subscriptionEndDate: null,
            subscriptionStartDate: null,
            pastDueSinceAt: null,
            totalPaymentsNeededCount: providerTotalCount,
            totalPaymentsMadeCount: 0,
            cycleEndDate: null,
            renewsOn: null,
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits,
            topUpCredits: 0,
            creditsLastResetMonth,
            shortUrl,
            paymentMethod: { type: '', brand: '', last4: '', upiId: '', upiTransactionId: '' },
            statuses: [{
                status: 'pending',
                timestamp: admin.firestore.Timestamp.now() as any,
                amount: price,
                currency,
                remark: 'Answerlattice paid subscription initiated',
            }],
            billingHistory: [],
            quantity: 1,
            billingMode: 'auto',
            onboardingSource: 'ANSWERLATTICE_ONBOARDING',
        };
        const subscriptionSummary: AnswerlatticePendingSubscriptionSummary = {
            amount: price,
            creditsLastResetMonth,
            currency,
            id: providerSubscriptionId,
            isBeta: false,
            monthlyCredits,
            monthlyCreditsAllowance: monthlyCredits,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            planId: plan.planId,
            planName: plan.name,
            providerSubscriptionId,
            providerStatus: 'created',
            sId: result.storeId,
            shortUrl,
            status: 'pending',
            subscriptionEndDate: null,
            tId: result.tenantId,
            topUpCredits: 0,
            updatedAt: admin.firestore.Timestamp.now(),
        };
        const apiKey = `al_${randomUUID().replace(/-/g, '')}`;
        const apiKeyHash = hashApiKey(apiKey);
        const widgetKeyState = buildAnswerlatticeWidgetApiStateWithNewKey({
            apiKey,
            keyHash: apiKeyHash,
            name: 'Default widget key',
        });
        await persistAnswerlatticePendingSubscription({
            db,
            scope: provisioningScope,
            storeSubscriptionSummary: subscriptionSummary,
            subscriptionId: providerSubscriptionId,
            subscriptionPayload,
            widgetApiState: widgetKeyState.state,
        });
        localFinalizationComplete = true;
        await syncAnswerlatticeOnboardingAccess({
            db,
            userId,
            session,
            tenantId: result.tenantId,
            storeId: result.storeId,
            storeName: result.storeName,
        });
        const initialSurfaceCount = await repairAnswerlatticePostFinalizationState({
            businessDayEndTime: schedulerBusinessDayEndTime,
            db,
            storeId: result.storeId,
            surfaceKeys: normalizedSurfaces,
            tenantId: result.tenantId,
            timeZone: schedulerTimeZone,
            userId,
        });
        await writeAnswerlatticeOnboardingLog('ANSWERLATTICE_ONBOARD_COMPLETE', {
            initialSurfaceCount,
            planId,
            providerSubscriptionId,
            storeId: result.storeId,
            tenantId: result.tenantId,
            userId,
        });

        return answerlatticeOnboardingJson({
            apiKey,
            billing: {
                amount: price,
                currency,
                interval: 'MONTH',
            },
            initialSurfaceCount,
            plan: { id: plan.planId, isBeta: false, name: plan.name },
            recovered: resumedProvisioning,
            subscription: {
                id: providerSubscriptionId,
                shortUrl,
                status: 'created',
            },
            widgetKeyNeedsRotation: false,
            workspaceCreated: true,
        });
    } catch (error) {
        if (error instanceof AnswerlatticeOnboardingAccessEndedError) {
            logRuntimeFailure('answerlattice_onboard_current_authority_rejected', error, {
                ...getBoundedRuntimeStringContext('userId', userIdForLog),
            });
            return answerlatticeOnboardingJson(
                {
                    code: 'ANSWERLATTICE_ONBOARDING_ACCESS_ENDED',
                    error: 'Account access has ended. Sign in again before retrying setup.',
                },
                { status: 403 },
            );
        }
        if (error instanceof BillingTaxProfileError) {
            return answerlatticeOnboardingJson(
                { code: 'ANSWERLATTICE_BILLING_PROFILE_INVALID', error: error.message },
                { status: 400 },
            );
        }
        if (error instanceof BillingTaxConfigurationError) {
            logRuntimeFailure('answerlattice_billing_configuration_incomplete', error);
            return answerlatticeOnboardingJson(
                {
                    code: 'ANSWERLATTICE_BILLING_CONFIGURATION_INCOMPLETE',
                    error: 'Checkout is not available until billing configuration is complete.',
                },
                { status: 503 },
            );
        }
        if (error instanceof AnswerlatticeOnboardingConflictError) {
            const messages = {
                ANSWERLATTICE_ACCOUNT_EXISTS: 'You already have an account. Go to your dashboard.',
                ANSWERLATTICE_PROVIDER_CHECKOUT_EXPIRED: 'The previous payment checkout is no longer usable. Retry setup with the same details.',
                ANSWERLATTICE_PROVIDER_RECOVERY_PENDING: 'Payment setup is still being verified. Wait a few minutes, then retry with the same details.',
                ANSWERLATTICE_SETUP_IN_PROGRESS: 'Workspace setup is already running. Please wait a moment and try again.',
                ANSWERLATTICE_SETUP_REQUEST_CHANGED: 'Workspace setup is already running with different details.',
            } as const;
            const recoveryAvailableAtMillis = getAnswerlatticeOnboardingTimestampMillis(recoveryAvailableAtForRetry);
            const retryAfter = error.code === 'ANSWERLATTICE_PROVIDER_RECOVERY_PENDING'
                ? Math.max(1, Math.ceil(((recoveryAvailableAtMillis || Date.now() + 60_000) - Date.now()) / 1000))
                : null;
            return answerlatticeOnboardingJson(
                { code: error.code, error: messages[error.code] },
                {
                    status: 409,
                    ...(retryAfter ? { headers: { 'Retry-After': String(retryAfter) } } : {}),
                },
            );
        }

        if (db && provisioningScope && !localFinalizationComplete) {
            const recoveryRequired = providerOutcomeMayExist || providerCreateAttempted || Boolean(providerSubscriptionId);
            const recoveryAvailableAtMillis = providerSubscriptionId
                ? Date.now()
                : (
                    getAnswerlatticeOnboardingTimestampMillis(recoveryAvailableAtForRetry)
                    || Date.now() + ANSWERLATTICE_ONBOARDING_PROVIDER_RECOVERY_HOLD_MS
                );
            const cleanup = recoveryRequired
                ? markAnswerlatticeOnboardingProviderRecoveryPending({
                    db,
                    providerSubscriptionId,
                    reason: 'answerlattice_onboarding_provider_result_unconfirmed',
                    recoveryAvailableAtMillis,
                    scope: provisioningScope,
                })
                : compensateAnswerlatticeOnboardingProvisioning({
                    cancellationPending: false,
                    db,
                    providerSubscriptionId: null,
                    reason: 'answerlattice_onboarding_failed_before_provider',
                    scope: provisioningScope,
                });
            await cleanup.catch((cleanupError) => {
                logRuntimeFailure('answerlattice_onboard_cleanup_failed', cleanupError, {
                    ...getBoundedRuntimeStringContext('tenantId', provisioningScope?.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', provisioningScope?.storeId),
                    ...getBoundedRuntimeStringContext('userId', provisioningScope?.userId),
                });
            });
        }

        logRuntimeFailure('answerlattice_onboard_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
        });
        await writeAnswerlatticeOnboardingLog('ANSWERLATTICE_ONBOARD_ERROR', {
            failureCode: 'answerlattice_onboard_failed',
            ...getBoundedRuntimeStringContext('tenantId', tenantIdForLog),
            ...getBoundedRuntimeStringContext('storeId', storeIdForLog),
            ...getBoundedRuntimeStringContext('userId', userIdForLog),
        });
        return answerlatticeOnboardingJson(
            { code: 'ANSWERLATTICE_ONBOARDING_FAILED', error: 'Failed to create account. Please try again.' },
            { status: 500 },
        );
    }
});
