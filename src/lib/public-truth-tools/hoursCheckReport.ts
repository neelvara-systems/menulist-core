import { isPublicHttpsUrl as isValidHttpUrl } from './publicUrlValidation';
import type {
  HoursCheckEvidence,
  HoursCheckId,
  HoursCheckInput,
  HoursCheckItem,
  HoursCheckReport,
  HoursCheckResult,
} from './hoursCheckTypes';

const REQUIRED_CHECKS = new Set<HoursCheckId>([
  'regular_hours',
  'closed_days',
  'holiday_hours',
  'timezone_context',
  'contact_fallback',
  'current_customer_link',
]);

function trimToSingleLine(value?: string): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function normalizeText(value?: string): string {
  return (value || '').replace(/\r\n/g, '\n').trim();
}

function hasDayHint(value: string): boolean {
  return /(?:\bmon(?:day)?\b|\btue(?:sday)?\b|\bwed(?:nesday)?\b|\bthu(?:rsday)?\b|\bfri(?:day)?\b|\bsat(?:urday)?\b|\bsun(?:day)?\b|\bweekday\b|\bweekend\b|\bdaily\b|\bevery day\b|\b7 days\b)/i.test(value);
}

function hasTimeHint(value: string): boolean {
  return /(?:\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b|\b\d{1,2}:\d{2}\b|\b24\s?hours?\b|\bnoon\b|\bmidnight\b|\bmorning\b|\bevening\b|\bnight\b)/i.test(value);
}

function hasClosedHint(value: string): boolean {
  return /(?:\bclosed\b|\boff\b|\bholiday\b|\bnot open\b|\bshut\b|\bweekly close\b|\bweekly closed\b|\bopen daily\b|\bevery day\b|\b7 days\b|\bno weekly close\b)/i.test(value);
}

function hasLateNightHint(value: string): boolean {
  return /(?:\bmidnight\b|\b12\s?am\b|\b1\s?am\b|\b2\s?am\b|\b3\s?am\b|\b4\s?am\b|\b24\s?hours?\b|\blate night\b|\bnext day\b|\bafter midnight\b)/i.test(value);
}

function hasSpecialHoursHint(value: string): boolean {
  return /(?:\bholiday\b|\bspecial\b|\bfestival\b|\bseasonal\b|\bdiwali\b|\beid\b|\bchristmas\b|\bnew year\b|\bpublic holiday\b|\btemporary\b|\btoday only\b|\bclosed on\b|\bopen on\b)/i.test(value);
}

function hasTimezoneHint(value: string): boolean {
  return /(?:\bist\b|\best\b|\bpst\b|\bgmt\b|\butc\b|\btimezone\b|\btime zone\b|\bindia\b|\busa\b|\buk\b|\buae\b|\bcanada\b|\baustralia\b|\/)/i.test(value);
}

function getHoursEvidenceText(evidence: HoursCheckEvidence): string {
  switch (evidence) {
    case 'owner_entered':
      return 'Checked owner-entered hours text only.';
    case 'owner_selected':
      return 'Checked owner-selected visible facts only.';
    case 'hours_text_hint':
      return 'Checked day and time words in the entered hours text only.';
    case 'closed_day_hint':
      return 'Checked closed-day words in the entered text only.';
    case 'late_night_self_report':
      return 'Checked the owner-selected late-night handling only.';
    case 'special_hours_self_report':
      return 'Checked the owner-selected special-hours status and entered special-hours text only.';
    case 'timezone_hint':
      return 'Checked city, area, and timezone text only.';
    case 'valid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'invalid_public_url':
      return 'Public HTTPS URL format was checked locally. The URL was not opened or fetched.';
    case 'not_provided':
      return 'No owner-entered source was provided for this fact.';
    case 'not_checked':
      return 'This fact was not checked in V0. Google, maps, websites, holiday calendars, and AI/search answers were not inspected.';
    default:
      return 'This fact was not checked in this run.';
  }
}

function makeCheck(
  id: HoursCheckId,
  result: HoursCheckResult,
  evidence: HoursCheckEvidence,
): HoursCheckItem {
  return {
    id,
    result,
    evidence,
    evidenceText: getHoursEvidenceText(evidence),
    required: REQUIRED_CHECKS.has(id),
  };
}

function countSummary(checks: HoursCheckItem[]): HoursCheckReport['summary'] {
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

function getStatus(checks: HoursCheckItem[]): HoursCheckReport['status'] {
  const regularHours = checks.find((check) => check.id === 'regular_hours');
  const timezoneContext = checks.find((check) => check.id === 'timezone_context');

  if (regularHours?.result === 'missing' || regularHours?.result === 'not_checked') {
    return 'missing_basics';
  }

  if (timezoneContext?.result === 'missing' || timezoneContext?.result === 'not_checked') {
    return 'missing_basics';
  }

  const blockingChecks: HoursCheckId[] = [
    'regular_hours',
    'closed_days',
    'late_night_hours',
    'holiday_hours',
    'timezone_context',
    'contact_fallback',
    'current_customer_link',
  ];
  const hasBlockingGap = checks.some((check) =>
    blockingChecks.includes(check.id)
    && (check.result === 'missing' || check.result === 'unclear' || check.result === 'not_checked')
  );

  return hasBlockingGap ? 'unclear' : 'ready';
}

function getNextActionType(status: HoursCheckReport['status']): HoursCheckReport['nextAction']['type'] {
  if (status === 'ready') return 'create_customer_link';
  if (status === 'manual_review_needed') return 'manual_review';
  return 'fix_hours';
}

export function buildHoursCheckReport(input: HoursCheckInput): HoursCheckReport {
  const businessName = trimToSingleLine(input.businessName);
  const cityOrArea = trimToSingleLine(input.cityOrArea);
  const timeZone = trimToSingleLine(input.timeZone);
  const regularHoursText = normalizeText(input.regularHoursText);
  const closedDaysText = normalizeText(input.closedDaysText);
  const specialHoursText = normalizeText(input.specialHoursText);
  const currentCustomerLink = trimToSingleLine(input.currentCustomerLink);
  const combinedHoursText = `${regularHoursText}\n${closedDaysText}\n${specialHoursText}`;
  const hasRegularText = regularHoursText.replace(/\s+/g, ' ').trim().length >= 8;
  const regularHoursClear = hasRegularText && hasDayHint(regularHoursText) && hasTimeHint(regularHoursText);
  const regularHoursUnclear = hasRegularText && !regularHoursClear;
  const closedDaysClear = Boolean(closedDaysText) || hasClosedHint(combinedHoursText);
  const lateNightClear = input.lateNightClarity === 'not_applicable'
    || input.lateNightClarity === 'same_day_clear'
    || input.lateNightClarity === 'past_midnight_clear';
  const lateNightLooksNeeded = hasLateNightHint(regularHoursText);
  const specialHoursClear = input.specialHoursStatus === 'not_applicable'
    || (input.specialHoursStatus === 'listed' && (specialHoursText.length >= 8 || hasSpecialHoursHint(specialHoursText)));
  const specialHoursUnclear = input.specialHoursStatus === 'listed' && !specialHoursClear;
  const timezoneContextClear = Boolean(cityOrArea || timeZone) && (Boolean(cityOrArea) || hasTimezoneHint(timeZone));
  const timezoneContextUnclear = Boolean(timeZone) && !timezoneContextClear;
  const hasCustomerLink = currentCustomerLink.length > 0;
  const validCustomerLink = isValidHttpUrl(currentCustomerLink, 'hours_check_current_customer_link');

  const checks: HoursCheckItem[] = [
    makeCheck(
      'regular_hours',
      regularHoursClear ? 'present' : regularHoursUnclear ? 'unclear' : 'missing',
      regularHoursClear ? 'hours_text_hint' : hasRegularText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'closed_days',
      closedDaysClear ? 'present' : hasRegularText ? 'unclear' : 'missing',
      closedDaysClear ? 'closed_day_hint' : hasRegularText ? 'owner_entered' : 'not_provided',
    ),
    makeCheck(
      'late_night_hours',
      lateNightClear
        ? (input.lateNightClarity === 'not_applicable' ? 'not_applicable' : 'present')
        : lateNightLooksNeeded
          ? 'unclear'
          : 'missing',
      lateNightClear ? 'late_night_self_report' : lateNightLooksNeeded ? 'hours_text_hint' : 'not_provided',
    ),
    makeCheck(
      'holiday_hours',
      specialHoursClear ? (input.specialHoursStatus === 'not_applicable' ? 'not_applicable' : 'present') : specialHoursUnclear ? 'unclear' : 'missing',
      specialHoursClear || specialHoursUnclear ? 'special_hours_self_report' : 'not_provided',
    ),
    makeCheck(
      'timezone_context',
      timezoneContextClear ? 'present' : timezoneContextUnclear ? 'unclear' : 'missing',
      timezoneContextClear || timezoneContextUnclear ? 'timezone_hint' : 'not_provided',
    ),
    makeCheck(
      'contact_fallback',
      input.contactFallbackShown ? 'present' : 'missing',
      input.contactFallbackShown ? 'owner_selected' : 'not_provided',
    ),
    makeCheck(
      'current_customer_link',
      validCustomerLink ? 'present' : hasCustomerLink ? 'unclear' : 'missing',
      validCustomerLink ? 'valid_public_url' : hasCustomerLink ? 'invalid_public_url' : 'not_provided',
    ),
    makeCheck('external_hours_verification', 'not_checked', 'not_checked'),
  ];

  const status = getStatus(checks);

  return {
    generatedAt: new Date().toISOString(),
    status,
    businessName,
    cityOrArea,
    timeZone,
    checks,
    summary: countSummary(checks),
    nextAction: {
      href: '/create-menu',
      type: getNextActionType(status),
    },
    boundaries: {
      externalUrlFetched: false,
      googleProfileInspected: false,
      holidayCalendarFetched: false,
      reportStored: false,
      externalPlatformUpdated: false,
      aiOrSearchChecked: false,
      rankingPromise: false,
    },
  };
}
