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
  const billingAccess = read('src/lib/billing/billingAccess.ts');
  const createSubscription = read('src/app/api/razorpay/create-subscription/route.ts');
  const verifySubscription = read('src/app/api/razorpay/verify-subscription/route.ts');
  const cancelSubscription = read('src/app/api/razorpay/cancel-subscription/route.ts');
  const pauseSubscription = read('src/app/api/razorpay/pause-subscription/route.ts');
  const resumeSubscription = read('src/app/api/razorpay/resume-subscription/route.ts');
  const upgradeSubscription = read('src/app/api/razorpay/upgrade-subscription/route.ts');
  const createTopupOrder = read('src/app/api/razorpay/create-topup-order/route.ts');
  const billingCheckoutLease = read('src/lib/billing/billingCheckoutLease.ts');
  const billingCheckoutConcurrencyTest = read('scripts/verification/test-billing-checkout-concurrency-emulator.ts');
  const billingCoordinationRulesTest = read('scripts/verification/test-billing-coordination-rules.ts');
  const subscriptionStatusHistory = read('src/lib/billing/subscriptionStatusHistory.ts');
  const razorpayPlanHandler = read('src/lib/razorpay/plan-handler.ts');
  const reconciliationFunction = read('functions/src/billing/reconcileSubscriptions.ts');
  const maintenanceScheduler = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
  const firestoreRules = read('firestore.rules');
  const answerlatticeFirestoreRules = read('firestore-answerlattice.rules');
  const verifyTopup = read('src/app/api/razorpay/verify-topup/route.ts');
  const webhook = read('src/app/api/razorpay/webhook/route.ts');
  const paymentCheckoutBoundary = read('src/lib/billing/paymentCheckoutBoundary.ts');
  const checkoutUrlBoundary = read('src/lib/razorpay/checkoutUrl.ts');
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  const billingPeriod = read('src/lib/billing/billingPeriod.ts');
  const topupSettlement = read('src/lib/billing/topupSettlement.ts');
  const topupSettlementServer = read('src/lib/billing/topupSettlementServer.ts');
  const subscriptionReplacementFinalization = read('src/lib/billing/subscriptionReplacementFinalization.ts');
  const subscriptionUpgradeSettlement = read('src/lib/billing/subscriptionUpgradeSettlement.ts');
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  const subscriptionDocumentIdBoundary = read('src/lib/billing/subscriptionDocumentIdBoundary.ts');
  const topupDocumentIdBoundary = read('src/lib/billing/topupDocumentIdBoundary.ts');
  const entitlementSync = read('src/lib/billing/subscriptionEntitlementSync.ts');
  const subscriptionPlanEntitlement = read('src/lib/billing/subscriptionPlanEntitlement.ts');
  const subscriptionServer = read('src/database/subscriptions/server.ts');
  const subscriptionClient = read('src/database/subscriptions/index.ts');
  const capacityCheck = read('src/lib/ai/capacityCheck.ts');
  const answerlatticeAiAccounting = read('src/lib/answerlattice/aiAccounting.ts');
  const answerlatticeIntakeUsageLedger = read('src/lib/answerlattice/intakeUsageLedger.ts');
  const answerlatticeIntakeUsageSettlement = read('src/lib/answerlattice/intakeUsageSettlement.ts');
  const answerlatticeBillingDocumentIdBoundary = read('src/lib/answerlattice/billingDocumentIdBoundary.ts');
  const answerlatticeBillingScopeBoundary = read('src/lib/answerlattice/billingScopeBoundary.ts');
  const answerlatticeBillingClient = read('src/database/answerlattice/billing.ts');
  const menuListIndexes = JSON.parse(read('firestore.indexes.json'));
  const answerlatticeIndexes = JSON.parse(read('firestore-answerlattice.indexes.json'));
  const razorpayUtils = read('src/utils/razorpay.ts');
  const paymentHook = read('src/hooks/usePaymentHandler.ts');
  const answerlatticeBilling = read('src/components/templates/answerlattice/billing/AnswerlatticeBilling.tsx');
  const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
  const desktopSubscriptionCard = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
  const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const paymentTransactionsDal = read('src/database/subscriptions/paymentTransactions.ts');
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
    packageJson.scripts?.['verify:billing-entitlement-boundary'] === 'node scripts/verification/verify-billing-entitlement-boundary.js',
    'package.json must expose verify:billing-entitlement-boundary',
  );
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
    'hasExactAnswerlatticeBillingIdentity(resource.data)',
    "hasAnswerlatticePermission('canManageBilling')",
    'allow write: if false;',
  ].forEach((token) => assertIncludes(answerlatticeFirestoreRules, token, 'Dedicated Answerlattice billing rules'));
  [
    'function canReadProductBillingResource()',
    'function isAnswerlatticeBillingScopeMember(data)',
    'allow read: if canReadProductBillingResource();',
    'hasExactAnswerlatticeBillingIdentity(resource.data)',
    "!hasAnyAnswerlatticeBillingIdentity(resource.data)",
    "hasAnswerlatticePermission('canManageBilling')",
  ].forEach((token) => assertIncludes(firestoreRules, token, 'Shared product billing rules'));
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
  assertIncludes(desktopBilling, 'getBillingHistoryForStore(session?.user?.tenantId, effectiveHistoryStoreId)', 'Desktop billing history must preserve raw signed scope for exact DAL admission');
  assertIncludes(mobileBilling, 'getBillingHistoryForStore(session?.user?.tenantId, historyStoreId)', 'Mobile billing history must preserve raw signed scope for exact DAL admission');
  assertNotIncludes(desktopBilling, 'getBillingHistoryForStore(Number(session?.user?.tenantId)', 'Desktop billing history must not coerce nullable session scope');
  assertNotIncludes(mobileBilling, 'getBillingHistoryForStore(Number(session?.user?.tenantId)', 'Mobile billing history must not coerce nullable session scope');
  [
    "where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)",
    "where('tenantId', '==', tenantId)",
    "where('storeId', '==', storeId)",
    "where('tenantId', '==', tenantScope.numericId)",
    "where('storeId', '==', storeScope.numericId)",
  ].forEach((token) => assertIncludes(answerlatticeBillingClient, token, 'Answerlattice billing client exact product/workspace query scope'));
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
    "if (publicKeyId !== keyId) throw new Error('razorpay_public_private_key_id_mismatch');",
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
    'renewExpiredBillingCheckoutLease',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'releaseBillingCheckoutLease',
    "status === 'provider_created'",
    "status === 'completed'",
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
    'checkoutAttemptId',
    'markBillingCheckoutProviderCreated',
    'completeBillingCheckoutLease',
    'releaseBillingCheckoutLease',
  ].forEach((token) => assertIncludes(createSubscription, token, 'Subscription checkout recovery boundary'));
  [
    'claimBillingCheckoutLease(checkoutLeaseIdentity)',
    'getTopupCheckoutReceipt',
    'recoverCheckoutOrder',
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
    'findProviderPlan',
    'waitForProviderPlanRegistry',
    "status: 'processing'",
    "status: 'ready'",
  ].forEach((token) => assertIncludes(razorpayPlanHandler, token, 'Razorpay provider plan concurrency registry'));
  [
    'BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT = 100',
    'appendBoundedBillingStatusHistory',
    '.slice(-BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT)',
  ].forEach((token) => assertIncludes(subscriptionStatusHistory, token, 'Bounded subscription status history'));
  [
    'providerConcurrency = 5',
    'runtimeBudgetMs = 6 * 60 * 1000',
    "doc('subscriptionReconciliationCursor')",
    'syncDetails.length < 100',
    'checkpointed',
    'cycleCompleted',
  ].forEach((token) => assertIncludes(reconciliationFunction, token, 'Bounded subscription reconciliation'));
  [
    "name: 'billing_health_snapshot'",
    "doc('billing')",
    'expiredProcessingCheckoutCount',
    'orphanedProviderCheckoutCount',
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
    '`cancelled` and `paused` subscriptions retain the purchased plan mirror only through a valid `cycleEndDate`',
    'at most 500 due cancelled/paused rows each hour',
  ].forEach((token) => assertIncludes(razorpayReadmeDoc, token, 'Razorpay paid-cycle entitlement README parity'));
  [
    'Current `active` subscriptions carry an active plan type.',
    'the hourly `subscription_access_expiry` maintenance task transitions at most 500 due cancelled/paused rows per run',
    'The store and platform plan mirrors retain the purchased plan through that same paid cycle',
  ].forEach((token) => assertIncludes(razorpayImplDoc, token, 'Razorpay paid-cycle entitlement implementation docs'));
  [
    'The same scheduler owns `subscription_access_expiry` every 60 minutes.',
    '`subscriptions(status ASC, cycleEndDate ASC)` composite index',
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
    'At most 605 observation/retention reads + 1 health write + up to 200 old webhook deletes',
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
    'replacementForSubscriptionId',
    'getDirectActiveProductSubscriptionForStore(productId, tenantId, storeId)',
    "providerPendingSubscription.status === 'created'",
    'founderMonitorReplacementForSubscriptionId: replacementForSubscriptionId',
    'await razorpayClient.subscriptions.cancel(razorpaySubscription.id)',
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
    'resolveProviderBillingProductId(',
    'getProviderCycleBillingPeriodKey(providerSubscription.current_start)',
    'applyProductSubscriptionPayment(productId, {',
    'paymentHistoryId: razorpay_payment_id',
    'safeSyncProductSubscriptionEntitlementFromSubscription(',
    'finalizeProductSubscriptionReplacement({',
  ].forEach((token) => assertIncludes(verifySubscription, token, 'verify-subscription payment truth boundary'));
  assertOrder(verifySubscription, 'verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)', 'razorpayClient.payments.fetch(razorpay_payment_id)', 'verify-subscription signature-before-provider order');
  assertOrder(verifySubscription, "payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id", 'applyProductSubscriptionPayment(productId, {', 'verify-subscription payment-truth-before-write order');
  assertOrder(verifySubscription, 'applyProductSubscriptionPayment(productId, {', 'safeSyncProductSubscriptionEntitlementFromSubscription(', 'verify-subscription transaction-before-entitlement order');
  assertNotIncludes(verifySubscription, 'monthlyCredits: creditsForPlan', 'verify-subscription replay must not reset credits outside the transaction');
  assertNotIncludes(verifySubscription, 'updateProductSubscription(productId, razorpay_subscription_id, updatePayload)', 'verify-subscription must not bypass payment idempotency transaction');

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
  ].forEach((token) => assertIncludes(upgradeSubscription, token, 'upgrade-subscription carry-forward boundary'));
  assertNotIncludes(upgradeSubscription, 'const { nSi, oSi, rc }', 'upgrade-subscription must not trust browser remaining credits');
  assertNotIncludes(upgradeSubscription, 'updateProductSubscription(productId, internalSub.id', 'upgrade-subscription must not expire the old subscription outside the carry-forward transaction');
  assertNotIncludes(upgradeSubscription, 'updateProductSubscription(productId, newInternalSub.id', 'upgrade-subscription must not write replacement credits outside the carry-forward transaction');
  assertOrder(upgradeSubscription, 'razorpayClient.subscriptions.cancel(oldProviderSubscriptionId)', 'const upgradeApplication = await applyProductSubscriptionUpgradeCarryForward(productId, {', 'upgrade-subscription provider-before-transaction order');

  [
    'getRazorpayManagedSubscriptionId(oldSubscription)',
    "PROVIDER_TERMINAL_STATUSES.has(String(providerSubscription.status))",
    'razorpayClient.subscriptions.cancel(providerSubscriptionId)',
    'applyProductSubscriptionUpgradeCarryForward(productId, {',
    'application.oldSubscription',
    'application.newSubscription',
  ].forEach((token) => assertIncludes(subscriptionReplacementFinalization, token, 'subscription replacement finalization boundary'));
  assertOrder(subscriptionReplacementFinalization, 'razorpayClient.subscriptions.cancel(providerSubscriptionId)', 'applyProductSubscriptionUpgradeCarryForward(productId, {', 'subscription replacement provider-before-transaction order');

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
    "topupData?.status === 'paid'",
    'topUpCredits: newBalance',
    "status: 'paid'",
  ].forEach((token) => assertIncludes(topupSettlementServer, token, 'top-up webhook settlement server boundary'));

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
    ".collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId).set({",
    'providerOrderId: topupDocumentId,',
    "status: 'pending'",
  ].forEach((token) => assertIncludes(createTopupOrder, token, 'create-topup active-subscription boundary'));
  assertOrder(createTopupOrder, 'const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);', 'verifyTenantAccess(session, tenantId, storeId, request)', 'create-topup scope document ID admission before access check');
  assertOrder(createTopupOrder, 'const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);', "getRateLimitForFeature('PAYMENT_TOPUP')", 'create-topup scope document ID admission before rate limit/provider work');
  assertOrder(createTopupOrder, 'getActiveProductSubscriptionForStore(', 'razorpayClient.orders.create(orderPayload)', 'create-topup must verify active subscription before provider order');
  assertOrder(createTopupOrder, 'razorpayClient.orders.create(orderPayload)', 'const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);', 'create-topup provider-before-topup-doc-normalization order');
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
    'resolveProviderBillingProductId(',
    'resolveVerifiedTopupSettlement({',
    'resolveCurrentTopupSubscriptionSettlement({',
    'topupSnapshot: existingTopup',
    'topupSnapshot: topupData',
    'payment: capturedPayment',
    'invalidSubscription: true',
    'Top-up requires billing reconciliation.',
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
  assertNotIncludes(verifyTopup, 'tx.set(subscriptionRef, {\n                topUpCredits: newBalance,\n                productId,', 'verify-topup must not overwrite transaction-current subscription identity from stale pre-capture state');

  [
    'RAZORPAY_WEBHOOK_MAX_BODY_BYTES = 256 * 1024',
    'rejectInvalidOrOversizedDeclaredBody(',
    "checkPublicRateLimit(request, 'WEBHOOK')",
    'readBoundedTextBody(',
    'validateRazorpayWebhookSignature(requestBody, signature, secret)',
    'claimWebhookEventForProcessing(event, requestBody)',
    'writeProductPaymentTransactionAudit(eventProductId, auditSummary, webhookClaim.eventKey)',
    'applyProductSubscriptionPayment(eventProductId, {',
    'applyProductSubscriptionWebhookEvent(eventProductId, {',
    'getProviderCycleBillingPeriodKey(subscriptionEntity.current_start)',
    'safeSyncProductSubscriptionEntitlementFromSubscription(eventProductId, subscription, source)',
    "markWebhookEvent(webhookClaim.eventKey, 'processed'",
  ].forEach((token) => assertIncludes(webhook, token, 'Razorpay webhook boundary'));
  assertOrder(webhook, 'rejectInvalidOrOversizedDeclaredBody(', "checkPublicRateLimit(request, 'WEBHOOK')", 'webhook declared-size-before-rate-limit order');
  assertOrder(webhook, "checkPublicRateLimit(request, 'WEBHOOK')", 'readBoundedTextBody(', 'webhook rate-limit-before-body-read order');
  assertOrder(webhook, 'readBoundedTextBody(', 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'webhook bounded-body-before-signature order');
  assertOrder(webhook, 'validateRazorpayWebhookSignature(requestBody, signature, secret)', 'claimWebhookEventForProcessing(event, requestBody)', 'webhook signature-before-idempotency order');
  assertNotIncludes(webhook, 'statuses: [', 'webhook status history must be transaction-owned');
  assertNotIncludes(webhook, 'updateSubscriptionForProduct(', 'webhook status events must not bypass event transaction');

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
    'const tenantScope = normalizeAnswerlatticeBillingScopeDocumentId(subscription.tenantId ?? subscription.tId);',
    'const storeScope = normalizeAnswerlatticeBillingScopeDocumentId(subscription.storeId ?? subscription.sId);',
    'const currentTenantScope = normalizeAnswerlatticeBillingScopeDocumentId(',
    'currentTenantScope.numericId !== tenantScope.numericId',
    'currentStoreScope.numericId !== storeScope.numericId',
    'transaction.get(activeSubscriptionsQuery)',
    ".orderBy('cycleEndDate', 'desc')",
    'const summarySubscription = activeSubscription || current;',
    'transaction.set(db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId), {',
    'transaction.set(subscriptionRef, {',
    'export async function applyProductSubscriptionPayment(',
    'return db.runTransaction(async (transaction) => {',
    'if (billingHistory.includes(paymentHistoryId)) {',
    'const shouldResetCredits = billingHistory.length === 0',
    '|| Number(current.creditsLastResetMonth) !== params.billingPeriod;',
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
    'productValues.length > 0',
    'productValues.every((value) => value === PRODUCT_IDS.ANSWERLATTICE)',
    "const tId = getExactNumericScope(record, ['tId', 'tenantId']);",
    "const sId = getExactNumericScope(record, ['sId', 'storeId']);",
  ].forEach((token) => assertIncludes(answerlatticeBillingScopeBoundary, token, 'Answerlattice persisted billing identity boundary'));

  [
    'normalizeAnswerlatticeBillingScopeDocumentId(tenantId)',
    'normalizeAnswerlatticeBillingScopeDocumentId(storeId)',
    'isAnswerlatticeStoreInScope(storeData, { tenantId, storeId }, storeSnapshot.id)',
    'isAnswerlatticeSubscriptionInScope(subscriptionData, { tId: tenantId, sId: storeId })',
    'isAnswerlatticePaymentHistoryItemInScope(item, {',
    'isCurrentSubscription(summarySubscription)',
    "where('event', 'in', ['subscription.charged', 'order.paid'])",
    "orderBy('created_at', 'desc')",
    'limit(25)',
  ].forEach((token) => assertIncludes(answerlatticeBillingClient, token, 'Answerlattice client billing current/history boundary'));
  assertNotIncludes(answerlatticeBillingClient, 'getStoreDocumentRef(storeId)', 'Answerlattice client billing must not build raw store refs');
  assertNotIncludes(answerlatticeBillingClient, 'Number(item.tenantId ?? item.tId)', 'Answerlattice billing history must not coerce persisted tenant ownership');
  assertNotIncludes(answerlatticeBillingClient, 'Number(item.storeId ?? item.sId)', 'Answerlattice billing history must not coerce persisted store ownership');
  [
    'isAnswerlatticeStoreInScope(',
    'getAnswerlatticeBillingRecordScope,',
    '&& !getAnswerlatticeBillingRecordScope(subscription)',
    '&& !getAnswerlatticeBillingRecordScope(current)',
    'isAnswerlatticeSubscriptionInScope(subscriptionData, {',
    'isAnswerlatticeSubscriptionInScope(currentData, {',
    'pId: PRODUCT_IDS.ANSWERLATTICE,',
    'tId: currentTenantScope.numericId,',
    'sId: currentStoreScope.numericId,',
  ].forEach((token) => assertIncludes(productBillingServer, token, 'Answerlattice product billing persisted ownership boundary'));
  assertNotIncludes(productBillingServer, "String(subscription.pId ?? subscription.productId ?? '').trim().toUpperCase()", 'Answerlattice product billing must not normalize persisted product ownership');
  assert(
    answerlatticeIndexes.indexes.some((index) => index.collectionGroup === 'payment_transactions'
      && index.fields?.some((field) => field.fieldPath === 'event')
      && index.fields?.some((field) => field.fieldPath === 'created_at' && field.order === 'DESCENDING')),
    'Answerlattice indexes must support ordered paid billing history',
  );
  assert(
    answerlatticeIndexes.indexes.some((index) => index.collectionGroup === 'subscriptions'
      && index.fields?.some((field) => field.fieldPath === 'status')
      && index.fields?.some((field) => field.fieldPath === 'storeId')
      && index.fields?.some((field) => field.fieldPath === 'tenantId')
      && index.fields?.some((field) => field.fieldPath === 'cycleEndDate' && field.order === 'DESCENDING')),
    'Answerlattice indexes must support authoritative active-subscription entitlement selection',
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
    'productAliases.some((value)',
    'asExactNonNegativeSafeInteger(subscription.topUpCredits ?? 0)',
    'export function resolveVerifiedTopupSettlement(',
    'providerOrderId !== params.expectedOrderId',
    'productId !== params.expectedProductId',
    'notes.billingStoreId ?? notes.storeId ?? notes.sId',
    'asPositiveSafeInteger(payment.amount) !== amount',
    "status === 'paid' && storedPaymentId !== params.expectedPaymentId",
  ].forEach((token) => assertIncludes(topupSettlement, token, 'top-up immutable settlement boundary'));

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
    "subscription.status === 'active'",
    "subscription.status !== 'cancelled' && subscription.status !== 'paused'",
    'cycleEndMs >= nowMs',
    'getActivePlanTypeForSubscription',
  ].forEach((token) => assertIncludes(subscriptionPlanEntitlement, token, 'MenuList paid-cycle plan entitlement boundary'));

  [
    'activePlanType: entitlementValue',
    'normalizeBillingSubscriptionScopeDocumentId,',
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'const expectedTenantScope = normalizeBillingSubscriptionScopeDocumentId(subscription.tenantId);',
    'const expectedStoreScope = normalizeBillingSubscriptionScopeDocumentId(subscription.storeId);',
    'transaction.get(subscriptionRef)',
    'transaction.get(entitledSubscriptionsQuery)',
    ".where('status', 'in', [...PLAN_ENTITLED_SUBSCRIPTION_STATUSES])",
    ".where('cycleEndDate', '>=', admin.firestore.Timestamp.now())",
    ".orderBy('cycleEndDate', 'desc')",
    'currentTenantScope.numericId !== expectedTenantScope.numericId',
    'currentStoreScope.numericId !== expectedStoreScope.numericId',
    "transaction.set(firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary'),",
    'transaction.set(subscriptionRef, {',
    'billingSubscriptionId: activeSubscriptionIdValue',
    'runStorePublicTruthPostCommitEffects({',
    'storeIds: [syncResult.storeId]',
    'revalidate: (tag) => revalidateTag(tag)',
    "'subscriptionEntitlementSync'",
    'invalidateOwnerBusinessAssistantPacketCache({',
    'billing_store_plan_entitlement_post_commit_effect_failed',
    'failedEffectCount: postCommit.failedEffectCount',
    'billing_store_plan_entitlement_sync_failed',
  ].forEach((token) => assertIncludes(entitlementSync, token, 'MenuList entitlement sync boundary'));
  assertNotIncludes(entitlementSync, '.doc(subscription.id)', 'MenuList entitlement sync must not build raw subscription refs');

  [
    "name: 'subscription_access_expiry'",
    'async function runSubscriptionAccessExpiry()',
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
      && index.fields?.length === 2
      && index.fields[0]?.fieldPath === 'status'
      && index.fields[0]?.order === 'ASCENDING'
      && index.fields[1]?.fieldPath === 'cycleEndDate'
      && index.fields[1]?.order === 'ASCENDING'),
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
    'return { ...(docSnap.data() as FirestoreSubscriptionDoc), id: docSnap.id };',
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
    '!gracePeriod.hasKnownGracePeriod || gracePeriod.remainingDays > 0',
    'transaction.set(subscriptionRef, composeServerSubscriptionPayload(update), { merge: true });',
    'await safeSyncStorePlanEntitlementFromSubscription(result.subscription, "server:grace-period-auto-expire");',
  ].forEach((token) => assertIncludes(subscriptionServer, token, 'MenuList server subscription DAL document ID boundary'));
  assertNotIncludes(subscriptionServer, 'getSubscriptionsCollectionRefServer().doc(docId)', 'MenuList server subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionServer, 'return { ...(docSnap.data() as FirestoreSubscriptionDoc), id };', 'MenuList server subscription DAL must return the normalized Firestore doc ID');
  assertNotIncludes(subscriptionServer, '.doc(String(tenantId))', 'MenuList server subscription DAL must not build tenant fallback refs from raw tenant IDs');
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
    'normalizeBillingSubscriptionDocumentId',
    'normalizeBillingSubscriptionScopeDocumentId',
    'const getDocRef = (docId: string) => {',
    'const normalizedDocId = normalizeBillingSubscriptionDocumentId(docId);',
    'if (!normalizedDocId) throw new Error("Invalid billing subscription id.");',
    'return doc(getCollectionRef(), normalizedDocId);',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(id);',
    'if (!normalizedSubscriptionId) return null;',
    'return { ...docSnap.data(), id: docSnap.id };',
    'const tenantScope = normalizeBillingSubscriptionScopeDocumentId(tenantId);',
    'const storeScope = normalizeBillingSubscriptionScopeDocumentId(storeId);',
    'const requestKey = `${tenantScope.documentId}:${storeScope.documentId}`;',
    'orderBy("cycleEndDate", "desc")',
    'const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, tenantScope.documentId);',
  ].forEach((token) => assertIncludes(subscriptionClient, token, 'MenuList client subscription DAL document ID boundary'));
  assertNotIncludes(subscriptionClient, 'doc(getCollectionRef(), docId)', 'MenuList client subscription DAL must not build raw subscription refs');
  assertNotIncludes(subscriptionClient, 'return { ...docSnap.data(), id };', 'MenuList client subscription DAL must return the normalized Firestore doc ID');
  assertNotIncludes(subscriptionClient, 'return { id: docSnap.id, ...docSnap.data() }', 'MenuList client subscription DAL must not allow embedded IDs to override Firestore IDs');

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
    'const initialAllowance = Number(subscription.monthlyCreditsAllowance);',
    'if (!normalizedSubscriptionId || !Number.isFinite(initialAllowance) || initialAllowance <= 0) {',
    '.doc(normalizedSubscriptionId);',
    'id: subscriptionSnap.id,',
    'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);',
    'throw new Error("Billing subscription is not available.");',
    'const billingPeriod = getBillingPeriodKey(current.cycleStartDate);',
    'unitsToConsume > effectiveCapacity',
    "throw new Error('Not enough billing credits for this operation.');",
    '...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {})',
  ].forEach((token) => assertIncludes(capacityCheck, token, 'MenuList AI capacity subscription document ID boundary'));
  assertNotIncludes(capacityCheck, '.doc(subscription.id)', 'MenuList AI capacity must not build raw subscription refs');

  [
    "import { getBillingPeriodKey } from '@lib/billing/billingPeriod';",
    'if (billingPeriod === null) return subscription;',
    'currentBillingPeriod === null',
    "throw new Error('Answerlattice subscription credit balance is invalid.');",
    '...(billingPeriod !== null ? { creditsLastResetMonth: billingPeriod } : {})',
    'normalizeAnswerlatticeBillingScopeDocumentId(scope.tId)',
    '.doc(tenantScope.documentId)',
    '.collection(storeScope.documentId)',
  ].forEach((token) => assertIncludes(answerlatticeAiAccounting, token, 'Answerlattice AI credit period/shape boundary'));
  assertNotIncludes(answerlatticeAiAccounting, 'const getBillingPeriodKey =', 'Answerlattice AI accounting must use shared billing-period truth');
  assertNotIncludes(answerlatticeAiAccounting, '.doc(String(scope.tId))', 'Answerlattice AI accounting must not build raw tenant refs');
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
  ].forEach((token) => assertIncludes(answerlatticeIntakeUsageLedger, token, 'Answerlattice intake credit period/shape boundary'));
  assertNotIncludes(answerlatticeIntakeUsageLedger, 'const getBillingPeriodKey =', 'Answerlattice intake ledger must use shared billing-period truth');
  [
    'export function isAnswerlatticeIntakeLedgerInScope(',
    'data.pId === PRODUCT_IDS.ANSWERLATTICE',
    'ledgerTenantId?.numericId === tenantId.numericId',
    'ledgerStoreId?.numericId === storeId.numericId',
    'export function resolveAnswerlatticeIntakeRefundAllocation(',
    'params.currentBillingPeriod === params.reservedBillingPeriod',
  ].forEach((token) => assertIncludes(answerlatticeIntakeUsageSettlement, token, 'Answerlattice intake pure settlement boundary'));

  [
    "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
    'const subscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);',
    '!subscriptionId\n            || !Number.isSafeInteger(subscriptionTenantId)',
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
    "activeSubscription?.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling",
  ].forEach((token) => assertIncludes(desktopBilling, token, 'desktop billing payment hook parity'));

  [
    'const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase, onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(noopDispatcher);',
    'await onUpgradePlan(sub, plan, currency)',
    'await onClickPaymentCard(plan, currency',
    'await handleTopupPurchase(pack, currency)',
    'await onCancelSubscription({',
    'reason: cancellationReason',
    'otherReason: cancellationReason === CANCELLATION_REASON.OTHER',
    "sub.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling",
  ].forEach((token) => assertIncludes(mobileBilling, token, 'mobile billing payment hook parity'));

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
    'const cycleEndDate = toValidDate(sub.cycleEndDate);',
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
