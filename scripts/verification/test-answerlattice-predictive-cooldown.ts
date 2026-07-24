#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    buildAnswerlatticePredictiveCooldownKey,
    claimAnswerlatticePredictiveCooldown,
    type AnswerlatticePredictiveCooldownStore,
} from '@lib/answerlattice/predictiveCooldown';

const ROOT = path.resolve(__dirname, '..', '..');
const engine = fs.readFileSync(path.join(ROOT, 'src/lib/answerlattice/predictiveEngine.ts'), 'utf8');

const base = { tId: 7, sId: 9, userId: 'session_12345678', triggerId: 'billing_recovery' };
const key = buildAnswerlatticePredictiveCooldownKey(base);
assert.ok(key);
assert.match(key!, /^answerlattice:predictive:cooldown:7:9:[a-f0-9]{32}:[a-f0-9]{32}$/);
assert.notEqual(key, buildAnswerlatticePredictiveCooldownKey({ ...base, tId: 8 }));
assert.notEqual(key, buildAnswerlatticePredictiveCooldownKey({ ...base, sId: 10 }));
assert.notEqual(key, buildAnswerlatticePredictiveCooldownKey({ ...base, userId: 'session_87654321' }));
assert.notEqual(key, buildAnswerlatticePredictiveCooldownKey({ ...base, triggerId: 'billing_retry' }));
assert.equal(buildAnswerlatticePredictiveCooldownKey({ ...base, tId: 0 }), null);

const calls: Array<{ key: string; value: string; options: { ex: number; nx: true } }> = [];
let claimed = false;
const store: AnswerlatticePredictiveCooldownStore = {
    set: async (candidateKey, value, options) => {
        calls.push({ key: candidateKey, value, options });
        if (claimed) return null;
        claimed = true;
        return 'OK';
    },
};

async function main(): Promise<void> {
    assert.equal(await claimAnswerlatticePredictiveCooldown({ store, key: key!, cooldownHours: 24 }), true);
    assert.equal(await claimAnswerlatticePredictiveCooldown({ store, key: key!, cooldownHours: 24 }), false);
    assert.deepEqual(calls[0], { key, value: '1', options: { ex: 86_400, nx: true } });
    assert.equal(await claimAnswerlatticePredictiveCooldown({ store, key: key!, cooldownHours: 0 }), false);
    assert.equal(calls.length, 2, 'invalid TTL must not reach Redis');

    assert.match(engine, /trigger\.kind !== 'known_issue'[\s\S]*!await claimCooldown/);
    assert.doesNotMatch(engine, /setCooldown\(/);
    assert.doesNotMatch(engine, /redis\.exists\(/);
    assert.match(engine, /const cacheKey = `\$\{PRODUCT_IDS\.ANSWERLATTICE\}:\$\{tId\}:\$\{sId\}`/);
    assert.match(engine, /const currentLoad = triggerIndexLoads\.get\(cacheKey\)/);

    process.stdout.write('Answerlattice predictive cooldown contracts passed.\n');
}

void main();
