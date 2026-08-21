import assert from 'node:assert/strict';
import type { FirebaseApp, FirebaseOptions } from 'firebase/app';
import {
    resolveMenuListFirebaseClientBoundary,
} from '../../src/lib/firebase/menuListFirebaseClientBoundary';

const completeOptions: FirebaseOptions = {
    apiKey: 'menulist-test-api-key',
    appId: 'menulist-test-app-id',
    authDomain: 'menulist-qa.firebaseapp.com',
    databaseURL: 'https://menulist-qa-default-rtdb.firebaseio.com',
    messagingSenderId: '123456789',
    projectId: 'menulist-qa',
    storageBucket: 'menulist-qa.firebasestorage.app',
};

const fakeApp = (options: FirebaseOptions): FirebaseApp => ({
    automaticDataCollectionEnabled: false,
    name: '[DEFAULT]',
    options,
} as FirebaseApp);

assert.deepEqual(resolveMenuListFirebaseClientBoundary({
    configuredOptions: {},
    expectedProjectId: 'menulist-qa',
}), {
    errorCode: 'INCOMPLETE_CONFIGURATION',
    existingApp: null,
    valid: false,
});

assert.equal(resolveMenuListFirebaseClientBoundary({
    configuredOptions: {
        apiKey: completeOptions.apiKey,
        projectId: completeOptions.projectId,
    },
    expectedProjectId: 'menulist-qa',
}).errorCode, 'INCOMPLETE_CONFIGURATION');

assert.equal(resolveMenuListFirebaseClientBoundary({
    configuredOptions: {
        ...completeOptions,
        projectId: 'neelvara-answerlattice-qa',
    },
    expectedProjectId: 'menulist-qa',
}).errorCode, 'PROJECT_ID_MISMATCH');

const matchingApp = fakeApp(completeOptions);
const matchingResult = resolveMenuListFirebaseClientBoundary({
    configuredOptions: completeOptions,
    existingDefaultApp: matchingApp,
    expectedProjectId: 'menulist-qa',
});
assert.equal(matchingResult.valid, true);
assert.equal(matchingResult.existingApp, matchingApp);

for (const [field, value] of [
    ['apiKey', 'other-api-key'],
    ['appId', 'other-app-id'],
    ['authDomain', 'other.firebaseapp.com'],
    ['databaseURL', 'https://other-default-rtdb.firebaseio.com'],
    ['messagingSenderId', '987654321'],
    ['projectId', 'neelvara-answerlattice-qa'],
    ['storageBucket', 'other.firebasestorage.app'],
] as const) {
    const result = resolveMenuListFirebaseClientBoundary({
        configuredOptions: completeOptions,
        existingDefaultApp: fakeApp({
            ...completeOptions,
            [field]: value,
        }),
        expectedProjectId: 'menulist-qa',
    });
    assert.equal(result.errorCode, 'EXISTING_APP_OPTIONS_MISMATCH', field);
    assert.equal(result.existingApp, null, field);
    assert.equal(result.valid, false, field);
}

assert.deepEqual(resolveMenuListFirebaseClientBoundary({
    configuredOptions: completeOptions,
    expectedProjectId: 'menulist-qa',
}), {
    errorCode: null,
    existingApp: null,
    valid: true,
});

console.log('MenuList Firebase client boundary tests passed.');
