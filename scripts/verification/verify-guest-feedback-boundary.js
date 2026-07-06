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
  assert(
    packageJson.scripts['verify:guest-feedback-boundary'] === 'node scripts/verification/verify-guest-feedback-boundary.js',
    'package.json must expose verify:guest-feedback-boundary',
  );
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
    'https://g.page/example/review',
  ];
  const unsafeUrls = [
    'javascript:alert(1)',
    'http://search.google.com/local/writereview?placeid=abc123',
    'https://example.com/review',
    'https://evil-google.com/maps/place/example',
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
  assertIncludes(route, "checkPublicRateLimit(req, 'FEEDBACK_SUBMISSION')", 'Guest Feedback submit route public rate limit');
  assertIncludes(route, 'PUBLIC_FEEDBACK_SUBMIT_MAX_BODY_BYTES = 16 * 1024', 'Guest Feedback submit route body cap');
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
  assertIncludes(route, 'storeTenantId !== tenantId', 'Guest Feedback submit route store/tenant match');
  assertIncludes(route, 'isPlatformEntityBlocked(storeData)', 'Guest Feedback submit route store block gate');
  assertIncludes(route, 'isPlatformEntityBlocked(tenantDoc.data())', 'Guest Feedback submit route tenant block gate');
  assertIncludes(route, 'projectData?.menuSettings?.feedback === false', 'Guest Feedback submit route project feedback toggle');
  assertIncludes(route, 'storeData?.feedbackEnabled === false', 'Guest Feedback submit route store feedback toggle');
  assertIncludes(route, 'const effectiveMessage = defaults.collectComment ? sanitizedMessage : undefined;', 'Guest Feedback submit route drops hidden comment');
  assertIncludes(route, 'const effectiveName = defaults.collectName ? sanitizedName : undefined;', 'Guest Feedback submit route drops hidden name');
  assertIncludes(route, 'const effectivePhone = defaults.collectPhone ? sanitizedPhone : undefined;', 'Guest Feedback submit route drops hidden phone');
  assertIncludes(route, 'const effectiveEmail = defaults.collectEmail ? sanitizedEmail : undefined;', 'Guest Feedback submit route drops hidden email');
  assertIncludes(route, "normalizeGuestFeedbackReviewUrl(storeData?.reviewUrl, 'store_review_url')", 'Guest Feedback submit route store review URL guard');
  assertIncludes(route, "normalizeGuestFeedbackReviewUrl(storeData?.publicPresence?.googleReviewUrl, 'public_presence_google_review_url')", 'Guest Feedback submit route public-presence review URL guard');
  assertIncludes(route, 'submitGuestFeedbackAdmin({', 'Guest Feedback submit route Admin SDK write path');
  assertIncludes(route, 'projectId,', 'Guest Feedback submit route writes normalized project ID');
  assertIncludes(route, "void logFeedbackMOLEventAdmin('FEEDBACK_SUBMITTED', tenantId, storeId, projectId, data.rating);", 'Guest Feedback submit route non-blocking MOL event uses normalized IDs');
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
  assertIncludes(guestFeedbackSchema, 'message: z.string().max(300).optional()', 'Guest Feedback message cap');
  assertIncludes(guestFeedbackSchema, 'customerName: z.string().max(60).optional()', 'Guest Feedback name cap');
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
  const form = read('src/components/atoms/GuestFeedbackForm/index.tsx');
  const responseGuard = read('src/lib/feedback/guestFeedbackSubmitResponse.ts');
  const diagnostics = read('src/lib/feedback/publicFeedbackDiagnostics.ts');

  assertIncludes(page, 'FEATURE_FLAGS.ENABLE_GUEST_FEEDBACK', 'Guest Feedback public page feature flag');
  assertIncludes(page, "import { normalizeGuestFeedbackProjectId } from '@lib/feedback/guestFeedbackProjectIdBoundary';", 'Guest Feedback public page project ID normalizer import');
  assertIncludes(page, 'const normalizedProjectId = normalizeGuestFeedbackProjectId(projectId);', 'Guest Feedback public page project ID boundary');
  assertIncludes(page, 'parseProjectId(normalizedProjectId)', 'Guest Feedback public page parses normalized project ID');
  assertIncludes(page, '.doc(normalizedProjectId)', 'Guest Feedback public page uses normalized project document ID');
  assertNotIncludes(page, '.doc(projectId)', 'Guest Feedback public page direct project ID document read');
  assertIncludes(page, 'data?.menuSettings?.feedback === false', 'Guest Feedback public page project feedback toggle');
  assertIncludes(page, 'isPlatformEntityBlocked(storeData)', 'Guest Feedback public page store block gate');
  assertIncludes(page, 'feedbackEnabled: storeData.feedbackEnabled !== false', 'Guest Feedback public page store feedback toggle');
  assertIncludes(page, 'TempStatusBanner', 'Guest Feedback public page temporary status parity');
  assertIncludes(page, 'MenuBreadcrumb', 'Guest Feedback public page identity header');
  assertIncludes(page, 'GuestFeedbackForm', 'Guest Feedback public page form renderer');
  assertIncludes(page, "robots: 'noindex, nofollow'", 'Guest Feedback public page noindex');
  assertIncludes(page, 'logPublicFeedbackPageFailure', 'Guest Feedback public page bounded diagnostics');
  assertNotIncludes(page, 'console.', 'Guest Feedback public page direct console diagnostics');

  assertIncludes(form, 'GUEST_FEEDBACK_SUBMIT_REQUEST_POLICY', 'Guest Feedback form request policy');
  assertIncludes(form, "cache: 'no-store' as RequestCache", 'Guest Feedback form no-store policy');
  assertIncludes(form, "credentials: 'same-origin' as RequestCredentials", 'Guest Feedback form credential policy');
  assertIncludes(form, "redirect: 'manual' as RequestRedirect", 'Guest Feedback form redirect policy');
  assertIncludes(form, 'TurnstileWidget', 'Guest Feedback form Turnstile widget');
  assertIncludes(form, 'captchaToken: captchaToken || undefined', 'Guest Feedback form captcha submission');
  assertIncludes(form, 'readJsonResponseWithLimit', 'Guest Feedback form bounded response parser');
  assertIncludes(form, 'isSuccessfulGuestFeedbackSubmitResponse(data)', 'Guest Feedback form response acknowledgement guard');
  assertIncludes(form, "normalizeGuestFeedbackReviewUrl(data.reviewUrl, 'submit_response_review_url')", 'Guest Feedback form review URL guard');
  assertIncludes(form, 'GUEST_FEEDBACK_SUBMIT_FAILED_MESSAGE', 'Guest Feedback form fixed failure copy');
  assertIncludes(form, 'logPublicFeedbackFormFailure', 'Guest Feedback form bounded diagnostics');
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
  assertIncludes(rules, 'isTenantAdmin(resource.data.tId, resource.data.sId)', 'Guest Feedback Firestore status-update gate');
  assertIncludes(rules, "affectedKeys().hasOnly([\n                      'status',\n                      'needsAttention',\n                      'modifiedOn',\n                      'modifiedBy',\n                      'ownerNote'\n                    ])", 'Guest Feedback Firestore status-only update fields');
  assertIncludes(rules, 'allow delete: if false;', 'Guest Feedback Firestore client delete denied');
  assertIncludes(rules, 'match /feedbackEvents/{eventId}', 'Guest Feedback event rules block');
  assertIncludes(rules, "request.resource.data.type == 'feedback_event'", 'Guest Feedback event append-only type');
  assertIncludes(rules, 'allow read, update, delete: if false;', 'Guest Feedback events are private write-only');

  assertIncludes(indexes, '"collectionGroup": "guestFeedback"', 'Guest Feedback indexes collection group');
  assertIncludes(indexes, '"fieldPath": "needsAttention"', 'Guest Feedback needs-attention index');
  assertIncludes(indexes, '"fieldPath": "status"', 'Guest Feedback status index');
  assertIncludes(indexes, '"fieldPath": "createdOn"', 'Guest Feedback createdOn index');

  assertIncludes(clientDal, 'assertFeedbackListLoadSucceeded', 'Guest Feedback list acknowledgement helper');
  assertIncludes(clientDal, 'assertFeedbackCountLoadSucceeded', 'Guest Feedback count acknowledgement helper');
  assertIncludes(clientDal, 'assertFeedbackStatusUpdateSucceeded', 'Guest Feedback status acknowledgement helper');
  assertIncludes(clientDal, 'const session = await getActiveSession();', 'Guest Feedback client DAL session boundary');
  assertIncludes(clientDal, "where('tId', '==', session.tId)", 'Guest Feedback client DAL tenant query');
  assertIncludes(clientDal, "where('sId', '==', session.sId)", 'Guest Feedback client DAL store query');
  assertIncludes(clientDal, 'if (!isGuestFeedbackRecord(existing, feedbackId))', 'Guest Feedback client DAL write-before-read shape guard');
  assertIncludes(clientDal, 'await updateDoc(getDocRef(feedbackId), updateData);', 'Guest Feedback client DAL status-only update');

  assertIncludes(serverDal, '.collection(DB_COLLECTIONS.GUEST_FEEDBACK)', 'Guest Feedback server DAL collection');
  assertIncludes(serverDal, 'needsAttention: data.rating <= 3', 'Guest Feedback server DAL attention computation');
  assertIncludes(serverDal, "createdBy: 'guest'", 'Guest Feedback server DAL guest creator');
  assertIncludes(serverDal, 'expiresOn,', 'Guest Feedback server DAL expiry');
  assertIncludes(serverDal, 'stripUndefined', 'Guest Feedback server DAL undefined stripping');
  assertIncludes(serverDal, 'logFeedbackMOLEventAdmin', 'Guest Feedback server DAL MOL event helper');
  assertIncludes(serverDal, 'guest_feedback_admin_mol_event_log_failed', 'Guest Feedback server DAL event failure diagnostic');

  assertIncludes(retention, 'processGuestFeedbackRetention', 'Guest Feedback retention function');
  assertIncludes(retention, '.where(' + "'expiresOn'" + ", '<', now)", 'Guest Feedback retention expiry query');
  assertIncludes(retention, 'GUEST_FEEDBACK_RETENTION_BATCH_DELETE_FAILED', 'Guest Feedback retention bounded batch failure');
  assertIncludes(scheduler, 'processGuestFeedbackRetention', 'Guest Feedback retention scheduler wiring');
  assertIncludes(scheduler, 'ENABLE_GUEST_FEEDBACK_RETENTION', 'Guest Feedback retention feature flag');
}

function verifyOwnerDesktopMobile() {
  const desktop = read('src/components/templates/main-app/feedback/index.tsx');
  const desktopCard = read('src/components/templates/main-app/feedback/FeedbackCard.tsx');
  const desktopQr = read('src/components/templates/main-app/feedback/FeedbackQrDownload.tsx');
  const desktopDiagnostics = read('src/components/templates/main-app/feedback/feedbackInboxDiagnostics.ts');
  const mobile = read('src/components/mobile/screens/MobileFeedbackScreen.tsx');
  const mobileDetail = read('src/components/mobile/screens/MobileFeedbackDetail.tsx');
  const mobileShellVerifier = read('scripts/verification/verify-mobile-shell-route-map.js');

  assertIncludes(desktop, 'assertFeedbackListLoadSucceeded(', 'Guest Feedback desktop list acknowledgement');
  assertIncludes(desktop, 'assertFeedbackCountLoadSucceeded(', 'Guest Feedback desktop count acknowledgement');
  assertIncludes(desktop, 'assertFeedbackStatusUpdateSucceeded(', 'Guest Feedback desktop status acknowledgement');
  assertIncludes(desktop, 'feedback_inbox_list_load_rejected', 'Guest Feedback desktop list rejection code');
  assertIncludes(desktop, 'feedback_inbox_count_load_rejected', 'Guest Feedback desktop count rejection code');
  assertIncludes(desktop, 'feedback_inbox_status_update_rejected', 'Guest Feedback desktop status rejection code');
  assertIncludes(desktop, 'logFeedbackInboxFailure', 'Guest Feedback desktop bounded diagnostics');
  assertIncludes(desktopCard, 'generateWhatsAppLink', 'Guest Feedback desktop WhatsApp contact helper');
  assertIncludes(desktopCard, 'isValidWhatsAppNumber', 'Guest Feedback desktop WhatsApp validation');
  assertIncludes(desktopDiagnostics, "secureError('[Feedback Inbox] Operation failed'", 'Guest Feedback desktop secure diagnostics');
  assertNotIncludes(desktop, 'console.', 'Guest Feedback desktop direct console diagnostics');
  assertNotIncludes(desktopCard, 'console.', 'Guest Feedback card direct console diagnostics');

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
  assertIncludes(mobile, 'copyMobileFeedbackLinkToClipboard', 'Guest Feedback mobile acknowledged copy helper');
  assertIncludes(mobile, "const copied = document.execCommand('copy');", 'Guest Feedback mobile copy fallback acknowledgement');
  assertIncludes(mobile, 'mobile_feedback_link_copy_failed', 'Guest Feedback mobile copy failure diagnostic');
  assertIncludes(mobile, 'openMobilePublicLink(feedbackUrl', 'Guest Feedback mobile shell-safe public link open');
  assertIncludes(mobile, 'mobile_feedback_native_share_failed', 'Guest Feedback mobile native share diagnostic');
  assertIncludes(mobile, 'logMobileOwnerFailure', 'Guest Feedback mobile bounded diagnostics');
  assertIncludes(mobileDetail, 'assertFeedbackStatusUpdateSucceeded(', 'Guest Feedback mobile detail status acknowledgement');
  assertIncludes(mobileDetail, 'mobile_feedback_status_update_rejected', 'Guest Feedback mobile status rejection code');
  assertIncludes(mobileDetail, 'mobile_feedback_reply_save_rejected', 'Guest Feedback mobile reply rejection code');
  assertIncludes(mobileDetail, 'maxLength={500}', 'Guest Feedback mobile reply cap');
  assertNotIncludes(mobile, 'console.', 'Guest Feedback mobile direct console diagnostics');
  assertNotIncludes(mobileDetail, 'console.', 'Guest Feedback mobile detail direct console diagnostics');

  assertIncludes(mobileShellVerifier, "'/feedback': { tab: 'more', todayScreen: 'main', moreScreen: 'feedback' }", 'Guest Feedback mobile shell route map');
}

function verifyDocsParity() {
  const readme = read('__docs__/projects/internal-feedback-system/README.md');
  const impl = read('__docs__/projects/internal-feedback-system/internal-feedback-system_impl.md');
  const firebase = read('__docs__/projects/internal-feedback-system/internal-feedback-system_firebase.md');
  const mobile = read('__docs__/projects/internal-feedback-system/internal-feedback-system_mobile-support.md');
  const helpdoc = read('__docs__/projects/internal-feedback-system/internal-feedback-system_helpdoc.md');
  const website = read('__docs__/projects/internal-feedback-system/internal-feedback-system_website.md');
  const audit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/CHANGELOG.md');

  [
    [readme, 'Guest Feedback README'],
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
  assertIncludes(impl, 'Guest Feedback project ID boundary', 'Guest Feedback implementation project ID boundary');
  assertIncludes(impl, 'whitespace-mutated', 'Guest Feedback implementation strict project ID boundary');
  assertIncludes(impl, 'The submit schema no longer trims project IDs before validation', 'Guest Feedback implementation raw submit project ID schema boundary');
  assertIncludes(impl, 'Guest Feedback target document-ID boundary', 'Guest Feedback implementation target document ID boundary');
  assertIncludes(impl, 'normalizeGuestFeedbackNumericDocumentId', 'Guest Feedback implementation target ID helper');
  assertIncludes(impl, 'src/lib/feedback/guestFeedbackProjectIdBoundary.ts', 'Guest Feedback implementation project ID helper');
  assertIncludes(impl, 'The submit route also re-normalizes `data.projectId` into local `projectId`', 'Guest Feedback implementation submit route project ID recheck');
  assertIncludes(impl, 'excludes `.doc(data.projectId)`', 'Guest Feedback implementation raw project document ref exclusion');
  assertIncludes(impl, 'Safe review URL boundary', 'Guest Feedback implementation safe URL boundary');
  assertIncludes(impl, 'guest_feedback_review_url_parse_failed', 'Guest Feedback implementation review URL parse diagnostic');
  assertIncludes(firebase, 'Guest feedback writes do not invalidate public menu/OBP cache', 'Guest Feedback Firebase cache boundary');
  assertIncludes(firebase, 'Guest Feedback project ID admission', 'Guest Feedback Firebase project ID admission boundary');
  assertIncludes(firebase, 'whitespace-mutated', 'Guest Feedback Firebase strict project ID admission boundary');
  assertIncludes(firebase, 'The submit schema no longer trims project IDs before validation', 'Guest Feedback Firebase raw submit project ID schema boundary');
  assertIncludes(firebase, 'Guest Feedback target document-ID admission', 'Guest Feedback Firebase target ID admission boundary');
  assertIncludes(firebase, 'normalizeGuestFeedbackNumericDocumentId', 'Guest Feedback Firebase target ID helper');
  assertIncludes(firebase, 'src/lib/feedback/guestFeedbackProjectIdBoundary.ts', 'Guest Feedback Firebase project ID helper');
  assertIncludes(firebase, 'The submit route repeats the normalizer before `.doc(projectId)`', 'Guest Feedback Firebase submit route project ID recheck');
  assertIncludes(firebase, '`.doc(data.projectId)` remains excluded', 'Guest Feedback Firebase raw project document ref exclusion');
  assertIncludes(firebase, 'guest_feedback_review_url_parse_failed', 'Guest Feedback Firebase review URL parse diagnostic boundary');
  assertIncludes(mobile, 'Mobile shell route-map source gate', 'Guest Feedback mobile route-map gate');
  assertIncludes(helpdoc, 'Private feedback', 'Guest Feedback helpdoc private feedback wording');
  assertIncludes(website, 'Review URL safety', 'Guest Feedback website review URL safety');
  assertIncludes(audit, 'Guest Feedback strict project ID boundary checkpoint', 'Production readiness audit Guest Feedback strict project ID checkpoint');
  assertIncludes(audit, 'whitespace-mutated', 'Production readiness audit Guest Feedback strict project ID evidence');
  assertIncludes(audit, 'no longer trims `projectId` before `normalizeGuestFeedbackProjectId(value) === value`', 'Production readiness audit Guest Feedback raw submit schema evidence');
  assertIncludes(audit, 'Guest Feedback Target Document ID Boundary checkpoint', 'Production readiness audit Guest Feedback target ID checkpoint');
  assertIncludes(audit, 'normalizeGuestFeedbackNumericDocumentId', 'Production readiness audit Guest Feedback target ID helper');
  assertIncludes(audit, 'repeats `normalizeGuestFeedbackProjectId(data.projectId)` into local `projectId` before reading `.doc(projectId)`', 'Production readiness audit Guest Feedback submit route project ID recheck');
  assertIncludes(audit, 'excluding `.doc(data.projectId)`', 'Production readiness audit Guest Feedback raw project document ref exclusion');
  assertIncludes(audit, 'Guest Feedback boundary source-gate checkpoint', 'Production readiness audit Guest Feedback checkpoint');
  assertIncludes(audit, 'Guest Feedback review URL parse diagnostics checkpoint', 'Production readiness audit Guest Feedback review URL parse diagnostics checkpoint');
  assertIncludes(audit, '`npm run verify:guest-feedback-boundary`', 'Production readiness audit Guest Feedback verifier command');
  assertIncludes(changelog, 'Guest Feedback Strict Project ID Boundary', 'Changelog Guest Feedback strict project ID boundary');
  assertIncludes(changelog, 'Whitespace-mutated feedback project IDs fail closed', 'Changelog Guest Feedback whitespace-mutated project ID boundary');
  assertIncludes(changelog, 'Submit schema no longer trims project IDs', 'Changelog Guest Feedback raw submit schema boundary');
  assertIncludes(changelog, 'Guest Feedback Target Document ID Boundary', 'Changelog Guest Feedback target ID boundary');
  assertIncludes(changelog, 'the submit route now re-normalizes `data.projectId` before reading `.doc(projectId)`', 'Changelog Guest Feedback submit route project ID recheck');
  assertIncludes(changelog, 'or `.doc(data.projectId)`', 'Changelog Guest Feedback raw project document ref exclusion');
  assertIncludes(changelog, 'Guest Feedback Review URL Parse Diagnostics', 'Changelog Guest Feedback review URL parse diagnostics');
  assertIncludes(changelog, 'guest_feedback_review_url_parse_failed', 'Changelog Guest Feedback review URL parse diagnostic code');
}

const checks = [
  ['package script', verifyPackageScript],
  ['safe review URL runtime', verifySafeReviewUrlRuntime],
  ['public submit route', verifyPublicSubmitRoute],
  ['public page and form', verifyPublicPageAndForm],
  ['Firestore DAL and retention', verifyFirestoreDalAndRetention],
  ['owner desktop and mobile', verifyOwnerDesktopMobile],
  ['docs parity', verifyDocsParity],
];

for (const [label, fn] of checks) {
  fn();
  console.log(`✓ ${label}`);
}

console.log('Guest Feedback boundary verification passed.');
