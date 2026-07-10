#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import { FEATURE_FLAGS } from '../../src/config/features';
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

const verifyOwnerReferral = (): void => {
    const packageJson = JSON.parse(read('package.json'));
    const policy = read('src/data/shared/ownerReferralPolicy.ts');
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
    const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
    const desktopReferral = read('src/components/templates/main-app/useMenuList/OwnerReferralModal.tsx');
    const referralHook = read('src/hooks/useOwnerReferral.ts');
    const desktopShare = read('src/components/templates/main-app/useMenuList/index.tsx');
    const mobileReferral = read('src/components/mobile/sheets/MobileOwnerReferralSheet.tsx');
    const mobileShare = read('src/components/mobile/screens/MobileShareScreen.tsx');
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

    [
        'if (!isOwnerReferralAcquisitionEnabled()) return unavailable(404);',
        'isSameOriginBrowserRequest(request)',
        "getRateLimitForFeature('OWNER_REFERRAL_CAPTURE')",
        "failClosedOnProviderError: process.env.NODE_ENV === 'production'",
        'readBoundedJsonBody(request, OWNER_REFERRAL_CAPTURE_MAX_BODY_BYTES',
        'OwnerReferralCaptureSchema.safeParse',
        'isOwnerReferralPilotStoreAllowed(existingPayload.referrerStoreId)',
        'isOwnerReferralPilotStoreAllowed(payload.referrerStoreId)',
        'setOwnerReferralCookie(response, parsed.data.token)',
    ].forEach((token) => includes(captureApi, token, 'public referral capture API'));
    excludes(captureApi, 'firestoreAdmin', 'capture API zero-Firestore boundary');

    order(invitePage, "window.location.hash", "window.history.replaceState", 'invite fragment removal');
    includes(invitePage, "onClick={() => void capture()}", 'explicit invite capture CTA');
    order(invitePage, "{t('privacy')}", "onClick={() => void capture()}", 'pre-capture privacy disclosure');
    order(invitePage, "fetch('/api/public/owner-referrals/capture'", "router.push('/create-menu')", 'capture-before-setup navigation');
    includes(invitePage, "href=\"/create-menu\"", 'normal non-referral setup path');
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

    assert(count(verifySubscriptionRoute, 'safelyRecordOwnerReferralPaymentAndRepair({') >= 2, 'Verify route must repair both callback paths');
    [webhookRoute, resellerOnboardRoute, resellerConfirmRoute, resellerRenewRoute].forEach((route, index) => (
        includes(route, 'safelyRecordOwnerReferralPaymentAndRepair({', `verified payment hook ${index + 1}`)
    ));

    includes(paymentTransactions, '"owner_referral.reward_issued"', 'unified billing-history query');
    includes(billingFormatter, "event.transactionType === 'reward_credit'", 'billing history reward event boundary');
    includes(billingFormatter, "type: 'Referral reward'", 'billing history reward label');
    includes(desktopBilling, "record.type === 'Referral reward'", 'desktop reward credit rendering');
    includes(mobileBilling, "item.type === 'Referral reward'", 'mobile reward credit rendering');

    includes(desktopReferral, "useTranslations('OwnerReferral')", 'desktop owner referral localization');
    includes(desktopReferral, 'destroyOnHidden={false}', 'desktop referral modal lifecycle boundary');
    excludes(desktopReferral, 'destroyOnClose=', 'desktop referral deprecated modal lifecycle');
    includes(mobileReferral, "useTranslations('OwnerReferral')", 'mobile owner referral localization');
    includes(mobileReferral, "flex: '1 1 0'", 'mobile referral flexible long-name column');
    includes(mobileReferral, 'maxHeight: 44', 'mobile referral two-line height boundary');
    includes(mobileReferral, 'WebkitLineClamp: 2', 'mobile referral long-name boundary');
    includes(mobileReferral, 'title={item.businessName}', 'mobile referral full-name label');
    includes(referralHook, 'navigator.clipboard?.writeText', 'owner referral modern clipboard path');
    includes(referralHook, "document.execCommand('copy')", 'owner referral embedded-browser clipboard fallback');
    includes(invitePage, 'ws-btn ws-btn--primary', 'invite primary action design-system class');
    includes(invitePage, 'ws-btn ws-btn--secondary', 'invite secondary action design-system class');
    excludes(invitePage, 'ws-btn-primary', 'invite obsolete primary action class');
    excludes(invitePage, 'ws-btn-secondary', 'invite obsolete secondary action class');
    includes(mobileShare, "useTranslations('OwnerReferral')", 'mobile Share entry localization');
    includes(desktopShare, 'isOwnerReferralAcquisitionEnabledForStore(storeDetails?.storeId)', 'desktop pilot entry boundary');
    includes(mobileShare, 'isOwnerReferralAcquisitionEnabledForStore(storeDetails?.storeId)', 'mobile pilot entry boundary');
    assert(english.OwnerReferral?.rewardRule.includes('both MenuList subscriptions are paid'), 'English reward rule must stay payment-only');
    assert(english.OwnerReferral?.rewardRule.includes('no referral limit or extra activity requirement'), 'English reward rule must stay uncapped and activity-free');
    assert(hindi.OwnerReferral?.rewardRule.includes('दोनों MenuList सब्सक्रिप्शन'), 'Hindi reward rule must stay payment-only');
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
};

verifyOwnerReferral();
console.log('Owner referral verification passed.');
