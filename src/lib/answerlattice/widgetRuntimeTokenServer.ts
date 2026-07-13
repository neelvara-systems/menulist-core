import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { isRequestOriginAllowed, normalizeRequestOrigin } from '@lib/security/requestOrigin';
import { z } from 'zod';

export const ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_HEADER = 'x-answerlattice-widget-runtime';
export const ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_TTL_SECONDS = 15 * 60;

const MAX_WIDGET_RUNTIME_TOKEN_LENGTH = 2048;
const CLOCK_SKEW_SECONDS = 30;
const RUNTIME_TOKEN_AUDIENCE = 'answerlattice_widget_runtime';

const RuntimeTokenPayloadSchema = z.object({
    v: z.literal(1),
    aud: z.literal(RUNTIME_TOKEN_AUDIENCE),
    origin: z.string().url().max(300),
    iat: z.number().int().positive(),
    exp: z.number().int().positive(),
    nonce: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
}).strict();

type WidgetRuntimeTokenPayload = z.infer<typeof RuntimeTokenPayloadSchema>;

export type AnswerlatticeWidgetRuntimeAuthorization = {
    token: string;
    expiresAt: number;
    origin: string;
};

type WidgetRuntimeTokenScope = {
    apiKey: string;
    tId: number;
    sId: number;
};

const getRuntimeSecret = (): string | null => {
    const secret = String(process.env.ANSWERLATTICE_WIDGET_RUNTIME_SECRET || '').trim();
    return secret.length >= 32 ? secret : null;
};

const normalizeScope = (scope: WidgetRuntimeTokenScope): WidgetRuntimeTokenScope | null => {
    const apiKey = String(scope.apiKey || '').trim();
    const tId = Number(scope.tId);
    const sId = Number(scope.sId);
    if (!apiKey.startsWith('al_') || apiKey.length > 300) return null;
    if (!Number.isSafeInteger(tId) || tId <= 0) return null;
    if (!Number.isSafeInteger(sId) || sId <= 0) return null;
    return { apiKey, tId, sId };
};

const getScopeBinding = (scope: WidgetRuntimeTokenScope): string => (
    `${createHash('sha256').update(scope.apiKey).digest('hex')}:${scope.tId}:${scope.sId}`
);

const signPayload = (
    payloadPart: string,
    scope: WidgetRuntimeTokenScope,
    secret: string,
): string => createHmac('sha256', secret)
    .update(`${payloadPart}.${getScopeBinding(scope)}`)
    .digest('base64url');

const constantTimeEqual = (left: string, right: string): boolean => {
    const leftBuffer = Buffer.from(left, 'utf8');
    const rightBuffer = Buffer.from(right, 'utf8');
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export const createAnswerlatticeWidgetRuntimeAuthorization = (params: {
    apiKey: string;
    tId: number;
    sId: number;
    origin: string | null | undefined;
    nowMs?: number;
    ttlSeconds?: number;
}): AnswerlatticeWidgetRuntimeAuthorization => {
    const secret = getRuntimeSecret();
    if (!secret) {
        throw new Error('ANSWERLATTICE_WIDGET_RUNTIME_SECRET_NOT_CONFIGURED');
    }

    const scope = normalizeScope(params);
    const origin = normalizeRequestOrigin(params.origin);
    if (!scope || !origin) {
        throw new Error('ANSWERLATTICE_WIDGET_RUNTIME_SCOPE_INVALID');
    }

    const nowSeconds = Math.floor((params.nowMs ?? Date.now()) / 1000);
    const requestedTtl = Number(params.ttlSeconds ?? ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_TTL_SECONDS);
    const ttlSeconds = Number.isSafeInteger(requestedTtl)
        ? Math.max(60, Math.min(ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_TTL_SECONDS, requestedTtl))
        : ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_TTL_SECONDS;
    const payload: WidgetRuntimeTokenPayload = {
        v: 1,
        aud: RUNTIME_TOKEN_AUDIENCE,
        origin,
        iat: nowSeconds,
        exp: nowSeconds + ttlSeconds,
        nonce: randomBytes(16).toString('base64url'),
    };
    const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = signPayload(payloadPart, scope, secret);

    return {
        token: `${payloadPart}.${signature}`,
        expiresAt: payload.exp * 1000,
        origin,
    };
};

export const verifyAnswerlatticeWidgetRuntimeAuthorization = (params: {
    token: string | null | undefined;
    apiKey: string;
    tId: number;
    sId: number;
    nowMs?: number;
}): AnswerlatticeWidgetRuntimeAuthorization | null => {
    const secret = getRuntimeSecret();
    const scope = normalizeScope(params);
    const token = String(params.token || '').trim();
    if (!secret || !scope || !token || token.length > MAX_WIDGET_RUNTIME_TOKEN_LENGTH) return null;

    const tokenParts = token.split('.');
    if (tokenParts.length !== 2 || !tokenParts[0] || !tokenParts[1]) return null;
    const [payloadPart, signature] = tokenParts;
    const expectedSignature = signPayload(payloadPart, scope, secret);
    if (!constantTimeEqual(signature, expectedSignature)) return null;

    try {
        const parsed = RuntimeTokenPayloadSchema.safeParse(
            JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')),
        );
        if (!parsed.success) return null;

        const nowSeconds = Math.floor((params.nowMs ?? Date.now()) / 1000);
        if (parsed.data.iat > nowSeconds + CLOCK_SKEW_SECONDS) return null;
        if (parsed.data.exp <= nowSeconds) return null;
        if (parsed.data.exp - parsed.data.iat > ANSWERLATTICE_WIDGET_RUNTIME_TOKEN_TTL_SECONDS) return null;
        const origin = normalizeRequestOrigin(parsed.data.origin);
        if (!origin || origin !== parsed.data.origin) return null;

        return {
            token,
            expiresAt: parsed.data.exp * 1000,
            origin,
        };
    } catch {
        return null;
    }
};

export const isAnswerlatticeWidgetRuntimeRequestAuthorized = (params: {
    requestOrigin: string | null | undefined;
    allowedOrigins: unknown;
    runtimeToken: string | null | undefined;
    apiKey: string;
    tId: number;
    sId: number;
    nowMs?: number;
}): boolean => {
    if (isRequestOriginAllowed(params.requestOrigin, params.allowedOrigins)) return true;

    const authorization = verifyAnswerlatticeWidgetRuntimeAuthorization({
        token: params.runtimeToken,
        apiKey: params.apiKey,
        tId: params.tId,
        sId: params.sId,
        nowMs: params.nowMs,
    });
    return Boolean(
        authorization
        && isRequestOriginAllowed(authorization.origin, params.allowedOrigins),
    );
};
