#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import type { AnswerlatticeCanonicalAnswer } from '../../src/types/answerlattice';
import {
    EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE,
    getAnswerlatticeCanonicalAnswersScopeKey,
    projectCanonicalAnswersStateForScope,
} from '../../src/hooks/answerlattice/canonicalAnswersScopeState';

const answerFromWorkspaceOne = {
    id: 'answer_workspace_one',
    pId: 'AL',
    tId: 1,
    sId: 10,
} as AnswerlatticeCanonicalAnswer;

assert.equal(getAnswerlatticeCanonicalAnswersScopeKey(1, 10), '1:10');
assert.equal(getAnswerlatticeCanonicalAnswersScopeKey(0, 10), null);
assert.equal(getAnswerlatticeCanonicalAnswersScopeKey(1.5, 10), null);
assert.equal(getAnswerlatticeCanonicalAnswersScopeKey(1, Number.NaN), null);

const priorWorkspaceState = {
    scopeKey: '1:10',
    answers: [answerFromWorkspaceOne],
    loading: false,
    error: null,
};

assert.deepEqual(
    projectCanonicalAnswersStateForScope(priorWorkspaceState, 2, 20),
    { answers: [], loading: true, error: null },
    'a tenant switch must hide the prior workspace before the next effect settles',
);

assert.deepEqual(
    projectCanonicalAnswersStateForScope(priorWorkspaceState, 0, 20),
    { answers: [], loading: false, error: null },
    'an invalid scope must never retain prior workspace answers',
);

assert.deepEqual(
    projectCanonicalAnswersStateForScope(priorWorkspaceState, 1, 10),
    { answers: [answerFromWorkspaceOne], loading: false, error: null },
);

assert.deepEqual(
    projectCanonicalAnswersStateForScope(
        EMPTY_ANSWERLATTICE_CANONICAL_ANSWERS_STATE,
        1,
        10,
    ),
    { answers: [], loading: true, error: null },
);

console.log('Answerlattice canonical-answer scope-state tests passed');
