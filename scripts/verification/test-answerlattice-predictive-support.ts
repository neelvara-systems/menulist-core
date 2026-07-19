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
    normalizeAnswerlatticePredictiveSuggestion,
    normalizeAnswerlatticePredictiveTrigger,
    projectAnswerlatticePredictiveTriggerForRuntime,
} from '@lib/answerlattice/predictiveSupportContracts';
import { parseAnswerlatticePredictiveTriggerIndex } from '@lib/answerlattice/runtimeSummaryContracts';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const scope = { tId: 7, sId: 9 };

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
    triggers: oversizedTriggers,
}, scope), null, 'oversized runtime summaries must fail closed');

const widget = read('public/widget/answerlattice-widget.js');
assert.match(widget, /userId: getPredictiveSessionId\(\)/);
assert.doesNotMatch(widget, /userId: visitorContext/);
assert.match(widget, /\/api\/answerlattice\/predictive-interaction/);
assert.match(widget, /suggestion_shown/);
assert.match(widget, /suggestion_clicked/);
assert.match(widget, /suggestion_dismissed/);
assert.match(widget, /X-Answerlattice-Widget-Runtime/);
assert.match(widget, /if \(tokenChanged\) predictiveSuggestionCache = \{\};/);

const predictiveRoute = read('src/app/api/answerlattice/predictive-help/route.ts');
assert.match(predictiveRoute, /isAnswerlatticeWidgetRuntimeRequestAuthorized/);
assert.match(predictiveRoute, /failClosedOnProviderError: true/);
assert.doesNotMatch(predictiveRoute, /request\.json\(\)/);

const interactionRoute = read('src/app/api/answerlattice/predictive-interaction/route.ts');
assert.match(interactionRoute, /AnswerlatticePredictiveInteractionSchema\.safeParse/);
assert.match(interactionRoute, /doesAnswerlatticePredictiveTriggerMatchContext/);
assert.match(interactionRoute, /emitSuggestionSignal/);

const predictiveSync = read('functions-answerlattice/src/answerlattice/predictiveTriggerSync.ts');
assert.match(predictiveSync, /const MAX_TRIGGERS_PER_TENANT = 200;/);
assert.match(predictiveSync, /interaction evidence is advisory/i);
assert.doesNotMatch(predictiveSync, /status: 'disabled'/);
assert.doesNotMatch(predictiveSync, /autoDisabled/);

process.stdout.write('Answerlattice predictive support contracts passed.\n');
