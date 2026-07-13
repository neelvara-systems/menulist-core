import { createHmac, timingSafeEqual } from 'crypto';

export type AnswerlatticeMcpSessionScope = 'context:read' | 'signals:write';

export type AnswerlatticeMcpSessionPayload = {
    sub: 'answerlattice_mcp_session';
    tId: number;
    sId: number;
    scope: AnswerlatticeMcpSessionScope[];
    bundleVersion: number;
    revocationVersion?: number;
    iat: number;
    exp: number;
};

const getSecret = () => process.env.ANSWERLATTICE_MCP_SESSION_SECRET || '';

const base64url = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

const signPayload = (payloadPart: string, secret: string) =>
    createHmac('sha256', secret).update(payloadPart).digest('base64url');

const MCP_SESSION_SCOPES = new Set<AnswerlatticeMcpSessionScope>(['context:read', 'signals:write']);

export const hasAnswerlatticeMcpSessionScope = (
    payload: AnswerlatticeMcpSessionPayload,
    requiredScope: AnswerlatticeMcpSessionScope,
): boolean => payload.scope.includes(requiredScope);

const parseMcpSessionPayload = (value: unknown): AnswerlatticeMcpSessionPayload | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const payload = value as Record<string, unknown>;
    const allowedKeys = new Set(['sub', 'tId', 'sId', 'scope', 'bundleVersion', 'revocationVersion', 'iat', 'exp']);
    if (Object.keys(payload).some(key => !allowedKeys.has(key))) return null;
    if (payload.sub !== 'answerlattice_mcp_session') return null;
    if (
        typeof payload.tId !== 'number'
        || typeof payload.sId !== 'number'
        || !Number.isSafeInteger(payload.tId)
        || !Number.isSafeInteger(payload.sId)
        || payload.tId <= 0
        || payload.sId <= 0
    ) return null;
    if (
        !Array.isArray(payload.scope)
        || payload.scope.length === 0
        || payload.scope.length > MCP_SESSION_SCOPES.size
        || payload.scope.some(scope => typeof scope !== 'string' || !MCP_SESSION_SCOPES.has(scope as AnswerlatticeMcpSessionScope))
        || new Set(payload.scope).size !== payload.scope.length
    ) return null;
    if (
        typeof payload.bundleVersion !== 'number'
        || !Number.isSafeInteger(payload.bundleVersion)
        || payload.bundleVersion < 0
        || (payload.revocationVersion !== undefined && (
            typeof payload.revocationVersion !== 'number'
            || !Number.isSafeInteger(payload.revocationVersion)
            || payload.revocationVersion < 0
        ))
        || typeof payload.iat !== 'number'
        || typeof payload.exp !== 'number'
        || !Number.isSafeInteger(payload.iat)
        || !Number.isSafeInteger(payload.exp)
    ) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.iat > now + 60 || payload.exp <= now || payload.exp <= payload.iat || payload.exp - payload.iat > 900) {
        return null;
    }

    const revocationVersion = typeof payload.revocationVersion === 'number'
        ? payload.revocationVersion
        : undefined;
    return {
        sub: payload.sub,
        tId: payload.tId,
        sId: payload.sId,
        scope: payload.scope as AnswerlatticeMcpSessionScope[],
        bundleVersion: payload.bundleVersion,
        ...(revocationVersion === undefined ? {} : { revocationVersion }),
        iat: payload.iat,
        exp: payload.exp,
    };
};

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
    const validatedPayload = parseMcpSessionPayload(payload);
    if (!validatedPayload) throw new Error('Answerlattice MCP session payload is invalid.');
    const payloadPart = base64url(JSON.stringify(validatedPayload));
    return `${payloadPart}.${signPayload(payloadPart, secret)}`;
};

export const verifyAnswerlatticeMcpSessionToken = (token: string | null | undefined): AnswerlatticeMcpSessionPayload | null => {
    const secret = getSecret();
    if (!secret || !token) return null;
    const tokenParts = token.split('.');
    if (tokenParts.length !== 2) return null;
    const [payloadPart, signature] = tokenParts;
    if (!payloadPart || !signature) return null;
    const expected = signPayload(payloadPart, secret);
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
        return null;
    }
    try {
        return parseMcpSessionPayload(JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')));
    } catch {
        return null;
    }
};
