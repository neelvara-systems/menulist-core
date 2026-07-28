import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { parseImageGenPreferences } from '../../src/lib/imageGenPreferences';
import { evaluatePublicTruthIndexability } from '../../src/lib/seo/publicTruthIndexing';

assert.deepEqual(
    parseImageGenPreferences({
        stylesCategory: 'food',
        styles: ['editorial'],
        transparentBg: false,
        backgroundColor: null,
    }),
    {
        stylesCategory: 'food',
        styles: ['editorial'],
        aspectRatio: undefined,
        environments: undefined,
        lighting: undefined,
        colors: undefined,
        moods: undefined,
        compositions: undefined,
        backgroundColor: null,
        negativePrompt: undefined,
        transparentBg: false,
        foregroundColor: undefined,
        isMultiMode: undefined,
        savedAt: undefined,
    },
    'valid image preferences should retain their typed values',
);

assert.equal(
    parseImageGenPreferences({ stylesCategory: 'food', styles: ['editorial', 42] }),
    null,
    'malformed browser-storage arrays must not cross into typed consumers',
);
assert.equal(
    parseImageGenPreferences({ stylesCategory: 'food', transparentBg: 'false' }),
    null,
    'string boolean values must not be coerced into image-generation preferences',
);
assert.equal(
    parseImageGenPreferences({ stylesCategory: '' }),
    null,
    'an empty preference category is not a usable persisted contract',
);

const equatorPrimeMeridianStore = {
    active: true,
    name: 'Zero Point Cafe',
    geo: { latitude: 0, longitude: 0 },
    phoneNumber: '+233000000000',
};

assert.deepEqual(
    evaluatePublicTruthIndexability(equatorPrimeMeridianStore, { surface: 'obp' }),
    {
        index: true,
        follow: true,
        includeInSitemap: true,
        reason: 'indexable_public_truth',
    },
    'valid zero coordinates must count as a public location fact',
);

assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: Number.NaN, longitude: 0 } },
        { surface: 'obp' },
    ).reason,
    'insufficient_public_facts',
    'non-finite coordinates must not count as a public location fact',
);
assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: 91, longitude: 0 } },
        { surface: 'obp' },
    ).reason,
    'insufficient_public_facts',
    'out-of-range coordinates must not count as a public location fact',
);
assert.equal(
    evaluatePublicTruthIndexability(
        { ...equatorPrimeMeridianStore, geo: { latitude: '0', longitude: '0' } },
        { surface: 'obp' },
    ).index,
    true,
    'legacy finite numeric coordinate strings should remain compatible',
);

const facebookPixelSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/components/templates/website/clientWebsite/FacebookPixel.tsx'),
    'utf8',
);
assert.match(
    facebookPixelSource,
    /https:\/\/connect\.facebook\.net\/en_US\/fbevents\.js/,
    'the Meta-owned loader must remain present',
);
assert.doesNotMatch(
    facebookPixelSource,
    /useEffect|window\.fbq\s*=(?!=)/,
    'component hydration must not pre-initialize fbq and short-circuit the Meta-owned loader',
);
assert.doesNotMatch(
    facebookPixelSource,
    /@ts-ignore|Record<string,\s*any>/,
    'the Meta Pixel contract must remain explicitly typed without suppressions',
);

console.log('Runtime storage and public indexing contract tests passed.');
