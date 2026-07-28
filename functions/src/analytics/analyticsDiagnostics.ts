import * as functions from 'firebase-functions';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

export const analyticsLogger = functions.logger;

export function getAnalyticsErrorContext(error: unknown): {
    name?: string;
    code?: string;
    status?: number;
} {
    if (!error || typeof error !== 'object') return {};

    const record = error as Record<string, unknown>;
    return {
        name: getBoundedFunctionsErrorName(error),
        code: typeof record.code === 'string' ? record.code : undefined,
        status: typeof record.status === 'number' ? record.status : undefined,
    };
}

export function getAnalyticsIdContext(value: unknown): {
    present: boolean;
    length: number;
} {
    const normalized = typeof value === 'string' ? value : String(value ?? '');
    return {
        present: normalized.length > 0,
        length: normalized.length,
    };
}
