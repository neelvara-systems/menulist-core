#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};
const requireTokens = (source, tokens, label) => tokens.forEach((token) => {
  assert(source.includes(token), `${label} missing ${token}`);
});

const route = read('src/app/api/public/contact/route.ts');
const publicApi = read('src/middleware/publicApi.ts');
const boundary = read('src/lib/publicContact/contactBoundary.ts');
const packageJson = read('package.json');
const websiteReadme = read('__docs__/main-website/README.md');
const websiteImpl = read('__docs__/main-website/main-website_impl.md');
const securityGuide = read('__docs__/security/secure-logging-guide.md');
const changelog = read('__docs__/changelog.md');
const opsRoute = read('src/app/api/ops/website-enquiries/route.ts');
const opsClientResponse = read('src/lib/ops/websiteEnquiryClientResponse.ts');
const opsMonitor = read('src/components/templates/main-app/platform/websiteEnquiryMonitor/index.tsx');
const opsControlRoom = read('src/components/templates/main-app/platform/opsControlRoom/index.tsx');
const featureFlags = read('src/config/features.ts');
const firestoreIndexes = JSON.parse(read('firestore.indexes.json'));
const legacyEnquiriesDalPath = path.join(ROOT, 'src/database/landingPage/enquiries.ts');

const hasIndexExemption = (collectionGroup, fieldPath) => firestoreIndexes.fieldOverrides?.some(
  (override) => override.collectionGroup === collectionGroup
    && override.fieldPath === fieldPath
    && Array.isArray(override.indexes)
    && override.indexes.length === 0,
);

assert(
  !fs.existsSync(legacyEnquiriesDalPath),
  'retired client-side landing-page enquiry DAL must remain absent',
);

requireTokens(route, [
  "checkPublicRateLimit(request, 'MENULIST_CONTACT_FORM', {",
  'failClosed: true,',
  'readBoundedJsonBody(request, MENULIST_PUBLIC_CONTACT_MAX_BODY_BYTES',
  'ContactRequestSchema.safeParse(bodyResult.data)',
  'validateHoneypot(body.website || undefined)',
  'verifyTurnstileToken(body.captchaToken, request)',
  'preserveOptionalPublicContactCount(sourceContext?.primaryNumber)',
  'normalizePublicContactSourcePath(body.sourcePath)',
  "normalizePublicContactReferrer(request.headers.get('referer'))",
  'sanitizeForFirestore({',
  'DB_COLLECTIONS.LANDING_PAGE_ENQUIRIES',
], 'MenuList public contact route');
assert(!route.includes('sourceContext?.primaryNumber || null'), 'MenuList public contact route must preserve a valid zero count');
assert(!route.includes("referrer: clean(request.headers.get('referer')"), 'MenuList public contact route must not persist raw referrer query strings');
assert(
  hasIndexExemption('landingPageEnquiries', 'message'),
  'landingPageEnquiries.message must remain exempt from unused automatic indexing',
);
assert(
  hasIndexExemption('landingPageEnquiries', 'sourceContext'),
  'landingPageEnquiries.sourceContext must remain exempt from unused automatic indexing',
);

requireTokens(boundary, [
  'normalizePublicContactSourcePath',
  "!sourcePath.startsWith('/')",
  "sourcePath.startsWith('//')",
  "sourcePath.includes('\\\\')",
  '/%5c/i.test(sourcePath)',
  "parsed.origin !== 'https://menulist.invalid'",
  'return parsed.pathname.slice(0, PUBLIC_CONTACT_SOURCE_PATH_MAX_LENGTH)',
  'normalizePublicContactReferrer',
  "parsed.protocol !== 'https:' && parsed.protocol !== 'http:'",
  'return `${parsed.origin}${parsed.pathname}`',
  'return value ?? null;',
], 'public contact persistence boundary');

requireTokens(publicApi, [
  'type PublicRateLimitOptions',
  'failurePolicy: options.failClosed ? \'closed\' : \'open\'',
  'failClosedOnProviderError: options.failClosed,',
  'if (!options.failClosed) return null;',
  "if (result.reason === 'provider_unavailable') {",
  'status: 503,',
  'const TURNSTILE_PROVIDER_TIMEOUT_MS = 8_000;',
  'const controller = new AbortController();',
  'setTimeout(() => controller.abort(), TURNSTILE_PROVIDER_TIMEOUT_MS)',
  "redirect: 'manual'",
  'signal: controller.signal',
  'clearTimeout(timeout)',
], 'public limiter and Turnstile boundary');

requireTokens(opsRoute, [
  "export const dynamic = 'force-dynamic';",
  'ENABLE_WEBSITE_CONTACT_ENQUIRY_OPS_DASHBOARD',
  "withAuth(async (request, session) =>",
  "{ requiredPlatformRole: 'PLATFORM' }",
  'getCurrentPlatformUser(session)',
  'resolveCurrentSessionUserDocumentId(session)',
  "getRateLimitForFeature('DATA_READ')",
  "failClosedOnProviderError: process.env.NODE_ENV === 'production'",
  "rateLimit.reason === 'provider_unavailable'",
  'status: providerUnavailable ? 503 : 429',
  '.orderBy(\'createdOn\', \'desc\')',
  '.limit(scanLimit)',
  'Math.min(Math.max(limit * 3, 60), 120)',
  "cleanOpsText(data.source, 80) !== 'menulist_public_contact'",
  'realtimeListeners: false',
  'const NO_STORE_HEADERS = { \'Cache-Control\': \'no-store\' };',
], 'website enquiry Ops route');
assert(!opsRoute.includes('.onSnapshot('), 'website enquiry Ops route must not add a realtime listener');
assert(!opsRoute.includes('.add('), 'website enquiry Ops route must remain read-only');
assert(!opsRoute.includes('.set('), 'website enquiry Ops route must remain read-only');
assert(!opsRoute.includes('.update('), 'website enquiry Ops route must remain read-only');

requireTokens(opsClientResponse, [
  'WEBSITE_ENQUIRY_OPS_RESPONSE_JSON_MAX_BYTES = 192 * 1024',
  'readJsonResponseWithLimit<unknown>',
  'isWebsiteEnquiryOpsSnapshot',
], 'website enquiry bounded client response');
requireTokens(opsMonitor, [
  "fetch(`/api/ops/website-enquiries?",
  "cache: 'no-store'",
  'resolveExactSessionPlatformRole(session)',
  'requestIdRef.current + 1',
  'requestId !== requestIdRef.current',
  'setSnapshot(null)',
  'Manual refresh only',
  'Open email reply',
], 'website enquiry operator UI');
requireTokens(opsControlRoom, [
  'href="/ops/website-enquiries"',
  'Website Enquiries',
], 'website enquiry Ops navigation');
requireTokens(featureFlags, [
  'ENABLE_WEBSITE_CONTACT_ENQUIRY_OPS_DASHBOARD: true',
  'No listener or write',
], 'website enquiry feature flag');

requireTokens(packageJson, [
  '"verify:public-contact-boundary"',
  '"test:public-contact-boundary"',
  '"test:public-turnstile-boundary"',
], 'public contact package registry');

[
  [websiteReadme, 'main website README'],
  [websiteImpl, 'main website implementation'],
  [securityGuide, 'secure logging guide'],
  [changelog, 'changelog'],
].forEach(([source, label]) => requireTokens(source, [
  '8-second',
  'query',
], `public contact docs (${label})`));
[
  [websiteReadme, 'main website README'],
  [websiteImpl, 'main website implementation'],
  [changelog, 'changelog'],
].forEach(([source, label]) => requireTokens(source, [
  '`landingPageEnquiries.message`',
  '`landingPageEnquiries.sourceContext`',
  'automatic indexing',
], `public contact Firebase cost docs (${label})`));
requireTokens(changelog, [
  'Public Contact Admission and Persistence Boundary',
  'retired client-side enquiry DAL',
  '`npm run verify:public-contact-boundary`',
], 'public contact changelog');

if (failures.length) {
  process.stderr.write(`Public contact boundary verification failed:\n- ${failures.join('\n- ')}\n`);
  process.exit(1);
}
process.stdout.write('PASS verify-public-contact-boundary\n');
process.stdout.write('Validated fail-closed contact limiting, bounded Turnstile delivery, query-free attribution, zero-count preservation, and enquiry payload index exemptions.\n');
