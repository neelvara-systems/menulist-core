require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
    },
});

const {
    buildExportData,
    createExportWorkbook,
} = require('../../src/components/templates/main-app/projects/utils/excelUtils.ts');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function main() {
    const sample = {
        languages: [],
        categories: [
            { id: 'c2', name: { en: 'Mains', hi: 'मुख्य' }, active: true, orderIndex: 2 },
            { id: 'c1', name: { en: 'Starters', hi: 'स्टार्टर्स' }, active: true, orderIndex: 1 },
            { id: 'c2', name: { en: 'Mains Updated', hi: 'मुख्य अपडेट' }, active: false, orderIndex: 0 },
        ],
        items: [
            {
                id: 'i2',
                category: 'c2',
                name: { en: 'Paneer Bowl', hi: 'पनीर बाउल' },
                description: { en: 'House special', hi: 'घर की खास' },
                active: false,
                available: false,
                orderIndex: 2,
                attributes: [
                    { id: 'a2', name: { en: 'Large', hi: 'बड़ा' }, price: '240', active: true, orderIndex: 2 },
                    { id: 'a1', name: { en: 'Regular', hi: 'रेगुलर' }, price: '180', active: true, orderIndex: 1 },
                ],
            },
            {
                id: 'i1',
                category: 'c1',
                name: { en: 'Soup', hi: 'सूप' },
                description: { en: 'Tomato', hi: 'टमाटर' },
                price: '120',
                orderIndex: 1,
                active: true,
            },
            {
                id: 'i3',
                category: 'c2',
                name: { en: 'Rice Bowl', hi: 'राइस बाउल' },
                description: { en: 'Daily meal', hi: 'दैनिक भोजन' },
                active: true,
                orderIndex: 1,
            },
        ],
    };

    const normalized = buildExportData(sample);

    assert(normalized.categories.length === 2, 'Expected duplicate categories to dedupe by id');
    assert(normalized.categories[0].id === 'c2', 'Expected duplicate category winner to be retained and sorted first');
    assert(normalized.categories[0].active === false, 'Expected category active flag to preserve latest duplicate data');
    assert(normalized.items[0].id === 'i3', 'Expected items to sort by resolved category order and item order');
    assert(normalized.items[1].id === 'i2', 'Expected second item to stay in the same category with later orderIndex');
    assert(normalized.items[2].id === 'i1', 'Expected third item to move after the earlier category');
    assert(normalized.items[0].available === true, 'Expected missing availability to default to true');
    assert(normalized.items[1].attributes[0].id === 'a1', 'Expected attributes to sort by orderIndex');
    assert(normalized.items[1].attributes[0].price === '180', 'Expected attribute price to be preserved');

    const workbook = await createExportWorkbook(sample);
    const sheetNames = workbook.worksheets.map(sheet => sheet.name);

    assert(!sheetNames.includes('Languages'), 'Expected no Languages sheet when project languages are absent');
    assert(sheetNames.includes('Categories'), 'Expected Categories sheet');
    assert(sheetNames.includes('Items'), 'Expected Items sheet');
    assert(sheetNames.includes('Attributes'), 'Expected Attributes sheet');
    assert(sheetNames.includes('Combined'), 'Expected Combined sheet');

    const categoriesSheet = workbook.getWorksheet('Categories');
    const itemsSheet = workbook.getWorksheet('Items');
    const attributesSheet = workbook.getWorksheet('Attributes');
    const combinedSheet = workbook.getWorksheet('Combined');

    assert(categoriesSheet && itemsSheet && attributesSheet && combinedSheet, 'Expected workbook sheets to be available');
    assert(categoriesSheet.rowCount === 5, 'Expected multilingual category export to produce 4 data rows + header');
    assert(itemsSheet.rowCount === 7, 'Expected multilingual item export to produce 6 data rows + header');
    assert(attributesSheet.rowCount === 5, 'Expected multilingual attribute export to produce 4 data rows + header');
    assert(combinedSheet.rowCount === 7, 'Expected multilingual combined export to produce 6 data rows + header');

    const firstCategoryRow = categoriesSheet.getRow(2);
    const firstItemRow = itemsSheet.getRow(2);

    assert(firstCategoryRow.getCell(1).value === 'c2', 'Expected first exported category row to use sorted category order');
    assert(firstItemRow.getCell(1).value === 'i3', 'Expected first exported item row to use sorted item order');

    console.log('PASS verify-menu-export');
    console.log('Validated dedupe, ordering, default flags, multilingual rows, and attribute export sheets.');
}

main().catch((error) => {
    console.error('FAIL verify-menu-export');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
