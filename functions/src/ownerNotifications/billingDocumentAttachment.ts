import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';
import { renderMenuListBillingDocumentPdf } from '../billing/billingDocumentPdf';
import type { MenuListBillingDocument } from '../billing/billingDocumentTypes';
import type { EmailOsAttachment } from '../sharedData/emailOs';
import type { WhatsAppOsSendRequest } from '../sharedData/whatsappOs';

export type OwnerNotificationBillingAttachment = EmailOsAttachment
  & NonNullable<NonNullable<WhatsAppOsSendRequest['template']>['document']>;

export async function resolveBillingDocumentAttachment(params: {
  triggerType: string;
  referenceId: string;
  tenantId: string;
  storeId: string;
}): Promise<OwnerNotificationBillingAttachment | undefined> {
  if (params.triggerType !== 'BILLING_DOCUMENT_ISSUED') return undefined;
  if (!/^(inv|crn)_[a-f0-9]{40}$/.test(params.referenceId)) {
    throw new Error('owner_notification_billing_document_reference_invalid');
  }
  const snapshot = await firestoreAdmin
    .collection(DB_COLLECTIONS.BILLING_DOCUMENTS)
    .doc(params.referenceId)
    .get();
  if (!snapshot.exists) throw new Error('owner_notification_billing_document_not_found');
  const document = snapshot.data() as MenuListBillingDocument;
  if (
    document.documentId !== params.referenceId
    || document.productId !== 'ML'
    || String(document.tenantId) !== params.tenantId
    || String(document.storeId) !== params.storeId
    || document.status !== 'issued'
  ) throw new Error('owner_notification_billing_document_scope_mismatch');
  return {
    filename: `MenuList-${document.documentNumber.replace(/[^A-Za-z0-9._-]/g, '_')}.pdf`,
    contentBase64: Buffer.from(renderMenuListBillingDocumentPdf(document)).toString('base64'),
    contentType: 'application/pdf',
  };
}
