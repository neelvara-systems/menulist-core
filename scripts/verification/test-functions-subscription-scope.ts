import assert from 'node:assert/strict';
import { getExactMenuListSubscriptionScope } from '../../functions/src/billing/subscriptionScope';

const exact = {
    pId: 'ML',
    productId: 'ML',
    tId: 101,
    tenantId: 101,
    sId: 202,
    storeId: 202,
};

assert.deepEqual(getExactMenuListSubscriptionScope(exact), { tenantId: 101, storeId: 202 });
assert.equal(getExactMenuListSubscriptionScope({ ...exact, productId: 'AL' }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tId: 999 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, sId: 999 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tId: undefined }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tenantId: '101', tId: '101' }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tenantId: 0, tId: 0 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, storeId: Number.MAX_SAFE_INTEGER + 1, sId: Number.MAX_SAFE_INTEGER + 1 }), null);

console.log('Functions subscription scope tests passed.');
