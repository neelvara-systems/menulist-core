import assert from 'node:assert/strict';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../../src/constants/database';
import { createOrReuseActiveMenuExtractionJob } from '../../src/lib/menu-extraction/activeJobClaim';
import { saveFilesToProject } from '../../functions/src/logic/saveFilesToProject';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('FIRESTORE_EMULATOR_HOST is required.');
}

const projectId = `11-concurrency-${Date.now()}-22`;
const app = getApps()[0] || initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-menu-extraction-concurrency' });
const db = getFirestore(app);
const jobs = db.collection(DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS);
const artifacts = db.collection(DB_COLLECTIONS.MENU_LINK_IMPORT_ARTIFACTS);

function buildJobData(userId: string) {
  const now = Timestamp.now();
  return {
    createdAt: now,
    projectId,
    status: 'pending',
    uId: userId,
    updatedAt: now,
  };
}

async function claim(userId: string) {
  const artifactRef = artifacts.doc();
  return createOrReuseActiveMenuExtractionJob({
    additionalCreates: [{
      data: { artifactId: artifactRef.id, projectId },
      ref: artifactRef,
    }],
    db,
    jobData: buildJobData(userId),
    projectId,
  });
}

async function main() {
  const firstWave = await Promise.all(
    Array.from({ length: 12 }, (_, index) => claim(`owner-${index % 2}`)),
  );
  assert.equal(firstWave.filter((result) => result.created).length, 1);
  assert.equal(new Set(firstWave.map((result) => result.match.id)).size, 1);

  const firstSnapshot = await jobs.where('projectId', '==', projectId).get();
  assert.equal(firstSnapshot.size, 1, 'concurrent claims must create one active job per project');
  const firstArtifacts = await artifacts.where('projectId', '==', projectId).get();
  assert.equal(firstArtifacts.size, 1, 'only the winning job may create its sidecar artifact');

  await firstSnapshot.docs[0].ref.update({ status: 'completed', completedAt: Timestamp.now() });
  const secondWave = await Promise.all(Array.from({ length: 8 }, () => claim('owner-next')));
  assert.equal(secondWave.filter((result) => result.created).length, 1);
  assert.equal(new Set(secondWave.map((result) => result.match.id)).size, 1);

  const finalSnapshot = await jobs.where('projectId', '==', projectId).get();
  assert.equal(finalSnapshot.size, 2, 'a terminal job must not block one new active job');
  const finalArtifacts = await artifacts.where('projectId', '==', projectId).get();
  assert.equal(finalArtifacts.size, 2);

  const projectRef = db.collection(DB_COLLECTIONS.PROJECTS).doc('11').collection('22').doc(projectId);
  const incomingFile = {
    uid: 'file-project-save',
    name: 'menu.jpg',
    size: 1024,
    type: 'image/jpeg',
    url: 'https://storage.example/menu.jpg',
  };
  const redistributedData = new Map([[incomingFile.uid, {
    data: {
      categories: [],
      items: [],
      languages: [{ code: 'en', name: 'English', isPrimary: true }],
    },
  }]]);

  await projectRef.set({
    projectId,
    tId: 11,
    sId: 22,
    deleted: true,
    files: [],
    languages: ['en'],
  });
  await assert.rejects(
    saveFilesToProject(projectId, redistributedData, [incomingFile], [{ code: 'en', name: 'English', isPrimary: true }]),
    /Project is not available for extraction/,
    'a completed worker must not append extracted files after project deletion',
  );
  assert.deepEqual((await projectRef.get()).data()?.files, []);

  await projectRef.set({
    projectId,
    tId: 999,
    sId: 22,
    deleted: false,
    files: [],
    languages: ['en'],
  });
  await assert.rejects(
    saveFilesToProject(projectId, redistributedData, [incomingFile], [{ code: 'en', name: 'English', isPrimary: true }]),
    /Project identity does not match extraction scope/,
    'project persistence must independently reject drifted tenant identity',
  );
  assert.deepEqual((await projectRef.get()).data()?.files, []);

  await projectRef.set({
    projectId,
    tId: 11,
    sId: 22,
    deleted: false,
    files: [],
    languages: [' FR ', 42],
  });
  const saveResult = await saveFilesToProject(
    projectId,
    redistributedData,
    [incomingFile],
    [{ code: 'en', name: 'English', isPrimary: true }],
  );
  assert.equal(saveResult.newFilesCount, 1);
  assert.equal((await projectRef.get()).data()?.files?.[0]?.uid, incomingFile.uid);
  assert.deepEqual(
    (await projectRef.get()).data()?.languages,
    ['en', 'fr'],
    'project save must canonicalize valid legacy language codes and drop malformed values',
  );

  await Promise.all([
    ...finalSnapshot.docs.map((document) => document.ref.delete()),
    ...finalArtifacts.docs.map((document) => document.ref.delete()),
    projectRef.delete(),
  ]);
  console.log('Menu extraction concurrency emulator tests passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
