import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
    createAnswerlatticeMcpSessionToken,
    hasAnswerlatticeMcpSessionScope,
    verifyAnswerlatticeMcpSessionToken,
} from '../../src/lib/answerlattice/mcpSession';
import { getAnswerlatticeMcpToolRequiredScope } from '../../src/lib/answerlattice/mcpTools';

process.env.ANSWERLATTICE_MCP_SESSION_SECRET = 'test-only-answerlattice-mcp-session-secret';

const signPayload = (payload: Record<string, unknown>) => {
    const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = createHmac('sha256', process.env.ANSWERLATTICE_MCP_SESSION_SECRET!)
        .update(encoded)
        .digest('base64url');
    return `${encoded}.${signature}`;
};

const validToken = createAnswerlatticeMcpSessionToken({
    tId: 71,
    sId: 701,
    scope: ['context:read', 'signals:write'],
    bundleVersion: 4,
    revocationVersion: 2,
    ttlSeconds: 300,
});
const validPayload = verifyAnswerlatticeMcpSessionToken(validToken);
assert.equal(validPayload?.tId, 71);
assert.equal(validPayload?.sId, 701);
assert.deepEqual(validPayload?.scope, ['context:read', 'signals:write']);
assert.equal(validPayload && hasAnswerlatticeMcpSessionScope(validPayload, 'context:read'), true);
assert.equal(getAnswerlatticeMcpToolRequiredScope('get_product_context'), 'context:read');
assert.equal(getAnswerlatticeMcpToolRequiredScope('report_missing_context'), 'signals:write');
assert.equal(getAnswerlatticeMcpToolRequiredScope('unknown_tool'), null);
assert.equal(verifyAnswerlatticeMcpSessionToken(`${validToken}.ignored`), null, 'extra token segments must be rejected');
assert.throws(
    () => Reflect.apply(createAnswerlatticeMcpSessionToken, null, [{
        tId: 71,
        sId: 701,
        scope: ['admin:*'],
        bundleVersion: 4,
    }]),
    /payload is invalid/,
    'the issuer must not sign unsupported capabilities',
);

const now = Math.floor(Date.now() / 1000);
const basePayload = {
    sub: 'answerlattice_mcp_session',
    tId: 71,
    sId: 701,
    scope: ['context:read'],
    bundleVersion: 4,
    revocationVersion: 0,
    iat: now,
    exp: now + 300,
};
const readOnlyPayload = verifyAnswerlatticeMcpSessionToken(signPayload(basePayload));
assert.equal(readOnlyPayload && hasAnswerlatticeMcpSessionScope(readOnlyPayload, 'context:read'), true);
assert.equal(readOnlyPayload && hasAnswerlatticeMcpSessionScope(readOnlyPayload, 'signals:write'), false);
assert.equal(verifyAnswerlatticeMcpSessionToken(signPayload({ ...basePayload, tId: '71' })), null);
assert.equal(verifyAnswerlatticeMcpSessionToken(signPayload({ ...basePayload, scope: ['admin:*'] })), null);
assert.equal(verifyAnswerlatticeMcpSessionToken(signPayload({ ...basePayload, scope: ['context:read', 'context:read'] })), null);
assert.equal(verifyAnswerlatticeMcpSessionToken(signPayload({ ...basePayload, exp: now + 901 })), null);
assert.equal(verifyAnswerlatticeMcpSessionToken(signPayload({ ...basePayload, unexpected: true })), null);

process.stdout.write('Answerlattice MCP session token contract passed.\n');
