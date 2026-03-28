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

export interface MessageTemplateInput {
    storeName: string;
    businessType: string;
    menuLink: string;
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

/**
 * Generate 6 message templates from store data.
 * Missing fields (address, phone, hours) are gracefully omitted.
 * Quick Reply is first — most frequently used by SMB owners.
 */
export function generateMessageTemplates(input: MessageTemplateInput): MessageTemplate[] {
    const labels = getOfferingLabels(input.businessType);
    const templates: MessageTemplate[] = [];

    // Template 1: Quick Reply (Primary — most used)
    templates.push({
        id: 'quick_reply',
        title: 'Quick Reply',
        description: 'Just the link — fastest response',
        message: `${labels.offeringTitle}: ${input.menuLink}`,
    });

    // Template 2: Send Menu/Services/Catalog
    templates.push({
        id: 'send_menu',
        title: `Send ${labels.offeringTitle}`,
        description: `Quick reply when customers ask for the ${labels.offeringLower}`,
        message: buildMessage([
            `Hi! Here is our ${labels.offeringLower}:`,
            '',
            input.menuLink,
            '',
            'Let us know if you need anything else.',
        ]),
    });

    // Template 3: Menu + Location
    const locationLines = [
        `Hi! Here is our ${labels.offeringLower}:`,
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
        title: `${labels.offeringTitle} + Location`,
        description: 'Include address and hours with the link',
        message: buildMessage(locationLines),
    });

    // Template 4: Are You Open?
    const openLines: string[] = [];
    if (input.isClosedToday) {
        openLines.push('Hi! We are closed today.');
    } else if (input.todayHours) {
        openLines.push(`Hi! We are open today.`);
        openLines.push('', `🕐 ${input.todayHours.open} – ${input.todayHours.close}`);
    } else {
        openLines.push('Hi! We are open today.');
    }
    openLines.push('', `Here is our ${labels.offeringLower}:`, '', input.menuLink);
    if (input.address) openLines.push('', `📍 ${input.address}`);
    templates.push({
        id: 'are_you_open',
        title: 'Are You Open?',
        description: 'Reply when customers ask about today\'s hours',
        message: buildMessage(openLines),
    });

    // Template 5: Business Info
    const infoLines = [input.storeName, ''];
    infoLines.push(`${labels.offeringTitle}: ${input.menuLink}`);
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
            `Team — here is our updated ${labels.offeringLower} link:`,
            '',
            input.menuLink,
            '',
            `Please share this link with any customer who asks for the ${labels.offeringLower}.`,
            'This link always shows the latest version.',
        ]),
    });

    return templates;
}

function buildMessage(lines: string[]): string {
    return lines.join('\n');
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
): TodayHoursResult {
    if (!workingHours || Object.keys(workingHours).length === 0) {
        return { hours: null, isClosed: false };
    }

    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

    let dayIndex: number;
    try {
        const now = new Date();
        const dayStr = new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            timeZone: timeZone || undefined,
        }).format(now).toLowerCase();
        dayIndex = dayKeys.indexOf(dayStr as any);
        if (dayIndex === -1) dayIndex = now.getDay();
    } catch {
        dayIndex = new Date().getDay();
    }

    const todayKey = dayKeys[dayIndex];
    const todayValue = workingHours[todayKey];

    // No entry or explicitly closed
    if (!todayValue || !todayValue.includes('-')) {
        return { hours: null, isClosed: true };
    }

    const [openRaw, closeRaw] = todayValue.split('-').map(t => t.trim());

    // Handle 24-hour businesses (00:00-23:59 or 00:00-00:00)
    if (
        (openRaw === '00:00' && (closeRaw === '23:59' || closeRaw === '00:00')) ||
        (openRaw === closeRaw)
    ) {
        return { hours: { open: 'Open 24 hours', close: 'Open 24 hours' }, isClosed: false };
    }

    return {
        hours: {
            open: formatTime12h(openRaw),
            close: formatTime12h(closeRaw),
        },
        isClosed: false,
    };
}

/**
 * Convert "09:00" to "9:00 AM", "23:00" to "11:00 PM"
 */
function formatTime12h(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return time;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}
