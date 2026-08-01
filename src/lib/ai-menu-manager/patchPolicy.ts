import type { AiMenuManagerActionType, AiMenuManagerPatchKind, AiMenuManagerProjectPatch } from '@type/aiMenuManager';
import { normalizeOptionalMenuPrice } from '@lib/validation/pricing.schema';
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

const TOP_LEVEL_FIELDS_BY_KIND: Record<AiMenuManagerPatchKind, string[]> = {
    attribute_update: ['attributeId', 'attributeIds', 'itemIds', 'kind', 'updates'],
    bulk_item_update: ['itemIds', 'itemUpdates', 'kind', 'updates'],
    category_update: ['categoryIds', 'kind', 'updates'],
    decision_blocks_update: ['decisionBlocks', 'kind'],
    item_update: ['itemIds', 'itemUpdates', 'kind', 'updates'],
    menu_design_preset_apply: ['designPatch', 'designPresetKey', 'kind'],
    menu_settings_update: ['kind', 'menuSettings'],
};

const BOOLEAN_ITEM_ACTIONS = new Set<AiMenuManagerActionType>([
    'bulk_availability_update',
    'item_availability_update',
    'item_bestseller_update',
    'item_visibility_update',
]);
const BOOLEAN_DESIGN_FIELDS = new Set([
    'showCategoryIcons',
    'showCategoryTabs',
    'showImages',
    'showItemPrices',
]);
const MENU_LAYOUT_VALUES = new Set(['card', 'grid', 'list']);
const MENU_MOOD_VALUES = new Set(['bold', 'clean', 'fast', 'premium', 'warm']);
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function objectKeys(value?: object | null) {
    if (!isRecord(value)) return [];
    try {
        return Object.keys(value).filter((key) => value[key] !== undefined);
    } catch {
        return ['__invalid_object__'];
    }
}

function onlyAllowed(keys: string[], allowed: string[] = []) {
    return keys.length > 0 && keys.every((key) => allowed.includes(key));
}

function hasUnexpectedGeneralPatchFields(patch: AiMenuManagerProjectPatch, allowedKind: AiMenuManagerPatchKind) {
    if (!objectKeys(patch).every((key) => (
        TOP_LEVEL_FIELDS_BY_KIND[allowedKind].includes(key)
    ))) {
        return true;
    }
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

function hasValidTargetIds(values: unknown, maxItems = 100): values is string[] {
    if (!Array.isArray(values) || values.length === 0 || values.length > maxItems) return false;
    try {
        const seen = new Set<string>();
        return values.every((value) => {
            if (typeof value !== 'string') return false;
            const normalized = value.trim();
            if (!normalized || normalized !== value || normalized.length > 160 || seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    } catch {
        return false;
    }
}

function itemUpdateTargetsMatch(patch: AiMenuManagerProjectPatch): boolean {
    if (!patch.itemUpdates) return Boolean(patch.updates);
    const itemIds = new Set(patch.itemIds || []);
    const updateIds = objectKeys(patch.itemUpdates);
    if (!updateIds.length || updateIds.some((id) => !itemIds.has(id))) return false;
    return Boolean(patch.updates) || Array.from(itemIds).every((id) => updateIds.includes(id));
}

function itemUpdateKeys(patch: AiMenuManagerProjectPatch) {
    const keys = new Set(objectKeys(patch.updates));
    Object.values(patch.itemUpdates || {}).forEach((updates) => {
        objectKeys(updates).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
}

function isBoundedCanonicalString(value: unknown, maxLength: number, minLength = 1): value is string {
    return typeof value === 'string'
        && value.length >= minLength
        && value.length <= maxLength
        && value.trim() === value;
}

function isLocalizedTextPatch(value: unknown, maxTextLength: number): boolean {
    if (!isRecord(value)) return false;
    const entries = Object.entries(value);
    return entries.length > 0
        && entries.length <= 20
        && entries.every(([locale, text]) => (
            isBoundedCanonicalString(locale, 35)
            && isBoundedCanonicalString(text, maxTextLength)
        ));
}

function isValidPricePatchValue(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const normalized = normalizeOptionalMenuPrice(value);
    return normalized.success && normalized.data === value;
}

function validateUpdateValue(actionType: AiMenuManagerActionType, field: string, value: unknown): boolean {
    if (actionType === 'item_price_update' || actionType === 'bulk_price_update') {
        return field === 'price' && isValidPricePatchValue(value);
    }
    if (BOOLEAN_ITEM_ACTIONS.has(actionType)) {
        return typeof value === 'boolean';
    }
    if (actionType === 'item_name_update' || actionType === 'category_name_update') {
        return field === 'name' && isLocalizedTextPatch(value, 300);
    }
    if (actionType === 'item_description_update') {
        return field === 'description'
            ? isLocalizedTextPatch(value, 4_000)
            : field === 'descriptionSource' && value === 'manual';
    }
    if (actionType === 'item_category_update') {
        return field === 'category' && isBoundedCanonicalString(value, 160);
    }
    if (actionType === 'item_prep_time_update') {
        return field === 'duration'
            && typeof value === 'number'
            && Number.isInteger(value)
            && value > 0
            && value <= 999;
    }
    return false;
}

function validateUpdateObject(
    actionType: AiMenuManagerActionType,
    value: unknown,
    allowedFields: string[] = [],
): boolean {
    if (!isRecord(value)) return false;
    const entries = Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined);
    return entries.length > 0
        && entries.every(([field, fieldValue]) => (
            allowedFields.includes(field)
            && validateUpdateValue(actionType, field, fieldValue)
        ));
}

function itemUpdateValuesAreValid(
    actionType: AiMenuManagerActionType,
    patch: AiMenuManagerProjectPatch,
    allowedFields: string[] = [],
): boolean {
    if (patch.updates && !validateUpdateObject(actionType, patch.updates, allowedFields)) return false;
    return Object.values(patch.itemUpdates || {}).every((updates) => (
        validateUpdateObject(actionType, updates, allowedFields)
    ));
}

function decisionBlockValuesAreValid(value: unknown): boolean {
    if (!isRecord(value)) return false;
    const entries = Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined);
    return entries.length > 0 && entries.every(([field, fieldValue]) => (
        field.startsWith('enable')
            ? typeof fieldValue === 'boolean'
            : field.startsWith('pinned') && isBoundedCanonicalString(fieldValue, 160)
    ));
}

function designValuesAreValid(actionType: AiMenuManagerActionType, patch: AiMenuManagerProjectPatch): boolean {
    if (actionType === 'menu_design_preset_apply') {
        if (!isBoundedCanonicalString(patch.designPresetKey, 100)) return false;
    } else if (patch.designPresetKey !== undefined) {
        return false;
    }

    const designPatch = patch.designPatch;
    if (!isRecord(designPatch)) return false;
    const menu = designPatch.menu;
    const brand = designPatch.brand;
    if (menu !== undefined && !isRecord(menu)) return false;
    if (brand !== undefined && !isRecord(brand)) return false;

    const menuEntries = Object.entries(menu || {}).filter(([, value]) => value !== undefined);
    const brandEntries = Object.entries(brand || {}).filter(([, value]) => value !== undefined);
    return menuEntries.every(([field, value]) => {
        if (BOOLEAN_DESIGN_FIELDS.has(field)) return typeof value === 'boolean';
        if (field === 'layout') return typeof value === 'string' && MENU_LAYOUT_VALUES.has(value);
        if (field === 'mood') return typeof value === 'string' && MENU_MOOD_VALUES.has(value);
        return false;
    }) && brandEntries.every(([field, value]) => (
        field === 'accentColor'
        && typeof value === 'string'
        && HEX_COLOR_PATTERN.test(value)
    ));
}

function validatePatchPolicy(actionType: AiMenuManagerActionType, patch: AiMenuManagerProjectPatch) {
    const policy = PATCH_POLICIES[actionType];
    if (!policy) return false;
    if (patch.kind !== policy.kind) return false;
    if (hasUnexpectedGeneralPatchFields(patch, policy.kind)) return false;

    if (policy.requireItemIds && !hasValidTargetIds(patch.itemIds)) return false;
    if (policy.requireCategoryIds && !hasValidTargetIds(patch.categoryIds)) return false;

    if (policy.kind === 'item_update' || policy.kind === 'bulk_item_update') {
        return itemUpdateTargetsMatch(patch)
            && onlyAllowed(itemUpdateKeys(patch), policy.itemFields)
            && itemUpdateValuesAreValid(actionType, patch, policy.itemFields);
    }

    if (policy.kind === 'category_update') {
        return onlyAllowed(objectKeys(patch.updates), policy.categoryFields)
            && validateUpdateObject(actionType, patch.updates, policy.categoryFields);
    }

    if (policy.kind === 'menu_settings_update') {
        return onlyAllowed(objectKeys(patch.menuSettings), policy.menuSettingsFields)
            && isRecord(patch.menuSettings)
            && isBoundedCanonicalString(patch.menuSettings.specialNote, 140, 3);
    }

    if (policy.kind === 'decision_blocks_update') {
        return onlyAllowed(objectKeys(patch.decisionBlocks), policy.decisionBlockFields)
            && decisionBlockValuesAreValid(patch.decisionBlocks);
    }

    if (policy.kind === 'menu_design_preset_apply') {
        const designPatch = patch.designPatch || {};
        if (!objectKeys(designPatch).every((key) => (
            key === 'menu' || key === 'brand'
        ))) return false;
        const menuKeys = objectKeys(designPatch.menu);
        const brandKeys = objectKeys(designPatch.brand);
        const hasAllowedMenu = menuKeys.length ? onlyAllowed(menuKeys, policy.menuFields) : true;
        const hasAllowedBrand = brandKeys.length ? onlyAllowed(brandKeys, policy.brandFields) : true;
        return (menuKeys.length > 0 || brandKeys.length > 0)
            && hasAllowedMenu
            && hasAllowedBrand
            && designValuesAreValid(actionType, patch);
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
