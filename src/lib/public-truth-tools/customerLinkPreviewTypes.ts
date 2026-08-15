export const CUSTOMER_LINK_PREVIEW_CHECK_IDS = [
  'customer_link_present',
  'business_identity',
  'menu_or_service_summary',
  'prices_or_rates',
  'hours',
  'location',
  'contact',
  'customer_action',
  'visual_identity',
  'mobile_readiness',
  'external_link_inspection',
] as const;

export type CustomerLinkPreviewCheckId = (typeof CUSTOMER_LINK_PREVIEW_CHECK_IDS)[number];

export type CustomerLinkPreviewMode = 'self_report';

export type CustomerLinkPreviewResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type CustomerLinkPreviewStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type CustomerLinkPreviewBusinessKind =
  | 'restaurant'
  | 'service'
  | 'retail'
  | 'clinic'
  | 'salon'
  | 'other';

export type CustomerLinkPreviewEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'owner_business_kind'
  | 'valid_customer_url'
  | 'invalid_customer_url'
  | 'not_provided'
  | 'not_checked';

export interface CustomerLinkPreviewInput {
  mode: CustomerLinkPreviewMode;
  businessName: string;
  cityOrArea: string;
  businessKind: CustomerLinkPreviewBusinessKind;
  currentCustomerLink: string;
  businessNameVisible: boolean;
  menuOrServiceVisible: boolean;
  pricesOrRatesVisible: boolean;
  hoursVisible: boolean;
  locationVisible: boolean;
  contactVisible: boolean;
  customerActionVisible: boolean;
  photosOrIdentityVisible: boolean;
  mobileFriendly: boolean;
}

export interface CustomerLinkPreviewItem {
  id: CustomerLinkPreviewCheckId;
  result: CustomerLinkPreviewResult;
  evidence: CustomerLinkPreviewEvidence;
  evidenceText: string;
  required: boolean;
}

export interface CustomerLinkPreviewReport {
  generatedAt: string;
  status: CustomerLinkPreviewStatus;
  businessName: string;
  cityOrArea: string;
  businessKind: CustomerLinkPreviewBusinessKind;
  checks: CustomerLinkPreviewItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  previewFacts: {
    headline: string;
    subline: string;
    visibleFactCount: number;
    customerLinkLabel: string;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'complete_customer_facts' | 'review_customer_link';
  };
  boundaries: {
    customerLinkFetched: false;
    previewRenderedFromExternalSource: false;
    externalUrlFetched: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
