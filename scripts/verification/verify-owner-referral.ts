#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '../../src/config/features';
import { getContentCreditOutcomeExamples } from '../../src/data/shared/contentCreditPolicy';
import {
    isOwnerReferralAcquisitionEnabled,
    isOwnerReferralAcquisitionEnabledForStore,
    isOwnerReferralPilotStoreAllowed,
} from '../../src/lib/ownerReferral/ownerReferralFeature';
import {
    createOwnerReferralToken,
    getOwnerReferralDocumentId,
    getOwnerReferralRewardIssueId,
    getOwnerReferralRewardTransactionId,
    validateOwnerReferralToken,
} from '../../src/lib/ownerReferral/ownerReferralTokenServer';
import { isOwnerReferralOwnerResponse } from '../../src/lib/ownerReferral/ownerReferralClient';

const ROOT = path.resolve(__dirname, '..', '..');

const read = (relativePath: string): string => (
    fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
);

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
    if (!condition) throw new Error(message);
};

const includes = (content: string, token: string, label: string): void => {
    assert(content.includes(token), `${label} must include ${token}`);
};

const excludes = (content: string, token: string, label: string): void => {
    assert(!content.includes(token), `${label} must not include ${token}`);
};

const order = (content: string, first: string, second: string, label: string): void => {
    const firstIndex = content.indexOf(first);
    const secondIndex = content.indexOf(second);
    assert(firstIndex >= 0, `${label} is missing ${first}`);
    assert(secondIndex >= 0, `${label} is missing ${second}`);
    assert(firstIndex < secondIndex, `${label} must keep ${first} before ${second}`);
};

const count = (content: string, token: string): number => content.split(token).length - 1;

const verifyTokenRuntime = (): void => {
    const previousSecret = process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET;
    const previousNow = Date.now;
    process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET = Buffer.alloc(32, 17).toString('base64url');

    try {
        const created = createOwnerReferralToken({ referrerTenantId: 41, referrerStoreId: 73 });
        const decoded = validateOwnerReferralToken(created.token);
        assert(decoded?.referrerTenantId === 41, 'Token must retain the referrer tenant scope');
        assert(decoded?.referrerStoreId === 73, 'Token must retain the referrer store scope');
        assert(decoded?.expiresAt - decoded?.issuedAt === 30 * 24 * 60 * 60, 'Token must use the 30-day security TTL');

        const tokenParts = created.token.split('.');
        tokenParts[2] = `${tokenParts[2].startsWith('A') ? 'B' : 'A'}${tokenParts[2].slice(1)}`;
        assert(validateOwnerReferralToken(tokenParts.join('.')) === null, 'Tampered token must fail authentication');

        Date.now = () => (created.payload.expiresAt + 1) * 1000;
        assert(validateOwnerReferralToken(created.token) === null, 'Expired token must be rejected');

        const referralId = getOwnerReferralDocumentId(90, 91);
        assert(referralId === getOwnerReferralDocumentId(90, 91), 'Referral document IDs must be deterministic');
        assert(referralId !== getOwnerReferralDocumentId(90, 92), 'Referral document ID must include referred store scope');
        const issueId = getOwnerReferralRewardIssueId(referralId);
        assert(
            getOwnerReferralRewardTransactionId(issueId, 'referrer')
                !== getOwnerReferralRewardTransactionId(issueId, 'referred'),
            'Reward ledger IDs must be deterministic and role-specific',
        );
    } finally {
        Date.now = previousNow;
        if (previousSecret === undefined) delete process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET;
        else process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET = previousSecret;
    }
};

const verifyFeatureFlagRuntime = (): void => {
    const originalAcquisition = FEATURE_FLAGS.ENABLE_OWNER_REFERRAL;
    const originalSettlement = FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING;
    const originalPilotStores = FEATURE_FLAGS.OWNER_REFERRAL_PILOT_STORE_IDS;
    try {
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL = false;
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL_REWARD_PROCESSING = false;
        assert(!isOwnerReferralAcquisitionEnabled(), 'Acquisition must be off when both flags are off');
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL = true;
        assert(!isOwnerReferralAcquisitionEnabled(), 'Acquisition must not run while settlement is off');
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL = false;
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL_REWARD_PROCESSING = true;
        assert(!isOwnerReferralAcquisitionEnabled(), 'Settlement-only repair must not create new referrals');
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL = true;
        assert(isOwnerReferralAcquisitionEnabled(), 'Acquisition must run when both flags are on');
        (FEATURE_FLAGS as any).OWNER_REFERRAL_PILOT_STORE_IDS = [73];
        assert(isOwnerReferralPilotStoreAllowed(73), 'Configured pilot store must be admitted');
        assert(!isOwnerReferralPilotStoreAllowed(74), 'Store outside a configured pilot must be denied');
        assert(isOwnerReferralAcquisitionEnabledForStore(73), 'Store entry must require acquisition and pilot admission');
        (FEATURE_FLAGS as any).OWNER_REFERRAL_PILOT_STORE_IDS = [];
        assert(isOwnerReferralPilotStoreAllowed(74), 'Empty pilot allowlist must represent broad rollout');
    } finally {
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL = originalAcquisition;
        (FEATURE_FLAGS as any).ENABLE_OWNER_REFERRAL_REWARD_PROCESSING = originalSettlement;
        (FEATURE_FLAGS as any).OWNER_REFERRAL_PILOT_STORE_IDS = originalPilotStores;
    }
};

const verifyContentCreditExamples = (): void => {
    assert(
        JSON.stringify(getContentCreditOutcomeExamples(100))
            === JSON.stringify({ descriptionRewrites: 100, generatedMenuImages: 20 }),
        '100 referral credits must retain exact public outcome examples',
    );
    assert(
        JSON.stringify(getContentCreditOutcomeExamples(50))
            === JSON.stringify({ descriptionRewrites: 50, generatedMenuImages: 10 }),
        '50 referral credits must retain exact public outcome examples',
    );
    assert(
        JSON.stringify(getContentCreditOutcomeExamples(250))
            === JSON.stringify({ descriptionRewrites: 250, generatedMenuImages: 50 }),
        '250 Pack credits must retain exact public outcome examples',
    );
    assert(
        JSON.stringify(getContentCreditOutcomeExamples(Number.NaN))
            === JSON.stringify({ descriptionRewrites: 0, generatedMenuImages: 0 }),
        'Invalid credit inputs must fail closed to zero examples',
    );
};

const verifyOwnerReferralResponseBoundary = (): void => {
    const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://menulist.example';
    const valid = {
        eligible: true,
        inviteUrl: `https://menulist.example/invite#r=${'x'.repeat(32)}`,
        policy: {
            referrerCredits: 100,
            referredCredits: 50,
            paymentOnly: true,
            rewardCap: null,
        },
        recent: [{
            businessName: 'Green Table Cafe',
            status: 'issued',
            date: '2026-07-11T04:30:00.000Z',
        }],
    };
    try {
        assert(isOwnerReferralOwnerResponse(valid), 'Canonical owner referral response must pass');
        assert(
            !isOwnerReferralOwnerResponse({
                ...valid,
                inviteUrl: `https://phishing.example/invite#r=${'x'.repeat(32)}`,
            }),
            'Cross-origin invite URL must fail',
        );
        assert(
            !isOwnerReferralOwnerResponse({
                ...valid,
                policy: { ...valid.policy, referredCredits: 500 },
            }),
            'Policy drift must fail',
        );
        assert(
            !isOwnerReferralOwnerResponse({
                ...valid,
                recent: [{ ...valid.recent[0], date: 'July 11, 2026' }],
            }),
            'Non-canonical dates must fail',
        );
        assert(
            !isOwnerReferralOwnerResponse({
                ...valid,
                recent: [{ ...valid.recent[0], businessName: '   ' }],
            }),
            'Blank business names must fail',
        );
    } finally {
        if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
        else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
    }
};

const verifyOwnerReferral = (): void => {
    const packageJson = JSON.parse(read('package.json'));
    const policy = read('src/data/shared/ownerReferralPolicy.ts');
    const contentCreditPolicy = read('src/data/shared/contentCreditPolicy.ts');
    const unitCosts = read('src/constants/AI/unitCosts.ts');
    const flags = read('src/config/features.ts');
    const featureBoundary = read('src/lib/ownerReferral/ownerReferralFeature.ts');
    const tokenServer = read('src/lib/ownerReferral/ownerReferralTokenServer.ts');
    const attribution = read('src/lib/ownerReferral/ownerReferralAttributionServer.ts');
    const settlement = read('src/lib/ownerReferral/ownerReferralSettlementServer.ts');
    const ownerApi = read('src/app/api/owner-referrals/route.ts');
    const captureApi = read('src/app/api/public/owner-referrals/capture/route.ts');
    const invitePage = read('src/app/(website)/invite/OwnerReferralInviteClient.tsx');
    const invitePageMetadata = read('src/app/(website)/invite/page.tsx');
    const claimRoute = read('src/app/api/public/create-menu/claim/route.ts');
    const onboardingRoute = read('src/app/api/onboarding/create-subscription/route.ts');
    const createSubscriptionRoute = read('src/app/api/razorpay/create-subscription/route.ts');
    const verifySubscriptionRoute = read('src/app/api/razorpay/verify-subscription/route.ts');
    const webhookRoute = read('src/app/api/razorpay/webhook/route.ts');
    const resellerOnboardRoute = read('src/app/api/reseller/onboard/route.ts');
    const resellerConfirmRoute = read('src/app/api/reseller/confirm-payment/route.ts');
    const resellerRenewRoute = read('src/app/api/reseller/renew/route.ts');
    const compensation = read('src/lib/onboarding/compensateFailedOnboarding.ts');
    const paymentTransactions = read('src/database/subscriptions/paymentTransactions.ts');
    const billingFormatter = read('src/lib/billing/billingHistoryFormatter.ts');
    const desktopBilling = read('src/components/templates/main-app/billing/BillingHistory.tsx');
    const desktopCreditPackCard = read('src/components/templates/main-app/billing/CreditPackCard.tsx');
    const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
    const desktopReferral = read('src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx');
    const referralHook = read('src/hooks/useOwnerReferral.ts');
    const referralClient = read('src/lib/ownerReferral/ownerReferralClient.ts');
    const desktopShare = read('src/components/templates/main-app/useMenuList/index.tsx');
    const mobileReferral = read('src/components/mobile/sheets/MobileOwnerReferralSheet.tsx');
    const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
    const creditPackCard = read('src/components/website/pricing-pages/CreditPackCard.tsx');
    const terms = read('src/components/website/legal/TermsOfServicePage.tsx');
    const privacy = read('src/components/website/legal/PrivacyPolicyPage.tsx');
    const envValidation = read('src/lib/env/validateEnv.ts');
    const firestoreRules = read('firestore.rules');
    const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
    const english = JSON.parse(read('public/locales/menulist.ai/en-US.json'));
    const hindi = JSON.parse(read('public/locales/menulist.ai/hi-IN.json'));
    const spec = read('__docs__/owner-referral/owner-referral_spec.md');
    const implementation = read('__docs__/owner-referral/owner-referral_impl.md');
    const firebase = read('__docs__/owner-referral/owner-referral_firebase.md');
    const mobileSupport = read('__docs__/owner-referral/owner-referral_mobile-support.md');
    const website = read('__docs__/owner-referral/owner-referral_website.md');
    const testCases = read('__docs__/owner-referral/owner-referral_test-cases.md');

    assert(
        packageJson.scripts?.['verify:owner-referral']
            === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/verify-owner-referral.ts',
        'package.json must expose verify:owner-referral',
    );

    [
        'OWNER_REFERRAL_REFERRER_CREDITS = 100',
        'OWNER_REFERRAL_REFERRED_CREDITS = 50',
        "ATTRIBUTED: 'attributed'",
        "PAYMENT_PENDING: 'payment_pending'",
        "REWARD_ISSUED: 'reward_issued'",
        "OWNER_REFERRAL_LEDGER_EVENT = 'owner_referral.reward_issued'",
        "OWNER_REFERRAL_LEDGER_TRANSACTION_TYPE = 'reward_credit'",
    ].forEach((token) => includes(policy, token, 'owner referral policy'));
    ['REWARD_CAP', 'DISTRIBUTION', 'RETENTION', 'QUALIFICATION_DEADLINE'].forEach((token) => (
        excludes(policy, token, 'owner referral policy')
    ));
    includes(policy, "WAITING_FOR_PAYMENT: 'waiting_for_payment'", 'owner-visible pending status');
    includes(policy, "ISSUED: 'issued'", 'owner-visible issued status');
    excludes(policy, 'WAITING_FOR_BOTH_PAYMENTS', 'owner-visible status policy');

    [
        'DESCRIPTION_REWRITE: 1',
        'GENERATED_MENU_IMAGE: 5',
        'LANGUAGE_ADDITION: 3',
        'ITEM_TRANSLATION: 1',
        'IMAGE_TRANSLATION: 5',
        'IMAGE_EDIT: 5',
        'getContentCreditOutcomeExamples',
    ].forEach((token) => includes(contentCreditPolicy, token, 'public content-credit policy'));
    includes(unitCosts, 'CONTENT_CREDIT_OPERATION_COSTS', 'AI unit costs use public credit-rate SSOT');
    includes(unitCosts, '[AI_ACTIONS_TYPES.REWRITE_DESCRIPTION]: CONTENT_CREDIT_OPERATION_COSTS.DESCRIPTION_REWRITE', 'description credit rate SSOT');
    includes(unitCosts, '[AI_ACTIONS_TYPES.IMAGE_GENERATION]: CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE', 'image credit rate SSOT');

    includes(flags, 'ENABLE_OWNER_REFERRAL: false', 'owner referral acquisition flag');
    includes(flags, 'ENABLE_OWNER_REFERRAL_REWARD_PROCESSING: false', 'owner referral settlement flag');
    includes(flags, 'OWNER_REFERRAL_PILOT_STORE_IDS: []', 'owner referral pilot allowlist');
    includes(featureBoundary, 'FEATURE_FLAGS.ENABLE_OWNER_REFERRAL', 'owner referral acquisition boundary');
    includes(featureBoundary, 'FEATURE_FLAGS.ENABLE_OWNER_REFERRAL_REWARD_PROCESSING', 'owner referral settlement dependency');
    includes(featureBoundary, 'isOwnerReferralPilotStoreAllowed', 'owner referral pilot boundary');
    includes(featureBoundary, 'isOwnerReferralAcquisitionEnabledForStore', 'owner referral store entry boundary');

    [
        "createCipheriv('aes-256-gcm'",
        "hkdfSync(",
        "MENULIST_OWNER_REFERRAL_TOKEN_SECRET",
        "#r=${encodeURIComponent(token)}",
    ].forEach((token) => includes(tokenServer, token, 'owner referral token server'));

    [
        "export const GET = withAuth(async (request: NextRequest, session) => {",
        'isOwnerReferralAcquisitionEnabledForStore(storeId)',
        'verifyTenantAccess(session, tenantId, storeId, request)',
        "canManageBillingMutation(session, request, '/api/owner-referrals')",
        "getRateLimitForFeature('OWNER_REFERRAL_READ')",
        'getDirectVerifiedPaidOwnerReferralWallet({ tenantId, storeId })',
        "'Cache-Control': 'private, no-store'",
    ].forEach((token) => includes(ownerApi, token, 'protected owner referral API'));
    excludes(ownerApi, 'WAITING_FOR_BOTH_PAYMENTS', 'truthful owner referral status response');

    [
        'if (!isOwnerReferralAcquisitionEnabled()) return unavailable(404);',
        'isSameOriginBrowserRequest(request)',
        "getRateLimitForFeature('OWNER_REFERRAL_CAPTURE')",
        "normalizeRequestAuthority(request.headers.get('host'))",
        'const requestHostOrigin = getRequestHostOrigin(request);',
        "failClosedOnProviderError: process.env.NODE_ENV === 'production'",
        'readBoundedJsonBody(request, OWNER_REFERRAL_CAPTURE_MAX_BODY_BYTES',
        'OwnerReferralCaptureSchema.safeParse',
        'isOwnerReferralPilotStoreAllowed(existingPayload.referrerStoreId)',
        'isOwnerReferralPilotStoreAllowed(payload.referrerStoreId)',
        'setOwnerReferralCookie(response, parsed.data.token)',
    ].forEach((token) => includes(captureApi, token, 'public referral capture API'));
    excludes(captureApi, 'firestoreAdmin', 'capture API zero-Firestore boundary');
    excludes(captureApi, 'x-forwarded-host', 'capture API same-origin boundary must not trust forwarded host');

    order(invitePage, "window.location.hash", "window.history.replaceState", 'invite fragment removal');
    includes(invitePage, "onClick={() => void capture()}", 'explicit invite capture CTA');
    order(invitePage, "{t('privacy')}", "onClick={() => void capture()}", 'pre-capture privacy disclosure');
    order(invitePage, "fetch('/api/public/owner-referrals/capture'", "router.push('/create-menu')", 'capture-before-setup navigation');
    includes(invitePage, 'readJsonResponseWithLimit<unknown>', 'public invite bounded capture response');
    excludes(invitePage, 'response.json()', 'public invite direct response parsing');
    includes(invitePage, "href=\"/create-menu\"", 'normal non-referral setup path');
    includes(referralClient, 'readJsonResponseWithLimit<unknown>', 'owner referral bounded response');
    includes(referralClient, 'Record<string, unknown>', 'owner referral unknown runtime validation');
    excludes(referralClient, 'response.json()', 'owner referral direct response parsing');
    excludes(referralClient, 'Record<string, any>', 'owner referral unsafe response record');
    includes(ownerApi, 'const timestampToIso = (value: unknown): string | null', 'owner referral timestamp boundary');
    excludes(ownerApi, 'return new Date().toISOString()', 'owner referral invented malformed timestamp');
    [
        "title: 'Business owner invitation - MenuList'",
        "alternates: { canonical: '/create-menu' }",
        'robots: { index: false, follow: false, nocache: true }',
    ].forEach((token) => includes(invitePageMetadata, token, 'invite metadata'));

    [
        'transaction.get(subscriptionHistoryQuery)',
        'hasSuccessfulMenuListSubscriptionPayment(subscriptionHistory)',
        'setOwnerReferralAttributionInTransaction',
        'setOwnerReferralAttributionBeforeSubscription',
        'params.transaction.create(referralRef',
        'const productId = subscription.productId ?? subscription.pId ?? DEFAULT_PRODUCT_ID;',
        'if (productId !== DEFAULT_PRODUCT_ID) return false;',
        "status: 'same_scope'",
        "status: 'prior_paid'",
    ].forEach((token) => includes(attribution, token, 'owner referral attribution server'));
    includes(attribution, 'isOwnerReferralPilotStoreAllowed(payload.referrerStoreId)', 'attribution pilot boundary');

    [claimRoute, onboardingRoute, createSubscriptionRoute].forEach((route, index) => {
        includes(route, 'resolveOwnerReferralCookieForAttribution', `attribution route ${index + 1}`);
        includes(route, 'clearOwnerReferralCookie', `attribution route ${index + 1}`);
    });
    includes(claimRoute, 'setOwnerReferralAttributionInTransaction', 'public-menu claim atomic attribution');
    includes(onboardingRoute, 'setOwnerReferralAttributionInTransaction', 'website onboarding atomic attribution');
    includes(createSubscriptionRoute, 'setOwnerReferralAttributionBeforeSubscription', 'existing unpaid subscription attribution');
    includes(compensation, 'deleteOwnerReferralAttributionInTransaction', 'failed onboarding referral compensation');

    [
        'getDirectVerifiedPaidOwnerReferralWallet(referrerScope)',
        'getDirectVerifiedPaidOwnerReferralWallet(referredScope)',
        'referrerWallet.id === referredWallet.id',
        'referrerTopUpBefore + OWNER_REFERRAL_REFERRER_CREDITS',
        'referredTopUpBefore + OWNER_REFERRAL_REFERRED_CREDITS',
        'transaction.create(referrerRewardRef',
        'transaction.create(referredRewardRef',
        'transaction.update(referralRef',
        'referrerTopUpBefore',
        'referrerTopUpAfter',
        'referredTopUpBefore',
        'referredTopUpAfter',
        'referrerRewardTransactionId',
        'referredRewardTransactionId',
    ].forEach((token) => includes(settlement, token, 'atomic referral reward settlement'));
    excludes(settlement, 'DB_COLLECTIONS.TOPUPS', 'reward settlement must not look like a purchased pack');
    excludes(settlement, 'distribution', 'payment-only settlement');
    excludes(settlement, 'published', 'payment-only settlement');
    excludes(settlement, 'rewardCap', 'uncapped settlement');
    excludes(settlement, 'setInterval', 'event-driven settlement');
    includes(settlement, '{ skipDirectReferral: true }', 'paid-event direct settlement de-duplication');

    includes(verifySubscriptionRoute, 'applyProductSubscriptionPayment(productId, {', 'Verify route transactional payment application');
    includes(verifySubscriptionRoute, 'if (!paymentApplication.applied && !paymentApplication.duplicate)', 'Verify route accepts applied and replayed captured payments before repair');
    assert(count(verifySubscriptionRoute, 'safelyRecordOwnerReferralPaymentAndRepair({') === 1, 'Verify route must use one replay-safe referral repair hook');
    order(
        verifySubscriptionRoute,
        'applyProductSubscriptionPayment(productId, {',
        'safelyRecordOwnerReferralPaymentAndRepair({',
        'Verify route repairs referrals after transactional payment application',
    );
    [webhookRoute, resellerOnboardRoute, resellerConfirmRoute, resellerRenewRoute].forEach((route, index) => (
        includes(route, 'safelyRecordOwnerReferralPaymentAndRepair({', `verified payment hook ${index + 1}`)
    ));

    includes(paymentTransactions, '"owner_referral.reward_issued"', 'unified billing-history query');
    includes(billingFormatter, "event.transactionType === 'reward_credit'", 'billing history reward event boundary');
    includes(billingFormatter, "type: 'Referral reward'", 'billing history reward label');
    includes(desktopBilling, "record.type === 'Referral reward'", 'desktop reward credit rendering');
    includes(mobileBilling, "item.type === 'Referral reward'", 'mobile reward credit rendering');

    includes(desktopReferral, "useTranslations('OwnerReferral')", 'desktop owner referral localization');
    includes(desktopReferral, "t('creditExample'", 'desktop owner referral credit examples');
    excludes(desktopReferral, 'waiting_for_both_payments', 'desktop truthful pending status');
    includes(desktopReferral, 'destroyOnHidden={false}', 'desktop referral modal lifecycle boundary');
    excludes(desktopReferral, 'destroyOnClose=', 'desktop referral deprecated modal lifecycle');
    includes(mobileReferral, "useTranslations('OwnerReferral')", 'mobile owner referral localization');
    includes(mobileReferral, "t('creditExample'", 'mobile owner referral credit examples');
    excludes(mobileReferral, 'waiting_for_both_payments', 'mobile truthful pending status');
    includes(mobileReferral, "flex: '1 1 0'", 'mobile referral flexible long-name column');
    includes(mobileReferral, 'maxHeight: 44', 'mobile referral two-line height boundary');
    includes(mobileReferral, 'WebkitLineClamp: 2', 'mobile referral long-name boundary');
    includes(mobileReferral, 'title={item.businessName}', 'mobile referral full-name label');
    includes(referralHook, 'navigator.clipboard?.writeText', 'owner referral modern clipboard path');
    includes(referralHook, "document.execCommand('copy')", 'owner referral embedded-browser clipboard fallback');
    includes(referralHook, 'getOwnerReferralShareTitle(locale)', 'localized owner referral share title');
    includes(referralClient, 'I thought it could help your business too', 'trusted owner referral share message');
    includes(referralClient, 'Invite a business owner you know to MenuList', 'trusted owner referral share title');
    includes(invitePage, 'ws-btn ws-btn--primary', 'invite primary action design-system class');
    includes(invitePage, 'ws-btn ws-btn--secondary', 'invite secondary action design-system class');
    includes(invitePage, "t('creditExample'", 'public invite credit example');
    excludes(invitePage, 'ws-btn-primary', 'invite obsolete primary action class');
    excludes(invitePage, 'ws-btn-secondary', 'invite obsolete secondary action class');
    includes(mobileShare, "useTranslations('OwnerReferral')", 'mobile Share entry localization');
    includes(creditPackCard, "t('creditPackAmount'", 'pricing card credit amount');
    includes(creditPackCard, "t('creditPackExample'", 'pricing card outcome example');
    includes(creditPackCard, 'pack.creditAmount', 'pricing card uses canonical pack amount');
    includes(desktopCreditPackCard, "t('creditPackAmount'", 'desktop Billing Pack amount');
    includes(desktopCreditPackCard, "t('creditPackExample'", 'desktop Billing Pack outcome example');
    includes(mobileBilling, "t('creditPackAmount'", 'mobile Billing Pack amount');
    includes(mobileBilling, "t('creditPackExample'", 'mobile Billing Pack outcome example');
    includes(desktopShare, 'isOwnerReferralAcquisitionEnabledForStore(storeDetails?.storeId)', 'desktop pilot entry boundary');
    includes(mobileShare, 'isOwnerReferralAcquisitionEnabledForStore(storeDetails?.storeId)', 'mobile pilot entry boundary');
    assert(english.OwnerReferral?.rewardRule.includes('both MenuList subscriptions are paid'), 'English reward rule must stay payment-only');
    assert(english.OwnerReferral?.rewardRule.includes('no referral limit or extra activity requirement'), 'English reward rule must stay uncapped and activity-free');
    assert(english.OwnerReferral?.title === 'Invite a business owner you know', 'English owner label must stay trust-based');
    assert(english.OwnerReferral?.creditExample === 'Up to {images} generated menu images or {descriptions} description rewrites.', 'English owner copy must quantify credit outcomes');
    assert(english.OwnerReferral?.invite?.creditExample.includes('Your {credits} credits can cover'), 'English public invite must quantify invited credits');
    assert(english.OwnerReferral?.status?.waitingForPayment === 'Their payment pending', 'English attributed status must identify the pending payment');
    assert(!Object.prototype.hasOwnProperty.call(english.OwnerReferral?.status || {}, 'waitingForBothPayments'), 'English owner statuses must not expose an unreachable both-payments state');
    assert(english.OwnerReferral?.invite?.title === 'A business owner you know invited you to MenuList.', 'English invite title must stay trust-based');
    assert(english.OwnerReferral?.invite?.referrerReward.includes('Their business receives'), 'English reward copy must stay relational and business-based');
    assert(hindi.OwnerReferral?.rewardRule.includes('दोनों MenuList सब्सक्रिप्शन'), 'Hindi reward rule must stay payment-only');
    assert(hindi.OwnerReferral?.title === 'अपने जानने वाले बिज़नेस मालिक को आमंत्रित करें', 'Hindi owner label must stay trust-based');
    assert(hindi.OwnerReferral?.creditExample.includes('{images} मेन्यू इमेज'), 'Hindi owner copy must quantify credit outcomes');
    assert(hindi.OwnerReferral?.invite?.creditExample.includes('{credits} क्रेडिट'), 'Hindi public invite must quantify invited credits');
    assert(hindi.OwnerReferral?.status?.waitingForPayment === 'उनका भुगतान बाकी', 'Hindi attributed status must identify the pending payment');
    assert(!Object.prototype.hasOwnProperty.call(hindi.OwnerReferral?.status || {}, 'waitingForBothPayments'), 'Hindi owner statuses must not expose an unreachable both-payments state');
    assert(english.Website?.Pricing?.creditPackAmount === '{credits} credits', 'English pricing must show the pack credit amount');
    assert(english.Website?.Pricing?.creditPackExample.includes('{images} generated menu images'), 'English pricing must explain pack outcomes');
    assert(hindi.Website?.Pricing?.creditPackAmount === '{credits} क्रेडिट', 'Hindi pricing must show the pack credit amount');
    assert(english.Billing?.creditPackAmount === english.Website?.Pricing?.creditPackAmount, 'English Billing and pricing Pack amounts must match');
    assert(english.Billing?.creditPackExample === english.Website?.Pricing?.creditPackExample, 'English Billing and pricing Pack examples must match');
    assert(hindi.Billing?.creditPackAmount === hindi.Website?.Pricing?.creditPackAmount, 'Hindi Billing and pricing Pack amounts must match');
    assert(hindi.Billing?.creditPackExample === hindi.Website?.Pricing?.creditPackExample, 'Hindi Billing and pricing Pack examples must match');
    [
        'There is no referral-count limit or additional publishing, sharing, usage, distribution, or waiting requirement after payment',
        'The invitation must be attached before the invited business completes its first successful MenuList subscription payment',
    ].forEach((token) => includes(terms, token, 'owner referral Terms'));
    includes(privacy, 'The referring business cannot see the referred plan, price, payment method, contact details, or account activity', 'owner referral privacy source');

    includes(envValidation, 'isValidOwnerReferralTokenSecret', 'owner referral environment validation');
    includes(envValidation, 'FEATURE_FLAGS.ENABLE_OWNER_REFERRAL', 'flag-aware owner referral environment validation');
    includes(envValidation, 'ENABLE_OWNER_REFERRAL requires ENABLE_OWNER_REFERRAL_REWARD_PROCESSING', 'acquisition/settlement rollout invariant');
    includes(firestoreRules, 'match /ownerReferrals/{referralId}', 'owner referral Firestore rules');
    includes(firestoreRules, 'allow read, write: if false;', 'server-only referral documents');

    const referralIndexes = firestoreIndexes.indexes.filter((index: any) => index.collectionGroup === 'ownerReferrals');
    assert(referralIndexes.length === 2, 'Owner referrals must have exactly the recent-status and pending-repair indexes');
    assert(referralIndexes.some((index: any) => index.fields.some((field: any) => field.fieldPath === 'createdAt')), 'Recent referral index is missing');
    assert(referralIndexes.some((index: any) => index.fields.some((field: any) => field.fieldPath === 'referredFirstPaidAt')), 'Pending-repair referral index is missing');

    [
        'The reward is based on payment only.',
        'There is no cap.',
        'There is no publish, usage, distribution, retention, deadline, cap, or scheduler qualification step.',
    ].forEach((token) => includes(spec, token, 'owner referral specification'));

    [spec, implementation, firebase, mobileSupport, website, testCases].forEach((document, index) => {
        excludes(document, 'implementation not started', `active owner referral document ${index + 1}`);
        excludes(document, '2026-07-12T10:46:23+05:30', `active owner referral document ${index + 1}`);
    });
    includes(firebase, 'Expected inside the atomic issue transaction: 3 reads and 5 writes.', 'Firebase settlement accounting');
    includes(firebase, '| **Total** | **15,000** | **6,000** |', 'Firebase reference operation accounting');
    includes(website, 'Business-name/general-status disclosure appears before capture.', 'website disclosure acceptance');
    includes(testCases, 'transactional attribution-race', 'test release evidence');

    verifyTokenRuntime();
    verifyFeatureFlagRuntime();
    verifyContentCreditExamples();
    verifyOwnerReferralResponseBoundary();
};

verifyOwnerReferral();
console.log('Owner referral verification passed.');
