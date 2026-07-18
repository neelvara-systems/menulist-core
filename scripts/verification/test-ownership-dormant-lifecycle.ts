import assert from 'node:assert/strict';
import { DEFAULT_ROLE_IDS } from '../../src/data/shared/defaultRoles';
import {
    hasOperationalOwnerAccess,
    OWNER_ACCESS_NOT_TRANSFER_COPY,
    OWNERSHIP_TRANSFER_SUPPORT_EMAIL,
} from '../../src/lib/staffManagement/ownershipTransferBoundary';

assert.equal(hasOperationalOwnerAccess(undefined), false);
assert.equal(hasOperationalOwnerAccess([]), false);
assert.equal(hasOperationalOwnerAccess([{ role: DEFAULT_ROLE_IDS.STAFF }]), false);
assert.equal(hasOperationalOwnerAccess([{ role: DEFAULT_ROLE_IDS.OWNER }]), true);
assert.equal(
    hasOperationalOwnerAccess([
        { role: DEFAULT_ROLE_IDS.MANAGER },
        { role: DEFAULT_ROLE_IDS.OWNER },
    ]),
    true,
);
assert.match(OWNER_ACCESS_NOT_TRANSFER_COPY, /does not transfer the business account/i);
assert.equal(OWNERSHIP_TRANSFER_SUPPORT_EMAIL, 'support@menulist.ai');

console.log('Ownership transfer and dormant lifecycle behavior tests passed.');
