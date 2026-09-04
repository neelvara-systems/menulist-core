import assert from 'node:assert/strict';
import {
    PRINT_ASSET_CATALOG,
    PRINT_ASSET_GROUPS,
    PRINT_ASSET_MENU_KIT_INDEX,
    getPrintAssetById,
} from '../../src/lib/print-assets/printAssetCatalog';
import { PRINTABLE_ASSET_CATALOG_TYPES, PRINTABLE_ASSET_TYPES } from '../../src/lib/printable-asset-templates/assetTypes';
import {
    renderPrintableAsset,
    renderPrintableAssetDownloadFiles,
} from '../../src/lib/printable-asset-templates/renderPrintableAsset';

const runtimeIds = PRINTABLE_ASSET_TYPES.map(({ id }) => id);
const catalogIds = PRINT_ASSET_CATALOG.map(({ id }) => id);

assert.deepEqual(catalogIds, runtimeIds, 'compatibility catalog IDs must exactly follow the active runtime registry');
assert.equal(new Set(catalogIds).size, catalogIds.length, 'print asset IDs must remain unique');
assert.ok(runtimeIds.includes('product_tag'), 'Product Tag remains a canonical renderable asset type');
assert.equal(
    PRINTABLE_ASSET_CATALOG_TYPES.some(({ id }) => id === 'product_tag'),
    false,
    'context-free owner asset rail excludes Product Tag because it requires a source item',
);
assert.equal(
    PRINTABLE_ASSET_TYPES.find(({ id }) => id === 'product_tag')?.menuKitAssetKey,
    undefined,
    'Complete Menu Kit cannot render a context-free Product Tag',
);

for (const runtimeAsset of PRINTABLE_ASSET_TYPES) {
    const catalogAsset = getPrintAssetById(runtimeAsset.id);
    assert.ok(catalogAsset, `catalog projection missing ${runtimeAsset.id}`);
    assert.equal(catalogAsset.description, runtimeAsset.description);
    assert.equal(catalogAsset.placement, runtimeAsset.placement);
    assert.equal(catalogAsset.size, runtimeAsset.size);
    assert.equal(catalogAsset.title, runtimeAsset.title);

    if (runtimeAsset.menuKitAssetKey) {
        assert.equal(catalogAsset.menuKitAssetKey, runtimeAsset.menuKitAssetKey);
        const expectedIndex = Object.entries(PRINT_ASSET_MENU_KIT_INDEX)
            .find(([assetId]) => assetId === runtimeAsset.id)?.[1];
        assert.notEqual(expectedIndex, undefined, `Menu Kit index missing ${runtimeAsset.id}`);
        assert.equal(
            catalogAsset.menuKitAssetIndex,
            expectedIndex,
        );
    } else {
        assert.equal(catalogAsset.menuKitAssetKey, undefined);
        assert.equal(catalogAsset.menuKitAssetIndex, undefined);
    }
}

const runtimePlacements = new Set(PRINTABLE_ASSET_TYPES.map(({ placement }) => placement));
const groupPlacements = PRINT_ASSET_GROUPS.map(({ id }) => id);
assert.equal(new Set(groupPlacements).size, groupPlacements.length, 'print asset group IDs must remain unique');
assert.deepEqual(
    new Set(groupPlacements),
    runtimePlacements,
    'every active runtime placement must have exactly one owner-facing group',
);
assert.equal(getPrintAssetById('unknown_print_asset'), undefined, 'unknown runtime IDs must fail closed');

async function verifyStrictRenderAdmission(): Promise<void> {
    const invalidAssetInput = {
        assetTypeId: 'unknown_print_asset',
        menuUrl: 'https://example.com/menu',
        storeName: 'Example',
    };
    await assert.rejects(
        () => Reflect.apply(renderPrintableAsset, undefined, [invalidAssetInput]),
        /Unsupported printable asset/,
        'an unknown asset ID must not fall back to rendering a Table Tent',
    );
    await assert.rejects(
        () => Reflect.apply(renderPrintableAssetDownloadFiles, undefined, [invalidAssetInput]),
        /Unsupported printable asset/,
        'download-file rendering must use the same strict asset admission',
    );
    await assert.rejects(
        () => Reflect.apply(renderPrintableAsset, undefined, [{
            assetTypeId: 'complete_menu_kit',
            menuUrl: 'https://example.com/menu',
            outputFormat: 'png',
            storeName: 'Example',
        }]),
        /Unsupported output format/,
        'ZIP-only assets must reject a conflicting requested format before generation',
    );
}

verifyStrictRenderAdmission()
    .then(() => {
        console.log('Print asset catalog boundary tests passed.');
    })
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
