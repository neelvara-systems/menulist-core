import assert from 'node:assert/strict';
import {
  getProviderHealthSourceErrorContext,
  projectPreviousCompletion,
  replaceAnswerlatticeAiProviderHealthState,
  timestampMillis,
  type AnswerlatticeAiProviderHealthSuccessState,
} from '../../functions-answerlattice/src/answerlattice/aiProviderHealth';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');

  const ref = db.collection('platformSummary').doc('answerlatticeAiProviderHealth');
  await ref.delete();
  await ref.set({
    checkedAtSeed: new Date(1_700_000_000_000),
    completedAtSeed: new Date(1_700_000_000_100),
    error: 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED',
    privateLegacyPayload: 'must-be-pruned',
    sourceErrorCode: 'provider-secret-code',
    sourceErrorName: 'ProviderError',
    sourceStatusCode: 503,
    status: 'failed',
  });

  const seedData = (await ref.get()).data();
  const checkedAtSeed = seedData?.checkedAtSeed;
  const completedAtSeed = seedData?.completedAtSeed;
  assert.equal(timestampMillis(checkedAtSeed), 1_700_000_000_000);
  assert.equal(timestampMillis(completedAtSeed), 1_700_000_000_100);
  const checkedAt = checkedAtSeed as AnswerlatticeAiProviderHealthSuccessState['checkedAt'];
  const completedAt = completedAtSeed as AnswerlatticeAiProviderHealthSuccessState['lastCompletedAt'];
  const completedDayKey = new Date(1_700_000_000_100).toISOString().slice(0, 10);
  assert.equal(projectPreviousCompletion({
    lastCompletedAt: completedAt,
    lastCompletedDayKey: completedDayKey,
  }, 1_700_000_000_100)?.lastCompletedDayKey, completedDayKey);
  assert.equal(projectPreviousCompletion({
    lastCompletedAt: completedAt,
    lastCompletedDayKey: '2026-07-21',
  }, 1_800_000_000_000), null);
  assert.equal(projectPreviousCompletion({
    lastCompletedAt: completedAt,
    lastCompletedDayKey: completedDayKey,
  }, 1_699_999_999_999), null);
  await replaceAnswerlatticeAiProviderHealthState({
    checkedAt,
    error: null,
    lastAttemptDayKey: '2026-07-21',
    lastCompletedAt: completedAt,
    lastCompletedDayKey: '2026-07-21',
    latencyMs: 100,
    model: 'gemini-test',
    productId: 'AL',
    provider: 'gemini',
    sdkSurface: 'answerlattice-functions-google-genai',
    source: 'answerlatticeMasterScheduler',
    status: 'ok',
    success: true,
    tokenCountSource: 'provider',
    totalTokenCount: 3,
    updatedAt: completedAt,
  });

  assert.deepEqual(Object.keys((await ref.get()).data() || {}).sort(), [
    'checkedAt',
    'error',
    'lastAttemptDayKey',
    'lastCompletedAt',
    'lastCompletedDayKey',
    'latencyMs',
    'model',
    'productId',
    'provider',
    'sdkSurface',
    'source',
    'status',
    'success',
    'tokenCountSource',
    'totalTokenCount',
    'updatedAt',
  ]);

  await replaceAnswerlatticeAiProviderHealthState({
    checkedAt,
    error: 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED',
    failureCode: 'ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED',
    lastAttemptDayKey: '2026-07-22',
    lastCompletedAt: completedAt,
    lastCompletedDayKey: '2026-07-21',
    latencyMs: 250,
    model: 'gemini-test',
    productId: 'AL',
    provider: 'gemini',
    sdkSurface: 'answerlattice-functions-google-genai',
    source: 'answerlatticeMasterScheduler',
    sourceErrorCode: 'UNAVAILABLE',
    sourceErrorName: 'ProviderError',
    sourceStatusCode: 503,
    status: 'failed',
    success: false,
    updatedAt: completedAt,
  });
  assert.deepEqual(Object.keys((await ref.get()).data() || {}).sort(), [
    'checkedAt',
    'error',
    'failureCode',
    'lastAttemptDayKey',
    'lastCompletedAt',
    'lastCompletedDayKey',
    'latencyMs',
    'model',
    'productId',
    'provider',
    'sdkSurface',
    'source',
    'sourceErrorCode',
    'sourceErrorName',
    'sourceStatusCode',
    'status',
    'success',
    'updatedAt',
  ]);

  assert.equal(timestampMillis({ toMillis: () => 123 }), 123);
  assert.equal(timestampMillis({ seconds: 123 }), 123_000);
  assert.equal(timestampMillis({ toMillis: () => '123' }), null);
  assert.equal(timestampMillis({ seconds: -1 }), null);
  assert.equal(timestampMillis({ toMillis: () => { throw new Error('bad timestamp'); } }), null);

  const boundedError = getProviderHealthSourceErrorContext({
    code: 'x'.repeat(200),
    name: 'y'.repeat(200),
    status: Number.NaN,
  });
  assert.equal(String(boundedError.sourceErrorCode).length, 80);
  assert.equal(String(boundedError.sourceErrorName).length, 80);
  assert.equal(boundedError.sourceStatusCode, null);

  const hostileError = new Error('must-not-escape');
  Object.defineProperty(hostileError, 'name', {
    get(): never {
      throw new Error('hostile name getter');
    },
  });
  assert.deepEqual(getProviderHealthSourceErrorContext(hostileError), {
    sourceErrorCode: null,
    sourceErrorName: null,
    sourceStatusCode: null,
  });

  await ref.delete();
  console.log('Answerlattice AI provider health state emulator tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
