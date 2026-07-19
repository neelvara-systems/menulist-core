import type { PublicCustomerTranslator } from './publicCustomerMessages';

const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

export function localizePublicHoursText(
    value: string | null | undefined,
    t: PublicCustomerTranslator,
): string | null {
    if (!value) return null;

    const exactLabels: Record<string, string> = {
        'Check with store': t('menu.checkWithBusiness'),
        'Check with business': t('menu.checkWithBusiness'),
        'Closed': t('menu.closed'),
        'Hours may vary': t('menu.hoursMayVary'),
        'Hours not available': t('menu.hoursNotAvailable'),
        'Open': t('menu.open'),
    };
    if (exactLabels[value]) return exactLabels[value];

    const localizeDay = (day: string): string => {
        const matchedDay = DAY_NAMES.find((entry) => entry === day);
        return matchedDay ? t(`menu.days.${matchedDay}`) : day;
    };
    const simpleTimePatterns: Array<{
        expression: RegExp;
        key: 'menu.closesAt' | 'menu.opensAt' | 'menu.opensTomorrowAt';
    }> = [
        { expression: /^Closes at (.+)$/, key: 'menu.closesAt' },
        { expression: /^Opens at (.+)$/, key: 'menu.opensAt' },
        { expression: /^Opens tomorrow at (.+)$/, key: 'menu.opensTomorrowAt' },
    ];
    for (const pattern of simpleTimePatterns) {
        const match = value.match(pattern.expression);
        if (match) return t(pattern.key, { time: match[1] });
    }

    const nextDayMatch = value.match(/^Opens next ([A-Za-z]+) at (.+)$/);
    if (nextDayMatch) {
        return t('menu.opensNextDayAt', {
            day: localizeDay(nextDayMatch[1]),
            time: nextDayMatch[2],
        });
    }

    const dayMatch = value.match(/^Opens ([A-Za-z]+) at (.+)$/);
    if (dayMatch) {
        return t('menu.opensDayAt', {
            day: localizeDay(dayMatch[1]),
            time: dayMatch[2],
        });
    }

    return value;
}
