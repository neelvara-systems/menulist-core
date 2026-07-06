import { secureError, secureLog } from '@lib/security/secureLogger';
import type { MenuChangeLogInput } from '@type/menuObservation';

type MenuChangeLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMenuChangeLogStringContext = (
    label: string,
    value: unknown,
): MenuChangeLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getMenuChangeLogEntryContext = (
    entry: MenuChangeLogInput,
): MenuChangeLogContext => ({
    changeType: entry.changeType,
    changedBy: entry.changedBy,
    ...getBoundedMenuChangeLogStringContext('projectId', entry.projectId),
    ...getBoundedMenuChangeLogStringContext('itemId', entry.itemId),
    ...getBoundedMenuChangeLogStringContext('categoryId', entry.categoryId),
    ...getBoundedMenuChangeLogStringContext('userId', entry.userId),
    oldValuePresent: entry.oldValue !== undefined && entry.oldValue !== null,
    newValuePresent: entry.newValue !== undefined && entry.newValue !== null,
    metadataPresent: Boolean(entry.metadata && Object.keys(entry.metadata).length > 0),
});

const getMenuChangeLogErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMenuChangeLogErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMenuChangeLogErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
};

export const logMenuChangeLogFailure = (
    failureCode: string,
    error?: unknown,
    context: MenuChangeLogContext = {},
): void => {
    secureError('[Menu Change Log] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getMenuChangeLogErrorName(error),
        sourceErrorCode: getMenuChangeLogErrorCode(error),
        sourceStatusCode: getMenuChangeLogErrorStatus(error),
    });
};

export const logMenuChangeLogDiagnostic = (
    diagnosticCode: string,
    context: MenuChangeLogContext = {},
): void => {
    secureLog('[Menu Change Log] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};
