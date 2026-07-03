import { secureError } from '@lib/security/secureLogger';

type OpsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedOpsStringContext = (
  label: string,
  value: unknown,
): OpsLogContext => {
  const normalized = value === undefined || value === null ? '' : String(value);

  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
};

const getOpsErrorName = (error: unknown): string | undefined => {
  if (error === undefined) return undefined;
  if (error instanceof Error) return error.name || 'Error';
  return typeof error;
};

const getOpsErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  if (code === undefined || code === null) return undefined;
  return String(code).slice(0, 64);
};

const getOpsErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : undefined;
};

export const logOpsFailure = (
  failureCode: string,
  error?: unknown,
  context: OpsLogContext = {},
): void => {
  secureError('[Ops] Operation failed', new Error(failureCode), {
    ...context,
    sourceErrorName: getOpsErrorName(error),
    sourceErrorCode: getOpsErrorCode(error),
    sourceStatusCode: getOpsErrorStatus(error),
  });
};
