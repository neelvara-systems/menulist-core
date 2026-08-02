import {
  getUrlWithPublicHttpsProtocol,
  isPublicHttpsUrl as isValidHttpUrl,
} from './publicUrlValidation';
import {
  getWhatsAppSchemePhoneDigits,
  isLikelyPhoneNumber,
  normalizePhoneDigits,
} from './phoneValidation';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import {
  boundPublicTruthToolInput,
  PUBLIC_TRUTH_TOOL_INPUT_LIMITS,
  type PublicTruthToolInputLimit,
} from './publicTruthToolInputLimits';
import type {
  WhatsAppActionLinkCheckId,
  WhatsAppActionLinkEvidence,
  WhatsAppActionLinkInput,
  WhatsAppActionLinkItem,
  WhatsAppActionLinkReport,
  WhatsAppActionLinkResult,
} from './whatsappActionLinkTypes';

const MAX_WHATSAPP_ACTION_LINK_PARSE_DIAGNOSTICS = 25;
const reportedWhatsAppActionLinkParseFailures = new Set<string>();

const REQUIRED_CHECKS = new Set<WhatsAppActionLinkCheckId>([
  'whatsapp_number',
  'click_to_chat_format',
  'message_intent',
  'suggested_message',
  'menu_or_service_link',
  'fallback_action',
]);

function trimToSingleLine(
  value?: string,
  maxLength: PublicTruthToolInputLimit = PUBLIC_TRUTH_TOOL_INPUT_LIMITS.shortText,
): string {
  return boundPublicTruthToolInput(value, maxLength).replace(/\s+/g, ' ').trim();
}

function trimMessage(value?: string): string {
  return boundPublicTruthToolInput(value, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.longText)
    .replace(/\r\n/g, '\n')
    .trim();
}

function isLikelyWhatsAppPhone(rawValue: string): boolean {
  return isLikelyPhoneNumber(rawValue, { requireCountryCode: true });
}

function getUrlWithProtocol(value: string): string {
  if (/^whatsapp:\/\//i.test(value)) return value;
  if (/^(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(value)) {
    return `https://${value}`;
  }
  return getUrlWithPublicHttpsProtocol(value);
}

function hasExplicitProtocol(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
}

function getWhatsAppLinkValueKind(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function logWhatsAppActionLinkParseFailure(error: unknown, value: unknown, candidate: string): void {
  const valueKind = getWhatsAppLinkValueKind(value);
  const valueLength = typeof value === 'string' ? value.trim().length : 0;
  const candidateLooksLikeWhatsAppScheme = /^whatsapp:\/\//i.test(candidate);
  const candidateLooksLikeWhatsAppHost = /^(?:https:\/\/)?(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(candidate);
  const failureKey = [
    valueKind,
    valueLength,
    candidate.length,
    hasExplicitProtocol(candidate) ? 'explicit-protocol' : 'implicit-protocol',
    candidateLooksLikeWhatsAppScheme ? 'whatsapp-scheme' : 'no-whatsapp-scheme',
    candidateLooksLikeWhatsAppHost ? 'whatsapp-host' : 'no-whatsapp-host',
  ].join(':');

  if (reportedWhatsAppActionLinkParseFailures.has(failureKey)) return;
  if (reportedWhatsAppActionLinkParseFailures.size >= MAX_WHATSAPP_ACTION_LINK_PARSE_DIAGNOSTICS) return;
  reportedWhatsAppActionLinkParseFailures.add(failureKey);

  logRuntimeFailure('whatsapp_action_link_url_parse_failed', error, {
    valueKind,
    valueStringLength: valueLength,
    candidateLength: candidate.length,
    candidateHasExplicitProtocol: hasExplicitProtocol(candidate),
    candidateLooksLikeWhatsAppScheme,
    candidateLooksLikeWhatsAppHost,
    fallbackPolicy: 'treat_as_invalid_whatsapp_link',
  });
}

function parseWhatsAppUrl(value: string): URL | null {
  if (!value) return null;
  const candidate = getUrlWithProtocol(value);

  try {
    return new URL(candidate);
  } catch (error) {
    logWhatsAppActionLinkParseFailure(error, value, candidate);
    return null;
  }
}

function getPhoneFromWhatsAppUrl(url: URL | null): string {
  if (!url) return '';

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (hostname === 'wa.me') {
    const pathParts = url.pathname.split('/').filter(Boolean);
    const phone = pathParts.length === 1 ? pathParts[0] : '';
    return /^\d{8,15}$/.test(phone) && !phone.startsWith('0') ? phone : '';
  }

  if (url.protocol === 'whatsapp:') {
    return getWhatsAppSchemePhoneDigits(url.toString());
  }

  if (hostname === 'api.whatsapp.com' || hostname === 'web.whatsapp.com') {
    const rawPhone = url.searchParams.get('phone') || '';
    return isLikelyWhatsAppPhone(rawPhone) ? normalizePhoneDigits(rawPhone) : '';
  }

  return '';
}

function isRecognizedWhatsAppUrl(url: URL | null): boolean {
  if (!url) return false;

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (url.protocol === 'whatsapp:') return Boolean(getWhatsAppSchemePhoneDigits(url.toString()));
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
  if (hostname === 'wa.me') return true;
  if (hostname !== 'api.whatsapp.com' && hostname !== 'web.whatsapp.com') return false;
  return /^\/send\/?$/i.test(url.pathname);
}

function getValidLinkPhone(rawLink: string): string {
  const url = parseWhatsAppUrl(rawLink);
  if (!isRecognizedWhatsAppUrl(url)) return '';

  const phone = getPhoneFromWhatsAppUrl(url);
  return phone.length >= 8 && phone.length <= 15 && !phone.startsWith('0') ? phone : '';
}

function hasMessageActionHint(value: string): boolean {
  return /(?:\border\b|\bbook\b|\breserve\b|\bquote\b|\bprice\b|\bask\b|\bquestion\b|\bmenu\b|\bservice\b|\bappointment\b|\bdelivery\b|\bpickup\b|\bhelp\b|\bsupport\b|\bavailable\b|\btoday\b|\bslot\b)/i.test(value);
}

function hasHoursHint(value: string): boolean {
  return /(?:\bhours?\b|\bopen\b|\bclosed\b|\btiming\b|\brepl(?:y|ies)\b|\brespond\b|\bresponse\b|\bmorning\b|\bevening\b|\btonight\b|\bwithin\s+\d+\s*(?:minutes?|hours?|days?)\b)/i.test(value);
}

function makePreviewLink(phoneDigits: string, message: string): string | null {
  if (!phoneDigits || phoneDigits.length < 8 || phoneDigits.length > 15) return null;
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phoneDigits}${encodedMessage}`;
}

function getWhatsAppActionLinkEvidenceText(evidence: WhatsAppActionLinkEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'valid_phone_format':
      return 'Phone number shape was checked locally. The number was not verified with WhatsApp.';
    case 'unclear_phone_format':
      return 'Phone number shape was checked locally. Add country code if this is the customer WhatsApp number.';
    case 'valid_whatsapp_link_format':
      return 'WhatsApp link format was checked locally. The link was not opened and no message was sent.';
    case 'invalid_whatsapp_link_format':
      return 'WhatsApp link format was checked locally. The link was not opened and no message was sent.';
    case 'generated_click_to_chat_format':
      return 'A click-to-chat URL shape was generated locally. It was not opened and no message was sent.';
    case 'message_text_hint':
      return 'Checked action words and message length in the entered message only.';
    case 'customer_link_format':
      return 'Public HTTPS customer link format was checked locally. The link was not opened or fetched.';
    case 'not_provided':
      return 'No owner-entered source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. WhatsApp was not contacted, links were not opened, and messages were not sent.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: WhatsAppActionLinkCheckId,
  result: WhatsAppActionLinkResult,
  evidence: WhatsAppActionLinkEvidence,
): WhatsAppActionLinkItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getWhatsAppActionLinkEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: WhatsAppActionLinkItem[]): WhatsAppActionLinkReport['summary'] {
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

function getStatus(checks: WhatsAppActionLinkItem[]): WhatsAppActionLinkReport['status'] {
  const numberCheck = checks.find((check) => check.id === 'whatsapp_number');
  const formatCheck = checks.find((check) => check.id === 'click_to_chat_format');

  if (numberCheck?.result === 'missing' || numberCheck?.result === 'not_checked') return 'missing_basics';
  if (formatCheck?.result === 'missing' || formatCheck?.result === 'not_checked') return 'missing_basics';

  const blockingChecks: WhatsAppActionLinkCheckId[] = [
    'click_to_chat_format',
    'message_intent',
    'suggested_message',
    'menu_or_service_link',
    'hours_expectation',
    'fallback_action',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: WhatsAppActionLinkReport['status']): WhatsAppActionLinkReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'fix_whatsapp_action';
}

export function buildWhatsAppActionLinkReport(input: WhatsAppActionLinkInput): WhatsAppActionLinkReport {
  const businessName = trimToSingleLine(input.businessName, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.cityOrArea);
  const whatsappNumber = trimToSingleLine(input.whatsappNumber, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.phone);
  const existingWhatsappLink = trimToSingleLine(input.existingWhatsappLink, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink, PUBLIC_TRUTH_TOOL_INPUT_LIMITS.url);
  const suggestedMessage = trimMessage(input.suggestedMessage);
  const enteredDigits = normalizePhoneDigits(whatsappNumber);
  const validLinkPhone = getValidLinkPhone(existingWhatsappLink);
  const validPhone = isLikelyWhatsAppPhone(whatsappNumber);
  const hasValidPhoneSource = Boolean(validLinkPhone) || validPhone;
  const hasAnyPhoneSource = Boolean(whatsappNumber || existingWhatsappLink);
  const hasRecognizedLink = isRecognizedWhatsAppUrl(parseWhatsAppUrl(existingWhatsappLink));
  const validClickToChat = Boolean(validLinkPhone) || validPhone;
  const hasUnclearPhone = Boolean(enteredDigits) && !validPhone;
  const hasUnclearLink = Boolean(existingWhatsappLink) && !validLinkPhone;
  const messageLooksUseful = suggestedMessage.length >= 12 && hasMessageActionHint(suggestedMessage);
  const intentLooksUseful = input.messageIntent !== 'other' || hasMessageActionHint(suggestedMessage);
  const validCurrentCustomerLink = isValidHttpUrl(currentCustomerLink, 'whatsapp_action_link_current_customer_link');
  const hasCustomerLink = input.menuOrServiceLinkAttached || validCurrentCustomerLink;
  const hasInvalidCustomerLink = Boolean(currentCustomerLink) && !validCurrentCustomerLink;
  const hasHoursExpectation = input.hoursExpectationSet || hasHoursHint(suggestedMessage);
  const previewPhone = validLinkPhone || (validPhone ? enteredDigits : '');
  const previewLink = makePreviewLink(previewPhone, suggestedMessage);

  const checks: WhatsAppActionLinkItem[] = [
    makeCheck(
      'whatsapp_number',
      hasValidPhoneSource ? 'present' : hasAnyPhoneSource ? 'unclear' : 'missing',
      validLinkPhone
        ? 'valid_whatsapp_link_format'
        : validPhone
          ? 'valid_phone_format'
          : hasAnyPhoneSource
            ? 'unclear_phone_format'
            : 'not_provided',
    ),
    makeCheck(
      'click_to_chat_format',
      validClickToChat
        ? 'present'
        : hasUnclearPhone || hasUnclearLink || hasRecognizedLink
          ? 'unclear'
          : hasAnyPhoneSource
            ? 'missing'
            : 'not_checked',
      validLinkPhone
        ? 'valid_whatsapp_link_format'
        : validPhone
          ? 'generated_click_to_chat_format'
          : hasUnclearPhone
            ? 'unclear_phone_format'
            : hasUnclearLink || hasRecognizedLink
              ? 'invalid_whatsapp_link_format'
              : hasAnyPhoneSource
                ? 'invalid_whatsapp_link_format'
                : 'not_checked',
    ),
    makeCheck(
      'message_intent',
      intentLooksUseful ? 'present' : suggestedMessage ? 'unclear' : 'missing',
      intentLooksUseful ? 'owner_selected' : suggestedMessage ? 'message_text_hint' : 'not_provided',
    ),
    makeCheck(
      'suggested_message',
      messageLooksUseful ? 'present' : suggestedMessage ? 'unclear' : 'missing',
      messageLooksUseful || suggestedMessage ? 'message_text_hint' : 'not_provided',
    ),
    makeCheck(
      'menu_or_service_link',
      hasCustomerLink ? 'present' : hasInvalidCustomerLink ? 'unclear' : 'missing',
      input.menuOrServiceLinkAttached
        ? 'owner_selected'
        : validCurrentCustomerLink
          ? 'customer_link_format'
          : hasInvalidCustomerLink
            ? 'customer_link_format'
            : 'not_provided',
    ),
    makeCheck(
      'hours_expectation',
      hasHoursExpectation ? 'present' : suggestedMessage ? 'unclear' : 'missing',
      input.hoursExpectationSet ? 'owner_selected' : hasHoursExpectation ? 'message_text_hint' : suggestedMessage ? 'message_text_hint' : 'not_provided',
    ),
    makeCheck(
      'fallback_action',
      input.fallbackActionShown ? 'present' : 'missing',
      input.fallbackActionShown ? 'owner_selected' : 'not_provided',
    ),
    makeCheck('message_delivery', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    messageIntent: input.messageIntent || 'ask_question',
    previewLink,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      messageSent: false,
      phoneNumberVerified: false,
      whatsappLinkOpened: false,
      externalUrlFetched: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
