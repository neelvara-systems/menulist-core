import assert from 'node:assert/strict';
import {
    CANONICAL_GOVERNED_FALLBACK_MESSAGES,
    evaluateCanonicalAnswerScope,
    isCanonicalGovernedFallbackReason,
} from '../../src/lib/answerlattice/canonicalRetrieval';
import { buildCacheKey } from '../../src/lib/answerlattice/instantCache';
import {
    getAnswerlatticeProductAccount,
    isAnswerlatticeActiveStoreInScope,
    isAnswerlatticeStoreInScope,
    resolveAnswerlatticeSessionScope,
} from '../../src/lib/answerlattice/sessionScope';
import type { AnswerlatticeCanonicalAnswer } from '../../src/types/answerlattice';

const answerWithScope = (
    scope: Partial<AnswerlatticeCanonicalAnswer['scope']>,
): Partial<AnswerlatticeCanonicalAnswer> => ({
    scope: {
        entityIds: ['entity_billing'],
        ...scope,
    },
});

assert.equal(
    evaluateCanonicalAnswerScope(answerWithScope({}), {}).applicable,
    true,
    'unrestricted canonical answers must apply without optional context',
);

const missingPlan = evaluateCanonicalAnswerScope(
    answerWithScope({ planIds: ['growth'] }),
    {},
);
assert.equal(missingPlan.applicable, false, 'plan-restricted answers must fail closed without plan context');
assert.deepEqual(missingPlan.missingContext, ['plan']);

assert.equal(
    evaluateCanonicalAnswerScope(
        answerWithScope({ planIds: ['Growth'], roleIds: ['Owner'], stateIds: ['Past_Due'] }),
        { planId: 'growth', roleId: 'owner', stateId: 'past_due' },
    ).applicable,
    true,
    'all restricted dimensions must match after bounded normalization',
);

const wrongRole = evaluateCanonicalAnswerScope(
    answerWithScope({ planIds: ['growth'], roleIds: ['owner'] }),
    { context: { plan: 'growth', userRole: 'member' } },
);
assert.equal(wrongRole.applicable, false, 'wrong role context must not receive a restricted answer');
assert.deepEqual(wrongRole.mismatchedContext, ['role']);

const missingState = evaluateCanonicalAnswerScope(
    answerWithScope({ stateIds: ['past_due'] }),
    { planId: 'growth', roleId: 'owner' },
);
assert.deepEqual(missingState.missingContext, ['state'], 'state restrictions must not be guessed from other context');

assert.equal(isCanonicalGovernedFallbackReason('canonical_scope_context_required'), true);
assert.equal(isCanonicalGovernedFallbackReason('no_entity_match'), false);
assert.match(
    CANONICAL_GOVERNED_FALLBACK_MESSAGES.canonical_scope_not_covered,
    /current plan, role, or product state/,
);

const instantCacheKey = buildCacheKey(11, 22, 'entity_billing', 25, 'growth', 'owner', 'past_due');
assert.match(
    instantCacheKey,
    /^canon:v4:11:22:e:[A-Za-z0-9_-]{22}:v25:p:[A-Za-z0-9_-]{22}:r:[A-Za-z0-9_-]{22}:s:[A-Za-z0-9_-]{22}$/,
    'instant canonical cache keys must isolate applicability context and bypass legacy cache entries',
);
['entity_billing', 'growth', 'owner', 'past_due'].forEach((rawSegment) => {
    assert.equal(
        instantCacheKey.includes(rawSegment),
        false,
        `instant canonical cache keys must not expose raw ${rawSegment} context`,
    );
});

const workspace = { tenantId: 11, storeId: 22 };
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', tId: 11, sId: 22 }, workspace),
    true,
    'exact Answerlattice store ownership must be admitted',
);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', tenantId: '11' }, workspace, '22'),
    true,
    'the exact fetched document ID may supply store identity for legacy rows',
);
assert.equal(isAnswerlatticeStoreInScope({ pId: ' al ', tId: 11, sId: 22 }, workspace), false);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', productId: 'ML', tId: 11, sId: 22 }, workspace),
    false,
    'conflicting explicit product identities must fail closed',
);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: null, productId: 'AL', tId: 11, sId: 22 }, workspace),
    false,
    'an invalid explicit product identity must not be masked by an alias',
);
assert.equal(isAnswerlatticeStoreInScope({ pId: 'AL', tId: ' 11 ', sId: 22 }, workspace), false);
assert.equal(isAnswerlatticeStoreInScope({ pId: 'AL', tId: 12, sId: 22 }, workspace), false);
assert.equal(isAnswerlatticeStoreInScope({ pId: 'AL', tId: 11, sId: 23 }, workspace), false);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', tenantId: 11, tId: 12, sId: 22 }, workspace),
    false,
    'conflicting tenant aliases must fail closed',
);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', tId: 11, storeId: 22, sId: 23 }, workspace),
    false,
    'conflicting store aliases must fail closed',
);
assert.equal(
    isAnswerlatticeStoreInScope({ pId: 'AL', tId: 11, sId: 22 }, workspace, '23'),
    false,
    'embedded store identity must agree with the Firestore document id',
);
assert.equal(isAnswerlatticeStoreInScope({ pId: 'AL', sId: 22 }, workspace), false, 'missing tenant ownership must fail closed');
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22 }, workspace), true);
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22, active: false }, workspace), false);
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22, deleted: true }, workspace), false);
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22, authDisabled: true }, workspace), false);
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22, blocked: true }, workspace), false);
assert.equal(isAnswerlatticeActiveStoreInScope({ pId: 'AL', tId: 11, sId: 22, blockDetails: { blocked: true } }, workspace), false);

assert.deepEqual(getAnswerlatticeProductAccount({
    productAccounts: {
        AL: { active: true, tenantId: 11, tId: 11, storeId: 22, sId: 22 },
    },
}), { tenantId: 11, storeId: 22, role: undefined, platformRole: undefined, storeIds: undefined });
assert.equal(getAnswerlatticeProductAccount({
    productAccounts: {
        AL: { active: true, tenantId: 11, tId: 12, storeId: 22 },
    },
}), null, 'contradictory nested account aliases must fail closed');
assert.deepEqual(resolveAnswerlatticeSessionScope({
    pId: 'AL',
    productId: 'AL',
    tenantId: 11,
    tId: 11,
    storeId: 22,
    sId: 22,
}), { tenantId: 11, storeId: 22, role: undefined });
assert.equal(resolveAnswerlatticeSessionScope({
    pId: 'AL',
    productId: 'ML',
    tenantId: 11,
    storeId: 22,
}), null, 'contradictory root product aliases must fail closed');
assert.equal(resolveAnswerlatticeSessionScope({
    pId: 'AL',
    tenantId: 11,
    tId: 12,
    storeId: 22,
}), null, 'contradictory root tenant aliases must fail closed');

process.stdout.write('Answerlattice canonical scope contract tests passed.\n');
