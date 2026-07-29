import assert from 'node:assert/strict';
import {
    AUTHENTICATED_LOCAL_STORAGE_KEYS,
    AUTHENTICATED_SESSION_STORAGE_KEYS,
    AUTHENTICATED_SESSION_STORAGE_PREFIXES,
    removeAuthenticatedStorageKeys,
} from '../../src/lib/auth/clientSessionCleanup';

const removedFromSession: string[] = [];
const removedFromLocal: string[] = [];

removeAuthenticatedStorageKeys(
    { removeItem: (key: string) => { removedFromSession.push(key); } },
    { removeItem: (key: string) => { removedFromLocal.push(key); } },
);

assert.deepEqual(removedFromSession, [...AUTHENTICATED_SESSION_STORAGE_KEYS]);
assert.deepEqual(removedFromLocal, [...AUTHENTICATED_LOCAL_STORAGE_KEYS]);
assert.ok(removedFromSession.includes('menulist_deployment_identity'));
assert.ok(removedFromSession.includes('mobileMenuActiveProcessingJob'));
assert.ok(removedFromLocal.includes('session_expired_shown'));

const dynamicSessionKeys = [
    'dismissedMenuProcessingJobs:1:10',
    'menulist:activeProcessingJobId:1:10',
    'menulist:mobileMenuActiveProcessingJob:1:10',
    'menulist:pendingQualityAction:1:10',
    'unrelated-device-preference',
];
const dynamicallyRemoved: string[] = [];
removeAuthenticatedStorageKeys(
    {
        get length() { return dynamicSessionKeys.length; },
        key: (index: number) => dynamicSessionKeys[index] ?? null,
        removeItem: (key: string) => { dynamicallyRemoved.push(key); },
    },
    null,
);
for (const prefix of AUTHENTICATED_SESSION_STORAGE_PREFIXES) {
    assert.ok(dynamicallyRemoved.some((key) => key.startsWith(prefix)));
}
assert.ok(!dynamicallyRemoved.includes('unrelated-device-preference'));

assert.doesNotThrow(() => removeAuthenticatedStorageKeys(
    { removeItem: () => { throw new Error('blocked'); } },
    { removeItem: () => { throw new Error('blocked'); } },
));

console.log('Account and tenant browser lifecycle behavior tests passed.');
