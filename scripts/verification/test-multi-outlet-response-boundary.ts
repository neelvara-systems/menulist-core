import assert from 'node:assert/strict';

import {
    isOutletCreateResponse,
    isOutletDeactivateResponse,
    isOutletRenameResponse,
} from '../../src/lib/multiOutlet/outletActionResponseGuards';
import {
    extractMasterStorePropagationChanges,
} from '../../src/database/multiOutlet/brandPropagation';
import { applyOutletPolicy } from '../../src/lib/permissions/applyOutletPolicy';
import { DEFAULT_OUTLET_POLICY } from '../../src/types/multiOutlet.types';

const createResponse = {
    masterPromoted: true,
    outletName: 'South Outlet',
    outletPolicy: DEFAULT_OUTLET_POLICY,
    outletSlug: 'south-outlet',
    quantity: 2,
    storeId: 12,
    success: true,
    tenantName: 'Example Group',
};

assert.equal(isOutletCreateResponse(createResponse), true);
assert.equal(isOutletCreateResponse({ ...createResponse, storeId: 12.5 }), false);
assert.equal(isOutletCreateResponse({ ...createResponse, storeId: Number.MAX_SAFE_INTEGER + 1 }), false);
assert.equal(isOutletCreateResponse({ ...createResponse, outletSlug: '../other-outlet' }), false);
assert.equal(isOutletCreateResponse({ ...createResponse, tenantName: '   ' }), false);
assert.equal(isOutletCreateResponse({
    ...createResponse,
    outletPolicy: { priceOverride: true },
}), false);

const renameResponse = {
    outletSlug: 'renamed-outlet',
    outletStoreId: '12',
    previousOutletSlugs: ['south-outlet'],
    success: true,
};

assert.equal(isOutletRenameResponse(renameResponse, 12, 'renamed-outlet'), true);
assert.equal(isOutletRenameResponse(renameResponse, 13, 'renamed-outlet'), false);
assert.equal(isOutletRenameResponse(renameResponse, 12, 'different-outlet'), false);
assert.equal(isOutletRenameResponse({ ...renameResponse, outletStoreId: '12.0' }, 12), false);
assert.equal(isOutletRenameResponse({
    ...renameResponse,
    previousOutletSlugs: Array.from({ length: 21 }, (_, index) => `outlet-${index}`),
}), false);

const deactivateResponse = {
    billingReduced: false,
    outletStoreId: 12,
    success: true,
};

assert.equal(isOutletDeactivateResponse(deactivateResponse, 12), true);
assert.equal(isOutletDeactivateResponse(deactivateResponse, 13), false);
assert.equal(isOutletDeactivateResponse({ ...deactivateResponse, outletStoreId: -12 }), false);
assert.equal(isOutletDeactivateResponse({ ...deactivateResponse, outletStoreId: 12.5 }), false);

const effectiveOutletPermissions = applyOutletPolicy(
    { canAccessBilling: true, canManageMenu: true, canUseMenuExtraction: true },
    { ...DEFAULT_OUTLET_POLICY, canUseMenuExtraction: false },
    false,
);
assert.equal(effectiveOutletPermissions.canAccessBilling, false);
assert.equal(effectiveOutletPermissions.canManageMenu, true);
assert.equal(effectiveOutletPermissions.canUseMenuExtraction, false);
assert.equal(effectiveOutletPermissions.outletPolicy?.canUseMenuExtraction, false);

assert.deepEqual(
    extractMasterStorePropagationChanges({ businessType: 42 }),
    { businessType: 42 },
    'Malformed business fields must remain inert for the server validation boundary',
);
assert.deepEqual(
    extractMasterStorePropagationChanges({ businessType: 'Cafe' }),
    { businessCategory: 'food', businessType: 'Cafe' },
    'Canonical business fields must retain category derivation before propagation',
);

console.log('Multi-outlet response boundary verification passed.');
