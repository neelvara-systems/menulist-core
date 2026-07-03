import { secureError, secureLog } from '@lib/security/secureLogger';
import type { CSRResult } from './types';

type MCELogContext = Record<string, boolean | number | string | null | undefined>;

const getMCEErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getMCEErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getMCEErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
    const status = Number((error as { status?: unknown }).status);
    return Number.isFinite(status) ? status : undefined;
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
