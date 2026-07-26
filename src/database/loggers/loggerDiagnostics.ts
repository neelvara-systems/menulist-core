import { secureError, secureLog } from '@lib/security/secureLogger';
import {
    getBoundedErrorLogContext,
    getBoundedLogValueContext,
} from '@lib/monitoring/boundedLogContext';

type DatabaseLoggerContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedDatabaseLoggerStringContext = (
    label: string,
    value: unknown,
): DatabaseLoggerContext => {
    return getBoundedLogValueContext(label, value);
};

export const getObjectKeyCount = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    try {
        return Object.keys(value).length;
    } catch {
        return 0;
    }
};

export const logDatabaseLoggerDiagnostic = (
    diagnosticCode: string,
    context: DatabaseLoggerContext = {},
): void => {
    secureLog('[Database Logger] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logDatabaseLoggerFailure = (
    failureCode: string,
    error?: unknown,
    context: DatabaseLoggerContext = {},
): void => {
    secureError('[Database Logger] Operation failed', new Error(failureCode), {
        ...context,
        ...getBoundedErrorLogContext(error),
    });
};
