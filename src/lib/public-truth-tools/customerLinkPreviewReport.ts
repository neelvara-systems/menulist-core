import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import {
  boundPublicTruthToolInput,
  PUBLIC_TRUTH_TOOL_INPUT_LIMITS,
  type PublicTruthToolInputLimit,
} from './publicTruthToolInputLimits';
import type {
  CustomerLinkPreviewCheckId,
  CustomerLinkPreviewEvidence,
  CustomerLinkPreviewInput,
  CustomerLinkPreviewItem,
  CustomerLinkPreviewReport,
  CustomerLinkPreviewResult,
} from './customerLinkPreviewTypes';

const REQUIRED_CHECKS = new Set<CustomerLinkPreviewCheckId>([
  'customer_link_present',
  'business_identity',
  'menu_or_service_summary',
  'contact',
  'customer_action',
]);

function trimToSingleLine(
  value?: string,
  maxLength: PublicTruthToolInputLimit = PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText,
): string {
  return boundPublicTruthToolInput(value, maxLength).replace(/\s+/g, ' ').trim();
}

function getCustomerLinkPreviewEvidenceText(evidence: CustomerLinkPreviewEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered business details only. The customer link was not opened or fetched.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only. No external page was inspected.';
    case 'valid_customer_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'invalid_customer_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'not_provided':
      return 'This fact was not provided by the owner.';
    case 'not_checked':
      return 'This fact was not checked in V0. External links, websites, profiles, search results, and AI answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: CustomerLinkPreviewCheckId,
  result: CustomerLinkPreviewResult,
  evidence: CustomerLinkPreviewEvidence,
): CustomerLinkPreviewItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getCustomerLinkPreviewEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: CustomerLinkPreviewItem[]): CustomerLinkPreviewReport['summary'] {
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

function getStatus(checks: CustomerLinkPreviewItem[]): CustomerLinkPreviewReport['status'] {
  const requiredGaps = checks.filter((check) =>
    check.required && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  if (requiredGaps.length >= 3) return 'missing_basics';
  if (requiredGaps.length > 0) return 'unclear';
  return 'ready';
}

function getNextActionType(status: CustomerLinkPreviewReport['status']): CustomerLinkPreviewReport['nextAction']['type'] {
  if (status === 'ready') return 'review_customer_link';
  if (status === 'manual_review_needed') return 'complete_customer_facts';
  return 'create_customer_link';
}

export function buildCustomerLinkPreviewReport(input: CustomerLinkPreviewInput): CustomerLinkPreviewReport {
  const businessName = trimToSingleLine(input.businessName, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const hasCurrentCustomerLink = currentCustomerLink.length > 0;
  const validCurrentCustomerLink = isValidHttpUrl(currentCustomerLink, 'customer_link_preview_current_customer_link');
  const hasBusinessName = businessName.length >= 2;
  const hasCityOrArea = cityOrArea.length >= 2;
  const hasCompleteIdentity = hasBusinessName && hasCityOrArea;
  const hasPartialIdentity = hasBusinessName || hasCityOrArea;
  const visibleFactCount = [
    input.businessNameVisible,
    input.menuOrServiceVisible,
    input.pricesOrRatesVisible,
    input.hoursVisible,
    input.locationVisible,
    input.contactVisible,
    input.customerActionVisible,
    input.photosOrIdentityVisible,
    input.mobileFriendly,
  ].filter(Boolean).length;

  const checks: CustomerLinkPreviewItem[] = [
    makeCheck(
      'customer_link_present',
      validCurrentCustomerLink ? 'present' : hasCurrentCustomerLink ? 'unclear' : 'missing',
      validCurrentCustomerLink ? 'valid_customer_url' : hasCurrentCustomerLink ? 'invalid_customer_url' : 'not_provided',
    ),
    makeCheck(
      'business_identity',
      input.businessNameVisible && hasCompleteIdentity ? 'present' : hasPartialIdentity ? 'unclear' : 'missing',
      hasPartialIdentity ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'menu_or_service_summary',
      input.menuOrServiceVisible ? 'present' : 'missing',
      input.menuOrServiceVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'prices_or_rates',
      input.pricesOrRatesVisible ? 'present' : input.businessKind === 'clinic' ? 'not_applicable' : 'unclear',
      input.pricesOrRatesVisible ? 'owner_selected' : input.businessKind === 'clinic' ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'hours',
      input.hoursVisible ? 'present' : 'unclear',
      input.hoursVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'location',
      input.locationVisible ? 'present' : 'unclear',
      input.locationVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'contact',
      input.contactVisible ? 'present' : 'missing',
      input.contactVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'customer_action',
      input.customerActionVisible ? 'present' : 'missing',
      input.customerActionVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'visual_identity',
      input.photosOrIdentityVisible ? 'present' : 'unclear',
      input.photosOrIdentityVisible ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'mobile_readiness',
      input.mobileFriendly ? 'present' : 'unclear',
      input.mobileFriendly ? 'owner_selected' : 'not_provided',
    ),
    makeCheck('external_link_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    businessKind: input.businessKind || 'other',
    checks,
    summary: countSummary(checks),
    previewFacts: {
      headline: businessName || 'Your business',
      subline: cityOrArea || 'Customer-facing public link',
      visibleFactCount,
      customerLinkLabel: validCurrentCustomerLink ? currentCustomerLink : 'No current customer link confirmed',
    },
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      customerLinkFetched: false,
      previewRenderedFromExternalSource: false,
      externalUrlFetched: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
