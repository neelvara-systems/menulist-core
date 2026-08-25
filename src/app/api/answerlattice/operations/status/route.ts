export const dynamic = 'force-dynamic';

import {
    FEATURE_FLAGS } from '@config/features';
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
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { normalizeAnswerlatticeOperationsMetric } from '@lib/answerlattice/activationDashboardResponseClient';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    normalizeAnswerlatticeScopeDocumentId,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
    resolveAnswerlatticeSessionScope,
    } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin,
} from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
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
    return { tenantId: scope.tenantId, storeId: scope.storeId };
};

const getAnswerlatticeDb = () => {
    return answerlatticeFirestoreAdmin;
};

const toIso = (value: unknown): string | null => {
    if (!value) return null;
    let date: Date;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
        date = new Date(value);
    } else if (typeof value === 'object') {
        const timestamp = value as { seconds?: unknown; toDate?: unknown };
        try {
            if (typeof timestamp.toDate === 'function') {
                const projected = timestamp.toDate.call(value);
                if (!(projected instanceof Date)) return null;
                date = projected;
            } else if (typeof timestamp.seconds === 'number' && Number.isFinite(timestamp.seconds)) {
                date = new Date(timestamp.seconds * 1000);
            } else {
                return null;
            }
        } catch {
            return null;
        }
    } else {
        return null;
    }
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const normalizeStatus = (value: unknown, fallback: AnswerlatticeOwnerOperationStatus | null = null): AnswerlatticeOwnerOperationStatus | null => {
    const status = String(value || '').trim() as AnswerlatticeOwnerOperationStatus;
    return VALID_STATUSES.has(status) ? status : fallback;
};

const ownerSafeError = (value: unknown): string | null => {
    const message = String(value || '').trim();
    return message ? 'Daily governance failed. Check platform logs.' : null;
};

const ownerSafeWorkspaceDetails = (value: unknown) => {
    const details = value && typeof value === 'object' ? value : {};
    const record = details as Record<string, unknown>;
    return {
        nightlyStatus: typeof record.nightlyStatus === 'string' ? record.nightlyStatus.slice(0, 80) : null,
        tenantStatus: typeof record.tenantStatus === 'string' ? record.tenantStatus.slice(0, 80) : null,
        taskCount: normalizeAnswerlatticeOperationsMetric(record.taskCount, 1_000_000),
        errorCount: normalizeAnswerlatticeOperationsMetric(record.errorCount, 1_000_000),
    };
};

const resolveSchedule = (storeData: Record<string, unknown>, stateData: Record<string, unknown>) => {
    const timeZone = normalizeAnswerlatticeTimeZone(
        typeof storeData.timeZone === 'string'
            ? storeData.timeZone
            : typeof stateData.timeZone === 'string' ? stateData.timeZone : undefined,
    );
    const businessDayEndTime = normalizeAnswerlatticeBusinessDayEndTime(
        typeof storeData.businessDayEndTime === 'string'
            ? storeData.businessDayEndTime
            : typeof stateData.businessDayEndTime === 'string' ? stateData.businessDayEndTime : undefined,
    );
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

    const scope = resolveSessionScope(session);
    if (!scope) return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!actorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(
            'answerlattice-operations-status',
            actorId,
            scope.tenantId,
            scope.storeId,
        ),
        limit: 60,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const providerUnavailable = rateLimit.reason === 'provider_unavailable';
        return NextResponse.json(
            { error: providerUnavailable ? 'Operations status is temporarily unavailable' : 'Too many requests' },
            { status: providerUnavailable ? 503 : 429 },
        );
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS);
    if (permission.response) return permission.response;

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
        const storeTenantId = normalizeConsistentAnswerlatticeScopeDocumentIds([
            storeData.tenantId,
            storeData.tId,
        ]);
        if (storeTenantId !== tId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const schedulerState = schedulerStateSnap.exists ? schedulerStateSnap.data() || {} : {};
        const workspaceState = workspaceStateSnap.exists ? workspaceStateSnap.data() || {} : {};
        const governanceTask = schedulerState.tasks?.governance_nightly || {};
        const schedule = resolveSchedule(storeData, workspaceState);
        const latestRuns = (runLogSnap.docs || []).flatMap((docSnap: FirebaseFirestore.QueryDocumentSnapshot) => {
            const data = docSnap.data() || {};
            const tenantRun = Array.isArray(data.tenantRuns)
                ? data.tenantRuns.find((run: unknown) => {
                    const record = run && typeof run === 'object' ? run as Record<string, unknown> : {};
                    return normalizeAnswerlatticeScopeDocumentId(record.tId) === tId
                        && normalizeAnswerlatticeScopeDocumentId(record.sId) === sId;
                }) as Record<string, unknown> | undefined
                : null;
            if (!tenantRun) return [];
            return [{
                id: docSnap.id,
                status: normalizeStatus(data.status),
                trigger: data.trigger || null,
                startedAt: toIso(data.startedAt),
                completedAt: toIso(data.completedAt),
                durationMs: normalizeAnswerlatticeOperationsMetric(data.durationMs),
                tenantStatus: normalizeStatus(tenantRun.status),
                taskCount: normalizeAnswerlatticeOperationsMetric(
                    tenantRun.taskCount ?? (Array.isArray(tenantRun.tasks) ? tenantRun.tasks.length : 0),
                ),
                errorCount: normalizeAnswerlatticeOperationsMetric(
                    tenantRun.errorCount ?? (Array.isArray(tenantRun.errors) ? tenantRun.errors.length : 0),
                ),
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
                        lastDurationMs: normalizeAnswerlatticeOperationsMetric(governanceTask.lastDurationMs),
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
        logRuntimeFailure('answerlattice_operations_status_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return NextResponse.json({ error: 'Failed to load operations status' }, { status: 500 });
    }
});
