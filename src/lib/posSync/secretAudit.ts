import { logMOLEvent } from "@lib/pricing/molLogger";

interface PosSyncSecretRotationAuditParams {
    actorEmail?: string;
    actorUserId?: string;
    rotatedAt: string;
    storeId?: number | string | null;
    tenantId?: number | string | null;
}

export function logPosSyncSecretRotationAudit({
    actorEmail,
    actorUserId,
    rotatedAt,
    storeId,
    tenantId,
}: PosSyncSecretRotationAuditParams): void {
    const tId = Number(tenantId);
    const sId = Number(storeId);

    if (!Number.isFinite(tId) || !Number.isFinite(sId)) return;

    void logMOLEvent({
        type: "POS_SYNC_SECRET_REGENERATED",
        projectId: String(storeId),
        actorUserId: actorUserId || actorEmail || "unknown",
        entityType: "POS_SYNC",
        entityId: String(storeId),
        before: null,
        after: {
            rotatedAt,
            rotatedByEmail: actorEmail || null,
        },
        version: Date.now(),
        tId,
        sId,
    });
}
