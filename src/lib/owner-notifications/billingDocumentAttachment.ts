import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { OWNER_NOTIFICATION_TRIGGER_TYPES } from '@data/shared/ownerNotificationRegistry';
import type { EmailOsAttachment } from '@data/shared/emailOs';
import type { WhatsAppOsSendRequest } from '@data/shared/whatsappOs';
import { getBillingFirestoreAdminForProduct } from '@lib/billing/productBillingServer';
import { renderMenuListBillingDocumentPdf } from '@lib/billing/billingDocumentPdf';
import type { MenuListBillingDocument } from '@lib/billing/billingDocumentPolicy';
import { renderAnswerlatticeBillingDocumentPdf } from '@lib/billing/answerlatticeBillingDocumentPdf';
import type { AnswerlatticeBillingDocument } from '@lib/billing/answerlatticeBillingDocumentPolicy';

export type OwnerNotificationBillingAttachment = EmailOsAttachment
    & NonNullable<NonNullable<WhatsAppOsSendRequest['template']>['document']>;

export async function resolveOwnerNotificationBillingAttachment(params: {
    productId: string;
    triggerType: string;
    referenceId: string;
    tenantId: string;
    storeId?: string;
}): Promise<OwnerNotificationBillingAttachment | undefined> {
    if (
        (params.productId !== PRODUCT_IDS.MENULIST && params.productId !== PRODUCT_IDS.ANSWERLATTICE)
        || params.triggerType !== OWNER_NOTIFICATION_TRIGGER_TYPES.BILLING_DOCUMENT_ISSUED
        || !/^(inv|crn)_[a-f0-9]{40}$/.test(params.referenceId)
    ) return undefined;

    const productId = params.productId === PRODUCT_IDS.ANSWERLATTICE
        ? PRODUCT_IDS.ANSWERLATTICE
        : PRODUCT_IDS.MENULIST;
    const snapshot = await getBillingFirestoreAdminForProduct(productId)
        .collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .doc(params.referenceId)
        .get();
    if (!snapshot.exists) throw new Error('owner_notification_billing_document_not_found');
    const document = snapshot.data() as MenuListBillingDocument | AnswerlatticeBillingDocument;
    if (
        document.documentId !== params.referenceId
        || document.productId !== productId
        || String(document.tenantId) !== params.tenantId
        || String(document.storeId) !== params.storeId
        || document.status !== 'issued'
    ) throw new Error('owner_notification_billing_document_scope_mismatch');

    const pdf = productId === PRODUCT_IDS.ANSWERLATTICE
        ? renderAnswerlatticeBillingDocumentPdf(document as AnswerlatticeBillingDocument)
        : renderMenuListBillingDocumentPdf(document as MenuListBillingDocument);
    const safeDocumentNumber = document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_');
    return {
        filename: `${productId === PRODUCT_IDS.ANSWERLATTICE ? 'Answerlattice' : 'MenuList'}-${safeDocumentNumber}.pdf`,
        contentBase64: Buffer.from(pdf).toString('base64'),
        contentType: 'application/pdf',
    };
}
