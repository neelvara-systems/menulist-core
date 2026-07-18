#!/usr/bin/env node

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'CommonJS' },
});
require('tsconfig-paths/register');

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const {
  ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES,
  ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS,
  normalizeAnswerlatticeFeedbackDocumentId,
  normalizeAnswerlatticeFeedbackRecord,
  normalizeAnswerlatticeFeedbackSubmission,
} = require(path.join(ROOT, 'src/lib/answerlattice/feedbackBoundary.ts'));
const { Timestamp } = require('firebase/firestore');
const {
  normalizeContentFeedbackItem,
} = require(path.join(ROOT, 'src/database/contentFeedback/index.ts'));
const {
  getContentFeedbackStorageKey,
  normalizeContentFeedbackStorageEnvelope,
} = require(path.join(ROOT, 'src/lib/contentFeedbackStorage/index.ts'));

const general = normalizeAnswerlatticeFeedbackSubmission({
  type: 'general',
  rating: 5,
  comment: '  Clear\n and useful.  ',
  attackerControlled: 'must be dropped',
});
assert(
  JSON.stringify(general) === JSON.stringify({ type: 'general', rating: 5, comment: 'Clear and useful.' }),
  'general feedback must normalize whitespace and project only admitted fields',
);

const featureUsage = normalizeAnswerlatticeFeedbackSubmission({
  type: 'feature_usage',
  featureIssues: [ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES[0]],
});
assert(featureUsage?.featureIssues?.length === 1, 'feature usage must admit a canonical issue');

const legacyFeatureRequest = normalizeAnswerlatticeFeedbackSubmission({
  type: 'feature_request',
  votedPopularRequests: [{
    feature: ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS[0],
    interested: true,
  }],
});
assert(legacyFeatureRequest?.type === 'feature_requests', 'legacy feature_request input must normalize to the persisted type');

assert(normalizeAnswerlatticeFeedbackSubmission({ type: 'general', rating: 0, comment: 'No' }) === null, 'rating zero must fail closed');
assert(normalizeAnswerlatticeFeedbackSubmission({ type: 'general', rating: 5, comment: 'x'.repeat(1001) }) === null, 'oversized feedback must fail closed');
assert(normalizeAnswerlatticeFeedbackSubmission({ type: 'feature_usage' }) === null, 'empty feature usage must fail closed');
assert(normalizeAnswerlatticeFeedbackSubmission({ type: 'feature_usage', featureIssues: ['Unknown issue'] }) === null, 'unknown feature issues must fail closed');
assert(normalizeAnswerlatticeFeedbackSubmission({
  type: 'feature_requests',
  votedPopularRequests: [
    { feature: ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS[0], interested: true },
    { feature: ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS[0], interested: false },
  ],
}) === null, 'duplicate popular-request votes must fail closed');
assert(normalizeAnswerlatticeFeedbackDocumentId(' feedback-1 ') === 'feedback-1', 'feedback IDs must trim safely');
assert(normalizeAnswerlatticeFeedbackDocumentId('tenant/feedback') === null, 'feedback IDs containing a path separator must fail closed');
assert(normalizeAnswerlatticeFeedbackDocumentId('__reserved__') === null, 'reserved feedback IDs must fail closed');

const persisted = normalizeAnswerlatticeFeedbackRecord({
  ...general,
  tId: 1,
  sId: 101,
  uId: 'user-1',
  createdOn: Timestamp.fromMillis(1_700_000_000_000),
  sourceContext: null,
}, 'feedback-1');
assert(persisted?.pId === 'AL', 'legacy Answerlattice feedback without pId must normalize to collection ownership');
assert(normalizeAnswerlatticeFeedbackRecord({
  ...persisted,
  sourceContext: { uId: 'user-1', name: 'User', email: 'user@example.com', secret: 'no' },
}, 'feedback-1') === null, 'persisted feedback with unadmitted source-context fields must fail closed');
assert(normalizeAnswerlatticeFeedbackRecord({
  ...persisted,
  createdOn: 'not-a-timestamp',
}, 'feedback-1') === null, 'persisted feedback with an invalid timestamp must fail closed');

const contentFeedbackItem = normalizeContentFeedbackItem({
  comment: '<script>unsafe()</script> Useful note',
  sentiment: 'dislike',
  action: 'added',
  createdOn: Timestamp.fromMillis(1_700_000_000_000),
  uId: 'user-1',
  userName: 'Feedback User',
  sourceContext: { uId: 'user-1', name: 'Feedback User', email: 'user@example.com' },
});
assert(contentFeedbackItem?.sentiment === 'dislike', 'valid content feedback audit items must normalize');
assert(!contentFeedbackItem?.comment.includes('<script>'), 'legacy content feedback comments must be sanitized on read');
assert(normalizeContentFeedbackItem({
  ...contentFeedbackItem,
  sentiment: 'unknown',
}) === null, 'invalid persisted content-feedback sentiment must fail closed');
assert(normalizeContentFeedbackItem({
  ...contentFeedbackItem,
  createdOn: 'invalid',
}) === null, 'invalid persisted content-feedback timestamps must fail closed');

const storageScope = { tId: 1, sId: 101 };
const storageEnvelope = normalizeContentFeedbackStorageEnvelope({
  version: 1,
  tId: 1,
  sId: 101,
  userId: 'user-1',
  entries: {
    'article-1': {
      itemId: 'article-1',
      type: 'like',
      timestamp: '2026-07-11T00:00:00.000Z',
    },
  },
}, storageScope, 'user-1');
assert(storageEnvelope?.entries['article-1']?.type === 'like', 'valid scoped reaction cache must normalize');
assert(Object.getPrototypeOf(storageEnvelope.entries) === null, 'reaction cache maps must use a null prototype');
assert(normalizeContentFeedbackStorageEnvelope({
  ...storageEnvelope,
  sId: 102,
}, storageScope, 'user-1') === null, 'cross-store reaction cache must fail closed');
assert(normalizeContentFeedbackStorageEnvelope({
  ...storageEnvelope,
  entries: { 'article-1': { ...storageEnvelope.entries['article-1'], private: true } },
}, storageScope, 'user-1') === null, 'reaction cache entries with unknown fields must fail closed');
assert(getContentFeedbackStorageKey('article', storageScope, 'user/1').includes(':1:101:user%2F1'), 'reaction cache keys must include scope and encoded user identity');

const dal = read('src/database/feedback/index.ts');
const rules = read('firestore-answerlattice.rules');
const generalFeedback = read('src/components/templates/main-app/helpCenter/GeneralFeedback.tsx');
const featureUsageSource = read('src/components/templates/main-app/helpCenter/FeatureUsage.tsx');
const featureRequestsSource = read('src/components/templates/main-app/helpCenter/FeatureRequests.tsx');
const contentFeedbackDal = read('src/database/contentFeedback/index.ts');
const contentFeedbackContracts = read('src/lib/answerlattice/contentFeedbackContracts.ts');
const contentFeedbackServer = read('src/lib/answerlattice/contentFeedbackServer.ts');
const contentFeedbackRoute = read('src/app/api/answerlattice/content-feedback/route.ts');
const genericFeedbackDal = read('src/database/feedback/genericFeedback.ts');
const feedbackHook = read('src/hooks/useFeedback.ts');
const articleView = read('src/components/organisms/ArticleView/index.tsx');
const changelogPreview = read('src/components/templates/platform/changelog/ChangelogPreview.tsx');
const articleDal = read('src/database/knowledgeBase/articles.ts');
const changelogDal = read('src/database/changelog/index.ts');
const customerIdentity = read('src/lib/answerlattice/customerIdentity.ts');
const contentFeedbackStorage = read('src/lib/contentFeedbackStorage/index.ts');
const packageJson = JSON.parse(read('package.json'));
const widgetFeedbackRoute = read('src/app/api/widget/feedback/route.ts');
const widgetClient = read('src/app/widget/[apiKey]/WidgetClient.tsx');
const nightly = read('functions-answerlattice/src/answerlattice/answerlatticeNightly.ts');

const feedbackValidationIndex = dal.indexOf('normalizeAnswerlatticeFeedbackSubmission(data)');
const feedbackComposerIndex = dal.indexOf('answerlatticeRequestBodyComposer(normalized');
assert(feedbackValidationIndex >= 0, 'feedback DAL must validate before composing a write');
assert(feedbackComposerIndex >= 0, 'feedback DAL must compose normalized feedback through the Answerlattice request-body composer');
assert(feedbackValidationIndex < feedbackComposerIndex, 'feedback validation must occur before metadata composition');
assert(dal.includes('normalizeAnswerlatticeFeedbackDocumentId(feedbackId)'), 'feedback surface updates must validate the document ID');
assert(dal.includes('normalizeAnswerlatticeFeedbackRecord(document.data(), document.id)'), 'feedback reads must normalize persisted records before returning them');
assert(dal.includes('normalizeExactAnswerlatticeSignalScopeId(feedback.tId)'), 'feedback signal dispatch must require exact tenant scope');
assert(dal.includes('feedback.pId !== PRODUCT_IDS.ANSWERLATTICE'), 'feedback signal dispatch must require exact product ownership');
assert(dal.includes('answerlattice_feedback_signal_dispatch_failed'), 'feedback signal dispatch failures must be observable');
assert(!dal.includes('.catch(() => undefined)'), 'feedback signal dispatch failures must not be silently discarded');
assert(generalFeedback.includes('ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH'), 'general feedback UI must share the text limit');
assert(featureUsageSource.includes("form.getFieldValue('featureIssues')"), 'feature usage UI must require an issue or comment before submission');
assert(featureUsageSource.includes('ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES'), 'feature usage UI must share the canonical issue list');
assert(featureRequestsSource.includes('ANSWERLATTICE_FEEDBACK_POPULAR_REQUESTS'), 'feature request UI must share the canonical vote list');
assert(contentFeedbackDal.includes('updateContentFeedbackWithAudit'), 'article/changelog feedback must expose one coupled mutation');
assert(contentFeedbackDal.includes("fetch('/api/answerlattice/content-feedback'"), 'content feedback mutations must use the authenticated server route');
assert(contentFeedbackDal.includes('AnswerlatticeContentFeedbackResultSchema.safeParse(payload)'), 'content feedback clients must validate server responses');
assert(!contentFeedbackDal.includes('runTransaction'), 'content feedback clients must not write counters or audit rows directly');
assert(contentFeedbackContracts.includes('.strict().superRefine('), 'content feedback requests must reject unknown fields and inconsistent actions');
assert(contentFeedbackServer.includes('await db.runTransaction(async (transaction) =>'), 'the server must couple content counters and audit history in one transaction');
assert(contentFeedbackServer.includes('transaction.update(contentRef'), 'the server transaction must update the source counter');
assert(contentFeedbackServer.includes('transaction.create(feedbackRef'), 'the server transaction must create the audit row atomically');
assert(contentFeedbackServer.includes('currentList.length < MAX_AUDIT_EVENTS'), 'content feedback audit rows must stop mutating at their cap');
assert(contentFeedbackServer.includes('recentFeedbackOperations'), 'content feedback mutations must retain bounded idempotency state');
assert(contentFeedbackServer.includes("doc(`content_feedback_${operationId}`)"), 'negative feedback signals must use a deterministic id');
assert(!contentFeedbackServer.includes('modifiedBy: actor.id'), 'reactions must not change content-author freshness metadata');
assert(contentFeedbackRoute.includes('readBoundedJsonBody(request, CONTENT_FEEDBACK_MAX_BODY_BYTES)'), 'content feedback requests must have a body cap');
assert(contentFeedbackRoute.includes("buildAnswerlatticeRateLimitKey('answerlattice-content-feedback'"), 'content feedback requests must be rate limited per scoped actor');
assert(contentFeedbackDal.includes('.map(normalizeContentFeedbackItem)'), 'content feedback reads must normalize persisted audit items');
assert(!contentFeedbackDal.includes('export const addContentFeedback'), 'the split audit-only writer must stay removed');
assert(genericFeedbackDal.includes('updateContentFeedbackWithAudit'), 'generic article/changelog helpers must use the coupled transaction');
assert(articleView.includes('updateContentFeedbackWithAudit({'), 'article UI must use the coupled transaction');
assert(changelogPreview.includes('updateContentFeedbackWithAudit({'), 'changelog UI must use the coupled transaction');
assert(!feedbackHook.includes('Promise.all('), 'feedback UI must not launch coupled side effects independently');
assert(!feedbackHook.includes('submitComment'), 'feedback hook must expose one acknowledged mutation instead of a split comment writer');
assert(feedbackHook.includes('mutationInFlightRef.current'), 'feedback hook must reject concurrent duplicate mutations');
assert(feedbackHook.includes('isSubmitting'), 'feedback hook must expose visible in-flight state');
assert(!articleDal.includes('export const updateArticleFeedback'), 'the split article-counter writer must stay removed');
assert(!changelogDal.includes('export const updateChangelogFeedback'), 'the split changelog-counter writer must stay removed');
assert(!customerIdentity.includes('...((session?.sourceContext'), 'actor snapshots must not spread arbitrary session source-context fields');
assert(contentFeedbackStorage.includes('content-feedback-v${CONTENT_FEEDBACK_STORAGE_VERSION}:${contentType}:${scope.tId}:${scope.sId}'), 'reaction cache keys must partition tenant/store');
assert(contentFeedbackStorage.includes('normalizeEnvelope(JSON.parse(stored) as unknown, scope, userId)'), 'reaction cache JSON must re-enter a runtime envelope boundary');
assert(contentFeedbackStorage.includes('localStorage.removeItem(key)'), 'invalid reaction caches must be evicted');
assert(contentFeedbackStorage.includes('CONTENT_FEEDBACK_STORAGE_MAX_ENTRIES = 500'), 'reaction cache growth must be bounded');
assert(feedbackHook.includes('setFeedbackGiven(feedbackStatus)'), 'workspace/content changes must clear stale reaction acknowledgement when no scoped entry exists');
assert(rules.includes('isValidAnswerlatticeFeedbackPayload(request.resource.data)'), 'feedback create rules must enforce the payload contract');
assert(rules.includes("affectedKeys().hasOnly([\n          'contextKey', 'surfaceId', 'surfaceLabel', 'surfaceAssignedBy', 'surfaceAssignedAt', 'modifiedBy', 'modifiedOn'"), 'feedback update rules must allow only review-surface assignment fields');
assert(!rules.includes('allow update: if isAnswerlatticeScopedUpdateWithSupportControl();\n      allow delete: if false;\n    }\n\n    match /supportTickets'), 'feedback updates must not retain the generic support-control mutation rule');
assert(rules.includes('match /changelog_feedback/{tId}/{sId}/{docId} {\n      allow read: if isAnswerlatticeContentFeedbackRead(tId, sId);\n      allow write: if false;'), 'changelog feedback mutations must be server-owned');
assert(rules.includes('match /article_feedback/{tId}/{sId}/{docId} {\n      allow read: if isAnswerlatticeContentFeedbackRead(tId, sId);\n      allow write: if false;'), 'article feedback mutations must be server-owned');
assert(rules.includes('match /changelog/{tId}/{sId}/{pageId} {'), 'scoped changelog pages must remain explicit in rules');
assert(rules.includes('// Changelog page mutations and reactions are server-owned'), 'dedicated changelog writes must document the server-owned boundary');
assert(packageJson.scripts['verify:answerlattice-feedback-boundary'] === 'node scripts/verification/verify-answerlattice-feedback-boundary.js', 'package must expose the feedback boundary verifier');
assert(packageJson.scripts['test:answerlattice-feedback:rules']?.includes('test-answerlattice-feedback-rules.ts'), 'package must expose the feedback rules emulator test');
assert(packageJson.scripts['test:answerlattice-content-feedback-contracts']?.includes('test-answerlattice-content-feedback-contracts.ts'), 'package must expose content-feedback contract tests');
assert(packageJson.scripts['test:answerlattice-content-feedback:emulator']?.includes('test-answerlattice-content-feedback-emulator.ts'), 'package must expose content-feedback server emulator tests');
assert(widgetFeedbackRoute.includes("resolutionOutcome: z.enum(['resolved', 'not_resolved']).optional()"), 'widget feedback must admit only explicit resolved/not-resolved outcomes');
assert(widgetFeedbackRoute.includes("resolutionOutcome === 'resolved' && value.isGood !== true"), 'widget feedback must reject inconsistent positive outcome payloads');
assert(widgetFeedbackRoute.includes('...(resolutionOutcome ? { resolutionOutcome } : {})'), 'widget feedback must persist explicit outcome on the existing search-history record');
assert(widgetClient.includes('Did this solve your issue?'), 'widget feedback must ask an explicit resolution question');
assert(widgetClient.includes("handleFeedback(msg.id, 'resolved')"), 'widget must submit explicit resolved outcomes');
assert(widgetClient.includes("handleFeedback(msg.id, 'not_resolved')"), 'widget must submit explicit not-resolved outcomes');
assert(nightly.includes('calculateConfirmedResolutionMetrics(coverageResult.historyRows, 24)'), 'nightly trust aggregation must reuse the existing bounded coverage rows with an explicit observation window');
assert(nightly.includes(".where('pId', '==', 'AL')"), 'nightly outcome history must remain Answerlattice product scoped');
assert(nightly.includes(".orderBy('createdOn', 'desc')\n            .limit(500)"), 'nightly outcome history must select the newest bounded 500-row sample');
assert(!nightly.includes("collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)\n                .where('resolutionOutcome'"), 'confirmed resolution must not add a second search-history query');

process.stdout.write('Answerlattice feedback boundary verification passed.\n');
