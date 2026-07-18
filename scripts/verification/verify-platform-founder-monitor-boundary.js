const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(source, token, label) {
  assert(source.includes(token), `${label} must include ${token}`);
}

function assertNotIncludes(source, token, label) {
  assert(!source.includes(token), `${label} must not include ${token}`);
}

function assertOrder(source, tokens, label) {
  let lastIndex = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, lastIndex + 1);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function verifyRoute(route) {
  [
    "export const dynamic = 'force-dynamic';",
    'withPlatformAuth(async (request: NextRequest, session: any) =>',
    'const MOVEMENT_ROW_LIMIT = 40;',
    'const INDIA_OFFSET_MS = 330 * 60 * 1000;',
    'days: z.coerce.number().int().min(1).max(90).optional().default(30)',
    'function cleanText(value: unknown, max = 180): string',
    'function getRecentIndiaDayKeys(days: number): string[]',
    'function normalizeMonitorStatus(value: unknown): FounderMonitorStatus',
    'function addCleanIds(value: unknown, target: Set<string>)',
    'async function readPlatformSummaryDoc(',
    'async function readDailyRevenueDocs(',
    'async function readRevenueMovements()',
    '.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS)',
    ".orderBy('occurredAt', 'desc')",
    '.limit(MOVEMENT_ROW_LIMIT)',
    'id: hashPublicRateLimitValue(doc.id)',
    "logRuntimeFailure('founder_monitor_summary_read_failed'",
    "logRuntimeFailure('founder_monitor_daily_revenue_read_failed'",
    "logRuntimeFailure('founder_monitor_revenue_movements_read_failed'",
    '!FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR',
    'QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))',
    'getSafeZodValidationDetails(parsed.error)',
    "getRateLimitForFeature('DATA_READ')",
    'const userRateLimitHash = hashPublicRateLimitValue(userId);',
    'key: `platform-founder-monitor:${userRateLimitHash}`',
    'failClosedOnProviderError: true',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    "Authorization Failed - Founder Monitor Current Role",
    "logger.security('Rate Limit Exceeded - Platform Founder Monitor'",
    "'Retry-After': String(waitSeconds)",
    "readPlatformSummaryDoc('founder-monitor-snapshot', 'Founder Monitor snapshot', 'founderMonitorSnapshot')",
    "readPlatformSummaryDoc('founder-monitor-revenue', 'Founder Monitor live revenue summary', 'founderMonitorRevenue')",
    'readDailyRevenueDocs(dayKeys)',
    'readRevenueMovements()',
    'newTenantsToday: todayDaily.newTenantIds.size',
    'newStoresToday: todayDaily.newStoreIds.size',
    "detail: 'The first revenue movement or 30-minute reconciliation has not populated platformSummary/founderMonitorRevenue yet.'",
    'return NextResponse.json({ data });',
    "logRuntimeFailure('founder_monitor_route_failed'",
    "return NextResponse.json({ error: 'Failed to load founder monitor' }, { status: 500 });",
  ].forEach((token) => assertIncludes(route, token, 'Founder Monitor API route'));

  [
    'const STORE_DOC_LIMIT = 500;',
    'const TENANT_DOC_LIMIT = 300;',
    'const SUBSCRIPTION_DOC_LIMIT = 500;',
    'const PAYMENT_TRANSACTION_LIMIT = 300;',
    'const SUPPORT_TICKET_LIMIT = 200;',
    'function readDocuments(',
    "readSummaryDoc('stores-summary'",
    'DB_COLLECTIONS.SUBSCRIPTIONS',
    'DB_COLLECTIONS.PAYMENT_TRANSACTIONS',
    'DB_COLLECTIONS.RESELLER_TRANSACTIONS',
    'DB_COLLECTIONS.SUPPORT_TICKETS',
    'id: doc.id',
  ].forEach((token) => assertNotIncludes(route, token, 'Founder Monitor API precomputed-read boundary'));

  assertOrder(route, [
    '!FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR',
    'QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()))',
    "getRateLimitForFeature('DATA_READ')",
    'const rateLimit = await checkRateLimit({',
    'const currentPlatformUser = await getCurrentPlatformUser(session);',
    'const [',
    'return NextResponse.json({ data });',
  ], 'Founder Monitor API admission/read order');

  [
    'request.json()',
    '.set({',
    'tx.set(',
    '.add({',
    'tx.create(',
    '.delete()',
    'writeBatch',
    'runTransaction',
    'onSnapshot',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(route, token, 'Founder Monitor API read-only boundary'));
}

function verifyDal(dal) {
  [
    "const FOUNDER_MONITOR_LOAD_FAILED = 'Failed to load founder monitor';",
    "FOUNDER_MONITOR_RESPONSE_PARSE_FAILED = 'founder_monitor_response_parse_failed'",
    "FOUNDER_MONITOR_RESPONSE_INVALID = 'founder_monitor_response_invalid'",
    "FOUNDER_MONITOR_RESPONSE_REJECTED = 'founder_monitor_response_rejected'",
    'FOUNDER_MONITOR_RESPONSE_JSON_MAX_BYTES = 512 * 1024',
    'readJsonResponseWithLimit<unknown>',
    "fetch(`/api/platform/founder-monitor?${params.toString()}`, {",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'isFounderMonitorApiResponse(payload)',
    'return payload.data;',
  ].forEach((token) => assertIncludes(dal, token, 'Founder Monitor browser DAL'));

  [
    'response.json()',
    '.json().catch',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(dal, token, 'Founder Monitor browser DAL boundary'));
}

function verifyRevenueReadModel(source, appConstants, functionsConstants) {
  assertIncludes(appConstants, 'FOUNDER_REVENUE_MOVEMENTS: "founderRevenueMovements"', 'App database constants');
  assertIncludes(appConstants, 'FOUNDER_ONBOARDING_TRANSITIONS: "founderOnboardingTransitions"', 'App database constants');
  assertIncludes(functionsConstants, "FOUNDER_REVENUE_MOVEMENTS: 'founderRevenueMovements'", 'Functions database constants');
  assertIncludes(functionsConstants, "FOUNDER_ONBOARDING_TRANSITIONS: 'founderOnboardingTransitions'", 'Functions database constants');

  [
    'export type FounderRevenueMovementKind =',
    "'new_mrr'",
    "'cash_collected'",
    "'failed_payment'",
    "'churn'",
    "'refund'",
    "'expansion_mrr'",
    "'downgrade_mrr'",
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    "const SUMMARY_DOC_ID = 'founderMonitorRevenue';",
    "const DAILY_DOC_PREFIX = 'founderMonitorRevenueDaily_';",
    "const ONBOARDING_TRANSITION_SOURCE = 'founderRevenueReadModel:new_mrr';",
    'const FOUNDER_REVENUE_STORE_DOCUMENT_ID_PATTERN = /^[1-9]\\d*$/;',
    'function normalizeFounderRevenueMovementDocumentId(value: string): string | null',
    'return isValidFirestoreDocumentId(movementId) ? movementId : null;',
    'function normalizeFounderRevenueStoreDocumentId(value: unknown): string | null',
    "if (typeof value !== 'string' && typeof value !== 'number') return null;",
    'const storeId = String(value);',
    'if (!FOUNDER_REVENUE_STORE_DOCUMENT_ID_PATTERN.test(storeId)) return null;',
    'const numericStoreId = Number(storeId);',
    'if (!Number.isSafeInteger(numericStoreId) || numericStoreId <= 0 || String(numericStoreId) !== storeId) return null;',
    'return isValidFirestoreDocumentId(storeId) ? storeId : null;',
    'function shouldTrackProduct(productId: unknown): boolean',
    'return normalizedProductId(productId) === PRODUCT_IDS.MENULIST;',
    'function buildTransitionPaymentPayload',
    'const movementId = normalizeFounderRevenueMovementDocumentId(input.id);',
    'const storeId = normalizeFounderRevenueStoreDocumentId(input.storeId);',
    'firestoreAdmin.runTransaction(async (transaction) => {',
    'const movementSnap = await transaction.get(movementRef);',
    'const recorded = await firestoreAdmin.runTransaction',
    'if (movementSnap.exists) return false;',
    'firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(movementId)',
    'firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS).doc(storeId)',
    'FieldValue.arrayUnion(tenantId)',
    'FieldValue.arrayUnion(storeId)',
    'transaction.set(movementRef, movementPayload);',
    'transaction.set(summaryRef, {',
    'transaction.set(dailyRef, {',
    'transaction.set(onboardingTransitionRef, buildTransitionPaymentPayload',
    'export function getFounderSubscriptionMrrPaise',
    'export async function recordFounderSubscriptionNewMrr',
    "id: `new_mrr:${subscriptionId}`",
    "kind: 'new_mrr'",
    'export async function recordFounderSubscriptionChurn',
    "id: `churn:${subscriptionId}`",
    "kind: 'churn'",
    'export async function recordFounderSubscriptionMrrChange',
    "const eventKey = normalizeFounderRevenueMovementDocumentId(params.eventKey || 'change');",
    "deltaPaise > 0 ? 'expansion_mrr' : 'downgrade_mrr'",
    "logRuntimeFailure('founder_revenue_movement_record_failed'",
  ].forEach((token) => assertIncludes(source, token, 'Founder revenue read model'));

  assertOrder(source, [
    'const movementId = normalizeFounderRevenueMovementDocumentId(input.id);',
    'firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS).doc(movementId)',
  ], 'Founder revenue movement ID guard order');
  assertOrder(source, [
    'const storeId = normalizeFounderRevenueStoreDocumentId(input.storeId);',
    'firestoreAdmin.collection(DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS).doc(storeId)',
  ], 'Founder onboarding transition store ID guard order');
  assertOrder(source, [
    "const eventKey = normalizeFounderRevenueMovementDocumentId(params.eventKey || 'change');",
    'id: `${kind}:${subscriptionId}:${eventKey}`',
  ], 'Founder MRR change event-key ID guard order');

  [
    '.add(',
    'console.error',
    'error.message',
    'const movementId = normalizeMovementId(input.id);',
    'const storeId = cleanText(value, 80);',
    'const storeId = cleanText(input.storeId, 80) || null;',
    "const eventKey = normalizeMovementId(params.eventKey || 'change');",
  ].forEach((token) => assertNotIncludes(source, token, 'Founder revenue read model boundary'));
}

function verifyRazorpayRuntime(webhook, verifySubscription, verifyTopup, cancelSubscription, upgradeSubscription) {
  const productBillingServer = read('src/lib/billing/productBillingServer.ts');
  [
    'recordFounderRevenueMovement',
    'recordFounderSubscriptionChurn',
    'recordFounderSubscriptionMrrChange',
    'recordFounderSubscriptionNewMrr',
    "id: `cash:${paymentEntity?.id || webhookClaim.eventKey}`",
    "kind: 'cash_collected'",
    "id: `failed_payment:${paymentEntity?.id || webhookClaim.eventKey}`",
    "kind: 'failed_payment'",
    "event.event === 'payment.refunded' || event.event === 'refund.processed'",
    "kind: 'refund'",
    "source: 'webhook:subscription.updated'",
    'replacementMrrPaise',
    'await recordFounderSubscriptionNewMrr({',
    'await recordFounderSubscriptionChurn({',
  ].forEach((token) => assertIncludes(webhook, token, 'Razorpay webhook Founder Monitor runtime writes'));

  [
    'recordFounderRevenueMovement',
    'recordFounderSubscriptionMrrChange',
    'recordFounderSubscriptionNewMrr',
    "id: `cash:${razorpay_payment_id}`",
    "kind: 'cash_collected'",
    "source: 'api:verify-subscription:replacement'",
    'await recordFounderSubscriptionNewMrr({',
  ].forEach((token) => assertIncludes(verifySubscription, token, 'Verify subscription Founder Monitor runtime writes'));

  [
    'recordFounderRevenueMovement',
    'const buildFounderTopupMovementId',
    'id: buildFounderTopupMovementId(razorpay_payment_id)',
    "kind: 'cash_collected'",
  ].forEach((token) => assertIncludes(verifyTopup, token, 'Verify top-up Founder Monitor runtime writes'));

  [
    'recordFounderSubscriptionChurn',
    'await recordFounderSubscriptionChurn({',
    "source: 'api:cancel-subscription'",
  ].forEach((token) => assertIncludes(cancelSubscription, token, 'Cancel subscription Founder Monitor runtime writes'));

  assertIncludes(upgradeSubscription, 'applyProductSubscriptionUpgradeCarryForward(productId, {', 'Upgrade subscription Founder Monitor transactional handoff');
  [
    'getFounderSubscriptionMrrPaise',
    'founderMonitorReplacementForSubscriptionId',
    'founderMonitorReplacementMrrPaise',
    'founderMonitorReplacementPlanId',
    'founderMonitorReplacementPlanName',
  ].forEach((token) => assertIncludes(productBillingServer, token, 'Upgrade subscription Founder Monitor transactional replacement metadata'));
}

function verifyScheduler(functionConstants, scheduler, snapshotScheduler) {
  [
    "FOUNDER_REVENUE_MOVEMENTS: 'founderRevenueMovements'",
    "FOUNDER_ONBOARDING_TRANSITIONS: 'founderOnboardingTransitions'",
  ].forEach((token) => assertIncludes(functionConstants, token, 'Functions database constants'));

  [
    "import { rebuildFounderMonitorSnapshotLogic } from './founderMonitorSnapshot';",
    "name: 'founder_monitor_snapshot'",
    "cadence: { type: 'every', minutes: 30 }",
    'run: runFounderMonitorSnapshot',
  ].forEach((token) => assertIncludes(scheduler, token, 'MenuList maintenance scheduler Founder Monitor task'));

  [
    'export async function rebuildFounderMonitorSnapshotLogic()',
    'const MOVEMENT_RECONCILE_LIMIT = 500;',
    'const ONBOARDING_TRANSITION_LIMIT = 500;',
    'const ONBOARDING_TRANSITION_WRITE_LIMIT = 50;',
    "db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').get()",
    'function isRecordedDistributionValue(value: unknown): boolean',
    'function hasDistributionSurface(summary: Record<string, any>): boolean',
    'return candidates.some(isRecordedDistributionValue);',
    'const distributionReady = hasDistributionSurface(summary);',
    'newStoreIds: string[];',
    'newTenantIds: string[];',
    'appendUniqueCleanId(data.storeId || data.sId, acc.newStoreIds)',
    'appendUniqueCleanId(data.tenantId || data.tId, acc.newTenantIds)',
    'db.collection(DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS)',
    'DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS',
    ".where('businessDayKey', '==', todayKey)",
    'function writeOnboardingTransitionCompletions',
    'averageTimeToLiveHours',
    'emitFounderMonitorRiskAlerts',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.MANUAL_PLATFORM_ALERT',
    'Founder Monitor: payment failure risk',
    ".doc('founderMonitorSnapshot').set(snapshot, { merge: true })",
    ".doc('founderMonitorRevenue').set(revenueReconciliationPayload, { merge: true })",
    ".doc(`founderMonitorRevenueDaily_${todayKey}`).set({",
    'const subscriptionReadCapped =',
    'reconciliationLimited: subscriptionReadCapped',
    'Transaction-time revenue remains the live revenue source.',
  ].forEach((token) => assertIncludes(snapshotScheduler, token, 'Founder Monitor snapshot scheduler'));

  [
    'const STORE_DOC_LIMIT = 500;',
    'readCollection(DB_COLLECTIONS.STORES',
    'storeDocsSnap',
    'storeDocReadCapped',
    'storeDocs = new Map',
    'storeDoc = storeDocs.get',
    'store-doc-read-capped',
    'Store detail enrichment used',
  ].forEach((token) => assertNotIncludes(snapshotScheduler, token, 'Founder Monitor summary-only store boundary'));
}

function verifyStoresSummaryContract(platformSummaryDal, storesDal) {
  [
    'menuPresence?: StoreDistributionPresenceSummary;',
    'presence?: StoreDistributionPresenceSummary;',
    'export type StoreDistributionPresenceSummary =',
    'const STORE_DISTRIBUTION_PRESENCE_KEYS',
    'export const buildStoreDistributionPresenceSummary =',
    'summaryEntry.menuPresence = buildStoreDistributionPresenceSummary(data.menuPresence) || {};',
    'summaryEntry.presence = buildStoreDistributionPresenceSummary(data.presence) || {};',
  ].forEach((token) => assertIncludes(platformSummaryDal, token, 'storesSummary distribution summary contract'));

  [
    'await runTransaction(firebaseClient, async (transaction) => {',
    'const storeSnapshot = await transaction.get(storeRef);',
    "if (!storeSnapshot.exists()) throw new Error('menu_presence_store_missing');",
    "throw new Error('menu_presence_store_scope_changed');",
    'transaction.update(storeRef, storeUpdate);',
    'transaction.set(summaryRef, {',
    'menuPresence: { [surface]: confirmed ? now : null },',
    'modifiedOn: now,',
    'tId: tenantId,',
    '}, { merge: true });',
  ].forEach((token) => assertIncludes(storesDal, token, 'store DAL distribution summary sync'));

  [
    'await updateDoc(docRef, updatePayload);',
    'await mergeStoreSummaryFields(storeId, {',
  ].forEach((token) => assertNotIncludes(storesDal, token, 'store DAL non-atomic distribution summary sync'));
}

function verifyBackfillScript(backfillScript) {
  [
    'scripts/backfill-founder-revenue-read-model.ts',
    "const SOURCE = 'scripts/backfill-founder-revenue-read-model';",
    "const projectId = getArg('--project-id') || process.env.FIREBASE_PROJECT_ID;",
    "throw new Error('Set FIREBASE_PROJECT_ID or pass --project-id before running Founder Monitor revenue backfill.');",
    "const write = hasFlag('--write');",
    "const confirmedProjectId = getArg('--confirm-project');",
    'Refusing write: pass --confirm-project ${projectId}',
    "hasFlag('--all-founder-revenue')",
    "admin.initializeApp({ projectId });",
    'Mode: ${write ?',
    'movementFromSubscription',
    'movementsFromPaymentTransaction',
    'movementFromTopup',
    'writeMovement',
    'DB_COLLECTIONS.FOUNDER_REVENUE_MOVEMENTS',
    'DB_COLLECTIONS.FOUNDER_ONBOARDING_TRANSITIONS',
    "id: `cash:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`",
    "id: `failed_payment:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`",
    "id: `refund:${paymentId || `legacy:${hashPath(doc.ref.path)}`}`",
    'To apply after backup/review',
  ].forEach((token) => assertIncludes(backfillScript, token, 'Founder revenue backfill script'));
}

function verifyDesktop(component) {
  [
    "platformRole === 'PLATFORM'",
    "redirect('/dashboard')",
    'getPlatformFounderMonitor(days)',
    "logRuntimeFailure('founder_monitor_load_failed'",
    "message.error('Failed to load founder monitor')",
    'Founder Monitor',
    'Trusted Live Stores',
    'Net New MRR',
    'Cash Collected Today',
    'Onboarding Stuck',
    'Stale / Broken Stores',
    'Tenant / Store Operations',
    'Revenue Movement',
    'Source Coverage',
    '<Button href="/platform/cost-posture">Cost Posture</Button>',
    '<Button href="/platform/owner-business-assistant">Business Health Monitor</Button>',
    '<Button href="/platform/support-tickets">Support Tickets</Button>',
    'Reads are bounded and manual-refresh only.',
  ].forEach((token) => assertIncludes(component, token, 'Founder Monitor desktop surface'));

  [
    'fetch(',
    'response.json()',
    '.json().catch',
    'console.error',
    'error.message',
  ].forEach((token) => assertNotIncludes(component, token, 'Founder Monitor desktop boundary'));
}

function verifyMobileAndNavigation(mobileShell, mobileMore, mobileInternal, navConstants, sidebar, horizontalSidebar) {
  [
    "'/platform/founder-monitor': 'founderMonitor'",
    "'founderMonitor'",
  ].forEach((token) => assertIncludes(mobileShell, token, 'Mobile shell Founder Monitor route map'));

  [
    "'founderMonitor'",
    "FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR ? [{ key: 'founderMonitor'",
    "label: 'Founder Monitor'",
    "description: 'Trusted live stores, revenue movement, onboarding, truth, distribution, and support risk.'",
    "if (screen === 'founderMonitor') return isPlatformAdmin && FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR;",
  ].forEach((token) => assertIncludes(mobileMore, token, 'Mobile More Founder Monitor gate'));

  [
    "const PlatformFounderMonitor = dynamic(() => import('@template/main-app/platform/founderMonitor')",
    "founderMonitor: {",
    'Component: PlatformFounderMonitor',
    "desktopPath: '/platform/founder-monitor'",
    "surface: 'Founder Monitor'",
    "title: 'Founder Monitor'",
  ].forEach((token) => assertIncludes(mobileInternal, token, 'Mobile platform internal Founder Monitor wrapper'));

  [
    'PLATFORM_FOUNDER_MONITOR: `/platform/founder-monitor`',
    "{ label: 'Founder Monitor', route: NAVIGARIONS_ROUTINGS.PLATFORM_FOUNDER_MONITOR, icon: LuBarChart3, allowedPlatformRoles: [ECOMSAI_PLATFORM_USER_ROLE] }",
  ].forEach((token) => assertIncludes(navConstants, token, 'Founder Monitor navigation constants'));

  [
    'if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_FOUNDER_MONITOR) {',
    'return FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR;',
  ].forEach((token) => {
    assertIncludes(sidebar, token, 'Sidebar Founder Monitor feature gate');
    assertIncludes(horizontalSidebar, token, 'Horizontal sidebar Founder Monitor feature gate');
  });
}

function verifyDocsAndPage() {
  [
    'src/app/(main)/platform/founder-monitor/page.tsx',
    'src/app/api/platform/founder-monitor/route.ts',
    'src/lib/ops/founderMonitorTypes.ts',
    'src/database/ops/founderMonitor.ts',
    'src/components/templates/main-app/platform/founderMonitor/index.tsx',
    'scripts/backfill-founder-revenue-read-model.ts',
    '__docs__/platform-founder-monitor/README.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_spec.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_impl.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_firebase.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_mobile-support.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_helpdoc.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_marketing.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_website.md',
    '__docs__/platform-founder-monitor/platform-founder-monitor_validation.md',
  ].forEach((relativePath) => {
    assert(fs.existsSync(path.join(root, relativePath)), `${relativePath} must exist`);
  });

  const implDoc = read('__docs__/platform-founder-monitor/platform-founder-monitor_impl.md');
  const firebaseDoc = read('__docs__/platform-founder-monitor/platform-founder-monitor_firebase.md');
  const validationDoc = read('__docs__/platform-founder-monitor/platform-founder-monitor_validation.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  [
    'precomputed',
    'founderRevenueMovements',
    'founderOnboardingTransitions',
    'platformSummary/founderMonitorRevenue',
    'platformSummary/founderMonitorRevenueDaily_YYYY-MM-DD',
    'platformSummary/founderMonitorSnapshot',
    '30-minute',
  ].forEach((token) => {
    assertIncludes(implDoc, token, 'Founder Monitor implementation docs');
    assertIncludes(firebaseDoc, token, 'Founder Monitor Firebase docs');
  });
  [
    'Founder revenue movement document IDs pass through `src/lib/firebase/firestoreDocumentId.ts`, and payment-to-live transition store IDs use exact positive numeric MenuList store document scope before the same Firestore document-ID guard.',
    'malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric movement/store IDs return without creating invalid',
  ].forEach((token) => assertIncludes(implDoc, token, 'Founder Monitor implementation document-ID boundary docs'));
  [
    'Founder Monitor revenue document-ID admission is Firebase-cost neutral',
    'validates movement IDs with `src/lib/firebase/firestoreDocumentId.ts` and requires transition store IDs to be exact positive numeric MenuList store document IDs before the same guard',
    'malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric IDs return before invalid refs',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Founder Monitor Firebase document-ID boundary docs'));
  [
    'Founder revenue movement IDs pass through `src/lib/firebase/firestoreDocumentId.ts`',
    'Payment-to-live transition store IDs must be exact positive numeric MenuList store document IDs before the same document-ID guard',
    'Valid Razorpay-driven cash, failed-payment, new-MRR, churn, refund, expansion, and downgrade movements keep the same deterministic summary-write behavior.',
  ].forEach((token) => assertIncludes(validationDoc, token, 'Founder Monitor validation document-ID boundary docs'));
  [
    'Platform Founder Monitor Revenue Document ID Boundary checkpoint',
    'malformed, reserved, empty, path-shaped, whitespace-mutated, zero, negative, unsafe, leading-zero, or nonnumeric movement IDs and transition store IDs can no longer reach',
    '`npm run verify:platform-founder-monitor-boundary`',
  ].forEach((token) => assertIncludes(productionAudit, token, 'Production audit Founder Monitor document-ID boundary evidence'));
  [
    'Platform Founder Monitor Revenue Document ID Boundary',
    'Founder revenue movement refs now validate document IDs',
    'Payment-to-live transition refs now require exact numeric store IDs',
  ].forEach((token) => assertIncludes(changelog, token, 'Changelog Founder Monitor document-ID boundary evidence'));
  [
    [firebaseDoc, 'Founder Monitor Firebase docs'],
    [validationDoc, 'Founder Monitor validation docs'],
  ].forEach(([content, label]) => {
    assertIncludes(
      content,
      'firebase deploy --project menulist-qa --config firebase.json --only functions:menulistMaintenanceScheduler --non-interactive',
      `${label} scoped QA deploy command`,
    );
    assertNotIncludes(
      content,
      'firebase deploy --only functions:menulistMaintenanceScheduler --project menulist-qa',
      `${label} stale deploy command without config-first scoped target`,
    );
  });
}

function main() {
  verifyRoute(read('src/app/api/platform/founder-monitor/route.ts'));
  verifyDal(read('src/database/ops/founderMonitor.ts'));
  verifyRevenueReadModel(
    read('src/lib/ops/founderRevenueReadModel.ts'),
    read('src/constants/database.ts'),
    read('functions/src/constants/database.ts'),
  );
  verifyRazorpayRuntime(
    read('src/app/api/razorpay/webhook/route.ts'),
    read('src/app/api/razorpay/verify-subscription/route.ts'),
    read('src/app/api/razorpay/verify-topup/route.ts'),
    read('src/app/api/razorpay/cancel-subscription/route.ts'),
    read('src/app/api/razorpay/upgrade-subscription/route.ts'),
  );
  verifyScheduler(
    read('functions/src/constants/database.ts'),
    read('functions/src/schedulers/menulistMaintenanceScheduler.ts'),
    read('functions/src/schedulers/founderMonitorSnapshot.ts'),
  );
  verifyStoresSummaryContract(
    read('src/database/platformSummary/index.ts'),
    read('src/database/stores/index.tsx'),
  );
  verifyDesktop(read('src/components/templates/main-app/platform/founderMonitor/index.tsx'));
  verifyBackfillScript(read('scripts/backfill-founder-revenue-read-model.ts'));
  verifyMobileAndNavigation(
    read('src/components/mobile/MobileShell.tsx'),
    read('src/components/mobile/screens/MobileMoreScreen.tsx'),
    read('src/components/mobile/screens/MobilePlatformInternalScreen.tsx'),
    read('src/constants/navigations.ts'),
    read('src/components/organisms/sidebar/index.tsx'),
    read('src/components/organisms/sidebar/horizontalSidebar.tsx'),
  );
  verifyDocsAndPage();
  console.log('Founder Monitor boundary verification passed.');
}

main();
