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

function verifyPackageScript() {
  const packageJson = JSON.parse(read('package.json'));
  const rulesTest = read('scripts/verification/test-guest-feedback-rules.ts');
  assert(
    packageJson.scripts['verify:guest-feedback-boundary'] === 'node scripts/verification/verify-guest-feedback-boundary.js',
    'package.json must expose verify:guest-feedback-boundary',
  );
  assert(
    packageJson.scripts['test:guest-feedback:rules']?.includes('scripts/verification/test-guest-feedback-rules.ts'),
    'package.json must expose test:guest-feedback:rules',
  );
  assert(
    packageJson.scripts['test:public-feedback-defaults-boundary']?.includes('scripts/verification/test-public-feedback-defaults-boundary.ts'),
    'package.json must expose the public feedback defaults regression',
  );
  assertIncludes(rulesTest, 'const replayedSubmission = await submitGuestFeedbackAdmin(idempotentInput);', 'Guest Feedback emulator idempotent replay test');
  assertIncludes(rulesTest, 'nodeAssert.equal(persistedFeedback.size, 1);', 'Guest Feedback emulator single feedback persistence assertion');
  assertIncludes(rulesTest, 'nodeAssert.equal(persistedEvents.size, 1);', 'Guest Feedback emulator single event persistence assertion');
}

function verifySafeReviewUrlRuntime() {
  const {
    isGuestFeedbackSubmitResponse,
    isSuccessfulGuestFeedbackSubmitResponse,
    normalizeGuestFeedbackReviewUrl,
  } = require(path.join(ROOT, 'src/lib/feedback/guestFeedbackSubmitResponse.ts'));

  const safeUrls = [
    'https://search.google.com/local/writereview?placeid=abc123',
    'https://www.google.com/maps/place/example',
    'https://maps.google.com/maps?q=restaurant',
    'https://maps.app.goo.gl/abc123',
    'https://goo.gl/maps/abc123',
    'https://g.page/example/review',
  ];
  const unsafeUrls = [
    'javascript:alert(1)',
    'http://search.google.com/local/writereview?placeid=abc123',
    'https://example.com/review',
    'https://evil-google.com/maps/place/example',
    'https://goo.gl/not-a-map',
    'not a url',
    'x'.repeat(2100),
  ];

  for (const url of safeUrls) {
    assert(normalizeGuestFeedbackReviewUrl(url) === url, `safe review URL should be accepted: ${url}`);
    assert(
      isSuccessfulGuestFeedbackSubmitResponse({ success: true, feedbackId: 'feedback_1', reviewUrl: url }),
      `successful feedback response should accept safe review URL: ${url}`,
    );
  }

  for (const url of unsafeUrls) {
    assert(normalizeGuestFeedbackReviewUrl(url) === null, `unsafe review URL should be rejected: ${url}`);
    assert(
      !isGuestFeedbackSubmitResponse({ success: true, feedbackId: 'feedback_1', reviewUrl: url }),
      `feedback response should reject unsafe review URL: ${url}`,
    );
  }
}

function verifyPublicSubmitRoute() {
  const route = read('src/app/api/public/feedback/submit/route.ts');
  const features = read('src/config/features.ts');
  const schema = read('src/lib/validation/apiSchemas.ts');
  const guestFeedbackSchema = schema.slice(
    schema.indexOf('export const guestFeedbackSubmitSchema = z.object({'),
    schema.indexOf('export type GuestFeedbackSubmitRequest'),
  );
  const projectIdBoundary = read('src/lib/feedback/guestFeedbackProjectIdBoundary.ts');
  const publicApi = read('src/middleware/publicApi.ts');
  const rateLimitConfig = read('src/lib/rateLimit/configs.ts');

  assertIncludes(projectIdBoundary, 'GUEST_FEEDBACK_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/', 'Guest Feedback project ID boundary pattern');
  assertIncludes(projectIdBoundary, 'documentId === value', 'Guest Feedback project ID boundary rejects whitespace-mutated values');
  assertIncludes(projectIdBoundary, 'isValidFirestoreDocumentId(documentId)', 'Guest Feedback project ID shared Firestore guard');
  assertIncludes(projectIdBoundary, 'normalizeGuestFeedbackProjectId', 'Guest Feedback project ID normalizer');
  assertIncludes(projectIdBoundary, 'normalizeGuestFeedbackNumericDocumentId', 'Guest Feedback tenant/store ID normalizer');
  assertIncludes(projectIdBoundary, 'Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId', 'Guest Feedback exact positive numeric document ID boundary');

  assertIncludes(route, "export const dynamic = 'force-dynamic';", 'Guest Feedback submit route dynamic boundary');
  assertIncludes(route, 'FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK', 'Guest Feedback submit route feature flag');
  assertNotIncludes(features, 'Private reputation firewall', 'Guest Feedback review-interception claim');
  assertIncludes(route, "checkPublicRateLimit(req, 'FEEDBACK_SUBMISSION')", 'Guest Feedback submit route public rate limit');
  assertIncludes(route, 'PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES = 16 * 1024', 'Guest Feedback submit route body cap');
  assertIncludes(route, 'function resolveFeedbackDefaults(raw: unknown)', 'Guest Feedback defaults runtime input boundary');
  assertIncludes(route, 'const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([', 'Guest Feedback exact all-alias stored tenant scope');
  assertNotIncludes(route, 'storeData?.tenantId ?? storeData?.tId', 'Guest Feedback must reject conflicting persisted tenant aliases');
  assertIncludes(route, 'tenantData?.active === false', 'Guest Feedback inactive tenant rejection');
  assertIncludes(route, 'tenantData?.deleted === true', 'Guest Feedback deleted tenant rejection');
  assertIncludes(route, 'await logFeedbackMOLEventAdmin(', 'Guest Feedback event completion before response');
  assertNotIncludes(route, "void logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED'", 'Guest Feedback unawaited server event');
  assertIncludes(route, 'readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES', 'Guest Feedback submit route bounded JSON parser');
  assertIncludes(route, 'guestFeedbackSubmitSchema.safeParse(bodyResult.data)', 'Guest Feedback submit route schema validation');
  assertIncludes(route, "import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';", 'Guest Feedback submit route project/target ID normalizer import');
  assertIncludes(route, 'const projectId = normalizeGuestFeedbackProjectId(data.projectId);', 'Guest Feedback submit route helper-level project ID normalization');
  assertIncludes(route, 'const tenantScope = normalizeGuestFeedbackNumericDocumentId(data.tId);', 'Guest Feedback submit route tenant ID normalization');
  assertIncludes(route, 'const storeScope = normalizeGuestFeedbackNumericDocumentId(data.sId);', 'Guest Feedback submit route store ID normalization');
  assertIncludes(route, 'const tenantDocumentId = tenantScope.documentId;', 'Guest Feedback submit route tenant document ID');
  assertIncludes(route, 'const storeDocumentId = storeScope.documentId;', 'Guest Feedback submit route store document ID');
  assertIncludes(route, 'const tenantId = tenantScope.numericId;', 'Guest Feedback submit route tenant numeric ID');
  assertIncludes(route, 'const storeId = storeScope.numericId;', 'Guest Feedback submit route store numeric ID');
  assertIncludes(route, 'validateHoneypot(data.website)', 'Guest Feedback submit route honeypot');
  assertIncludes(route, 'verifyTurnstileToken(data.captchaToken, req)', 'Guest Feedback submit route Turnstile verification');
  assertIncludes(route, '.collection(DB_COLLECTIONS.PROJECTS)', 'Guest Feedback submit route project lookup');
  assertIncludes(route, '.doc(projectId)', 'Guest Feedback submit route uses normalized project document ID');
  assertIncludes(route, '.collection(DB_COLLECTIONS.STORES)', 'Guest Feedback submit route store lookup');
  assertIncludes(route, '.collection(DB_COLLECTIONS.TENANTS)', 'Guest Feedback submit route tenant lookup');
  assertIncludes(route, 'storeTenantScope.numericId !== tenantId', 'Guest Feedback submit route store/tenant match');
  assertIncludes(route, 'isPlatformEntityBlocked(storeData)', 'Guest Feedback submit route store block gate');
  assertIncludes(route, 'isPlatformEntityBlocked(tenantData)', 'Guest Feedback submit route tenant block gate');
  assertIncludes(route, 'projectData?.menuSettings?.feedback === false', 'Guest Feedback submit route project feedback toggle');
  assertIncludes(route, 'storeData?.feedbackEnabled === false', 'Guest Feedback submit route store feedback toggle');
  assertIncludes(route, 'const effectiveMessage = defaults.collectComment ? sanitizedMessage : undefined;', 'Guest Feedback submit route drops hidden comment');
  assertIncludes(route, 'const effectiveName = defaults.collectName ? sanitizedName : undefined;', 'Guest Feedback submit route drops hidden name');
  assertIncludes(route, 'const effectivePhone = defaults.collectPhone ? sanitizedPhone : undefined;', 'Guest Feedback submit route drops hidden phone');
  assertIncludes(route, 'const effectiveEmail = defaults.collectEmail ? sanitizedEmail : undefined;', 'Guest Feedback submit route drops hidden email');
  assertIncludes(route, 'if (effectiveName && effectiveName.length < 2) return requiredFieldError();', 'Guest Feedback submit route post-sanitization name minimum');
  assertIncludes(route, "normalizeGuestFeedbackReviewUrl(storeData?.reviewUrl, 'store_review_url')", 'Guest Feedback submit route store review URL guard');
  assertIncludes(route, "normalizeGuestFeedbackReviewUrl(storeData?.publicPresence?.googleReviewUrl, 'public_presence_google_review_url')", 'Guest Feedback submit route public-presence review URL guard');
  assertIncludes(route, 'submitGuestFeedbackAdmin({', 'Guest Feedback submit route Admin SDK write path');
  assertIncludes(route, 'const submissionId = data.submissionId || randomUUID();', 'Guest Feedback submit route legacy-client idempotency compatibility');
  assertIncludes(route, 'submissionId,', 'Guest Feedback submit route idempotency key handoff');
  assertIncludes(route, 'projectId,', 'Guest Feedback submit route writes normalized project ID');
  assertIncludes(route, 'submission.feedback.id,', 'Guest Feedback submit route deterministic event identity');
  assertIncludes(route, '{ status: submission.created ? 201 : 200 }', 'Guest Feedback submit route create/replay status');
  assertIncludes(route, 'logGuestFeedbackFailure', 'Guest Feedback submit route bounded diagnostics');
  assertIncludes(route, 'export const POST = withCORS(postGuestFeedback);', 'Guest Feedback submit route CORS wrapper');
  assertNotIncludes(route, 'req.json()', 'Guest Feedback submit route unbounded parser');
  assertNotIncludes(route, '.doc(data.projectId)', 'Guest Feedback submit route direct project ID document read');
  assertNotIncludes(route, '.doc(String(data.tId))', 'Guest Feedback submit route direct tenant ID document read');
  assertNotIncludes(route, '.doc(String(data.sId))', 'Guest Feedback submit route direct store ID document read');
  assertNotIncludes(route, '.collection(String(data.sId))', 'Guest Feedback submit route direct store ID collection read');
  assertNotIncludes(route, "logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', data.tId, data.sId, data.projectId", 'Guest Feedback submit route raw project ID MOL event');
  assertNotIncludes(route, "logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', data.tId, data.sId, projectId", 'Guest Feedback submit route raw tenant/store ID MOL event');
  assertNotIncludes(route, 'reviewUrl = storeData?.reviewUrl || storeData?.publicPresence?.googleReviewUrl', 'Guest Feedback submit route raw review URL return');
  assertOrder(route, "checkPublicRateLimit(req, 'FEEDBACK_SUBMISSION')", 'readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES', 'Guest Feedback submit route rate limit before body parse');
  assertOrder(route, 'readBoundedJsonBody(req, PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES', 'guestFeedbackSubmitSchema.safeParse(bodyResult.data)', 'Guest Feedback submit route bounded parse before schema');
  assertOrder(route, 'guestFeedbackSubmitSchema.safeParse(bodyResult.data)', 'validateHoneypot(data.website)', 'Guest Feedback submit route validation before honeypot');
  assertOrder(route, 'const projectId = normalizeGuestFeedbackProjectId(data.projectId);', 'validateHoneypot(data.website)', 'Guest Feedback submit route helper-level project ID normalization before bot checks');
  assertOrder(route, 'const tenantScope = normalizeGuestFeedbackNumericDocumentId(data.tId);', 'validateHoneypot(data.website)', 'Guest Feedback submit route tenant ID normalization before bot checks');
  assertOrder(route, 'const storeScope = normalizeGuestFeedbackNumericDocumentId(data.sId);', 'validateHoneypot(data.website)', 'Guest Feedback submit route store ID normalization before bot checks');
  assertOrder(route, 'const projectId = normalizeGuestFeedbackProjectId(data.projectId);', '.doc(projectId)', 'Guest Feedback submit route helper-level project ID normalization before Firestore lookup');
  assertOrder(route, 'const storeDocumentId = storeScope.documentId;', '.collection(storeDocumentId)', 'Guest Feedback submit route store document ID before Firestore lookup');
  assertOrder(route, 'const tenantDocumentId = tenantScope.documentId;', '.doc(tenantDocumentId)', 'Guest Feedback submit route tenant document ID before Firestore lookup');
  assertOrder(route, 'validateHoneypot(data.website)', 'verifyTurnstileToken(data.captchaToken, req)', 'Guest Feedback submit route honeypot before Turnstile');
  assertOrder(route, 'verifyTurnstileToken(data.captchaToken, req)', '.collection(DB_COLLECTIONS.PROJECTS)', 'Guest Feedback submit route Turnstile before Firestore lookup');

  assertIncludes(guestFeedbackSchema, 'export const guestFeedbackSubmitSchema = z.object({', 'Guest Feedback submit schema');
  assertIncludes(schema, "import { normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';", 'Guest Feedback submit schema project ID normalizer import');
  assertIncludes(guestFeedbackSchema, 'projectId: z.string()\n        .refine((value) => normalizeGuestFeedbackProjectId(value) === value, \'Invalid project ID\')', 'Guest Feedback submit schema project ID boundary');
  assertNotIncludes(guestFeedbackSchema, 'projectId: z.string()\n        .trim()', 'Guest Feedback submit schema must not trim project IDs before boundary validation');
  assertNotIncludes(guestFeedbackSchema, 'projectId: z.string().min(1).max(100)', 'Guest Feedback submit schema loose project ID field');
  assertIncludes(guestFeedbackSchema, 'rating: z.number().int().min(1).max(5)', 'Guest Feedback rating schema');
  assertIncludes(guestFeedbackSchema, "source: z.enum(['menu_footer', 'feedback_qr', 'direct_link'])", 'Guest Feedback source schema');
  assertIncludes(guestFeedbackSchema, 'submissionId: z.string()', 'Guest Feedback submission ID schema');
  assertIncludes(guestFeedbackSchema, ".regex(/^[A-Za-z0-9_-]+$/, 'Invalid submission ID')", 'Guest Feedback submission ID character boundary');
  assertIncludes(guestFeedbackSchema, ".regex(/^[A-Za-z0-9_-]+$/, 'Invalid submission ID')\n        .optional()", 'Guest Feedback legacy-client optional submission ID');
  assertIncludes(guestFeedbackSchema, 'message: z.string().max(300).optional()', 'Guest Feedback message cap');
  assertIncludes(guestFeedbackSchema, 'customerName: z.string().trim().min(2).max(60).optional()', 'Guest Feedback language-neutral name bounds');
  assertIncludes(guestFeedbackSchema, 'customerPhone: z.string().max(20)', 'Guest Feedback phone cap');
  assertIncludes(guestFeedbackSchema, 'customerEmail: z.string().email().max(120).optional()', 'Guest Feedback email cap');
  assertIncludes(guestFeedbackSchema, 'captchaToken: z.string().max(2048).optional()', 'Guest Feedback captcha cap');
  assertIncludes(guestFeedbackSchema, 'website: z.string().max(0).optional()', 'Guest Feedback honeypot schema');

  assertIncludes(publicApi, 'checkPublicRateLimit', 'Guest Feedback public rate-limit helper');
  assertIncludes(publicApi, 'hashPublicRateLimitValue', 'Guest Feedback public rate-limit hashed keys');
  assertIncludes(publicApi, 'sanitizeString', 'Guest Feedback public sanitizer helper');
  assertIncludes(publicApi, 'verifyTurnstileToken', 'Guest Feedback public Turnstile helper');
  assertIncludes(rateLimitConfig, 'FEEDBACK_SUBMISSION', 'Guest Feedback rate-limit config');
  assertIncludes(rateLimitConfig, 'limit: 10', 'Guest Feedback rate-limit count');
  assertIncludes(rateLimitConfig, 'window: 600', 'Guest Feedback rate-limit window');
}

function verifyPublicPageAndForm() {
  const page = read('src/app/feedback/[projectId]/page.tsx');
  const notFoundPage = read('src/app/feedback/[projectId]/not-found.tsx');
  const form = read('src/components/atoms/GuestFeedbackForm/index.tsx');
  const identityHeader = read('src/app/client/[[...slug]]/MenuBreadcrumb.tsx');
  const responseGuard = read('src/lib/feedback/guestFeedbackSubmitResponse.ts');
  const diagnostics = read('src/lib/feedback/publicFeedbackDiagnostics.ts');
  const settingsTab = read('src/components/templates/main-app/businessSettings/tabs/FeedbackSettingsTab.tsx');
  const businessSettings = read('src/components/templates/main-app/businessSettings/index.tsx');
  const mobileAntd = read('src/components/mobile/antd.tsx');
  const mobileAdvancedSettings = read('src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx');

  assertIncludes(page, 'FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK', 'Guest Feedback public page feature flag');
  assertIncludes(page, "import { normalizeGuestFeedbackNumericDocumentId, normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';", 'Guest Feedback public page project/target ID normalizer import');
  assertIncludes(page, 'const normalizedProjectId = normalizeGuestFeedbackProjectId(projectId);', 'Guest Feedback public page project ID boundary');
  assertIncludes(page, 'parseProjectId(normalizedProjectId)', 'Guest Feedback public page parses normalized project ID');
  assertIncludes(page, 'const tenantScope = normalizeGuestFeedbackNumericDocumentId(parts[0]);', 'Guest Feedback public page tenant ID boundary');
  assertIncludes(page, 'const storeScope = normalizeGuestFeedbackNumericDocumentId(parts[parts.length - 1]);', 'Guest Feedback public page store ID boundary');
  assertIncludes(page, 'tenantDocumentId: tenantScope.documentId', 'Guest Feedback public page tenant document ID return');
  assertIncludes(page, 'storeDocumentId: storeScope.documentId', 'Guest Feedback public page store document ID return');
  assertIncludes(page, '.doc(tenantDocumentId)', 'Guest Feedback public page uses normalized tenant document ID');
  assertIncludes(page, '.collection(storeDocumentId)', 'Guest Feedback public page uses normalized store collection ID');
  assertIncludes(page, '.doc(normalizedProjectId)', 'Guest Feedback public page uses normalized project document ID');
  assertIncludes(page, 'getPublicStoreById(storeDocumentId)', 'Guest Feedback public page shared store/tenant eligibility lookup');
  assertIncludes(page, 'projectPublicClientStore({', 'Guest Feedback public page browser-safe store projection');
  assertIncludes(page, 'storeTenantScope.numericId !== tId', 'Guest Feedback public page project/store tenant match');
  assertIncludes(page, 'const storeTenantScope = normalizeMenuListPublicEntityIdentityAliases([', 'Guest Feedback public page exact all-alias tenant scope');
  assertNotIncludes(page, 'storeData.tenantId ?? storeData.tId', 'Guest Feedback page must reject conflicting persisted tenant aliases');
  assertIncludes(page, 'const getProjectData = cache(async', 'Guest Feedback public page request-deduplicated project lookup');
  assertIncludes(page, 'const getStoreInfo = cache(async', 'Guest Feedback public page request-deduplicated store projection');
  assertNotIncludes(page, '.doc(projectId)', 'Guest Feedback public page direct project ID document read');
  assertNotIncludes(page, 'parseInt(parts[0], 10)', 'Guest Feedback public page must not prefix-parse tenant scope');
  assertNotIncludes(page, 'parseInt(parts[parts.length - 1], 10)', 'Guest Feedback public page must not prefix-parse store scope');
  assertNotIncludes(page, '.doc(String(tId))', 'Guest Feedback public page must not build project refs from stringified tenant IDs');
  assertNotIncludes(page, '.collection(String(sId))', 'Guest Feedback public page must not build project refs from stringified store IDs');
  assertNotIncludes(page, '.doc(String(sId))', 'Guest Feedback public page must not build store refs from stringified store IDs');
  assertIncludes(page, 'data?.menuSettings?.feedback === false', 'Guest Feedback public page project feedback toggle');
  assertIncludes(page, 'const feedbackEnabled = storeData.feedbackEnabled !== false', 'Guest Feedback public page store feedback toggle');
  assertIncludes(page, 'normalizePublicFeedbackDefaults(storeData.feedbackDefaults)', 'Guest Feedback public page exact defaults normalization');
  assertIncludes(page, 'storeDetails: PublicClientStore;', 'Guest Feedback public page typed browser-safe store projection');
  assertNotIncludes(page, 'storeDetails: Record<string, any>;', 'Guest Feedback public page must not erase its browser-safe store projection');
  assertNotIncludes(page, 'tempStatus?: any;', 'Guest Feedback public page must not erase its temporary-status contract');
  assertNotIncludes(page, 'contactPersonName', 'Guest Feedback public page owner contact name serialization');
  assertNotIncludes(page, 'contactPersonEmail', 'Guest Feedback public page owner contact email serialization');
  assertNotIncludes(page, 'contactPersonNumber', 'Guest Feedback public page owner contact phone serialization');
  assertNotIncludes(page, 'email: storeData.email', 'Guest Feedback public page owner email serialization');
  assertNotIncludes(page, 'roles:', 'Guest Feedback public page role serialization');
  assertIncludes(page, 'TempStatusBanner', 'Guest Feedback public page temporary status parity');
  assertIncludes(page, 'MenuBreadcrumb', 'Guest Feedback public page identity header');
  assertIncludes(identityHeader, 'const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);', 'Guest Feedback identity logo failure fallback state');
  assertIncludes(identityHeader, 'image?.complete && image.naturalWidth === 0', 'Guest Feedback identity cold-load logo failure detection');
  assertIncludes(identityHeader, 'onError={() => setFailedLogoUrl(normalizedLogoUrl)}', 'Guest Feedback identity runtime logo failure detection');
  assertIncludes(page, 'GuestFeedbackForm', 'Guest Feedback public page form renderer');
  assertIncludes(page, "robots: 'noindex, nofollow'", 'Guest Feedback public page noindex');
  assertIncludes(page, 'logPublicFeedbackPageFailure', 'Guest Feedback public page bounded diagnostics');
  assertNotIncludes(page, 'console.', 'Guest Feedback public page direct console diagnostics');

  assertIncludes(notFoundPage, 'createPublicCustomerTranslator(activeLanguage)', 'Guest Feedback not-found localized copy');
  assertIncludes(notFoundPage, 'getPublicCustomerLanguageDirection(activeLanguage)', 'Guest Feedback not-found language direction');
  assertIncludes(notFoundPage, "new URLSearchParams(window.location.search).get('lang')", 'Guest Feedback not-found requested language');
  assertIncludes(notFoundPage, "getPublicCustomerLocale(requestedLanguage).split('-')[0] || 'en'", 'Guest Feedback not-found supported language projection');
  assertNotIncludes(notFoundPage, 'setActiveLanguage(requestedLanguage)', 'Guest Feedback not-found must not reflect a raw language query into document attributes');
  assertIncludes(notFoundPage, "appendPublicLanguageParam('/', activeLanguage)", 'Guest Feedback not-found localized recovery link');
  assertIncludes(notFoundPage, '<LuMessageSquareDashed', 'Guest Feedback not-found approved icon');
  assertNotIncludes(notFoundPage, 'Page Not Found', 'Guest Feedback not-found English hardcode');

  assertIncludes(form, 'GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY', 'Guest Feedback form request policy');
  assertIncludes(form, 'storeDetails?: Partial<StoreDataType>;', 'Guest Feedback form browser-safe partial store contract');
  assertIncludes(form, 'storeDetails={storeDetails}', 'Guest Feedback form direct public store projection handoff');
  assertNotIncludes(form, 'storeDetails as StoreDataType', 'Guest Feedback form must not widen a public projection through a cast');
  assertIncludes(form, "cache: 'no-store' as RequestCache", 'Guest Feedback form no-store policy');
  assertIncludes(form, "credentials: 'same-origin' as RequestCredentials", 'Guest Feedback form credential policy');
  assertIncludes(form, "redirect: 'manual' as RequestRedirect", 'Guest Feedback form redirect policy');
  assertIncludes(form, 'TurnstileWidget', 'Guest Feedback form Turnstile widget');
  assertIncludes(form, 'captchaToken: captchaToken || undefined', 'Guest Feedback form captcha submission');
  assertIncludes(form, 'submissionIdRef', 'Guest Feedback form stable retry ID state');
  assertIncludes(form, 'submissionId,', 'Guest Feedback form submission ID payload');
  assertIncludes(form, "import { createRuntimeId } from '@lib/runtime/randomId';", 'Guest Feedback form shared runtime ID helper');
  assertIncludes(form, "return createRuntimeId('feedback');", 'Guest Feedback form runtime submission ID');
  assertNotIncludes(form, 'Math.random()', 'Guest Feedback form insecure randomness fallback');
  assertNotIncludes(form, "^[A-Za-z\\s'.-]+$", 'Guest Feedback form ASCII-only name rejection');
  assertIncludes(form, "if (trimmedValue.length < 2) return t('feedback.nameTooShort');", 'Guest Feedback form localized language-neutral name minimum');
  assertIncludes(form, 't: PublicCustomerTranslator,', 'Guest Feedback form public customer translator contract');
  assertIncludes(form, 'readJsonResponseWithLimit', 'Guest Feedback form bounded response parser');
  assertIncludes(form, 'isSuccessfulGuestFeedbackSubmitResponse(data)', 'Guest Feedback form response acknowledgement guard');
  assertIncludes(form, "normalizeGuestFeedbackReviewUrl(data.reviewUrl, 'submit_response_review_url')", 'Guest Feedback form review URL guard');
  assertIncludes(form, "message.error(t('feedback.submitFailed'));", 'Guest Feedback form localized fixed failure copy');
  assertIncludes(form, 'logPublicFeedbackFormFailure', 'Guest Feedback form bounded diagnostics');
  assertIncludes(form, 'htmlFor="guest-feedback-message"', 'Guest Feedback note visible label association');
  assertIncludes(form, 'id="guest-feedback-message"', 'Guest Feedback note stable control ID');
  assertIncludes(form, 'name="message"', 'Guest Feedback note form name');
  assertIncludes(form, 'const GUEST_FEEDBACK_MESSAGE_MAX_LENGTH = 300;', 'Guest Feedback note client length boundary');
  assertIncludes(form, 'event.target.value.slice(0, GUEST_FEEDBACK_MESSAGE_MAX_LENGTH)', 'Guest Feedback note controlled-state length enforcement');
  assertIncludes(form, 'maxLength={GUEST_FEEDBACK_MESSAGE_MAX_LENGTH}', 'Guest Feedback note native length enforcement');
  assertIncludes(form, "'guest-feedback-message-prompt'", 'Guest Feedback note prompt description');
  assertIncludes(form, "'guest-feedback-message-meta'", 'Guest Feedback note privacy and character-count description');
  assertIncludes(form, 'aria-invalid={Boolean(touchedFields.message && formErrors.message)}', 'Guest Feedback note validation semantics');
  assertIncludes(form, 'aria-label={label}', 'Guest Feedback optional contact-field accessible names');
  assertIncludes(form, 'name={name}', 'Guest Feedback optional contact-field stable names');
  assertIncludes(form, 'aria-describedby={error ? `guest-feedback-${name}-error` : undefined}', 'Guest Feedback optional contact-field error association');
  assertNotIncludes(form, 'response.json()', 'Guest Feedback form unbounded response parser');
  assertNotIncludes(form, 'validationMessage || data.error', 'Guest Feedback form raw API response text');
  assertNotIncludes(form, 'data.reviewUrl.trim()', 'Guest Feedback form raw review URL presence check');

  assertIncludes(responseGuard, 'normalizeGuestFeedbackReviewUrl', 'Guest Feedback response guard safe review URL helper');
  assertIncludes(responseGuard, 'guest_feedback_review_url_parse_failed', 'Guest Feedback response guard parse diagnostic');
  assertIncludes(responseGuard, "fallbackPolicy: 'omit_review_url'", 'Guest Feedback response guard parse fallback policy');
  assertIncludes(responseGuard, 'MAX_GUEST_FEEDBACK_REVIEW_URL_PARSE_DIAGNOSTICS = 20', 'Guest Feedback response guard diagnostic cap');
  assertIncludes(responseGuard, 'reportedGuestFeedbackReviewUrlParseShapes.add(shapeKey)', 'Guest Feedback response guard shape cap');
  assertIncludes(responseGuard, "parsed.protocol !== 'https:'", 'Guest Feedback response guard HTTPS requirement');
  assertIncludes(responseGuard, "host === 'google.com' || host.endsWith('.google.com')", 'Guest Feedback response guard Google host requirement');
  assertIncludes(responseGuard, 'isOptionalSafeReviewUrl(value.reviewUrl)', 'Guest Feedback response guard review URL shape');
  assertIncludes(diagnostics, "secureError('[Public Feedback] Form operation failed'", 'Guest Feedback public form secure diagnostics');

  assertIncludes(settingsTab, 'normalizeGuestFeedbackReviewUrl(reviewUrl)', 'Guest Feedback settings shared review URL allowlist');
  assertIncludes(settingsTab, 'aria-label={t(\'enableFeedback\')}', 'Guest Feedback desktop master-toggle accessible name');
  assertIncludes(settingsTab, 'aria-label={label}', 'Guest Feedback desktop field-toggle accessible name');
  assertIncludes(settingsTab, 'aria-label={mandatoryLabel}', 'Guest Feedback desktop required-toggle accessible name');
  assertIncludes(settingsTab, 'aria-label={t(\'googleReviewUrl\')}', 'Guest Feedback desktop review URL accessible name');
  assertNotIncludes(settingsTab, "host.includes('google.com')", 'Guest Feedback settings lookalike Google host admission');
  assertIncludes(settingsTab, 'href={normalizedReviewUrl}', 'Guest Feedback settings safe preview link');
  assertIncludes(businessSettings, "normalizeGuestFeedbackReviewUrl(trimmedReviewUrl, 'business_settings_review_url')", 'Guest Feedback settings save-time URL guard');
  assertIncludes(businessSettings, "message.error('Enter a valid HTTPS Google review link before saving.')", 'Guest Feedback settings invalid URL refusal');
  assertIncludes(businessSettings, 'function getFeedbackSettingsDraft(storeDetails: any)', 'Guest Feedback settings canonical draft resolver');
  assertIncludes(businessSettings, 'setFeedbackEnabled(feedbackDraft.feedbackEnabled);', 'Guest Feedback settings Reset restores enablement');
  assertIncludes(businessSettings, 'setFeedbackDefaults(feedbackDraft.feedbackDefaults);', 'Guest Feedback settings Reset restores contact-field defaults');
  assertIncludes(businessSettings, 'setReviewUrl(feedbackDraft.reviewUrl);', 'Guest Feedback settings Reset restores review URL');
  assertOrder(businessSettings, 'const normalizedReviewUrl = trimmedReviewUrl', 'const savedDetails = await updateStore(updatedChanges);', 'Guest Feedback settings validation before store mutation');
  assertIncludes(mobileAntd, "'aria-label': ariaLabel", 'Mobile Switch accessible-name prop');
  assertIncludes(mobileAntd, 'aria-label={ariaLabel}', 'Mobile Switch accessible-name forwarding');
  assertIncludes(mobileAdvancedSettings, "<Switch aria-label={t('enableFeedback')}", 'Guest Feedback mobile master-toggle accessible name');
  assertIncludes(mobileAdvancedSettings, '<Switch aria-label={label}', 'Guest Feedback mobile field-toggle accessible name');
  assertIncludes(mobileAdvancedSettings, '<Switch aria-label={mandatoryLabel}', 'Guest Feedback mobile required-toggle accessible name');
}

function verifyFirestoreDalAndRetention() {
  const rules = read('firestore.rules');
  const indexes = read('firestore.indexes.json');
  const clientDal = read('src/database/guestFeedback/index.ts');
  const serverDal = read('src/database/guestFeedback/server.ts');
  const retention = read('functions/src/analytics/guestFeedbackRetention.ts');
  const scheduler = read('functions/src/decisionBlocksScoring.ts');

  assertIncludes(rules, 'match /guestFeedback/{feedbackId}', 'Guest Feedback Firestore rules block');
  assertIncludes(rules, 'allow create: if false;', 'Guest Feedback Firestore API-only create');
  assertIncludes(rules, 'belongsToTenantById(resource.data.tId)', 'Guest Feedback Firestore tenant read gate');
  assertIncludes(rules, 'belongsToStoreById(resource.data.sId)', 'Guest Feedback Firestore store read gate');
  assertNotIncludes(rules, 'request.auth.token.storeIds == null\n                        || belongsToStoreById(resource.data.sId)', 'Guest Feedback missing store-list read bypass');
  assertIncludes(rules, 'hasTenantWriteRole()', 'Guest Feedback Firestore status-update role gate');
  assertIncludes(rules, '&& belongsToTenantById(resource.data.tId)', 'Guest Feedback Firestore status-update tenant gate');
  assertIncludes(rules, '&& belongsToStoreById(resource.data.sId)', 'Guest Feedback Firestore status-update store gate');
  assertIncludes(rules, 'request.resource.data.modifiedBy == request.auth.uid', 'Guest Feedback modifier identity gate');
  assertIncludes(rules, 'request.resource.data.modifiedOn == request.time', 'Guest Feedback server-authoritative modification time');
  assertIncludes(rules, "request.resource.data.status in ['new', 'resolved']", 'Guest Feedback status enum rule');
  assertIncludes(rules, "request.resource.data.needsAttention == (resource.data.rating <= 3 && request.resource.data.status == 'new')", 'Guest Feedback attention invariant rule');
  assertIncludes(rules, 'request.resource.data.ownerNote.size() <= 300', 'Guest Feedback owner note rule cap');
  assertIncludes(rules, "affectedKeys().hasOnly([\n                      'status',\n                      'needsAttention',\n                      'modifiedOn',\n                      'modifiedBy',\n                      'ownerNote'\n                    ])", 'Guest Feedback Firestore status-only update fields');
  assertIncludes(rules, 'allow delete: if false;', 'Guest Feedback Firestore client delete denied');
  assertIncludes(rules, 'match /feedbackEvents/{eventId}', 'Guest Feedback event rules block');
  assertIncludes(rules, 'match /feedbackEvents/{eventId} {\n      allow read, write: if false;', 'Guest Feedback events are server-only');

  assertIncludes(indexes, '"collectionGroup": "guestFeedback"', 'Guest Feedback indexes collection group');
  assertIncludes(indexes, '"fieldPath": "needsAttention"', 'Guest Feedback needs-attention index');
  assertIncludes(indexes, '"fieldPath": "status"', 'Guest Feedback status index');
  assertIncludes(indexes, '"fieldPath": "createdOn"', 'Guest Feedback createdOn index');

  assertIncludes(clientDal, 'assertFeedbackListLoadSucceeded', 'Guest Feedback list acknowledgement helper');
  assertIncludes(clientDal, 'assertFeedbackCountLoadSucceeded', 'Guest Feedback count acknowledgement helper');
  assertIncludes(clientDal, 'assertFeedbackStatusUpdateSucceeded', 'Guest Feedback status acknowledgement helper');
  assertIncludes(clientDal, 'expectedFeedbackId === undefined || resultId === expectedFeedbackId', 'Guest Feedback status acknowledgement exact response identity');
  assertIncludes(clientDal, 'const itemId = item.id;', 'Guest Feedback list acknowledgement stable item identity');
  assertIncludes(clientDal, '!itemId', 'Guest Feedback list acknowledgement missing identity rejection');
  assertIncludes(clientDal, 'ids.has(itemId)', 'Guest Feedback list acknowledgement duplicate identity rejection');
  assertIncludes(clientDal, 'item.tId !== expectedScope.tenantId', 'Guest Feedback list acknowledgement tenant scope');
  assertIncludes(clientDal, 'item.sId !== expectedScope.storeId', 'Guest Feedback list acknowledgement store scope');
  assertIncludes(clientDal, 'candidate.lastDocId === candidate.items.at(-1)?.id', 'Guest Feedback list acknowledgement cursor coherence');
  assertIncludes(clientDal, 'Number.isSafeInteger(result)', 'Guest Feedback count acknowledgement integer boundary');
  assertIncludes(clientDal, 'const session = await getActiveSession();', 'Guest Feedback client DAL session boundary');
  assertIncludes(clientDal, 'export const normalizeGuestFeedbackRecord = (value: unknown, id: string): GuestFeedback | null => {', 'Guest Feedback persisted DTO normalizer');
  assertIncludes(clientDal, 'const scope = resolveSessionScope(session);', 'Guest Feedback exact active-store scope');
  assertIncludes(clientDal, 'assertExpectedFeedbackScope(scope, expectedScope);', 'Guest Feedback caller/session scope agreement');
  assertIncludes(clientDal, "where('tId', '==', scope.tenantId)", 'Guest Feedback client DAL tenant query');
  assertIncludes(clientDal, "where('sId', '==', scope.storeId)", 'Guest Feedback client DAL store query');
  assertIncludes(clientDal, 'const constraints: QueryConstraint[] = [', 'Guest Feedback typed query constraints');
  assertIncludes(clientDal, "throw new Error('Guest feedback cursor is outside the active store');", 'Guest Feedback cursor scope guard');
  assertIncludes(clientDal, "throw new Error('Guest feedback contains an invalid persisted record');", 'Guest Feedback malformed persisted page fails visibly');
  assertIncludes(clientDal, 'const items = normalizedPage.slice(0, pageSize);', 'Guest Feedback pagination applies after complete DTO validation');
  assertNotIncludes(clientDal, 'if (feedback) {\n                        items.push(feedback);', 'Guest Feedback list must not silently skip malformed persisted rows');
  assertIncludes(clientDal, 'return runTransaction(firebaseClient, async (transaction) => {', 'Guest Feedback atomic status update');
  assertIncludes(clientDal, 'modifiedOn: serverTimestamp()', 'Guest Feedback server-authoritative status timestamp write');
  assertNotIncludes(clientDal, 'modifiedOn: Timestamp.now()', 'Guest Feedback browser-authored status timestamp');
  assertIncludes(clientDal, 'const snapshot = await getCountFromServer(q);', 'Guest Feedback count aggregation');
  assertNotIncludes(clientDal, 'export const submitGuestFeedback = async', 'Guest Feedback dead client create helper');
  assertNotIncludes(clientDal, 'export const logFeedbackMOLEvent = async', 'Guest Feedback dead client event helper');
  assertNotIncludes(clientDal, 'const constraints: any[]', 'Guest Feedback broad query constraint casts');

  assertIncludes(serverDal, '.collection(DB_COLLECTIONS.GUEST_FEEDBACK)', 'Guest Feedback server DAL collection');
  assertIncludes(serverDal, 'needsAttention: data.rating <= 3', 'Guest Feedback server DAL attention computation');
  assertIncludes(serverDal, "createdBy: 'guest'", 'Guest Feedback server DAL guest creator');
  assertIncludes(serverDal, 'expiresOn,', 'Guest Feedback server DAL expiry');
  assertIncludes(serverDal, "type SubmitGuestFeedbackAdminInput = Pick<", 'Guest Feedback explicit Admin submit input');
  assertIncludes(serverDal, "'customerEmail' | 'customerName' | 'customerPhone' | 'message' | 'projectId' | 'rating' | 'sId' | 'source' | 'tId'", 'Guest Feedback Admin submit allowlist');
  assertIncludes(serverDal, '& { submissionId: string };', 'Guest Feedback Admin submit idempotency input');
  assertIncludes(serverDal, 'requestFingerprintHash', 'Guest Feedback Admin replay fingerprint');
  assertIncludes(serverDal, 'await docRef.create(feedbackData)', 'Guest Feedback create-only persistence');
  assertIncludes(serverDal, 'if (!isAlreadyExistsError(error)) throw error;', 'Guest Feedback create replay branch');
  assertIncludes(serverDal, 'existing?.requestFingerprintHash !== requestFingerprintHash', 'Guest Feedback changed replay rejection');
  assertIncludes(serverDal, 'feedback_submitted_${feedbackId}', 'Guest Feedback deterministic compact event ID');
  assertNotIncludes(serverDal, '.add(feedbackData)', 'Guest Feedback non-idempotent feedback add');
  assertNotIncludes(serverDal, 'as unknown as Record<string, unknown>', 'Guest Feedback Admin submit masking cast');
  assertIncludes(serverDal, 'logFeedbackMOLEventAdmin', 'Guest Feedback server DAL MOL event helper');
  assertIncludes(serverDal, 'guest_feedback_admin_mol_event_log_failed', 'Guest Feedback server DAL event failure diagnostic');

  assertIncludes(retention, 'processGuestFeedbackRetention', 'Guest Feedback retention function');
  assertIncludes(retention, '.where(' + "'expiresOn'" + ", '<', now)", 'Guest Feedback retention expiry query');
  assertIncludes(retention, 'GUEST_FEEDBACK_RETENTION_BATCH_DELETE_FAILED', 'Guest Feedback retention bounded batch failure');
  assertIncludes(scheduler, 'processGuestFeedbackRetention', 'Guest Feedback retention scheduler wiring');
  assertIncludes(scheduler, 'ENABLE_GUEST_FEEDBACK_RETENTION', 'Guest Feedback retention feature flag');
  assertIncludes(scheduler, 'if (retentionResult.errors > 0) {', 'Guest Feedback retention partial-failure branch');
  assertIncludes(scheduler, 'throw new Error(GUEST_FEEDBACK_RETENTION_TASK_FAILED);', 'Guest Feedback retention partial failures fail the scheduler task');
}

function verifyOwnerDtoRuntime() {
  const { Timestamp } = require('firebase/firestore');
  const {
    assertFeedbackCountLoadSucceeded,
    assertFeedbackStatusUpdateSucceeded,
    isGuestFeedbackListResult,
  } = require(path.join(ROOT, 'src/database/guestFeedback/index.ts'));
  const feedback = {
    id: 'feedback_1',
    tId: 1,
    sId: 101,
    projectId: '1-menu-101',
    rating: 2,
    source: 'direct_link',
    status: 'new',
    needsAttention: true,
    createdBy: 'guest',
    createdOn: Timestamp.fromMillis(1_000),
    expiresOn: Timestamp.fromMillis(2_000),
  };
  const scope = { tenantId: 1, storeId: 101 };

  assert(
    isGuestFeedbackListResult({
      items: [feedback],
      hasMore: true,
      lastDocId: feedback.id,
    }, scope),
    'Guest Feedback owner list must accept one coherent exact-scope page',
  );
  assert(
    !isGuestFeedbackListResult({
      items: [{ ...feedback, sId: 102 }],
      hasMore: false,
      lastDocId: feedback.id,
    }, scope),
    'Guest Feedback owner list must reject a cross-store row',
  );
  assert(
    !isGuestFeedbackListResult({
      items: [feedback, { ...feedback }],
      hasMore: false,
      lastDocId: feedback.id,
    }, scope),
    'Guest Feedback owner list must reject duplicate row identities',
  );
  assert(
    !isGuestFeedbackListResult({
      items: [feedback],
      hasMore: false,
      lastDocId: 'feedback_2',
    }, scope),
    'Guest Feedback owner list must reject a cursor that does not match the last row',
  );

  let rejectedWrongStatusIdentity = false;
  try {
    assertFeedbackStatusUpdateSucceeded(
      { ...feedback, id: 'feedback_2' },
      feedback.id,
      'new',
    );
  } catch {
    rejectedWrongStatusIdentity = true;
  }
  assert(rejectedWrongStatusIdentity, 'Guest Feedback status acknowledgement must reject another row identity');

  let rejectedFractionalCount = false;
  try {
    assertFeedbackCountLoadSucceeded(0.5);
  } catch {
    rejectedFractionalCount = true;
  }
  assert(rejectedFractionalCount, 'Guest Feedback count acknowledgement must reject fractional values');
}

function verifyOwnerDesktopMobile() {
  const desktop = read('src/components/templates/main-app/feedback/index.tsx');
  const desktopCard = read('src/components/templates/main-app/feedback/FeedbackCard.tsx');
  const desktopQr = read('src/components/templates/main-app/feedback/FeedbackQrDownload.tsx');
  const desktopDiagnostics = read('src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts');
  const replyTemplates = read('src/lib/feedback/feedbackReplyTemplates.ts');
  const mobile = read('src/components/mobile/screens/MobileFeedbackScreen.tsx');
  const mobileDetail = read('src/components/mobile/screens/MobileFeedbackDetail.tsx');
  const mobileShellVerifier = read('scripts/verification/verify-mobile-shell-route-map.js');

  assertIncludes(desktop, 'assertFeedbackListLoadSucceeded(', 'Guest Feedback desktop list acknowledgement');
  assertIncludes(desktop, 'assertFeedbackCountLoadSucceeded(', 'Guest Feedback desktop count acknowledgement');
  assertIncludes(desktop, 'assertFeedbackStatusUpdateSucceeded(', 'Guest Feedback desktop status acknowledgement');
  assertIncludes(desktop, 'feedback_inbox_list_load_rejected', 'Guest Feedback desktop list rejection code');
  assertIncludes(desktop, "'feedback_inbox_list_load_rejected',\n                expectedScope,", 'Guest Feedback desktop list acknowledgement scope');
  assertIncludes(desktop, 'feedback_inbox_count_load_rejected', 'Guest Feedback desktop count rejection code');
  assertIncludes(desktop, 'feedback_inbox_status_update_rejected', 'Guest Feedback desktop status rejection code');
  assertIncludes(desktop, 'logFeedbackInboxFailure', 'Guest Feedback desktop bounded diagnostics');
  assertIncludes(desktop, 'return <FeedbackInboxContent key={scopeKey} {...props} />;', 'Guest Feedback desktop tenant/store keyed state lifetime');
  assertIncludes(desktop, 'getFeedbackList(filter, 50, cursorId || undefined, expectedScope)', 'Guest Feedback desktop list retains captured tenant/store scope');
  assertIncludes(desktop, "getFeedbackCount('needs_attention', expectedScope)", 'Guest Feedback desktop count retains captured tenant/store scope');
  assertIncludes(desktop, 'latestRequestRef.current !== requestId', 'Guest Feedback desktop latest request settlement');
  assertIncludes(desktop, "setLoadError('Feedback could not be loaded. Your inbox has not been confirmed empty.')", 'Guest Feedback desktop persistent load failure');
  assertIncludes(desktop, ": loadError ? (", 'Guest Feedback desktop error state precedes empty state');
  assertIncludes(desktop, "loadError ? '—' : needsAttentionCount", 'Guest Feedback desktop count does not show a false zero');
  assertIncludes(desktop, 'mutationInFlightRef.current', 'Guest Feedback desktop status duplicate admission');
  assertIncludes(desktop, 'feedbackItemsRef.current.find((item) => item.id === feedbackId) !== sourceItem', 'Guest Feedback desktop source-row mutation ownership');
  assertIncludes(desktop, 'await fetchFeedback(false, null);', 'Guest Feedback desktop committed status race reconciliation');
  assertIncludes(desktopCard, 'generateWhatsAppLink', 'Guest Feedback desktop WhatsApp contact helper');
  assertIncludes(desktopCard, 'isValidWhatsAppNumber', 'Guest Feedback desktop WhatsApp validation');
  assertIncludes(desktopCard, 'buildFeedbackReplyTemplates', 'Guest Feedback desktop reply draft helper');
  assertIncludes(desktopCard, 'copyFeedbackReplyToClipboard', 'Guest Feedback desktop acknowledged reply copy helper');
  assertIncludes(desktopCard, 'desktop_feedback_reply_copy_failed', 'Guest Feedback desktop reply copy diagnostic');
  assertIncludes(desktopDiagnostics, "secureError('[Feedback Inbox] Operation failed'", 'Guest Feedback desktop secure diagnostics');
  assertNotIncludes(desktop, 'console.', 'Guest Feedback desktop direct console diagnostics');
  assertNotIncludes(desktopCard, 'console.', 'Guest Feedback card direct console diagnostics');

  assertIncludes(replyTemplates, 'export function buildFeedbackReplyTemplates', 'Guest Feedback deterministic reply template helper');
  assertIncludes(replyTemplates, 'No provider send, no AI call, no Firestore read/write.', 'Guest Feedback reply template no-new-cost comment');
  assertNotIncludes(replyTemplates, 'fetch(', 'Guest Feedback reply templates must not call providers');
  assertNotIncludes(replyTemplates, 'firebase/firestore', 'Guest Feedback reply templates must not import Firestore');

  assertIncludes(desktopQr, 'copyFeedbackTextToClipboard', 'Guest Feedback desktop acknowledged copy helper');
  assertIncludes(desktopQr, "const copied = document.execCommand('copy');", 'Guest Feedback desktop copy fallback acknowledgement');
  assertIncludes(desktopQr, 'desktop_feedback_link_copy_failed', 'Guest Feedback desktop link copy diagnostic');
  assertIncludes(desktopQr, 'desktop_feedback_link_open_failed', 'Guest Feedback desktop link open diagnostic');
  assertIncludes(desktopQr, 'desktop_feedback_message_copy_failed', 'Guest Feedback desktop message copy diagnostic');
  assertIncludes(desktopQr, 'hasClipboardWrite: hasFeedbackClipboardWrite()', 'Guest Feedback desktop clipboard support metadata');
  assertIncludes(desktopQr, 'hasCopyFallback: hasFeedbackCopyFallback()', 'Guest Feedback desktop copy fallback support metadata');
  assertNotIncludes(desktopQr, 'await navigator.clipboard.writeText(value);\n            message.success', 'Guest Feedback desktop unacknowledged Clipboard API success');

  assertIncludes(mobile, 'assertFeedbackListLoadSucceeded(', 'Guest Feedback mobile list acknowledgement');
  assertIncludes(mobile, 'mobile_feedback_list_load_rejected', 'Guest Feedback mobile list rejection code');
  assertIncludes(mobile, "'mobile_feedback_list_load_rejected',\n                expectedScope,", 'Guest Feedback mobile list acknowledgement scope');
  assertIncludes(mobile, 'copyMobileFeedbackLinkToClipboard', 'Guest Feedback mobile acknowledged copy helper');
  assertIncludes(mobile, "const copied = document.execCommand('copy');", 'Guest Feedback mobile copy fallback acknowledgement');
  assertIncludes(mobile, 'mobile_feedback_link_copy_failed', 'Guest Feedback mobile copy failure diagnostic');
  assertIncludes(mobile, 'openMobilePublicLink(feedbackUrl', 'Guest Feedback mobile shell-safe public link open');
  assertIncludes(mobile, 'mobile_feedback_native_share_failed', 'Guest Feedback mobile native share diagnostic');
  assertIncludes(mobile, 'logMobileOwnerFailure', 'Guest Feedback mobile bounded diagnostics');
  assertIncludes(mobile, 'return <MobileFeedbackScreenContent key={scopeKey} {...props} />;', 'Guest Feedback mobile tenant/store keyed state lifetime');
  assertIncludes(mobile, 'getFeedbackList(targetFilter, 50, cursorId || undefined, expectedScope)', 'Guest Feedback mobile list retains captured tenant/store scope');
  assertIncludes(mobile, 'latestRequestRef.current !== requestId', 'Guest Feedback mobile latest request settlement');
  assertIncludes(mobile, 'loadMoreInFlightRef.current', 'Guest Feedback mobile pagination duplicate admission');
  assertIncludes(mobile, "Toast.show({ content: t('failedToLoad')", 'Guest Feedback mobile visible load failure');
  assertIncludes(mobile, 'setHasMore(result.hasMore)', 'Guest Feedback mobile pagination state');
  assertIncludes(mobile, 'setLastDocId(result.lastDocId)', 'Guest Feedback mobile cursor state');
  assertIncludes(mobile, 'fetchFeedback(filter, true, lastDocId)', 'Guest Feedback mobile Load more action');
  assertIncludes(mobile, 'onChange={(key) => setFilter(key as typeof filter)}', 'Guest Feedback mobile single effect-driven filter fetch');
  assertNotIncludes(mobile, 'setFilter(key as any); void fetchFeedback', 'Guest Feedback mobile duplicate filter fetch');
  assertIncludes(mobile, 'setSelectedFeedback((previous)', 'Guest Feedback selected detail status synchronization');
  assertIncludes(mobileDetail, 'assertFeedbackStatusUpdateSucceeded(', 'Guest Feedback mobile detail status acknowledgement');
  assertIncludes(mobileDetail, 'mobile_feedback_status_update_rejected', 'Guest Feedback mobile status rejection code');
  assertIncludes(mobileDetail, 'copyRuntimeTextToClipboard', 'Guest Feedback mobile manual reply copy');
  assertIncludes(mobileDetail, 'mobile_feedback_reply_copy_failed', 'Guest Feedback mobile reply copy diagnostic');
  assertIncludes(mobileDetail, 'generateWhatsAppLink', 'Guest Feedback mobile manual WhatsApp handoff');
  assertIncludes(mobileDetail, 'const [isResolving, setIsResolving] = useState(false)', 'Guest Feedback mobile resolve double-tap guard');
  assertIncludes(mobileDetail, 'resolveInFlightRef.current', 'Guest Feedback mobile resolve synchronous duplicate admission');
  assertIncludes(mobileDetail, 'updateFeedbackStatus(', 'Guest Feedback mobile scoped status mutation');
  assertIncludes(mobileDetail, 'sourceScope,', 'Guest Feedback mobile status mutation retains captured tenant/store scope');
  assertIncludes(mobileDetail, 'isExpectedOperation(sourceScope, sourceFeedback)', 'Guest Feedback mobile detail liveness/scope/source ownership');
  assertIncludes(mobileDetail, 'buildFeedbackReplyTemplates', 'Guest Feedback mobile reply draft helper');
  assertIncludes(mobileDetail, 'replyTemplates.map', 'Guest Feedback mobile reply draft selector');
  assertIncludes(mobileDetail, 'maxLength={500}', 'Guest Feedback mobile reply cap');
  assertNotIncludes(mobileDetail, "updateFeedbackStatus(feedback.id, 'resolved', trimmedReply)", 'Guest Feedback mobile false send/persist flow');
  assertNotIncludes(mobile, 'console.', 'Guest Feedback mobile direct console diagnostics');
  assertNotIncludes(mobileDetail, 'console.', 'Guest Feedback mobile detail direct console diagnostics');

  assertIncludes(mobileShellVerifier, "'/feedback': { tab: 'more', todayScreen: 'main', moreScreen: 'feedback' }", 'Guest Feedback mobile shell route map');
}

function verifyDocsParity() {
  const readme = read('__docs__/projects/internal-feedback-system/README.md');
  const spec = read('__docs__/projects/internal-feedback-system/internal-feedback-system_spec.md');
  const impl = read('__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md');
  const firebase = read('__docs__/projects/internal-feedback-system/internal-feedback-system_firebase.md');
  const mobile = read('__docs__/projects/internal-feedback-system/internal-feedback-system_mobile-support.md');
  const helpdoc = read('__docs__/projects/internal-feedback-system/internal-feedback-system_helpdoc.md');
  const marketing = read('__docs__/projects/internal-feedback-system/internal-feedback-system_marketing.md');
  const validation = read('__docs__/projects/internal-feedback-system/internal-feedback-system_validation.md');
  const website = read('__docs__/projects/internal-feedback-system/internal-feedback-system_website.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  [
    [readme, 'Guest Feedback README'],
    [spec, 'Guest Feedback spec'],
    [impl, 'Guest Feedback implementation doc'],
    [firebase, 'Guest Feedback Firebase doc'],
    [mobile, 'Guest Feedback mobile doc'],
    [helpdoc, 'Guest Feedback helpdoc'],
    [website, 'Guest Feedback website doc'],
  ].forEach(([content, label]) => {
    assertIncludes(content, 'npm run verify:guest-feedback-boundary', `${label} dedicated verifier command`);
  });

  assertIncludes(readme, 'Safe review URL boundary', 'Guest Feedback README safe URL boundary');
  assertIncludes(readme, 'review URL parse diagnostics', 'Guest Feedback README review URL parse diagnostics');
  assertIncludes(spec, 'stable `submissionId`', 'Guest Feedback spec retry idempotency');
  assertIncludes(spec, 'The current inbox is store-scoped.', 'Guest Feedback spec current multi-outlet boundary');
  assertIncludes(spec, 'does not aggregate all outlets', 'Guest Feedback spec rejects false HQ aggregation claim');
  assertIncludes(spec, 'Google review ingestion, monitoring, or reply posting', 'Guest Feedback spec separate review boundary');
  assertIncludes(impl, 'Public Page Contract', 'Guest Feedback implementation public page contract');
  assertIncludes(impl, 'getFeedbackSettingsDraft()', 'Guest Feedback implementation settings reset boundary');
  assertIncludes(impl, 'projectPublicClientStore()', 'Guest Feedback implementation PII projection boundary');
  assertIncludes(impl, 'Idempotency', 'Guest Feedback implementation idempotency section');
  assertIncludes(impl, 'deterministic document ID', 'Guest Feedback implementation deterministic record contract');
  assertIncludes(impl, 'There are no authenticated `/api/feedback` list/update routes.', 'Guest Feedback implementation client DAL truth');
  assertIncludes(impl, 'src/lib/feedback/guestFeedbackProjectIdBoundary.ts', 'Guest Feedback implementation project ID helper');
  assertIncludes(firebase, 'Guest feedback writes do not invalidate public menu/OBP cache', 'Guest Feedback Firebase cache boundary');
  assertIncludes(firebase, 'Guest Feedback project ID admission', 'Guest Feedback Firebase project ID admission boundary');
  assertIncludes(firebase, 'whitespace-mutated', 'Guest Feedback Firebase strict project ID admission boundary');
  assertIncludes(firebase, 'The submit schema no longer trims project IDs before validation', 'Guest Feedback Firebase raw submit project ID schema boundary');
  assertIncludes(firebase, 'Guest Feedback target document-ID admission', 'Guest Feedback Firebase target ID admission boundary');
  assertIncludes(firebase, 'normalizeGuestFeedbackNumericDocumentId', 'Guest Feedback Firebase target ID helper');
  assertIncludes(firebase, 'src/lib/feedback/guestFeedbackProjectIdBoundary.ts', 'Guest Feedback Firebase project ID helper');
  assertIncludes(firebase, 'guest_feedback_review_url_parse_failed', 'Guest Feedback Firebase review URL parse diagnostic boundary');
  assertIncludes(firebase, 'Public feedback retry idempotency', 'Guest Feedback Firebase retry cost boundary');
  assertIncludes(mobile, 'Mobile shell route-map source gate', 'Guest Feedback mobile route-map gate');
  assertIncludes(mobile, 'feedbackReplyTemplates.ts', 'Guest Feedback mobile reply draft helper doc');
  assertIncludes(mobile, 'feedback after the first 50 records remains reachable', 'Guest Feedback mobile pagination truth');
  assertIncludes(mobile, 'MenuList does not persist or send it', 'Guest Feedback mobile manual reply boundary');
  assertIncludes(helpdoc, 'Private feedback', 'Guest Feedback helpdoc private feedback wording');
  assertIncludes(helpdoc, 'send it manually', 'Guest Feedback helpdoc manual reply boundary');
  assertIncludes(firebase, 'Feedback reply drafts are Firebase-cost neutral', 'Guest Feedback Firebase reply draft boundary');
  assertIncludes(readme, 'feedbackReplyTemplates.ts', 'Guest Feedback README reply template helper');
  assertIncludes(impl, 'feedbackReplyTemplates.ts', 'Guest Feedback implementation reply template helper');
  assertIncludes(marketing, 'Claims That Are Not Allowed', 'Guest Feedback marketing claim guard');
  assertIncludes(marketing, 'HQ sees every outlet', 'Guest Feedback marketing HQ aggregation refusal');
  assertIncludes(marketing, 'MenuList does not send the reply automatically.', 'Guest Feedback marketing manual reply truth');
  assertIncludes(validation, 'Duplicate retry protection', 'Guest Feedback validation retry evidence');
  assertIncludes(validation, 'Page-level Reset restores the persisted Guest Feedback toggle', 'Guest Feedback validation settings reset evidence');
  assertIncludes(validation, 'Google review ingestion/posting', 'Guest Feedback validation dormant review boundary');
  assertIncludes(website, 'Review URL safety', 'Guest Feedback website review URL safety');
  assertIncludes(audit, 'Guest Feedback strict project ID boundary checkpoint', 'Production readiness audit Guest Feedback strict project ID checkpoint');
  assertIncludes(audit, 'whitespace-mutated', 'Production readiness audit Guest Feedback strict project ID evidence');
  assertIncludes(audit, 'no longer trims `projectId` before `normalizeGuestFeedbackProjectId(value) === value`', 'Production readiness audit Guest Feedback raw submit schema evidence');
  assertIncludes(audit, 'Guest Feedback Target Document ID Boundary checkpoint', 'Production readiness audit Guest Feedback target ID checkpoint');
  assertIncludes(audit, 'normalizeGuestFeedbackNumericDocumentId', 'Production readiness audit Guest Feedback target ID helper');
  assertIncludes(audit, 'public feedback page uses the same numeric target normalizer before project and store reads', 'Production readiness audit Guest Feedback public page target ID evidence');
  assertIncludes(audit, 'repeats `normalizeGuestFeedbackProjectId(data.projectId)` into local `projectId` before reading `.doc(projectId)`', 'Production readiness audit Guest Feedback submit route project ID recheck');
  assertIncludes(audit, 'excluding `.doc(data.projectId)`', 'Production readiness audit Guest Feedback raw project document ref exclusion');
  assertIncludes(audit, 'Guest Feedback boundary source-gate checkpoint', 'Production readiness audit Guest Feedback checkpoint');
  assertIncludes(audit, 'Guest Feedback review URL parse diagnostics checkpoint', 'Production readiness audit Guest Feedback review URL parse diagnostics checkpoint');
  assertIncludes(audit, 'Guest Feedback form accessibility and local browser checkpoint', 'Production readiness audit Guest Feedback accessibility and browser checkpoint');
  assertIncludes(audit, 'Guest Feedback strict store/PII and server-event checkpoint', 'Production readiness audit Guest Feedback store/PII checkpoint');
  assertIncludes(audit, 'Public identity and item-image load fallback checkpoint', 'Production readiness audit public identity logo fallback checkpoint');
  assertIncludes(audit, '`npm run verify:guest-feedback-boundary`', 'Production readiness audit Guest Feedback verifier command');
  assertIncludes(changelog, 'Guest Feedback Strict Project ID Boundary', 'Changelog Guest Feedback strict project ID boundary');
  assertIncludes(changelog, 'Whitespace-mutated feedback project IDs fail closed', 'Changelog Guest Feedback whitespace-mutated project ID boundary');
  assertIncludes(changelog, 'Submit schema no longer trims project IDs', 'Changelog Guest Feedback raw submit schema boundary');
  assertIncludes(changelog, 'Guest Feedback Target Document ID Boundary', 'Changelog Guest Feedback target ID boundary');
  assertIncludes(changelog, 'Public feedback page target scope is exact', 'Changelog Guest Feedback public page target ID boundary');
  assertIncludes(changelog, 'the submit route now re-normalizes `data.projectId` before reading `.doc(projectId)`', 'Changelog Guest Feedback submit route project ID recheck');
  assertIncludes(changelog, 'or `.doc(data.projectId)`', 'Changelog Guest Feedback raw project document ref exclusion');
  assertIncludes(changelog, 'Guest Feedback Review URL Parse Diagnostics', 'Changelog Guest Feedback review URL parse diagnostics');
  assertIncludes(changelog, 'guest_feedback_review_url_parse_failed', 'Changelog Guest Feedback review URL parse diagnostic code');
  assertIncludes(changelog, 'Public Feedback Accessibility And Browser Evidence', 'Changelog Guest Feedback accessibility and browser evidence');
  assertIncludes(changelog, 'Guest Feedback Store and Event Isolation', 'Changelog Guest Feedback store/event isolation');
  assertIncludes(changelog, 'Business Settings Feedback Reset Boundary', 'Changelog Guest Feedback settings reset boundary');
  assertIncludes(changelog, 'Feedback PII requires explicit store membership', 'Changelog Guest Feedback store-membership boundary');
  assertIncludes(changelog, 'Public Media Load Fallbacks', 'Changelog Guest Feedback identity logo fallback evidence');
  assertIncludes(changelog, 'synthetic 320-character fill clamped to `300/300`', 'Changelog Guest Feedback controlled-state browser evidence');
}

const checks = [
  ['package script', verifyPackageScript],
  ['safe review URL runtime', verifySafeReviewUrlRuntime],
  ['public submit route', verifyPublicSubmitRoute],
  ['public page and form', verifyPublicPageAndForm],
  ['Firestore DAL and retention', verifyFirestoreDalAndRetention],
  ['owner DTO runtime', verifyOwnerDtoRuntime],
  ['owner desktop and mobile', verifyOwnerDesktopMobile],
  ['docs parity', verifyDocsParity],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Guest Feedback boundary verification passed.');
