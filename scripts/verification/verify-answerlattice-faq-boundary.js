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
  normalizeAnswerlatticeRetrievalFaq,
  normalizeAnswerlatticePublicFaq,
  normalizeAnswerlatticePublicFaqList,
  projectAnswerlatticePublicFaq,
} = require(path.join(ROOT, 'src/lib/answerlattice/faqContent.ts'));

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

const cache = read('src/lib/answerlattice/publicContentCache.ts');
const client = read('src/lib/answerlattice/publicContentClient.ts');
const view = read('src/components/templates/main-app/helpCenter/FaqView.tsx');
const route = read('src/app/api/answerlattice/public-content/route.ts');
const retrieval = read('src/lib/answerlattice/faqRetrieval.ts');
const packageJson = JSON.parse(read('package.json'));

assert(cache.includes('projectAnswerlatticePublicFaq(doc.data(), doc.id, scope)'), 'public FAQ Admin reads must project through the exact DTO boundary');
assert(!cache.includes("({ ...doc.data(), id: doc.id } as AnswerlatticeFaq)"), 'public FAQ cache must not spread raw Firestore rows into the response');
assert(cache.includes('answerlattice_public_faq_record_rejected'), 'rejected persisted public FAQs must be observable');
assert(client.includes('normalizeAnswerlatticePublicFaqList(data)'), 'browser FAQ payloads must re-enter a runtime DTO boundary');
assert(client.includes('answerlattice_public_faq_client_payload_invalid'), 'invalid browser FAQ payloads must be observable');
assert(view.includes('AnswerlatticePublicFaq'), 'Help Center FAQ UI must consume the browser-safe DTO');
assert(route.includes('getCachedPublishedFaqs(scope, maxResults)'), 'public-content route must use the projected cache reader');
assert(retrieval.includes('normalizeAnswerlatticeRetrievalFaq(doc.data(), doc.id, { tId, sId })'), 'FAQ retrieval must normalize persisted rows before caching');
assert(retrieval.includes("const tId = typeof options.tId === 'number' ? normalizeAnswerlatticeScopeDocumentId(options.tId) : null;"), 'FAQ retrieval must require exact runtime tenant scope');
assert(!retrieval.includes('const tId = Number(options.tId);'), 'FAQ retrieval must not coerce runtime tenant scope');
assert(!retrieval.includes(".where('tId', '==', Number(tId))"), 'FAQ retrieval must not coerce tenant query scope');
assert(packageJson.scripts['verify:answerlattice-faq-boundary'] === 'node scripts/verification/verify-answerlattice-faq-boundary.js', 'package must expose the FAQ boundary verifier');

process.stdout.write('Answerlattice FAQ public boundary verification passed.\n');
