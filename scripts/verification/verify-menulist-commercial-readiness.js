#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`[verify-menulist-commercial-readiness] ${message}`);
};
const includes = (content, needle, label) => assert(content.includes(needle), `${label} must include ${needle}`);
const excludes = (content, needle, label) => assert(!content.includes(needle), `${label} must not include ${needle}`);

const packageJson = JSON.parse(read('package.json'));
const sourceGate = packageJson.scripts['verify:menulist-commercial-readiness:source'];
const fullGate = packageJson.scripts['verify:menulist-commercial-readiness'];
assert(typeof sourceGate === 'string', 'package.json must expose the source readiness gate');
assert(typeof fullGate === 'string', 'package.json must expose the full readiness gate');

for (const command of [
  'test:menulist-pricing-policy',
  'test:payment-checkout-boundary',
  'test:purchase-intent-boundary',
  'test:billing-settlement-boundaries',
  'test:billing-documents',
  'test:menulist-taxation-policy',
  'test:billing-record-product-identity',
  'verify:billing-entitlement-boundary',
  'verify:menulist-commercial-identity',
  'verify:menulist-env-contract',
  'verify:ai-accounting',
]) includes(sourceGate, `npm run ${command}`, 'Source readiness gate');

for (const command of [
  'test:ai-capacity-reservation:emulator',
  'test:pricing-plans:rules',
  'test:billing-checkout-concurrency:emulator',
  'test:billing-provider-plan-registry:emulator',
  'test:razorpay-subscription-lifecycle:emulator',
  'test:razorpay-webhook-lease:emulator',
  'test:billing-coordination:rules',
  'test:product-subscription-scope:emulator',
  'test:reseller-onboarding-billing:emulator',
]) includes(fullGate, `npm run ${command}`, 'Full readiness gate');

const requiredBillingEnv = [
  'MENULIST_BILLING_LEGAL_IDENTITY_VERIFIED=false',
  'MENULIST_BILLING_INTERNATIONAL_CHECKOUT_ENABLED=false',
  'MENULIST_BILLING_EXPORT_ZERO_RATING_ENABLED=false',
  'MENULIST_BILLING_DOCUMENTS_ENABLED=false',
  'MENULIST_BILLING_DOCUMENT_DELIVERY_ENABLED=false',
  'MENULIST_BILLING_E_INVOICE_STATUS=<not_required-or-required>',
  'MENULIST_RAZORPAY_KEY_SECRET=',
  'MENULIST_RAZORPAY_WEBHOOK_SECRET=',
  'NEXT_PUBLIC_MENULIST_RAZORPAY_KEY_ID=',
];
for (const relativePath of ['.env.staging.example', '.env.production.example']) {
  const template = read(relativePath);
  for (const key of requiredBillingEnv) includes(template, key, relativePath);
}

const pricingPolicy = read('src/constants/menulistPlans.ts');
for (const planId of [
  'menulist_official',
  'menulist_pro',
  'menulist_multi_location',
  'menulist_api_starter',
  'menulist_api_pro',
]) includes(pricingPolicy, planId, 'Canonical MenuList plans');

const creditPolicy = read('src/data/shared/contentCreditPolicy.ts');
includes(creditPolicy, 'creditAmount: 250', 'Content Credit policy');
includes(creditPolicy, 'priceINRPaise: 79_900', 'Content Credit policy');
includes(creditPolicy, 'priceUSDCents: 2_900', 'Content Credit policy');

const taxPolicy = read('src/data/shared/billingTaxPolicy.ts');
includes(taxPolicy, 'legalIdentityVerified: boolean', 'Billing tax policy');
includes(taxPolicy, 'MenuList billing legal identity is not verified.', 'Billing tax policy');

const billingDocumentServer = read('src/lib/billing/billingDocumentServer.ts');
includes(billingDocumentServer, "typeof value !== 'number' || !Number.isSafeInteger(value)", 'Billing document scalar admission');
excludes(billingDocumentServer, "Number(counter.get('lastSequence'))", 'Billing document scalar admission');
excludes(billingDocumentServer, "Number(document.get('totals.grossAmount')", 'Billing document scalar admission');
includes(billingDocumentServer, 'OWNER_NOTIFICATION_TRIGGER_TYPES.BILLING_DOCUMENT_ISSUED', 'NotificationOS billing-document delivery');
includes(billingDocumentServer, 'requestMenuListBillingDocumentDelivery(document)', 'automatic billing-document delivery request');
excludes(billingDocumentServer, 'sendServerEmailOs', 'billing-document delivery authority');

const ownerNotificationRegistry = read('src/data/shared/ownerNotificationRegistry.ts');
includes(ownerNotificationRegistry, "BILLING_DOCUMENT_ISSUED: 'BILLING_DOCUMENT_ISSUED'", 'billing-document notification trigger');
includes(ownerNotificationRegistry, "templateKey: 'menulist.billing_document_issued'", 'billing-document notification template');
const whatsappOs = read('src/data/shared/whatsappOs.ts');
includes(whatsappOs, "'menulist.billing_document_issued'", 'billing-document WhatsApp template registry');
includes(whatsappOs, "headerType: 'document'", 'billing-document WhatsApp document-header contract');
includes(billingDocumentServer, 'BILLING_DOCUMENT_ISSUED', 'billing-document notification request');
includes(read('src/lib/owner-notifications/billingDocumentAttachment.ts'), 'renderMenuListBillingDocumentPdf', 'billing-document attachment renderer');
includes(read('src/lib/owner-notifications/channels/email.ts'), 'attachments: params.attachments', 'billing-document email attachment forwarding');
includes(read('src/lib/owner-notifications/index.ts'), "classification: billingAttachment ? 'transactional' : 'operational'", 'billing-document email classification');
includes(read('src/lib/whatsapp-os/provider.ts'), 'uploadProviderDocument', 'billing-document WhatsApp media upload');
includes(whatsappOs, "approvalState: 'pending_approval'", 'WhatsApp template fail-closed state');
includes(read('src/lib/owner-notifications/index.ts'), 'channelPlan.some((item) => item.eligible)', 'billing-document attachment read admission');
includes(read('functions/src/ownerNotifications/processor.ts'), 'channelPlan.some((item) => item.eligible)', 'Functions billing-document attachment read admission');
includes(read('functions/package.json'), '"jspdf": "4.2.1"', 'Functions billing-document PDF dependency');
const appPdfRenderer = read('src/lib/billing/billingDocumentPdf.ts').split('\n').slice(2).join('\n');
const functionsPdfRenderer = read('functions/src/billing/billingDocumentPdf.ts').split('\n').slice(2).join('\n');
assert(appPdfRenderer === functionsPdfRenderer, 'App and Functions billing-document PDF renderers must remain behaviorally mirrored');

const razorpayWebhook = read('src/app/api/razorpay/webhook/route.ts');
const verifyTopupRoute = read('src/app/api/razorpay/verify-topup/route.ts');
const topupSettlementServer = read('src/lib/billing/topupSettlementServer.ts');
includes(razorpayWebhook, "event.event === 'refund.processed' && processedRefund", 'Razorpay refund accounting authority');
excludes(razorpayWebhook, "event.event === 'payment.refunded' || event.event === 'refund.processed'", 'Razorpay refund accounting authority');
includes(razorpayWebhook, 'await settleMenuListTopupRefund({', 'refunded purchased-credit reversal');
includes(topupSettlementServer, 'export async function settleMenuListTopupRefund(', 'refunded purchased-credit reversal');
includes(topupSettlementServer, "topupRef.collection('refunds').doc(refundId)", 'per-refund idempotency ledger');
includes(topupSettlementServer, "status: cumulativeRefundAmount === purchaseAmount ? 'refunded' : 'partially_refunded'", 'top-up refund lifecycle');
includes(topupSettlementServer, 'topUpCreditRefundDebt: nextRefundDebt', 'consumed refunded-credit debt');
includes(topupSettlementServer, 'creditsOffsetAgainstRefundDebt', 'future top-up refund-debt offset');
includes(topupSettlementServer, 'isSettledTopupStatus(topupData.status)', 'settled top-up replay lifecycle');
includes(verifyTopupRoute, 'resolveTopupCreditDebtAllocation({', 'authenticated top-up refund-debt offset');
includes(verifyTopupRoute, 'isSettledTopupStatus(existingTopup.status)', 'authenticated settled top-up replay lifecycle');
includes(razorpayWebhook, 'Updated provider quantity conflicts with the MenuList plan.', 'provider quantity plan boundary');

const successModal = read('src/components/templates/main-app/billing/UpgradeSubscriptionPayementSuccessModal.tsx');
includes(successModal, 'any available billing documents appear in', 'Owner payment-success copy');
excludes(successModal, 'receive an email confirmation with your invoice details', 'Owner payment-success copy');

const docsIndex = read('__docs__/commercial-readiness/README.md');
for (const documentName of [
  'commercial-readiness_spec.md',
  'commercial-readiness_impl.md',
  'commercial-readiness_marketing.md',
  'commercial-readiness_website.md',
  'commercial-readiness_helpdoc.md',
  'commercial-readiness_firebase.md',
  'commercial-readiness_mobile-support.md',
  'commercial-readiness_test-cases.md',
  'commercial-readiness_verification.md',
]) includes(docsIndex, documentName, 'Commercial readiness documentation index');

console.log('MenuList commercial readiness source verification passed.');
