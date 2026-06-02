import type { OwnerNotificationFormattingContext } from './types';

const DEFAULT_CONTEXT: OwnerNotificationFormattingContext = {
    locale: 'en-IN',
    timeZone: 'UTC',
    dateFormat: 'numeric|short|numeric',
    timeFormat: '2-digit|2-digit|true',
    currencyCode: 'INR',
    currencySymbol: '₹',
};

const DATE_FORMAT_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
    'numeric|numeric|numeric': { day: 'numeric', month: 'numeric', year: 'numeric' },
    'numeric|numeric|2-digit': { day: 'numeric', month: 'numeric', year: '2-digit' },
    '2-digit|2-digit|numeric': { day: '2-digit', month: '2-digit', year: 'numeric' },
    '2-digit|short|numeric': { day: '2-digit', month: 'short', year: 'numeric' },
    '2-digit|short|2-digit': { day: '2-digit', month: 'short', year: '2-digit' },
    '2-digit|long|numeric': { day: '2-digit', month: 'long', year: 'numeric' },
    '2-digit|long|2-digit': { day: '2-digit', month: 'long', year: '2-digit' },
};

const TIME_FORMAT_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
    'numeric|numeric|true': { hour: 'numeric', minute: 'numeric', hour12: true },
    '2-digit|2-digit|true': { hour: '2-digit', minute: '2-digit', hour12: true },
    'numeric|numeric|false': { hour: 'numeric', minute: 'numeric', hour12: false },
    '2-digit|2-digit|false': { hour: '2-digit', minute: '2-digit', hour12: false },
};

function isValidTimeZone(timeZone?: string): timeZone is string {
    if (!timeZone) return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function resolveOwnerNotificationFormattingContext(
    source?: Record<string, any> | null,
    fallback?: Partial<OwnerNotificationFormattingContext>,
): OwnerNotificationFormattingContext {
    const timeZone = asString(source?.timeZone, fallback?.timeZone || DEFAULT_CONTEXT.timeZone);
    const currencyCode = asString(source?.currencyCode, fallback?.currencyCode || DEFAULT_CONTEXT.currencyCode).toUpperCase();
    const currencySymbol = asString(source?.currencySymbol, fallback?.currencySymbol || DEFAULT_CONTEXT.currencySymbol);
    const defaultLanguage = asString(source?.defaultLanguage || source?.locale, fallback?.locale || DEFAULT_CONTEXT.locale);

    return {
        locale: defaultLanguage.includes('-') ? defaultLanguage : DEFAULT_CONTEXT.locale,
        timeZone: isValidTimeZone(timeZone) ? timeZone : DEFAULT_CONTEXT.timeZone,
        dateFormat: asString(source?.dateFormat, fallback?.dateFormat || DEFAULT_CONTEXT.dateFormat),
        timeFormat: asString(source?.timeFormat, fallback?.timeFormat || DEFAULT_CONTEXT.timeFormat),
        currencyCode,
        currencySymbol,
    };
}

export function toNotificationDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof (value as any)?.toDate === 'function') {
        const date = (value as any).toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    if (typeof value === 'number') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === 'string') {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    const seconds = (value as any).seconds ?? (value as any)._seconds;
    const nanoseconds = (value as any).nanoseconds ?? (value as any)._nanoseconds ?? 0;
    if (typeof seconds === 'number') {
        const date = new Date(seconds * 1000 + nanoseconds / 1_000_000);
        return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
}

export function formatOwnerNotificationDate(
    value: unknown,
    context: OwnerNotificationFormattingContext,
    fallback = 'See dashboard',
): string {
    const date = toNotificationDate(value);
    if (!date) return fallback;
    const options = DATE_FORMAT_OPTIONS[context.dateFormat || ''] || DATE_FORMAT_OPTIONS[DEFAULT_CONTEXT.dateFormat || ''];
    return new Intl.DateTimeFormat(context.locale, {
        ...options,
        timeZone: context.timeZone,
    }).format(date);
}

export function formatOwnerNotificationTime(
    value: unknown,
    context: OwnerNotificationFormattingContext,
    fallback = 'Now',
): string {
    const date = toNotificationDate(value);
    if (!date) return fallback;
    const options = TIME_FORMAT_OPTIONS[context.timeFormat || ''] || TIME_FORMAT_OPTIONS[DEFAULT_CONTEXT.timeFormat || ''];
    return new Intl.DateTimeFormat(context.locale, {
        ...options,
        timeZone: context.timeZone,
    }).format(date);
}

export function formatOwnerNotificationDateTime(
    value: unknown,
    context: OwnerNotificationFormattingContext,
    fallback = 'Now',
): string {
    const date = toNotificationDate(value);
    if (!date) return fallback;
    return `${formatOwnerNotificationDate(date, context, fallback)} ${formatOwnerNotificationTime(date, context, fallback)}`;
}

export function formatOwnerNotificationMoney(
    amount: unknown,
    context: OwnerNotificationFormattingContext,
): string {
    const numeric = typeof amount === 'number'
        ? amount
        : Number(String(amount ?? '').replace(/,/g, ''));

    if (!Number.isFinite(numeric)) {
        return `${context.currencySymbol || context.currencyCode} 0`;
    }

    const formatted = new Intl.NumberFormat(context.locale, {
        maximumFractionDigits: numeric % 1 === 0 ? 0 : 2,
        minimumFractionDigits: 0,
    }).format(numeric);

    return `${context.currencySymbol || context.currencyCode} ${formatted}`.trim();
}

export function buildFormattedNotificationMetadata(
    metadata: Record<string, unknown>,
    context: OwnerNotificationFormattingContext,
): Record<string, unknown> {
    const next = { ...metadata };

    if (metadata.amount !== undefined && metadata.amount !== null) {
        next.amountLabel = formatOwnerNotificationMoney(metadata.amount, {
            ...context,
            currencyCode: asString(metadata.currency, context.currencyCode).toUpperCase(),
            currencySymbol: asString(metadata.currencySymbol, context.currencySymbol),
        });
    }

    if (metadata.nextBillingAt) {
        next.nextBillingDate = formatOwnerNotificationDate(metadata.nextBillingAt, context);
    }
    if (metadata.renewalAt) {
        next.renewalDate = formatOwnerNotificationDate(metadata.renewalAt, context);
    }
    if (metadata.sentAt) {
        next.sentAtLabel = formatOwnerNotificationDateTime(metadata.sentAt, context);
    }

    next.currencyCode = asString(metadata.currency, context.currencyCode).toUpperCase();
    next.currencySymbol = asString(metadata.currencySymbol, context.currencySymbol);

    return next;
}
