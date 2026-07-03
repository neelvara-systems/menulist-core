import * as functions from 'firebase-functions';

export const geminiLogger = functions.logger;

export function getGeminiErrorContext(error: unknown): {
  name?: string;
  code?: string;
  status?: number;
} {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: error instanceof Error ? error.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}
