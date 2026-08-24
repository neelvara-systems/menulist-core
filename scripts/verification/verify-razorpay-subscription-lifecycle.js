#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const webhook = read('src/app/api/razorpay/webhook/route.ts');
const createSubscription = read('src/app/api/razorpay/create-subscription/route.ts');
const verifySubscription = read('src/app/api/razorpay/verify-subscription/route.ts');
const reconciler = read('functions/src/billing/reconcileSubscriptions.ts');
const appLifecycle = read('src/data/shared/razorpaySubscriptionLifecycle.ts');
const functionsLifecycle = read('functions/src/sharedData/razorpaySubscriptionLifecycle.ts');
const paymentHook = read('src/hooks/usePaymentHandler.ts');
const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
const answerlatticeBilling = read('src/components/templates/answerlattice/billing/AnswerlatticeBilling.tsx');
const websiteSuccessModal = read('src/components/website/pricing-pages/SubscriptionPayementSuccessModal.tsx');
const activeSubscriptionCard = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
const websiteSubscriptionManagement = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');
const answerlatticeOnboardingForm = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
const answerlatticeOnboardingRoute = read('src/app/api/answerlattice/onboard/route.ts');
const resellerOnboardingRoute = read('src/app/api/reseller/onboard/route.ts');

const events = [
  'subscription.authenticated',
  'subscription.activated',
  'subscription.charged',
  'subscription.completed',
  'subscription.updated',
  'subscription.pending',
  'subscription.halted',
  'subscription.cancelled',
  'subscription.paused',
  'subscription.resumed',
];

for (const event of events) {
  assert.ok(appLifecycle.includes(`'${event}'`), `${event} is missing from shared lifecycle policy`);
  assert.ok(webhook.includes(`case '${event}'`), `${event} is missing from the webhook route`);
}
assert.equal(appLifecycle, functionsLifecycle, 'app and Functions lifecycle policies must be byte-identical');
assert.ok(webhook.includes("request.headers.get('x-razorpay-event-id')"));
assert.ok(webhook.includes('buildWebhookEventKey(event, requestBody, webhookEventId)'));
assert.ok(webhook.includes("return `evt_${createHash('sha256').update(rawKey).digest('hex')}`"));
assert.ok(webhook.includes('isRazorpaySubscriptionWebhookProviderStatusValid('));
assert.ok(webhook.includes("return NextResponse.json({ error: 'Invalid subscription event.' }, { status: 400 })"));

const authenticated = webhook.slice(
  webhook.indexOf("case 'subscription.authenticated'"),
  webhook.indexOf("case 'subscription.activated'"),
);
const activated = webhook.slice(
  webhook.indexOf("case 'subscription.activated'"),
  webhook.indexOf("case 'subscription.charged'"),
);
const charged = webhook.slice(
  webhook.indexOf("case 'subscription.charged'"),
  webhook.indexOf("case 'subscription.completed'"),
);
const updated = webhook.slice(
  webhook.indexOf("case 'subscription.updated'"),
  webhook.indexOf("case 'subscription.resumed'"),
);

assert.ok(authenticated.includes("expectedStatuses: ['pending']"));
assert.ok(authenticated.includes("providerStatus: 'authenticated'"));
assert.ok(authenticated.includes('applyProductSubscriptionWebhookEvent'));
assert.ok(!authenticated.includes('applyProductSubscriptionPayment'));
assert.ok(activated.includes('applyProductSubscriptionWebhookEvent'));
assert.ok(activated.includes("expectedStatuses: ['pending', 'active']"));
assert.ok(!activated.includes("nextStatus: 'active'"));
assert.ok(activated.includes('capturedPaymentSyncPending: true'));
assert.ok(!activated.includes('applyProductSubscriptionPayment'));
assert.ok(!activated.includes('syncSubscriptionForProduct'));
assert.ok(charged.includes("paymentEntity.status !== 'captured'"));
assert.ok(charged.includes('paymentEntity.subscription_id !== subscriptionEntity.id'));
assert.ok(charged.includes('applyProductSubscriptionPayment'));
assert.ok(charged.includes('terminalSettlementPaymentId: paymentHistoryId'));
assert.ok(charged.includes('terminalCapturedPaymentId: preservesTerminalLifecycle'));
assert.ok(charged.includes('const paymentHistoryId = paymentEntity.id'));
assert.ok(!charged.includes('`${event.event}-${subscriptionEntity.id}'));
assert.ok(charged.includes('previousBillingHistory[0] === paymentHistoryId'));
assert.ok(updated.includes('const hasQuantity = updatedSubEntity.quantity !== undefined'));
assert.ok(updated.includes('...(quantity == null ? {} : {'));
assert.ok(updated.includes('productUsesConfiguredTax(eventProductId) && updatedInternalSub.taxSnapshot'));
assert.ok(updated.includes('resizeBillingTaxSnapshot(updatedInternalSub.taxSnapshot, quantity)'));
assert.ok(updated.includes('resolveMenuListProviderQuantityUpdate('));
assert.ok(!updated.includes('updatedInternalSub && updatedSubEntity.quantity !== undefined'));

assert.ok(verifySubscription.includes('razorpayClient.payments.fetch(razorpay_payment_id)'));
assert.ok(verifySubscription.includes('razorpayClient.subscriptions.fetch(razorpay_subscription_id)'));
assert.ok(verifySubscription.includes("payment.status !== 'captured'"));
assert.ok(verifySubscription.includes('resolveRazorpayCheckoutVerificationOutcome(providerSubscription.status)'));
assert.ok(verifySubscription.includes("verificationOutcome === 'processing'"));
assert.ok(verifySubscription.includes("{ success: true, status: 'processing' }, { status: 202 }"));
assert.ok(verifySubscription.includes("verificationOutcome !== 'active' || providerStatus !== 'active'"));
assert.ok(verifySubscription.includes('applyProductSubscriptionPayment'));

assert.ok(paymentHook.includes("status: 'active' | 'processing'"));
assert.ok(paymentHook.includes("activationStatus: verificationResult.status"));
assert.ok(paymentHook.includes("paymentResponse.activationStatus === 'active'"));
assert.ok(paymentHook.includes('isPaymentSubscriptionCreateProcessingResponse'));
assert.ok(paymentHook.includes('onContinuePendingSubscriptionCheckout'));
assert.ok(paymentHook.includes("activationStatus: 'processing'"));
for (const surface of [desktopBilling, mobileBilling, answerlatticeBilling, websiteSuccessModal]) {
  assert.ok(surface.includes("activationStatus === 'processing'"));
}

assert.ok(appLifecycle.includes('RAZORPAY_EMANDATE_CONFIRMATION_WINDOW_MS'));
assert.ok(appLifecycle.includes('resolveRazorpayPendingCheckoutAction'));
assert.ok(createSubscription.includes('resolveRazorpayPendingCheckoutAction(providerPendingSubscription)'));
assert.ok(createSubscription.includes("status: 'processing'"));
assert.ok(createSubscription.includes('razorpayClient.subscriptions.cancel(pendingProviderId)'));
assert.ok(createSubscription.includes('providerStatus: cleanupProviderStatus'));
const pendingDesktopActions = activeSubscriptionCard.slice(
  activeSubscriptionCard.indexOf('if (isPaymentPending)'),
  activeSubscriptionCard.indexOf('if (isManualBilling)'),
);
assert.ok(pendingDesktopActions.includes('handleContinuePendingCheckout'));
assert.ok(!pendingDesktopActions.includes('handleOpenPaymentLink'));
const desktopNewCheckoutHandler = desktopBilling.slice(
  desktopBilling.indexOf('const handleConfirmUpgrade'),
  desktopBilling.indexOf('const handleAddPaidLocation'),
);
const desktopPendingCheckoutHandler = activeSubscriptionCard.slice(
  activeSubscriptionCard.indexOf('const handleContinuePendingCheckout'),
  activeSubscriptionCard.indexOf('const openCancellationModal'),
);
const mobileNewCheckoutHandler = mobileBilling.slice(
  mobileBilling.indexOf('const handleUpgrade'),
  mobileBilling.indexOf('const handleAddPaidLocation'),
);
const mobilePendingCheckoutHandler = mobileBilling.slice(
  mobileBilling.indexOf('const handleContinuePendingCheckout'),
  mobileBilling.indexOf('const handleBuyCredits'),
);
assert.ok(desktopNewCheckoutHandler.includes('await refetchActiveSubscription()'));
assert.ok(desktopPendingCheckoutHandler.includes('await refetchActiveSubscription()'));
assert.ok(mobileNewCheckoutHandler.includes('await refetchSubscription()'));
assert.ok(mobilePendingCheckoutHandler.includes('await refetchSubscription()'));
assert.equal(
  (mobileBilling.match(/handleOpenExternalBillingLink\(subscriptionCheckoutUrl/g) || []).length,
  1,
  'mobile may open the hosted subscription URL only for a past-due retry',
);
assert.ok(mobileBilling.includes('onContinuePendingSubscriptionCheckout(sub)'));
assert.ok(mobileBilling.includes('Starts after payment'));
assert.ok(!websiteSubscriptionManagement.includes('normalizeRazorpaySubscriptionCheckoutUrl'));
assert.ok(websiteSubscriptionManagement.includes('Continue in Billing'));
assert.ok(websiteSubscriptionManagement.includes('window.location.assign(`${OWNER_APP_URL}/billing`)'));
assert.ok(answerlatticeOnboardingForm.includes("result.subscription ? 'Continue in Billing' : 'Continue in AnswerLattice'"));
assert.ok(!answerlatticeOnboardingForm.includes('href={result.subscription.shortUrl}'));
assert.ok(answerlatticeOnboardingRoute.includes("providerStatus: 'created'"));
assert.ok(answerlatticeOnboardingRoute.includes("raw.providerStatus !== undefined && raw.providerStatus !== 'created'"));
assert.ok(resellerOnboardingRoute.includes("providerStatus: 'created'"));

assert.ok(reconciler.includes(".where('status', 'in', ['pending', 'active', 'past_due', 'paused'])"));
assert.ok(reconciler.includes('RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP'));
assert.ok(reconciler.includes('resolveRazorpayProviderSubscriptionStatus'));
assert.ok(reconciler.includes('getReconciliationPaymentAuthorityDecision('));
assert.ok(reconciler.includes('updates.capturedPaymentSyncPending = nextCapturedPaymentSyncPending'));
assert.ok(!reconciler.includes('updates.totalPaymentsMadeCount = providerPaidCount'));
assert.ok(webhook.includes('capturedPaymentSyncPending: !hasCapturedPayment'));

console.log('Razorpay subscription lifecycle source contract verified (10/10 events).');
