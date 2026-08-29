#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS', target: 'ES2022' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const includes = (source, token, label) => assert(source.includes(token), `${label} must include ${token}`);
const excludes = (source, token, label) => assert(!source.includes(token), `${label} must not include ${token}`);

const publicAccess = read('src/constants/answerlattice/publicAccess.ts');
const publicPage = read('src/app/sites/answerlattice/early-access/page.tsx');
const publicForm = read('src/app/sites/answerlattice/early-access/EarlyAccessForm.tsx');
const publicRoute = read('src/app/api/answerlattice/public/early-access/route.ts');
const onboardingPage = read('src/app/sites/answerlattice/get-started/page.tsx');
const onboardingRoute = read('src/app/api/answerlattice/onboard/route.ts');
const adminRoute = read('src/app/api/answerlattice/platform/early-access/route.ts');
const legacyAdminPage = read('src/app/(answerlattice)/answerlattice/early-access/page.tsx');
const platformAdminPage = read('src/app/(main)/platform/answerlattice-early-access/page.tsx');
const platformLayout = read('src/app/(main)/platform/layout.tsx');
const adminDashboard = read('src/components/templates/answerlattice/platform/AnswerlatticeEarlyAccessDashboard.tsx');
const clientCollections = read('src/constants/answerlattice/database.ts');
const functionsCollections = read('functions-answerlattice/src/constants/database.ts');
const clientRetention = read('src/data/shared/answerlatticeRetention.ts');
const functionsRetention = read('functions-answerlattice/src/sharedData/answerlatticeRetention.ts');
const answerlatticeNavigation = read('src/constants/answerlattice/navigations.ts');
const platformNavigation = read('src/constants/navigations.ts');
const opsControlRoom = read('src/components/templates/main-app/platform/opsControlRoom/index.tsx');
const structuredData = read('src/app/sites/answerlattice/components/StructuredData.tsx');
const siteConfig = require('../../src/app/sites/answerlattice/siteConfig');
const indexes = JSON.parse(read('firestore-answerlattice.indexes.json'));
const {
  AnswerlatticeEarlyAccessAdminQuerySchema,
  AnswerlatticeEarlyAccessAdminUpdateSchema,
  AnswerlatticeEarlyAccessPublicRequestSchema,
} = require('../../src/lib/answerlattice/earlyAccessContracts');

includes(publicAccess, "ANSWERLATTICE_PUBLIC_ACCESS_MODE = 'early_access'", 'public access gate');
includes(publicAccess, "href: '/early-access'", 'public primary CTA');
includes(onboardingPage, 'redirect(`${basePath}/early-access`)', 'legacy signup redirect');
const gateIndex = onboardingRoute.indexOf('if (!ANSWERLATTICE_PUBLIC_CHECKOUT_ENABLED)');
const userIndex = onboardingRoute.indexOf('const rawUserId = session.user.id');
assert(gateIndex >= 0 && userIndex > gateIndex, 'onboarding must fail closed before provisioning work');
includes(onboardingRoute, "code: 'ANSWERLATTICE_EARLY_ACCESS_REQUIRED'", 'onboarding release-gate response');

includes(publicPage, '<EarlyAccessForm basePath={basePath} />', 'public request page');
includes(publicPage, 'A request is not an account', 'public lifecycle disclosure');
for (const field of ['name', 'workEmail', 'productUrl', 'productStage', 'supportArea', 'supportQuestions', 'featureIdea', 'consent']) {
  includes(publicForm, field, `public ${field} field`);
}
includes(publicForm, 'No account, workspace, subscription, or payment has been created.', 'post-submit lifecycle boundary');
includes(publicForm, 'resetCaptcha()', 'captcha reset path');
includes(publicForm, 'ANSWERLATTICE_EARLY_ACCESS', 'public endpoint rate-limit contract marker');

includes(publicRoute, "checkPublicRateLimit(request, 'ANSWERLATTICE_EARLY_ACCESS'", 'public API rate limit');
includes(publicRoute, 'readBoundedJsonBody(request, MAX_BODY_BYTES', 'public API bounded body');
includes(publicRoute, 'validateHoneypot', 'public API honeypot');
includes(publicRoute, 'verifyTurnstileToken', 'public API Turnstile');
includes(publicRoute, "createHash('sha256').update(normalizedEmail)", 'email-keyed deduplication');
includes(publicRoute, 'db.runTransaction', 'atomic repeat submission');
includes(publicRoute, "pId: PRODUCT_IDS.ANSWERLATTICE", 'Answerlattice product identity');
includes(publicRoute, "getAnswerlatticeRetentionFields('earlyAccessRequests'", 'retention fields');
excludes(publicRoute, 'DB_COLLECTIONS.TENANTS', 'public API tenant provisioning');
excludes(publicRoute, 'DB_COLLECTIONS.STORES', 'public API workspace provisioning');
excludes(publicRoute, 'SUBSCRIPTIONS', 'public API subscription provisioning');
excludes(publicRoute, 'Razorpay', 'public API payment provider boundary');

includes(platformLayout, 'requirePlatformAdminRouteAccess', 'platform layout exact role guard');
includes(platformAdminPage, '<AnswerlatticeEarlyAccessDashboard />', 'canonical platform dashboard route');
includes(legacyAdminPage, 'requirePlatformAdminRouteAccess', 'legacy internal page platform guard');
includes(legacyAdminPage, 'PLATFORM_ANSWERLATTICE_EARLY_ACCESS', 'legacy internal page canonical redirect');
includes(adminRoute, 'withPlatformAuth', 'internal API platform guard');
includes(adminRoute, 'count().get()', 'aggregate request counts');
includes(adminRoute, '.limit(pageSize + 1)', 'bounded request listing');
includes(adminRoute, 'statusHistory.slice(-24)', 'bounded status audit history');
includes(adminDashboard, 'Feature request or idea', 'internal feature-idea review');
includes(adminDashboard, "window.location.href = `mailto:", 'manual invitation boundary');
excludes(adminRoute, 'sendEmail', 'automatic invitation boundary');
excludes(adminRoute, 'createTenant', 'automatic provisioning boundary');

for (const source of [clientCollections, functionsCollections]) {
  includes(source, "ANSWERLATTICE_EARLY_ACCESS_REQUESTS: 'answerlattice_earlyAccessRequests'", 'mirrored collection contract');
}
for (const source of [clientRetention, functionsRetention]) {
  includes(source, 'earlyAccessRequests: 365', 'mirrored retention contract');
}

assert(indexes.indexes.some((index) => (
  index.collectionGroup === 'answerlattice_earlyAccessRequests'
  && JSON.stringify(index.fields) === JSON.stringify([
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'lastSubmittedAt', order: 'DESCENDING' },
  ])
)), 'status plus recency dashboard index is required');
assert(indexes.fieldOverrides.some((override) => (
  override.collectionGroup === 'answerlattice_earlyAccessRequests'
  && override.fieldPath === 'expiresAt'
  && override.ttl === true
)), 'early-access expiry TTL must be configured');

includes(platformNavigation, 'PLATFORM_ANSWERLATTICE_EARLY_ACCESS', 'canonical platform navigation route');
includes(
  platformNavigation,
  "{ label: 'Answerlattice Early Access', route: NAVIGARIONS_ROUTINGS.PLATFORM_ANSWERLATTICE_EARLY_ACCESS, icon: LuUsers, allowedPlatformRoles: [MENULIST_PLATFORM_USER_ROLE] }",
  'exact platform navigation visibility',
);
includes(opsControlRoom, 'href={NAVIGARIONS_ROUTINGS.PLATFORM_ANSWERLATTICE_EARLY_ACCESS}', 'ops control room early-access link');
excludes(answerlatticeNavigation, "key: 'early-access'", 'customer Answerlattice navigation');

const registeredPaths = siteConfig.ANSWERLATTICE_PUBLIC_PAGES.map((page) => page.path);
assert(registeredPaths.includes('/early-access'), 'early access must be publicly discoverable');
assert(!registeredPaths.includes('/get-started'), 'retired signup must not be in the sitemap registry');
excludes(structuredData, "'@type': 'Offer'", 'public purchase structured data');
excludes(structuredData, 'offers:', 'public purchase availability structured data');

const validPublicRequest = {
  name: 'Founder Name',
  workEmail: ' Founder@Example.com ',
  productUrl: 'https://example.com/product',
  productStage: 'beta',
  supportArea: 'onboarding_setup',
  supportQuestions: 'How should a new user finish setup?',
  featureIdea: 'Show founders which question is worth documenting first.',
  consent: true,
  sourcePath: '/early-access',
  website: '',
};
const parsedRequest = AnswerlatticeEarlyAccessPublicRequestSchema.safeParse(validPublicRequest);
assert(parsedRequest.success, 'valid early-access request must pass runtime validation');
assert(parsedRequest.data.workEmail === 'founder@example.com', 'email must normalize before deduplication');
assert(!AnswerlatticeEarlyAccessPublicRequestSchema.safeParse({ ...validPublicRequest, consent: false }).success, 'consent must be explicit');
assert(!AnswerlatticeEarlyAccessPublicRequestSchema.safeParse({ ...validPublicRequest, productUrl: 'javascript:alert(1)' }).success, 'unsafe product URLs must fail');
assert(!AnswerlatticeEarlyAccessPublicRequestSchema.safeParse({ ...validPublicRequest, unknown: true }).success, 'unknown public fields must fail');
assert(AnswerlatticeEarlyAccessAdminQuerySchema.safeParse({ pageSize: '50', status: 'pending' }).success, 'valid admin query must pass');
assert(!AnswerlatticeEarlyAccessAdminQuerySchema.safeParse({ pageSize: 101 }).success, 'unbounded admin query must fail');
assert(AnswerlatticeEarlyAccessAdminUpdateSchema.safeParse({ requestId: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDE', status: 'approved', internalNotes: 'Good fit.' }).success, 'valid admin update must pass');
assert(!AnswerlatticeEarlyAccessAdminUpdateSchema.safeParse({ requestId: '../unsafe', status: 'approved' }).success, 'unsafe request IDs must fail');

process.stdout.write('Answerlattice early-access source and contract verification passed.\n');
