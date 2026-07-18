import assert from 'node:assert/strict';
import { readTempStatusResponse } from '@lib/tempStatus/clientResponse';
import {
    getActiveTempStatus,
    normalizeTempStatusMessage,
    normalizeTempStatusType,
} from '@lib/tempStatus/statusBoundary';
import { buildTempStatusSchema } from '@lib/schema';

const now = new Date('2026-07-16T20:00:00.000Z');
const future = '2026-07-18T00:00:00.000Z';

assert.equal(normalizeTempStatusType('closed_today'), 'closed_today');
assert.equal(normalizeTempStatusType('unknown'), null);
assert.equal(normalizeTempStatusMessage('custom', '  Private\n event  '), 'Private event');
assert.equal(normalizeTempStatusMessage('opening_late', undefined), 'Opening late today');
assert.equal(normalizeTempStatusMessage('custom', 'x'.repeat(120)).length, 100);

assert.deepEqual(getActiveTempStatus({
    expiresAt: future,
    message: '  Closed\nfor maintenance  ',
    type: 'custom',
}, now.getTime()), {
    expiresAt: future,
    message: 'Closed for maintenance',
    type: 'custom',
});
assert.equal(getActiveTempStatus({ expiresAt: now.toISOString(), type: 'closed_today' }, now.getTime()), null);
assert.equal(getActiveTempStatus({ expiresAt: 'not-a-date', type: 'closed_today' }, now.getTime()), null);
assert.equal(getActiveTempStatus({ expiresAt: future, type: 'unknown' }, now.getTime()), null);

assert.deepEqual(buildTempStatusSchema({
    expiresAt: future,
    message: 'Closed today',
    type: 'closed_today',
}, 'Asia/Kolkata', now), {
    '@type': 'OpeningHoursSpecification',
    closes: '00:00',
    description: 'Closed today',
    opens: '00:00',
    validFrom: '2026-07-17',
    validThrough: '2026-07-17',
});
assert.equal(buildTempStatusSchema({ expiresAt: future, type: 'kitchen_closed' }, 'UTC', now), undefined);
assert.equal(buildTempStatusSchema({ expiresAt: 'not-a-date', type: 'closed_today' }, 'UTC', now), undefined);
assert.equal(buildTempStatusSchema({ expiresAt: future, type: 'closed_today' }, 'Invalid/Timezone', now), undefined);

async function runResponseTests() {
    assert.deepEqual(
        await readTempStatusResponse(new Response(JSON.stringify({ effectsPending: true, success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        }), 'set'),
        { effectsPending: true, success: true },
    );
    assert.deepEqual(
        await readTempStatusResponse(new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
        }), 'clear'),
        { effectsPending: false, success: true },
    );
}

void runResponseTests().then(() => {
    console.log('Temporary-status boundary tests passed.');
});
