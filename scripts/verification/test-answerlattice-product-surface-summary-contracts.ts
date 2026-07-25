#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    answerlatticeProductSurfaceSummaryRebuildRequestSchema,
    isExactAnswerlatticeProductSurfaceSummaryScope,
} from '@lib/answerlattice/productSurfaceSummaryContracts';

const validScope = { tId: 41, sId: 4101 };

assert.deepEqual(
    answerlatticeProductSurfaceSummaryRebuildRequestSchema.parse({
        reason: 'manual',
        scope: validScope,
    }),
    { reason: 'manual', scope: validScope },
);

assert.equal(
    answerlatticeProductSurfaceSummaryRebuildRequestSchema.safeParse({
        reason: 'manual',
    }).success,
    false,
);
assert.equal(
    answerlatticeProductSurfaceSummaryRebuildRequestSchema.safeParse({
        reason: 'manual',
        scope: { tId: '41', sId: 4101 },
    }).success,
    false,
);
assert.equal(
    answerlatticeProductSurfaceSummaryRebuildRequestSchema.safeParse({
        reason: 'manual',
        scope: { ...validScope, tenantId: 41 },
    }).success,
    false,
);
assert.equal(
    answerlatticeProductSurfaceSummaryRebuildRequestSchema.safeParse({
        reason: 'manual',
        scope: { tId: 0, sId: 4101 },
    }).success,
    false,
);

assert.equal(isExactAnswerlatticeProductSurfaceSummaryScope(validScope, { ...validScope }), true);
assert.equal(
    isExactAnswerlatticeProductSurfaceSummaryScope(validScope, { tId: 42, sId: 4101 }),
    false,
);
assert.equal(
    isExactAnswerlatticeProductSurfaceSummaryScope(validScope, { tId: 41, sId: 4102 }),
    false,
);

process.stdout.write('Answerlattice product-surface summary request scope contracts passed.\n');
