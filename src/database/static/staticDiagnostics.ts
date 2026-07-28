import { secureError, secureLog } from '@lib/security/secureLogger';
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type StaticAssetLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedStaticAssetStringContext = (
    label: string,
    value: unknown,
): StaticAssetLogContext => {
    return getBoundedLogValueContext(label, value);
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
    return getBoundedErrorName(error);
};

const getStaticAssetErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getStaticAssetErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
