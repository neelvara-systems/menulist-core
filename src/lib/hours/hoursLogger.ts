/**
 * Hours Logger - MOL logging for workingHours changes
 *
 * Feature #2A: Hours Status Display (P0)
 * Logs when workingHours is updated for audit trail
 *
 * @see __docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md
 */

import { logMOLEvent } from "@lib/pricing/molLogger";

/**
 * Log when workingHours changes
 */
export function logHoursUpdated(params: {
    storeId: number;
    before: Record<string, string> | null;
    after: Record<string, string>;
    actorUserId: string;
    tId: number;
    sId: number;
}): void {
    setImmediate(() => {
        logMOLEvent({
            type: "HOURS_WEEKLY_UPDATED",
            projectId: String(params.storeId),
            actorUserId: params.actorUserId,
            entityType: "STORE_HOURS",
            entityId: String(params.storeId),
            before: params.before ? { workingHours: params.before } : null,
            after: { workingHours: params.after },
            version: Date.now(),
            tId: params.tId,
            sId: params.sId,
        });
    });
}
