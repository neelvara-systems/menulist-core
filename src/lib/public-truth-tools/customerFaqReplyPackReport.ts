import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  CustomerFaqReplyBlock,
  CustomerFaqReplyPackAction,
  CustomerFaqReplyPackCheckId,
  CustomerFaqReplyPackEvidence,
  CustomerFaqReplyPackInput,
  CustomerFaqReplyPackItem,
  CustomerFaqReplyPackReport,
  CustomerFaqReplyPackResult,
} from './customerFaqReplyPackTypes';

const REQUIRED_CHECKS = new Set<CustomerFaqReplyPackCheckId>([
  'business_identity',
  'customer_questions',
  'answer_source',
  'current_customer_link',
  'faq_reply_pack',
]);

const ACTION_LABELS: Record<CustomerFaqReplyPackAction, string> = {
  answer_question: 'Answer questions',
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

function getCustomerFaqReplyPackEvidenceText(evidence: CustomerFaqReplyPackEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered questions and business facts only.';
    case 'owner_selected':
      return 'Checked owner-selected action only.';
    case 'local_url_format_valid':
    case 'local_url_format_invalid':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'deterministic_copy':
      return 'FAQ replies were generated from owner-entered facts only. No AI answer was generated.';
    case 'automation_boundary':
      return 'No customer conversation logs were read, no chatbot was created, no automation was configured, and no message was sent.';
    case 'not_provided':
      return 'No owner-entered fact was provided for this row.';
    case 'not_checked':
      return 'This fact was not checked in V0. Links are not opened, customer conversations are not read, and AI answers are not generated.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: CustomerFaqReplyPackCheckId,
  result: CustomerFaqReplyPackResult,
  evidence: CustomerFaqReplyPackEvidence,
): CustomerFaqReplyPackItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getCustomerFaqReplyPackEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: CustomerFaqReplyPackItem[]): CustomerFaqReplyPackReport['summary'] {
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

function getStatus(checks: CustomerFaqReplyPackItem[]): CustomerFaqReplyPackReport['status'] {
  const blockingMissing = checks.some((check) =>
    ['business_identity', 'customer_questions', 'answer_source'].includes(check.id)
    && (check.result === 'missing' || check.result === 'not_checked')
  );

  if (blockingMissing) return 'missing_basics';

  const unclear = checks.some((check) =>
    [
      'current_customer_link',
      'menu_service_context',
      'hours_context',
      'price_context',
      'location_contact_context',
      'action_context',
    ].includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return unclear ? 'unclear' : 'ready';
}

function getNextActionType(status: CustomerFaqReplyPackReport['status']): CustomerFaqReplyPackReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'complete_faq_facts';
}

function getFactOrPlaceholder(value: string, placeholder: string): string {
  return hasUsefulText(value) ? value : placeholder;
}

function getActionSentence(action: CustomerFaqReplyPackAction, actionLink: string, currentCustomerLink: string): string {
  const label = ACTION_LABELS[action];
  const link = actionLink || currentCustomerLink;
  if (link) return `${label}: ${link}`;
  return `${label}: add the best customer action.`;
}

function buildQuestionList(value: string): string {
  const questions = normalizeMultiline(value)
    .split('\n')
    .map((line) => line.replace(/^[-*0-9.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 5);

  if (questions.length === 0) return 'No repeated customer questions were entered.';
  return questions.map((question) => `- ${question}`).join('\n');
}

function buildFaqReplyBlocks(input: {
  actionLink: string;
  answerSource: string;
  availabilityNotes: string;
  businessName: string;
  cityOrArea: string;
  currentCustomerLink: string;
  customerQuestions: string;
  hours: string;
  locationContact: string;
  menuOrServices: string;
  preferredAction: CustomerFaqReplyPackAction;
  prices: string;
}): CustomerFaqReplyBlock[] {
  const businessName = getFactOrPlaceholder(input.businessName, 'Business name not provided');
  const area = getFactOrPlaceholder(input.cityOrArea, 'area not provided');
  const menuOrServices = getFactOrPlaceholder(input.menuOrServices || input.answerSource, 'menu, services, or offers not provided');
  const hours = getFactOrPlaceholder(input.hours, 'hours not provided');
  const prices = getFactOrPlaceholder(input.prices, 'prices or quote path not provided');
  const locationContact = getFactOrPlaceholder(input.locationContact || input.cityOrArea, 'location or contact details not provided');
  const availabilityNotes = getFactOrPlaceholder(input.availabilityNotes, 'availability notes not provided');
  const customerLink = getFactOrPlaceholder(input.currentCustomerLink, 'current customer link not provided');
  const actionSentence = getActionSentence(input.preferredAction, input.actionLink, input.currentCustomerLink);
  const questionList = buildQuestionList(input.customerQuestions);
  const sourceSummary = getFactOrPlaceholder(input.answerSource, 'answer source facts not provided');
  const evidenceText = getCustomerFaqReplyPackEvidenceText('deterministic_copy');

  return [
    {
      id: 'faq_overview',
      title: 'FAQ overview',
      body: `Use these replies for ${businessName} in ${area}. Repeated customer questions entered:\n${questionList}\n\nCurrent source: ${customerLink}. Source facts: ${truncateText(sourceSummary, 180)}.`,
      evidenceText,
    },
    {
      id: 'menu_service_answer',
      title: 'Menu or service answer',
      body: `Q: What do you offer?\nA: ${businessName} offers ${truncateText(menuOrServices, 180)}. For current details, use ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'hours_answer',
      title: 'Hours answer',
      body: `Q: When are you open?\nA: ${hours}. For current details before visiting or ordering, use ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'price_answer',
      title: 'Price answer',
      body: `Q: What are the prices?\nA: ${prices}. For the current list and any availability notes, use ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'location_contact_answer',
      title: 'Location and contact answer',
      body: `Q: Where are you and how can I contact you?\nA: ${locationContact}. Current details: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'order_booking_answer',
      title: 'Order or booking answer',
      body: `Q: How do I take the next step?\nA: ${actionSentence}. Current details: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'availability_notes_answer',
      title: 'Availability notes answer',
      body: `Q: Is this available now?\nA: ${availabilityNotes}. Please check the current customer link before acting: ${customerLink}.`,
      evidenceText,
    },
    {
      id: 'fallback_answer',
      title: 'Fallback answer',
      body: `Q: I need something not listed here.\nA: Thanks for asking. Please share what you need and check the current ${businessName} details here: ${customerLink}.`,
      evidenceText,
    },
  ];
}

export function buildCustomerFaqReplyPackReport(input: CustomerFaqReplyPackInput): CustomerFaqReplyPackReport {
  const actionLink = trimToSingleLine(input.actionLink);
  const answerSource = normalizeMultiline(input.answerSource);
  const availabilityNotes = trimToSingleLine(input.availabilityNotes);
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const customerQuestions = normalizeMultiline(input.customerQuestions);
  const hours = trimToSingleLine(input.hours);
  const locationContact = trimToSingleLine(input.locationContact);
  const menuOrServices = trimToSingleLine(input.menuOrServices);
  const prices = trimToSingleLine(input.prices);
  const hasCurrentCustomerLink = currentCustomerLink.length > 0;
  const validCurrentCustomerLink = isValidHttpUrl(currentCustomerLink);
  const hasActionLink = actionLink.length > 0;
  const validActionLink = isValidHttpUrl(actionLink);

  const checks: CustomerFaqReplyPackItem[] = [
    makeCheck(
      'business_identity',
      hasUsefulText(businessName, 2) && hasUsefulText(cityOrArea, 2) ? 'present' : 'missing',
      hasUsefulText(businessName, 2) || hasUsefulText(cityOrArea, 2) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'customer_questions',
      hasUsefulText(customerQuestions, 12) ? 'present' : 'missing',
      hasUsefulText(customerQuestions, 12) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'answer_source',
      hasUsefulText(answerSource, 40) ? 'present' : 'missing',
      hasUsefulText(answerSource, 40) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCurrentCustomerLink ? 'present' : hasCurrentCustomerLink ? 'unclear' : 'missing',
      validCurrentCustomerLink ? 'local_url_format_valid' : hasCurrentCustomerLink ? 'local_url_format_invalid' : 'not_provided',
    ),
    makeCheck(
      'menu_service_context',
      hasUsefulText(menuOrServices, 8) ? 'present' : hasUsefulText(answerSource, 40) ? 'unclear' : 'missing',
      hasUsefulText(menuOrServices, 8) || hasUsefulText(answerSource, 40) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'hours_context',
      hasUsefulText(hours, 5) ? 'present' : 'unclear',
      hasUsefulText(hours, 5) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'price_context',
      hasUsefulText(prices, 3) ? 'present' : 'unclear',
      hasUsefulText(prices, 3) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'location_contact_context',
      hasUsefulText(locationContact, 5) || hasUsefulText(cityOrArea, 2) ? 'present' : 'unclear',
      hasUsefulText(locationContact, 5) || hasUsefulText(cityOrArea, 2) ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'action_context',
      validActionLink || validCurrentCustomerLink ? 'present' : hasActionLink ? 'unclear' : 'missing',
      validActionLink || validCurrentCustomerLink ? 'local_url_format_valid' : hasActionLink ? 'local_url_format_invalid' : 'not_provided',
    ),
    makeCheck('faq_reply_pack', 'present', 'deterministic_copy'),
    makeCheck('automation_boundary', 'not_checked', 'automation_boundary'),
  ];

  const copyBlocks = buildFaqReplyBlocks({
    actionLink,
    answerSource,
    availabilityNotes,
    businessName,
    cityOrArea,
    currentCustomerLink,
    customerQuestions,
    hours,
    locationContact,
    menuOrServices,
    preferredAction: input.preferredAction,
    prices,
  });
  const summary = countSummary(checks);
  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    preferredAction: input.preferredAction,
    checks,
    copyBlocks,
    summary,
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      conversationLogsRead: false,
      chatbotCreated: false,
      messageSent: false,
      automationConfigured: false,
      externalUrlFetched: false,
      externalPlatformUpdated: false,
      reportStored: false,
      aiAnswerGenerated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
