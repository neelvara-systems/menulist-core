#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`[verify-answerlattice-commercial-readiness] ${message}`);
};
const includes = (content, needle, label) => assert(content.includes(needle), `${label} must include ${needle}`);
const excludes = (content, needle, label) => assert(!content.includes(needle), `${label} must not include ${needle}`);

const packageJson = JSON.parse(read('package.json'));
const sourceGate = packageJson.scripts['verify:answerlattice-commercial-readiness:source'];
const fullGate = packageJson.scripts['verify:answerlattice-commercial-readiness'];
assert(typeof sourceGate === 'string', 'package.json must expose the Answerlattice source readiness gate');
assert(typeof fullGate === 'string', 'package.json must expose the Answerlattice full readiness gate');
for (const command of [
  'test:answerlattice-taxation-policy',
  'test:billing-documents',
  'test:answerlattice-billing-contracts',
  'test:billing-settlement-boundaries',
  'verify:billing-entitlement-boundary',
  'verify:email-os',
  'verify:whatsapp-os',
]) includes(sourceGate, `npm run ${command}`, 'Answerlattice source readiness gate');
for (const command of [
  'test:answerlattice-billing:rules',
  'test:answerlattice-billing:shared-rules',
  'test:billing-checkout-concurrency:emulator',
  'test:billing-provider-plan-registry:emulator',
  'test:razorpay-subscription-lifecycle:emulator',
  'test:razorpay-webhook-lease:emulator',
]) includes(fullGate, `npm run ${command}`, 'Answerlattice full readiness gate');

const plans = read('src/data/answerlattice/plans.ts');
for (const planId of ['answerlattice_launch', 'answerlattice_growth', 'answerlattice_studio']) {
  includes(plans, planId, 'Answerlattice plan policy');
}
for (const price of ['price: 149900', 'price: 499900', 'price: 1299900', 'price: 2900', 'price: 9900', 'price: 24900']) {
  includes(plans, price, 'Answerlattice monthly pricing');
}
for (const yearlyPrice of ['price: 1499000', 'price: 4999000', 'price: 12999000', 'price: 29000', 'price: 99000', 'price: 249000']) {
  includes(plans, yearlyPrice, 'Answerlattice yearly pricing');
}
excludes(plans, "name: 'Starter'", 'Answerlattice public plan policy');

const packs = read('src/lib/billing/productBillingPlans.ts');
for (const value of ['creditAmount: 500', 'price: 199900', 'price: 3900', 'creditAmount: 2000', 'price: 599900', 'price: 11900']) {
  includes(packs, value, 'Answerlattice support-credit packs');
}

const requiredBillingEnv = [
  'ANSWERLATTICE_BILLING_DOCUMENTS_ENABLED=false',
  'ANSWERLATTICE_BILLING_DOCUMENT_DELIVERY_ENABLED=false',
  'ANSWERLATTICE_BILLING_SYNTHETIC_QA_ENABLED=false',
  'ANSWERLATTICE_BILLING_LEGAL_IDENTITY_VERIFIED=false',
  'ANSWERLATTICE_BILLING_INTERNATIONAL_CHECKOUT_ENABLED=false',
  'ANSWERLATTICE_BILLING_EXPORT_ZERO_RATING_ENABLED=false',
  'ANSWERLATTICE_BILLING_E_INVOICE_STATUS=',
  'ANSWERLATTICE_RESEND_API_KEY=',
  'ANSWERLATTICE_WHATSAPP_PHONE_NUMBER_ID=',
  'ANSWERLATTICE_WHATSAPP_ACCESS_TOKEN=',
];
for (const relativePath of ['.env.staging.example', '.env.production.example']) {
  const template = read(relativePath);
  for (const key of requiredBillingEnv) includes(template, key, relativePath);
}

const onboarding = read('src/app/api/answerlattice/onboard/route.ts');
includes(onboarding, 'calculateConfiguredAnswerlatticeTax', 'Answerlattice onboarding tax authority');
includes(onboarding, 'resolveAnswerlatticeBillingCurrency', 'Answerlattice billing-country currency authority');
excludes(onboarding, 'currency: requestedCurrency', 'Answerlattice onboarding currency authority');

const billingDocumentServer = read('src/lib/billing/answerlatticeBillingDocumentServer.ts');
includes(billingDocumentServer, 'PRODUCT_IDS.ANSWERLATTICE', 'Answerlattice billing-document identity');
includes(billingDocumentServer, 'requestAnswerlatticeBillingDocumentDelivery(document)', 'Answerlattice billing-document delivery');
includes(billingDocumentServer, 'OWNER_NOTIFICATION_TRIGGER_TYPES.BILLING_DOCUMENT_ISSUED', 'Answerlattice owner notification trigger');
includes(billingDocumentServer, "result.status === 'partial'", 'Answerlattice partial billing-document delivery');
includes(read('src/lib/billing/answerlatticeBillingDocumentPolicy.ts'), "const prefix = documentType === 'tax_invoice' ? 'AL' : 'AC'", 'Answerlattice numbering policy');
includes(read('src/lib/owner-notifications/billingDocumentAttachment.ts'), 'renderAnswerlatticeBillingDocumentPdf', 'Answerlattice PDF attachment boundary');
const billingHistory = read('src/components/templates/main-app/billing/BillingHistory.tsx');
includes(billingHistory, 'requestBillingDocumentEmail', 'Billing history document email resend action');
includes(read('src/lib/billing/billingDocumentsClient.ts'), '/email', 'Billing history document email resend endpoint');
assert(/case\s+["']partial["']/.test(billingHistory), 'Billing history must present partial-delivery state');
assert(/case\s+["']outcome_unknown["']/.test(billingHistory), 'Billing history must present ambiguous-delivery state');
includes(read('src/app/api/billing-documents/[documentId]/email/route.ts'), 'delivery.attempts <= document.delivery.attempts', 'Billing-document email attempt evidence');

const creditNotificationProducer = read('src/lib/answerlattice/creditNotifications.ts');
for (const milestone of ['70_percent_used', '90_percent_used', 'exhausted']) {
  includes(read('src/data/shared/creditNotificationPolicy.ts'), milestone, 'Answerlattice support-credit milestone policy');
}
includes(creditNotificationProducer, 'decision.milestone', 'Answerlattice support-credit event identity');
includes(read('src/lib/answerlattice/aiAccounting.ts'), 'notifyAnswerlatticeCreditState({', 'Answerlattice AI accounting credit warning');
const intakeUsageLedger = read('src/lib/answerlattice/intakeUsageLedger.ts');
includes(intakeUsageLedger, 'settled-credit-state', 'Answerlattice settled intake credit warning');
excludes(intakeUsageLedger, 'reserve-credit-state', 'Answerlattice pre-settlement intake credit warning');

const verifyTopup = read('src/app/api/razorpay/verify-topup/route.ts');
includes(verifyTopup, 'const currentRefundDebt = subscriptionData?.topUpCreditRefundDebt ?? 0', 'Product-neutral top-up refund debt');
includes(verifyTopup, 'topUpCreditRefundDebt: remainingRefundDebt', 'Product-neutral refund-debt persistence');

const separateRules = read('firestore-answerlattice.rules');
includes(separateRules, 'match /billingDocuments/{documentId}', 'Answerlattice billing-document rules');
includes(separateRules, 'match /billingDocumentCounters/{counterId}', 'Answerlattice billing-counter rules');
const indexes = read('firestore-answerlattice.indexes.json');
includes(indexes, '"collectionGroup": "billingDocuments"', 'Answerlattice billing-document indexes');

const registry = read('src/data/shared/ownerNotificationRegistry.ts');
includes(registry, "templateKey: 'answerlattice.billing_document_issued'", 'Answerlattice billing-document notification');
const whatsapp = read('src/data/shared/whatsappOs.ts');
includes(whatsapp, "'answerlattice.billing_document_issued'", 'Answerlattice WhatsApp billing template');
includes(whatsapp, "approvalState: 'pending_approval'", 'Answerlattice WhatsApp template fail-closed state');

console.log('Answerlattice commercial readiness source verification passed.');
