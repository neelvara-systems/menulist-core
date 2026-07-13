import assert from 'node:assert/strict';
import {
    isResponseBodyTooLargeError as isAppResponseBodyTooLargeError,
    readJsonResponseWithLimit as readAppJsonResponseWithLimit,
    readResponseUint8ArrayWithLimit as readAppResponseBytesWithLimit,
} from '../../src/lib/security/boundedResponseBody';
import {
    isResponseBodyTooLargeError as isFunctionsResponseBodyTooLargeError,
    readJsonResponseWithLimit as readFunctionsJsonResponseWithLimit,
    readResponseUint8ArrayWithLimit as readFunctionsResponseBytesWithLimit,
} from '../../functions/src/utils/boundedResponseBody';

type BoundaryImplementation = {
    label: string;
    isTooLarge: (error: unknown) => boolean;
    readBytes: (response: Response, maxBytes: number) => Promise<Uint8Array>;
    readJson: (response: Response, maxBytes: number) => Promise<unknown>;
};

const implementations: BoundaryImplementation[] = [
    {
        label: 'app',
        isTooLarge: isAppResponseBodyTooLargeError,
        readBytes: readAppResponseBytesWithLimit,
        readJson: readAppJsonResponseWithLimit,
    },
    {
        label: 'functions',
        isTooLarge: isFunctionsResponseBodyTooLargeError,
        readBytes: readFunctionsResponseBytesWithLimit,
        readJson: readFunctionsJsonResponseWithLimit,
    },
];

const malformedUtf8Json = new Uint8Array([
    0x7b, 0x22, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x22, 0x3a, 0x22,
    0xc3, 0x28,
    0x22, 0x7d,
]);

const run = async (): Promise<void> => {
    for (const implementation of implementations) {
        assert.deepEqual(
            await implementation.readJson(new Response('{"ok":true}'), 64),
            { ok: true },
            `${implementation.label}: valid JSON must parse`,
        );
        assert.equal(
            await implementation.readJson(new Response(null), 64),
            null,
            `${implementation.label}: empty body must remain null`,
        );

        await assert.rejects(
            implementation.readBytes(new Response('small', {
                headers: { 'content-length': '65' },
            }), 64),
            implementation.isTooLarge,
            `${implementation.label}: declared overflow must fail before consumption`,
        );
        await assert.rejects(
            implementation.readBytes(new Response('x'.repeat(65)), 64),
            implementation.isTooLarge,
            `${implementation.label}: chunked overflow must fail`,
        );
        await assert.rejects(
            implementation.readJson(new Response('{not-json}'), 64),
            SyntaxError,
            `${implementation.label}: malformed JSON must fail`,
        );
        await assert.rejects(
            implementation.readJson(new Response(malformedUtf8Json), 64),
            TypeError,
            `${implementation.label}: malformed UTF-8 must fail`,
        );

        for (const invalidLimit of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
            await assert.rejects(
                implementation.readBytes(new Response('x'), invalidLimit),
                RangeError,
                `${implementation.label}: invalid limit ${String(invalidLimit)} must fail`,
            );
        }
    }
};

void run().then(() => {
    console.log('Bounded response body boundary tests passed.');
});
