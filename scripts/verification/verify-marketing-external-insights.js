#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const menuListLedger = read('__docs__/menulist-marketing-distribution/menulist-marketing-distribution_external-insight-ledger.md');
const portfolioLedger = read('__docs__/strategy/product-portfolio-distribution-insight-ledger.md');
const distributionBible = read('__docs__/distribution-operating-system/distribution-operating-system_bible.md');
const readme = read('__docs__/menulist-marketing-distribution/README.md');
const menuListRoute = read('src/app/api/onboarding/create-subscription/route.ts');
const answerlatticeRoute = read('src/app/api/answerlattice/onboard/route.ts');
const menuListForm = read('src/components/website/pricing-pages/OnboardingModal.tsx');
const answerlatticeForm = read('src/app/sites/answerlattice/get-started/OnboardingForm.tsx');
const codeSources = [
    read('src/config/features.ts'),
    read('src/data/shared/selfReportedDiscovery.ts'),
    menuListRoute,
    answerlatticeRoute,
    menuListForm,
    answerlatticeForm,
].join('\n');

const allowedStatuses = new Set([
    'APPLY_NOW',
    'DEFERRED_REFERENCE',
    'ALREADY_COVERED',
    'RESEARCH_REQUIRED',
    'REJECTED',
]);

const assertSequentialIds = (source, pattern, prefix, label) => {
    const ids = [...source.matchAll(pattern)].map((match) => Number(match[1]));
    assert.ok(ids.length > 0, `${label}: no entries found`);
    assert.equal(new Set(ids).size, ids.length, `${label}: duplicate entry ID`);
    ids.forEach((id, index) => assert.equal(id, index + 1, `${label}: expected ${prefix}${String(index + 1).padStart(3, '0')}`));
};

assertSequentialIds(menuListLedger, /^### ML-MKT-EXT-(\d{3})\b/gm, 'ML-MKT-EXT-', 'MenuList external insight ledger');
assertSequentialIds(portfolioLedger, /^### PP-DIST-EXT-(\d{3})\b/gm, 'PP-DIST-EXT-', 'portfolio distribution insight ledger');

const menuListEntries = [
    ...menuListLedger.matchAll(/^### ML-MKT-EXT-\d{3}\b[\s\S]*?(?=^### ML-MKT-EXT-\d{3}\b|^## Maintenance)/gm),
].map((match) => match[0]);

for (const entry of menuListEntries) {
    const title = entry.split('\n', 1)[0];
    const statusMatch = entry.match(/^- \*\*Status:\*\* `?([A-Z_]+)/m);
    assert.ok(statusMatch, `${title}: missing status`);
    assert.ok(allowedStatuses.has(statusMatch[1]), `${title}: unsupported status ${statusMatch[1]}`);
    for (const marker of [
        '- **Shared:**',
        '- **Source:**',
        '- **Source type:**',
        '- **Topics:**',
        '- **Use when:**',
        '- **Revalidate:**',
        '**Source idea**',
        '**MenuList verdict**',
        '**Current decision**',
        '**Related MenuList truth**',
        '**Outcome history**',
    ]) {
        assert.ok(entry.includes(marker), `${title}: missing ${marker}`);
    }
}

for (const marker of [
    'Marketing and Distribution Bible',
    'menulist-marketing-distribution_external-insight-ledger.md',
    'product-portfolio-distribution-insight-ledger.md',
    'MenuList-only source',
    'cross-product source',
    'Do not store content merely because it was shared',
    'verify:marketing-external-insights',
]) {
    assert.ok(readme.includes(marker), `marketing distribution README: missing ${marker}`);
}

for (const marker of [
    '## The Core Doctrine',
    '## Curating External Knowledge',
    '## Measurement And Learning',
    '## System Ownership',
]) {
    assert.ok(distributionBible.includes(marker), `distribution Bible: missing ${marker}`);
}

for (const marker of [
    'ENABLE_MENULIST_SELF_REPORTED_DISCOVERY',
    'ENABLE_ANSWERLATTICE_SELF_REPORTED_DISCOVERY',
    'selfReportedDiscoveryChannel',
    "method: 'self_reported'",
]) {
    assert.ok(codeSources.includes(marker), `self-reported discovery contract: missing ${marker}`);
}

for (const [source, label] of [
    [menuListForm, 'MenuList onboarding form'],
    [answerlatticeForm, 'Answerlattice onboarding form'],
]) {
    assert.ok(source.includes('selfReportedDiscoveryChannel'), `${label}: missing optional discovery input`);
}

const fingerprintStart = answerlatticeRoute.indexOf('const requestFingerprint = buildAnswerlatticeOnboardingRequestFingerprint({');
const fingerprintEnd = answerlatticeRoute.indexOf('});', fingerprintStart);
assert.ok(fingerprintStart >= 0 && fingerprintEnd > fingerprintStart, 'Answerlattice onboarding: missing request fingerprint');
assert.ok(
    !answerlatticeRoute.slice(fingerprintStart, fingerprintEnd).includes('selfReportedDiscovery'),
    'Answerlattice onboarding: marketing attribution must remain outside provisioning idempotency',
);

process.stdout.write(`Marketing external insight verification passed (${menuListEntries.length} MenuList entries).\n`);
