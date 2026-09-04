#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const fixturePath = path.join(root, 'scripts', 'menulist', 'hosted-qa-certification-fixture.ts');
const source = fs.readFileSync(fixturePath, 'utf8');
const clientTestPath = path.join(root, 'scripts', 'menulist', 'test-hosted-qa-certification-client.ts');
const clientSource = fs.readFileSync(clientTestPath, 'utf8');
const subscriptionTypePath = path.join(root, 'src', 'types', 'razorpay.ts');
const subscriptionTypeSource = fs.readFileSync(subscriptionTypePath, 'utf8');
const billingSurfacePaths = [
    path.join(root, 'src', 'components', 'mobile', 'screens', 'MobileBillingScreen.tsx'),
    path.join(root, 'src', 'components', 'templates', 'main-app', 'billing', 'ActiveSubscriptionCard.tsx'),
    path.join(root, 'src', 'components', 'website', 'pricing-pages', 'SubscriptionManagement.tsx'),
];

const requiredTokens = [
    "const QA_PROJECT_ID = 'menulist-qa'",
    "const OPERATOR_EMAIL = 'admin@neelvara.com'",
    "const MAX_LEASE_HOURS = 72",
    "const PERSISTENT_OWNER_EMAIL = 'menulist.qa.owner.85ee58de7d@neelvara.com'",
    "command === 'make-persistent'",
    "readArg('confirm-persistent-owner') !== PERSISTENT_OWNER_EMAIL",
    "'qaCertification.purpose': 'menulist_persistent_phone_owner'",
    "'qaCertification.persistentOwner': true",
    "readArg('confirm-project') !== QA_PROJECT_ID",
    "process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST",
    "type: 'authorized_user'",
    "quota_project_id: QA_PROJECT_ID",
    'await rm(ephemeralAdcDirectory, { force: true, recursive: true })',
    "onboardingSource: 'RESELLER_ONBOARDING'",
    "command === 'set-location-capacity'",
    "command === 'seed-menu'",
    "readArg('location-capacity')",
    "Pass --location-capacity=<integer from 1 to 10>.",
    "'qaCertification.locationCapacity': locationCapacity",
    'monthlyCredits: 75 * locationCapacity',
    'monthlyCreditsAllowance: 75 * locationCapacity',
    "manualPaymentEvidenceType: 'qa_certification_non_payment'",
    "purpose: 'menulist_hosted_release_candidate'",
    "key.startsWith('projects.')",
    "name === 'RC Certification Menu'",
    "Expected exactly one RC Certification Menu created through the hosted owner UI.",
    "qaCertificationFixture: fixtureId",
    'storeIds: [String(storeId)]',
    "tenant.data()?.qaCertificationFixture, fixtureId",
    "store.data()?.qaCertificationFixture, fixtureId",
    "amount: 0",
    "planId: 'menulist_pro'",
    'subscriptionData.cycleStartDate instanceof Timestamp',
    'subscriptionData.subscriptionStartDate instanceof Timestamp',
    'subscriptionData.subscriptionEndDate instanceof Timestamp',
    'subscriptionData.manualPaymentConfirmedAt instanceof Timestamp',
    'subscriptionData.qaCertification?.issuedAt instanceof Timestamp',
    'subscriptionData.qaCertification?.expiresAt instanceof Timestamp',
    'subscriptionData.statuses?.[0]?.timestamp instanceof Timestamp',
    "transaction.create(markerRef",
    'projectRows.empty,',
    "Fixture has hosted test data.",
    ".doc(String(markerData.tenantId))",
    ".collection(String(markerData.storeId))",
];

const fixtureCommand = packageJson.scripts?.['menulist:hosted-qa-certification-fixture'];
assert.equal(typeof fixtureCommand, 'string', 'Hosted-QA fixture command must be registered.');
assert.ok(fixtureCommand.startsWith('ts-node --compiler-options'), 'Hosted-QA fixture must use the pinned TypeScript runner.');
assert.ok(fixtureCommand.includes('-r tsconfig-paths/register'), 'Hosted-QA fixture must load repository path aliases.');
assert.equal(fixtureCommand.includes('tsx'), false, 'Hosted-QA fixture must not depend on an unpinned tsx binary.');

const clientTestCommand = packageJson.scripts?.['test:menulist-hosted-qa-certification-client'];
assert.equal(typeof clientTestCommand, 'string', 'Hosted-QA client test command must be registered.');
assert.ok(clientTestCommand.startsWith('ts-node --compiler-options'), 'Hosted-QA client test must use the pinned TypeScript runner.');
assert.ok(clientTestCommand.includes('-r tsconfig-paths/register'), 'Hosted-QA client test must load repository path aliases.');
assert.ok(clientTestCommand.endsWith('scripts/menulist/test-hosted-qa-certification-client.ts'));
assert.equal(clientTestCommand.includes('tsx'), false, 'Hosted-QA client test must not depend on an unpinned tsx binary.');

for (const token of requiredTokens) {
    assert.ok(source.includes(token), `Missing hosted-QA fixture guard: ${token}`);
}

assert.equal(source.includes('razorpayClient'), false, 'Fixture must not initialize Razorpay.');
assert.equal(source.includes('createRazorpay'), false, 'Fixture must not create provider state.');
assert.equal(source.includes('menulist-prod'), false, 'Fixture must not name production.');
assert.equal(source.includes('console.log(password)'), false, 'Fixture must not print its password.');
assert.equal(source.includes("db.collection('projects')\n        .where('tenantId'"), false, 'Cleanup must not inspect the legacy root project collection.');
assert.ok(clientSource.includes("const QA_PROJECT_ID = 'menulist-qa'"));
assert.ok(clientSource.includes("getDoc(doc(db, 'tenants'"));
assert.ok(clientSource.includes("getDoc(doc(db, 'stores'"));
assert.ok(clientSource.includes("token.claims.platformRole, 'OWNER'"));
assert.equal(clientSource.includes('credentials.password as string,'), true);
assert.equal(clientSource.includes('process.stdout.write(credentials'), false);
assert.ok(clientSource.includes("process.argv.includes('--storage-probe')"));
assert.ok(clientSource.includes('`projects/files/${tenantId}/${storeId}/${fixtureId}-storage-probe.png`'));
assert.ok(clientSource.includes('await uploadBytes(probeRef, onePixelPng'));
assert.ok(clientSource.includes('await deleteObject(probeRef)'));
assert.ok(clientSource.includes("await uploadString("));
assert.ok(clientSource.includes("'data_url'"));
assert.ok(clientSource.includes('await deleteObject(dataUrlProbeRef)'));
assert.ok(subscriptionTypeSource.includes("projectId: 'menulist-qa' | 'neelvara-answerlattice-qa'"));
assert.ok(subscriptionTypeSource.includes("purpose: 'menulist_hosted_release_candidate' | 'menulist_persistent_phone_owner' | 'answerlattice_hosted_release_candidate'"));
for (const surfacePath of billingSurfacePaths) {
    const surfaceSource = fs.readFileSync(surfacePath, 'utf8');
    assert.ok(surfaceSource.includes("sub.qaCertification.projectId === 'menulist-qa'")
        || surfaceSource.includes("activeSubscription.qaCertification.projectId === 'menulist-qa'"));
    assert.ok(surfaceSource.includes('PRODUCT_IDS.MENULIST'));
}

process.stdout.write('MenuList hosted QA certification fixture boundary verified.\n');
