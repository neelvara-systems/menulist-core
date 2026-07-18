import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    isPlatformExtractionRetryFileUrlAllowed,
    normalizePlatformExtractionRetrySource,
} from '../../src/lib/ops/extractionRetryBoundary';

const scope = { projectId: 'tenant-a-default-store-a', sId: 'store-a', tId: 'tenant-a' };
const storageUrl = 'https://firebasestorage.googleapis.com/v0/b/example/o/projects%2Ffiles%2Ftenant-a%2Fstore-a%2Fmenu.pdf?alt=media';
const validJob = {
    action: 'IMAGE_PROCESSING',
    files: [{ uid: 'file-1', name: 'menu.pdf', size: 1024, type: 'application/pdf', url: storageUrl }],
    projectId: scope.projectId,
    retryCount: 0,
    sId: scope.sId,
    source: 'owner_upload',
    status: 'failed',
    tId: scope.tId,
    targetLanguages: [{ code: 'en', name: 'English' }],
    uId: 'owner-a',
};

assert.ok(normalizePlatformExtractionRetrySource(validJob));
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, status: 'completed' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, error: { retryable: false } }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, retryCount: 3 }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, retryCount: '0' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, tId: 'tenant-b' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, sId: 'store-b' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, uId: '' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, files: [validJob.files[0], validJob.files[0]] }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, files: [{ ...validJob.files[0], size: '1024' }] }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, files: [{ ...validJob.files[0], size: 31 * 1024 * 1024 }] }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, files: [{ ...validJob.files[0], type: 'text/html' }] }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, source: 'MESSAGING_ONBOARDING' }), null);
assert.equal(normalizePlatformExtractionRetrySource({ ...validJob, skipProjectSave: true }), null);
assert.equal(normalizePlatformExtractionRetrySource({
    ...validJob,
    destinationType: 'public_menu_draft',
}), null);
assert.equal(normalizePlatformExtractionRetrySource({
    ...validJob,
    targetLanguages: [{ code: 'en', name: 'English' }, { code: 'en', name: 'English duplicate' }],
}), null);
assert.equal(normalizePlatformExtractionRetrySource({
    ...validJob,
    targetLanguages: [{ code: '../en', name: 'Invalid' }],
}), null);

assert.equal(isPlatformExtractionRetryFileUrlAllowed(storageUrl, 'owner_upload', scope), true);
assert.equal(
    isPlatformExtractionRetryFileUrlAllowed(
        'https://firebasestorage.googleapis.com/v0/b/example/o/projects%2Ffiles%2Ftenant-b%2Fstore-a%2Fmenu.pdf?alt=media',
        'owner_upload',
        scope,
    ),
    false,
);
assert.equal(isPlatformExtractionRetryFileUrlAllowed('https://evil.example/menu.pdf', 'owner_upload', scope), false);

const routePath = path.join(process.cwd(), 'src/app/api/ops/extraction/jobs/[jobId]/retry/route.ts');
const routeSource = fs.readFileSync(routePath, 'utf8');
const dalSource = fs.readFileSync(path.join(process.cwd(), 'src/database/ops/extraction.ts'), 'utf8');
for (const required of [
    "withAuth(async (request, session, params)",
    "{ requiredPlatformRole: 'PLATFORM' }",
    'getCurrentPlatformUser(session)',
    "getRateLimitForFeature('DATA_WRITE')",
    'failClosedOnProviderError: true',
    'normalizeMenuExtractionJobId(params?.jobId)',
    'normalizePlatformExtractionRetrySource(originalSnapshot.data())',
    'isPlatformExtractionRetryFileUrlAllowed(',
    '.doc(source.tId)',
    '.collection(source.sId)',
    '.doc(source.projectId)',
    'sanitizeForFirestore({',
    'createOrReuseActiveMenuExtractionJob({',
    "logger.security('Extraction retry created'",
]) {
    assert.ok(routeSource.includes(required), `platform retry route must contain ${required}`);
}
for (const required of [
    'PLATFORM_RETRY_RESPONSE_MAX_BYTES',
    'response.headers.get(\'content-length\')',
    'new TextEncoder().encode(body).byteLength',
    'normalizeMenuExtractionJobId(result.jobId)',
]) {
    assert.ok(dalSource.includes(required), `platform retry client boundary must contain ${required}`);
}
assert.ok(!dalSource.includes('response.json()'), 'platform retry must not parse an unbounded response body');

console.log('Extraction platform retry boundary checks passed.');
