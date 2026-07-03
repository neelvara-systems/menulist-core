import { secureError, secureLog } from '@lib/security/secureLogger';

type StaticAssetLogContext = Record<string, boolean | number | string | null | undefined>;

type StaticAssetErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

export const getBoundedStaticAssetStringContext = (
    label: string,
    value: unknown,
): StaticAssetLogContext => {
    const normalized = value === undefined || value === null ? '' : String(value);

    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

export const getStaticAssetEntityLogContext = (
    assetType?: unknown,
    categoryId?: unknown,
    subCategoryId?: unknown,
    itemId?: unknown,
): StaticAssetLogContext => ({
    ...getBoundedStaticAssetStringContext('assetType', assetType),
    ...getBoundedStaticAssetStringContext('categoryId', categoryId),
    ...getBoundedStaticAssetStringContext('subCategoryId', subCategoryId),
    ...getBoundedStaticAssetStringContext('itemId', itemId),
});

const getStaticAssetErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getStaticAssetErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as StaticAssetErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getStaticAssetErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as StaticAssetErrorLike).status
        : (error as StaticAssetErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

export const logStaticAssetDiagnostic = (
    diagnosticCode: string,
    context: StaticAssetLogContext = {},
): void => {
    secureLog('[Static Asset Data] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logStaticAssetFailure = (
    failureCode: string,
    error?: unknown,
    context: StaticAssetLogContext = {},
): void => {
    secureError('[Static Asset Data] Operation failed', new Error(failureCode), {
        ...context,
        sourceErrorName: getStaticAssetErrorName(error),
        sourceErrorCode: getStaticAssetErrorCode(error),
        sourceStatusCode: getStaticAssetErrorStatus(error),
    });
};
