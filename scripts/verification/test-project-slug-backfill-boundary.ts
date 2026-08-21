import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
    allocateProjectBackfillSlug,
    deriveProjectBackfillBaseSlug,
    isReservedProjectBackfillSlug,
    projectBackfillSummaryMap,
    slugifyProjectBackfillValue,
} from '../backfill-project-slugs';
import {
    deriveOutletBackfillSlug,
    resolveUniqueOutletBackfillSlug,
    slugifyOutletBackfillValue,
} from '../backfill-outlet-slugs';
import { buildDigitalScreenPublicMirror } from '../backfill-digital-screen-public-mirrors';
import {
    isTenantBlockBackfillBlocked,
    resolveTenantBlockBackfillStoreIdentity,
} from '../backfill-store-tenant-block-state';
import { toAnswerlatticeSignalBackfillTimestamp } from '../migrations/backfill-answerlattice-signal-expiry';
import { buildBusinessTypeSwap } from '../migrate-business-type-swap';

assert.equal(slugifyProjectBackfillValue({ toString: () => 'attacker' }), '');
assert.equal(deriveProjectBackfillBaseSlug('project-1', { name: 'Client' }), 'client-menu');
assert.equal(isReservedProjectBackfillSlug('campaigncue'), true);
assert.equal(isReservedProjectBackfillSlug('menu'), false);
assert.equal(deriveProjectBackfillBaseSlug('project-1', { name: { en: 'Café Menu' } }), 'cafe-menu');

const claimed = new Set(['food', 'food-project-2']);
const allocated = allocateProjectBackfillSlug('food', 'project-2', claimed);
assert.equal(allocated, 'food-project-2-2');
assert.ok(allocated.length <= 80);

const longAllocated = allocateProjectBackfillSlug('a'.repeat(80), 'project-3', new Set(['a'.repeat(80)]));
assert.ok(longAllocated.length <= 80);
assert.match(longAllocated, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const map = projectBackfillSummaryMap({
    safe: { name: 'Safe' },
    '__proto__': { name: 'Unsafe' },
    constructor: { name: 'Unsafe' },
    primitive: 'unsafe',
});
assert.deepEqual(Object.keys(map), ['safe']);

assert.equal(slugifyOutletBackfillValue({ toString: () => 'attacker' }), '');
assert.equal(deriveOutletBackfillSlug('Menu', '42'), 'menu-outlet');
assert.equal(deriveOutletBackfillSlug('CampaignCue', '42'), 'campaigncue-outlet');
assert.equal(deriveOutletBackfillSlug({ en: 'Café Central' }, '42'), 'cafe-central');
const longOutletSlug = 'a'.repeat(60);
assert.equal(
    resolveUniqueOutletBackfillSlug(longOutletSlug, '7', { 7: new Set([longOutletSlug]) }),
    `${'a'.repeat(58)}-2`,
);

const timestampLike = { toMillis: () => 123 };
assert.equal(buildDigitalScreenPublicMirror('42', {
    screenToken: 'ABC123',
    contentVersion: [2],
    lastContentChangeAt: timestampLike,
    enabled: true,
}), null);
assert.equal(buildDigitalScreenPublicMirror('42', {
    screenToken: 'ABC123',
    contentVersion: { valueOf: () => 2 },
    lastContentChangeAt: timestampLike,
    enabled: true,
}), null);
const validScreenMirror = buildDigitalScreenPublicMirror('42', {
    screenToken: 'ABC123',
    contentVersion: 2,
    lastContentChangeAt: timestampLike,
    enabled: false,
});
assert.ok(validScreenMirror);
assert.equal(validScreenMirror.contentVersion, 2);
assert.equal(validScreenMirror.enabled, false);
assert.equal(validScreenMirror.lastContentChangeAt, timestampLike);
assert.equal(validScreenMirror.storeId, '42');
assert.ok(validScreenMirror.updatedAt);
assert.equal(isTenantBlockBackfillBlocked({ blockDetails: { blocked: true } }), true);
assert.equal(isTenantBlockBackfillBlocked({ blockDetails: [] }), false);
assert.equal(isTenantBlockBackfillBlocked({ tenantBlocked: 'true' }), false);
assert.deepEqual(resolveTenantBlockBackfillStoreIdentity('42', {
    storeId: 42,
    sId: '42',
    tenantId: 11,
    tId: '11',
}), { storeId: '42', tenantId: '11' });
assert.deepEqual(resolveTenantBlockBackfillStoreIdentity('42', {
    tId: 11,
}), { storeId: '42', tenantId: '11' });
assert.equal(resolveTenantBlockBackfillStoreIdentity('42', {
    storeId: 42,
    sId: 43,
    tenantId: 11,
}), null);
assert.equal(resolveTenantBlockBackfillStoreIdentity('42', {
    storeId: 42,
    tenantId: 11,
    tId: 12,
}), null);
assert.equal(resolveTenantBlockBackfillStoreIdentity('42', {
    storeId: 42,
    tenantId: 11,
    tId: 'invalid',
}), null);
assert.equal(toAnswerlatticeSignalBackfillTimestamp({ toMillis: () => '123' }), null);
assert.equal(toAnswerlatticeSignalBackfillTimestamp({ toMillis: () => { throw new Error('bad'); } }), null);
assert.equal(toAnswerlatticeSignalBackfillTimestamp(new Date('invalid')), null);
assert.equal(toAnswerlatticeSignalBackfillTimestamp(new Date(123))?.toMillis(), 123);
assert.equal(buildBusinessTypeSwap({ businessType: 'B2C', businessIndustry: { toString: () => 'Restaurant' } }), null);
assert.equal(buildBusinessTypeSwap({ businessType: 'B2C', businessIndustry: '' }), null);
assert.deepEqual(buildBusinessTypeSwap({
    businessType: 'B2C',
    businessIndustry: '  Restaurant  ',
}), {
    businessType: 'Restaurant',
    businessIndustry: 'B2C',
    businessCategory: 'food',
});

const repoRoot = path.resolve(__dirname, '../..');
const tsNode = path.join(repoRoot, 'node_modules/.bin/ts-node');
const compilerArgs = ['--compiler-options', '{"module":"CommonJS","target":"ES2022"}', '-r', 'tsconfig-paths/register'];
const runGuard = (script: string, scriptArgs: string[], expected: RegExp) => {
    const result = spawnSync(tsNode, [...compilerArgs, script, ...scriptArgs], {
        cwd: repoRoot,
        encoding: 'utf8',
        env: { ...process.env, FIREBASE_PROJECT_ID: '' },
    });
    assert.equal(result.status, 1, `${script} should reject unsafe invocation`);
    assert.match(`${result.stdout}\n${result.stderr}`, expected);
};

runGuard(
    'scripts/migrations/backfill-answerlattice-signal-expiry.ts',
    [],
    /Pass --project-id=<neelvara-answerlattice-qa\|answerlattice>/,
);
runGuard(
    'scripts/migrations/backfill-answerlattice-signal-expiry.ts',
    ['--project-id=neelvara-answerlattice-qa', '--apply'],
    /Refusing apply: pass --confirm-project=neelvara-answerlattice-qa/,
);
runGuard(
    'scripts/migrate-business-type-swap.ts',
    ['--project-id', 'menulist-qa', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/migrate-business-type-swap.ts',
    ['--project-id', 'menulist-qa', '--write', '--confirm-project', 'menulist-qa'],
    /Refusing write: pass --all-stores-and-tenants/,
);
runGuard(
    'scripts/backfill-store-tenant-block-state.ts',
    ['--project-id', 'menulist-qa'],
    /Pass exactly one of --tenant-id, --store-id, or --all-stores/,
);
runGuard(
    'scripts/backfill-store-tenant-block-state.ts',
    ['--project-id', 'menulist-qa', '--tenant-id', '01'],
    /--tenant-id must be an exact positive numeric document ID/,
);
runGuard(
    'scripts/backfill-store-tenant-block-state.ts',
    ['--project-id', 'menulist-qa', '--all-stores', '--limit', '1501'],
    /--limit must be a positive integer no greater than 1500/,
);
runGuard(
    'scripts/backfill-store-tenant-block-state.ts',
    ['--project-id', 'menulist-qa', '--store-id', '42', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/backfill-digital-screen-public-mirrors.ts',
    ['--project-id', 'menulist-qa', '--all-screens', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/backfill-outlet-slugs.ts',
    ['--project-id', 'menulist-qa'],
    /Pass --store-id or --all-outlets/,
);
runGuard(
    'scripts/backfill-outlet-slugs.ts',
    ['--project-id', 'menulist-qa', '--store-id', '42', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/backfill-project-slugs.ts',
    ['--project-id', 'menulist-qa'],
    /Pass --store-id or --all-stores/,
);
runGuard(
    'scripts/backfill-project-slugs.ts',
    ['--project-id', 'menulist-qa', '--store-id', '42', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/backfill-public-routing-project-summaries.ts',
    ['--project-id', 'menulist-qa'],
    /Pass exactly one of --store-id, --tenant-id, or --all-stores/,
);
runGuard(
    'scripts/backfill-public-routing-project-summaries.ts',
    ['--project-id', 'menulist-qa', '--store-id', '42', '--write'],
    /Refusing write: pass --confirm-project menulist-qa/,
);
runGuard(
    'scripts/backfill-public-routing-project-summaries.ts',
    [
        '--project-id', 'menulist-qa', '--store-id', '42', '--write',
        '--confirm-project', 'menulist-qa', '--force',
    ],
    /Refusing forced overwrite: pass --confirm-force/,
);

process.stdout.write('Project-slug backfill boundary verification passed.\n');
