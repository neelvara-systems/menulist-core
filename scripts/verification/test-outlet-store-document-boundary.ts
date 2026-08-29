import assert from 'node:assert/strict';
import { isReadableStoreDocument } from '@lib/store/storeDocumentBoundary';

const readableOutlet = {
    active: true,
    businessCategory: 'restaurant',
    businessType: 'restaurant',
    city: '',
    contactPersonEmail: '',
    contactPersonName: '',
    contactPersonNumber: '',
    currencyCode: 'INR',
    currencySymbol: '₹',
    deleted: false,
    email: 'qa@example.test',
    logo: '',
    name: 'QA Outlet',
    phoneNumber: '',
    roles: [],
    state: '',
    storeId: 202,
    storeKey: 'qa_outlet',
    tenantId: 101,
    tenantName: 'QA Tenant',
};

assert.equal(isReadableStoreDocument(readableOutlet, 202), true);

for (const requiredField of [
    'city',
    'contactPersonEmail',
    'contactPersonName',
    'contactPersonNumber',
    'deleted',
    'state',
] as const) {
    const invalidOutlet = { ...readableOutlet } as Record<string, unknown>;
    delete invalidOutlet[requiredField];
    assert.equal(
        isReadableStoreDocument(invalidOutlet, 202),
        false,
        `outlet without ${requiredField} must be rejected before persistence`,
    );
}

assert.equal(isReadableStoreDocument(readableOutlet, 203), false);
assert.equal(isReadableStoreDocument({ ...readableOutlet, deleted: 'false' }, 202), false);
assert.equal(
    isReadableStoreDocument({ ...readableOutlet, sId: 0 }, 202),
    false,
    'a conflicting legacy store alias must be rejected before downstream authorization disagrees',
);
assert.equal(
    isReadableStoreDocument({ ...readableOutlet, tId: 0 }, 202),
    false,
    'a conflicting legacy tenant alias must be rejected before downstream authorization disagrees',
);
assert.equal(
    isReadableStoreDocument({ ...readableOutlet, sId: 202, tId: 101 }, 202),
    true,
    'matching legacy scope aliases remain readable',
);

console.log('Outlet store document boundary tests passed.');
