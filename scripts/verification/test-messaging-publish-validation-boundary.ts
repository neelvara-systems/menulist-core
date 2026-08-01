#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { normalizePublicMenuDraftExtractedData } from '../../src/data/shared/publicMenuDraftData';
import {
  validateMessagingPublishMenu,
  validateMessagingPublishProjectFiles,
} from '../../src/lib/messaging-onboarding/publishValidationBoundary';

function validate(value: unknown) {
  const menu = normalizePublicMenuDraftExtractedData(value);
  assert(menu);
  return validateMessagingPublishMenu(menu);
}

const baseCategory = { id: 'cat-1', name: { en: 'Lunch' } };
const baseItem = { category: 'cat-1', id: 'item-1', name: { en: 'Meal' } };

assert.deepEqual(validate({
  categories: [baseCategory],
  items: [{ ...baseItem, price: 0 }],
}), {
  activeCategoryCount: 1,
  activeItemCount: 1,
  pricedItemCount: 1,
  valid: true,
});

assert.equal(validate({
  categories: [baseCategory],
  items: [{
    ...baseItem,
    attributes: [{ id: 'large', name: { en: 'Large' }, price: '199' }],
  }],
}).valid, true, 'An active variant price must satisfy the publish price gate');

assert.equal(validate({
  categories: [{ ...baseCategory, active: false }],
  items: [{ ...baseItem, price: '199' }],
}).valid, false, 'Inactive categories must not make a blank public menu publishable');

assert.equal(validate({
  categories: [baseCategory],
  items: [{ ...baseItem, active: false, price: '199' }],
}).valid, false, 'Inactive items must not make a blank public menu publishable');

assert.equal(validate({
  categories: [baseCategory],
  items: [{
    ...baseItem,
    attributes: [{ active: false, id: 'large', name: { en: 'Large' }, price: '199' }],
  }],
}).valid, false, 'Inactive variant prices must not satisfy the price gate');

const validRendererFile = {
  active: true,
  deleted: false,
  extractedData: {
    data: normalizePublicMenuDraftExtractedData({
      categories: [baseCategory],
      items: [{ ...baseItem, price: '199' }],
    }),
  },
};
assert(validRendererFile.extractedData.data);
assert.equal(
  validateMessagingPublishProjectFiles([validRendererFile]).valid,
  true,
  'The persisted renderer file graph must independently satisfy publish admission',
);
assert.equal(
  validateMessagingPublishProjectFiles([{
    ...validRendererFile,
    extractedData: {
      data: normalizePublicMenuDraftExtractedData({
        categories: [baseCategory],
        items: [{ ...baseItem }],
      }),
    },
  }]).valid,
  false,
  'A valid aggregate must not hide an unpriced renderer file graph',
);
assert.equal(
  validateMessagingPublishProjectFiles([{ ...validRendererFile, deleted: true }]).valid,
  false,
  'Deleted renderer files must not satisfy publish admission',
);

console.log('Messaging publish validation boundary verification passed.');
