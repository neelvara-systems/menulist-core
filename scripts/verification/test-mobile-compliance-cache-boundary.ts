import assert from 'node:assert/strict';
import {
    getOwnerComplianceScope,
    isOwnerComplianceMutationScopeAcknowledged,
    normalizeOwnerComplianceLoadResponse,
} from '../../src/lib/compliance/ownerComplianceResponseBoundary';

const tenantOneScope = getOwnerComplianceScope('tenant-1', 'shared-store');
const tenantTwoScope = getOwnerComplianceScope('tenant-2', 'shared-store');
assert.ok(tenantOneScope);
assert.ok(tenantTwoScope);
assert.notEqual(
    tenantOneScope.key,
    tenantTwoScope.key,
    'two tenants with the same store ID must never share mobile compliance cache state',
);

for (const invalidScope of [
    [undefined, 'store-1'],
    ['tenant-1', undefined],
    [' tenant-1', 'store-1'],
    ['tenant-1', 'store-1 '],
    ['tenant/1', 'store-1'],
    ['tenant-1', '__reserved__'],
]) {
    assert.equal(
        getOwnerComplianceScope(invalidScope[0], invalidScope[1]),
        null,
        `malformed mobile compliance scope must fail closed: ${JSON.stringify(invalidScope)}`,
    );
}

const tenantOnePayload = {
    tenantId: 'tenant-1',
    storeId: 'shared-store',
    privacy: {
        content: 'Tenant one privacy content',
        customContent: 'Tenant one custom privacy content',
        source: 'custom',
        systemContent: 'Tenant one system privacy content',
    },
    refund: null,
    terms: {
        content: 'Tenant one terms content',
        source: 'system',
    },
};

assert.deepEqual(
    normalizeOwnerComplianceLoadResponse(tenantOnePayload, tenantOneScope),
    {
        privacy: tenantOnePayload.privacy,
        refund: null,
        terms: tenantOnePayload.terms,
    },
);
assert.equal(
    normalizeOwnerComplianceLoadResponse(tenantOnePayload, tenantTwoScope),
    null,
    'a response from another tenant must never enter the active tenant cache',
);
assert.equal(
    normalizeOwnerComplianceLoadResponse(
        { ...tenantOnePayload, tenantId: undefined },
        tenantOneScope,
    ),
    null,
    'legacy unscoped responses must fail closed',
);
assert.equal(
    normalizeOwnerComplianceLoadResponse(
        {
            ...tenantOnePayload,
            privacy: { ...tenantOnePayload.privacy, source: 'unexpected' },
        },
        tenantOneScope,
    ),
    null,
    'malformed compliance page DTOs must fail closed',
);
assert.equal(
    normalizeOwnerComplianceLoadResponse(
        {
            ...tenantOnePayload,
            terms: { content: { private: true }, source: 'system' },
        },
        tenantOneScope,
    ),
    null,
    'non-string page content must fail closed before React rendering',
);

assert.equal(
    isOwnerComplianceMutationScopeAcknowledged(
        { tenantId: 'tenant-1', storeId: 'shared-store' },
        tenantOneScope,
    ),
    true,
);
assert.equal(
    isOwnerComplianceMutationScopeAcknowledged(
        { tenantId: 'tenant-2', storeId: 'shared-store' },
        tenantOneScope,
    ),
    false,
    'a mutation acknowledgement from another tenant must not produce owner success state',
);

console.log('Mobile compliance cache boundary tests passed.');
