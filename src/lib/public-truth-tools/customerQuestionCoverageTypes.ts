export const CUSTOMER_QUESTION_COVERAGE_CHECK_IDS = [
  'customer_questions',
  'source_material',
  'menu_or_services_answers',
  'hours_answers',
  'prices_answers',
  'location_contact_answers',
  'action_answers',
  'notes_availability_answers',
  'current_customer_link',
] as const;

export type CustomerQuestionCoverageCheckId = (typeof CUSTOMER_QUESTION_COVERAGE_CHECK_IDS)[number];

export type CustomerQuestionCoverageMode = 'self_report';

export type CustomerQuestionCoverageResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type CustomerQuestionCoverageStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type CustomerQuestionCoverageSourceKind =
  | 'menu'
  | 'service_list'
  | 'catalog'
  | 'rate_card'
  | 'package_list'
  | 'price_list'
  | 'other';

export type CustomerQuestionCoverageEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'question_hint'
  | 'source_answer_hint'
  | 'price_not_needed'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface CustomerQuestionCoverageInput {
  mode: CustomerQuestionCoverageMode;
  businessName: string;
  cityOrArea: string;
  sourceKind: CustomerQuestionCoverageSourceKind;
  sourceText: string;
  commonQuestions: string;
  publicUrl: string;
  menuOrServicesAnswered: boolean;
  hoursAnswered: boolean;
  pricesAnswered: boolean;
  pricesNotNeeded: boolean;
  locationOrContactAnswered: boolean;
  actionAnswered: boolean;
  notesOrAvailabilityAnswered: boolean;
}

export interface CustomerQuestionCoverageItem {
  id: CustomerQuestionCoverageCheckId;
  result: CustomerQuestionCoverageResult;
  evidence: CustomerQuestionCoverageEvidence;
  evidenceText: string;
  required: boolean;
}

export interface CustomerQuestionCoverageReport {
  generatedAt: string;
  status: CustomerQuestionCoverageStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: CustomerQuestionCoverageSourceKind;
  checks: CustomerQuestionCoverageItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'add_missing_answers' | 'manual_review';
  };
  boundaries: {
    externalUrlFetched: false;
    aiAnswerGenerated: false;
    aiOrSearchChecked: false;
    customerConversationLogsRead: false;
    externalPlatformUpdated: false;
    rankingPromise: false;
  };
}
