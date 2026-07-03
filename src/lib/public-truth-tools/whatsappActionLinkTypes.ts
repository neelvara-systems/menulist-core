export const WHATSAPP_ACTION_LINK_CHECK_IDS = [
  'whatsapp_number',
  'click_to_chat_format',
  'message_intent',
  'suggested_message',
  'menu_or_service_link',
  'hours_expectation',
  'fallback_action',
  'message_delivery',
] as const;

export type WhatsAppActionLinkCheckId = (typeof WHATSAPP_ACTION_LINK_CHECK_IDS)[number];

export type WhatsAppActionLinkMode = 'self_report';

export type WhatsAppActionLinkResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type WhatsAppActionLinkStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type WhatsAppActionMessageIntent =
  | 'ask_question'
  | 'order'
  | 'book'
  | 'quote'
  | 'support'
  | 'other';

export type WhatsAppActionLinkEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'valid_phone_format'
  | 'unclear_phone_format'
  | 'valid_whatsapp_link_format'
  | 'invalid_whatsapp_link_format'
  | 'generated_click_to_chat_format'
  | 'message_text_hint'
  | 'customer_link_format'
  | 'not_provided'
  | 'not_checked';

export interface WhatsAppActionLinkInput {
  mode: WhatsAppActionLinkMode;
  businessName: string;
  cityOrArea: string;
  whatsappNumber: string;
  existingWhatsappLink: string;
  currentCustomerLink: string;
  messageIntent: WhatsAppActionMessageIntent;
  suggestedMessage: string;
  menuOrServiceLinkAttached: boolean;
  hoursExpectationSet: boolean;
  fallbackActionShown: boolean;
}

export interface WhatsAppActionLinkItem {
  id: WhatsAppActionLinkCheckId;
  result: WhatsAppActionLinkResult;
  evidence: WhatsAppActionLinkEvidence;
  evidenceText: string;
  required: boolean;
}

export interface WhatsAppActionLinkReport {
  generatedAt: string;
  status: WhatsAppActionLinkStatus;
  businessName: string;
  cityOrArea: string;
  messageIntent: WhatsAppActionMessageIntent;
  previewLink: string | null;
  checks: WhatsAppActionLinkItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'fix_whatsapp_action' | 'manual_review';
  };
  boundaries: {
    messageSent: false;
    phoneNumberVerified: false;
    whatsappLinkOpened: false;
    externalUrlFetched: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
