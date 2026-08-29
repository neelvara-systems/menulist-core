import assert from 'node:assert/strict';
import type { LookupFunction } from 'node:net';
import {
    getPosSyncDeliveryHttpStatus,
    getNextPosSyncMenuVersion,
    normalizePosSyncMenuVersion,
    resolvePosSyncDeliveryOutcome,
} from '../../src/lib/posSync/deliveryState';
import { parsePosDeliveryHistoryEntry } from '../../src/lib/posSync/deliveryHistory';
import { buildMenuSnapshot } from '../../src/lib/posSync/payloadFormatter';
import { createPosSyncPinnedLookup } from '../../src/lib/posSync/pinnedWebhookRequest';
import { isPosSyncSecretScopeCurrent } from '../../src/lib/posSync/secretScope';
import { projectPosSyncSecretDocument } from '../../src/lib/posSync/secretDocumentBoundary';
import { resolvePosSyncSelectedStoreScope } from '../../src/lib/posSync/selectedStoreScope';
import {
    isBlockedPosSyncNetworkTarget,
    validatePosSyncWebhookUrl,
} from '../../src/lib/posSync/webhookUrl';

function runLookup(
    lookup: LookupFunction,
    hostname: string,
    options: { all?: boolean; family?: number },
): { address: string | Array<{ address: string; family: number }>; family?: number } {
    let result: { address: string | Array<{ address: string; family: number }>; family?: number } | undefined;
    let lookupError: Error | undefined;
    lookup(hostname, options, (error, address, family) => {
        if (error) lookupError = error;
        else result = { address, family };
    });
    if (lookupError) throw lookupError;
    if (!result) throw new Error('Pinned lookup did not complete synchronously');
    return result;
}

assert.equal(validatePosSyncWebhookUrl('https://hooks.vendor.example.com/menu').valid, true);
assert.equal(validatePosSyncWebhookUrl('http://hooks.vendor.example.com/menu').valid, false);
assert.equal(validatePosSyncWebhookUrl('https://127.0.0.1/menu').valid, false);
assert.equal(isBlockedPosSyncNetworkTarget('192.0.2.10'), true);
assert.equal(isBlockedPosSyncNetworkTarget('198.51.100.10'), true);
assert.equal(isBlockedPosSyncNetworkTarget('203.0.113.10'), true);
assert.equal(isBlockedPosSyncNetworkTarget('::ffff:7f00:1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('fe90::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('ff02::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('2001:db8::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('2001::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('2002::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('3fff::1'), true);
assert.equal(isBlockedPosSyncNetworkTarget('8.8.8.8'), false);
assert.equal(isBlockedPosSyncNetworkTarget('2606:4700:4700::1111'), false);

const multiStoreSession = {
    sId: 101,
    tId: 1,
    user: {
        storeId: 101,
        storeIds: [101, 102],
        stores: [
            { role: 'owner', storeId: 101 },
            { role: 'owner', storeId: 102 },
        ],
        tenantId: 1,
    },
};
assert.deepEqual(resolvePosSyncSelectedStoreScope(multiStoreSession, 101, 1), {
    ok: true,
    storeScope: { documentId: '101', numericId: 101 },
    tenantScope: { documentId: '1', numericId: 1 },
});
assert.deepEqual(resolvePosSyncSelectedStoreScope(multiStoreSession, 102, 1), {
    ok: true,
    storeScope: { documentId: '102', numericId: 102 },
    tenantScope: { documentId: '1', numericId: 1 },
});
assert.deepEqual(resolvePosSyncSelectedStoreScope(multiStoreSession, 103, 1), {
    ok: false,
    reason: 'forbidden',
});
assert.deepEqual(resolvePosSyncSelectedStoreScope(multiStoreSession, ' 102', 1), {
    ok: false,
    reason: 'invalid_request',
});
assert.deepEqual(resolvePosSyncSelectedStoreScope(multiStoreSession, 102, 2), {
    ok: false,
    reason: 'forbidden',
});
assert.deepEqual(resolvePosSyncSelectedStoreScope({ ...multiStoreSession, storeId: 102 }, 102, 1), {
    ok: false,
    reason: 'not_onboarded',
});

assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 7 },
    tenant: { active: true },
    tenantDocumentId: '7',
}), true);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 7, tId: '7' },
    tenant: { active: true },
    tenantDocumentId: '7',
}), true);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tId: 7 },
    tenant: { active: true },
    tenantDocumentId: '7',
}), true);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 8 },
    tenant: { active: true },
    tenantDocumentId: '7',
}), false);

const projectedSecret = projectPosSyncSecretDocument({
    createdBy: 'owner-1',
    createdOn: { toMillis: () => 1_700_000_000_000 },
    ignored: 'must not project',
    pId: 'ML',
    sId: 101,
    secret: 'whsec_server',
    tId: 1,
    version: 3,
}, 1, 101);
assert.deepEqual(projectedSecret, {
    createdBy: 'owner-1',
    createdOn: { toMillis: projectedSecret?.createdOn && (projectedSecret.createdOn as { toMillis: () => number }).toMillis },
    requiresRewrite: false,
    secret: 'whsec_server',
    version: 3,
});
assert.deepEqual(projectPosSyncSecretDocument({
    secret: 'whsec_legacy_server',
    version: 2,
}, 1, 101), {
    requiresRewrite: true,
    secret: 'whsec_legacy_server',
    version: 2,
});
assert.equal(projectPosSyncSecretDocument({
    pId: 'ML',
    sId: 102,
    secret: 'whsec_server',
    tId: 1,
    version: 3,
}, 1, 101), null);
assert.equal(projectPosSyncSecretDocument({
    pId: 'AL',
    sId: 101,
    secret: 'whsec_server',
    tId: 1,
    version: 3,
}, 1, 101), null);
assert.equal(projectPosSyncSecretDocument({
    pId: 'ML',
    sId: 101,
    secret: 'whsec_server',
    tId: 1,
    version: '3',
}, 1, 101), null);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 7, tId: 8 },
    tenant: { active: true },
    tenantDocumentId: '7',
}), false);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 7, tId: 'invalid' },
    tenant: { active: true },
    tenantDocumentId: '7',
}), false);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { active: true, tenantId: 7 },
    tenant: { blocked: true },
    tenantDocumentId: '7',
}), false);
assert.equal(isPosSyncSecretScopeCurrent({
    store: { deleted: true, tenantId: 7 },
    tenant: { active: true },
    tenantDocumentId: '7',
}), false);

const pinnedLookup = createPosSyncPinnedLookup('hooks.vendor.com', [
    { address: '8.8.8.8', family: 4 },
    { address: '2606:4700:4700::1111', family: 6 },
]);
assert.deepEqual(runLookup(pinnedLookup, 'hooks.vendor.com', { family: 4 }), {
    address: '8.8.8.8',
    family: 4,
});
assert.deepEqual(runLookup(pinnedLookup, 'hooks.vendor.com', { all: true }), {
    address: [
        { address: '8.8.8.8', family: 4 },
        { address: '2606:4700:4700::1111', family: 6 },
    ],
    family: undefined,
});
assert.throws(() => runLookup(pinnedLookup, 'other.vendor.com', {}));
assert.throws(() => runLookup(createPosSyncPinnedLookup('hooks.vendor.com', [
    { address: '127.0.0.1', family: 4 },
]), 'hooks.vendor.com', {}));
assert.throws(() => runLookup(createPosSyncPinnedLookup('hooks.vendor.com', [
    { address: 'not-an-ip', family: 4 },
]), 'hooks.vendor.com', {}));

assert.equal(getNextPosSyncMenuVersion(undefined), 1);
assert.equal(getNextPosSyncMenuVersion(9), 10);
assert.equal(getNextPosSyncMenuVersion(Number.MAX_SAFE_INTEGER), null);
assert.equal(getNextPosSyncMenuVersion('9'), null);
assert.equal(normalizePosSyncMenuVersion(0), 0);
assert.equal(normalizePosSyncMenuVersion(9), 9);
assert.equal(normalizePosSyncMenuVersion('9'), null);
assert.equal(normalizePosSyncMenuVersion(Number.NaN), null);
assert.equal(getPosSyncDeliveryHttpStatus('success'), 200);
assert.equal(getPosSyncDeliveryHttpStatus('failed'), 502);
assert.equal(getPosSyncDeliveryHttpStatus('timeout'), 504);

const deliveryTimestamp = { toDate: () => new Date('2026-07-21T10:00:00.000Z') };
assert.deepEqual(parsePosDeliveryHistoryEntry('del_mdx_0123456789ab', {
    attempt: 1,
    deliveryId: 'del_mdx_0123456789ab',
    duration: 42,
    error: 'internal provider detail',
    menuVersion: 3,
    payloadHash: 'internal-hash',
    payloadSize: 100,
    responseCode: 200,
    sentAt: deliveryTimestamp,
    status: 'success',
}), {
    attempt: 1,
    deliveryId: 'del_mdx_0123456789ab',
    duration: 42,
    menuVersion: 3,
    responseCode: 200,
    sentAt: '2026-07-21T10:00:00.000Z',
    status: 'success',
});
assert.equal(parsePosDeliveryHistoryEntry('del_mdx_0123456789ab', {
    attempt: 1,
    deliveryId: 'del_other_123456789abc',
    duration: 42,
    menuVersion: 3,
    responseCode: 200,
    sentAt: deliveryTimestamp,
    status: 'success',
}), null);
assert.equal(parsePosDeliveryHistoryEntry('del_mdx_0123456789ab', {
    attempt: 1,
    duration: 42,
    menuVersion: 3,
    responseCode: 200,
    sentAt: deliveryTimestamp,
    status: 'unexpected',
}), null);
assert.equal(parsePosDeliveryHistoryEntry('del_mdx_0123456789ab', {
    attempt: 1,
    duration: Number.NaN,
    menuVersion: 3,
    responseCode: null,
    sentAt: deliveryTimestamp,
    status: 'failed',
}), null);

const connectionIssueMessage = 'Could not reach connected system';
assert.deepEqual(resolvePosSyncDeliveryOutcome({
    connectionIssueMessage,
    currentConsecutiveFailures: 1,
    currentLastCompletedMenuVersion: 8,
    currentStatus: 'healthy',
    menuVersion: 9,
    success: false,
}), {
    consecutiveFailures: 2,
    lastCompletedMenuVersion: 9,
    lastError: '',
    lastStatus: 'failed',
    status: 'healthy',
});
assert.equal(resolvePosSyncDeliveryOutcome({
    connectionIssueMessage,
    currentConsecutiveFailures: 2,
    currentLastCompletedMenuVersion: 10,
    currentStatus: 'healthy',
    menuVersion: 9,
    success: false,
}), null);
assert.deepEqual(resolvePosSyncDeliveryOutcome({
    connectionIssueMessage,
    currentConsecutiveFailures: 2,
    currentLastCompletedMenuVersion: 9,
    currentStatus: 'healthy',
    menuVersion: 10,
    success: false,
}), {
    consecutiveFailures: 3,
    lastCompletedMenuVersion: 10,
    lastError: connectionIssueMessage,
    lastStatus: 'failed',
    status: 'connection_issue',
});
assert.deepEqual(resolvePosSyncDeliveryOutcome({
    connectionIssueMessage,
    currentConsecutiveFailures: 3,
    currentLastCompletedMenuVersion: 10,
    currentStatus: 'connection_issue',
    menuVersion: 11,
    success: true,
}), {
    consecutiveFailures: 0,
    lastCompletedMenuVersion: 11,
    lastError: '',
    lastStatus: 'success',
    status: 'healthy',
});

const project = {
    projectId: 'authoritative_project',
    languages: ['English (en)'],
    files: [{
        extractedData: {
            data: {
            categories: [{
                id: 'cat_1',
                active: true,
                name: { en: 'Mains' },
                icon: 'lu:LuUtensils',
                extractionIdAliases: ['internal_alias'],
            }],
            items: [{
                id: 'item_1',
                category: 'cat_1',
                active: true,
                name: { en: 'Curry' },
                decisionFacts: {
                    spiceLevel: {
                        value: 'hot',
                        source: 'ai',
                        confirmed: true,
                    },
                },
                allergens: ['dairy'],
                dietaryTags: ['vegetarian'],
                spiceLevel: 'hot',
                nutritionInfo: { calories: 420, servingSize: '1 bowl' },
                materials: 'ceramic bowl',
                warranty: 'not applicable',
                descriptionSource: 'ai',
                ownerBoost: 20,
                qualityReview: { priceOutlierReviewedAt: '2026-07-10' },
            }],
                languages: [],
            },
        },
    }],
};
const snapshot = buildMenuSnapshot(project, 202, 101, 7, 'INR');
assert.equal(snapshot.menu.categories[0].icon, 'lu:LuUtensils');
assert.deepEqual(snapshot.menu.items[0].decisionFacts, { spiceLevel: { value: 'hot' } });
assert.deepEqual(snapshot.menu.items[0].allergens, ['dairy']);
assert.equal(snapshot.menu.items[0].nutritionInfo?.calories, 420);
const serializedSnapshot = JSON.stringify(snapshot);
assert.equal(serializedSnapshot.includes('descriptionSource'), false);
assert.equal(serializedSnapshot.includes('ownerBoost'), false);
assert.equal(serializedSnapshot.includes('qualityReview'), false);
assert.equal(serializedSnapshot.includes('extractionIdAliases'), false);
assert.equal(serializedSnapshot.includes('"source":"ai"'), false);

const malformedSnapshot = buildMenuSnapshot({
    projectId: 42,
    languages: ['English (en)', null, ''],
    files: [{
        extractedData: {
            data: {
                categories: [{
                    id: 'cat_safe',
                    active: 'yes',
                    name: JSON.parse('{"en":"Safe","__proto__":"blocked"}'),
                    images: [{}],
                    timeSlots: [{}],
                }],
                items: [{
                    id: 'item_safe',
                    category: 'cat_safe',
                    active: 1,
                    name: { en: 'Safe item' },
                    images: [{}],
                    attributes: [{ id: '', price: '5' }, { id: 'size', price: '5', active: true }],
                    decisionFacts: JSON.parse('{"__proto__":{"value":"blocked"},"safe":{"value":5}}'),
                }],
            },
        },
    }],
}, 202, 101, 8, 'INR');
assert.equal(malformedSnapshot.projectId, '');
assert.deepEqual(malformedSnapshot.languages, [{ code: 'en', name: 'English', isPrimary: true }]);
assert.equal(malformedSnapshot.menu.categories[0].active, false);
assert.deepEqual(malformedSnapshot.menu.categories[0].name, { en: 'Safe' });
assert.equal(malformedSnapshot.menu.categories[0].images, undefined);
assert.equal(malformedSnapshot.menu.categories[0].timeSlots, undefined);
assert.equal(malformedSnapshot.menu.items[0].images, undefined);
assert.deepEqual(malformedSnapshot.menu.items[0].attributes, [{
    active: true,
    id: 'size',
    name: {},
    price: '5',
}]);
assert.deepEqual(malformedSnapshot.menu.items[0].decisionFacts, { safe: { value: 5 } });

console.log('POS sync behavioral boundaries passed.');
