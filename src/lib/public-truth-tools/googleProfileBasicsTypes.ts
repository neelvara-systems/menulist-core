export const GOOGLE_PROFILE_BASICS_CHECK_IDS = [
  'profile_access',
  'business_identity',
  'category',
  'address_or_service_area',
  'hours',
  'contact_and_website',
  'menu_or_service_link',
  'customer_action_links',
  'photos',
  'google_profile_inspection',
] as const;

export type GoogleProfileBasicsCheckId = (typeof GOOGLE_PROFILE_BASICS_CHECK_IDS)[number];

export type GoogleProfileBasicsMode = 'self_report';

export type GoogleProfileBasicsResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type GoogleProfileBasicsStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type GoogleProfileBasicsEvidence =
  | 'owner_selected'
  | 'owner_entered'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface GoogleProfileBasicsInput {
  mode: GoogleProfileBasicsMode;
  businessName: string;
  cityOrArea: string;
  profileClaimedOrVerified: boolean;
  nameMatchesRealWorld: boolean;
  primaryCategorySet: boolean;
  addressOrServiceAreaClear: boolean;
  hoursCurrent: boolean;
  phoneOrMessagePresent: boolean;
  websiteOrCustomerLink: string;
  menuOrServiceLinkPresent: boolean;
  orderBookingOrActionPresent: boolean;
  photosPresent: boolean;
}

export interface GoogleProfileBasicsItem {
  id: GoogleProfileBasicsCheckId;
  result: GoogleProfileBasicsResult;
  evidence: GoogleProfileBasicsEvidence;
  evidenceText: string;
  required: boolean;
}

export interface GoogleProfileBasicsReport {
  generatedAt: string;
  status: GoogleProfileBasicsStatus;
  businessName: string;
  cityOrArea: string;
  checks: GoogleProfileBasicsItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_profile_basics' | 'manual_review';
  };
  boundaries: {
    googleFetched: false;
    googleProfileOpened: false;
    googleProfileUpdated: false;
    externalUrlFetched: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
