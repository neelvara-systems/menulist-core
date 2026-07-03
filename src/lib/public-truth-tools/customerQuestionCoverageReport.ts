import type {
  CustomerQuestionCoverageCheckId,
  CustomerQuestionCoverageEvidence,
  CustomerQuestionCoverageInput,
  CustomerQuestionCoverageItem,
  CustomerQuestionCoverageReport,
  CustomerQuestionCoverageResult,
} from './customerQuestionCoverageTypes';

const REQUIRED_CHECKS = new Set<CustomerQuestionCoverageCheckId>([
  'customer_questions',
  'source_material',
  'menu_or_services_answers',
  'hours_answers',
  'location_contact_answers',
  'action_answers',
  'current_customer_link',
]);

const QUESTION_PATTERNS: Record<string, RegExp> = {
  action: /(?:\border\b|\bbook\b|\breserve\b|\bappointment\b|\bcall\b|\bwhatsapp\b|\bmessage\b|\bcontact\b|\bdelivery\b|\bpickup\b|\btakeaway\b|\bpay\b|\bpayment\b|\bslot\b|\bavailable\b)/i,
  hours: /(?:\bopen\b|\bclose\b|\bhours?\b|\btiming\b|\btoday\b|\btomorrow\b|\bholiday\b|\bsunday\b|\bweekend\b|\bwhen\b|\btime\b)/i,
  locationContact: /(?:\bwhere\b|\blocation\b|\baddress\b|\bdirections?\b|\bnear\b|\bphone\b|\bnumber\b|\bcall\b|\bcontact\b|\bemail\b|\bmap\b|\bparking\b)/i,
  menuServices: /(?:\bmenu\b|\bservice\b|\bservices\b|\bitems?\b|\bcatalog\b|\bpackage\b|\bpackages\b|\brate card\b|\bprice list\b|\bwhat do you\b|\bwhat is available\b|\boptions?\b)/i,
  notesAvailability: /(?:\bveg\b|\bvegetarian\b|\bvegan\b|\ballergen\b|\ballergy\b|\bhalal\b|\bgluten\b|\bavailable\b|\bavailability\b|\bin stock\b|\bsold out\b|\bsize\b|\bserves\b|\bdietary\b|\bnotes?\b)/i,
  prices: /(?:\bprice\b|\bprices\b|\brate\b|\brates\b|\bcost\b|\bcosts\b|\bcharge\b|\bcharges\b|\bfee\b|\bfees\b|\bhow much\b|\bquote\b|\bstarting\b)/i,
};

const SOURCE_PATTERNS: Record<string, RegExp> = {
  action: /(?:\border\b|\bbook\b|\breserve\b|\bcall\b|\bwhatsapp\b|\bmessage\b|\bdirections?\b|\bvisit\b|\bcontact\b|\bdelivery\b|\bpickup\b|\btap\b|\blink\b|\bpay\b|\bbooking\b)/i,
  hours: /(?:\bopen\b|\bclosed?\b|\bhours?\b|\btiming\b|\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b)/i,
  locationContact: /(?:\baddress\b|\blocation\b|\bdirections?\b|\bnear\b|\bphone\b|\bcall\b|\bcontact\b|\bemail\b|\bwhatsapp\b|\bmap\b|\bparking\b|\+?\d[\d\s().-]{7,}\d)/i,
  menuServices: /(?:\bmenu\b|\bservices?\b|\bcatalog\b|\bpackages?\b|\brate card\b|\bprice list\b|\bstarters?\b|\bmains?\b|\bdesserts?\b|\bdrinks?\b|\bhaircut\b|\bfacial\b|\brepair\b|\bconsultation\b|\bitems?\b)/i,
  notesAvailability: /(?:\bveg\b|\bvegetarian\b|\bvegan\b|\ballergen\b|\ballergy\b|\bhalal\b|\bgluten\b|\bavailable\b|\bavailability\b|\bin stock\b|\bsold out\b|\bserves\b|\bsize\b|\bdietary\b|\btoday only\b)/i,
  prices: /(?:₹|\$|€|£|\b(?:rs|inr|usd|aed|gbp|eur)\b|\d+\s?(?:\/-|rs|inr|₹)|\d+\.\d{2}|\bstarting at\b|\bfrom\s+\d+)/i,
};

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeLongText(value?: string): string {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function hasUsefulText(value: string, minLength: number): boolean {
  return value.replace(/\s+/g, ' ').trim().length >= minLength;
}

function hasQuestionHint(value: string, key: keyof typeof QUESTION_PATTERNS): boolean {
  return QUESTION_PATTERNS[key].test(value);
}

function hasSourceAnswerHint(value: string, key: keyof typeof SOURCE_PATTERNS): boolean {
  return SOURCE_PATTERNS[key].test(value);
}

function getUrlWithProtocol(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
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

function getCustomerQuestionCoverageEvidenceText(evidence: CustomerQuestionCoverageEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered questions, pasted source text, and entered fields only.';
    case 'owner_selected':
      return 'Checked owner-selected visible answer coverage only.';
    case 'question_hint':
      return 'Checked common-question wording entered by the owner only.';
    case 'source_answer_hint':
      return 'Checked answer-like wording in the pasted source text only.';
    case 'price_not_needed':
      return 'Owner marked prices as not needed before customer contact.';
    case 'valid_public_url':
      return 'URL format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'URL format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No owner-entered source was provided for this answer area.';
    case 'not_checked':
      return 'This answer area was not checked in V0. Links are not opened, customer conversations are not read, and AI answers are not generated.';
    default:
      return 'This answer area was not checked in this run.';
  }
}

function makeCheck(
  id: CustomerQuestionCoverageCheckId,
  result: CustomerQuestionCoverageResult,
  evidence: CustomerQuestionCoverageEvidence,
): CustomerQuestionCoverageItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getCustomerQuestionCoverageEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function makeAnswerCheck({
  id,
  questionKey,
  selected,
  sourceText,
  questionsText,
  sourceExists,
  optional,
}: {
  id: CustomerQuestionCoverageCheckId;
  questionKey: keyof typeof QUESTION_PATTERNS;
  selected: boolean;
  sourceText: string;
  questionsText: string;
  sourceExists: boolean;
  optional?: boolean;
}): CustomerQuestionCoverageItem {
  const questionAsked = hasQuestionHint(questionsText, questionKey);
  const sourceHasAnswer = hasSourceAnswerHint(sourceText, questionKey);

  if (selected) return makeCheck(id, 'present', 'owner_selected');
  if (sourceHasAnswer) return makeCheck(id, 'present', 'source_answer_hint');
  if (!sourceExists) return makeCheck(id, questionAsked ? 'missing' : 'not_checked', questionAsked ? 'question_hint' : 'not_checked');
  if (optional && !questionAsked) return makeCheck(id, 'not_applicable', 'not_checked');
  if (questionAsked) return makeCheck(id, 'missing', 'question_hint');
  return makeCheck(id, 'unclear', 'not_provided');
}

function countSummary(checks: CustomerQuestionCoverageItem[]): CustomerQuestionCoverageReport['summary'] {
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

function getStatus(checks: CustomerQuestionCoverageItem[]): CustomerQuestionCoverageReport['status'] {
  const customerQuestions = checks.find((check) => check.id === 'customer_questions');
  const sourceMaterial = checks.find((check) => check.id === 'source_material');

  if (customerQuestions?.result !== 'present' || sourceMaterial?.result !== 'present') {
    return 'missing_basics';
  }

  const requiredNeedsWork = checks.some((check) =>
    check.required
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );
  const optionalMissing = checks.some((check) =>
    !check.required && (check.result === 'missing' || check.result === 'unclear')
  );

  return requiredNeedsWork || optionalMissing ? 'unclear' : 'ready';
}

function getNextActionType(status: CustomerQuestionCoverageReport['status']): CustomerQuestionCoverageReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'add_missing_answers';
}

export function buildCustomerQuestionCoverageReport(input: CustomerQuestionCoverageInput): CustomerQuestionCoverageReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const sourceText = normalizeLongText(input.sourceText);
  const commonQuestions = normalizeLongText(input.commonQuestions);
  const publicUrl = trimToSingleLine(input.publicUrl);
  const sourceExists = hasUsefulText(sourceText, 50);
  const questionsExist = hasUsefulText(commonQuestions, 12);
  const hasPublicUrl = publicUrl.length > 0;
  const validPublicUrl = isValidHttpUrl(publicUrl);

  const checks: CustomerQuestionCoverageItem[] = [
    makeCheck(
      'customer_questions',
      questionsExist ? 'present' : 'missing',
      questionsExist ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'source_material',
      sourceExists ? 'present' : 'missing',
      sourceExists ? 'owner_entered' : 'not_provided',
    ),
    makeAnswerCheck({
      id: 'menu_or_services_answers',
      questionKey: 'menuServices',
      selected: input.menuOrServicesAnswered,
      sourceText,
      questionsText: commonQuestions,
      sourceExists,
    }),
    makeAnswerCheck({
      id: 'hours_answers',
      questionKey: 'hours',
      selected: input.hoursAnswered,
      sourceText,
      questionsText: commonQuestions,
      sourceExists,
    }),
    input.pricesNotNeeded
      ? makeCheck('prices_answers', 'not_applicable', 'price_not_needed')
      : makeAnswerCheck({
        id: 'prices_answers',
        questionKey: 'prices',
        selected: input.pricesAnswered,
        sourceText,
        questionsText: commonQuestions,
        sourceExists,
      }),
    makeAnswerCheck({
      id: 'location_contact_answers',
      questionKey: 'locationContact',
      selected: input.locationOrContactAnswered,
      sourceText,
      questionsText: commonQuestions,
      sourceExists,
    }),
    makeAnswerCheck({
      id: 'action_answers',
      questionKey: 'action',
      selected: input.actionAnswered,
      sourceText,
      questionsText: commonQuestions,
      sourceExists,
    }),
    makeAnswerCheck({
      id: 'notes_availability_answers',
      questionKey: 'notesAvailability',
      selected: input.notesOrAvailabilityAnswered,
      sourceText,
      questionsText: commonQuestions,
      sourceExists,
      optional: true,
    }),
    makeCheck(
      'current_customer_link',
      validPublicUrl ? 'present' : hasPublicUrl ? 'unclear' : 'missing',
      validPublicUrl ? 'valid_public_url' : hasPublicUrl ? 'invalid_public_url' : 'not_provided',
    ),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    sourceKind: input.sourceKind || 'menu',
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      externalUrlFetched: false,
      aiAnswerGenerated: false,
      aiOrSearchChecked: false,
      customerConversationLogsRead: false,
      externalPlatformUpdated: false,
      rankingPromise: false,
    },
  };
}
