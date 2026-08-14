#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '../..');

function read(relativePath) {
    return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function requireFile(relativePath) {
    if (!fs.existsSync(path.join(repoRoot, relativePath))) {
        throw new Error(`Missing DistributionOS file: ${relativePath}`);
    }
}

const requiredFiles = [
    'packages/distribution-os/README.md',
    'packages/distribution-os/schemas/distribution-os-schema.ts',
    'packages/distribution-os/products/distribution-profiles.ts',
    'packages/distribution-os/scripts/lib/distribution-os-ledger.ts',
    'packages/distribution-os/scripts/audit-distribution-os.ts',
    'packages/distribution-os/scripts/plan-distribution-os.ts',
    '.agents/skills/distribution-os/SKILL.md',
    '.agents/skills/distribution-os/agents/openai.yaml',
    '.agents/skills/distribution-os/references/product-routing.md',
    '__docs__/distribution-operating-system/README.md',
    '__docs__/distribution-operating-system/distribution-operating-system_bible.md',
    '__docs__/distribution-operating-system/distribution-operating-system_spec.md',
    '__docs__/distribution-operating-system/distribution-operating-system_impl.md',
    '__docs__/distribution-operating-system/distribution-operating-system_marketing.md',
    '__docs__/distribution-operating-system/distribution-operating-system_website.md',
    '__docs__/distribution-operating-system/distribution-operating-system_helpdoc.md',
    '__docs__/distribution-operating-system/distribution-operating-system_firebase.md',
    '__docs__/distribution-operating-system/distribution-operating-system_mobile-support.md',
    '__docs__/distribution-operating-system/distribution-operating-system_test-cases.md',
    '__docs__/distribution-operating-system/distribution-operating-system_validation.md',
];

for (const file of requiredFiles) requireFile(file);

const packageSource = [
    'packages/distribution-os/schemas/distribution-os-schema.ts',
    'packages/distribution-os/products/distribution-profiles.ts',
    'packages/distribution-os/scripts/lib/distribution-os-ledger.ts',
    'packages/distribution-os/scripts/audit-distribution-os.ts',
    'packages/distribution-os/scripts/plan-distribution-os.ts',
].map(read).join('\n');

const prohibitedRuntimeTokens = [
    'child_process',
    'node:http',
    'node:https',
    'firebase-admin',
    "from 'firebase/",
    '@google/genai',
    '@anthropic-ai',
    "from 'openai'",
    "require('openai')",
    'fetch(',
    'axios',
];

for (const token of prohibitedRuntimeTokens) {
    if (packageSource.includes(token)) throw new Error(`DistributionOS package contains prohibited runtime token: ${token}`);
}

const featureSource = read('src/config/features.ts');
if (!featureSource.includes('ENABLE_DISTRIBUTION_OPERATING_SYSTEM: true')) {
    throw new Error('DistributionOS internal feature flag is not enabled.');
}

const packageJson = JSON.parse(read('package.json'));
for (const script of ['distribution-os:audit', 'distribution-os:plan', 'verify:distribution-os', 'test:distribution-os-registry-boundaries']) {
    if (!packageJson.scripts?.[script]) throw new Error(`Missing npm command: ${script}`);
}

const skill = read('.agents/skills/distribution-os/SKILL.md');
for (const marker of ['$distribution-os', 'The `$distribution-os` tag is optional', 'another repository task', 'Review and selective curation', 'Run the Bible admission test', 'Do not store when', 'APPLY_NOW', 'SignalDesk', 'primary sources']) {
    if (!skill.includes(marker)) throw new Error(`DistributionOS skill is missing marker: ${marker}`);
}

const bible = read('__docs__/distribution-operating-system/distribution-operating-system_bible.md');
for (const marker of ['## The Core Doctrine', '## Curating External Knowledge', '## SEO And Canonical Page Admission', '## AI Discovery And Attribution', '## Paid Acquisition', '## System Ownership']) {
    if (!bible.includes(marker)) throw new Error(`DistributionOS Bible is missing marker: ${marker}`);
}

const packageReadme = read('packages/distribution-os/README.md');
for (const boundary of ['No database', 'SignalDesk continues to own', 'Audit and planner commands are read-only']) {
    if (!packageReadme.includes(boundary)) throw new Error(`DistributionOS package boundary is missing: ${boundary}`);
}

console.log(`DistributionOS source contract passed (${requiredFiles.length} required files, ${prohibitedRuntimeTokens.length} prohibited runtime tokens absent).`);
