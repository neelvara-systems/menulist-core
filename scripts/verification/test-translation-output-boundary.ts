import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import {
    normalizeTranslationMap,
    resolveTranslationBillingAction,
} from '../../src/lib/ai/translationOutput';
import { TranslationRequestSchema } from '../../src/lib/validation/apiSchemas';

assert.equal(resolveTranslationBillingAction(
    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
    ['item_1_i', 'item_1_d', 'item_1_size_a'],
    1,
), AI_ACTIONS_TYPES.ITEM_TRANSLATION);
assert.equal(resolveTranslationBillingAction(
    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
    ['category_1_c'],
    1,
), AI_ACTIONS_TYPES.ITEM_TRANSLATION);
assert.equal(resolveTranslationBillingAction(
    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
    ['item_1_i', 'item_2_i'],
    1,
), AI_ACTIONS_TYPES.LANGUAGE_ADDITION);
assert.equal(resolveTranslationBillingAction(
    AI_ACTIONS_TYPES.ITEM_TRANSLATION,
    ['item_1_i'],
    2,
), AI_ACTIONS_TYPES.LANGUAGE_ADDITION);
assert.equal(resolveTranslationBillingAction(
    AI_ACTIONS_TYPES.IMAGE_TRANSLATION,
    ['item_1_i', 'item_2_i'],
    2,
), AI_ACTIONS_TYPES.IMAGE_TRANSLATION);

assert.deepEqual(normalizeTranslationMap({
    item_1_i: '  Tikka\nMasala  ',
    unknown_i: 'drop',
}, ['item_1_i']), { item_1_i: 'Tikka\nMasala' });
assert.equal(normalizeTranslationMap({ item_1_i: 42 }, ['item_1_i']), null);
assert.equal(normalizeTranslationMap({ unknown_i: 'copy' }, ['item_1_i']), null);
assert.equal(normalizeTranslationMap([], ['item_1_i']), null);
assert.equal(normalizeTranslationMap({}, []), null);

const baseRequest = {
    action: 'item_translation' as const,
    fileId: 'file_1',
    inputJson: { item_1_i: 'Item' },
    projectId: '1-project-2',
    sourceLang: { code: 'en', name: 'English' },
    targetLang: { code: 'fr', name: 'French' },
};
assert.equal(TranslationRequestSchema.safeParse(baseRequest).success, true);
assert.equal(TranslationRequestSchema.safeParse({ ...baseRequest, inputJson: {} }).success, false);
assert.equal(TranslationRequestSchema.safeParse({ ...baseRequest, inputJson: { item_1_i: '   ' } }).success, false);
assert.equal(TranslationRequestSchema.safeParse({ ...baseRequest, inputJson: { arbitrary: 'Item' } }).success, false);
assert.equal(TranslationRequestSchema.safeParse({ ...baseRequest, targetLang: { code: 'en', name: 'English' } }).success, false);
assert.equal(TranslationRequestSchema.safeParse({
    ...baseRequest,
    targetLang: [{ code: 'fr', name: 'French' }, { code: 'fr', name: 'French duplicate' }],
}).success, false);

console.log('translation output boundary tests passed');
