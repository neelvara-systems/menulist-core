import { join } from 'path';
const enableLocalLogs = true;
// Generic logging function (kept local due to file creation issues, but made more generic)
export async function writeLogEntry({ logFileName, userId = 'N/A', projectId, fileId, logType, data, error, }: { logFileName: string; userId?: string; projectId?: string; fileId?: string; logType: string; data?: any; error?: any; }) {
    if (!enableLocalLogs) return;
    const logDirectory = join(process.cwd(), 'logs');
    const logFilePath = join(logDirectory, logFileName); // Use the parameter

    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} - User: ${userId} - Type: ${logType}`;

    if (projectId) logMessage += ` - Project: ${projectId}`;
    if (fileId) logMessage += ` - FileId: ${fileId}`;

    if (data) {
        if (logType === 'SUCCESS_RESPONSE' && data.response && typeof data.response === 'object' && data.response.candidates) {
            const responseCopy = { ...data.response };
            delete responseCopy.candidates;
            logMessage += ` - Response: ${JSON.stringify(responseCopy)}`;
        } else {
            logMessage += ` - Data: ${JSON.stringify(data)}`;
        }
    }

    if (error) {
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        const stack = error instanceof Error ? error.stack : 'N/A';
        logMessage += ` - Error: ${errorMessage} - Stack: ${stack}`;
    }

    logMessage += '\n';

    try {
        const { mkdir, appendFile } = await import('fs/promises');
        await mkdir(logDirectory, { recursive: true });
        await appendFile(logFilePath, logMessage);
    } catch (logFileError) {
        console.error(`Failed to write ${logType} log to file '${logFilePath}':`, logFileError);
        console.error(`Original log data for ${logType}:\n${logMessage}`);
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
