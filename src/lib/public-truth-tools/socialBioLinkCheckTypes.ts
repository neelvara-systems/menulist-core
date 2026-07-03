export const SOCIAL_BIO_LINK_CHECK_IDS = [
  'customer_link_present',
  'instagram_bio_link',
  'facebook_page_link',
  'whatsapp_profile_link',
  'google_profile_link',
  'website_link',
  'qr_print_link',
  'old_link_cleanup',
  'customer_action',
  'external_social_inspection',
] as const;

export type SocialBioLinkCheckId = (typeof SOCIAL_BIO_LINK_CHECK_IDS)[number];

export type SocialBioLinkCheckMode = 'self_report';

export type SocialBioLinkCheckResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_checked';

export type SocialBioLinkCheckStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type SocialBioLinkCheckEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'valid_customer_url'
  | 'invalid_customer_url'
  | 'not_provided'
  | 'not_checked';

export interface SocialBioLinkCheckInput {
  mode: SocialBioLinkCheckMode;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  instagramBioUsesCustomerLink: boolean;
  facebookPageUsesCustomerLink: boolean;
  whatsappProfileUsesCustomerLink: boolean;
  googleProfileUsesCustomerLink: boolean;
  websiteUsesCustomerLink: boolean;
  qrOrPrintUsesCustomerLink: boolean;
  oldLinksRemoved: boolean;
  actionClear: boolean;
}

export interface SocialBioLinkCheckItem {
  id: SocialBioLinkCheckId;
  result: SocialBioLinkCheckResult;
  evidence: SocialBioLinkCheckEvidence;
  evidenceText: string;
  required: boolean;
}

export interface SocialBioLinkCheckReport {
  generatedAt: string;
  status: SocialBioLinkCheckStatus;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  checks: SocialBioLinkCheckItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  placementFacts: {
    placementCount: number;
    checkedSurfaceCount: number;
    customerLinkLabel: string;
    highestPriorityPlacement: 'instagram' | 'facebook' | 'whatsapp' | 'google' | 'website' | 'qr_or_print' | 'none';
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'place_customer_link' | 'clean_up_old_links' | 'review_customer_link';
  };
  boundaries: {
    customerLinkFetched: false;
    socialProfileFetched: false;
    socialProfileOpened: false;
    externalUrlFetched: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
