import assert from 'node:assert/strict';
import {
    normalizePersistedStaffStoreMappings,
    normalizeStaffStoreScopeDocumentId,
} from '../../src/lib/staffManagement/scopeBoundary';
import { CreateStaffSchema, UpdateStaffSchema } from '../../src/lib/staffManagement/server';

for (const value of [1, 42, '1', '42']) {
    assert.deepEqual(normalizeStaffStoreScopeDocumentId(value), {
        numericId: Number(value),
        documentId: String(value),
    });
}

for (const value of [
    '',
    ' 1',
    '1 ',
    '01',
    '+1',
    '1e3',
    '1.5',
    1.5,
    0,
    -1,
    Number.MAX_SAFE_INTEGER + 1,
    String(Number.MAX_SAFE_INTEGER + 1),
]) {
    assert.equal(normalizeStaffStoreScopeDocumentId(value), null, `non-canonical staff scope ${String(value)} should fail`);
}

const baseCreate = {
    email: 'staff@example.com',
    name: 'Staff Member',
    tenantId: 1,
    storeId: 2,
};
assert.equal(CreateStaffSchema.safeParse(baseCreate).success, true);
assert.equal(CreateStaffSchema.safeParse({ ...baseCreate, storeId: Number.MAX_SAFE_INTEGER + 1 }).success, false);
assert.equal(CreateStaffSchema.safeParse({ ...baseCreate, tenantId: Number.MAX_SAFE_INTEGER + 1 }).success, false);
assert.equal(UpdateStaffSchema.safeParse({
    userId: 'user-1',
    tenantId: 1,
    stores: [{ storeId: Number.MAX_SAFE_INTEGER + 1, role: 'staff' }],
}).success, false);

assert.deepEqual(normalizePersistedStaffStoreMappings([
    { storeId: 1, name: 'One', role: 'owner' },
    { storeId: '2', name: 'Two', role: 'staff' },
    { storeId: ' 3', name: 'Whitespace', role: 'owner' },
    { storeId: '04', name: 'Leading zero', role: 'owner' },
    { storeId: '5e0', name: 'Exponent', role: 'owner' },
    { storeId: 6.5, name: 'Decimal', role: 'owner' },
    { storeId: Number.MAX_SAFE_INTEGER + 1, name: 'Unsafe', role: 'owner' },
    null,
]), [
    { storeId: 1, name: 'One', role: 'owner' },
    { storeId: 2, name: 'Two', role: 'staff' },
]);

console.log('Staff scope boundary tests passed.');
