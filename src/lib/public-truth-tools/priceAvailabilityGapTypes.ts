export const PRICE_AVAILABILITY_GAP_CHECK_IDS = [
  'source_material',
  'price_clarity',
  'currency_or_unit_context',
  'variant_or_package_prices',
  'availability_clarity',
  'unavailable_items_marked',
  'quote_or_contact_path',
  'current_customer_link',
  'external_price_availability_inspection',
] as const;

export type PriceAvailabilityGapCheckId = (typeof PRICE_AVAILABILITY_GAP_CHECK_IDS)[number];

export type PriceAvailabilityGapMode = 'self_report';

export type PriceAvailabilityGapResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type PriceAvailabilityGapStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type PriceAvailabilitySourceKind =
  | 'menu'
  | 'service_list'
  | 'catalog'
  | 'rate_card'
  | 'package_list'
  | 'price_list'
  | 'other';

export type PriceAvailabilityPricingMode =
  | 'fixed_prices'
  | 'starting_prices'
  | 'quote_based'
  | 'not_needed'
  | 'unknown';

export type PriceAvailabilityMode =
  | 'available_items_marked'
  | 'unavailable_items_marked'
  | 'seasonal_or_limited'
  | 'not_needed'
  | 'unknown';

export type PriceAvailabilityGapEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'price_text_hint'
  | 'currency_or_unit_hint'
  | 'variant_price_hint'
  | 'no_variant_hint'
  | 'availability_text_hint'
  | 'unavailable_text_hint'
  | 'quote_path_hint'
  | 'not_applicable_self_report'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface PriceAvailabilityGapInput {
  mode: PriceAvailabilityGapMode;
  businessName: string;
  cityOrArea: string;
  sourceKind: PriceAvailabilitySourceKind;
  sourceText: string;
  publicUrl: string;
  pricingMode: PriceAvailabilityPricingMode;
  availabilityMode: PriceAvailabilityMode;
  currencyOrUnitShown: boolean;
  variantOrPackagePricesShown: boolean;
  quoteOrContactShown: boolean;
}

export interface PriceAvailabilityGapItem {
  id: PriceAvailabilityGapCheckId;
  result: PriceAvailabilityGapResult;
  evidence: PriceAvailabilityGapEvidence;
  evidenceText: string;
  required: boolean;
}

export interface PriceAvailabilityGapReport {
  generatedAt: string;
  status: PriceAvailabilityGapStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: PriceAvailabilitySourceKind;
  pricingMode: PriceAvailabilityPricingMode;
  availabilityMode: PriceAvailabilityMode;
  checks: PriceAvailabilityGapItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'fix_price_availability' | 'manual_review';
  };
  boundaries: {
    externalUrlFetched: false;
    pricesVerifiedExternally: false;
    liveInventoryChecked: false;
    posChecked: false;
    orderingProviderChecked: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
