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

function assertThrows(action, message) {
  try {
    action();
  } catch {
    return;
  }
  throw new Error(message);
}

const {
  normalizeAnswerlatticeRetrievalFaq,
  normalizeAnswerlatticePublicFaq,
  normalizeAnswerlatticePublicFaqList,
  parseAnswerlatticeFaqSaveInput,
  projectAnswerlatticePublicFaq,
} = require(path.join(ROOT, 'src/lib/answerlattice/faqContent.ts'));
const {
  projectFaqLinkedArticleReference,
} = require(path.join(ROOT, 'src/lib/answerlattice/faqRetrieval.ts'));

const scope = { tId: 1, sId: 101 };
const persisted = {
  pId: 'AL',
  tId: 1,
  sId: 101,
  question: 'How do I publish?',
  answer: 'Open the article and select Publish.',
  status: 'published',
  active: true,
  articleId: 'article-1',
  tags: ['publishing'],
  likes: 4,
  dislikes: 1,
  createdBy: 'private-user-id',
  modifiedBy: 'private-editor-id',
  sourceContext: { email: 'private@example.com' },
  traceId: 'private-trace',
};

const projected = projectAnswerlatticePublicFaq(persisted, 'faq-1', scope);
assert(projected, 'valid published scoped FAQ must project');
assert(
  JSON.stringify(Object.keys(projected).sort())
    === JSON.stringify(['answer', 'articleId', 'dislikes', 'id', 'likes', 'question', 'tags']),
  'public FAQ projection must contain only the browser allowlist',
);
assert(!JSON.stringify(projected).includes('private'), 'public FAQ projection must strip internal identity and audit fields');
assert(projectAnswerlatticePublicFaq({ ...persisted, pId: 'ML' }, 'faq-1', scope) === null, 'cross-product persisted FAQ must fail projection');
assert(projectAnswerlatticePublicFaq({ ...persisted, sId: 102 }, 'faq-1', scope) === null, 'cross-store persisted FAQ must fail projection');
assert(projectAnswerlatticePublicFaq({ ...persisted, status: 'draft' }, 'faq-1', scope) === null, 'draft FAQ must fail public projection');
assert(projectAnswerlatticePublicFaq({ ...persisted, likes: '4' }, 'faq-1', scope) === null, 'string feedback counters must fail public projection');
assert(normalizeAnswerlatticePublicFaq({ ...projected, createdBy: 'leak' }) === null, 'client public FAQ boundary must reject unknown fields');
const { likes: _likes, ...missingLikes } = projected;
assert(normalizeAnswerlatticePublicFaq(missingLikes) === null, 'client public FAQ boundary must reject missing required fields');
assert(normalizeAnswerlatticePublicFaqList([projected])?.length === 1, 'client public FAQ list must admit exact DTOs');
assert(normalizeAnswerlatticePublicFaqList(Array.from({ length: 81 }, () => projected)) === null, 'client public FAQ list must enforce the public cap');

const retrievalFaq = {
  ...persisted,
  source: 'manual',
  articleTitle: 'Publishing',
  entityIds: ['publishing'],
  contextKeys: ['publishing'],
  sortOrder: 10,
};
assert(normalizeAnswerlatticeRetrievalFaq(retrievalFaq, 'faq-1', scope)?.id === 'faq-1', 'retrieval FAQ must admit exact persisted truth');
assert(normalizeAnswerlatticeRetrievalFaq({ ...retrievalFaq, pId: 'ML' }, 'faq-1', scope) === null, 'retrieval FAQ must reject cross-product truth');
assert(normalizeAnswerlatticeRetrievalFaq({ ...retrievalFaq, tId: '1' }, 'faq-1', scope) === null, 'retrieval FAQ must reject coercible tenant scope');
assert(normalizeAnswerlatticeRetrievalFaq({ ...retrievalFaq, tags: ['publishing', 'publishing'] }, 'faq-1', scope) === null, 'retrieval FAQ must reject normalized duplicate fields');

const linkedArticle = {
  pId: 'AL',
  tId: 1,
  sId: 101,
  status: 'published',
  active: true,
  deleted: false,
  title: 'Publishing',
  categoryId: 'getting-started',
  content: { type: 'doc' },
  tags: ['publishing'],
};
assert(projectFaqLinkedArticleReference(linkedArticle, 'article-1', scope, true)?.content, 'active published scoped FAQ article must project');
assert(projectFaqLinkedArticleReference({ ...linkedArticle, active: undefined }, 'article-1', scope, true) === null, 'FAQ article projection must fail closed when active truth is missing');
assert(projectFaqLinkedArticleReference({ ...linkedArticle, active: false }, 'article-1', scope, true) === null, 'inactive FAQ article must not project');
assert(projectFaqLinkedArticleReference({ ...linkedArticle, deleted: true }, 'article-1', scope, true) === null, 'deleted FAQ article must not project');
assert(projectFaqLinkedArticleReference({ ...linkedArticle, sId: 102 }, 'article-1', scope, true) === null, 'cross-store FAQ article must not project');
const compactLinkedArticle = projectFaqLinkedArticleReference(linkedArticle, 'article-1', scope, false);
assert(compactLinkedArticle && !Object.prototype.hasOwnProperty.call(compactLinkedArticle, 'content'), 'compact FAQ article projection must omit editor content');

const parsedSave = parseAnswerlatticeFaqSaveInput({
  question: 'How do I publish?',
  answer: 'Open the article and select Publish.',
  status: 'draft',
  articleId: null,
  entityIds: [],
  contextKeys: [],
  tags: [],
  sortOrder: 100,
}, scope);
assert(parsedSave.pId === 'AL' && parsedSave.status === 'draft', 'FAQ authoring input must normalize into exact scoped content');
assert(!Object.prototype.hasOwnProperty.call(parsedSave, 'source'), 'FAQ authoring input must not own source provenance');
assertThrows(() => parseAnswerlatticeFaqSaveInput({
  question: 'How do I publish?',
  answer: 'Open the article and select Publish.',
  source: 'article',
}, scope), 'FAQ authoring input must reject caller-provided source provenance');
assertThrows(() => parseAnswerlatticeFaqSaveInput({
  question: 'How do I publish?',
  answer: 'Open the article and select Publish.',
  likes: 10,
}, scope), 'FAQ authoring input must reject caller-provided feedback counters');

const cache = read('src/lib/answerlattice/publicContentCache.ts');
const client = read('src/lib/answerlattice/publicContentClient.ts');
const view = read('src/components/templates/main-app/helpCenter/FaqView.tsx');
const route = read('src/app/api/answerlattice/public-content/route.ts');
const retrieval = read('src/lib/answerlattice/faqRetrieval.ts');
const faqDal = read('src/database/answerlattice/faqs.ts');
const faqManagement = read('src/components/templates/answerlattice/faqManagement/AnswerlatticeFaqManagement.tsx');
const faqGeneration = read('src/app/api/answerlattice/faqs/generate-from-article/route.ts');
const rules = read('firestore-answerlattice.rules');
const packageJson = JSON.parse(read('package.json'));

assert(cache.includes('projectAnswerlatticePublicFaq(doc.data(), doc.id, scope)'), 'public FAQ Admin reads must project through the exact DTO boundary');
assert(!cache.includes("({ ...doc.data(), id: doc.id } as AnswerlatticeFaq)"), 'public FAQ cache must not spread raw Firestore rows into the response');
assert(cache.includes('answerlattice_public_faq_record_rejected'), 'rejected persisted public FAQs must be observable');
assert(client.includes('normalizeAnswerlatticePublicFaqList(data)'), 'browser FAQ payloads must re-enter a runtime DTO boundary');
assert(client.includes('answerlattice_public_faq_client_payload_invalid'), 'invalid browser FAQ payloads must be observable');
assert(view.includes('AnswerlatticePublicFaq'), 'Help Center FAQ UI must consume the browser-safe DTO');
assert(route.includes('getCachedPublishedFaqs(scope, maxResults)'), 'public-content route must use the projected cache reader');
assert(route.includes('parsed.data.expectedTenantId !== scope.tId'), 'public FAQ route must reject initiating/current tenant mismatch');
assert(route.includes('parsed.data.expectedStoreId !== scope.sId'), 'public FAQ route must reject initiating/current workspace mismatch');
assert(view.includes('fetchAnswerlatticePublicFaqs(requestScope)'), 'Help Center FAQ UI must retain initiating Answerlattice scope');
assert(retrieval.includes('normalizeAnswerlatticeRetrievalFaq(doc.data(), doc.id, { tId, sId })'), 'FAQ retrieval must normalize persisted rows before caching');
assert(retrieval.includes("const tId = typeof options.tId === 'number' ? normalizeAnswerlatticeScopeDocumentId(options.tId) : null;"), 'FAQ retrieval must require exact runtime tenant scope');
assert(!retrieval.includes('const tId = Number(options.tId);'), 'FAQ retrieval must not coerce runtime tenant scope');
assert(!retrieval.includes(".where('tId', '==', Number(tId))"), 'FAQ retrieval must not coerce tenant query scope');
assert(retrieval.includes('const currentFaq = await loadPublishedFaqById('), 'related-surface FAQ summaries must be revalidated against current published truth');
assert(retrieval.includes('if (!snap.exists) return [];'), 'missing linked articles must not produce phantom FAQ citations');
assert(retrieval.includes("value.status !== 'published'"), 'FAQ citations must require a published linked article');
assert(retrieval.includes('value.active !== true'), 'FAQ citations must require explicit active article truth');
assert(faqDal.includes('source: existingSource || ANSWERLATTICE_FAQ_SOURCE.MANUAL'), 'FAQ provenance must be system-derived and immutable during authoring');
assert(faqDal.includes("throw new Error('Publish the linked article before publishing this FAQ.')"), 'linked FAQ publication must require active published article truth');
assert(faqDal.includes('existing.tId !== scope.tId'), 'FAQ mutation must require exact persisted tenant scope');
assert(faqDal.includes('existing.sId !== scope.sId'), 'FAQ mutation must require exact persisted workspace scope');
assert(faqDal.includes("throw new Error('FAQ has an invalid stored article link and cannot be archived safely.')"), 'FAQ archive must fail closed on a corrupt article mirror');
assert(faqDal.includes("throw new Error('Invalid Answerlattice FAQ status filter')"), 'FAQ management status filters must fail closed');
assert(!faqDal.includes('normalizeAnswerlatticeScopeDocumentId(existing.tId)'), 'FAQ mutation must not coerce persisted tenant scope');
assert(faqDal.includes('projectManagedFaqDocuments(snapshot.docs, scope)'), 'FAQ management reads must project persisted rows through runtime admission');
assert(!faqDal.includes("({ ...item.data(), id: item.id } as AnswerlatticeFaq)"), 'FAQ management reads must not cast raw persisted rows');
assert(!faqDal.includes('export const updateFaqFeedback'), 'FAQ feedback must not retain a direct browser Firestore counter writer');
assert(!faqManagement.includes('name="source"'), 'FAQ editor must expose source provenance as read-only');
assert(faqManagement.includes("getContentFeedbackForEntry('faq', selectedFaq.id)"), 'FAQ review must expose bounded audited reaction details');
assert(faqGeneration.includes('getArticleFaqSourceFingerprint'), 'article FAQ generation must fingerprint the source used by the provider');
assert(faqGeneration.includes('await db.runTransaction(async (transaction) =>'), 'article FAQ generation must commit through a transaction');
assert(faqGeneration.includes('const currentArticleSnapshot = await transaction.get(articleRef);'), 'article FAQ generation must re-read source truth after the model call');
assert(faqGeneration.includes('const currentLinkedFaqs = await transaction.get(linkedFaqQuery);'), 'article FAQ generation must re-check current linked FAQ capacity and duplicates');
assert(faqGeneration.includes('transaction.create('), 'article FAQ generation must create new candidates without merge semantics');
assert(!faqGeneration.includes('batch.set(articleRef'), 'article FAQ generation must not recreate a deleted article through merge writes');
assert(rules.includes('isValidAnswerlatticeManualFaqCreate(request.resource.data, docId)'), 'FAQ create rules must restrict browser writes to manual source truth');
assert(rules.includes('after.source == before.source'), 'FAQ update rules must keep source provenance immutable');
assert(rules.includes("'canonicalAnswerId', 'jobId', 'generatedFromArticleId', 'intakeJobId'"), 'FAQ create rules must reject system lineage fields');
assert(rules.includes("'recentFeedbackOperations'"), 'FAQ create rules must reject server-owned feedback idempotency state');
assert(packageJson.scripts['verify:answerlattice-faq-boundary'] === 'node scripts/verification/verify-answerlattice-faq-boundary.js', 'package must expose the FAQ boundary verifier');

process.stdout.write('Answerlattice FAQ public boundary verification passed.\n');
