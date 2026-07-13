#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { readExtractionCorrectionContribution } from '../../functions/src/analytics/extractionLearningBoundary';

const detailed = readExtractionCorrectionContribution({
    changeType: 'EXTRACTION_CORRECTION',
    oldValue: { field: 'price', confidence: 'high' },
    newValue: { field: 'price' },
});
assert.equal(detailed.total, 1);
assert.equal(detailed.byField.price, 1);
assert.equal(detailed.byConfidence.high, 1);

const summary = readExtractionCorrectionContribution({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        extractionCorrections: 3,
        extractionCorrectionsByField: {
            name: 1,
            price: 2,
            description: 0,
            categoryId: 0,
            tags: 0,
        },
        extractionCorrectionsByConfidence: {
            high: 1,
            medium: 2,
            low: 0,
        },
    },
});
assert.equal(summary.total, 3);
assert.equal(summary.byField.name, 1);
assert.equal(summary.byField.price, 2);
assert.equal(summary.byConfidence.medium, 2);

const legacySummary = readExtractionCorrectionContribution({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: { extractionCorrections: 4 },
});
assert.equal(legacySummary.total, 4);
assert.equal(Object.values(legacySummary.byField).reduce((sum, count) => sum + count, 0), 0);

for (const malformed of [
    null,
    { changeType: 'EXTRACTION_CORRECTION', oldValue: { field: 'unknown' } },
    { changeType: 'MENU_REVISION_SUMMARY', newValue: { extractionCorrections: -1 } },
    { changeType: 'MENU_REVISION_SUMMARY', newValue: { extractionCorrections: 1.5 } },
    { changeType: 'MENU_REVISION_SUMMARY', newValue: { extractionCorrections: 10_001 } },
]) {
    assert.equal(readExtractionCorrectionContribution(malformed).total, 0);
}

const inconsistentSummary = readExtractionCorrectionContribution({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        extractionCorrections: 9999,
        extractionCorrectionsByField: { name: 1 },
        extractionCorrectionsByConfidence: { high: 9999 },
    },
});
assert.equal(inconsistentSummary.total, 1, 'field attribution must outrank a conflicting declared total');
assert.equal(inconsistentSummary.byConfidence.high, 1, 'confidence counts must not exceed total corrections');

const oversizedAttributedSummary = readExtractionCorrectionContribution({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        extractionCorrections: 10_000,
        extractionCorrectionsByField: { name: 10_000, price: 10_000 },
    },
});
assert.equal(oversizedAttributedSummary.total, 0, 'field totals must not bypass the per-event cap');

const overAttributedConfidence = readExtractionCorrectionContribution({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        extractionCorrections: 2,
        extractionCorrectionsByField: { name: 1, price: 1 },
        extractionCorrectionsByConfidence: { high: 2, medium: 2, low: 0 },
    },
});
assert.equal(overAttributedConfidence.total, 2);
assert.equal(
    Object.values(overAttributedConfidence.byConfidence).reduce((sum, count) => sum + count, 0),
    0,
    'inconsistent confidence totals must be ignored rather than inflating calibration',
);

process.stdout.write('Extraction learning boundary tests passed.\n');
