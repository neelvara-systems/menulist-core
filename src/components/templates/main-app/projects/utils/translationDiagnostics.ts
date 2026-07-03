import { secureError } from '@lib/security/secureLogger';

export type TranslationLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedTranslationStringContext = (
    label: string,
    value: unknown,
): TranslationLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
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
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getTranslationErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getTranslationErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
