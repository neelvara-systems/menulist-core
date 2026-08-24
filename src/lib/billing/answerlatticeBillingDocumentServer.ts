import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';
import type { BillingTaxSnapshot } from '@data/shared/billingTaxPolicy';
import { OWNER_NOTIFICATION_TRIGGER_TYPES, type OwnerNotificationChannel } from '@data/shared/ownerNotificationRegistry';
import { answerlatticeServerEnv } from '@lib/env/answerlatticeServerEnv';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getBoundedNotificationStringContext, logNotificationFailure } from '@lib/notifications/notificationDiagnostics';
import { enqueueOwnerNotification } from '@lib/owner-notifications';
import { getBillingFirestoreAdminForProduct } from './productBillingServer';
import {
    ANSWERLATTICE_BILLING_DOCUMENT_RENDER_VERSION,
    ANSWERLATTICE_BILLING_DOCUMENT_SCHEMA_VERSION,
    buildLineItemFromTaxSnapshot,
    buildAnswerlatticeBillingDocumentContentHash,
    buildAnswerlatticeBillingDocumentId,
    buildPartialCreditLineItem,
    buildRemainingCreditLineItem,
    formatAnswerlatticeBillingDocumentNumber,
    getAnswerlatticeFinancialYear,
    mergeAnswerlatticeBillingDocumentDelivery,
    type AnswerlatticeBillingDocument,
    type AnswerlatticeBillingDocumentLineItem,
    type AnswerlatticeBillingDocumentSource,
    type AnswerlatticeBillingDocumentType,
} from './answerlatticeBillingDocumentPolicy';

type IssueInvoiceInput = {
    description: string;
    issuedAtMillis: number;
    orderId?: string;
    paymentId: string;
    providerInvoiceId?: string;
    providerInvoiceUrl?: string;
    source: Exclude<AnswerlatticeBillingDocumentSource, 'refund'>;
    sourceReferenceId: string;
    storeId: number;
    subscriptionId?: string;
    taxSnapshot: BillingTaxSnapshot;
    tenantId: number;
};

type IssueCreditNoteInput = {
    issuedAtMillis: number;
    paymentId: string;
    refundAmount: number;
    refundId: string;
};

const exactEnabled = (value: string | undefined): boolean => value === 'true';
const db = () => getBillingFirestoreAdminForProduct(PRODUCT_IDS.ANSWERLATTICE);
const ANSWERLATTICE_BILLING_URL = `${getProductDeploymentTarget('answerlattice').url
    .replace(/\/__answerlattice\/?$/, '')
    .replace(/\/$/, '')}/billing`;

const requireExactNonNegativeMoneyInteger = (value: unknown, label: string): number => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new Error(`${label} is invalid.`);
    }
    return value;
};

export class BillingDocumentConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BillingDocumentConfigurationError';
        Object.setPrototypeOf(this, BillingDocumentConfigurationError.prototype);
    }
}

export const isAnswerlatticeBillingDocumentIssuanceEnabled = (): boolean => (
    FEATURE_FLAGS.ENABLE_BILLING_DOCUMENTS
    && exactEnabled(answerlatticeServerEnv.billingDocumentsEnabled)
);

const assertIssuanceConfiguration = (): void => {
    if (!isAnswerlatticeBillingDocumentIssuanceEnabled()) {
        throw new BillingDocumentConfigurationError('Answerlattice billing-document issuance is disabled.');
    }
    if (answerlatticeServerEnv.billingEInvoiceStatus !== 'not_required') {
        throw new BillingDocumentConfigurationError(
            'Billing documents require an accountant-confirmed e-invoice status before issuance.',
        );
    }
};

const normalizeProviderReference = (value: string | undefined, label: string): string | undefined => {
    if (value == null) return undefined;
    const normalized = value.trim();
    if (!normalized || normalized.length > 240) throw new Error(`${label} is invalid.`);
    return normalized;
};

const resolvePlaceOfSupply = (snapshot: BillingTaxSnapshot): string => {
    const profile = snapshot.billingProfile;
    return profile.countryCode === 'IN'
        ? `${profile.region} (${profile.indianStateCode})`
        : `${profile.region}, ${profile.countryCode}`;
};

const buildTotals = (lineItems: AnswerlatticeBillingDocumentLineItem[]) => lineItems.reduce(
    (totals, line) => ({
        baseAmount: totals.baseAmount + line.baseAmount,
        cgstAmount: totals.cgstAmount + line.cgstAmount,
        sgstAmount: totals.sgstAmount + line.sgstAmount,
        igstAmount: totals.igstAmount + line.igstAmount,
        taxAmount: totals.taxAmount + line.taxAmount,
        grossAmount: totals.grossAmount + line.grossAmount,
    }),
    { baseAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0, taxAmount: 0, grossAmount: 0 },
);

const hasSameImmutableInput = (
    current: AnswerlatticeBillingDocument,
    params: {
        currency: AnswerlatticeBillingDocument['currency'];
        customer: AnswerlatticeBillingDocument['customer'];
        issuedAtMillis: number;
        lineItems: AnswerlatticeBillingDocumentLineItem[];
        orderId?: string;
        providerInvoiceId?: string;
        providerInvoiceUrl?: string;
        relatedInvoiceId?: string;
        relatedInvoiceNumber?: string;
        seller: AnswerlatticeBillingDocument['seller'];
        source: AnswerlatticeBillingDocumentSource;
        subscriptionId?: string;
        supply: AnswerlatticeBillingDocument['supply'];
    },
    totals: AnswerlatticeBillingDocument['totals'],
): boolean => (
    current.source === params.source
    && current.currency === params.currency
    && current.issuedAtMillis === params.issuedAtMillis
    && current.orderId === params.orderId
    && current.subscriptionId === params.subscriptionId
    && current.providerInvoiceId === params.providerInvoiceId
    && current.providerInvoiceUrl === params.providerInvoiceUrl
    && current.relatedInvoiceId === params.relatedInvoiceId
    && current.relatedInvoiceNumber === params.relatedInvoiceNumber
    && JSON.stringify(current.seller) === JSON.stringify(params.seller)
    && JSON.stringify(current.customer) === JSON.stringify(params.customer)
    && JSON.stringify(current.supply) === JSON.stringify(params.supply)
    && JSON.stringify(current.lineItems) === JSON.stringify(params.lineItems)
    && JSON.stringify(current.totals) === JSON.stringify(totals)
);

const issueDocument = async (params: {
    documentType: AnswerlatticeBillingDocumentType;
    issuedAtMillis: number;
    source: AnswerlatticeBillingDocumentSource;
    sourceReferenceId: string;
    paymentId: string;
    tenantId: number;
    storeId: number;
    currency: 'INR' | 'USD';
    seller: AnswerlatticeBillingDocument['seller'];
    customer: AnswerlatticeBillingDocument['customer'];
    supply: AnswerlatticeBillingDocument['supply'];
    lineItems: AnswerlatticeBillingDocumentLineItem[];
    orderId?: string;
    subscriptionId?: string;
    providerInvoiceId?: string;
    providerInvoiceUrl?: string;
    relatedInvoiceId?: string;
    relatedInvoiceNumber?: string;
    maxRelatedGrossAmount?: number;
    creditAllocation?: {
        originalLine: AnswerlatticeBillingDocumentLineItem;
        refundGrossAmount: number;
    };
}): Promise<AnswerlatticeBillingDocument> => {
    assertIssuanceConfiguration();
    const documentId = buildAnswerlatticeBillingDocumentId(params.documentType, params.sourceReferenceId);
    const financialYear = getAnswerlatticeFinancialYear(params.issuedAtMillis);
    const firestore = db();
    const documentRef = firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENTS).doc(documentId);
    const counterKey = `${params.seller.merchantEntityId}:${params.documentType}:${financialYear}`;
    const counterId = buildAnswerlatticeBillingDocumentId('tax_invoice', counterKey).replace(/^inv_/, 'ctr_');
    const counterRef = firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENT_COUNTERS).doc(counterId);
    const initialLineTotals = buildTotals(params.lineItems);

    const document = await firestore.runTransaction(async (tx) => {
        const existing = await tx.get(documentRef);
        if (existing.exists) {
            const current = existing.data() as AnswerlatticeBillingDocument;
            if (
                current.documentType !== params.documentType
                || current.sourceReferenceId !== params.sourceReferenceId
                || current.paymentId !== params.paymentId
                || current.tenantId !== params.tenantId
                || current.storeId !== params.storeId
                || (params.creditAllocation
                    ? current.totals.grossAmount !== params.creditAllocation.refundGrossAmount
                        || !hasSameImmutableInput(current, {
                            ...params,
                            lineItems: current.lineItems,
                        }, current.totals)
                    : !hasSameImmutableInput(current, params, initialLineTotals))
            ) {
                throw new Error('Billing document immutable replay conflict.');
            }
            return current;
        }

        const relatedCreditsQuery = params.relatedInvoiceId
            ? firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
                .where('relatedInvoiceId', '==', params.relatedInvoiceId)
                .where('documentType', '==', 'credit_note')
            : null;
        const [counter, relatedCredits] = await Promise.all([
            tx.get(counterRef),
            relatedCreditsQuery ? tx.get(relatedCreditsQuery) : Promise.resolve(null),
        ]);
        let lineItems = params.lineItems;
        if (relatedCredits && params.creditAllocation) {
            const priorCreditLines = relatedCredits.docs.flatMap((document) => {
                const credit = document.data() as Partial<AnswerlatticeBillingDocument>;
                if (!Array.isArray(credit.lineItems) || credit.lineItems.length !== 1) {
                    throw new Error('Existing credit-note allocation requires reconciliation.');
                }
                return credit.lineItems;
            });
            lineItems = [buildRemainingCreditLineItem(
                params.creditAllocation.originalLine,
                priorCreditLines,
                params.creditAllocation.refundGrossAmount,
            )];
        }
        const lineTotals = buildTotals(lineItems);
        if (relatedCredits && params.maxRelatedGrossAmount != null) {
            const alreadyCredited = relatedCredits.docs.reduce(
                (sum, document) => {
                    const creditedAmount = requireExactNonNegativeMoneyInteger(
                        document.get('totals.grossAmount'),
                        'Existing credit-note total',
                    );
                    const next = sum + creditedAmount;
                    if (!Number.isSafeInteger(next)) {
                        throw new Error('Existing credit-note total is invalid.');
                    }
                    return next;
                },
                0,
            );
            if (alreadyCredited + lineTotals.grossAmount > params.maxRelatedGrossAmount) {
                throw new Error('Refund exceeds the remaining invoice balance.');
            }
        }
        const currentSequence = counter.exists
            ? requireExactNonNegativeMoneyInteger(counter.get('lastSequence'), 'Billing document counter')
            : 0;
        const sequence = currentSequence + 1;
        const documentNumber = formatAnswerlatticeBillingDocumentNumber(params.documentType, financialYear, sequence);
        const immutable = {
            schemaVersion: ANSWERLATTICE_BILLING_DOCUMENT_SCHEMA_VERSION,
            renderVersion: ANSWERLATTICE_BILLING_DOCUMENT_RENDER_VERSION,
            documentId,
            documentNumber,
            documentType: params.documentType,
            financialYear,
            sequence,
            status: 'issued' as const,
            issuedAtMillis: params.issuedAtMillis,
            source: params.source,
            sourceReferenceId: params.sourceReferenceId,
            paymentId: params.paymentId,
            ...(params.orderId ? { orderId: params.orderId } : {}),
            ...(params.subscriptionId ? { subscriptionId: params.subscriptionId } : {}),
            ...(params.providerInvoiceId ? { providerInvoiceId: params.providerInvoiceId } : {}),
            ...(params.providerInvoiceUrl ? { providerInvoiceUrl: params.providerInvoiceUrl } : {}),
            ...(params.relatedInvoiceId ? { relatedInvoiceId: params.relatedInvoiceId } : {}),
            ...(params.relatedInvoiceNumber ? { relatedInvoiceNumber: params.relatedInvoiceNumber } : {}),
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            tId: params.tenantId,
            tenantId: params.tenantId,
            sId: params.storeId,
            storeId: params.storeId,
            currency: params.currency,
            seller: params.seller,
            customer: params.customer,
            supply: params.supply,
            lineItems,
            totals: lineTotals,
        };
        const document: AnswerlatticeBillingDocument = {
            ...immutable,
            contentHash: buildAnswerlatticeBillingDocumentContentHash(immutable),
            delivery: { status: 'not_requested', attempts: 0 },
        };
        tx.create(documentRef, {
            ...document,
            issuedAt: admin.firestore.Timestamp.fromMillis(params.issuedAtMillis),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.set(counterRef, {
            counterKey,
            documentType: params.documentType,
            financialYear,
            lastSequence: sequence,
            lastDocumentId: documentId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        return document;
    });
    await requestAnswerlatticeBillingDocumentDelivery(document);
    return document;
};

export const issueAnswerlatticeTaxInvoice = async (input: IssueInvoiceInput): Promise<AnswerlatticeBillingDocument | null> => {
    if (!isAnswerlatticeBillingDocumentIssuanceEnabled()) return null;
    const snapshot = input.taxSnapshot;
    return issueDocument({
        documentType: 'tax_invoice',
        issuedAtMillis: input.issuedAtMillis,
        source: input.source,
        sourceReferenceId: input.sourceReferenceId,
        paymentId: normalizeProviderReference(input.paymentId, 'Payment id')!,
        tenantId: input.tenantId,
        storeId: input.storeId,
        currency: snapshot.currency,
        seller: {
            merchantEntityId: snapshot.merchantEntityId,
            legalName: snapshot.supplierLegalName,
            registeredAddress: snapshot.supplierRegisteredAddress,
            gstin: snapshot.supplierGstin,
            stateCode: snapshot.supplierStateCode,
            ...(answerlatticeServerEnv.billingAuthorisedSignatoryName
                ? { authorisedSignatoryName: answerlatticeServerEnv.billingAuthorisedSignatoryName.trim().slice(0, 160) }
                : {}),
        },
        customer: snapshot.billingProfile,
        supply: {
            policyVersion: snapshot.policyVersion,
            classification: snapshot.supplyClassification,
            taxTreatment: snapshot.taxTreatment,
            destinationTaxStatus: snapshot.destinationTaxStatus,
            placeOfSupply: resolvePlaceOfSupply(snapshot),
            ...(snapshot.lutReference ? { lutReference: snapshot.lutReference } : {}),
        },
        lineItems: [buildLineItemFromTaxSnapshot(input.description, snapshot)],
        orderId: normalizeProviderReference(input.orderId, 'Order id'),
        subscriptionId: normalizeProviderReference(input.subscriptionId, 'Subscription id'),
        providerInvoiceId: normalizeProviderReference(input.providerInvoiceId, 'Provider invoice id'),
        providerInvoiceUrl: normalizeProviderReference(input.providerInvoiceUrl, 'Provider invoice URL'),
    });
};

export const issueAnswerlatticeCreditNote = async (input: IssueCreditNoteInput): Promise<AnswerlatticeBillingDocument | null> => {
    if (!isAnswerlatticeBillingDocumentIssuanceEnabled()) return null;
    const firestore = db();
    const invoices = await firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('documentType', '==', 'tax_invoice')
        .where('paymentId', '==', input.paymentId)
        .limit(2)
        .get();
    if (invoices.size !== 1) throw new Error('Refund cannot be matched to one Answerlattice tax invoice.');
    const original = invoices.docs[0].data() as AnswerlatticeBillingDocument;
    if (original.lineItems.length !== 1) throw new Error('Unsupported multi-line invoice credit allocation.');
    const creditLine = buildPartialCreditLineItem(original.lineItems[0], input.refundAmount);
    return issueDocument({
        documentType: 'credit_note',
        issuedAtMillis: input.issuedAtMillis,
        source: 'refund',
        sourceReferenceId: input.refundId,
        paymentId: input.paymentId,
        tenantId: original.tenantId,
        storeId: original.storeId,
        currency: original.currency,
        seller: original.seller,
        customer: original.customer,
        supply: original.supply,
        lineItems: [creditLine],
        relatedInvoiceId: original.documentId,
        relatedInvoiceNumber: original.documentNumber,
        maxRelatedGrossAmount: original.totals.grossAmount,
        creditAllocation: {
            originalLine: original.lineItems[0],
            refundGrossAmount: input.refundAmount,
        },
        subscriptionId: original.subscriptionId,
        orderId: original.orderId,
    });
};

export const getAnswerlatticeBillingDocument = async (documentId: string): Promise<AnswerlatticeBillingDocument | null> => {
    const normalized = documentId.trim();
    if (!/^(inv|crn)_[a-f0-9]{40}$/.test(normalized)) return null;
    const snapshot = await db().collection(DB_COLLECTIONS.BILLING_DOCUMENTS).doc(normalized).get();
    return snapshot.exists ? snapshot.data() as AnswerlatticeBillingDocument : null;
};

export const listAnswerlatticeBillingDocuments = async (tenantId: number, storeId: number, limit = 50) => {
    const result = await db().collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .where('productId', '==', PRODUCT_IDS.ANSWERLATTICE)
        .where('tenantId', '==', tenantId)
        .where('storeId', '==', storeId)
        .orderBy('issuedAtMillis', 'desc')
        .limit(Math.min(Math.max(limit, 1), 100))
        .get();
    return result.docs.map((document) => document.data() as AnswerlatticeBillingDocument);
};

export const requestAnswerlatticeBillingDocumentDelivery = async (
    document: AnswerlatticeBillingDocument,
    requestedChannels?: OwnerNotificationChannel[],
): Promise<AnswerlatticeBillingDocument['delivery']> => {
    if (!exactEnabled(answerlatticeServerEnv.billingDocumentDeliveryEnabled)) return document.delivery;
    const documentUrl = ANSWERLATTICE_BILLING_URL;
    let result: Awaited<ReturnType<typeof enqueueOwnerNotification>>;
    try {
        result = await enqueueOwnerNotification({
            productId: PRODUCT_IDS.ANSWERLATTICE,
            triggerType: OWNER_NOTIFICATION_TRIGGER_TYPES.BILLING_DOCUMENT_ISSUED,
            tenantId: String(document.tenantId),
            storeId: String(document.storeId),
            referenceId: document.documentId,
            recipientRole: 'billing_owner',
            ...(requestedChannels?.length ? { requestedChannels } : {}),
            recipientHints: {
                email: document.customer.email,
                name: document.customer.legalName,
            },
            metadata: {
                amount: document.totals.grossAmount / 100,
                currency: document.currency,
                documentNumber: document.documentNumber,
                documentTypeLabel: document.documentType === 'tax_invoice' ? 'tax invoice' : 'credit note',
                documentUrl,
            },
            source: {
                runtime: 'next',
                path: 'src/lib/billing/answerlatticeBillingDocumentServer.ts:requestAnswerlatticeBillingDocumentDelivery',
            },
        }, { processImmediately: true });
    } catch (error) {
        logNotificationFailure('billing_document_notification_enqueue_failed', error, {
            ...getBoundedNotificationStringContext('documentId', document.documentId),
            ...getBoundedNotificationStringContext('documentType', document.documentType),
        });
        return document.delivery;
    }
    const status = 'sent' in result
        ? result.status === 'partial' || (result.sent > 0 && result.failed > 0)
            ? 'partial'
            : result.sent > 0
                ? 'sent'
            : result.status === 'pending' || result.status === 'processing'
                ? 'queued'
                : 'failed'
        : result.status === 'pending' || result.status === 'processing'
            ? 'queued'
            : result.status === 'partial'
                ? 'partial'
                : result.status === 'delivered'
                ? 'sent'
                : 'failed';
    const attemptedDelivery: AnswerlatticeBillingDocument['delivery'] = {
        status,
        attempts: 1,
        lastAttemptAtMillis: Date.now(),
        ...(status === 'failed' ? { errorCode: 'notification_os_delivery_unavailable' } : {}),
    };
    const documentRef = db().collection(DB_COLLECTIONS.BILLING_DOCUMENTS).doc(document.documentId);
    try {
        return await db().runTransaction(async (tx) => {
            const currentSnapshot = await tx.get(documentRef);
            if (!currentSnapshot.exists) throw new Error('Billing document no longer exists.');
            const current = currentSnapshot.data() as AnswerlatticeBillingDocument;
            const currentDelivery = current.delivery || { status: 'not_requested', attempts: 0 };
            const delivery = mergeAnswerlatticeBillingDocumentDelivery(currentDelivery, attemptedDelivery);
            tx.set(documentRef, {
                delivery,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            return delivery;
        });
    } catch (error) {
        logNotificationFailure('billing_document_delivery_status_update_failed', error, {
            ...getBoundedNotificationStringContext('documentId', document.documentId),
            ...getBoundedNotificationStringContext('documentType', document.documentType),
        });
        return attemptedDelivery;
    }
};
