
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

export function getMonitoringErrorContext(error: unknown): {
  sourceErrorName?: string;
  sourceErrorCode?: string;
  sourceStatusCode?: number;
} {
  return getBoundedFunctionsErrorContext(error);
}
