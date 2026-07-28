import assert from 'node:assert/strict';

import {
    compileGeminiGenerateContentRequest,
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES,
    GEMINI_STABLE_MODELS,
    GeminiRequestCompatibilityError,
    isSupportedGeminiModel,
} from '../../src/data/shared/geminiRuntime';

const expectCompatibilityError = (
    code: string,
    operation: () => unknown,
) => {
    assert.throws(operation, (error: unknown) => (
        error instanceof GeminiRequestCompatibilityError
        && error.code === code
    ));
};

const strictRequest = {
    model: GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT,
    contents: [{ role: 'user', parts: [{ text: 'Return JSON.' }] }],
    config: {
        candidateCount: 2,
        maxOutputTokens: 100,
        temperature: 0.2,
        topK: 40,
        topP: 0.9,
    },
};
const strictCompiled = compileGeminiGenerateContentRequest(strictRequest);

assert.notStrictEqual(strictCompiled, strictRequest);
assert.notStrictEqual(strictCompiled.config, strictRequest.config);
assert.deepEqual(strictRequest.config, {
    candidateCount: 2,
    maxOutputTokens: 100,
    temperature: 0.2,
    topK: 40,
    topP: 0.9,
});
assert.deepEqual(strictCompiled.config, { maxOutputTokens: 100 });

const balancedCompiled = compileGeminiGenerateContentRequest({
    model: GEMINI_STABLE_MODELS.TEXT_BALANCED,
    contents: 'Return JSON.',
    config: {
        candidateCount: 2,
        temperature: 0.2,
    },
});
assert.deepEqual(balancedCompiled.config, {});

expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.PREFILLED_MODEL_TURN,
    () => compileGeminiGenerateContentRequest({
        model: GEMINI_STABLE_MODELS.TEXT_COMPLEX,
        contents: [
            { role: 'user', parts: [{ text: 'Question' }] },
            { role: 'model', parts: [{ text: 'Prefilled answer' }] },
        ],
    }),
);

expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.THINKING_BUDGET,
    () => compileGeminiGenerateContentRequest({
        model: GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT,
        contents: 'Question',
        config: { thinkingConfig: { thinkingBudget: 1024 } },
    }),
);

expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.THINKING_LEVEL,
    () => compileGeminiGenerateContentRequest({
        model: GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT,
        contents: 'Question',
        config: { thinkingConfig: { thinkingLevel: 'maximum' } },
    }),
);

expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.FUNCTION_RESPONSE_IDENTITY,
    () => compileGeminiGenerateContentRequest({
        model: GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT,
        contents: [{
            role: 'user',
            parts: [{ functionResponse: { name: 'lookup', response: { ok: true } } }],
        }],
    }),
);

assert.doesNotThrow(() => compileGeminiGenerateContentRequest({
    model: GEMINI_STABLE_MODELS.TEXT_HIGH_THROUGHPUT,
    contents: [{
        role: 'user',
        parts: [{
            functionResponse: {
                id: 'call_123',
                name: 'lookup',
                response: { ok: true },
            },
        }],
    }],
}));

expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.UNSTABLE_MODEL,
    () => compileGeminiGenerateContentRequest({
        model: 'gemini-latest',
        contents: 'Question',
    }),
);
expectCompatibilityError(
    GEMINI_REQUEST_COMPATIBILITY_ERROR_CODES.UNKNOWN_MODEL,
    () => compileGeminiGenerateContentRequest({
        model: 'gemini-4-unknown',
        contents: 'Question',
    }),
);

assert.equal(isSupportedGeminiModel(GEMINI_STABLE_MODELS.TEXT_COMPLEX), true);
assert.equal(isSupportedGeminiModel(' gemini-4-unknown '), false);

console.log('Gemini runtime compatibility tests passed');
