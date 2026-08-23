import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { OWNER_NOTIFICATION_TRIGGER_TYPES } from '@data/shared/ownerNotificationRegistry';
import type { EmailOsAttachment } from '@data/shared/emailOs';
import type { WhatsAppOsSendRequest } from '@data/shared/whatsappOs';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { renderMenuListBillingDocumentPdf } from '@lib/billing/billingDocumentPdf';
import type { MenuListBillingDocument } from '@lib/billing/billingDocumentPolicy';

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
        params.productId !== PRODUCT_IDS.MENULIST
        || params.triggerType !== OWNER_NOTIFICATION_TRIGGER_TYPES.BILLING_DOCUMENT_ISSUED
        || !/^(inv|crn)_[a-f0-9]{40}$/.test(params.referenceId)
    ) return undefined;

    const snapshot = await firestoreAdmin
        .collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
        .doc(params.referenceId)
        .get();
    if (!snapshot.exists) throw new Error('owner_notification_billing_document_not_found');
    const document = snapshot.data() as MenuListBillingDocument;
    if (
        document.documentId !== params.referenceId
        || document.productId !== PRODUCT_IDS.MENULIST
        || String(document.tenantId) !== params.tenantId
        || String(document.storeId) !== params.storeId
        || document.status !== 'issued'
    ) throw new Error('owner_notification_billing_document_scope_mismatch');

    const pdf = renderMenuListBillingDocumentPdf(document);
    const safeDocumentNumber = document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_');
    return {
        filename: `MenuList-${safeDocumentNumber}.pdf`,
        contentBase64: Buffer.from(pdf).toString('base64'),
        contentType: 'application/pdf',
    };
}
