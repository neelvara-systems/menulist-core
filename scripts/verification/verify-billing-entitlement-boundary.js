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
  assert(normalizeContract(content).includes(normalizeContract(needle)), `${label} must include ${needle}`);
}

function normalizeContract(value) {
  return value.replace(/\s+/g, '').replace(/"/g, "'");
}

function assertNotIncludes(content, needle, label) {
  assert(!normalizeContract(content).includes(normalizeContract(needle)), `${label} must not include ${needle}`);
}

function assertOrder(content, before, after, label) {
  const searchable = normalizeContract(content);
  const beforeIndex = searchable.indexOf(normalizeContract(before));
  const afterIndex = searchable.indexOf(normalizeContract(after));
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
  const billingAccess = read('src/lib/billing/billingAccess.ts');
  const pricingPlansModal = read('src/components/templates/main-app/billing/PricingPlansModal.tsx');
  const createSubscription = read('src/app/api/razorpay/create-subscription/route.ts');
  assertIncludes(createSubscription, '.catch((): null => null);', 'create-subscription exact persistence recovery miss');
  const verifySubscription = read('src/app/api/razorpay/verify-subscription/route.ts');
  const cancelSubscription = read('src/app/api/razorpay/cancel-subscription/route.ts');
  const pauseSubscription = read('src/app/api/razorpay/pause-subscription/route.ts');
  const resumeSubscription = read('src/app/api/razorpay/resume-subscription/route.ts');
  const upgradeSubscription = read('src/app/api/razorpay/upgrade-subscription/route.ts');
  const createTopupOrder = read('src/app/api/razorpay/create-topup-order/route.ts');
  const billingCheckoutLease = read('src/lib/billing/billingCheckoutLease.ts');
  const billingCheckoutConcurrencyTest = read('scripts/verification/test-billing-checkout-concurrency-emulator.ts');
  const billingProviderPlanRegistryTest = read('scripts/verification/test-billing-provider-plan-registry-emulator.ts');
  const razorpayWebhookLease = read('src/lib/billing/razorpayWebhookLease.ts');
  const razorpayWebhookLeaseTest = read('scripts/verification/test-razorpay-webhook-lease-emulator.ts');
  const maintenanceTaskLeaseTest = read('scripts/verification/test-maintenance-task-lease.ts');
  const billingCoordinationRulesTest = read('scripts/verification/test-billing-coordination-rules.ts');
  const answerlatticeBillingRulesTest = read('scripts/verification/test-answerlattice-billing-rules.ts');
  const answerlatticeSubscriptionReadBoundary = read('src/lib/answerlattice/subscriptionReadBoundary.ts');
  const answerlatticeSubscriptionReadBoundaryTest = read('scripts/verification/test-answerlattice-subscription-read-boundary.ts');
  const subscriptionStatusHistory = read('src/lib/billing/subscriptionStatusHistory.ts');
  const razorpayPlanHandler = read('src/lib/razorpay/plan-handler.ts');
  const reconciliationFunction = read('functions/src/billing/reconcileSubscriptions.ts');
  const functionsSubscriptionScope = read('functions/src/billing/subscriptionScope.ts');
  const functionsSubscriptionScopeTest = read('scripts/verification/test-functions-subscription-scope.ts');
  const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
  const messagingEngine = read('functions/src/messaging/messagingEngine.ts');
  const founderMonitorSnapshot = read('functions/src/schedulers/founderMonitorSnapshot.ts');
  const aiCapacityRecovery = read('functions/src/schedulers/aiCapacityReservationRecovery.ts');
  const aiCreditScalarContract = read('src/data/shared/aiCreditScalarContract.ts');
  const functionsAiCreditScalarContract = read('functions/src/sharedData/aiCreditScalarContract.ts');
  const aiCapacityReservationTest = read('scripts/verification/test-ai-capacity-reservation-emulator.ts');
  const firestoreRules = read('firestore.rules');
  const answerlatticeFirestoreRules = read('firestore-answerlattice.rules');
  const verifyTopup = read('src/app/api/razorpay/verify-topup/route.ts');
  const webhook = read('src/app/api/razorpay/webhook/route.ts');
  assertIncludes(webhook, "const id = normalizeBillingSubscriptionDocumentId(subscription.id);", 'Razorpay webhook must preserve exact internal subscription document identity');
  assertNotIncludes(webhook, "subscription.id.trim()", 'Razorpay webhook must not redirect a whitespace-bearing subscription ID to a different document');
  const paymentCheckoutBoundary = read('src/lib/billing/paymentCheckoutBoundary.ts');
  const subscriptionProviderSync = read('src/lib/billing/subscriptionProviderSync.ts');
  const subscriptionStateMachine = read('src/lib/billing/subscriptionStateMachine.ts');
  const webhookValidator = read('src/lib/razorpay/webhook-validator.ts');
  const paymentCheckoutBoundaryTest = read('scripts/verification/test-payment-checkout-boundary.ts');
  const checkoutUrlBoundary = read('src/lib/razorpay/checkoutUrl.ts');
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  const productSubscriptionScopeBoundary = read('src/lib/billing/productSubscriptionScopeBoundary.ts');
  const productSubscriptionScopeEmulator = read('scripts/verification/test-product-subscription-scope-emulator.ts');
  const sessionProviderScopeBoundary = read('src/lib/multiOutlet/sessionProviderScopeBoundary.ts');
  const billingPeriod = read('src/lib/billing/billingPeriod.ts');
  const topupSettlement = read('src/lib/billing/topupSettlement.ts');
  const topupSettlementServer = read('src/lib/billing/topupSettlementServer.ts');
  const subscriptionReplacementFinalization = read('src/lib/billing/subscriptionReplacementFinalization.ts');
  const subscriptionReplacementEvidence = read('src/lib/billing/subscriptionReplacementEvidence.ts');
  const checkoutProviderSubscriptionRecovery = read('src/lib/billing/checkoutProviderSubscriptionRecovery.ts');
  const subscriptionUpgradeSettlement = read('src/lib/billing/subscriptionUpgradeSettlement.ts');
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const subscriptionDocumentIdBoundary = read('src/lib/billing/subscriptionDocumentIdBoundary.ts');
  const topupDocumentIdBoundary = read('src/lib/billing/topupDocumentIdBoundary.ts');
  const entitlementSync = read('src/lib/billing/subscriptionEntitlementSync.ts');
  const subscriptionPlanEntitlement = read('src/lib/billing/subscriptionPlanEntitlement.ts');
  const billingSettlementTest = read('scripts/verification/test-billing-settlement-boundaries.ts');
  const subscriptionServer = read('src/database/subscriptions/server.ts');
  const subscriptionClient = read('src/database/subscriptions/index.ts');
  const masterStoreBoundary = read('src/lib/billing/masterStoreBoundary.ts');
  const capacityCheck = read('src/lib/ai/capacityCheck.ts');
  const answerlatticeAiAccounting = read('src/lib/answerlattice/aiAccounting.ts');
  const answerlatticeSupportSearchAccountingTest = read('scripts/verification/test-answerlattice-support-search-accounting-emulator.ts');
  const answerlatticeAiCapacityRecovery = read('functions-answerlattice/src/answerlattice/aiCapacityReservationRecovery.ts');
  const answerlatticeMasterScheduler = read('functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts');
  const answerlatticeAiCreditScalarContract = read('functions-answerlattice/src/sharedData/aiCreditScalarContract.ts');
  const answerlatticeIntakeUsageLedger = read('src/lib/answerlattice/intakeUsageLedger.ts');
  const answerlatticeKnowledgeIntakeApi = read('src/lib/answerlattice/knowledgeIntakeApi.ts');
  const answerlatticeActivationSummary = read('src/app/api/answerlattice/activation/summary/route.ts');
  const answerlatticeIntakeUsageSettlement = read('src/lib/answerlattice/intakeUsageSettlement.ts');
  const answerlatticeBillingDocumentIdBoundary = read('src/lib/answerlattice/billingDocumentIdBoundary.ts');
  const answerlatticeBillingScopeBoundary = read('src/lib/answerlattice/billingScopeBoundary.ts');
  const answerlatticeBillingClient = read('src/database/answerlattice/billing.ts');
  [
    'normalizeBillingSubscriptionScopeDocumentId(entry.storeId)',
    'if (!entry || storeIds.has(entry.storeId)) return null;',
    'if (explicitMasters.length > 1) return null;',
    "typeof value === 'boolean' ? value : null",
    'nestedStoreScope.numericId !== storeScope.numericId',
    'prototype === Object.prototype || prototype === null',
    '} catch {\n            return null;',
  ].forEach((token) => assertIncludes(
    masterStoreBoundary,
    token,
    'MenuList billing master-store exact persisted boundary',
  ));
  assertIncludes(subscriptionClient, 'getExactMasterStoreIdFromList(storesList)', 'MenuList client subscription master-store boundary');
  assertIncludes(subscriptionServer, 'getExactMasterStoreIdFromList(storesList)', 'MenuList server subscription master-store boundary');
  assertIncludes(subscriptionClient, 'if (!masterStoreId) { const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, tenantScope.documentId);', 'MenuList client subscription canonical-master recovery');
  assertIncludes(subscriptionServer, 'if (!masterStoreId) { const tenantSnap = await firestoreAdmin .collection(DB_COLLECTIONS.TENANTS)', 'MenuList server subscription canonical-master recovery');
  assertIncludes(subscriptionServer, 'MenuList subscription scope is immutable.', 'MenuList generic subscription updates preserve transaction-current workspace identity');
  assertIncludes(productSubscriptionScopeEmulator, 'a generic MenuList update must not move a subscription to another workspace', 'MenuList subscription scope immutability emulator regression');
  assertIncludes(subscriptionServer, '.where("status", "in", ["active", "cancelled", "paused"])', 'MenuList paid-cycle query excludes pending and separately evaluates past due recovery');
  assertIncludes(subscriptionServer, '.where("status", "==", "past_due")', 'MenuList past-due recovery query remains reachable after cycle end');
  assertNotIncludes(subscriptionServer, 'for (const status of ["paused", "pending"])', 'MenuList active subscription lookup must not fallback to pending or stale paused rows');
  assertIncludes(productSubscriptionScopeEmulator, 'a pending subscription must not enter paid entitlement truth', 'MenuList pending entitlement denial emulator regression');
  assertIncludes(productSubscriptionScopeEmulator, 'a paused subscription beyond its paid cycle must not enter entitlement truth', 'MenuList stale paused entitlement denial emulator regression');
  assertIncludes(productSubscriptionScopeEmulator, 'a past-due subscription inside payment recovery must remain available after cycle end', 'MenuList payment recovery grace emulator regression');
  assertIncludes(subscriptionServer, 'if (sub.status !== "past_due") return sub;', 'MenuList grace evaluation applies only to past-due lifecycle state');
  assertIncludes(subscriptionServer, 'if (!sub.pastDueSinceAt) return null;', 'MenuList past-due entitlement rejects a missing recovery marker');
  assertIncludes(subscriptionServer, 'if (!initialGracePeriod.hasKnownGracePeriod) return null;', 'MenuList past-due entitlement rejects malformed recovery state');
  assertIncludes(productSubscriptionScopeEmulator, 'past-due entitlement must fail closed when its recovery start is missing', 'MenuList missing recovery marker emulator regression');
  assertIncludes(productSubscriptionScopeEmulator, 'past-due entitlement must fail closed when its recovery start is malformed', 'MenuList malformed recovery marker emulator regression');
  assertNotIncludes(subscriptionClient, 'const storeId = Number(store?.storeId);', 'MenuList client subscription store-ID coercion');
  assertNotIncludes(subscriptionServer, 'const storeId = Number(store?.storeId);', 'MenuList server subscription store-ID coercion');
  const menuListIndexes = JSON.parse(read('firestore.indexes.json'));
  const answerlatticeIndexes = JSON.parse(read('firestore-answerlattice.indexes.json'));
  [
    'resolveExactSessionPlatformRole(session) === MENULIST_PLATFORM_USER_ROLE',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'if (currentPlatformUser) {',
    "error: 'Current platform authority unavailable for billing mutation'",
  ].forEach((token) => assertIncludes(
    billingAccess,
    token,
    'MenuList platform billing mutation current-authority boundary',
  ));
  assertNotIncludes(
    billingAccess,
    'if (resolveExactSessionPlatformRole(session) === MENULIST_PLATFORM_USER_ROLE) {\n        return true;',
    'MenuList platform billing mutation current-authority boundary',
  );
  assert(
    !menuListIndexes.indexes.some((index) => index.collectionGroup === 'subscriptionPayments'),
    'MenuList indexes must not retain the retired camel-case subscriptionPayments collection',
  );
  const razorpayUtils = read('src/utils/razorpay.ts');
  const paymentHook = read('src/hooks/usePaymentHandler.ts');
  const answerlatticeBilling = read('src/components/templates/answerlattice/billing/AnswerlatticeBilling.tsx');
  const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
  const desktopBillingHistory = read('src/components/templates/main-app/billing/BillingHistory.tsx');
  const websitePricingWrapper = read('src/components/website/pricing/PricingWrapper.tsx');
  const websitePricingPage = read('src/components/website/pricing-pages/index.tsx');
  const purchaseIntentBoundary = read('src/lib/billing/purchaseIntentBoundary.ts');
  const purchaseIntentBoundaryTest = read('scripts/verification/test-purchase-intent-boundary.ts');
  const desktopSubscriptionCard = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
  const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const desktopAddOutlet = read('src/components/organisms/AddOutletModal/index.tsx');
  const mobileLocations = read('src/components/mobile/screens/MobileLocationsScreen.tsx');
  const websiteCreditPackCard = read('src/components/website/pricing-pages/CreditPackCard.tsx');
  const paymentTransactionsDal = read('src/database/subscriptions/paymentTransactions.ts');
  const billingRecordProductIdentity = read('src/lib/billing/billingRecordProductIdentity.ts');
  const billingRecordProductIdentityBackfill = read('scripts/backfill-billing-record-product-identity.ts');
  const billingRecordProductIdentityTest = read('scripts/verification/test-billing-record-product-identity.ts');
  const billingHistoryFormatter = read('src/lib/billing/billingHistoryFormatter.ts');
  const websiteSubscriptionManagement = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');
  const razorpaySandboxReadiness = read('scripts/verification/verify-razorpay-sandbox-readiness.mjs');
  const razorpayReadmeDoc = read('__docs__/razorpay/README.md');
  const razorpayImplDoc = read('__docs__/razorpay/razorpay_impl.md');
  const razorpayFirebaseDoc = read('__docs__/razorpay/razorpay_firebase.md');
  const activeSubscriptionFlowDoc = read('__docs__/razorpay/active-subscription-flow.md');
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
  const changelog = read('__docs__/changelog.md');
  const lowercaseChangelog = read('__docs__/changelog.md');
  const externalCertificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');
  const productionReadinessReadme = read('__docs__/production-readiness/README.md');

  assert(
    packageJson.scripts?.['verify:billing-entitlement-boundary']?.startsWith('node scripts/verification/verify-billing-entitlement-boundary.js')
      && packageJson.scripts['verify:billing-entitlement-boundary'].includes('npm run test:answerlattice-subscription-read-boundary'),
    'package.json must expose verify:billing-entitlement-boundary',
  );
  [
    'aria-label="Billing interval"',
    'const planDisplayName =',
    'const purchaseActionLabel =',
    '`Get started with ${planDisplayName}`',
    '`Upgrade to ${planDisplayName}`',
    '`Change to ${planDisplayName}`',
    '`Contact us about ${planDisplayName}`',
    'aria-label={purchaseActionLabel}',
  ].forEach((token) => assertIncludes(pricingPlansModal, token, 'Billing plan chooser accessible names'));
  [
    ".where('status', 'in', ['pending', 'active'])",
    "pending.status === 'active' && hasVerifiedSubscriptionPaymentEvidence(pending)",
    "resolveRazorpayPendingCheckoutAction(providerPendingSubscription)",
  ].forEach((token) => assertIncludes(
    createSubscription,
    token,
    'Razorpay unresolved checkout reuse boundary',
  ));
  assert(
    packageJson.scripts?.['test:answerlattice-billing-contracts']?.includes('test-answerlattice-billing-contracts.ts'),
    'package.json must expose Answerlattice billing response and URL contracts',
  );
  assert(
    packageJson.scripts?.['test:answerlattice-billing:rules']?.includes('firestore-answerlattice.rules'),
    'package.json must expose dedicated Answerlattice billing rules coverage',
  );
  assert(
    packageJson.scripts?.['test:answerlattice-billing:shared-rules']?.includes('firestore.rules'),
    'package.json must expose shared-mode Answerlattice billing rules coverage',
  );
  assert(
    packageJson.scripts?.['test:billing-record-product-identity']?.includes('test-billing-record-product-identity.ts'),
    'package.json must expose billing record identity compatibility coverage',
  );
  assert(
    packageJson.scripts?.['backfill:billing-record-product-identity']?.includes('backfill-billing-record-product-identity.ts'),
    'package.json must expose the guarded billing record identity backfill',
  );
  [
    'projectRazorpaySubscriptionCheckoutResponse',
    'parseRazorpaySubscriptionCheckoutResponse',
    'projectRazorpayTopupCheckoutResponse',
    'parseRazorpayTopupCheckoutResponse',
    'RAZORPAY_SUBSCRIPTION_ID_PATTERN',
    'RAZORPAY_ORDER_ID_PATTERN',
    "hasOnlyKeys(value, ['subscription', 'reused'])",
    "hasOnlyKeys(value.subscription, ['id'])",
    "hasOnlyKeys(value, ['order'])",
  ].forEach((token) => assertIncludes(paymentCheckoutBoundary, token, 'Razorpay checkout response projection boundary'));
  [
    'Readonly<Record<string, readonly PaymentStatus[]>>',
    'return [...(VALID_TRANSITIONS[from] || [])];',
  ].forEach((token) => assertIncludes(subscriptionStateMachine, token, 'Subscription transition immutable projection boundary'));
  assertNotIncludes(
    subscriptionStateMachine,
    'return VALID_TRANSITIONS[from] || [];',
    'Subscription transition helper must not expose the mutable state-machine table',
  );
  [
    'MAX_SUBSCRIPTION_QUANTITY',
    'normalizeRazorpayManagedSubscriptionId',
    'typeof value === "string"',
    '!Number.isSafeInteger(quantity)',
    'quantity > MAX_SUBSCRIPTION_QUANTITY',
    'razorpay_subscription_quantity_update_input_invalid',
    'razorpay_subscription_fetch_input_invalid',
    'catch {',
    'return false;',
  ].forEach((token) => assertIncludes(subscriptionProviderSync, token, 'Razorpay subscription provider-call boundary'));
  assertNotIncludes(
    subscriptionProviderSync,
    'String(subscription?.providerSubscriptionId || "").trim()',
    'Razorpay provider subscription IDs must not use scalar/object coercion',
  );
  assertNotIncludes(
    subscriptionProviderSync,
    '(error as any)?.error',
    'Razorpay provider error classification must not rely on unsafe property access',
  );
  [
    "RAZORPAY_WEBHOOK_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/",
    'RAZORPAY_WEBHOOK_SIGNATURE_PATTERN.test(signature)',
    'razorpay_webhook_validator_invalid_signature_shape',
    'timingSafeEqual(generatedBuffer, receivedBuffer)',
  ].forEach((token) => assertIncludes(webhookValidator, token, 'Razorpay webhook signature input boundary'));
  [
    "(activeTransitions as string[]).length = 0;",
    "validateTransition('active', 'paused', 'test:immutable-transition-copy')",
    "updateRazorpaySubscriptionQuantity('not-a-subscription', 2)",
    "new Proxy({},",
    "createHmac('sha256', secret).update(body).digest('hex')",
    "signature.toUpperCase()",
  ].forEach((token) => assertIncludes(paymentCheckoutBoundaryTest, token, 'Razorpay provider boundary regression test'));
  [
    'projectRazorpaySubscriptionCheckoutResponse(',
    'projectRazorpayTopupCheckoutResponse(',
  ].forEach((token) => {
    const route = token.includes('Subscription') ? createSubscription : createTopupOrder;
    assertIncludes(route, token, 'Provider checkout route response projection');
  });
  [
    'parseRazorpaySubscriptionCheckoutResponse(subscriptionPayload)',
    'parseRazorpayTopupCheckoutResponse(topupOrderPayload)',
  ].forEach((token) => assertIncludes(paymentHook, token, 'Browser checkout response admission'));
  [
    "const RAZORPAY_HOSTED_PAYMENT_HOST = 'rzp.io';",
    "url.protocol !== 'https:'",
    'Boolean(url.username)',
    'Boolean(url.password)',
    "url.port !== '443'",
    'url.hash =',
    'normalizeRazorpaySubscriptionCheckoutUrl',
    'normalizeRazorpayInvoiceUrl',
  ].forEach((token) => assertIncludes(checkoutUrlBoundary, token, 'Razorpay hosted-payment URL boundary'));
  assertIncludes(createSubscription, 'normalizeRazorpaySubscriptionCheckoutUrl(razorpaySubscription.short_url)', 'Subscription short URL server admission');
  assertIncludes(createSubscription, "currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR", 'Subscription checkout currency price selection');
  assertNotIncludes(createSubscription, 'selectedPlan[priceKey]', 'Subscription checkout dynamic price registry index');
  assertIncludes(createTopupOrder, "currency === 'USD' ? selectedPack.priceUSD : selectedPack.priceINR", 'Top-up checkout currency price selection');
  assertNotIncludes(createTopupOrder, 'selectedPack[priceKey]', 'Top-up checkout dynamic price registry index');
  assertIncludes(webhook, 'normalizeRazorpayInvoiceUrl(invoice.short_url)', 'Webhook invoice URL server admission');
  assertIncludes(billingHistoryFormatter, 'normalizeRazorpayInvoiceUrl(event.invoiceUrl) || undefined', 'Billing history invoice URL browser admission');
  [
    'logPaymentFailure(',
    'getBoundedPaymentStringContext(',
    'answerlattice_billing_subscription_load_failed',
    'answerlattice_billing_history_load_failed',
    'answerlattice_billing_payment_flow_failed',
    'answerlattice_billing_credit_purchase_failed',
    'const [hasBillingLoadError, setHasBillingLoadError] = useState(false);',
    'disabled={isLoading || hasBillingLoadError || !scope}',
    'message="Billing could not be loaded"',
    'No subscription changes are available until the current billing state is confirmed.',
    'action={<Button onClick={() => void refetchActiveSubscription()}>Retry</Button>}',
  ].forEach((token) => assertIncludes(answerlatticeBilling, token, 'Answerlattice billing bounded diagnostics'));
  assertNotIncludes(answerlatticeBilling, "logger.error('Failed to load Answerlattice", 'Answerlattice billing raw load diagnostics');
  assertIncludes(answerlatticeBillingClient, 'throw error;', 'Answerlattice active-subscription read failures propagate to the fail-closed UI');
  assertNotIncludes(answerlatticeBillingClient, 'return null;\n        })\n        .finally(() => subscriptionRequests.delete(requestKey))', 'Answerlattice active-subscription read failures must not become false absence');
  [
    'projectAnswerlatticeSubscriptionForRead',
    'isAnswerlatticeSubscriptionCurrent',
    'getAnswerlatticeSubscriptionTimestampMillis',
  ].forEach((token) => {
    assertIncludes(answerlatticeBillingClient, token, 'Answerlattice client subscription read boundary delegation');
    assertIncludes(productBillingServer, token, 'Answerlattice server subscription read boundary delegation');
  });
  [
    'getPlainDataRecord',
    'getNonNegativeCreditInteger',
    'totalPaymentsMadeCount > totalPaymentsNeededCount',
    'readOptionalTimestamp(record.cycleEndDate)',
    'readStatusHistory(record.statuses)',
    'readPaymentMethod(record.paymentMethod)',
  ].forEach((token) => assertIncludes(answerlatticeSubscriptionReadBoundary, token, 'Answerlattice exact subscription read boundary'));
  assertIncludes(answerlatticeSubscriptionReadBoundaryTest, 'must not use numeric coercion', 'Answerlattice subscription coercion regression');
  assertIncludes(answerlatticeSubscriptionReadBoundaryTest, 'persisted accessors must not execute', 'Answerlattice subscription accessor regression');
  assertNotIncludes(answerlatticeBillingClient, 'Number(data.amount)', 'Answerlattice client subscription amount coercion');
  assertNotIncludes(productBillingServer, 'Number(data.amount)', 'Answerlattice server subscription amount coercion');
  assertNotIncludes(productBillingServer, 'const toMillis = (value: any)', 'Product billing must not retain an unused coercive timestamp helper');
  assertIncludes(
    productBillingServer,
    'return projectAnswerlatticeSubscriptionForRead(',
    'Answerlattice direct subscription ID reads must project exact persisted financial truth',
  );
  [
    'hasExactAnswerlatticeBillingIdentity(resource.data)',
    "hasAnswerlatticePermission('canManageBilling')",
    'allow write: if false;',
  ].forEach((token) => assertIncludes(answerlatticeFirestoreRules, token, 'Dedicated Answerlattice billing rules'));
  [
    'function canReadProductBillingResource()',
    'function canReadProductPaymentTransaction()',
    'function hasExactMenuListBillingIdentity(data)',
    "data.keys().hasAll(['pId', 'productId'])",
    'function isAnswerlatticeBillingScopeMember(data)',
    'allow read: if canReadProductBillingResource();',
    'hasExactAnswerlatticeBillingIdentity(resource.data)',
    'hasExactMenuListBillingIdentity(resource.data)',
    "hasAnswerlatticePermission('canManageBilling')",
  ].forEach((token) => assertIncludes(firestoreRules, token, 'Shared product billing rules'));
  assertNotIncludes(firestoreRules, 'function hasAnyAnswerlatticeBillingIdentity(data)', 'Shared billing rules must not classify every non-AL product as MenuList');
  assertIncludes(firestoreRules, '|| (hasExactMenuListBillingIdentity(resource.data)', 'Shared top-up reads require exact MenuList product identity');
  assertIncludes(firestoreRules, 'hasExactMenuListBillingIdentity(resource.data)\n                && isMenuListBillingScopeMember(resource.data)', 'Shared top-up reads require agreeing MenuList tenant/store aliases');
  assertIncludes(answerlatticeFirestoreRules, "data.keys().hasAll(['pId', 'productId'])", 'Dedicated Answerlattice billing exact product aliases');
  assert(
    !fs.existsSync(path.join(ROOT, 'src/database/topups/index.ts')),
    'Client top-up mutation DAL must stay absent; provider order creation and settlement are server-owned',
  );
  [
    'export type BillingHistoryLedgerRow = Record<string, unknown> & { id: string };',
    'Promise<BillingHistoryLedgerRow[]>',
    'normalizeBillingSubscriptionScopeDocumentId',
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);',
    'if (!tenantScope || !storeScope) return [];',
    'where("pId", "==", PRODUCT_IDS.MENULIST)',
    'where("productId", "==", PRODUCT_IDS.MENULIST)',
    'where("tenantId", "==", tenantScope.numericId)',
    'where("storeId", "==", storeScope.numericId)',
    'limit(50)',
  ].forEach((token) => assertIncludes(paymentTransactionsDal, token, 'Billing history tenant/store read boundary'));
  [
    'createPaymentTransaction',
    'addDoc(',
    'requestBodyComposer',
    'Number(tenantId)',
    'Number(storeId)',
  ].forEach((token) => assertNotIncludes(paymentTransactionsDal, token, 'Billing ledger browser write boundary'));
  [
    'where("pId", "==", PRODUCT_IDS.MENULIST)',
    'where("productId", "==", PRODUCT_IDS.MENULIST)',
  ].forEach((token) => assertIncludes(subscriptionClient, token, 'MenuList browser subscription exact product query'));
  [
    'createInitialSubscription',
    'updateSubscription',
    'getSubscriptionById',
    'requestBodyComposer',
    'setDoc(',
  ].forEach((token) => assertNotIncludes(subscriptionClient, token, 'MenuList browser subscription read-only boundary'));
  [
    '.where("pId", "==", DEFAULT_PRODUCT_ID)',
    '.where("productId", "==", DEFAULT_PRODUCT_ID)',
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'MenuList server subscription exact product query'));
  assertIncludes(desktopBilling, 'getBillingHistoryForStore(session?.user?.tenantId, effectiveHistoryStoreId)', 'Desktop billing history must preserve raw signed scope for exact DAL admission');
  assertIncludes(desktopBilling, 'aria-label="Billing store"', 'Desktop multi-location billing selector must have an accessible name');
  assertIncludes(mobileBilling, 'getBillingHistoryForStore(session?.user?.tenantId, historyStoreId)', 'Mobile billing history must preserve raw signed scope for exact DAL admission');
  [
    "aria-label={t('cancellationReasonTitle')}",
    "aria-label={t('chooseAPlan')}",
    'aria-label="Billing store"',
    "aria-label={t('getMoreAiEnhancements')}",
    "aria-label={t('billingHistory')}",
  ].forEach((token) => assertIncludes(mobileBilling, token, 'Mobile billing popup accessible-name contract'));
  assertNotIncludes(desktopBilling, 'getBillingHistoryForStore(Number(session?.user?.tenantId)', 'Desktop billing history must not coerce nullable session scope');
  assertNotIncludes(mobileBilling, 'getBillingHistoryForStore(Number(session?.user?.tenantId)', 'Mobile billing history must not coerce nullable session scope');
  [
    "Promise<void | 'loaded' | 'error'>",
    "historyLoadState === 'loading'",
    'No billing history was found for this store.',
    'Billing history could not be loaded. Try again.',
    'onClick={() => void handleFetchBillingHistory()}',
    'if (historyRequestInFlightRef.current) return;',
    'historyRequestInFlightRef.current = true;',
    'historyRequestInFlightRef.current = false;',
  ].forEach((token) => assertIncludes(desktopBillingHistory, token, 'Desktop billing history visible fetch/recovery state'));
  [
    "payment_desktop_billing_history_fetch_failed",
    "messageApi.error('Billing history could not be loaded.')",
    "return 'error' as const",
    "key={billingScopeKey || 'billing-history'}",
  ].forEach((token) => assertIncludes(desktopBilling, token, 'Desktop billing history bounded fetch failure'));
  [
    'const [isHistoryLoading, setIsHistoryLoading] = useState(false);',
    'if (billingHistoryInFlightKeyRef.current) return;',
    'billingHistoryInFlightKeyRef.current = inFlightKey;',
    'if (billingHistoryInFlightKeyRef.current === inFlightKey)',
    'aria-busy={isHistoryLoading}',
    'onClick={() => void fetchHistory()}',
    'role="button"',
    'tabIndex={0}',
    'event.key !== \'Enter\' && event.key !== \' \'',
  ].forEach((token) => assertIncludes(mobileBilling, token, 'Mobile billing history visible loading and keyboard contract'));
  assertNotIncludes(mobileBilling, '<Button fill="outline" onClick={fetchHistory}', 'Mobile billing must not duplicate the canonical Billing History action inside the subscription card');
  [
    'aria-label={t(\'needBillingHelp\')}',
    "router.push('/help-center/contact-us')",
    'Open MenuList support options in Help Center.',
    'type="button"',
    "width: '100%'",
  ].forEach((token) => assertIncludes(mobileBilling, token, 'Mobile billing help keyboard-navigation contract'));
  [
    "where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)",
    "where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)",
    "where('tenantId', '==', tenantId)",
    "where('storeId', '==', storeId)",
    "where('tenantId', '==', tenantScope.numericId)",
    "where('storeId', '==', storeScope.numericId)",
  ].forEach((token) => assertIncludes(answerlatticeBillingClient, token, 'Answerlattice billing client exact product/workspace query scope'));
  [
    "where('pId', '==', 'AL')",
    "where('productId', '==', 'AL')",
    "where('pId', '==', 'ML')",
    "where('productId', '==', 'ML')",
    "await assertFails(getDocs(query(",
    "payment_conflicting_1",
  ].forEach((token) => assertIncludes(answerlatticeBillingRulesTest, token, 'Billing product-alias rules regression'));
  [
    'skip_unclassified_product',
    'skip_conflicting_or_other_product',
    'skip_invalid_scope',
    "aliases.some((value) => value !== PRODUCT_IDS.MENULIST)",
    "getConsistentScopeAliases(record, ['tenantId', 'tId'])",
    "getConsistentScopeAliases(record, ['storeId', 'sId'])",
    "pId: PRODUCT_IDS.MENULIST",
    "productId: PRODUCT_IDS.MENULIST",
  ].forEach((token) => assertIncludes(billingRecordProductIdentity, token, 'Billing record identity compatibility classifier'));
  [
    "new Set(['menulist-prod', 'menulist-qa'])",
    'DB_COLLECTIONS.SUBSCRIPTIONS',
    'DB_COLLECTIONS.PAYMENT_TRANSACTIONS',
    "getArg('--collection')",
    "getArg('--confirm-project') !== projectId",
    "!hasFlag('--all-billing-records')",
    'FieldPath.documentId()',
    'productIdentityBackfilledAt: FieldValue.serverTimestamp()',
  ].forEach((token) => assertIncludes(billingRecordProductIdentityBackfill, token, 'Billing record identity migration guard'));
  [
    "{ status: 'skip_unclassified_product' }",
    "{ status: 'skip_conflicting_or_other_product' }",
    "{ status: 'skip_invalid_scope' }",
  ].forEach((token) => assertIncludes(billingRecordProductIdentityTest, token, 'Billing record identity migration regression'));
  [
    'const toMilliseconds = (value: unknown): number | null => {',
    "typeof record.toMillis === 'function'",
    "typeof record.toDate === 'function'",
    'if (date === null) return null;',
    'if (credits <= 0 || date === null) return null;',
  ].forEach((token) => assertIncludes(billingHistoryFormatter, token, 'Billing history timestamp admission boundary'));
  assertNotIncludes(billingHistoryFormatter, 'if (!parsed) return Date.now();', 'Billing history must not render malformed persisted dates as current time');
  assert(
    packageJson.scripts?.['smoke:razorpay-sandbox-readonly'] === 'node scripts/verification/verify-razorpay-sandbox-readiness.mjs',
    'package.json must expose smoke:razorpay-sandbox-readonly',
  );

  [
    "const TEST_KEY_ID_PATTERN = /^rzp_test_[A-Za-z0-9]+$/;",
    "const LIVE_KEY_ID_PATTERN = /^rzp_live_/;",
    "throw new Error(`${name.toLowerCase()}_live_key_refused`)",
    "const keyId = requireTestKeyId('NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID');",
    "readCollection('payments.all', () => razorpay.payments.all({ count: 1 }))",
    "readCollection('orders.all', () => razorpay.orders.all({ count: 1 }))",
    "readCollection('plans.all', () => razorpay.plans.all({ count: 1 }))",
    "readCollection('subscriptions.all', () => razorpay.subscriptions.all({ count: 1 }))",
    'Razorpay.validateWebhookSignature(',
    "boundary: 'read_only_provider_inventory_and_synthetic_signature_only'",
    'mutationAllowed: false',
    'tamperedBodyRejected',
    'validSignatureAccepted',
  ].forEach((token) => assertIncludes(razorpaySandboxReadiness, token, 'Razorpay sandbox read-only readiness command'));
  assertNotIncludes(
    razorpaySandboxReadiness,
    "requireTestKeyId('MENULIST_RAZORPAY_KEY_ID')",
    'Razorpay sandbox readiness must not restore the redundant server key-id alias',
  );
  [
    'razorpay.orders.create(',
    'razorpay.subscriptions.create(',
    'razorpay.payments.capture(',
    'razorpay.payments.refund(',
    'firebase-admin',
    'firebase/firestore',
  ].forEach((token) => assertNotIncludes(razorpaySandboxReadiness, token, 'Razorpay sandbox read-only mutation boundary'));
  assertIncludes(externalCertificationRunbook, 'npm run smoke:razorpay-sandbox-readonly', 'External certification Razorpay maintained read-only command');
  assertIncludes(externalCertificationRunbook, 'four bounded GET-only provider inventory calls', 'External certification Razorpay read-only provider boundary');
  assertIncludes(productionReadinessReadme, 'payments, orders, plans, and subscriptions', 'Production readiness Razorpay maintained preflight evidence');
  assertIncludes(auditDoc, 'Razorpay maintained read-only sandbox preflight checkpoint', 'Production audit Razorpay maintained preflight evidence');
  assertIncludes(changelog, 'Razorpay Read-Only Sandbox Preflight', 'Changelog Razorpay maintained preflight evidence');

  [
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH = 180',
    'export function normalizeBillingSubscriptionDocumentId(value: unknown): string | null {',
    'documentId === rawDocumentId && isValidFirestoreDocumentId(documentId)',
    'isValidFirestoreDocumentId(documentId)',
  ].forEach((token) => assertIncludes(subscriptionDocumentIdBoundary, token, 'billing subscription document ID boundary helper'));

  [
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'BILLING_TOPUP_DOCUMENT_ID_MAX_LENGTH = 180',
    'RAZORPAY_ORDER_DOCUMENT_ID_PATTERN = /^order_[a-zA-Z0-9]+$/',
    'export function normalizeBillingTopupDocumentId(value: unknown): string | null {',
    'documentId !== rawDocumentId',
    'export function normalizeBillingTopupScopeDocumentId(value: unknown): BillingTopupScopeDocumentId | null {',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
    'isValidFirestoreDocumentId(documentId)',
  ].forEach((token) => assertIncludes(topupDocumentIdBoundary, token, 'billing top-up document ID boundary helper'));

  verifyProtectedPaymentRoute(createSubscription, 'create-subscription route boundary', '/api/razorpay/create-subscription');
  verifyProtectedPaymentRoute(verifySubscription, 'verify-subscription route boundary', '/api/razorpay/verify-subscription');
  verifyProtectedPaymentRoute(upgradeSubscription, 'upgrade-subscription route boundary', '/api/razorpay/upgrade-subscription');
  verifyProtectedPaymentRoute(createTopupOrder, 'create-topup-order route boundary', '/api/razorpay/create-topup-order');

  [
    'claimBillingCheckoutLease',
    'markBillingCheckoutProviderCreateStarted',
    'renewExpiredBillingCheckoutLease',
    'renewBillingCheckoutProviderRecoveryLease',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'releaseBillingCheckoutLease',
    "status === 'provider_created'",
    "status === 'completed'",
    "existing.status === 'provider_creating'",
    "outcome: 'recover_provider' as const",
    "context.kind !== 'topup'",
    'canReleasePreProvider',
    'canReleaseCompensatedProvider',
    'BILLING_CHECKOUT_COMPLETED_REPLAY_MS',
    'BILLING_CHECKOUT_PROCESSING_LEASE_MS',
  ].forEach((token) => assertIncludes(billingCheckoutLease, token, 'Server billing checkout concurrency boundary'));
  assert(
    packageJson.scripts?.['test:billing-checkout-concurrency:emulator']?.includes('test-billing-checkout-concurrency-emulator.ts'),
    'package.json must expose billing checkout concurrency emulator coverage',
  );
  assert(
    packageJson.scripts?.['test:billing-checkout-concurrency:emulator']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'billing checkout concurrency command must clear inherited ADC',
  );
  assert(
    packageJson.scripts?.['test:billing-coordination:rules']?.includes('test-billing-coordination-rules.ts'),
    'package.json must expose billing coordination Firestore rules coverage',
  );
  assert(
    packageJson.scripts?.['test:billing-coordination:rules']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'billing coordination rules command must clear inherited ADC',
  );
  [
    'exactly one concurrent checkout lease claim must win',
    'renewExpiredBillingCheckoutLease',
    'renewBillingCheckoutProviderRecoveryLease',
    'markBillingCheckoutProviderCreateStarted',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'postReplayClaim',
    "outcome, 'conflict'",
    'releaseBillingCheckoutLease',
  ].forEach((token) => assertIncludes(billingCheckoutConcurrencyTest, token, 'Billing checkout concurrency emulator test'));
  [
    "'billingCheckoutLeases'",
    "'billingProviderPlans'",
    'assertFails(getDoc',
    'assertFails(setDoc',
  ].forEach((token) => assertIncludes(billingCoordinationRulesTest, token, 'Billing coordination Firestore rules test'));
  [
    'claimBillingCheckoutLease(checkoutLeaseIdentity)',
    'recoverCheckoutProviderSubscription',
    "checkoutClaim.outcome === 'recover_provider'",
    'markBillingCheckoutProviderCreateStarted',
    'The provider is still resolving this checkout.',
    'providerSubscriptionCheckpointLost',
    'providerEntityId: subscriptionForLog.id',
    'checkoutAttemptId',
    'checkoutAttemptStartedAtMillis',
    'startedAtMillis: checkoutAttemptStartedAtMillis ?? Date.now()',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'releaseBillingCheckoutLease',
  ].forEach((token) => assertIncludes(createSubscription, token, 'Subscription checkout recovery boundary'));
  [
    'normalizeBillingSubscriptionDocumentId(candidate?.id)',
    'RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(candidateId)',
    "candidate.status !== 'created'",
    'candidate.plan_id !== expected.providerPlanId',
    'notes.checkoutAttemptId !== expected.attemptId',
    'notes.productId !== expected.productId',
    'notes.planId !== expected.planId',
    'matchesCanonicalScopeNote(notes.tenantId, expected.tenantId)',
    'matchesCanonicalScopeNote(notes.storeId, expected.storeId)',
    'matchesCanonicalQuantity(notes.quantity, expected.quantity, true)',
    'matchesCanonicalQuantity(candidate.quantity, expected.quantity, false)',
  ].forEach((token) => assertIncludes(checkoutProviderSubscriptionRecovery, token, 'Subscription checkout provider-recovery identity boundary'));
  assertIncludes(createSubscription, 'isMatchingCheckoutProviderSubscription(candidate, params)', 'Subscription checkout recovery must use exact provider identity admission');
  assertNotIncludes(createSubscription, 'Number(notes.quantity || candidate.quantity || 1)', 'Subscription checkout recovery must not coerce conflicting quantity evidence');
  assertNotIncludes(createSubscription, "String(notes.checkoutAttemptId || '')", 'Subscription checkout recovery must not coerce attempt identity');
  assertNotIncludes(createSubscription, "String(notes.tenantId || '')", 'Subscription checkout recovery must not coerce tenant scope');
  [
    'claimBillingCheckoutLease(checkoutLeaseIdentity)',
    'getTopupCheckoutReceipt',
    'recoverCheckoutOrder',
    "checkoutClaim.outcome === 'recover_provider'",
    'renewBillingCheckoutProviderRecoveryLease',
    'markBillingCheckoutProviderCreateStarted',
    'receipt,',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'billingStoreId',
    'releaseBillingCheckoutLease',
  ].forEach((token) => assertIncludes(createTopupOrder, token, 'Top-up checkout recovery boundary'));
  [
    'orderEntity?.notes?.billingStoreId || orderEntity?.notes?.storeId',
  ].forEach((token) => assertIncludes(webhook, token, 'Inherited-outlet top-up billing-history routing'));
  [
    'BILLING_PROVIDER_PLANS',
    'RAZORPAY_PLAN_REGISTRY_LEASE_MS',
    'RAZORPAY_PLAN_REGISTRY_STATE_VERSION',
    'claimProviderPlanRegistry',
    'markProviderPlanCreateStarted',
    "outcome: 'recover_provider'",
    'findProviderPlan',
    'waitForProviderPlanRegistry',
    "status: 'processing'",
    "status: 'provider_creating'",
    "status: 'ready'",
  ].forEach((token) => assertIncludes(razorpayPlanHandler, token, 'Razorpay provider plan concurrency registry'));
  assert(
    packageJson.scripts?.['test:billing-provider-plan-registry:emulator']?.includes('test-billing-provider-plan-registry-emulator.ts'),
    'package.json must expose provider-plan registry emulator coverage',
  );
  assert(
    packageJson.scripts?.['test:billing-provider-plan-registry:emulator']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'provider-plan registry emulator must clear inherited ADC',
  );
  [
    'one provider-plan registry claim must win',
    "outcome: 'recover_provider'",
    'must-not-replace-provider-attempt',
    'an expired pre-provider owner cannot start after replacement',
    'legacy-replacement-must-not-win',
    'the first ready provider identity remains authoritative',
  ].forEach((token) => assertIncludes(billingProviderPlanRegistryTest, token, 'Provider-plan registry emulator'));
  [
    'BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT = 100',
    'appendBoundedBillingStatusHistory',
    '.slice(-BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT)',
  ].forEach((token) => assertIncludes(subscriptionStatusHistory, token, 'Bounded subscription status history'));
  [
    'providerConcurrency = 5',
    'runtimeBudgetMs = 6 * 60 * 1000',
    "doc('subscriptionReconciliationCursor')",
    'await cursorRef.delete();',
    'syncDetails.length < 100',
    'checkpointed',
    'cycleCompleted',
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'Bounded subscription reconciliation'));
  assertNotIncludes(
    reconciliationFunction,
    'cursorRef.delete().catch(() => undefined)',
    'Subscription reconciliation cursor cleanup must remain fail-visible',
  );
  [
    ".where('pId', '==', MENULIST_PRODUCT_ID)",
    ".where('productId', '==', MENULIST_PRODUCT_ID)",
    'getExactMenuListSubscriptionScope(current)',
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'MenuList reconciliation exact product boundary'));
  [
    "typeof value !== 'number'",
    'getProviderEpochMillis(rzpSub.current_start)',
    'getProviderSubscriptionQuantity(rzpSub.quantity)',
    'const hasInvalidProviderScalar = [',
    "throw new Error('Razorpay subscription scalar is invalid.');",
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'MenuList reconciliation exact provider scalar boundary'));
  [
    'export function getReconciliationEntitlementDecision(',
    '} = getReconciliationEntitlementDecision(',
    'updates.billingEntitlementSyncPending = true;',
    'nextSubscription.billingEntitlementSyncPending = true;',
    'billingEntitlementSyncPending: FieldValue.delete(),',
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'MenuList reconciliation durable entitlement repair boundary'));
  assertOrder(
    reconciliationFunction,
    '} = getReconciliationEntitlementDecision(',
    'updates.billingEntitlementSyncPending = true;',
    'Reconciliation must derive the next entitlement before persisting its retry marker',
  );
  assertNotIncludes(reconciliationFunction, 'const seconds = Number(value);', 'Functions reconciliation must not coerce provider timestamps');
  assertNotIncludes(reconciliationFunction, 'const quantity = Number(value);', 'Functions reconciliation must not coerce provider quantity');
  assertNotIncludes(reconciliationFunction, 'Number(current.creditsLastResetMonth)', 'Functions reconciliation must not coerce the persisted credit-reset period');
  [
    ".where('pId', '==', MENULIST_PRODUCT_ID)",
    ".where('productId', '==', MENULIST_PRODUCT_ID)",
  ].forEach((token) => assertIncludes(messagingEngine, token, 'MenuList lifecycle messaging exact product boundary'));
  [
    ".where('pId', '==', 'ML')",
    ".where('productId', '==', 'ML')",
    ".orderBy('modifiedOn', 'desc')",
  ].forEach((token) => assertIncludes(founderMonitorSnapshot, token, 'Founder Monitor MenuList subscription boundary'));
  [
    'getExactMenuListSubscriptionScope(subscription)',
    'String(subscriptionScope.tenantId) !== params.tId',
    'String(subscriptionScope.storeId) !== billingStoreId',
  ].forEach((token) => assertIncludes(aiCapacityRecovery, token, 'AI reservation recovery product boundary'));
  [
    "name: 'billing_health_snapshot'",
    "doc('billing')",
    "doc('billing').set(state)",
    'replaceBillingHealthState({',
    'expiredProcessingCheckoutCount',
    'expiredProcessingProviderPlanCount',
    'ambiguousProviderCheckoutCount',
    'ambiguousProviderPlanCount',
    'orphanedProviderCheckoutCount',
    ".where('status', '==', 'provider_creating')",
    ".where('leaseExpiresAt', '<=', now)",
    'failedWebhookEventCount',
    'staleWebhookClaimCount',
    'webhookRetentionCutoff',
    'webhookEventsDeleted',
    ".where('status', '==', 'processing')",
    ".where('status', '==', 'provider_created')",
    ".filter((snapshot) => ['processed', 'failed', 'processing'].includes",
    '.slice(0, 200)',
    "title: 'Billing Recovery Attention'",
    'await createAlert({',
  ].forEach((token) => assertIncludes(maintenanceScheduler, token, 'Billing health summary task'));
  [
    'replaceBillingHealthStateForTest',
    "stalePrivateField: 'must-be-pruned'",
    "assert.deepEqual(Object.keys(billingHealth).sort()",
  ].forEach((token) => assertIncludes(maintenanceTaskLeaseTest, token, 'Exact billing health state emulator'));
  [
    'match /billingCheckoutLeases/{leaseId}',
    'match /billingProviderPlans/{registryId}',
  ].forEach((token) => assertIncludes(firestoreRules, token, 'Server-only billing coordination rules'));
  [
    'Concurrent checkout recovery',
    'billingProviderPlans',
    'Bounded history',
    'Billing health',
  ].forEach((token) => assertIncludes(razorpayReadmeDoc, token, 'Razorpay scale-hardening README parity'));
  [
    '**Paid-cycle plan entitlement:**',
    'Current `active`, `cancelled`, and `paused` subscriptions carry the purchased plan mirror only when captured/manual payment evidence exists and `cycleEndDate` is exact and has not elapsed',
    'at most 500 due cancelled/paused rows each hour',
  ].forEach((token) => assertIncludes(razorpayReadmeDoc, token, 'Razorpay paid-cycle entitlement README parity'));
  [
    'Current `active`, `cancelled`, and `paused` subscriptions carry an active plan type only when captured/manual payment evidence exists and `cycleEndDate` is exact and has not elapsed',
    'The hourly `subscription_access_expiry` maintenance task transitions at most 500 due cancelled/paused rows per run',
    'The store and platform plan mirrors retain the purchased plan through that same paid cycle',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay paid-cycle entitlement implementation docs'));
  [
    'The same scheduler owns `subscription_access_expiry` every 60 minutes.',
    '`subscriptions(pId ASC, productId ASC, status ASC, cycleEndDate ASC)` composite index',
    'the hourly leased expiry task changes the row to `expired`',
  ].forEach((token) => assertIncludes(activeSubscriptionFlowDoc, token, 'Razorpay active-subscription paid-cycle flow docs'));
  [
    '## Hourly Paid-Cycle Access Expiry (`subscription_access_expiry`)',
    'Up to 500 document reads across five 100-row pages',
    '`billingEntitlementSyncPending: true` remains on the subscription',
  ].forEach((token) => assertIncludes(razorpayFirebaseDoc, token, 'Razorpay paid-cycle Firebase cost docs'));
  assertIncludes(auditDoc, 'Cross-checking cancellation copy found the store/platform plan mirror removed cancelled/paused subscription plans', 'Production audit paid-cycle entitlement evidence');
  assertIncludes(changelog, 'Paid-cycle entitlement matches cancellation copy', 'Changelog paid-cycle entitlement evidence');
  [
    'July 14, 2026 scale and concurrency hardening',
    'billingCheckoutLeases',
    'subscriptionReconciliationCursor',
    'billing_health_snapshot',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay scale-hardening implementation docs'));
  [
    'July 14 Scale-Hardening Cost Delta',
    'At most 908 observation/retention reads + 1 exact health replacement + up to 200 old webhook deletes',
    'billingCheckoutLeases(status, expiresAt)',
  ].forEach((token) => assertIncludes(razorpayFirebaseDoc, token, 'Razorpay scale-hardening Firebase docs'));
  verifyProtectedPaymentRoute(verifyTopup, 'verify-topup route boundary', '/api/razorpay/verify-topup');

  [
    'requireAnswerlatticePermission(',
    'ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING',
    'export const canManageAnswerlatticeBillingMutation = async (',
    'return permission.response === null;',
  ].forEach((token) => assertIncludes(billingAccess, token, 'Answerlattice billing mutation permission boundary'));

  [
    ['create-subscription', createSubscription],
    ['verify-subscription', verifySubscription],
    ['cancel-subscription', cancelSubscription],
    ['pause-subscription', pauseSubscription],
    ['resume-subscription', resumeSubscription],
    ['upgrade-subscription', upgradeSubscription],
    ['create-topup-order', createTopupOrder],
    ['verify-topup', verifyTopup],
  ].forEach(([routeLabel, content]) => {
    assertIncludes(
      content,
      'canManageAnswerlatticeBillingMutation(session, request)',
      `${routeLabel} Answerlattice billing permission boundary`,
    );
    assertIncludes(content, 'failClosedOnProviderError: true', `${routeLabel} billing limiter outage boundary`);
    assertIncludes(content, "reason === 'provider_unavailable'", `${routeLabel} distinguishes limiter outage from quota exhaustion`);
    assertIncludes(content, 'status: providerUnavailable ? 503 : 429', `${routeLabel} returns retryable unavailable status for limiter outage`);
  });
  [createSubscription, cancelSubscription, pauseSubscription, resumeSubscription, upgradeSubscription, createTopupOrder]
    .forEach((content) => assertOrder(
      content,
      'resolveBillingScopeFromSession(session, productId)',
      'canManageAnswerlatticeBillingMutation(session, request)',
      'Answerlattice current-scope-before-billing-permission order',
    ));
  [
    ['create-subscription', createSubscription],
    ['create-topup-order', createTopupOrder],
  ].forEach(([routeLabel, content]) => assertOrder(
    content,
    'const rateLimitResult = await checkRateLimit({',
    'canManageAnswerlatticeBillingMutation(session, request)',
    `${routeLabel} rate-limit-before-persisted-permission-read order`,
  ));
  assertOrder(
    verifySubscription,
    'canManageAnswerlatticeBillingMutation(session, request)',
    'razorpayClient.payments.fetch(razorpay_payment_id)',
    'verify-subscription Answerlattice permission-before-provider-read order',
  );
  assertOrder(
    verifyTopup,
    'canManageAnswerlatticeBillingMutation(session, request)',
    'razorpayClient.orders.fetch(razorpay_order_id)',
    'verify-topup Answerlattice permission-before-provider-read order',
  );

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
      "logger.security(providerUnavailable ? 'Payment Verification Rate Limit Provider Unavailable' : 'Payment Verification Rate Limit Exceeded'",
      `endpoint: '${endpoint}'`,
      "feature: 'PAYMENT_VERIFICATION'",
      "'Retry-After': String(waitSeconds)",
    ].forEach((token) => assertIncludes(content, token, label));
    assertIncludes(content, '...(providerUnavailable ? {} : {', `${label} omits quota diagnostics on provider outage`);
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
    'replacementForSubscriptionId',
    'getDirectActiveProductSubscriptionForStore(productId, tenantId, storeId)',
    'resolveRazorpayPendingCheckoutAction(providerPendingSubscription)',
    "status: 'processing'",
    'razorpayClient.subscriptions.cancel(pendingProviderId)',
    'providerStatus: cleanupProviderStatus',
    'founderMonitorReplacementForSubscriptionId: replacementForSubscriptionId',
    'resolveSubscriptionReplacementEvidence(pending)',
    'const pendingQuantity = pending.quantity == null ? 1 : pending.quantity;',
    'await razorpayClient.subscriptions.cancel(razorpaySubscription.id)',
  ].forEach((token) => assertIncludes(createSubscription, token, 'create-subscription credit/identity boundary'));
  assertNotIncludes(createSubscription, 'body.name', 'create-subscription session identity boundary');
  assertNotIncludes(createSubscription, 'body.email', 'create-subscription session identity boundary');
  assertNotIncludes(createSubscription, 'Number(pending.quantity || 1)', 'create-subscription pending intent must not coerce quantity');
  assertNotIncludes(createSubscription, "String(pending.founderMonitorReplacementForSubscriptionId || '')", 'create-subscription pending intent must not coerce replacement identity');
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
    'resolveProviderBillingProductId(',
    'resolveRazorpaySubscriptionState(providerSubscription, internalSub.quantity)',
    'getProviderCycleBillingPeriodKey(providerState?.currentStartSeconds)',
    'quantity: providerState.quantity',
    'applyProductSubscriptionPayment(productId, {',
    'paymentHistoryId: razorpay_payment_id',
    'safeSyncProductSubscriptionEntitlementFromSubscription(',
    'finalizeProductSubscriptionReplacement({',
    'resolveSubscriptionReplacementEvidence(',
  ].forEach((token) => assertIncludes(verifySubscription, token, 'verify-subscription payment truth boundary'));
  assertOrder(verifySubscription, 'verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)', 'razorpayClient.payments.fetch(razorpay_payment_id)', 'verify-subscription signature-before-provider order');
  assertOrder(verifySubscription, "payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id", 'applyProductSubscriptionPayment(productId, {', 'verify-subscription payment-truth-before-write order');
  assertOrder(verifySubscription, 'applyProductSubscriptionPayment(productId, {', 'safeSyncProductSubscriptionEntitlementFromSubscription(', 'verify-subscription transaction-before-entitlement order');
  assertNotIncludes(verifySubscription, 'monthlyCredits: creditsForPlan', 'verify-subscription replay must not reset credits outside the transaction');
  assertNotIncludes(verifySubscription, 'updateProductSubscription(productId, razorpay_subscription_id, updatePayload)', 'verify-subscription must not bypass payment idempotency transaction');
  assertNotIncludes(verifySubscription, 'Number(providerSubscription.quantity', 'verify-subscription must not coerce provider quantity');
  assertNotIncludes(verifySubscription, 'providerSubscription.current_start * 1000', 'verify-subscription must not coerce provider cycle time');
  assertNotIncludes(verifySubscription, 'const replacementMrrPaise = Number(', 'verify-subscription must not coerce replacement MRR evidence');

  [
    'applyProductSubscriptionUpgradeCarryForward(productId, {',
    'newSubscriptionId,',
    'oldSubscriptionId,',
    'storeId: Number(storeId)',
    'tenantId: Number(tenantId)',
    "validateTransition(internalSub.status, 'expired', 'api:upgrade-subscription')",
    'upgradeApplication.oldSubscription',
    'upgradeApplication.newSubscription',
    'safeSyncProductSubscriptionEntitlementFromSubscription(',
    'resolveSubscriptionReplacementEvidence(newInternalSub)',
    "replacementEvidence.outcome !== 'replacement'",
    "newInternalSub.status !== 'active'",
  ].forEach((token) => assertIncludes(upgradeSubscription, token, 'upgrade-subscription carry-forward boundary'));
  assertNotIncludes(upgradeSubscription, 'const { nSi, oSi, rc }', 'upgrade-subscription must not trust browser remaining credits');
  assertNotIncludes(upgradeSubscription, 'updateProductSubscription(productId, internalSub.id', 'upgrade-subscription must not expire the old subscription outside the carry-forward transaction');
  assertNotIncludes(upgradeSubscription, 'updateProductSubscription(productId, newInternalSub.id', 'upgrade-subscription must not write replacement credits outside the carry-forward transaction');
  assertOrder(upgradeSubscription, 'razorpayClient.subscriptions.cancel(oldProviderSubscriptionId)', 'const upgradeApplication = await applyProductSubscriptionUpgradeCarryForward(productId, {', 'upgrade-subscription provider-before-transaction order');
  assertOrder(upgradeSubscription, "newInternalSub.status !== 'active'", 'razorpayClient.subscriptions.fetch(oldProviderSubscriptionId)', 'upgrade-subscription active replacement check before provider mutation');

  [
    'getRazorpayManagedSubscriptionId(oldSubscription)',
    "PROVIDER_TERMINAL_STATUSES.has(String(providerSubscription.status))",
    'razorpayClient.subscriptions.cancel(providerSubscriptionId)',
    'applyProductSubscriptionUpgradeCarryForward(productId, {',
    'application.oldSubscription',
    'application.newSubscription',
    'resolveSubscriptionReplacementEvidence(newSubscription)',
  ].forEach((token) => assertIncludes(subscriptionReplacementFinalization, token, 'subscription replacement finalization boundary'));
  assertOrder(subscriptionReplacementFinalization, 'razorpayClient.subscriptions.cancel(providerSubscriptionId)', 'applyProductSubscriptionUpgradeCarryForward(productId, {', 'subscription replacement provider-before-transaction order');
  [
    'normalizeBillingSubscriptionDocumentId(rawSubscriptionId)',
    "typeof rawPreviousMrrPaise !== 'number'",
    'projection.subscriptionId !== first.subscriptionId',
    'projection.previousMrrPaise !== first.previousMrrPaise',
  ].forEach((token) => assertIncludes(subscriptionReplacementEvidence, token, 'subscription replacement evidence boundary'));

  [
    'settleProductTopupFromProvider({',
    "case 'order.paid':",
    'orderNotes?.packId',
    'productId: eventProductId',
  ].forEach((token) => assertIncludes(webhook, token, 'top-up webhook recovery boundary'));
  [
    "payment?.status !== 'captured'",
    'resolveVerifiedTopupSettlement({',
    'resolveCurrentTopupSubscriptionSettlement({',
    'billingDb.runTransaction(async (tx) =>',
    'isSettledTopupStatus(topupData.status)',
    'resolveTopupCreditDebtAllocation({',
    'topUpCredits: newBalance',
    "status: 'paid'",
  ].forEach((token) => assertIncludes(topupSettlementServer, token, 'top-up webhook settlement server boundary'));
  assertNotIncludes(
    topupSettlementServer,
    'id: subscription.id || subscription.providerSubscriptionId',
    'top-up webhook Answerlattice mirror must use transaction-current projected subscription identity',
  );

  [
    [cancelSubscription, 'cancel-subscription', 'applyProductSubscriptionStatusTransition(productId, {'],
    [pauseSubscription, 'pause-subscription', "expectedStatuses: ['active']"],
    [resumeSubscription, 'resume-subscription', "expectedStatuses: ['paused']"],
  ].forEach(([content, label, transitionToken]) => {
    assertIncludes(content, transitionToken, `${label} transactional status boundary`);
    assertIncludes(content, 'statusApplication.subscription', `${label} current entitlement sync boundary`);
    assertNotIncludes(content, 'await updateProductSubscription(productId, internalSub.id', `${label} must not write status from a stale route snapshot`);
  });

  [
    "getRateLimitForFeature('PAYMENT_TOPUP')",
    'getActiveProductSubscriptionForStore(',
    'razorpayClient.orders.create(orderPayload)',
    "import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from \"@lib/billing/topupDocumentIdBoundary\";",
    'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);',
    'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);',
    'const tenantId = tenantScope.numericId;',
    'const storeId = storeScope.numericId;',
    'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);',
    'if (!topupDocumentId) {',
    'persistPendingProductTopupSnapshot({',
    'billingDb: getBillingFirestoreAdminForProduct(productId)',
    'billingStoreId,',
  ].forEach((token) => assertIncludes(createTopupOrder, token, 'create-topup active-subscription boundary'));
  assertOrder(createTopupOrder, 'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);', 'verifyTenantAccess(session, tenantId, storeId, request)', 'create-topup scope document ID admission before access check');
  assertOrder(createTopupOrder, 'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);', "getRateLimitForFeature('PAYMENT_TOPUP')", 'create-topup scope document ID admission before rate limit/provider work');
  assertOrder(createTopupOrder, 'getActiveProductSubscriptionForStore(', 'razorpayClient.orders.create(orderPayload)', 'create-topup must verify active subscription before provider order');
  assertOrder(createTopupOrder, 'razorpayClient.orders.create(orderPayload)', 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);', 'create-topup provider-before-topup-doc-normalization order');
  assertOrder(createTopupOrder, 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);', 'persistPendingProductTopupSnapshot({', 'create-topup normalized provider order before pending-write order');
  assertNotIncludes(createTopupOrder, '.doc(razorpayOrder.id)', 'create-topup must not build raw top-up refs');
  assertNotIncludes(createTopupOrder, '.set({\n            paymentProvider:', 'create-topup must not merge-overwrite immutable pending top-up identity');

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
    'isSettledTopupStatus(existingTopup.status)',
    'capturedPaymentOrderId !== razorpay_order_id',
    'getActiveProductSubscriptionForStore(productId, tenantId, storeId)',
    'billingDb.runTransaction(async (tx) => {',
    'billingDb.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId)',
    'providerOrderId: topupDocumentId,',
    "status: 'paid'",
    'resolveProviderBillingProductId(',
    'resolveVerifiedTopupSettlement({',
    'resolveCurrentTopupSubscriptionSettlement({',
    'getProductSubscriptionBillingScope(productId, internalSub)',
    'storedSettlement.billingStoreId !== subscriptionStoreId',
    'topupSnapshot: existingTopup',
    'topupSnapshot: topupData',
    'payment: capturedPayment',
    'invalidSubscription: true',
    'Top-up requires billing reconciliation.',
    'subscription: currentSubscription,',
    'transactionResult.subscription,',
  ].forEach((token) => assertIncludes(verifyTopup, token, 'verify-topup payment/order boundary'));
  assertOrder(verifyTopup, 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpay_order_id);', 'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)', 'verify-topup order ID normalized before signature/provider work');
  assertOrder(verifyTopup, 'verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)', 'razorpayClient.orders.fetch(razorpay_order_id)', 'verify-topup signature-before-provider order');
  assertOrder(verifyTopup, 'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);', 'verifyTenantAccess(session, tenantId, storeId, request)', 'verify-topup scope document ID admission before access check');
  assertOrder(verifyTopup, 'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);', 'orderTenantId !== tenantId || orderStoreId !== storeId', 'verify-topup scope document ID admission before provider-note comparison');
  assertOrder(verifyTopup, 'getActiveProductSubscriptionForStore(productId, tenantId, storeId)', 'razorpayClient.payments.fetch(razorpay_payment_id)', 'verify-topup current subscription admission before provider payment capture');
  assertOrder(verifyTopup, 'capturedPaymentOrderId !== razorpay_order_id', 'billingDb.runTransaction(async (tx) => {', 'verify-topup payment-order-before-transaction order');
  assertNotIncludes(verifyTopup, '.doc(razorpay_order_id)', 'verify-topup must not build raw top-up refs');
  assertNotIncludes(verifyTopup, '.doc(String(storeId))', 'verify-topup must not build raw store refs');
  assertNotIncludes(verifyTopup, 'const currentTopUpCredits = Number(subscriptionData?.topUpCredits ?? internalSub.topUpCredits', 'verify-topup must not fall back to a stale subscription balance inside settlement');
  assertNotIncludes(verifyTopup, 'Number(subscription.monthlyCreditsAllowance', 'verify-topup Answerlattice mirror must not coerce raw subscription credits');
  assertNotIncludes(verifyTopup, 'mirrorAnswerlatticeCreditSummary(billingDb, storeDocumentId, internalSub', 'verify-topup replay mirror must use the transaction-current projected subscription');
  assertNotIncludes(verifyTopup, 'tx.set(subscriptionRef, {\n                topUpCredits: newBalance,\n                productId,', 'verify-topup must not overwrite transaction-current subscription identity from stale pre-capture state');

  [
    'RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 256 * 1024',
    'rejectInvalidOrOversizedDeclaredBody(',
    "checkPublicRateLimit(request, 'WEBHOOK')",
    'readBoundedTextBody(',
    'validateRazorpayWebhookSignature(requestBody, signature, secret)',
    'resolveRazorpayWebhookProductDeclaration(eventPayload)',
    'resolveRazorpayWebhookSubscriptionId(eventPayload)',
    'resolveRazorpayWebhookSubscriptionLookupProducts({',
    'resolveRazorpayWebhookSubscriptionProduct({',
    'answerlatticeConfigured: isProductBillingFirestoreConfigured(PRODUCT_IDS.ANSWERLATTICE)',
    'const subscriptionEntries = await Promise.all(subscriptionProducts.map(async (productId) => ([',
    'const subscriptionsByProduct = new Map<ProductId, FirestoreSubscriptionDoc | null>(subscriptionEntries);',
    "throw new Error('Razorpay webhook subscription product is unresolved.');",
    "new Error('razorpay_webhook_product_resolution_failed')",
    "return NextResponse.json({ error: 'Invalid product identity.' }, { status: 400 });",
    'claimRazorpayWebhookEvent({',
    'writeProductPaymentTransactionAudit(eventProductId, auditSummary, webhookClaim.eventKey)',
    'const isSettledTopupEvent =',
    'if (!isSettledTopupEvent)',
    'await writeProductPaymentTransactionAudit(eventProductId, {',
    'amount: topupApplication.settlement.amount,',
    'applyProductSubscriptionPayment(eventProductId, {',
    'applyProductSubscriptionWebhookEvent(eventProductId, {',
    'const eventSubscriptionId = eventProductResolution.subscriptionId;',
    'eventPayloadToUpload.transactionType = resolveRazorpayPaymentTransactionType(paymentEntity);',
    'amountPaise: resolveRazorpayFailedPaymentAmountPaise({',
    'providerAmountPaise: paymentEntity?.amount,',
    'subscriptionQuantity: eventSubscription?.quantity,',
    'subscriptionUnitAmountPaise: eventSubscription?.amount,',
    'resolveRazorpaySubscriptionState(subscriptionEntity, internalSub.quantity)',
    'getProviderCycleBillingPeriodKey(providerState.currentStartSeconds)',
    'resolveRazorpaySubscriptionQuantity(updatedSubEntity.quantity)',
    'safeSyncProductSubscriptionEntitlementFromSubscription(eventProductId, subscription, source)',
    'completeRazorpayWebhookEvent({',
    "if (webhookClaim.outcome === 'processing')",
    'return retryableWebhookResponse();',
    "documentId: getWebhookAlertDocumentId('payment-failure', webhookClaim.eventKey)",
  ].forEach((token) => assertIncludes(webhook, token, 'Razorpay webhook boundary'));
  assertOrder(webhook, 'rejectInvalidOrOversizedDeclaredBody(', "checkPublicRateLimit(request, 'WEBHOOK')", 'webhook declared-size-before-rate-limit order');
  assertOrder(webhook, "checkPublicRateLimit(request, 'WEBHOOK')", 'readBoundedTextBody(', 'webhook rate-limit-before-body-read order');
  assertOrder(webhook, 'readBoundedTextBody(', 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'webhook bounded-body-before-signature order');
  assertOrder(webhook, 'eventProductResolution = await resolveWebhookEventProduct(event);', 'claimRazorpayWebhookEvent({', 'webhook product resolution before product-local persistence');
  assertOrder(webhook, 'const subscriptionEntries = await Promise.all(subscriptionProducts.map(async (productId) => ([', "throw new Error('Razorpay webhook subscription product is unresolved.');", 'missing subscription ownership must remain retryable');
  assertOrder(webhook, 'resolveRazorpayWebhookSubscriptionId(eventPayload)', 'const subscriptionEntries = await Promise.all(subscriptionProducts.map(async (productId) => ([', 'exact subscription identity before ownership reads');
  assertOrder(webhook, 'const subscriptionReads = new Map<string, Promise<FirestoreSubscriptionDoc | null>>();', 'subscriptionReads.set(', 'resolved subscription must seed the request-local cache');
  assertOrder(webhook, 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'claimRazorpayWebhookEvent({', 'webhook signature-before-idempotency order');
  assertOrder(webhook, 'const eventSubscription = eventSubscriptionId', 'amountPaise: resolveRazorpayFailedPaymentAmountPaise({', 'failed movement must derive subscription-only event amounts from the resolved local subscription');
  assertNotIncludes(webhook, '.catch(() => null)', 'Webhook product lookup failures must remain retryable rather than defaulting to MenuList');
  assertNotIncludes(webhook, 'paymentEntity?.subscription_id || event.payload?.subscription?.entity?.id', 'Webhook processing must use the canonical exact subscription identity');
  assertNotIncludes(webhook, 'const quantity = Number(updatedSubEntity.quantity);', 'Webhook quantity updates must not coerce provider values');
  assertNotIncludes(webhook, 'subscriptionEntity.current_start * 1000', 'Webhook activation must use exact projected provider cycle time');
  assertNotIncludes(webhook, 'const replacementMrrPaise = Number(', 'Webhook replacement MRR evidence must not be coerced');
  assertNotIncludes(webhook, 'updatedSubEntity.updated_at * 1000', 'Webhook quantity MRR must not coerce provider event time');
  assertNotIncludes(webhook, 'cancelledSubEntity.ended_at * 1000', 'Webhook cancellation must not coerce provider event time');
  assertOrder(webhook, 'const topupApplication = await settleProductTopupFromProvider', 'await writeProductPaymentTransactionAudit(eventProductId, {', 'top-up audit must follow immutable settlement');
  assertNotIncludes(webhook, 'statuses: [', 'webhook status history must be transaction-owned');
  assertNotIncludes(webhook, 'updateSubscriptionForProduct(', 'webhook status events must not bypass event transaction');

  [
    "| { eventKey: string; outcome: 'processed' }",
    "| { eventKey: string; outcome: 'processing' }",
    "if (current?.status === 'processed')",
    "return { eventKey, outcome: 'processing' as const }",
    'projectRazorpayWebhookRecord(',
    'value.stateVersion !== RAZORPAY_WEBHOOK_STATE_VERSION',
    'value.eventKey !== expectedEventKey',
    '!isValidAttemptId(value.attemptId)',
    'Number(retryCount) < 0',
    "throw new Error('Razorpay webhook ledger state is invalid.');",
    "current?.status !== 'processing'",
    'current.attemptId !== params.attemptId',
    "if (current?.status === 'processed') return 'already_processed';",
    "return 'ownership_lost';",
    'transaction.set(eventRef, {',
  ].forEach((token) => assertIncludes(razorpayWebhookLease, token, 'Razorpay webhook lease boundary'));
  [
    'one webhook attempt must own concurrent processing',
    'an older failed attempt cannot finish a newer retry',
    'expired owner cannot downgrade replacement work',
    'successful retry must prune stale failure fields',
    'terminal state must not retain a lease',
    'a status-only row must not suppress a signed payment event',
    'embedded event identity must match the deterministic document key',
    'malformed retry state must not become terminal payment truth',
    'processing webhook claims must remain a separately discriminated contract variant',
  ].forEach((token) => assertIncludes(razorpayWebhookLeaseTest, token, 'Razorpay webhook lease emulator'));
  [
    "import { FieldValue } from 'firebase-admin/firestore';",
    'if (value instanceof FieldValue) return value;',
    'await db.runTransaction(async (transaction) => {',
    "throw new Error('Billing audit document identity conflict.');",
    "throw new Error('Billing audit product identity is invalid.');",
    "throw new Error('Billing audit scope identity is invalid.');",
    'data: Record<string, unknown>',
    'const hasScope = [data.tenantId, data.tId, data.storeId, data.sId]',
    'const scope = hasScope ? getProductSubscriptionBillingScope(productId, data) : null;',
    'const immutableFields = [',
    'existingHasScope !== hasScope',
    'createdOn: isTimestampLike(existingCreatedOn) ? existingCreatedOn : now,',
  ].forEach((token) => assertIncludes(productBillingServer, token, 'Razorpay payment audit timestamp/identity boundary'));
  assertNotIncludes(productBillingServer, 'const tenantId = Number(data?.tenantId ?? data?.tId);', 'Payment audit scope must not be numerically coerced');
  [
    'webhook audit replay must preserve createdOn',
    'webhook audit replay must not replace immutable workspace scope',
    'event-key collision must not replace audit identity',
  ].forEach((token) => assertIncludes(razorpayWebhookLeaseTest, token, 'Razorpay webhook payment-audit emulator'));
  assertIncludes(packageJson.scripts['test:razorpay-webhook-lease:emulator'], 'test-razorpay-webhook-lease-emulator.ts', 'Razorpay webhook lease package gate');

  [
    'safeSyncStorePlanEntitlementFromSubscription(subscription, source)',
    'syncAnswerlatticeSubscriptionEntitlementFromSubscription(subscription, source)',
    'isProductBillingDisabled(productId)',
    'getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE)',
    'return firestoreAdmin;',
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'normalizeAnswerlatticeSubscriptionId,',
    'normalizeAnswerlatticeBillingScopeDocumentId,',
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
    'const subscriptionScope = getProductSubscriptionBillingScope(',
    'PRODUCT_IDS.ANSWERLATTICE,',
    'const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(subscriptionScope?.tenantId);',
    'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(subscriptionScope?.storeId);',
    'const currentScope = getProductSubscriptionBillingScope(',
    'const currentTenantScope = normalizeAnswerlatticeBillingScopeDocumentId(currentScope?.tenantId);',
    'currentTenantScope.numericId !== tenantScope.numericId',
    'currentStoreScope.numericId !== storeScope.numericId',
    'transaction.get(activeSubscriptionsQuery)',
    ".where('tId', '==', tenantScope.numericId)",
    ".where('sId', '==', storeScope.numericId)",
    ".orderBy('cycleEndDate', 'desc')",
    'const summarySubscription = activeSubscription || current;',
    'transaction.set(db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId), {',
    'transaction.set(subscriptionRef, {',
    'export async function applyProductSubscriptionPayment(',
    'return db.runTransaction(async (transaction) => {',
    'if (billingHistory.includes(paymentHistoryId)) {',
    'params.terminalSettlementPaymentId === paymentHistoryId',
    "&& paymentHistoryId.startsWith('pay_')",
    'const shouldResetCredits = !isTerminalSettlementRecovery && (',
    '|| current.creditsLastResetMonth !== params.billingPeriod',
    "throw new Error('Subscription monthly credit allowance is invalid.');",
    'topUpCredits: _ignoredTopUpCredits',
    'transaction.set(subscriptionRef, productDocPayload(productId, update), { merge: true });',
    'db.collection(DB_COLLECTIONS.PAYMENT_TRANSACTIONS).doc(normalizedAuditDocumentId)',
    'export async function applyProductSubscriptionWebhookEvent(',
    'if (eventHistory.includes(eventKey)) {',
    'webhookEventHistory: [...eventHistory.slice(-99), eventKey]',
    "params.nextStatus === 'past_due' && safeUpdate.pastDueSinceAt",
    'export async function applyProductSubscriptionStatusTransition(',
    'params.expectedStatuses?.length',
    'current.status === params.nextStatus',
    "validateTransition(current.status, params.nextStatus, 'api:lifecycle-status-transaction')",
    'export async function applyProductSubscriptionUpgradeCarryForward(',
    'newSubscription.billingHistory.includes(terminalCapturedPaymentId)',
    'transaction.get(oldSubscriptionRef)',
    'transaction.get(newSubscriptionRef)',
    "newSubscription.status !== 'active'",
    'resolveSubscriptionUpgradeCreditTransfer({',
    'transaction.set(oldSubscriptionRef, productDocPayload(productId, oldUpdate), { merge: true });',
    'transaction.set(newSubscriptionRef, productDocPayload(productId, newUpdate), { merge: true });',
    "if (current.status !== 'past_due') {",
    'const gracePeriod = getGracePeriodInfo(current.pastDueSinceAt);',
    '!gracePeriod.hasKnownGracePeriod || gracePeriod.remainingDays > 0',
    "safeSyncProductSubscriptionEntitlementFromSubscription(\n        productId,\n        result.subscription,\n        'server:grace-period-auto-expire',",
  ].forEach((token) => assertIncludes(productBillingServer, token, 'product billing server boundary'));
  assertNotIncludes(productBillingServer, 'Number(current.creditsLastResetMonth)', 'Product subscription payment must not coerce the persisted credit-reset period');
  assertNotIncludes(productBillingServer, 'Number(safeUpdate.monthlyCreditsAllowance', 'Product subscription payment must not coerce the monthly allowance');
  [
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId);',
    'if (!tenantScope || !storeScope) return null;',
    'tenantId: tenantScope.numericId,',
    'storeId: storeScope.numericId,',
  ].forEach((token) => assertIncludes(productBillingServer, token, 'MenuList session billing scope boundary'));
  assertNotIncludes(productBillingServer, 'const tenantId = Number(session?.user?.tenantId);', 'MenuList session billing scope must not coerce nullable tenant identity');
  assertNotIncludes(productBillingServer, 'const storeId = Number(session?.user?.storeId);', 'MenuList session billing scope must not coerce nullable store identity');
  assertNotIncludes(productBillingServer, '.doc(String(storeId))', 'product billing server must not build Answerlattice store refs from raw store IDs');
  assertNotIncludes(productBillingServer, '.doc(storeId).set({', 'product billing server must not write Answerlattice entitlement store refs from raw store IDs');
  assertNotIncludes(productBillingServer, '.doc(providerSubscriptionId)', 'product billing server must not build raw Answerlattice provider subscription refs');
  assertNotIncludes(productBillingServer, '.doc(subscription.id)', 'product billing server must not build raw Answerlattice subscription refs');
  assertNotIncludes(productBillingServer, "const summarySubscriptionId = String(subscriptionSummary?.id || subscriptionSummary?.providerSubscriptionId || '').trim();", 'product billing server must not use raw Answerlattice summary subscription refs');

  [
    'documentId !== rawDocumentId',
    'export function normalizeAnswerlatticeBillingScopeDocumentId(value: unknown): AnswerlatticeBillingScopeDocumentId | null',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
  ].forEach((token) => assertIncludes(answerlatticeBillingDocumentIdBoundary, token, 'Answerlattice billing document/scope boundary'));

  [
    'export const getAnswerlatticeBillingRecordScope = (',
    'record.pId === PRODUCT_IDS.ANSWERLATTICE',
    'record.productId === PRODUCT_IDS.ANSWERLATTICE',
    "const tId = getExactNumericScope(record, ['tId', 'tenantId']);",
    "const sId = getExactNumericScope(record, ['sId', 'storeId']);",
  ].forEach((token) => assertIncludes(answerlatticeBillingScopeBoundary, token, 'Answerlattice persisted billing identity boundary'));

  [
    'normalizeAnswerlatticeBillingScopeDocumentId(tenantId)',
    'normalizeAnswerlatticeBillingScopeDocumentId(storeId)',
    'isAnswerlatticeStoreInScope(storeData, { tenantId, storeId }, storeSnapshot.id)',
    'isAnswerlatticeSubscriptionInScope(subscriptionData, { tId: tenantId, sId: storeId })',
    'isAnswerlatticePaymentHistoryItemInScope(item, {',
    'isAnswerlatticeSubscriptionCurrent(summarySubscription)',
    "where('event', 'in', ['subscription.charged', 'order.paid'])",
    "orderBy('created_at', 'desc')",
    'limit(25)',
  ].forEach((token) => assertIncludes(answerlatticeBillingClient, token, 'Answerlattice client billing current/history boundary'));
  assertNotIncludes(answerlatticeBillingClient, 'getStoreDocumentRef(storeId)', 'Answerlattice client billing must not build raw store refs');
  assertNotIncludes(answerlatticeBillingClient, 'Number(item.tenantId ?? item.tId)', 'Answerlattice billing history must not coerce persisted tenant ownership');
  assertNotIncludes(answerlatticeBillingClient, 'Number(item.storeId ?? item.sId)', 'Answerlattice billing history must not coerce persisted store ownership');
  [
    'isAnswerlatticeStoreInScope(',
    'const scope = getProductSubscriptionBillingScope(productId, subscription);',
    'const currentScope = getProductSubscriptionBillingScope(productId, currentRecord);',
    'isAnswerlatticeSubscriptionInScope(subscriptionData, {',
    'isAnswerlatticeSubscriptionInScope(currentData, {',
    'pId: PRODUCT_IDS.ANSWERLATTICE,',
    'tId: currentTenantScope.numericId,',
    'sId: currentStoreScope.numericId,',
    ".where('tId', '==', tenantScope.numericId)",
    ".where('sId', '==', storeScope.numericId)",
  ].forEach((token) => assertIncludes(productBillingServer, token, 'Answerlattice product billing persisted ownership boundary'));
  assertNotIncludes(productBillingServer, "String(subscription.pId ?? subscription.productId ?? '').trim().toUpperCase()", 'Answerlattice product billing must not normalize persisted product ownership');
  assert(
    answerlatticeIndexes.indexes.some((index) => index.collectionGroup === 'payment_transactions'
      && index.fields?.some((field) => field.fieldPath === 'pId')
      && index.fields?.some((field) => field.fieldPath === 'productId')
      && index.fields?.some((field) => field.fieldPath === 'event')
      && index.fields?.some((field) => field.fieldPath === 'created_at' && field.order === 'DESCENDING')),
    'Answerlattice indexes must support ordered paid billing history',
  );
  assertNotIncludes(
    productBillingServer,
    'subscription.tenantId ?? subscription.tId',
    'Answerlattice entitlement sync must not select one input tenant alias',
  );
  assertNotIncludes(
    productBillingServer,
    'subscription.storeId ?? subscription.sId',
    'Answerlattice entitlement sync must not select one input store alias',
  );
  [
    'a conflicting input subscription alias must not write Answerlattice store entitlement',
    'a conflicting input subscription alias must not acknowledge entitlement sync',
  ].forEach((token) => assertIncludes(
    productSubscriptionScopeEmulator,
    token,
    'Answerlattice entitlement entry-scope emulator regression',
  ));
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'payment_transactions'
      && index.fields?.some((field) => field.fieldPath === 'pId')
      && index.fields?.some((field) => field.fieldPath === 'productId')
      && index.fields?.some((field) => field.fieldPath === 'event')
      && index.fields?.some((field) => field.fieldPath === 'created_at' && field.order === 'DESCENDING')),
    'MenuList indexes must support exact-product ordered paid billing history',
  );
  assert(
    answerlatticeIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.fields?.some((field) => field.fieldPath === 'pId')
      && index.fields?.some((field) => field.fieldPath === 'productId')
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'storeId')
      && index.fields?.some((field) => field.fieldPath === 'tenantId')
      && index.fields?.some((field) => field.fieldPath === 'cycleEndDate' && field.order === 'DESCENDING')),
    'Answerlattice indexes must support authoritative active-subscription entitlement selection',
  );
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.fields?.some((field) => field.fieldPath === 'pId')
      && index.fields?.some((field) => field.fieldPath === 'productId')
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'storeId')
      && index.fields?.some((field) => field.fieldPath === 'tenantId')
      && index.fields?.some((field) => field.fieldPath === 'cycleEndDate' && field.order === 'DESCENDING')),
    'MenuList indexes must support exact-product latest-cycle subscription selection',
  );
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'storeId')
      && index.fields?.some((field) => field.fieldPath === 'tenantId')
      && index.fields?.some((field) => field.fieldPath === 'cycleEndDate' && field.order === 'DESCENDING')),
    'MenuList indexes must support latest-cycle active subscription selection',
  );
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'billingCheckoutLeases'
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'expiresAt')),
    'MenuList indexes must support status-scoped checkout recovery health queries',
  );
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'billingProviderPlans'
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'leaseExpiresAt')),
    'MenuList indexes must support status-scoped provider-plan recovery health queries',
  );
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'razorpayWebhookEvents'
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'processingExpiresAt')),
    'MenuList indexes must support status-scoped stale webhook claim queries',
  );

  [
    'export function isValidBillingPeriodKey(value: unknown): value is number',
    'month >= 1 && month <= 12',
    'referenceDate.getUTCFullYear()',
    'start.getUTCFullYear()',
  ].forEach((token) => assertIncludes(billingPeriod, token, 'billing period deterministic boundary'));

  [
    'export function resolveCurrentTopupSubscriptionSettlement(',
    "resolveExactIdentityAliases(subscription, ['tenantId', 'tId'], params.expectedTenantId)",
    "resolveExactIdentityAliases(subscription, ['storeId', 'sId'], params.expectedStoreId)",
    'subscription.pId !== params.expectedProductId',
    'subscription.productId !== params.expectedProductId',
    'asExactNonNegativeSafeInteger(subscription.topUpCredits ?? 0)',
    'providerSubscriptionId: string | null;',
    'asBoundedNonEmptyString(subscription.providerSubscriptionId, 180)',
    'export function resolveVerifiedTopupSettlement(',
    'export function isSettledTopupStatus(value: unknown): boolean',
    'providerOrderId !== params.expectedOrderId',
    'topup.pId !== params.expectedProductId',
    'topup.productId !== params.expectedProductId',
    "resolveNormalizedProviderIdentityAliases(notes, ['tenantId', 'tId'], params.expectedTenantId)",
    "resolveNormalizedProviderIdentityAliases(notes, ['storeId', 'sId'], params.expectedStoreId)",
    'asPositiveSafeInteger(notes.billingStoreId) !== billingStoreId',
    'asPositiveSafeInteger(payment.amount) !== amount',
    'asExactPositiveSafeInteger(topup.amount)',
    'asExactPositiveSafeInteger(topup.creditsAdded)',
    "status !== 'pending' && storedPaymentId !== params.expectedPaymentId",
  ].forEach((token) => assertIncludes(topupSettlement, token, 'top-up immutable settlement boundary'));
  assertNotIncludes(topupSettlement, 'allowMissingProductId', 'top-up settlement must not infer legacy product identity');
  assertNotIncludes(topupSettlement, 'topup.productId ?? topup.pId', 'top-up settlement must not collapse conflicting product aliases');
  assertNotIncludes(topupSettlement, 'topup.tenantId ?? topup.tId', 'top-up settlement must not collapse conflicting tenant aliases');
  assertNotIncludes(topupSettlement, 'topup.storeId ?? topup.sId', 'top-up settlement must not collapse conflicting store aliases');
  [
    'export async function persistPendingProductTopupSnapshot(',
    'tx.create(topupRef, candidate)',
    "return 'replayed' as const",
    "throw new Error('Pending top-up order identity conflict.')",
    'getProductSubscriptionBillingScope(productId, subscription)',
    'initialSettlement.billingStoreId !== subscriptionScope.storeId',
    'existingSettlement.billingStoreId !== currentSubscription.storeId',
    'Number.isSafeInteger(newBalance)',
  ].forEach((token) => assertIncludes(topupSettlementServer, token, 'top-up create/replay and webhook settlement scope boundary'));

  [
    'export function resolveSubscriptionUpgradeCreditTransfer(',
    'replacementCarryForwardFromSubscriptionId === params.oldSubscriptionId',
    'currentNewTopUpCredits + remainingCredits',
    'carryAlreadyApplied ? storedCarryForwardCredits : remainingCredits',
  ].forEach((token) => assertIncludes(subscriptionUpgradeSettlement, token, 'subscription upgrade credit transfer boundary'));

  assert(
    packageJson.scripts?.['test:billing-settlement-boundaries']
      === 'ts-node --compiler-options \'{"module":"CommonJS"}\' -r tsconfig-paths/register scripts/verification/test-billing-settlement-boundaries.ts',
    'package.json must expose test:billing-settlement-boundaries',
  );

  [
    "PLAN_ENTITLED_SUBSCRIPTION_STATUSES = ['active', 'cancelled', 'paused']",
    'Object.getOwnPropertyDescriptors(value)',
    'subscription.cycleEndDate === undefined || subscription.cycleEndDate === null',
    'cycleEndMs > 0 && cycleEndMs >= nowMs',
    "typeof subscription.planId !== 'string'",
    'getActivePlanTypeForSubscription',
  ].forEach((token) => assertIncludes(subscriptionPlanEntitlement, token, 'MenuList paid-cycle plan entitlement boundary'));
  [
    'Object.getOwnPropertyDescriptors(value)',
    'sub.cycleEndDate === undefined || sub.cycleEndDate === null',
    'cycleEndMs > 0 && cycleEndMs >= nowMs',
    "typeof planId !== 'string'",
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'Functions paid-cycle plan entitlement boundary'));
  [
    'SUBSCRIPTION_ENTITLEMENT_AUDIT_STATUSES',
    'projectSubscriptionEntitlementAuditStatus(current.status)',
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'Functions entitlement audit status projection'));
  assertIncludes(billingSettlementTest, 'an elapsed active row must not retain plan entitlement', 'MenuList elapsed active plan regression');
  assertIncludes(functionsSubscriptionScopeTest, "id: 'sub_elapsed'", 'Functions elapsed active plan regression');
  assertIncludes(functionsSubscriptionScopeTest, "projectSubscriptionEntitlementAuditStatus('trialing'), null", 'Functions malformed entitlement audit status regression');

  [
    'activePlanType: entitlementValue',
    'normalizeBillingSubscriptionScopeDocumentId,',
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'const expectedTenantScope = normalizeBillingSubscriptionScopeDocumentId(subscription.tenantId);',
    'const expectedStoreScope = normalizeBillingSubscriptionScopeDocumentId(subscription.storeId);',
    'getMenuListSubscriptionEntitlementScope',
    'transaction.get(subscriptionRef)',
    'transaction.get(entitledSubscriptionsQuery)',
    ".where('status', 'in', [...PLAN_ENTITLED_SUBSCRIPTION_STATUSES])",
    ".where('tId', '==', expectedTenantScope.numericId)",
    ".where('sId', '==', expectedStoreScope.numericId)",
    ".where('cycleEndDate', '>=', admin.firestore.Timestamp.now())",
    ".orderBy('cycleEndDate', 'desc')",
    'const currentScope = getMenuListSubscriptionEntitlementScope(current);',
    'currentScope.tenantId !== expectedTenantScope.numericId',
    'currentScope.storeId !== expectedStoreScope.numericId',
    'const candidateScope = getMenuListSubscriptionEntitlementScope(candidate);',
    "transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'),",
    'transaction.set(subscriptionRef, {',
    'billingSubscriptionId: activeSubscriptionIdValue',
    'runStorePublicTruthPostCommitEffects({',
    'storeIds: [syncResult.storeId]',
    'revalidate: (tag) => revalidateTag(tag, { expire: 0 })',
    "'subscriptionEntitlementSync'",
    'invalidateOwnerBusinessAssistantPacketCache({',
    'billing_store_plan_entitlement_post_commit_effect_failed',
    'failedEffectCount: postCommit.failedEffectCount',
    'billing_store_plan_entitlement_sync_failed',
    'SUBSCRIPTION_ENTITLEMENT_AUDIT_STATUSES',
    'projectSubscriptionEntitlementAuditStatus(current.status)',
  ].forEach((token) => assertIncludes(entitlementSync, token, 'MenuList entitlement sync boundary'));
  assertNotIncludes(entitlementSync, '.doc(subscription.id)', 'MenuList entitlement sync must not build raw subscription refs');
  assertNotIncludes(entitlementSync, 'current.tenantId ?? current.tId', 'MenuList entitlement sync must not accept conflicting current tenant aliases');
  assertNotIncludes(entitlementSync, 'current.storeId ?? current.sId', 'MenuList entitlement sync must not accept conflicting current store aliases');
  assertNotIncludes(entitlementSync, 'isSubscriptionEntitlementSynced(', 'MenuList entitlement sync must not retain the unused cast-based sync probe');
  assertNotIncludes(entitlementSync, '(subscription as any)', 'MenuList entitlement sync must not read audit truth through any');
  assertIncludes(productSubscriptionScopeEmulator, 'malformed transaction-current status must not enter the typed entitlement audit mirror', 'MenuList entitlement audit status emulator regression');
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.queryScope === 'COLLECTION'
      && ['pId', 'productId', 'tenantId', 'storeId', 'tId', 'sId'].every((fieldPath) => (
        index.fields?.some((field) => field.fieldPath === fieldPath && field.order === 'ASCENDING')
      ))),
    'MenuList indexes must support exact duplicate-alias subscription fallback queries',
  );
  assert(
    answerlatticeIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.queryScope === 'COLLECTION'
      && ['pId', 'productId', 'tenantId', 'storeId', 'tId', 'sId'].every((fieldPath) => (
        index.fields?.some((field) => field.fieldPath === fieldPath && field.order === 'ASCENDING')
      ))),
    'Answerlattice indexes must support exact duplicate-alias subscription fallback queries',
  );

  [
    "name: 'subscription_access_expiry'",
    'async function runSubscriptionAccessExpiry()',
    ".where('pId', '==', MENULIST_PRODUCT_ID)",
    ".where('productId', '==', MENULIST_PRODUCT_ID)",
    ".where('status', 'in', expiryStatuses)",
    ".where('cycleEndDate', '<=', now)",
    ".orderBy('cycleEndDate', 'asc')",
    "status: 'expired'",
    'billingEntitlementSyncPending: true',
    'syncStorePlanEntitlement(',
    'maxPages = 5',
  ].forEach((token) => assertIncludes(maintenanceScheduler, token, 'Bounded paid-cycle subscription expiry task'));
  assert(
    menuListIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.queryScope === 'COLLECTION'
      && index.fields?.some((field) => field.fieldPath === 'pId')
      && index.fields?.some((field) => field.fieldPath === 'productId')
      && index.fields?.some((field) => field.fieldPath === 'status' && field.order === 'ASCENDING')
      && index.fields?.some((field) => field.fieldPath === 'cycleEndDate' && field.order === 'ASCENDING')),
    'MenuList indexes must support bounded paid-cycle subscription expiry',
  );

  [
    'normalizeBillingSubscriptionDocumentId',
    'const getSubscriptionDocRefServer = (docId: string) => {',
    'const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);',
    'if (!normalizedDocId) throw new Error("Invalid billing subscription id.");',
    'return getSubscriptionsCollectionRefServer().doc(normalizedDocId);',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);',
    'if (!normalizedSubscriptionId) return null;',
    'if (!getMenuListSubscriptionEntitlementScope(data)) return null;',
    'const scope = getMenuListSubscriptionEntitlementScope(subscription);',
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);',
    'if (!tenantScope || !storeScope) return null;',
    '.where("tenantId", "==", tenantScope.numericId)',
    '.where("storeId", "==", storeScope.numericId)',
    '.orderBy("cycleEndDate", "desc")',
    '.doc(tenantScope.documentId)',
    'const snapshot = await transaction.get(subscriptionRef);',
    'if (current.status !== "past_due") {',
    'const gracePeriod = getGracePeriodInfo(current.pastDueSinceAt);',
    'if (!gracePeriod.hasKnownGracePeriod) {',
    'if (gracePeriod.remainingDays > 0) {',
    'if (!hasVerifiedSubscriptionPaymentEvidence(sub)) return null;',
    'transaction.set(subscriptionRef, composeServerSubscriptionPayload(update), { merge: true });',
    'await safeSyncStorePlanEntitlementFromSubscription(result.subscription, "server:grace-period-auto-expire");',
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'MenuList server subscription DAL document ID boundary'));
  assertNotIncludes(subscriptionServer, 'getSubscriptionsCollectionRefServer().doc(docId)', 'MenuList server subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionServer, 'return { ...(docSnap.data() as FirestoreSubscriptionDoc), id };', 'MenuList server subscription DAL must return the normalized Firestore doc ID');
  assertNotIncludes(subscriptionServer, '.doc(String(tenantId))', 'MenuList server subscription DAL must not build tenant fallback refs from raw tenant IDs');
  assertIncludes(
    productBillingServer,
    "!/^pay_[A-Za-z0-9]+$/.test(paymentHistoryId)",
    'captured subscription payment transaction identity boundary',
  );
  [
    'export function normalizeBillingSubscriptionScopeDocumentId(value: unknown): BillingSubscriptionScopeDocumentId | null',
    'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId',
  ].forEach((token) => assertIncludes(subscriptionDocumentIdBoundary, token, 'MenuList billing subscription/scope boundary helper'));
  assertIncludes(read('__docs__/razorpay/razorpay_impl.md'), 'MenuList Billing Subscription Scope Document ID Boundary', 'Razorpay implementation docs must record subscription scope boundary');
  assertIncludes(read('__docs__/razorpay/razorpay_firebase.md'), 'MenuList Billing Subscription Scope Document ID Boundary', 'Razorpay Firebase docs must record subscription scope boundary');
  assertIncludes(read('__docs__/audits/menulist-production-readiness-audit.md'), 'MenuList Billing Subscription Scope Document ID Boundary checkpoint', 'Production audit must record subscription scope boundary');
  assertIncludes(read('__docs__/changelog.md'), 'Billing Subscription Scope Document ID Boundary', 'Changelog must record subscription scope boundary');
  assertIncludes(read('__docs__/changelog.md'), 'Billing Subscription Scope Document ID Boundary', 'Lowercase changelog must record subscription scope boundary');
  assertIncludes(read('__docs__/audits/menulist-production-readiness-audit.md'), 'whitespace-mutated subscription IDs', 'Production audit must record strict subscription document ID admission');
  assertIncludes(read('__docs__/audits/menulist-production-readiness-audit.md'), 'whitespace-mutated order IDs', 'Production audit must record strict top-up order document ID admission');
  assertIncludes(read('__docs__/changelog.md'), 'Billing Strict Provider Document ID Boundaries', 'Changelog must record strict billing provider document ID boundaries');
  assertIncludes(read('__docs__/changelog.md'), 'Billing Strict Provider Document ID Boundaries', 'Lowercase changelog must record strict billing provider document ID boundaries');

  [
    'normalizeBillingSubscriptionScopeDocumentId',
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);',
    'const requestKey = `${tenantScope.documentId}:${storeScope.documentId}`;',
    'orderBy("cycleEndDate", "desc")',
    'const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, tenantScope.documentId);',
  ].forEach((token) => assertIncludes(subscriptionClient, token, 'MenuList client subscription DAL scope/read boundary'));
  assertNotIncludes(subscriptionClient, 'doc(getCollectionRef(), docId)', 'MenuList client subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionClient, 'return { ...docSnap.data(), id };', 'MenuList client subscription DAL must return the normalized Firestore doc ID');
  assertNotIncludes(subscriptionClient, 'return { id: docSnap.id, ...docSnap.data() }', 'MenuList client subscription DAL must not allow embedded IDs to override Firestore IDs');

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    "import { getMenuListSubscriptionEntitlementScope } from \"@lib/billing/menuListSubscriptionEntitlementBoundary\";",
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'const expectedScope = getMenuListSubscriptionEntitlementScope(subscription);',
    'const initialAllowance = getPositiveCreditInteger(subscription.monthlyCreditsAllowance);',
    'if (!normalizedSubscriptionId || !expectedScope || initialAllowance === null) {',
    '.doc(normalizedSubscriptionId);',
    'id: subscriptionSnap.id,',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);',
    'throw new Error("Billing subscription is not available.");',
    'const billingPeriod = getBillingPeriodKey(current.cycleStartDate);',
    'const totalRemaining = monthlyRemaining + promotional.credits + topUpRemaining;',
    'unitsToConsume > totalRemaining',
    "throw new Error('Not enough billing credits for this operation.');",
    '...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {})',
  ].forEach((token) => assertIncludes(capacityCheck, token, 'MenuList AI capacity subscription document ID boundary'));
  assertIncludes(capacityCheck, 'const currentScope = getMenuListSubscriptionEntitlementScope(current);', 'MenuList AI capacity transaction exact subscription scope boundary');
  assertIncludes(capacityCheck, 'hasCurrentAiCapacitySubscriptionEntitlement', 'MenuList AI capacity lifecycle boundary');
  assertIncludes(capacityCheck, 'getGracePeriodInfo(subscription.pastDueSinceAt, 7, new Date(nowMs))', 'MenuList AI capacity known grace-period boundary');
  assertIncludes(capacityCheck, "throw new Error('Billing subscription entitlement is not current.');", 'MenuList AI capacity transaction-current lifecycle boundary');
  assertIncludes(capacityCheck, 'getExactAccountingScopeAlias', 'MenuList AI operation duplicate-scope boundary');
  assertNotIncludes(capacityCheck, 'current.tenantId ?? current.tId', 'MenuList AI capacity must not collapse conflicting current tenant aliases');
  assertNotIncludes(capacityCheck, 'current.storeId ?? current.sId', 'MenuList AI capacity must not collapse conflicting current store aliases');
  assertNotIncludes(capacityCheck, '.doc(subscription.id)', 'MenuList AI capacity must not build raw subscription refs');
  assert(
    aiCreditScalarContract === functionsAiCreditScalarContract,
    'MenuList AI credit scalar contract must remain byte-identical across app and Functions runtimes',
  );
  assertIncludes(capacityCheck, 'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)', 'MenuList AI capacity exact monthly-credit scalar boundary');
  assertIncludes(capacityCheck, 'getPositiveCreditInteger(operation.accountingUnits)', 'MenuList AI durable refund exact unit scalar boundary');
  assertIncludes(capacityCheck, 'getCreditBillingPeriodKey(rawReservedBillingPeriod)', 'MenuList AI refund exact billing-period scalar boundary');
  assertNotIncludes(capacityCheck, 'Number(existing.accountingUnits)', 'MenuList AI replay must not coerce accounting units');
  assertNotIncludes(capacityCheck, 'Number(existing.accountingCharged', 'MenuList AI refund must not coerce charged credit evidence');
  assertIncludes(aiCapacityRecovery, 'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)', 'MenuList AI recovery exact current-balance scalar boundary');
  assertIncludes(aiCapacityRecovery, 'getCreditBillingPeriodKey(rawReservedBillingPeriod)', 'MenuList AI recovery exact billing-period scalar boundary');
  assertNotIncludes(aiCapacityRecovery, 'Number(operation.accountingCharged', 'MenuList AI recovery must not coerce charged credit evidence');
  assertIncludes(aiCapacityReservationTest, 'same-scope other-product subscriptions must not fund MenuList AI operations', 'AI capacity cross-product regression');
  assertIncludes(aiCapacityReservationTest, 'transaction-current conflicting subscription aliases must block finalization', 'AI capacity transaction-current alias conflict regression');
  assertIncludes(aiCapacityReservationTest, 'conflicting operation scope aliases must not be accepted as reservation replay', 'AI capacity operation alias conflict regression');
  assertIncludes(aiCapacityReservationTest, 'numeric-string subscription balances must not authorize paid AI work', 'AI capacity numeric-string balance regression');
  assertIncludes(aiCapacityReservationTest, 'numeric-string accounting units must not satisfy idempotent reservation replay', 'AI capacity numeric-string replay regression');
  assertIncludes(aiCapacityReservationTest, 'numeric-string charged-credit evidence must not mint a refund', 'AI capacity numeric-string refund regression');
  assertIncludes(aiCapacityReservationTest, 'numeric-string recovery evidence must not mint credits', 'AI capacity recovery numeric-string regression');
  assertIncludes(aiCapacityReservationTest, 'a pending subscription with credits must not fund MenuList AI work', 'AI capacity pending-subscription regression');
  assertIncludes(aiCapacityReservationTest, 'transaction-current subscription lifecycle must block a stale pre-provider admission', 'AI capacity lifecycle race regression');
  assert(
    packageJson.scripts?.['test:ai-capacity-reservation:emulator']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'AI capacity emulator must clear inherited ADC',
  );
  assert(
    packageJson.scripts?.['test:image-batch-item-concurrency:emulator']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'Image-batch capacity emulator must clear inherited ADC',
  );
  assert(
    packageJson.scripts?.['test:claim-account-concurrency:emulator']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'),
    'Claim-account subscription emulator must clear inherited ADC',
  );

  [
    "import { getBillingPeriodKey } from '@lib/billing/billingPeriod';",
    'if (currentBillingPeriod === null || current.creditsLastResetMonth === currentBillingPeriod || allowance <= 0)',
    'currentBillingPeriod === null',
    "throw new Error('Answerlattice subscription credit balance is invalid.');",
    '...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {})',
    'normalizeAnswerlatticeBillingScopeDocumentId(scope.tId)',
    '.doc(tenantScope.documentId)',
    '.collection(storeScope.documentId)',
  ].forEach((token) => assertIncludes(answerlatticeAiAccounting, token, 'Answerlattice AI credit period/shape boundary'));
  assertNotIncludes(answerlatticeAiAccounting, 'const getBillingPeriodKey =', 'Answerlattice AI accounting must use shared billing-period truth');
  assertNotIncludes(answerlatticeAiAccounting, '.doc(String(scope.tId))', 'Answerlattice AI accounting must not build raw tenant refs');
  assertIncludes(answerlatticeAiAccounting, 'getExactSubscriptionCredits(subscription);', 'Answerlattice AI accounting validates preloaded credit scalars');
  assertIncludes(answerlatticeAiAccounting, 'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)', 'Answerlattice AI accounting exact monthly-credit scalar boundary');
  assertIncludes(answerlatticeAiAccounting, 'getNonNegativeCreditInteger(subscription.topUpCredits ?? 0)', 'Answerlattice AI accounting exact top-up scalar boundary');
  assertIncludes(answerlatticeAiAccounting, 'getNonNegativeCreditInteger(subscription.monthlyCreditsAllowance ?? 0)', 'Answerlattice AI accounting exact allowance scalar boundary');
  assertIncludes(answerlatticeAiAccounting, 'const storedUnitsConsumed = getPositiveCreditInteger(existing.unitsConsumed);', 'Answerlattice AI accounting exact replay unit boundary');
  assertIncludes(answerlatticeAiAccounting, 'const storedBalance = getStoredIdempotentBalance(existing.creditConsumption, unitsConsumed);', 'Answerlattice AI accounting validates replay balance evidence');
  assertNotIncludes(answerlatticeAiAccounting, 'Number(current.monthlyCredits || 0)', 'Answerlattice AI accounting must not coerce current monthly credits');
  assertNotIncludes(answerlatticeAiAccounting, 'Number(current.topUpCredits || 0)', 'Answerlattice AI accounting must not coerce current top-up credits');
  assertNotIncludes(answerlatticeAiAccounting, 'Number(existing.unitsConsumed', 'Answerlattice AI accounting must not coerce replay units');
  assertNotIncludes(productBillingServer, 'Number.isFinite(Number(data.monthlyCredits))', 'Answerlattice subscription loading must preserve malformed monthly credits for rejection');
  assertNotIncludes(productBillingServer, 'Number.isFinite(Number(data.topUpCredits))', 'Answerlattice subscription loading must preserve malformed top-up credits for rejection');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'numeric-string subscription balances must not authorize Answerlattice provider work', 'Answerlattice numeric-string credit regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'fractional subscription balances must not authorize Answerlattice provider work', 'Answerlattice fractional credit regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'numeric-string operation units must not satisfy Answerlattice idempotent replay', 'Answerlattice replay unit regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'numeric-string balance evidence must not satisfy Answerlattice idempotent replay', 'Answerlattice replay balance regression');
  assertIncludes(answerlatticeAiAccounting, 'reserveAnswerlatticeAiOperationCapacity', 'Answerlattice support AI pre-provider reservation boundary');
  assertIncludes(answerlatticeAiAccounting, 'ANSWERLATTICE_AI_CAPACITY_RESERVATIONS', 'Answerlattice support AI durable recovery pointer');
  assertIncludes(answerlatticeAiAccounting, "accountingStatus: 'reserved'", 'Answerlattice support AI reservation state');
  assertIncludes(answerlatticeAiAccounting, "accountingStatus: 'succeeded'", 'Answerlattice support AI settlement state');
  assertIncludes(answerlatticeAiAccounting, "accountingStatus: 'refunded'", 'Answerlattice support AI refund state');
  assert(answerlatticeAiCreditScalarContract === aiCreditScalarContract, 'Answerlattice Functions AI credit scalar contract must remain byte-identical to the app contract');
  assertIncludes(answerlatticeAiCapacityRecovery, "refundReason: 'stale_support_search_reservation_recovered'", 'Answerlattice stale reservation recovery');
  assertIncludes(answerlatticeAiCapacityRecovery, 'getReservationEvidence(operation, unitsReserved)', 'Answerlattice recovery exact debit evidence');
  assertIncludes(answerlatticeMasterScheduler, "name: 'ai_capacity_reservation_recovery'", 'Answerlattice recovery runs inside the existing master scheduler');
  assertIncludes(answerlatticeMasterScheduler, 'if (result.errors > 0)', 'Answerlattice recovery failures must fail the scheduler task');
  assertIncludes(answerlatticeMasterScheduler, 'ANSWERLATTICE_AI_CAPACITY_RESERVATION_RECOVERY_INCOMPLETE', 'Answerlattice recovery fixed failure code');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'support-search credits must be reserved before provider work', 'Answerlattice pre-provider reservation regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'only the pre-provider-reserved concurrent request may create an operation row', 'Answerlattice concurrent provider admission regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'a stale preloaded subscription must not reset credits after current scope changed', 'Answerlattice monthly-reset current-scope regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'a stale subscription object must not renew a reservation after current status changed', 'Answerlattice reservation-renewal current-status regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'a failed request must refund its pre-provider reservation', 'Answerlattice request-failure refund regression');
  assertIncludes(answerlatticeSupportSearchAccountingTest, 'malformed recovery evidence must not mint support credits', 'Answerlattice malformed recovery regression');
  assertNotIncludes(answerlatticeAiAccounting, '.collection(String(scope.sId))', 'Answerlattice AI accounting must not build raw store refs');

  [
    "import { getBillingPeriodKey, isValidBillingPeriodKey } from '@lib/billing/billingPeriod';",
    "throw new Error('Answerlattice subscription credit balance is invalid.');",
    "throw new Error('Answerlattice subscription billing period is invalid.');",
    'creditsLastResetMonth: billingPeriod',
    'normalizeAnswerlatticeBillingScopeDocumentId(scope.tId)',
    'const ledgerSnap = await transaction.get(ledgerRef);',
    "if (ledger.status !== 'reserved') return;",
    "throw new Error('Answerlattice intake usage scope does not match this workspace.');",
    'isAnswerlatticeIntakeLedgerInScope(',
    'resolveAnswerlatticeIntakeRefundAllocation({',
    'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)',
    'getNonNegativeCreditInteger(subscription.topUpCredits ?? 0)',
    'getNonNegativeCreditInteger(ledger.unitsReserved)',
    'getCreditBillingPeriodKey(ledger.billingPeriod)',
  ].forEach((token) => assertIncludes(answerlatticeIntakeUsageLedger, token, 'Answerlattice intake credit period/shape boundary'));
  [answerlatticeActivationSummary, answerlatticeIntakeUsageLedger, answerlatticeKnowledgeIntakeApi]
    .forEach((source) => {
      [
        ".where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)",
        ".where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)",
        ".where('tenantId', '==',",
        ".where('storeId', '==',",
        ".where('tId', '==',",
        ".where('sId', '==',",
      ].forEach((token) => assertIncludes(source, token, 'Answerlattice bounded subscription fallback exact query scope'));
    });
  assertIncludes(answerlatticeKnowledgeIntakeApi, 'isAnswerlatticeStoreInScope(storeData, { tenantId: tId, storeId: sId }, storeSnap.id)', 'Answerlattice intake license exact store ownership');
  assertIncludes(answerlatticeKnowledgeIntakeApi, 'projectActiveAnswerlatticeSubscriptionForRead(', 'Answerlattice intake license exact subscription runtime projection');
  assertIncludes(answerlatticeIntakeUsageLedger, 'projectActiveAnswerlatticeSubscriptionForRead(', 'Answerlattice intake debit exact subscription runtime projection');
  assertIncludes(answerlatticeAiAccounting, 'projectActiveAnswerlatticeSubscriptionForRead(', 'Answerlattice AI transaction-current active subscription runtime projection');
  assertIncludes(answerlatticeAiAccounting, 'projectAnswerlatticeSubscriptionForRead(', 'Answerlattice AI refund exact subscription runtime projection');
  assertNotIncludes(answerlatticeAiAccounting, 'subscriptionSnap.data() as FirestoreSubscriptionDoc', 'Answerlattice AI transaction reads must not assert subscription truth');
  assertNotIncludes(answerlatticeAiAccounting, 'subscriptionSnapshot.data() as FirestoreSubscriptionDoc', 'Answerlattice AI settlement reads must not assert subscription truth');
  assertNotIncludes(answerlatticeKnowledgeIntakeApi, 'hasActiveSubscriptionWindow', 'Answerlattice intake license coercive subscription window');
  assertNotIncludes(answerlatticeIntakeUsageLedger, 'isActiveSubscription', 'Answerlattice intake debit coercive subscription window');
  assertNotIncludes(answerlatticeKnowledgeIntakeApi, 'storeData.tenantId ?? storeData.tId', 'Answerlattice intake license must not accept conflicting store tenant aliases');
  assertNotIncludes(answerlatticeKnowledgeIntakeApi, 'storeData.pId ?? storeData.productId', 'Answerlattice intake license must not accept conflicting store product aliases');
  assertNotIncludes(answerlatticeIntakeUsageLedger, 'const getBillingPeriodKey =', 'Answerlattice intake ledger must use shared billing-period truth');
  [
    'export function isAnswerlatticeIntakeLedgerInScope(',
    'data.pId === PRODUCT_IDS.ANSWERLATTICE',
    'ledgerTenantId?.numericId === tenantId.numericId',
    'ledgerStoreId?.numericId === storeId.numericId',
    'export function resolveAnswerlatticeIntakeRefundAllocation(',
    'params.currentBillingPeriod === params.reservedBillingPeriod',
    'getNonNegativeCreditInteger(params.refundMonthlyCredits)',
  ].forEach((token) => assertIncludes(answerlatticeIntakeUsageSettlement, token, 'Answerlattice intake pure settlement boundary'));

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);',
    'const internalSubscriptionScope = getProductSubscriptionBillingScope(productId, internalSub);',
    'storedSettlement.billingStoreId !== subscriptionStoreId',
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
    'Boolean(resolveAnswerlatticeSessionScope(session))',
    'getMenuListSessionProviderScopeKey(session)',
    'normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId)',
    'normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId)',
  ].forEach((token) => assertIncludes(paymentHook, token, 'browser payment exact session-scope gate'));
  assertNotIncludes(paymentHook, "session?.user?.productId === PRODUCT_IDS.ANSWERLATTICE", 'browser payment weak Answerlattice product-only scope gate');
  assertIncludes(productBillingServer, 'if (!getMenuListSessionProviderScopeKey(session)) return null;', 'server MenuList billing exact product/session scope gate');
  assertIncludes(sessionProviderScopeBoundary, 'identity?.productId === DEFAULT_PRODUCT_ID', 'shared exact MenuList session scope projector');
  [
    'getAnswerlatticeBillingRecordScope(subscription)',
    'getMenuListSubscriptionEntitlementScope(subscription)',
    'if (isProductBillingDisabled(productId)) return null;',
  ].forEach((token) => assertIncludes(productSubscriptionScopeBoundary, token, 'shared transaction-current product subscription scope boundary'));
  [
    "value.pId !== MENULIST_PRODUCT_ID",
    'value.productId !== MENULIST_PRODUCT_ID',
    'Number.isSafeInteger(value)',
    'tId !== tenantId',
    'sId !== storeId',
  ].forEach((token) => assertIncludes(functionsSubscriptionScope, token, 'Functions exact MenuList subscription scope boundary'));
  [
    'getExactMenuListSubscriptionScope(exact)',
    "productId: 'AL'",
    'tId: 999',
    'sId: 999',
    "tenantId: '101'",
  ].forEach((token) => assertIncludes(functionsSubscriptionScopeTest, token, 'Functions subscription scope regression'));
  [
    'getExactMenuListSubscriptionScope(sub)',
    'getExactMenuListSubscriptionScope(current)',
    'getExactMenuListSubscriptionScope(candidate)',
    ".where('tId', '==', expectedTenantScope.numericId)",
    ".where('sId', '==', expectedStoreScope.numericId)",
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'Functions reconciliation exact subscription scope'));
  [
    'getExactMenuListSubscriptionScope(sub)',
    'storeId: String(scope.storeId)',
    'tenantId: String(scope.tenantId)',
  ].forEach((token) => assertIncludes(messagingEngine, token, 'Functions lifecycle messaging exact subscription scope'));
  assertIncludes(maintenanceScheduler, 'getExactMenuListSubscriptionScope(current)', 'Functions paid-cycle/manual expiry transaction-current exact scope');
  assertIncludes(maintenanceScheduler, 'getExactMenuListSubscriptionScope(subscription)', 'Functions pending entitlement repair exact scope');
  assertIncludes(founderMonitorSnapshot, 'getExactMenuListSubscriptionScope(data)', 'Founder Monitor exact subscription projection');
  assertIncludes(aiCapacityRecovery, 'getExactMenuListSubscriptionScope(subscription)', 'AI reservation recovery exact subscription scope');
  assertIncludes(productBillingServer, 'const scope = getProductSubscriptionBillingScope(productId, subscription);', 'direct product subscription exact scope admission');
  assertIncludes(productBillingServer, 'return projectAnswerlatticeSubscriptionForRead(', 'direct Answerlattice subscription exact runtime projection');
  assert(
    (productBillingServer.match(/if \(!getProductSubscriptionBillingScope\(productId, current\)\)/g) || []).length >= 3
      && productBillingServer.includes('const currentScope = getProductSubscriptionBillingScope(productId, currentRecord);'),
    'payment, webhook, lifecycle and grace-expiry transactions must revalidate exact product subscription scope',
  );
  assertIncludes(productBillingServer, 'const oldScope = getProductSubscriptionBillingScope(productId, oldSubscription);', 'upgrade old subscription exact scope admission');
  assertIncludes(productBillingServer, 'const newScope = getProductSubscriptionBillingScope(productId, newSubscription);', 'upgrade new subscription exact scope admission');
  assertIncludes(productBillingServer, 'transaction.create(subscriptionRef, payload);', 'product subscription initial persistence must be transactionally create-only');
  [
    'const assertAnswerlatticeWorkspaceAllowsBillingActivation = async',
    'isAnswerlatticeWorkspaceBillingActivationAllowed(storeSnapshot.data())',
    "throw new Error('Answerlattice workspace billing activation is not allowed.')",
  ].forEach((token) => assertIncludes(productBillingServer, token, 'Answerlattice billing activation lifecycle fence'));
  assertIncludes(productBillingServer, "throw new Error('Subscription does not match the requested product and scope.');", 'direct product subscription update transaction-current scope guard');
  assertIncludes(subscriptionServer, '.create(\n        composeInitialSubscriptionPayloadServer(data),', 'MenuList initial subscription persistence must be create-only');
  assertIncludes(subscriptionServer, "throw new Error('MenuList subscription does not match the requested product and scope.');", 'direct MenuList subscription update transaction-current scope guard');
  assertIncludes(subscriptionServer, "throw new Error('MenuList subscription tenant/store identity is invalid.');", 'MenuList subscription write duplicate-scope admission');
  assertNotIncludes(productBillingServer, 'isAnswerlatticeBillingProduct(productId)\n            && !getAnswerlatticeBillingRecordScope(current)', 'one-product-only transaction scope gate');
  [
    "applyProductSubscriptionStatusTransition(PRODUCT_IDS.MENULIST",
    "applyProductSubscriptionPayment(PRODUCT_IDS.MENULIST",
    "applyProductSubscriptionWebhookEvent(PRODUCT_IDS.MENULIST",
    "applyProductSubscriptionUpgradeCarryForward(PRODUCT_IDS.MENULIST",
    'createProductInitialSubscription(',
    'updateProductSubscription(PRODUCT_IDS.MENULIST',
    "(await readSubscription('sub_ForeignProduct123')).productId, 'AL'",
    'exact_aliases_must_filter_before_bounded_query',
    'conflicting duplicate aliases must be excluded before the bounded active-subscription query',
    'an exact current subscription must remain discoverable behind more than ten conflicting alias rows',
  ].forEach((token) => assertIncludes(productSubscriptionScopeEmulator, token, 'product subscription transaction emulator'));
  assert(
    packageJson.scripts?.['test:product-subscription-scope:emulator']?.includes('scripts/verification/test-product-subscription-scope-emulator.ts'),
    'package.json must expose the product subscription scope emulator',
  );
  assert(
    packageJson.scripts?.['test:product-subscription-scope:emulator']?.includes('ANSWERLATTICE_FIREBASE_MODE=shared'),
    'product subscription scope emulator must exercise both billing products in one isolated demo project',
  );
  [
    ".where('tenantId', '==', Number(tenantId))",
    ".where('storeId', '==', Number(storeId))",
    ".where('tId', '==', Number(tenantId))",
    ".where('sId', '==', Number(storeId))",
    'const pendingScope = getProductSubscriptionBillingScope(productId, pending);',
  ].forEach((token) => assertIncludes(createSubscription, token, 'pending checkout exact duplicate-scope admission'));
  [
    'const cleanupResult = await billingDb.runTransaction(async (transaction) => {',
    'const currentSnapshot = await transaction.get(pendingDoc.ref);',
    "current.status !== 'pending'",
    'currentProviderId !== pendingProviderId',
    'currentScope?.tenantId !== Number(tenantId)',
    'currentScope?.storeId !== Number(storeId)',
    "return 'changed' as const;",
    "if (cleanupResult === 'changed')",
    "pendingCheckoutAction === 'checkout' && sameIntent",
    "if (!sameIntent)",
    'current.planId !== pending.planId',
    'current.planType !== pending.planType',
    'current.currency !== pending.currency',
    'currentQuantity !== pendingQuantity',
  ].forEach((token) => assertIncludes(createSubscription, token, 'pending checkout transaction-current terminal cleanup boundary'));
  assertNotIncludes(
    createSubscription,
    'currentScope.storeId !== Number(storeId)',
    'pending checkout cleanup must fail closed when the current billing scope is absent',
  );
  assertNotIncludes(
    createSubscription,
    "await pendingDoc.ref.set({\n                status: 'expired'",
    'pending checkout cleanup must not expire a stale pre-provider snapshot',
  );
  [
    'where("tenantId", "==", tenantScope.numericId)',
    'where("tId", "==", tenantScope.numericId)',
    'where("storeId", "==", storeScope.numericId)',
    'where("sId", "==", storeScope.numericId)',
    'projectExactSubscriptionForScope(',
  ].forEach((token) => assertIncludes(subscriptionClient, token, 'browser MenuList exact duplicate-scope query/projection'));
  [
    '.where("tenantId", "==", tenantScope.numericId)',
    '.where("tId", "==", tenantScope.numericId)',
    '.where("storeId", "==", storeScope.numericId)',
    '.where("sId", "==", storeScope.numericId)',
    'const expectedScope = getMenuListSubscriptionEntitlementScope(sub);',
    'isMenuListSubscriptionInExpectedEntitlementScope(current, expectedScope)',
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'server MenuList exact duplicate-scope and transaction-current expiry boundary'));
  [
    'where("tId", "==", tenantScope.numericId)',
    'where("sId", "==", storeScope.numericId)',
  ].forEach((token) => assertIncludes(paymentTransactionsDal, token, 'browser MenuList payment-history duplicate-scope query'));
  [
    'transaction.get(storeRef)',
    'normalizeMenuListPublicEntityIdentityAliases([',
    'storeSnapshot.id',
    'storedTenantScope?.numericId !== expectedTenantScope.numericId',
    'storedStoreScope?.numericId !== expectedStoreScope.numericId',
  ].forEach((token) => assertIncludes(entitlementSync, token, 'MenuList entitlement transaction-current store ownership boundary'));
  [
    'sub_EntitlementStoreRace123',
    'A stale subscription must not overwrite a store that now belongs to another tenant',
    'A store-scope mismatch must leave the subscription entitlement retryable',
  ].forEach((token) => assertIncludes(productSubscriptionScopeEmulator, token, 'MenuList entitlement store reassignment emulator regression'));
  [
    "where('tId', '==', tenantScope.numericId)",
    "where('sId', '==', storeScope.numericId)",
  ].forEach((token) => assertIncludes(answerlatticeBillingClient, token, 'browser Answerlattice billing duplicate-scope query'));
  assertIncludes(firestoreRules, "data.keys().hasAll(['tId', 'tenantId', 'sId', 'storeId'])", 'shared billing rule duplicate-scope presence');
  assertIncludes(firestoreRules, 'data.tId == data.tenantId', 'shared billing rule tenant-alias agreement');
  assertIncludes(firestoreRules, 'data.sId == data.storeId', 'shared billing rule store-alias agreement');
  assertIncludes(answerlatticeFirestoreRules, 'isExactAnswerlatticeBillingScopeMember(resource.data)', 'dedicated Answerlattice billing exact duplicate-scope rule');

  [
    'const { onUpgradePlan, handleTopupPurchase } = usePaymentHandler(dispatch);',
    'await onUpgradePlan(activeSubscription, newPlan, currency)',
    "router.push('/pricing');",
    'await handleTopupPurchase(pack',
    "activeSubscription?.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling",
  ].forEach((token) => assertIncludes(desktopBilling, token, 'desktop billing payment hook parity'));
  [
    'const billingScopeKeyRef = useRef<string | null>(billingScopeKey);',
    'subscriptionRequestSequenceRef.current !== requestSequence',
    'billingHistoryRequestSequenceRef.current !== requestSequence',
    'setActiveSubscription(null);',
    'setBillingHistory([]);',
  ].forEach((token) => assertIncludes(desktopBilling, token, 'desktop billing latest-scope state boundary'));

  [
    'const billingScopeKeyRef = useRef<string | null>(billingScopeKey);',
    'activeSubscriptionScopeKey === billingScopeKey',
    'billingHistoryScopeKey === billingScopeKey',
    'subscriptionRequestSequenceRef.current !== requestSequence',
    'billingHistoryRequestSequenceRef.current !== requestSequence',
    'billingScopeKeyRef.current !== purchaseScopeKey',
  ].forEach((token) => assertIncludes(answerlatticeBilling, token, 'Answerlattice billing latest-workspace state boundary'));

  [
    'getMenuListSessionProviderScopeKey(session)',
    'normalizeBillingSubscriptionScopeDocumentId(session?.user?.tenantId)',
    'normalizeBillingSubscriptionScopeDocumentId(session?.user?.storeId)',
    'subscriptionRequestSequenceRef.current !== requestSequence',
    'currentScopeKeyRef.current !== requestScopeKey',
    'loadedScopeKey === currentScopeKey',
    'subscriptionLoadErrorScopeKey === currentScopeKey',
    'Checking current billing details...',
    'Subscription changes are unavailable until the current account is confirmed.',
  ].forEach((token) => assertIncludes(websitePricingWrapper, token, 'website pricing exact-current subscription boundary'));
  assertNotIncludes(websitePricingWrapper, 'status === \'authenticated\' && session?.user && !activeSubscription', 'website pricing stale non-null subscription fetch suppression');
  assertNotIncludes(websitePricingWrapper, '(tenantId || tenantId === 0)', 'website pricing zero tenant scope admission');

  [
    'buildPricingPlanHandoffPath',
    'parsePricingPlanHandoff',
    'checkoutPlan',
    'checkoutCurrency',
    'OnboardingSubscriptionSchema.safeParse',
    'getB2BPlansList() : getB2CPlansList()',
    'candidate.planId === parsed.data.planId',
    'candidate.billingInterval === parsed.data.interval',
    'candidate.type === parsed.data.userType',
    'PURCHASE_INTENT_MAX_AGE_MS',
    'envelope.version !== PURCHASE_INTENT_STORAGE_VERSION',
    'return normalizePurchaseIntent(envelope.intent);',
  ].forEach((token) => assertIncludes(purchaseIntentBoundary, token, 'stored website purchase-intent runtime boundary'));
  [
    'window.location.assign(buildWebsiteSignInPath(callbackPath));',
    'status !== \'authenticated\'',
    'session.user.tenantId',
    'pricingPlanHandoff.quantity',
    'parseStoredPurchaseIntent(purchaseIntentString)',
    'serializePurchaseIntent(purchaseIntent)',
    'sessionStorage.getItem(PURCHASE_INTENT_STORAGE_KEY)',
    'sessionStorage.setItem(PURCHASE_INTENT_STORAGE_KEY, serializedPurchaseIntent)',
    'localStorage.removeItem(PURCHASE_INTENT_STORAGE_KEY)',
  ].forEach((token) => assertIncludes(websitePricingPage, token, 'website purchase-intent scoped persistence'));
  assertNotIncludes(websitePricingPage, 'JSON.parse(purchaseIntentString) as PurchaseIntent', 'website purchase-intent unchecked cast');
  assertNotIncludes(paymentHook, "localStorage.getItem('purchaseIntent')", 'payment hook unvalidated storage authority');
  assertIncludes(purchaseIntentBoundaryTest, "legacy unversioned localStorage state must not resume", 'purchase-intent stale legacy regression');
  assert(
    packageJson.scripts?.['test:purchase-intent-boundary']?.includes('scripts/verification/test-purchase-intent-boundary.ts'),
    'package.json must expose the purchase-intent runtime boundary test',
  );

  [
    'onContinuePendingSubscriptionCheckout,',
    '} = usePaymentHandler(noopDispatcher);',
    'await onUpgradePlan(sub, plan, currency)',
    "router.push('/pricing');",
    'await handleTopupPurchase(pack, currency)',
    'await onCancelSubscription({',
    'reason: cancellationReason',
    'otherReason: cancellationReason === CANCELLATION_REASON.OTHER',
    "sub.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling",
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing payment hook parity'));
  [
    "sub?.status === 'active'",
    '!hasVerifiedSubscriptionPaymentEvidence(sub)',
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing unpaid-active projection'));
  [
    "activeSubscription.status === 'active'",
    '!hasVerifiedSubscriptionPaymentEvidence(activeSubscription)',
  ].forEach((token) => assertIncludes(desktopSubscriptionCard, token, 'desktop billing unpaid-active projection'));
  [
    'hasPaidSubscriptionAccess = hasValidSubscriptionAccess(subscription)',
    'hasPaidSubscriptionAccess && hasManualCapacity && !needsCheckoutBeforeOutlet',
  ].forEach((token) => assertIncludes(desktopAddOutlet, token, 'desktop outlet paid-access boundary'));
  [
    'hasPaidSubscriptionAccess = hasValidSubscriptionAccess(activeSubscription)',
    'hasPaidSubscriptionAccess && hasManualCapacity && !needsCheckoutBeforeOutlet',
  ].forEach((token) => assertIncludes(mobileLocations, token, 'mobile outlet paid-access boundary'));
  assertIncludes(
    websiteSubscriptionManagement,
    '!hasVerifiedSubscriptionPaymentEvidence(activeSubscription)',
    'website subscription unpaid-active projection',
  );
  assertIncludes(
    websiteCreditPackCard,
    'activeSubscription && hasValidSubscriptionAccess(activeSubscription)',
    'website credit-pack paid-access boundary',
  );
  [
    'const billingScopeKeyRef = useRef<string | null>(billingScopeKey);',
    'subscriptionRequestSequenceRef.current !== requestSequence',
    'billingHistoryRequestSequenceRef.current !== requestSequence',
    'billingScopeKeyRef.current !== mutationScopeKey',
    'setActiveSubscription(null);',
    'setBillingHistory([]);',
    'setShowHistory(false);',
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing latest-scope state boundary'));

  [
    'const toValidDate = (value: unknown): Date | null => {',
    'const toNonNegativeSafeInteger = (value: unknown): number => {',
    "if (!value || typeof value !== 'object') return null;",
    "} catch {\n        return null;\n    }",
    'const pastDueDate = toValidDate(pastDueTimestamp);',
    'hasKnownGracePeriod: false',
    'hasKnownGracePeriod: true',
    'getGracePeriodDisplayInfo',
    'if (!gracePeriodInfo.hasKnownGracePeriod || !gracePeriodInfo.graceEndsTimestamp)',
    'if (!hasVerifiedSubscriptionPaymentEvidence(sub)) return false;',
    'return gracePeriod.hasKnownGracePeriod && gracePeriod.remainingDays > 0;',
    'return hasCurrentSubscriptionPlanEntitlement(sub);',
    'const monthlyCredits = toNonNegativeSafeInteger(activeSubscription.monthlyCredits);',
    'const topUpCredits = toNonNegativeSafeInteger(activeSubscription.topUpCredits);',
    'const end = toValidDate(activeSubscription.cycleEndDate);',
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
    '**Status:** Current launch strategy',
    'Website plan names and pricing copy in every locale',
    'Razorpay sandbox subscription creation and webhook settlement',
  ].forEach((token) => assertIncludes(pricingStrategyDoc, token, 'Pricing strategy current launch contract'));

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
    'malformed or whitespace-mutated IDs return before reset refs or fail paid credit consumption before debit refs',
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
  [
    ['AI billing explainer', aiBillingExplainerDoc],
    ['AI Enhancement Packs implementation', aiEnhancementImplDoc],
    ['AI usage audit', aiUsageAuditDoc],
  ].forEach(([label, content]) => {
    [
      'Not current launch certification or deploy approval',
      'External Certification Runbook',
      '`npm run verify:production-readiness-local`',
      '`npm run verify:billing-entitlement-boundary`',
      '`npm run verify:ai-accounting`',
      'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
      'desktop/mobile Billing browser QA',
      'target deploy evidence',
      'production-host smoke',
    ].forEach((token) => assertIncludes(content, token, `${label} top launch boundary`));
  });
  assertIncludes(
    aiBillingExplainerDoc,
    'monthlyCredits = 250  (full starting balance after subscription activation)',
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
    'malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail or return null before Firestore document refs',
    'MenuList Top-Up Order Document ID Boundary',
    'malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail before top-up document refs',
    'MenuList Top-Up Scope Document ID Boundary',
    '`normalizeBillingTopupScopeDocumentId()` validates the resolved billing tenant/store scope',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay implementation docs'));

  [
    'Billing entitlement boundary source gate: `npm run verify:billing-entitlement-boundary`',
    'The source gate is Firebase-cost neutral and performs no provider calls, Firestore writes, Storage writes, deploys, or browser smoke.',
    'normal-path debug cleanup is Firebase-cost neutral',
    'past-due grace-period display fallback is Firebase-cost neutral',
    'July 6 MenuList Billing Subscription Document ID Boundary is Firebase-cost neutral',
    'Malformed, reserved, empty, whitespace-mutated, or path-shaped IDs fail or return null before Firestore document refs.',
    'July 6 MenuList Top-Up Order Document ID Boundary is Firebase-cost neutral',
    'Malformed, reserved, empty, whitespace-mutated, or path-shaped order IDs fail before `topups/{orderId}` document refs.',
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
    'Billing history ledger/read boundary checkpoint',
    'Top-up client mutation boundary checkpoint',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing entitlement evidence'));

  [
    'Razorpay Past-Due Grace Display Fallback',
    'Grace period details unavailable.',
    'Razorpay Normal-Path Debug Diagnostics',
    'Searching for Razorpay plan',
    'Unhandled webhook event type',
    'RAZORPAY_WEBHOOK_UNHANDLED_EVENT',
    'Billing Strict Provider Document ID Boundaries',
    'MenuList Billing Subscription Document ID Boundary',
    'Paid AI credit consumption fails closed for malformed subscription IDs',
    'MenuList Top-Up Order Document ID Boundary',
    'Top-up order refs now validate Razorpay order IDs',
    'Top-Up Scope Document ID Boundary',
    'Top-up tenant/store scope is guarded',
    'Billing History Ledger Admission',
    'Malformed ledger dates no longer become current activity',
    'The browser billing DAL is read-only',
    'Server-Owned Top-Up Mutations',
    'The dead browser top-up mutation DAL is removed',
    'The billing gate pins server ownership',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog Razorpay debug diagnostics evidence'));

  [
    'Billing and pricing doc launch-boundary checkpoint',
    'no longer present Razorpay, pricing, or AI Enhancement Pack billing evidence as current production certification',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit billing doc-boundary evidence'));

  [
    'AI billing and AI System Layer top-boundary checkpoint',
    'AI billing explainer, implementation plan, and historical usage audit',
    'Razorpay sandbox subscription/top-up/reseller/webhook smoke',
  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit AI billing top-boundary evidence'));

  [
    'AI Billing and System Layer Doc Boundary',
    'AI billing and usage docs carry top-level launch boundaries',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog AI billing top-boundary evidence'));
}

verifyBillingEntitlementBoundary();
console.log('Billing entitlement boundary verifier passed');
