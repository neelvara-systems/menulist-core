import { secureError, secureLog } from '@lib/security/secureLogger';
import type { CSRResult } from './types';
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

type MCELogContext = Record<string, boolean | number | string | null | undefined>;

const getMCEErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getMCEErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getMCEErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

export const logMCEValidationResult = (result: CSRResult): void => {
    if (process.env.NODE_ENV !== 'development') return;

    secureLog('[MCE] Validation result', {
        verified: result.verified,
        rulesPassed: result.rulesPassed,
        rulesEvaluated: result.rulesEvaluated,
        warningCount: result.warnings.length,
        errorCount: result.errors.length,
    });
};

export const logMCEValidationFailure = (
    error: unknown,
    context: MCELogContext = {},
): void => {
    secureError('[MCE] Validation failed', new Error('mce_validation_failed'), {
        ...context,
        sourceErrorName: getMCEErrorName(error),
        sourceErrorCode: getMCEErrorCode(error),
        sourceStatusCode: getMCEErrorStatus(error),
    });
};
