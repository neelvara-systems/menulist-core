import type {
    AISummary,
    OwnerDashboardMetrics,
} from '@template/main-app/projects/types';
import {
    formatDateKey,
    formatInUserTimezone,
    toDate,
    type IntlFormatter,
} from '@util/dateTime';
import { formatNumber } from '@util/formatters';

export type DashboardTranslationValues = Record<string, string | number>;
export type DashboardTranslator = (key: string, values?: DashboardTranslationValues) => string;

const SOURCE_KEY_ALIASES: Record<string, string> = {
    copy_link: 'copyLink',
    direct: 'direct',
    facebook: 'facebook',
    google: 'google',
    instagram: 'instagram',
    menu_kit: 'menuKit',
    native_share: 'nativeShare',
    obp: 'obp',
    other: 'other',
    qr: 'qr',
    shortcut: 'shortcut',
    whatsapp: 'whatsapp',
};

export function getOwnerDashboardSourceLabel(
    source: string | null | undefined,
    fallback: string | null | undefined,
    t: DashboardTranslator,
): string {
    const normalized = String(source || fallback || '').trim().toLowerCase();
    const key = SOURCE_KEY_ALIASES[normalized];
    if (key) return t(`sources.${key}`);
    return t('sources.other');
}

export function getDashboardLanguageLabel(
    language: string | null | undefined,
    fallback: string | null | undefined,
    locale: string,
): string {
    const normalized = String(language || '').trim().replace(/_/g, '-');
    if (!normalized) return String(fallback || '').trim();
    try {
        return new Intl.DisplayNames([locale], { type: 'language' }).of(normalized)
            || normalized;
    } catch {
        return normalized;
    }
}

export function isEnglishDashboardLocale(locale: string | null | undefined): boolean {
    return String(locale || '').toLowerCase().startsWith('en');
}

export function formatDashboardPercent(value: number | null | undefined, signed = false): string {
    const normalized = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return formatNumber(normalized / 100, {
        maximumFractionDigits: 1,
        signDisplay: signed ? 'exceptZero' : 'auto',
        style: 'percent',
    });
}

export function formatDashboardWeekRange(
    start: string | null | undefined,
    end: string | null | undefined,
    formatter: IntlFormatter,
    fallback = '',
): string {
    if (!start && !end) return fallback;
    const startLabel = formatDateKey(start, formatter, fallback);
    const endLabel = formatDateKey(end, formatter, fallback);
    if (!startLabel) return endLabel;
    if (!endLabel || startLabel === endLabel) return startLabel;
    return `${startLabel} – ${endLabel}`;
}

export function formatDashboardMonth(
    dateKey: string | null | undefined,
    fallback: string,
): string {
    if (!dateKey) return fallback;
    const parsed = new Date(`${dateKey}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return formatInUserTimezone(parsed, { month: 'long', year: 'numeric' }, 'UTC');
}

export function getDashboardOverviewStatusMessage(
    status: 'working' | 'low_activity' | 'no_data',
    t: DashboardTranslator,
): string {
    return t(`overview.statusMessages.${status}`);
}

export function formatDashboardRelativeUpdate(
    value: unknown,
    t: DashboardTranslator,
    now = new Date(),
): string {
    if (!value) return t('publicTruthStatus.updated.notUpdated');
    const parsed = toDate(value as Parameters<typeof toDate>[0]);
    if (Number.isNaN(parsed.getTime())) return t('publicTruthStatus.updated.recently');
    const days = Math.max(0, Math.floor((now.getTime() - parsed.getTime()) / 86400000));
    if (days === 0) return t('publicTruthStatus.updated.today');
    if (days === 1) return t('publicTruthStatus.updated.yesterday');
    return t('publicTruthStatus.updated.daysAgo', { count: days });
}

export function getDashboardSummaryBullets({
    locale,
    metrics,
    summary,
    t,
    limit = 3,
}: {
    locale: string;
    metrics?: OwnerDashboardMetrics | null;
    summary?: AISummary | null;
    t: DashboardTranslator;
    limit?: number;
}): string[] {
    if (isEnglishDashboardLocale(locale)) {
        return (summary?.bulletPoints || []).slice(0, limit);
    }

    if (!metrics) return [];
    const bullets: string[] = [];
    const totalActivity = Number(metrics.menuVisits || 0)
        + Number(metrics.itemClicks || 0)
        + Number(metrics.menuActionClicks || 0)
        + Number(metrics.searches || 0);

    if (totalActivity === 0) {
        return [t('aiSummary.localized.noActivity')];
    }

    bullets.push(t('aiSummary.localized.menuViews', {
        count: formatNumber(metrics.menuVisits || 0),
    }));
    if (Number(metrics.itemClicks || 0) > 0) {
        bullets.push(t('aiSummary.localized.itemTaps', {
            count: formatNumber(metrics.itemClicks || 0),
        }));
    }
    if (Number(metrics.menuActionClicks || 0) > 0) {
        bullets.push(t('aiSummary.localized.customerActions', {
            count: formatNumber(metrics.menuActionClicks || 0),
        }));
    }
    if (Number(metrics.searches || 0) > 0) {
        bullets.push(t('aiSummary.localized.searches', {
            count: formatNumber(metrics.searches || 0),
        }));
    }
    if (Number(metrics.unavailableItemTaps || 0) > 0) {
        bullets.push(t('aiSummary.localized.unavailableInterest', {
            count: formatNumber(metrics.unavailableItemTaps || 0),
        }));
    }

    return bullets.slice(0, limit);
}
