import assert from 'node:assert/strict';

import { logAiServiceFailure } from '../../src/services/ai/aiServiceDiagnostics';
import { normalizeAiImageResponseItems } from '../../src/services/ai/image/imageResponse';

const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

try {
    const browserErrorCalls: unknown[][] = [];
    const browserLogCalls: unknown[][] = [];
    console.error = (...args: unknown[]) => { browserErrorCalls.push(args); };
    console.log = (...args: unknown[]) => { browserLogCalls.push(args); };
    Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: {},
    });

    logAiServiceFailure('ai_browser_expected_failure', Object.assign(new Error('private provider detail'), {
        code: 'provider_failed',
        statusCode: 503,
    }), {
        responseStatus: 503,
    });

    assert.equal(browserErrorCalls.length, 0, 'browser AI failures must not raise a console error overlay');
    assert.equal(browserLogCalls.length, 1, 'browser AI failures must retain one bounded support diagnostic');
    assert.equal(browserLogCalls[0]?.[0], '[AI Service] Operation failed');
    assert.deepEqual(browserLogCalls[0]?.[1], {
        failureCode: 'ai_browser_expected_failure',
        responseStatus: 503,
        severity: 'error',
        sourceErrorCode: 'provider_failed',
        sourceErrorName: 'Error',
        sourceStatusCode: 503,
    });

    Reflect.deleteProperty(globalThis, 'window');
    const serverErrorCalls: unknown[][] = [];
    console.error = (...args: unknown[]) => { serverErrorCalls.push(args); };
    logAiServiceFailure('ai_server_failure', new Error('private server detail'));
    assert.equal(serverErrorCalls.length, 1, 'server AI failures must retain error-level secure logging');
    assert.equal(serverErrorCalls[0]?.[0], '[AI Service] Operation failed');
} finally {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
        Reflect.deleteProperty(globalThis, 'window');
    }
}

assert.deepEqual(normalizeAiImageResponseItems(undefined), []);
assert.deepEqual(normalizeAiImageResponseItems(null), []);
assert.deepEqual(normalizeAiImageResponseItems([
    { base64: 'YWJj', mimeType: 'image/png' },
]), [
    { base64: 'data:image/png;base64,YWJj', mimeType: 'image/png' },
]);
assert.deepEqual(normalizeAiImageResponseItems([
    { base64: 'data:image/webp;base64,YWJj', mimeType: 'image/webp' },
]), [
    { base64: 'data:image/webp;base64,YWJj', mimeType: 'image/webp' },
]);
assert.equal(normalizeAiImageResponseItems({ base64: 'YWJj', mimeType: 'image/png' }), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 123, mimeType: 'image/png' }]), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 'YWJj', mimeType: 'text/html' }]), null);
assert.equal(normalizeAiImageResponseItems([
    { base64: 'data:text/html;base64,YWJj', mimeType: 'image/png' },
]), null);
assert.equal(normalizeAiImageResponseItems([{ base64: 'YWJj' }]), null);

console.log('AI service response boundary tests passed.');
