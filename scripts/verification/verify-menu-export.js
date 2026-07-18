const fs = require('fs');
const path = require('path');

require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
    },
});

const root = process.cwd();

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

    const exportDiagnostics = fs.readFileSync(path.join(root, 'src/lib/export/exportDiagnostics.ts'), 'utf8');
    [
        'secureError',
        'getBoundedExportStringContext',
        'logExportFailure',
        'sourceErrorName',
        'sourceErrorCode',
        'sourceStatusCode',
        'copyExportTextToClipboard',
        'EXPORT_CLIPBOARD_COPY_UNAVAILABLE',
        'EXPORT_CLIPBOARD_COPY_FALLBACK_FAILED',
        'hasExportClipboardWrite',
        'hasExportCopyFallback',
        "const copied = document.execCommand('copy');",
    ].forEach((token) => {
        assert(exportDiagnostics.includes(token), `Expected export diagnostics helper to include ${token}`);
    });

    const exportService = fs.readFileSync(path.join(root, 'src/lib/export/exportService.ts'), 'utf8');
    const productionAudit = fs.readFileSync(path.join(root, '__docs__/audits/menulist-production-readiness-audit.md'), 'utf8');
    const changelog = fs.readFileSync(path.join(root, '__docs__/changelog.md'), 'utf8');
    [
        'menu_export_clipboard_copy_failed',
        'menu_export_web_share_failed',
        'getBoundedExportStringContext',
        'copyExportTextToClipboard(content)',
        'contentLength',
        'hasClipboardWrite',
        'hasCopyFallback',
        "import { escapeCSVValue } from '@util/exportUtils';",
        'const csvRow = (values: unknown[]): string => values.map(escapeCSVValue).join',
        "csvRow([q.question, q.count, q.category || 'N/A'])",
        "csvRow([gap.question, gap.count, gap.severity || 'N/A', examples])",
    ].forEach((token) => {
        assert(exportService.includes(token), `Expected export service diagnostic token ${token}`);
    });
    assert(!exportService.includes('await navigator.clipboard.writeText(content);'), 'Export service copy must not use unguarded Clipboard API success');
    assert(!exportService.includes('lines.push(`"${q.question}",${q.count},${q.category ||'), 'Export service must not hand-roll top-question CSV cells.');
    assert(!exportService.includes('lines.push(`"${gap.question}",${gap.count},${gap.severity ||'), 'Export service must not hand-roll knowledge-gap CSV cells.');
    assert(productionAudit.includes('Analytics export service CSV spreadsheet formula boundary checkpoint: fixed in source.'), 'Production readiness audit must document analytics export service CSV hardening.');
    assert(changelog.includes('Analytics Export Service CSV Spreadsheet Formula Boundary'), 'Changelog must document analytics export service CSV hardening.');
    [
        "console.error('Failed to copy to clipboard:'",
        "console.error('Failed to share:'",
    ].forEach((token) => {
        assert(!exportService.includes(token), `Export service must not use raw diagnostic ${token}`);
    });

    const projectSharePostModal = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/ShareModal.tsx'), 'utf8');
    [
        'project_share_endpoint_post_failed',
        'SHARE_ENDPOINT_INVALID_MESSAGE',
        'SHARE_ENDPOINT_REQUEST_POLICY',
        "cache: 'no-store'",
        "credentials: 'omit'",
        "redirect: 'manual' as RequestRedirect",
        "referrerPolicy: 'no-referrer'",
        'normalizeShareEndpointUrl',
        'isBlockedShareEndpointHost',
        "url.protocol !== 'https:'",
        'url.username || url.password',
        "host === 'localhost'",
        "host === 'metadata.google.internal'",
        'const apiUrl = normalizeShareEndpointUrl(values.apiUrl);',
        'const response = await fetch(apiUrl, {',
        '...SHARE_ENDPOINT_REQUEST_POLICY',
        "getBoundedExportStringContext('apiUrl'",
        "getBoundedExportStringContext('projectId'",
        'responseStatus',
        'categoryCount',
        'itemCount',
    ].forEach((token) => {
        assert(projectSharePostModal.includes(token), `Expected project share POST modal diagnostic token ${token}`);
    });
    assert(!projectSharePostModal.includes("console.error('Error sharing data:'"), 'Project share POST modal must not log raw share errors');
    assert(!projectSharePostModal.includes('fetch(values.apiUrl'), 'Project share POST modal must not post to unnormalized owner-entered URLs');
    assert(!projectSharePostModal.includes("type: 'url'"), 'Project share POST modal must not rely on generic URL validation for endpoint admission');

    const projectShareModal = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/b2cView/shareModal/index.tsx'), 'utf8');
    [
        'project_share_structured_export_failed',
        'project_share_pdf_generation_failed',
        "getBoundedExportStringContext('shareUrl'",
        "getBoundedExportStringContext('currencyCode'",
        'copyExportTextToClipboard(copyUrl)',
        'hasClipboardWrite',
        'hasCopyFallback',
        'hasBrandColor',
        'hasBusinessType',
    ].forEach((token) => {
        assert(projectShareModal.includes(token), `Expected project share modal diagnostic token ${token}`);
    });
    [
        "console.error('[ShareModal] Structured export failed:'",
        "console.error('[ShareModal] PDF generation failed:'",
    ].forEach((token) => {
        assert(!projectShareModal.includes(token), `Project share modal must not use raw diagnostic ${token}`);
    });

    const menuKitSection = fs.readFileSync(path.join(root, 'src/components/templates/main-app/projects/b2cView/shareModal/MenuKitSection.tsx'), 'utf8');
    [
        'project_share_menu_kit_generation_failed',
        'project_share_menu_kit_asset_generation_failed',
        "getBoundedExportStringContext('menuUrl'",
        'copyExportTextToClipboard(msg)',
        'copyExportTextToClipboard(labels.staffScript)',
        'hasClipboardWrite',
        'hasCopyFallback',
        'hasMenuModifiedOn',
        'assetKey',
    ].forEach((token) => {
        assert(menuKitSection.includes(token), `Expected Menu Kit section diagnostic token ${token}`);
    });
    [
        'secureError(',
        "'[MenuKit] Generation failed'",
        'new Error(String(error))',
        'error instanceof Error ? error',
    ].forEach((token) => {
        assert(!menuKitSection.includes(token), `Menu Kit section must not use raw diagnostic ${token}`);
    });

    const pdfSurfaceDocs = {
        spec: fs.readFileSync(path.join(root, '__docs__/pdf-surface/pdf-surface_spec.md'), 'utf8'),
        marketing: fs.readFileSync(path.join(root, '__docs__/pdf-surface/pdf-surface_marketing.md'), 'utf8'),
        helpdoc: fs.readFileSync(path.join(root, '__docs__/pdf-surface/pdf-surface_helpdoc.md'), 'utf8'),
        website: fs.readFileSync(path.join(root, '__docs__/pdf-surface/pdf-surface_website.md'), 'utf8'),
        physicalWebsite: fs.readFileSync(path.join(root, '__docs__/physical-surfaces/physical-surfaces_website.md'), 'utf8'),
        audit: fs.readFileSync(path.join(root, '__docs__/audits/menulist-production-readiness-audit.md'), 'utf8'),
        changelog: fs.readFileSync(path.join(root, '__docs__/changelog.md'), 'utf8'),
    };

    [
        [pdfSurfaceDocs.spec, 'current project data at download time', 'PDF Surface spec generation-time boundary'],
        [pdfSurfaceDocs.spec, 'generated-file metadata plus a source reference', 'PDF Surface spec source-reference evidence'],
        [pdfSurfaceDocs.marketing, 'Generated from the current project data at download time', 'PDF Surface marketing generation-time boundary'],
        [pdfSurfaceDocs.marketing, 'The source reference is clear', 'PDF Surface marketing source-reference talking point'],
        [pdfSurfaceDocs.marketing, 'short source reference in its filename', 'PDF Surface marketing current filename boundary'],
        [pdfSurfaceDocs.marketing, 'Do not use fixed generation-speed, every-item, print-shop-quality, no-review, or stale-artifact freshness claims without release-specific evidence.', 'PDF Surface marketing claim boundary'],
        [pdfSurfaceDocs.marketing, 'review the file before printing or sharing it', 'PDF Surface marketing review-before-use boundary'],
        [pdfSurfaceDocs.helpdoc, 'Download a fresh PDF after menu changes', 'PDF Surface helpdoc freshness boundary'],
        [pdfSurfaceDocs.helpdoc, 'printed or shared copies represent the version generated at that time', 'PDF Surface helpdoc generated-artifact boundary'],
        [pdfSurfaceDocs.helpdoc, 'Review the file before printing or sharing it.', 'PDF Surface helpdoc review-before-use boundary'],
        [pdfSurfaceDocs.website, 'Your menu. Print-ready. Versioned.', 'PDF Surface website versioned headline'],
        [pdfSurfaceDocs.website, 'Generated from current project data at download time', 'PDF Surface website generation-time boundary'],
        [pdfSurfaceDocs.website, 'Download a print-ready PDF generated from current project data at download time.', 'PDF Surface website speed-claim replacement'],
        [pdfSurfaceDocs.website, 'Older downloads and printed copies need replacement after changes.', 'PDF Surface website replacement boundary'],
        [pdfSurfaceDocs.physicalWebsite, 'same approved source', 'Physical Surfaces website approved-source boundary'],
        [pdfSurfaceDocs.physicalWebsite, 'Versioned Output', 'Physical Surfaces website versioned-output boundary'],
        [pdfSurfaceDocs.physicalWebsite, 'Printed copies represent the version generated at that time.', 'Physical Surfaces website generated-artifact boundary'],
        [pdfSurfaceDocs.audit, 'PDF and physical-surface freshness-copy checkpoint', 'Production audit records PDF/physical freshness checkpoint'],
        [pdfSurfaceDocs.audit, '`npm run verify:menu-export` now rejects stale PDF/physical-surface always-current artifact claims', 'Production audit records PDF/physical verifier boundary'],
        [pdfSurfaceDocs.audit, 'PDF Surface website speed/all-field copy checkpoint', 'Production audit records PDF website speed/all-field checkpoint'],
        [pdfSurfaceDocs.audit, 'PDF Surface marketing/help fixed-speed print-quality copy checkpoint', 'Production audit records PDF marketing/help speed/quality checkpoint'],
        [pdfSurfaceDocs.changelog, 'PDF And Physical Surface Freshness Copy Boundary', 'Changelog records PDF/physical freshness checkpoint'],
        [pdfSurfaceDocs.changelog, '`npm run verify:menu-export` now rejects stale PDF/physical-surface always-current artifact claims', 'Changelog records PDF/physical verifier boundary'],
        [pdfSurfaceDocs.changelog, 'PDF Surface Website Speed All-Field Copy Boundary', 'Changelog records PDF website speed/all-field checkpoint'],
        [pdfSurfaceDocs.changelog, 'PDF Surface Marketing Help Fixed-Speed Print-Quality Copy Boundary', 'Changelog records PDF marketing/help speed/quality checkpoint'],
    ].forEach(([content, token, label]) => {
        assert(content.includes(token), `${label} must include ${token}`);
    });

    const pdfFreshnessForbiddenTokens = [
        'guaranteeing that prices on printed menus always match prices online',
        'no stale content',
        'Always current',
        'Always generated from live data',
        'The prices are always correct',
        'Generated from your live menu',
        'The PDF always reflects your current menu',
        'Every time you download a PDF, it is generated fresh from your live menu data',
        'Your menu. Print-ready. Always current.',
        'Generated from live data — prices are always current',
        'Always matching, always current',
        'both your digital and printed menus stay in sync',
        '### 3. Always Current',
        'always matching',
        'Download a print-ready PDF of your menu in seconds',
        'Every item, every price, every category',
        'Every menu download looks like it came from a professional print shop',
        'the output is always professional',
        'Under 5 seconds',
        'within a few seconds',
        'looks professional every time',
        'Everything is handled automatically',
    ];
    const pdfFreshnessDocs = `${pdfSurfaceDocs.spec}\n${pdfSurfaceDocs.marketing}\n${pdfSurfaceDocs.helpdoc}\n${pdfSurfaceDocs.website}\n${pdfSurfaceDocs.physicalWebsite}`;
    pdfFreshnessForbiddenTokens.forEach((token) => {
        assert(!pdfFreshnessDocs.includes(token), `PDF/physical surface docs must not include stale artifact freshness claim: ${token}`);
    });

    console.log('PASS verify-menu-export');
    console.log('Validated dedupe, ordering, default flags, multilingual rows, attribute export sheets, and bounded share/export diagnostics.');
}

main().catch((error) => {
    console.error('FAIL verify-menu-export');
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
