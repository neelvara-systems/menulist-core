import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {
    ANSWERLATTICE_GUIDANCE_CONTRACT_VERSION,
    AnswerlatticeGuidanceOutcomeSchema,
    buildAnswerlatticeGuidanceOutcomeIdempotencyKey,
    matchAnswerlatticeGuidanceOutcomeToHistory,
} from '@lib/answerlattice/guidedResolutionContracts';
import { validateProcedure } from '@lib/answerlattice/procedureValidation';
import { isAnswerlatticeSearchHistoryAvailableForInteraction } from '@lib/answerlattice/searchHistoryInteractionServer';
import {
    buildAnswerlatticeGuidedResolutionSnippet,
    normalizeWidgetConfig,
    parseWidgetConfigSaveInput,
} from '@lib/answerlattice/widgetConfig';
import { AnswerlatticeCanonicalProposalAnswerSchema } from '@lib/answerlattice/governanceContracts';
import { AnswerlatticeProcedure } from '@type/answerlattice';

const ROOT = path.resolve(__dirname, '..', '..');
const validOutcome = {
    contractVersion: ANSWERLATTICE_GUIDANCE_CONTRACT_VERSION,
    requestId: 'guidance_request_123',
    procedureSessionId: 'guide_session_123',
    searchHistoryId: 'search-history-123',
    procedureSlug: 'connect_slack',
    outcome: 'target_missing' as const,
    totalSteps: 3,
    completedSteps: 1,
    blockedStepOrder: 2,
    targetId: 'slack.connect',
    expectedEvent: 'slack.oauth.started',
    widgetSessionId: 'widget_session_123',
    contextKey: 'settings_integrations',
} as const;

assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse(validOutcome).success, true);
assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse({
    ...validOutcome,
    targetId: undefined,
}).success, false, 'target_missing must identify the missing semantic target');
assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse({
    ...validOutcome,
    blockedStepOrder: undefined,
}).success, false, 'incomplete outcomes must identify the blocked step');
assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse({
    ...validOutcome,
    outcome: 'completed',
    completedSteps: 2,
}).success, false, 'completed outcomes must complete every step');
assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse({
    ...validOutcome,
    targetId: 'button:nth-child(2)',
}).success, false, 'CSS selectors must not be accepted as semantic targets');
assert.equal(AnswerlatticeGuidanceOutcomeSchema.safeParse({
    ...validOutcome,
    extraField: 'not-allowed',
}).success, false, 'the public outcome contract must reject unknown fields');

const retryOutcome = {
    ...validOutcome,
    requestId: 'different_client_retry',
};
assert.equal(
    buildAnswerlatticeGuidanceOutcomeIdempotencyKey(validOutcome),
    buildAnswerlatticeGuidanceOutcomeIdempotencyKey(retryOutcome),
    'server deduplication must not depend on a client-generated request ID',
);

const servedProcedure: AnswerlatticeProcedure = {
    procedureSlug: 'connect_slack',
    steps: [
        { stepOrder: 1, action: 'open', instruction: 'Open integrations.' },
        {
            stepOrder: 2,
            action: 'click',
            instruction: 'Select Connect Slack.',
            target: 'slack.connect',
            expectedEvent: 'slack.oauth.started',
        },
        { stepOrder: 3, action: 'confirm', instruction: 'Confirm Slack is connected.' },
    ],
};
const servedHistory = {
    guidedProcedure: servedProcedure,
    widgetSessionId: validOutcome.widgetSessionId,
    contextKey: validOutcome.contextKey,
};
assert.deepEqual(matchAnswerlatticeGuidanceOutcomeToHistory(validOutcome, servedHistory), {
    contextKey: validOutcome.contextKey,
    expectedEvent: validOutcome.expectedEvent,
    procedureSlug: validOutcome.procedureSlug,
    targetId: validOutcome.targetId,
});
assert.equal(matchAnswerlatticeGuidanceOutcomeToHistory({
    ...validOutcome,
    totalSteps: 2,
}, servedHistory), null, 'outcome totals must match the exact served procedure snapshot');
assert.equal(matchAnswerlatticeGuidanceOutcomeToHistory({
    ...validOutcome,
    targetId: 'slack.disconnect',
}, servedHistory), null, 'outcome targets must match the blocked served step');
assert.equal(matchAnswerlatticeGuidanceOutcomeToHistory({
    ...validOutcome,
    widgetSessionId: 'widget_session_other',
}, servedHistory), null, 'outcomes must remain bound to the widget session that created the search history');
assert.equal(matchAnswerlatticeGuidanceOutcomeToHistory({
    ...validOutcome,
    contextKey: 'settings_billing',
}, servedHistory), null, 'outcomes must remain bound to the context that created the search history');

const nowMs = Date.UTC(2026, 6, 18, 12, 0, 0);
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    expiresAt: { toMillis: () => nowMs + 1000 },
}, nowMs), true);
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    expiresAt: { toMillis: () => nowMs },
}, nowMs), false, 'expired retained history must not accept terminal interaction');
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    createdOn: { toMillis: () => nowMs - 1000 },
    retentionDays: 90,
}, nowMs), true, 'legacy rows may use their bounded creation-time retention fallback');
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    expiresAt: { toMillis: () => { throw new Error('malformed timestamp'); } },
}, nowMs), false, 'malformed retained timestamps must fail closed without throwing');
let retentionCoercionExecuted = false;
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    createdOn: { seconds: nowMs / 1000 },
    retentionDays: {
        valueOf() {
            retentionCoercionExecuted = true;
            throw new Error('retention coercion must not execute');
        },
    },
}, nowMs), true, 'invalid legacy retention uses the configured bounded fallback');
assert.equal(retentionCoercionExecuted, false);
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction(new Proxy({}, {
    get() {
        throw new Error('history getter must remain contained');
    },
}), nowMs), false);
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({
    expiresAt: new Proxy(new Date(nowMs + 1000), {}),
}, nowMs), false, 'Date Proxies must fail closed without throwing');
assert.equal(isAnswerlatticeSearchHistoryAvailableForInteraction({}, nowMs), false);

const procedure: AnswerlatticeProcedure = {
    procedureSlug: 'connect_slack',
    steps: [{
        stepOrder: 1,
        action: 'click',
        instruction: 'Select Connect Slack',
        target: 'slack.connect',
        expectedEvent: 'slack.oauth.started',
        expectedResult: 'Slack authorization opens',
    }],
};
assert.deepEqual(validateProcedure('procedure', procedure), { valid: true, errors: [] });
assert.equal(
    validateProcedure('explanation', procedure).valid,
    false,
    'non-procedure answers must not retain stale procedure payloads',
);
assert.equal(validateProcedure('procedure', {
    ...procedure,
    steps: [{
        ...procedure.steps[0],
        target: '#connect-slack',
    }],
}).valid, false, 'procedure writes must reject selector-like targets');
assert.equal(validateProcedure('procedure', {
    steps: [{ stepOrder: 1 }],
    warnings: [null],
    prerequisites: [{ type: 'role' }],
}).valid, false, 'malformed nested procedure values must fail validation without throwing');
assert.doesNotThrow(() => validateProcedure('procedure', {
    steps: { invalid: true },
}), 'non-array procedure steps must fail closed without throwing');
assert.equal(validateProcedure('procedure', {
    ...procedure,
    steps: [{ ...procedure.steps[0], stepOrder: 2 }],
}).valid, false, 'procedure steps must form a contiguous one-based sequence');

const canonicalProcedureAnswer = {
    title: 'Connect Slack',
    status: 'active' as const,
    answerType: 'procedure' as const,
    scope: { entityIds: ['entity_slack'] },
    productBinding: {
        introducedInVersion: 1,
        lastValidatedInVersion: 1,
        applicableVersions: { from: 1, to: null },
    },
    content: {
        structuredSummary: 'Connect Slack from integration settings.',
        detailedExplanation: 'Open integration settings and complete the approved Slack connection steps.',
        procedure,
    },
};
assert.equal(AnswerlatticeCanonicalProposalAnswerSchema.safeParse(canonicalProcedureAnswer).success, true);
assert.equal(
    AnswerlatticeCanonicalProposalAnswerSchema.safeParse({
        ...canonicalProcedureAnswer,
        answerType: 'explanation',
    }).success,
    false,
    'canonical governance must reject procedure data on an explanation answer',
);
assert.equal(
    AnswerlatticeCanonicalProposalAnswerSchema.safeParse({
        ...canonicalProcedureAnswer,
        content: {
            ...canonicalProcedureAnswer.content,
            procedure: undefined,
        },
    }).success,
    false,
    'canonical governance must reject a procedure answer without procedure data',
);

assert.equal(normalizeWidgetConfig({}).guidedResolutionEnabled, false);
assert.equal(parseWidgetConfigSaveInput({
    config: { guidedResolutionEnabled: true },
    allowedOrigins: ['https://app.example.com'],
    expectedConfigVersion: 0,
}).config.guidedResolutionEnabled, true);

const integrationSnippet = buildAnswerlatticeGuidedResolutionSnippet();
assert.ok(integrationSnippet.includes('data-answerlattice-target="billing.change_plan"'));
assert.ok(integrationSnippet.includes("emitWorkflowEvent('billing.plan_changed')"));
assert.ok(!integrationSnippet.includes('querySelector'));
assert.ok(!integrationSnippet.includes('.click('));

const loader = fs.readFileSync(path.join(ROOT, 'public/widget/answerlattice-widget.js'), 'utf8');
const widgetClient = fs.readFileSync(path.join(ROOT, 'src/app/widget/[apiKey]/WidgetClient.tsx'), 'utf8');
const outcomeRoute = fs.readFileSync(path.join(ROOT, 'src/app/api/widget/guidance-outcome/route.ts'), 'utf8');
const widgetSearchRoute = fs.readFileSync(path.join(ROOT, 'src/app/api/widget/search/route.ts'), 'utf8');
const searchCore = fs.readFileSync(path.join(ROOT, 'src/lib/search/searchCore.ts'), 'utf8');
const searchHistoryServer = fs.readFileSync(path.join(ROOT, 'src/database/aiSearchHistory/server.ts'), 'utf8');
const helpDoc = fs.readFileSync(path.join(ROOT, '__docs__/answerlattice/guided-workflows/guided-workflows_helpdoc.md'), 'utf8');
const marketingDoc = fs.readFileSync(path.join(ROOT, '__docs__/answerlattice/guided-workflows/guided-workflows_marketing.md'), 'utf8');
const widgetManagement = fs.readFileSync(
    path.join(ROOT, 'src/components/templates/answerlattice/widgetManagement/AnswerlatticeWidgetManagement.tsx'),
    'utf8',
);
assert.ok(loader.includes("querySelectorAll('[data-answerlattice-target]')"));
assert.ok(loader.includes('isGuidanceTargetVisible(candidates[i])'));
assert.ok(loader.includes('reportGuidanceStepResult(sessionId, stepOrder, targetId, expectedEvent, attempt + 1)'));
assert.ok(loader.includes('attempt < 4'));
assert.ok(loader.includes('!guidanceOverlay || !isGuidanceTargetVisible(activeGuidanceTarget)'));
assert.ok(loader.includes("pointerEvents: 'none'"));
assert.ok(loader.includes("e.source !== iframe.contentWindow"));
assert.ok(loader.includes('resetGuidanceFromHost'));
assert.ok(loader.includes('var stepOrder = step ? step.stepOrder : 0;'));
assert.ok(!loader.includes('var stepOrder = step ? Number(step.stepOrder) : 0;'));
assert.ok(!loader.includes('activeGuidanceTarget.click('));
assert.ok(!loader.includes('eval('));
assert.ok(widgetClient.includes("type === 'answerlattice-guidance-host-reset'"));
assert.ok(widgetClient.includes("fetch('/api/widget/guidance-outcome'"));
assert.ok(widgetClient.includes('GUIDANCE_OUTCOME_MAX_ATTEMPTS = 2'));
assert.ok(widgetClient.includes('const requestBody = JSON.stringify({'));
assert.ok(widgetClient.includes('body: requestBody'));
assert.ok(widgetClient.includes('guidanceOutcomeSentRef.current.delete(outcomeKey)'));
assert.ok(widgetClient.includes('step.stepOrder === index + 1'));
assert.ok(
    widgetClient.includes('!activeGuidance.procedure.steps[activeGuidance.stepIndex]?.expectedEvent'),
    'event-gated steps must not expose manual completion',
);
assert.ok(outcomeRoute.includes('historyData.canonical !== true'));
assert.ok(outcomeRoute.includes("historyData.mountContext !== 'widget'"));
assert.ok(!outcomeRoute.includes("historyData.uId !== 'widget'"));
assert.ok(outcomeRoute.includes('normalizeAnswerlatticeCanonicalAnswerId(historyData?.canonicalAnswerId)'));
assert.ok(outcomeRoute.includes('isAnswerlatticeSearchHistoryAvailableForInteraction(historyData)'));
assert.ok(outcomeRoute.includes('matchAnswerlatticeGuidanceOutcomeToHistory(outcome, historyData)'));
assert.ok(outcomeRoute.includes('requestId: outcomeIdempotencyKey'));
assert.ok(outcomeRoute.includes("hasPublicApiCredentialScope(credential, 'widget:feedback')"));
assert.ok(widgetSearchRoute.includes('result.canonical && result.procedure'));
assert.ok(searchCore.includes('guidedProcedure: answer.answerType === \'procedure\''), 'canonical history must retain the exact served procedure snapshot');
assert.ok(
    searchCore.includes('craftedAnswer: answer.content.detailedExplanation || answer.content.structuredSummary,'),
    'canonical history must cache the exact answer text served to the requester',
);
assert.ok(
    searchCore.includes('procedure: cachedResult.guidedProcedure,'),
    'search-history cache replay must restore the validated guided procedure',
);
assert.ok(
    searchCore.indexOf('return withSavedSearchHistory({', searchCore.indexOf("logType: 'CACHE_HIT'")) > 0,
    'each search-history cache hit must create a fresh request history and feedback target',
);
assert.ok(searchHistoryServer.includes('AnswerlatticeProcedureSchema.safeParse(data.guidedProcedure)'), 'search-history persistence must validate procedure snapshots before storage');
assert.ok(searchHistoryServer.includes('data.responseCacheVersion !== RESPONSE_CACHE_VERSION'), 'legacy compact history must not replay as a complete response');
assert.ok(widgetClient.includes("onClick={() => openEscalationForm(msg)}"), 'Still stuck must open the explicit support handoff');
assert.ok(widgetClient.includes("endGuidance('escalated')"), 'a guide is escalated only after the support request succeeds');
assert.ok(helpDoc.includes('only after the support request is created'), 'help copy must not claim escalation before ticket creation');
assert.ok(marketingDoc.includes('no database listener'), 'marketing copy must distinguish bounded browser listeners from database listeners');
assert.ok(widgetManagement.includes('const GUIDED_RESOLUTION_UI_ENABLED'));
assert.ok(widgetManagement.includes('FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS'));
assert.ok(widgetManagement.includes('FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_RESOLUTION'));
assert.equal(
    (widgetManagement.match(/GUIDED_RESOLUTION_UI_ENABLED/g) || []).length,
    3,
    'the shared parent/child gate must guard the owner toggle and install option',
);

console.log('Answerlattice guided resolution contracts passed.');
