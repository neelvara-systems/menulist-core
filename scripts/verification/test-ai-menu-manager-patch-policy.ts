import assert from 'node:assert/strict';
import { isAiMenuManagerPatchAllowedForAction } from '@lib/ai-menu-manager/patchPolicy';
import type { AiMenuManagerProjectPatch } from '@type/aiMenuManager';

const validPricePatch: AiMenuManagerProjectPatch = {
    kind: 'bulk_item_update',
    itemIds: ['item-1', 'item-2'],
    itemUpdates: {
        'item-1': { price: '10' },
        'item-2': { price: '12' },
    },
};
assert.equal(isAiMenuManagerPatchAllowedForAction({
    actionType: 'bulk_price_update',
    patch: validPricePatch,
}), true);

const invalidShapePatches: AiMenuManagerProjectPatch[] = [
    Object.assign({}, validPricePatch, { unexpected: true }),
    { ...validPricePatch, itemIds: ['item-1', 'item-1'] },
    { ...validPricePatch, itemIds: [' item-1', 'item-2'] },
    {
        ...validPricePatch,
        itemUpdates: {
            'item-1': { price: '10' },
            'item-2': { price: '12' },
            'item-3': { price: '99' },
        },
    },
    {
        ...validPricePatch,
        itemUpdates: {
            'item-1': { price: '10' },
        },
    },
];

invalidShapePatches.forEach((patch) => {
    assert.equal(isAiMenuManagerPatchAllowedForAction({
        actionType: 'bulk_price_update',
        patch,
    }), false);
});

const invalidDesignPatch: AiMenuManagerProjectPatch = {
    kind: 'menu_design_preset_apply',
    designPatch: {
        menu: { layout: 'grid' },
    },
};
Object.assign(invalidDesignPatch.designPatch!, {
    internal: { unsafe: true },
});
assert.equal(isAiMenuManagerPatchAllowedForAction({
    actionType: 'menu_design_layout_update',
    patch: invalidDesignPatch,
}), false);

const invalidValueCases: Array<{
    actionType: Parameters<typeof isAiMenuManagerPatchAllowedForAction>[0]['actionType'];
    patch: AiMenuManagerProjectPatch;
}> = [
    {
        actionType: 'bulk_price_update',
        patch: { ...validPricePatch, itemUpdates: { 'item-1': { price: {} }, 'item-2': { price: '12' } } },
    },
    {
        actionType: 'item_availability_update',
        patch: { kind: 'item_update', itemIds: ['item-1'], updates: { available: 'false' } },
    },
    {
        actionType: 'item_name_update',
        patch: { kind: 'item_update', itemIds: ['item-1'], updates: { name: { en: 42 } } },
    },
    {
        actionType: 'item_description_update',
        patch: {
            kind: 'item_update',
            itemIds: ['item-1'],
            updates: { description: { en: 'Freshly prepared' }, descriptionSource: 'generated' },
        },
    },
    {
        actionType: 'item_prep_time_update',
        patch: { kind: 'item_update', itemIds: ['item-1'], updates: { duration: -10 } },
    },
    {
        actionType: 'menu_special_note_update',
        patch: { kind: 'menu_settings_update', menuSettings: { specialNote: { en: 'No tax' } } },
    },
    {
        actionType: 'decision_blocks_update',
        patch: { kind: 'decision_blocks_update', decisionBlocks: { enablePopular: 'yes' } as never },
    },
    {
        actionType: 'menu_design_layout_update',
        patch: { kind: 'menu_design_preset_apply', designPatch: { menu: { layout: 'internal' } } },
    },
    {
        actionType: 'menu_design_visibility_update',
        patch: { kind: 'menu_design_preset_apply', designPatch: { menu: { showImages: 1 } } },
    },
    {
        actionType: 'menu_design_color_update',
        patch: { kind: 'menu_design_preset_apply', designPatch: { brand: { accentColor: 'javascript:red' } } },
    },
    {
        actionType: 'menu_design_layout_update',
        patch: {
            kind: 'menu_design_preset_apply',
            designPresetKey: 'forged-preset',
            designPatch: { menu: { layout: 'grid' } },
        },
    },
    {
        actionType: 'menu_design_preset_apply',
        patch: {
            kind: 'menu_design_preset_apply',
            designPatch: { menu: { layout: 'grid' } },
        },
    },
];

invalidValueCases.forEach(({ actionType, patch }) => {
    assert.equal(isAiMenuManagerPatchAllowedForAction({ actionType, patch }), false);
});

[
    {
        actionType: 'item_name_update' as const,
        patch: { kind: 'item_update' as const, itemIds: ['item-1'], updates: { name: { en: 'Masala Dosa' } } },
    },
    {
        actionType: 'menu_special_note_update' as const,
        patch: { kind: 'menu_settings_update' as const, menuSettings: { specialNote: 'Taxes included' } },
    },
    {
        actionType: 'decision_blocks_update' as const,
        patch: { kind: 'decision_blocks_update' as const, decisionBlocks: { enablePopular: true, pinnedPopular: 'item-1' } },
    },
    {
        actionType: 'menu_design_preset_apply' as const,
        patch: {
            kind: 'menu_design_preset_apply' as const,
            designPresetKey: 'fresh-cafe',
            designPatch: {
                menu: { layout: 'grid', mood: 'clean', showImages: true },
                brand: { accentColor: '#123abc' },
            },
        },
    },
].forEach(({ actionType, patch }) => {
    assert.equal(isAiMenuManagerPatchAllowedForAction({ actionType, patch }), true);
});

console.log('AI Menu Manager patch-policy tests passed.');
