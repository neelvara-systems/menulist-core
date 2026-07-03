import { join } from 'path';
import * as functions from 'firebase-functions';

const enableLocalLogs = process.env.NODE_ENV !== 'production';

const localLogLogger = functions.logger;

const safeLogFileName = (logFileName: string): string => (
    logFileName.replace(/[\\/]/g, '_').slice(0, 120)
);

const safeLogLabel = (value: string): string => (
    value.replace(/[\r\n\t]/g, ' ').slice(0, 120)
);

const safeLogKey = (value: string): string => {
    const key = value.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 64);
    return key || 'field';
};

const getLocalLogStringContext = (label: string, value: unknown) => {
    const text = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: text.trim().length > 0,
        [`${label}Length`]: text.length,
    };
};

const getLocalLogErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getLocalLogErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getLocalLogErrorStatus = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as { status?: unknown }).status
        : (error as { statusCode?: unknown }).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

const MAX_LOCAL_LOG_OBJECT_KEYS = 24;
const MAX_LOCAL_LOG_ARRAY_ITEMS = 8;
const MAX_LOCAL_LOG_DEPTH = 2;

const sanitizeLocalLogData = (value: unknown, depth = 0): unknown => {
    if (value === undefined || value === null) return value ?? null;

    if (value instanceof Error) {
        return {
            sourceErrorName: getLocalLogErrorName(value),
            sourceErrorCode: getLocalLogErrorCode(value),
            sourceStatusCode: getLocalLogErrorStatus(value),
        };
    }

    if (typeof value === 'string') {
        return getLocalLogStringContext('value', value);
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (Array.isArray(value)) {
        const summary: Record<string, unknown> = {
            type: 'array',
            length: value.length,
        };
        if (depth < MAX_LOCAL_LOG_DEPTH) {
            summary.items = value
                .slice(0, MAX_LOCAL_LOG_ARRAY_ITEMS)
                .map((item) => sanitizeLocalLogData(item, depth + 1));
        }
        return summary;
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).slice(0, MAX_LOCAL_LOG_OBJECT_KEYS);
        const summary: Record<string, unknown> = {
            type: 'object',
            keyCount: Object.keys(record).length,
        };
        if (depth >= MAX_LOCAL_LOG_DEPTH) {
            summary.keys = keys.map(safeLogKey);
            return summary;
        }
        keys.forEach((key, index) => {
            summary[`${safeLogKey(key)}_${index}`] = sanitizeLocalLogData(record[key], depth + 1);
        });
        return summary;
    }

    return { type: typeof value };
};

// Generic logging function (kept local due to file creation issues, but made more generic)
export async function writeLogEntry({ logFileName, userId = 'N/A', projectId, fileId, logType, data, error, }: { logFileName: string; userId?: string; projectId?: string; fileId?: string; logType: string; data?: any; error?: any; }) {
    if (!enableLocalLogs) return;
    const logDirectory = join(process.cwd(), 'logs');
    const logFilePath = join(logDirectory, logFileName); // Use the parameter

    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} - User: ${JSON.stringify(getLocalLogStringContext('userId', userId))} - Type: ${safeLogLabel(logType)}`;

    if (projectId) logMessage += ` - Project: ${JSON.stringify(getLocalLogStringContext('projectId', projectId))}`;
    if (fileId) logMessage += ` - FileId: ${JSON.stringify(getLocalLogStringContext('fileId', fileId))}`;

    if (data) {
        logMessage += ` - Data: ${JSON.stringify(sanitizeLocalLogData(data))}`;
    }

    if (error) {
        logMessage += ` - Error: ${JSON.stringify({
            sourceErrorName: getLocalLogErrorName(error),
            sourceErrorCode: getLocalLogErrorCode(error),
            sourceStatusCode: getLocalLogErrorStatus(error),
        })}`;
    }

    logMessage += '\n';

    try {
        const { mkdir, appendFile } = await import('fs/promises');
        await mkdir(logDirectory, { recursive: true });
        await appendFile(logFilePath, logMessage);
    } catch (logFileError) {
        localLogLogger.error('[Local Log] Failed to write local log entry', {
            logType,
            logFileName: safeLogFileName(logFileName),
            hasData: Boolean(data),
            hasError: Boolean(error),
            error: {
                sourceErrorName: getLocalLogErrorName(logFileError),
                sourceErrorCode: getLocalLogErrorCode(logFileError),
                sourceStatusCode: getLocalLogErrorStatus(logFileError),
            },
        });
    }
}

export const writeAuthLogEntry = async (logFileName: string, userId: string) => {
    return writeLogEntry({
        logFileName,
        userId,
        logType: 'AUTH_ERROR',
        error: { message: 'Unauthorized' }
    });
}

export const writeMissingParamsLogEntry = async (logFileName: string, userId: string, projectId: string, fileId: string, data: any) => {
    return writeLogEntry({
        logFileName,
        userId,
        projectId,
        fileId,
        logType: 'VALIDATION_ERROR',
        data: data,
        error: { message: 'Missing required parameters' }
    });
}

export const writeErrorLogEntry = async (logFileName: string, error: any) => {
    return writeLogEntry({
        logFileName,
        logType: 'ERROR',
        error: error
    });
}
