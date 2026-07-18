import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PRODUCT_IDS } from '@constant/product';
import { AnswerlatticeIntakeReviewItemSchema } from '@lib/answerlattice/knowledgeIntakeContracts';
import { AnswerlatticeProcedureSchema, validateProcedure } from '@lib/answerlattice/procedureValidation';
import {
    MENULIST_ANSWERLATTICE_EVENTS,
    MENULIST_ANSWERLATTICE_REFERENCE_PROCEDURES,
    MENULIST_ANSWERLATTICE_TARGETS,
    emitMenuListAnswerlatticeWorkflowEvent,
    getMenuListAnswerlatticeTargetProps,
    isVerifiedMenuPublishResult,
} from '@lib/answerlattice/referenceClients/menuListGuidedResolution';
import {
    ANSWERLATTICE_INTAKE_REVIEW_STATUS,
    ANSWERLATTICE_INTAKE_REVIEW_TARGET,
} from '@type/answerlattice';

const ROOT = path.resolve(__dirname, '..', '..');
const SEMANTIC_ID_PATTERN = /^[a-z0-9]+(?:[._:-][a-z0-9]+)*$/;
const targets = Object.values(MENULIST_ANSWERLATTICE_TARGETS);
const events = Object.values(MENULIST_ANSWERLATTICE_EVENTS);

assert.equal(new Set(targets).size, targets.length, 'MenuList semantic targets must be unique');
assert.equal(new Set(events).size, events.length, 'MenuList workflow events must be unique');
assert.equal(targets.every(value => SEMANTIC_ID_PATTERN.test(value)), true, 'all MenuList targets must use semantic IDs');
assert.equal(events.every(value => SEMANTIC_ID_PATTERN.test(value)), true, 'all MenuList events must use semantic IDs');
assert.deepEqual(
    getMenuListAnswerlatticeTargetProps(MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLISH),
    { 'data-answerlattice-target': MENULIST_ANSWERLATTICE_TARGETS.MENU_PUBLISH },
);
assert.equal(
    emitMenuListAnswerlatticeWorkflowEvent(MENULIST_ANSWERLATTICE_EVENTS.MENU_PUBLISH_COMPLETED),
    false,
    'server/test execution must safely no-op without a browser widget runtime',
);
assert.equal(isVerifiedMenuPublishResult({ status: 'OK' }), true);
assert.equal(isVerifiedMenuPublishResult({ status: 'ERROR' }), false);
assert.equal(isVerifiedMenuPublishResult(null), false);

for (const draft of MENULIST_ANSWERLATTICE_REFERENCE_PROCEDURES) {
    assert.equal(
        AnswerlatticeProcedureSchema.safeParse(draft.procedure).success,
        true,
        `${draft.procedure.procedureSlug} must satisfy the strict runtime schema`,
    );
    assert.deepEqual(
        validateProcedure('procedure', draft.procedure),
        { valid: true, errors: [] },
        `${draft.procedure.procedureSlug} must satisfy canonical write validation`,
    );
    for (const step of draft.procedure.steps) {
        if (step.target) {
            assert.equal(targets.includes(step.target as typeof targets[number]), true, `${step.target} must be registered`);
        }
        if (step.expectedEvent) {
            assert.equal(events.includes(step.expectedEvent as typeof events[number]), true, `${step.expectedEvent} must be registered`);
        }
    }
}

const procedure = MENULIST_ANSWERLATTICE_REFERENCE_PROCEDURES[0].procedure;
const reviewItem = {
    id: `kii_${'a'.repeat(28)}`,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: 1,
    sId: 1,
    jobId: 'A'.repeat(20),
    sourceId: `kis_${'b'.repeat(28)}`,
    target: ANSWERLATTICE_INTAKE_REVIEW_TARGET.CANONICAL_PROPOSAL,
    status: ANSWERLATTICE_INTAKE_REVIEW_STATUS.DRAFT,
    title: 'Import your first menu',
    answerType: 'procedure',
    procedure,
};
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse(reviewItem).success,
    true,
    'knowledge intake must preserve a valid guided procedure draft',
);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({
        ...reviewItem,
        answerType: 'explanation',
    }).success,
    false,
    'knowledge intake must reject a procedure attached to a non-procedure answer',
);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({
        ...reviewItem,
        procedure: undefined,
    }).success,
    false,
    'knowledge intake must reject a procedure answer without procedure steps',
);
assert.equal(
    AnswerlatticeIntakeReviewItemSchema.safeParse({
        ...reviewItem,
        answerType: undefined,
        procedure: undefined,
    }).success,
    true,
    'legacy intake drafts without procedure fields must remain readable',
);

const instrumentationSources = [
    'src/components/templates/main-app/projects/index.tsx',
    'src/components/templates/main-app/projects/ProjectsSubHeader.tsx',
    'src/components/templates/main-app/projects/jobScreens/ExtractionJobFailureModal.tsx',
    'src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx',
    'src/components/templates/main-app/projects/b2cView/index.tsx',
    'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx',
    'src/components/mobile/screens/MobileMenuScreen.tsx',
    'src/components/mobile/screens/MobileDesignEditorScreen.tsx',
    'src/components/mobile/sheets/MenuUploadSheet.tsx',
    'src/components/mobile/sheets/ExtractionReviewSheet.tsx',
].map(relativePath => fs.readFileSync(path.join(ROOT, relativePath), 'utf8')).join('\n');

for (const targetName of Object.keys(MENULIST_ANSWERLATTICE_TARGETS)) {
    assert.ok(instrumentationSources.includes(`MENULIST_ANSWERLATTICE_TARGETS.${targetName}`), `${targetName} must be mounted`);
}
for (const eventName of Object.keys(MENULIST_ANSWERLATTICE_EVENTS)) {
    assert.ok(instrumentationSources.includes(`MENULIST_ANSWERLATTICE_EVENTS.${eventName}`), `${eventName} must be emitted`);
}
assert.ok(
    instrumentationSources.includes('isVerifiedMenuPublishResult(verificationResult)'),
    'publish verification must emit only after a validated success result',
);

const sdkSource = fs.readFileSync(path.join(ROOT, 'packages/answerlattice-web/src/index.ts'), 'utf8');
const sdkDistribution = fs.readFileSync(path.join(ROOT, 'packages/answerlattice-web/dist/index.js'), 'utf8');
const sdkTypes = fs.readFileSync(path.join(ROOT, 'packages/answerlattice-web/dist/index.d.ts'), 'utf8');
for (const method of ['emitWorkflowEvent', 'getGuidanceState']) {
    assert.ok(sdkSource.includes(method), `SDK source must expose ${method}`);
    assert.ok(sdkDistribution.includes(method), `SDK distribution must expose ${method}`);
    assert.ok(sdkTypes.includes(method), `SDK declaration output must expose ${method}`);
}

process.stdout.write('Answerlattice MenuList reference-client contracts passed.\n');
