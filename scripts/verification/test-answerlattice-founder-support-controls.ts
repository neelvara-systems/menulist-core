import assert from 'node:assert/strict';
import { createPrivateKey, sign } from 'node:crypto';
import {
    generateAnswerlatticeVerifiedContextKey,
    normalizeAnswerlatticeEvidenceHosts,
    normalizeAnswerlatticeEvidenceLinks,
    verifyAnswerlatticeVisitorToken,
} from '../../src/lib/answerlattice/verifiedWidgetContextServer';

const encodeJson = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

const createToken = ({
    privateKeyPkcs8,
    keyId,
    payload,
}: {
    privateKeyPkcs8: string;
    keyId: string;
    payload: Record<string, unknown>;
}) => {
    const header = encodeJson({ alg: 'EdDSA', typ: 'JWT', kid: keyId });
    const body = encodeJson(payload);
    const input = `${header}.${body}`;
    const privateKey = createPrivateKey({
        key: Buffer.from(privateKeyPkcs8, 'base64'),
        format: 'der',
        type: 'pkcs8',
    });
    const signature = sign(null, Buffer.from(input), privateKey).toString('base64url');
    return `${input}.${signature}`;
};

const nowSeconds = 1_800_000_000;
const generated = generateAnswerlatticeVerifiedContextKey();
const validToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 'Customer_123',
        name: 'Example Customer',
        email: 'customer@example.com',
        plan: 'Growth',
        role: 'Owner',
        locale: 'en-IN',
        tId: 999,
        sId: 888,
        privateRecord: 'must-not-pass',
    },
});

const verified = verifyAnswerlatticeVisitorToken(validToken, generated.record, nowSeconds * 1000);
assert.ok(verified, 'valid signed visitor token should verify');
assert.deepEqual(verified, {
    id: 'customer_123',
    name: 'Example Customer',
    email: 'customer@example.com',
    plan: 'growth',
    role: 'owner',
    locale: 'en-in',
    verified: true,
    keyId: generated.record.keyId,
});
assert.equal('tId' in verified, false, 'tenant claims must never enter verified visitor output');
assert.equal('sId' in verified, false, 'store claims must never enter verified visitor output');

const expiredToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'answerlattice-widget',
        iat: nowSeconds - 301,
        exp: nowSeconds - 1,
        sub: 'customer_123',
    },
});
assert.equal(
    verifyAnswerlatticeVisitorToken(expiredToken, generated.record, nowSeconds * 1000),
    null,
    'expired token must fail closed',
);

const wrongAudienceToken = createToken({
    privateKeyPkcs8: generated.privateKeyPkcs8,
    keyId: generated.record.keyId,
    payload: {
        aud: 'another-audience',
        iat: nowSeconds,
        exp: nowSeconds + 300,
        sub: 'customer_123',
    },
});
assert.equal(
    verifyAnswerlatticeVisitorToken(wrongAudienceToken, generated.record, nowSeconds * 1000),
    null,
    'wrong audience must fail closed',
);

const tamperedParts = validToken.split('.');
tamperedParts[1] = encodeJson({
    aud: 'answerlattice-widget',
    iat: nowSeconds,
    exp: nowSeconds + 300,
    sub: 'attacker',
});
assert.equal(
    verifyAnswerlatticeVisitorToken(tamperedParts.join('.'), generated.record, nowSeconds * 1000),
    null,
    'tampered payload must fail signature verification',
);

assert.deepEqual(
    normalizeAnswerlatticeEvidenceHosts([
        'https://Errors.Example.com',
        'errors.example.com',
        'https://errors.example.com/path',
        'https://errors.example.com:443',
        'https://user:pass@errors.example.com',
        'http://errors.example.com',
    ]),
    ['errors.example.com'],
    'allowed evidence hosts must be exact HTTPS hostnames without paths, ports, or credentials',
);

const links = normalizeAnswerlatticeEvidenceLinks([
    { label: 'First error', url: 'https://errors.example.com/event/one#private-fragment' },
    { label: 'Duplicate', url: 'https://errors.example.com/event/one' },
    { label: 'Second error', url: 'https://errors.example.com/event/two' },
    { label: 'Wrong subdomain', url: 'https://child.errors.example.com/event/three' },
    { label: 'Port', url: 'https://errors.example.com:444/event/four' },
], ['errors.example.com']);

assert.deepEqual(links, [
    { label: 'First error', url: 'https://errors.example.com/event/one' },
    { label: 'Second error', url: 'https://errors.example.com/event/two' },
]);

const cappedLinks = normalizeAnswerlatticeEvidenceLinks([
    { url: 'https://errors.example.com/1' },
    { url: 'https://errors.example.com/2' },
    { url: 'https://errors.example.com/3' },
    { url: 'https://errors.example.com/4' },
], ['errors.example.com']);
assert.equal(cappedLinks.length, 3, 'evidence links must remain capped at three');

console.log('Answerlattice founder support controls contract tests passed');
