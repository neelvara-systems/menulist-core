import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  GoogleProfileBasicsCheckId,
  GoogleProfileBasicsEvidence,
  GoogleProfileBasicsInput,
  GoogleProfileBasicsItem,
  GoogleProfileBasicsReport,
  GoogleProfileBasicsResult,
} from './googleProfileBasicsTypes';

const REQUIRED_CHECKS = new Set<GoogleProfileBasicsCheckId>([
  'profile_access',
  'business_identity',
  'category',
  'address_or_service_area',
  'hours',
  'contact_and_website',
  'menu_or_service_link',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getGoogleProfileBasicsEvidenceText(evidence: GoogleProfileBasicsEvidence): string {
  switch (evidence) {
    case 'owner_selected':
      return 'Checked owner-selected Google Profile facts only. Google was not opened, scanned, or changed.';
    case 'owner_entered':
      return 'Checked owner-entered business details only. Google was not opened, scanned, or changed.';
    case 'valid_public_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'invalid_public_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'not_provided':
      return 'This fact was not provided by the owner.';
    case 'not_checked':
      return 'This fact was not checked in V0. Google Search, Google Maps, Business Profile, external URLs, rankings, and AI answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: GoogleProfileBasicsCheckId,
  result: GoogleProfileBasicsResult,
  evidence: GoogleProfileBasicsEvidence,
): GoogleProfileBasicsItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getGoogleProfileBasicsEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: GoogleProfileBasicsItem[]): GoogleProfileBasicsReport['summary'] {
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

function getStatus(checks: GoogleProfileBasicsItem[]): GoogleProfileBasicsReport['status'] {
  const requiredGaps = checks.filter((check) =>
    check.required && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  if (requiredGaps.length >= 3) return 'missing_basics';
  if (requiredGaps.length > 0) return 'unclear';
  return 'ready';
}

function getNextActionType(status: GoogleProfileBasicsReport['status']): GoogleProfileBasicsReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'complete_profile_basics';
}

export function buildGoogleProfileBasicsReport(input: GoogleProfileBasicsInput): GoogleProfileBasicsReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const websiteOrCustomerLink = trimToSingleLine(input.websiteOrCustomerLink);
  const hasWebsiteOrCustomerLink = websiteOrCustomerLink.length > 0;
  const validWebsiteOrCustomerLink = isValidHttpUrl(websiteOrCustomerLink);
  const hasIdentityHint = businessName.length >= 2 || cityOrArea.length >= 2;

  const checks: GoogleProfileBasicsItem[] = [
    makeCheck(
      'profile_access',
      input.profileClaimedOrVerified ? 'present' : 'unclear',
      input.profileClaimedOrVerified ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'business_identity',
      input.nameMatchesRealWorld && hasIdentityHint ? 'present' : hasIdentityHint ? 'unclear' : 'missing',
      hasIdentityHint ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'category',
      input.primaryCategorySet ? 'present' : 'missing',
      input.primaryCategorySet ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'address_or_service_area',
      input.addressOrServiceAreaClear ? 'present' : 'missing',
      input.addressOrServiceAreaClear ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'hours',
      input.hoursCurrent ? 'present' : 'missing',
      input.hoursCurrent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'contact_and_website',
      input.phoneOrMessagePresent && validWebsiteOrCustomerLink
        ? 'present'
        : input.phoneOrMessagePresent || hasWebsiteOrCustomerLink
          ? 'unclear'
          : 'missing',
      validWebsiteOrCustomerLink
        ? 'valid_public_url'
        : hasWebsiteOrCustomerLink
          ? 'invalid_public_url'
          : input.phoneOrMessagePresent
            ? 'owner_selected'
            : 'not_provided',
    ),
    makeCheck(
      'menu_or_service_link',
      input.menuOrServiceLinkPresent ? 'present' : 'missing',
      input.menuOrServiceLinkPresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'customer_action_links',
      input.orderBookingOrActionPresent ? 'present' : 'unclear',
      input.orderBookingOrActionPresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'photos',
      input.photosPresent ? 'present' : 'unclear',
      input.photosPresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck('google_profile_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      googleFetched: false,
      googleProfileOpened: false,
      googleProfileUpdated: false,
      externalUrlFetched: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
