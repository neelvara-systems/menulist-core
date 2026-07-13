type FirestoreTimestampLike = {
    toDate: () => Date;
};

const hasOwn = (value: Record<string, unknown>, key: string): boolean => (
    Object.prototype.hasOwnProperty.call(value, key)
);

function serializeVisibleFirestoreValue(value: unknown): unknown {
    if (value === null) return null;
    if (value === undefined) return undefined;

    if (
        typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
    ) {
        return value;
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (
        typeof value === 'object'
        && typeof (value as Partial<FirestoreTimestampLike>).toDate === 'function'
    ) {
        return (value as FirestoreTimestampLike).toDate().toISOString();
    }

    if (Array.isArray(value)) {
        return value.map(serializeVisibleFirestoreValue);
    }

    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).flatMap(([key, entry]) => {
                const serialized = serializeVisibleFirestoreValue(entry);
                return serialized === undefined ? [] : [[key, serialized]];
            }),
        );
    }

    return undefined;
}

/**
 * Project one AI-operation document into a role-specific response row.
 *
 * Only allowlisted fields are read and serialized. The Firestore document ID
 * is appended last so persisted legacy data cannot replace the canonical ID.
 */
export function projectAiOperationHistoryFields({
    data,
    documentId,
    visibleFields,
}: {
    data: Record<string, unknown>;
    documentId: string;
    visibleFields: ReadonlySet<string>;
}): Record<string, unknown> {
    const projected: Record<string, unknown> = {};

    visibleFields.forEach((key) => {
        if (key === 'id' || !hasOwn(data, key)) return;

        const serialized = serializeVisibleFirestoreValue(data[key]);
        if (serialized !== undefined) {
            projected[key] = serialized;
        }
    });

    projected.id = documentId;
    return projected;
}
