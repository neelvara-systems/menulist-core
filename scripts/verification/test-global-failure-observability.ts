import assert from 'node:assert/strict';
import {
    getSanitizedMonitoringContext,
    sanitizeMonitoringEvent,
    shouldSendMonitoringEvent,
} from '../../src/lib/monitoring/sentryShared';
import {
    containsSensitiveData,
    sanitizeErrorForLog,
    sanitizeLogData,
} from '../../src/lib/security/secureLogger';
import {
    getClientConsoleSnapshot,
    installClientConsoleBuffer,
} from '../../src/lib/debug/clientConsoleBuffer';
import {
    clearCapturedLogs,
    getCapturedLogs,
    startLogCapture,
} from '../../src/lib/localLogs/localLogsTracker';

const unsafeError = new Error('owner@example.com token=secret-value /tenant/private');
unsafeError.stack = 'Error: owner@example.com\n at /private/path/file.ts:1:1';
Object.assign(unsafeError, {
    code: 'provider/failure',
    status: 503,
});

const safeError = sanitizeErrorForLog(unsafeError);
assert.equal(safeError.name, 'Error');
assert.equal(safeError.messagePresent, true);
assert.equal(safeError.stackPresent, true);
assert.equal(safeError.code, 'provider/failure');
assert.equal(safeError.status, 503);
assert.equal('message' in safeError, false);
assert.equal('stack' in safeError, false);

const circular: Record<string, unknown> = {
    email: 'owner@example.com',
    endpoint: '/api/private?token=secret-value',
    nested: {
        accessToken: 'secret-value',
    },
};
circular.self = circular;

const safeContext = getSanitizedMonitoringContext(circular);
assert.equal(safeContext?.email, '[redacted:length=17]');
assert.equal(safeContext?.endpoint, '[path_present:length=31]');
assert.deepEqual(safeContext?.nested, { accessToken: '[REDACTED]' });
assert.equal(safeContext?.self, '[Circular]');

const safeEvent = sanitizeMonitoringEvent({
    breadcrumbs: [{
        data: { email: 'owner@example.com' },
        message: '/private/path?token=secret-value',
    }],
    exception: {
        values: [{
            type: 'Error',
            value: 'owner@example.com token=secret-value',
        }],
    },
    message: 'owner@example.com token=secret-value',
    request: {
        headers: { authorization: 'Bearer secret-value' },
        url: '/private/path?token=secret-value',
    },
    transaction: '/private/path?token=secret-value',
    user: { email: 'owner@example.com', id: 'owner-123' },
});
const serializedEvent = JSON.stringify(safeEvent);
assert.equal(serializedEvent.includes('owner@example.com'), false);
assert.equal(serializedEvent.includes('secret-value'), false);
assert.equal(serializedEvent.includes('/private/path'), false);
assert.equal(serializedEvent.includes('error_message_present'), true);

assert.equal(
    shouldSendMonitoringEvent({ originalException: new Error('ResizeObserver loop limit exceeded') }),
    false,
);
assert.equal(
    shouldSendMonitoringEvent({ originalException: new Error('owner_workspace_render_failed') }),
    true,
);

let conversionHookCalls = 0;
const hostileContext = Object.create(null) as Record<string, unknown>;
Object.defineProperty(hostileContext, 'email', {
    enumerable: true,
    get() {
        conversionHookCalls += 1;
        throw new Error('getter must not execute');
    },
});
hostileContext.safe = 'retained';
hostileContext.toJSON = () => {
    conversionHookCalls += 1;
    throw new Error('toJSON must not execute');
};

assert.deepEqual(sanitizeLogData(hostileContext), {
    safe: 'retained',
    toJSON: '[function]',
});
assert.deepEqual(getSanitizedMonitoringContext(hostileContext), {
    safe: 'retained',
    toJSON: '[function]',
});
assert.equal(conversionHookCalls, 0);

const brokenProxy = new Proxy({}, {
    ownKeys() {
        throw new Error('inspection failed');
    },
});
assert.deepEqual(sanitizeLogData(brokenProxy), { inspectionFailed: true });
assert.deepEqual(getSanitizedMonitoringContext(brokenProxy), { inspectionFailed: true });
assert.equal(containsSensitiveData(brokenProxy), true);
assert.doesNotThrow(() => sanitizeMonitoringEvent(brokenProxy));

const accessorSecret = {};
Object.defineProperty(accessorSecret, 'password', {
    enumerable: true,
    get() {
        conversionHookCalls += 1;
        throw new Error('secret getter must not execute');
    },
});
assert.equal(containsSensitiveData(accessorSecret), true);
assert.equal(conversionHookCalls, 0);

const brokenPrototypeProxy = new Proxy({}, {
    getPrototypeOf() {
        throw new Error('prototype inspection failed');
    },
});
assert.doesNotThrow(() => sanitizeMonitoringEvent(brokenPrototypeProxy));

const hostileError = new Error('ignored');
Object.defineProperty(hostileError, 'message', {
    configurable: true,
    get() {
        conversionHookCalls += 1;
        throw new Error('message getter must not execute');
    },
});
assert.equal(shouldSendMonitoringEvent({ originalException: hostileError }), true);
assert.equal(conversionHookCalls, 0);

const originalConsole = {
    debug: console.debug,
    error: console.error,
    info: console.info,
    log: console.log,
    warn: console.warn,
};
const testWindow: Record<string, unknown> = {};
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: testWindow,
});
for (const level of Object.keys(originalConsole) as Array<keyof typeof originalConsole>) {
    console[level] = () => undefined;
}
installClientConsoleBuffer();
assert.doesNotThrow(() => console.log(brokenPrototypeProxy));
console.log(hostileContext);
assert.deepEqual(getClientConsoleSnapshot().at(-1)?.args, [
    '{"safe":"retained","toJSON":"[function]"}',
]);
assert.equal(conversionHookCalls, 0);
for (const level of Object.keys(originalConsole) as Array<keyof typeof originalConsole>) {
    console[level] = originalConsole[level];
}
Reflect.deleteProperty(globalThis, 'window');

const ticketLogWindow = {
    addEventListener: () => undefined,
    navigator: { userAgent: 'audit-test' },
};
Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: ticketLogWindow,
});
const ticketConsole = {
    error: console.error,
    log: console.log,
    warn: console.warn,
};
console.error = () => undefined;
console.log = () => undefined;
console.warn = () => undefined;
clearCapturedLogs();
startLogCapture();
assert.doesNotThrow(() => console.warn(hostileContext));
assert.equal(
    getCapturedLogs().at(-1)?.message,
    '{"safe":"retained","toJSON":"[function]"}',
);
assert.equal(conversionHookCalls, 0);
console.error = ticketConsole.error;
console.log = ticketConsole.log;
console.warn = ticketConsole.warn;
Reflect.deleteProperty(globalThis, 'window');

console.log('Global failure and observability behavior tests passed.');
