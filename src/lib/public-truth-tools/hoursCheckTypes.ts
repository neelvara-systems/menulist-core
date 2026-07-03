export const HOURS_CHECK_IDS = [
  'regular_hours',
  'closed_days',
  'late_night_hours',
  'holiday_hours',
  'timezone_context',
  'contact_fallback',
  'current_customer_link',
  'external_hours_verification',
] as const;

export type HoursCheckId = (typeof HOURS_CHECK_IDS)[number];

export type HoursCheckMode = 'self_report';

export type HoursCheckResult =
  | 'present'
  | 'missing'
  | 'unclear'
  | 'not_applicable'
  | 'not_checked';

export type HoursCheckStatus =
  | 'ready'
  | 'missing_basics'
  | 'unclear'
  | 'not_checked'
  | 'manual_review_needed';

export type LateNightClarity =
  | 'not_applicable'
  | 'same_day_clear'
  | 'past_midnight_clear'
  | 'unclear';

export type SpecialHoursStatus =
  | 'listed'
  | 'not_applicable'
  | 'missing';

export type HoursCheckEvidence =
  | 'owner_entered'
  | 'owner_selected'
  | 'hours_text_hint'
  | 'closed_day_hint'
  | 'late_night_self_report'
  | 'special_hours_self_report'
  | 'timezone_hint'
  | 'valid_public_url'
  | 'invalid_public_url'
  | 'not_provided'
  | 'not_checked';

export interface HoursCheckInput {
  mode: HoursCheckMode;
  businessName: string;
  cityOrArea: string;
  timeZone: string;
  regularHoursText: string;
  closedDaysText: string;
  specialHoursText: string;
  currentCustomerLink: string;
  lateNightClarity: LateNightClarity;
  specialHoursStatus: SpecialHoursStatus;
  contactFallbackShown: boolean;
}

export interface HoursCheckItem {
  id: HoursCheckId;
  result: HoursCheckResult;
  evidence: HoursCheckEvidence;
  evidenceText: string;
  required: boolean;
}

export interface HoursCheckReport {
  generatedAt: string;
  status: HoursCheckStatus;
  businessName: string;
  cityOrArea: string;
  timeZone: string;
  checks: HoursCheckItem[];
  summary: {
    present: number;
    missing: number;
    unclear: number;
    notChecked: number;
  };
  nextAction: {
    href: string;
    type: 'create_customer_link' | 'fix_hours' | 'manual_review';
  };
  boundaries: {
    externalUrlFetched: false;
    googleProfileInspected: false;
    holidayCalendarFetched: false;
    reportStored: false;
    externalPlatformUpdated: false;
    aiOrSearchChecked: false;
    rankingPromise: false;
  };
}
