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
const forgotPassword = read('src/components/templates/forgotPassword/index.tsx');
const signInPage = read('src/app/(global-pages)/signin/page.tsx');
const globalPagesLayout = read('src/app/(global-pages)/layout.tsx');
const loginProviders = read('src/providers/loginProviders.tsx');
const profileActions = read('src/components/organisms/headerComponent/profileActionsModal/index.tsx');
const answerlatticeHeader = read('src/components/answerlattice/AnswerlatticeHeader.tsx');
const answerlatticeLayout = read('src/app/(answerlattice)/layout.tsx');
const sessionExpiryMonitor = read('src/components/auth/SessionExpiryMonitor.tsx');
const mainLayout = read('src/app/(main)/layout.tsx');
const unauthorizedPage = read('src/app/(global-pages)/unauthorized/page.tsx');
const setClaimsRoute = read('src/app/api/auth/set-claims/route.ts');
const setClaimsWorkspace = read('src/lib/auth/setClaimsWorkspace.ts');
const serverUserContext = read('src/lib/auth/serverUserContext.ts');
const pricingSubscription = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');
const pricingWrapper = read('src/components/website/pricing/PricingWrapper.tsx');
const desktopBilling = read('src/components/templates/main-app/billing/index.tsx');
const desktopBillingSubscription = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
const onboardingRoute = read('src/app/api/onboarding/create-subscription/route.ts');
const onboardingModal = read('src/components/website/pricing-pages/OnboardingModal.tsx');
const ownerAccessRecovery = read('src/lib/onboarding/ownerAccessRecovery.ts');
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
assert.doesNotMatch(loginPage, /shouldOfferGoogleAuth\s*=\s*!isAnswerlatticeExperience/);
assert.match(loginPage, /Continue with Google/);
assert.match(loginPage, /signIn\('google'/);
assert.match(loginPage, /signIn\('google', \{ callbackUrl: `\$\{location\.origin\}\$\{getPostLoginRedirect\(\)\}` \}\)/);
assert.match(loginPage, /FORGOT_PASSWORD\}\?callbackUrl=\$\{encodeURIComponent\(getPostLoginRedirect\(\)\)\}/);
assert.match(forgotPassword, /const signInPath = `\$\{NAVIGARIONS_ROUTINGS\.SIGNIN\}\?callbackUrl=\$\{encodeURIComponent\(callbackPath\)\}`/);
assert.match(forgotPassword, /router\.replace\(callbackPath\)/);
assert.match(forgotPassword, /router\.push\(signInPath\)/);
assert.match(loginPage, /oauthError === 'OAuthCallback' \|\| oauthError === 'OAuthSignin'/);
assert.match(loginPage, /Google sign-in could not be completed\. Please try again\./);
assert.match(loginPage, /Log in to manage reviewed answers and support knowledge\./);
assert.match(loginPage, /<AnswerlatticeLogoMark/);
assert.match(loginPage, /aria-label=\{`Go to \$\{loginProductName\} home`\}/);
assert.equal(
  (loginPage.match(/aria-label=\{`Go to \$\{loginProductName\} home`\}/g) || []).length,
  2,
  'Both visible MenuList/Answerlattice brand-home actions must use native named buttons.',
);
assert.doesNotMatch(loginPage, /<h1\s+onClick=/);
assert.match(loginPage, /className=\{styles\.cardBrandButton\}/);
assert.match(loginPage, /isAnswerlatticeProductHostname\(loginHostname\)/);
assert.match(signInPage, /title: isAnswerlattice \? 'Answerlattice - Authentication' : 'MenuList - Authentication'/);
assert.match(signInPage, /pathname === '\/answerlattice' \|\| pathname\.startsWith\('\/answerlattice\/'\)/);
assert.match(globalPagesLayout, /let activeSession = session/);
assert.match(globalPagesLayout, /if \(currentUser\) \{[\s\S]*?activeSession = session/);
assert.match(globalPagesLayout, /<SessionProvider session=\{activeSession\}>/);
assert.doesNotMatch(globalPagesLayout, /redirect\('\/dashboard'\)/);
assert.match(profileActions, /await signOutSession\(signOutCallbackUrl\)/);
assert.match(answerlatticeHeader, /signOutCallbackUrl=\{answerlatticeSignOutCallbackUrl\}/);
assert.match(loginProviders, /<AntdThemeProvider>/);
assert.doesNotMatch(loginProviders, /ensureReduxContext/);
assert.doesNotMatch(loginProviders, /useEffect|useState|isMounted/);
assert.match(answerlatticeLayout, /redirect\(`\/unauthorized\?product=answerlattice&callbackUrl=\$\{encodeURIComponent\(callbackPath\)\}`\)/);
assert.match(answerlatticeLayout, /<SessionExpiryMonitor loginCallbackPath=\{callbackPath\} \/>/);
assert.match(sessionExpiryMonitor, /params\.set\('callbackUrl', loginCallbackPath\)/);
assert.match(sessionExpiryMonitor, /buildSessionLoginPath\('expired', loginCallbackPath\)/);
assert.match(sessionExpiryMonitor, /buildSessionLoginPath\('access-ended', loginCallbackPath\)/);
assert.match(mainLayout, /session\.user\?\.pId === PRODUCT_IDS\.ANSWERLATTICE/);
assert.match(mainLayout, /headers\(\)\)\.get\('x-menulist-owner-request-path'\)/);
assert.match(mainLayout, /redirect\(`\/signin\?callbackUrl=\$\{encodeURIComponent\(callbackPath\)\}`\)/);
assert.match(unauthorizedPage, /callbackParam\.startsWith\('\/'\) && !callbackParam\.startsWith\('\/\/'\)/);
assert.match(unauthorizedPage, /`\$\{NAVIGARIONS_ROUTINGS\.SIGNIN\}\?callbackUrl=\$\{encodeURIComponent\(safeCallbackUrl\)\}`/);
assert.match(unauthorizedPage, /await signOutSession\(signInPath, \{ redirectOnIntentionalSignOut: false \}\);/);
assert.match(unauthorizedPage, /router\.replace\(signInPath\)/);
assert.match(unauthorizedPage, /Could not switch accounts\. Please try again\./);
assert.match(unauthorizedPage, /maskOwnerAccountIdentifier\(session\?\.user\?\.email \|\| session\?\.user\?\.name\)/);
assert.match(unauthorizedPage, /Try another account/);
assert.match(unauthorizedPage, /Get help/);

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

assert.match(onboardingModal, /const \[step, setStep\] = useState<'business' \| 'billing'>/);
assert.match(onboardingModal, /if \(collectBusinessDetails && step === 'business'\)/);
assert.match(onboardingModal, /setStep\('billing'\)/);
assert.match(onboardingModal, /step === 'billing' \? <div className="grid gap-5 sm:grid-cols-2">/);
assert.match(onboardingModal, /step === 'business'[\s\S]*?t\('Pricing\.continue'\)/);
for (const state of ['payment_pending', 'starter_expired', 'plan_ended', 'plan_required', 'workspace_missing']) {
  assert.match(ownerAccessRecovery, new RegExp(`'${state}'`));
}

assert.doesNotMatch(pricingSubscription, /normalizeRazorpaySubscriptionCheckoutUrl/);
assert.match(pricingSubscription, /activeSubscription\.status === 'pending'/);
assert.match(pricingSubscription, /Complete payment/);
assert.match(pricingSubscription, /Continue in Billing/);
assert.match(pricingSubscription, /window\.location\.assign\(`\$\{OWNER_APP_URL\}\/billing`\)/);
assert.match(pricingWrapper, /parsePricingPlanHandoff\(searchParams\?\.toString\(\) \?\? ''\)/);
assert.match(pricingWrapper, /requestedPlanHandoff=\{requestedPlanHandoff\}/);
assert.match(pricingSubscription, /Your selected plan has not replaced the pending checkout\./);
assert.match(pricingSubscription, /MenuList will not create a second checkout\./);
for (const source of [desktopBillingSubscription, mobileBilling]) {
  assert.match(source, /normalizeRazorpaySubscriptionCheckoutUrl/);
  assert.match(source, /subscriptionCheckoutUrl/);
}
for (const source of [desktopBilling, mobileBilling]) {
  assert.match(source, /new URL\('\/pricing', getPlatformWebsiteBaseUrl\(\)\)\.toString\(\)/);
  assert.match(source, /window\.location\.assign\(pricingUrl\)/);
  assert.doesNotMatch(source, /router\.push\(['"]\/pricing['"]\)/);
}

assert.match(onboardingRoute, /getSubscriptionById\(razorpaySubscription\.id\)/);
assert.match(onboardingRoute, /isMatchingPersistedOnboardingSubscription\(\{/);
assert.match(authOnboardingReadme, /Current code-truth flow/);
assert.match(tracker, /\| 3 \| Authentication and onboarding \|/);
assert.match(tracker, /\| 3 \| Authentication and onboarding \| Local source complete \|/);

process.stdout.write('Auth and onboarding flow verification passed.\n');
