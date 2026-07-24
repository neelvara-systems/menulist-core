import assert from 'node:assert/strict';
import {
  ANSWERLATTICE_AI_ACTIONS,
  extractGeminiUsageMetadata,
  recordAnswerlatticeAiOperation,
  recordEmbeddingOperation,
} from '../../functions-answerlattice/src/answerlattice/aiOperationAccounting';
import { firestoreAdmin as db } from '../../functions-answerlattice/src/firebaseAdmin';

async function main(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required.');

  const operationRoot = db.collection('answerlattice_aiOperations');
  await db.recursiveDelete(operationRoot);

  assert.deepEqual(
    extractGeminiUsageMetadata({
      usageMetadata: {
        promptTokenCount: '4',
        candidatesTokenCount: -1,
        totalTokenCount: Number.NaN,
      },
    }, '12345678', '1234'),
    {
      promptTokenCount: 2,
      candidatesTokenCount: 1,
      totalTokenCount: 3,
      tokenCountSource: 'estimated',
    },
    'malformed provider counters must fall back to bounded estimation',
  );

  const validId = await recordAnswerlatticeAiOperation({
    action: ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT,
    billingMode: 'internal',
    candidatesTokenCount: 2,
    clientResponse: {
      rawProviderText: 'must-not-persist',
      suggestedActionCount: 1,
    },
    model: 'gemini-test',
    processingTime: 12,
    promptTokenCount: 3,
    sId: 22,
    source: 'answerlattice_friction_insight_weekly',
    tId: 11,
    tokenCountSource: 'provider',
    totalTokenCount: 5,
    unitsConsumed: 0,
  });
  assert.ok(validId);
  const validScopeSnapshot = await operationRoot.doc('11').collection('22').get();
  assert.equal(validScopeSnapshot.size, 1);
  assert.deepEqual(
    {
      action: validScopeSnapshot.docs[0].get('action'),
      candidatesTokenCount: validScopeSnapshot.docs[0].get('candidatesTokenCount'),
      clientResponse: validScopeSnapshot.docs[0].get('clientResponse'),
      promptTokenCount: validScopeSnapshot.docs[0].get('promptTokenCount'),
      sId: validScopeSnapshot.docs[0].get('sId'),
      tId: validScopeSnapshot.docs[0].get('tId'),
      tokenCountSource: validScopeSnapshot.docs[0].get('tokenCountSource'),
      totalCharge: validScopeSnapshot.docs[0].get('totalCharge'),
      totalTokenCount: validScopeSnapshot.docs[0].get('totalTokenCount'),
    },
    {
      action: ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT,
      candidatesTokenCount: 2,
      clientResponse: { suggestedActionCount: 1 },
      promptTokenCount: 3,
      sId: 22,
      tId: 11,
      tokenCountSource: 'provider',
      totalCharge: 1,
      totalTokenCount: 5,
    },
  );

  const numericStringScopeId = await Reflect.apply(recordAnswerlatticeAiOperation, undefined, [{
    action: ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT,
    sId: '22',
    source: 'answerlattice_friction_insight_weekly',
    tId: '12',
  }]);
  assert.equal(numericStringScopeId, null);
  assert.equal((await operationRoot.doc('12').collection('22').get()).size, 0);

  const numericStringEmbeddingDimensions = await Reflect.apply(recordEmbeddingOperation, undefined, [{
    articleId: 'article-1',
    dimensions: '768',
    sId: 22,
    source: 'answerlattice_kb_embedding',
    textToEmbed: 'bounded embedding input',
    tId: 13,
  }]);
  assert.equal(numericStringEmbeddingDimensions, null);
  assert.equal((await operationRoot.doc('13').collection('22').get()).size, 0);

  const fractionalScopeId = await recordAnswerlatticeAiOperation({
    action: ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT,
    sId: 22,
    source: 'answerlattice_friction_insight_weekly',
    tId: 11.5,
  });
  assert.equal(fractionalScopeId, null);
  assert.equal((await operationRoot.doc('11.5').collection('22').get()).size, 0);

  const invalidTokenId = await recordAnswerlatticeAiOperation({
    action: ANSWERLATTICE_AI_ACTIONS.FRICTION_INSIGHT,
    candidatesTokenCount: 0,
    promptTokenCount: 0,
    sId: 22,
    source: 'answerlattice_friction_insight_weekly',
    tId: 11,
    tokenCountSource: 'provider',
    totalTokenCount: -1,
  });
  assert.equal(invalidTokenId, null);
  assert.equal((await operationRoot.doc('11').collection('22').get()).size, 1);

  const unknownActionId = await recordAnswerlatticeAiOperation({
    action: 'answerlattice_unregistered_action',
    sId: 22,
    source: 'answerlattice_unknown',
    tId: 11,
  });
  assert.equal(unknownActionId, null);
  assert.equal((await operationRoot.doc('11').collection('22').get()).size, 1);

  await db.recursiveDelete(operationRoot);
  console.log('Answerlattice Functions AI accounting emulator tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
