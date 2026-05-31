export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { ANSWERLATTICE_DB_COLLECTIONS } from '@constant/answerlattice/database';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES,
    getAnswerlatticeSettlementLocalTime,
    normalizeAnswerlatticeBusinessDayEndTime,
    normalizeAnswerlatticeTimeZone,
} from '@lib/answerlattice/schedulerSettings';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import type { AnswerlatticeOwnerOperationStatus } from '@type/answerlattice';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const RUN_LOG_READ_CAP = 5;
const VALID_STATUSES = new Set<AnswerlatticeOwnerOperationStatus>([
    'completed',
    'success',
    'partial',
    'running',
    'skipped',
    'not_started',
    'failed',
]);

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) return null;
    const tenantId = Number(scope.tenantId);
    const storeId = Number(scope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const toIso = (value: any): string | null => {
    if (!value) return null;
    const date = typeof value?.toDate === 'function'
        ? value.toDate()
        : typeof value?.seconds === 'number'
            ? new Date(value.seconds * 1000)
            : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeStatus = (value: any, fallback: AnswerlatticeOwnerOperationStatus | null = null): AnswerlatticeOwnerOperationStatus | null => {
    const status = String(value || '').trim() as AnswerlatticeOwnerOperationStatus;
    return VALID_STATUSES.has(status) ? status : fallback;
};

const ownerSafeError = (value: any): string | null => {
    const message = String(value || '').trim();
    return message ? 'Daily governance failed. Check platform logs.' : null;
};

const ownerSafeWorkspaceDetails = (value: any): Record<string, any> => {
    const details = value && typeof value === 'object' ? value : {};
    return {
        nightlyStatus: typeof details.nightlyStatus === 'string' ? details.nightlyStatus : null,
        tenantStatus: typeof details.tenantStatus === 'string' ? details.tenantStatus : null,
        taskCount: Number.isFinite(Number(details.taskCount)) ? Number(details.taskCount) : 0,
        errorCount: Number.isFinite(Number(details.errorCount)) ? Number(details.errorCount) : 0,
    };
};

const resolveSchedule = (storeData: Record<string, any>, stateData: Record<string, any>) => {
    const timeZone = normalizeAnswerlatticeTimeZone(storeData.timeZone || stateData.timeZone);
    const businessDayEndTime = normalizeAnswerlatticeBusinessDayEndTime(storeData.businessDayEndTime || stateData.businessDayEndTime);
    const settlementLocalTime = getAnswerlatticeSettlementLocalTime(businessDayEndTime);
    return {
        timeZone,
        businessDayEndTime,
        settlementLocalTime,
        settlementBufferMinutes: ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES,
        description: `After ${businessDayEndTime} + ${ANSWERLATTICE_SETTLEMENT_BUFFER_MINUTES} minutes in ${timeZone}`,
    };
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ACTIVATION_COMMAND_CENTER) {
        return NextResponse.json({ error: 'Answerlattice operations status is not enabled.' }, { status: 403 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });

    const rateLimit = await checkRateLimit({
        key: `answerlattice-operations-status:${scope.tenantId}:${scope.storeId}`,
        limit: 60,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const db = getAnswerlatticeDb();
    if (!db) return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });

    const { tenantId: tId, storeId: sId } = scope;

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(sId));
        const schedulerStateRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('answerlatticeSchedulerState');
        const workspaceStateRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`answerlatticeNightlyState_${tId}_${sId}`);

        const [storeSnap, schedulerStateSnap, workspaceStateSnap, runLogSnap] = await Promise.all([
            storeRef.get(),
            schedulerStateRef.get(),
            workspaceStateRef.get(),
            db.collection(ANSWERLATTICE_DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS)
                .orderBy('startedAt', 'desc')
                .limit(RUN_LOG_READ_CAP)
                .get()
        ]);

        if (!storeSnap.exists) return NextResponse.json({ error: 'Store not found' }, { status: 404 });
        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== tId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const schedulerState = schedulerStateSnap.exists ? schedulerStateSnap.data() || {} : {};
        const workspaceState = workspaceStateSnap.exists ? workspaceStateSnap.data() || {} : {};
        const governanceTask = schedulerState.tasks?.governance_nightly || {};
        const schedule = resolveSchedule(storeData, workspaceState);
        const latestRuns = (runLogSnap.docs || []).flatMap((docSnap: any) => {
            const data = docSnap.data() || {};
            const tenantRun = Array.isArray(data.tenantRuns)
                ? data.tenantRuns.find((run: any) => Number(run.tId) === tId && Number(run.sId) === sId)
                : null;
            if (!tenantRun) return [];
            return [{
                id: docSnap.id,
                status: normalizeStatus(data.status),
                trigger: data.trigger || null,
                startedAt: toIso(data.startedAt),
                completedAt: toIso(data.completedAt),
                durationMs: Number(data.durationMs || 0),
                tenantStatus: normalizeStatus(tenantRun.status),
                taskCount: Array.isArray(tenantRun.tasks) ? tenantRun.tasks.length : 0,
                errorCount: Array.isArray(tenantRun.errors) ? tenantRun.errors.length : 0,
                totals: {},
            }];
        });

        return NextResponse.json({
            operations: {
                schedule,
                masterScheduler: {
                    schedulerName: schedulerState.schedulerName || 'answerlatticeMasterScheduler',
                    updatedAt: toIso(schedulerState.updatedAt),
                    governanceTask: {
                        lastStatus: normalizeStatus(governanceTask.lastStatus),
                        lastRunId: governanceTask.lastRunId || null,
                        lastAttemptAt: toIso(governanceTask.lastAttemptAt),
                        lastFinishedAt: toIso(governanceTask.lastFinishedAt),
                        lastDurationMs: Number(governanceTask.lastDurationMs || 0),
                        lastActivity: governanceTask.lastActivity === true,
                        lastError: ownerSafeError(governanceTask.lastError),
                        lastDetails: {},
                    },
                },
                workspace: {
                    status: normalizeStatus(workspaceState.status, 'not_started') || 'not_started',
                    lastAttemptedLocalDate: workspaceState.lastAttemptedLocalDate || null,
                    lastAttemptedAt: toIso(workspaceState.lastAttemptedAt),
                    lastCompletedLocalDate: workspaceState.lastCompletedLocalDate || null,
                    lastCompletedAt: toIso(workspaceState.lastCompletedAt),
                    lastFailedLocalDate: workspaceState.lastFailedLocalDate || null,
                    lastFailedAt: toIso(workspaceState.lastFailedAt),
                    lastDetails: ownerSafeWorkspaceDetails(workspaceState.lastDetails),
                },
                latestRuns,
                readModel: {
                    firestoreReads: 3 + RUN_LOG_READ_CAP,
                    source: 'store + platformSummary scheduler state + workspace state + capped scheduler logs',
                    runLogReadCap: RUN_LOG_READ_CAP,
                    workspaceRunMatches: latestRuns.length,
                },
            },
        }, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        secureError('[Answerlattice Operations] Failed to load scheduler status', error as Error, { tId, sId });
        return NextResponse.json({ error: 'Failed to load operations status' }, { status: 500 });
    }
});
