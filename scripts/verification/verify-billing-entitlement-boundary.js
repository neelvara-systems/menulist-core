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
  const entitlementSync = read('src/lib/billing/subscriptionEntitlementSync.ts');
  const paymentHook = read('src/hooks/usePaymentHandler.ts');
  const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
  const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const razorpayReadmeDoc = read('__docs__/razorpay/README.md');
  const razorpayImplDoc = read('__docs__/razorpay/razorpay_impl.md');
  const razorpayFirebaseDoc = read('__docs__/razorpay/razorpay_firebase.md');
  const aiEnhancementImplDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md');
  const aiUsageAuditDoc = read('__docs__/ai-enhancement-packs/ai-usage-audit.md');
  const aiEnhancementSpecDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_spec.md');
  const aiEnhancementHelpDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_helpdoc.md');
  const aiEnhancementWebsiteDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_website.md');
  const aiEnhancementMarketingDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_marketing.md');
  const pricingStrategyDoc = read('__docs__/strategy/pricing-strategy.md');
  const auditDoc = read('__docs__/audits/menulist-production-readiness-audit.md');

  assert(
    packageJson.scripts?.['verify:billing-entitlement-boundary'] === 'node scripts/verification/verify-billing-entitlement-boundary.js',
    'package.json must expose verify:billing-entitlement-boundary',
  );

  verifyProtectedPaymentRoute(createSubscription, 'create-subscription route boundary', '/api/razorpay/create-subscription');
  verifyProtectedPaymentRoute(verifySubscription, 'verify-subscription route boundary', '/api/razorpay/verify-subscription');
  verifyProtectedPaymentRoute(upgradeSubscription, 'upgrade-subscription route boundary', '/api/razorpay/upgrade-subscription');
  verifyProtectedPaymentRoute(createTopupOrder, 'create-topup-order route boundary', '/api/razorpay/create-topup-order');
  verifyProtectedPaymentRoute(verifyTopup, 'verify-topup route boundary', '/api/razorpay/verify-topup');

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
    "status: 'pending'",
  ].forEach((token) => assertIncludes(createTopupOrder, token, 'create-topup active-subscription boundary'));
  assertOrder(createTopupOrder, 'getActiveProductSubscriptionForStore(', 'razorpayClient.orders.create({', 'create-topup must verify active subscription before provider order');
  assertOrder(createTopupOrder, 'razorpayClient.orders.create({', ".collection(DB_COLLECTIONS.TOPUPS).doc(razorpayOrder.id).set({", 'create-topup provider-before-pending-write order');

  [
    'const verifyRazorpayOrderSignature = (',
    'timingSafeEqual(expected, actual)',
    'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)',
    'razorpayClient.orders.fetch(razorpay_order_id)',
    'orderTenantId !== Number(tenantId) || orderStoreId !== Number(storeId)',
    'existingTopup?.status === \'paid\'',
    'capturedPaymentOrderId !== razorpay_order_id',
    'getActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId))',
    'billingDb.runTransaction(async (tx) => {',
    "status: 'paid'",
  ].forEach((token) => assertIncludes(verifyTopup, token, 'verify-topup payment/order boundary'));
  assertOrder(verifyTopup, 'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)', 'razorpayClient.orders.fetch(razorpay_order_id)', 'verify-topup signature-before-provider order');
  assertOrder(verifyTopup, 'capturedPaymentOrderId !== razorpay_order_id', 'billingDb.runTransaction(async (tx) => {', 'verify-topup payment-order-before-transaction order');

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
  ].forEach((token) => assertIncludes(productBillingServer, token, 'product billing server boundary'));

  [
    'activePlanType: entitlementValue',
    "firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set",
    'revalidateTag(`menu-store-${storeId}`)',
    'revalidateTag(`store-${storeId}`)',
    "revalidateTag('client-stores')",
    "revalidateTag('screen-data')",
    "touchDigitalScreenContentVersionForStoreServer(storeId, 'subscriptionEntitlementSync')",
    'invalidateOwnerBusinessAssistantPacketCache({',
    'billing_store_plan_entitlement_sync_failed',
  ].forEach((token) => assertIncludes(entitlementSync, token, 'MenuList entitlement sync boundary'));

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
    'Billing architecture reference; not current launch certification',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
    'desktop/mobile Billing browser QA',
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
  ].forEach((token) => assertIncludes(aiEnhancementImplDoc, token, 'AI Enhancement Packs implementation billing boundary'));

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
  ].forEach(([label, content, token]) => assertNotIncludes(content, token, `${label} stale production-ready billing claim`));

  [
    'Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`',
    'server-side payment verification, active-subscription top-up gating, checkout response acknowledgement, and entitlement/cache sync source contracts',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay implementation docs'));

  [
    'Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`',
    'The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke.',
  ].forEach((token) => assertIncludes(razorpayFirebaseDoc, token, 'Razorpay Firebase docs'));

  [
    'Billing entitlement boundary source gate',
    'verify:billing-entitlement-boundary',
    'real Razorpay sandbox subscription/top-up/reseller/webhook smoke remains pending',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing entitlement evidence'));

  [
    'Billing and pricing doc launch-boundary checkpoint',
    'no longer present Razorpay, pricing, or AI Enhancement Pack billing evidence as current production certification',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing doc-boundary evidence'));
}

verifyBillingEntitlementBoundary();
console.log('Billing entitlement boundary verifier passed');
