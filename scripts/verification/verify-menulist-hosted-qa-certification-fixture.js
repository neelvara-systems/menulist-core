#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const fixturePath = path.join(root, 'scripts', 'menulist', 'hosted-qa-certification-fixture.ts');
const source = fs.readFileSync(fixturePath, 'utf8');

const requiredTokens = [
    "const QA_PROJECT_ID = 'menulist-qa'",
    "const OPERATOR_EMAIL = 'admin@neelvara.com'",
    "const MAX_LEASE_HOURS = 72",
    "readArg('confirm-project') !== QA_PROJECT_ID",
    "process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST",
    "type: 'authorized_user'",
    "quota_project_id: QA_PROJECT_ID",
    'await rm(ephemeralAdcDirectory, { force: true, recursive: true })',
    "onboardingSource: 'RESELLER_ONBOARDING'",
    "manualPaymentEvidenceType: 'qa_certification_non_payment'",
    "purpose: 'menulist_hosted_release_candidate'",
    "amount: 0",
    "planId: 'menulist_pro'",
    "transaction.create(markerRef",
    'projectRows.empty,',
    "Fixture has hosted test data.",
];

for (const token of requiredTokens) {
    assert.ok(source.includes(token), `Missing hosted-QA fixture guard: ${token}`);
}

assert.equal(source.includes('razorpayClient'), false, 'Fixture must not initialize Razorpay.');
assert.equal(source.includes('createRazorpay'), false, 'Fixture must not create provider state.');
assert.equal(source.includes('menulist-prod'), false, 'Fixture must not name production.');
assert.equal(source.includes('console.log(password)'), false, 'Fixture must not print its password.');

process.stdout.write('MenuList hosted QA certification fixture boundary verified.\n');
