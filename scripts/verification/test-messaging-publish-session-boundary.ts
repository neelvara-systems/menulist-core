#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  buildMessagingPublishDeliveryState,
  getMessagingCommittedPublishResult,
  getMessagingPublishSourceFingerprint,
  normalizeMessagingPublishSession,
} from '../../src/lib/messaging-onboarding/publishSessionBoundary';
import { normalizeMessagingPublishedResult } from '../../functions/src/messagingOnboarding/publishedResultBoundary';
import { validateMessagingPublishMenu } from '../../src/lib/messaging-onboarding/publishValidationBoundary';

const SESSION_ID = 'publish-boundary-session';
const BUCKET = 'demo.appspot.com';
const TOKEN = 'publishBoundaryToken_1234567890';

function buildUpload() {
  const id = crypto.createHash('sha1').update('publish-upload').digest('hex');
  const storagePath = `messagingOnboarding/${SESSION_ID}/${id}.png`;
  return {
    fileName: 'menu.png',
    fileSize: 1024,
    id,
    mimeType: 'image/png',
    providerMediaId: 'provider-publish-upload',
    sha256: crypto.createHash('sha256').update('publish-upload').digest('hex'),
    storagePath,
    storageUrl: `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media&token=123e4567-e89b-42d3-a456-426614174000`,
    uploadedAt: new Date(),
  };
}

function buildSession() {
  const upload = buildUpload();
  const now = new Date();
  return {
    correctionCount: 0,
    createdAt: now,
    detectedBusinessCategory: 'food',
    detectedBusinessType: 'Restaurant',
    expiresAt: new Date(now.getTime() + 60_000),
    extractedBusinessInfo: { address: '12 Market Road', ignored: 'drop-me' },
    extractedBusinessProfile: null,
    extractedMenuData: {
      categories: [{ id: 'cat-1', name: { en: 'Lunch' }, ignored: 'drop-me' }],
      items: [{
        category: 'cat-1',
        id: 'item-1',
        name: { en: 'Lunch Combo' },
        price: '199',
        providerSecret: 'drop-me',
      }],
      languages: [{ code: 'en', isPrimary: true, name: 'English' }],
      providerPayload: 'drop-me',
    },
    extractedProjectFiles: [{
      active: true,
      deleted: false,
      extractedData: {
        data: {
          categories: [{ id: 'cat-1', name: { en: 'Lunch' }, ignored: 'drop-me' }],
          items: [{
            category: 'cat-1',
            id: 'item-1',
            name: { en: 'Lunch Combo' },
            price: '199',
            providerSecret: 'drop-me',
          }],
          languages: [{ code: 'en', isPrimary: true, name: 'English' }],
          providerPayload: 'drop-me',
        },
        message: ' Parsed from file ',
        processingMessages: ['Parsed rows', 'Parsed rows', '', '\u0000'],
      },
      index: 0,
      name: 'ignored-name.png',
      qualityScore: 0.8,
      size: 999999,
      type: 'application/pdf',
      uid: upload.id,
      url: 'https://example.com/ignored',
    }],
    previewToken: TOKEN,
    provider: 'whatsapp',
    providerDisplayId: '+919800000000',
    providerUserId: '919800000000',
    publishedResult: null,
    sessionId: SESSION_ID,
    state: 'AWAITING_APPROVAL',
    stateHistory: [{ reason: 'ready', state: 'AWAITING_APPROVAL', timestamp: now }],
    uploads: [upload],
    validMenuFiles: [upload.id],
  };
}

function main(): void {
  assert.deepEqual(buildMessagingPublishDeliveryState(), {
    confirmationMessageDeliveryAttempts: 0,
    confirmationMessageLeaseToken: null,
    confirmationMessageLeaseUntil: null,
    confirmationPending: true,
    fixMessageDeliveryAttempts: 0,
    fixMessageLeaseToken: null,
    fixMessageLeaseUntil: null,
    fixMessagePending: false,
    previewMessageDeliveryAttempts: 0,
    previewMessageLeaseToken: null,
    previewMessageLeaseUntil: null,
    previewMessagePending: false,
    reminderMessageLeaseToken: null,
    reminderMessageLeaseUntil: null,
  });
  const source = buildSession();
  const normalized = normalizeMessagingPublishSession(source, SESSION_ID, BUCKET);
  assert(normalized);
  assert.equal(normalized.stateEnteredAtMillis, source.stateHistory[0].timestamp.getTime());
  assert.equal(normalized.extractedMenuData.items[0].price, '199');
  assert.equal('providerSecret' in normalized.extractedMenuData.items[0], false);
  assert.equal(normalized.extractedBusinessInfoAddress, '12 Market Road');
  assert.equal(normalized.extractedProjectFiles.length, 1);
  assert.equal(normalized.extractedProjectFiles[0].uid, source.uploads[0].id);
  assert.equal(normalized.extractedProjectFiles[0].name, source.uploads[0].fileName);
  assert.equal(normalized.extractedProjectFiles[0].size, source.uploads[0].fileSize);
  assert.equal(normalized.extractedProjectFiles[0].type, source.uploads[0].mimeType);
  assert.equal(normalized.extractedProjectFiles[0].url, source.uploads[0].storageUrl);
  assert.equal(normalized.extractedProjectFiles[0].qualityScore, 0.8);
  assert.equal(normalized.extractedProjectFiles[0].extractedData?.message, 'Parsed from file');
  assert.deepEqual(normalized.extractedProjectFiles[0].extractedData?.processingMessages, ['Parsed rows']);
  assert.equal(normalized.extractedProjectFiles[0].extractedData?.data.items[0].price, '199');
  assert.equal(
    'providerSecret' in (normalized.extractedProjectFiles[0].extractedData?.data.items[0] || {}),
    false,
  );
  assert.equal(validateMessagingPublishMenu(normalized.extractedMenuData).valid, true);
  assert.equal(validateMessagingPublishMenu({
    ...normalized.extractedMenuData,
    categories: [],
  }).valid, false);
  assert.equal(validateMessagingPublishMenu({
    ...normalized.extractedMenuData,
    items: [{
      active: true,
      available: true,
      category: 'cat-1',
      id: 'item-unpriced',
      name: { en: 'Unpriced item' },
    }],
  }).valid, false);
  assert.equal(validateMessagingPublishMenu({
    ...normalized.extractedMenuData,
    items: [{
      active: true,
      available: true,
      attributes: [{ active: true, id: 'variant-1', name: { en: 'Full' }, price: '299' }],
      category: 'cat-1',
      id: 'item-variant-priced',
      name: { en: 'Variant priced item' },
    }],
  }).valid, true);
  assert.equal(validateMessagingPublishMenu({
    ...normalized.extractedMenuData,
    items: [{
      active: true,
      available: true,
      attributes: [{ active: false, id: 'variant-1', name: { en: 'Full' }, price: '299' }],
      category: 'cat-1',
      id: 'item-inactive-variant-priced',
      name: { en: 'Inactive variant priced item' },
    }],
  }).valid, false);

  const legacyWithoutProjectFiles = normalizeMessagingPublishSession(
    { ...source, extractedProjectFiles: undefined },
    SESSION_ID,
    BUCKET,
  );
  assert(legacyWithoutProjectFiles);
  assert.equal(legacyWithoutProjectFiles.extractedProjectFiles[0].extractedData?.message, '');
  assert.equal(legacyWithoutProjectFiles.extractedProjectFiles[0].extractedData?.data.items[0].id, 'item-1');

  const sameSourceDifferentCounter = normalizeMessagingPublishSession(
    { ...source, correctionCount: 1 },
    SESSION_ID,
    BUCKET,
  );
  assert(sameSourceDifferentCounter);
  assert.equal(
    getMessagingPublishSourceFingerprint(normalized),
    getMessagingPublishSourceFingerprint(sameSourceDifferentCounter),
  );

  const changedMenu = normalizeMessagingPublishSession({
    ...source,
    extractedMenuData: {
      ...source.extractedMenuData,
      items: [{ ...source.extractedMenuData.items[0], price: '299' }],
    },
  }, SESSION_ID, BUCKET);
  assert(changedMenu);
  assert.notEqual(
    getMessagingPublishSourceFingerprint(normalized),
    getMessagingPublishSourceFingerprint(changedMenu),
  );
  const changedAddress = normalizeMessagingPublishSession({
    ...source,
    extractedBusinessInfo: { address: '99 Changed Road' },
  }, SESSION_ID, BUCKET);
  assert(changedAddress);
  assert.notEqual(
    getMessagingPublishSourceFingerprint(normalized),
    getMessagingPublishSourceFingerprint(changedAddress),
    'A concurrent source-address change must invalidate a claimed publish',
  );

  assert.equal(normalizeMessagingPublishSession({
    ...source,
    uploads: [{ ...source.uploads[0], storagePath: 'messagingOnboarding/other/session.png' }],
  }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    extractedProjectFiles: [{
      ...source.extractedProjectFiles[0],
      extractedData: {
        data: {
          categories: source.extractedMenuData.categories,
          items: [{ ...source.extractedMenuData.items[0], price: undefined }],
          languages: source.extractedMenuData.languages,
        },
        message: 'unpriced renderer truth',
      },
    }],
  }, SESSION_ID, BUCKET), null, 'Aggregate menu truth must not hide an unpublishable renderer graph');

  const oversizedItems = Array.from({ length: 500 }, (_, index) => ({
    category: 'cat-1',
    description: { en: 'x'.repeat(2_000) },
    id: `oversized-item-${index}`,
    name: { en: `Item ${index}` },
    price: '1',
  }));
  const oversizedExtractedData = {
    categories: source.extractedMenuData.categories,
    items: oversizedItems,
    languages: source.extractedMenuData.languages,
  };
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    extractedMenuData: oversizedExtractedData,
    extractedProjectFiles: [{
      ...source.extractedProjectFiles[0],
      extractedData: { data: oversizedExtractedData, message: 'oversized' },
    }],
  }, SESSION_ID, BUCKET), null, 'Oversized project file payloads must fail before Firestore publish');
  assert.equal(normalizeMessagingPublishSession(source, SESSION_ID, 'other.appspot.com'), null);
  assert.equal(normalizeMessagingPublishSession({ ...source, correctionCount: '0' }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({ ...source, previewToken: 'short' }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    stateHistory: [{ state: 'PROCESSING_MENU', timestamp: new Date() }],
  }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    uploads: [source.uploads[0], { ...source.uploads[0], id: 'duplicate-upload' }],
  }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    extractedProjectFiles: [{ ...source.extractedProjectFiles[0], uid: 'other-upload' }],
  }, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    extractedProjectFiles: [{
      ...source.extractedProjectFiles[0],
      extractedData: { data: { categories: [], items: [], languages: [] } },
    }],
  }, SESSION_ID, BUCKET), null);

  const live = normalizeMessagingPublishSession({
    ...source,
    publishedResult: {
      dashboardUrl: 'https://app.menulist.ai/signin',
      projectId: '1-default-2',
      publicUrl: 'https://demo.menulist.online/menu',
      storeId: 2,
      tenantId: 1,
      userId: 'owner-1',
    },
    state: 'LIVE',
    stateHistory: [...source.stateHistory, { state: 'LIVE', timestamp: new Date() }],
  }, SESSION_ID, BUCKET);
  assert(live?.publishedResult);
  assert.deepEqual(
    getMessagingCommittedPublishResult({ ...source, ...{
      extractedProjectFiles: undefined,
      publishedResult: live?.publishedResult,
      state: 'LIVE',
      stateHistory: [...source.stateHistory, { state: 'LIVE', timestamp: new Date() }],
    } }, SESSION_ID, BUCKET),
    live?.publishedResult,
    'A committed publish must remain replayable after heavy project-file state is pruned',
  );
  assert.equal(getMessagingCommittedPublishResult(source, SESSION_ID, BUCKET), null);
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    publishedResult: {
      dashboardUrl: 'https://app.menulist.ai/signin',
      projectId: '9-default-8',
      publicUrl: 'https://demo.menulist.online',
      storeId: 2,
      tenantId: 1,
      userId: 'owner-1',
    },
    state: 'LIVE',
    stateHistory: [...source.stateHistory, { state: 'LIVE', timestamp: new Date() }],
  }, SESSION_ID, BUCKET), null, 'Published project identity must match its tenant/store result');
  assert.equal(normalizeMessagingPublishedResult({
    dashboardUrl: 'https://app.menulist.ai/signin',
    projectId: '9-default-8',
    publicUrl: 'https://demo.menulist.online',
    storeId: 2,
    tenantId: 1,
    userId: 'owner-1',
  }), null, 'Functions delivery must reject cross-scope published project identity');
  assert.equal(normalizeMessagingPublishSession({
    ...source,
    publishedResult: { publicUrl: 'javascript:alert(1)' },
    state: 'LIVE',
    stateHistory: [...source.stateHistory, { state: 'LIVE', timestamp: new Date() }],
  }, SESSION_ID, BUCKET), null);

  console.log('Messaging publish session boundary verification passed.');
}

main();
