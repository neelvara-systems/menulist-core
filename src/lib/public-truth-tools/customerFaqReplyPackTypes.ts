export const CUSTOMER_FAQ_REPLY_PACK_CHECK_IDS = [
  'business_identity',
  'customer_questions',
  'answer_source',
  'current_customer_link',
  'menu_service_context',
  'hours_context',
  'price_context',
  'location_contact_context',
  'action_context',
  'faq_reply_pack',
  'automation_boundary',
] as const;

export const CUSTOMER_FAQ_REPLY_PACK_BLOCK_IDS = [
  'faq_overview',
  'menu_service_answer',
  'hours_answer',
  'price_answer',
  'location_contact_answer',
  'order_booking_answer',
  'availability_notes_answer',
  'fallback_answer',
] as const;

export type CustomerFaqReplyPackCheckId = (typeof CUSTOMER_FAQ_REPLY_PACK_CHECK_IDS)[number];
export type CustomerFaqReplyBlockId = (typeof CUSTOMER_FAQ_REPLY_PACK_BLOCK_IDS)[number];

export type CustomerFaqReplyPackMode = 'self_report';

export type CustomerFaqReplyPackResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type CustomerFaqReplyPackStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type CustomerFaqReplyPackAction =
  | 'answer_question'
  | 'book'
  | 'order'
  | 'request_quote'
  | 'visit';

export type CustomerFaqReplyPackEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'local_url_format_valid'
  | 'local_url_format_invalid'
  | 'deterministic_copy'
  | 'automation_boundary'
  | 'not_provided'
  | 'not_checked';

export interface CustomerFaqReplyPackInput {
  mode: CustomerFaqReplyPackMode;
  actionLink: string;
  answerSource: string;
  availabilityNotes: string;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  customerQuestions: string;
  hours: string;
  locationContact: string;
  menuOrServices: string;
  preferredAction: CustomerFaqReplyPackAction;
  prices: string;
}

export interface CustomerFaqReplyPackItem {
  id: CustomerFaqReplyPackCheckId;
  result: CustomerFaqReplyPackResult;
  evidence: CustomerFaqReplyPackEvidence;
  evidenceText: string;
  required: boolean;
}

export interface CustomerFaqReplyBlock {
  id: CustomerFaqReplyBlockId;
  title: string;
  body: string;
  evidenceText: string;
}

export interface CustomerFaqReplyPackReport {
  generatedAt: string;
  status: CustomerFaqReplyPackStatus;
  businessName: string;
  cityOrArea: string;
  preferredAction: CustomerFaqReplyPackAction;
  checks: CustomerFaqReplyPackItem[];
  copyBlocks: CustomerFaqReplyBlock[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_faq_facts' | 'manual_review';
  };
  boundaries: {
    conversationLogsRead: false;
    chatbotCreated: false;
    messageSent: false;
    automationConfigured: false;
    externalUrlFetched: false;
    externalPlatformUpdated: false;
    reportStored: false;
    aiAnswerGenerated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
