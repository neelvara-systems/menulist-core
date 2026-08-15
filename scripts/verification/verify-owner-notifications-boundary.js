const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, token, label) {
  assert(source.replace(/\s+/g, '').includes(token.replace(/\s+/g, '')), `${label} must include ${token}`);
}

function assertNotIncludes(source, token, label) {
  assert(!source.replace(/\s+/g, '').includes(token.replace(/\s+/g, '')), `${label} must not include ${token}`);
}

function assertOrder(source, tokens, label) {
  const searchable = source.replace(/\s+/g, '');
  let lastIndex = -1;
  for (const token of tokens) {
    const index = searchable.indexOf(token.replace(/\s+/g, ''), lastIndex + 1);
    assert(index >= 0, `${label} must include ${token}`);
    assert(index > lastIndex, `${label} must keep ${token} after the previous checkpoint`);
    lastIndex = index;
  }
}

function normalizeLineEndings(value) {
  return value.replace(/\r\n/g, '\n');
}

function verifyRegistryMirror(appRegistry, functionsRegistry) {
  assert(
    normalizeLineEndings(appRegistry) === normalizeLineEndings(functionsRegistry),
    'Owner notification registry must be copied byte-for-byte to functions/src/sharedData',
  );

  [
    'OWNER_NOTIFICATION_COLLECTIONS',
    'OWNER_NOTIFICATION_TRIGGER_TYPES',
    'OWNER_NOTIFICATION_REGISTRY',
    'getOwnerNotificationRegistryEntry',
    'defaultChannels',
    'requiresWhatsAppConsent',
  ].forEach((token) => assertIncludes(appRegistry, token, 'Owner notification registry'));
}

function verifyPlatformRecipientMirror(appRecipient, functionsRecipient) {
  assert(
    normalizeLineEndings(appRecipient) === normalizeLineEndings(functionsRecipient),
    'Platform notification recipient contract must be copied byte-for-byte to functions/src/sharedData',
  );
  [
    'normalizePlatformNotificationEmail',
    "typeof value !== 'string'",
    'MAX_PLATFORM_NOTIFICATION_EMAIL_LENGTH',
    'PLATFORM_NOTIFICATION_EMAIL_PATTERN',
    '/[\\u0000-\\u001f\\u007f]/',
  ].forEach((token) => assertIncludes(appRecipient, token, 'Platform notification recipient contract'));
}

function verifyDeliveryBoundaryMirror(appBoundary, functionsBoundary) {
  assert(
    normalizeLineEndings(appBoundary) === normalizeLineEndings(functionsBoundary),
    'Owner notification delivery boundary must be copied byte-for-byte to functions/src/sharedData',
  );

  [
    'normalizeOwnerNotificationDocumentId',
    'normalizeOwnerNotificationDocumentIdAliases',
    'normalizeOwnerNotificationNumericScopeDocumentId',
    'normalizeOwnerNotificationNumericScopeAliases',
    'normalizeOwnerNotificationReferenceId',
    'getNextOwnerNotificationProcessingAttempt',
    'MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS = 2',
    'MAX_OWNER_NOTIFICATION_EVENT_JSON_BYTES = 128 * 1024',
    'hasOwnerNotificationWhatsAppConsent',
    'OWNER_NOTIFICATION_WHATSAPP_CONSENT_REVOKED_STATUSES',
    'isOwnerNotificationEventWithinByteLimit',
    'projectOwnerNotificationPersistedEvent',
    'projectOwnerNotificationRateLimitCount',
    'getOwnerNotificationDeliveryClaimDecision',
    "existingStatus === 'sending'",
    "return requestedAttempt > existingAttempt ? 'claim' : 'terminal'",
    "status !== 'pending' && status !== 'failed'",
    'normalizedAttempt >= MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS',
  ].forEach((token) => assertIncludes(appBoundary, token, 'Owner notification delivery boundary'));
}

function verifyOwnerNotificationFormatters(formatters) {
  [
    'function isValidLocale(locale?: string): locale is string',
    'new Intl.DateTimeFormat(locale).format(new Date(0));',
    'locale: isValidLocale(defaultLanguage) ? defaultLanguage : DEFAULT_CONTEXT.locale',
  ].forEach((token) => assertIncludes(formatters, token, 'Owner notification formatting boundary'));

  assertNotIncludes(
    formatters,
    "locale: defaultLanguage.includes('-') ? defaultLanguage : DEFAULT_CONTEXT.locale",
    'Owner notification formatting boundary',
  );
}

function verifyLifecycleSubscriptionIndexes(firestoreIndexes, answerlatticeFirestoreIndexes) {
  const parsed = JSON.parse(firestoreIndexes);
  const answerlatticeParsed = JSON.parse(answerlatticeFirestoreIndexes);
  const subscriptions = Array.isArray(parsed.indexes)
    ? parsed.indexes.filter((index) => index.collectionGroup === 'subscriptions')
    : [];
  const hasFields = (expected) => subscriptions.some((index) => (
    index.queryScope === 'COLLECTION'
    && JSON.stringify(index.fields) === JSON.stringify(expected)
  ));

  assert(hasFields([
    { fieldPath: 'pId', order: 'ASCENDING' },
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'renewsOn', order: 'ASCENDING' },
  ]), 'Lifecycle renewal reminder query must keep its subscriptions composite index');
  assert(hasFields([
    { fieldPath: 'pId', order: 'ASCENDING' },
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'pastDueSinceAt', order: 'ASCENDING' },
  ]), 'Lifecycle suspension warning query must keep its subscriptions composite index');
  const hasCollectionFields = (collectionGroup, expected) => parsed.indexes.some((index) => (
    index.collectionGroup === collectionGroup
    && index.queryScope === 'COLLECTION'
    && JSON.stringify(index.fields) === JSON.stringify(expected)
  ));
  assert(hasCollectionFields('ownerNotificationEvents', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'updatedAt', order: 'ASCENDING' },
  ]), 'Owner notification retry query must keep its status/updatedAt index');
  assert(hasCollectionFields('ownerNotificationEvents', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'processingStartedAt', order: 'ASCENDING' },
  ]), 'Owner notification stale-processing query must keep its processingStartedAt index');
  assert(hasCollectionFields('ownerNotificationEvents', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'ASCENDING' },
  ]), 'Owner notification legacy event cleanup must keep its product/createdAt index');
  assert(hasCollectionFields('ownerNotificationDeliveries', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'ASCENDING' },
  ]), 'Owner notification digest query must keep its status/createdAt index');
  assert(hasCollectionFields('ownerNotificationDeliveries', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'ASCENDING' },
  ]), 'Owner notification legacy delivery cleanup must keep its product/createdAt index');
  assert(hasCollectionFields('ownerNotificationRateLimits', [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'updatedAt', order: 'ASCENDING' },
  ]), 'Owner notification legacy rate-limit cleanup must keep its product/updatedAt index');
  const detailIndex = [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'eventId', order: 'ASCENDING' },
    { fieldPath: 'createdAt', order: 'DESCENDING' },
  ];
  assert(hasCollectionFields('ownerNotificationDeliveries', detailIndex), 'MenuList owner notification detail must keep its newest-first event index');
  assert(answerlatticeParsed.indexes.some((index) => (
    index.collectionGroup === 'ownerNotificationDeliveries'
    && index.queryScope === 'COLLECTION'
    && JSON.stringify(index.fields) === JSON.stringify(detailIndex)
  )), 'Answerlattice owner notification detail must keep its newest-first event index');
  const recentIndex = [
    { fieldPath: 'productId', order: 'ASCENDING' },
    { fieldPath: 'updatedAt', order: 'DESCENDING' },
  ];
  assert(hasCollectionFields('ownerNotificationEvents', recentIndex), 'MenuList owner notification recent list must keep its product/newest index');
  assert(answerlatticeParsed.indexes.some((index) => (
    index.collectionGroup === 'ownerNotificationEvents'
    && index.queryScope === 'COLLECTION'
    && JSON.stringify(index.fields) === JSON.stringify(recentIndex)
  )), 'Answerlattice owner notification recent list must keep its product/newest index');
}

function verifyFirestoreDocumentIdHelper(helper) {
  [
    'RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/',
    'export function isValidFirestoreDocumentId(value: unknown): value is string',
    "id !== '.'",
    "id !== '..'",
    "!id.includes('/')",
    'FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES = 1_500',
    'new TextEncoder().encode(id).byteLength <= FIRESTORE_DOCUMENT_ID_MAX_UTF8_BYTES',
    '!RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(id)',
  ].forEach((token) => assertIncludes(helper, token, 'Firestore document ID helper'));
}

function verifyOpsRoute(route) {
  [
    "withOwnerNotificationPrivateResponse(async (request, session) =>",
    "requiredPlatformRole: 'PLATFORM'",
    "'Cache-Control': 'private, no-store, max-age=0'",
    "'X-Content-Type-Options': 'nosniff'",
    '!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS || !FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD',
    'const OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES = 8 * 1024;',
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'const DELIVERY_DETAIL_LIMIT = 12;',
    'const STATUS_FILTERS: OwnerNotificationOpsStatusFilter[] =',
    'const OwnerNotificationEventIdSchema = z.string()',
    ".refine(isValidFirestoreDocumentId, 'Invalid event ID')",
    'function normalizeOwnerNotificationEventId(value: unknown): string | null',
    'function requireOwnerNotificationEventId(value: unknown): string',
    'const eventId = requireOwnerNotificationEventId(params.eventId);',
    'const normalizedEventId = requireOwnerNotificationEventId(eventId);',
    'const eventId = requireOwnerNotificationEventId(validation.data.eventId);',
    'eventId: OwnerNotificationEventIdSchema.optional()',
    'z.enum(PRODUCT_IDS_FOR_OPS',
    'limit: z.coerce.number().int().min(5).max(50).default(30)',
    "action: z.literal('retry')",
    'eventId: OwnerNotificationEventIdSchema',
    "action: z.literal('manualSend')",
    "action: z.literal('manualHandoff')",
    'const OwnerNotificationActionIdSchema = z.string()',
    'actionId: OwnerNotificationActionIdSchema',
    'Math.min(Math.max(limit * 3, 40), 90)',
    'authReads: 1',
    'countQueries: 0',
    'Manual refresh only. One current-user authorization read and one bounded recent-event scan.',
    'Counts and filters describe that same product-scoped recent window',
    'detail recipient resolution runs only after selecting one event.',
    'hashPublicRateLimitValue(userId)',
    'key: `owner-notification-ops:${userRateLimitHash}`',
    'key: `owner-notification-ops-read:${operatorRateLimitHash}`',
    'failClosedOnProviderError: true',
    'getCurrentPlatformUser(session)',
    "accessModel: 'current_persisted_platform_user'",
    'readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
    'manualRecipientOverride: true',
    'manualActionFingerprint: buildOwnerNotificationManualSendFingerprint(identity)',
    'isMatchingOwnerNotificationManualSendEvent({',
    "{ processImmediately: false, processExisting: false }",
    "return NextResponse.json({ error: 'Owner notification action ID conflict' }, { status: 409 });",
    "return NextResponse.json({ error: 'Owner notification runtime is unavailable' }, { status: 503 });",
    'projectOwnerNotificationPersistedEvent(',
    'normalizeDestinationForAudit',
    'recipientMasked',
    'manualHandoffAt',
    'const committed = await params.db.runTransaction(async (transaction) =>',
    'const existingDeliverySnapshot = await transaction.get(deliveryRef);',
    'transaction.create(deliveryRef, sanitizeForFirestore({',
    'transaction.update(eventRef, sanitizeForFirestore({',
    "logOpsFailure('owner_notifications_route_failed'",
    "logOpsFailure('owner_notifications_action_failed'",
    "logger.security('Owner Notification Ops Action Validation Failed'",
    'getBoundedSecurityRouteContext(session, request)',
    "status: notFound ? 404 : 409",
    "status: EVENT_STATUSES.includes(data.status) ? data.status : 'invalid'",
    "channel: data.channel === 'email' || data.channel === 'whatsapp' ? data.channel : 'invalid'",
    "referenceId: `manual-${eventId}-${params.actionId}`",
    "const deliveryId = safeId(`manual|${eventId}|${params.actionId}`);",
  ].forEach((token) => assertIncludes(route, token, 'Owner notification ops API route'));

  assertOrder(route, [
    'key: `owner-notification-ops:${userRateLimitHash}`',
    'let operatorUserId: string;',
    'operatorUserId = currentPlatformUser.documentId;',
    'readBoundedJsonBody(request, OWNER_NOTIFICATION_OPS_ACTION_MAX_BODY_BYTES',
    'validateAPIInput(PostActionSchema, body)',
    'const db = getDbForProduct(validation.data.productId);',
  ], 'Owner notification ops POST admission order');

  assertOrder(route, [
    'async function getRecentEventRows(params:',
    '.collection(OWNER_NOTIFICATION_COLLECTIONS.EVENTS)',
    ".where('productId', '==', params.productId)",
    ".orderBy('updatedAt', 'desc')",
    '.limit(params.scanLimit)',
  ], 'Owner notification recent event product partition');

  assertOrder(route, [
    'const eventId = requireOwnerNotificationEventId(params.eventId);',
    'const eventSnap = await params.db',
    '.doc(eventId)',
    'const deliveriesSnap = await params.db',
    ".collection(OWNER_NOTIFICATION_COLLECTIONS.DELIVERIES)\n    .where('productId', '==', params.productId)",
    '.where(\'eventId\', \'==\', eventId)',
    ".orderBy('createdAt', 'desc')",
    '.limit(DELIVERY_DETAIL_LIMIT)',
  ], 'Owner notification detail delivery query boundary');

  assertOrder(route, [
    'const eventId = requireOwnerNotificationEventId(validation.data.eventId);',
    'const result = await processOwnerNotificationEvent(validation.data.productId, eventId)',
    'const event = await loadRawEvent(db, validation.data.productId, eventId);',
  ], 'Owner notification action event ID normalization boundary');

  [
    'request.json()',
    'bodyResult.data as any',
    'function toIso(value: any)',
    'function sanitizeForFirestore(value: any): any',
    'function sanitizeMetadataPreview(metadata: any)',
    'function normalizeChannels(value: any)',
    'function getOperatorId(session: any)',
    '.doc(params.eventId)',
    ".where('eventId', '==', params.eventId)",
    'processOwnerNotificationEvent(validation.data.productId, validation.data.eventId)',
    'loadRawEvent(db, validation.data.productId, validation.data.eventId)',
    "getBoundedOpsStringContext('eventId', validation.data.eventId)",
    "error: data.error || null",
    "subject: data.subject || null",
    "providerMessageId: data.providerMessageId || null",
    "logger.error('[API /ops/owner-notifications]",
  ].forEach((token) => assertNotIncludes(route, token, 'Owner notification ops API route'));
}

function verifyManualActionBoundary(boundary) {
  [
    'export function buildOwnerNotificationManualSendFingerprint(',
    'export function isMatchingOwnerNotificationManualSendEvent(params:',
    'projectOwnerNotificationPersistedEvent(',
    'identity.productId,',
    'identity.eventId,',
    'identity.actionId,',
    'identity.channel,',
    'identity.destination,',
    'identity.reason || null,',
    'requestedChannels?.length === 1',
    'destinationMatches',
    'event.metadata.manualRecipientOverride === true',
    'event.metadata.originalEventId === params.expected.eventId',
    'event.metadata.manualActionFingerprint',
  ].forEach((token) => assertIncludes(boundary, token, 'Owner notification manual action boundary'));
}

function verifyCore(core, recipientResolver, types, emailChannel, whatsappChannel, appWhatsAppProvider, appLifecycle, ownerHeader) {
  [
    'if (!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS)',
    'ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION',
    'ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION',
    'getOwnerNotificationRegistryEntry(input.productId, input.triggerType)',
    "requestedRegistryEntry.producerStatus === 'reserved'",
    "requestedRegistryEntry.producerStatus === 'alias'",
    'const dedupeKey = getDedupeKey(normalizedInput);',
    'const eventId = safeId(dedupeKey);',
    'const existing = await transaction.get(ref);',
    'if (existing.exists) {',
    'transaction.create(ref, doc);',
    'options.processExisting === false',
    "claimReason: 'not_found_or_product_mismatch'",
    "claimReason: 'not_claimable'",
    'getNextOwnerNotificationProcessingAttempt(',
    'isOwnerNotificationEventWithinByteLimit(doc)',
    "logNotificationFailure('owner_notification_event_too_large'",
    'projectOwnerNotificationPersistedEvent(snap.data(), productId)',
    'safeId(current.dedupeKey) !== eventId',
    'current.priority !== registryEntry.priority',
    "error: 'scope_not_found_or_mismatch'",
    'tenantId: event.tenantId',
    'const existing = await transaction.get(deliveryRef);',
    'projectOwnerNotificationRateLimitCount(recipientSnap.data()',
    'const deliveryClaim = await claimDelivery({',
    "status: 'sending'",
    'await finalizeDelivery({',
    "data?.status !== 'sending'",
    'data?.attempt !== attempt',
    'attempt,',
    'lastAttemptAt: attemptedAt',
    'processImmediately',
    'MAX_PER_RECIPIENT_PER_DAY = 20',
    'MAX_PER_STORE_PER_DAY = 10',
    'incrementRateLimit',
    'recipientHash',
    'recipientMasked',
    'sanitizeForFirestore',
    'sendOwnerNotificationEmail',
    'sendOwnerNotificationWhatsApp',
    'getAnswerlatticeRetentionFields',
    'MENULIST_OWNER_NOTIFICATION_RETENTION_DAYS = 30',
    'MENULIST_OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS = 2',
    "logNotificationFailure('owner_notification_processing_failed'",
  ].forEach((token) => assertIncludes(core, token, 'Owner notification app core'));

  [
    'Number(recipientSnap.data()?.count || 0)',
    'Number(storeSnap.data()?.count || 0)',
    'const current = snap.data() as OwnerNotificationEventDoc',
    'async function writeDelivery(',
  ].forEach((token) => assertNotIncludes(core, token, 'Owner notification app persisted and delivery boundary'));

  assertOrder(core, [
    'const deliveryClaim = await claimDelivery({',
    "if (deliveryClaim.decision !== 'claimed')",
    "const result = channel === 'email'",
  ], 'Owner notification app durable channel claim ordering');
  assert(
    core.lastIndexOf('await finalizeDelivery({') > core.indexOf('const result ='),
    'Owner notification app must finalize the provider result after the provider call',
  );

  [
    'normalizeOwnerNotificationDocumentId',
    'normalizeOwnerNotificationDocumentIdAliases',
    'normalizeOwnerNotificationNumericScopeDocumentId',
    'const tenantDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.tenantId);',
    'const workspaceDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.workspaceId ?? event.storeId);',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(workspaceDocumentId).get();',
    'const storedTenantDocumentId = normalizeOwnerNotificationDocumentIdAliases([',
    '? { readCount: 1, workspaceData }',
    ': { readCount: 1 };',
    'const tenantScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.tenantId);',
    'const storeScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.storeId);',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();',
    'normalizeOwnerNotificationNumericScopeAliases([',
    'storedTenantScope?.numericId === tenantScope.numericId',
    'storedTenantAliases.length === 0 || storedTenantScope?.numericId === tenantScope.numericId',
    'DB_COLLECTIONS.TENANTS',
    'manualRecipientOverride === true',
    'forceHintRecipient ? hintEmail || email : email',
    'forceHintRecipient ? hintWhatsappNumber || whatsappNumber : whatsappNumber',
    'hasOwnerNotificationWhatsAppConsent(settings)',
  ].forEach((token) => assertIncludes(recipientResolver, token, 'Owner notification recipient resolver'));

  assertOrder(recipientResolver, [
    'const tenantScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.tenantId);',
    'const storeScope = normalizeMenuListOwnerNotificationScopeDocumentId(event.storeId);',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();',
    'if (storeSnap.exists) {',
    'const legacyStoreSnap = await db',
    '.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId)',
    '        .collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId)',
  ], 'MenuList owner notification recipient lookup order');

  assertOrder(recipientResolver, [
    'const tenantDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.tenantId);',
    'const workspaceDocumentId = normalizeOwnerNotificationRecipientDocumentId(event.workspaceId ?? event.storeId);',
    'if (!db || !tenantDocumentId || !workspaceDocumentId) return { readCount: 0 };',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(workspaceDocumentId).get();',
    '? { readCount: 1, workspaceData }',
  ], 'Answerlattice owner notification recipient workspace ID boundary');

  [
    'doc(String(event.storeId))',
    'doc(String(event.tenantId))',
    'const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(event.storeId).get();',
    'cleanEmail(data.email)\n        || cleanEmail(hints.email)',
    'data.whatsappNumber,\n            hints.whatsappNumber',
    'workspaceData?.tenantId ?? workspaceData?.tId',
    'storeData?.tenantId ?? storeData?.tId',
  ].forEach((token) => assertNotIncludes(recipientResolver, token, 'Owner notification recipient resolver'));

  assertIncludes(types, 'storeData?: Record<string, unknown> | null;', 'Owner notification scope type');
  assertIncludes(types, 'workspaceData?: Record<string, unknown> | null;', 'Owner notification scope type');
  assertNotIncludes(types, 'Record<string, any>', 'Owner notification scope type');
  assertIncludes(recipientResolver, 'const settings = isRecord(data.notificationSettings)', 'Owner notification settings runtime boundary');

  [
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId)',
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId)',
    'normalizeOwnerNotificationReferenceId(payload.referenceId)',
    'resolveAuthoritativeLifecycleRecipient',
    'normalizeOwnerNotificationNumericScopeAliases(tenantAliases)',
    'normalizeOwnerNotificationNumericScopeAliases(storeAliases)',
    'claimLifecycleDelivery',
    'transaction.create(ref, {',
    'db.collection(MESSAGE_LOGS).doc(documentId).set({',
  ].forEach((token) => assertIncludes(appLifecycle, token, 'App lifecycle delivery boundary'));

  [
    'db.collection(MESSAGE_LOGS).add({',
    'sendViaSMTP(recipientEmail, template.subject, template.html)',
  ].forEach((token) => assertNotIncludes(appLifecycle, token, 'App lifecycle legacy delivery boundary'));

  [
    'sendServerWhatsAppOs',
    'messageClass: params.messageClass',
    'localDeliveryReference: params.localDeliveryReference',
    'ownerReference:',
    'consentGranted: params.consentGranted',
    'ambiguous: result.ambiguous',
  ].forEach((token) => assertIncludes(whatsappChannel, token, 'Owner notification app WhatsAppOS adapter'));

  [
    'encodeURIComponent(phoneNumberId)',
    "redirect: 'manual'",
    'readJsonResponseWithLimit(response, WHATSAPP_OS_LIMITS.MAX_PROVIDER_BODY_BYTES)',
    'WHATSAPP_OS_LIMITS.MAX_PROVIDER_MESSAGE_ID_LENGTH',
    'AbortSignal.timeout(PROVIDER_TIMEOUT_MS)',
    'WHATSAPP_OS_PROVIDER_OUTCOME_UNKNOWN',
  ].forEach((token) => assertIncludes(appWhatsAppProvider, token, 'Owner notification app WhatsAppOS provider'));

  [
    'OWNER_NOTIFICATION_SMTP_CONNECTION_TIMEOUT_MS = 10_000',
    'OWNER_NOTIFICATION_SMTP_GREETING_TIMEOUT_MS = 10_000',
    'OWNER_NOTIFICATION_SMTP_SOCKET_TIMEOUT_MS = 15_000',
    'MAX_OWNER_NOTIFICATION_EMAIL_PROVIDER_MESSAGE_ID_LENGTH = 200',
    'connectionTimeout: OWNER_NOTIFICATION_SMTP_CONNECTION_TIMEOUT_MS',
    'greetingTimeout: OWNER_NOTIFICATION_SMTP_GREETING_TIMEOUT_MS',
    'socketTimeout: OWNER_NOTIFICATION_SMTP_SOCKET_TIMEOUT_MS',
    'normalizeProviderMessageId(info.messageId)',
  ].forEach((token) => assertIncludes(emailChannel, token, 'Owner notification app email channel'));

  [
    'response.text()',
    'console.log',
    'console.warn',
    'console.error',
  ].forEach((token) => assertNotIncludes(core + recipientResolver + whatsappChannel + appLifecycle, token, 'Owner notification app notification stack'));

  [
    'NotificationsModal',
    'New Order Placed',
    '<LuBell',
    'const [notifications',
  ].forEach((token) => assertNotIncludes(ownerHeader, token, 'Owner header notification truth boundary'));
}

function verifyFunctionsProcessor(processor, functionsWhatsAppProvider, scheduler, messagingEngine, smtpProvider, stalenessCheck, operationsTrigger) {
  [
    'FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATIONS',
    'FUNCTION_FLAGS.ENABLE_OWNER_NOTIFICATION_MENULIST_MIGRATION',
    'isLifecycleMessagingEnabled',
    'OWNER_NOTIFICATION_LIFECYCLE_FLAG_CHECK_FAILED',
    'OWNER_NOTIFICATION_UNKNOWN_MENULIST_TRIGGER',
    "logger.error('[OwnerNotifications] Lifecycle flag check failed, skipping owner notification'",
    "fallbackPolicy: 'skip_owner_notification_until_lifecycle_flag_known'",
    "logger.warn('[OwnerNotifications] Non-active MenuList trigger skipped'",
    "fallbackPolicy: 'skip_owner_notification_without_active_registry_entry'",
    "logger.warn('[OwnerNotifications] Unknown stored MenuList trigger skipped'",
    "fallbackPolicy: 'mark_owner_notification_skipped_without_registry_entry'",
    'getOwnerNotificationTriggerLogContext(normalizedPayload.eventType)',
    'getOwnerNotificationTriggerLogContext(event.triggerType)',
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId)',
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId)',
    'normalizeOwnerNotificationReferenceId(payload.referenceId)',
    'hasOwnerNotificationWhatsAppConsent(settings)',
    'isOwnerNotificationEventWithinByteLimit(eventDoc)',
    "projectOwnerNotificationPersistedEvent(snapshot.data(), 'ML')",
    'safeId(event.dedupeKey) !== eventRef.id',
    'event.priority !== registryEntry.priority',
    'projectOwnerNotificationRateLimitCount(recipientSnap.data()',
    'const deliveryClaim = await claimDelivery({',
    "status: 'sending'",
    'await finalizeDelivery({',
    "data?.status !== 'sending'",
    'data?.attempt !== attempt',
    'OWNER_NOTIFICATION_EVENT_TOO_LARGE',
    'getNextOwnerNotificationProcessingAttempt(',
    'const existing = await tx.get(eventRef);',
    'if (!existing.exists) tx.create(eventRef, eventDoc);',
    'const event = await claimOwnerNotificationEvent(eventRef);',
    'db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get()',
    'normalizeOwnerNotificationNumericScopeAliases(tenantAliases)',
    "['ML', 'store', event.tenantId, event.storeId, dateKey]",
    'DB_COLLECTIONS.TENANTS',
    'sendFunctionsWhatsAppOs({',
    "workflow: 'owner_notification'",
    'ambiguous: result.ambiguous',
    'FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RETENTION_DAYS',
    'FUNCTION_RETENTION_CONFIG.OWNER_NOTIFICATION_RATE_LIMIT_RETENTION_DAYS',
    'createAlert({',
    'PLATFORM_NOTIFICATION_TRIGGER_TYPES.OWNER_NOTIFICATION_FAILURE',
    'retryFailedOwnerNotifications',
    'markStaleOwnerNotificationProcessingEvents',
    'OWNER_NOTIFICATION_PROCESSING_OUTCOME_AMBIGUOUS',
    'OWNER_NOTIFICATION_PROCESSING_LEASE_MS = 15 * 60 * 1000',
    ".where('processingStartedAt', '<=', staleBefore)",
    ".orderBy('processingStartedAt', 'asc')",
    'processingAttempt: MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS',
    'retryCount: 1',
    'recordOwnerNotificationRetryAttempt',
    "const event = projectOwnerNotificationPersistedEvent(doc.data(), 'ML');",
    'event.retryCount === 1',
    'event.processingAttempt !== MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS',
    'const recorded = await recordOwnerNotificationRetryAttempt',
    'ambiguous: number;',
    'getOwnerNotificationDigest',
    'failureCode: OWNER_NOTIFICATION_PROCESSING_FAILED',
    'const existing = await tx.get(deliveryRef);',
    'attempt,',
    ".where('updatedAt', '>=', Timestamp.fromMillis(yesterdayMs))",
    ".orderBy('updatedAt', 'asc')",
    ".where('createdAt', '>=', Timestamp.fromMillis(yesterdayMs))",
    '.count()',
    'const sent = sentSnap.data().count;',
    'const failed = failedSnap.data().count;',
  ].forEach((token) => assertIncludes(processor, token, 'Functions owner notification processor'));

  [
    'encodeURIComponent(config.phoneNumberId)',
    "redirect: 'manual'",
    'readJsonResponseWithLimit(response, WHATSAPP_OS_LIMITS.MAX_PROVIDER_BODY_BYTES)',
    'AbortSignal.timeout(PROVIDER_TIMEOUT_MS)',
    'WHATSAPP_OS_PROVIDER_OUTCOME_UNKNOWN',
  ].forEach((token) => assertIncludes(functionsWhatsAppProvider, token, 'Functions WhatsAppOS provider'));

  [
    'Number(recipientSnap.data()?.count || 0)',
    'Number(storeSnap.data()?.count || 0)',
    'const event = snapshot.data() as OwnerNotificationEventDoc',
    'async function writeDelivery(',
    'data.retryCount && data.retryCount >= 1',
    'await doc.ref.set({ retryCount: 1',
  ].forEach((token) => assertNotIncludes(processor, token, 'Functions owner notification persisted and delivery boundary'));

  assertOrder(processor, [
    'const deliveryClaim = await claimDelivery({',
    "if (deliveryClaim.decision !== 'claimed')",
    "const result = channel === 'email'",
  ], 'Functions owner notification durable channel claim ordering');
  assert(
    processor.lastIndexOf('await finalizeDelivery({') > processor.indexOf("const result = channel === 'email'"),
    'Functions owner notification must finalize the provider result after the provider call',
  );

  [
    ".where('productId', '==', 'ML')",
    'export async function retryFailedOwnerNotifications',
    'export async function getOwnerNotificationDigest',
  ].forEach((token) => assertIncludes(processor, token, 'Functions owner notification product-partitioned retry/digest'));

  assertOrder(processor, [
    'const tenantScope = normalizeOwnerNotificationNumericScopeDocumentId(event.tenantId);',
    'const storeScope = normalizeOwnerNotificationNumericScopeDocumentId(event.storeId);',
    'let storeDoc = await db.collection(DB_COLLECTIONS.STORES).doc(storeScope.documentId).get();',
    'if (!storeDoc.exists) {',
    '.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId)',
    'if (!storeDoc.exists) return null;',
    'const tenantAliases = [data.tenantId, data.tId]',
    'const storedTenantScope = normalizeOwnerNotificationNumericScopeAliases(tenantAliases);',
    'const storeAliases = [data.storeId, data.sId]',
    'const storedStoreScope = storeAliases.length === 0',
  ], 'Functions MenuList owner notification store lookup order');

  [
    "name: 'owner_notification_retention_cleanup'",
    'run: runOwnerNotificationRetentionCleanup',
    'lockTtlMs: 10 * MINUTE_MS',
  ].forEach((token) => assertIncludes(scheduler, token, 'MenuList maintenance scheduler owner notification cleanup'));

  [
    "productField: 'productId'",
    "productValue: 'ML'",
    ".where(params.productField, '==', params.productValue)",
    'export const runOwnerNotificationRetentionCleanupForTest = runOwnerNotificationRetentionCleanup;',
    'deleteLegacyOwnerNotificationDocs({',
    "timestampField: 'createdAt'",
    "timestampField: 'updatedAt'",
    'data.expiresAt !== undefined',
  ].forEach((token) => assertIncludes(scheduler, token, 'MenuList owner notification retention product partition'));

  [
    'await response.text()',
    'response.json()',
    'console.log',
    'console.warn',
    "logger.warn('[OwnerNotifications] Unknown MenuList trigger', { eventType: payload.eventType });",
    'eventType: payload.eventType',
    'eventType: event.triggerType',
    '|| event.recipientHints?.email',
    'event.recipientHints?.whatsappNumber',
    '.limit(200)',
    'docs.filter((doc)',
  ].forEach((token) => assertNotIncludes(processor, token, 'Functions owner notification processor'));

  [
    'MESSAGING_FLAG_CHECK_FAILED',
    'MESSAGING_IDEMPOTENCY_CHECK_FAILED',
    'MESSAGING_RATE_LIMIT_CHECK_FAILED',
    'MESSAGING_RETRY_MARK_FAILED',
    'function getMessagingBoundedStringLogContext(label: string, value: unknown)',
    "...getMessagingBoundedStringLogContext('eventType', context.eventType)",
    "...getMessagingBoundedStringLogContext('status', context.status)",
    "logger.info('[Messaging] Feature disabled, skipping', getMessagingOperationLogContext({ eventType }))",
    "logger.warn('[Messaging] No template for event', getMessagingOperationLogContext({ eventType }))",
    "logger.error('[Messaging] Feature flag check failed, skipping send'",
    "logger.error('[Messaging] Idempotency check failed, skipping send'",
    "logger.error('[Messaging] Rate limit check failed, skipping send'",
    "logger.error('[Messaging] Retry send failed while marking retry consumed'",
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.storeId)',
    'normalizeOwnerNotificationNumericScopeDocumentId(payload.tenantId)',
    'normalizeOwnerNotificationReferenceId(payload.referenceId)',
    'normalizeOwnerNotificationNumericScopeAliases(tenantAliases)',
    'normalizeOwnerNotificationNumericScopeAliases(storeAliases)',
    'claimMessageDelivery({',
    'transaction.create(claimRef, {',
    'db.collection(DB_COLLECTIONS.MESSAGE_LOGS).doc(documentId).set(log, { merge: true })',
    'return true;',
  ].forEach((token) => assertIncludes(messagingEngine, token, 'Functions legacy lifecycle messaging fail-closed diagnostics'));

  [
    'return false; // Fail-open: allow send if check fails',
    'return false; // Fail-open',
    '} catch {\n    // Fail-open',
    '} catch {\n    return false; // Fail-open',
    '} catch {\n        await msgDoc.ref.update',
    'eventType: typeof context.eventType === \'string\' ? context.eventType : String(context.eventType || \'\')',
    'status: typeof context.status === \'string\' ? context.status : String(context.status || \'\')',
    "logger.info('[Messaging] Feature disabled, skipping', { eventType })",
    "logger.warn('[Messaging] No template for event', { eventType })",
  ].forEach((token) => assertNotIncludes(messagingEngine, token, 'Functions legacy lifecycle messaging fail-open/silent paths'));

  [
    'const SMTP_MIN_PORT = 1;',
    'const SMTP_MAX_PORT = 65535;',
    'function parseSmtpPort(rawPort: string | undefined): number | null',
    'if (!/^\\d+$/.test(normalizedPort)) return null;',
    'Number.isSafeInteger(port) && port >= SMTP_MIN_PORT && port <= SMTP_MAX_PORT',
    'const port = parseSmtpPort(process.env.SMTP_PORT);',
    'if (!host || port === null || !user || !hasPassword)',
    'hasPort: Boolean(String(process.env.SMTP_PORT ?? \'\').trim())',
    'smtpPortValid: port !== null',
    'secure: port === 465',
    'connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS',
    'greetingTimeout: SMTP_GREETING_TIMEOUT_MS',
    'socketTimeout: SMTP_SOCKET_TIMEOUT_MS',
    'MAX_SMTP_PROVIDER_MESSAGE_ID_LENGTH = 200',
    'normalizeProviderMessageId(info.messageId)',
  ].forEach((token) => assertIncludes(smtpProvider, token, 'Functions SMTP provider port fail-closed boundary'));

  assertIncludes(
    operationsTrigger,
    'referenceId: `menu-publish-failed-${storeId}-${new Date().toISOString().slice(0, 10)}`',
    'Publish verification failure notification daily dedupe boundary',
  );
  assertNotIncludes(
    operationsTrigger,
    'referenceId: `menu-publish-failed-${storeId}-${Date.now()}`',
    'Publish verification failure notification daily dedupe boundary',
  );

  [
    "parseInt(process.env.SMTP_PORT || '587', 10)",
    'parseInt(process.env.SMTP_PORT',
    "process.env.SMTP_PORT || '587'",
    'const port = 587',
    'SMTP_PORT ||',
  ].forEach((token) => assertNotIncludes(smtpProvider, token, 'Functions SMTP provider must not keep implicit port fallback'));

  [
    'STALENESS_LIFECYCLE_DELIVERY_FAILED',
    "analyticsLogger.warn('[StalenessCheck] Lifecycle message delivery failed after detection log'",
    "failureCode: STALENESS_LIFECYCLE_DELIVERY_FAILED",
    "eventType: 'MENU_STALE'",
    'storeId: getAnalyticsIdContext(sId)',
    'tenantId: getAnalyticsIdContext(tId)',
    'referenceId: getAnalyticsIdContext(staleReferenceId)',
    'messageLogWritten: true',
    "fallbackPolicy: 'keep_detection_cooldown_and_continue'",
    'error: getAnalyticsErrorContext(deliveryError)',
    'normalizeOwnerNotificationNumericScopeDocumentId(storeData.tId)',
    'claimStalenessDetection(db, {',
    'return db.runTransaction(async (transaction) => {',
    'getStalenessCheckpointId(params.tId, params.sId)',
  ].forEach((token) => assertIncludes(stalenessCheck, token, 'Functions staleness lifecycle delivery diagnostics'));

  [
    '} catch {\n                    // Detection cooldown remains intact even if delivery fails.',
    'db.collection(DB_COLLECTIONS.MESSAGE_LOGS).add({',
  ].forEach((token) => assertNotIncludes(stalenessCheck, token, 'Functions staleness lifecycle delivery silent catch'));
}

function verifyMonitor(monitor, responseHelper) {
  [
    "platformRole === 'PLATFORM'",
    'Access restricted to platform administrators.',
    '!FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_OPS_DASHBOARD',
    "fetch(`/api/ops/owner-notifications?",
    "fetch('/api/ops/owner-notifications'",
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'readOwnerNotificationSnapshotResponse(response',
    'readOwnerNotificationActionResponse(response',
    "message.error('Failed to load owner notifications')",
    "message.error('Owner notification action failed')",
    'formatMonitorError',
    'copyRuntimeTextToClipboard',
    'openIsolatedBrowserUrl(whatsappWebHref',
    'Record Manual',
    'Cost-bounded monitor',
    'Current persisted platform authorization and one bounded recent-event window drive rows and counts.',
    'Read cost:',
  ].forEach((token) => assertIncludes(monitor, token, 'Owner notification monitor UI'));

  [
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_JSON_MAX_BYTES = 256 * 1024',
    'readJsonResponseWithLimit<unknown>',
    "value.feature.accessModel === 'current_persisted_platform_user'",
    'isNonNegativeSafeInteger(value.authReads)',
    'value.feature.realtimeListeners === false',
    'isOwnerNotificationEventRow',
    'isOwnerNotificationDeliveryRow',
    'isOwnerNotificationOpsCost',
    "logRuntimeFailure(OWNER_NOTIFICATION_MONITOR_RESPONSE_PARSE_FAILED",
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_REJECTED',
    'OWNER_NOTIFICATION_MONITOR_RESPONSE_INVALID',
  ].forEach((token) => assertIncludes(responseHelper, token, 'Owner notification monitor response helper'));

  [
    'response.json()',
    '.json().catch',
    'error.message',
    'await navigator.clipboard.writeText',
  ].forEach((token) => assertNotIncludes(monitor + responseHelper, token, 'Owner notification monitor client boundary'));
}

function verifyTemplateOutputBoundaries(menuTemplate, answerlatticeTemplate, appLifecycleTemplate, functionsLifecycleTemplate) {
  [
    'MAX_OWNER_NOTIFICATION_TEXT_LENGTH',
    'MAX_OWNER_NOTIFICATION_URL_LENGTH',
    'PUBLISH_FAILURE_OWNER_COPY',
    'DEFAULT_PUBLISH_FAILURE_OWNER_COPY',
    'MENU_STALE_REASON_OWNER_COPY',
    'DEFAULT_MENU_STALE_REASON_OWNER_COPY',
    'MENU_TARGET_REJECTED',
    'function urlValue(value: unknown): string',
    'function publishFailureReasonText(value: unknown): string',
    'function menuStaleReasonText(value: unknown): string',
    'const publishFailureReason = publishFailureReasonText(metadata.failureReason);',
    'const menuStaleReason = menuStaleReasonText(metadata.reason);',
  ].forEach((token) => assertIncludes(menuTemplate, token, 'MenuList owner notification template output boundary'));

  [
    'MAX_OWNER_NOTIFICATION_TEXT_LENGTH',
    'MAX_OWNER_NOTIFICATION_URL_LENGTH',
    'WIDGET_CONNECTION_FAILURE_OWNER_COPY',
    'SOURCE_SYNC_FAILURE_OWNER_COPY',
    'HIGH_PRIORITY_ESCALATION_OWNER_COPY',
    'function urlValue(value: unknown): string',
    'function ownerFailureReasonText(',
    'const widgetFailureReason = ownerFailureReasonText(',
    'const sourceSyncFailureReason = ownerFailureReasonText(',
    'const highPriorityReason = ownerFailureReasonText(',
    "url.protocol === 'http:' || url.protocol === 'https:'",
  ].forEach((token) => assertIncludes(answerlatticeTemplate, token, 'Answerlattice owner notification template output boundary'));

  [
    'MAX_TEMPLATE_TEXT_LENGTH',
    'MAX_TEMPLATE_URL_LENGTH',
    'PUBLISH_FAILURE_OWNER_COPY',
    'DEFAULT_PUBLISH_FAILURE_OWNER_COPY',
    'MENU_TARGET_REJECTED',
    'function escapeHtml(value: unknown): string',
    'function urlValue(value: unknown): string',
    'function publishFailureReasonText(value: unknown): string',
    'MENU_PUBLISH_FAILED',
    'AI features such as image generation, descriptions, and translations',
    '&& !url.username',
    '&& !url.password',
  ].forEach((token) => {
    assertIncludes(appLifecycleTemplate, token, 'App lifecycle template output boundary');
    assertIncludes(functionsLifecycleTemplate, token, 'Functions lifecycle template output boundary');
  });

  ['&& !url.username', '&& !url.password'].forEach((token) => {
    assertIncludes(menuTemplate, token, 'MenuList owner notification credential-free URL boundary');
    assertIncludes(answerlatticeTemplate, token, 'Answerlattice owner notification credential-free URL boundary');
  });

  [
    "textValue(metadata.failureReason, 'The public menu check failed.')",
    "failureReason || 'The public menu check failed.'",
    'AI-powered features',
    '${m.publicUrl}',
    '<a href="${publicUrl}"',
    "const { storeName, failureReason } = meta;",
    "${storeName || 'your business'}",
    "textValue(metadata.reason, 'Menu information may be older than expected.')",
  ].forEach((token) => {
    assertNotIncludes(menuTemplate, token, 'MenuList owner notification template raw output boundary');
    assertNotIncludes(appLifecycleTemplate, token, 'App lifecycle template raw output boundary');
    assertNotIncludes(functionsLifecycleTemplate, token, 'Functions lifecycle template raw output boundary');
  });

  [
    "textValue(metadata.failureReason, 'Connection check failed.')",
    "textValue(metadata.failureReason, 'Sync failed.')",
    "textValue(metadata.reason, 'A high priority escalation was created.')",
    '<a href="${actionUrl}"',
  ].forEach((token) => assertNotIncludes(answerlatticeTemplate, token, 'Answerlattice owner notification template raw output boundary'));
}

function verifyDocsAndPackage(
  packageJson,
  specDoc,
  implDoc,
  firebaseDoc,
  mobileDoc,
  helpDoc,
  auditDoc,
  changelogDoc,
  lifecycleImplDoc,
  lifecycleFirebaseDoc,
) {
  [
    '"verify:owner-notifications-boundary": "node scripts/verification/verify-owner-notifications-boundary.js && npm run test:platform-notification-recipient && npm run test:notification-template-url-boundary && npm run test:owner-notification-manual-action"',
    '"test:owner-notification-manual-action": "ts-node --compiler-options',
    '"test:owner-notification-delivery-boundaries":',
    '"test:notification-template-url-boundary":',
    '"test:platform-notification-recipient":',
  ].forEach((token) => assertIncludes(packageJson, token, 'package.json owner notification verifier'));

  [
    'Implemented source evidence; not current launch certification',
    'Current release boundary (July 16, 2026)',
    '`npm run verify:owner-notifications-boundary`',
    'scoped provider smoke for SMTP/WhatsApp where enabled',
    'platform recovery monitor browser QA',
    'target Firebase deploy evidence where Functions logic changes',
    'target Vercel deploy evidence where app routes change',
  ].forEach((token) => assertIncludes(specDoc, token, 'Owner notification spec docs'));

  [
    'Launch boundary:** Not current launch certification or deploy approval.',
    'This implementation plan is source-gated owner-notification runtime evidence only; owner-notification release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:owner-notifications-boundary`, SMTP/WhatsApp provider smoke where enabled, authenticated owner settings/status QA for the target owner surface, platform recovery monitor browser QA, target Firebase deploy evidence where Functions logic changes, target Vercel deploy evidence where app routes change, and production-host smoke.',
    'Queue-first',
    'copied byte-for-byte to `functions/src/sharedData/ownerNotificationRegistry.ts`',
    'platformRole === \'PLATFORM\'',
    'no realtime listener',
    'rejects bodies above 8KB before event reads',
    'simple Firestore document ID',
    'Dashboard load/action responses are parsed by the shared owner-notification client response helper',
    'July 5 template-output follow-up',
    'Arbitrary `metadata.failureReason` and `metadata.reason` text are no longer printed',
    'July 5 Answerlattice template-output follow-up',
    'Arbitrary `metadata.failureReason` and `metadata.reason` strings are no longer printed',
    'July 6 recipient-scope document-ID follow-up',
    '`normalizeOwnerNotificationRecipientDocumentId()`',
    '`normalizeMenuListOwnerNotificationScopeDocumentId()`',
    'owner_notification_lifecycle_flag_check_failed',
    'trigger presence/length/type metadata only',
    'Source gate: `npm run verify:owner-notifications-boundary`',
    'July 10 transactional tenant-boundary follow-up',
    '`processingAttempt`',
    '`scope_not_found_or_mismatch`',
    '`metadata.manualRecipientOverride === true`',
    'August 1 platform-recovery correction',
    'immutable action fingerprint',
    'changed effect dimension returns 409',
    '`npm run test:owner-notification-delivery-boundaries`',
  ].forEach((token) => assertIncludes(implDoc, token, 'Owner notification implementation docs'));

  [
    'Launch boundary:** Not current launch certification or deploy approval.',
    'This Firebase/cost plan is source-gated owner-notification runtime and cost evidence only; owner-notification release approval still requires current production-readiness audit evidence, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:owner-notifications-boundary`, SMTP/WhatsApp provider smoke where enabled, authenticated owner settings/status QA for the target owner surface, platform recovery monitor browser QA, target Firebase deploy evidence where Functions logic changes, target Vercel deploy evidence where app routes change, and production-host smoke.',
    'canonical top-level `stores/{storeId}` first',
    'The July 5 template output boundary update adds no Firestore reads/writes/deletes',
    'The July 5 Answerlattice template output boundary update also adds no Firestore reads/writes/deletes',
    'The July 6 recipient-scope document-ID boundary is Firebase-cost neutral',
    '`normalizeMenuListOwnerNotificationScopeDocumentId()` rejects malformed',
    'fixed owner copy instead of arbitrary `failureReason` or `reason` strings',
    'The July 5 Functions owner-notification flag/trigger diagnostics',
    'existing attempted `ops_config/system` read',
    'requires a scoped Firebase Functions deploy after validation',
    'Current Owner Notifications Functions retry evidence must start with `npm run verify:functions-deploy-preflight`',
    'External Certification Runbook Gate 1 against `menulist-qa`',
    'record the exact scoped target list and reason in `__docs__/audits/menulist-production-readiness-audit.md` before retry',
    'Production deploys require QA evidence and explicit production deploy approval.',
    'do not reuse older broad Functions command shapes',
    '`ownerNotificationEvents(productId ASC, status ASC, updatedAt ASC)`',
    '`ownerNotificationDeliveries(productId ASC, status ASC, createdAt ASC)`',
    '`ownerNotificationDeliveries(productId ASC, eventId ASC, createdAt DESC)`',
    '`ownerNotificationEvents(productId ASC, updatedAt DESC)`',
    'The platform dashboard at `/ops/owner-notifications` is intentionally manual and bounded',
    'GET and POST keep signed platform admission',
    'simple Firestore document ID',
    'does not run Firestore reads/writes, SMTP, WhatsApp, browser smoke, Firebase deploy, or Vercel deploy',
    'July 10 tenant/idempotency follow-up',
    '`scope_not_found_or_mismatch`',
    'July 10 deploy evidence',
    'No target was uploaded',
    'August 1 ops manual-send convergence',
    'replay of an existing deterministic manual action adds one direct event read',
  ].forEach((token) => assertIncludes(firebaseDoc, token, 'Owner notification Firebase docs'));
  [
    'firebase deploy --only functions:',
    'PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH" firebase deploy --only functions',
  ].forEach((token) => assertNotIncludes(firebaseDoc, token, 'Owner notification Firebase docs stale deploy command'));

  [
    'Local source boundary complete; no owner notification-center/settings surface is currently shipped',
    'Current release boundary (July 16, 2026)',
    'Full delivery log table.',
    'Detailed delivery logs belong in platform/admin views.',
    '`npm run verify:owner-notifications-boundary`',
    'authenticated mobile settings/status QA for any owner-facing setup surface in release scope',
  ].forEach((token) => assertIncludes(mobileDoc, token, 'Owner notification mobile docs'));

  [
    'Source-bounded help draft; not current support-publication approval',
    'not current launch approval',
    'Current publication boundary (July 16, 2026)',
    'It is not current launch approval, support-publication approval, or website approval.',
    '`npm run verify:owner-notifications-boundary`',
    'SMTP/WhatsApp provider smoke where enabled',
    'authenticated owner settings/status QA for the target surface',
    'When notification settings are exposed in the target owner surface:',
  ].forEach((token) => assertIncludes(helpDoc, token, 'Owner notification help docs'));

  [
    [specDoc, '**Status:** Ready for implementation planning', 'Owner notification spec stale planning status'],
    [mobileDoc, '**Status:** Ready for implementation planning', 'Owner notification mobile stale planning status'],
    [helpDoc, '**Status:** Help draft for future implementation', 'Owner notification help stale future-publication status'],
    [helpDoc, 'When the feature is available:', 'Owner notification help stale availability wording'],
  ].forEach(([source, token, label]) => assertNotIncludes(source, token, label));

			  [
			    'Owner notification boundary source gate: `npm run verify:owner-notifications-boundary`',
			    'Owner notification recipient scope document-ID boundary checkpoint',
			    'Owner Notifications technical-doc top-boundary checkpoint',
			    'Owner notification ops event-id boundary checkpoint',
			    'source-only owner-notification registry/API/processor/monitor/docs gate',
			    'Legacy lifecycle event/status diagnostics checkpoint',
			    'Owner-notification flag and trigger diagnostics checkpoint',
			    'functions:verifyMenuPublish,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler',
			    'Cloud Resource Manager HTTP 403 caller permission',
    'Owner notification template output boundary checkpoint',
        'MenuList stale menu notification reason boundary checkpoint',
        'Answerlattice owner notification template output boundary checkpoint',
		    'Owner Notifications doc-boundary checkpoint',
		    'Owner Notifications deploy retry doc-boundary checkpoint',
		    'Lifecycle messaging fail-closed checkpoint',
		    'SMTP port configuration fail-closed checkpoint',
		    'Staleness lifecycle delivery diagnostics checkpoint',
		    'Owner-notification tenant/idempotency checkpoint',
		    'Owner-notification restart 16 Firebase deploy checkpoint',
		    'Owner-notification manual-recovery convergence checkpoint',
		  ].forEach((token) => assertIncludes(auditDoc, token, 'Production audit owner notification checkpoint'));

			  [
			    'Legacy Lifecycle Event/Status Diagnostics',
			    'Owner Notifications technical docs have top launch boundaries',
			    'Owner Notification Recipient Scope Document ID Boundary',
			    'raw event/status strings',
			    'Owner Notification Flag and Trigger Diagnostics',
			    'owner_notification_lifecycle_flag_check_failed',
			    'raw trigger text',
			    'Owner Notifications Doc Boundary',
		    'Owner Notifications Deploy Retry Doc Boundary',
		    'Owner Notification Template Output Boundary',
          'Owner Notification Manual-Recovery Convergence',
          'MenuList Stale Menu Notification Reason Boundary',
          'Answerlattice Owner Notification Template Output Boundary',
		    'Lifecycle Messaging Fail Closed',
		    'SMTP Port Configuration Fail Closed',
		    'Staleness Lifecycle Delivery Diagnostics',
		    'Owner Notification Tenant And Delivery Claim Boundary',
		    '`npm run verify:owner-notifications-boundary`',
		  ].forEach((token) => assertIncludes(changelogDoc, token, 'Changelog owner notification checkpoint'));

	  [
	    'Functions legacy lifecycle fail-closed follow-up',
	    'idempotency or daily rate-limit read cannot be completed',
	    'skips the legacy email send instead of sending optimistically',
	    'Legacy lifecycle event/status diagnostics follow-up',
	    'event type and delivery status values are logged as presence/length/type metadata only',
		    'SMTP port fail-closed follow-up',
		    '`SMTP_PORT` is missing, malformed, or outside `1..65535`',
		    'Staleness lifecycle delivery diagnostics follow-up',
		    'logs `STALENESS_LIFECYCLE_DELIVERY_FAILED`',
		    'Template output boundary follow-up',
		    'arbitrary `failureReason` strings cannot print into owner emails',
		    'Owner-notification migration flag-read follow-up',
		    'owner_notification_lifecycle_flag_check_failed',
		    'July 10, 2026 Transactional Delivery Boundary',
		    'deterministic SHA-256 `messageLogs` document',
			  ].forEach((token) => assertIncludes(lifecycleImplDoc, token, 'Lifecycle messaging implementation fail-closed docs'));

			  [
			    'July 5 Functions fail-closed update',
			    'failed idempotency and rate-limit checks add zero SMTP sends and zero `messageLogs` writes',
			    'July 5 legacy lifecycle event/status diagnostic update',
			    'does not add Firestore reads/writes',
			    'July 5 owner-notification migration diagnostics update',
			    'Stored unknown-trigger rows keep the existing single skipped-event merge',
			    'July 5 SMTP port fail-closed update',
		    'missing or invalid `SMTP_PORT` adds zero SMTP sends',
		    'July 5 staleness delivery diagnostics update',
		    'adds no Firestore reads or writes beyond the already-written staleness detection row',
		    'July 10, 2026 Transaction And Tenant Cost Boundary',
		    '`messageLogs/{sha256}` transaction claim',
		    'July 5 template output update',
		    'publish-health failure codes render fixed owner copy instead of arbitrary `failureReason` strings',
		  ].forEach((token) => assertIncludes(lifecycleFirebaseDoc, token, 'Lifecycle messaging Firebase fail-closed docs'));
}

function verifyOwnerNotificationsBoundary() {
  const files = {
    packageJson: read('package.json'),
    appRegistry: read('src/data/shared/ownerNotificationRegistry.ts'),
    functionsRegistry: read('functions/src/sharedData/ownerNotificationRegistry.ts'),
    appDeliveryBoundary: read('src/data/shared/ownerNotificationDeliveryBoundary.ts'),
    functionsDeliveryBoundary: read('functions/src/sharedData/ownerNotificationDeliveryBoundary.ts'),
    appPlatformRecipient: read('src/data/shared/platformNotificationRecipient.ts'),
    functionsPlatformRecipient: read('functions/src/sharedData/platformNotificationRecipient.ts'),
    firestoreIndexes: read('firestore.indexes.json'),
    answerlatticeFirestoreIndexes: read('firestore-answerlattice.indexes.json'),
    firestoreDocumentId: read('src/lib/firebase/firestoreDocumentId.ts'),
    route: read('src/app/api/ops/owner-notifications/route.ts'),
    manualActionBoundary: read('src/lib/ops/ownerNotificationManualAction.ts'),
    core: read('src/lib/owner-notifications/index.ts'),
    formatters: read('src/lib/owner-notifications/formatters.ts'),
    appLifecycle: read('src/lib/messaging/index.ts'),
    recipientResolver: read('src/lib/owner-notifications/recipientResolver.ts'),
    types: read('src/lib/owner-notifications/types.ts'),
    whatsappChannel: read('src/lib/owner-notifications/channels/whatsapp.ts'),
    appWhatsAppProvider: read('src/lib/whatsapp-os/provider.ts'),
    emailChannel: read('src/lib/owner-notifications/channels/email.ts'),
    processor: read('functions/src/ownerNotifications/processor.ts'),
    functionsWhatsAppProvider: read('functions/src/whatsappOs/provider.ts'),
    messagingEngine: read('functions/src/messaging/messagingEngine.ts'),
    smtpProvider: read('functions/src/messaging/providers/resend.ts'),
    stalenessCheck: read('functions/src/analytics/stalenessCheck.ts'),
    operationsTrigger: read('functions/src/triggers/operations.ts'),
    ownerHeader: read('src/components/organisms/headerComponent/index.tsx'),
    scheduler: read('functions/src/schedulers/menulistMaintenanceScheduler.ts'),
    monitor: read('src/components/templates/main-app/platform/ownerNotificationMonitor/index.tsx'),
    responseHelper: read('src/lib/ops/ownerNotificationClientResponse.ts'),
    menuTemplate: read('src/lib/owner-notifications/templates/menulist.ts'),
    answerlatticeTemplate: read('src/lib/owner-notifications/templates/answerlattice.ts'),
    appLifecycleTemplate: read('src/lib/messaging/templates.ts'),
    functionsLifecycleTemplate: read('functions/src/messaging/templates.ts'),
    specDoc: read('__docs__/owner-notifications/owner-notifications_spec.md'),
    implDoc: read('__docs__/owner-notifications/owner-notifications_impl.md'),
    firebaseDoc: read('__docs__/owner-notifications/owner-notifications_firebase.md'),
    lifecycleImplDoc: read('__docs__/lifecycle-messaging/lifecycle-messaging_impl.md'),
    lifecycleFirebaseDoc: read('__docs__/lifecycle-messaging/lifecycle-messaging_firebase.md'),
    mobileDoc: read('__docs__/owner-notifications/owner-notifications_mobile-support.md'),
    helpDoc: read('__docs__/owner-notifications/owner-notifications_helpdoc.md'),
    auditDoc: read('__docs__/audits/menulist-production-readiness-audit.md'),
    changelogDoc: read('__docs__/changelog.md'),
  };

  verifyRegistryMirror(files.appRegistry, files.functionsRegistry);
  verifyDeliveryBoundaryMirror(files.appDeliveryBoundary, files.functionsDeliveryBoundary);
  verifyPlatformRecipientMirror(files.appPlatformRecipient, files.functionsPlatformRecipient);
  verifyLifecycleSubscriptionIndexes(files.firestoreIndexes, files.answerlatticeFirestoreIndexes);
  verifyFirestoreDocumentIdHelper(files.firestoreDocumentId);
  verifyOpsRoute(files.route);
  verifyManualActionBoundary(files.manualActionBoundary);
  verifyCore(
    files.core,
    files.recipientResolver,
    files.types,
    files.emailChannel,
    files.whatsappChannel,
    files.appWhatsAppProvider,
    files.appLifecycle,
    files.ownerHeader,
  );
  verifyOwnerNotificationFormatters(files.formatters);
  verifyFunctionsProcessor(
    files.processor,
    files.functionsWhatsAppProvider,
    files.scheduler,
    files.messagingEngine,
    files.smtpProvider,
    files.stalenessCheck,
    files.operationsTrigger,
  );
  verifyMonitor(files.monitor, files.responseHelper);
  verifyTemplateOutputBoundaries(
    files.menuTemplate,
    files.answerlatticeTemplate,
    files.appLifecycleTemplate,
    files.functionsLifecycleTemplate,
  );
  verifyDocsAndPackage(
    files.packageJson,
    files.specDoc,
    files.implDoc,
    files.firebaseDoc,
    files.mobileDoc,
    files.helpDoc,
    files.auditDoc,
    files.changelogDoc,
    files.lifecycleImplDoc,
    files.lifecycleFirebaseDoc,
  );

  console.log('Owner notifications boundary verifier passed');
}

verifyOwnerNotificationsBoundary();
