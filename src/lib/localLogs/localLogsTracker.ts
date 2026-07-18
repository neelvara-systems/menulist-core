import { LogEntry, LogLevel } from "@type/common";
import { sanitizeErrorForLog } from "@lib/security/secureLogger";

const MAX_LOGS = 5;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_USER_AGENT_LENGTH = 500;
const INSTALLED_KEY = '__menulistTicketLogCaptureInstalled';

const sensitiveAssignmentPattern = /(password|passwd|token|secret|authorization|api[_-]?key|session|cookie)=([^&\s]+)/gi;
const sensitiveJsonFieldPattern = /("(?:password|passwd|token|customToken|accessToken|refreshToken|secret|authorization|api[_-]?key|session|cookie)"\s*:\s*")([^"]*)(")/gi;
const emailJsonFieldPattern = /("email"\s*:\s*")([^"]+@[^"]+)(")/gi;
const emailTextPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerTextPattern = /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi;

let logs: LogEntry[] = [];
let isCapturing = false;

type LogCaptureWindow = Window & {
    [INSTALLED_KEY]?: boolean;
};

function sanitizeLogText(value: string): string {
    const redacted = value
        .replace(sensitiveAssignmentPattern, '$1=[redacted]')
        .replace(sensitiveJsonFieldPattern, '$1[redacted]$3')
        .replace(emailJsonFieldPattern, '$1[redacted]$3')
        .replace(emailTextPattern, '[redacted-email]')
        .replace(bearerTextPattern, 'Bearer [redacted]');

    return redacted.length > MAX_MESSAGE_LENGTH ? `${redacted.slice(0, MAX_MESSAGE_LENGTH)}...[truncated]` : redacted;
}

function serializeLogArg(value: unknown): string {
    if (value instanceof Error) {
        return sanitizeLogText(JSON.stringify(sanitizeErrorForLog(value)));
    }

    if (typeof value === 'string') return sanitizeLogText(value);

    try {
        return sanitizeLogText(JSON.stringify(value, (_key, entryValue) => {
            if (typeof entryValue === 'function') return '[Function]';
            if (entryValue instanceof Error) {
                return sanitizeErrorForLog(entryValue);
            }
            return entryValue;
        }));
    } catch {
        return sanitizeLogText(String(value));
    }
}

function sanitizeUserAgent(value: string): string {
    return value
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_USER_AGENT_LENGTH);
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
        capture('error', {
            event: 'window_error',
            error: e.error instanceof Error ? sanitizeErrorForLog(e.error) : undefined,
            messageLength: typeof e.message === 'string' ? e.message.length : 0,
            messagePresent: Boolean(e.message),
        });
    });

    window.addEventListener('unhandledrejection', e => {
        capture('error', {
            event: 'unhandled_rejection',
            error: e.reason instanceof Error ? sanitizeErrorForLog(e.reason) : undefined,
            reasonPresent: e.reason !== undefined && e.reason !== null,
            reasonType: typeof e.reason,
        });
    });
}

export function getCapturedLogs() {
    return logs.slice(-MAX_LOGS);
}

export function getClientDebugContext() {
    if (typeof window === 'undefined') return undefined;
    const userAgent = sanitizeUserAgent(window.navigator?.userAgent || '');

    if (!userAgent) return undefined;

    return {
        userAgent,
        capturedAt: Date.now(),
    };
}

export function clearCapturedLogs() {
    logs = [];
}
