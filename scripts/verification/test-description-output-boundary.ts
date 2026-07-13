import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import {
    normalizeDescriptionGenerationResult,
    resolveDescriptionBillingAction,
} from '../../src/lib/ai/descriptionOutput';
import { DescriptionRequestSchema } from '../../src/lib/validation/apiSchemas';

assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.ADD_DESCRIPTION, [{ description: '' }]),
    AI_ACTIONS_TYPES.ADD_DESCRIPTION,
);
assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.ADD_DESCRIPTION, [{ description: 'Existing copy' }]),
    AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
);
assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION, [{ description: '' }]),
    AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
);

assert.deepEqual(normalizeDescriptionGenerationResult({
    item_1: { en: '  Useful\ncopy  ', fr: 'Copie utile', extra: 'drop' },
    unknown: { en: 'drop' },
}, ['item_1'], ['en', 'fr']), {
    item_1: { en: 'Useful copy', fr: 'Copie utile' },
});
assert.equal(normalizeDescriptionGenerationResult(null, ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult([], ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult({ item_1: { en: 123 } }, ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult({ unknown: { en: 'copy' } }, ['item_1'], ['en']), null);

const baseRequest = {
    action: 'add_description' as const,
    contentLength: 'Standard' as const,
    fileId: 'file_1',
    itemsList: [{ id: 'item_1', name: 'Item' }],
    projectId: '1-project-2',
    sourceLang: { code: 'en', name: 'English' },
    targetLang: [{ code: 'en', name: 'English' }],
};
assert.equal(DescriptionRequestSchema.safeParse(baseRequest).success, true);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    itemsList: [{ id: 'item_1', name: 'One' }, { id: 'item_1', name: 'Two' }],
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({ ...baseRequest, projectId: 'other-project' }).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    targetLang: [{ code: 'en', name: 'English' }, { code: 'en', name: 'Duplicate' }],
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    itemsList: [{ id: '', name: '' }],
}).success, false);

console.log('description output boundary tests passed');
