import { join } from 'path';
import { secureError } from '@lib/security/secureLogger';
import {
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';

const enableLocalLogs = process.env.NODE_ENV !== 'production';

const normalizeLocalLogFailure = (error: unknown): Error => {
    const normalized = new Error('Local log file write failed');
    const errorName = getBoundedErrorName(error);
    if (errorName) {
        normalized.name = errorName;
    }
    return normalized;
};

const safeLogFileName = (logFileName: string): string => {
    const normalized = logFileName
        .replace(/[\\/]/g, '_')
        .replace(/\.\.+/g, '.')
        .replace(/^\.+$/, 'local')
        .slice(0, 120);
    return normalized || 'local.log';
};

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
    return getBoundedErrorName(error);
};

const getLocalLogErrorCode = (error: unknown): string | undefined => {
    return getBoundedErrorCode(error);
};

const getLocalLogErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
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
    const sanitizedLogFileName = safeLogFileName(logFileName);
    const logFilePath = join(logDirectory, sanitizedLogFileName);

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
        secureError(
            '[Local Log] Failed to write local log entry',
            normalizeLocalLogFailure(logFileError),
            {
                logType,
                logFileName: sanitizedLogFileName,
                hasData: Boolean(data),
                hasError: Boolean(error),
            },
        );
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

export const writeMissingParamsLogEntry = async (
    logFileName: string,
    userId: string,
    projectId: string | undefined,
    fileId: string | undefined,
    data: unknown,
) => {
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
