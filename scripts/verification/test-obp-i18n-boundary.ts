import assert from 'node:assert/strict';
import { getOBPTranslations } from '../../src/app/client/obp/i18n';
import { normalizeOBPPublicPhotoUrls } from '../../src/lib/obp/publicPhotos';

const english = getOBPTranslations('en-US');
const unknownLocale = getOBPTranslations('not-a-real-locale');

assert.equal(english('publicPhotoLabel', { index: 3 }), 'photo 3');
assert.equal(
    unknownLocale('publicPhotoLabel', { index: 4 }),
    'photo 4',
    'unknown locales must use the English dictionary',
);
assert.equal(english('missing.translation.key'), 'missing.translation.key');
assert.equal(
    english('constructor.name'),
    'constructor.name',
    'translation lookup must never traverse object prototypes',
);

let getterCalls = 0;
const getterValues: Record<string, string> = {};
Object.defineProperty(getterValues, 'index', {
    enumerable: true,
    get() {
        getterCalls += 1;
        throw new Error('translation value getter must not run');
    },
});
assert.equal(english('publicPhotoLabel', getterValues), 'photo ');
assert.equal(getterCalls, 0);

const inheritedValues = Object.create({ index: 'inherited' }) as Record<string, string>;
assert.equal(english('publicPhotoLabel', inheritedValues), 'photo ');

assert.equal(english('publicPhotoLabel', { index: Number.POSITIVE_INFINITY }), 'photo ');
assert.equal(english('publicPhotoLabel', { index: false }), 'photo false');

assert.deepEqual(
    normalizeOBPPublicPhotoUrls([
        ' https://cdn.example/one.jpg ',
        'https://cdn.example/one.jpg',
        null,
        'https://cdn.example/two.jpg',
    ]),
    ['https://cdn.example/one.jpg', 'https://cdn.example/two.jpg'],
);
let photoGetterCalls = 0;
const photosWithAccessor = ['https://cdn.example/one.jpg'];
Object.defineProperty(photosWithAccessor, '0', {
    configurable: true,
    enumerable: true,
    get() {
        photoGetterCalls += 1;
        throw new Error('photo getter must not run');
    },
});
assert.deepEqual(normalizeOBPPublicPhotoUrls(photosWithAccessor), []);
assert.equal(photoGetterCalls, 0);
assert.deepEqual(
    normalizeOBPPublicPhotoUrls(new Proxy([], {
        getOwnPropertyDescriptor() {
            throw new Error('photo proxy must fail closed');
        },
    })),
    [],
);
assert.deepEqual(normalizeOBPPublicPhotoUrls({ 0: 'https://cdn.example/one.jpg' }), []);

process.stdout.write('OBP public projection boundary tests passed.\n');
