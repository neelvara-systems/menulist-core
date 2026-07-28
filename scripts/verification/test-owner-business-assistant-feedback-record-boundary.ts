import assert from 'node:assert/strict';
import { buildOwnerBusinessAssistantFeedbackRecord } from '../../src/lib/ownerBusinessAssistant/feedbackRecordBoundary';

const complete = buildOwnerBusinessAssistantFeedbackRecord({
  createdAt: 'created',
  expiresAt: 'expires',
  feedback: {
    answerId: 'answer-1',
    question: 'How is the menu doing?',
    rating: 'not_helpful',
    reason: 'The answer was stale.',
    storeId: '20',
  },
  storeId: 20,
  tenantId: 10,
  userId: 'user-1',
});
assert.deepEqual(complete, {
  answerId: 'answer-1',
  createdAt: 'created',
  expiresAt: 'expires',
  question: 'How is the menu doing?',
  rating: 'not_helpful',
  reason: 'The answer was stale.',
  sId: '20',
  source: 'owner_business_assistant',
  tId: '10',
  userId: 'user-1',
});

const replacement = buildOwnerBusinessAssistantFeedbackRecord({
  createdAt: 'new-created',
  expiresAt: 'new-expires',
  feedback: {
    answerId: 'answer-1',
    rating: 'helpful',
    storeId: '20',
  },
  storeId: '20',
  tenantId: '10',
  userId: 'user-1',
});
assert.equal(Object.hasOwn(replacement, 'reason'), false);
assert.equal(Object.hasOwn(replacement, 'question'), false);
assert.equal(Object.hasOwn(replacement, 'storeId'), false);
assert.deepEqual(Object.keys(replacement).sort(), [
  'answerId',
  'createdAt',
  'expiresAt',
  'rating',
  'sId',
  'source',
  'tId',
  'userId',
].sort());

console.log('Owner Business Assistant feedback record boundary tests passed.');
