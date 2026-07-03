import { secureError, secureLog } from '@lib/security/secureLogger';

type HookLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedHookStringContext = (
  label: string,
  value: unknown,
): HookLogContext => {
  const normalized = value === undefined || value === null ? '' : String(value);

  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
};

const getHookErrorName = (error: unknown): string | undefined => {
  if (error === undefined) return undefined;
  if (error instanceof Error) return error.name || 'Error';
  return typeof error;
};

const getHookErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
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
