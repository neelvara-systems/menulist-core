import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    buildAnswerlatticeVersionDriftReason,
    deriveAutomatedDriftState,
    evaluateAnswerlatticeAutomatedDrift,
    type AnswerlatticeDriftAnswer,
    type AnswerlatticeDriftEntity,
    type AnswerlatticeDriftSignal,
} from '../../src/data/shared/answerlatticeDrift';

const root = path.resolve(__dirname, '../..');
assert.equal(
    fs.readFileSync(path.join(root, 'src/data/shared/answerlatticeDrift.ts'), 'utf8'),
    fs.readFileSync(path.join(root, 'functions-answerlattice/src/sharedData/answerlatticeDrift.ts'), 'utf8'),
    'the app and Answerlattice Functions drift policies must remain byte-for-byte identical',
);

assert.deepEqual(
    deriveAutomatedDriftState(false, null, []),
    { driftFlag: false, driftReason: null, shouldWrite: false },
    'a clean automated evaluation must not create a write',
);

assert.deepEqual(
    deriveAutomatedDriftState(true, '[signal_anomaly] existing', []),
    { driftFlag: true, driftReason: '[signal_anomaly] existing', shouldWrite: false },
    'a clean automated evaluation must not clear owner-review drift',
);

assert.deepEqual(
    deriveAutomatedDriftState(false, null, [' [scope_conflict] overlap ', '[scope_conflict] overlap']),
    { driftFlag: true, driftReason: '[scope_conflict] overlap', shouldWrite: true },
    'new automated drift must be normalized and deduplicated before persistence',
);

assert.deepEqual(
    deriveAutomatedDriftState(true, '[scope_conflict] overlap', ['[scope_conflict] overlap']),
    { driftFlag: true, driftReason: '[scope_conflict] overlap', shouldWrite: false },
    'identical automated drift must be idempotent',
);

const baseAnswer: AnswerlatticeDriftAnswer = {
    id: 'answer-a',
    entityIds: ['entity-a', 'entity-b'],
    planIds: ['plan-pro'],
    roleIds: ['role-owner'],
    stateIds: ['state-active'],
    versionFrom: 100,
    versionTo: null,
    lastValidatedInVersion: 100,
    lastValidatedAtMs: 1_000,
};
const entities = new Map<string, AnswerlatticeDriftEntity>([
    ['entity-a', { id: 'entity-a', name: 'Entity A', status: 'active' }],
    ['entity-b', { id: 'entity-b', name: 'Entity B', status: 'active' }],
]);
const fiveNegativeSignals: AnswerlatticeDriftSignal[] = Array.from({ length: 5 }, (_, index) => ({
    entityId: 'entity-b',
    type: 'chat_negative',
    timestampMs: 2_000 + index,
}));

const secondEntitySignalEvaluation = evaluateAnswerlatticeAutomatedDrift(
    baseAnswer,
    [baseAnswer],
    entities,
    new Map([['entity-b', fiveNegativeSignals]]),
);
assert.equal(secondEntitySignalEvaluation.signalCounts.chatNegative, 5);
assert.match(secondEntitySignalEvaluation.driftReasons[0], /^\[signal_anomaly\]/);

const ticketSignals: AnswerlatticeDriftSignal[] = Array.from({ length: 11 }, (_, index) => ({
    entityId: 'entity-a',
    type: 'ticket',
    timestampMs: 3_000 + index,
}));
assert.match(
    evaluateAnswerlatticeAutomatedDrift(
        baseAnswer,
        [baseAnswer],
        entities,
        new Map([['entity-a', ticketSignals]]),
    ).driftReasons[0],
    /11 ticket events/,
    'the fixed ticket threshold must be described as an observed count, not an unmeasured baseline',
);

const conflictingAnswers: AnswerlatticeDriftAnswer[] = [
    baseAnswer,
    { ...baseAnswer, id: 'answer-z', entityIds: ['entity-a'] },
    { ...baseAnswer, id: 'answer-b', entityIds: ['entity-a'] },
];
const conflictEvaluation = evaluateAnswerlatticeAutomatedDrift(
    baseAnswer,
    conflictingAnswers,
    entities,
    new Map(),
);
assert.deepEqual(conflictEvaluation.conflictingAnswerIds, ['answer-b', 'answer-z']);
assert.match(conflictEvaluation.driftReasons[0], /answer-b, answer-z/);

const scopedApart = evaluateAnswerlatticeAutomatedDrift(
    baseAnswer,
    [baseAnswer, { ...baseAnswer, id: 'answer-other', planIds: ['plan-enterprise'] }],
    entities,
    new Map(),
);
assert.equal(scopedApart.conflictingAnswerIds.length, 0, 'non-overlapping explicit plan scopes must not conflict');

const deprecatedEntities = new Map(entities);
deprecatedEntities.set('entity-b', { id: 'entity-b', name: 'Entity B', status: 'deprecated' });
const deprecationEvaluation = evaluateAnswerlatticeAutomatedDrift(
    baseAnswer,
    [baseAnswer],
    deprecatedEntities,
    new Map(),
);
assert.deepEqual(deprecationEvaluation.deprecatedEntityIds, ['entity-b']);
assert.match(deprecationEvaluation.driftReasons[0], /^\[deprecated_entity\]/);

assert.throws(
    () => evaluateAnswerlatticeAutomatedDrift(baseAnswer, [baseAnswer], new Map(), new Map()),
    /Bound entity entity-a is missing/,
    'missing bound entities must fail closed instead of producing a false clean result',
);

assert.equal(
    buildAnswerlatticeVersionDriftReason(baseAnswer, {
        versionLabel: 'v2',
        versionNormalized: 200,
        changedEntityIds: ['entity-b'],
    }),
    '[version_mismatch] entity-b changed in v2; answer was last validated at version 100',
);
assert.equal(
    buildAnswerlatticeVersionDriftReason(
        { ...baseAnswer, lastValidatedInVersion: 200 },
        { versionLabel: 'v2', versionNormalized: 200, changedEntityIds: ['entity-b'] },
    ),
    null,
    'answers validated at the release version must not be marked drifted',
);

process.stdout.write('Answerlattice drift policy tests passed.\n');
