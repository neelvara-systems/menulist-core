import type { BillingHistoryItem } from '@type/razorpay';

export type BillingDocumentSummary = {
    documentId: string;
    documentNumber: string;
    documentType: 'tax_invoice' | 'credit_note';
    issuedAtMillis: number;
    paymentId: string;
    relatedInvoiceNumber: string | null;
    currency: string;
    totalAmount: number;
    deliveryStatus: 'not_requested' | 'queued' | 'partial' | 'sent' | 'failed' | 'outcome_unknown';
};

export type BillingDocumentDelivery = {
    status: BillingDocumentSummary['deliveryStatus'];
};

export const fetchBillingDocumentSummaries = async (): Promise<BillingDocumentSummary[]> => {
    const response = await fetch('/api/billing-documents', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Billing documents could not be loaded.');
    const payload = await response.json() as { documents?: unknown };
    return Array.isArray(payload.documents) ? payload.documents as BillingDocumentSummary[] : [];
};

export const requestBillingDocumentEmail = async (documentId: string): Promise<BillingDocumentDelivery> => {
    const normalizedDocumentId = documentId.trim();
    if (!/^(inv|crn)_[a-f0-9]{40}$/.test(normalizedDocumentId)) {
        throw new Error('Billing document is unavailable.');
    }
    const response = await fetch(`/api/billing-documents/${encodeURIComponent(normalizedDocumentId)}/email`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({})) as {
        delivery?: BillingDocumentDelivery;
        error?: string;
    };
    if (!response.ok || !payload.delivery) {
        throw new Error(payload.error || 'Billing document email could not be sent.');
    }
    return payload.delivery;
};

export const mergeBillingDocumentsIntoHistory = (
    history: BillingHistoryItem[],
    documents: BillingDocumentSummary[],
): BillingHistoryItem[] => {
    const invoicesByPayment = new Map(
        documents
            .filter((document) => document.documentType === 'tax_invoice')
            .map((document) => [document.paymentId, document] as const),
    );
    const merged = history.map((item) => {
        const document = invoicesByPayment.get(item.id);
        return document ? {
            ...item,
            billingDocumentId: document.documentId,
            billingDocumentNumber: document.documentNumber,
            billingDocumentType: document.documentType,
            billingDocumentUrl: `/api/billing-documents/${document.documentId}/pdf`,
            billingDocumentDeliveryStatus: document.deliveryStatus,
        } : item;
    });
    const credits = documents
        .filter((document) => document.documentType === 'credit_note')
        .map((document): BillingHistoryItem => ({
            id: document.documentId,
            type: 'Credit note',
            date: document.issuedAtMillis,
            description: document.relatedInvoiceNumber
                ? `Refund against ${document.relatedInvoiceNumber}`
                : 'Refund credit note',
            amount: document.totalAmount,
            currency: document.currency,
            status: 'credited',
            billingDocumentId: document.documentId,
            billingDocumentNumber: document.documentNumber,
            billingDocumentType: document.documentType,
            billingDocumentUrl: `/api/billing-documents/${document.documentId}/pdf`,
            billingDocumentDeliveryStatus: document.deliveryStatus,
        }));
    return [...merged, ...credits].sort((a, b) => b.date - a.date);
};

export type MenuListBillingDocumentSummary = BillingDocumentSummary;
export type AnswerlatticeBillingDocumentSummary = BillingDocumentSummary;

export const fetchMenuListBillingDocumentSummaries = fetchBillingDocumentSummaries;
export const fetchAnswerlatticeBillingDocumentSummaries = fetchBillingDocumentSummaries;
export const mergeMenuListBillingDocumentsIntoHistory = mergeBillingDocumentsIntoHistory;
export const mergeAnswerlatticeBillingDocumentsIntoHistory = mergeBillingDocumentsIntoHistory;
