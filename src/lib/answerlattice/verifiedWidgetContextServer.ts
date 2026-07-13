import { createPublicKey, generateKeyPairSync, verify } from 'crypto';
import { createRandomIdSegment } from '@lib/runtime/randomId';

export const ANSWERLATTICE_VERIFIED_CONTEXT_MAX_TOKEN_AGE_SECONDS = 10 * 60;
export const ANSWERLATTICE_EVIDENCE_MAX_HOSTS = 10;
export const ANSWERLATTICE_EVIDENCE_MAX_LINKS = 3;

export type AnswerlatticeVerifiedContextKeyRecord = {
    enabled: boolean;
    algorithm: 'Ed25519';
    keyId: string;
    publicKeySpki: string;
    createdAt: string;
    rotatedAt?: string;
};

export type AnswerlatticeVerifiedVisitor = {
    id: string;
    name?: string;
    email?: string;
    plan?: string;
    role?: string;
    locale?: string;
    verified: true;
    keyId: string;
};

export type AnswerlatticeDebugEvidenceLink = {
    url: string;
    label?: string;
};

type GeneratedVerifiedContextKey = {
    record: AnswerlatticeVerifiedContextKeyRecord;
    privateKeyPkcs8: string;
};

const base64UrlToBuffer = (value: string): Buffer | null => {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
    try {
        return Buffer.from(value, 'base64url');
    } catch {
        return null;
    }
};

const normalizeIdentityText = (value: unknown, maxLength: number) => {
    const text = String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
    return text ? text.slice(0, maxLength) : undefined;
};

const normalizeIdentityCode = (value: unknown, maxLength: number) => {
    const text = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_.:@-]/g, '');
    return text ? text.slice(0, maxLength) : undefined;
};

const normalizeEmail = (value: unknown) => {
    const email = normalizeIdentityText(value, 180)?.toLowerCase();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
};

export const normalizeVerifiedContextKeyRecord = (value: unknown): AnswerlatticeVerifiedContextKeyRecord | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (
        record.enabled !== true
        || record.algorithm !== 'Ed25519'
        || typeof record.keyId !== 'string'
        || typeof record.publicKeySpki !== 'string'
        || typeof record.createdAt !== 'string'
    ) return null;
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(record.keyId) || record.publicKeySpki.length > 512) return null;
    return {
        enabled: true,
        algorithm: 'Ed25519',
        keyId: record.keyId,
        publicKeySpki: record.publicKeySpki,
        createdAt: record.createdAt,
        ...(typeof record.rotatedAt === 'string' ? { rotatedAt: record.rotatedAt } : {}),
    };
};

export const generateAnswerlatticeVerifiedContextKey = (): GeneratedVerifiedContextKey => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const now = new Date().toISOString();
    return {
        record: {
            enabled: true,
            algorithm: 'Ed25519',
            keyId: `alk_${createRandomIdSegment(20)}`,
            publicKeySpki: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
            createdAt: now,
            rotatedAt: now,
        },
        privateKeyPkcs8: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
    };
};

export const verifyAnswerlatticeVisitorToken = (
    token: string,
    rawRecord: unknown,
    nowMs = Date.now(),
): AnswerlatticeVerifiedVisitor | null => {
    const record = normalizeVerifiedContextKeyRecord(rawRecord);
    if (!record || typeof token !== 'string' || token.length < 40 || token.length > 4096) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerPart, payloadPart, signaturePart] = parts;
    const headerBuffer = base64UrlToBuffer(headerPart);
    const payloadBuffer = base64UrlToBuffer(payloadPart);
    const signature = base64UrlToBuffer(signaturePart);
    if (!headerBuffer || !payloadBuffer || !signature) return null;

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
        header = JSON.parse(headerBuffer.toString('utf8'));
        payload = JSON.parse(payloadBuffer.toString('utf8'));
    } catch {
        return null;
    }
    if (header.alg !== 'EdDSA' || header.typ !== 'JWT' || header.kid !== record.keyId) return null;
    if (payload.aud !== 'answerlattice-widget') return null;

    const nowSeconds = Math.floor(nowMs / 1000);
    const issuedAt = Number(payload.iat);
    const expiresAt = Number(payload.exp);
    if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
    if (issuedAt > nowSeconds + 60 || expiresAt <= nowSeconds) return null;
    if (expiresAt - issuedAt <= 0 || expiresAt - issuedAt > ANSWERLATTICE_VERIFIED_CONTEXT_MAX_TOKEN_AGE_SECONDS) return null;

    try {
        const publicKey = createPublicKey({
            key: Buffer.from(record.publicKeySpki, 'base64'),
            format: 'der',
            type: 'spki',
        });
        if (!verify(null, Buffer.from(`${headerPart}.${payloadPart}`), publicKey, signature)) return null;
    } catch {
        return null;
    }

    const id = normalizeIdentityCode(payload.sub, 120);
    if (!id) return null;
    return {
        id,
        ...(normalizeIdentityText(payload.name, 160) ? { name: normalizeIdentityText(payload.name, 160) } : {}),
        ...(normalizeEmail(payload.email) ? { email: normalizeEmail(payload.email) } : {}),
        ...(normalizeIdentityCode(payload.plan, 100) ? { plan: normalizeIdentityCode(payload.plan, 100) } : {}),
        ...(normalizeIdentityCode(payload.role, 100) ? { role: normalizeIdentityCode(payload.role, 100) } : {}),
        ...(normalizeIdentityCode(payload.locale, 32) ? { locale: normalizeIdentityCode(payload.locale, 32) } : {}),
        verified: true,
        keyId: record.keyId,
    };
};

export const normalizeAnswerlatticeEvidenceHost = (value: unknown): string | null => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw.length > 253) return null;
    try {
        const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port) return null;
        if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) return null;
        const hostname = parsed.hostname.replace(/^\.+|\.+$/g, '');
        return hostname && /^[a-z0-9.-]+$/.test(hostname) ? hostname : null;
    } catch {
        return null;
    }
};

export const normalizeAnswerlatticeEvidenceHosts = (values: unknown): string[] => (
    Array.from(new Set((Array.isArray(values) ? values : [])
        .map(normalizeAnswerlatticeEvidenceHost)
        .filter((value): value is string => Boolean(value))))
        .slice(0, ANSWERLATTICE_EVIDENCE_MAX_HOSTS)
);

export const normalizeAnswerlatticeEvidenceLinks = (
    values: unknown,
    allowedHosts: unknown,
): AnswerlatticeDebugEvidenceLink[] => {
    const hosts = new Set(normalizeAnswerlatticeEvidenceHosts(allowedHosts));
    if (hosts.size === 0 || !Array.isArray(values)) return [];

    const links: AnswerlatticeDebugEvidenceLink[] = [];
    const seen = new Set<string>();
    for (const value of values.slice(0, ANSWERLATTICE_EVIDENCE_MAX_LINKS)) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
        const item = value as Record<string, unknown>;
        try {
            const parsed = new URL(String(item.url || ''));
            if (
                parsed.protocol !== 'https:'
                || parsed.username
                || parsed.password
                || parsed.port
                || !hosts.has(parsed.hostname.toLowerCase())
            ) continue;
            parsed.hash = '';
            const url = parsed.toString().slice(0, 1000);
            if (seen.has(url)) continue;
            seen.add(url);
            const label = normalizeIdentityText(item.label, 80);
            links.push({ url, ...(label ? { label } : {}) });
        } catch {
            continue;
        }
    }
    return links;
};
