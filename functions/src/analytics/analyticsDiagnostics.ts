import * as functions from 'firebase-functions';
import { getBoundedFunctionsErrorContext } from '../utils/boundedErrorContext';

export const analyticsLogger = functions.logger;

export function getAnalyticsErrorContext(error: unknown): {
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

export function getAnalyticsIdContext(value: unknown): {
    present: boolean;
    length: number;
} {
    const normalized = typeof value === 'string'
        ? value
        : (
            (typeof value === 'number' && Number.isFinite(value))
            || typeof value === 'bigint'
            || typeof value === 'boolean'
        )
            ? String(value)
            : '';
    return {
        present: normalized.length > 0,
        length: normalized.length,
    };
}
