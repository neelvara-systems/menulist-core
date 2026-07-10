import { appendPublicPath, getPublicBaseUrl } from '@constant/urls';
import {
    OWNER_REFERRAL_PROGRAM_VERSION,
    OWNER_REFERRAL_TOKEN_TTL_DAYS,
} from '@data/shared/ownerReferralPolicy';
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    hkdfSync,
    randomBytes,
} from 'crypto';
import type { OwnerReferralTokenPayload } from './ownerReferralTypes';

const OWNER_REFERRAL_TOKEN_PREFIX = `v${OWNER_REFERRAL_PROGRAM_VERSION}`;
const OWNER_REFERRAL_TOKEN_DOMAIN = `menulist-owner-referral-v${OWNER_REFERRAL_PROGRAM_VERSION}`;
const OWNER_REFERRAL_TOKEN_MAX_LENGTH = 1024;
const OWNER_REFERRAL_IV_BYTES = 12;
const OWNER_REFERRAL_AUTH_TAG_BYTES = 16;
const OWNER_REFERRAL_TOKEN_ID_BYTES = 16;

const normalizePositiveInteger = (value: unknown): number | null => {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const getOwnerReferralTokenKey = (): Buffer | null => {
    const encoded = String(process.env.MENULIST_OWNER_REFERRAL_TOKEN_SECRET || '').trim();
    if (!encoded || encoded.includes('=')) return null;

    try {
        const source = Buffer.from(encoded, 'base64url');
        if (source.length !== 32 || source.toString('base64url') !== encoded) return null;
        return Buffer.from(hkdfSync(
            'sha256',
            source,
            Buffer.alloc(0),
            Buffer.from(OWNER_REFERRAL_TOKEN_DOMAIN, 'utf8'),
            32,
        ));
    } catch {
        return null;
    }
};

export const canIssueOwnerReferralTokens = (): boolean => Boolean(getOwnerReferralTokenKey());

export const createOwnerReferralToken = (scope: {
    referrerTenantId: number;
    referrerStoreId: number;
}): { payload: OwnerReferralTokenPayload; token: string } => {
    const referrerTenantId = normalizePositiveInteger(scope.referrerTenantId);
    const referrerStoreId = normalizePositiveInteger(scope.referrerStoreId);
    const key = getOwnerReferralTokenKey();
    if (!referrerTenantId || !referrerStoreId || !key) {
        throw new Error('Owner referral token issuance is unavailable.');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: OwnerReferralTokenPayload = {
        version: OWNER_REFERRAL_PROGRAM_VERSION,
        referrerTenantId,
        referrerStoreId,
        issuedAt,
        expiresAt: issuedAt + (OWNER_REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60),
        tokenId: randomBytes(OWNER_REFERRAL_TOKEN_ID_BYTES).toString('base64url'),
    };
    const iv = randomBytes(OWNER_REFERRAL_IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: OWNER_REFERRAL_AUTH_TAG_BYTES });
    cipher.setAAD(Buffer.from(OWNER_REFERRAL_TOKEN_PREFIX, 'utf8'));
    const encrypted = Buffer.concat([
        cipher.update(JSON.stringify(payload), 'utf8'),
        cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
        payload,
        token: [
            OWNER_REFERRAL_TOKEN_PREFIX,
            iv.toString('base64url'),
            encrypted.toString('base64url'),
            tag.toString('base64url'),
        ].join('.'),
    };
};

export const validateOwnerReferralToken = (value: unknown): OwnerReferralTokenPayload | null => {
    if (typeof value !== 'string' || value.length === 0 || value.length > OWNER_REFERRAL_TOKEN_MAX_LENGTH) return null;
    const key = getOwnerReferralTokenKey();
    if (!key) return null;

    const parts = value.split('.');
    if (parts.length !== 4 || parts[0] !== OWNER_REFERRAL_TOKEN_PREFIX) return null;

    try {
        const iv = Buffer.from(parts[1], 'base64url');
        const encrypted = Buffer.from(parts[2], 'base64url');
        const tag = Buffer.from(parts[3], 'base64url');
        if (
            iv.length !== OWNER_REFERRAL_IV_BYTES
            || tag.length !== OWNER_REFERRAL_AUTH_TAG_BYTES
            || encrypted.length === 0
        ) {
            return null;
        }

        const decipher = createDecipheriv('aes-256-gcm', key, iv, { authTagLength: OWNER_REFERRAL_AUTH_TAG_BYTES });
        decipher.setAAD(Buffer.from(OWNER_REFERRAL_TOKEN_PREFIX, 'utf8'));
        decipher.setAuthTag(tag);
        const decoded = JSON.parse(Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]).toString('utf8')) as Partial<OwnerReferralTokenPayload>;
        const referrerTenantId = normalizePositiveInteger(decoded.referrerTenantId);
        const referrerStoreId = normalizePositiveInteger(decoded.referrerStoreId);
        const issuedAt = normalizePositiveInteger(decoded.issuedAt);
        const expiresAt = normalizePositiveInteger(decoded.expiresAt);
        const now = Math.floor(Date.now() / 1000);

        if (
            decoded.version !== OWNER_REFERRAL_PROGRAM_VERSION
            || !referrerTenantId
            || !referrerStoreId
            || !issuedAt
            || !expiresAt
            || expiresAt <= now
            || issuedAt > now + 300
            || expiresAt - issuedAt !== OWNER_REFERRAL_TOKEN_TTL_DAYS * 24 * 60 * 60
            || typeof decoded.tokenId !== 'string'
            || decoded.tokenId.length < 16
            || decoded.tokenId.length > 64
        ) {
            return null;
        }

        return {
            version: OWNER_REFERRAL_PROGRAM_VERSION,
            referrerTenantId,
            referrerStoreId,
            issuedAt,
            expiresAt,
            tokenId: decoded.tokenId,
        };
    } catch {
        return null;
    }
};

export const buildOwnerReferralInviteUrl = (token: string): string => (
    `${appendPublicPath(getPublicBaseUrl(), 'invite')}#r=${encodeURIComponent(token)}`
);

export const hashOwnerReferralEvidence = (value: string): string => (
    createHash('sha256').update(value).digest('hex')
);

export const getOwnerReferralDocumentId = (referredTenantId: number, referredStoreId: number): string => (
    hashOwnerReferralEvidence([
        `v${OWNER_REFERRAL_PROGRAM_VERSION}`,
        String(referredTenantId),
        String(referredStoreId),
    ].join(':'))
);

export const getOwnerReferralRewardIssueId = (referralId: string): string => (
    hashOwnerReferralEvidence(`owner-referral-reward:v${OWNER_REFERRAL_PROGRAM_VERSION}:${referralId}`)
);

export const getOwnerReferralRewardTransactionId = (
    rewardIssueId: string,
    role: 'referrer' | 'referred',
): string => `owner_referral_${rewardIssueId}_${role}`;
