import assert from 'node:assert/strict';

import {
    buildAssetBusinessProfileDraft,
    getAssetBusinessProfileFieldIds,
    getAssetBusinessProfileReadiness,
} from '../../src/lib/printable-asset-templates/businessProfile';

const completeStore = {
    addressLine: '12 Market Road',
    city: 'Pune',
    contactPersonName: 'Asha Rao',
    country: 'India',
    email: 'hello@example.com',
    logo: 'https://example.com/logo.png',
    name: 'Koregaon Park',
    phoneNumber: '9876543210',
    state: 'Maharashtra',
    tagline: { en: 'Made for the neighbourhood' },
    tenantName: 'Nila House',
};

assert.deepEqual(getAssetBusinessProfileFieldIds(), [
    'brandName',
    'locationName',
    'logo',
    'tagline',
    'contactName',
    'phone',
    'email',
    'address',
]);
assert.deepEqual(getAssetBusinessProfileFieldIds('business_card'), getAssetBusinessProfileFieldIds());
assert.deepEqual(getAssetBusinessProfileFieldIds('gift_certificate'), [
    'brandName',
    'locationName',
    'logo',
    'tagline',
]);

const complete = getAssetBusinessProfileReadiness(completeStore, { name: 'Nila House' });
assert.equal(complete.percent, 100);
assert.equal(complete.missingFields.length, 0);

const coreOnly = getAssetBusinessProfileReadiness(completeStore, { name: 'Nila House' }, 'gift_certificate');
assert.equal(coreOnly.totalCount, 4);
assert.equal(coreOnly.percent, 100);

const locationMustNotMasqueradeAsBrand = getAssetBusinessProfileReadiness({
    logo: completeStore.logo,
    name: completeStore.name,
    tagline: completeStore.tagline,
}, null, 'gift_certificate');
assert.deepEqual(
    locationMustNotMasqueradeAsBrand.missingFields.map((field) => field.id),
    ['brandName'],
);

const countryAloneMustNotMasqueradeAsAddress = getAssetBusinessProfileReadiness({
    ...completeStore,
    addressLine: '',
    city: '',
    state: '',
}, { name: 'Nila House' }, 'business_card');
assert.deepEqual(
    countryAloneMustNotMasqueradeAsAddress.missingFields.map((field) => field.id),
    ['address'],
);

const cityAndCountryFormUsableLocation = getAssetBusinessProfileReadiness({
    ...completeStore,
    addressLine: '',
    state: '',
}, { name: 'Nila House' }, 'business_card');
assert.equal(cityAndCountryFormUsableLocation.missingFields.some((field) => field.id === 'address'), false);

const contactFocused = getAssetBusinessProfileReadiness({
    logo: completeStore.logo,
    name: completeStore.name,
    tagline: completeStore.tagline,
    tenantName: completeStore.tenantName,
}, null, 'business_card');
assert.deepEqual(
    contactFocused.missingFields.map((field) => field.id),
    ['contactName', 'phone', 'email', 'address'],
);

assert.deepEqual(buildAssetBusinessProfileDraft(completeStore, { name: 'Shared Brand' }), {
    addressLine: '12 Market Road',
    brandName: 'Shared Brand',
    city: 'Pune',
    contactName: 'Asha Rao',
    country: 'India',
    email: 'hello@example.com',
    locationName: 'Koregaon Park',
    phoneNumber: '9876543210',
    state: 'Maharashtra',
    tagline: 'Made for the neighbourhood',
});

console.log('Asset business profile readiness checks passed.');
