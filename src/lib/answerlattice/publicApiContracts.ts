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

export type AnswerlatticePublicEntityQueryPredicate =
    | { field: 'type'; operator: '=='; value: string }
    | {
        field: 'status';
        operator: '==' | 'in';
        value: AnswerlatticePublicEntityStatus | AnswerlatticePublicEntityStatus[];
    };

export function buildAnswerlatticePublicEntityQueryPredicates(
    type: string | undefined,
    status: AnswerlatticePublicEntityStatus | undefined,
): AnswerlatticePublicEntityQueryPredicate[] {
    const predicates: AnswerlatticePublicEntityQueryPredicate[] = [];
    if (type) predicates.push({ field: 'type', operator: '==', value: type });
    predicates.push(status
        ? { field: 'status', operator: '==', value: status }
        : {
            field: 'status',
            operator: 'in',
            value: [...ANSWERLATTICE_PUBLIC_ENTITY_STATUSES],
        });
    return predicates;
}

export function toAnswerlatticePublicIsoTimestamp(value: unknown): string | null {
    const millis = toAnswerlatticePublicTimestampMillis(value);
    return millis === null ? null : new Date(millis).toISOString();
}

export function toAnswerlatticePublicTimestampMillis(value: unknown): number | null {
    try {
        if (typeof value === 'string') {
            const parsed = new Date(value);
            return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
        }
        if (value instanceof Date) {
            return Number.isFinite(value.getTime()) ? value.getTime() : null;
        }
        if (!value || (typeof value !== 'object' && typeof value !== 'function')) return null;

        const timestamp = value as { toDate?: unknown; toMillis?: unknown };
        const toDate = timestamp.toDate;
        if (typeof toDate === 'function') {
            const date = toDate.call(value);
            return date instanceof Date && Number.isFinite(date.getTime()) ? date.getTime() : null;
        }

        const toMillis = timestamp.toMillis;
        if (typeof toMillis === 'function') {
            const millis = toMillis.call(value);
            if (typeof millis !== 'number' || !Number.isFinite(millis)) return null;
            return Number.isFinite(new Date(millis).getTime()) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

export const AnswerlatticePublicApiManagementScopeSchema = z.object({
    tenantId: z.number().int().positive(),
    storeId: z.number().int().positive(),
}).strict();

export type AnswerlatticePublicApiManagementScope = z.infer<typeof AnswerlatticePublicApiManagementScopeSchema>;

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
        apiKey: z.string().regex(/^al_[A-Za-z0-9_-]{20,128}$/),
        requestId: z.string().uuid(),
        expectedScope: AnswerlatticePublicApiManagementScopeSchema,
        scopes: z.array(z.enum(ANSWERLATTICE_PUBLIC_API_SCOPES))
            .min(1)
            .max(ANSWERLATTICE_PUBLIC_API_SCOPES.length)
            .refine((scopes) => new Set(scopes).size === scopes.length, 'Scopes must be unique'),
    }).strict(),
    z.object({
        action: z.literal('revoke'),
        expectedScope: AnswerlatticePublicApiManagementScopeSchema,
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

export type AnswerlatticePublicApiKeyRotationReplay =
    | { kind: 'new' }
    | { kind: 'replay'; summary: AnswerlatticePublicApiKeySummary }
    | { kind: 'conflict' };

export const AnswerlatticePublicApiKeyStatusResponseSchema = z.object({
    credential: AnswerlatticePublicApiKeySummarySchema.nullable(),
    scope: AnswerlatticePublicApiManagementScopeSchema,
}).strict();

export const AnswerlatticePublicApiKeyGeneratedResponseSchema = z.object({
    apiKey: z.string().regex(/^al_[A-Za-z0-9_-]{20,128}$/),
    credential: AnswerlatticePublicApiKeySummarySchema,
    scope: AnswerlatticePublicApiManagementScopeSchema,
}).strict();

export const AnswerlatticePublicApiKeyRevokedResponseSchema = z.object({
    success: z.literal(true),
    credential: z.null(),
    scope: AnswerlatticePublicApiManagementScopeSchema,
}).strict();

export function answerlatticePublicApiManagementScopesMatch(
    expected: AnswerlatticePublicApiManagementScope,
    authoritative: AnswerlatticePublicApiManagementScope,
): boolean {
    return expected.tenantId === authoritative.tenantId
        && expected.storeId === authoritative.storeId;
}

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

export function classifyAnswerlatticePublicApiKeyRotationReplay(
    existingCredential: Record<string, unknown> | undefined,
    request: {
        apiKeyHash: string;
        requestId: string;
        scopes: AnswerlatticePublicApiScope[];
    },
): AnswerlatticePublicApiKeyRotationReplay {
    if (!existingCredential || existingCredential.rotationRequestId !== request.requestId) {
        return { kind: 'new' };
    }

    const summary = buildAnswerlatticePublicApiKeySummary(existingCredential);
    const existingScopes = normalizeAnswerlatticePublicApiScopes(existingCredential.scopes);
    if (
        !summary
        || existingCredential.apiKeyHash !== request.apiKeyHash
        || existingScopes.length !== request.scopes.length
        || existingScopes.some((scope, index) => scope !== request.scopes[index])
    ) {
        return { kind: 'conflict' };
    }

    return { kind: 'replay', summary };
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
        } else if (typeof value === 'number') {
            if (Number.isFinite(value)) sanitized[safeKey] = value;
        } else if (typeof value === 'boolean') {
            sanitized[safeKey] = value;
        } else if (value === null) {
            sanitized[safeKey] = null;
        } else if (Array.isArray(value)) {
            sanitized[safeKey] = value
                .filter((item): item is string | number | boolean => (
                    typeof item === 'string'
                    || typeof item === 'boolean'
                    || (typeof item === 'number' && Number.isFinite(item))
                ))
                .slice(0, 20)
                .map((item) => (typeof item === 'string' ? item.slice(0, 180) : item));
        }
    }

    return sanitized;
}
