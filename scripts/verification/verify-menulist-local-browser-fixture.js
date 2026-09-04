#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const fixturePath = path.join(root, 'scripts', 'menulist', 'seed-local-browser-fixture.ts');
const source = fs.readFileSync(fixturePath, 'utf8');
const command = packageJson.scripts?.['menulist:seed-local-browser-fixture'];

assert.equal(typeof command, 'string', 'Local browser fixture command must be registered.');
assert.ok(command.startsWith('ts-node --compiler-options'));
assert.ok(command.includes('-r tsconfig-paths/register'));

for (const token of [
    "const PROJECT_ID = 'menulist-qa'",
    "const USER_ID = 'menulist-local-browser-owner'",
    'const BRANCH_STORE_ID = 99612',
    'process.env.FIREBASE_AUTH_EMULATOR_HOST',
    'process.env.FIRESTORE_EMULATOR_HOST',
    'MENULIST_LOCAL_FIXTURE_EMAIL',
    'MENULIST_LOCAL_FIXTURE_PASSWORD',
    "MENULIST_LOCAL_FIXTURE_MENU_STATE || 'empty'",
    "['empty', 'seeded'].includes(FIXTURE_MENU_STATE)",
    "onboardingSource: 'RESELLER_ONBOARDING'",
    "logo: ''",
    'keywords: FieldValue.delete()',
    'metaDescription: FieldValue.delete()',
    'metaTitle: FieldValue.delete()',
    'tagline: FieldValue.delete()',
    'isReadableStoreDocument(store.data(), STORE_ID)',
    'isReadableStoreDocument(branchStore.data(), BRANCH_STORE_ID)',
    "store.data()?.sId !== STORE_ID || store.data()?.tId !== TENANT_ID",
    "branchStore.data()?.sId !== BRANCH_STORE_ID || branchStore.data()?.tId !== TENANT_ID",
    "manualPaymentEvidenceType: 'local_certification_non_payment'",
    'amount: 0',
    "platformRole: 'OWNER'",
    'signInWithEmailAndPassword(clientAuth, FIXTURE_EMAIL, FIXTURE_PASSWORD)',
    'default project menulist-qa',
    'await verifyFixture()',
    'batch.delete(projectRef)',
    'const MAX_FIXTURE_PROJECT_DOCUMENTS = 400',
    'masterProjects.size + branchProjects.size > MAX_FIXTURE_PROJECT_DOCUMENTS',
    'for (const projectDocument of masterProjects.docs)',
    'for (const projectDocument of branchProjects.docs)',
    'masterProjects.size !== expectedMasterProjectCount',
    'if (!branchProjects.empty)',
    "project.exists !== (FIXTURE_MENU_STATE === 'seeded')",
    "throw new Error('Local MenuList browser fixture branch must begin without a menu.')",
]) {
    assert.ok(source.includes(token), `Missing local fixture boundary: ${token}`);
}

assert.equal(source.includes('applicationDefault'), false, 'Local fixture must not use managed credentials.');
assert.equal(source.includes('razorpayClient'), false, 'Local fixture must not initialize Razorpay.');
assert.equal(source.includes('createRazorpay'), false, 'Local fixture must not create provider state.');
assert.equal(source.includes('menulist-prod'), false, 'Local fixture must not name production.');
assert.equal(/(?:stdout|stderr|console\.(?:log|error))[^\n]*(?:FIXTURE_PASSWORD|FIXTURE_EMAIL)/.test(source), false,
    'Local fixture must not print its credentials.');

process.stdout.write('MenuList local browser fixture boundary verified.\n');
