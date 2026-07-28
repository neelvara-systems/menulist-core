import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError, secureLog } from '@lib/security/secureLogger';

type HookLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedHookStringContext = (
  label: string,
  value: unknown,
): HookLogContext => {
  return getBoundedLogValueContext(label, value);
};

const getHookErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getHookErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

export const logHookFailure = (
  failureCode: string,
  error?: unknown,
  context: HookLogContext = {},
): void => {
  secureError('[Hook] Operation failed', new Error(failureCode), {
    ...context,
    sourceErrorName: getHookErrorName(error),
    sourceErrorCode: getHookErrorCode(error),
  });
};

export const logHookDiagnostic = (
  diagnosticCode: string,
  context: HookLogContext = {},
  options: { developmentOnly?: boolean } = {},
): void => {
  if (options.developmentOnly && process.env.NODE_ENV !== 'development') return;

  secureLog('[Hook] Diagnostic', {
    diagnosticCode,
    ...context,
  });
};
