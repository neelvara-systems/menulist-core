import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { secureError } from '@lib/security/secureLogger';

type PwaLogContext = Record<string, boolean | number | string | null | undefined>;

export const getBoundedPwaStringContext = (
  label: string,
  value: unknown,
): PwaLogContext => {
  return getBoundedLogValueContext(label, value);
};

const getPwaErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getPwaErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
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
