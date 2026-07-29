import { summarizeImageProviderResponse } from '@lib/ai/imageOperationLogging';

const assert = (condition: unknown, message: string): void => {
    if (!condition) throw new Error(message);
};

const summary = summarizeImageProviderResponse({
    candidates: [{
        content: {
            parts: [
                { inlineData: { data: 'must-not-be-returned' } },
                { text: 'must-not-be-returned' },
            ],
        },
    }],
    generatedImages: [{ image: 'must-not-be-returned' }],
    usageMetadata: {
        cachedContentTokenCount: 2,
        candidatesTokenCount: 3,
        promptTokenCount: 5,
        thoughtsTokenCount: 7,
        totalTokenCount: 17,
        promptTokensDetails: [{ modality: 'IMAGE', tokenCount: 999 }],
        privateProviderField: 'must-not-be-returned',
    },
});

assert(summary.candidateCount === 1, 'Candidate count must be projected');
assert(summary.generatedImageCount === 1, 'Generated image count must be projected');
assert(summary.imagePartCount === 1, 'Image part count must be projected');
assert(summary.textPartCount === 1, 'Text part count must be projected');
assert(summary.usageMetadata?.totalTokenCount === 17, 'Safe token counts must be projected');
assert(
    !Object.prototype.hasOwnProperty.call(summary.usageMetadata, 'privateProviderField'),
    'Unknown provider metadata must not enter logs',
);
assert(
    !Object.prototype.hasOwnProperty.call(summary.usageMetadata, 'promptTokensDetails'),
    'Provider detail arrays must not enter logs',
);

let conversionHookCalled = false;
const malformed = summarizeImageProviderResponse({
    candidates: new Proxy([], {
        get: () => {
            throw new Error('candidate access must be contained');
        },
    }),
    generatedImages: 'not-an-array',
    usageMetadata: {
        totalTokenCount: {
            valueOf: () => {
                conversionHookCalled = true;
                return 1;
            },
        },
    },
});
assert(malformed.candidateCount === 0, 'Hostile candidate collections must fail closed');
assert(malformed.generatedImageCount === 0, 'Malformed generated images must fail closed');
assert(malformed.usageMetadata === null, 'Malformed usage metadata must fail closed');
assert(!conversionHookCalled, 'Usage normalization must not execute conversion hooks');

const capped = summarizeImageProviderResponse({
    candidates: Array.from({ length: 101 }, () => ({
        content: { parts: Array.from({ length: 101 }, () => ({ text: 'x' })) },
    })),
});
assert(capped.candidateCount === 101, 'Candidate envelope count must remain exact');
assert(capped.textPartCount === 10_000, 'Part inspection must be bounded to 100 by 100');

console.log('Image operation logging boundary tests passed.');
