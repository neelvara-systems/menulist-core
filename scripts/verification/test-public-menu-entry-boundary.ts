import assert from 'node:assert/strict';
import { resolvePublicMenuEntryProjectSlug } from '@lib/public-menu-entry/claimProjectSlug';
import { normalizePublicMenuDraftId } from '@lib/public-menu-entry/publicDraftId';
import { normalizeExtractedMenuPriceTruth } from '@lib/pricing/projectPriceTruth';

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

console.log('Public Menu Entry boundary tests passed.');
