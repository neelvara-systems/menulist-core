import type { AiMenuManagerActionType, AiMenuManagerPatchKind, AiMenuManagerProjectPatch } from '@type/aiMenuManager';
import { hashStableValue } from './idempotency';

type PatchPolicy = {
    brandFields?: string[];
    categoryFields?: string[];
    decisionBlockFields?: string[];
    itemFields?: string[];
    kind: AiMenuManagerPatchKind;
    menuFields?: string[];
    menuSettingsFields?: string[];
    requireCategoryIds?: boolean;
    requireItemIds?: boolean;
};

const PATCH_POLICIES: Partial<Record<AiMenuManagerActionType, PatchPolicy>> = {
    item_price_update: { kind: 'item_update', itemFields: ['price'], requireItemIds: true },
    item_name_update: { kind: 'item_update', itemFields: ['name'], requireItemIds: true },
    item_description_update: { kind: 'item_update', itemFields: ['description', 'descriptionSource'], requireItemIds: true },
    item_category_update: { kind: 'item_update', itemFields: ['category'], requireItemIds: true },
    item_availability_update: { kind: 'item_update', itemFields: ['available'], requireItemIds: true },
    item_visibility_update: { kind: 'item_update', itemFields: ['active'], requireItemIds: true },
    item_bestseller_update: { kind: 'item_update', itemFields: ['isBestSeller'], requireItemIds: true },
    item_prep_time_update: { kind: 'item_update', itemFields: ['duration'], requireItemIds: true },
    category_name_update: { kind: 'category_update', categoryFields: ['name'], requireCategoryIds: true },
    category_visibility_update: { kind: 'category_update', categoryFields: ['active'], requireCategoryIds: true },
    decision_blocks_update: {
        kind: 'decision_blocks_update',
        decisionBlockFields: [
            'enableBestValue',
            'enablePopular',
            'enableQuickPick',
            'pinnedBestValue',
            'pinnedPopular',
            'pinnedQuickPick',
        ],
    },
    menu_special_note_update: { kind: 'menu_settings_update', menuSettingsFields: ['specialNote'] },
    menu_design_mood_update: { kind: 'menu_design_preset_apply', menuFields: ['layout', 'mood'] },
    menu_design_layout_update: { kind: 'menu_design_preset_apply', menuFields: ['layout'] },
    menu_design_preset_apply: {
        kind: 'menu_design_preset_apply',
        brandFields: ['accentColor'],
        menuFields: ['layout', 'mood', 'showCategoryIcons', 'showCategoryTabs', 'showImages', 'showItemPrices'],
    },
    menu_design_visibility_update: {
        kind: 'menu_design_preset_apply',
        menuFields: ['showCategoryIcons', 'showCategoryTabs', 'showImages', 'showItemPrices'],
    },
    menu_design_color_update: { kind: 'menu_design_preset_apply', brandFields: ['accentColor'] },
    bulk_price_update: { kind: 'bulk_item_update', itemFields: ['price'], requireItemIds: true },
    bulk_availability_update: { kind: 'bulk_item_update', itemFields: ['available'], requireItemIds: true },
};

function objectKeys(value?: Record<string, unknown>) {
    return value ? Object.keys(value).filter((key) => value[key] !== undefined) : [];
}

function onlyAllowed(keys: string[], allowed: string[] = []) {
    return keys.length > 0 && keys.every((key) => allowed.includes(key));
}

function hasUnexpectedGeneralPatchFields(patch: AiMenuManagerProjectPatch, allowedKind: AiMenuManagerPatchKind) {
    if (allowedKind !== 'item_update' && allowedKind !== 'bulk_item_update' && (patch.itemIds?.length || patch.itemUpdates || patch.attributeId || patch.attributeIds?.length)) {
        return true;
    }
    if (allowedKind !== 'category_update' && patch.categoryIds?.length) {
        return true;
    }
    if (allowedKind !== 'menu_settings_update' && patch.menuSettings) {
        return true;
    }
    if (allowedKind !== 'decision_blocks_update' && patch.decisionBlocks) {
        return true;
    }
    if (allowedKind !== 'menu_design_preset_apply' && (patch.designPatch || patch.designPresetKey)) {
        return true;
    }
    if (!['item_update', 'bulk_item_update', 'category_update'].includes(allowedKind) && patch.updates) {
        return true;
    }
    return false;
}

function itemUpdateKeys(patch: AiMenuManagerProjectPatch) {
    const keys = new Set(objectKeys(patch.updates));
    Object.values(patch.itemUpdates || {}).forEach((updates) => {
        objectKeys(updates).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
}

function validatePatchPolicy(actionType: AiMenuManagerActionType, patch: AiMenuManagerProjectPatch) {
    const policy = PATCH_POLICIES[actionType];
    if (!policy) return false;
    if (patch.kind !== policy.kind) return false;
    if (hasUnexpectedGeneralPatchFields(patch, policy.kind)) return false;

    if (policy.requireItemIds && !patch.itemIds?.length) return false;
    if (policy.requireCategoryIds && !patch.categoryIds?.length) return false;

    if (policy.kind === 'item_update' || policy.kind === 'bulk_item_update') {
        return onlyAllowed(itemUpdateKeys(patch), policy.itemFields);
    }

    if (policy.kind === 'category_update') {
        return onlyAllowed(objectKeys(patch.updates), policy.categoryFields);
    }

    if (policy.kind === 'menu_settings_update') {
        return onlyAllowed(objectKeys(patch.menuSettings), policy.menuSettingsFields);
    }

    if (policy.kind === 'decision_blocks_update') {
        return onlyAllowed(objectKeys(patch.decisionBlocks), policy.decisionBlockFields);
    }

    if (policy.kind === 'menu_design_preset_apply') {
        const designPatch = patch.designPatch || {};
        const menuKeys = objectKeys(designPatch.menu);
        const brandKeys = objectKeys(designPatch.brand);
        const hasAllowedMenu = menuKeys.length ? onlyAllowed(menuKeys, policy.menuFields) : true;
        const hasAllowedBrand = brandKeys.length ? onlyAllowed(brandKeys, policy.brandFields) : true;
        return (menuKeys.length > 0 || brandKeys.length > 0) && hasAllowedMenu && hasAllowedBrand;
    }

    return false;
}

export function isAiMenuManagerPatchAllowedForAction(params: {
    actionType: AiMenuManagerActionType;
    patch: AiMenuManagerProjectPatch;
    patchHash?: string;
}) {
    if (!validatePatchPolicy(params.actionType, params.patch)) return false;
    return !params.patchHash || hashStableValue(params.patch) === params.patchHash;
}

export function assertAiMenuManagerPatchAllowedForAction(params: {
    actionType: AiMenuManagerActionType;
    patch: AiMenuManagerProjectPatch;
    patchHash?: string;
}) {
    if (!isAiMenuManagerPatchAllowedForAction(params)) {
        throw new Error('Card patch no longer matches the registered action');
    }
}
