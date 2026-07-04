import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  PublicTruthCheckEvidence,
  PublicTruthCheckFactId,
  PublicTruthCheckInput,
  PublicTruthCheckItem,
  PublicTruthCheckReport,
  PublicTruthCheckResult,
  PublicTruthCheckSourceKind,
} from './publicTruthCheckTypes';

const DEFAULT_SOURCE_KIND: PublicTruthCheckSourceKind = 'menu';
const REQUIRED_FACTS = new Set<PublicTruthCheckFactId>([
  'business_identity',
  'menu_or_service_source',
  'hours',
  'location',
  'contact',
  'customer_actions',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeTextarea(value?: string): string {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function hasUsefulText(value: string): boolean {
  return value.trim().length >= 20;
}

function hasPriceHint(value: string): boolean {
  return /(?:₹|\$|€|£|\b(?:rs|inr|usd|aed|gbp|eur)\b|\d+\s?(?:\/-|rs|inr|₹)|\d+\.\d{2})/i.test(value);
}

function hasHoursHint(value: string): boolean {
  return /(?:\bopen\b|\bclosed\b|\bhours?\b|\btiming\b|\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|\d{1,2}(?::\d{2})?\s?(?:am|pm)\b)/i.test(value);
}

function hasContactHint(value: string): boolean {
  return /(?:\bcall\b|\bphone\b|\bwhatsapp\b|\bcontact\b|mailto:|[\w.%+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d)/i.test(value);
}

function hasActionHint(value: string): boolean {
  return /(?:\border\b|\bbook\b|\breserve\b|\bcall\b|\bwhatsapp\b|\bdirections?\b|\bvisit\b|\bmessage\b|\bshop\b|\bbuy\b)/i.test(value);
}

function hasLocationHint(value: string, cityOrArea: string): boolean {
  const cityAppears = cityOrArea.length > 1 && value.toLowerCase().includes(cityOrArea.toLowerCase());
  return cityAppears || /(?:\baddress\b|\blocation\b|\bnear\b|\broad\b|\bstreet\b|\bmarket\b|\bmap\b|\bdirections?\b)/i.test(value);
}

function makeCheck(
  id: PublicTruthCheckFactId,
  result: PublicTruthCheckResult,
  evidence: PublicTruthCheckEvidence,
): PublicTruthCheckItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getSelfReportEvidenceText(evidence),
    required: REQUIRED_FACTS.has(id),
  };
}

function getSelfReportEvidenceText(evidence: PublicTruthCheckEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'source_text_hint':
      return 'Checked the pasted source text only. No linked page was fetched.';
    case 'valid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not fetched and no Google profile was inspected.';
    case 'invalid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not fetched and no Google profile was inspected.';
    case 'not_provided':
      return 'No source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in the public self-report version.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function countSummary(checks: PublicTruthCheckItem[]): PublicTruthCheckReport['summary'] {
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

export function buildPublicTruthCheckReport(input: PublicTruthCheckInput): PublicTruthCheckReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const publicUrl = trimToSingleLine(input.publicUrl);
  const menuOrServiceText = normalizeTextarea(input.menuOrServiceText);
  const searchableSource = `${menuOrServiceText}\n${publicUrl}`;
  const hasValidPublicUrl = isValidHttpUrl(publicUrl);
  const hasAnyUrl = publicUrl.length > 0;
  const hasSource = hasUsefulText(menuOrServiceText) || hasValidPublicUrl;
  const sourceKind = input.sourceKind || DEFAULT_SOURCE_KIND;

  const checks: PublicTruthCheckItem[] = [
    makeCheck(
      'business_identity',
      businessName && cityOrArea ? 'present' : 'missing',
      businessName && cityOrArea ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'menu_or_service_source',
      hasSource ? 'present' : 'missing',
      hasValidPublicUrl ? 'valid_public_url' : hasUsefulText(menuOrServiceText) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'prices',
      input.facts.pricesNotNeeded
        ? 'not_applicable'
        : input.facts.pricesShown || hasPriceHint(searchableSource)
          ? 'present'
          : hasSource
            ? 'missing'
            : 'not_checked',
      input.facts.pricesNotNeeded || input.facts.pricesShown
        ? 'owner_selected'
        : hasPriceHint(searchableSource)
          ? 'source_text_hint'
          : hasSource
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'hours',
      input.facts.hoursShown || hasHoursHint(searchableSource)
        ? 'present'
        : hasSource
          ? 'missing'
          : 'not_checked',
      input.facts.hoursShown
        ? 'owner_selected'
        : hasHoursHint(searchableSource)
          ? 'source_text_hint'
          : hasSource
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'location',
      input.facts.locationShown || hasLocationHint(searchableSource, cityOrArea)
        ? 'present'
        : hasSource
          ? 'missing'
          : 'not_checked',
      input.facts.locationShown
        ? 'owner_selected'
        : hasLocationHint(searchableSource, cityOrArea)
          ? 'source_text_hint'
          : hasSource
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'contact',
      input.facts.contactShown || hasContactHint(searchableSource)
        ? 'present'
        : hasSource
          ? 'missing'
          : 'not_checked',
      input.facts.contactShown
        ? 'owner_selected'
        : hasContactHint(searchableSource)
          ? 'source_text_hint'
          : hasSource
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'customer_actions',
      input.facts.customerActionShown || hasActionHint(searchableSource)
        ? 'present'
        : hasSource
          ? 'missing'
          : 'not_checked',
      input.facts.customerActionShown
        ? 'owner_selected'
        : hasActionHint(searchableSource)
          ? 'source_text_hint'
          : hasSource
            ? 'not_provided'
            : 'not_checked',
    ),
    makeCheck(
      'public_link',
      hasValidPublicUrl ? 'present' : hasAnyUrl ? 'unclear' : 'missing',
      hasValidPublicUrl ? 'valid_public_url' : hasAnyUrl ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck(
      'photos',
      input.facts.photosShown ? 'present' : 'not_checked',
      input.facts.photosShown ? 'owner_selected' : 'not_checked',
    ),
    makeCheck('machine_readable_source', 'not_checked', 'not_checked'),
  ];

  const requiredChecks = checks.filter((check) => check.required);
  const missingRequiredChecks = requiredChecks.filter((check) =>
    check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked'
  );
  const identityMissing = checks.find((check) => check.id === 'business_identity')?.result !== 'present';
  const sourceMissing = checks.find((check) => check.id === 'menu_or_service_source')?.result !== 'present';
  const status = !checks.length
    ? 'not_checked'
    : identityMissing || sourceMissing || missingRequiredChecks.length >= 3
      ? 'missing_basics'
      : missingRequiredChecks.length === 0
        ? 'ready'
        : 'unclear';

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: status === 'ready' ? 'create_customer_link' : 'complete_business_facts',
    },
    boundaries: {
      externalSourcesFetched: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
