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
  assert(
    typeof packageJson.scripts['test:compliance-pages:rules'] === 'string'
      && packageJson.scripts['test:compliance-pages:rules'].includes('test-compliance-pages-rules.ts'),
    'package.json must expose the compliance rules emulator regression',
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

function verifyPersistedOverrideRuntime() {
  const { projectComplianceOverride } = require(path.join(
    ROOT,
    'src/database/compliance/complianceOverrideBoundary.ts',
  ));
  const modifiedOn = { toMillis: () => 1_700_000_000_000 };
  const valid = projectComplianceOverride({
    sId: 202,
    tId: 101,
    privacyOverride: 'Owner-reviewed privacy policy text.',
    modifiedOn,
  }, '202', '101');
  assert(valid?.sId === '202' && valid?.tId === '101', 'persisted override must normalize exact scope');
  assert(
    projectComplianceOverride({ ...valid, tId: 999 }, '202', '101') === null,
    'persisted override must reject cross-tenant scope',
  );
  assert(
    projectComplianceOverride({ ...valid, sId: 203 }, '202', '101') === null,
    'persisted override must reject cross-store scope',
  );
  assert(
    projectComplianceOverride({ ...valid, privacyOverride: 'x'.repeat(15001) }, '202', '101') === null,
    'persisted override must reject oversized public content',
  );
  assert(
    projectComplianceOverride({ ...valid, modifiedOn: { toMillis: () => Number.NaN } }, '202', '101') === null,
    'persisted override must reject malformed timestamps',
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
    modifiedOn: new Date('2026-07-15T18:00:00.000Z'),
  });
  assert(inputs, 'compliance inputs must resolve from store contact data');

  ['privacy', 'terms', 'refund'].forEach((type) => {
    const generated = generateComplianceContent(type, inputs);
    assert(generated.includes('Sample Restaurant'), `${type} compliance template must include business name`);
    assert(generated.includes('MenuList provides the underlying technology platform') || generated.includes('powered by MenuList'), `${type} compliance template must include platform disclosure`);
    assert(generated.includes('July 15, 2026'), `${type} compliance template must use the stable source timestamp`);
  });
  const refund = generateComplianceContent('refund', inputs);
  assert(!refund.includes('within 7 days'), 'refund baseline must not invent a customer refund window');
  assert(!refund.includes('5-7 business days'), 'refund baseline must not invent a processing timeline');
  assert(refund.includes('MenuList cannot approve or process customer refunds'), 'refund baseline must keep platform responsibility explicit');

  const composed = composeComplianceContent('system baseline', 'custom owner text');
  assert(composed.startsWith('custom owner text'), 'custom compliance override must render before baseline content');
  assert(composed.includes('MenuList baseline policy content and platform disclosures'), 'custom compliance override must retain MenuList baseline disclosure');
  assert(composeComplianceContent('system baseline', '') === 'system baseline', 'empty custom compliance override must fall back to system baseline');
  const malformedTimestampInputs = extractComplianceInputs({
    name: 'Sample Restaurant',
    email: 'hello@example.com',
    modifiedOn: { toDate: () => { throw new Error('malformed_timestamp'); } },
  });
  assert(
    malformedTimestampInputs?.lastUpdated === 'July 16, 2026',
    'malformed legacy timestamps must use the versioned compliance effective date',
  );
}

function verifyApiBoundary() {
  const route = read('src/app/api/compliance/route.ts');
  const serverDal = read('src/database/compliance/server.ts');

  assertIncludes(route, "export const dynamic = 'force-dynamic';", 'Compliance API route dynamic boundary');
  assertIncludes(route, "import { withAuth } from '../../../middleware/auth';", 'Compliance API auth guard');
  assertIncludes(route, "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';", 'Compliance API Firestore document ID guard import');
  assertIncludes(route, 'getBoundedRuntimeStringContext, logRuntimeFailure', 'Compliance API bounded runtime diagnostics import');
  assertIncludes(route, 'export const GET = withAuth', 'Compliance API GET auth guard');
  assertIncludes(route, 'export const POST = withAuth', 'Compliance API POST auth guard');
  assertIncludes(route, 'FEATURE_FLAGS.ENABLE_COMPLIANCE_PAGES', 'Compliance API feature flag');
  assertIncludes(route, 'function normalizeComplianceSessionDocumentId(value: unknown): string | null', 'Compliance API session document ID normalizer');
  assertIncludes(route, 'function getComplianceSessionScope(session: any): { sId: string; tId: string } | null', 'Compliance API normalized session scope helper');
  assertIncludes(route, 'const scope = getComplianceSessionScope(session);', 'Compliance API normalizes session scope before route work');
  assertIncludes(route, 'const { sId, tId } = scope;', 'Compliance API uses normalized tenant/store ids');
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
  assertIncludes(route, 'deleteComplianceOverrideServer(sId, tId, type)', 'Compliance API server-side reset DAL');
  assertIncludes(route, 'revalidateCompliancePublicCache(sId, tId)', 'Compliance API public cache invalidation');
  assertIncludes(route, 'refreshPending,', 'Compliance API cache follow-up acknowledgement');
  assertIncludes(route, 'compliance_store_scope_mismatch', 'Compliance API tenant/store identity mismatch boundary');
  assertIncludes(route, 'normalizeMenuListPublicEntityIdentityAliases', 'Compliance API canonical tenant/store identity normalization');
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
  assertNotIncludes(route, 'const { sId, tId } = session', 'Compliance API must not use raw session tenant/store IDs');
  assertNotIncludes(route, 'async function getStoreData(sId: number): Promise<any | null>', 'Compliance API store lookup must not collapse read failures into null');
  assertNotIncludes(route, '.doc(String(sId))', 'Compliance API store lookup must use normalized store document ID');
  assertNotIncludes(route, '} catch {\n        return null;', 'Compliance API store lookup must not silently return missing data on failures');
  assertOrder(route, 'const scope = getComplianceSessionScope(session);', 'const storeLookup = await getStoreData(sId, tId);', 'Compliance API GET normalizes session scope before store lookup');
  assertOrder(route, 'const scope = getComplianceSessionScope(session);', 'const permissionError = await requireAnyStorePermission', 'Compliance API POST normalizes session scope before permission checks');
  assertOrder(route, 'const permissionError = await requireAnyStorePermission', "getRateLimitForFeature('DATA_WRITE')", 'Compliance API permission before write limiter');
  assertOrder(route, "getRateLimitForFeature('DATA_WRITE')", 'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES', 'Compliance API limiter before body parse');
  assertOrder(route, 'readBoundedJsonBody(request, COMPLIANCE_OVERRIDE_MAX_BODY_BYTES', 'OverrideSchema.safeParse(body)', 'Compliance API bounded body before validation');
  assertOrder(route, 'sanitizeComplianceContent(content)', 'saveComplianceOverrideServer(sId, tId, type, sanitized)', 'Compliance API sanitize before write');

  assertIncludes(serverDal, 'import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";', 'Compliance server DAL Firestore document ID guard import');
  assertIncludes(serverDal, 'function normalizeComplianceStoreDocumentId(value: unknown): string | null', 'Compliance server DAL store document ID normalizer');
  assertIncludes(serverDal, 'firestoreAdmin.collection(COLLECTION).doc(documentId)', 'Compliance server DAL normalized store-scoped doc id');
  assertNotIncludes(serverDal, 'firestoreAdmin.collection(COLLECTION).doc(String(sId))', 'Compliance server DAL must not build refs from raw String(sId)');
  assertIncludes(serverDal, 'admin.firestore.FieldValue.delete()', 'Compliance server DAL reset deletes override field');
  assertIncludes(serverDal, 'getCachedComplianceOverridesServer', 'Compliance server DAL cached public override reader');
  assertIncludes(serverDal, 'projectComplianceOverride(docSnap.data(), documentId, tenantId)', 'Compliance server DAL persisted scope projector');
  assertIncludes(serverDal, 'firestoreAdmin.runTransaction(async (transaction)', 'Compliance server DAL transaction-current mutation');
  assertIncludes(serverDal, 'if (!current.exists) return;', 'Compliance reset must not create an orphan row');
  assertIncludes(serverDal, 'unstable_cache(', 'Compliance server DAL Next data cache boundary');
  assertIncludes(serverDal, "['public-compliance-overrides', tenantId, documentId]", 'Compliance server DAL tenant/store-scoped cache key');
  assertIncludes(serverDal, '{ revalidate: 60, tags: [getComplianceCacheTag(documentId)] }', 'Compliance server DAL tagged 60-second cache');
  assert(
    !fs.existsSync(path.join(ROOT, 'src/database/compliance/index.ts')),
    'Compliance client mutation DAL must stay absent; owner writes are server-owned',
  );
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
  assertIncludes(page, "getComplianceMetadata(firstSlug || '', publicCustomerT)", 'Client route localized compliance metadata mapping');
  assertIncludes(page, 'const publicCustomerT = createPublicCustomerTranslator(contentLanguage);', 'Client route compliance metadata public translator');

  assertIncludes(renderer, "sharedGetTenantFromHeaders('CompliancePage')", 'Compliance renderer shared tenant header helper');
  assertIncludes(renderer, 'getStoreBySubdomain(subdomain)', 'Compliance renderer subdomain store lookup');
  assertIncludes(renderer, 'getStoreByCustomDomain(customDomain)', 'Compliance renderer custom-domain store lookup');
  assertIncludes(renderer, 'notFound();', 'Compliance renderer fail-closed missing store');
  assertIncludes(renderer, "import { isValidFirestoreDocumentId } from \"@lib/firebase/firestoreDocumentId\";", 'Compliance renderer Firestore document ID guard import');
  assertIncludes(renderer, 'function normalizePublicComplianceStoreDocumentId(value: unknown): string | null', 'Compliance renderer public store document ID normalizer');
  assertIncludes(renderer, 'PUBLIC_COMPLIANCE_STORE_DOCUMENT_ID_PATTERN.test(documentId)', 'Compliance renderer numeric store document ID shape guard');
  assertIncludes(renderer, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId', 'Compliance renderer exact positive numeric store document ID guard');
  assertIncludes(renderer, 'const sId = storeData.storeId ?? storeData.id;', 'Compliance renderer store document ID fallback source');
  assertIncludes(renderer, 'const complianceStoreDocumentId = normalizePublicComplianceStoreDocumentId(sId);', 'Compliance renderer normalizes store document ID before override read');
  assertIncludes(renderer, 'extractComplianceInputs(storeData)', 'Compliance renderer input extraction');
  assertIncludes(renderer, 'generateComplianceContent(type, inputs)', 'Compliance renderer template generation');
  assertIncludes(renderer, 'const complianceTenantDocumentId = normalizePublicComplianceStoreDocumentId(tId);', 'Compliance renderer tenant document ID guard');
  assertIncludes(renderer, 'getCachedComplianceOverridesServer(', 'Compliance renderer cached override read');
  assertIncludes(renderer, 'complianceTenantDocumentId,', 'Compliance renderer expected tenant scope');
  assertIncludes(renderer, 'composeComplianceContent(systemContent, customContent)', 'Compliance renderer override composition');
  assertIncludes(renderer, 'public_compliance_invalid_store_scope', 'Compliance renderer invalid store scope diagnostic');
  assertIncludes(renderer, 'public_compliance_override_read_failed', 'Compliance renderer bounded override-read diagnostics');
  assertIncludes(renderer, 'logComplianceOverrideReadFailure', 'Compliance renderer override-read diagnostic helper');
  assertIncludes(renderer, "getBoundedRuntimeStringContext('storeId', context.storeId)", 'Compliance renderer bounded store context');
  assertIncludes(renderer, "getBoundedRuntimeStringContext('pageType', context.type)", 'Compliance renderer bounded page type context');
  assertIncludes(renderer, 'hasCustomDomain: Boolean(customDomain)', 'Compliance renderer domain presence metadata');
  assertIncludes(renderer, 'hasSubdomain: Boolean(subdomain)', 'Compliance renderer subdomain presence metadata');
  assertIncludes(renderer, '<PublicMenuListAttribution', 'Compliance renderer MenuList attribution policy');
  assertIncludes(renderer, 'const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);', 'Compliance renderer owner-controlled public language');
  assertIncludes(renderer, 'const t = createPublicCustomerTranslator(contentLanguage);', 'Compliance renderer localized chrome');
  assertIncludes(renderer, "lang={contentLanguage.startsWith('en') ? contentLanguage : 'en'}", 'Compliance renderer canonical English legal-body language truth');
  assertNotIncludes(renderer, '.doc(String(sId))', 'Compliance renderer must not build override refs from raw String(sId)');
  assertNotIncludes(renderer, 'dangerouslySetInnerHTML', 'Compliance renderer must not render custom content as HTML');
  assertNotIncludes(renderer, '} catch {\n        // Firestore error', 'Compliance renderer override read must not silently fall back');
  assertNotIncludes(renderer, 'console.error', 'Compliance renderer direct error logging');
  assertNotIncludes(renderer, 'console.warn', 'Compliance renderer direct warn logging');

  assertIncludes(menuFooter, "href: appendPublicLanguageParam('/privacy', activeLanguage)", 'Public menu footer localized privacy link');
  assertIncludes(menuFooter, "href: appendPublicLanguageParam('/terms', activeLanguage)", 'Public menu footer localized terms link');
  assertIncludes(menuFooter, "href: appendPublicLanguageParam('/refund', activeLanguage)", 'Public menu footer localized refund link');
  assertIncludes(menuFooter, 'showPrivacyLink', 'Public menu footer privacy visibility control');
  assertIncludes(menuFooter, 'showTermsLink', 'Public menu footer terms visibility control');
  assertIncludes(menuFooter, 'showRefundLink', 'Public menu footer refund visibility control');
}

function verifyOwnerEditorsBoundary() {
  const standalone = read('src/components/templates/main-app/businessSettings/tabs/CompliancePagesSection.tsx');
  const customDomain = read('src/components/templates/main-app/businessSettings/tabs/CustomDomainTab.tsx');
  const mobile = read('src/components/mobile/components/MobileCompliancePagesEditor.tsx');
  const mobileOfficial = read('src/components/mobile/screens/MobileOfficialPageScreen.tsx');
  const ownerResponseBoundary = read('src/lib/compliance/ownerComplianceResponseBoundary.ts');
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
    assertIncludes(content, 'normalizeOwnerComplianceLoadResponse(data, expectedScope)', `${label} exact tenant/store response admission`);
    assertIncludes(content, 'currentScopeKeyRef.current !== expectedScope.key', `${label} stale tenant settlement guard`);
    assertIncludes(content, 'isOwnerComplianceMutationScopeAcknowledged(value, expectedScope)', `${label} mutation scope acknowledgement`);
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
  assertIncludes(mobile, 'normalizeOwnerComplianceLoadResponse(data, scope)', 'Mobile compliance load response exact scope admission');
  assertIncludes(mobile, 'compliancePagesRequests.get(scope.key) === request', 'Mobile compliance in-flight request ownership cleanup');
  assertIncludes(mobile, 'compliancePagesRequests.get(scope.key) !== request', 'Mobile compliance stale same-scope response settlement guard');
  assertIncludes(mobile, 'getCachedCompliancePages(scope.key)', 'Mobile compliance exact scope cache lookup');
  assertIncludes(mobile, 'isOwnerComplianceMutationScopeAcknowledged(value, expectedScope)', 'Mobile compliance mutation scope acknowledgement');
  assertIncludes(ownerResponseBoundary, 'key: JSON.stringify([normalizedTenantId, normalizedStoreId])', 'Owner compliance collision-safe tenant/store cache key');
  assertIncludes(ownerResponseBoundary, 'normalizeExactDocumentId(record.tenantId) !== expectedScope.tenantId', 'Owner compliance tenant response match');
  assertIncludes(ownerResponseBoundary, 'normalizeExactDocumentId(record.storeId) !== expectedScope.storeId', 'Owner compliance store response match');
  assertOccurrenceAtLeast(mobileOfficial, 'tenantId={storeDetails?.tenantId}', 3, 'Mobile Official Page compliance tenant scope');
  assertOccurrenceAtLeast(mobileOfficial, 'storeId={storeDetails?.storeId}', 3, 'Mobile Official Page compliance store scope');

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
  assertIncludes(features, '- /privacy, /terms, and /refund serve baseline compliance pages', 'Compliance feature flag docs fixed routes');
  assertIncludes(features, '- OBP/menu footers expose the enabled policy links', 'Compliance feature flag docs footer links');

  assertIncludes(rules, 'match /compliancePages/{docId}', 'Firestore compliancePages rule');
  assertIncludes(rules, 'Direct browser reads would', 'Firestore compliancePages server-render rationale');
  assertOccurrenceAtLeast(rules, 'allow read: if false;', 1, 'Firestore compliancePages direct read denial');
  assertIncludes(rules, 'allow write: if false;', 'Firestore compliancePages server-only write boundary');
  assertNotIncludes(rules, 'canWriteCompliancePage', 'Firestore compliancePages must not retain a direct client write helper');
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
  const changelog = read('__docs__/changelog.md');

  docs.forEach(([relativePath, content]) => {
    assertIncludes(content, 'npm run verify:compliance-pages-boundary', `${relativePath} local source gate`);
    [
      'Launch boundary:** Not current launch certification or deploy approval',
      'production-readiness audit',
      'External Certification Runbook',
      '`npm run verify:production-readiness-local`',
      'browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`',
      'authenticated desktop/mobile owner save/reset QA',
      'owner/legal review of final generated or custom policy text',
      'DNS/custom-domain verification',
      'applicable target Firebase/Vercel deploy evidence',
      'production-host smoke',
    ].forEach((token) => assertIncludes(content, token, `${relativePath} top launch boundary`));
    assertNotIncludes(content, 'src/app/_client', `${relativePath} must not reference retired source route`);
    assertNotIncludes(content, '/_client', `${relativePath} must not reference retired internal route`);
    assertIncludes(content, 'tagged 60-second', `${relativePath} current public override cache contract`);
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
  assertIncludes(spec, 'Current Release Boundary (July 16, 2026)', 'Compliance spec current release boundary heading');
  assertIncludes(spec, 'browser custom-domain smoke for `/privacy`, `/terms`, and `/refund`', 'Compliance spec custom-domain smoke gate');
  assertIncludes(spec, 'authenticated desktop and mobile owner save/reset QA', 'Compliance spec owner QA gate');
  assertIncludes(spec, 'owner/legal review of final generated or custom policy text', 'Compliance spec legal review boundary');
  assertIncludes(spec, 'target Firebase deploy evidence where Firestore rules, indexes, Storage rules, or Cloud Function logic change', 'Compliance spec Firebase deploy boundary');
  assertIncludes(spec, 'target Vercel deploy evidence where app routes, middleware, or public renderers change', 'Compliance spec Vercel deploy boundary');
  assertNotIncludes(spec, '**Status:** 🟡 Implementation Ready', 'Compliance spec stale implementation-ready status');
  assertIncludes(impl, 'src/app/client/compliance/CompliancePageContent.tsx', 'Compliance impl current renderer path');
  assertIncludes(impl, 'sanitize executable/style blocks before tag stripping', 'Compliance impl sanitizer hardening note');
  assertIncludes(impl, 'public compliance override read failures log `public_compliance_override_read_failed`', 'Compliance impl public override-read diagnostics note');
  assertIncludes(impl, 'Public compliance override document-ID boundary', 'Compliance impl public override document ID boundary note');
  assertIncludes(impl, 'owner compliance store lookup failures log `compliance_store_lookup_failed`', 'Compliance impl owner store lookup diagnostics note');
  assertIncludes(impl, '`/api/compliance` validates session tenant/store IDs', 'Compliance impl session document ID boundary note');
  assertIncludes(firebaseDoc, 'direct compliancePages doc read', 'Compliance Firebase current override read cost');
  assertIncludes(firebaseDoc, 'compliance-store-{sId}', 'Compliance Firebase tagged cache invalidation contract');
  assertIncludes(firebaseDoc, 'July 6 public override document-ID boundary', 'Compliance Firebase public override document ID boundary note');
  assertIncludes(firebaseDoc, 'July 6 session document-ID boundary', 'Compliance Firebase session document ID boundary note');
  assertIncludes(firebaseDoc, 'July 13 server-owned compliance mutation boundary', 'Compliance Firebase server-owned mutation note');
  assertIncludes(firebaseDoc, 'July 2 sanitizer/source-gate hardening', 'Compliance Firebase sanitizer/source-gate note');
  assertIncludes(firebaseDoc, 'July 5 public override-read diagnostics', 'Compliance Firebase public override-read diagnostics note');
  assertIncludes(firebaseDoc, 'July 5 owner store-lookup diagnostics', 'Compliance Firebase owner store lookup diagnostics note');
  assertIncludes(mobileDoc, 'npm run verify:compliance-pages-boundary', 'Compliance mobile source gate note');
  assertIncludes(audit, 'verify:compliance-pages-boundary', 'Production readiness audit compliance source gate evidence');
  assertIncludes(audit, 'Compliance Pages owner store-lookup diagnostics checkpoint', 'Production readiness audit Compliance owner store lookup checkpoint');
  assertIncludes(audit, 'Compliance Pages session document-ID boundary checkpoint', 'Production readiness audit Compliance session document ID checkpoint');
  assertIncludes(audit, 'Compliance Pages public override document-ID boundary checkpoint', 'Production readiness audit Compliance public override document ID checkpoint');
  assertIncludes(audit, 'Compliance Pages public override-read diagnostics checkpoint', 'Production readiness audit Compliance public override-read checkpoint');
  assertIncludes(audit, 'Compliance Pages spec launch-boundary checkpoint', 'Production readiness audit Compliance spec checkpoint');
  assertIncludes(audit, 'Compliance Pages technical-doc top-boundary checkpoint', 'Production readiness audit Compliance technical-doc checkpoint');
  assertIncludes(changelog, 'Compliance Pages Session Document ID Boundary', 'Changelog Compliance session document ID boundary entry');
  assertIncludes(changelog, 'Compliance Pages Public Override Document ID Boundary', 'Changelog Compliance public override document ID boundary entry');
  assertIncludes(changelog, 'Compliance Pages Owner Store-Lookup Diagnostics', 'Changelog Compliance owner store lookup diagnostics entry');
  assertIncludes(changelog, 'Compliance Pages Public Override-Read Diagnostics', 'Changelog Compliance public override-read diagnostics entry');
  assertIncludes(changelog, 'Compliance Page Server-Owned Mutation Boundary', 'Changelog Compliance server-owned mutation entry');
  assertIncludes(changelog, 'Compliance Pages Spec Launch Boundary', 'Changelog Compliance spec boundary entry');
  assertIncludes(changelog, 'Compliance Pages Technical Docs Top Boundary', 'Changelog Compliance technical-doc boundary entry');
}

function verifyCompliancePagesBoundary() {
  verifyPackageScript();
  verifySanitizerRuntime();
  verifyPersistedOverrideRuntime();
  verifyTemplatesRuntime();
  verifyApiBoundary();
  verifyPublicRouteBoundary();
  verifyOwnerEditorsBoundary();
  verifyRulesAndConstantsBoundary();
  verifyDocsBoundary();

  console.log('Compliance pages boundary verifier passed');
}

verifyCompliancePagesBoundary();
