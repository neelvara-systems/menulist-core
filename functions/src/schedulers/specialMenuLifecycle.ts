import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';

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
    if (
        typeof candidate.baseProjectId !== 'string'
        || (candidate.mode !== 'replace' && candidate.mode !== 'overlay')
        || typeof candidate.startsAt !== 'string'
        || candidate.startsAt.length > 64
        || !Number.isFinite(Date.parse(candidate.startsAt))
        || typeof candidate.endsAt !== 'string'
        || candidate.endsAt.length > 64
        || !Number.isFinite(Date.parse(candidate.endsAt))
        || Date.parse(candidate.endsAt) <= Date.parse(candidate.startsAt)
        || !SPECIAL_MENU_STATUSES.has(candidate.status as SpecialMenuStatus)
        || (candidate.activatedAt !== undefined && (
            typeof candidate.activatedAt !== 'string'
            || candidate.activatedAt.length > 64
            || !Number.isFinite(Date.parse(candidate.activatedAt))
        ))
        || (candidate.deactivatedAt !== undefined && (
            typeof candidate.deactivatedAt !== 'string'
            || candidate.deactivatedAt.length > 64
            || !Number.isFinite(Date.parse(candidate.deactivatedAt))
        ))
        || (
            typeof candidate.displayName !== 'string'
            && (!candidate.displayName || typeof candidate.displayName !== 'object' || Array.isArray(candidate.displayName))
        )
    ) {
        return null;
    }
    return candidate as SpecialMenuMetadata;
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

        if (params.action === 'activate') {
            if (metadata.status === 'active') {
                if (activeSpecialMenuId && activeSpecialMenuId !== projectId) {
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
                transaction.set(summaryRef, {
                    [summaryStatusField]: 'active',
                    lastUpdated: FieldValue.serverTimestamp(),
                }, { merge: true });
                return { outcome: 'repaired', projectId };
            }
            if (metadata.status !== 'scheduled') return { outcome: 'noop', projectId };
            if (
                Date.parse(metadata.startsAt) > params.now.getTime()
                || Date.parse(metadata.endsAt) <= params.now.getTime()
            ) {
                return { outcome: 'noop', projectId };
            }
            if (activeSpecialMenuId && activeSpecialMenuId !== projectId) {
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
            transaction.set(summaryRef, {
                [summaryStatusField]: 'active',
                lastUpdated: FieldValue.serverTimestamp(),
            }, { merge: true });
            return { outcome: 'activated', projectId };
        }

        if (metadata.status === 'expired') {
            const storeUpdate: Record<string, unknown> = {};
            if (activeSpecialMenuId === projectId) {
                storeUpdate.activeSpecialMenuId = FieldValue.delete();
            }
            if (shouldClearSpecialMenuTempStatus(storeData, activeSpecialMenuId, projectId)) {
                storeUpdate.tempStatus = FieldValue.delete();
            }
            if (Object.keys(storeUpdate).length) {
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
            transaction.set(summaryRef, {
                [summaryStatusField]: 'expired',
                lastUpdated: FieldValue.serverTimestamp(),
            }, { merge: true });
            return { outcome: 'repaired', projectId };
        }
        if (
            metadata.status === 'cancelled'
            || Date.parse(metadata.endsAt) > params.now.getTime()
        ) {
            return { outcome: 'noop', projectId };
        }

        const nextMetadata: SpecialMenuMetadata = {
            ...metadata,
            deactivatedAt: nowIso,
            status: 'expired',
        };
        transaction.set(projectRef, { _specialMenu: nextMetadata }, { merge: true });
        transaction.set(summaryRef, {
            [summaryStatusField]: 'expired',
            lastUpdated: FieldValue.serverTimestamp(),
        }, { merge: true });

        if (!activeSpecialMenuId || activeSpecialMenuId === projectId) {
            const storeUpdate: Record<string, unknown> = {};
            if (activeSpecialMenuId === projectId) {
                storeUpdate.activeSpecialMenuId = FieldValue.delete();
            }
            if (shouldClearSpecialMenuTempStatus(storeData, activeSpecialMenuId, projectId)) {
                storeUpdate.tempStatus = FieldValue.delete();
            }
            if (Object.keys(storeUpdate).length) {
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
        }

        return { outcome: 'expired', projectId };
    });
}
