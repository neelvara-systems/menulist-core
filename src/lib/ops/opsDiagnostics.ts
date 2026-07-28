import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type OpsLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedOpsStringContext = (
  label: string,
  value: unknown,
): OpsLogContext => {
  return getBoundedLogValueContext(label, value);
};

const getOpsErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getOpsErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getOpsErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
