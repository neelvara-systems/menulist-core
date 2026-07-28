import assert from 'node:assert/strict';
import {
    buildAddress,
    buildGeoCoordinates,
    buildOpeningHours,
    buildSameAs,
    buildSchemaPriceRange,
    getMenuSchemaType,
    getSchemaType,
} from '@lib/schema';

assert.deepEqual(buildAddress({
    addressLine: '  123   Main St ',
    city: ' Mumbai ',
    state: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
}), {
    '@type': 'PostalAddress',
    streetAddress: '123 Main St',
    addressLocality: 'Mumbai',
    addressRegion: 'Maharashtra',
    postalCode: '400001',
    addressCountry: 'IN',
});
assert.equal(buildAddress({ addressLine: { toString: () => 'attacker' }, city: [] }), undefined);
assert.equal(buildAddress(null), undefined);

assert.deepEqual(buildGeoCoordinates({ geo: { latitude: 0, longitude: 0 } }), {
    '@type': 'GeoCoordinates',
    latitude: 0,
    longitude: 0,
});
assert.equal(buildGeoCoordinates({ geo: { latitude: [19.076], longitude: 72.8777 } }), undefined);
assert.equal(buildGeoCoordinates({ geo: { latitude: 91, longitude: 72.8777 } }), undefined);
assert.equal(buildGeoCoordinates({ geo: { latitude: 19.076, longitude: -181 } }), undefined);
assert.equal(buildGeoCoordinates({ geo: { latitude: null, longitude: null } }), undefined);

assert.deepEqual(buildOpeningHours({
    workingHours: { sat: '09:00-12:00,13:00-17:00' },
}), [
    {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/Saturday',
        opens: '09:00',
        closes: '12:00',
    },
    {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'https://schema.org/Saturday',
        opens: '13:00',
        closes: '17:00',
    },
]);
assert.equal(buildOpeningHours({ workingHours: { someday: '09:00-17:00', sat: '99:00-17:00' } }), undefined);

assert.deepEqual(buildSameAs({
    socialMedia: { instagram: 'menulistai', facebook: 'https://facebook.com/menulist.ai' },
    url: 'https://menulist.ai',
}), [
    'https://instagram.com/menulistai',
    'https://facebook.com/menulist.ai',
    'https://menulist.ai/',
]);
assert.equal(buildSchemaPriceRange({ toString: () => '$$' }), undefined);
assert.equal(buildSchemaPriceRange(' $$ '), '$$');

assert.equal(getSchemaType('Restaurant'), 'Restaurant');
assert.equal(getSchemaType('unknown'), 'LocalBusiness');
assert.equal(getSchemaType({ toString: () => 'Restaurant' } as unknown as string), 'LocalBusiness');
assert.equal(getMenuSchemaType(undefined), 'LocalBusiness');
assert.equal(getMenuSchemaType('unknown', 'food'), 'Restaurant');

process.stdout.write('Production schema health validation passed.\n');
