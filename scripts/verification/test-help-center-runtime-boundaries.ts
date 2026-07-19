import assert from 'node:assert/strict';

import {
    getAnswerlatticeHelpChatDraftKeys,
    parseAnswerlatticeHelpChatDraft,
    purgeForeignAnswerlatticeHelpChatDrafts,
    resolveAnswerlatticeHelpChatDraftScope,
    serializeAnswerlatticeHelpChatDraft,
} from '@lib/answerlattice/helpChatDrafts';
import { resolveAnswerlatticeWorkspaceCacheScopeKey } from '@lib/answerlattice/clientCacheScope';
import { normalizeAnswerlatticePublicRelatedContent } from '@lib/answerlattice/productSurfaceContent';
import { isHelpCenterSearchResponse } from '@lib/search/helpCenterSearchResponse';

const draftScope = resolveAnswerlatticeHelpChatDraftScope({
    productAccounts: {
        AL: {
            tenantId: 101,
            storeId: 202,
        },
    },
    uId: 'user-1',
    user: { id: 'user-1' },
});
assert.equal(draftScope, '101:202:user-1');
assert.equal(resolveAnswerlatticeHelpChatDraftScope({
    productAccounts: { AL: { tenantId: 101, storeId: 202 } },
    uId: 'user-1',
    user: { id: 'user-2' },
}), null);
assert.equal(resolveAnswerlatticeHelpChatDraftScope({
    productAccounts: { AL: { tenantId: 101, storeId: 202 } },
}), null);

const newDraftKeys = getAnswerlatticeHelpChatDraftKeys(draftScope, null);
const existingDraftKeys = getAnswerlatticeHelpChatDraftKeys(draftScope, 'session-1');
const otherWorkspaceDraftKeys = getAnswerlatticeHelpChatDraftKeys('101:203:user-1', 'session-1');
assert.ok(newDraftKeys?.draftKey.includes(':draft:v2:101:202:user-1:new'));
assert.ok(existingDraftKeys?.draftKey.includes(':draft:v2:101:202:user-1:session-1'));
assert.notEqual(existingDraftKeys?.draftKey, otherWorkspaceDraftKeys?.draftKey);
assert.equal(getAnswerlatticeHelpChatDraftKeys(null, 'session-1'), null);
assert.equal(getAnswerlatticeHelpChatDraftKeys(draftScope, ' session-1'), null);
assert.equal(resolveAnswerlatticeWorkspaceCacheScopeKey({
    productAccounts: { AL: { tenantId: 101, storeId: 202 } },
}), 'workspace:101:202');
assert.equal(resolveAnswerlatticeWorkspaceCacheScopeKey({
    productAccounts: { AL: { tenantId: '101 ', storeId: 202 } },
}), null);
const serializedDraft = serializeAnswerlatticeHelpChatDraft('Need help with billing', 1_000_000);
assert.ok(serializedDraft);
assert.equal(parseAnswerlatticeHelpChatDraft(serializedDraft, 1_000_001), 'Need help with billing');
assert.equal(parseAnswerlatticeHelpChatDraft(serializedDraft, 1_000_000 + (24 * 60 * 60 * 1000) + 1), null);
assert.equal(parseAnswerlatticeHelpChatDraft('Need help with billing', 1_000_001), null);
assert.equal(serializeAnswerlatticeHelpChatDraft('x'.repeat(2001), 1_000_000), null);

const storedDrafts = new Map<string, string>([
    [newDraftKeys!.draftKey, 'current new draft'],
    [existingDraftKeys!.draftKey, 'current session draft'],
    [otherWorkspaceDraftKeys!.draftKey, 'foreign workspace draft'],
    ['answerlattice-help-chat:image-draft:v2:101:202:user-1:session-1', 'legacy screenshot'],
    ['chat-draft-new', 'legacy text'],
    ['unrelated-key', 'preserve'],
]);
const storage = {
    get length() { return storedDrafts.size; },
    key(index: number) { return Array.from(storedDrafts.keys())[index] ?? null; },
    removeItem(key: string) { storedDrafts.delete(key); },
};
assert.equal(purgeForeignAnswerlatticeHelpChatDrafts(storage, draftScope), 3);
assert.equal(storedDrafts.has(newDraftKeys!.draftKey), true);
assert.equal(storedDrafts.has(existingDraftKeys!.draftKey), true);
assert.equal(storedDrafts.has(otherWorkspaceDraftKeys!.draftKey), false);
assert.equal(storedDrafts.has('unrelated-key'), true);

const relatedContent = {
    key: 'help_center_billing',
    label: 'Billing',
    routePatterns: ['/billing'],
    articles: [{
        id: 'article-1',
        title: 'Billing help',
        url: 'javascript:alert(1)',
    }],
    changelogs: [{ id: 'entry-1', pageId: 'page-1', title: 'Billing update' }],
    faqs: [{ id: 'faq-1', question: 'How does billing work?' }],
    tickets: { total: 99, open: 98, recentDisplayIds: ['SECRET'] },
};

const normalizedRelatedContent = normalizeAnswerlatticePublicRelatedContent(relatedContent);
assert.ok(normalizedRelatedContent);
assert.equal(normalizedRelatedContent.articles[0]?.url, undefined);
assert.deepEqual(normalizedRelatedContent.tickets, { total: 0, open: 0, recentDisplayIds: [] });

const validResponse = {
    id: 'history-1',
    craftedAnswer: 'Use the billing page.',
    references: [{ id: 'article-1', categoryId: 'category-1', title: 'Billing help' }],
    relatedContent,
    suggestedQuestions: ['Where can I find invoices?'],
    answerSource: 'rag',
};
assert.equal(isHelpCenterSearchResponse(validResponse), true);
assert.equal(isHelpCenterSearchResponse({
    ...validResponse,
    relatedContent: { ...relatedContent, key: '__proto__' },
}), false);
assert.equal(isHelpCenterSearchResponse({
    ...validResponse,
    relatedContent: { ...relatedContent, articles: 'not-an-array' },
}), false);
assert.equal(isHelpCenterSearchResponse({
    ...validResponse,
    answerSource: 'x'.repeat(33),
}), false);
assert.equal(isHelpCenterSearchResponse({
    ...validResponse,
    references: [{ id: 'article-1', categoryId: 'category-1', token: 'secret' }],
}), false);

console.log('Help Center runtime boundary tests passed.');
