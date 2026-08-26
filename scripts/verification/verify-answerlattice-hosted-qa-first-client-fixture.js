#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const fixturePath = path.join(root, 'scripts', 'answerlattice', 'hosted-qa-first-client-fixture.ts');
const source = fs.readFileSync(fixturePath, 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

for (const required of [
    "const MENULIST_QA_PROJECT_ID = 'menulist-qa'",
    "const ANSWERLATTICE_QA_PROJECT_ID = 'neelvara-answerlattice-qa'",
    "const OPERATOR_EMAIL = 'admin@neelvara.com'",
    "const MAX_LEASE_HOURS = 72",
    "const ALLOWED_ORIGINS = ['https://app.menulist.digital']",
    "manualPaymentEvidenceType: 'qa_certification_non_payment'",
    "purpose: 'answerlattice_first_client_hosted_qa'",
    'buildAnswerlatticeWidgetApiStateWithNewKey',
    'getAnswerlatticePlanById',
    'getQaLaunchMonthlyCredits()',
    'reconcileQaPlanCredits(marker)',
    'widgetKeyStoredOnlyInCredentialFile: true',
    "credentialOutput.startsWith('/tmp/')",
    "{ mode: 0o600 }",
    "command === 'reconcile'",
    'writeOnboardingControlPlane',
    'getAnswerlatticeSourceVersionsDocId',
    'getAnswerlatticeBundleManifestDocId',
    'getAnswerlatticeTenantSummaryShardId',
    'ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE',
    "surfaces: 1",
    "Refusing to reconcile a non-empty workspace: ${collectionName}.",
    'DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS',
    'DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_SOURCES',
    'DB_COLLECTIONS.ANSWERLATTICE_INTAKE_REVIEW_ITEMS',
    'Fixture has test data in ${collectionName}; use the workspace lifecycle cleanup.',
]) {
    assert.ok(source.includes(required), `Missing hosted first-client guard: ${required}`);
}

for (const forbidden of [
    'neelvara-answerlattice-prod',
    "status: 'trialing'",
    "manualPaymentEvidenceType: 'manual_payment'",
    'console.log(widgetKey)',
    'process.stdout.write(widgetKey)',
    'monthlyCreditsAllowance: 150',
]) {
    assert.equal(source.includes(forbidden), false, `Hosted first-client fixture must not contain: ${forbidden}`);
}

assert.equal(
    packageJson.scripts?.['answerlattice:hosted-qa-first-client-fixture'],
    "ts-node --compiler-options '{\"module\":\"CommonJS\",\"target\":\"ES2022\"}' -r tsconfig-paths/register scripts/answerlattice/hosted-qa-first-client-fixture.ts",
);

process.stdout.write('Answerlattice hosted QA first-client fixture contract passed.\n');
