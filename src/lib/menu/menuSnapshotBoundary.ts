/** Firestore documents are limited to 1 MiB; keep space for encoding overhead. */
export const MENU_SNAPSHOT_MAX_ESTIMATED_BYTES = 900 * 1024;

export function getMenuSnapshotPayloadSizeBytes(payload: unknown): number {
    try {
        const serialized = JSON.stringify(payload);
        return typeof serialized === 'string'
            ? new TextEncoder().encode(serialized).byteLength
            : Number.POSITIVE_INFINITY;
    } catch {
        return Number.POSITIVE_INFINITY;
    }
}

export function isMenuSnapshotPayloadWithinLimit(payload: unknown): boolean {
    return getMenuSnapshotPayloadSizeBytes(payload) <= MENU_SNAPSHOT_MAX_ESTIMATED_BYTES;
}
