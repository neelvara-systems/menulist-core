/**
 * Customer Communication Kit — Message Templates
 *
 * Pure string template layer. Reads existing store data and generates
 * pre-filled message strings for owners to copy-paste into WhatsApp/SMS.
 *
 * Zero Firebase cost — all computation is client-side.
 *
 * @see __docs__/customer-communication-kit/README.md
 */

import { getOfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import {
    getBoundedRuntimeStringContext,
    logRuntimeDiagnostic,
} from '@lib/runtime/runtimeDiagnostics';
import { formatClockTime } from '@util/dateTime';
import { getStoreDayKey, getStoreLocalDateKey } from '@lib/hours/hoursEngine';
import { getSpecialHoursEntry } from '@lib/hours/specialHours';
import type { StoreSpecialHours } from '@type/platform/store';

export interface MessageTemplateInput {
    storeName: string;
    businessType: string;
    businessCategory?: string;
    menuLink: string;
    obpLink?: string;
    projectName?: string;
    activeProjects?: Array<{
        name: string | Record<string, string>;
        url: string;
    }>;
    address?: string;
    phone?: string;
    todayHours?: { open: string; close: string } | null;
    isClosedToday?: boolean;
}

export interface MessageTemplate {
    id: string;
    title: string;
    description: string;
    message: string;
}

const MAX_COMMUNICATION_KIT_TODAY_HOURS_DIAGNOSTICS = 25;

const reportedCommunicationKitTodayHoursRangeFailures = new Set<string>();

/**
 * Generate message templates from store data.
 * Missing fields (address, phone, hours) are gracefully omitted.
 * Quick Reply is first — most frequently used by SMB owners.
 */
export function generateMessageTemplates(input: MessageTemplateInput): MessageTemplate[] {
    const labels = getOfferingLabels(input.businessType, input.businessCategory);
    const templates: MessageTemplate[] = [];
    const offeringReference = getOfferingReference(labels.offeringLower, input.projectName);
    const offeringTitleReference = getOfferingReference(labels.offeringTitle, input.projectName);

    // Template 1: Quick Reply (Primary — most used)
    templates.push({
        id: 'quick_reply',
        title: 'Quick Reply',
        description: 'Just the link — fastest response',
        message: buildMessage([
            `*${offeringTitleReference}*`,
            '',
            input.menuLink,
        ]),
    });

    // Template 2: Send Menu/Services/Catalog
    templates.push({
        id: 'send_menu',
        title: `Send ${labels.offeringTitle}`,
        description: `Quick reply when customers ask for the ${labels.offeringLower}`,
        message: buildMessage([
            `*Hi! Here is our ${offeringReference}*`,
            '',
            input.menuLink,
            '',
            'Let us know if you need anything else.',
        ]),
    });

    if (input.obpLink) {
        const officialPageLines = [
            '*Hi! Here is our official business page*',
            '',
            input.obpLink,
        ];
        if (input.address) officialPageLines.push('', `📍 ${input.address}`);
        if (input.phone) officialPageLines.push(`📞 ${input.phone}`);
        if (input.isClosedToday) {
            officialPageLines.push('🕐 Closed today');
        } else if (input.todayHours) {
            officialPageLines.push(`🕐 Open today: ${input.todayHours.open} – ${input.todayHours.close}`);
        }

        templates.push({
            id: 'official_page',
            title: 'Official Business Page',
            description: 'Share your main business page with menu, hours, and contact info',
            message: buildMessage(officialPageLines),
        });
    }

    // Template 3: Menu + Location
    const locationLines = [
        `*Hi! Here is our ${offeringReference}*`,
        '',
        input.menuLink,
    ];
    if (input.address) locationLines.push('', `📍 ${input.address}`);
    if (input.isClosedToday) {
        locationLines.push('', 'We are closed today.');
    } else if (input.todayHours) {
        locationLines.push('', `We are open today until ${input.todayHours.close}.`);
    }
    templates.push({
        id: 'menu_location',
        title: `${labels.offeringTitle} + Address`,
        description: 'Include address and hours with the link',
        message: buildMessage(locationLines),
    });

    // Template 4: Are You Open?
    const openLines: string[] = [];
    if (input.isClosedToday) {
        openLines.push('*Hi! We are closed today.*');
    } else if (input.todayHours) {
        openLines.push('*Hi! We are open today.*');
        openLines.push('', `🕐 ${input.todayHours.open} – ${input.todayHours.close}`);
    } else {
        openLines.push('*Hi! We are open today.*');
    }
    openLines.push('', `Here is our ${offeringReference}:`, '', input.menuLink);
    if (input.address) openLines.push('', `📍 ${input.address}`);
    templates.push({
        id: 'are_you_open',
        title: 'Are You Open?',
        description: 'Reply when customers ask about today\'s hours',
        message: buildMessage(openLines),
    });

    const closedNowLines: string[] = [];
    if (input.isClosedToday) {
        closedNowLines.push('*Hi! We are closed right now.*');
        closedNowLines.push('', 'You can still check our latest menu here:');
        closedNowLines.push('', input.menuLink);
    } else if (input.todayHours) {
        closedNowLines.push('*Hi! We are not available right now.*');
        closedNowLines.push('', `We will be open again until ${input.todayHours.close} today.`);
        closedNowLines.push('', `You can check our ${offeringReference} here:`);
        closedNowLines.push('', input.menuLink);
    } else {
        closedNowLines.push('*Hi! We are not available right now.*');
        closedNowLines.push('', `You can still check our ${offeringReference} here:`);
        closedNowLines.push('', input.menuLink);
    }
    templates.push({
        id: 'closed_now',
        title: 'Closed Now / Open Later',
        description: 'Useful when staff need a quick off-hours reply',
        message: buildMessage(closedNowLines),
    });

    // Template 5: Business Info
    const infoLines = [`*${input.storeName}*`, ''];
    infoLines.push(`*${offeringTitleReference}:* ${input.menuLink}`);
    if (input.address) infoLines.push(`📍 ${input.address}`);
    if (input.phone) infoLines.push(`📞 ${input.phone}`);
    if (input.isClosedToday) {
        infoLines.push('🕐 Closed today');
    } else if (input.todayHours) {
        infoLines.push(`🕐 Open today: ${input.todayHours.open} – ${input.todayHours.close}`);
    }
    templates.push({
        id: 'business_info',
        title: 'Business Info',
        description: 'Full details — name, link, address, phone, hours',
        message: buildMessage(infoLines),
    });

    // Template 6: Share with Staff
    templates.push({
        id: 'staff_share',
        title: 'Share with Staff',
        description: `Send to your team so everyone shares the same ${labels.offeringLower}`,
        message: buildMessage([
            `*Team — here is our updated ${offeringReference} link*`,
            '',
            input.menuLink,
            '',
            `Please share this link with any customer who asks for the ${offeringReference}.`,
            'This link opens our latest published version.',
        ]),
    });

    const staffDailyLines = [
        '*Team — customer replies for today*',
        '',
        `${offeringTitleReference}: ${input.menuLink}`,
    ];
    if (input.address) staffDailyLines.push(`Address: ${input.address}`);
    if (input.isClosedToday) {
        staffDailyLines.push('Hours: Closed today');
    } else if (input.todayHours) {
        staffDailyLines.push(`Hours today: ${input.todayHours.open} - ${input.todayHours.close}`);
    }
    staffDailyLines.push(
        '',
        `When a customer asks for the ${offeringReference}, send the link above.`,
        'Use the same details in calls, WhatsApp, and counter replies.',
    );

    templates.push({
        id: 'staff_daily_replies',
        title: 'Staff Daily Replies',
        description: 'One handoff for menu, address, and hours questions',
        message: buildMessage(staffDailyLines),
    });

    if ((input.activeProjects?.length || 0) > 1) {
        const menuOptionLines = [
            '*Hi! Here are our available menus*',
            '',
        ];

        input.activeProjects?.forEach((project) => {
            const projectName = getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Menu');
            menuOptionLines.push(`*${projectName}*`);
            menuOptionLines.push(project.url);
            menuOptionLines.push('');
        });

        menuOptionLines.push('Choose the one you want to view.');

        templates.push({
            id: 'all_active_menus',
            title: 'All Active Menus',
            description: 'Share all active menu links when customers need multiple options',
            message: buildMessage(menuOptionLines),
        });
    }

    return templates;
}

function buildMessage(lines: string[]): string {
    return lines.join('\n');
}

function getOfferingReference(fallback: string, projectName?: string): string {
    const trimmedProjectName = projectName?.trim();
    return trimmedProjectName || fallback;
}

function parseCommunicationKitTimeToMinutes(time: string): number | null {
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

    return (hours * 60) + minutes;
}

function logCommunicationKitTodayHoursInvalidRange(dayKey: string, todayValue: string): void {
    const failureKey = `${dayKey}:${todayValue.length}:${todayValue.includes('-') ? 'range' : 'no-range'}`;

    if (reportedCommunicationKitTodayHoursRangeFailures.has(failureKey)) return;
    if (reportedCommunicationKitTodayHoursRangeFailures.size >= MAX_COMMUNICATION_KIT_TODAY_HOURS_DIAGNOSTICS) return;
    reportedCommunicationKitTodayHoursRangeFailures.add(failureKey);

    logRuntimeDiagnostic('communication_kit_today_hours_range_invalid', {
        ...getBoundedRuntimeStringContext('dayKey', dayKey),
        todayValueLength: todayValue.length,
        hasRangeSeparator: todayValue.includes('-'),
    });
}

/**
 * Result from getTodayHours — includes isClosed flag for templates.
 */
export interface TodayHoursResult {
    hours: { open: string; close: string } | null;
    isClosed: boolean;
}

export function getTodayHours(
    workingHours?: Record<string, string>,
    timeZone?: string,
    specialHours?: StoreSpecialHours,
): TodayHoursResult {
    if (
        (!workingHours || typeof workingHours !== 'object' || Array.isArray(workingHours))
        && !specialHours
    ) {
        return { hours: null, isClosed: false };
    }

    const now = new Date();
    const todayKey = getStoreDayKey(timeZone, now);
    const specialEntry = getSpecialHoursEntry(specialHours, getStoreLocalDateKey(timeZone, now));
    let hasTodayValue = false;
    let todayValue: unknown;
    try {
        hasTodayValue = Boolean(specialEntry)
            || Boolean(workingHours && Object.prototype.hasOwnProperty.call(workingHours, todayKey));
        todayValue = specialEntry?.hours
            ?? (workingHours && hasTodayValue ? Reflect.get(workingHours, todayKey) : undefined);
    } catch {
        return { hours: null, isClosed: false };
    }

    // No entry or an explicitly blank value means closed.
    if (!hasTodayValue || todayValue === '') {
        return { hours: null, isClosed: true };
    }
    if (typeof todayValue !== 'string' || !todayValue.includes('-')) {
        if (typeof todayValue === 'string') {
            logCommunicationKitTodayHoursInvalidRange(todayKey, todayValue);
        }
        return { hours: null, isClosed: false };
    }

    const [openRaw, closeRaw] = todayValue.split('-').map(t => t.trim());
    const openMinutes = parseCommunicationKitTimeToMinutes(openRaw);
    const closeMinutes = parseCommunicationKitTimeToMinutes(closeRaw);

    if (openMinutes === null || closeMinutes === null) {
        logCommunicationKitTodayHoursInvalidRange(todayKey, todayValue);
        return { hours: null, isClosed: false };
    }

    // Handle 24-hour businesses (00:00-23:59 or 00:00-00:00)
    if (
        (openRaw === '00:00' && (closeRaw === '23:59' || closeRaw === '00:00')) ||
        (openRaw === closeRaw)
    ) {
        return { hours: { open: 'Open 24 hours', close: 'Open 24 hours' }, isClosed: false };
    }

    return {
        hours: {
            open: formatClockTime(openRaw),
            close: formatClockTime(closeRaw),
        },
        isClosed: false,
    };
}
