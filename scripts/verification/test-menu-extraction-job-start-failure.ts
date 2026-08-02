import assert from 'node:assert/strict';
import {
    createMenuProcessingJobCallerError,
    isDefinitiveMenuProcessingJobStartRejection,
    shouldCleanupUploadedFilesAfterJobStartError,
} from '../../src/lib/menu-extraction/jobStartFailure';
import { normalizeMenuExtractionJobId } from '../../src/lib/menu-extraction/jobIdBoundary';
import { normalizeMenuExtractionProjectId } from '../../src/lib/menu-extraction/projectIdBoundary';

assert.equal(normalizeMenuExtractionJobId('A1234567890123456789'), 'A1234567890123456789');
assert.equal(normalizeMenuExtractionJobId(' A1234567890123456789'), null);
assert.equal(normalizeMenuExtractionJobId('A1234567890123456789/child'), null);
assert.equal(normalizeMenuExtractionProjectId('1-project_1-1'), '1-project_1-1');
assert.equal(normalizeMenuExtractionProjectId(' 1-project_1-1'), null);

const rejected = {
    code: 'menu_processing_job_start_rejected',
    status: 403,
};
assert.equal(isDefinitiveMenuProcessingJobStartRejection(rejected), true);
assert.equal(
    shouldCleanupUploadedFilesAfterJobStartError(createMenuProcessingJobCallerError(rejected)),
    true,
    'a definitive 4xx route rejection cannot have created a job and is cleanup-safe',
);

const unavailableBeforeJobCreation = {
    code: 'menu_processing_job_start_rejected',
    status: 503,
};
assert.equal(isDefinitiveMenuProcessingJobStartRejection(unavailableBeforeJobCreation), true);
assert.equal(
    shouldCleanupUploadedFilesAfterJobStartError(createMenuProcessingJobCallerError(unavailableBeforeJobCreation)),
    true,
    'the route only returns 503 before durable job creation, so uploaded files are cleanup-safe',
);

for (const ambiguous of [
    { code: 'menu_processing_job_start_rejected', status: 500 },
    { code: 'menu_processing_job_start_response_parse_failed', status: 200 },
    { code: 'menu_processing_job_start_response_invalid', status: 200 },
    new Error('network failure'),
    null,
]) {
    assert.equal(isDefinitiveMenuProcessingJobStartRejection(ambiguous), false);
    assert.equal(
        shouldCleanupUploadedFilesAfterJobStartError(createMenuProcessingJobCallerError(ambiguous)),
        false,
        'ambiguous failures must preserve uploaded files because a durable job may exist',
    );
}

console.log('Menu extraction job-start failure classification tests passed.');
