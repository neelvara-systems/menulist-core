import * as functions from 'firebase-functions';
import { getBoundedFunctionsErrorContext } from '../../utils/boundedErrorContext';

export const geminiLogger = functions.logger;

export function getGeminiErrorContext(error: unknown): {
  name?: string;
  code?: string;
  status?: number;
} {
  const context = getBoundedFunctionsErrorContext(error);
  return {
    name: context.sourceErrorName,
    code: context.sourceErrorCode,
    status: context.sourceStatusCode,
  };
}
