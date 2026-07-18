import assert from 'node:assert/strict';

import { normalizeAnswerlatticePublicRelatedContent } from '@lib/answerlattice/productSurfaceContent';
import { isHelpCenterSearchResponse } from '@lib/search/helpCenterSearchResponse';

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
