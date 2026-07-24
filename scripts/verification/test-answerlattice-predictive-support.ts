#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
    ANSWERLATTICE_PREDICTIVE_INTERACTION_CONTRACT_VERSION,
    AnswerlatticePredictiveInteractionSchema,
    buildAnswerlatticePredictiveInteractionIdempotencyKey,
    doesAnswerlatticePredictiveTriggerMatchContext,
    getAnswerlatticePredictiveTimestampMillis,
    isAnswerlatticePredictiveTriggerWithinWindow,
    normalizeAnswerlatticeActiveTriggerCount,
    normalizeAnswerlatticePredictiveSuggestion,
    normalizeAnswerlatticePredictiveTrigger,
    projectAnswerlatticePredictiveTriggerForRuntime,
} from '@lib/answerlattice/predictiveSupportContracts';
import { parseAnswerlatticePredictiveTriggerIndex } from '@lib/answerlattice/runtimeSummaryContracts';
import {
    getAnswerlatticePredictiveTriggersScopeKey,
    projectPredictiveTriggersStateForScope,
} from '@hook/answerlattice/predictiveTriggersScopeState';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const scope = { tId: 7, sId: 9 };

assert.equal(normalizeAnswerlatticeActiveTriggerCount(3), 3);
assert.equal(normalizeAnswerlatticeActiveTriggerCount(0), 0);
for (const invalidCount of ['3', 0.5, -1, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
    assert.equal(normalizeAnswerlatticeActiveTriggerCount(invalidCount), null);
}

const baseTrigger = {
    pId: 'AL',
    ...scope,
    name: 'Billing recovery help',
    kind: 'predictive_help',
    conditions: {
        page: 'billing_settings',
        workflow: 'recover_payment',
        plan: 'pro',
    },
    action: {
        type: 'help_card',
        customTitle: 'Recover the failed payment',
        customSummary: 'Open the failed invoice and retry with an active payment method.',
    },
    priority: 80,
    cooldownHours: 24,
    status: 'active',
    source: 'manual',
    createdBy: 'private actor',
    sourceContext: { email: 'private@example.com' },
    effectiveness: {
        impressions: 10,
        clicks: 4,
        dismissals: 2,
        score: 0.2,
    },
};

const normalized = normalizeAnswerlatticePredictiveTrigger({
    id: 'billing_recovery',
    value: baseTrigger,
    scope,
});
assert.ok(normalized);
assert.equal(normalized?.conditions.page, 'billing_settings');
assert.equal(normalized?.effectiveness?.clicks, 4);

const projected = projectAnswerlatticePredictiveTriggerForRuntime(normalized!);
assert.equal('createdBy' in (projected as unknown as Record<string, unknown>), false);
assert.equal('sourceContext' in (projected as unknown as Record<string, unknown>), false);
assert.equal('effectiveness' in (projected as unknown as Record<string, unknown>), false);

assert.equal(normalizeAnswerlatticePredictiveTrigger({
    id: 'missing_page',
    value: { ...baseTrigger, conditions: {} },
    scope,
}), null, 'active triggers require an exact page');
assert.equal(normalizeAnswerlatticePredictiveTrigger({
    id: 'unknown_kind',
    value: { ...baseTrigger, kind: 'agent_action' },
    scope,
}), null, 'unknown trigger kinds must not fall back to predictive help');
assert.equal(normalizeAnswerlatticePredictiveTrigger({
    id: 'extra_condition',
    value: { ...baseTrigger, conditions: { page: 'billing_settings', rawPath: '/billing' } },
    scope,
}), null, 'unknown condition fields must be rejected');
assert.equal(normalizeAnswerlatticePredictiveTrigger({
    id: 'extra_action',
    value: { ...baseTrigger, action: { ...baseTrigger.action, javascript: 'alert(1)' } },
    scope,
}), null, 'unknown action fields must be rejected');

const startsAt = { toMillis: () => 1_700_000_000_000 };
const endsAt = { toMillis: () => 1_700_003_600_000 };
const knownIssue = normalizeAnswerlatticePredictiveTrigger({
    id: 'known_issue_payment',
    value: {
        ...baseTrigger,
        kind: 'known_issue',
        action: { type: 'known_issue', customTitle: 'Payment retries are delayed' },
        knownIssue: {
            severity: 'degraded',
            startsAt,
            endsAt,
            statusPageUrl: 'https://status.example.com/incidents/payment-retries',
        },
    },
    scope,
});
assert.ok(knownIssue);
assert.equal(isAnswerlatticePredictiveTriggerWithinWindow(knownIssue!, 1_700_001_000_000), true);
assert.equal(isAnswerlatticePredictiveTriggerWithinWindow(knownIssue!, 1_700_004_000_000), false);
assert.equal(normalizeAnswerlatticePredictiveTrigger({
    id: 'private_status_url',
    value: {
        ...baseTrigger,
        kind: 'known_issue',
        action: { type: 'known_issue' },
        knownIssue: { severity: 'outage', statusPageUrl: 'https://127.0.0.1/internal' },
    },
    scope,
}), null, 'private status URLs must not enter the trigger contract');

assert.equal(doesAnswerlatticePredictiveTriggerMatchContext(normalized!, {
    page: 'billing_settings',
    workflow: 'recover_payment',
    plan: 'pro',
}), true);
assert.equal(doesAnswerlatticePredictiveTriggerMatchContext(normalized!, {
    page: 'billing_settings',
    workflow: 'recover_payment',
    plan: 'starter',
}), false);
assert.equal(doesAnswerlatticePredictiveTriggerMatchContext(normalized!, {
    page: 'billing',
    workflow: 'recover_payment',
    plan: 'pro',
}), false);

assert.equal(getAnswerlatticePredictiveTimestampMillis({
    toMillis: () => { throw new Error('bad timestamp'); },
}), null);

const procedureSuggestion = normalizeAnswerlatticePredictiveSuggestion({
    triggerId: 'guided_recovery',
    type: 'workflow_guide',
    title: 'Recover the payment',
    summary: 'Follow the approved recovery procedure.',
    procedure: {
        procedureSlug: 'recover_payment',
        steps: [{
            stepOrder: 1,
            action: 'click',
            instruction: 'Select Retry payment',
            target: 'billing.retry_payment',
            expectedEvent: 'billing.retry_started',
        }],
    },
});
assert.ok(procedureSuggestion?.procedure);
assert.equal(normalizeAnswerlatticePredictiveSuggestion({
    triggerId: 'unsafe_procedure',
    type: 'workflow_guide',
    title: 'Unsafe procedure',
    summary: '',
    procedure: {
        steps: [{ stepOrder: 1, action: 'execute_script', instruction: 'Run arbitrary code' }],
    },
})?.procedure, undefined);

const interaction = AnswerlatticePredictiveInteractionSchema.parse({
    contractVersion: ANSWERLATTICE_PREDICTIVE_INTERACTION_CONTRACT_VERSION,
    interactionId: 'api_12345678',
    sessionId: 'aps_12345678',
    triggerId: 'billing_recovery',
    type: 'suggestion_clicked',
    page: 'billing_settings',
    workflow: 'recover_payment',
});
assert.equal(
    buildAnswerlatticePredictiveInteractionIdempotencyKey(interaction),
    'predictive:billing_recovery:api_12345678:suggestion_clicked',
);
assert.equal(AnswerlatticePredictiveInteractionSchema.safeParse({
    ...interaction,
    rawDom: '<button>Retry</button>',
}).success, false, 'interaction evidence must reject arbitrary runtime data');

const oversizedTriggers = Object.fromEntries(Array.from({ length: 201 }, (_, index) => [
    `trigger_${index}`,
    { ...baseTrigger, name: `Trigger ${index}` },
]));
assert.equal(parseAnswerlatticePredictiveTriggerIndex({
    pId: 'AL',
    ...scope,
    lastUpdated: new Date(1_700_000_000_000),
    version: 1_700_000_000_000,
    triggerCount: 201,
    activeTriggerCount: 201,
    triggers: oversizedTriggers,
}, scope), null, 'oversized runtime summaries must fail closed');

assert.equal(getAnswerlatticePredictiveTriggersScopeKey(7, 9), '7:9');
assert.equal(getAnswerlatticePredictiveTriggersScopeKey(0, 9), null);
const priorScopeState = {
    scopeKey: '7:9',
    triggers: [normalized!],
    loading: false,
    error: null,
};
assert.deepEqual(projectPredictiveTriggersStateForScope(priorScopeState, 8, 10), {
    triggers: [], loading: true, error: null,
}, 'a workspace transition must not render the previous workspace trigger list');
assert.deepEqual(projectPredictiveTriggersStateForScope(priorScopeState, 0, 10), {
    triggers: [], loading: false, error: null,
}, 'invalid scope must fail closed without retained trigger state');

const widget = read('public/widget/answerlattice-widget.js');
assert.match(widget, /userId: getPredictiveSessionId\(\)/);
assert.doesNotMatch(widget, /userId: visitorContext/);
assert.match(widget, /\/api\/answerlattice\/predictive-interaction/);
assert.match(widget, /suggestion_shown/);
assert.match(widget, /suggestion_clicked/);
assert.match(widget, /suggestion_dismissed/);
assert.match(widget, /X-Answerlattice-Widget-Runtime/);
assert.doesNotMatch(
    widget,
    /predictiveSuggestionCache/,
    'browser-local predictive results must not bypass server cooldowns or retain disabled public truth',
);
assert.match(widget, /var predictiveRequestGeneration = 0;/);
assert.match(widget, /var predictiveRequestInFlightKey = null;/);
assert.match(widget, /if \(requestGeneration !== predictiveRequestGeneration\) return null;/);
assert.match(widget, /if \(predictiveRequestInFlightKey === contextKey\) return;/);
assert.match(widget, /function cancelPredictiveRequest\(\)/);

const predictiveRoute = read('src/app/api/answerlattice/predictive-help/route.ts');
assert.match(predictiveRoute, /isAnswerlatticeWidgetRuntimeRequestAuthorized/);
assert.match(predictiveRoute, /failClosedOnProviderError: true/);
assert.doesNotMatch(predictiveRoute, /request\.json\(\)/);
assert.match(predictiveRoute, /'Cache-Control': 'private, no-store'/);

const interactionRoute = read('src/app/api/answerlattice/predictive-interaction/route.ts');
assert.match(interactionRoute, /AnswerlatticePredictiveInteractionSchema\.safeParse/);
assert.match(interactionRoute, /doesAnswerlatticePredictiveTriggerMatchContext/);
assert.match(interactionRoute, /emitSuggestionSignal/);
assert.match(interactionRoute, /loadTriggerIndex\(tId, sId, \{ bypassCache: true \}\)/);

const predictiveSync = read('functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts');
const predictiveDal = read('src/database/answerlattice/predictiveTriggers.ts');
const predictiveHook = read('src/hooks/answerlattice/usePredictiveTriggers.ts');
const publicCacheAction = read('src/lib/actions/revalidateAnswerlatticePublicCache.ts');
const publicCacheClient = read('src/lib/cache/answerlatticePublicClientCache.ts');
assert.match(predictiveSync, /const MAX_TRIGGERS_PER_TENANT = 200;/);
assert.match(predictiveSync, /normalizeFrictionInsightSourceSnapshot/);
assert.match(predictiveSync, /getAutoSuggestionDocumentId/);
assert.match(predictiveSync, /transaction\.create\(suggestionRef/);
assert.match(predictiveSync, /where\('pId', '==', ANSWERLATTICE_PRODUCT_ID\)/);
assert.match(predictiveSync, /ANSWERLATTICE_PREDICTIVE_TRIGGER_SIGNAL_WINDOW_INCOMPLETE/);
assert.match(predictiveSync, /await appendCompiledContextSourceChange\(transaction/);
assert.match(predictiveSync, /contextInvalidationVersion: PREDICTIVE_TRIGGER_CONTEXT_INVALIDATION_VERSION/);
assert.match(predictiveSync, /existingPayloadHash === sourceHash/);
assert.match(predictiveSync, /if \(!projected\) throw new Error\('ANSWERLATTICE_PREDICTIVE_TRIGGER_SOURCE_INVALID'\)/);
assert.match(predictiveSync, /interaction evidence is advisory/i);
assert.doesNotMatch(predictiveSync, /status: 'disabled'/);
assert.doesNotMatch(predictiveSync, /autoDisabled/);
assert.match(predictiveDal, /getCountFromServer/);
assert.match(predictiveDal, /existingCount\.data\(\)\.count >= ANSWERLATTICE_PREDICTIVE_CONSTRAINTS\.MAX_TRIGGERS_PER_TENANT/);
assert.equal(
    (predictiveDal.match(/where\('status', '==', 'suggested'\)/g) || []).length,
    1,
    'the suggested-trigger query must apply its status predicate exactly once',
);
assert.match(predictiveDal, /batch\.set\(getAuditDocRef\(\), auditData\)/);
assert.match(predictiveDal, /rebuildPredictiveTriggerSummaryAfterCommit/);
assert.match(predictiveDal, /summarySynchronized/);
assert.match(predictiveDal, /revalidateAnswerlatticePublicClientCache\([\s\S]*'predictive',[\s\S]*\{ throwOnFailure: true \}/);
assert.match(predictiveDal, /getPredictiveTriggerById = async \([\s\S]*expectedScope: \{ tId: number; sId: number \}/);
assert.match(predictiveDal, /normalizePredictiveTriggerRecord\(docSnap\.id, docSnap\.data\(\), scope\)/);
assert.doesNotMatch(predictiveHook, /addAuditLog/);
assert.match(predictiveHook, /warnIfPredictiveTriggerSummaryPending\(outcome\.summarySynchronized\)/);
assert.match(publicCacheAction, /'context' \| 'predictive'/);
assert.match(publicCacheAction, /addSegment\('predictive'\)/);
assert.match(publicCacheClient, /options: \{ throwOnFailure\?: boolean \} = \{\}/);
assert.match(predictiveDal, /await appendAnswerlatticeCompiledContextSourceChange\(transaction/);
assert.match(predictiveDal, /scope does not match the active workspace/);
assert.match(predictiveDal, /if \(!trigger\) throw new Error\('Predictive trigger source is invalid; the runtime summary was not replaced\.'\)/);
assert.doesNotMatch(
    predictiveDal,
    /const existing = await getDocs\(query\([\s\S]*?limit\(ANSWERLATTICE_PREDICTIVE_CONSTRAINTS\.MAX_TRIGGERS_PER_TENANT\),[\s\S]*?\)\);/,
    'trigger create must not fetch the full capped collection only to count it',
);

process.stdout.write('Answerlattice predictive support contracts passed.\n');
