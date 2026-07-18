import assert from 'node:assert/strict';
import {
    AUTHENTICATED_LOCAL_STORAGE_KEYS,
    AUTHENTICATED_SESSION_STORAGE_KEYS,
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

assert.doesNotThrow(() => removeAuthenticatedStorageKeys(
    { removeItem: () => { throw new Error('blocked'); } },
    { removeItem: () => { throw new Error('blocked'); } },
));

console.log('Account and tenant browser lifecycle behavior tests passed.');
