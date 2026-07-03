import type {
  BookingInquiryPrimaryAction,
  BookingInquiryReadinessCheckId,
  BookingInquiryReadinessEvidence,
  BookingInquiryReadinessInput,
  BookingInquiryReadinessItem,
  BookingInquiryReadinessReport,
  BookingInquiryReadinessResult,
} from './bookingInquiryReadinessTypes';

const REQUIRED_CHECKS = new Set<BookingInquiryReadinessCheckId>([
  'primary_action',
  'action_destination',
  'response_expectation',
  'hours_context',
  'fallback_contact',
  'confirmation_expectation',
  'current_customer_link',
]);

const ACTION_HINTS: Record<BookingInquiryPrimaryAction, RegExp> = {
  book: /(?:\bbook\b|\bappointment\b|\bslot\b|\bschedule\b|\bvisit\b)/i,
  call: /(?:\bcall\b|\bphone\b|\btel\b|\bnumber\b)/i,
  message: /(?:\bmessage\b|\bchat\b|\bask\b|\binquiry\b|\benquire\b|\bcontact\b)/i,
  order: /(?:\border\b|\bdelivery\b|\bpickup\b|\btakeaway\b|\bcart\b)/i,
  other: /(?:\bbook\b|\border\b|\breserve\b|\bcall\b|\bmessage\b|\bquote\b|\bvisit\b|\bcontact\b)/i,
  quote: /(?:\bquote\b|\bestimate\b|\brate\b|\bprice\b|\bconsultation\b|\binquiry\b)/i,
  reserve: /(?:\breserve\b|\breservation\b|\btable\b|\bbooking\b)/i,
  visit: /(?:\bvisit\b|\bwalk[- ]?in\b|\bdirections?\b|\baddress\b|\bstore\b|\bshop\b)/i,
  whatsapp: /(?:\bwhatsapp\b|\bwa\.me\b|\bmessage\b|\bchat\b)/i,
};

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeActionText(value?: string): string {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function getUrlWithProtocol(value: string): string {
  if (/^https?:\/\//i.test(value) || /^tel:/i.test(value) || /^mailto:/i.test(value) || /^whatsapp:\/\//i.test(value)) {
    return value;
  }
  if (/^(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(value)) {
    return `https://${value}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;

  try {
    const url = new URL(getUrlWithProtocol(value));
    const hostLooksUsable = url.hostname === 'localhost'
      || url.hostname === '127.0.0.1'
      || url.hostname.includes('.');
    return (url.protocol === 'http:' || url.protocol === 'https:') && hostLooksUsable;
  } catch {
    return false;
  }
}

function normalizePhoneDigits(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('00') && digits.length > 2) return digits.slice(2);
  return digits;
}

function isLikelyPhoneNumber(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return digits.length >= 8 && digits.length <= 15;
}

function isValidActionDestination(value: string): boolean {
  if (!value) return false;
  if (isValidHttpUrl(value)) return true;
  if (/^tel:/i.test(value) || /^mailto:/i.test(value) || /^whatsapp:\/\//i.test(value)) return true;
  return isLikelyPhoneNumber(value);
}

function hasActionHint(actionText: string, primaryAction: BookingInquiryPrimaryAction): boolean {
  return ACTION_HINTS[primaryAction].test(actionText) || ACTION_HINTS.other.test(actionText);
}

function hasResponseTimeHint(value: string): boolean {
  return /(?:\breply\b|\bresponse\b|\brespond\b|\bwithin\b|\bminutes?\b|\bhours?\b|\btoday\b|\btomorrow\b|\bcall back\b|\bconfirm\b|\bconfirmation\b|\bavailable\b|\bslot\b)/i.test(value);
}

function hasHoursHint(value: string): boolean {
  return /(?:\bhours?\b|\bopen\b|\bclosed\b|\btiming\b|\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b)/i.test(value);
}

function hasFallbackContactHint(value: string): boolean {
  return /(?:\bcall\b|\bphone\b|\bwhatsapp\b|\bmessage\b|\bemail\b|\bcontact\b|\bhelp\b|\bsupport\b|\+?\d[\d\s().-]{7,}\d)/i.test(value);
}

function hasConfirmationHint(value: string): boolean {
  return /(?:\bconfirm\b|\bconfirmation\b|\bconfirmed\b|\bwe will call\b|\bwe will message\b|\bsubject to availability\b|\bslot\b|\bnot final\b|\bwait for\b)/i.test(value);
}

function hasLocationOrServiceAreaHint(value: string): boolean {
  return /(?:\baddress\b|\blocation\b|\bdirections?\b|\bnear\b|\bservice area\b|\bdelivery area\b|\bvisit\b|\bbranch\b|\bcity\b|\barea\b|\bpin code\b|\bpincode\b|\bzip\b)/i.test(value);
}

function getBookingInquiryEvidenceText(evidence: BookingInquiryReadinessEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered action text and fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'action_text_hint':
      return 'Checked action words in the owner-entered text only.';
    case 'valid_action_destination':
      return 'Action destination format was checked locally. The link, phone number, inbox, calendar, or provider was not opened.';
    case 'unclear_action_destination':
      return 'Action destination format was checked locally. Add a clear link, phone number, WhatsApp link, email, or customer page.';
    case 'valid_public_url':
      return 'Customer link format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'Customer link format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No owner-entered source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. Booking providers, calendars, payments, inboxes, external pages, and messages were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: BookingInquiryReadinessCheckId,
  result: BookingInquiryReadinessResult,
  evidence: BookingInquiryReadinessEvidence,
): BookingInquiryReadinessItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getBookingInquiryEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: BookingInquiryReadinessItem[]): BookingInquiryReadinessReport['summary'] {
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

function getStatus(checks: BookingInquiryReadinessItem[]): BookingInquiryReadinessReport['status'] {
  const primaryAction = checks.find((check) => check.id === 'primary_action');
  const actionDestination = checks.find((check) => check.id === 'action_destination');

  if (
    primaryAction?.result === 'missing'
    || primaryAction?.result === 'not_checked'
    || actionDestination?.result === 'missing'
    || actionDestination?.result === 'not_checked'
  ) {
    return 'missing_basics';
  }

  const blockingChecks: BookingInquiryReadinessCheckId[] = [
    'primary_action',
    'action_destination',
    'response_expectation',
    'hours_context',
    'fallback_contact',
    'confirmation_expectation',
    'current_customer_link',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: BookingInquiryReadinessReport['status']): BookingInquiryReadinessReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'fix_booking_inquiry';
}

export function buildBookingInquiryReadinessReport(input: BookingInquiryReadinessInput): BookingInquiryReadinessReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const publicUrl = trimToSingleLine(input.publicUrl);
  const actionText = normalizeActionText(input.actionText);
  const actionLinkOrNumber = trimToSingleLine(input.actionLinkOrNumber);
  const primaryAction = input.primaryAction || 'other';
  const hasActionText = actionText.replace(/\s+/g, ' ').trim().length >= 8;
  const actionLooksVisible = input.actionVisible || hasActionHint(actionText, primaryAction);
  const hasDestination = actionLinkOrNumber.length > 0;
  const validDestination = isValidActionDestination(actionLinkOrNumber);
  const unclearDestination = hasDestination && !validDestination;
  const hasCustomerLink = publicUrl.length > 0;
  const validCustomerLink = isValidHttpUrl(publicUrl);
  const responseExpectation = input.responseTimeShown || hasResponseTimeHint(actionText);
  const hoursContext = input.hoursShown || hasHoursHint(actionText);
  const fallbackContact = input.fallbackContactShown || hasFallbackContactHint(actionText);
  const confirmationExpectation = input.confirmationExpectationShown || hasConfirmationHint(actionText);
  const locationOrServiceArea = input.serviceAreaOrLocationShown || hasLocationOrServiceAreaHint(actionText);

  const checks: BookingInquiryReadinessItem[] = [
    makeCheck(
      'primary_action',
      actionLooksVisible ? 'present' : hasActionText ? 'unclear' : 'missing',
      actionLooksVisible ? 'action_text_hint' : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'action_destination',
      validDestination ? 'present' : unclearDestination ? 'unclear' : 'missing',
      validDestination ? 'valid_action_destination' : unclearDestination ? 'unclear_action_destination' : 'not_provided',
    ),
    makeCheck(
      'response_expectation',
      responseExpectation ? 'present' : hasActionText ? 'unclear' : 'missing',
      responseExpectation ? (input.responseTimeShown ? 'owner_selected' : 'action_text_hint') : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'hours_context',
      hoursContext ? 'present' : hasActionText ? 'unclear' : 'missing',
      hoursContext ? (input.hoursShown ? 'owner_selected' : 'action_text_hint') : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'fallback_contact',
      fallbackContact ? 'present' : hasActionText ? 'unclear' : 'missing',
      fallbackContact ? (input.fallbackContactShown ? 'owner_selected' : 'action_text_hint') : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'confirmation_expectation',
      confirmationExpectation ? 'present' : hasActionText ? 'unclear' : 'missing',
      confirmationExpectation ? (input.confirmationExpectationShown ? 'owner_selected' : 'action_text_hint') : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'location_or_service_area',
      locationOrServiceArea ? 'present' : hasActionText ? 'unclear' : 'missing',
      locationOrServiceArea ? (input.serviceAreaOrLocationShown ? 'owner_selected' : 'action_text_hint') : hasActionText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCustomerLink ? 'present' : hasCustomerLink ? 'unclear' : 'missing',
      validCustomerLink ? 'valid_public_url' : hasCustomerLink ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck('external_booking_inspection', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind: input.sourceKind || 'menu',
    primaryAction,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      externalUrlFetched: false,
      bookingProviderChecked: false,
      calendarChecked: false,
      paymentChecked: false,
      messageSent: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
