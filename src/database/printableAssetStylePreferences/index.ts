import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { STORE_NESTED_DELETE } from '@lib/store/storeNestedUpdateProjection';
import {
    applyPrintableThemePreference,
    applyPrintableAssetStylePreference,
    buildPrintableThemePreferencePatch,
    buildPrintableAssetStylePreferencePatch,
    removePrintableProjectThemeOverride,
    removePrintableAssetProjectStyleOverride,
    type PrintableAssetStylePreferences,
} from '@lib/printable-asset-templates/stylePreferences';
import type { PrintableAssetTypeId, PrintableTemplateFamilyId } from '@lib/printable-asset-templates/types';

type SavePrintableAssetStylePreferenceInput = {
    assetTypeId: PrintableAssetTypeId;
    businessCategory?: string | null;
    businessType?: string | null;
    current?: unknown;
    projectId?: string | null;
    scope: 'business' | 'project';
    storeId: number;
    templateFamilyId: PrintableTemplateFamilyId;
};

export async function savePrintableAssetStylePreference(
    input: SavePrintableAssetStylePreferenceInput,
): Promise<PrintableAssetStylePreferences> {
    const patch = buildPrintableAssetStylePreferencePatch(input);
    const savedPreferences = applyPrintableAssetStylePreference(input);
    const result = await updateStore({
        storeId: input.storeId,
        printableAssetStylePreferences: patch,
    }, { privateConfigurationField: 'printableAssetStylePreferences' });
    assertStoreUpdateSucceeded(result, input.storeId, 'printable_asset_style_preference_save_rejected');
    return savedPreferences;
}

export async function clearPrintableAssetProjectStyleOverride(input: {
    assetTypeId: PrintableAssetTypeId;
    current?: unknown;
    projectId: string;
    storeId: number;
}): Promise<PrintableAssetStylePreferences> {
    // Validate and normalize the dynamic project key before constructing a
    // Firestore FieldPath. The write must never run with the raw client value.
    const savedPreferences = removePrintableAssetProjectStyleOverride(input);
    const normalizedProjectId = input.projectId.trim();
    const remainingProjectPreferences = savedPreferences.projectOverrides?.[normalizedProjectId];
    const result = await updateStore({
        storeId: input.storeId,
        printableAssetStylePreferences: {
            projectOverrides: {
                [normalizedProjectId]: remainingProjectPreferences
                    ? { [input.assetTypeId]: STORE_NESTED_DELETE }
                    : STORE_NESTED_DELETE,
            },
        },
    }, { privateConfigurationField: 'printableAssetStylePreferences' });
    assertStoreUpdateSucceeded(result, input.storeId, 'printable_asset_style_preference_clear_rejected');
    return savedPreferences;
}

export async function savePrintableThemePreference(input: {
    businessCategory?: string | null;
    businessType?: string | null;
    current?: unknown;
    projectId?: string | null;
    scope: 'business' | 'project';
    storeId: number;
    templateFamilyId: PrintableTemplateFamilyId;
}): Promise<PrintableAssetStylePreferences> {
    const patch = buildPrintableThemePreferencePatch(input);
    const savedPreferences = applyPrintableThemePreference(input);
    const result = await updateStore({
        storeId: input.storeId,
        printableAssetStylePreferences: patch,
    }, { privateConfigurationField: 'printableAssetStylePreferences' });
    assertStoreUpdateSucceeded(result, input.storeId, 'printable_asset_theme_preference_save_rejected');
    return savedPreferences;
}

export async function clearPrintableProjectThemeOverride(input: {
    current?: unknown;
    projectId: string;
    storeId: number;
}): Promise<PrintableAssetStylePreferences> {
    const savedPreferences = removePrintableProjectThemeOverride(input);
    const normalizedProjectId = input.projectId.trim();
    const result = await updateStore({
        storeId: input.storeId,
        printableAssetStylePreferences: {
            projectThemeOverrides: {
                [normalizedProjectId]: STORE_NESTED_DELETE,
            },
        },
    }, { privateConfigurationField: 'printableAssetStylePreferences' });
    assertStoreUpdateSucceeded(result, input.storeId, 'printable_asset_theme_preference_clear_rejected');
    return savedPreferences;
}
