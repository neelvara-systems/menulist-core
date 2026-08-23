#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { normalizeAiBalanceUpdate } from '../../src/services/ai/balanceSync';

assert.deepEqual(
    normalizeAiBalanceUpdate({ billingStoreId: 72, monthlyCredits: 7, topUpCredits: 5 }),
    { billingStoreId: 72, monthlyCredits: 7, promotionalCredits: 0, topUpCredits: 5 },
    'canonical server balances remain eligible for browser state synchronization',
);

for (const value of [
    { billingStoreId: '72', monthlyCredits: 7, topUpCredits: 5 },
    { billingStoreId: 72, monthlyCredits: '7', topUpCredits: 5 },
    { billingStoreId: 72, monthlyCredits: 7, topUpCredits: '5' },
    { billingStoreId: 72, monthlyCredits: 7.5, topUpCredits: 5 },
    { billingStoreId: 72, monthlyCredits: 7, topUpCredits: Number.POSITIVE_INFINITY },
    { billingStoreId: 72, monthlyCredits: Number.MAX_SAFE_INTEGER, topUpCredits: 1 },
]) {
    assert.equal(
        normalizeAiBalanceUpdate(value),
        null,
        'coercible, fractional, non-finite, or overflowing balances must not enter browser subscription state',
    );
}

console.log('AI balance sync boundary tests passed.');
