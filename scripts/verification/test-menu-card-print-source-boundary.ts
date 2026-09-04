import assert from 'node:assert/strict';
import { buildDefaultSettings } from '@lib/menu-card-export/presets/presetRegistry';
import { buildPrintSource } from '@lib/menu-card-export/source/buildPrintSource';
import { buildPrintSourceHash } from '@lib/menu-card-export/source/buildPrintSourceHash';

const settings = buildDefaultSettings('home_print', 'classic');
const baseProject = {
    projectId: 'project-1',
    name: 'Current menu',
    extractedData: {
        data: {
            categories: [{ id: 'category-1', name: 'Main', icon: 'lu:LuUtensilsCrossed' }],
            items: [{
                id: 'item-1',
                categoryId: 'category-1',
                name: 'Rice',
                price: '10',
                decisionFacts: {
                    dietaryTags: { value: ['vegetarian'] },
                    spiceLevel: { value: 'medium' },
                },
            }],
        },
    },
};
const baseStore = {
    tenantId: 101,
    storeId: 202,
    name: 'Boundary Cafe',
    tagline: { en: 'Food with a sense of place', hi: 'स्वाद और अपनापन' },
};

const canonical = buildPrintSource({
    project: {
        ...baseProject,
        modifiedOn: {
            toDate: () => new Date('2026-07-29T10:00:00.000Z'),
        },
    },
    store: baseStore,
    menuUrl: 'https://sample-cafe.menulist.online/menu',
    settings,
});
assert.equal(canonical.tenantId, '101');
assert.equal(canonical.storeId, '202');
assert.equal(canonical.projectId, 'project-1');
assert.equal(canonical.menu.updatedAt, '2026-07-29T10:00:00.000Z');
assert.equal(canonical.business.tagline, 'Food with a sense of place');
assert.deepEqual(canonical.menu.categories[0]?.items[0]?.decisionSymbols, ['vegetarian', 'spice-medium']);
assert.equal(canonical.menu.categories[0]?.icon, 'lu:LuUtensilsCrossed');
assert.equal(canonical.flags.hasCategoryIcons, true);

const changedCategoryIconSource = structuredClone(canonical);
changedCategoryIconSource.menu.categories[0]!.icon = 'emoji:🍽️';
assert.notEqual(
    buildPrintSourceHash(canonical, settings),
    buildPrintSourceHash(changedCategoryIconSource, settings),
    'a category icon change must invalidate a previously generated print artifact',
);

const categoryIconsHidden = buildPrintSource({
    project: {
        ...baseProject,
        config: { design: { menu: { showCategoryIcons: false } } },
    },
    store: baseStore,
    menuUrl: 'https://sample-cafe.menulist.online/menu',
    settings,
});
assert.equal(categoryIconsHidden.menu.categories[0]?.icon, undefined);
assert.equal(categoryIconsHidden.flags.hasCategoryIcons, false);

const changedDecisionSymbolSource = structuredClone(canonical);
changedDecisionSymbolSource.menu.categories[0]!.items[0]!.decisionSymbols = ['vegetarian', 'spice-hot'];
assert.notEqual(
    buildPrintSourceHash(canonical, settings),
    buildPrintSourceHash(changedDecisionSymbolSource, settings),
);

const fallbackDate = buildPrintSource({
    project: {
        ...baseProject,
        modifiedOn: 'not-a-date',
        updatedAt: '2026-07-28T09:30:00Z',
    },
    store: {
        ...baseStore,
        tId: '101',
        sId: '202',
    },
    menuUrl: 'https://sample-cafe.menulist.online/menu',
    settings,
});
assert.equal(fallbackDate.menu.updatedAt, '2026-07-28T09:30:00.000Z');

const malformed = buildPrintSource({
    project: {
        ...baseProject,
        projectId: 123,
        id: 'legacy-project',
        modifiedOn: new Date(Number.NaN),
        updatedAt: {
            get toDate() {
                throw new Error('must stay contained');
            },
        },
        lastPublishedAt: 'still-not-a-date',
    },
    store: {
        ...baseStore,
        tId: 999,
        sId: 202,
    },
    menuUrl: 'https://sample-cafe.menulist.online/menu',
    settings,
});
assert.equal(malformed.tenantId, undefined);
assert.equal(malformed.storeId, '202');
assert.equal(malformed.projectId, 'legacy-project');
assert.equal(malformed.menu.updatedAt, null);

const publicPresenceTagline = buildPrintSource({
    project: baseProject,
    store: {
        ...baseStore,
        tagline: undefined,
        publicPresence: { tagline: 'Carefully made for everyday moments' },
    },
    menuUrl: 'https://sample-cafe.menulist.online/menu',
    settings,
});
assert.equal(publicPresenceTagline.business.tagline, 'Carefully made for everyday moments');

console.log('Menu Card Export print-source boundary tests passed.');
