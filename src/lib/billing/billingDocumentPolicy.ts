import { createHash } from 'crypto';
import type { MenuListTaxSnapshot } from '@data/shared/billingTaxPolicy';

export const MENULIST_BILLING_DOCUMENT_SCHEMA_VERSION = 1 as const;
export const MENULIST_BILLING_DOCUMENT_RENDER_VERSION = 'ML_BILLING_PDF_V1' as const;

export type MenuListBillingDocumentType = 'tax_invoice' | 'credit_note';
export type MenuListBillingDocumentSource = 'subscription' | 'topup' | 'refund';

export type MenuListBillingDocumentLineItem = {
    description: string;
    quantity: number;
    unitBaseAmount: number;
    baseAmount: number;
    sacCode: string;
    taxRateBps: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    taxAmount: number;
    grossAmount: number;
};

export type MenuListBillingDocument = {
    schemaVersion: typeof MENULIST_BILLING_DOCUMENT_SCHEMA_VERSION;
    renderVersion: typeof MENULIST_BILLING_DOCUMENT_RENDER_VERSION;
    documentId: string;
    documentNumber: string;
    documentType: MenuListBillingDocumentType;
    financialYear: string;
    sequence: number;
    status: 'issued';
    issuedAtMillis: number;
    source: MenuListBillingDocumentSource;
    sourceReferenceId: string;
    paymentId: string;
    orderId?: string;
    subscriptionId?: string;
    providerInvoiceId?: string;
    providerInvoiceUrl?: string;
    relatedInvoiceId?: string;
    relatedInvoiceNumber?: string;
    pId: 'ML';
    productId: 'ML';
    tId: number;
    tenantId: number;
    sId: number;
    storeId: number;
    currency: 'INR' | 'USD';
    seller: {
        merchantEntityId: string;
        legalName: string;
        registeredAddress: string;
        gstin: string;
        stateCode: string;
        authorisedSignatoryName?: string;
    };
    customer: MenuListTaxSnapshot['billingProfile'];
    supply: {
        policyVersion: string;
        classification: MenuListTaxSnapshot['supplyClassification'];
        taxTreatment: MenuListTaxSnapshot['taxTreatment'];
        destinationTaxStatus: MenuListTaxSnapshot['destinationTaxStatus'];
        placeOfSupply: string;
        lutReference?: string;
    };
    lineItems: MenuListBillingDocumentLineItem[];
    totals: {
        baseAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        taxAmount: number;
        grossAmount: number;
    };
    contentHash: string;
    delivery: {
        status: 'not_requested' | 'queued' | 'sent' | 'failed' | 'outcome_unknown';
        attempts: number;
        lastAttemptAtMillis?: number;
        errorCode?: string;
    };
};

export const mergeMenuListBillingDocumentDelivery = (
    current: MenuListBillingDocument['delivery'],
    attempted: MenuListBillingDocument['delivery'],
): MenuListBillingDocument['delivery'] => {
    const preserveCurrentStatus = current.status === 'sent'
        || (current.status === 'outcome_unknown' && attempted.status !== 'sent');
    return {
        ...(preserveCurrentStatus ? current : attempted),
        attempts: current.attempts + 1,
        lastAttemptAtMillis: attempted.lastAttemptAtMillis,
    };
};

const canonicalStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
    return `{${Object.entries(value as Record<string, unknown>)
        .filter(([, nested]) => nested !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => `${JSON.stringify(key)}:${canonicalStringify(nested)}`)
        .join(',')}}`;
};

export const getMenuListFinancialYear = (issuedAtMillis: number): string => {
    if (!Number.isSafeInteger(issuedAtMillis) || issuedAtMillis <= 0) {
        throw new Error('Billing document issue time is invalid.');
    }
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(new Date(issuedAtMillis));
    const year = Number(parts.find((part) => part.type === 'year')?.value);
    const month = Number(parts.find((part) => part.type === 'month')?.value);
    if (!Number.isSafeInteger(year) || !Number.isSafeInteger(month)) {
        throw new Error('Billing document financial year cannot be resolved.');
    }
    const startYear = month >= 4 ? year : year - 1;
    return `${startYear % 100}-${(startYear + 1) % 100}`.padStart(5, '0');
};

export const formatMenuListBillingDocumentNumber = (
    documentType: MenuListBillingDocumentType,
    financialYear: string,
    sequence: number,
): string => {
    if (!/^\d{2}-\d{2}$/.test(financialYear) || !Number.isSafeInteger(sequence) || sequence <= 0 || sequence > 999_999) {
        throw new Error('Billing document sequence is invalid.');
    }
    const prefix = documentType === 'tax_invoice' ? 'ML' : 'MC';
    const number = `${prefix}${financialYear}-${String(sequence).padStart(6, '0')}`;
    if (number.length > 16) throw new Error('Billing document number exceeds the supported legal limit.');
    return number;
};

export const buildMenuListBillingDocumentId = (
    documentType: MenuListBillingDocumentType,
    sourceReferenceId: string,
): string => {
    const normalized = sourceReferenceId.trim();
    if (!normalized || normalized.length > 240) throw new Error('Billing source reference is invalid.');
    const prefix = documentType === 'tax_invoice' ? 'inv' : 'crn';
    return `${prefix}_${createHash('sha256').update(normalized).digest('hex').slice(0, 40)}`;
};

export const buildMenuListBillingDocumentContentHash = (
    document: Omit<MenuListBillingDocument, 'contentHash' | 'delivery'>,
): string => createHash('sha256').update(canonicalStringify(document)).digest('hex');

export const buildLineItemFromTaxSnapshot = (
    description: string,
    snapshot: MenuListTaxSnapshot,
): MenuListBillingDocumentLineItem => ({
    description: description.trim().slice(0, 240),
    quantity: snapshot.quantity,
    unitBaseAmount: snapshot.baseUnitAmount,
    baseAmount: snapshot.baseAmount,
    sacCode: snapshot.sacCode,
    taxRateBps: snapshot.taxRateBps,
    cgstAmount: snapshot.cgstAmount,
    sgstAmount: snapshot.sgstAmount,
    igstAmount: snapshot.igstAmount,
    taxAmount: snapshot.taxAmount,
    grossAmount: snapshot.grossAmount,
});

const allocate = (amount: number, weights: number[], totalWeight: number): number[] => {
    if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
        throw new Error('Credit-note allocation is invalid.');
    }
    const raw = weights.map((weight) => (amount * weight) / totalWeight);
    const allocated = raw.map(Math.floor);
    let remainder = amount - allocated.reduce((sum, value) => sum + value, 0);
    raw.map((value, index) => ({ index, fraction: value - allocated[index] }))
        .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
        .forEach(({ index }) => {
            if (remainder > 0) {
                allocated[index] += 1;
                remainder -= 1;
            }
        });
    return allocated;
};

export const buildPartialCreditLineItem = (
    original: MenuListBillingDocumentLineItem,
    refundGrossAmount: number,
): MenuListBillingDocumentLineItem => {
    if (!Number.isSafeInteger(refundGrossAmount) || refundGrossAmount <= 0 || refundGrossAmount > original.grossAmount) {
        throw new Error('Refund amount is outside the invoice balance.');
    }
    const [baseAmount, cgstAmount, sgstAmount, igstAmount] = allocate(
        refundGrossAmount,
        [original.baseAmount, original.cgstAmount, original.sgstAmount, original.igstAmount],
        original.grossAmount,
    );
    const taxAmount = cgstAmount + sgstAmount + igstAmount;
    return {
        ...original,
        description: `Credit for ${original.description}`.slice(0, 240),
        quantity: 1,
        unitBaseAmount: baseAmount,
        baseAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        taxAmount,
        grossAmount: refundGrossAmount,
    };
};

export const buildRemainingCreditLineItem = (
    original: MenuListBillingDocumentLineItem,
    priorCredits: MenuListBillingDocumentLineItem[],
    refundGrossAmount: number,
): MenuListBillingDocumentLineItem => {
    const credited = priorCredits.reduce(
        (totals, line) => ({
            baseAmount: totals.baseAmount + line.baseAmount,
            cgstAmount: totals.cgstAmount + line.cgstAmount,
            sgstAmount: totals.sgstAmount + line.sgstAmount,
            igstAmount: totals.igstAmount + line.igstAmount,
            grossAmount: totals.grossAmount + line.grossAmount,
        }),
        { baseAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, grossAmount: 0 },
    );
    const remaining = {
        baseAmount: original.baseAmount - credited.baseAmount,
        cgstAmount: original.cgstAmount - credited.cgstAmount,
        sgstAmount: original.sgstAmount - credited.sgstAmount,
        igstAmount: original.igstAmount - credited.igstAmount,
        grossAmount: original.grossAmount - credited.grossAmount,
    };
    if (
        Object.values(remaining).some((amount) => !Number.isSafeInteger(amount) || amount < 0)
        || remaining.baseAmount + remaining.cgstAmount + remaining.sgstAmount + remaining.igstAmount
            !== remaining.grossAmount
    ) {
        throw new Error('Existing credit notes exceed the invoice tax allocation.');
    }

    return buildPartialCreditLineItem({
        ...original,
        quantity: 1,
        unitBaseAmount: remaining.baseAmount,
        baseAmount: remaining.baseAmount,
        cgstAmount: remaining.cgstAmount,
        sgstAmount: remaining.sgstAmount,
        igstAmount: remaining.igstAmount,
        taxAmount: remaining.cgstAmount + remaining.sgstAmount + remaining.igstAmount,
        grossAmount: remaining.grossAmount,
    }, refundGrossAmount);
};
