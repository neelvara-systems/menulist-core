import assert from 'assert';
import {
    createAnswerlatticeWidgetRuntimeAuthorization,
    isAnswerlatticeWidgetRuntimeRequestAuthorized,
    verifyAnswerlatticeWidgetRuntimeAuthorization,
} from '@lib/answerlattice/widgetRuntimeTokenServer';

const originalSecret = process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET;
const fixedNow = Date.UTC(2026, 6, 11, 10, 0, 0);
const scope = {
    apiKey: 'al_widget_runtime_test_key_123456789',
    tId: 101,
    sId: 202,
};

try {
    process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET = 'test_only_answerlattice_widget_runtime_secret_0123456789';

    const authorization = createAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        origin: 'https://app.example.com/path',
        nowMs: fixedNow,
        ttlSeconds: 120,
    });
    assert.equal(authorization.origin, 'https://app.example.com');
    assert.equal(authorization.expiresAt, fixedNow + 120_000);

    const decodedPayload = JSON.parse(
        Buffer.from(authorization.token.split('.')[0], 'base64url').toString('utf8'),
    ) as Record<string, unknown>;
    assert.equal(decodedPayload.origin, 'https://app.example.com');
    assert.equal(decodedPayload.tId, undefined);
    assert.equal(decodedPayload.sId, undefined);
    assert.equal(decodedPayload.apiKey, undefined);

    assert.ok(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        token: authorization.token,
        nowMs: fixedNow + 30_000,
    }));
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        token: authorization.token,
        nowMs: fixedNow + 120_000,
    }), null, 'expired runtime authorization must fail closed');
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        apiKey: `${scope.apiKey}_wrong`,
        token: authorization.token,
        nowMs: fixedNow + 30_000,
    }), null, 'authorization must be bound to the widget key');
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        sId: 203,
        token: authorization.token,
        nowMs: fixedNow + 30_000,
    }), null, 'authorization must be bound to the workspace');
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        tId: String(scope.tId) as unknown as number,
        token: authorization.token,
        nowMs: fixedNow + 30_000,
    }), null, 'coercible tenant scope must fail closed');
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        token: authorization.token,
        nowMs: String(fixedNow + 30_000) as unknown as number,
    }), null, 'coercible verification time must fail closed');
    assert.throws(() => createAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        origin: 'https://app.example.com',
        nowMs: fixedNow,
        ttlSeconds: '120' as unknown as number,
    }), /ANSWERLATTICE_WIDGET_RUNTIME_TIME_INVALID/, 'coercible token TTL must be rejected');
    assert.throws(() => createAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        origin: 'https://app.example.com',
        nowMs: 0,
    }), /ANSWERLATTICE_WIDGET_RUNTIME_TIME_INVALID/, 'nonpositive token time must be rejected');
    assert.throws(() => createAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        apiKey: ` ${scope.apiKey}`,
        origin: 'https://app.example.com',
        nowMs: fixedNow,
    }), /ANSWERLATTICE_WIDGET_RUNTIME_SCOPE_INVALID/, 'whitespace-mutated widget keys must be rejected');

    const tokenParts = authorization.token.split('.');
    const tamperedToken = `${tokenParts[0].slice(0, -1)}A.${tokenParts[1]}`;
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        token: tamperedToken,
        nowMs: fixedNow + 30_000,
    }), null, 'tampered payloads must fail closed');

    assert.equal(isAnswerlatticeWidgetRuntimeRequestAuthorized({
        ...scope,
        requestOrigin: 'https://app.example.com',
        allowedOrigins: ['https://app.example.com'],
        runtimeToken: null,
        nowMs: fixedNow + 30_000,
    }), true, 'a direct request from an allowed host remains supported');
    assert.equal(isAnswerlatticeWidgetRuntimeRequestAuthorized({
        ...scope,
        requestOrigin: 'https://answerlattice.com',
        allowedOrigins: ['https://app.example.com'],
        runtimeToken: authorization.token,
        nowMs: fixedNow + 30_000,
    }), true, 'the Answerlattice iframe must inherit the validated host authorization');
    assert.equal(isAnswerlatticeWidgetRuntimeRequestAuthorized({
        ...scope,
        requestOrigin: 'https://answerlattice.com',
        allowedOrigins: ['https://different.example.com'],
        runtimeToken: authorization.token,
        nowMs: fixedNow + 30_000,
    }), false, 'a token origin removed from the current allowlist must fail closed');
    assert.equal(isAnswerlatticeWidgetRuntimeRequestAuthorized({
        ...scope,
        requestOrigin: 'https://answerlattice.com',
        allowedOrigins: [],
        runtimeToken: null,
        nowMs: fixedNow + 30_000,
    }), true, 'an intentionally empty allowlist preserves the documented open-origin mode');

    delete process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET;
    assert.throws(() => createAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        origin: 'https://app.example.com',
        nowMs: fixedNow,
    }), /ANSWERLATTICE_WIDGET_RUNTIME_SECRET_NOT_CONFIGURED/);
    assert.equal(verifyAnswerlatticeWidgetRuntimeAuthorization({
        ...scope,
        token: authorization.token,
        nowMs: fixedNow + 30_000,
    }), null);

    console.log('Answerlattice widget runtime authorization contract passed.');
} finally {
    if (originalSecret === undefined) delete process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET;
    else process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET = originalSecret;
}
