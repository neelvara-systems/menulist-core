import { secureError } from '@lib/security/secureLogger';

type PwaLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPwaStringContext = (
  label: string,
  value: unknown,
): PwaLogContext => {
  const normalized = value === undefined || value === null ? '' : String(value);

  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
};

const getPwaErrorName = (error: unknown): string | undefined => {
  if (error === undefined) return undefined;
  if (error instanceof Error) return error.name || 'Error';
  return typeof error;
};

const getPwaErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
};

export const logPwaTrackingFailure = (
  failureCode: string,
  error?: unknown,
  context: PwaLogContext = {},
): void => {
  secureError('[Customer App PWA] Operation failed', new Error(failureCode), {
    ...context,
    sourceErrorName: getPwaErrorName(error),
    sourceErrorCode: getPwaErrorCode(error),
  });
};
