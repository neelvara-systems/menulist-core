import {
    cleanPublicAnalyticsString,
    getPublicAnalyticsPagePath,
    getPublicAnalyticsUrl,
} from '@lib/website/publicAnalyticsContext';

export const cleanAnswerlatticeAnalyticsString = (
    value: unknown,
    maxLength = 160,
): string | undefined => cleanPublicAnalyticsString(value, maxLength);

export const getAnswerlatticeAnalyticsUrl = (value: unknown): string | undefined => (
    getPublicAnalyticsUrl(value)
);

export const getAnswerlatticeAnalyticsPagePath = (): string => getPublicAnalyticsPagePath();
