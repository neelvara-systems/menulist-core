import assert from 'node:assert/strict';
import {
    getProjectOwnerScopeFromProjectId,
    getProjectOwnerScopeKey,
    normalizeProjectOwnerScope,
    projectOwnerScopesMatch,
} from '../../src/lib/menu/projectOwnerScope';

const scope = normalizeProjectOwnerScope(12, 34);
assert.deepEqual(scope, { tId: 12, sId: 34 });
assert.equal(getProjectOwnerScopeKey(scope), '12:34');
assert.equal(projectOwnerScopesMatch(scope, { tId: 12, sId: 34 }), true);
assert.equal(projectOwnerScopesMatch(scope, { tId: 12, sId: 35 }), false);
assert.equal(projectOwnerScopesMatch(scope, null), false);

assert.deepEqual(
    getProjectOwnerScopeFromProjectId('12-menu-opaque-34'),
    { tId: 12, sId: 34 },
);

for (const invalid of [
    [0, 34],
    [12, -1],
    ['012', 34],
    ['12 ', 34],
    [12, '34/other'],
    [Number.MAX_SAFE_INTEGER + 1, 34],
] as const) {
    assert.equal(
        normalizeProjectOwnerScope(invalid[0], invalid[1]),
        null,
        `invalid owner scope must fail closed: ${String(invalid[0])}/${String(invalid[1])}`,
    );
}

for (const invalidProjectId of [
    null,
    '',
    '12-34',
    '012-menu-34',
    '12-menu-034',
    '12/menu/34',
    '12-menu-34 ',
]) {
    assert.equal(
        getProjectOwnerScopeFromProjectId(invalidProjectId),
        null,
        `invalid project identity must fail closed: ${String(invalidProjectId)}`,
    );
}

console.log('Project owner-scope tests passed.');
