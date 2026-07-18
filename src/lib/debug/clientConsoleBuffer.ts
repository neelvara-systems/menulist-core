'use client';

import { sanitizeErrorForLog } from '@lib/security/secureLogger';

type ConsoleLevel = 'debug' | 'error' | 'info' | 'log' | 'warn';

export type ClientConsoleEntry = {
    args: string[];
    level: ConsoleLevel;
    timestamp: string;
};

const MAX_ENTRIES = 80;
const MAX_ARG_LENGTH = 800;
const GLOBAL_KEY = '__menulistConsoleBuffer';
const INSTALLED_KEY = '__menulistConsoleBufferInstalled';

type ConsoleBufferWindow = Window & {
    [GLOBAL_KEY]?: ClientConsoleEntry[];
    [INSTALLED_KEY]?: boolean;
};

const sensitiveAssignmentPattern = /(password|passwd|token|secret|authorization|api[_-]?key|session|cookie)=([^&\s]+)/gi;
const sensitiveJsonFieldPattern = /("(?:password|passwd|token|customToken|accessToken|refreshToken|secret|authorization|api[_-]?key|session|cookie)"\s*:\s*")([^"]*)(")/gi;
const emailJsonFieldPattern = /("email"\s*:\s*")([^"]+@[^"]+)(")/gi;
const emailTextPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const bearerTextPattern = /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi;

function sanitizeText(value: string): string {
    const redacted = value
        .replace(sensitiveAssignmentPattern, '$1=[redacted]')
        .replace(sensitiveJsonFieldPattern, '$1[redacted]$3')
        .replace(emailJsonFieldPattern, '$1[redacted]$3')
        .replace(emailTextPattern, '[redacted-email]')
        .replace(bearerTextPattern, 'Bearer [redacted]');
    return redacted.length > MAX_ARG_LENGTH ? `${redacted.slice(0, MAX_ARG_LENGTH)}...[truncated]` : redacted;
}

function serializeConsoleArg(value: unknown): string {
    if (value instanceof Error) {
        return sanitizeText(JSON.stringify(sanitizeErrorForLog(value)));
    }

    if (typeof value === 'string') return sanitizeText(value);

    try {
        return sanitizeText(JSON.stringify(value, (_key, entryValue) => {
            if (typeof entryValue === 'function') return '[Function]';
            if (entryValue instanceof Error) {
                return sanitizeErrorForLog(entryValue);
            }
            return entryValue;
        }));
    } catch {
        return sanitizeText(String(value));
    }
}

function getBuffer(): ClientConsoleEntry[] {
    if (typeof window === 'undefined') return [];
    const target = window as ConsoleBufferWindow;
    if (!target[GLOBAL_KEY]) target[GLOBAL_KEY] = [];
    return target[GLOBAL_KEY] || [];
}

export function installClientConsoleBuffer() {
    if (typeof window === 'undefined') return;
    const target = window as ConsoleBufferWindow;
    if (target[INSTALLED_KEY]) return;
    target[INSTALLED_KEY] = true;

    const levels: ConsoleLevel[] = ['debug', 'error', 'info', 'log', 'warn'];
    levels.forEach((level) => {
        const original = console[level]?.bind(console);
        if (!original) return;

        console[level] = (...args: unknown[]) => {
            const buffer = getBuffer();
            buffer.push({
                args: args.map(serializeConsoleArg),
                level,
                timestamp: new Date().toISOString(),
            });
            if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
            original(...args);
        };
    });
}

export function getClientConsoleSnapshot(): ClientConsoleEntry[] {
    return getBuffer().slice(-MAX_ENTRIES);
}
