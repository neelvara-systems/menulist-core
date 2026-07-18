import assert from 'node:assert/strict';
import {
    isAnswerlatticeChatAnalyticsStoreScope,
    parseAnswerlatticeChatAnalyticsBackfillInput,
} from '../../functions-answerlattice/src/answerlattice/chatAnalyticsBackfillBoundary';

assert.deepEqual(parseAnswerlatticeChatAnalyticsBackfillInput({ tId: 10, sId: 20, days: 30 }), {
    tId: 10,
    sId: 20,
    days: 30,
});
for (const invalid of [
    null,
    [],
    { tId: '10', sId: 20, days: 30 },
    { tId: 10, sId: 20, days: 0 },
    { tId: 10, sId: 20, days: 91 },
    { tId: 10, sId: 20, days: 1.5 },
    { tId: 10, sId: 20, days: 30, tenantId: 10 },
]) {
    assert.throws(() => parseAnswerlatticeChatAnalyticsBackfillInput(invalid), /answerlattice_chat_backfill_input_invalid/);
}

const store = { pId: 'AL', tId: 10, sId: 20, active: true };
assert.equal(isAnswerlatticeChatAnalyticsStoreScope(store, 10, 20), true);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, sId: undefined, storeId: 20 }, 10, 20), true);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, pId: 'ML' }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, tId: 11 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, sId: 21 }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, active: false }, 10, 20), false);
assert.equal(isAnswerlatticeChatAnalyticsStoreScope({ ...store, deleted: true }, 10, 20), false);

console.log('Answerlattice chat analytics backfill boundary tests passed.');
