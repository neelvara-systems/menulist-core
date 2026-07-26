import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeMultiOutletNumericDocumentId } from '@lib/multiOutlet/projectIdBoundary';
import type {
    PlatformBlockDetails,
    PlatformBlockEntityType,
} from '@type/platform/blocking';

export type PlatformEntityBlockAcknowledgement = Readonly<{
    blocked: boolean;
    blockDetails: PlatformBlockDetails;
    id?: string;
    storeId?: number;
    tenantId?: number;
}>;

const ENTITY_KEYS = new Set(['blocked', 'blockDetails', 'id', 'storeId', 'tenantId']);
const BLOCK_DETAIL_KEYS = new Set([
    'blocked',
    'reason',
    'source',
    'blockedAt',
    'blockedByUserId',
    'blockedByEmail',
    'blockedReason',
    'unblockedAt',
    'unblockedByUserId',
    'unblockedByEmail',
    'unblockedReason',
    'updatedAt',
    'updatedByUserId',
    'updatedByEmail',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const boundedString = (value: unknown, maxLength: number): string | null => (
    typeof value === 'string' && value.length > 0 && value.length <= maxLength ? value : null
);

const parseBlockDetails = (value: unknown, blocked: boolean): PlatformBlockDetails | null => {
    if (!isRecord(value) || Object.keys(value).some((key) => !BLOCK_DETAIL_KEYS.has(key))) return null;
    const reason = boundedString(value.reason, 500);
    const updatedAt = boundedString(value.updatedAt, 64);
    if (
        value.blocked !== blocked
        || value.source !== 'platform_settings'
        || !reason
        || !updatedAt
    ) {
        return null;
    }
    const optionalFields = Array.from(BLOCK_DETAIL_KEYS).filter((field) => (
        !['blocked', 'reason', 'source', 'updatedAt'].includes(field)
    ));
    if (optionalFields.some((field) => value[field] !== undefined && !boundedString(value[field], 500))) {
        return null;
    }
    return {
        blocked,
        reason,
        source: 'platform_settings',
        updatedAt,
        ...(typeof value.blockedAt === 'string' ? { blockedAt: value.blockedAt } : {}),
        ...(typeof value.blockedByUserId === 'string' ? { blockedByUserId: value.blockedByUserId } : {}),
        ...(typeof value.blockedByEmail === 'string' ? { blockedByEmail: value.blockedByEmail } : {}),
        ...(typeof value.blockedReason === 'string' ? { blockedReason: value.blockedReason } : {}),
        ...(typeof value.unblockedAt === 'string' ? { unblockedAt: value.unblockedAt } : {}),
        ...(typeof value.unblockedByUserId === 'string' ? { unblockedByUserId: value.unblockedByUserId } : {}),
        ...(typeof value.unblockedByEmail === 'string' ? { unblockedByEmail: value.unblockedByEmail } : {}),
        ...(typeof value.unblockedReason === 'string' ? { unblockedReason: value.unblockedReason } : {}),
        ...(typeof value.updatedByUserId === 'string' ? { updatedByUserId: value.updatedByUserId } : {}),
        ...(typeof value.updatedByEmail === 'string' ? { updatedByEmail: value.updatedByEmail } : {}),
    };
};

const normalizeExpectedId = (
    entityType: PlatformBlockEntityType,
    value: unknown,
): string | null => {
    if (entityType === 'tenant' || entityType === 'store') {
        return normalizeMultiOutletNumericDocumentId(value)?.documentId || null;
    }
    return isValidFirestoreDocumentId(value) && value === value.trim() ? value : null;
};

export const buildPlatformEntityBlockAcknowledgement = ({
    blocked,
    blockDetails,
    entityId,
    entityType,
}: {
    blocked: boolean;
    blockDetails: PlatformBlockDetails;
    entityId: string | number;
    entityType: PlatformBlockEntityType;
}): Record<string, unknown> => ({
    blocked,
    blockDetails,
    [entityType === 'tenant' ? 'tenantId' : entityType === 'store' ? 'storeId' : 'id']: entityId,
});

export const parsePlatformEntityBlockAcknowledgement = (
    value: unknown,
    expected: {
        blocked: boolean;
        entityId: string | number;
        entityType: PlatformBlockEntityType;
    },
): PlatformEntityBlockAcknowledgement | null => {
    if (!isRecord(value) || Object.keys(value).some((key) => !ENTITY_KEYS.has(key))) return null;
    const idField = expected.entityType === 'tenant' ? 'tenantId' : expected.entityType === 'store' ? 'storeId' : 'id';
    const expectedId = normalizeExpectedId(expected.entityType, expected.entityId);
    const actualId = normalizeExpectedId(expected.entityType, value[idField]);
    const blockDetails = parseBlockDetails(value.blockDetails, expected.blocked);
    if (!expectedId || actualId !== expectedId || value.blocked !== expected.blocked || !blockDetails) return null;
    return {
        blocked: expected.blocked,
        blockDetails,
        [idField]: expected.entityType === 'user' ? actualId : Number(actualId),
    };
};
