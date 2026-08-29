import assert from 'node:assert/strict';
import { increment, Timestamp } from 'firebase/firestore';
import {
    composeRequestBody,
    replaceUndefined,
    type RequestBodyComposerSession,
} from '../../src/lib/apiHelper/requestBodyComposition';
import {
    normalizeAnswerlatticeSourceContext,
    resolveAnswerlatticePersistenceSession,
} from '../../src/lib/answerlattice/documentComposer';
import { sanitizeForFirestore } from '../../src/lib/firestore/sanitizeForFirestore';
import { rejectInvalidOrOversizedDeclaredBody } from '../../src/lib/security/boundedRequestBody';
import { sanitizeForFirestore as sanitizeSharedFunctionValue } from '../../functions/src/lib/sanitizeForFirestore';
import { sanitizeForFirestore as sanitizeDedicatedFunctionValue } from '../../functions-answerlattice/src/lib/sanitizeForFirestore';

const fixedNow = Timestamp.fromMillis(Date.UTC(2026, 6, 11, 12, 30, 0));
const session: RequestBodyComposerSession = {
    pId: 'ML',
    sId: 22,
    tId: 11,
    role: 'owner',
    uId: 'user-1',
    user: { name: 'Owner One' },
};

const created = composeRequestBody({
    title: 'Created',
    optional: undefined,
    modifiedBy: 'spoofed actor',
}, session, { isNew: true }, fixedNow);
assert.equal(created.createdOn, fixedNow);
assert.equal(created.modifiedOn, fixedNow);
assert.equal(created.createdBy, 'Owner One');
assert.equal(created.modifiedBy, 'Owner One');
assert.equal(created.optional, null);
assert.equal(created.pId, 'ML');
assert.equal(created.sId, 22);
assert.equal(created.tId, 11);

const originalCreatedOn = Timestamp.fromMillis(1_000);
const updated = composeRequestBody({
    title: 'Updated',
    createdBy: 'Original Owner',
    createdOn: originalCreatedOn,
}, session, { isNew: false }, fixedNow);
assert.equal(Object.hasOwn(updated, 'createdOn'), false);
assert.equal(Object.hasOwn(updated, 'createdBy'), false);
assert.equal(updated.modifiedOn, fixedNow);

const updateWithoutCreationMetadata = composeRequestBody(
    { title: 'No creation rewrite' },
    session,
    { isNew: false },
    fixedNow,
);
assert.equal(Object.hasOwn(updateWithoutCreationMetadata, 'createdOn'), false);
assert.equal(Object.hasOwn(updateWithoutCreationMetadata, 'createdBy'), false);

const zeroScope = composeRequestBody(
    { sId: 0, tId: '0' },
    null,
    { isNew: false },
    fixedNow,
);
assert.equal(zeroScope.sId, 0);
assert.equal(zeroScope.tId, '0');

assert.throws(
    () => composeRequestBody({ sId: -1 }, null, { isNew: false }, fixedNow),
    /Invalid sId/,
);
assert.throws(
    () => composeRequestBody({ tId: 'not-a-scope' }, null, { isNew: false }, fixedNow),
    /Invalid tId/,
);
for (const invalidScope of ['01', '1e3', '1.0', '+1']) {
    assert.throws(
        () => composeRequestBody({ sId: invalidScope }, null, { isNew: false }, fixedNow),
        /Invalid sId/,
    );
}
assert.throws(
    () => composeRequestBody([] as unknown as object, null, { isNew: false }, fixedNow),
    /plain object/,
);

const date = new Date('2026-07-11T00:00:00.000Z');
const bytes = new Uint8Array([1, 2, 3]);
const transform = increment(1);
class CustomAtomicValue {
    constructor(readonly value: string) {}
}
const custom = new CustomAtomicValue('kept');
const sanitized = replaceUndefined({
    array: [undefined, { nested: undefined }],
    bytes,
    custom,
    date,
    transform,
});
assert.deepEqual(sanitized.array, [null, { nested: null }]);
assert.equal(sanitized.bytes, bytes);
assert.equal(sanitized.custom, custom);
assert.equal(sanitized.date, date);
assert.equal(sanitized.transform, transform);

const sparse = new Array(2);
sparse[1] = 'present';
assert.deepEqual(replaceUndefined(sparse), [null, 'present']);

const shared = { nested: undefined };
const sharedResult = replaceUndefined({ left: shared, right: shared });
assert.deepEqual(sharedResult, { left: { nested: null }, right: { nested: null } });

const circular: Record<string, unknown> = {};
circular.self = circular;
assert.throws(() => replaceUndefined(circular), /Circular Firestore value/);

const accessor = Object.create(null) as Record<string, unknown>;
Object.defineProperty(accessor, 'secret', {
    enumerable: true,
    get: () => 'must-not-execute',
});
assert.throws(() => replaceUndefined(accessor), /Accessor property/);

const unsafeKey = Object.create(null) as Record<string, unknown>;
unsafeKey.__proto__ = 'unsafe';
assert.throws(() => replaceUndefined(unsafeKey), /Unsafe object key/);

const arrayWithCustomProperty = ['value'] as string[] & { extra?: string };
arrayWithCustomProperty.extra = 'not serialized by Firestore';
assert.throws(() => replaceUndefined(arrayWithCustomProperty), /Custom array property/);

const dateTransform = (value: Date) => value.toISOString();
assert.deepEqual(sanitizeForFirestore({
    keep: 'yes',
    omit: undefined,
    array: [undefined],
    date,
}, {
    dateTransform,
    undefinedObjectValue: 'omit',
}), {
    keep: 'yes',
    array: [null],
    date: date.toISOString(),
});
assert.throws(() => sanitizeForFirestore({ callback: () => undefined }), /Unsupported Firestore value/);

const atomicTransformPaths: string[] = [];
const timestampLike = {
    seconds: 1,
    toDate: () => date,
};
const atomicTransformResult = sanitizeForFirestore({
    at: timestampLike,
    untouched: custom,
}, {
    atomicTransform: (value, path) => {
        atomicTransformPaths.push(path);
        const candidate = value as { seconds?: unknown; toDate?: unknown };
        if (typeof candidate.seconds === 'number' && typeof candidate.toDate === 'function') {
            return { handled: true, value: candidate.toDate() };
        }
        return { handled: false };
    },
});
assert.equal(atomicTransformResult.at, date);
assert.equal(atomicTransformResult.untouched, custom);
assert.ok(atomicTransformPaths.includes('$.at'));

const unsafeOmitted = Object.create(null) as Record<string, unknown>;
unsafeOmitted.safe = 'kept';
Object.defineProperty(unsafeOmitted, 'constructor', { enumerable: true, value: 'dropped' });
assert.deepEqual(sanitizeForFirestore(unsafeOmitted, { unsafeObjectKey: 'omit' }), { safe: 'kept' });

for (const functionsSanitizer of [sanitizeSharedFunctionValue, sanitizeDedicatedFunctionValue]) {
    assert.deepEqual(functionsSanitizer({
        keep: true,
        omit: undefined,
        array: [undefined],
        date,
    }, {
        dateTransform,
        undefinedObjectValue: 'omit',
    }), {
        keep: true,
        array: [null],
        date: date.toISOString(),
    });
    assert.equal(functionsSanitizer(transform).constructor, transform.constructor);
    assert.throws(() => functionsSanitizer(circular), /Circular Firestore value/);

    const mirrorAtomicPaths: string[] = [];
    const mirrorAtomicResult = functionsSanitizer({
        at: timestampLike,
        untouched: custom,
    }, {
        atomicTransform: (value, path) => {
            mirrorAtomicPaths.push(path);
            const candidate = value as { seconds?: unknown; toDate?: unknown };
            if (typeof candidate.seconds === 'number' && typeof candidate.toDate === 'function') {
                return { handled: true, value: candidate.toDate() };
            }
            return { handled: false };
        },
    });
    assert.equal(mirrorAtomicResult.at, date);
    assert.equal(mirrorAtomicResult.untouched, custom);
    assert.ok(mirrorAtomicPaths.includes('$.at'));

    const mirrorUnsafeOmitted = Object.create(null) as Record<string, unknown>;
    mirrorUnsafeOmitted.safe = 'kept';
    Object.defineProperty(mirrorUnsafeOmitted, 'constructor', { enumerable: true, value: 'dropped' });
    assert.deepEqual(functionsSanitizer(mirrorUnsafeOmitted, { unsafeObjectKey: 'omit' }), { safe: 'kept' });
}

assert.equal(normalizeAnswerlatticeSourceContext({
    uId: 'owner-1',
    name: ' Owner ',
    email: 'owner@example.com',
    phone: ' 123 ',
    pId: 'ML',
    tId: 10,
    sId: 20,
    ignoredSecret: 'drop-me',
})?.name, 'Owner');
assert.deepEqual(normalizeAnswerlatticeSourceContext({
    uId: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    pId: 'AL',
    tId: 10,
    sId: 20,
}), {
    uId: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
});
assert.equal(normalizeAnswerlatticeSourceContext({ name: 'Missing identity' }), undefined);

const bridgedAnswerlatticeSession = resolveAnswerlatticePersistenceSession({
    pId: 'ML',
    role: 'menulist-owner',
    sId: 22,
    tId: 11,
    uId: 'owner-1',
    user: {
        id: 'owner-1',
        name: 'Owner One',
        productAccounts: {
            AL: {
                active: true,
                role: 'owner',
                sId: 44,
                storeId: 44,
                tId: 33,
                tenantId: 33,
            },
        },
    },
} as any);
assert.equal(bridgedAnswerlatticeSession?.pId, 'AL');
assert.equal(bridgedAnswerlatticeSession?.tId, 33);
assert.equal(bridgedAnswerlatticeSession?.sId, 44);
assert.equal(bridgedAnswerlatticeSession?.role, 'owner');

const composedBridgedAnswerlatticeWrite = composeRequestBody(
    { pId: 'AL', sourceContext: { pId: 'ML', tId: 11, sId: 22 } },
    bridgedAnswerlatticeSession,
    { isNew: true },
    fixedNow,
);
assert.equal(composedBridgedAnswerlatticeWrite.pId, 'AL');
assert.equal(composedBridgedAnswerlatticeWrite.tId, 33);
assert.equal(composedBridgedAnswerlatticeWrite.sId, 44);
assert.deepEqual(composedBridgedAnswerlatticeWrite.sourceContext, { pId: 'ML', tId: 11, sId: 22 });
assert.equal(normalizeAnswerlatticeSourceContext({
    uId: 'owner-1',
    name: 'Owner',
    email: 'owner@example.com',
    pId: 'ML',
    tId: -1,
    sId: 2.5,
})?.tId, undefined);
for (const invalidScope of [null, false, '', ' ', '01', '1e3', '1.0']) {
    const normalized = normalizeAnswerlatticeSourceContext({
        uId: 'owner-1',
        name: 'Owner',
        email: 'owner@example.com',
        pId: 'ML',
        tId: invalidScope,
        sId: invalidScope,
    });
    assert.equal(normalized?.tId, undefined);
    assert.equal(normalized?.sId, undefined);
}

const declaredLengthRequest = (contentLength: string): Request => new Request('https://example.test/api', {
    headers: { 'content-length': contentLength },
    method: 'POST',
});

for (const invalidContentLength of ['-1', '+1', '1.5', '1e3', '1, 1', '9007199254740992']) {
    const response = rejectInvalidOrOversizedDeclaredBody(
        declaredLengthRequest(invalidContentLength),
        1_024,
    );
    assert.equal(response?.status, 400, `content-length ${invalidContentLength} must fail closed`);
}

assert.equal(
    rejectInvalidOrOversizedDeclaredBody(declaredLengthRequest('0010'), 10),
    null,
);
assert.equal(
    rejectInvalidOrOversizedDeclaredBody(declaredLengthRequest('11'), 10)?.status,
    413,
);
assert.throws(
    () => rejectInvalidOrOversizedDeclaredBody(declaredLengthRequest('0'), Number.NaN),
    /maxBytes must be a non-negative safe integer/,
);
assert.throws(
    () => rejectInvalidOrOversizedDeclaredBody(declaredLengthRequest('0'), -1),
    /maxBytes must be a non-negative safe integer/,
);

console.log('request body composition and bounded-body boundary tests passed');
