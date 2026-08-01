import assert from 'node:assert/strict';
import {
    answerlatticeWorkspaceProfilesEqual,
    buildAnswerlatticeWorkspaceProfileFromStore,
    isSafeAnswerlatticeProductUrl,
    normalizeAnswerlatticePrimarySurfaces,
    normalizeAnswerlatticeWorkspaceProfileRevision,
    parseAnswerlatticeWorkspaceProfile,
    parseAnswerlatticeWorkspaceProfileResponse,
    parseAnswerlatticeWorkspaceProfileSave,
    projectAnswerlatticeCompiledWorkspaceProduct as projectRootCompiledWorkspaceProduct,
} from '../../src/lib/answerlattice/workspaceProfileContracts';
import {
    projectAnswerlatticeCompiledWorkspaceProduct as projectFunctionCompiledWorkspaceProduct,
} from '../../functions-answerlattice/src/answerlattice/workspaceProfileBoundary';

const validProfile = {
    productName: 'Example SaaS',
    productUrl: 'https://app.example.com',
    supportEmail: 'support@example.com',
    billingModel: 'subscription' as const,
    primarySurfaces: ['billing', 'settings'],
    timeZone: 'Asia/Kolkata',
    businessDayEndTime: '23:30',
};

assert.deepEqual(
    parseAnswerlatticeWorkspaceProfileSave({
        ...validProfile,
        expectedRevision: 3,
    }),
    {
        ...validProfile,
        expectedRevision: 3,
    },
);

for (const unsafeUrl of [
    'javascript:alert(1)',
    'ftp://example.com/file',
    'https://user:password@example.com',
    '//example.com',
]) {
    assert.equal(isSafeAnswerlatticeProductUrl(unsafeUrl), false, `${unsafeUrl} must fail closed`);
    assert.throws(
        () => parseAnswerlatticeWorkspaceProfileSave({
            ...validProfile,
            expectedRevision: 0,
            productUrl: unsafeUrl,
        }),
        `${unsafeUrl} must not pass the save contract`,
    );
}
assert.equal(isSafeAnswerlatticeProductUrl('http://localhost:3000'), true);
assert.equal(isSafeAnswerlatticeProductUrl('https://app.example.com/settings'), true);

assert.throws(
    () => parseAnswerlatticeWorkspaceProfileSave({
        ...validProfile,
        expectedRevision: 0,
        timeZone: 'Not/A_Timezone',
    }),
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileSave({
        ...validProfile,
        expectedRevision: 0,
        businessDayEndTime: '24:00',
    }),
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileSave({
        ...validProfile,
        expectedRevision: -1,
    }),
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileSave({
        ...validProfile,
        expectedRevision: 0,
        unexpected: true,
    }),
);

assert.deepEqual(
    normalizeAnswerlatticePrimarySurfaces([
        ' Billing ',
        'billing',
        'release notes',
        'Admin/Settings',
        '',
    ]),
    ['billing', 'release_notes', 'admin_settings'],
);
assert.equal(normalizeAnswerlatticeWorkspaceProfileRevision(4), 4);
assert.equal(normalizeAnswerlatticeWorkspaceProfileRevision('4'), 0);
assert.equal(normalizeAnswerlatticeWorkspaceProfileRevision(-1), 0);

const sanitizedPersisted = buildAnswerlatticeWorkspaceProfileFromStore({
    productName: '  Example SaaS  ',
    productUrl: 'javascript:alert(1)',
    supportEmail: 'not-an-email',
    billingModel: 'unknown',
    primarySurfaces: ['Billing', 'billing'],
    timeZone: 'Not/A_Timezone',
    businessDayEndTime: '99:99',
});
assert.deepEqual(sanitizedPersisted, {
    productName: 'Example SaaS',
    productUrl: '',
    supportEmail: '',
    billingModel: 'subscription',
    primarySurfaces: ['billing'],
    timeZone: 'UTC',
    businessDayEndTime: '00:00',
});

const malformedCompiledSource = {
    productName: { private: true },
    name: '  Legacy Product  ',
    companyName: 'Ignored Company',
    productUrl: 'javascript:alert(1)',
    supportEmail: ['private@example.com'],
    billingModel: 'enterprise',
    timeZone: 'Not/A_Timezone',
    businessDayEndTime: '99:99',
    privateRoot: 'must-not-leak',
};
const expectedCompiledProjection = {
    name: 'Legacy Product',
    url: null,
    supportEmail: null,
    billingModel: 'subscription' as const,
    timeZone: 'UTC',
    businessDayEndTime: '00:00',
};
assert.deepEqual(
    projectRootCompiledWorkspaceProduct(malformedCompiledSource),
    expectedCompiledProjection,
);
assert.deepEqual(
    projectFunctionCompiledWorkspaceProduct(malformedCompiledSource),
    expectedCompiledProjection,
);
assert.deepEqual(
    projectRootCompiledWorkspaceProduct(validProfile),
    {
        name: 'Example SaaS',
        url: 'https://app.example.com',
        supportEmail: 'support@example.com',
        billingModel: 'subscription',
        timeZone: 'Asia/Kolkata',
        businessDayEndTime: '23:30',
    },
);
assert.deepEqual(
    projectFunctionCompiledWorkspaceProduct(validProfile),
    projectRootCompiledWorkspaceProduct(validProfile),
);

assert.deepEqual(
    parseAnswerlatticeWorkspaceProfileResponse({
        profile: validProfile,
        revision: 2,
    }),
    { profile: validProfile, revision: 2 },
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileResponse({
        profile: validProfile,
        revision: '2',
    }),
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileResponse({
        profile: {
            productName: validProfile.productName,
            billingModel: validProfile.billingModel,
            primarySurfaces: validProfile.primarySurfaces,
        },
        revision: 2,
    }),
    'a partial profile response must not gain implied client defaults',
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfile({
        ...validProfile,
        productName: '',
    }),
    'an invalid persisted product name must fail at the server response boundary',
);
assert.throws(
    () => parseAnswerlatticeWorkspaceProfileResponse({
        profile: buildAnswerlatticeWorkspaceProfileFromStore({
            ...validProfile,
            productName: '',
        }),
        revision: 2,
    }),
    'a malformed persisted profile must not be returned as a successful response',
);
assert.equal(answerlatticeWorkspaceProfilesEqual(validProfile, { ...validProfile }), true);
assert.equal(answerlatticeWorkspaceProfilesEqual(validProfile, {
    ...validProfile,
    productName: 'Other SaaS',
}), false);

process.stdout.write('Answerlattice workspace-profile contracts passed.\n');
