import { LogEntry, LogLevel } from "@type/common";

let logs: LogEntry[] = [];
let isCapturing = false;

export function startLogCapture() {
    if (isCapturing) return; // Prevent duplicate hooking
    isCapturing = true;

    const capture = (level: LogLevel, ...args: any[]) => {
        const msg = args.map(a =>
            typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' ');

        logs.push({
            timestamp: Date.now(),
            message: msg,
            level
        });

        if (logs.length > 5) logs.shift(); // keep only last 5
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
    return logs;
}

export function clearCapturedLogs() {
    logs = [];
}
