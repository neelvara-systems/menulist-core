#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`System strengthening verification failed: ${message}`);
    process.exit(1);
  }
}

function assertIncludes(source, token, message) {
  assert(source.includes(token), message || `Expected source to include ${token}`);
}

function assertNotIncludes(source, token, message) {
  assert(!source.includes(token), message || `Expected source not to include ${token}`);
}

function assertNoRegex(source, regex, message) {
  assert(!regex.test(source), message);
}

function assertOrder(source, label, tokens, message) {
  let previousIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token);
    assert(index !== -1, `${label} missing ordered token ${token}`);
    assert(index > previousIndex, `${label} order violation for ${message}`);
    previousIndex = index;
  }
}

function listFiles(relativeDir, matcher, files = []) {
  const fullDir = path.join(ROOT, relativeDir);
  for (const entry of fs.readdirSync(fullDir, { withFileTypes: true })) {
    const fullPath = path.join(fullDir, entry.name);
    const relativePath = path.relative(ROOT, fullPath);
    if (entry.isDirectory()) {
      listFiles(relativePath, matcher, files);
      continue;
    }
    if (!matcher || matcher(relativePath)) files.push(relativePath);
  }
  return files;
}

function sliceBetween(source, startToken, endToken, label) {
  const start = source.indexOf(startToken);
  assert(start !== -1, `${label} missing start token`);
  const end = source.indexOf(endToken, start + startToken.length);
  assert(end !== -1, `${label} missing end token`);
  return source.slice(start, end);
}

function hasExportedHttpHandler(source) {
  return /\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=/.test(source)
    || /\bexport\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/.test(source);
}

function verifyAnalyticsAdmission() {
  const analyticsRoutes = listFiles(
    'src/app/api/analytics',
    (relativePath) => relativePath.endsWith('/route.ts') || relativePath.endsWith('/route.tsx'),
  ).filter((route) => hasExportedHttpHandler(read(route)));

  assert(analyticsRoutes.length >= 7, 'analytics route admission verifier found too few active HTTP routes');

  analyticsRoutes.forEach((route) => {
    const source = read(route);
    assert(
      /\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE)\s*=\s*withAuth\b/.test(source),
      `${route} active HTTP handler must be wrapped by withAuth`,
    );
  });

  [
    'src/app/api/analytics/route.ts',
    'src/app/api/analytics/realtime/route.ts',
    'src/app/api/analytics/locations/route.ts',
    'src/app/api/analytics/menu/route.ts',
    'src/app/api/analytics/reports/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assertIncludes(source, 'applyAnalyticsReadRateLimit', `${route} must rate-limit GA reads`);
    assertIncludes(source, 'requireAnyStorePermission', `${route} must enforce analytics permission`);
    assertIncludes(source, 'requireConfiguredGoogleAnalyticsProperty', `${route} must scope GA property access`);
    assertIncludes(source, 'logAnalyticsFailure', `${route} must use bounded analytics failure logging`);
  });
}

function verifyFreshDalSessions() {
  [
    'src/database/projects/index.ts',
    'src/database/campaigns/index.ts',
    'src/database/notes/index.ts',
    'src/database/contentFeedback/index.ts',
    'src/database/feedback/index.ts',
    'src/database/changelog/index.ts',
    'src/database/changelog/feedback.ts',
    'src/database/tickets/index.ts',
    'src/database/todos/index.ts',
    'src/database/guestFeedback/index.ts',
  ].forEach((route) => {
    const source = read(route);
    assertIncludes(source, 'getActiveSession(', `${route} must fetch session through the live helper`);
    assertNoRegex(source, /\blet\s+session\s*[:=]/, `${route} must not keep a module-level session cache`);
    assertNotIncludes(source, 'session = Boolean(session)', `${route} must not reuse stale module-level sessions`);
  });
}

function verifyBatchWorkerAdmission() {
  const route = 'src/app/api/image-generation/batch-generation/route.ts';
  const source = read(route);
  const handler = source.slice(source.indexOf('export async function POST'));
  [
    'BATCH_IMAGE_GENERATION_WORKER_SECRET',
    "request.headers.get('x-menulist-task-secret')",
    "request.headers.get('project-id')",
    'timingSafeEqual',
    'readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES',
    'validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData)',
    'getImageBatchProcessingJobByIdAdmin',
    'checkAICapacity(',
    'finalizeAiOperationAccounting',
  ].forEach((token) => {
    assertIncludes(source, token, `${route} must retain worker admission/accounting token ${token}`);
  });
  assertOrder(
    handler,
    route,
    [
      'hasValidWorkerSecret(request)',
      'readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES',
      'validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData)',
      'getImageBatchProcessingJobByIdAdmin',
      'checkAICapacity(',
    ],
    'worker secret and bounded validation must run before job/provider work',
  );
}

function verifyScreenSeenRateLimit() {
  const route = 'src/app/api/screen/seen/route.ts';
  const source = read(route);
  [
    'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
    "key: `screen-seen:ip:${ipHash}`",
    "key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`",
    'hashPublicRateLimitValue(getClientIp(request))',
    'hashPublicRateLimitValue(token)',
    'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
    'getEligiblePublicScreenStore',
  ].forEach((token) => {
    assertIncludes(source, token, `${route} must retain public screen signal guard ${token}`);
  });
  assertOrder(
    source,
    route,
    [
      'rejectInvalidOrOversizedDeclaredBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
      "key: `screen-seen:ip:${ipHash}`",
      'readBoundedJsonBody(request, SCREEN_SEEN_MAX_BODY_BYTES',
      "key: `screen-seen:token:${storeHashSegment}:${screenTokenHash}`",
      "await docRef.update({",
    ],
    'cheap public rate limits must run before the daily Firestore write',
  );
}

function verifyAiRouteControls() {
  const routeRequirements = {
    'src/app/api/campaigns/caption/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkAIOperationLimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/descriptions/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkAIOperationLimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/image-editing/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkExpensiveAILimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/image-generation/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkExpensiveAILimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/image-generation/batch-trigger/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkBatchOperationLimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
    ],
    'src/app/api/new-item-metadata/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkAIOperationLimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/translations/route.ts': [
      'withAuth',
      'checkSafeMode',
      'checkAIOperationLimit',
      'readBoundedJsonBody',
      'validateAPIInput',
      'requireAnyStorePermission',
      'checkAICapacity',
      'finalizeAiOperationAccounting',
    ],
    'src/app/api/analytics/weekly-narrative/generate-local/route.ts': [
      'checkSafeMode',
      'checkRateLimit',
      'requireAnyStorePermission',
      'recordAiOperationForSession',
      'logRuntimeFailure',
    ],
    'src/app/api/analytics/weekly-narrative/regenerate/route.ts': [
      'withAuth',
      'generateWeeklyNarrativeLocally(request, session)',
      'logRuntimeFailure',
    ],
  };

  Object.entries(routeRequirements).forEach(([route, tokens]) => {
    const source = read(route);
    tokens.forEach((token) => {
      assertIncludes(source, token, `${route} must retain AI route control ${token}`);
    });
  });
}

function verifyChatFeedbackAcceptedShape() {
  const route = 'src/database/chatSessions/index.ts';
  const source = read(route);
  const updateFeedback = sliceBetween(source, 'export const updateMessageFeedback', '/**\n * Add or update an internal note', route);
  [
    'Feedback is stored on the bounded session message array',
    'sessionData.messages.map',
    'answerlatticeRequestBodyComposer({ messages: updatedMessages })',
    'setDoc(sessionRef, composedData, { merge: true })',
  ].forEach((token) => {
    assertIncludes(updateFeedback, token, `${route} must retain accepted chat feedback update shape ${token}`);
  });
}

function verifyBillingReadWriteBoundary() {
  const clientRoute = 'src/database/subscriptions/index.ts';
  const clientSource = read(clientRoute);
  const clientExpiry = sliceBetween(clientSource, 'const expireIfGracePeriodEnded = async', '/** BT5', clientRoute);
  assertIncludes(clientSource, 'Browser reads never mutate billing documents', `${clientRoute} must document client expiry as read-only`);
  [
    "validateTransition(sub.status, 'expired', 'dal:grace-period-client-check')",
    'return null;',
  ].forEach((token) => {
    assertIncludes(clientExpiry, token, `${clientRoute} must keep client expiry read-only token ${token}`);
  });
  assertNotIncludes(clientExpiry, 'updateSubscription(', `${clientRoute} client expiry must not write billing docs`);
  assertNotIncludes(clientExpiry, 'safeSyncStorePlanEntitlementFromSubscription', `${clientRoute} client expiry must not sync entitlements`);

  const serverRoute = 'src/database/subscriptions/server.ts';
  const serverSource = read(serverRoute);
  const serverExpiry = sliceBetween(serverSource, 'const expireIfGracePeriodEndedServer = async', 'export const getDirectActiveSubscriptionForStoreServer', serverRoute);
  [
    'updateSubscriptionServer(sub.id',
    'safeSyncStorePlanEntitlementFromSubscription',
    '"server:grace-period-auto-expire"',
  ].forEach((token) => {
    assertIncludes(serverExpiry, token, `${serverRoute} must keep server-owned expiry token ${token}`);
  });
}

function verifySystemAuditDeployEvidenceBoundary() {
  const audit = read('__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md');
  [
    'This audit is append-only historical evidence, not a current deployment runbook.',
    'do not reuse older `firebase deploy --only functions...` command shapes',
    'no-config commands, PATH-wrapped local commands, broad `--only functions` commands, or retired `ecomsai` target commands',
    'Current MenuList Functions retry evidence must start with `npm run verify:functions-deploy-preflight`',
    'External Certification Runbook Gate 1 flow against `menulist-qa`',
    'record the exact scoped target list and reason in `__docs__/audits/menulist-production-readiness-audit.md` before the retry',
    'Production deploys require QA evidence and explicit production deploy approval in the active session.',
  ].forEach((token) => {
    assertIncludes(audit, token, `System audit deploy evidence boundary missing token ${token}`);
  });
}

function verifyPresetCascadeBatching() {
  const route = 'src/database/projects/index.ts';
  const source = read(route);
  const cascade = sliceBetween(source, 'export const removePresetFromAllCategories', 'export type ProjectPresetCascadeUpdateResult', route);
  [
    'writeBatch(firebaseClient)',
    'PROJECT_PRESET_CASCADE_BATCH_LIMIT = 450',
    'commitPendingProjectPresetWrites',
    'batch.set(docSnap.ref, project, { merge: true })',
    'await commitPendingProjectPresetWrites();',
    'revalidatePublicClientCacheForProject(projectId, "removePresetFromAllCategories")',
  ].forEach((token) => {
    assertIncludes(cascade, token, `${route} must retain batched preset cascade token ${token}`);
  });
  assertOrder(
    cascade,
    route,
    [
      'batch.set(docSnap.ref, project, { merge: true })',
      'await commitPendingProjectPresetWrites();',
      'await Promise.all(',
    ],
    'preset cascade writes must commit before cache revalidation',
  );
}

function verifyNoApiOrDatabaseConsoleCalls() {
  const files = [
    ...listFiles('src/app/api', (relativePath) => /\.(ts|tsx)$/.test(relativePath)),
    ...listFiles('src/database', (relativePath) => /\.(ts|tsx)$/.test(relativePath)),
  ];
  const violations = files.flatMap((file) => {
    const source = read(file);
    const lines = source.split('\n');
    return lines
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => /\bconsole\.(log|warn|error)\s*\(/.test(line))
      .map(({ lineNumber }) => `${file}:${lineNumber}`);
  });

  assert(violations.length === 0, `API/database console calls are not allowed: ${violations.join(', ')}`);
}

verifyAnalyticsAdmission();
verifyFreshDalSessions();
verifyBatchWorkerAdmission();
verifyScreenSeenRateLimit();
verifyAiRouteControls();
verifyChatFeedbackAcceptedShape();
verifyBillingReadWriteBoundary();
verifySystemAuditDeployEvidenceBoundary();
verifyPresetCascadeBatching();
verifyNoApiOrDatabaseConsoleCalls();

console.log('System strengthening boundary verification passed');
