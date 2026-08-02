import assert from 'node:assert/strict';
import { buildDefaultSettings } from '@lib/menu-card-export/presets/presetRegistry';
import { buildPrintSource } from '@lib/menu-card-export/source/buildPrintSource';

const settings = buildDefaultSettings('home_print', 'classic');
const baseProject = {
    projectId: 'project-1',
    name: 'Current menu',
    extractedData: {
        data: {
            categories: [{ id: 'category-1', name: 'Main' }],
            items: [{ id: 'item-1', categoryId: 'category-1', name: 'Rice', price: '10' }],
        },
    },
};
const baseStore = {
    tenantId: 101,
    storeId: 202,
    name: 'Boundary Cafe',
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

console.log('Menu Card Export print-source boundary tests passed.');
