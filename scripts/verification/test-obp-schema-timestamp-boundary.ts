import assert from 'node:assert/strict';
import {
    generateBrandOBPSchema,
    generateOBPSchema,
    normalizeOBPSchemaModifiedOn,
} from '../../src/app/client/obp/schema';

const expected = '2024-01-02T03:04:05.000Z';
const expectedMs = Date.parse(expected);

assert.equal(normalizeOBPSchemaModifiedOn(expected), expected);
assert.equal(normalizeOBPSchemaModifiedOn(new Date(expectedMs)), expected);
assert.equal(
    normalizeOBPSchemaModifiedOn({ toMillis: () => expectedMs }),
    expected,
);
assert.equal(
    normalizeOBPSchemaModifiedOn({ toDate: () => new Date(expectedMs) }),
    expected,
);
assert.equal(
    normalizeOBPSchemaModifiedOn({ seconds: expectedMs / 1000 }),
    expected,
);

for (const invalid of [
    '',
    'not-a-date',
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
    {},
    { toDate: 'not-a-function' },
    { toDate: () => new Date(Number.NaN) },
    { toMillis: () => Number.NaN },
    { get toMillis() { throw new Error('hostile getter'); } },
]) {
    assert.equal(normalizeOBPSchemaModifiedOn(invalid), undefined);
}

const hostileProxy = new Proxy({}, {
    get() {
        throw new Error('hostile proxy');
    },
});
assert.equal(normalizeOBPSchemaModifiedOn(hostileProxy), undefined);

const schemaWithAccountEmail = generateOBPSchema(
    {
        email: 'owner-account@example.com',
        name: 'Example Business',
        storeId: 123,
    },
    'https://example.menulist.online',
);
assert.equal(
    'email' in schemaWithAccountEmail,
    false,
    'account email must not be exposed as hidden public OBP structured data',
);

const brandSchema = generateBrandOBPSchema({
    brandName: 'Example Brand',
    canonicalUrl: 'https://example.menulist.online/',
    language: 'en',
    locations: [
        {
            addressLine: '1 Main Street',
            city: 'Pune',
            name: 'Example Main Store',
            publicPath: 'menu',
        },
        {
            city: 'Mumbai',
            name: 'Example Branch',
            publicPath: 'example-branch',
        },
    ],
    logo: 'https://cdn.example.com/logo.png',
    modifiedOn: expected,
});
assert.equal(brandSchema['@type'], 'Organization');
assert.equal(brandSchema.url, 'https://example.menulist.online');
assert.equal(brandSchema.dateModified, expected);
assert.deepEqual(
    brandSchema.location,
    [
        {
            '@type': 'LocalBusiness',
            '@id': 'https://example.menulist.online/menu#business',
            name: 'Example Main Store',
            url: 'https://example.menulist.online/menu',
            address: '1 Main Street',
        },
        {
            '@type': 'LocalBusiness',
            '@id': 'https://example.menulist.online/example-branch#business',
            name: 'Example Branch',
            url: 'https://example.menulist.online/example-branch',
            address: 'Mumbai',
        },
    ],
);
assert.equal(
    JSON.stringify(brandSchema).includes('owner-account@example.com'),
    false,
);

console.log('OBP schema timestamp boundary tests passed.');
