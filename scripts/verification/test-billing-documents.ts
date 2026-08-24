import assert from 'node:assert/strict';
import {
    buildMenuListBillingDocumentId,
    buildPartialCreditLineItem,
    buildRemainingCreditLineItem,
    formatMenuListBillingDocumentNumber,
    getMenuListFinancialYear,
    mergeMenuListBillingDocumentDelivery,
    type MenuListBillingDocument,
    type MenuListBillingDocumentLineItem,
} from '../../src/lib/billing/billingDocumentPolicy';
import { renderMenuListBillingDocumentPdf } from '../../src/lib/billing/billingDocumentPdf';
import {
    buildAnswerlatticeBillingDocumentId,
    formatAnswerlatticeBillingDocumentNumber,
    getAnswerlatticeFinancialYear,
    mergeAnswerlatticeBillingDocumentDelivery,
    type AnswerlatticeBillingDocument,
} from '../../src/lib/billing/answerlatticeBillingDocumentPolicy';
import { renderAnswerlatticeBillingDocumentPdf } from '../../src/lib/billing/answerlatticeBillingDocumentPdf';

assert.equal(
    getMenuListFinancialYear(Date.parse('2026-03-31T18:29:00.000Z')),
    '25-26',
    'March 31 in India must remain in the closing financial year',
);
assert.equal(
    getMenuListFinancialYear(Date.parse('2026-03-31T18:31:00.000Z')),
    '26-27',
    'April 1 in India must begin the next financial year',
);
assert.equal(formatMenuListBillingDocumentNumber('tax_invoice', '26-27', 1), 'ML26-27-000001');
assert.equal(formatMenuListBillingDocumentNumber('credit_note', '26-27', 42), 'MC26-27-000042');
assert.ok(formatMenuListBillingDocumentNumber('tax_invoice', '26-27', 999_999).length <= 16);
assert.throws(() => formatMenuListBillingDocumentNumber('tax_invoice', '26-27', 1_000_000));

const id = buildMenuListBillingDocumentId('tax_invoice', 'pay_example');
assert.equal(id, buildMenuListBillingDocumentId('tax_invoice', 'pay_example'));
assert.notEqual(id, buildMenuListBillingDocumentId('tax_invoice', 'pay_other'));

const original: MenuListBillingDocumentLineItem = {
    description: 'MenuList monthly subscription',
    quantity: 1,
    unitBaseAmount: 10_000,
    baseAmount: 10_000,
    sacCode: '9983',
    taxRateBps: 1_800,
    cgstAmount: 900,
    sgstAmount: 900,
    igstAmount: 0,
    taxAmount: 1_800,
    grossAmount: 11_800,
};
const partial = buildPartialCreditLineItem(original, 5_900);
assert.equal(partial.baseAmount, 5_000);
assert.equal(partial.cgstAmount, 450);
assert.equal(partial.sgstAmount, 450);
assert.equal(partial.taxAmount, 900);
assert.equal(partial.grossAmount, 5_900);
assert.equal(partial.baseAmount + partial.taxAmount, partial.grossAmount);
assert.throws(() => buildPartialCreditLineItem(original, 11_801));
assert.throws(() => buildPartialCreditLineItem(original, 0));

const firstUnevenCredit = buildPartialCreditLineItem(original, 1);
const finalCredit = buildRemainingCreditLineItem(original, [firstUnevenCredit], original.grossAmount - 1);
assert.equal(firstUnevenCredit.baseAmount + finalCredit.baseAmount, original.baseAmount);
assert.equal(firstUnevenCredit.cgstAmount + finalCredit.cgstAmount, original.cgstAmount);
assert.equal(firstUnevenCredit.sgstAmount + finalCredit.sgstAmount, original.sgstAmount);
assert.equal(firstUnevenCredit.igstAmount + finalCredit.igstAmount, original.igstAmount);
assert.equal(firstUnevenCredit.grossAmount + finalCredit.grossAmount, original.grossAmount);
assert.throws(() => buildRemainingCreditLineItem(original, [original], 1));

const sentDelivery = mergeMenuListBillingDocumentDelivery(
    { status: 'sent', attempts: 1, lastAttemptAtMillis: 100 },
    { status: 'outcome_unknown', attempts: 1, lastAttemptAtMillis: 200 },
);
assert.equal(sentDelivery.status, 'sent', 'a concurrent ambiguous result must not regress sent delivery');
assert.equal(sentDelivery.attempts, 2);
const reconciledDelivery = mergeMenuListBillingDocumentDelivery(
    { status: 'outcome_unknown', attempts: 1, lastAttemptAtMillis: 100 },
    { status: 'sent', attempts: 1, lastAttemptAtMillis: 200 },
);
assert.equal(reconciledDelivery.status, 'sent', 'a confirmed send must reconcile an ambiguous delivery');
const partialAnswerlatticeDelivery = mergeAnswerlatticeBillingDocumentDelivery(
    { status: 'partial', attempts: 1, lastAttemptAtMillis: 100 },
    { status: 'failed', attempts: 1, lastAttemptAtMillis: 200 },
);
assert.equal(partialAnswerlatticeDelivery.status, 'partial', 'a failed retry must not erase a known partial delivery');
const completedAnswerlatticeDelivery = mergeAnswerlatticeBillingDocumentDelivery(
    partialAnswerlatticeDelivery,
    { status: 'sent', attempts: 1, lastAttemptAtMillis: 300 },
);
assert.equal(completedAnswerlatticeDelivery.status, 'sent', 'a confirmed send must reconcile a partial delivery');
const confirmedPartialAnswerlatticeDelivery = mergeAnswerlatticeBillingDocumentDelivery(
    { status: 'outcome_unknown', attempts: 1, lastAttemptAtMillis: 100 },
    { status: 'partial', attempts: 1, lastAttemptAtMillis: 200 },
);
assert.equal(confirmedPartialAnswerlatticeDelivery.status, 'partial', 'a confirmed partial result must reconcile an ambiguous delivery');

const uneven = buildPartialCreditLineItem(original, 1);
assert.equal(
    uneven.baseAmount + uneven.cgstAmount + uneven.sgstAmount + uneven.igstAmount,
    1,
    'largest-remainder allocation must preserve every minor unit',
);

const sampleDocument: MenuListBillingDocument = {
    schemaVersion: 1,
    renderVersion: 'ML_BILLING_PDF_V1',
    documentId: id,
    documentNumber: 'ML26-27-000001',
    documentType: 'tax_invoice',
    financialYear: '26-27',
    sequence: 1,
    status: 'issued',
    issuedAtMillis: Date.parse('2026-08-22T10:00:00.000Z'),
    source: 'subscription',
    sourceReferenceId: 'pay_example',
    paymentId: 'pay_example',
    pId: 'ML',
    productId: 'ML',
    tId: 1,
    tenantId: 1,
    sId: 1,
    storeId: 1,
    currency: 'INR',
    seller: {
        merchantEntityId: 'menulist-india',
        legalName: 'MenuList Demo Supplier',
        registeredAddress: '123 Example Road, Bengaluru, Karnataka 560001',
        gstin: '29ABCDE1234F1Z5',
        stateCode: '29',
        authorisedSignatoryName: 'Authorised Signatory',
    },
    customer: {
        legalName: 'Demo Customer',
        email: 'owner@example.com',
        addressLine1: '45 Customer Street',
        city: 'Bengaluru',
        region: 'Karnataka',
        postalCode: '560002',
        countryCode: 'IN',
        indianStateCode: '29',
    },
    supply: {
        policyVersion: 'IN_GST_2026_08_V1',
        classification: 'domestic_intra_state',
        taxTreatment: 'cgst_sgst',
        destinationTaxStatus: 'not_applicable',
        placeOfSupply: 'Karnataka (29)',
    },
    lineItems: [original],
    totals: {
        baseAmount: 10_000,
        cgstAmount: 900,
        sgstAmount: 900,
        igstAmount: 0,
        taxAmount: 1_800,
        grossAmount: 11_800,
    },
    contentHash: 'test-content-hash',
    delivery: { status: 'not_requested', attempts: 0 },
};
const pdf = renderMenuListBillingDocumentPdf(sampleDocument);
assert.ok(pdf.byteLength > 1_000, 'billing PDF must contain a rendered document');
assert.equal(Buffer.from(pdf.subarray(0, 4)).toString('ascii'), '%PDF');

assert.equal(getAnswerlatticeFinancialYear(sampleDocument.issuedAtMillis), '26-27');
assert.equal(formatAnswerlatticeBillingDocumentNumber('tax_invoice', '26-27', 1), 'AL26-27-000001');
assert.equal(formatAnswerlatticeBillingDocumentNumber('credit_note', '26-27', 42), 'AC26-27-000042');
assert.throws(() => formatAnswerlatticeBillingDocumentNumber('tax_invoice', '26-27', 1_000_000));
const answerlatticeDocumentId = buildAnswerlatticeBillingDocumentId('tax_invoice', 'pay_answerlattice_example');
assert.notEqual(answerlatticeDocumentId, id, 'Answerlattice document identity must remain product-specific');
const answerlatticeDocument: AnswerlatticeBillingDocument = {
    ...sampleDocument,
    renderVersion: 'AL_BILLING_PDF_V1',
    documentId: answerlatticeDocumentId,
    documentNumber: 'AL26-27-000001',
    sourceReferenceId: 'pay_answerlattice_example',
    paymentId: 'pay_answerlattice_example',
    pId: 'AL',
    productId: 'AL',
};
const answerlatticePdf = renderAnswerlatticeBillingDocumentPdf(answerlatticeDocument);
assert.ok(answerlatticePdf.byteLength > 1_000, 'Answerlattice billing PDF must contain a rendered document');
assert.equal(Buffer.from(answerlatticePdf.subarray(0, 4)).toString('ascii'), '%PDF');

console.log('Billing document policy checks passed.');
