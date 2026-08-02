import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import {
  boundPublicTruthToolInput,
  PUBLIC_TRUTH_TOOL_INPUT_LIMITS,
  type PublicTruthToolInputLimit,
} from './publicTruthToolInputLimits';
import type {
  MenuReadabilityCheckId,
  MenuReadabilityEvidence,
  MenuReadabilityInput,
  MenuReadabilityItem,
  MenuReadabilityReport,
  MenuReadabilityResult,
} from './menuReadabilityTypes';

const REQUIRED_CHECKS = new Set<MenuReadabilityCheckId>([
  'source_material',
  'items_or_services',
  'prices_or_rates',
  'customer_action',
]);

function trimToSingleLine(
  value?: string,
  maxLength: PublicTruthToolInputLimit = PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText,
): string {
  return boundPublicTruthToolInput(value, maxLength).replace(/\s+/g, ' ').trim();
}

function normalizeSourceText(value?: string): string {
  return boundPublicTruthToolInput(value, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText)
    .replace(/\r\n/g, '\n')
    .trim();
}

function getUsefulLines(value: string): string[] {
  return value
    .split(/\n|;|\u2022|•/g)
    .map((line) => line.replace(/^[-*–—\d.)\s]+/, '').trim())
    .filter((line) => line.length >= 3);
}

function hasUsefulSource(value: string): boolean {
  return value.replace(/\s+/g, ' ').trim().length >= 40;
}

function hasCategoryHint(value: string): boolean {
  const lines = getUsefulLines(value);
  const hasHeadingLine = lines.some((line) => {
    const wordCount = line.split(/\s+/).filter(Boolean).length;
    return wordCount <= 4 && /:?$/.test(line) && !hasPriceHint(line);
  });

  return hasHeadingLine
    || /(?:\bbreakfast\b|\blunch\b|\bdinner\b|\bdrinks?\b|\bdesserts?\b|\bservices?\b|\bpackages?\b|\brates?\b|\bcatalog\b|\bveg\b|\bnon[-\s]?veg\b|\bstarters?\b|\bmains?\b)/i.test(value);
}

function hasItemLineHint(value: string): boolean {
  const lines = getUsefulLines(value);
  if (lines.length >= 3) return true;

  const commaSeparatedItems = value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
  return commaSeparatedItems.length >= 4;
}

function hasPriceHint(value: string): boolean {
  return /(?:₹|\$|€|£|\b(?:rs|inr|usd|aed|gbp|eur)\b|\d+\s?(?:\/-|rs|inr|₹)|\d+\.\d{2})/i.test(value);
}

function hasDescriptionHint(value: string): boolean {
  const lines = getUsefulLines(value);
  const detailedLines = lines.filter((line) => line.split(/\s+/).filter(Boolean).length >= 5);
  return detailedLines.length >= 2 || value.replace(/\s+/g, ' ').trim().length >= 180;
}

function hasActionHint(value: string): boolean {
  return /(?:\border\b|\bbook\b|\breserve\b|\bcall\b|\bwhatsapp\b|\bmessage\b|\bdirections?\b|\bvisit\b|\bcontact\b|\bdelivery\b|\bpickup\b|\btap\b|\blink\b)/i.test(value);
}

function makeCheck(
  id: MenuReadabilityCheckId,
  result: MenuReadabilityResult,
  evidence: MenuReadabilityEvidence,
): MenuReadabilityItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getMenuReadabilityEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function getMenuReadabilityEvidenceText(evidence: MenuReadabilityEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-pasted text and entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'text_structure_hint':
      return 'Checked section-like words and line structure in the pasted text only.';
    case 'item_line_hint':
      return 'Checked item/service-like lines in the pasted text only.';
    case 'price_hint':
      return 'Checked price/rate hints in the pasted text only.';
    case 'description_hint':
      return 'Checked description length and detail in the pasted text only.';
    case 'action_hint':
      return 'Checked action words in the pasted text and entered link only.';
    case 'valid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No pasted source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. Files are not uploaded, links are not opened, and AI rewrite is not generated.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function countSummary(checks: MenuReadabilityItem[]): MenuReadabilityReport['summary'] {
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

function getStatus(checks: MenuReadabilityItem[]): MenuReadabilityReport['status'] {
  const sourceMaterial = checks.find((check) => check.id === 'source_material');
  const itemsOrServices = checks.find((check) => check.id === 'items_or_services');

  if (sourceMaterial?.result !== 'present') return 'missing_basics';
  if (itemsOrServices?.result === 'missing' || itemsOrServices?.result === 'not_checked') {
    return 'missing_basics';
  }

  const blockingClarity = checks.some((check) =>
    [
      'categories_or_sections',
      'prices_or_rates',
      'descriptions_or_details',
      'customer_action',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'not_checked' || check.result === 'unclear')
  );
  const unclearRequired = checks.some((check) => check.required && check.result === 'unclear');

  return blockingClarity || unclearRequired ? 'unclear' : 'ready';
}

function getNextActionType(status: MenuReadabilityReport['status']): MenuReadabilityReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'clean_up_source';
}

export function buildMenuReadabilityReport(input: MenuReadabilityInput): MenuReadabilityReport {
  const businessName = trimToSingleLine(input.businessName, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea);
  const sourceText = normalizeSourceText(input.sourceText);
  const publicUrl = trimToSingleLine(input.publicUrl, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const sourceExists = hasUsefulSource(sourceText);
  const hasPublicUrl = publicUrl.length > 0;
  const validPublicUrl = isValidHttpUrl(publicUrl, 'menu_readability_public_url');
  const priceHint = hasPriceHint(sourceText);
  const actionHint = hasActionHint(sourceText);

  const checks: MenuReadabilityItem[] = [
    makeCheck(
      'source_material',
      sourceExists ? 'present' : 'missing',
      sourceExists ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'categories_or_sections',
      input.categoriesClear || hasCategoryHint(sourceText)
        ? 'present'
        : sourceExists
          ? 'unclear'
          : 'not_checked',
      input.categoriesClear
        ? 'owner_selected'
        : hasCategoryHint(sourceText)
          ? 'text_structure_hint'
          : sourceExists
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'items_or_services',
      hasItemLineHint(sourceText)
        ? 'present'
        : sourceExists
          ? 'missing'
          : 'not_checked',
      hasItemLineHint(sourceText)
        ? 'item_line_hint'
        : sourceExists
          ? 'not_provided'
          : 'not_checked',
    ),
    makeCheck(
      'prices_or_rates',
      input.pricesNotNeeded
        ? 'not_applicable'
        : input.pricesShown || priceHint
          ? 'present'
          : sourceExists
            ? 'missing'
            : 'not_checked',
      input.pricesNotNeeded || input.pricesShown
        ? 'owner_selected'
        : priceHint
          ? 'price_hint'
          : sourceExists
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'descriptions_or_details',
      input.descriptionsHelpful || input.notesShown || hasDescriptionHint(sourceText)
        ? 'present'
        : sourceExists
          ? 'unclear'
          : 'not_checked',
      input.descriptionsHelpful || input.notesShown
        ? 'owner_selected'
        : hasDescriptionHint(sourceText)
          ? 'description_hint'
          : sourceExists
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'customer_action',
      input.customerActionShown || actionHint
        ? 'present'
        : sourceExists
          ? 'missing'
          : 'not_checked',
      input.customerActionShown
        ? 'owner_selected'
        : actionHint
          ? 'action_hint'
          : sourceExists
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'current_customer_link',
      validPublicUrl ? 'present' : hasPublicUrl ? 'unclear' : 'missing',
      validPublicUrl ? 'valid_public_url' : hasPublicUrl ? 'invalid_public_url' : 'not_provided',
    ),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind: input.sourceKind || 'menu',
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      uploadedFileParsed: false,
      externalUrlFetched: false,
      aiRewriteGenerated: false,
      aiOrSearchChecked: false,
      externalPlatformUpdated: false,
      rankingPromise: false,
    },
  };
}
