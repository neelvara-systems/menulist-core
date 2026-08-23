import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { OWNER_APP_URL } from '@constant/urls';
import type { MenuListTaxSnapshot } from '@data/shared/billingTaxPolicy';
import { OWNER_NOTIFICATION_TRIGGER_TYPES, type OwnerNotificationChannel } from '@data/shared/ownerNotificationRegistry';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getBoundedNotificationStringContext, logNotificationFailure } from '@lib/notifications/notificationDiagnostics';
import { enqueueOwnerNotification } from '@lib/owner-notifications';
import { getBillingFirestoreAdminForProduct } from './productBillingServer';
import {
    MENULIST_BILLING_DOCUMENT_RENDER_VERSION,
    MENULIST_BILLING_DOCUMENT_SCHEMA_VERSION,
    buildLineItemFromTaxSnapshot,
    buildMenuListBillingDocumentContentHash,
    buildMenuListBillingDocumentId,
    buildPartialCreditLineItem,
    buildRemainingCreditLineItem,
    formatMenuListBillingDocumentNumber,
    getMenuListFinancialYear,
    mergeMenuListBillingDocumentDelivery,
    type MenuListBillingDocument,
    type MenuListBillingDocumentLineItem,
    type MenuListBillingDocumentSource,
    type MenuListBillingDocumentType,
} from './billingDocumentPolicy';

type IssueInvoiceInput = {
    description: string;
    issuedAtMillis: number;
    orderId?: string;
    paymentId: string;
    providerInvoiceId?: string;
    providerInvoiceUrl?: string;
    source: Exclude<MenuListBillingDocumentSource, 'refund'>;
    sourceReferenceId: string;
    storeId: number;
    subscriptionId?: string;
    taxSnapshot: MenuListTaxSnapshot;
    tenantId: number;
};

type IssueCreditNoteInput = {
    issuedAtMillis: number;
    paymentId: string;
    refundAmount: number;
    refundId: string;
};

const exactEnabled = (value: string | undefined): boolean => value === 'true';
const db = () => getBillingFirestoreAdminForProduct(PRODUCT_IDS.MENULIST);

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

export const isMenuListBillingDocumentIssuanceEnabled = (): boolean => (
    FEATURE_FLAGS.ENABLE_BILLING_DOCUMENTS
    && exactEnabled(menulistServerEnv.billingDocumentsEnabled)
);

const assertIssuanceConfiguration = (): void => {
    if (!isMenuListBillingDocumentIssuanceEnabled()) {
        throw new BillingDocumentConfigurationError('MenuList billing-document issuance is disabled.');
    }
    if (menulistServerEnv.billingEInvoiceStatus !== 'not_required') {
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

const resolvePlaceOfSupply = (snapshot: MenuListTaxSnapshot): string => {
    const profile = snapshot.billingProfile;
    return profile.countryCode === 'IN'
        ? `${profile.region} (${profile.indianStateCode})`
        : `${profile.region}, ${profile.countryCode}`;
};

const buildTotals = (lineItems: MenuListBillingDocumentLineItem[]) => lineItems.reduce(
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
    current: MenuListBillingDocument,
    params: {
        currency: MenuListBillingDocument['currency'];
        customer: MenuListBillingDocument['customer'];
        issuedAtMillis: number;
        lineItems: MenuListBillingDocumentLineItem[];
        orderId?: string;
        providerInvoiceId?: string;
        providerInvoiceUrl?: string;
        relatedInvoiceId?: string;
        relatedInvoiceNumber?: string;
        seller: MenuListBillingDocument['seller'];
        source: MenuListBillingDocumentSource;
        subscriptionId?: string;
        supply: MenuListBillingDocument['supply'];
    },
    totals: MenuListBillingDocument['totals'],
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
    documentType: MenuListBillingDocumentType;
    issuedAtMillis: number;
    source: MenuListBillingDocumentSource;
    sourceReferenceId: string;
    paymentId: string;
    tenantId: number;
    storeId: number;
    currency: 'INR' | 'USD';
    seller: MenuListBillingDocument['seller'];
    customer: MenuListBillingDocument['customer'];
    supply: MenuListBillingDocument['supply'];
    lineItems: MenuListBillingDocumentLineItem[];
    orderId?: string;
    subscriptionId?: string;
    providerInvoiceId?: string;
    providerInvoiceUrl?: string;
    relatedInvoiceId?: string;
    relatedInvoiceNumber?: string;
    maxRelatedGrossAmount?: number;
    creditAllocation?: {
        originalLine: MenuListBillingDocumentLineItem;
        refundGrossAmount: number;
    };
}): Promise<MenuListBillingDocument> => {
    assertIssuanceConfiguration();
    const documentId = buildMenuListBillingDocumentId(params.documentType, params.sourceReferenceId);
    const financialYear = getMenuListFinancialYear(params.issuedAtMillis);
    const firestore = db();
    const documentRef = firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENTS).doc(documentId);
    const counterKey = `${params.seller.merchantEntityId}:${params.documentType}:${financialYear}`;
    const counterId = buildMenuListBillingDocumentId('tax_invoice', counterKey).replace(/^inv_/, 'ctr_');
    const counterRef = firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENT_COUNTERS).doc(counterId);
    const initialLineTotals = buildTotals(params.lineItems);

    const document = await firestore.runTransaction(async (tx) => {
        const existing = await tx.get(documentRef);
        if (existing.exists) {
            const current = existing.data() as MenuListBillingDocument;
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
                const credit = document.data() as Partial<MenuListBillingDocument>;
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
        const documentNumber = formatMenuListBillingDocumentNumber(params.documentType, financialYear, sequence);
        const immutable = {
            schemaVersion: MENULIST_BILLING_DOCUMENT_SCHEMA_VERSION,
            renderVersion: MENULIST_BILLING_DOCUMENT_RENDER_VERSION,
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
            pId: PRODUCT_IDS.MENULIST,
            productId: PRODUCT_IDS.MENULIST,
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
        const document: MenuListBillingDocument = {
            ...immutable,
            contentHash: buildMenuListBillingDocumentContentHash(immutable),
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
    await requestMenuListBillingDocumentDelivery(document);
    return document;
};

export const issueMenuListTaxInvoice = async (input: IssueInvoiceInput): Promise<MenuListBillingDocument | null> => {
    if (!isMenuListBillingDocumentIssuanceEnabled()) return null;
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
            ...(menulistServerEnv.billingAuthorisedSignatoryName
                ? { authorisedSignatoryName: menulistServerEnv.billingAuthorisedSignatoryName.trim().slice(0, 160) }
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

export const issueMenuListCreditNote = async (input: IssueCreditNoteInput): Promise<MenuListBillingDocument | null> => {
    if (!isMenuListBillingDocumentIssuanceEnabled()) return null;
    const firestore = db();
    const invoices = await firestore.collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .where('productId', '==', PRODUCT_IDS.MENULIST)
        .where('documentType', '==', 'tax_invoice')
        .where('paymentId', '==', input.paymentId)
        .limit(2)
        .get();
    if (invoices.size !== 1) throw new Error('Refund cannot be matched to one MenuList tax invoice.');
    const original = invoices.docs[0].data() as MenuListBillingDocument;
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

export const getMenuListBillingDocument = async (documentId: string): Promise<MenuListBillingDocument | null> => {
    const normalized = documentId.trim();
    if (!/^(inv|crn)_[a-f0-9]{40}$/.test(normalized)) return null;
    const snapshot = await db().collection(DB_COLLECTIONS.BILLING_DOCUMENTS).doc(normalized).get();
    return snapshot.exists ? snapshot.data() as MenuListBillingDocument : null;
};

export const listMenuListBillingDocuments = async (tenantId: number, storeId: number, limit = 50) => {
    const result = await db().collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .where('productId', '==', PRODUCT_IDS.MENULIST)
        .where('tenantId', '==', tenantId)
        .where('storeId', '==', storeId)
        .orderBy('issuedAtMillis', 'desc')
        .limit(Math.min(Math.max(limit, 1), 100))
        .get();
    return result.docs.map((document) => document.data() as MenuListBillingDocument);
};

export const requestMenuListBillingDocumentDelivery = async (
    document: MenuListBillingDocument,
    requestedChannels?: OwnerNotificationChannel[],
): Promise<MenuListBillingDocument['delivery']> => {
    if (!exactEnabled(menulistServerEnv.billingDocumentDeliveryEnabled)) return document.delivery;
    const documentUrl = `${OWNER_APP_URL}/api/billing-documents/${document.documentId}/pdf`;
    let result: Awaited<ReturnType<typeof enqueueOwnerNotification>>;
    try {
        result = await enqueueOwnerNotification({
            productId: PRODUCT_IDS.MENULIST,
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
                path: 'src/lib/billing/billingDocumentServer.ts:requestMenuListBillingDocumentDelivery',
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
        ? result.sent > 0
            ? 'sent'
            : result.status === 'pending' || result.status === 'processing'
                ? 'queued'
                : 'failed'
        : result.status === 'pending' || result.status === 'processing'
            ? 'queued'
            : result.status === 'delivered' || result.status === 'partial'
                ? 'sent'
                : 'failed';
    const attemptedDelivery: MenuListBillingDocument['delivery'] = {
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
            const current = currentSnapshot.data() as MenuListBillingDocument;
            const currentDelivery = current.delivery || { status: 'not_requested', attempts: 0 };
            const delivery = mergeMenuListBillingDocumentDelivery(currentDelivery, attemptedDelivery);
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
