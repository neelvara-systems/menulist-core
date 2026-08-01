import assert from 'node:assert/strict';
import { Timestamp } from 'firebase/firestore';
import {
  computeMasterUpdateDiff,
} from '../../src/lib/multiOutlet/masterUpdateDiff';
import {
  applyCategoryOverride,
  isItemOverrideEmpty,
} from '../../src/lib/multiOutlet/overrideUtils';
import type {
  ExtractedDataAttribute,
  ExtractedDataCategory,
  ExtractedDataItem,
} from '../../src/components/templates/main-app/projects/types/extractedData.types';
import type {
  ProjectOverrides,
} from '../../src/components/templates/main-app/projects/types/project.types';
import type {
  SnapshotCategory,
  SnapshotItem,
} from '../../src/types/multiOutlet.types';

const timestamp = Timestamp.fromMillis(1_700_000_000_000);

const item: ExtractedDataItem = {
  id: 'item-1',
  name: { en: 'Tea' },
  category: 'category-1',
  price: '20',
  active: true,
  attributes: [{
    id: 'attribute-1',
    name: { en: 'Large' },
    price: '30',
    active: true,
  }],
};
const category: ExtractedDataCategory = {
  id: 'category-1',
  name: { en: 'Drinks' },
  active: true,
};
const snapshotItems: SnapshotItem[] = [{
  id: item.id,
  name: item.name.en,
  price: item.price || '',
  categoryId: item.category,
  active: true,
  attributes: [{
    id: 'attribute-1',
    name: 'Large',
    price: '30',
    active: true,
  }],
}];
const snapshotCategories: SnapshotCategory[] = [{
  id: category.id,
  name: category.name.en,
  active: true,
}];

const legacyItem: ExtractedDataItem = structuredClone(item);
const legacyAttribute = legacyItem.attributes?.[0] as ExtractedDataAttribute;
const legacyCategory: ExtractedDataCategory = structuredClone(category);
delete (legacyItem as { active?: boolean }).active;
delete (legacyAttribute as { active?: boolean }).active;
delete (legacyCategory as { active?: boolean }).active;

const legacyDiff = computeMasterUpdateDiff(
  snapshotItems,
  snapshotCategories,
  [legacyItem],
  [legacyCategory],
  undefined,
  timestamp,
);
assert.equal(
  legacyDiff.hasChanges,
  false,
  'omitted legacy active values must retain the snapshot default of active=true',
);

const overrides: ProjectOverrides = {
  items: {
    'item-1': {
      active: true,
      duration: 0,
    },
  },
  categories: {
    'category-1': {
      active: true,
    },
  },
  attributes: {
    'attribute-1': {
      active: true,
    },
  },
};
const changedItem: ExtractedDataItem = {
  ...item,
  active: false,
  duration: 10,
  attributes: item.attributes?.map((attribute) => ({
    ...attribute,
    active: false,
  })),
};
const changedCategory: ExtractedDataCategory = {
  ...category,
  active: false,
};
const overriddenDiff = computeMasterUpdateDiff(
  [{ ...snapshotItems[0], duration: 5 }],
  snapshotCategories,
  [changedItem],
  [changedCategory],
  overrides,
  timestamp,
);
for (const type of [
  'ITEM_DISABLED',
  'ITEM_DURATION_CHANGED',
  'ATTRIBUTE_DISABLED',
  'CATEGORY_DISABLED',
] as const) {
  const change = overriddenDiff.changes.find((entry) => entry.type === type);
  assert.ok(change, `expected ${type}`);
  assert.equal(change.outletContext?.hasOverride, true);
  assert.match(change.outletContext?.impactNote || '', /unaffected/);
}
assert.equal(
  overriddenDiff.changes.find((entry) => entry.type === 'ITEM_DURATION_CHANGED')
    ?.outletContext?.overrideValue,
  '0 min',
  'zero-valued duration overrides remain authoritative and visible',
);

assert.equal(
  applyCategoryOverride(category, { orderIndex: 2 }).orderIndex,
  2,
  'the helper must apply every CategoryOverride field',
);
assert.equal(isItemOverrideEmpty({ description: { en: 'Local description' } }), false);
assert.equal(isItemOverrideEmpty({ images: [] }), false);
assert.equal(isItemOverrideEmpty({}), true);

console.log('Master update diff tests passed.');
