export const PUBLIC_TRUTH_CHECK_FACT_IDS = [
  'business_identity',
  'menu_or_service_source',
  'prices',
  'hours',
  'location',
  'contact',
  'customer_actions',
  'public_link',
  'photos',
  'machine_readable_source',
] as const;

export type PublicTruthCheckFactId = (typeof PUBLIC_TRUTH_CHECK_FACT_IDS)[number];

export type PublicTruthCheckMode = 'self_report' | 'menulist_owner' | 'manual_review';

export type PublicTruthCheckResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type PublicTruthCheckStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type PublicTruthCheckSourceKind =
  | 'menu'
  | 'service_list'
  | 'catalog'
  | 'rate_card'
  | 'package_list'
  | 'price_list'
  | 'other';

export type PublicTruthCheckEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'source_text_hint'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'menulist_store'
  | 'menulist_project'
  | 'menulist_summary'
  | 'menulist_public_route'
  | 'menulist_index_gate'
  | 'not_provided'
  | 'not_checked';

export interface PublicTruthCheckOwnerFacts {
  pricesShown: boolean;
  pricesNotNeeded: boolean;
  hoursShown: boolean;
  locationShown: boolean;
  contactShown: boolean;
  customerActionShown: boolean;
  photosShown: boolean;
}

export interface PublicTruthCheckInput {
  mode: PublicTruthCheckMode;
  businessName: string;
  cityOrArea: string;
  businessType?: string;
  sourceKind?: PublicTruthCheckSourceKind;
  publicUrl?: string;
  menuOrServiceText?: string;
  facts: PublicTruthCheckOwnerFacts;
}

export interface PublicTruthCheckItem {
  id: PublicTruthCheckFactId;
  result: PublicTruthCheckResult;
  evidence: PublicTruthCheckEvidence;
  evidenceText: string;
  required: boolean;
}

export interface PublicTruthCheckReport {
  generatedAt: string;
  status: PublicTruthCheckStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: PublicTruthCheckSourceKind;
  checks: PublicTruthCheckItem[];
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
    externalSourcesFetched: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
