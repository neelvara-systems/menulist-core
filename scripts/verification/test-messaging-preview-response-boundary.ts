#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
  isMessagingPreviewViewableState,
  normalizeMessagingPreviewCounter,
  normalizeMessagingPreviewMenuData,
  normalizeMessagingPreviewPublishedResult,
  normalizeMessagingPreviewScore,
} from '../../src/lib/messaging-onboarding/previewResponseBoundary';
import { readMessagingPreviewDataResponse } from '../../src/lib/messaging-onboarding/previewClientResponse';
import { normalizeMessagingPreviewReadSession } from '../../src/lib/messaging-onboarding/previewReadSessionBoundary';
import { PUBLIC_MENU_DRAFT_DATA_LIMITS } from '../../src/data/shared/publicMenuDraftData';

assert.equal(isMessagingPreviewViewableState('AWAITING_APPROVAL'), true);
assert.equal(isMessagingPreviewViewableState('COLLECTING_INPUT'), false);
assert.equal(normalizeMessagingPreviewCounter(0), 0);
assert.equal(normalizeMessagingPreviewCounter('0'), null);
assert.equal(normalizeMessagingPreviewCounter(null), null);
assert.equal(normalizeMessagingPreviewScore(100), 100);
assert.equal(normalizeMessagingPreviewScore('100'), null);

assert.deepEqual(
  normalizeMessagingPreviewPublishedResult({
    dashboardUrl: 'https://app.menulist.ai/signin?claim=secret',
    extraSecret: 'must-not-leak',
    publicUrl: 'https://shop.menulist.online/',
    storeId: 10,
    tenantId: 20,
    userId: 'internal-user',
  }),
  {
    dashboardUrl: 'https://app.menulist.ai/signin?claim=secret',
    publicUrl: 'https://shop.menulist.online/',
    storeId: 10,
    tenantId: 20,
  },
);
assert.equal(
  normalizeMessagingPreviewPublishedResult({
    dashboardUrl: 'javascript:alert(1)',
    publicUrl: 'https://shop.menulist.online/',
  }),
  null,
);

assert.deepEqual(
  normalizeMessagingPreviewMenuData({
    categories: [{ id: 1, internal: 'drop', name: { en: 'Lunch' } }, null],
    internalPrompt: 'drop',
    items: [{
      attributes: [{ active: true, id: 'size-large', name: { en: 'Large' }, price: 160 }],
      category: 1,
      description: { en: 'Fresh' },
      id: 'item-1',
      internalEmbedding: [1, 2, 3],
      name: { en: 'Meal' },
      price: 120,
    }],
  }),
  {
    categories: [{ id: '1', name: { en: 'Lunch' } }],
    items: [{
      attributes: [{ id: 'size-large', name: { en: 'Large' }, price: '160' }],
      available: true,
      category: '1',
      description: { en: 'Fresh' },
      id: 'item-1',
      name: { en: 'Meal' },
      price: '120',
    }],
  },
);
assert.equal(normalizeMessagingPreviewMenuData({ categories: {}, items: [] }), null);
assert.equal(normalizeMessagingPreviewMenuData({
  categories: [{ id: 'cat-1', name: { en: 'Lunch' } }],
  items: [{ category: 'missing', id: 'item-1', name: { en: 'Meal' } }],
}), null);
assert.equal(normalizeMessagingPreviewMenuData({
  categories: [{ active: false, id: 'cat-1', name: { en: 'Lunch' } }],
  items: [{ category: 'cat-1', id: 'item-1', name: { en: 'Meal' } }],
}), null);

const oversizedMenu = normalizeMessagingPreviewMenuData({
  categories: Array.from(
    { length: PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_CATEGORIES + 1 },
    (_, index) => ({ id: `cat-${index}`, name: { en: `Category ${index}` } }),
  ),
  items: Array.from(
    { length: PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ITEMS + 1 },
    (_, index) => ({
      category: `cat-${index % PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_CATEGORIES}`,
      id: `item-${index}`,
      name: { en: `Item ${index}` },
    }),
  ),
});
assert(oversizedMenu);
assert.equal(oversizedMenu.categories.length, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_CATEGORIES);
assert.equal(oversizedMenu.items.length, PUBLIC_MENU_DRAFT_DATA_LIMITS.MAX_ITEMS);

const readSessionId = 'PreviewReadSession001';
const readSession = {
  correctionCount: 0,
  createdAt: new Date(),
  detectedBusinessCategory: 'food',
  detectedBusinessType: 'Restaurant',
  expiresAt: new Date(Date.now() + 60_000),
  extractedBusinessInfo: { address: '12 Market Road', businessName: 'Example' },
  extractedBusinessProfile: null,
  extractedMenuData: {
    categories: [{ id: 'cat-1', name: { en: 'Lunch' } }],
    items: [{ category: 'cat-1', id: 'item-1', name: { en: 'Meal' }, secret: true }],
  },
  previewToken: 'previewReadToken_1234567890',
  provider: 'whatsapp',
  providerDisplayId: '+919800000000',
  providerUserId: '919800000000',
  publishedResult: null,
  qualityScore: 90,
  sessionId: readSessionId,
  state: 'AWAITING_APPROVAL',
  stateHistory: [{ state: 'AWAITING_APPROVAL', timestamp: new Date() }],
};
const normalizedReadSession = normalizeMessagingPreviewReadSession(readSession, readSessionId);
assert(normalizedReadSession);
assert.equal(normalizedReadSession.businessName, 'Example');
assert.equal('secret' in normalizedReadSession.menuData.items[0], false);
assert.equal(normalizedReadSession.menuData.items[0].available, true);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  correctionCount: '0',
}, readSessionId), null);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  extractedBusinessInfo: { ...readSession.extractedBusinessInfo, businessName: 'x'.repeat(101) },
}, readSessionId), null);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  extractedBusinessInfo: { ...readSession.extractedBusinessInfo, address: 'x'.repeat(201) },
}, readSessionId), null);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  previewViewedAt: 'yesterday',
}, readSessionId), null);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  stateHistory: [{ state: 'PROCESSING_MENU', timestamp: new Date() }],
}, readSessionId), null);
assert.equal(normalizeMessagingPreviewReadSession({
  ...readSession,
  publishedResult: { publicUrl: 'https://example.com' },
}, readSessionId), null);

async function verifyClientNormalization(): Promise<void> {
  const response = new Response(JSON.stringify({
    address: '',
    businessCategory: 'food',
    businessName: 'Example',
    businessType: 'Restaurant',
    correctionCount: 0,
    extraInternal: 'drop',
    maxCorrections: 3,
    menuData: {
      categories: [{ id: 1, name: { en: 'Lunch' } }, null],
      items: [{ category: 1, id: 'item-1', name: { en: 'Meal' }, secret: true }],
    },
    phone: '+919800000000',
    publishedResult: null,
    qualityScore: 90,
    sessionId: 'A'.repeat(20),
    state: 'AWAITING_APPROVAL',
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  const normalized = await readMessagingPreviewDataResponse(response);
  assert.deepEqual(normalized.menuData, {
    categories: [{ id: '1', name: { en: 'Lunch' } }],
    items: [{ available: true, category: '1', id: 'item-1', name: { en: 'Meal' } }],
  });
  assert.equal(Object.prototype.hasOwnProperty.call(normalized, 'extraInternal'), false);

  await assert.rejects(
    () => readMessagingPreviewDataResponse(new Response(JSON.stringify({
      ...normalized,
      correctionCount: '0',
    }), { status: 200, headers: { 'content-type': 'application/json' } })),
    (error: unknown) => error instanceof Error && error.name === 'MessagingPreviewClientError',
  );
  await assert.rejects(
    () => readMessagingPreviewDataResponse(new Response(JSON.stringify({
      ...normalized,
      businessName: 'x'.repeat(101),
    }), { status: 200, headers: { 'content-type': 'application/json' } })),
    (error: unknown) => error instanceof Error && error.name === 'MessagingPreviewClientError',
  );
}

verifyClientNormalization()
  .then(() => console.log('Messaging preview response boundary verification passed.'))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
