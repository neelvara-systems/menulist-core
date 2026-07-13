import assert from 'assert';
import {
    isAnswerlatticeManualSchedulerAuthorized,
    parseAnswerlatticeManualSchedulerRequest,
} from '../../functions-answerlattice/src/answerlattice/manualSchedulerBoundary';

const secret = 'answerlattice-cron-secret-1234567890';
assert.equal(isAnswerlatticeManualSchedulerAuthorized({ authorizationHeader: `Bearer ${secret}`, cronSecret: secret }), true);
assert.equal(isAnswerlatticeManualSchedulerAuthorized({ authorizationHeader: 'Bearer wrong', cronSecret: secret }), false);
assert.equal(isAnswerlatticeManualSchedulerAuthorized({ authorizationHeader: `Bearer ${secret}`, cronSecret: 'short' }), false);
assert.equal(isAnswerlatticeManualSchedulerAuthorized({ authorizationHeader: '', cronSecret: '', emulator: true }), true);

assert.deepEqual(parseAnswerlatticeManualSchedulerRequest({ tId: 1, sId: 2 }), {
    forceAllTenants: false,
    scope: { tId: 1, sId: 2 },
});
assert.deepEqual(parseAnswerlatticeManualSchedulerRequest({ forceAllTenants: true }), {
    forceAllTenants: true,
    scope: null,
});
for (const invalid of [{}, { tId: 1 }, { sId: 2 }, { forceAllTenants: false }, { forceAllTenants: true, tId: 1, sId: 2 }, { tId: 1, sId: 2, extra: true }]) {
    assert.throws(() => parseAnswerlatticeManualSchedulerRequest(invalid));
}

console.log('Answerlattice manual scheduler request and auth boundaries passed.');
