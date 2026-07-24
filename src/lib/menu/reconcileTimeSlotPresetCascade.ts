import {
    assertProjectPresetCascadeSucceeded,
    removePresetFromAllCategories,
    updatePresetInAllCategories,
} from '@database/projects';
import {
    assertTimeSlotPresetCascadeCompleted,
    completeTimeSlotPresetCascade,
} from '@database/stores';
import { normalizeTimeSlotPresetCascadePending } from '@lib/menu/timeSlotPresetBoundary';
import type { TimeSlotPresetCascadePending } from '@type/platform/store';

export type TimeSlotPresetCascadeScope = {
    tenantId: number;
    storeId: number;
};

export async function reconcileTimeSlotPresetCascade(
    scope: TimeSlotPresetCascadeScope,
    rawPending: TimeSlotPresetCascadePending,
): Promise<{ operationId: string; updatedProjects: number }> {
    if (
        !Number.isSafeInteger(scope.tenantId)
        || scope.tenantId <= 0
        || !Number.isSafeInteger(scope.storeId)
        || scope.storeId <= 0
    ) {
        throw new Error('time_slot_preset_cascade_scope_invalid');
    }
    const pending = normalizeTimeSlotPresetCascadePending(rawPending);
    if (!pending) throw new Error('time_slot_preset_cascade_pending_invalid');

    const cascadeResult = pending.mutation.type === 'remove'
        ? await removePresetFromAllCategories(pending.mutation.presetId, scope)
        : await updatePresetInAllCategories(pending.mutation.preset, scope);
    assertProjectPresetCascadeSucceeded(
        cascadeResult,
        'time_slot_preset_cascade_reconciliation_rejected',
    );

    const completionResult = await completeTimeSlotPresetCascade(
        scope.storeId,
        pending.operationId,
    );
    assertTimeSlotPresetCascadeCompleted(completionResult);
    if (completionResult.operationId !== pending.operationId) {
        throw new Error('time_slot_preset_cascade_completion_mismatch');
    }

    return {
        operationId: pending.operationId,
        updatedProjects: cascadeResult.updatedProjects,
    };
}
