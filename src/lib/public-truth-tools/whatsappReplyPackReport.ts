import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  WhatsAppReplyBlock,
  WhatsAppReplyPackAction,
  WhatsAppReplyPackCheckId,
  WhatsAppReplyPackEvidence,
  WhatsAppReplyPackInput,
  WhatsAppReplyPackItem,
  WhatsAppReplyPackReport,
  WhatsAppReplyPackResult,
} from './whatsappReplyPackTypes';

const REQUIRED_CHECKS = new Set<WhatsAppReplyPackCheckId>([
  'business_identity',
  'whatsapp_number',
  'current_customer_link',
  'offer_summary',
  'reply_pack',
]);

const ACTION_LABELS: Record<WhatsAppReplyPackAction, string> = {
  ask_question: 'Ask a question',
  book: 'Book',
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

function normalizePhoneDigits(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00') && digits.length > 2) return digits.slice(2);
  return digits;
}

function hasLikelyCountryCode(rawValue: string, digits: string): boolean {
  const trimmed = rawValue.trim();
  return trimmed.startsWith('+') || trimmed.startsWith('00') || digits.length > 10;
}

function isLikelyWhatsAppPhone(rawValue: string): boolean {
  const digits = normalizePhoneDigits(rawValue);
  return digits.length >= 8
    && digits.length <= 15
    && !digits.startsWith('0')
    && hasLikelyCountryCode(rawValue, digits);
}

function getWhatsAppReplyPackEvidenceText(evidence: WhatsAppReplyPackEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected action only.';
    case 'local_phone_format_valid':
      return 'Phone number shape was checked locally. The number was not verified with WhatsApp.';
    case 'local_phone_format_unclear':
      return 'Phone number shape was checked locally. Add country code if this is the customer WhatsApp number.';
    case 'local_url_format_valid':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'local_url_format_invalid':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'deterministic_copy':
      return 'Replies were generated from owner-entered facts only. No AI rewrite was generated.';
    case 'external_boundary':
      return 'WhatsApp was not opened, no API was called, and no message was sent.';
    case 'not_provided':
      return 'No owner-entered fact was provided for this row.';
    case 'not_checked':
      return 'This fact was not checked in V0. WhatsApp was not contacted, links were not opened, and messages were not sent.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: WhatsAppReplyPackCheckId,
  result: WhatsAppReplyPackResult,
  evidence: WhatsAppReplyPackEvidence,
): WhatsAppReplyPackItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getWhatsAppReplyPackEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: WhatsAppReplyPackItem[]): WhatsAppReplyPackReport['summary'] {
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

function getStatus(checks: WhatsAppReplyPackItem[]): WhatsAppReplyPackReport['status'] {
  const blockingMissing = checks.some((check) =>
    [
      'business_identity',
      'whatsapp_number',
      'offer_summary',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'not_checked')
  );

  if (blockingMissing) return 'missing_basics';

  const unclear = checks.some((check) =>
    [
      'current_customer_link',
      'hours_expectation',
      'action_path',
      'payment_context',
      'delivery_pickup_context',
      'wa_me_preview',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return unclear ? 'unclear' : 'ready';
}

function getNextActionType(status: WhatsAppReplyPackReport['status']): WhatsAppReplyPackReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'complete_reply_facts';
}

function getFactOrPlaceholder(value: string, placeholder: string): string {
  return hasUsefulText(value) ? value : placeholder;
}

function getActionSentence(action: WhatsAppReplyPackAction, actionLink: string, currentCustomerLink: string): string {
  const label = ACTION_LABELS[action];
  const link = actionLink || currentCustomerLink;
  if (link) return `${label}: ${link}`;
  return `${label}: add the best customer action.`;
}

function makePreviewLink(phoneDigits: string, message: string): string | null {
  if (!phoneDigits || phoneDigits.length < 8 || phoneDigits.length > 15) return null;
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phoneDigits}${encodedMessage}`;
}

function buildReplyBlocks(input: {
  actionLink: string;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  deliveryOrPickup: string;
  hours: string;
  locationOrServiceArea: string;
  offerSummary: string;
  paymentInfo: string;
  preferredAction: WhatsAppReplyPackAction;
  responseTime: string;
}): WhatsAppReplyBlock[] {
  const businessName = getFactOrPlaceholder(input.businessName, 'Business name not provided');
  const area = getFactOrPlaceholder(input.cityOrArea || input.locationOrServiceArea, 'area not provided');
  const offer = getFactOrPlaceholder(input.offerSummary, 'menu, services, or offers not provided');
  const hours = getFactOrPlaceholder(input.hours, 'hours not provided');
  const location = getFactOrPlaceholder(input.locationOrServiceArea || input.cityOrArea, 'location or service area not provided');
  const customerLink = getFactOrPlaceholder(input.currentCustomerLink, 'current customer link not provided');
  const payment = getFactOrPlaceholder(input.paymentInfo, 'payment details not provided');
  const delivery = getFactOrPlaceholder(input.deliveryOrPickup, 'delivery or pickup details not provided');
  const responseTime = getFactOrPlaceholder(input.responseTime, 'reply time not provided');
  const actionSentence = getActionSentence(input.preferredAction, input.actionLink, input.currentCustomerLink);
  const evidenceText = getWhatsAppReplyPackEvidenceText('deterministic_copy');

  return [
    {
      id: 'greeting_reply',
      title: 'Greeting reply',
      body: `Hi. Thanks for messaging ${businessName}. We serve ${truncateText(offer, 120)} in ${area}. Current details: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'hours_reply',
      title: 'Hours reply',
      body: `Our hours: ${hours}. Usual reply time: ${responseTime}. Current details: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'menu_service_reply',
      title: 'Menu or service reply',
      body: `Here is the current ${businessName} list: ${customerLink}. Customers can check ${truncateText(offer, 140)} before messaging again.`,
      evidenceText,
    },
    {
      id: 'price_payment_reply',
      title: 'Price and payment reply',
      body: `Prices and availability are on the current customer link: ${customerLink}. Payment details: ${payment}.`,
      evidenceText,
    },
    {
      id: 'order_booking_reply',
      title: 'Order or booking reply',
      body: `${actionSentence}. If the link is not available, send the item, date, time, and quantity needed.`,
      evidenceText,
    },
    {
      id: 'delivery_pickup_reply',
      title: 'Delivery or pickup reply',
      body: `Location or service area: ${location}. Delivery or pickup: ${delivery}. Current details: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'fallback_reply',
      title: 'Fallback reply',
      body: `Please use the current customer link before answering from memory: ${customerLink}. If the detail is not listed, ask for the customer's phone number and preferred time.`,
      evidenceText,
    },
    {
      id: 'customer_link_reply',
      title: 'Customer link reply',
      body: `This is the current ${businessName} customer link: ${customerLink}. It has the latest details for ${truncateText(offer, 120)}.`,
      evidenceText,
    },
  ];
}

export function buildWhatsAppReplyPackReport(input: WhatsAppReplyPackInput): WhatsAppReplyPackReport {
  const actionLink = trimToSingleLine(input.actionLink);
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const deliveryOrPickup = normalizeMultiline(input.deliveryOrPickup);
  const hours = trimToSingleLine(input.hours);
  const locationOrServiceArea = trimToSingleLine(input.locationOrServiceArea);
  const offerSummary = normalizeMultiline(input.offerSummary);
  const paymentInfo = normalizeMultiline(input.paymentInfo);
  const responseTime = trimToSingleLine(input.responseTime);
  const whatsappNumber = trimToSingleLine(input.whatsappNumber);
  const phoneDigits = normalizePhoneDigits(whatsappNumber);
  const validPhone = isLikelyWhatsAppPhone(whatsappNumber);
  const validCustomerLink = isValidHttpUrl(currentCustomerLink, 'whatsapp_reply_pack_current_customer_link');
  const hasCustomerLink = currentCustomerLink.length > 0;
  const validActionLink = isValidHttpUrl(actionLink, 'whatsapp_reply_pack_action_link');
  const hasActionLink = actionLink.length > 0;
  const hasIdentity = hasUsefulText(businessName, 2) && hasUsefulText(cityOrArea || locationOrServiceArea, 2);
  const hasOffer = hasUsefulText(offerSummary, 12);
  const hasHours = hasUsefulText(hours, 3) || hasUsefulText(responseTime, 3);
  const hasPayment = hasUsefulText(paymentInfo, 3);
  const hasDelivery = hasUsefulText(deliveryOrPickup || locationOrServiceArea, 3);
  const hasAction = validActionLink || validCustomerLink || input.preferredAction === 'visit';
  const copyBlocks = buildReplyBlocks({
    actionLink,
    businessName,
    cityOrArea,
    currentCustomerLink,
    deliveryOrPickup,
    hours,
    locationOrServiceArea,
    offerSummary,
    paymentInfo,
    preferredAction: input.preferredAction,
    responseTime,
  });
  const previewLink = makePreviewLink(phoneDigits, copyBlocks[0]?.body || '');

  const checks: WhatsAppReplyPackItem[] = [
    makeCheck(
      'business_identity',
      hasIdentity ? 'present' : 'missing',
      hasIdentity ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'whatsapp_number',
      validPhone ? 'present' : phoneDigits ? 'unclear' : 'missing',
      validPhone ? 'local_phone_format_valid' : phoneDigits ? 'local_phone_format_unclear' : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCustomerLink ? 'present' : hasCustomerLink ? 'unclear' : 'missing',
      validCustomerLink ? 'local_url_format_valid' : hasCustomerLink ? 'local_url_format_invalid' : 'not_provided',
    ),
    makeCheck(
      'offer_summary',
      hasOffer ? 'present' : 'missing',
      hasOffer ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'hours_expectation',
      hasHours ? 'present' : 'unclear',
      hasHours ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'action_path',
      hasAction ? 'present' : hasActionLink ? 'unclear' : 'missing',
      validActionLink
        ? 'local_url_format_valid'
        : validCustomerLink
          ? 'local_url_format_valid'
          : hasActionLink
            ? 'local_url_format_invalid'
            : input.preferredAction
              ? 'owner_selected'
              : 'not_provided',
    ),
    makeCheck(
      'payment_context',
      hasPayment ? 'present' : 'unclear',
      hasPayment ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'delivery_pickup_context',
      hasDelivery ? 'present' : 'unclear',
      hasDelivery ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'reply_pack',
      copyBlocks.length > 0 ? 'present' : 'not_checked',
      copyBlocks.length > 0 ? 'deterministic_copy' : 'not_checked',
    ),
    makeCheck(
      'wa_me_preview',
      previewLink ? 'present' : phoneDigits ? 'unclear' : 'not_checked',
      previewLink ? 'local_phone_format_valid' : phoneDigits ? 'local_phone_format_unclear' : 'not_checked',
    ),
    makeCheck('message_delivery', 'not_checked', 'external_boundary'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    preferredAction: input.preferredAction,
    previewLink,
    checks,
    copyBlocks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      messageSent: false,
      whatsappApiCalled: false,
      phoneNumberVerified: false,
      whatsappLinkOpened: false,
      externalUrlFetched: false,
      externalPlatformUpdated: false,
      reportStored: false,
      aiRewriteGenerated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
