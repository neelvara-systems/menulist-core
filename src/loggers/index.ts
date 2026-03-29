/**
 * DEPRECATED: Legacy logger - now uses unified console-based logger
 * 
 * This file is kept for backward compatibility.
 * New code should import from '@lib/monitoring/logger' instead.
 * 
 * Migration status: ✅ Redirects to new logger
 * Firebase DB logging: ❌ REMOVED
 */

import { logger as newLogger } from '@lib/monitoring/logger';

// Re-export types for backward compatibility
export type ApplicationLogType = {
    label: any;
    data: any;
    createdOn?: any;
    vscodeLink?: string;
    filePath?: string,
    logId?: any,
    type: any,
    createdBy?: string;
    modifiedBy?: string;
    role?: string;
    sId?: number;
    tId?: number;
    uId?: string;
    cause?: string;
    location?: string;
    message?: string;
    name?: string;
    stack?: string;
    userAgent?: any
}

export const LOGS_TYPE = [
    { type: 'info', key: 'info', tagColor: "green", color: "blue" },
    { type: 'warn', key: 'warn', tagColor: "warning", color: "orange" },
    { type: 'error', key: 'error', tagColor: "error", color: "red" },
    { type: 'trace', key: 'trace', tagColor: "volcano", color: "yellow" },
    { type: 'debug', key: 'debug', tagColor: "processing", color: "green" },
    { type: 'log', key: 'log', tagColor: "cyan", color: "green" },
]

export type LogType = 'info' | 'warn' | 'error' | 'trace' | 'debug' | 'log';

/**
 * Legacy logger wrapper - maintains old API but uses new Sentry-based logger
 */
const logger = {
    debug: (label: string, data?: any) => newLogger.debug(label, data),
    info: (label: string, data?: any) => newLogger.info(label, data),
    log: (label: string, data?: any) => newLogger.log(label, data),
    warn: (label: string, data?: any) => newLogger.warn(label, data),
    error: (label: string, data?: any) => {
        // Old API: error(label, data)
        // New API: error(message, error, context)
        // Map old to new
        if (data instanceof Error) {
            newLogger.error(label, data);
        } else {
            newLogger.error(label, undefined, data);
        }
    },
    trace: (label: string, data?: any) => newLogger.trace(label, data),
};

export default logger;

const getFileLink = (originalStackTrace) => {
    let vscodeLink = "";
    let filePath = "";
    const callerLine = originalStackTrace[2]; // Adjust the index based on where you want to capture the stack trace
    if (callerLine) {
        filePath = callerLine.split("/./src")[1]
        filePath = filePath?.substring(0, filePath.length - 1);
        if (filePath) {
            vscodeLink = `vscode://file//Users/danny/Projects/EcomsAi/dashboard/src/${filePath}`;
        }
    }
    return { filePath, vscodeLink };
};