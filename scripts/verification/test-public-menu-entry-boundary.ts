import assert from 'node:assert/strict';
import { resolvePublicMenuEntryProjectSlug } from '@lib/public-menu-entry/claimProjectSlug';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import { normalizeExtractedMenuPriceTruth } from '@lib/pricing/projectPriceTruth';
import { PLATFORM_DOMAIN } from '@constant/urls';
import { normalizePublicCreateMenuPreviewDraft } from '@lib/publicCreateMenu/previewDraftResponse';
import { isPublicCreateMenuSuccessHostname } from '@lib/publicCreateMenu/successUrl';
import { normalizePublicMenuDraftExtractedData } from '@data/shared/publicMenuDraftData';

const extracted = normalizeExtractedMenuPriceTruth({
    items: [{
        id: 'item-1',
        price: '  ₹299  ',
        attributes: [
            { id: 'small', price: ' 199 ' },
            { id: 'market', price: 'Market Price' },
        ],
    }],
});
assert.equal(extracted.items[0].price, '₹299');
assert.deepEqual(extracted.items[0].attributes.map((attribute) => attribute.price), ['199', 'Market Price']);
assert.throws(() => normalizeExtractedMenuPriceTruth({
    items: [{ id: 'item-1', price: '299 🎉' }],
}));

assert.equal(resolvePublicMenuEntryProjectSlug({}, 'Lunch Menu', '1-new-1'), 'lunch-menu');
assert.equal(resolvePublicMenuEntryProjectSlug({}, 'Feedback', '1-new-1'), 'feedback-menu');
assert.equal(resolvePublicMenuEntryProjectSlug({
    existing: { slug: 'lunch-menu' },
}, 'Lunch Menu', '1-new-1'), 'lunch-menu-1-new-1');
assert.equal(resolvePublicMenuEntryProjectSlug({
    existing: { previousSlugs: ['feedback-menu'] },
}, 'Feedback', '1-new-1'), 'feedback-menu-1-new-1');

const draftId = '123e4567-e89b-42d3-a456-426614174000';
assert.equal(normalizePublicMenuDraftId(draftId), draftId);
assert.equal(normalizePublicMenuDraftId(` ${draftId}`), null);
assert.equal(normalizePublicMenuDraftId(`${draftId}/child`), null);
assert.equal(normalizePublicMenuDraftId('not-a-draft'), null);

assert.equal(
    isPublicCreateMenuSuccessHostname(`owner.${PLATFORM_DOMAIN}`),
    true,
    'Claim success must accept the active MenuList tenant domain',
);
assert.equal(
    isPublicCreateMenuSuccessHostname(PLATFORM_DOMAIN),
    true,
    'Claim success may accept the active MenuList platform root',
);
assert.equal(
    isPublicCreateMenuSuccessHostname(`${PLATFORM_DOMAIN}.attacker.example`),
    false,
    'A hostname containing the platform domain only as a prefix must fail closed',
);
assert.equal(
    isPublicCreateMenuSuccessHostname('attacker.example'),
    false,
    'An arbitrary HTTPS host must not become trusted success-page output',
);

const normalizedPreview = normalizePublicCreateMenuPreviewDraft({
    status: 'completed',
    detectedBusinessName: '  Example   Cafe ',
    detectedBrandAccentColor: 'javascript:alert(1)',
    extractedData: {
        categories: [{ id: 'breakfast', active: true, name: { en: 'Breakfast' } }],
        items: [{
            id: 'tea',
            category: 'breakfast',
            active: true,
            available: true,
            name: { en: 'Tea' },
            dietaryTags: [' vegan '],
        }],
        languages: ['en'],
    },
});
assert.equal(normalizedPreview?.detectedBusinessName, 'Example Cafe');
assert.equal(normalizedPreview?.detectedBrandAccentColor, null);
assert.equal(normalizedPreview?.extractedData?.items[0].name.en, 'Tea');
const maxLanguageDraft = normalizePublicMenuDraftExtractedData({
    categories: [{ id: 'breakfast', active: true, name: { en: 'Breakfast' } }],
    items: [{
        id: 'tea',
        category: 'breakfast',
        active: true,
        available: true,
        name: { en: 'Tea' },
    }],
    languages: ['hi', 'ar', 'fr', 'de', 'es', 'it', 'pt', 'ja'],
});
assert.equal(maxLanguageDraft?.languages.length, 8);
assert.equal(
    maxLanguageDraft?.languages.some(({ code }) => code === 'en'),
    true,
    'the required English fallback must survive the maximum language cap',
);
assert.equal(
    normalizePublicCreateMenuPreviewDraft({
        status: 'completed',
        extractedData: { categories: {}, items: 'not-an-array' },
    })?.extractedData,
    null,
    'Malformed nested response data must not cross into React state as typed arrays',
);
assert.equal(
    normalizePublicCreateMenuPreviewDraft({ status: 'not-a-status' }),
    null,
    'Unknown response states must fail closed',
);

console.log('Public Menu Entry boundary tests passed.');
