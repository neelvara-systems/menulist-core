#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const controller = read('scripts/answerlattice/hosted-qa-certification-entitlement.ts');
const billingTests = read('__docs__/answerlattice/billing/answerlattice-billing_test-cases.md');
const certification = read('__docs__/answerlattice/final-production-readiness-audit.md');
const subscriptionType = read('src/types/razorpay.ts');
const desktopBilling = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
const websiteBilling = read('src/components/website/pricing-pages/SubscriptionManagement.tsx');

function requireToken(content, token, label) {
    if (!content.includes(token)) throw new Error(`${label} is missing: ${token}`);
}

function forbidToken(content, token, label) {
    if (content.includes(token)) throw new Error(`${label} contains forbidden token: ${token}`);
}

[
    "const QA_PROJECT_ID = 'neelvara-answerlattice-qa'",
    'const MAX_LEASE_HOURS = 72',
    "command === 'prepare' || command === 'verify' || command === 'cleanup'",
    'confirmedProject !== QA_PROJECT_ID || configuredProject !== QA_PROJECT_ID',
    'Hosted QA certification entitlement refuses emulator hosts.',
    'A current active subscription already exists; a QA lease is not permitted.',
    "manualPaymentEvidenceType: 'qa_certification_non_payment'",
    "purpose: 'answerlattice_hosted_release_candidate'",
    'amount: 0',
    'batch.create(subscriptionRef',
    'batch.create(markerRef',
    'if (fixture.exists) batch.delete(subscriptionRef)',
    'if (marker.exists) batch.delete(markerRef)',
].forEach(token => requireToken(controller, token, 'hosted QA entitlement controller'));

[
    'razorpayClient',
    '/api/razorpay',
    'neelvara-answerlattice-prod',
    'payment webhook',
].forEach(token => forbidToken(controller, token, 'hosted QA entitlement controller'));

requireToken(billingTests, '`answerlattice:hosted-qa-entitlement`', 'billing QA contract');
requireToken(billingTests, 'It does not simulate checkout, payment,', 'billing provider-evidence boundary');
requireToken(certification, 'Hosted QA provider-outage continuation contract', 'certification evidence boundary');
requireToken(certification, 'never counts as Razorpay, invoice,', 'certification provider exclusion');
requireToken(subscriptionType, "manualPaymentEvidenceType?: 'qa_certification_non_payment'", 'subscription fixture discriminator');
requireToken(subscriptionType, "projectId: 'neelvara-answerlattice-qa'", 'subscription QA project boundary');
[desktopBilling, mobileBilling, websiteBilling].forEach((surface, index) => {
    requireToken(surface, "manualPaymentEvidenceType === 'qa_certification_non_payment'", `billing surface ${index + 1} fixture recognition`);
    requireToken(surface, "qaCertification.projectId === 'neelvara-answerlattice-qa'", `billing surface ${index + 1} QA project check`);
    requireToken(surface, 'QA certification lease', `billing surface ${index + 1} truthful lease label`);
});
requireToken(desktopBilling, 'No payment was processed.', 'desktop no-payment disclosure');
requireToken(mobileBilling, 'No payment — QA only', 'mobile no-payment disclosure');

process.stdout.write('Answerlattice hosted QA certification entitlement boundary verified.\n');
