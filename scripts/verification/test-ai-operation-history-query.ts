import assert from 'node:assert/strict';
import {
    isAiOperationHistoryCursorAdmissible,
    resolveAiOperationActionScanBoundary,
} from '../../src/lib/ai/operationHistoryQuery';
import { projectAiOperationHistoryFields } from '../../src/lib/ai/operationHistoryProjection';

const resolve = (overrides: Partial<Parameters<typeof resolveAiOperationActionScanBoundary>[0]> = {}) => (
    resolveAiOperationActionScanBoundary({
        hasScanCursor: true,
        matchedCount: 0,
        maxScanDocs: 500,
        pageSize: 15,
        reachedEnd: false,
        scannedDocs: 500,
        ...overrides,
    })
);

const admitCursor = (
    overrides: Partial<Parameters<typeof isAiOperationHistoryCursorAdmissible>[0]> = {},
) => isAiOperationHistoryCursorAdmissible({
    cursorCreatedOn: { toDate: () => new Date('2026-07-13T12:00:00.000Z') },
    cursorExists: true,
    cursorRequested: true,
    dateRange: {},
    ...overrides,
});

{
    assert.equal(admitCursor({ cursorExists: false, cursorRequested: false }), true, 'an omitted cursor needs no persisted boundary');
    assert.equal(admitCursor({ cursorExists: false }), false, 'a requested missing cursor must not replay page one');
    assert.equal(admitCursor({ cursorCreatedOn: new Date('2026-07-13T12:00:00.000Z') }), true, 'a valid Date cursor remains compatible');
    assert.equal(admitCursor({ cursorCreatedOn: { toDate: () => new Date('invalid') } }), false, 'an invalid timestamp-like cursor must fail closed');
    assert.equal(admitCursor({ cursorCreatedOn: { toDate: () => { throw new Error('corrupt timestamp'); } } }), false, 'a throwing timestamp-like cursor must fail closed');
    assert.equal(admitCursor({ cursorCreatedOn: '2026-07-13T12:00:00.000Z' }), false, 'a non-Timestamp persisted cursor boundary must fail closed');
}

{
    const dateRange = {
        start: new Date('2026-07-13T00:00:00.000Z'),
        end: new Date('2026-07-13T23:59:59.999Z'),
    };
    assert.equal(admitCursor({ dateRange }), true, 'a cursor inside the active date range remains valid');
    assert.equal(admitCursor({ cursorCreatedOn: new Date('2026-07-12T23:59:59.999Z'), dateRange }), false, 'a cursor before the active date range must fail closed');
    assert.equal(admitCursor({ cursorCreatedOn: new Date('2026-07-14T00:00:00.000Z'), dateRange }), false, 'a cursor after the active date range must fail closed');
    assert.equal(admitCursor({ cursorCreatedOn: dateRange.start, dateRange }), true, 'the inclusive start boundary remains valid');
    assert.equal(admitCursor({ cursorCreatedOn: dateRange.end, dateRange }), true, 'the inclusive end boundary remains valid');
}

{
    const boundary = resolve();
    assert.equal(boundary.hasMore, true, 'zero-match capped scans must preserve older-history availability');
    assert.equal(boundary.cursorSource, 'scan_cursor', 'zero-match capped scans must advance past the scanned window');
    assert.equal(boundary.requiresManualContinuation, true, 'empty capped scans require explicit client continuation');
}

{
    const boundary = resolve({ matchedCount: 8 });
    assert.equal(boundary.hasMore, true, 'partially filled capped scans must preserve older-history availability');
    assert.equal(boundary.cursorSource, 'scan_cursor', 'partially filled capped scans must not re-read the scanned gap');
    assert.equal(boundary.requiresManualContinuation, false, 'pages with results can continue normally');
}

{
    const boundary = resolve({ matchedCount: 16, scannedDocs: 120 });
    assert.equal(boundary.hasMore, true, 'a buffered matching row proves another page exists');
    assert.equal(boundary.cursorSource, 'last_match', 'the cursor must stay before the buffered matching row');
    assert.equal(boundary.scanLimitReached, false, 'a buffered match before the cap is not a capped scan');
}

{
    const boundary = resolve({ matchedCount: 6, reachedEnd: true, scannedDocs: 80 });
    assert.equal(boundary.hasMore, false, 'a completed scan with no buffered match is terminal');
    assert.equal(boundary.cursorSource, 'last_match', 'a terminal non-empty page retains its final result cursor');
}

{
    const boundary = resolve({ hasScanCursor: false, reachedEnd: true, scannedDocs: 0 });
    assert.equal(boundary.hasMore, false, 'an empty collection is terminal');
    assert.equal(boundary.cursorSource, 'none', 'an empty collection has no cursor');
}

{
    const hiddenPayload = {} as Record<string, unknown>;
    Object.defineProperty(hiddenPayload, 'rawProviderResponse', {
        enumerable: true,
        get() {
            throw new Error('hidden fields must not be read');
        },
    });
    Object.assign(hiddenPayload, {
        action: 'image_processing',
        createdOn: { toDate: () => new Date('2026-07-13T00:00:00.000Z') },
        id: 'persisted-spoofed-id',
    });

    const projected = projectAiOperationHistoryFields({
        data: hiddenPayload,
        documentId: 'authoritative-document-id',
        visibleFields: new Set(['action', 'createdOn', 'id']),
    });

    assert.deepEqual(projected, {
        action: 'image_processing',
        createdOn: '2026-07-13T00:00:00.000Z',
        id: 'authoritative-document-id',
    }, 'projection must serialize only visible fields and preserve the authoritative document ID');
}

console.log('AI operation history query boundary tests passed');
