import { secureError, secureLog } from '@lib/security/secureLogger';

type EnvLogContext = Record<string, boolean | number | string | null | undefined>;

export const logEnvValidationDiagnostic = (
    diagnosticCode: string,
    context: EnvLogContext = {},
): void => {
    secureLog('[Env Validation] Diagnostic', {
        diagnosticCode,
        ...context,
    });
};

export const logEnvValidationFailure = (
    failureCode: string,
    context: EnvLogContext = {},
): void => {
    secureError('[Env Validation] Operation failed', new Error(failureCode), context);
};
