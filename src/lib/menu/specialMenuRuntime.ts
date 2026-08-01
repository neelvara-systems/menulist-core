import {
    normalizeSpecialMenuInstant,
    normalizeSpecialMenuScheduleRange,
} from "@data/shared/specialMenuSchedule";
import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import type { Project, SpecialMenuMetadata } from "@template/main-app/projects/types";

export type LiveSpecialMenuProject = {
    metadata: SpecialMenuMetadata;
    project: Project;
    projectId: string;
};

const SPECIAL_MENU_STATUSES = new Set<SpecialMenuMetadata["status"]>([
    "scheduled",
    "active",
    "expired",
    "cancelled",
]);

function hasValidDisplayName(value: unknown): value is SpecialMenuMetadata["displayName"] {
    if (typeof value === "string") {
        return Boolean(value.trim()) && value.length <= 100;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const entries = Object.entries(value);
    return entries.length > 0
        && entries.length <= 52
        && entries.every(([language, text]) => (
            Boolean(language.trim())
            && language.length <= 32
            && typeof text === "string"
            && Boolean(text.trim())
            && text.length <= 100
        ));
}

function isSpecialMenuStatus(value: unknown): value is SpecialMenuMetadata["status"] {
    return typeof value === "string"
        && SPECIAL_MENU_STATUSES.has(value as SpecialMenuMetadata["status"]);
}

function normalizeRuntimeMetadata(value: unknown): SpecialMenuMetadata | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    const schedule = normalizeSpecialMenuScheduleRange(candidate.startsAt, candidate.endsAt);
    const activatedAt = candidate.activatedAt === undefined
        ? undefined
        : normalizeSpecialMenuInstant(candidate.activatedAt);
    const deactivatedAt = candidate.deactivatedAt === undefined
        ? undefined
        : normalizeSpecialMenuInstant(candidate.deactivatedAt);
    if (
        typeof candidate.baseProjectId !== "string"
        || !normalizeMultiOutletProjectId(candidate.baseProjectId)
        || (candidate.mode !== "replace" && candidate.mode !== "overlay")
        || !schedule
        || !isSpecialMenuStatus(candidate.status)
        || !hasValidDisplayName(candidate.displayName)
        || (candidate.activatedAt !== undefined && !activatedAt)
        || (candidate.deactivatedAt !== undefined && !deactivatedAt)
    ) {
        return null;
    }
    return {
        baseProjectId: candidate.baseProjectId,
        displayName: candidate.displayName,
        endsAt: schedule.endsAt,
        mode: candidate.mode,
        startsAt: schedule.startsAt,
        status: candidate.status,
        ...(activatedAt ? { activatedAt } : {}),
        ...(deactivatedAt ? { deactivatedAt } : {}),
    };
}

/**
 * Validates the full project document behind a store's active special-menu
 * pointer. `_specialMenu` is canonical on the project document; summary-only
 * markers such as `isSpecialMenu` are intentionally not required here.
 */
export function resolveLiveSpecialMenuProject(
    value: unknown,
    params: {
        now?: Date;
        projectId: string;
        sId: number | string;
        tId: number | string;
    },
): LiveSpecialMenuProject | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const project = value as Project & { sId?: number | string; tId?: number | string };
    const expectedScope = normalizeMultiOutletProjectId(params.projectId);
    const baseNow = params.now || new Date();
    if (
        !expectedScope
        || expectedScope.tenantDocumentId !== String(params.tId)
        || expectedScope.storeDocumentId !== String(params.sId)
        || !Number.isFinite(baseNow.getTime())
        || (project.projectId !== undefined && project.projectId !== params.projectId)
        || (project.tId !== undefined && String(project.tId) !== expectedScope.tenantDocumentId)
        || (project.sId !== undefined && String(project.sId) !== expectedScope.storeDocumentId)
        || project.active === false
        || project.deleted === true
    ) {
        return null;
    }

    const metadata = normalizeRuntimeMetadata(project._specialMenu);
    const baseScope = metadata ? normalizeMultiOutletProjectId(metadata.baseProjectId) : null;
    if (
        !metadata
        || !baseScope
        || baseScope.tenantDocumentId !== expectedScope.tenantDocumentId
        || baseScope.storeDocumentId !== expectedScope.storeDocumentId
        || metadata.status !== "active"
        || Date.parse(metadata.startsAt) > baseNow.getTime()
        || Date.parse(metadata.endsAt) <= baseNow.getTime()
    ) {
        return null;
    }

    return {
        metadata,
        project,
        projectId: params.projectId,
    };
}
