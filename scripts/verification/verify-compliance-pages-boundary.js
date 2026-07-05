#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
  require: ['tsconfig-paths/register'],
});

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
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

function assertOrder(content, first, second, label) {
  const firstIndex = content.indexOf(first);
  const secondIndex = content.indexOf(second);
  assert(
    firstIndex !== -1 && secondIndex !== -1 && firstIndex < secondIndex,
    `${label} must include ${first} before ${second}`,
  );
}

function assertOccurrenceAtLeast(content, needle, minimum, label) {
  const count = content.split(needle).length - 1;
  assert(count >= minimum, `${label} must include ${needle} at least ${minimum} times, found ${count}`);
}

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  assert(
    packageJson.scripts['verify:compliance-pages-boundary'] === 'node scripts/verification/verify-compliance-pages-boundary.js',
    'package.json must expose verify:compliance-pages-boundary',
  );
}

function verifySanitizerRuntime() {
  const { sanitizeComplianceContent } = require(path.join(ROOT, 'src/lib/compliance/sanitizer.ts'));
  const enoughPolicyText = [
    'This custom policy text is long enough to pass validation and should remain as plain text for the business owner.',
    '<script>alert("leaked-script-content")</script>',
    '<style>.hidden{display:none}</style>',
    '<strong>Owner supplied policy paragraph</strong>',
    'Visit https://example.com/privacy for a reference domain.',
  ].join('\n');

  const sanitized = sanitizeComplianceContent(enoughPolicyText);
  assert(sanitized, 'compliance sanitizer must return valid long plain text');
  assert(!sanitized.includes('leaked-script-content'), 'compliance sanitizer must remove script block content, not only tags');
  assert(!sanitized.includes('display:none'), 'compliance sanitizer must remove style block content, not only tags');
  assert(!/[<>]/.test(sanitized), 'compliance sanitizer must remove HTML tags');
  assert(sanitized.includes('Owner supplied policy paragraph'), 'compliance sanitizer should preserve ordinary plain text');
  assert(sanitized.includes('example.com'), 'compliance sanitizer should preserve URL hostnames as plain text');
  assert(!sanitized.includes('https://example.com/privacy'), 'compliance sanitizer must remove raw URLs');
  assert(sanitizeComplianceContent('too short') === null, 'compliance sanitizer must reject too-short content');
  assert(
    sanitizeComplianceContent('x'.repeat(16000))?.length === 15000,
    'compliance sanitizer must cap custom content at 15000 characters',
  );
}

function verifyTemplatesRuntime() {
  const {
    composeComplianceContent,
    extractComplianceInputs,
    generateComplianceContent,
  } = require(path.join(ROOT, 'src/lib/compliance/templates.ts'));

  const inputs = extractComplianceInputs({
    name: 'Sample Restaurant',
    addressLine: '1 Main Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    email: 'hello@example.com',
    phoneNumber: '+91 90000 00000',
  });
  assert(inputs, 'compliance inputs must resolve from store contact data');

  ['privacy', 'terms', 'refund'].forEach((type) => {
    const generated = generateComplianceContent(type, inputs);
    assert(generated.includes('Sample Restaurant'), `${type} compliance template must include business name`);
    assert(generated.includes('MenuList provides the underlying technology platform') || generated.includes('powered by MenuList'), `${type} compliance template must include platform disclosure`);
  });

  const composed = composeComplianceContent('system baseline', 'custom owner text');
  assert(composed.startsWith('custom owner text'), 'custom compliance override must render before baseline content');
  assert(composed.includes('MenuList baseline policy content and platform disclosures'), 'custom compliance override must retain MenuList baseline disclosure');
  assert(composeComplianceContent('system baseline', '') === 'system baseline', 'empty custom compliance override must fall back to system baseline');
}

function verifyApiBoundary() {
  const route = read('src/app/api/compliance/route.ts');
  const serverDal = read('src/database/compliance/server.ts');
  const clientDal = read('src/database/compliance/index.ts');

  assertIncludes(route, "export const dynamic = 'force-dynamic';", 'Compliance API route dynamic boundary');
  assertIncludes(route, "import { withAuth } from '../../../middleware/auth';", 'Compliance API auth guard');
  assertIncludes(route, 'getBoundedRuntimeStringContext, logRuntimeFailure', 'Compliance API bounded runtime diagnostics import');
  assertIncludes(route, 'export const GET = withAuth', 'Compliance API GET auth guard');
  assertIncludes(route, 'export const POST = withAuth', 'Compliance API POST auth guard');
  assertIncludes(route, 'FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES', 'Compliance API feature flag');
  assertIncludes(route, "z.enum(['privacy', 'terms', 'refund'])", 'Compliance API supported page types');
  assertIncludes(route, "z.enum(['override', 'reset'])", 'Compliance API supported actions');
  assertIncludes(route, 'content: z.string().max(15000).optional()', 'Compliance API content cap');
  assertIncludes(route, 'COMPLIANCE_OVERRIDE_MAX_BODY_BYTES = 32 * 1024', 'Compliance API bounded body cap');
  assertIncludes(route, 'requireAnyStorePermission', 'Compliance API store permission guard');
  assertIncludes(route, 'PERMISSIONS.MANAGE_PUBLIC_PRESENCE', 'Compliance API public presence permission');
  assertIncludes(route, 'PERMISSIONS.MANAGE_STORE', 'Compliance API manage store fallback permission');
  assertIncludes(route, "getRateLimitForFeature('DATA_WRITE')", 'Compliance API write limiter');
  assertIncludes(route, 'hashPublicRateLimitValue(session.uId || session.user?.id ||', 'Compliance API hashed user limiter segment');
  assertIncludes(route, 'const storeRateLimitHash = hashPublicRateLimitValue(sId);', 'Compliance API hashed store limiter segment');
  assertIncludes(route, 'key: `compliance:${userRateLimitHash}:${storeRateLimitHash}`', 'Compliance API hashed limiter key');
  assertNotIncludes(route, 'key: `compliance:${session.uId}', 'Compliance API must not store raw user id in limiter key');
  assertNotIncludes(route, 'key: `compliance:${sId}', 'Compliance API must not store raw store id in limiter key');
  assertIncludes(route, 'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES', 'Compliance API bounded JSON reader');
  assertIncludes(route, 'getSafeZodValidationDetails(validation.error)', 'Compliance API safe validation details');
  assertIncludes(route, 'sanitizeComplianceContent(content)', 'Compliance API sanitizer');
  assertIncludes(route, 'saveComplianceOverrideServer(sId, tId, type, sanitized)', 'Compliance API server-side save DAL');
  assertIncludes(route, 'deleteComplianceOverrideServer(sId, type)', 'Compliance API server-side reset DAL');
  assertIncludes(route, 'type ComplianceStoreLookupResult', 'Compliance API typed store lookup result');
  assertIncludes(route, 'const storeLookup = await getStoreData(sId, tId);', 'Compliance API passes tenant/store context to store lookup');
  assertIncludes(route, 'if (!storeLookup.ok)', 'Compliance API distinguishes store lookup failure from missing inputs');
  assertIncludes(route, "error: 'Unable to load compliance page details'", 'Compliance API fixed owner-facing store lookup failure');
  assertIncludes(route, 'logRuntimeFailure(\'compliance_store_lookup_failed\'', 'Compliance API bounded store lookup failure diagnostic');
  assertIncludes(route, "getBoundedRuntimeStringContext('storeId', sId)", 'Compliance API bounded store id diagnostic context');
  assertIncludes(route, "getBoundedRuntimeStringContext('tenantId', tId)", 'Compliance API bounded tenant id diagnostic context');
  assertIncludes(route, "failurePolicy: 'return_500'", 'Compliance API store lookup failure policy');
  assertIncludes(route, 'success: true', 'Compliance API success acknowledgement');
  assertIncludes(route, 'action,', 'Compliance API action acknowledgement');
  assertIncludes(route, 'type,', 'Compliance API type acknowledgement');
  assertNotIncludes(route, 'async function getStoreData(sId: number): Promise<any | null>', 'Compliance API store lookup must not collapse read failures into null');
  assertNotIncludes(route, '} catch {\n        return null;', 'Compliance API store lookup must not silently return missing data on failures');
  assertOrder(route, 'requireAnyStorePermission', "getRateLimitForFeature('DATA_WRITE')", 'Compliance API permission before write limiter');
  assertOrder(route, "getRateLimitForFeature('DATA_WRITE')", 'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES', 'Compliance API limiter before body parse');
  assertOrder(route, 'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES', 'OverrideSchema.safeParse(body)', 'Compliance API bounded body before validation');
  assertOrder(route, 'sanitizeComplianceContent(content)', 'saveComplianceOverrideServer(sId, tId, type, sanitized)', 'Compliance API sanitize before write');

  assertIncludes(serverDal, 'firestoreAdmin.collection(COLLECTION).doc(String(sId))', 'Compliance server DAL store-scoped doc id');
  assertIncludes(serverDal, 'admin.firestore.FieldValue.delete()', 'Compliance server DAL reset deletes override field');
  assertIncludes(clientDal, 'deleteField()', 'Compliance client DAL reset deletes override field');
}

function verifyPublicRouteBoundary() {
  const page = read('src/app/client/[[...slug]]/page.tsx');
  const renderer = read('src/app/client/compliance/CompliancePageContent.tsx');
  const menuFooter = read('src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx');

  assertIncludes(page, 'import CompliancePageContent from "../compliance/CompliancePageContent";', 'Client route compliance renderer import');
  assertIncludes(page, "slug === 'privacy' || slug === 'terms' || slug === 'refund'", 'Client route compliance slug intercept');
  assertIncludes(page, 'FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES', 'Client route compliance feature flag');
  assertIncludes(page, 'type={slug as \'privacy\' | \'terms\' | \'refund\'}', 'Client route compliance type pass-through');
  assertIncludes(page, "backHref={appendPublicLanguageParam('/', requestedLanguage)}", 'Client route compliance localized back link');
  assertIncludes(page, 'COMPLIANCE_METADATA_BY_SLUG[firstSlug || \'\']', 'Client route compliance metadata mapping');

  assertIncludes(renderer, "sharedGetTenantFromHeaders('CompliancePage')", 'Compliance renderer shared tenant header helper');
  assertIncludes(renderer, 'getStoreBySubdomain(subdomain)', 'Compliance renderer subdomain store lookup');
  assertIncludes(renderer, 'getStoreByCustomDomain(customDomain)', 'Compliance renderer custom-domain store lookup');
  assertIncludes(renderer, 'notFound();', 'Compliance renderer fail-closed missing store');
  assertIncludes(renderer, 'extractComplianceInputs(storeData)', 'Compliance renderer input extraction');
  assertIncludes(renderer, 'generateComplianceContent(type, inputs)', 'Compliance renderer template generation');
  assertIncludes(renderer, 'composeComplianceContent(systemContent, data[overrideField])', 'Compliance renderer override composition');
  assertIncludes(renderer, '.collection(DB_COLLECTIONS.COMPLIANCE_PAGES)', 'Compliance renderer override doc read');
  assertIncludes(renderer, 'public_compliance_override_read_failed', 'Compliance renderer bounded override-read diagnostics');
  assertIncludes(renderer, 'logComplianceOverrideReadFailure', 'Compliance renderer override-read diagnostic helper');
  assertIncludes(renderer, "getBoundedRuntimeStringContext('storeId', context.storeId)", 'Compliance renderer bounded store context');
  assertIncludes(renderer, "getBoundedRuntimeStringContext('pageType', context.type)", 'Compliance renderer bounded page type context');
  assertIncludes(renderer, 'hasCustomDomain: Boolean(customDomain)', 'Compliance renderer domain presence metadata');
  assertIncludes(renderer, 'hasSubdomain: Boolean(subdomain)', 'Compliance renderer subdomain presence metadata');
  assertIncludes(renderer, '<PublicMenuListAttribution', 'Compliance renderer MenuList attribution policy');
  assertNotIncludes(renderer, 'dangerouslySetInnerHTML', 'Compliance renderer must not render custom content as HTML');
  assertNotIncludes(renderer, '} catch {\n        // Firestore error', 'Compliance renderer override read must not silently fall back');
  assertNotIncludes(renderer, 'console.error', 'Compliance renderer direct error logging');
  assertNotIncludes(renderer, 'console.warn', 'Compliance renderer direct warn logging');

  assertIncludes(menuFooter, "href: '/privacy'", 'Public menu footer privacy link');
  assertIncludes(menuFooter, "href: '/terms'", 'Public menu footer terms link');
  assertIncludes(menuFooter, "href: '/refund'", 'Public menu footer refund link');
  assertIncludes(menuFooter, 'showPrivacyLink', 'Public menu footer privacy visibility control');
  assertIncludes(menuFooter, 'showTermsLink', 'Public menu footer terms visibility control');
  assertIncludes(menuFooter, 'showRefundLink', 'Public menu footer refund visibility control');
}

function verifyOwnerEditorsBoundary() {
  const standalone = read('src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx');
  const customDomain = read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx');
  const mobile = read('src/components/mobile/components/MobileCompliancePagesEditor.tsx');
  const mobileOfficial = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const browserPolicy = read('src/lib/auth/browserRequestPolicy.ts');

  assertIncludes(browserPolicy, "cache: 'no-store' as RequestCache", 'Auth browser request policy cache boundary');
  assertIncludes(browserPolicy, "credentials: 'same-origin' as RequestCredentials", 'Auth browser request policy credential boundary');
  assertIncludes(browserPolicy, "redirect: 'manual' as RequestRedirect", 'Auth browser request policy redirect boundary');

  [
    [standalone, 'standalone desktop compliance section'],
    [customDomain, 'custom-domain desktop compliance section'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'AUTH_BROWSER_REQUEST_POLICY', `${label} shared browser request policy`);
    assertIncludes(content, 'readJsonResponseWithLimit', `${label} bounded response reader`);
    assertIncludes(content, 'DESKTOP_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024', `${label} mutation response cap`);
    assertIncludes(content, 'DESKTOP_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES = 32 * 1024', `${label} load response cap`);
    assertIncludes(content, 'isSuccessfulComplianceMutationResponse', `${label} success acknowledgement guard`);
    assertIncludes(content, 'value.success === true', `${label} success true requirement`);
    assertIncludes(content, 'value.type === type', `${label} type acknowledgement requirement`);
    assertIncludes(content, 'value.action === getExpectedComplianceApiMutationAction(action)', `${label} action acknowledgement requirement`);
    assertIncludes(content, "window.open(pageUrl, '_blank', 'noopener,noreferrer')", `${label} safe preview handoff`);
    assertIncludes(content, 'getBoundedBusinessSettingsStringContext', `${label} bounded diagnostics`);
    assertIncludes(content, "notification.error({ message: 'Failed to save.' });", `${label} fixed save failure copy`);
    assertIncludes(content, "notification.error({ message: 'Failed to reset.' });", `${label} fixed reset failure copy`);
  });

  assertOccurrenceAtLeast(standalone, "...AUTH_BROWSER_REQUEST_POLICY", 2, 'standalone desktop compliance mutations spread shared request policy');
  assertOccurrenceAtLeast(customDomain, "...AUTH_BROWSER_REQUEST_POLICY", 2, 'custom-domain desktop compliance mutations spread shared request policy');

  assertIncludes(mobile, 'AUTH_BROWSER_REQUEST_POLICY', 'Mobile compliance shared browser request policy');
  assertIncludes(mobile, 'readJsonResponseWithLimit', 'Mobile compliance bounded response reader');
  assertIncludes(mobile, 'MOBILE_COMPLIANCE_MUTATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024', 'Mobile compliance mutation response cap');
  assertIncludes(mobile, 'MOBILE_COMPLIANCE_LOAD_RESPONSE_JSON_MAX_BYTES = 32 * 1024', 'Mobile compliance load response cap');
  assertIncludes(mobile, 'isSuccessfulComplianceMutationResponse', 'Mobile compliance success acknowledgement guard');
  assertIncludes(mobile, 'value.success === true', 'Mobile compliance success true requirement');
  assertIncludes(mobile, 'value.type === type', 'Mobile compliance type acknowledgement requirement');
  assertIncludes(mobile, 'value.action === getExpectedComplianceApiMutationAction(action)', 'Mobile compliance action acknowledgement requirement');
  assertIncludes(mobile, "window.open(pageUrl, '_blank', 'noopener,noreferrer')", 'Mobile compliance safe preview handoff');
  assertIncludes(mobile, 'getBoundedBusinessSettingsStringContext', 'Mobile compliance bounded diagnostics');
  assertIncludes(mobile, "Toast.show({ content: 'Failed to save.'", 'Mobile compliance fixed save failure copy');
  assertIncludes(mobile, "Toast.show({ content: 'Failed to reset.'", 'Mobile compliance fixed reset failure copy');
  assertOccurrenceAtLeast(mobile, "...AUTH_BROWSER_REQUEST_POLICY", 2, 'mobile compliance mutations spread shared request policy');

  assertIncludes(mobileOfficial, 'MobileCompliancePagesEditor', 'Mobile Official Page mounts compliance editor');
  assertIncludes(mobileOfficial, 'type="privacy"', 'Mobile Official Page privacy compliance card');
  assertIncludes(mobileOfficial, 'type="terms"', 'Mobile Official Page terms compliance card');
  assertIncludes(mobileOfficial, 'type="refund"', 'Mobile Official Page refund compliance card');
}

function verifyRulesAndConstantsBoundary() {
  const rules = read('firestore.rules');
  const constants = read('src/constants/database.ts');
  const functionConstants = read('functions/src/constants/database.ts');
  const features = read('src/config/features.ts');

  assertIncludes(constants, 'COMPLIANCE_PAGES: "compliancePages"', 'App database constants compliance collection');
  assertIncludes(functionConstants, "COMPLIANCE_PAGES: 'compliancePages'", 'Functions database constants compliance collection');
  assertIncludes(features, 'ENABLE_COMPLIANCE_PAGES: true', 'Compliance feature flag current default');
  assertIncludes(features, '- /privacy and /terms routes serve auto-generated compliance pages', 'Compliance feature flag docs privacy/terms');
  assertIncludes(features, '- OBP footer shows Privacy · Terms links', 'Compliance feature flag docs footer links');

  assertIncludes(rules, 'match /compliancePages/{docId}', 'Firestore compliancePages rule');
  assertIncludes(rules, 'allow read: if true;', 'Firestore compliancePages public read');
  assertIncludes(rules, 'allow create: if canWriteCompliancePage(docId, request.resource.data);', 'Firestore compliancePages create guard');
  assertIncludes(rules, 'allow update: if canWriteCompliancePage(docId, request.resource.data)', 'Firestore compliancePages update guard');
  assertIncludes(rules, 'allow delete: if false;', 'Firestore compliancePages no client delete');
  assertIncludes(rules, 'function canWriteCompliancePage(docId, data)', 'Firestore compliance write helper');
  assertIncludes(rules, "data.keys().hasAll(['tId', 'sId'])", 'Firestore compliance write shape guard');
  assertIncludes(rules, 'string(docId) == string(data.sId)', 'Firestore compliance doc/store match guard');
  assertIncludes(rules, 'belongsToTenantById(data.tId)', 'Firestore compliance tenant guard');
  assertIncludes(rules, 'belongsToStoreById(data.sId)', 'Firestore compliance store guard');
  assertIncludes(rules, 'hasTenantWriteRole()', 'Firestore compliance tenant write role guard');
}

function verifyDocsBoundary() {
  const docs = [
    'README.md',
    'compliance-pages_spec.md',
    'compliance-pages_impl.md',
    'compliance-pages_firebase.md',
    'compliance-pages_mobile-support.md',
  ].map((file) => [`__docs__/compliance-pages/${file}`, read(`__docs__/compliance-pages/${file}`)]);
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  docs.forEach(([relativePath, content]) => {
    assertIncludes(content, 'npm run verify:compliance-pages-boundary', `${relativePath} local source gate`);
    assertNotIncludes(content, 'src/app/_client', `${relativePath} must not reference retired source route`);
    assertNotIncludes(content, '/_client', `${relativePath} must not reference retired internal route`);
    assertNotIncludes(content, 'cached 60s by unstable_cache', `${relativePath} must not over-claim compliance override caching`);
  });

  const readme = docs[0][1];
  const spec = docs[1][1];
  const impl = docs[2][1];
  const firebaseDoc = docs[3][1];
  const mobileDoc = docs[4][1];

  assertIncludes(readme, 'src/app/client/compliance/CompliancePageContent.tsx', 'Compliance README current renderer path');
  assertIncludes(readme, 'src/app/client/[[...slug]]/page.tsx', 'Compliance README current route path');
  assertIncludes(readme, '`ENABLE_COMPLIANCE_PAGES` | `true`', 'Compliance README current flag default');
  assertIncludes(readme, '/refund', 'Compliance README refund route');
  assertIncludes(spec, 'Runtime implemented source evidence; not current launch or legal certification', 'Compliance spec launch/legal boundary status');
  assertIncludes(spec, 'Current Release Boundary (July 2, 2026)', 'Compliance spec current release boundary heading');
  assertIncludes(spec, 'browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`', 'Compliance spec custom-domain smoke gate');
  assertIncludes(spec, 'authenticated desktop and mobile owner save/reset QA', 'Compliance spec owner QA gate');
  assertIncludes(spec, 'owner/legal review of final generated or custom policy text', 'Compliance spec legal review boundary');
  assertIncludes(spec, 'target Firebase deploy evidence where Firestore rules, indexes, Storage rules, or Cloud Function logic change', 'Compliance spec Firebase deploy boundary');
  assertIncludes(spec, 'target Vercel deploy evidence where app routes, middleware, or public renderers change', 'Compliance spec Vercel deploy boundary');
  assertNotIncludes(spec, '**Status:** 🟡 Implementation Ready', 'Compliance spec stale implementation-ready status');
  assertIncludes(impl, 'src/app/client/compliance/CompliancePageContent.tsx', 'Compliance impl current renderer path');
  assertIncludes(impl, 'sanitize executable/style blocks before tag stripping', 'Compliance impl sanitizer hardening note');
  assertIncludes(impl, 'public compliance override read failures log `public_compliance_override_read_failed`', 'Compliance impl public override-read diagnostics note');
  assertIncludes(impl, 'owner compliance store lookup failures log `compliance_store_lookup_failed`', 'Compliance impl owner store lookup diagnostics note');
  assertIncludes(firebaseDoc, 'direct compliancePages doc read', 'Compliance Firebase current override read cost');
  assertIncludes(firebaseDoc, 'July 2 sanitizer/source-gate hardening', 'Compliance Firebase sanitizer/source-gate note');
  assertIncludes(firebaseDoc, 'July 5 public override-read diagnostics', 'Compliance Firebase public override-read diagnostics note');
  assertIncludes(firebaseDoc, 'July 5 owner store-lookup diagnostics', 'Compliance Firebase owner store lookup diagnostics note');
  assertIncludes(mobileDoc, 'npm run verify:compliance-pages-boundary', 'Compliance mobile source gate note');
  assertIncludes(audit, 'verify:compliance-pages-boundary', 'Production readiness audit compliance source gate evidence');
  assertIncludes(audit, 'Compliance Pages owner store-lookup diagnostics checkpoint', 'Production readiness audit Compliance owner store lookup checkpoint');
  assertIncludes(audit, 'Compliance Pages public override-read diagnostics checkpoint', 'Production readiness audit Compliance public override-read checkpoint');
  assertIncludes(audit, 'Compliance Pages spec launch-boundary checkpoint', 'Production readiness audit Compliance spec checkpoint');
  assertIncludes(changelog, 'Compliance Pages Owner Store-Lookup Diagnostics', 'Changelog Compliance owner store lookup diagnostics entry');
  assertIncludes(changelog, 'Compliance Pages Public Override-Read Diagnostics', 'Changelog Compliance public override-read diagnostics entry');
  assertIncludes(changelog, 'Compliance Pages Spec Launch Boundary', 'Changelog Compliance spec boundary entry');
}

function verifyCompliancePagesBoundary() {
  verifyPackageScript();
  verifySanitizerRuntime();
  verifyTemplatesRuntime();
  verifyApiBoundary();
  verifyPublicRouteBoundary();
  verifyOwnerEditorsBoundary();
  verifyRulesAndConstantsBoundary();
  verifyDocsBoundary();

  console.log('Compliance pages boundary verifier passed');
}

verifyCompliancePagesBoundary();
