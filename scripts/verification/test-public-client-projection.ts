import assert from 'node:assert/strict';
import { sanitizeForClient } from '@lib/mce/utils';
import { projectPublicClientStore } from '@lib/publicTruth/clientStoreProjection';

const store = {
    storeId: 42,
    tenantId: 7,
    tenantName: 'Example Brand',
    name: 'Example Outlet',
    phoneNumber: '9999999999',
    countryCode: 'IN',
    dialCode: '+91',
    currencyCode: 'INR',
    currencySymbol: '₹',
    businessType: 'restaurant',
    businessCategory: 'restaurant',
    workingHours: { mon: '09:00-18:00' },
    feedbackEnabled: true,
    publicPresence: {
        showCall: true,
        googleMapsUrl: 'https://maps.google.com/?q=example',
        googleLinkUpdated: true,
        googleLinkUpdatedAt: '2026-07-16T00:00:00.000Z',
    },
    analytics: {
        googleAnalyticsId: 'G-TEST123',
        trackMenuViews: true,
        dashboardPreferences: { dateRange: '30d' },
    },
    pwaSettings: {
        enableInstallableApp: true,
        promoteInstallation: true,
        pwaShortName: 'Example',
    },
    tempStatus: {
        type: 'custom',
        message: 'Closing early',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdBy: 'owner-user-id',
        sourceProjectId: '7-project-42',
    },
    contactPersonName: 'Private Owner',
    contactPersonEmail: 'private@example.com',
    licenceKey: 'private-licence',
    roles: [{ role: 'owner' }],
    publicApi: { apiKey: 'ml_raw_secret', apiKeyHash: 'private-hash' },
    answerlatticeWidgetApi: { activeKeyHash: 'private-widget-hash' },
    posSync: { webhookSecret: 'private-webhook-secret' },
    notificationSettings: { primaryEmail: 'private@example.com' },
    futurePrivateField: 'must-not-cross-client-boundary',
};

const publicStore = projectPublicClientStore(store) as Record<string, any>;
assert.equal(publicStore.storeId, 42);
assert.equal(publicStore.tenantId, 7);
assert.equal(publicStore.phoneNumber, '9999999999');
assert.equal(publicStore.publicPresence.showCall, true);
assert.equal(publicStore.analytics.googleAnalyticsId, 'G-TEST123');
assert.equal(publicStore.pwaSettings.pwaShortName, 'Example');
assert.equal(publicStore.tempStatus.message, 'Closing early');
[
    'contactPersonName',
    'contactPersonEmail',
    'licenceKey',
    'roles',
    'publicApi',
    'answerlatticeWidgetApi',
    'posSync',
    'notificationSettings',
    'futurePrivateField',
].forEach((field) => assert.equal(publicStore[field], undefined, `store field ${field} must stay server-side`));
assert.equal(publicStore.analytics.dashboardPreferences, undefined);
assert.equal(publicStore.publicPresence.googleLinkUpdated, undefined);
assert.equal(publicStore.tempStatus.createdBy, undefined);
assert.equal(publicStore.tempStatus.sourceProjectId, undefined);
assert.equal(projectPublicClientStore({
    ...store,
    tempStatus: {
        type: 'custom',
        message: 'Expired status',
        expiresAt: new Date(Date.now() - 1_000).toISOString(),
    },
})?.tempStatus, undefined);

const project = {
    projectId: '7-project-42',
    name: 'Menu',
    description: 'Public description',
    defaultLanguage: 'en',
    languages: ['en'],
    config: { design: { menu: { showItemPrices: true } } },
    menuSettings: { feedback: true },
    menuVersion: 3,
    lastPublishedAt: '2026-07-16T00:00:00.000Z',
    aiPreferences: { image: { negativePrompt: 'private preference' } },
    masterProjectId: '7-master-1',
    overrides: { items: {} },
    outletLocalState: { localVersion: 8 },
    _mce: { verified: true },
    publicDecisionBlocks: { internal: true },
    futureWorkflowState: { private: true },
    files: [{
        uid: 'file-1',
        index: 0,
        name: 'owner-upload.pdf',
        url: 'https://storage.example/source-upload.pdf',
        size: 12345,
        inputToken: 100,
        charges: 2,
        processingTime: 99,
        extractedData: {
            processingMessages: [{ type: 'internal' }],
            data: {
                languages: [{ name: 'English', code: 'en', isPrimary: true }],
                extractedBusinessProfile: { name: 'internal extraction profile' },
                businessAttributeSuggestions: [{ key: 'wifi', value: true }],
                categories: [
                    { id: 'active-cat', active: true, name: { en: 'Food' } },
                    { id: 'inactive-cat', active: false, name: { en: 'Hidden' } },
                ],
                items: [
                    {
                        id: 'active-item',
                        active: true,
                        category: 'active-cat',
                        name: { en: 'Pizza' },
                        ownerBoost: 20,
                        qualityReview: { priceOutlierReviewedAt: 'private' },
                        descriptionSource: 'ai',
                        sourceFileIndex: 0,
                        decisionFacts: {
                            calories: { value: 500, source: 'ai', confirmed: false, updatedAt: 'private' },
                        },
                        attributes: [
                            { id: 'small', name: { en: 'Small' }, price: '100', active: true },
                            { id: 'hidden', name: { en: 'Hidden' }, price: '200', active: false },
                        ],
                        images: [{
                            url: 'https://cdn.example/pizza.jpg',
                            variants: { medium: 'https://cdn.example/pizza-medium.jpg', unsafe: 'https://private.example' },
                            mediaChecksum: 'private-checksum',
                            preparedMedia: { private: true },
                        }],
                    },
                    { id: 'inactive-item', active: false, category: 'active-cat', name: { en: 'Hidden' } },
                ],
            },
        },
    }],
};

const publicProject = sanitizeForClient(project);
assert.equal(publicProject.projectId, '7-project-42');
assert.equal(publicProject.name, 'Menu');
assert.equal(publicProject.aiPreferences, undefined);
assert.equal(publicProject.masterProjectId, undefined);
assert.equal(publicProject.overrides, undefined);
assert.equal(publicProject.outletLocalState, undefined);
assert.equal(publicProject._mce, undefined);
assert.equal(publicProject.publicDecisionBlocks, undefined);
assert.equal(publicProject.futureWorkflowState, undefined);
assert.deepEqual(Object.keys(publicProject.files[0]), ['extractedData']);
assert.equal(publicProject.files[0].name, undefined);
assert.equal(publicProject.files[0].url, undefined);
assert.equal(publicProject.files[0].extractedData.processingMessages, undefined);
assert.equal(publicProject.files[0].extractedData.data.extractedBusinessProfile, undefined);
assert.equal(publicProject.files[0].extractedData.data.businessAttributeSuggestions, undefined);
assert.equal(publicProject.files[0].extractedData.data.categories.length, 1);
assert.equal(publicProject.files[0].extractedData.data.items.length, 1);

const publicItem = publicProject.files[0].extractedData.data.items[0];
assert.equal(publicItem.ownerBoost, undefined);
assert.equal(publicItem.qualityReview, undefined);
assert.equal(publicItem.descriptionSource, undefined);
assert.equal(publicItem.sourceFileIndex, undefined);
assert.deepEqual(publicItem.decisionFacts, { calories: { value: 500 } });
assert.equal(publicItem.attributes.length, 1);
assert.deepEqual(publicItem.images, [{
    url: 'https://cdn.example/pizza.jpg',
    variants: { medium: 'https://cdn.example/pizza-medium.jpg' },
}]);

assert.equal(store.publicApi.apiKey, 'ml_raw_secret', 'store input must not be mutated');
assert.equal(project.files[0].extractedData.data.items[0].ownerBoost, 20, 'project input must not be mutated');

console.log('Public client projection boundary tests passed.');
