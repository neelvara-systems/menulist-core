import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  PriceAvailabilityGapCheckId,
  PriceAvailabilityGapEvidence,
  PriceAvailabilityGapInput,
  PriceAvailabilityGapItem,
  PriceAvailabilityGapReport,
  PriceAvailabilityGapResult,
} from './priceAvailabilityGapTypes';

const REQUIRED_CHECKS = new Set<PriceAvailabilityGapCheckId>([
  'source_material',
  'price_clarity',
  'currency_or_unit_context',
  'availability_clarity',
  'quote_or_contact_path',
  'current_customer_link',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSourceText(value?: string): string {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function hasUsefulSource(value: string): boolean {
  return value.replace(/\s+/g, ' ').trim().length >= 40;
}

function hasPriceHint(value: string): boolean {
  return /(?:₹|\$|€|£|\b(?:rs|inr|usd|aed|gbp|eur)\b|\d+\s?(?:\/-|rs|inr|₹)|\d+\.\d{2}|\bfrom\s+\d+|\bstarting(?:\s+at)?\b|\bprice\b|\brate\b|\bcost\b|\bfee\b)/i.test(value);
}

function hasCurrencyOrUnitHint(value: string): boolean {
  return /(?:₹|\$|€|£|\b(?:rs|inr|usd|aed|gbp|eur)\b|\bper\b|\/\s?(?:kg|g|gram|hour|hr|person|plate|piece|pc|visit|session|month|day)\b|\beach\b|\bserves\b|\bstarting(?:\s+at)?\b)/i.test(value);
}

function hasVariantHint(value: string): boolean {
  return /(?:\bsmall\b|\bmedium\b|\blarge\b|\bregular\b|\bhalf\b|\bfull\b|\bsize\b|\bvariant\b|\boption\b|\bcombo\b|\bpackage\b|\baddon\b|\badd-on\b|\bset\b|\bserves\b|\bper person\b)/i.test(value);
}

function hasVariantPriceHint(value: string): boolean {
  return hasVariantHint(value) && hasPriceHint(value);
}

function hasAvailabilityHint(value: string): boolean {
  return /(?:\bavailable\b|\bin stock\b|\bout of stock\b|\bsold out\b|\bunavailable\b|\bseasonal\b|\blimited\b|\btoday only\b|\bpre[- ]?order\b|\bback soon\b|\bnot available\b|\bcurrently available\b)/i.test(value);
}

function hasUnavailableHint(value: string): boolean {
  return /(?:\bout of stock\b|\bsold out\b|\bunavailable\b|\bnot available\b|\bback soon\b|\btemporarily unavailable\b|\bseasonal\b|\blimited\b)/i.test(value);
}

function hasQuotePathHint(value: string): boolean {
  return /(?:\bquote\b|\bestimate\b|\bcall\b|\bwhatsapp\b|\bmessage\b|\bcontact\b|\bask\b|\binquiry\b|\benquire\b|\bbook\b|\bconsultation\b|\bvisit\b|\border\b)/i.test(value);
}

function getPriceAvailabilityEvidenceText(evidence: PriceAvailabilityGapEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-pasted source text and entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'price_text_hint':
      return 'Checked price, rate, cost, fee, and starting-price words in the pasted text only.';
    case 'currency_or_unit_hint':
      return 'Checked currency, unit, serving, and per-unit wording in the pasted text only.';
    case 'variant_price_hint':
      return 'Checked size, package, option, combo, and variant price wording in the pasted text only.';
    case 'availability_text_hint':
      return 'Checked visible availability wording in the pasted text only. Live stock was not checked.';
    case 'unavailable_text_hint':
      return 'Checked sold-out, out-of-stock, unavailable, seasonal, and limited wording in the pasted text only.';
    case 'quote_path_hint':
      return 'Checked quote, contact, call, WhatsApp, message, booking, and inquiry words in the pasted text only.';
    case 'not_applicable_self_report':
      return 'Owner marked this as not needed for the current public source.';
    case 'valid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No pasted source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. External URLs, POS systems, ordering providers, live inventory, and AI/search answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: PriceAvailabilityGapCheckId,
  result: PriceAvailabilityGapResult,
  evidence: PriceAvailabilityGapEvidence,
): PriceAvailabilityGapItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getPriceAvailabilityEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: PriceAvailabilityGapItem[]): PriceAvailabilityGapReport['summary'] {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present' || check.result === 'not_applicable') {
        summary.present += 1;
      } else if (check.result === 'missing') {
        summary.missing += 1;
      } else if (check.result === 'unclear') {
        summary.unclear += 1;
      } else if (check.result === 'not_checked') {
        summary.notChecked += 1;
      }

      return summary;
    },
    { present: 0, missing: 0, unclear: 0, notChecked: 0 },
  );
}

function getStatus(checks: PriceAvailabilityGapItem[]): PriceAvailabilityGapReport['status'] {
  const sourceMaterial = checks.find((check) => check.id === 'source_material');
  const priceClarity = checks.find((check) => check.id === 'price_clarity');

  if (sourceMaterial?.result !== 'present') return 'missing_basics';
  if (priceClarity?.result === 'missing' || priceClarity?.result === 'not_checked') {
    return 'missing_basics';
  }

  const blockingChecks: PriceAvailabilityGapCheckId[] = [
    'price_clarity',
    'currency_or_unit_context',
    'availability_clarity',
    'quote_or_contact_path',
    'current_customer_link',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: PriceAvailabilityGapReport['status']): PriceAvailabilityGapReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'fix_price_availability';
}

export function buildPriceAvailabilityGapReport(input: PriceAvailabilityGapInput): PriceAvailabilityGapReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const sourceText = normalizeSourceText(input.sourceText);
  const publicUrl = trimToSingleLine(input.publicUrl);
  const sourceExists = hasUsefulSource(sourceText);
  const hasPublicUrl = publicUrl.length > 0;
  const validPublicUrl = isValidHttpUrl(publicUrl);
  const priceHint = hasPriceHint(sourceText);
  const currencyOrUnitHint = hasCurrencyOrUnitHint(sourceText);
  const variantHint = hasVariantHint(sourceText);
  const variantPriceHint = hasVariantPriceHint(sourceText);
  const availabilityHint = hasAvailabilityHint(sourceText);
  const unavailableHint = hasUnavailableHint(sourceText);
  const quotePathHint = hasQuotePathHint(sourceText);
  const pricingMode = input.pricingMode || 'unknown';
  const availabilityMode = input.availabilityMode || 'unknown';
  const isQuoteBased = pricingMode === 'quote_based';
  const priceNotNeeded = pricingMode === 'not_needed';
  const hasSelectedPrices = pricingMode === 'fixed_prices' || pricingMode === 'starting_prices';
  const hasSelectedAvailability = availabilityMode === 'available_items_marked'
    || availabilityMode === 'unavailable_items_marked'
    || availabilityMode === 'seasonal_or_limited';
  const availabilityNotNeeded = availabilityMode === 'not_needed';

  const checks: PriceAvailabilityGapItem[] = [
    makeCheck(
      'source_material',
      sourceExists ? 'present' : 'missing',
      sourceExists ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'price_clarity',
      priceNotNeeded
        ? 'not_applicable'
        : isQuoteBased
          ? (input.quoteOrContactShown || quotePathHint ? 'present' : 'unclear')
          : hasSelectedPrices || priceHint
            ? 'present'
            : sourceExists
              ? 'missing'
              : 'not_checked',
      priceNotNeeded
        ? 'not_applicable_self_report'
        : isQuoteBased && input.quoteOrContactShown
          ? 'owner_selected'
          : isQuoteBased && quotePathHint
            ? 'quote_path_hint'
            : hasSelectedPrices
              ? 'owner_selected'
              : priceHint
                ? 'price_text_hint'
                : sourceExists
                  ? 'not_provided'
                  : 'not_checked',
    ),
    makeCheck(
      'currency_or_unit_context',
      priceNotNeeded || isQuoteBased
        ? 'not_applicable'
        : input.currencyOrUnitShown || currencyOrUnitHint
          ? 'present'
          : sourceExists
            ? 'unclear'
            : 'not_checked',
      priceNotNeeded || isQuoteBased
        ? 'not_applicable_self_report'
        : input.currencyOrUnitShown
          ? 'owner_selected'
          : currencyOrUnitHint
            ? 'currency_or_unit_hint'
            : sourceExists
              ? 'not_provided'
              : 'not_checked',
    ),
    makeCheck(
      'variant_or_package_prices',
      input.variantOrPackagePricesShown || variantPriceHint
        ? 'present'
        : variantHint
          ? 'unclear'
          : 'not_applicable',
      input.variantOrPackagePricesShown
        ? 'owner_selected'
        : variantPriceHint
          ? 'variant_price_hint'
          : variantHint
            ? 'owner_entered'
            : 'not_applicable_self_report',
    ),
    makeCheck(
      'availability_clarity',
      availabilityNotNeeded
        ? 'not_applicable'
        : hasSelectedAvailability || availabilityHint
          ? 'present'
          : sourceExists
            ? 'unclear'
            : 'not_checked',
      availabilityNotNeeded
        ? 'not_applicable_self_report'
        : hasSelectedAvailability
          ? 'owner_selected'
          : availabilityHint
            ? 'availability_text_hint'
            : sourceExists
              ? 'not_provided'
              : 'not_checked',
    ),
    makeCheck(
      'unavailable_items_marked',
      availabilityMode === 'unavailable_items_marked' || availabilityMode === 'seasonal_or_limited' || unavailableHint
        ? 'present'
        : availabilityNotNeeded || availabilityMode === 'available_items_marked'
          ? 'not_applicable'
          : sourceExists
            ? 'not_checked'
            : 'not_checked',
      availabilityMode === 'unavailable_items_marked' || availabilityMode === 'seasonal_or_limited'
        ? 'owner_selected'
        : unavailableHint
          ? 'unavailable_text_hint'
          : availabilityNotNeeded || availabilityMode === 'available_items_marked'
            ? 'not_applicable_self_report'
            : 'not_checked',
    ),
    makeCheck(
      'quote_or_contact_path',
      input.quoteOrContactShown || quotePathHint
        ? 'present'
        : isQuoteBased
          ? 'missing'
          : sourceExists
            ? 'unclear'
            : 'not_checked',
      input.quoteOrContactShown
        ? 'owner_selected'
        : quotePathHint
          ? 'quote_path_hint'
          : sourceExists
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'current_customer_link',
      validPublicUrl ? 'present' : hasPublicUrl ? 'unclear' : 'missing',
      validPublicUrl ? 'valid_public_url' : hasPublicUrl ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck('external_price_availability_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind: input.sourceKind || 'menu',
    pricingMode,
    availabilityMode,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      externalUrlFetched: false,
      pricesVerifiedExternally: false,
      liveInventoryChecked: false,
      posChecked: false,
      orderingProviderChecked: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
