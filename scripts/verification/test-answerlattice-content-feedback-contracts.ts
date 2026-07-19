import assert from 'node:assert/strict';
import {
    AnswerlatticeContentFeedbackResultSchema,
    parseAnswerlatticeContentFeedbackRequest,
} from '../../src/lib/answerlattice/contentFeedbackContracts';

const valid = {
    requestId: 'content_feedback_request_1',
    type: 'article',
    contentId: 'article-1',
    sentiment: 'like',
    increment: true,
    comment: '',
    action: 'added',
};

assert.deepEqual(parseAnswerlatticeContentFeedbackRequest(valid), valid);
assert.equal(parseAnswerlatticeContentFeedbackRequest({ ...valid, unknown: true }), null);
assert.equal(parseAnswerlatticeContentFeedbackRequest({ ...valid, action: 'removed' }), null);
assert.equal(parseAnswerlatticeContentFeedbackRequest({ ...valid, contentId: 'unsafe/path' }), null);
assert.equal(parseAnswerlatticeContentFeedbackRequest({
    ...valid,
    type: 'changelog',
}), null);
assert.equal(parseAnswerlatticeContentFeedbackRequest({
    ...valid,
    type: 'changelog',
    pageId: 'page-1',
    contentId: 'entry-1',
})?.type, 'changelog');
assert.equal(parseAnswerlatticeContentFeedbackRequest({
    ...valid,
    type: 'faq',
    contentId: 'faq-1',
})?.type, 'faq');
assert.equal(AnswerlatticeContentFeedbackResultSchema.safeParse({
    success: true,
    likes: 1,
    dislikes: 0,
    feedbackId: 'doc1_article-1',
    feedbackLogged: true,
    replayed: false,
}).success, true);
assert.equal(AnswerlatticeContentFeedbackResultSchema.safeParse({
    success: true,
    likes: -1,
    dislikes: 0,
    feedbackId: 'doc1_article-1',
    feedbackLogged: true,
    replayed: false,
}).success, false);

process.stdout.write('Answerlattice content-feedback contract tests passed.\n');
