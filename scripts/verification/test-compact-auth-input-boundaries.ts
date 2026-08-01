#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { PERMISSIONS } from '../../src/constants/permissions';
import { createDefaultRoles, getOwnerRoleId } from '../../src/data/shared/defaultRoles';
import {
    getPermissionsForRole,
    hasPermission,
    hasValidRole,
} from '../../src/lib/permissions/hasPermission';
import {
    createOwnerReferralToken,
    validateOwnerReferralToken,
} from '../../src/lib/ownerReferral/ownerReferralTokenServer';
import {
    ResellerAddLocationCapacitySchema,
    ResellerOnboardSchema,
    ResellerRenewSchema,
} from '../../src/lib/validation/resellerSchemas';
import type { StoreRoleDataType } from '../../src/types/platform/roles';

const operationId = '8bd23ee5-3754-4df1-a113-98f43668c741';

const validOnboardInput = {
    operationId,
    businessName: ' Boundary Cafe ',
    businessType: ' Restaurant ',
    ownerPhone: '9876543210',
    ownerEmail: ' owner@example.com ',
    ownerPassword: 'correct horse',
    pricingTier: 'STANDARD',
    commitmentMonths: 3,
    locationCount: 2,
    paymentMode: 'offline',
} as const;

const parsedOnboard = ResellerOnboardSchema.parse(validOnboardInput);
assert.equal(parsedOnboard.businessName, 'Boundary Cafe');
assert.equal(parsedOnboard.businessType, 'Restaurant');
assert.equal(parsedOnboard.ownerEmail, 'owner@example.com');
assert.equal(parsedOnboard.locationCount, 2);

for (const hostileLocationCount of [['2'], true, '2']) {
    assert.equal(
        ResellerOnboardSchema.safeParse({
            ...validOnboardInput,
            locationCount: hostileLocationCount,
        }).success,
        false,
        'JSON body quantities must not be coerced from another runtime type',
    );
}

assert.equal(
    ResellerOnboardSchema.safeParse({ ...validOnboardInput, unexpected: true }).success,
    false,
    'Reseller mutation bodies must reject unexpected fields',
);
assert.equal(
    ResellerRenewSchema.safeParse({
        operationId,
        storeId: ['41'],
        tenantId: 31,
        pricingTier: 'STANDARD',
        durationMonths: 3,
        paymentMode: 'offline',
    }).success,
    false,
    'Billing scope identifiers must not be coerced from arrays',
);
assert.equal(
    ResellerAddLocationCapacitySchema.safeParse({
        operationId,
        storeId: 41,
        tenantId: '31',
        locationCount: 1,
    }).success,
    false,
    'Location-capacity tenant scope must be a JSON number',
);

const ownerRole = createDefaultRoles(41, 'owner@example.com')
    .find((role) => role.id === getOwnerRoleId());
assert.ok(ownerRole);
assert.equal(
    hasPermission(getOwnerRoleId(), [ownerRole], PERMISSIONS.MANAGE_USERS),
    true,
);

const malformedActiveRole = { ...ownerRole, active: 'true' } as unknown as StoreRoleDataType;
assert.equal(
    hasPermission(getOwnerRoleId(), [malformedActiveRole], PERMISSIONS.MANAGE_USERS),
    false,
    'Non-boolean persisted role activation must fail closed',
);
assert.equal(
    getPermissionsForRole(getOwnerRoleId(), [malformedActiveRole]).canManageUsers,
    false,
);
assert.equal(
    hasPermission(getOwnerRoleId(), [ownerRole, { ...ownerRole }], PERMISSIONS.MANAGE_USERS),
    false,
    'Duplicate active role definitions must be treated as ambiguous authority',
);
assert.equal(
    getPermissionsForRole(getOwnerRoleId(), null as unknown as StoreRoleDataType[]).canManageUsers,
    false,
    'Malformed persisted role collections must fail closed without throwing',
);
assert.equal(hasValidRole('   '), false);

const previousSecret = process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET;
process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET = Buffer.alloc(32, 29).toString('base64url');
try {
    const { token } = createOwnerReferralToken({
        referrerTenantId: 31,
        referrerStoreId: 41,
    });
    assert.ok(validateOwnerReferralToken(token));
    const parts = token.split('.');
    parts[1] = `${parts[1]}=`;
    assert.equal(
        validateOwnerReferralToken(parts.join('.')),
        null,
        'Equivalent but non-canonical Base64URL token representations must fail',
    );
} finally {
    if (previousSecret === undefined) delete process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET;
    else process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET = previousSecret;
}

console.log('Compact auth and input boundary verification passed.');
