import assert from 'node:assert/strict';
import { normalizeCampaignCaptionGenerationResult } from '../../src/lib/ai/campaignCaptionOutput';

const valid = {
    caption: 'Fresh dosas are ready today.',
    hashtags: ['dosa', ' breakfast ', 'dosa'],
    shortCaption: 'Dosas are ready',
};

assert.deepEqual(normalizeCampaignCaptionGenerationResult(valid), {
    caption: valid.caption,
    hashtags: ['dosa', 'breakfast'],
    shortCaption: valid.shortCaption,
});
assert.equal(normalizeCampaignCaptionGenerationResult(null), null);
assert.equal(normalizeCampaignCaptionGenerationResult([]), null);
assert.equal(normalizeCampaignCaptionGenerationResult({ ...valid, caption: '' }), null);
assert.equal(normalizeCampaignCaptionGenerationResult({ ...valid, shortCaption: undefined }), null);
assert.equal(normalizeCampaignCaptionGenerationResult({ ...valid, hashtags: ['food', { unsafe: true }] }), null);

const bounded = normalizeCampaignCaptionGenerationResult({
    ...valid,
    caption: `  ${'c'.repeat(600)}\nignored  `,
    hashtags: Array.from({ length: 8 }, (_, index) => ` tag-${index} ${'x'.repeat(100)}`),
    internalProviderData: { private: true },
    shortCaption: `  ${'s'.repeat(150)}  `,
});
assert.ok(bounded);
assert.deepEqual(Object.keys(bounded).sort(), ['caption', 'hashtags', 'shortCaption']);
assert.equal(bounded.caption.length, 500);
assert.equal(bounded.shortCaption.length, 100);
assert.equal(bounded.hashtags.length, 5);
assert.ok(bounded.hashtags.every((hashtag) => hashtag.length <= 80));
assert.equal(bounded.caption.includes('\n'), false);

console.log('campaign caption output boundary tests passed');
