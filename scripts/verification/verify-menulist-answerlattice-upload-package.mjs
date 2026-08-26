import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'menulist-answerlattice-upload-inputs');
const failures = [];

function fail(message) {
    failures.push(message);
}

function read(relativePath) {
    const absolutePath = path.join(packageRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
        fail(`Missing required path: ${relativePath}`);
        return '';
    }
    return fs.readFileSync(absolutePath, 'utf8');
}

function readJson(relativePath) {
    const raw = read(relativePath);
    if (!raw) return {};
    try {
        return JSON.parse(raw);
    } catch (error) {
        fail(`Invalid JSON in ${relativePath}: ${error.message}`);
        return {};
    }
}

function readJsonl(relativePath) {
    const raw = read(relativePath);
    if (!raw) return [];
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => {
            try {
                return JSON.parse(line);
            } catch (error) {
                fail(`Invalid JSONL at ${relativePath}:${index + 1}: ${error.message}`);
                return null;
            }
        })
        .filter(Boolean);
}

function parseCsv(relativePath) {
    const raw = read(relativePath);
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;

    for (let index = 0; index < raw.length; index += 1) {
        const character = raw[index];
        if (quoted) {
            if (character === '"' && raw[index + 1] === '"') {
                field += '"';
                index += 1;
            } else if (character === '"') {
                quoted = false;
            } else {
                field += character;
            }
        } else if (character === '"') {
            quoted = true;
        } else if (character === ',') {
            row.push(field);
            field = '';
        } else if (character === '\n') {
            row.push(field.replace(/\r$/, ''));
            if (row.some((value) => value.length > 0)) rows.push(row);
            row = [];
            field = '';
        } else {
            field += character;
        }
    }

    if (quoted) fail(`Unclosed quoted field in ${relativePath}`);
    if (field || row.length > 0) {
        row.push(field.replace(/\r$/, ''));
        if (row.some((value) => value.length > 0)) rows.push(row);
    }

    if (rows.length === 0) {
        fail(`CSV has no rows: ${relativePath}`);
        return { headers: [], rows: [] };
    }

    const headers = rows[0];
    const records = rows.slice(1);
    records.forEach((record, index) => {
        if (record.length !== headers.length) {
            fail(`CSV column mismatch in ${relativePath}:${index + 2}; expected ${headers.length}, received ${record.length}`);
        }
    });
    return { headers, rows: records };
}

function findForbiddenKey(value, forbiddenKey, location = 'root') {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach((entry, index) => findForbiddenKey(entry, forbiddenKey, `${location}[${index}]`));
        return;
    }
    for (const [key, child] of Object.entries(value)) {
        if (key === forbiddenKey) fail(`Forbidden key "${forbiddenKey}" found at ${location}.${key}`);
        findForbiddenKey(child, forbiddenKey, `${location}.${key}`);
    }
}

function requireFields(value, fields, location) {
    fields.forEach((field) => {
        if (value?.[field] === undefined || value?.[field] === null || value?.[field] === '') {
            fail(`Missing ${location}.${field}`);
        }
    });
}

function verifyMappedAssetGroup(entries, directoryName, location) {
    if (!Array.isArray(entries)) {
        fail(`${location} must be an array`);
        return;
    }
    const directoryPath = path.join(packageRoot, 'asset-inputs', directoryName);
    const actualFiles = fs.existsSync(directoryPath)
        ? fs.readdirSync(directoryPath, { withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => `${directoryName}/${entry.name}`)
            .sort()
        : [];
    const mappedFiles = entries.map((entry, index) => {
        requireFields(entry, ['file', 'source', 'status'], `${location}[${index}]`);
        const destinationPath = path.join(packageRoot, 'asset-inputs', entry.file || '');
        const sourcePath = path.join(repoRoot, entry.source || '');
        if (!fs.existsSync(destinationPath)) {
            fail(`${location}[${index}] destination is missing: ${entry.file}`);
        }
        if (!fs.existsSync(sourcePath)) {
            fail(`${location}[${index}] repository source is missing: ${entry.source}`);
        }
        if (fs.existsSync(destinationPath) && fs.existsSync(sourcePath)) {
            const destination = fs.readFileSync(destinationPath);
            const source = fs.readFileSync(sourcePath);
            if (!destination.equals(source)) {
                fail(`${location}[${index}] copied asset no longer matches its repository source: ${entry.file}`);
            }
        }
        return entry.file;
    }).sort();
    if (JSON.stringify(actualFiles) !== JSON.stringify(mappedFiles)) {
        fail(`${location} does not exactly match asset-inputs/${directoryName}`);
    }
}

const manifest = readJson('upload-manifest.json');
const createJob = readJson('api-payloads/create-job.json');
const clientProfile = readJson('production-onboarding/menulist-client-profile.json');
const assetSourceMap = readJson('asset-inputs/asset-source-map.json');
const payloads = readJsonl('api-payloads/add-source-payloads.jsonl');
const widgetEvents = readJsonl('production-onboarding/widget-context-events.jsonl');
const faq = parseCsv('source-inputs/08-support-faq-seed.csv');
const supportQuestions = parseCsv('production-onboarding/live-owner-support-test-questions.csv');
const productSurfaces = parseCsv('production-onboarding/product-surface-map.csv');

if (manifest.schemaVersion !== 2) fail('upload-manifest.json must use schemaVersion 2');
if (manifest.verifiedOn !== '2026-07-20') fail('upload-manifest.json verifiedOn must be 2026-07-20');
if (manifest.payloadMode !== 'review_only') fail('upload-manifest.json must declare review_only payload mode');
if (createJob.productWebsiteUrl !== 'https://menulist.ai' || createJob.appUrl !== 'https://menulist.ai') {
    fail('Create-job canonical productWebsiteUrl and appUrl must both be https://menulist.ai');
}
if (clientProfile.productIdentity?.publicWebsite !== 'https://menulist.ai'
    || clientProfile.productIdentity?.canonicalApp !== 'https://menulist.ai') {
    fail('Client profile canonical website and app must both be https://menulist.ai');
}
if (assetSourceMap.schemaVersion !== 2 || assetSourceMap.verifiedOn !== '2026-07-20') {
    fail('Asset source map must use schemaVersion 2 and the current verified date');
}
verifyMappedAssetGroup(assetSourceMap.generatedAssets, 'current-approved-assets', 'asset-source-map.json generatedAssets');
verifyMappedAssetGroup(assetSourceMap.privateReferenceCaptures, 'private-reference-captures', 'asset-source-map.json privateReferenceCaptures');
[
    ['websiteAssetSlotMap', 'asset-inputs'],
    ['demoWalkthroughBrief', 'asset-inputs'],
    ['websiteAndFaqAssetBrief', 'asset-inputs'],
].forEach(([field, base]) => {
    if (!assetSourceMap[field] || !fs.existsSync(path.join(packageRoot, base, assetSourceMap[field]))) {
        fail(`Asset source map ${field} does not resolve to a package file`);
    }
});
(assetSourceMap.productionReadinessInputs || []).forEach((relativePath, index) => {
    if (!fs.existsSync(path.join(packageRoot, relativePath))) {
        fail(`Asset source map productionReadinessInputs[${index}] does not resolve: ${relativePath}`);
    }
});

const sourceFiles = Array.isArray(manifest.sourceFiles) ? manifest.sourceFiles : [];
if (sourceFiles.length !== 26) fail(`Expected 26 manifest sources, received ${sourceFiles.length}`);
if (sourceFiles.length > Number(manifest.intakeConstraints?.maxSourcesPerJob || 0)) {
    fail('Manifest source count exceeds maxSourcesPerJob');
}
if (payloads.length !== 26) fail(`Expected 26 add-source payloads, received ${payloads.length}`);

const actualSourcePaths = fs.existsSync(path.join(packageRoot, 'source-inputs'))
    ? fs.readdirSync(path.join(packageRoot, 'source-inputs'))
        .filter((name) => fs.statSync(path.join(packageRoot, 'source-inputs', name)).isFile())
        .map((name) => `source-inputs/${name}`)
        .sort()
    : [];
const manifestPaths = sourceFiles.map((source) => source.path).sort();
if (JSON.stringify(actualSourcePaths) !== JSON.stringify(manifestPaths)) {
    fail('source-inputs files do not exactly match upload-manifest.json sourceFiles');
}

const supportedTypes = new Set([
    'website_page',
    'help_doc',
    'faq',
    'changelog',
    'ticket_macro',
    'repeated_reply',
    'product_note',
    'file_text',
    'markdown',
    'csv',
    'pdf_text',
    'docx_text',
    'screenshot_note',
    'screenshot_ocr',
    'media_transcript',
]);
const evidenceFields = [
    'authority',
    'approvalStatus',
    'accessScope',
    'citationEligibility',
    'effectiveFrom',
    'verifiedOn',
    'applicability',
    'conflicts',
];
const sourceByFileName = new Map();

sourceFiles.forEach((source, index) => {
    const location = `upload-manifest.json source ${index + 1}`;
    requireFields(source, ['path', 'sourceType', 'title', 'tags', 'contextKeys', 'intendedTargets', 'evidence'], location);
    if (!supportedTypes.has(source.sourceType)) fail(`Unsupported source type at ${location}: ${source.sourceType}`);
    requireFields(source.evidence, evidenceFields, `${location}.evidence`);
    if (!Array.isArray(source.evidence?.conflicts)) fail(`${location}.evidence.conflicts must be an array`);

    const sourceText = read(source.path);
    if (sourceText.length > Number(manifest.intakeConstraints?.runtimeSourceTextChars || 0)) {
        fail(`${source.path} exceeds runtimeSourceTextChars`);
    }
    const fileName = path.basename(source.path);
    if (sourceByFileName.has(fileName)) fail(`Duplicate manifest source filename: ${fileName}`);
    sourceByFileName.set(fileName, source);
});

payloads.forEach((payload, index) => {
    const location = `add-source-payloads.jsonl line ${index + 1}`;
    requireFields(payload, ['type', 'title', 'fileName', 'mimeType', 'tags', 'contextKeys', 'metadata'], location);
    if (!supportedTypes.has(payload.type)) fail(`Unsupported source type at ${location}: ${payload.type}`);
    requireFields(payload.metadata, ['sourceProduct', 'packagePath', 'payloadMode', ...evidenceFields], `${location}.metadata`);
    if (payload.metadata?.payloadMode !== 'review_only') fail(`${location} must remain review_only`);
    if (!Array.isArray(payload.metadata?.conflicts)) fail(`${location}.metadata.conflicts must be an array`);
    if ('contentText' in payload) fail(`${location} unexpectedly contains contentText; reviewed source bodies should be injected only at upload time`);
    if ('originUrl' in payload && payload.type !== 'website_page') fail(`${location} uses originUrl for a non-website source`);

    const source = sourceByFileName.get(payload.fileName);
    if (!source) {
        fail(`${location} does not match a manifest source`);
        return;
    }
    if (payload.type !== source.sourceType) fail(`${location} type does not match manifest for ${payload.fileName}`);
    if (payload.title !== source.title) fail(`${location} title does not match manifest for ${payload.fileName}`);
    if (payload.metadata.packagePath !== `menulist-answerlattice-upload-inputs/${source.path}`) {
        fail(`${location} packagePath does not match manifest for ${payload.fileName}`);
    }
});

findForbiddenKey(payloads, 'sourceUrls', 'add-source-payloads.jsonl');
findForbiddenKey(manifest, 'sourceUrls', 'upload-manifest.json');

['22-live-website-public-truth.md', '23-live-website-feature-capability-coverage.md', '24-public-pricing-legal-trust-and-contact-support.md']
    .forEach((fileName) => {
        const source = sourceByFileName.get(fileName);
        const payload = payloads.find((entry) => entry.fileName === fileName);
        if (source?.sourceType !== 'product_note' || payload?.type !== 'product_note') {
            fail(`${fileName} must remain a maintained product_note summary, not a multi-page website payload`);
        }
    });

const requiredOperatorFiles = [
    'production-onboarding/README.md',
    'production-onboarding/menulist-client-profile.json',
    'production-onboarding/product-boundary-and-exclusions.md',
    'production-onboarding/onboarding-runbook.md',
    'production-onboarding/dashboard-demo-data-requirements.md',
    'production-onboarding/product-surface-map.csv',
    'production-onboarding/widget-context-events.jsonl',
    'production-onboarding/knowledge-output-targets.md',
    'production-onboarding/production-data-safety.md',
    'production-onboarding/live-smb-support-coverage-checklist.md',
    'production-onboarding/live-owner-support-test-questions.csv',
    'production-onboarding/owner-pending-actions.md',
    'asset-inputs/demo-walkthrough-brief.md',
    'asset-inputs/website-and-faq-asset-brief.md',
];
requiredOperatorFiles.forEach((relativePath) => read(relativePath));

for (const entry of manifest.productionOnboardingFiles || []) {
    read(entry.path);
}
for (const entry of manifest.assetFiles || []) {
    const absolutePath = path.join(packageRoot, entry.path);
    if (!fs.existsSync(absolutePath)) fail(`Missing manifest asset path: ${entry.path}`);
}
const actualProductionOnboardingPaths = fs.readdirSync(path.join(packageRoot, 'production-onboarding'), { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => `production-onboarding/${entry.name}`)
    .sort();
const manifestProductionOnboardingPaths = (manifest.productionOnboardingFiles || [])
    .map((entry) => entry.path)
    .sort();
if (JSON.stringify(actualProductionOnboardingPaths) !== JSON.stringify(manifestProductionOnboardingPaths)) {
    fail('production-onboarding files do not exactly match upload-manifest.json productionOnboardingFiles');
}
const actualAssetPaths = fs.readdirSync(path.join(packageRoot, 'asset-inputs'), { withFileTypes: true })
    .map((entry) => `asset-inputs/${entry.name}`)
    .sort();
const manifestAssetPaths = (manifest.assetFiles || [])
    .map((entry) => entry.path)
    .sort();
if (JSON.stringify(actualAssetPaths) !== JSON.stringify(manifestAssetPaths)) {
    fail('asset-inputs top-level artifacts do not exactly match upload-manifest.json assetFiles');
}

if (faq.rows.length !== 101) fail(`Expected 101 FAQ seeds, received ${faq.rows.length}`);
if (new Set(faq.rows.map((row) => row[0])).size !== faq.rows.length) fail('FAQ seed questions must be unique');
if (supportQuestions.rows.length !== 75) fail(`Expected 75 live support questions, received ${supportQuestions.rows.length}`);
const supportIds = supportQuestions.rows.map((row) => row[0]);
const expectedSupportIds = Array.from({ length: 75 }, (_, index) => `Q${String(index + 1).padStart(2, '0')}`);
if (JSON.stringify(supportIds) !== JSON.stringify(expectedSupportIds)) {
    fail('Live support question IDs must be the exact ordered range Q01-Q75');
}
if (productSurfaces.rows.length !== 25) fail(`Expected 25 product surfaces, received ${productSurfaces.rows.length}`);
if (new Set(productSurfaces.rows.map((row) => row[0])).size !== productSurfaces.rows.length) {
    fail('Product surface keys must be unique');
}

const requiredWidgetContexts = new Map([
    ['/dashboard', 'menulist_owner_dashboard'],
    ['/projects', 'menulist_owner_projects'],
    ['/projects/[projectId]', 'menulist_owner_projects_detail'],
    ['/today', 'menulist_owner_today'],
    ['/menu-manager', 'menulist_owner_menu-manager'],
    ['/business-health', 'menulist_owner_business-health'],
    ['/qr-code', 'menulist_owner_qr-code'],
    ['/use-menulist', 'menulist_owner_use-menulist'],
    ['/assets', 'menulist_owner_assets'],
    ['/users', 'menulist_owner_users'],
    ['/feedback', 'menulist_owner_feedback'],
    ['/business-settings', 'menulist_owner_business-settings'],
    ['/transactions', 'menulist_owner_transactions'],
    ['/locations', 'menulist_owner_locations'],
    ['/billing', 'menulist_owner_billing'],
]);
const seenWidgetRoutes = new Set();
widgetEvents.forEach((event, index) => {
    const location = `widget-context-events.jsonl line ${index + 1}`;
    requireFields(event, ['route', 'method', 'payload', 'assetUse'], location);
    requireFields(event.payload, ['contextVersion', 'contextKey', 'feature', 'page', 'workflow', 'userRole', 'entityHints'], `${location}.payload`);
    if (event.method !== 'page') fail(`${location} must use the page method`);
    if (event.payload?.userRole !== 'owner') fail(`${location} must use the high-level owner role label`);
    if (!String(event.payload?.contextKey || '').startsWith('menulist_owner_')) fail(`${location} uses an invalid context key`);
    const serialized = JSON.stringify(event.payload);
    if (/(storeId|projectId|tenantId|transactionId|razorpay|@)/i.test(serialized)) {
        fail(`${location} contains a private identifier field or value`);
    }
    if (seenWidgetRoutes.has(event.route)) fail(`${location} duplicates widget route ${event.route}`);
    if (requiredWidgetContexts.get(event.route) !== event.payload?.contextKey) {
        fail(`${location} does not match the required safe context key for ${event.route}`);
    }
    seenWidgetRoutes.add(event.route);
});
requiredWidgetContexts.forEach((contextKey, route) => {
    if (!seenWidgetRoutes.has(route)) fail(`Missing safe widget context example for ${route}`);
});
if (seenWidgetRoutes.size !== requiredWidgetContexts.size) {
    fail(`Expected exactly ${requiredWidgetContexts.size} widget context routes, received ${seenWidgetRoutes.size}`);
}

const widgetEmbedPath = path.join(repoRoot, 'src/components/answerlattice/MenuListAnswerlatticeWidgetEmbed.tsx');
const widgetEmbed = fs.existsSync(widgetEmbedPath) ? fs.readFileSync(widgetEmbedPath, 'utf8') : '';
[
    "'menu-manager': { feature: 'ai_menu_manager'",
    "'business-health': { feature: 'business_health'",
    "'qr-code': { feature: 'share'",
    "'use-menulist': { feature: 'share'",
    "assets: { feature: 'assets'",
].forEach((fragment) => {
    if (!widgetEmbed.includes(fragment)) fail(`MenuList widget route map is missing: ${fragment}`);
});
[
    "'/growth-kits/*'",
    "'/ops/*'",
    "'/platform/*'",
    "'/reseller/*'",
    "const contextRouteKey = routeKey === 'qrCode' ? 'qr-code' : routeKey;",
    "const contextSuffix = routeSegments.length > 1 ? '_detail' : '';",
    'contextKey: `menulist_owner_${contextRouteKey}${contextSuffix}`',
    'if (!routeConfig) return null;',
].forEach((fragment) => {
    if (!widgetEmbed.includes(fragment)) fail(`MenuList widget safety contract is missing: ${fragment}`);
});
if (widgetEmbed.includes('contextKey: `menulist_owner_${routeKey}${secondSegment')) {
    fail('MenuList widget context must not interpolate raw second URL segments');
}
['growth-kits', 'ops', 'platform', 'reseller'].forEach((routeKey) => {
    if (widgetEmbed.includes(`${routeKey}: { feature:`) || widgetEmbed.includes(`'${routeKey}': { feature:`)) {
        fail(`MenuList widget must not map ${routeKey} as owner support context`);
    }
});
[
    '/growth-kits',
    '/growth-kits/*',
    '/ops',
    '/ops/*',
    '/platform',
    '/platform/*',
    '/reseller',
    '/reseller/*',
].forEach((route) => {
    if (!clientProfile.widgetInstall?.blockedRoutes?.includes(route)) {
        fail(`Client profile widget blockedRoutes is missing ${route}`);
    }
});

const inventoryPath = path.join(repoRoot, 'FEATURE_SWEEP_MASTER_INVENTORY.md');
const inventoryText = fs.existsSync(inventoryPath) ? fs.readFileSync(inventoryPath, 'utf8') : '';
const inventoryIds = [...inventoryText.matchAll(/^\| ([a-z][a-z0-9_]+) \|/gm)].map((match) => match[1]);
const featureCoverageText = read('source-inputs/23-live-website-feature-capability-coverage.md');
const coveredFeatureIds = [...featureCoverageText.matchAll(/^\| `([a-z][a-z0-9_]+)` \|/gm)].map((match) => match[1]);
if (inventoryIds.length !== 51) fail(`Expected 51 current feature inventory rows, received ${inventoryIds.length}`);
if (JSON.stringify(inventoryIds) !== JSON.stringify(coveredFeatureIds)) {
    const missing = inventoryIds.filter((id) => !coveredFeatureIds.includes(id));
    const extra = coveredFeatureIds.filter((id) => !inventoryIds.includes(id));
    fail(`Source 23 must match the feature inventory exactly; missing=[${missing.join(',')}], extra=[${extra.join(',')}]`);
}

const featuresPath = path.join(repoRoot, 'src/config/features.ts');
const featuresText = fs.existsSync(featuresPath) ? fs.readFileSync(featuresPath, 'utf8') : '';
[
    ['ENABLE_REVIEWS_REPUTATION: false', 'Reviews/Reputation and AI Reply Assist remain disabled'],
    ['ENABLE_AI_REPLY_ASSIST: false', 'Reviews/Reputation and AI Reply Assist remain disabled'],
    ['ENABLE_OWNER_REFERRAL: false', 'behind disabled acquisition/settlement flags'],
    ['ENABLE_OWNER_REFERRAL_REWARD_PROCESSING: false', 'behind disabled acquisition/settlement flags'],
    ['ENABLE_SUBSCRIPTION_PAUSE: false', 'Self-service pause/resume remains disabled'],
].forEach(([flagFragment, packageFragment]) => {
    if (!featuresText.includes(flagFragment)) fail(`Current feature flag contract changed: ${flagFragment}`);
    if (!(featureCoverageText + read('source-inputs/16-billing-subscription-enhancements-and-payments-support.md')).includes(packageFragment)) {
        fail(`Package boundary is missing current disabled-feature wording: ${packageFragment}`);
    }
});

const packageTextFiles = [
    ...manifestPaths,
    'README.md',
    'answerlattice-intake-plan.md',
    'api-payloads/README.md',
    'api-payloads/create-job.json',
    'api-payloads/add-source-payloads.jsonl',
    ...requiredOperatorFiles,
];
for (const relativePath of new Set(packageTextFiles)) {
    const text = read(relativePath);
    if (/<product-(?:name|slug)>|<website-url>|<app-url>/i.test(text)) {
        fail(`Unresolved client placeholder found in ${relativePath}`);
    }
}

if (failures.length > 0) {
    console.error(`MenuList Answerlattice upload package verification failed (${failures.length}):`);
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
}

console.log('MenuList Answerlattice upload package verification passed.');
console.log(`- ${sourceFiles.length} source files match manifest and review-only payloads`);
console.log(`- ${faq.rows.length} FAQ seeds, ${supportQuestions.rows.length} live support questions, ${productSurfaces.rows.length} product surfaces`);
console.log(`- ${widgetEvents.length} safe widget context examples`);
console.log('- evidence metadata, canonical host, size limits, boundaries, and operator artifacts verified');
