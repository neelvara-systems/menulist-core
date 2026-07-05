import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  PhotoGapCheckId,
  PhotoGapCheckInput,
  PhotoGapCheckItem,
  PhotoGapCheckReport,
  PhotoGapCheckResult,
  PhotoGapEvidence,
} from './photoGapCheckTypes';

const REQUIRED_CHECKS = new Set<PhotoGapCheckId>([
  'logo',
  'cover_image',
  'location_or_team_photo',
  'product_or_service_photos',
  'photo_context',
  'public_page_images',
  'current_customer_link',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getPhotoGapEvidenceText(evidence: PhotoGapEvidence): string {
  switch (evidence) {
    case 'owner_selected':
      return 'Checked owner-selected visible photo facts only.';
    case 'business_type_context':
      return 'Checked owner-selected business type and visible photo facts only.';
    case 'valid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No owner-selected source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. Images were not uploaded, analyzed, fetched, or inspected on external platforms.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: PhotoGapCheckId,
  result: PhotoGapCheckResult,
  evidence: PhotoGapEvidence,
): PhotoGapCheckItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getPhotoGapEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: PhotoGapCheckItem[]): PhotoGapCheckReport['summary'] {
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

function getStatus(checks: PhotoGapCheckItem[]): PhotoGapCheckReport['status'] {
  const visualBasics = checks.filter((check) =>
    ['logo', 'cover_image', 'location_or_team_photo', 'product_or_service_photos'].includes(check.id)
  );
  const presentVisualBasics = visualBasics.filter((check) => check.result === 'present').length;

  if (presentVisualBasics === 0) return 'missing_basics';

  const blockingChecks: PhotoGapCheckId[] = [
    'logo',
    'cover_image',
    'location_or_team_photo',
    'product_or_service_photos',
    'photo_context',
    'public_page_images',
    'current_customer_link',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: PhotoGapCheckReport['status']): PhotoGapCheckReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'complete_visual_profile';
}

export function buildPhotoGapCheckReport(input: PhotoGapCheckInput): PhotoGapCheckReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const hasCustomerLink = currentCustomerLink.length > 0;
  const validCustomerLink = isValidHttpUrl(currentCustomerLink, 'photo_gap_check_current_customer_link');

  const checks: PhotoGapCheckItem[] = [
    makeCheck(
      'logo',
      input.logoPresent ? 'present' : 'missing',
      input.logoPresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'cover_image',
      input.coverImagePresent ? 'present' : 'missing',
      input.coverImagePresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'location_or_team_photo',
      input.locationOrTeamPhotoPresent ? 'present' : 'missing',
      input.locationOrTeamPhotoPresent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'product_or_service_photos',
      input.productOrServicePhotosPresent ? 'present' : 'missing',
      input.productOrServicePhotosPresent ? 'business_type_context' : 'not_provided',
    ),
    makeCheck(
      'photo_context',
      input.photosLookCurrent ? 'present' : 'unclear',
      input.photosLookCurrent ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'public_page_images',
      input.publicPageHasImages ? 'present' : 'missing',
      input.publicPageHasImages ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCustomerLink ? 'present' : hasCustomerLink ? 'unclear' : 'missing',
      validCustomerLink ? 'valid_public_url' : hasCustomerLink ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck('external_photo_verification', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    businessType: input.businessType || 'other',
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      imageUploaded: false,
      imageAnalyzed: false,
      externalUrlFetched: false,
      googleProfileInspected: false,
      instagramInspected: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
