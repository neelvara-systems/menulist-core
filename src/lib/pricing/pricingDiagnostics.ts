import { secureError, secureLog } from "@lib/security/secureLogger";
import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type PricingLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPricingStringContext = (
    label: string,
    value: unknown,
): PricingLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getPricingErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getPricingErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getPricingErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logPricingDiagnostic = (
    diagnosticCode: string,
    context: PricingLogContext = {},
): void => {
    secureLog("[Pricing] Diagnostic", {
        diagnosticCode,
        ...context,
    });
};

export const logPricingFailure = (
    failureCode: string,
    error?: unknown,
    context: PricingLogContext = {},
): void => {
    secureError("[Pricing] Operation failed", new Error(failureCode), {
        ...context,
        sourceErrorName: getPricingErrorName(error),
        sourceErrorCode: getPricingErrorCode(error),
        sourceStatusCode: getPricingErrorStatus(error),
    });
};
