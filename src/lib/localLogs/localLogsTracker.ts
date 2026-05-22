import { LogEntry, LogLevel } from "@type/common";

const MAX_LOGS = 5;
const MAX_MESSAGE_LENGTH = 1000;
const INSTALLED_KEY = '__menulistTicketLogCaptureInstalled';

const sensitiveAssignmentPattern = /(password|passwd|token|secret|authorization|api[_-]?key|session|cookie)=([^&\s]+)/gi;
const sensitiveJsonFieldPattern = /("(?:password|passwd|token|customToken|accessToken|refreshToken|secret|authorization|api[_-]?key|session|cookie)"\s*:\s*")([^"]*)(")/gi;
const emailJsonFieldPattern = /("email"\s*:\s*")([^"]+@[^"]+)(")/gi;

let logs: LogEntry[] = [];
let isCapturing = false;

type LogCaptureWindow = Window & {
    [INSTALLED_KEY]?: boolean;
};

function sanitizeLogText(value: string): string {
    const redacted = value
        .replace(sensitiveAssignmentPattern, '$1=[redacted]')
        .replace(sensitiveJsonFieldPattern, '$1[redacted]$3')
        .replace(emailJsonFieldPattern, '$1[redacted]$3');

    return redacted.length > MAX_MESSAGE_LENGTH ? `${redacted.slice(0, MAX_MESSAGE_LENGTH)}...[truncated]` : redacted;
}

function serializeLogArg(value: unknown): string {
    if (value instanceof Error) {
        return sanitizeLogText(`${value.name}: ${value.message}\n${value.stack || ''}`);
    }

    if (typeof value === 'string') return sanitizeLogText(value);

    try {
        return sanitizeLogText(JSON.stringify(value, (_key, entryValue) => {
            if (typeof entryValue === 'function') return '[Function]';
            if (entryValue instanceof Error) {
                return {
                    message: entryValue.message,
                    name: entryValue.name,
                    stack: entryValue.stack?.split('\n').slice(0, 8).join('\n'),
                };
            }
            return entryValue;
        }));
    } catch {
        return sanitizeLogText(String(value));
    }
}

export function startLogCapture() {
    if (typeof window === 'undefined') return;
    const target = window as LogCaptureWindow;
    if (isCapturing || target[INSTALLED_KEY]) return; // Prevent duplicate hooking
    isCapturing = true;
    target[INSTALLED_KEY] = true;

    const capture = (level: LogLevel, ...args: any[]) => {
        const msg = args.map(serializeLogArg).join(' ');

        logs.push({
            timestamp: Date.now(),
            message: msg,
            level
        });

        if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
    };

    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;

    console.log = (...args: any[]) => {
        capture('info', ...args);
        origLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
        capture('error', ...args);
        origError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
        capture('warn', ...args);
        origWarn.apply(console, args);
    };

    window.addEventListener('error', e => {
        capture('error', e.message);
    });

    window.addEventListener('unhandledrejection', e => {
        capture('error', String(e.reason));
    });
}

export function getCapturedLogs() {
    return logs.slice(-MAX_LOGS);
}

export function clearCapturedLogs() {
    logs = [];
}
