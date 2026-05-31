import { createHmac, timingSafeEqual } from 'crypto';

export type AnswerlatticeMcpSessionPayload = {
    sub: 'answerlattice_mcp_session';
    tId: number;
    sId: number;
    scope: string[];
    bundleVersion: number;
    revocationVersion?: number;
    iat: number;
    exp: number;
};

const getSecret = () => process.env.ANSWERLATTICE_MCP_SESSION_SECRET || '';

const base64url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

const signPayload = (payloadPart: string, secret: string) =>
    createHmac('sha256', secret).update(payloadPart).digest('base64url');

export const canIssueAnswerlatticeMcpSession = () => Boolean(getSecret());

export const createAnswerlatticeMcpSessionToken = (
    input: Omit<AnswerlatticeMcpSessionPayload, 'sub' | 'iat' | 'exp'> & { ttlSeconds?: number },
): string => {
    const secret = getSecret();
    if (!secret) throw new Error('ANSWERLATTICE_MCP_SESSION_SECRET is not configured.');
    const now = Math.floor(Date.now() / 1000);
    const payload: AnswerlatticeMcpSessionPayload = {
        sub: 'answerlattice_mcp_session',
        tId: input.tId,
        sId: input.sId,
        scope: input.scope,
        bundleVersion: input.bundleVersion,
        revocationVersion: input.revocationVersion,
        iat: now,
        exp: now + Math.min(Math.max(Number(input.ttlSeconds || 900), 60), 900),
    };
    const payloadPart = base64url(JSON.stringify(payload));
    return `${payloadPart}.${signPayload(payloadPart, secret)}`;
};

export const verifyAnswerlatticeMcpSessionToken = (token: string | null | undefined): AnswerlatticeMcpSessionPayload | null => {
    const secret = getSecret();
    if (!secret || !token) return null;
    const [payloadPart, signature] = token.split('.');
    if (!payloadPart || !signature) return null;
    const expected = signPayload(payloadPart, secret);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
        return null;
    }
    try {
        const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as AnswerlatticeMcpSessionPayload;
        if (payload.sub !== 'answerlattice_mcp_session') return null;
        if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
        if (!Number.isFinite(Number(payload.tId)) || !Number.isFinite(Number(payload.sId))) return null;
        return payload;
    } catch {
        return null;
    }
};
