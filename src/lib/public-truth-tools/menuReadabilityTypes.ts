export const MENU_READABILITY_CHECK_IDS = [
  'source_material',
  'categories_or_sections',
  'items_or_services',
  'prices_or_rates',
  'descriptions_or_details',
  'customer_action',
  'current_customer_link',
] as const;

export type MenuReadabilityCheckId = (typeof MENU_READABILITY_CHECK_IDS)[number];

export type MenuReadabilityMode = 'self_report';

export type MenuReadabilityResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type MenuReadabilityStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type MenuReadabilitySourceKind =
  | 'menu'
  | 'service_list'
  | 'catalog'
  | 'rate_card'
  | 'package_list'
  | 'price_list'
  | 'other';

export type MenuReadabilityEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'text_structure_hint'
  | 'item_line_hint'
  | 'price_hint'
  | 'description_hint'
  | 'action_hint'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface MenuReadabilityInput {
  mode: MenuReadabilityMode;
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuReadabilitySourceKind;
  sourceText: string;
  publicUrl: string;
  categoriesClear: boolean;
  pricesShown: boolean;
  pricesNotNeeded: boolean;
  descriptionsHelpful: boolean;
  notesShown: boolean;
  customerActionShown: boolean;
}

export interface MenuReadabilityItem {
  id: MenuReadabilityCheckId;
  result: MenuReadabilityResult;
  evidence: MenuReadabilityEvidence;
  evidenceText: string;
  required: boolean;
}

export interface MenuReadabilityReport {
  generatedAt: string;
  status: MenuReadabilityStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: MenuReadabilitySourceKind;
  checks: MenuReadabilityItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'clean_up_source' | 'manual_review';
  };
  boundaries: {
    uploadedFileParsed: false;
    externalUrlFetched: false;
    aiRewriteGenerated: false;
    aiOrSearchChecked: false;
    externalPlatformUpdated: false;
    rankingPromise: false;
  };
}
