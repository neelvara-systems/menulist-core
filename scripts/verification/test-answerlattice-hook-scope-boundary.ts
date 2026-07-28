import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildAnswerlatticeHookScopeKey,
    isAnswerlatticeHookScopeCurrent,
} from '../../src/lib/answerlattice/hookScopeBoundary';

assert.equal(buildAnswerlatticeHookScopeKey(1, 2), '1:2');
assert.equal(buildAnswerlatticeHookScopeKey(1, 3), '1:3');
assert.equal(buildAnswerlatticeHookScopeKey(0, 2), null);
assert.equal(buildAnswerlatticeHookScopeKey(1, -2), null);
assert.equal(buildAnswerlatticeHookScopeKey('1', 2), null);
assert.equal(buildAnswerlatticeHookScopeKey(1.5, 2), null);
assert.equal(isAnswerlatticeHookScopeCurrent('1:2', '1:2'), true);
assert.equal(isAnswerlatticeHookScopeCurrent('1:2', '1:3'), false);
assert.equal(isAnswerlatticeHookScopeCurrent('1:2', '2:2'), false);
assert.equal(isAnswerlatticeHookScopeCurrent(null, null), false);

const root = path.resolve(__dirname, '..', '..');
for (const relativePath of [
    'src/hooks/answerlattice/useEntities.ts',
    'src/hooks/answerlattice/useEntityCandidates.ts',
    'src/hooks/answerlattice/useMutationProposals.ts',
    'src/hooks/answerlattice/useSupportBoard.ts',
]) {
    const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
    assert.match(source, /useClientAuthSession\(\)/, `${relativePath} must derive the current session scope`);
    assert.match(
        source,
        /requestedScopeKey === sessionScopeKey \? requestedScopeKey : null/,
        `${relativePath} must fail closed unless requested and current session scopes match exactly`,
    );
    assert.match(source, /scopeKeyRef\.current/, `${relativePath} must reject late workspace settlement`);
}

const mutationHook = fs.readFileSync(
    path.join(root, 'src/hooks/answerlattice/useMutationProposals.ts'),
    'utf8',
);
assert.match(mutationHook, /mutationInFlightRef\.current/, 'mutation proposal actions must reject same-tick duplicates');
assert.match(mutationHook, /latestRefreshRef\.current !== requestId/, 'mutation proposal loads must reject superseded refreshes');

console.log('Answerlattice hook scope boundary tests passed.');
