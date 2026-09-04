import assert from 'node:assert/strict';

import { getBusinessCategoryConfig, getBusinessTypeConfig } from '../../src/data/shared/businessTypes';
import { PRINTABLE_ASSET_TYPES } from '../../src/lib/printable-asset-templates/assetTypes';
import {
    getPrintableThemeFamiliesForBusiness,
    resolvePrintableBusinessThemeRecommendation,
} from '../../src/lib/printable-asset-templates/businessThemeRecommendations';
import {
    buildPrintableAssetEditorDocument,
    isPrintableAssetEditorRenderable,
} from '../../src/lib/printable-asset-templates/editorDocumentAdapter';
import {
    applyPrintableThemePreference,
    buildMenuKitAssetStyleMap,
    buildPrintableAssetStylePreferencePatch,
    buildPrintableThemePreferencePatch,
    normalizeMenuKitAssetStyleMap,
    normalizePrintableAssetStylePreferences,
    removePrintableProjectThemeOverride,
    resolvePrintableAssetStyle,
} from '../../src/lib/printable-asset-templates/stylePreferences';
import {
    PRINTABLE_THEME_FAMILY_IDS,
    getPrintableTemplateFamiliesForAsset,
    getPrintableThemeFamilies,
    isPrintableTemplateFamilyVisibleForBusiness,
    normalizePrintableTemplateFamilyId,
} from '../../src/lib/printable-asset-templates/templateFamilies';
import { getPrintableThemeArtworkPaths } from '../../src/lib/printable-asset-templates/themeArtwork';
import {
    buildMenuKitZipFilename,
    resolveMenuKitAssetTemplateFamilyId,
    resolveMenuKitZipTemplateFamilyId,
} from '../../src/lib/menu-kit/menuKitGenerator';
import { MENU_KIT_ASSET_KEYS } from '../../src/lib/menu-kit/types';

const legacyAliases = {
    'brand-banner': 'art-deco-garden',
    'classic-luxe': 'botanical-heritage',
    'clean-utility': 'indian-atelier',
    'executive-dark': 'midnight-gold',
    'local-bold': 'lankan-block-print',
    'modern-calm': 'indian-atelier',
    'qr-first': 'indian-atelier',
    'soft-curve': 'sunset-atelier',
} as const;

for (const [legacyId, canonicalId] of Object.entries(legacyAliases)) {
    assert.equal(normalizePrintableTemplateFamilyId(legacyId), canonicalId);
}

const canonicalThemeIds = getPrintableThemeFamilies().map((family) => family.id);
assert.deepEqual(canonicalThemeIds, [...PRINTABLE_THEME_FAMILY_IDS]);
assert.equal(new Set(canonicalThemeIds).size, 47);
const foodCategoryThemeIds = [
    'craft-kitchen',
    'ember-house',
    'coastal-table',
    'sunday-table',
    'counter-rush',
] as const;
for (const legacyId of Object.keys(legacyAliases)) {
    assert.equal(canonicalThemeIds.includes(legacyId as never), false, `${legacyId} must not be selectable`);
}

for (const family of getPrintableThemeFamilies()) {
    if (family.visibility.scope === 'business-category') {
        for (const businessCategory of family.visibility.businessCategories) {
            assert.ok(
                getBusinessCategoryConfig(businessCategory),
                `${family.id} must reference a canonical business category`,
            );
        }
    }
    if (family.visibility.scope === 'business-type') {
        for (const businessType of family.visibility.businessTypes) {
            assert.ok(
                getBusinessTypeConfig(businessType),
                `${family.id} must reference a canonical business type`,
            );
        }
    }
}

for (const asset of PRINTABLE_ASSET_TYPES) {
    assert.deepEqual(
        getPrintableTemplateFamiliesForAsset(asset.id).map((family) => family.id),
        canonicalThemeIds,
        `${asset.id} must expose the complete parent-theme catalog`,
    );
    assert.equal(asset.defaultTemplateId, 'botanical-heritage');
}

assert.deepEqual(resolvePrintableBusinessThemeRecommendation({ businessType: 'Salon' }), {
    audienceLabel: 'Recommended for salons',
    matchedBy: 'business-type',
    primaryThemeId: 'salon-atelier',
    recommendedThemeIds: ['salon-atelier', 'petal-studio', 'pearl-veil', 'terracotta-glow', 'glasshouse-beauty'],
});
assert.equal(
    resolvePrintableBusinessThemeRecommendation({ businessType: 'spa resort' }).primaryThemeId,
    'ritual-sanctuary',
    'canonical business-type matching must remain case-insensitive',
);
assert.equal(
    resolvePrintableBusinessThemeRecommendation({ businessType: 'Pet Grooming Salon' }).primaryThemeId,
    'neighbourhood-standard',
    'pet grooming must use its exact service recommendation without inferring the human Salon vertical',
);
assert.deepEqual(resolvePrintableBusinessThemeRecommendation({ businessType: 'Restaurant' }), {
    audienceLabel: 'Recommended for food and beverage businesses',
    matchedBy: 'business-category',
    primaryThemeId: 'craft-kitchen',
    recommendedThemeIds: [
        'craft-kitchen',
        'ember-house',
        'coastal-table',
        'sunday-table',
        'counter-rush',
        'ink-vine',
        'indian-atelier',
        'bombay-chronicle',
        'japanese-night-luxe',
        'tea-salon-heritage',
        'lankan-block-print',
    ],
});
assert.deepEqual(resolvePrintableBusinessThemeRecommendation({ businessType: 'Specialty Coffee Shop' }), {
    audienceLabel: 'Recommended for specialty coffee shops',
    matchedBy: 'business-type',
    primaryThemeId: 'roastery-ledger',
    recommendedThemeIds: ['roastery-ledger', 'craft-kitchen', 'ink-vine', 'gallery-ledger'],
});
assert.deepEqual(resolvePrintableBusinessThemeRecommendation({ businessType: 'Bakery' }), {
    audienceLabel: 'Recommended for bakeries',
    matchedBy: 'business-type',
    primaryThemeId: 'patisserie-conservatory',
    recommendedThemeIds: ['patisserie-conservatory', 'tea-salon-heritage', 'art-deco-garden', 'craft-kitchen'],
});
assert.deepEqual(resolvePrintableBusinessThemeRecommendation({ businessType: 'Ice Cream Shop' }), {
    audienceLabel: 'Recommended for ice cream shops',
    matchedBy: 'business-type',
    primaryThemeId: 'gelateria-riviera',
    recommendedThemeIds: ['gelateria-riviera', 'tea-salon-heritage', 'art-deco-garden', 'sunset-atelier'],
});
assert.deepEqual(
    getPrintableThemeFamiliesForBusiness({ businessType: 'Makeup Studio' }).slice(0, 5).map((family) => family.id),
    ['petal-studio', 'pearl-veil', 'terracotta-glow', 'glasshouse-beauty', 'salon-atelier'],
);
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Fashion Boutique' }).primaryThemeId, 'boutique-window');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Interior Designer' }).primaryThemeId, 'gallery-ledger');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Photography Studio' }).primaryThemeId, 'studio-contact-sheet');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Fitness Center' }).primaryThemeId, 'performance-circuit');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Gym' }).primaryThemeId, 'performance-circuit');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Fitness Bootcamp' }).primaryThemeId, 'performance-circuit');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Personal Trainer' }).primaryThemeId, 'performance-circuit');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Dental Clinic' }).primaryThemeId, 'clinical-calm');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Auto Repair Shop' }).primaryThemeId, 'future-workshop');
assert.equal(resolvePrintableBusinessThemeRecommendation({ businessType: 'Home Renovation Contractor' }).primaryThemeId, 'workshop-atlas');

const commonThemeIds = getPrintableThemeFamilies()
    .filter((family) => family.visibility.scope === 'common')
    .map((family) => family.id);
assert.equal(commonThemeIds.length, 34, 'the common catalog must remain available to every business');
assert.equal(
    getPrintableThemeFamilies().filter((family) => family.visibility.scope === 'business-type').length,
    8,
    'eight artwork-specific business-type theme families must remain fail-closed',
);
for (const themeId of ['pearl-veil', 'terracotta-glow', 'glasshouse-beauty', 'mineral-spring', 'lotus-stillness', 'sunlit-ritual'] as const) {
    assert.ok(commonThemeIds.includes(themeId), `${themeId} must remain universally visible`);
}
assert.deepEqual(
    new Set(getPrintableThemeFamilies()
        .filter((family) => family.visibility.scope === 'business-category')
        .map((family) => family.id)),
    new Set(foodCategoryThemeIds),
    'all five restaurant-led themes must remain food-category gated',
);

const categoryTopThemeIds = {
    service: ['neighbourhood-standard', 'field-notes', 'workshop-atlas'],
    retail: ['gallery-ledger', 'boutique-window', 'market-label'],
    professional: ['civic-letterpress', 'modern-practice', 'gallery-ledger'],
    creative: ['studio-contact-sheet', 'maker-ledger', 'gallery-ledger'],
    health: ['vital-current', 'clinical-calm', 'mindful-motion'],
    specialty: ['workshop-atlas', 'hospitality-house', 'future-workshop'],
} as const;
for (const [businessCategory, expectedThemeIds] of Object.entries(categoryTopThemeIds)) {
    assert.deepEqual(
        getPrintableThemeFamiliesForBusiness({ businessCategory, businessType: 'Other' })
            .slice(0, 3)
            .map((family) => family.id),
        expectedThemeIds,
        `${businessCategory} must expose three deliberately ordered category directions`,
    );
}

const newlyGenericThemeIds = [
    'neighbourhood-standard',
    'field-notes',
    'boutique-window',
    'market-label',
    'civic-letterpress',
    'modern-practice',
    'studio-contact-sheet',
    'maker-ledger',
    'clinical-calm',
    'mindful-motion',
    'hospitality-house',
    'future-workshop',
] as const;
for (const themeId of newlyGenericThemeIds) {
    assert.ok(commonThemeIds.includes(themeId), `${themeId} must be part of the common catalog`);
    for (const businessCategory of ['food', ...Object.keys(categoryTopThemeIds)]) {
        assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
            businessCategory,
            businessType: 'Other',
            templateFamilyId: themeId,
        }), true, `${themeId} must remain visible in ${businessCategory}`);
    }
}

for (const themeId of commonThemeIds) {
    assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
        businessType: 'Legacy Custom Business',
        templateFamilyId: themeId,
    }), true, `${themeId} must remain visible to every business`);
    assert.deepEqual(buildPrintableThemePreferencePatch({
        businessType: 'Pet Grooming Salon',
        scope: 'business',
        templateFamilyId: themeId,
    }), { businessThemeId: themeId }, `${themeId} must remain universally saveable`);
}

const petGroomingThemes = getPrintableThemeFamiliesForBusiness({ businessType: 'Pet Grooming Salon' }).map((family) => family.id);
assert.deepEqual(
    petGroomingThemes.slice(0, 4),
    ['neighbourhood-standard', 'field-notes', 'workshop-atlas', 'botanical-heritage'],
    'pet grooming must receive the service-specific set before common alternatives',
);
assert.deepEqual(
    new Set(petGroomingThemes),
    new Set(commonThemeIds),
    'service recommendations must order the universal catalog without restricting it',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessType: 'Restaurant' }).map((family) => family.id)),
    new Set([...commonThemeIds, ...foodCategoryThemeIds]),
    'food businesses must see every common theme plus all five restaurant-led themes',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessType: 'Cafe' }).map((family) => family.id)),
    new Set([...commonThemeIds, ...foodCategoryThemeIds, 'roastery-ledger']),
    'cafes must see common themes, restaurant-led themes, and Roastery Ledger only',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessType: 'Bakery' }).map((family) => family.id)),
    new Set([...commonThemeIds, ...foodCategoryThemeIds, 'patisserie-conservatory']),
    'bakeries must see common themes, restaurant-led themes, and Patisserie Conservatory only',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessType: 'Ice Cream Shop' }).map((family) => family.id)),
    new Set([...commonThemeIds, ...foodCategoryThemeIds, 'gelateria-riviera']),
    'ice cream shops must see common themes, restaurant-led themes, and Gelateria Riviera only',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessCategory: 'food', businessType: 'Other' }).map((family) => family.id)),
    new Set([...commonThemeIds, ...foodCategoryThemeIds]),
    'Other businesses may use every food theme for their explicit canonical category',
);
const genericServiceThemes = getPrintableThemeFamiliesForBusiness({ businessCategory: 'service', businessType: 'Other' }).map((family) => family.id);
assert.deepEqual(
    genericServiceThemes.slice(0, 4),
    ['neighbourhood-standard', 'field-notes', 'workshop-atlas', 'botanical-heritage'],
    'generic service businesses must prioritize the complete three-direction service set',
);
assert.deepEqual(
    new Set(genericServiceThemes),
    new Set(commonThemeIds),
    'generic service businesses must receive the complete common catalog',
);
assert.deepEqual(
    getPrintableThemeFamiliesForBusiness({ businessType: 'Legacy Custom Business' }).map((family) => family.id),
    commonThemeIds,
    'unknown legacy business types must fail closed to common themes',
);
const salonThemes = getPrintableThemeFamiliesForBusiness({ businessCategory: 'service', businessType: 'Salon' }).map((family) => family.id);
assert.deepEqual(salonThemes.slice(0, 5), ['salon-atelier', 'petal-studio', 'pearl-veil', 'terracotta-glow', 'glasshouse-beauty']);
assert.deepEqual(
    new Set(salonThemes),
    new Set([...commonThemeIds, 'salon-atelier', 'petal-studio']),
    'Salon must see its two artwork-specific themes plus every common theme',
);
const spaResortThemes = getPrintableThemeFamiliesForBusiness({ businessCategory: 'health', businessType: 'Spa Resort' }).map((family) => family.id);
assert.deepEqual(spaResortThemes.slice(0, 5), ['ritual-sanctuary', 'eucalyptus-retreat', 'mineral-spring', 'lotus-stillness', 'sunlit-ritual']);
assert.deepEqual(
    new Set(spaResortThemes),
    new Set([...commonThemeIds, 'ritual-sanctuary', 'eucalyptus-retreat']),
    'Spa Resort must see its two artwork-specific themes plus every common theme',
);
assert.deepEqual(
    new Set(getPrintableThemeFamiliesForBusiness({ businessType: 'Gym' }).map((family) => family.id)),
    new Set([...commonThemeIds, 'performance-circuit']),
    'Gym must see every common theme plus Performance Circuit',
);
for (const templateFamilyId of foodCategoryThemeIds) {
    assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
        businessCategory: 'service',
        businessType: 'Restaurant',
        templateFamilyId,
    }), true, `${templateFamilyId}: a canonical concrete type must own its category when stored category data conflicts`);
    assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
        businessCategory: 'food',
        businessType: 'Salon',
        templateFamilyId,
    }), false, `${templateFamilyId}: a mismatched stored category must not leak food themes to a concrete non-food type`);
}
assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
    businessType: 'Bakery',
    templateFamilyId: 'roastery-ledger',
}), false, 'Roastery Ledger must not leak into unrelated food business types');
assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
    businessType: 'Cafe',
    templateFamilyId: 'patisserie-conservatory',
}), false, 'Patisserie Conservatory must not leak into cafes');
assert.equal(isPrintableTemplateFamilyVisibleForBusiness({
    businessType: 'Restaurant',
    templateFamilyId: 'gelateria-riviera',
}), false, 'Gelateria Riviera must not leak into general restaurants');

for (const asset of PRINTABLE_ASSET_TYPES) {
    assert.deepEqual(resolvePrintableAssetStyle({
        assetTypeId: asset.id,
        businessCategory: 'service',
        businessType: 'Salon',
    }), { source: 'recommended', templateFamilyId: 'salon-atelier' });
    assert.deepEqual(resolvePrintableAssetStyle({
        assetTypeId: asset.id,
        businessCategory: 'health',
        businessType: 'Spa Resort',
    }), { source: 'recommended', templateFamilyId: 'ritual-sanctuary' });
}

for (const asset of PRINTABLE_ASSET_TYPES.filter((entry) => isPrintableAssetEditorRenderable(entry.id))) {
    for (const themeId of canonicalThemeIds) {
        const documentValue = buildPrintableAssetEditorDocument({
            assetTypeId: asset.id,
            brandColor: '#315f55',
            feedbackUrl: 'https://example.com/feedback',
            menuUrl: 'https://example.com/menu',
            shortLink: 'example.com/menu',
            storeName: 'Example Business',
            templateFamilyId: themeId,
        });
        assert.equal(documentValue.metadata?.templateId, `${asset.id}:${themeId}`);
        assert.ok(documentValue.elements.length > 0, `${asset.id}/${themeId} must build a real document`);
        const artworkPaths = getPrintableThemeArtworkPaths(themeId);
        const expectedArtworkSources = themeId === 'craft-kitchen'
            ? [artworkPaths?.corner, artworkPaths?.rail].filter(Boolean)
            : [
                documentValue.canvas.width / Math.max(1, documentValue.canvas.height) >= 1.15
                    ? artworkPaths?.compact || artworkPaths?.page
                    : artworkPaths?.page,
            ].filter(Boolean);
        for (const expectedSource of expectedArtworkSources) {
            assert.ok(
                documentValue.elements.some((element) => 'src' in element && element.src === expectedSource),
                `${asset.id}/${themeId} must carry its parent-theme artwork into the editor document`,
            );
        }
    }
}

const normalized = normalizePrintableAssetStylePreferences({
    businessThemeId: 'executive-dark',
    businessDefaults: {
        single_table_card: 'classic-luxe',
    },
    projectThemeOverrides: {
        'project-1': 'craft-kitchen',
        'project-2': 'soft-curve',
    },
    projectOverrides: {
        'project-1': { single_table_card: 'local-bold' },
        'project-3': { print_menu: 'qr-first', table_tent: 'classic-luxe' },
        'unsafe.project': { table_tent: 'classic-luxe' },
    },
});

assert.deepEqual(normalized, {
    businessThemeId: 'midnight-gold',
    projectThemeOverrides: {
        'project-1': 'craft-kitchen',
        'project-2': 'sunset-atelier',
        'project-3': 'indian-atelier',
    },
});
assert.equal(normalized.businessDefaults, undefined);
assert.equal(normalized.projectOverrides, undefined);

assert.deepEqual(
    normalizePrintableAssetStylePreferences({
        businessDefaults: { single_table_card: 'classic-luxe' },
        projectOverrides: { 'project-legacy': { entrance_poster: 'local-bold' } },
    }),
    {
        businessThemeId: 'botanical-heritage',
        projectThemeOverrides: { 'project-legacy': 'lankan-block-print' },
    },
    'legacy per-asset preferences must migrate deterministically to parent themes',
);

assert.deepEqual(
    normalizePrintableAssetStylePreferences(JSON.parse('{"projectOverrides":{"__proto__":{"single_table_card":"local-bold"}}}')),
    {},
);

let accessorExecuted = false;
const accessorPreferences: Record<string, unknown> = {};
Object.defineProperty(accessorPreferences, 'businessThemeId', {
    enumerable: true,
    get() {
        accessorExecuted = true;
        throw new Error('must not execute');
    },
});
assert.deepEqual(normalizePrintableAssetStylePreferences(accessorPreferences), {});
assert.equal(accessorExecuted, false);

for (const asset of PRINTABLE_ASSET_TYPES) {
    const resolved = resolvePrintableAssetStyle({
        assetTypeId: asset.id,
        businessType: 'Restaurant',
        preferences: normalized,
        projectId: 'project-1',
    });
    assert.deepEqual(resolved, { source: 'project-theme', templateFamilyId: 'craft-kitchen' });
}

for (const asset of PRINTABLE_ASSET_TYPES) {
    const resolved = resolvePrintableAssetStyle({
        assetTypeId: asset.id,
        preferences: normalized,
        projectId: 'project-without-theme',
    });
    assert.deepEqual(resolved, { source: 'business-theme', templateFamilyId: 'midnight-gold' });
}

assert.deepEqual(buildPrintableThemePreferencePatch({
    businessType: 'Restaurant',
    scope: 'business',
    templateFamilyId: 'craft-kitchen',
}), { businessThemeId: 'craft-kitchen' });
assert.deepEqual(buildPrintableThemePreferencePatch({
    businessType: 'Restaurant',
    scope: 'business',
    templateFamilyId: 'counter-rush',
}), { businessThemeId: 'counter-rush' });
assert.deepEqual(buildPrintableAssetStylePreferencePatch({
    assetTypeId: 'entrance_poster',
    businessType: 'Restaurant',
    projectId: 'project-4',
    scope: 'project',
    templateFamilyId: 'tea-salon-heritage',
}), { projectThemeOverrides: { 'project-4': 'tea-salon-heritage' } });

const withProjectTheme = applyPrintableThemePreference({
    businessType: 'Restaurant',
    current: normalized,
    projectId: 'project-4',
    scope: 'project',
    templateFamilyId: 'bombay-chronicle',
});
assert.equal(withProjectTheme.projectThemeOverrides?.['project-4'], 'bombay-chronicle');
assert.equal(
    removePrintableProjectThemeOverride({ current: withProjectTheme, projectId: 'project-4' })
        .projectThemeOverrides?.['project-4'],
    undefined,
);

const menuKitStyles = buildMenuKitAssetStyleMap({ preferences: normalized, projectId: 'project-1' });
const restaurantMenuKitStyles = buildMenuKitAssetStyleMap({
    businessType: 'Restaurant',
    preferences: normalized,
    projectId: 'project-1',
});
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(menuKitStyles[assetKey], 'midnight-gold');
    assert.equal(restaurantMenuKitStyles[assetKey], 'craft-kitchen');
}

const staleVerticalPreferences = {
    businessThemeId: 'craft-kitchen',
    projectThemeOverrides: { 'project-food': 'craft-kitchen' },
};
assert.deepEqual(resolvePrintableAssetStyle({
    assetTypeId: 'print_menu',
    businessCategory: 'service',
    businessType: 'Salon',
    preferences: staleVerticalPreferences,
    projectId: 'project-food',
}), { source: 'recommended', templateFamilyId: 'salon-atelier' }, 'ineligible saved themes must be skipped at runtime');
assert.deepEqual(
    normalizePrintableAssetStylePreferences(staleVerticalPreferences),
    staleVerticalPreferences,
    'ineligible saved themes remain dormant instead of being silently deleted',
);
assert.throws(() => buildPrintableThemePreferencePatch({
    businessType: 'Salon',
    scope: 'business',
    templateFamilyId: 'craft-kitchen',
}), /printable_asset_theme_not_available_for_business/);
assert.deepEqual(buildPrintableThemePreferencePatch({
    businessType: 'Pet Grooming Salon',
    scope: 'business',
    templateFamilyId: 'rosewater-editorial',
}), { businessThemeId: 'rosewater-editorial' }, 'common themes must remain available to every business');
assert.deepEqual(buildPrintableThemePreferencePatch({
    businessType: 'Salon',
    scope: 'business',
    templateFamilyId: 'rosewater-editorial',
}), { businessThemeId: 'rosewater-editorial' });
assert.throws(() => buildPrintableThemePreferencePatch({
    businessType: 'Salon',
    scope: 'business',
    templateFamilyId: 'ritual-sanctuary',
}), /printable_asset_theme_not_available_for_business/);
assert.throws(() => buildPrintableThemePreferencePatch({
    businessType: 'Spa',
    scope: 'business',
    templateFamilyId: 'performance-circuit',
}), /printable_asset_theme_not_available_for_business/);

const spaMenuKitStyles = buildMenuKitAssetStyleMap({
    businessCategory: 'service',
    businessType: 'Spa',
});
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(spaMenuKitStyles[assetKey], 'ritual-sanctuary');
}

const salonMenuKitStyles = buildMenuKitAssetStyleMap({ businessType: 'Salon' });
const gymMenuKitStyles = buildMenuKitAssetStyleMap({ businessType: 'Gym' });
const cafeMenuKitStyles = buildMenuKitAssetStyleMap({ businessType: 'Specialty Coffee Shop' });
const bakeryMenuKitStyles = buildMenuKitAssetStyleMap({ businessType: 'Bakery' });
const gelateriaMenuKitStyles = buildMenuKitAssetStyleMap({ businessType: 'Ice Cream Shop' });
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(salonMenuKitStyles[assetKey], 'salon-atelier');
    assert.equal(gymMenuKitStyles[assetKey], 'performance-circuit');
    assert.equal(cafeMenuKitStyles[assetKey], 'roastery-ledger');
    assert.equal(bakeryMenuKitStyles[assetKey], 'patisserie-conservatory');
    assert.equal(gelateriaMenuKitStyles[assetKey], 'gelateria-riviera');
}

const normalizedMixedLegacyMap = normalizeMenuKitAssetStyleMap({
    table_tent: 'classic-luxe',
    counter_sticker: 'executive-dark',
});
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(normalizedMixedLegacyMap[assetKey], 'botanical-heritage');
}

const mixedLegacyInput = {
    templateFamilyId: 'soft-curve',
    templateFamilyIds: {
        table_tent: 'classic-luxe',
        counter_sticker: 'executive-dark',
    },
};
for (const assetKey of MENU_KIT_ASSET_KEYS) {
    assert.equal(resolveMenuKitAssetTemplateFamilyId(mixedLegacyInput, assetKey), 'sunset-atelier');
}
assert.equal(resolveMenuKitZipTemplateFamilyId(mixedLegacyInput), 'sunset-atelier');
assert.equal(
    buildMenuKitZipFilename('Example Cafe', resolveMenuKitZipTemplateFamilyId(mixedLegacyInput)),
    'Example_Cafe_MenuKit_sunset-atelier.zip',
);

console.log('Printable parent-theme preference tests passed.');
