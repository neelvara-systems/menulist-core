export const BOOKING_INQUIRY_READINESS_CHECK_IDS = [
  'primary_action',
  'action_destination',
  'response_expectation',
  'hours_context',
  'fallback_contact',
  'confirmation_expectation',
  'location_or_service_area',
  'current_customer_link',
  'external_booking_inspection',
] as const;

export type BookingInquiryReadinessCheckId = (typeof BOOKING_INQUIRY_READINESS_CHECK_IDS)[number];

export type BookingInquiryReadinessMode = 'self_report';

export type BookingInquiryReadinessResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type BookingInquiryReadinessStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type BookingInquiryPrimaryAction =
  | 'order'
  | 'book'
  | 'reserve'
  | 'call'
  | 'whatsapp'
  | 'visit'
  | 'quote'
  | 'message'
  | 'other';

export type BookingInquirySourceKind =
  | 'menu'
  | 'service_list'
  | 'catalog'
  | 'rate_card'
  | 'package_list'
  | 'price_list'
  | 'other';

export type BookingInquiryReadinessEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'action_text_hint'
  | 'valid_action_destination'
  | 'unclear_action_destination'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface BookingInquiryReadinessInput {
  mode: BookingInquiryReadinessMode;
  businessName: string;
  cityOrArea: string;
  sourceKind: BookingInquirySourceKind;
  publicUrl: string;
  actionText: string;
  primaryAction: BookingInquiryPrimaryAction;
  actionLinkOrNumber: string;
  actionVisible: boolean;
  responseTimeShown: boolean;
  hoursShown: boolean;
  fallbackContactShown: boolean;
  confirmationExpectationShown: boolean;
  serviceAreaOrLocationShown: boolean;
}

export interface BookingInquiryReadinessItem {
  id: BookingInquiryReadinessCheckId;
  result: BookingInquiryReadinessResult;
  evidence: BookingInquiryReadinessEvidence;
  evidenceText: string;
  required: boolean;
}

export interface BookingInquiryReadinessReport {
  generatedAt: string;
  status: BookingInquiryReadinessStatus;
  businessName: string;
  cityOrArea: string;
  sourceKind: BookingInquirySourceKind;
  primaryAction: BookingInquiryPrimaryAction;
  checks: BookingInquiryReadinessItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'fix_booking_inquiry' | 'manual_review';
  };
  boundaries: {
    externalUrlFetched: false;
    bookingProviderChecked: false;
    calendarChecked: false;
    paymentChecked: false;
    messageSent: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
