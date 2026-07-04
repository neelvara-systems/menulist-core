export const BUSINESS_FACTS_COPY_PACK_CHECK_IDS = [
  'business_identity',
  'public_description',
  'offer_summary',
  'hours',
  'location_or_service_area',
  'contact_path',
  'customer_action',
  'current_customer_link',
  'copy_pack',
  'external_platform_update',
] as const;

export type BusinessFactsCopyPackCheckId = (typeof BUSINESS_FACTS_COPY_PACK_CHECK_IDS)[number];

export const BUSINESS_FACTS_COPY_BLOCK_IDS = [
  'google_profile_description',
  'whatsapp_business_about',
  'social_bio',
  'website_contact_snippet',
  'staff_answer_card',
  'customer_link_share_text',
] as const;

export type BusinessFactsCopyBlockId = (typeof BUSINESS_FACTS_COPY_BLOCK_IDS)[number];

export type BusinessFactsCopyPackMode = 'self_report';

export type BusinessFactsCopyPackResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type BusinessFactsCopyPackStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type BusinessFactsCopyPackAction =
  | 'message'
  | 'call'
  | 'book'
  | 'order'
  | 'visit'
  | 'request_quote'
  | 'ask_question';

export type BusinessFactsCopyPackEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'local_format_valid'
  | 'local_format_invalid'
  | 'deterministic_copy'
  | 'external_boundary'
  | 'not_provided'
  | 'not_checked';

export interface BusinessFactsCopyPackInput {
  mode: BusinessFactsCopyPackMode;
  businessName: string;
  cityOrArea: string;
  businessType: string;
  offerSummary: string;
  shortDescription: string;
  hours: string;
  locationOrServiceArea: string;
  phoneOrWhatsapp: string;
  currentCustomerLink: string;
  actionLink: string;
  preferredAction: BusinessFactsCopyPackAction;
}

export interface BusinessFactsCopyPackItem {
  id: BusinessFactsCopyPackCheckId;
  result: BusinessFactsCopyPackResult;
  evidence: BusinessFactsCopyPackEvidence;
  evidenceText: string;
  required: boolean;
}

export interface BusinessFactsCopyBlock {
  id: BusinessFactsCopyBlockId;
  title: string;
  body: string;
  evidenceText: string;
}

export interface BusinessFactsCopyPackReport {
  generatedAt: string;
  status: BusinessFactsCopyPackStatus;
  businessName: string;
  cityOrArea: string;
  businessType: string;
  preferredAction: BusinessFactsCopyPackAction;
  checks: BusinessFactsCopyPackItem[];
  copyBlocks: BusinessFactsCopyBlock[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_business_facts' | 'manual_review';
  };
  boundaries: {
    externalUrlFetched: false;
    externalProfilesOpened: false;
    externalPlatformUpdated: false;
    reportStored: false;
    aiRewriteGenerated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
