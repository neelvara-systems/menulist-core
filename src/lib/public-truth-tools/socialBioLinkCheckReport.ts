import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import {
  boundPublicTruthToolInput,
  PUBLIC_TRUTH_TOOL_INPUT_LIMITS,
  type PublicTruthToolInputLimit,
} from './publicTruthToolInputLimits';
import type {
  SocialBioLinkCheckEvidence,
  SocialBioLinkCheckId,
  SocialBioLinkCheckInput,
  SocialBioLinkCheckItem,
  SocialBioLinkCheckReport,
  SocialBioLinkCheckResult,
} from './socialBioLinkCheckTypes';

const REQUIRED_CHECKS = new Set<SocialBioLinkCheckId>([
  'customer_link_present',
  'customer_action',
]);

function trimToSingleLine(
  value?: string,
  maxLength: PublicTruthToolInputLimit = PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText,
): string {
  return boundPublicTruthToolInput(value, maxLength).replace(/\s+/g, ' ').trim();
}

function getSocialBioLinkCheckEvidenceText(evidence: SocialBioLinkCheckEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered business details only. No social profile, website, QR code, or public profile was opened or fetched.';
    case 'owner_selected':
      return 'Checked owner-selected social/profile link facts only. No social profile was opened, fetched, inspected, or changed.';
    case 'valid_customer_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'invalid_customer_url':
      return 'Public HTTPS customer-link format was checked locally. The link was not opened or fetched.';
    case 'not_provided':
      return 'This placement was not confirmed by the owner.';
    case 'not_checked':
      return 'This fact was not checked in V0. Instagram, Facebook, WhatsApp, Google, websites, QR codes, print materials, search results, and AI answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: SocialBioLinkCheckId,
  result: SocialBioLinkCheckResult,
  evidence: SocialBioLinkCheckEvidence,
): SocialBioLinkCheckItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getSocialBioLinkCheckEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: SocialBioLinkCheckItem[]): SocialBioLinkCheckReport['summary'] {
  return checks.reduce(
    (summary, check) => {
      if (check.result === 'present') {
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

function getHighestPriorityPlacement(input: SocialBioLinkCheckInput): SocialBioLinkCheckReport['placementFacts']['highestPriorityPlacement'] {
  if (input.instagramBioUsesCustomerLink) return 'instagram';
  if (input.facebookPageUsesCustomerLink) return 'facebook';
  if (input.whatsappProfileUsesCustomerLink) return 'whatsapp';
  if (input.googleProfileUsesCustomerLink) return 'google';
  if (input.websiteUsesCustomerLink) return 'website';
  if (input.qrOrPrintUsesCustomerLink) return 'qr_or_print';
  return 'none';
}

function getPlacementCount(input: SocialBioLinkCheckInput): number {
  return [
    input.instagramBioUsesCustomerLink,
    input.facebookPageUsesCustomerLink,
    input.whatsappProfileUsesCustomerLink,
    input.googleProfileUsesCustomerLink,
    input.websiteUsesCustomerLink,
    input.qrOrPrintUsesCustomerLink,
  ].filter(Boolean).length;
}

function getStatus(
  validCurrentCustomerLink: boolean,
  placementCount: number,
  oldLinksRemoved: boolean,
  actionClear: boolean,
): SocialBioLinkCheckReport['status'] {
  if (!validCurrentCustomerLink || placementCount === 0 || !actionClear) {
    return 'missing_basics';
  }

  if (!oldLinksRemoved || placementCount < 2) {
    return 'unclear';
  }

  return 'ready';
}

function getNextActionType(
  status: SocialBioLinkCheckReport['status'],
  validCurrentCustomerLink: boolean,
  placementCount: number,
  oldLinksRemoved: boolean,
): SocialBioLinkCheckReport['nextAction']['type'] {
  if (!validCurrentCustomerLink) return 'create_customer_link';
  if (placementCount === 0 || status === 'missing_basics') return 'place_customer_link';
  if (!oldLinksRemoved) return 'clean_up_old_links';
  return 'review_customer_link';
}

export function buildSocialBioLinkCheckReport(input: SocialBioLinkCheckInput): SocialBioLinkCheckReport {
  const businessName = trimToSingleLine(input.businessName, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const hasCurrentCustomerLink = currentCustomerLink.length > 0;
  const validCurrentCustomerLink = isValidHttpUrl(currentCustomerLink, 'social_bio_link_current_customer_link');
  const placementCount = getPlacementCount(input);
  const status = getStatus(validCurrentCustomerLink, placementCount, input.oldLinksRemoved, input.actionClear);

  const checks: SocialBioLinkCheckItem[] = [
    makeCheck(
      'customer_link_present',
      validCurrentCustomerLink ? 'present' : hasCurrentCustomerLink ? 'unclear' : 'missing',
      validCurrentCustomerLink ? 'valid_customer_url' : hasCurrentCustomerLink ? 'invalid_customer_url' : 'not_provided',
    ),
    makeCheck(
      'instagram_bio_link',
      input.instagramBioUsesCustomerLink ? 'present' : 'unclear',
      input.instagramBioUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'facebook_page_link',
      input.facebookPageUsesCustomerLink ? 'present' : 'unclear',
      input.facebookPageUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'whatsapp_profile_link',
      input.whatsappProfileUsesCustomerLink ? 'present' : 'unclear',
      input.whatsappProfileUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'google_profile_link',
      input.googleProfileUsesCustomerLink ? 'present' : 'unclear',
      input.googleProfileUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'website_link',
      input.websiteUsesCustomerLink ? 'present' : 'unclear',
      input.websiteUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'qr_print_link',
      input.qrOrPrintUsesCustomerLink ? 'present' : 'unclear',
      input.qrOrPrintUsesCustomerLink ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'old_link_cleanup',
      input.oldLinksRemoved ? 'present' : 'unclear',
      input.oldLinksRemoved ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'customer_action',
      input.actionClear ? 'present' : 'missing',
      input.actionClear ? 'owner_selected' : 'not_provided',
    ),
    makeCheck('external_social_inspection', 'not_checked', 'not_checked'),
  ];

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    currentCustomerLink,
    checks,
    summary: countSummary(checks),
    placementFacts: {
      placementCount,
      checkedSurfaceCount: 6,
      customerLinkLabel: validCurrentCustomerLink ? currentCustomerLink : 'No current customer link confirmed',
      highestPriorityPlacement: getHighestPriorityPlacement(input),
    },
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status, validCurrentCustomerLink, placementCount, input.oldLinksRemoved),
    },
    boundaries: {
      customerLinkFetched: false,
      socialProfileFetched: false,
      socialProfileOpened: false,
      externalUrlFetched: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
