import assert from 'node:assert/strict';
import {
    getSanitizedMonitoringContext,
    sanitizeMonitoringEvent,
    shouldSendMonitoringEvent,
} from '../../src/lib/monitoring/sentryShared';
import { sanitizeErrorForLog } from '../../src/lib/security/secureLogger';

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

console.log('Global failure and observability behavior tests passed.');
