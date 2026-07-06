#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(content, needle, label) {
  assert(content.includes(needle), `${label} must include ${needle}`);
}

function assertNotIncludes(content, needle, label) {
  assert(!content.includes(needle), `${label} must not include ${needle}`);
}

function assertOrder(content, before, after, label) {
  const beforeIndex = content.indexOf(before);
  const afterIndex = content.indexOf(after);
  assert(beforeIndex !== -1, `${label} missing before token ${before}`);
  assert(afterIndex !== -1, `${label} missing after token ${after}`);
  assert(beforeIndex < afterIndex, `${label} must keep ${before} before ${after}`);
}

function verifyProtectedPaymentRoute(content, routeLabel, endpoint) {
  [
    'export const POST = withAuth(async (request, session) => {',
    'RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024',
    'readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(',
    'resolveBillingScopeFromSession(session, productId)',
    'verifyTenantAccess(session, tenantId, storeId, request)',
    `canManageBillingMutation(session, request, '${endpoint}')`,
    'getBoundedRazorpaySecurityContext(session, request)',
  ].forEach((token) => assertIncludes(content, token, routeLabel));

  assertOrder(content, 'readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES', 'validateAPIInput(', routeLabel);
  assertOrder(content, 'resolveBillingScopeFromSession(session, productId)', 'verifyTenantAccess(session, tenantId, storeId, request)', routeLabel);
  assertOrder(content, 'verifyTenantAccess(session, tenantId, storeId, request)', `canManageBillingMutation(session, request, '${endpoint}')`, routeLabel);
}

function verifyBillingEntitlementBoundary() {
  const packageJson = JSON.parse(read('package.json'));
  const createSubscription = read('src/app/api/razorpay/create-subscription/route.ts');
  const verifySubscription = read('src/app/api/razorpay/verify-subscription/route.ts');
  const upgradeSubscription = read('src/app/api/razorpay/upgrade-subscription/route.ts');
  const createTopupOrder = read('src/app/api/razorpay/create-topup-order/route.ts');
  const verifyTopup = read('src/app/api/razorpay/verify-topup/route.ts');
  const webhook = read('src/app/api/razorpay/webhook/route.ts');
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const subscriptionDocumentIdBoundary = read('src/lib/billing/subscriptionDocumentIdBoundary.ts');
  const topupDocumentIdBoundary = read('src/lib/billing/topupDocumentIdBoundary.ts');
  const entitlementSync = read('src/lib/billing/subscriptionEntitlementSync.ts');
  const subscriptionServer = read('src/database/subscriptions/server.ts');
  const subscriptionClient = read('src/database/subscriptions/index.ts');
  const capacityCheck = read('src/lib/ai/capacityCheck.ts');
  const razorpayUtils = read('src/utils/razorpay.ts');
  const paymentHook = read('src/hooks/usePaymentHandler.ts');
  const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
  const desktopSubscriptionCard = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
  const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const websiteSubscriptionManagement = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');
  const razorpayReadmeDoc = read('__docs__/razorpay/README.md');
  const razorpayImplDoc = read('__docs__/razorpay/razorpay_impl.md');
  const razorpayFirebaseDoc = read('__docs__/razorpay/razorpay_firebase.md');
  const aiEnhancementImplDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md');
  const aiEnhancementFirebaseDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_firebase.md');
  const aiUsageAuditDoc = read('__docs__/ai-enhancement-packs/ai-usage-audit.md');
  const aiEnhancementSpecDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md');
  const aiEnhancementHelpDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_helpdoc.md');
  const aiEnhancementWebsiteDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_website.md');
  const aiEnhancementMarketingDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_marketing.md');
  const aiBillingExplainerDoc = read('__docs__/ai-enhancement-packs/ai-billing-explainer.md');
  const pricingStrategyDoc = read('__docs__/strategy/pricing-strategy.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');
  const lowercaseChangelog = read('__docs__/changelog.md');

  assert(
    packageJson.scripts?.['verify:billing-entitlement-boundary'] === 'node scripts/verification/verify-billing-entitlement-boundary.js',
    'package.json must expose verify:billing-entitlement-boundary',
  );

  [
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH = 180',
    'export function normalizeBillingSubscriptionDocumentId(value: unknown): string | null {',
    'isValidFirestoreDocumentId(documentId)',
  ].forEach((token) => assertIncludes(subscriptionDocumentIdBoundary, token, 'billing subscription document ID boundary helper'));

  [
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'BILLING_TOPUP_DOCUMENT_ID_MAX_LENGTH = 180',
    'RAZORPAY_ORDER_DOCUMENT_ID_PATTERN = /^order_[a-zA-Z0-9]+$/',
    'export function normalizeBillingTopupDocumentId(value: unknown): string | null {',
    'export function normalizeBillingTopupScopeDocumentId(value: unknown): BillingTopupScopeDocumentId | null {',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    'isValidFirestoreDocumentId(documentId)',
  ].forEach((token) => assertIncludes(topupDocumentIdBoundary, token, 'billing top-up document ID boundary helper'));

  verifyProtectedPaymentRoute(createSubscription, 'create-subscription route boundary', '/api/razorpay/create-subscription');
  verifyProtectedPaymentRoute(verifySubscription, 'verify-subscription route boundary', '/api/razorpay/verify-subscription');
  verifyProtectedPaymentRoute(upgradeSubscription, 'upgrade-subscription route boundary', '/api/razorpay/upgrade-subscription');
  verifyProtectedPaymentRoute(createTopupOrder, 'create-topup-order route boundary', '/api/razorpay/create-topup-order');
  verifyProtectedPaymentRoute(verifyTopup, 'verify-topup route boundary', '/api/razorpay/verify-topup');

  [
    'PAYMENT_VERIFICATION: {',
    'limit: 20',
    'window: 3600',
    "description: 'Payment verification - 20 per hour per user'",
  ].forEach((token) => assertIncludes(rateLimitConfigs, token, 'payment verification rate-limit profile'));

  [
    {
      content: verifySubscription,
      label: 'verify-subscription payment verification limiter',
      endpoint: '/api/razorpay/verify-subscription',
      key: 'key: `payment-verify:subscription:${userRateLimitHash}`',
      rawKey: 'key: `payment-verify:subscription:${userId}`',
    },
    {
      content: verifyTopup,
      label: 'verify-topup payment verification limiter',
      endpoint: '/api/razorpay/verify-topup',
      key: 'key: `payment-verify:topup:${userRateLimitHash}`',
      rawKey: 'key: `payment-verify:topup:${session.user.id}`',
    },
  ].forEach(({ content, label, endpoint, key, rawKey }) => {
    [
      'checkRateLimit',
      "getRateLimitForFeature('PAYMENT_VERIFICATION')",
      'const userRateLimitHash = hashPublicRateLimitValue(',
      key,
      "logger.security('Payment Verification Rate Limit Exceeded'",
      `endpoint: '${endpoint}'`,
      "feature: 'PAYMENT_VERIFICATION'",
      "'Retry-After': String(waitSeconds)",
    ].forEach((token) => assertIncludes(content, token, label));
    assertOrder(content, "getRateLimitForFeature('PAYMENT_VERIFICATION')", 'readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES', `${label} before bounded body`);
    assertOrder(content, 'const rateLimitResult = await checkRateLimit({', 'readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES', `${label} check before bounded body`);
    assertNotIncludes(content, rawKey, `${label} raw user key exclusion`);
  });
  assertIncludes(razorpayFirebaseDoc, 'payment verification rate-limit boundary', 'Razorpay Firebase docs payment verification limiter evidence');
  assertIncludes(razorpayImplDoc, 'Payment verification rate-limit boundary', 'Razorpay implementation docs payment verification limiter evidence');
  assertIncludes(auditDoc, 'Razorpay payment verification rate-limit boundary checkpoint', 'Production audit payment verification limiter evidence');
  assertIncludes(changelog, 'Razorpay Payment Verification Rate-Limit Boundary', 'Changelog payment verification limiter evidence');
  assertIncludes(lowercaseChangelog, 'Razorpay Payment Verification Rate-Limit Boundary', 'Lowercase changelog payment verification limiter evidence');

  [
    'const remainingCredits = 0;',
    'topUpCredits: 0,',
    'const name = session?.user?.name || \'\';',
    'const email = session?.user?.email || \'\';',
    'getOrCreateRazorpayPlan({',
    'createProductInitialSubscription(productId, razorpaySubscription.id, subscriptionPayload)',
  ].forEach((token) => assertIncludes(createSubscription, token, 'create-subscription credit/identity boundary'));
  assertNotIncludes(createSubscription, 'body.name', 'create-subscription session identity boundary');
  assertNotIncludes(createSubscription, 'body.email', 'create-subscription session identity boundary');
  assertOrder(createSubscription, 'checkRateLimit({', 'getOrCreateRazorpayPlan({', 'create-subscription rate-limit/provider order');
  assertOrder(createSubscription, 'getOrCreateRazorpayPlan({', 'razorpayClient.subscriptions.create(RazorpayCreateObj)', 'create-subscription provider order');
  assertOrder(createSubscription, 'razorpayClient.subscriptions.create(RazorpayCreateObj)', 'createProductInitialSubscription(productId, razorpaySubscription.id, subscriptionPayload)', 'create-subscription provider-before-write order');

  [
    'const verifyRazorpaySubscriptionSignature = (',
    'timingSafeEqual(expected, actual)',
    'verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)',
    'razorpayClient.payments.fetch(razorpay_payment_id)',
    'razorpayClient.subscriptions.fetch(razorpay_subscription_id)',
    "payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id",
    'subscriptionMatchesScope',
    "validateTransition(internalSub.status, 'active', 'api:verify-subscription')",
    'safeSyncProductSubscriptionEntitlementFromSubscription(',
  ].forEach((token) => assertIncludes(verifySubscription, token, 'verify-subscription payment truth boundary'));
  assertOrder(verifySubscription, 'verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)', 'razorpayClient.payments.fetch(razorpay_payment_id)', 'verify-subscription signature-before-provider order');
  assertOrder(verifySubscription, "payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id", 'updateProductSubscription(productId, razorpay_subscription_id, updatePayload)', 'verify-subscription payment-truth-before-write order');
  assertOrder(verifySubscription, 'await updateProductSubscription(productId, razorpay_subscription_id, updatePayload);', '...updatePayload,', 'verify-subscription activation update before entitlement payload order');

  [
    'calculateRemainingCredits(internalSub)',
    'carryForwardFromSubscriptionId: oldSubscriptionId',
    "validateTransition(internalSub.status, 'expired', 'api:upgrade-subscription')",
    'safeSyncProductSubscriptionEntitlementFromSubscription(',
    'alreadyAppliedCarryForward',
  ].forEach((token) => assertIncludes(upgradeSubscription, token, 'upgrade-subscription carry-forward boundary'));
  assertNotIncludes(upgradeSubscription, 'const { nSi, oSi, rc }', 'upgrade-subscription must not trust browser remaining credits');
  assertOrder(upgradeSubscription, 'const calculatedCredits = calculateRemainingCredits(internalSub);', 'topUpCredits: remainingCredits', 'upgrade-subscription server-computed credits order');

  [
    "getRateLimitForFeature('PAYMENT_TOPUP')",
    'getActiveProductSubscriptionForStore(',
    'razorpayClient.orders.create({',
    "import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from \"@lib/billing/topupDocumentIdBoundary\";",
    'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);',
    'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);',
    'const tenantId = tenantScope.numericId;',
    'const storeId = storeScope.numericId;',
    'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);',
    'if (!topupDocumentId) {',
    ".collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId).set({",
    'providerOrderId: topupDocumentId,',
    "status: 'pending'",
  ].forEach((token) => assertIncludes(createTopupOrder, token, 'create-topup active-subscription boundary'));
  assertOrder(createTopupOrder, 'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);', 'verifyTenantAccess(session, tenantId, storeId, request)', 'create-topup scope document ID admission before access check');
  assertOrder(createTopupOrder, 'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);', "getRateLimitForFeature('PAYMENT_TOPUP')", 'create-topup scope document ID admission before rate limit/provider work');
  assertOrder(createTopupOrder, 'getActiveProductSubscriptionForStore(', 'razorpayClient.orders.create({', 'create-topup must verify active subscription before provider order');
  assertOrder(createTopupOrder, 'razorpayClient.orders.create({', 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);', 'create-topup provider-before-topup-doc-normalization order');
  assertOrder(createTopupOrder, 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);', ".collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId).set({", 'create-topup normalized provider order before pending-write order');
  assertNotIncludes(createTopupOrder, '.doc(razorpayOrder.id)', 'create-topup must not build raw top-up refs');

  [
    'const verifyRazorpayOrderSignature = (',
    'timingSafeEqual(expected, actual)',
    'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)',
    "import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from \"@lib/billing/topupDocumentIdBoundary\";",
    'const topupDocumentId = normalizeBillingTopupDocumentId(razorpay_order_id);',
    'if (!topupDocumentId) {',
    'razorpayClient.orders.fetch(razorpay_order_id)',
    'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);',
    'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);',
    'const tenantId = tenantScope.numericId;',
    'const storeId = storeScope.numericId;',
    'const storeDocumentId = storeScope.documentId;',
    'orderTenantId !== tenantId || orderStoreId !== storeId',
    'const topupRef = billingDb.collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId);',
    'existingTopup?.status === \'paid\'',
    'capturedPaymentOrderId !== razorpay_order_id',
    'getActiveProductSubscriptionForStore(productId, tenantId, storeId)',
    'billingDb.runTransaction(async (tx) => {',
    'billingDb.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId)',
    'providerOrderId: topupDocumentId,',
    "status: 'paid'",
  ].forEach((token) => assertIncludes(verifyTopup, token, 'verify-topup payment/order boundary'));
  assertOrder(verifyTopup, 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpay_order_id);', 'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)', 'verify-topup order ID normalized before signature/provider work');
  assertOrder(verifyTopup, 'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)', 'razorpayClient.orders.fetch(razorpay_order_id)', 'verify-topup signature-before-provider order');
  assertOrder(verifyTopup, 'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);', 'verifyTenantAccess(session, tenantId, storeId, request)', 'verify-topup scope document ID admission before access check');
  assertOrder(verifyTopup, 'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);', 'orderTenantId !== tenantId || orderStoreId !== storeId', 'verify-topup scope document ID admission before provider-note comparison');
  assertOrder(verifyTopup, 'capturedPaymentOrderId !== razorpay_order_id', 'billingDb.runTransaction(async (tx) => {', 'verify-topup payment-order-before-transaction order');
  assertNotIncludes(verifyTopup, '.doc(razorpay_order_id)', 'verify-topup must not build raw top-up refs');
  assertNotIncludes(verifyTopup, '.doc(String(storeId))', 'verify-topup must not build raw store refs');

  [
    'RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 256 * 1024',
    'rejectInvalidOrOversizedDeclaredBody(',
    "checkPublicRateLimit(request, 'WEBHOOK')",
    'readBoundedTextBody(',
    'validateRazorpayWebhookSignature(requestBody, signature, secret)',
    'claimWebhookEventForProcessing(event, requestBody)',
    'writeProductPaymentTransactionAudit(eventProductId, auditSummary)',
    'safeSyncProductSubscriptionEntitlementFromSubscription(eventProductId, subscription, source)',
    "markWebhookEvent(webhookClaim.eventKey, 'processed'",
  ].forEach((token) => assertIncludes(webhook, token, 'Razorpay webhook boundary'));
  assertOrder(webhook, 'rejectInvalidOrOversizedDeclaredBody(', "checkPublicRateLimit(request, 'WEBHOOK')", 'webhook declared-size-before-rate-limit order');
  assertOrder(webhook, "checkPublicRateLimit(request, 'WEBHOOK')", 'readBoundedTextBody(', 'webhook rate-limit-before-body-read order');
  assertOrder(webhook, 'readBoundedTextBody(', 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'webhook bounded-body-before-signature order');
  assertOrder(webhook, 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'claimWebhookEventForProcessing(event, requestBody)', 'webhook signature-before-idempotency order');

  [
    'safeSyncStorePlanEntitlementFromSubscription(subscription, source)',
    'syncAnswerlatticeSubscriptionEntitlementFromSubscription(subscription, source)',
    'isProductBillingDisabled(productId)',
    'getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE)',
    'return firestoreAdmin;',
    "import { normalizeAnswerlatticeSubscriptionId } from '@lib/answerlattice/billingDocumentIdBoundary';",
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'export function normalizeAnswerlatticeBillingScopeDocumentId(value: unknown): AnswerlatticeBillingScopeDocumentId | null',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    'const subscriptionId = normalizeAnswerlatticeSubscriptionId(providerSubscriptionId);',
    "if (!subscriptionId) throw new Error('Invalid Answerlattice subscription id.');",
    'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscriptionId);',
    "if (!normalizedSubscriptionId) throw new Error('Invalid Answerlattice subscription id.');",
    'const normalizedSubscriptionId = normalizeAnswerlatticeSubscriptionId(id);',
    'if (!normalizedSubscriptionId) return null;',
    'const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(tenantId);',
    'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(storeId);',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();',
    "const rawSummarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || '').trim();",
    'const summarySubscriptionId = normalizeAnswerlatticeSubscriptionId(rawSummarySubscriptionId);',
    ".where('tenantId', '==', tenantScope.numericId)",
    ".where('storeId', '==', storeScope.numericId)",
    'const subscriptionId = normalizeAnswerlatticeSubscriptionId(subscription.id || subscription.providerSubscriptionId);',
    'const providerSubscriptionId = normalizeAnswerlatticeSubscriptionId(subscription.providerSubscriptionId || subscription.id);',
    'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(subscription.storeId ?? subscription.sId);',
    'db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).set({',
    'db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({',
  ].forEach((token) => assertIncludes(productBillingServer, token, 'product billing server boundary'));
  assertNotIncludes(productBillingServer, '.doc(String(storeId))', 'product billing server must not build Answerlattice store refs from raw store IDs');
  assertNotIncludes(productBillingServer, '.doc(storeId).set({', 'product billing server must not write Answerlattice entitlement store refs from raw store IDs');
  assertNotIncludes(productBillingServer, '.doc(providerSubscriptionId)', 'product billing server must not build raw Answerlattice provider subscription refs');
  assertNotIncludes(productBillingServer, '.doc(subscription.id)', 'product billing server must not build raw Answerlattice subscription refs');
  assertNotIncludes(productBillingServer, "const summarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || '').trim();", 'product billing server must not use raw Answerlattice summary subscription refs');

  [
    'activePlanType: entitlementValue',
    "import { normalizeBillingSubscriptionDocumentId } from './subscriptionDocumentIdBoundary';",
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'if (subscriptionId) {',
    'firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).set({',
    "firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set",
    'revalidateTag(`menu-store-${storeId}`)',
    'revalidateTag(`store-${storeId}`)',
    "revalidateTag('client-stores')",
    "revalidateTag('screen-data')",
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'subscriptionEntitlementSync')",
    'invalidateOwnerBusinessAssistantPacketCache({',
    'billing_store_plan_entitlement_sync_failed',
  ].forEach((token) => assertIncludes(entitlementSync, token, 'MenuList entitlement sync boundary'));
  assertNotIncludes(entitlementSync, '.doc(subscription.id)', 'MenuList entitlement sync must not build raw subscription refs');

  [
    'normalizeBillingSubscriptionDocumentId',
    'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";',
    'export function normalizeBillingSubscriptionScopeDocumentId(value: unknown): BillingSubscriptionScopeDocumentId | null',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    'const getSubscriptionDocRefServer = (docId: string) => {',
    'const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);',
    'if (!normalizedDocId) throw new Error("Invalid billing subscription id.");',
    'return getSubscriptionsCollectionRefServer().doc(normalizedDocId);',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);',
    'if (!normalizedSubscriptionId) return null;',
    'return { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };',
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);',
    'if (!tenantScope || !storeScope) return null;',
    '.where("tenantId", "==", tenantScope.numericId)',
    '.where("storeId", "==", storeScope.numericId)',
    '.doc(tenantScope.documentId)',
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'MenuList server subscription DAL document ID boundary'));
  assertNotIncludes(subscriptionServer, 'getSubscriptionsCollectionRefServer().doc(docId)', 'MenuList server subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionServer, 'return { ...(docSnap.data() as FirestoreSubscriptionDoc), id };', 'MenuList server subscription DAL must return the normalized Firestore doc ID');
  assertNotIncludes(subscriptionServer, '.doc(String(tenantId))', 'MenuList server subscription DAL must not build tenant fallback refs from raw tenant IDs');
  assertIncludes(read('__docs__/razorpay/razorpay_impl.md'), 'MenuList Billing Subscription Scope Document ID Boundary', 'Razorpay implementation docs must record subscription scope boundary');
  assertIncludes(read('__docs__/razorpay/razorpay_firebase.md'), 'MenuList Billing Subscription Scope Document ID Boundary', 'Razorpay Firebase docs must record subscription scope boundary');
  assertIncludes(read('__docs__/audits/menulist-production-readiness-audit.md'), 'MenuList Billing Subscription Scope Document ID Boundary checkpoint', 'Production audit must record subscription scope boundary');
  assertIncludes(read('__docs__/CHANGELOG.md'), 'Billing Subscription Scope Document ID Boundary', 'Changelog must record subscription scope boundary');
  assertIncludes(read('__docs__/changelog.md'), 'Billing Subscription Scope Document ID Boundary', 'Lowercase changelog must record subscription scope boundary');

  [
    'normalizeBillingSubscriptionDocumentId',
    'const getDocRef = (docId: string) => {',
    'const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);',
    'if (!normalizedDocId) throw new Error("Invalid billing subscription id.");',
    'return doc(getCollectionRef(), normalizedDocId);',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);',
    'if (!normalizedSubscriptionId) return null;',
    'return { ...docSnap.data(), id: docSnap.id };',
  ].forEach((token) => assertIncludes(subscriptionClient, token, 'MenuList client subscription DAL document ID boundary'));
  assertNotIncludes(subscriptionClient, 'doc(getCollectionRef(), docId)', 'MenuList client subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionClient, 'return { ...docSnap.data(), id };', 'MenuList client subscription DAL must return the normalized Firestore doc ID');

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'if (!normalizedSubscriptionId || subscription.monthlyCreditsAllowance <= 0) {',
    '.doc(normalizedSubscriptionId);',
    'id: subscriptionSnap.id,',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);',
    'throw new Error("Billing subscription is not available.");',
  ].forEach((token) => assertIncludes(capacityCheck, token, 'MenuList AI capacity subscription document ID boundary'));
  assertNotIncludes(capacityCheck, '.doc(subscription.id)', 'MenuList AI capacity must not build raw subscription refs');

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);',
    'if (!subscriptionId) {',
    'const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);',
  ].forEach((token) => assertIncludes(verifyTopup, token, 'verify-topup subscription document ID boundary'));
  assertNotIncludes(verifyTopup, '.doc(internalSub.id)', 'verify-topup must not build raw subscription refs');

  [
    'PAYMENT_RESPONSE_JSON_MAX_BYTES = 32 * 1024',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'readJsonResponseWithLimit<T>(response, PAYMENT_RESPONSE_JSON_MAX_BYTES)',
    'isPaymentSubscriptionVerifyResponse',
    'value.status === \'active\'',
    'isPaymentTopupVerifyResponse',
    'typeof value.newCreditBalance === \'number\'',
    "fetch('/api/razorpay/verify-subscription'",
    "fetch('/api/razorpay/verify-topup'",
    'readPaymentVerificationResponse<PaymentSubscriptionVerifyResponse>',
    'readPaymentVerificationResponse<PaymentTopupVerifyResponse>',
  ].forEach((token) => assertIncludes(paymentHook, token, 'browser payment hook boundary'));

  [
    'const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase } = usePaymentHandler(dispatch);',
    'await onUpgradePlan(activeSubscription, newPlan, currency)',
    'await onClickPaymentCard(newPlan, currency',
    'await handleTopupPurchase(pack',
  ].forEach((token) => assertIncludes(desktopBilling, token, 'desktop billing payment hook parity'));

  [
    'const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase, onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(noopDispatcher);',
    'await onUpgradePlan(sub, plan, currency)',
    'await onClickPaymentCard(plan, currency',
    'await handleTopupPurchase(pack, currency)',
    'await onCancelSubscription({ reason: \'mobile_cancellation\'',
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing payment hook parity'));

  [
    'getGracePeriodDisplayInfo',
    'hasKnownGracePeriod: false',
    "title: 'Payment recovery'",
    "summary: 'Grace period details unavailable.'",
    "gracePeriodInfo.remainingDays === 1 ? '' : 's'",
  ].forEach((token) => assertIncludes(razorpayUtils, token, 'Razorpay grace-period display fallback'));

  [
    'getGracePeriodDisplayInfo',
    'getPastDueGracePeriodDisplay',
    'Grace period unavailable',
    'Complete the payment update within',
    'Grace-period details are unavailable. Retry the payment or contact support to recover billing.',
  ].forEach((token) => assertIncludes(desktopSubscriptionCard, token, 'desktop subscription-card past-due fallback'));
  assertNotIncludes(desktopSubscriptionCard, '//////add handling for past_due statuses', 'desktop subscription card stale TODO');
  assertNotIncludes(desktopSubscriptionCard, 'getGracePeriodInfo(activeSubscription.pastDueSinceAt)', 'desktop subscription card raw grace-period countdown');

  [
    'getGracePeriodDisplayInfo',
    'getPastDueGracePeriodDisplay',
    'getPastDueGracePeriodDisplay().summary',
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing past-due fallback'));
  assertNotIncludes(mobileBilling, 'getGracePeriodInfo(sub.pastDueSinceAt)', 'mobile billing raw grace-period countdown');

  [
    'getGracePeriodDisplayInfo',
    'getPastDueGracePeriodDisplay',
    'Grace period unavailable',
    'Complete the payment update within',
    'Grace-period details are unavailable. Open Billing to recover the subscription.',
  ].forEach((token) => assertIncludes(websiteSubscriptionManagement, token, 'website subscription-management past-due fallback'));
  assertNotIncludes(websiteSubscriptionManagement, 'getGracePeriodInfo(activeSubscription.pastDueSinceAt)', 'website subscription-management raw grace-period countdown');

  [
    'Billing architecture reference; not current launch certification',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
    'desktop/mobile Billing browser QA',
    'past-due grace-period display fallback',
    'Document-ID boundary:',
    'src/lib/billing/subscriptionDocumentIdBoundary.ts',
    'Top-up order document-ID boundary:',
    'src/lib/billing/topupDocumentIdBoundary.ts',
  ].forEach((token) => assertIncludes(razorpayReadmeDoc, token, 'Razorpay README launch boundary'));

  [
    'Historical pricing strategy; not current launch certification',
    'website/pricing copy review',
    'Razorpay sandbox evidence',
  ].forEach((token) => assertIncludes(pricingStrategyDoc, token, 'Pricing strategy launch boundary'));

  [
    'implemented and billing-slice audited; current launch certification still requires active gates',
    'covered by the billing entitlement source gate',
    'Razorpay sandbox top-up smoke',
    'Subscription document refs use `src/lib/billing/subscriptionDocumentIdBoundary.ts`',
    'paid consumption fails closed through the shared AI accounting finalizer',
    'topups/{orderId} is written as status="pending" after topupDocumentIdBoundary validation',
    'normalize checkout order ID through topupDocumentIdBoundary',
  ].forEach((token) => assertIncludes(aiEnhancementImplDoc, token, 'AI Enhancement Packs implementation billing boundary'));

  [
    'MenuList Billing Subscription Document ID Boundary',
    'capacity-check lazy reset and consumption normalize subscription document IDs',
    'malformed IDs return before reset refs or fail paid credit consumption before debit refs',
    'normalizes the checkout order ID through `src/lib/billing/topupDocumentIdBoundary.ts`',
    'create-topup-order` also normalizes the provider order ID before the pending top-up write',
    'normalizeBillingTopupScopeDocumentId()',
    'before top-up provider work, provider-note comparison, Firestore store refs, or top-up writes',
  ].forEach((token) => assertIncludes(aiEnhancementFirebaseDoc, token, 'AI Enhancement Packs Firebase billing subscription ID boundary'));

  [
    'Existing Razorpay top-up flow is implemented, billing-slice audited',
    'Razorpay sandbox top-up smoke',
  ].forEach((token) => assertIncludes(aiUsageAuditDoc, token, 'AI usage audit billing boundary'));

  assertIncludes(
    aiEnhancementSpecDoc,
    'Razorpay implementation exists and is billing-slice audited',
    'AI Enhancement Packs spec billing boundary',
  );

  [
    ['AI Enhancement Packs helpdoc', aiEnhancementHelpDoc, 'Help/source evidence; not current launch certification'],
    ['AI Enhancement Packs website', aiEnhancementWebsiteDoc, 'Website/source evidence; not current launch certification'],
    ['AI Enhancement Packs marketing', aiEnhancementMarketingDoc, 'Marketing/source evidence; not current launch certification'],
  ].forEach(([label, content, token]) => assertIncludes(content, token, `${label} launch status boundary`));

  [
    ['AI Enhancement Packs helpdoc', aiEnhancementHelpDoc],
    ['AI Enhancement Packs website', aiEnhancementWebsiteDoc],
    ['AI Enhancement Packs marketing', aiEnhancementMarketingDoc],
  ].forEach(([label, content]) => {
    [
      'External Certification Runbook',
      '`npm run verify:billing-entitlement-boundary`',
      'Razorpay sandbox top-up smoke',
      'desktop/mobile Billing browser QA',
      'website/pricing copy review',
      'Do not publish',
      'TBD price placeholders',
      'after payment is confirmed',
    ].forEach((token) => assertIncludes(content, token, `${label} public billing launch boundary`));
  });

  assertIncludes(
    aiBillingExplainerDoc,
    '**Status: Implemented — billing-slice audited; full MenuList certification pending**',
    'AI billing explainer launch boundary',
  );
  assertIncludes(
    aiBillingExplainerDoc,
    'monthlyCredits = 200  (full starting balance after subscription activation)',
    'AI billing explainer activation timing boundary',
  );
  assertIncludes(
    aiEnhancementMarketingDoc,
    'Your AI Enhancement Pack has been activated. Additional AI capacity is now available for your menu.',
    'AI Enhancement Packs marketing activation copy boundary',
  );

  [
    ['Razorpay README', razorpayReadmeDoc, '**Status:** Production Ready — Billing Architecture FROZEN | Razorpay is the ONLY payment provider'],
    ['Pricing strategy', pricingStrategyDoc, '**Status:** ✅ Production Ready'],
    ['AI Enhancement Packs implementation', aiEnhancementImplDoc, 'MenuList uses **Razorpay** (fully built, production-ready)'],
    ['AI Enhancement Packs implementation', aiEnhancementImplDoc, 'The following Razorpay-based credit purchase system is **fully built and production-ready**.'],
    ['AI usage audit', aiUsageAuditDoc, 'Existing Razorpay top-up flow is production-ready and must be **adapted**, not replaced'],
    ['AI Enhancement Packs spec', aiEnhancementSpecDoc, 'Razorpay fully built'],
    ['AI Enhancement Packs helpdoc', aiEnhancementHelpDoc, '**Status:** 📝 Ready for Use'],
    ['AI Enhancement Packs website', aiEnhancementWebsiteDoc, '**Status:** 📝 Ready for Use'],
    ['AI Enhancement Packs marketing', aiEnhancementMarketingDoc, '**Status:** 📝 Ready for Use'],
    ['AI Enhancement Packs helpdoc', aiEnhancementHelpDoc, 'Your AI features are ready immediately'],
    ['AI Enhancement Packs website', aiEnhancementWebsiteDoc, 'continue immediately'],
    ['AI Enhancement Packs marketing', aiEnhancementMarketingDoc, 'Ready when your menu needs it'],
    ['AI billing explainer', aiBillingExplainerDoc, 'full balance — ready to use'],
    ['AI Enhancement Packs marketing', aiEnhancementMarketingDoc, "Your menu's AI features are ready to use"],
  ].forEach(([label, content, token]) => assertNotIncludes(content, token, `${label} stale production-ready billing claim`));

  [
    'Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`',
    'server-side payment verification, active-subscription top-up gating, checkout response acknowledgement, and entitlement/cache sync source contracts',
    'no longer emit normal-path plan-search debug breadcrumbs',
    'past-due grace-period display fallback',
    'RAZORPAY_WEBHOOK_UNHANDLED_EVENT',
    'MenuList Billing Subscription Document ID Boundary',
    'malformed, reserved, empty, or path-shaped IDs fail or return null before Firestore document refs',
    'MenuList Top-Up Order Document ID Boundary',
    'malformed, reserved, empty, or path-shaped IDs fail before top-up document refs',
    'MenuList Top-Up Scope Document ID Boundary',
    '`normalizeBillingTopupScopeDocumentId()` validates the resolved billing tenant/store scope',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay implementation docs'));

  [
    'Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`',
    'The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke.',
    'normal-path debug cleanup is Firebase-cost neutral',
    'past-due grace-period display fallback is Firebase-cost neutral',
    'July 6 MenuList Billing Subscription Document ID Boundary is Firebase-cost neutral',
    'Malformed, reserved, empty, or path-shaped IDs fail or return null before Firestore document refs.',
    'July 6 MenuList Top-Up Order Document ID Boundary is Firebase-cost neutral',
    'Malformed, reserved, empty, or path-shaped order IDs fail before `topups/{orderId}` document refs.',
    'July 6 MenuList Top-Up Scope Document ID Boundary is Firebase-cost neutral',
    'Malformed, reserved, empty, whitespace-mutated, decimal, zero, negative, unsafe, nonnumeric, or path-shaped tenant/store scope IDs fail before provider order creation',
    'Searching for Razorpay plan',
    'Unhandled webhook event type',
  ].forEach((token) => assertIncludes(razorpayFirebaseDoc, token, 'Razorpay Firebase docs'));

  [
    'Billing entitlement boundary source gate',
    'verify:billing-entitlement-boundary',
    'real Razorpay sandbox subscription/top-up/reseller/webhook smoke remains pending',
    'Razorpay normal-path debug breadcrumb checkpoint',
    'past-due grace-period display fallback',
    'RAZORPAY_WEBHOOK_UNHANDLED_EVENT',
    'MenuList Billing Subscription Document ID Boundary checkpoint',
    'src/lib/billing/subscriptionDocumentIdBoundary.ts',
    'MenuList Top-Up Order Document ID Boundary checkpoint',
    'MenuList Top-Up Scope Document ID Boundary checkpoint',
    'normalizeBillingTopupScopeDocumentId()',
    'src/lib/billing/topupDocumentIdBoundary.ts',
    '`npm run verify:ai-accounting`',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing entitlement evidence'));

  [
    'Razorpay Past-Due Grace Display Fallback',
    'Grace period details unavailable.',
    'Razorpay Normal-Path Debug Diagnostics',
    'Searching for Razorpay plan',
    'Unhandled webhook event type',
    'RAZORPAY_WEBHOOK_UNHANDLED_EVENT',
    'MenuList Billing Subscription Document ID Boundary',
    'Paid AI credit consumption fails closed for malformed subscription IDs',
    'MenuList Top-Up Order Document ID Boundary',
    'Top-up order refs now validate Razorpay order IDs',
    'Top-Up Scope Document ID Boundary',
    'Top-up tenant/store scope is guarded',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog Razorpay debug diagnostics evidence'));

  [
    'Billing and pricing doc launch-boundary checkpoint',
    'no longer present Razorpay, pricing, or AI Enhancement Pack billing evidence as current production certification',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing doc-boundary evidence'));
}

verifyBillingEntitlementBoundary();
console.log('Billing entitlement boundary verifier passed');
