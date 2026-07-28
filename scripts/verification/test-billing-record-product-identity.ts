#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { classifyMenuListBillingRecordIdentityBackfill } from '../../src/lib/billing/billingRecordProductIdentity';

assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ pId: 'ML', productId: 'ML', tenantId: 1, storeId: 101 }),
    { status: 'already_exact' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ pId: 'ML', tenantId: 1, storeId: 101 }),
    { status: 'candidate', update: { pId: 'ML', productId: 'ML', tenantId: 1, storeId: 101 } },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ productId: 'ML', tenantId: '2', storeId: '202' }),
    { status: 'candidate', update: { pId: 'ML', productId: 'ML', tenantId: 2, storeId: 202 } },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ tenantId: 1, storeId: 101 }),
    { status: 'skip_unclassified_product' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ pId: 'AL', productId: 'AL', tenantId: 1, storeId: 101 }),
    { status: 'skip_conflicting_or_other_product' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ pId: 'ML', productId: 'AL', tenantId: 1, storeId: 101 }),
    { status: 'skip_conflicting_or_other_product' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({ pId: 'ML', tenantId: '01', storeId: 101 }),
    { status: 'skip_invalid_scope' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({
        pId: 'ML',
        tenantId: 1,
        tId: 2,
        storeId: 101,
        sId: 101,
    }),
    { status: 'skip_invalid_scope' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({
        pId: 'ML',
        tenantId: 1,
        tId: '1',
        storeId: 101,
        sId: 102,
    }),
    { status: 'skip_invalid_scope' },
);
assert.deepEqual(
    classifyMenuListBillingRecordIdentityBackfill({
        pId: 'ML',
        tId: '1',
        sId: 101,
    }),
    { status: 'candidate', update: { pId: 'ML', productId: 'ML', tenantId: 1, storeId: 101 } },
);

process.stdout.write('Billing record product identity classifier passed.\n');
