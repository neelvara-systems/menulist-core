import { secureError, secureLog } from '@lib/security/secureLogger';
import { MENU_CHANGE_ACTORS, MENU_CHANGE_TYPES } from '@type/menuObservation';

type MenuChangeLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedMenuChangeLogStringContext = (
    label: string,
    value: unknown,
): MenuChangeLogContext => {
    let normalized = '';
    try {
        normalized = value === undefined || value === null ? '' : String(value);
    } catch {
        return {
            [`${label}Present`]: value !== undefined && value !== null,
            [`${label}Length`]: null,
        };
    }

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getMenuChangeLogEntryContext = (
    entry: unknown,
): MenuChangeLogContext => {
    const record = entry !== null && typeof entry === 'object'
        ? entry as Record<string, unknown>
        : {};
    const changeType = MENU_CHANGE_TYPES.some(value => value === record.changeType)
        ? String(record.changeType)
        : 'INVALID';
    const changedBy = MENU_CHANGE_ACTORS.some(value => value === record.changedBy)
        ? String(record.changedBy)
        : 'INVALID';
    let metadataPresent = false;
    try {
        metadataPresent = Boolean(
            record.metadata
            && typeof record.metadata === 'object'
            && Object.keys(record.metadata).length > 0,
        );
    } catch {
        metadataPresent = true;
    }

    return {
        changeType,
        changedBy,
        ...getBoundedMenuChangeLogStringContext('projectId', record.projectId),
        ...getBoundedMenuChangeLogStringContext('itemId', record.itemId),
        ...getBoundedMenuChangeLogStringContext('categoryId', record.categoryId),
        ...getBoundedMenuChangeLogStringContext('userId', record.userId),
        oldValuePresent: record.oldValue !== undefined && record.oldValue !== null,
        newValuePresent: record.newValue !== undefined && record.newValue !== null,
        metadataPresent,
    };
};

const getMenuChangeLogErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMenuChangeLogErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    try {
        return String(code).slice(0, 64);
    } catch {
        return undefined;
    }
};

const getMenuChangeLogErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    try {
        const status = Number((error as { status?: unknown }).status);
        return Number.isFinite(status) ? status : undefined;
    } catch {
        return undefined;
    }
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
