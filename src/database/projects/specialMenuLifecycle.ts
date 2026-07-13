import { DB_COLLECTIONS } from '@constant/database';
import {
    deleteField,
    doc,
    type Firestore,
    runTransaction,
    serverTimestamp,
} from 'firebase/firestore';
import { buildSummaryProjectFieldPayload } from '@lib/firestore/summaryProjectsWriter';
import {
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
} from '@lib/multiOutlet/projectIdBoundary';
import type {
    SpecialMenuMetadata,
    SpecialMenuStatus,
} from '@template/main-app/projects/types';

export type SpecialMenuLifecycleAction = 'activate' | 'deactivate' | 'cancel';

export type SpecialMenuLifecycleResult = {
    projectId: string;
    status: SpecialMenuStatus;
};

type SpecialMenuLifecycleParams = {
    action: SpecialMenuLifecycleAction;
    db: Firestore;
    displayName?: string;
    enableTempStatus: boolean;
    now?: Date;
    projectId: string;
    sId: number | string;
    tId: number | string;
};

const SPECIAL_MENU_STATUSES = new Set<SpecialMenuStatus>([
    'scheduled',
    'active',
    'expired',
    'cancelled',
]);

export function normalizeSpecialMenuMetadata(value: unknown): SpecialMenuMetadata | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const candidate = value as Partial<SpecialMenuMetadata>;
    if (
        typeof candidate.baseProjectId !== 'string'
        || !normalizeMultiOutletProjectId(candidate.baseProjectId)
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

function resolveSpecialMenuDisplayName(
    metadata: SpecialMenuMetadata,
    preferred?: string,
): string {
    const explicit = String(preferred || '').trim();
    if (explicit) return explicit;
    if (typeof metadata.displayName === 'string') return metadata.displayName.trim();
    return Object.values(metadata.displayName)
        .find((value): value is string => typeof value === 'string' && Boolean(value.trim()))
        ?.trim() || '';
}

function normalizeLifecycleScope(params: SpecialMenuLifecycleParams) {
    const tenant = normalizeMultiOutletNumericDocumentId(params.tId);
    const store = normalizeMultiOutletNumericDocumentId(params.sId);
    const project = normalizeMultiOutletProjectId(params.projectId);
    if (
        !tenant
        || !store
        || !project
        || project.tenantDocumentId !== tenant.documentId
        || project.storeDocumentId !== store.documentId
    ) {
        throw new Error('special_menu_scope_invalid');
    }
    return { tenant, store, project };
}

export async function transitionSpecialMenuLifecycle(
    params: SpecialMenuLifecycleParams,
): Promise<SpecialMenuLifecycleResult> {
    const scope = normalizeLifecycleScope(params);
    const now = params.now || new Date();
    if (!Number.isFinite(now.getTime())) throw new Error('special_menu_time_invalid');
    const nowIso = now.toISOString();

    const projectRef = doc(
        params.db,
        DB_COLLECTIONS.PROJECTS,
        scope.tenant.documentId,
        scope.store.documentId,
        scope.project.projectId,
    );
    const storeRef = doc(params.db, DB_COLLECTIONS.STORES, scope.store.documentId);
    const summaryRef = doc(
        params.db,
        DB_COLLECTIONS.PLATFORM_SUMMARY,
        `projects_${scope.store.documentId}`,
    );

    return runTransaction(params.db, async (transaction) => {
        const projectSnapshot = await transaction.get(projectRef);
        const storeSnapshot = params.action === 'cancel'
            ? null
            : await transaction.get(storeRef);
        if (!projectSnapshot.exists()) throw new Error('special_menu_project_missing');

        const projectData = projectSnapshot.data();
        if (
            (projectData.projectId !== undefined && projectData.projectId !== scope.project.projectId)
            || projectData.deleted === true
            || projectData.active === false
        ) {
            throw new Error('special_menu_project_contract_invalid');
        }

        const currentMetadata = normalizeSpecialMenuMetadata(projectData._specialMenu);
        if (!currentMetadata) throw new Error('special_menu_metadata_invalid');
        const baseProjectScope = normalizeMultiOutletProjectId(currentMetadata.baseProjectId);
        if (
            !baseProjectScope
            || baseProjectScope.tenantDocumentId !== scope.tenant.documentId
            || baseProjectScope.storeDocumentId !== scope.store.documentId
        ) {
            throw new Error('special_menu_base_scope_invalid');
        }
        const storeData = storeSnapshot?.exists() ? storeSnapshot.data() : {};
        const activeSpecialMenuId = typeof storeData.activeSpecialMenuId === 'string'
            ? storeData.activeSpecialMenuId
            : null;

        if (params.action === 'activate' && currentMetadata.status === 'active') {
            if (activeSpecialMenuId && activeSpecialMenuId !== scope.project.projectId) {
                throw new Error('special_menu_active_pointer_conflict');
            }
            const storeUpdate: Record<string, unknown> = {
                activeSpecialMenuId: scope.project.projectId,
            };
            if (params.enableTempStatus) {
                const displayName = resolveSpecialMenuDisplayName(currentMetadata, params.displayName);
                if (!displayName) throw new Error('special_menu_display_name_invalid');
                storeUpdate.tempStatus = {
                    type: 'special_menu',
                    message: displayName,
                    expiresAt: currentMetadata.endsAt,
                    createdAt: currentMetadata.activatedAt || nowIso,
                    sourceProjectId: scope.project.projectId,
                };
            }
            transaction.set(storeRef, storeUpdate, { merge: true });
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                ...buildSummaryProjectFieldPayload(
                    scope.project.projectId,
                    'specialMenuStatus',
                    currentMetadata.status,
                ),
            }, { merge: true });
            return {
                projectId: scope.project.projectId,
                status: currentMetadata.status,
            };
        }
        if (params.action === 'deactivate' && currentMetadata.status === 'expired') {
            if (activeSpecialMenuId === scope.project.projectId) {
                const storeUpdate: Record<string, unknown> = {
                    activeSpecialMenuId: deleteField(),
                };
                if (
                    storeData.tempStatus?.type === 'special_menu'
                    && (
                        storeData.tempStatus.sourceProjectId === scope.project.projectId
                        || storeData.tempStatus.sourceProjectId === undefined
                    )
                ) {
                    storeUpdate.tempStatus = deleteField();
                }
                transaction.set(storeRef, storeUpdate, { merge: true });
            }
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                ...buildSummaryProjectFieldPayload(
                    scope.project.projectId,
                    'specialMenuStatus',
                    currentMetadata.status,
                ),
            }, { merge: true });
            return {
                projectId: scope.project.projectId,
                status: currentMetadata.status,
            };
        }
        if (params.action === 'cancel' && currentMetadata.status === 'cancelled') {
            transaction.set(summaryRef, {
                lastUpdated: serverTimestamp(),
                ...buildSummaryProjectFieldPayload(
                    scope.project.projectId,
                    'specialMenuStatus',
                    currentMetadata.status,
                ),
            }, { merge: true });
            return {
                projectId: scope.project.projectId,
                status: currentMetadata.status,
            };
        }

        let nextStatus: SpecialMenuStatus;
        let nextMetadata: SpecialMenuMetadata;
        if (params.action === 'activate') {
            if (currentMetadata.status !== 'scheduled') {
                throw new Error(`special_menu_activate_from_${currentMetadata.status}_rejected`);
            }
            if (Date.parse(currentMetadata.endsAt) <= now.getTime()) {
                throw new Error('special_menu_activation_window_expired');
            }
            if (activeSpecialMenuId && activeSpecialMenuId !== scope.project.projectId) {
                throw new Error('special_menu_active_conflict');
            }
            nextStatus = 'active';
            nextMetadata = {
                ...currentMetadata,
                status: nextStatus,
                activatedAt: nowIso,
            };

            const storeUpdate: Record<string, unknown> = {
                activeSpecialMenuId: scope.project.projectId,
            };
            if (params.enableTempStatus) {
                const displayName = resolveSpecialMenuDisplayName(currentMetadata, params.displayName);
                if (!displayName) throw new Error('special_menu_display_name_invalid');
                storeUpdate.tempStatus = {
                    type: 'special_menu',
                    message: displayName,
                    expiresAt: currentMetadata.endsAt,
                    createdAt: nowIso,
                    sourceProjectId: scope.project.projectId,
                };
            }
            transaction.set(storeRef, storeUpdate, { merge: true });
        } else if (params.action === 'deactivate') {
            if (currentMetadata.status !== 'active') {
                throw new Error(`special_menu_deactivate_from_${currentMetadata.status}_rejected`);
            }
            if (activeSpecialMenuId && activeSpecialMenuId !== scope.project.projectId) {
                throw new Error('special_menu_active_pointer_conflict');
            }
            nextStatus = 'expired';
            nextMetadata = {
                ...currentMetadata,
                status: nextStatus,
                deactivatedAt: nowIso,
            };

            const storeUpdate: Record<string, unknown> = {
                activeSpecialMenuId: deleteField(),
            };
            const tempStatusSourceProjectId = typeof storeData.tempStatus?.sourceProjectId === 'string'
                ? storeData.tempStatus.sourceProjectId
                : null;
            if (
                storeData.tempStatus?.type === 'special_menu'
                && (
                    tempStatusSourceProjectId === scope.project.projectId
                    || (
                        activeSpecialMenuId === scope.project.projectId
                        && tempStatusSourceProjectId === null
                    )
                )
            ) {
                storeUpdate.tempStatus = deleteField();
            }
            transaction.set(storeRef, storeUpdate, { merge: true });
        } else {
            if (currentMetadata.status !== 'scheduled') {
                throw new Error(`special_menu_cancel_from_${currentMetadata.status}_rejected`);
            }
            nextStatus = 'cancelled';
            nextMetadata = {
                ...currentMetadata,
                status: nextStatus,
                deactivatedAt: nowIso,
            };
        }

        transaction.set(projectRef, { _specialMenu: nextMetadata }, { merge: true });
        transaction.set(summaryRef, {
            lastUpdated: serverTimestamp(),
            ...buildSummaryProjectFieldPayload(
                scope.project.projectId,
                'specialMenuStatus',
                nextStatus,
            ),
        }, { merge: true });

        return { projectId: scope.project.projectId, status: nextStatus };
    });
}
