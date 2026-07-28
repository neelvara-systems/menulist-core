import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

export type TranslationLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedTranslationStringContext = (
    label: string,
    value: unknown,
): TranslationLogContext => {
    return getBoundedLogValueContext(label, value);
};

export const getTranslationScopeLogContext = (
    projectId?: unknown,
    fileId?: unknown,
): TranslationLogContext => ({
    ...getBoundedTranslationStringContext('projectId', projectId),
    ...getBoundedTranslationStringContext('fileId', fileId),
});

export const getTranslationLanguageLogContext = (
    targetLanguageCode?: unknown,
    sourceLanguageCode?: unknown,
): TranslationLogContext => ({
    ...getBoundedTranslationStringContext('targetLanguageCode', targetLanguageCode),
    ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLanguageCode),
});

const getTranslationErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getTranslationErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getTranslationErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logTranslationFailure = (
    failureCode: string,
    error?: unknown,
    context: TranslationLogContext = {},
): void => {
    secureError('[Menu Translation] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getTranslationErrorName(error),
        sourceErrorCode: getTranslationErrorCode(error),
        sourceStatusCode: getTranslationErrorStatus(error),
    });
};
