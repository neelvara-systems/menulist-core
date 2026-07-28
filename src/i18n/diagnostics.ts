import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type I18nLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedI18nStringContext = (
    label: string,
    value: unknown,
): I18nLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getI18nErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getI18nErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getI18nErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const shouldSkipI18nLog = (options: { developmentOnly?: boolean }): boolean => (
    Boolean(options.developmentOnly) && process.env.NODE_ENV !== 'development'
);

export const logI18nDiagnostic = (
    diagnosticCode: string,
    context: I18nLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipI18nLog(options)) return;

    secureLog('[i18n] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logI18nFailure = (
    failureCode: string,
    error?: unknown,
    context: I18nLogContext = {},
    options: { developmentOnly?: boolean } = {},
): void => {
    if (shouldSkipI18nLog(options)) return;

    secureError('[i18n] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getI18nErrorName(error),
        sourceErrorCode: getI18nErrorCode(error),
        sourceStatusCode: getI18nErrorStatus(error),
    });
};
