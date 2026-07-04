export const WHATSAPP_REPLY_PACK_CHECK_IDS = [
  'business_identity',
  'whatsapp_number',
  'current_customer_link',
  'offer_summary',
  'hours_expectation',
  'action_path',
  'payment_context',
  'delivery_pickup_context',
  'reply_pack',
  'wa_me_preview',
  'message_delivery',
] as const;

export const WHATSAPP_REPLY_PACK_BLOCK_IDS = [
  'greeting_reply',
  'hours_reply',
  'menu_service_reply',
  'price_payment_reply',
  'order_booking_reply',
  'delivery_pickup_reply',
  'fallback_reply',
  'customer_link_reply',
] as const;

export type WhatsAppReplyPackCheckId = (typeof WHATSAPP_REPLY_PACK_CHECK_IDS)[number];
export type WhatsAppReplyPackBlockId = (typeof WHATSAPP_REPLY_PACK_BLOCK_IDS)[number];

export type WhatsAppReplyPackMode = 'self_report';

export type WhatsAppReplyPackResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type WhatsAppReplyPackStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type WhatsAppReplyPackAction =
  | 'ask_question'
  | 'book'
  | 'order'
  | 'request_quote'
  | 'visit';

export type WhatsAppReplyPackEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'local_phone_format_valid'
  | 'local_phone_format_unclear'
  | 'local_url_format_valid'
  | 'local_url_format_invalid'
  | 'deterministic_copy'
  | 'external_boundary'
  | 'not_provided'
  | 'not_checked';

export interface WhatsAppReplyPackInput {
  mode: WhatsAppReplyPackMode;
  actionLink: string;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  deliveryOrPickup: string;
  hours: string;
  locationOrServiceArea: string;
  offerSummary: string;
  paymentInfo: string;
  preferredAction: WhatsAppReplyPackAction;
  responseTime: string;
  whatsappNumber: string;
}

export interface WhatsAppReplyPackItem {
  id: WhatsAppReplyPackCheckId;
  result: WhatsAppReplyPackResult;
  evidence: WhatsAppReplyPackEvidence;
  evidenceText: string;
  required: boolean;
}

export interface WhatsAppReplyBlock {
  id: WhatsAppReplyPackBlockId;
  title: string;
  body: string;
  evidenceText: string;
}

export interface WhatsAppReplyPackReport {
  generatedAt: string;
  status: WhatsAppReplyPackStatus;
  businessName: string;
  cityOrArea: string;
  preferredAction: WhatsAppReplyPackAction;
  previewLink: string | null;
  checks: WhatsAppReplyPackItem[];
  copyBlocks: WhatsAppReplyBlock[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_reply_facts' | 'manual_review';
  };
  boundaries: {
    messageSent: false;
    whatsappApiCalled: false;
    phoneNumberVerified: false;
    whatsappLinkOpened: false;
    externalUrlFetched: false;
    externalPlatformUpdated: false;
    reportStored: false;
    aiRewriteGenerated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
