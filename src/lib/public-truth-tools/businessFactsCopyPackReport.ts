import {
  isPublicHttpsUrl as isValidHttpUrl,
  parsePublicHttpsUrl,
} from './publicUrlValidation';
import {
  isLikelyPhoneNumber,
  isValidTelDestination,
} from './phoneValidation';
import type {
  BusinessFactsCopyBlock,
  BusinessFactsCopyPackAction,
  BusinessFactsCopyPackCheckId,
  BusinessFactsCopyPackEvidence,
  BusinessFactsCopyPackInput,
  BusinessFactsCopyPackItem,
  BusinessFactsCopyPackReport,
  BusinessFactsCopyPackResult,
} from './businessFactsCopyPackTypes';

const REQUIRED_CHECKS = new Set<BusinessFactsCopyPackCheckId>([
  'business_identity',
  'offer_summary',
  'contact_path',
  'customer_action',
  'current_customer_link',
]);

const ACTION_LABELS: Record<BusinessFactsCopyPackAction, string> = {
  ask_question: 'Ask a question',
  book: 'Book',
  call: 'Call',
  message: 'Message',
  order: 'Order',
  request_quote: 'Request a quote',
  visit: 'Visit',
};

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeMultiline(value?: string): string {
  return (value || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => trimToSingleLine(line))
    .filter(Boolean)
    .join('\n')
    .trim();
}

function truncateText(value: string, maxLength: number): string {
  const cleaned = trimToSingleLine(value);
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 3)).trim()}...`;
}

function hasUsefulText(value: string, minimum = 3): boolean {
  return trimToSingleLine(value).length >= minimum;
}

function hasContactHint(value: string): boolean {
  const cleaned = trimToSingleLine(value);
  if (isLikelyPhoneNumber(cleaned) || isValidTelDestination(cleaned)) return true;

  const looksLikeWhatsAppUrl = /^https:\/\//i.test(cleaned)
    || /^(?:www\.)?wa\.me\//i.test(cleaned);
  if (!looksLikeWhatsAppUrl) return false;

  const url = parsePublicHttpsUrl(cleaned, 'business_facts_copy_pack_contact');
  if (!url || url.hostname.toLowerCase().replace(/^www\./, '') !== 'wa.me') return false;

  const pathParts = url.pathname.split('/').filter(Boolean);
  return pathParts.length === 1 && /^\d{8,15}$/.test(pathParts[0]) && !pathParts[0].startsWith('0');
}

function getBusinessFactsCopyPackEvidenceText(evidence: BusinessFactsCopyPackEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected action only.';
    case 'local_format_valid':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'local_format_invalid':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'deterministic_copy':
      return 'Copy was generated from owner-entered facts only. No AI rewrite was generated.';
    case 'external_boundary':
      return 'External profiles and platforms were not opened, inspected, or updated.';
    case 'not_provided':
      return 'No owner-entered fact was provided for this row.';
    case 'not_checked':
      return 'This fact was not checked in V0. Links were not opened, profiles were not inspected, and AI/search providers were not called.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: BusinessFactsCopyPackCheckId,
  result: BusinessFactsCopyPackResult,
  evidence: BusinessFactsCopyPackEvidence,
): BusinessFactsCopyPackItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getBusinessFactsCopyPackEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: BusinessFactsCopyPackItem[]): BusinessFactsCopyPackReport['summary'] {
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

function getStatus(checks: BusinessFactsCopyPackItem[]): BusinessFactsCopyPackReport['status'] {
  const blockingMissing = checks.some((check) =>
    [
      'business_identity',
      'offer_summary',
      'contact_path',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'not_checked')
  );

  if (blockingMissing) return 'missing_basics';

  const linkCheck = checks.find((check) => check.id === 'current_customer_link');
  if (linkCheck?.result !== 'present') return 'unclear';

  const unclear = checks.some((check) =>
    [
      'public_description',
      'hours',
      'location_or_service_area',
      'customer_action',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return unclear ? 'unclear' : 'ready';
}

function getNextActionType(status: BusinessFactsCopyPackReport['status']): BusinessFactsCopyPackReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'complete_business_facts';
}

function getFactOrPlaceholder(value: string, placeholder: string): string {
  return hasUsefulText(value) ? value : placeholder;
}

function getActionSentence(action: BusinessFactsCopyPackAction, actionLink: string, currentCustomerLink: string, phoneOrWhatsapp: string): string {
  const label = ACTION_LABELS[action];
  const link = actionLink || currentCustomerLink;

  if (link) return `${label}: ${link}`;
  if (phoneOrWhatsapp) return `${label}: ${phoneOrWhatsapp}`;
  return `${label}: add the best customer action.`;
}

function buildCopyBlocks(input: {
  businessName: string;
  cityOrArea: string;
  businessType: string;
  offerSummary: string;
  shortDescription: string;
  hours: string;
  locationOrServiceArea: string;
  phoneOrWhatsapp: string;
  currentCustomerLink: string;
  actionLink: string;
  preferredAction: BusinessFactsCopyPackAction;
}): BusinessFactsCopyBlock[] {
  const businessName = getFactOrPlaceholder(input.businessName, 'Business name not provided');
  const businessType = getFactOrPlaceholder(input.businessType, 'local business');
  const area = getFactOrPlaceholder(input.cityOrArea || input.locationOrServiceArea, 'area not provided');
  const offer = getFactOrPlaceholder(input.offerSummary, 'menu, services, or offers not provided');
  const description = getFactOrPlaceholder(input.shortDescription, offer);
  const hours = getFactOrPlaceholder(input.hours, 'hours not provided');
  const location = getFactOrPlaceholder(input.locationOrServiceArea || input.cityOrArea, 'location or service area not provided');
  const contact = getFactOrPlaceholder(input.phoneOrWhatsapp, 'contact not provided');
  const customerLink = getFactOrPlaceholder(input.currentCustomerLink, 'current customer link not provided');
  const actionSentence = getActionSentence(input.preferredAction, input.actionLink, input.currentCustomerLink, input.phoneOrWhatsapp);
  const evidenceText = getBusinessFactsCopyPackEvidenceText('deterministic_copy');

  return [
    {
      id: 'google_profile_description',
      title: 'Google/Profile description',
      body: truncateText(`${businessName} is a ${businessType} in ${area}. ${description}. Customers can find current details here: ${customerLink}. ${actionSentence}.`, 740),
      evidenceText,
    },
    {
      id: 'whatsapp_business_about',
      title: 'WhatsApp Business about',
      body: truncateText(`${businessName} - ${offer}. ${hours}. ${actionSentence}.`, 220),
      evidenceText,
    },
    {
      id: 'social_bio',
      title: 'Instagram/Facebook bio',
      body: [
        businessName,
        truncateText(offer, 110),
        `${location}`,
        `${ACTION_LABELS[input.preferredAction]}: ${input.currentCustomerLink || input.phoneOrWhatsapp || 'add customer link'}`,
      ].join('\n'),
      evidenceText,
    },
    {
      id: 'website_contact_snippet',
      title: 'Website/contact snippet',
      body: [
        `${businessName}`,
        `${description}`,
        `What customers can get: ${offer}`,
        `Hours: ${hours}`,
        `Location or service area: ${location}`,
        `Contact: ${contact}`,
        `Current customer link: ${customerLink}`,
      ].join('\n'),
      evidenceText,
    },
    {
      id: 'staff_answer_card',
      title: 'Staff answer card',
      body: [
        `Business: ${businessName}`,
        `Offer: ${offer}`,
        `Hours: ${hours}`,
        `Area: ${location}`,
        `Best action: ${actionSentence}`,
        `Link to send: ${customerLink}`,
        `If unsure: use the current customer link before answering from memory.`,
      ].join('\n'),
      evidenceText,
    },
    {
      id: 'customer_link_share_text',
      title: 'Customer link share text',
      body: `Here is the current ${businessName} customer link: ${customerLink}. It has the latest details for ${truncateText(offer, 120)}.`,
      evidenceText,
    },
  ];
}

export function buildBusinessFactsCopyPackReport(input: BusinessFactsCopyPackInput): BusinessFactsCopyPackReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const businessType = trimToSingleLine(input.businessType);
  const offerSummary = normalizeMultiline(input.offerSummary);
  const shortDescription = normalizeMultiline(input.shortDescription);
  const hours = trimToSingleLine(input.hours);
  const locationOrServiceArea = trimToSingleLine(input.locationOrServiceArea);
  const phoneOrWhatsapp = trimToSingleLine(input.phoneOrWhatsapp);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const actionLink = trimToSingleLine(input.actionLink);
  const validCurrentCustomerLink = isValidHttpUrl(currentCustomerLink, 'business_facts_copy_pack_current_customer_link');
  const hasCurrentCustomerLink = currentCustomerLink.length > 0;
  const validActionLink = isValidHttpUrl(actionLink, 'business_facts_copy_pack_action_link');
  const hasActionLink = actionLink.length > 0;
  const hasDescription = hasUsefulText(shortDescription, 24);
  const hasOffer = hasUsefulText(offerSummary, 12);
  const hasIdentity = hasUsefulText(businessName, 2) && (hasUsefulText(cityOrArea, 2) || hasUsefulText(businessType, 2));
  const hasContact = hasContactHint(phoneOrWhatsapp);
  const hasAction = Boolean(input.preferredAction) && (hasActionLink ? validActionLink : hasContact || validCurrentCustomerLink);
  const copyBlocks = buildCopyBlocks({
    actionLink: validActionLink ? actionLink : '',
    businessName,
    businessType,
    cityOrArea,
    currentCustomerLink: validCurrentCustomerLink ? currentCustomerLink : '',
    hours,
    locationOrServiceArea,
    offerSummary,
    phoneOrWhatsapp: hasContact ? phoneOrWhatsapp : '',
    preferredAction: input.preferredAction,
    shortDescription,
  });

  const checks: BusinessFactsCopyPackItem[] = [
    makeCheck(
      'business_identity',
      hasIdentity ? 'present' : 'missing',
      hasIdentity ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'public_description',
      hasDescription ? 'present' : hasOffer ? 'unclear' : 'missing',
      hasDescription || hasOffer ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'offer_summary',
      hasOffer ? 'present' : 'missing',
      hasOffer ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'hours',
      hasUsefulText(hours, 3) ? 'present' : 'unclear',
      hasUsefulText(hours, 3) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'location_or_service_area',
      hasUsefulText(locationOrServiceArea || cityOrArea, 2) ? 'present' : 'unclear',
      hasUsefulText(locationOrServiceArea || cityOrArea, 2) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'contact_path',
      hasContact ? 'present' : 'missing',
      hasContact ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'customer_action',
      hasAction ? 'present' : hasActionLink ? 'unclear' : 'missing',
      hasAction
        ? hasActionLink
          ? 'local_format_valid'
          : 'owner_selected'
        : hasActionLink
          ? 'local_format_invalid'
          : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCurrentCustomerLink ? 'present' : hasCurrentCustomerLink ? 'unclear' : 'missing',
      validCurrentCustomerLink ? 'local_format_valid' : hasCurrentCustomerLink ? 'local_format_invalid' : 'not_provided',
    ),
    makeCheck(
      'copy_pack',
      copyBlocks.length > 0 ? 'present' : 'not_checked',
      copyBlocks.length > 0 ? 'deterministic_copy' : 'not_checked',
    ),
    makeCheck(
      'external_platform_update',
      'not_checked',
      'external_boundary',
    ),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    businessType,
    preferredAction: input.preferredAction,
    checks,
    copyBlocks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      externalUrlFetched: false,
      externalProfilesOpened: false,
      externalPlatformUpdated: false,
      reportStored: false,
      aiRewriteGenerated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
