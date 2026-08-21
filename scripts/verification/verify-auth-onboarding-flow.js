#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const phoneOtpStart = read('src/app/api/auth/phone-otp/start/route.ts');
const phoneOtpVerify = read('src/app/api/auth/phone-otp/verify/route.ts');
const claimAccount = read('src/app/api/auth/claim-account/route.ts');
const validateClaim = read('src/app/api/auth/validate-claim/route.ts');
const loginPage = read('src/components/templates/loginPage/index.tsx');
const loginProviders = read('src/providers/loginProviders.tsx');
const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
const setClaimsWorkspace = read('src/lib/auth/setClaimsWorkspace.ts');
const serverUserContext = read('src/lib/auth/serverUserContext.ts');
const pricingSubscription = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');
const desktopBillingSubscription = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
const onboardingRoute = read('src/app/api/onboarding/create-subscription/route.ts');
const authOnboardingReadme = read('__docs__/auth-onboarding/README.md');
const tracker = read('__docs__/audits/menulist-feature-flow-audit-tracker.md');

assert.ok((phoneOtpStart.match(/failClosedOnProviderError: true/g) || []).length >= 2);
assert.ok((phoneOtpVerify.match(/failClosedOnProviderError: true/g) || []).length >= 2);
assert.match(phoneOtpStart, /providerUnavailable \? 503 : 429/);
assert.match(phoneOtpVerify, /providerUnavailable \? 503 : 429/);
assert.match(claimAccount, /failClosedOnProviderError: true/);
assert.match(validateClaim, /failClosedOnProviderError: true/);
assert.match(claimAccount, /rl\.reason === 'provider_unavailable'/);
assert.match(validateClaim, /rl\.reason === 'provider_unavailable'/);
assert.match(claimAccount, /const sessionUserId = resolveCurrentSessionUserDocumentId\(session\);/);
assert.match(claimAccount, /const googleUserId = normalizeOnboardingUserId\(sessionUserId\);/);
assert.doesNotMatch(claimAccount, /normalizeOnboardingUserId\(session\.user\.id\)/);

assert.match(loginPage, /const claimProcessingRef = useRef\(false\);/);
assert.match(loginPage, /if \(pendingClaim && claimProcessingRef\.current\) return;/);
assert.doesNotMatch(loginPage, /\[sessionData, router, claimProcessing, dispatch, updateSession\]/);
assert.match(loginPage, /const isAnswerlatticeExperience = isAnswerlatticeProductHostname\(loginHostname\)/);
assert.match(loginPage, /const shouldOfferGoogleAuth = !isAnswerlatticeExperience;/);
assert.match(loginPage, /Log in to manage reviewed answers and support knowledge\./);
assert.match(loginPage, /<AnswerlatticeLogoMark/);
assert.match(loginPage, /aria-label=\{`Go to \$\{loginProductName\} home`\}/);
assert.match(loginPage, /isAnswerlatticeProductHostname\(loginHostname\)/);
assert.match(loginProviders, /<AntdThemeProvider>/);
assert.doesNotMatch(loginProviders, /ensureReduxContext/);
assert.doesNotMatch(loginProviders, /useEffect|useState|isMounted/);

assert.match(setClaimsWorkspace, /export const resolveSetClaimsRole/);
assert.match(setClaimsWorkspace, /@lib\/permissions\/scopeDocumentId/);
assert.doesNotMatch(setClaimsWorkspace, /@lib\/permissions\/server/);
assert.match(setClaimsWorkspace, /params\.hasPlatformAccess \? 'staff' : null/);
assert.match(setClaimsRoute, /set_claims_missing_or_privileged_store_role_rejected/);
assert.match(setClaimsRoute, /userRole: storeRole,/);
assert.doesNotMatch(setClaimsRoute, /storeRole \|\| dbUser\.role/);
assert.match(setClaimsRoute, /scope\.role \|\| DEFAULT_ANSWERLATTICE_ROLE_IDS\.STAFF/);
assert.doesNotMatch(setClaimsRoute, /role: userRole \|\| 'OWNER'/);

assert.match(serverUserContext, /import \{ sanitizeForFirestore \} from "@lib\/firestore\/sanitizeForFirestore";/);
assert.match(serverUserContext, /const userToAdd = sanitizeForFirestore\(\{/);
assert.doesNotMatch(serverUserContext, /const sanitizeForAdminFirestore/);
assert.doesNotMatch(serverUserContext, /constructor\?\.name === 'Timestamp'/);

assert.doesNotMatch(pricingSubscription, /normalizeRazorpaySubscriptionCheckoutUrl/);
assert.match(pricingSubscription, /activeSubscription\.status === 'pending'/);
assert.match(pricingSubscription, /Complete payment/);
assert.match(pricingSubscription, /Continue in Billing/);
assert.match(pricingSubscription, /window\.location\.assign\(`\$\{OWNER_APP_URL\}\/billing`\)/);
for (const source of [desktopBillingSubscription, mobileBilling]) {
  assert.match(source, /normalizeRazorpaySubscriptionCheckoutUrl/);
  assert.match(source, /subscriptionCheckoutUrl/);
}

assert.match(onboardingRoute, /getSubscriptionById\(razorpaySubscription\.id\)/);
assert.match(onboardingRoute, /isMatchingPersistedOnboardingSubscription\(\{/);
assert.match(authOnboardingReadme, /Current code-truth flow/);
assert.match(tracker, /\| 3 \| Authentication and onboarding \|/);
assert.match(tracker, /\| 3 \| Authentication and onboarding \| Local source complete \|/);

process.stdout.write('Auth and onboarding flow verification passed.\n');
