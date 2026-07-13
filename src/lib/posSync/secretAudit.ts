import { normalizeMenuChangeLogScope } from "@database/menuChangeLog/menuChangeLogBoundary";
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
    const scope = normalizeMenuChangeLogScope({ tId: tenantId, sId: storeId });
    if (!scope) return;

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
        tId: scope.tId,
        sId: scope.sId,
    });
}
