#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { PRODUCT_IDS } from '@constant/product';
import {
    createAnswerlatticeStaffUser,
    deleteAnswerlatticeRoleDefinition,
    fetchAnswerlatticeStaffUsers,
    forceSignOutAnswerlatticeStaffUser,
    removeAnswerlatticeStaffUser,
    requestAnswerlatticeStaffPasswordReset,
    saveAnswerlatticeRoleDefinition,
    updateAnswerlatticeStaffUser,
} from '@lib/answerlattice/staffAccessClient';

const originalFetch = globalThis.fetch;

const respondWith = (value: unknown) => {
    globalThis.fetch = async () => new Response(JSON.stringify(value), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
    });
};

const role = {
    active: true,
    createdBy: 'test',
    createdOn: '2026-07-13T00:00:00.000Z',
    description: 'Support access',
    id: 'staff',
    name: 'Support Staff',
    pId: PRODUCT_IDS.ANSWERLATTICE,
    permissions: { canManageSupport: true },
    sId: 20,
    tId: 10,
};

const user = {
    accessRevision: 3,
    active: true,
    email: 'staff@example.com',
    id: 'staff-user',
    roleId: 'staff',
    storeId: 20,
    storeIds: [20],
    stores: [{ name: 'Workspace', role: 'staff', storeId: 20 }],
    tenantId: 10,
};

const main = async () => {
    try {
        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [user],
        });
        const valid = await fetchAnswerlatticeStaffUsers();
        assert.equal(valid.users[0].id, user.id);

        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [{ ...user, storeIds: [20, 20] }],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [{ ...user, stores: [{ name: 'Workspace', role: 'staff', storeId: '20' }] }],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [{ ...user, name: { unsafe: true } }],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [{ ...user, roleId: 'manager' }],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            roles: [role],
            store: { name: 'Workspace', storeId: 21, tenantId: 10 },
            users: [user],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            roles: [{ ...role, tId: 11 }],
            store: { name: 'Workspace', storeId: 20, tenantId: 10 },
            users: [user],
        });
        await assert.rejects(fetchAnswerlatticeStaffUsers());

        respondWith({
            success: true,
            temporaryPasscode: { unsafe: true },
            user,
            userId: user.id,
        });
        await assert.rejects(createAnswerlatticeStaffUser({
            requestId: 'ad196daf-3e10-4a2d-8f1e-ae095f0ce032',
        }));

        respondWith({
            success: true,
            user,
            userId: 'different-user',
        });
        await assert.rejects(createAnswerlatticeStaffUser({
            requestId: 'b1f5b13c-90ca-41c7-87c3-4f44cd04606f',
        }));

        respondWith({
            success: true,
            staffAuthMode: 'owner_passcode',
            user,
            userId: user.id,
        });
        const validMutation = await createAnswerlatticeStaffUser({
            requestId: '348b087d-02ac-4290-9a27-588973809473',
        });
        assert.equal(validMutation.user?.id, user.id);

        respondWith({ success: true });
        await assert.rejects(createAnswerlatticeStaffUser({
            requestId: '9a85202c-f25f-4794-898c-7380e77be322',
        }));

        respondWith({ success: true, user, userId: user.id });
        await assert.rejects(updateAnswerlatticeStaffUser({ userId: 'different-user' }));
        const validUpdate = await updateAnswerlatticeStaffUser({ userId: user.id });
        assert.equal(validUpdate.userId, user.id);

        respondWith({ removed: false, success: true, userId: user.id });
        await assert.rejects(removeAnswerlatticeStaffUser(user.id));
        respondWith({ removed: true, replay: true, success: true, userId: user.id });
        assert.equal((await removeAnswerlatticeStaffUser(user.id)).removed, true);

        respondWith({ success: true, user, userId: user.id });
        await assert.rejects(requestAnswerlatticeStaffPasswordReset(user.id));
        respondWith({
            staffLoginId: 'S-77123456',
            success: true,
            temporaryPasscode: '12345678',
            user,
            userId: user.id,
        });
        assert.equal((await requestAnswerlatticeStaffPasswordReset(user.id)).staffLoginId, 'S-77123456');

        respondWith({ success: true, user, userId: 'different-user' });
        await assert.rejects(forceSignOutAnswerlatticeStaffUser(user.id));

        respondWith({
            role,
            roles: [role, { ...role, id: 'manager', sId: 21 }],
            success: true,
        });
        await assert.rejects(saveAnswerlatticeRoleDefinition({
            requestId: 'af3b853b-af29-4d12-bc5b-7585356bb59e',
            role: { name: 'Support role', permissions: {} },
        }));
        respondWith({ roles: [role, role], success: true });
        await assert.rejects(deleteAnswerlatticeRoleDefinition(role.id));

        console.log('Answerlattice staff client contract tests passed.');
    } finally {
        globalThis.fetch = originalFetch;
    }
};

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
