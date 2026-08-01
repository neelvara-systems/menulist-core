import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import {
    normalizeSpecialMenuInstant,
    normalizeSpecialMenuScheduleRange,
    resolveNextSpecialMenuTransitionAt,
} from '../sharedData/specialMenuSchedule';

type SpecialMenuSchedulerAction = 'activate' | 'expire';

export type SpecialMenuSchedulerTransitionResult = {
    outcome: 'activated' | 'expired' | 'blocked' | 'noop' | 'repaired';
    projectId: string;
};

type SpecialMenuSchedulerTransitionParams = {
    action: SpecialMenuSchedulerAction;
    db: Firestore;
    enableTempStatus: boolean;
    now: Date;
    projectId: string;
    sId: string;
    tId: string;
};

type SpecialMenuStatus = 'scheduled' | 'active' | 'expired' | 'cancelled';

type SpecialMenuMetadata = {
    activatedAt?: string;
    baseProjectId: string;
    deactivatedAt?: string;
    displayName: string | Record<string, string>;
    endsAt: string;
    mode: 'replace' | 'overlay';
    startsAt: string;
    status: SpecialMenuStatus;
};

const NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;
const PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;
const SAFE_LOCALIZED_TEXT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SPECIAL_MENU_STATUSES = new Set<SpecialMenuStatus>([
    'scheduled',
    'active',
    'expired',
    'cancelled',
]);
const UNSAFE_SUMMARY_PATH_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function isSummaryRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isSafeSummaryPathSegment(value: string): boolean {
    return value.length > 0 && !UNSAFE_SUMMARY_PATH_SEGMENTS.has(value);
}

export function parseSpecialMenuSummaryProjects(
    data: unknown,
): Record<string, Record<string, unknown>> {
    if (!isSummaryRecord(data)) return {};
    const result: Record<string, Record<string, unknown>> = Object.create(null);

    if (isSummaryRecord(data.projects)) {
        for (const [projectId, projectData] of Object.entries(data.projects)) {
            if (isSafeSummaryPathSegment(projectId) && isSummaryRecord(projectData)) {
                result[projectId] = { ...projectData };
            }
        }
    }

    for (const [key, value] of Object.entries(data)) {
        if (!key.startsWith('projects.')) continue;
        const [projectId, ...fieldPath] = key.slice('projects.'.length).split('.');
        if (![projectId, ...fieldPath].every(isSafeSummaryPathSegment)) continue;
        if (!result[projectId]) result[projectId] = {};
        if (fieldPath.length === 0 && isSummaryRecord(value)) {
            result[projectId] = { ...result[projectId], ...value };
        } else if (fieldPath.length === 1) {
            result[projectId][fieldPath[0]] = value;
        }
    }

    return result;
}

function normalizeNumericDocumentId(value: unknown): string | null {
    if (typeof value !== 'string' || !NUMERIC_DOCUMENT_ID_PATTERN.test(value)) return null;
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric > 0 && String(numeric) === value
        ? value
        : null;
}

function normalizeProjectId(value: unknown, tId: string, sId: string): string | null {
    if (typeof value !== 'string' || value !== value.trim() || !PROJECT_ID_PATTERN.test(value)) return null;
    const segments = value.split('-');
    return segments.length >= 3 && segments[0] === tId && segments[segments.length - 1] === sId
        ? value
        : null;
}

function normalizeSpecialMenuMetadata(value: unknown): SpecialMenuMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<SpecialMenuMetadata>;
    const schedule = normalizeSpecialMenuScheduleRange(candidate.startsAt, candidate.endsAt);
    const activatedAt = candidate.activatedAt === undefined
        ? undefined
        : normalizeSpecialMenuInstant(candidate.activatedAt);
    const deactivatedAt = candidate.deactivatedAt === undefined
        ? undefined
        : normalizeSpecialMenuInstant(candidate.deactivatedAt);
    if (
        typeof candidate.baseProjectId !== 'string'
        || (candidate.mode !== 'replace' && candidate.mode !== 'overlay')
        || !schedule
        || !SPECIAL_MENU_STATUSES.has(candidate.status as SpecialMenuStatus)
        || (candidate.activatedAt !== undefined && !activatedAt)
        || (candidate.deactivatedAt !== undefined && !deactivatedAt)
        || (
            typeof candidate.displayName !== 'string'
            && (!candidate.displayName || typeof candidate.displayName !== 'object' || Array.isArray(candidate.displayName))
        )
    ) {
        return null;
    }
    return {
        ...candidate,
        endsAt: schedule.endsAt,
        startsAt: schedule.startsAt,
        ...(activatedAt ? { activatedAt } : {}),
        ...(deactivatedAt ? { deactivatedAt } : {}),
    } as SpecialMenuMetadata;
}

function resolveDisplayName(value: SpecialMenuMetadata['displayName']): string {
    if (typeof value === 'string') return value.trim();
    for (const [language, text] of Object.entries(value)) {
        if (!SAFE_LOCALIZED_TEXT_KEYS.has(language) && typeof text === 'string' && text.trim()) {
            return text.trim();
        }
    }
    return '';
}

function shouldClearSpecialMenuTempStatus(
    storeData: FirebaseFirestore.DocumentData,
    activeSpecialMenuId: string | null,
    projectId: string,
): boolean {
    if (storeData.tempStatus?.type !== 'special_menu') return false;
    const sourceProjectId = typeof storeData.tempStatus.sourceProjectId === 'string'
        ? storeData.tempStatus.sourceProjectId
        : null;
    return sourceProjectId === projectId
        || (activeSpecialMenuId === projectId && sourceProjectId === null);
}

function isLiveCompetingSpecialMenuProject(
    value: unknown,
    projectId: string,
    tId: string,
    sId: string,
    now: Date,
): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const projectData = value as Record<string, unknown>;
    if (
        (projectData.projectId !== undefined && projectData.projectId !== projectId)
        || (projectData.tId !== undefined && String(projectData.tId) !== tId)
        || (projectData.sId !== undefined && String(projectData.sId) !== sId)
        || projectData.deleted === true
        || projectData.active === false
    ) {
        return false;
    }

    const metadata = normalizeSpecialMenuMetadata(projectData._specialMenu);
    return Boolean(
        metadata
        && normalizeProjectId(metadata.baseProjectId, tId, sId)
        && metadata.status === 'active'
        && Date.parse(metadata.endsAt) > now.getTime()
    );
}

export async function transitionScheduledSpecialMenu(
    params: SpecialMenuSchedulerTransitionParams,
): Promise<SpecialMenuSchedulerTransitionResult> {
    const tId = normalizeNumericDocumentId(params.tId);
    const sId = normalizeNumericDocumentId(params.sId);
    const projectId = tId && sId ? normalizeProjectId(params.projectId, tId, sId) : null;
    if (!tId || !sId || !projectId) throw new Error('special_menu_scheduler_scope_invalid');
    if (!(params.now instanceof Date) || !Number.isFinite(params.now.getTime())) {
        throw new Error('special_menu_scheduler_time_invalid');
    }

    const projectRef = params.db.collection(DB_COLLECTIONS.PROJECTS)
        .doc(tId).collection(sId).doc(projectId);
    const storeRef = params.db.collection(DB_COLLECTIONS.STORES).doc(sId);
    const summaryRef = params.db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`projects_${sId}`);
    const nowIso = params.now.toISOString();

    return params.db.runTransaction(async (transaction) => {
        const projectSnapshot = await transaction.get(projectRef);
        const storeSnapshot = await transaction.get(storeRef);
        const summarySnapshot = await transaction.get(summaryRef);
        if (!projectSnapshot.exists) throw new Error('special_menu_scheduler_project_missing');
        if (!storeSnapshot.exists) throw new Error('special_menu_scheduler_store_missing');

        const projectData = projectSnapshot.data() || {};
        if (
            (projectData.projectId !== undefined && projectData.projectId !== projectId)
            || (projectData.tId !== undefined && String(projectData.tId) !== tId)
            || (projectData.sId !== undefined && String(projectData.sId) !== sId)
            || projectData.deleted === true
            || projectData.active === false
        ) {
            throw new Error('special_menu_scheduler_project_contract_invalid');
        }
        const metadata = normalizeSpecialMenuMetadata(projectData._specialMenu);
        if (!metadata) throw new Error('special_menu_scheduler_metadata_invalid');
        if (!normalizeProjectId(metadata.baseProjectId, tId, sId)) {
            throw new Error('special_menu_scheduler_base_scope_invalid');
        }

        const storeData = storeSnapshot.data() || {};
        const activeSpecialMenuId = typeof storeData.activeSpecialMenuId === 'string'
            ? storeData.activeSpecialMenuId
            : null;
        const summaryStatusField = `projects.${projectId}.specialMenuStatus`;
        const summaryProjects = parseSpecialMenuSummaryProjects(summarySnapshot.data());
        let hasLiveCompetingActiveMenu = false;
        if (
            params.action === 'activate'
            && activeSpecialMenuId
            && activeSpecialMenuId !== projectId
        ) {
            const competingProjectId = normalizeProjectId(activeSpecialMenuId, tId, sId);
            if (competingProjectId) {
                const competingProjectSnapshot = await transaction.get(
                    projectRef.parent.doc(competingProjectId),
                );
                hasLiveCompetingActiveMenu = competingProjectSnapshot.exists
                    && isLiveCompetingSpecialMenuProject(
                        competingProjectSnapshot.data(),
                        competingProjectId,
                        tId,
                        sId,
                        params.now,
                    );
            }
        }
        const buildSummaryUpdate = (
            lifecycleMetadata: SpecialMenuMetadata,
            status: SpecialMenuStatus,
        ): Record<string, unknown> => ({
            [summaryStatusField]: status,
            lastUpdated: FieldValue.serverTimestamp(),
            specialMenuNextTransitionAt: resolveNextSpecialMenuTransitionAt({
                ...summaryProjects,
                [projectId]: {
                    ...summaryProjects[projectId],
                    active: true,
                    deleted: false,
                    isSpecialMenu: true,
                    specialMenuEndsAt: lifecycleMetadata.endsAt,
                    specialMenuStartsAt: lifecycleMetadata.startsAt,
                    specialMenuStatus: status,
                },
            }) || FieldValue.delete(),
        });
        const clearOwnedStoreState = (): Record<string, unknown> => {
            const storeUpdate: Record<string, unknown> = {};
            if (activeSpecialMenuId === projectId) {
                storeUpdate.activeSpecialMenuId = FieldValue.delete();
            }
            if (shouldClearSpecialMenuTempStatus(storeData, activeSpecialMenuId, projectId)) {
                storeUpdate.tempStatus = FieldValue.delete();
            }
            return storeUpdate;
        };

        if (params.action === 'activate') {
            if (metadata.status === 'active') {
                if (hasLiveCompetingActiveMenu) {
                    transaction.set(summaryRef, buildSummaryUpdate(metadata, metadata.status), { merge: true });
                    return { outcome: 'blocked', projectId };
                }
                const displayName = resolveDisplayName(metadata.displayName);
                if (params.enableTempStatus && !displayName) {
                    throw new Error('special_menu_scheduler_display_name_invalid');
                }
                const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: projectId };
                if (params.enableTempStatus) {
                    storeUpdate.tempStatus = {
                        type: 'special_menu',
                        message: displayName,
                        expiresAt: metadata.endsAt,
                        createdAt: metadata.activatedAt || nowIso,
                        sourceProjectId: projectId,
                    };
                }
                transaction.set(storeRef, storeUpdate, { merge: true });
                transaction.set(summaryRef, buildSummaryUpdate(metadata, 'active'), { merge: true });
                return { outcome: 'repaired', projectId };
            }
            if (metadata.status !== 'scheduled') {
                transaction.set(summaryRef, buildSummaryUpdate(metadata, metadata.status), { merge: true });
                return { outcome: 'noop', projectId };
            }
            if (
                Date.parse(metadata.startsAt) > params.now.getTime()
                || Date.parse(metadata.endsAt) <= params.now.getTime()
            ) {
                transaction.set(summaryRef, buildSummaryUpdate(metadata, metadata.status), { merge: true });
                return { outcome: 'noop', projectId };
            }
            if (hasLiveCompetingActiveMenu) {
                transaction.set(summaryRef, buildSummaryUpdate(metadata, metadata.status), { merge: true });
                return { outcome: 'blocked', projectId };
            }

            const displayName = resolveDisplayName(metadata.displayName);
            if (params.enableTempStatus && !displayName) {
                throw new Error('special_menu_scheduler_display_name_invalid');
            }
            const nextMetadata: SpecialMenuMetadata = {
                ...metadata,
                activatedAt: nowIso,
                status: 'active',
            };
            const storeUpdate: Record<string, unknown> = { activeSpecialMenuId: projectId };
            if (params.enableTempStatus) {
                storeUpdate.tempStatus = {
                    type: 'special_menu',
                    message: displayName,
                    expiresAt: metadata.endsAt,
                    createdAt: nowIso,
                    sourceProjectId: projectId,
                };
            }

            transaction.set(projectRef, { _specialMenu: nextMetadata }, { merge: true });
            transaction.set(storeRef, storeUpdate, { merge: true });
            transaction.set(summaryRef, buildSummaryUpdate(nextMetadata, 'active'), { merge: true });
            return { outcome: 'activated', projectId };
        }

        if (metadata.status === 'expired') {
            const storeUpdate = clearOwnedStoreState();
            if (Object.keys(storeUpdate).length) {
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
            transaction.set(summaryRef, buildSummaryUpdate(metadata, 'expired'), { merge: true });
            return { outcome: 'repaired', projectId };
        }
        if (metadata.status === 'cancelled') {
            const storeUpdate = clearOwnedStoreState();
            if (Object.keys(storeUpdate).length) {
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
            transaction.set(summaryRef, buildSummaryUpdate(metadata, 'cancelled'), { merge: true });
            return { outcome: 'repaired', projectId };
        }
        if (Date.parse(metadata.endsAt) > params.now.getTime()) {
            transaction.set(summaryRef, buildSummaryUpdate(metadata, metadata.status), { merge: true });
            return { outcome: 'noop', projectId };
        }

        const nextMetadata: SpecialMenuMetadata = {
            ...metadata,
            deactivatedAt: nowIso,
            status: 'expired',
        };
        transaction.set(projectRef, { _specialMenu: nextMetadata }, { merge: true });
        transaction.set(summaryRef, buildSummaryUpdate(nextMetadata, 'expired'), { merge: true });

        if (!activeSpecialMenuId || activeSpecialMenuId === projectId) {
            const storeUpdate = clearOwnedStoreState();
            if (Object.keys(storeUpdate).length) {
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
        }

        return { outcome: 'expired', projectId };
    });
}
