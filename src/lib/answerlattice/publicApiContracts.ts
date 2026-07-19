import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
import type { StorePublicApiCredentialScope } from '@type/platform/store';
import { z } from 'zod';

export const ANSWERLATTICE_PUBLIC_API_PURPOSE = 'answerlattice_public_api' as const;
export const ANSWERLATTICE_PUBLIC_API_SCOPES = ['public:read', 'signals:write', 'mcp:read'] as const;
export const ANSWERLATTICE_PUBLIC_ENTITY_STATUSES = ['active', 'beta'] as const;
export const ANSWERLATTICE_PUBLIC_SIGNAL_TYPES = [
    ANSWERLATTICE_SIGNAL_TYPE.TICKET,
    ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE,
    ANSWERLATTICE_SIGNAL_TYPE.ESCALATION,
    ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK,
    ANSWERLATTICE_SIGNAL_TYPE.GUIDED_RESOLUTION,
] as const;

export type AnswerlatticePublicApiScope = typeof ANSWERLATTICE_PUBLIC_API_SCOPES[number];
export type AnswerlatticePublicEntityStatus = typeof ANSWERLATTICE_PUBLIC_ENTITY_STATUSES[number];
export type AnswerlatticePublicSignalType = typeof ANSWERLATTICE_PUBLIC_SIGNAL_TYPES[number];

const ANSWERLATTICE_PUBLIC_API_SCOPE_SET = new Set<string>(ANSWERLATTICE_PUBLIC_API_SCOPES);
const ANSWERLATTICE_PUBLIC_SIGNAL_METADATA_RESERVED_KEYS = new Set([
    'createdBy',
    'externalId',
    'idempotencyKey',
    'modifiedBy',
    'requestId',
    'source',
    'uId',
    'userId',
]);

export const AnswerlatticePublicApiKeyActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('generate'),
        scopes: z.array(z.enum(ANSWERLATTICE_PUBLIC_API_SCOPES))
            .min(1)
            .max(ANSWERLATTICE_PUBLIC_API_SCOPES.length)
            .refine((scopes) => new Set(scopes).size === scopes.length, 'Scopes must be unique'),
    }).strict(),
    z.object({
        action: z.literal('revoke'),
    }).strict(),
]);

export const AnswerlatticePublicApiKeySummarySchema = z.object({
    keyPrefix: z.string().trim().min(4).max(12),
    createdAt: z.string().datetime(),
    scopes: z.array(z.enum(ANSWERLATTICE_PUBLIC_API_SCOPES))
        .min(1)
        .max(ANSWERLATTICE_PUBLIC_API_SCOPES.length),
}).strict();

export type AnswerlatticePublicApiKeySummary = z.infer<typeof AnswerlatticePublicApiKeySummarySchema>;

export const AnswerlatticePublicApiKeyStatusResponseSchema = z.object({
    credential: AnswerlatticePublicApiKeySummarySchema.nullable(),
}).strict();

export const AnswerlatticePublicApiKeyGeneratedResponseSchema = z.object({
    apiKey: z.string().regex(/^al_[A-Za-z0-9_-]{20,128}$/),
    credential: AnswerlatticePublicApiKeySummarySchema,
}).strict();

export const AnswerlatticePublicApiKeyRevokedResponseSchema = z.object({
    success: z.literal(true),
    credential: z.null(),
}).strict();

export function normalizeAnswerlatticePublicApiScopes(value: unknown): AnswerlatticePublicApiScope[] {
    if (!Array.isArray(value)) return [];
    const normalized = new Set<AnswerlatticePublicApiScope>();
    value.forEach((scope) => {
        if (typeof scope === 'string' && ANSWERLATTICE_PUBLIC_API_SCOPE_SET.has(scope)) {
            normalized.add(scope as AnswerlatticePublicApiScope);
        }
    });
    return ANSWERLATTICE_PUBLIC_API_SCOPES.filter((scope) => normalized.has(scope));
}

export function isAnswerlatticePublicApiCredentialInScope(
    credential: Record<string, unknown> | undefined,
    requiredScope: StorePublicApiCredentialScope,
): boolean {
    if (
        !credential
        || credential.productId !== PRODUCT_IDS.ANSWERLATTICE
        || credential.purpose !== ANSWERLATTICE_PUBLIC_API_PURPOSE
        || !Array.isArray(credential.scopes)
    ) return false;

    const normalizedScopes = normalizeAnswerlatticePublicApiScopes(credential.scopes);
    return normalizedScopes.length === credential.scopes.length
        && normalizedScopes.includes(requiredScope as AnswerlatticePublicApiScope);
}

export function buildAnswerlatticePublicApiKeySummary(
    credential: Record<string, unknown> | undefined,
): AnswerlatticePublicApiKeySummary | null {
    if (!credential) return null;
    if (
        credential.productId !== PRODUCT_IDS.ANSWERLATTICE
        || credential.purpose !== ANSWERLATTICE_PUBLIC_API_PURPOSE
        || typeof credential.apiKeyHash !== 'string'
        || !/^[a-f0-9]{64}$/.test(credential.apiKeyHash)
        || typeof credential.keyPrefix !== 'string'
        || !/^al_[A-Za-z0-9_-]{1,9}$/.test(credential.keyPrefix)
        || !Array.isArray(credential.scopes)
    ) return null;

    const scopes = normalizeAnswerlatticePublicApiScopes(credential.scopes);
    if (scopes.length !== credential.scopes.length) return null;

    const parsed = AnswerlatticePublicApiKeySummarySchema.safeParse({
        keyPrefix: credential.keyPrefix,
        createdAt: credential.createdAt,
        scopes,
    });
    return parsed.success ? parsed.data : null;
}

export function sanitizeAnswerlatticePublicSignalMetadata(
    metadata: Record<string, unknown> | undefined,
): Record<string, string | number | boolean | null | Array<string | number | boolean>> {
    if (!metadata) return {};

    const sanitized: Record<string, string | number | boolean | null | Array<string | number | boolean>> = {};
    const entries = Object.entries(metadata).slice(0, 20);
    for (const [key, value] of entries) {
        const safeKey = key.trim().replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 60);
        if (!safeKey || ANSWERLATTICE_PUBLIC_SIGNAL_METADATA_RESERVED_KEYS.has(safeKey)) continue;

        if (typeof value === 'string') {
            sanitized[safeKey] = value.trim().slice(0, 500);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[safeKey] = value;
        } else if (value === null) {
            sanitized[safeKey] = null;
        } else if (Array.isArray(value)) {
            sanitized[safeKey] = value
                .filter((item): item is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof item))
                .slice(0, 20)
                .map((item) => (typeof item === 'string' ? item.slice(0, 180) : item));
        }
    }

    return sanitized;
}
