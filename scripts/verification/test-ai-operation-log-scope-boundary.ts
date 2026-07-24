#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { PRODUCT_IDS } from '../../src/constants/product';
import {
    assertAiOperationStorageAvailable,
    normalizeAiOperationForSessionInput,
    normalizeAiOperationWriteScope,
} from '../../src/lib/ai/operationLog';

assert.deepEqual(normalizeAiOperationWriteScope({}), {
    collectionName: DB_COLLECTIONS.MENULIST_AI_OPERATIONS,
    productId: PRODUCT_IDS.MENULIST,
    storeDocumentId: '0',
    storeId: 0,
    tenantDocumentId: '0',
    tenantId: 0,
});

assert.deepEqual(normalizeAiOperationWriteScope({
    pId: PRODUCT_IDS.MENULIST,
    sId: '22',
    tId: 11,
}), {
    collectionName: DB_COLLECTIONS.MENULIST_AI_OPERATIONS,
    productId: PRODUCT_IDS.MENULIST,
    storeDocumentId: '22',
    storeId: 22,
    tenantDocumentId: '11',
    tenantId: 11,
});

const answerlatticeScope = normalizeAiOperationWriteScope({
    pId: PRODUCT_IDS.ANSWERLATTICE,
    sId: 44,
    tId: '33',
});
assert.deepEqual(answerlatticeScope, {
    collectionName: DB_COLLECTIONS.ANSWERLATTICE_AI_OPERATIONS,
    productId: PRODUCT_IDS.ANSWERLATTICE,
    storeDocumentId: '44',
    storeId: 44,
    tenantDocumentId: '33',
    tenantId: 33,
});
assert.ok(answerlatticeScope);
assert.throws(
    () => assertAiOperationStorageAvailable(answerlatticeScope, false),
    /Answerlattice AI operation storage is unavailable/,
    'missing Answerlattice infrastructure must fail instead of falling back to MenuList',
);
assert.doesNotThrow(() => assertAiOperationStorageAvailable(answerlatticeScope, true));

for (const scope of [
    { pId: PRODUCT_IDS.ANSWERLATTICE },
    { pId: PRODUCT_IDS.ANSWERLATTICE, sId: 1, tId: 0 },
    { pId: PRODUCT_IDS.MENULIST, sId: 0, tId: 1 },
    { pId: PRODUCT_IDS.CAMPAIGNCUE, sId: 2, tId: 1 },
    { pId: 'al', sId: 2, tId: 1 },
    { pId: '', sId: 2, tId: 1 },
    { pId: 1, sId: 2, tId: 1 },
    { sId: 2 },
    { tId: 1 },
    { sId: '02', tId: 1 },
    { sId: ' 2', tId: 1 },
    { sId: 2.5, tId: 1 },
    { sId: Number.MAX_SAFE_INTEGER + 1, tId: 1 },
] as const) {
    assert.equal(
        normalizeAiOperationWriteScope(scope),
        null,
        `malformed or unsupported AI operation scope must fail closed: ${JSON.stringify(scope)}`,
    );
}

const canonicalSessionInput = normalizeAiOperationForSessionInput({
    pId: PRODUCT_IDS.MENULIST,
    productId: PRODUCT_IDS.MENULIST,
    sId: 22,
    storeId: '22',
    tId: 11,
    tenantId: '11',
    uId: 'user-1',
    user: {
        id: 'user-1',
        name: 'Owner',
        pId: PRODUCT_IDS.MENULIST,
        productId: PRODUCT_IDS.MENULIST,
        storeId: 22,
        tenantId: 11,
    },
}, {
    action: 'image_generation',
    sId: '22',
    tId: '11',
});
assert.equal(canonicalSessionInput?.pId, PRODUCT_IDS.MENULIST);
assert.equal(canonicalSessionInput?.tId, 11);
assert.equal(canonicalSessionInput?.sId, 22);
assert.equal(canonicalSessionInput?.uId, 'user-1');
assert.equal(canonicalSessionInput?.createdBy, 'Owner');

for (const [session, input] of [
    [
        { pId: PRODUCT_IDS.MENULIST, tId: 1, sId: 2, user: { id: 'user-1', tenantId: 1, storeId: 2 } },
        { action: 'image_generation', tId: 9, sId: 2 },
    ],
    [
        { pId: PRODUCT_IDS.MENULIST, productId: PRODUCT_IDS.ANSWERLATTICE, tId: 1, sId: 2 },
        { action: 'image_generation' },
    ],
    [
        { pId: PRODUCT_IDS.MENULIST, tId: 1, sId: 2, user: { tenantId: 3, storeId: 2 } },
        { action: 'image_generation' },
    ],
    [
        { pId: PRODUCT_IDS.MENULIST, tId: 1, sId: 2, user: { id: 'user-2' }, uId: 'user-1' },
        { action: 'image_generation' },
    ],
    [
        { pId: 'ml', tId: 1, sId: 2 },
        { action: 'image_generation' },
    ],
    [
        { pId: PRODUCT_IDS.MENULIST, tId: '01', sId: 2 },
        { action: 'image_generation' },
    ],
    [
        { pId: PRODUCT_IDS.MENULIST, tId: 1 },
        { action: 'image_generation' },
    ],
] as const) {
    assert.equal(
        normalizeAiOperationForSessionInput(session, input),
        null,
        'conflicting or malformed session/input aliases must not select an operation path',
    );
}

console.log('AI operation log scope boundary tests passed.');
