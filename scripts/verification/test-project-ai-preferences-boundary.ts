import assert from 'node:assert/strict';
import {
    applyProjectImagePreferencesToGenerationConfig,
    getRecommendedProjectAIPreferences,
    getResolvedProjectAIPreferences,
} from '@lib/ai/projectAIPreferences';
import type { ImageGenerationConfigType, Project } from '@template/main-app/projects/types';

const recommended = getRecommendedProjectAIPreferences('Restaurant', 'food');
const malformedProject = {
    aiPreferences: {
        description: {
            contentLength: 'Unlimited',
            tone: { value: 'Premium' },
        },
        image: {
            aspectRatio: '100:1',
            backgroundColor: 'url(javascript:alert(1))',
            colors: ['Warm Tones', { value: 'Brand Colors' }],
            compositions: 'Close-up',
            environments: Array.from({ length: 21 }, (_, index) => `Environment ${index}`),
            foregroundColor: '#12',
            isMultiMode: 'true',
            lighting: ['Natural Light', 'Natural Light'],
            moods: [new Array(121).fill('x').join('')],
            negativePrompt: 'x'.repeat(501),
            styles: [],
            stylesCategory: '',
            transparentBg: 1,
        },
    },
} as unknown as Project;

const resolved = getResolvedProjectAIPreferences(malformedProject, 'Restaurant', 'food');
assert.deepEqual(resolved.description, recommended.description);
assert.equal(resolved.image.aspectRatio, recommended.image.aspectRatio);
assert.equal(resolved.image.backgroundColor, recommended.image.backgroundColor);
assert.deepEqual(resolved.image.colors, recommended.image.colors);
assert.deepEqual(resolved.image.compositions, recommended.image.compositions);
assert.deepEqual(resolved.image.environments, recommended.image.environments);
assert.equal(resolved.image.foregroundColor, recommended.image.foregroundColor);
assert.equal(resolved.image.isMultiMode, recommended.image.isMultiMode);
assert.deepEqual(resolved.image.lighting, ['Natural Light']);
assert.deepEqual(resolved.image.moods, recommended.image.moods);
assert.equal(resolved.image.negativePrompt, recommended.image.negativePrompt);
assert.deepEqual(resolved.image.styles, recommended.image.styles);
assert.equal(resolved.image.stylesCategory, recommended.image.stylesCategory);
assert.equal(resolved.image.transparentBg, recommended.image.transparentBg);

const validProject = {
    aiPreferences: {
        description: {
            contentLength: 'Detailed',
            tone: 'Premium',
        },
        image: {
            aspectRatio: '4:5',
            backgroundColor: '#aabbcc',
            colors: [],
            compositions: ['  Close-up  '],
            environments: [],
            foregroundColor: null,
            isMultiMode: false,
            lighting: [],
            moods: [],
            negativePrompt: '',
            styles: ['Natural Light'],
            stylesCategory: 'Photorealism',
            transparentBg: false,
        },
    },
} as Project;
const validResolved = getResolvedProjectAIPreferences(validProject, 'Restaurant', 'food');
assert.equal(validResolved.description.contentLength, 'Detailed');
assert.equal(validResolved.description.tone, 'Premium');
assert.equal(validResolved.image.aspectRatio, '4:5');
assert.equal(validResolved.image.backgroundColor, '#aabbcc');
assert.deepEqual(validResolved.image.colors, []);
assert.deepEqual(validResolved.image.compositions, ['Close-up']);
assert.equal(validResolved.image.isMultiMode, false);
assert.equal(validResolved.image.transparentBg, false);

const generationConfig = applyProjectImagePreferencesToGenerationConfig(
    { aspectRatio: '1:1' } as ImageGenerationConfigType,
    malformedProject,
    'Restaurant',
    'food',
);
assert.equal(generationConfig.aspectRatio, recommended.image.aspectRatio);
assert.deepEqual(generationConfig.styles, recommended.image.styles);

console.log('Project AI preferences boundary tests passed.');
