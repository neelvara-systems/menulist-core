#!/usr/bin/env ts-node

import assert from 'node:assert/strict';

const {
  forceRepublishActiveProjects,
  isPublishVerificationScopeAuthorized,
  updateStoreHealth,
} = require('../../functions/lib/monitoring/publishVerification.js');
const {
  firestoreAdmin,
} = require('../../functions/lib/firebaseAdmin.js');

async function clearCollection(collectionName: string): Promise<void> {
  const snapshot = await firestoreAdmin.collection(collectionName).get();
  for (let offset = 0; offset < snapshot.docs.length; offset += 400) {
    const batch = firestoreAdmin.batch();
    snapshot.docs.slice(offset, offset + 400).forEach((document: { ref: unknown }) => {
      batch.delete(document.ref);
    });
    await batch.commit();
  }
}

async function run(): Promise<void> {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST is required');
  }

  await clearCollection('stores');
  await clearCollection('tenants');
  await clearCollection('users');

  const tenantRef = firestoreAdmin.collection('tenants').doc('1');
  const otherTenantRef = firestoreAdmin.collection('tenants').doc('2');
  const storeRef = firestoreAdmin.collection('stores').doc('101');
  const userRef = firestoreAdmin.collection('users').doc('user-1');
  await tenantRef.set({ active: true, deleted: false });
  await otherTenantRef.set({ active: true, deleted: false });
  await storeRef.set({
    active: true,
    deleted: false,
    name: 'Scope Test Store',
    subdomain: 'scope-test',
    tenantId: 1,
  });
  await userRef.set({
    active: true,
    deleted: false,
    isVerified: true,
    storeId: 101,
    storeIds: [101],
    tenantId: 1,
  });

  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1'),
    true,
    'an active canonical store/tenant pair must be admitted',
  );
  await storeRef.set({ tId: 2 }, { merge: true });
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1'),
    false,
    'conflicting persisted store tenant aliases must fail closed',
  );
  await storeRef.set({ tId: 1 }, { merge: true });
  await userRef.set({ tId: 2 }, { merge: true });
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1'),
    false,
    'conflicting persisted user tenant aliases must fail closed',
  );
  await userRef.set({ tId: 1 }, { merge: true });
  const publicMenuUrl = 'https://scope-test.menulist.online/dinner';
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1', { publicMenuUrl }),
    true,
    'the canonical store hostname must be admitted',
  );
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1', {
      publicMenuUrl: 'https://example.com/dinner',
    }),
    false,
    'an unrelated public hostname must not be used to set store health',
  );
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1', {
      requirePlatformAuthority: true,
    }),
    false,
    'an owner membership must not satisfy the platform recovery boundary',
  );
  await userRef.set({ platformRole: 'PLATFORM' }, { merge: true });
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1', {
      requirePlatformAuthority: true,
    }),
    true,
    'current persisted platform authority may operate the recovery path',
  );
  const projects = firestoreAdmin.collection('projects').doc('1').collection('101');
  await Promise.all([
    projects.doc('project-a').set({ active: true, deleted: false, sId: 101, tId: 1 }),
    projects.doc('project-b').set({ active: true, deleted: false, storeId: 101, tenantId: 1 }),
    projects.doc('project-deleted').set({ active: true, deleted: true, sId: 101, tId: 1 }),
    projects.doc('project-other-scope').set({ active: true, deleted: false, sId: 202, tId: 1 }),
    projects.doc('project-conflicting-alias').set({
      active: true,
      deleted: false,
      sId: 101,
      storeId: 202,
      tId: 1,
      tenantId: 1,
    }),
  ]);
  const republish = await forceRepublishActiveProjects('101', '1', 'user-1');
  assert.deepEqual(
    republish.projectIds,
    ['project-a', 'project-b'],
    'force republish must touch every active canonical project and no deleted/cross-scope project',
  );
  assert.equal(republish.publicMenuUrl, 'https://scope-test.menulist.online');
  assert.equal(
    typeof (await projects.doc('project-a').get()).data()?.forceRepublishAt?.toMillis,
    'function',
    'the transaction must mark each admitted project',
  );
  assert.equal(
    (await projects.doc('project-deleted').get()).data()?.forceRepublishAt,
    undefined,
    'deleted projects must not be touched',
  );
  await userRef.set({ platformRole: null }, { merge: true });
  await assert.rejects(
    forceRepublishActiveProjects('101', '1', 'user-1'),
    /PUBLISH_VERIFICATION_SCOPE_INVALID/,
    'a stale platform token cannot authorize another force-republish transaction',
  );
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '2', 'user-1'),
    false,
    'the same store must not be admitted under another tenant',
  );
  assert.equal(
    await isPublishVerificationScopeAuthorized('0101', '1', 'user-1'),
    false,
    'non-canonical numeric document IDs must fail before reads/writes',
  );

  const healthyResult = {
    checks: { hasContent: true, httpOk: true },
    failureReason: null,
    responseTimeMs: 25,
    status: 'OK',
  };
  await assert.rejects(
    updateStoreHealth('101', '1', 'user-1', healthyResult, {
      publicMenuUrl: 'https://example.com/dinner',
    }),
    /PUBLISH_VERIFICATION_SCOPE_INVALID/,
    'the Admin write transaction must reject health derived from another hostname',
  );
  await updateStoreHealth('101', '1', 'user-1', healthyResult, { publicMenuUrl });
  let storeData = (await storeRef.get()).data() || {};
  assert.equal(storeData.name, 'Scope Test Store', 'health writes must preserve unrelated store truth');
  assert.equal(storeData.health?.status, 'OK');
  assert.equal(storeData.health?.consecutiveFailures, 0);

  await storeRef.set({ tenantId: 2 }, { merge: true });
  await assert.rejects(
    updateStoreHealth('101', '1', 'user-1', healthyResult, { publicMenuUrl }),
    /PUBLISH_VERIFICATION_SCOPE_INVALID/,
    'the transaction must reject a store whose canonical tenant changed',
  );
  storeData = (await storeRef.get()).data() || {};
  assert.equal(storeData.health?.status, 'OK', 'a rejected cross-tenant update must not mutate health');

  await storeRef.set({ tenantId: 1 }, { merge: true });
  await tenantRef.set({ active: false }, { merge: true });
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1'),
    false,
    'an inactive canonical tenant must fail before the network check',
  );
  await assert.rejects(
    updateStoreHealth('101', '1', 'user-1', healthyResult, { publicMenuUrl }),
    /PUBLISH_VERIFICATION_SCOPE_INVALID/,
    'the Admin write transaction must independently reject an inactive tenant',
  );

  await tenantRef.set({ active: true }, { merge: true });
  await userRef.set({ storeId: 202, storeIds: [202] }, { merge: true });
  assert.equal(
    await isPublishVerificationScopeAuthorized('101', '1', 'user-1'),
    false,
    'a current user whose store access was removed must fail despite stale signed claims',
  );
  await assert.rejects(
    updateStoreHealth('101', '1', 'user-1', healthyResult, { publicMenuUrl }),
    /PUBLISH_VERIFICATION_SCOPE_INVALID/,
    'the Admin write transaction must revalidate current user membership',
  );

  process.stdout.write('Publish verification scope tests passed.\n');
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
