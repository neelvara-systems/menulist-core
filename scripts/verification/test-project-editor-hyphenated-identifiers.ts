import assert from 'node:assert/strict';
import { handleUpdateValue } from '../../src/components/templates/main-app/projects/utils';

const categoryId = 'file-8afd8d97-cold-beverages';
const itemId = 'item-oreo-shake-7fcb2d10';
const attributeId = `${itemId}-size-large`;
const file = {
    uid: 'file-8afd8d97',
    extractedData: {
        data: {
            categories: [{ id: categoryId, name: { en: 'Cold beverages' } }],
            items: [{
                attributes: [{ id: attributeId, name: { en: 'Large' }, price: '249' }],
                category: categoryId,
                description: { en: 'Cookies and milk' },
                id: itemId,
                name: { en: 'Oreo shake' },
                price: '199',
            }],
        },
    },
};

const categoryUpdate = handleUpdateValue(file, `category-${categoryId}-en`, 'Cold drinks');
assert.equal(categoryUpdate.extractedData.data.categories[0].name.en, 'Cold drinks');

const nameUpdate = handleUpdateValue(file, `item-${categoryId}-${itemId}-name-en`, 'Oreo shake QA');
assert.equal(nameUpdate.extractedData.data.items[0].name.en, 'Oreo shake QA');

const descriptionUpdate = handleUpdateValue(file, `item-${categoryId}-${itemId}-desc-en`, '<b>Updated</b> drink');
assert.equal(descriptionUpdate.extractedData.data.items[0].description.en, '<b>Updated</b> drink');

const priceUpdate = handleUpdateValue(file, `item-${categoryId}-${itemId}-price`, '209');
assert.equal(priceUpdate.extractedData.data.items[0].price, '209');

const attributeNameUpdate = handleUpdateValue(
    file,
    `item-${categoryId}-${itemId}-attr-${attributeId}-en`,
    'Extra large',
);
assert.equal(attributeNameUpdate.extractedData.data.items[0].attributes[0].name.en, 'Extra large');

const attributePriceUpdate = handleUpdateValue(
    file,
    `item-${categoryId}-${itemId}-attr-${attributeId}-price`,
    '279',
);
assert.equal(attributePriceUpdate.extractedData.data.items[0].attributes[0].price, '279');

assert.deepEqual(
    handleUpdateValue(file, 'item-unknown-category-unknown-item-name-en', 'ignored'),
    file,
    'Unknown editor identities must not mutate another item.',
);

const prefixCollisionFile = {
    uid: 'prefix-collision',
    extractedData: {
        data: {
            categories: [
                { id: 'cat', name: { en: 'Short category' } },
                { id: 'cat-long', name: { en: 'Long category' } },
            ],
            items: [
                {
                    attributes: [
                        { id: 'size', name: { en: 'Short size' }, price: '10' },
                        { id: 'size-large', name: { en: 'Large size' }, price: '20' },
                    ],
                    category: 'cat-long',
                    description: { en: 'Short item' },
                    id: 'drink',
                    name: { en: 'Drink' },
                    price: '100',
                },
                {
                    attributes: [],
                    category: 'cat-long',
                    description: { en: 'Long item' },
                    id: 'drink-large',
                    name: { en: 'Large drink' },
                    price: '200',
                },
            ],
        },
    },
};

const collidingCategoryUpdate = handleUpdateValue(
    prefixCollisionFile,
    'category-cat-long-en',
    'Updated long category',
);
assert.equal(collidingCategoryUpdate.extractedData.data.categories[0].name.en, 'Short category');
assert.equal(collidingCategoryUpdate.extractedData.data.categories[1].name.en, 'Updated long category');

const collidingItemUpdate = handleUpdateValue(
    prefixCollisionFile,
    'item-cat-long-drink-large-name-en',
    'Updated large drink',
);
assert.equal(collidingItemUpdate.extractedData.data.items[0].name.en, 'Drink');
assert.equal(collidingItemUpdate.extractedData.data.items[1].name.en, 'Updated large drink');

const collidingAttributeUpdate = handleUpdateValue(
    prefixCollisionFile,
    'item-cat-long-drink-attr-size-large-price',
    '30',
);
assert.equal(collidingAttributeUpdate.extractedData.data.items[0].attributes[0].price, '10');
assert.equal(collidingAttributeUpdate.extractedData.data.items[0].attributes[1].price, '30');

process.stdout.write('Project editor hyphenated identifier regression passed.\n');
