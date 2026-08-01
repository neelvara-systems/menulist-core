import assert from 'node:assert/strict';
import { buildDraftUserPrompt, parseDraftResponse } from '../../src/lib/answerlattice/draftPrompt';
import { parseTicketResolutionResponse } from '../../functions-answerlattice/src/answerlattice/ticketKnowledgePrompt';

const parsed = parseDraftResponse(JSON.stringify({
    title: `  ${'T'.repeat(220)}  `,
    structuredSummary: `  ${'S'.repeat(700)}  `,
    detailedExplanation: `  ${'D'.repeat(25_000)}  `,
    edgeCases: 'E'.repeat(9_000),
    constraints: 'C'.repeat(9_000),
    procedure: null,
}));

assert.ok(parsed);
assert.equal(parsed.title.length, 180);
assert.equal(parsed.structuredSummary.length, 500);
assert.equal(parsed.detailedExplanation.length, 24_000);
assert.equal(parsed.edgeCases?.length, 8_000);
assert.equal(parsed.constraints?.length, 8_000);
assert.equal(parseDraftResponse('{"title":"","structuredSummary":"x","detailedExplanation":"y"}'), null);

const normalizedProcedure = parseDraftResponse(JSON.stringify({
    title: 'Retry an import',
    structuredSummary: 'Retry a failed import from the import history.',
    detailedExplanation: 'The retry action starts a new bounded import attempt.',
    procedure: {
        steps: [
            { stepOrder: 'wrong', action: 'click', instruction: '  Open retry  ' },
            { stepOrder: -4, action: 'invented', instruction: '   ' },
            { stepOrder: 1, action: 'submit', instruction: 'Confirm retry' },
        ],
        warnings: { message: 'not an array' },
        prerequisites: [
            { description: '  Owner access  ', type: 'role', value: 'x'.repeat(400) },
            { description: '', type: 'plan' },
        ],
    },
}));
assert.ok(normalizedProcedure?.procedure);
assert.deepEqual(
    normalizedProcedure.procedure.steps.map((step) => ({
        action: step.action,
        instruction: step.instruction,
        stepOrder: step.stepOrder,
    })),
    [
        { action: 'click', instruction: 'Open retry', stepOrder: 1 },
        { action: 'submit', instruction: 'Confirm retry', stepOrder: 2 },
    ],
);
assert.equal(normalizedProcedure.procedure.warnings, undefined);
assert.equal(normalizedProcedure.procedure.prerequisites?.[0]?.value?.length, 120);

const emptyProcedure = parseDraftResponse(JSON.stringify({
    title: 'No usable procedure',
    structuredSummary: 'The provider returned no usable steps.',
    detailedExplanation: 'The draft remains reviewable without an invalid procedure payload.',
    procedure: { steps: [{ instruction: '' }] },
}));
assert.ok(emptyProcedure);
assert.equal(emptyProcedure.procedure, null);

const refinementPrompt = buildDraftUserPrompt({
    entityName: 'Billing',
    entityDescription: 'Invoice handling',
    entityType: 'feature',
    signalExamples: ['The invoice failed'],
    existingAnswerSummaries: ['Retry billing: Use the retry action.'],
    mode: 'refine_existing',
});
assert.match(refinementPrompt, /complete replacement draft/);
assert.match(refinementPrompt, /do not invent new product behavior/);

const ticketDraft = parseTicketResolutionResponse(JSON.stringify({
    title: 'T'.repeat(220),
    structuredSummary: 'S'.repeat(700),
    detailedExplanation: 'D'.repeat(25_000),
    edgeCases: 'E'.repeat(9_000),
    constraints: 'C'.repeat(9_000),
    procedure: null,
    confidence: 4,
    extractedProblem: 'P'.repeat(400),
}));
assert.ok(ticketDraft);
assert.equal(ticketDraft.title.length, 180);
assert.equal(ticketDraft.detailedExplanation.length, 24_000);
assert.equal(ticketDraft.edgeCases?.length, 8_000);
assert.equal(ticketDraft.confidence, 1);
assert.equal(ticketDraft.extractedProblem.length, 300);

process.stdout.write('Answerlattice draft contract tests passed.\n');
