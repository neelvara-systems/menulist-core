import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    buildExtractionCostMetricsFromOperations,
    buildHealthMetricsFromJobs,
    buildQualityMetricsFromJobs,
    getExtractionDateMs,
    normalizeExtractionJobDetails,
} from '../../src/database/ops/extraction';

const now = Date.now();
const recentTimestamp = { seconds: Math.floor(now / 1000) };

assert.equal(getExtractionDateMs({ toDate: () => { throw new Error('malformed timestamp'); } }), 0);
assert.equal(getExtractionDateMs({ seconds: 0 }), 0);
assert.equal(getExtractionDateMs({ seconds: '123' }), 0);
assert.equal(getExtractionDateMs(new Date(now)), now);

const health = buildHealthMetricsFromJobs([
    { createdAt: recentTimestamp, status: 'completed', result: { processingTime: 20_000, qualityScore: 80 } },
    { createdAt: recentTimestamp, status: 'preview_ready', result: { processingTime: '900000', qualityScore: '100' } },
    { createdAt: recentTimestamp, status: 'completed', result: { processingTime: -1, qualityScore: 500 } },
    { createdAt: recentTimestamp, status: 'failed' },
    { createdAt: { toDate: () => { throw new Error('bad row'); } }, status: 'failed' },
]);
assert.equal(health.totalJobs24h, 4, 'a malformed timestamp must exclude only its row');
assert.equal(health.failedJobs24h, 1);
assert.equal(health.avgProcessingTime, 20, 'string and negative processing times must not corrupt averages');
assert.equal(health.avgQualityScore, 80, 'string and out-of-range quality scores must not corrupt averages');

const quality = buildQualityMetricsFromJobs([
    {
        status: 'completed',
        result: {
            qualityScore: 75,
            confidenceSummary: {
                highConfidenceCount: 2,
                mediumConfidenceCount: '40',
                lowConfidenceCount: -5,
            },
        },
    },
    { status: 'completed', result: { qualityScore: Number.NaN } },
]);
assert.equal(quality.avgScore, 75);
assert.deepEqual(quality.confidenceDistribution, { high: 2, medium: 0, low: 0 });

const costs = buildExtractionCostMetricsFromOperations([
    { action: 'IMAGE_PROCESSING', createdAt: recentTimestamp, totalCharge: 10 },
    { action: 'IMAGE_PROCESSING', createdAt: recentTimestamp, totalCharge: '9000' },
    { action: 'IMAGE_PROCESSING', createdAt: recentTimestamp, totalCharge: -3 },
    { action: 'OTHER', createdAt: recentTimestamp, totalCharge: 500 },
    { action: 'IMAGE_PROCESSING', createdAt: { toDate: () => { throw new Error('bad op'); } }, totalCharge: 800 },
], now - 60_000);
assert.deepEqual(costs, {
    callsToday: 3,
    avgCostPerExtraction: 3,
    dailySpend: 10,
    mostExpensiveJobCost: 10,
});

const details = normalizeExtractionJobDetails('job-1', {
    projectId: 'tenant-a-default-store-a',
    status: 'failed',
    files: [
        { uid: 'file-1', name: 'menu.pdf', type: 'application/pdf', size: 100 },
        { uid: 'bad', name: 'bad.pdf', type: 'application/pdf', size: '100' },
    ],
    targetLanguages: [{ code: 'en', name: 'English' }, null],
    timings: { queueWaitMs: 50, aiProcessingMs: '9000', saveMs: -2 },
    result: {
        qualityScore: 80,
        processingTime: 20_000,
        qualityDetails: { categoryQuality: 20, itemQuality: 10, priceQuality: 40, descriptionQuality: 10 },
        confidenceSummary: {
            averageConfidenceScore: 0.8,
            highConfidenceCount: 2,
            mediumConfidenceCount: '4',
            lowConfidenceCount: -1,
        },
        batchResults: [{ batchIndex: 0, filesProcessed: 1, success: true }, { batchIndex: '1', filesProcessed: 1, success: true }],
        rawBatchResponses: [{ batchIndex: 0, rawText: 'raw', truncated: false }, { batchIndex: 1, rawText: 4, truncated: false }],
    },
    fileResults: {
        'file-1': { categoriesCount: 2, itemsCount: 10 },
        'file-2': { categoriesCount: '20', itemsCount: -1 },
    },
    transaction: {
        transactionId: 'txn-1',
        totalCredits: 5,
        totalCharge: 20,
        tokenUsage: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 },
    },
    error: { code: { nested: true }, retryAfterSeconds: '30', retryable: true },
});
assert.equal(details.files.length, 1);
assert.deepEqual(details.targetLanguages, [{ code: 'en', name: 'English' }]);
assert.deepEqual(details.timings, { queueWaitMs: 50 });
assert.equal(details.result?.confidenceSummary?.mediumConfidenceCount, 0);
assert.equal(details.result?.batchResults?.length, 1);
assert.equal(details.result?.rawBatchResponses?.length, 1);
assert.deepEqual(details.fileResults?.['file-2'], { categoriesCount: 0, itemsCount: 0 });
assert.equal(details.transaction?.transactionId, 'txn-1');
assert.equal(details.error?.code, 'extraction_failed');
assert.equal(details.error?.retryAfterSeconds, undefined);

const malformedDetails = normalizeExtractionJobDetails('job-2', {
    projectId: {},
    status: {},
    result: { qualityScore: '80', processingTime: -1, qualityDetails: {} },
    transaction: { transactionId: {}, totalCredits: '5', totalCharge: Number.NaN },
});
assert.equal(malformedDetails.projectId, '');
assert.equal(malformedDetails.status, 'unknown');
assert.equal(malformedDetails.result, null);
assert.equal(malformedDetails.transaction, null);

const mobileMonitorSource = fs.readFileSync(
    path.join(process.cwd(), 'src/components/mobile/screens/MobileExtractionMonitorScreen.tsx'),
    'utf8',
);
for (const expectedBoundary of [
    'const isMountedRef = useRef(true);',
    'const latestRequestRef = useRef(0);',
    'latestRequestRef.current !== requestId',
    'latestRequestRef.current === requestId',
    'latestRequestRef.current += 1;',
    'if (filter === jobFilter) return;',
    'onClick={() => selectJobFilter(filter)}',
]) {
    assert.ok(
        mobileMonitorSource.includes(expectedBoundary),
        `mobile extraction monitor must retain request ownership boundary: ${expectedBoundary}`,
    );
}
assert.equal(
    mobileMonitorSource.includes('onClick={() => setJobFilter(filter)}'),
    false,
    'filter changes must invalidate the prior request before changing the active filter',
);

console.log('Extraction monitor data boundary checks passed.');
