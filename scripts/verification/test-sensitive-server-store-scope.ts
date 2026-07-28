import assert from 'node:assert/strict';

import {
    isSensitiveStoreRecordInScope,
    resolveSensitiveSessionStoreScope,
} from '../../src/lib/security/sensitiveStoreScope';

assert.deepEqual(resolveSensitiveSessionStoreScope({
    tenantValues: [11, '11'],
    storeValues: [21, '21'],
}), {
    tenantScope: { documentId: '11', numericId: 11 },
    storeScope: { documentId: '21', numericId: 21 },
});
assert.equal(resolveSensitiveSessionStoreScope({
    tenantValues: [11, 12],
    storeValues: [21],
}), null);
assert.equal(resolveSensitiveSessionStoreScope({
    tenantValues: [11],
    storeValues: [21, 'invalid'],
}), null);

assert.equal(isSensitiveStoreRecordInScope({
    storeData: { storeId: 21, sId: '21', tenantId: 11, tId: '11' },
    storeDocumentId: '21',
    tenantDocumentId: '11',
}), true);
assert.equal(isSensitiveStoreRecordInScope({
    storeData: { tId: 11 },
    storeDocumentId: '21',
    tenantDocumentId: '11',
}), true);
assert.equal(isSensitiveStoreRecordInScope({
    storeData: { storeId: 21, sId: 22, tenantId: 11 },
    storeDocumentId: '21',
    tenantDocumentId: '11',
}), false);
assert.equal(isSensitiveStoreRecordInScope({
    storeData: { storeId: 21, tenantId: 11, tId: 12 },
    storeDocumentId: '21',
    tenantDocumentId: '11',
}), false);
assert.equal(isSensitiveStoreRecordInScope({
    storeData: { storeId: 21, tenantId: 11, tId: 'invalid' },
    storeDocumentId: '21',
    tenantDocumentId: '11',
}), false);

console.log('Sensitive server store-scope tests passed');
