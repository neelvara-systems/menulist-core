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
