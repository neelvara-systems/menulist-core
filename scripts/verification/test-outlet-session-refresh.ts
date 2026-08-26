import assert from 'node:assert/strict';

import { refreshCreatedOutletSessionAccess } from '@lib/multiOutlet/outletSessionRefresh';

async function main() {
    let refreshCount = 0;
    const refreshed = await refreshCreatedOutletSessionAccess(async () => {
        refreshCount += 1;
        return {
            user: {
                storeId: 41,
                storeIds: [41, 42],
                stores: [{ storeId: 42, role: 'owner' }],
            },
        };
    }, 42);
    assert.equal(refreshed, true, 'freshly persisted outlet membership must admit the new store');
    assert.equal(refreshCount, 1, 'outlet membership refresh must perform exactly one session refresh attempt');

    assert.equal(await refreshCreatedOutletSessionAccess(async () => ({
        user: {
            storeId: 41,
            storeIds: [41],
            stores: [{ storeId: 41, role: 'owner' }],
        },
    }), 42), false, 'a stale session must not claim access to the newly created outlet');

    assert.equal(await refreshCreatedOutletSessionAccess(async () => null, 42), false);
    assert.equal(await refreshCreatedOutletSessionAccess(async () => ({ user: { storeIds: [42] } }), '4.2e1'), false);

    await assert.rejects(
        refreshCreatedOutletSessionAccess(async () => {
            throw new Error('session refresh unavailable');
        }, 42),
        /session refresh unavailable/,
        'session refresh failures must remain recoverable by the calling UI',
    );

    console.log('Outlet session-refresh tests passed.');
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
