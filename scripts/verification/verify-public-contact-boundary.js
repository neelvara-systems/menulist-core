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
const legacyEnquiriesDalPath = path.join(ROOT, 'src/database/landingPage/enquiries.ts');

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

requireTokens(boundary, [
  'normalizePublicContactSourcePath',
  "!sourcePath.startsWith('/') || sourcePath.startsWith('//')",
  'return parsed.pathname.slice(0, PUBLIC_CONTACT_SOURCE_PATH_MAX_LENGTH)',
  'normalizePublicContactReferrer',
  "parsed.protocol !== 'https:' && parsed.protocol !== 'http:'",
  'return `${parsed.origin}${parsed.pathname}`',
  'return value ?? null;',
], 'public contact persistence boundary');

requireTokens(publicApi, [
  'type PublicRateLimitOptions',
  'failurePolicy: options.failClosed ? \'closed\' : \'open\'',
  'if (!options.failClosed) return null;',
  'status: 503,',
  'const TURNSTILE_PROVIDER_TIMEOUT_MS = 8_000;',
  'const controller = new AbortController();',
  'setTimeout(() => controller.abort(), TURNSTILE_PROVIDER_TIMEOUT_MS)',
  "redirect: 'manual'",
  'signal: controller.signal',
  'clearTimeout(timeout)',
], 'public limiter and Turnstile boundary');

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
process.stdout.write('Validated fail-closed contact limiting, bounded Turnstile delivery, query-free attribution, and zero-count preservation.\n');
