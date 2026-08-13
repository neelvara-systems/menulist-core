#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const route = read('src/app/api/onboarding/create-subscription/route.ts');
const boundary = read('src/lib/onboarding/onboardingSubscriptionBoundary.ts');
const tenantStore = read('src/lib/onboarding/createTenantStore.ts');
const subscriptionBoundary = read('src/lib/onboarding/onboardingSubscriptionBoundary.ts');
const schemas = read('src/lib/validation/apiSchemas.ts');
const paymentHandler = read('src/hooks/usePaymentHandler.ts');
const authReadme = read('__docs__/auth-onboarding/README.md');
const authImpl = read('__docs__/auth-onboarding/auth-onboarding_impl.md');
const authFirebase = read('__docs__/auth-onboarding/auth-onboarding_firebase.md');
const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');

const requireText = (source, token, label) => assert.ok(source.includes(token), `${label}: missing ${token}`);
const forbidText = (source, token, label) => assert.ok(!source.includes(token), `${label}: forbidden ${token}`);

requireText(route, '.catch((): null => null);', 'onboarding exact persistence recovery miss');

for (const token of [
  'assertCurrentUserAvailableForOnboardingInTransaction(',
  'isCurrentUserAvailableForOnboarding({',
  'isCurrentUserRecordEligible(params)',
  'transaction.get(userRef)',
  'OnboardingUserUnavailableError',
]) requireText(tenantStore, token, 'transactional current-user gate');

for (const token of [
  'failClosedOnProviderError: true',
  "rateLimitResult.reason === 'provider_unavailable'",
  'status: providerUnavailable ? 503 : 429',
  'withOnboardingPrivateResponse(async (request, session) => {',
  "'Cache-Control': 'private, no-store, max-age=0'",
  "'X-Content-Type-Options': 'nosniff'",
  'const selectedPrice = resolveOnboardingPlanPrice(',
  "currency === 'USD' ? selectedPlan.priceUSD : selectedPlan.priceINR",
  '!isMatchingOnboardingProviderSubscription({',
  'isOwnedOnboardingProviderSubscriptionAttempt({',
  'totalCount,',
  'normalizeRazorpaySubscriptionCheckoutUrl(providerSubscription.short_url)',
  'throw new OnboardingInvalidProviderCheckoutUrlError();',
  'onboardingAttemptId,',
  "onboardingSource: 'WEBSITE_ONBOARDING'",
  'recoverOnboardingProviderSubscription({',
  'findOnboardingProviderSubscriptionForAttempt({',
  'await razorpayClient.subscriptions.cancel(params.providerSubscriptionId, false);',
  'await cancelProviderSubscriptionAndCompensateOnboarding({',
  'reason: ONBOARDING_SUBSCRIPTION_CHECKOUT_URL_INVALID_CODE,',
  'reason: ONBOARDING_SUBSCRIPTION_PROVIDER_RESPONSE_INVALID_CODE,',
  'reason: ONBOARDING_SUBSCRIPTION_PERSISTENCE_FAILED_CODE,',
  'subscription: { id: razorpaySubscription.id }',
]) requireText(route, token, 'onboarding route');
for (const token of ['findOnboardingProviderSubscriptionForAttempt', 'isMatchingOnboardingProviderSubscription', 'isOnboardingProviderSubscription', 'isMatchingPersistedOnboardingSubscription', 'isOwnedOnboardingProviderSubscriptionAttempt', 'resolveOnboardingPlanPrice']) {
  requireText(subscriptionBoundary, token, 'onboarding subscription boundary');
}
for (const token of [
  'record.plan_id === params.providerPlanId',
  'record.quantity === 1',
  'record.total_count === params.totalCount',
  "exactProviderNote(noteRecord.onboardingAttemptId) === params.attemptId",
  "exactProviderNote(noteRecord.onboardingSource) === 'WEBSITE_ONBOARDING'",
  'exactProviderNote(noteRecord.planId) === params.planId',
  'exactProviderNote(noteRecord.storeId) === String(params.storeId)',
  'exactProviderNote(noteRecord.tenantId) === String(params.tenantId)',
  'exactProviderNote(noteRecord.userId) === params.userId',
]) requireText(subscriptionBoundary, token, 'exact provider onboarding subscription identity');
for (const token of [
  'record.pId === DEFAULT_PRODUCT_ID',
  'record.productId === DEFAULT_PRODUCT_ID',
  'record.userId === params.userId',
  'record.uId === params.userId',
  'record.tenantId === params.tenantId',
  'record.tId === params.tenantId',
  'record.storeId === params.storeId',
  'record.sId === params.storeId',
]) requireText(subscriptionBoundary, token, 'exact persisted onboarding subscription identity');

const persistenceWrite = route.indexOf('await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);');
const cancellation = route.indexOf('await razorpayClient.subscriptions.cancel(params.providerSubscriptionId, false);');
const compensationCall = route.indexOf(
  'await cancelProviderSubscriptionAndCompensateOnboarding({',
  persistenceWrite,
);
assert.ok(cancellation >= 0 && persistenceWrite >= 0 && compensationCall > persistenceWrite, 'persistence failure must trigger provider/local compensation');
requireText(paymentHandler, 'const subscriptionId = subscription.id;', 'bounded client response consumer');
requireText(route, 'isMatchingPersistedOnboardingSubscription({', 'exact ambiguous local persistence recovery');
requireText(route, 'providerStatus: "created"', 'pending onboarding provider state');
requireText(boundary, 'resolveRazorpayProviderSubscriptionStatus(record.providerStatus)', 'persisted provider state validation');
requireText(boundary, 'RAZORPAY_PROVIDER_SUBSCRIPTION_STATUS_MAP[providerStatus] === record.status', 'provider/local lifecycle consistency');
forbidText(route, 'subscription: razorpaySubscription,', 'raw provider response');
forbidText(route, 'let razorpaySubscription: any;', 'provider response type');
forbidText(route, 'bodyResult.data as any', 'unchecked onboarding request cast');
forbidText(route, 'Timestamp.now() as any', 'unchecked persisted timestamp cast');
forbidText(route, 'selectedPlan[priceKey]', 'dynamic plan-price registry index');

const schemaStart = schemas.indexOf('export const OnboardingSubscriptionSchema');
const schemaEnd = schemas.indexOf('export type OnboardingSubscriptionRequest', schemaStart);
const onboardingSchema = schemas.slice(schemaStart, schemaEnd);
requireText(onboardingSchema, 'businessName: z.string().trim()', 'trimmed business name');
requireText(onboardingSchema, 'businessIndustry: z.string().trim()', 'trimmed industry');
requireText(onboardingSchema, '}).strict();', 'strict onboarding request');

for (const [source, label] of [
  [authReadme, 'auth onboarding README'],
  [authImpl, 'auth onboarding implementation'],
  [authFirebase, 'auth onboarding Firebase contract'],
  [productionAudit, 'production audit'],
  [changelog, 'changelog'],
]) requireText(source, 'onboarding', label);
requireText(authReadme, 'current-authority and payment-effect hardening', 'auth onboarding README marker');
requireText(productionAudit, 'website onboarding authority and payment convergence', 'production audit marker');

process.stdout.write('Onboarding subscription authority and compensation verification passed.\n');
