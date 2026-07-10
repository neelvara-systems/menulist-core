import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import type { GrowthAcquisitionAttribution } from '@lib/growth/acquisitionAttribution';
import { normalizeGrowthAcquisitionAttribution } from '@lib/growth/acquisitionAttribution';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';

export type FounderGrowthEventStage = 'draft_created' | 'business_claimed';

const SUMMARY_DOC_ID = 'founderMonitorGrowth';

function normalizeDraftId(value: string): string | null {
    const draftId = String(value || '').trim();
    return draftId === value && isValidFirestoreDocumentId(draftId) ? draftId : null;
}

export async function recordFounderGrowthEvent(params: {
    attribution?: GrowthAcquisitionAttribution | null;
    draftId: string;
    occurredAt?: Date;
    stage: FounderGrowthEventStage;
}): Promise<{ recorded: boolean }> {
    const attribution = normalizeGrowthAcquisitionAttribution(params.attribution);
    const draftId = normalizeDraftId(params.draftId);
    if (!attribution || !draftId) return { recorded: false };

    const occurredAt = params.occurredAt || new Date();
    const FieldValue = admin.firestore.FieldValue;
    const draftRef = firestoreAdmin.collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS).doc(draftId);
    const summaryRef = firestoreAdmin.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(SUMMARY_DOC_ID);

    try {
        const recorded = await firestoreAdmin.runTransaction(async (transaction) => {
            const draftSnapshot = await transaction.get(draftRef);
            if (!draftSnapshot.exists) return false;

            const markerField = params.stage === 'draft_created'
                ? 'growthTelemetry.draftCreatedRecordedAt'
                : 'growthTelemetry.businessClaimedRecordedAt';
            const markerKey = params.stage === 'draft_created'
                ? 'draftCreatedRecordedAt'
                : 'businessClaimedRecordedAt';
            if (draftSnapshot.data()?.growthTelemetry?.[markerKey]) return false;

            const stageCounter = params.stage === 'draft_created' ? 'draftsCreated' : 'businessesClaimed';
            transaction.update(draftRef, {
                [markerField]: admin.firestore.Timestamp.fromDate(occurredAt),
            });
            transaction.set(summaryRef, {
                [stageCounter]: FieldValue.increment(1),
                bySource: {
                    [attribution.source]: {
                        [stageCounter]: FieldValue.increment(1),
                    },
                },
                latestEventAt: admin.firestore.Timestamp.fromDate(occurredAt),
                latestEventStage: params.stage,
                updatedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
            return true;
        });
        return { recorded };
    } catch (error) {
        logRuntimeFailure('founder_growth_event_record_failed', error, {
            hasAttribution: true,
            stage: params.stage,
        });
        return { recorded: false };
    }
}
