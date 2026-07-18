import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import type { Project } from "@template/main-app/projects/types";

export const resolveStoredProjectMasterId = (
    currentProject: Pick<Project, "masterProjectId">,
    requestedUpdate: Pick<Partial<Project>, "masterProjectId">,
): string | null => {
    const storedMasterProjectId = typeof currentProject.masterProjectId === "string"
        ? currentProject.masterProjectId.trim()
        : "";
    if (storedMasterProjectId && !normalizeMultiOutletProjectId(storedMasterProjectId)) {
        throw new Error("project_master_linkage_invalid");
    }

    if (
        Object.prototype.hasOwnProperty.call(requestedUpdate, "masterProjectId")
        && String(requestedUpdate.masterProjectId || "").trim() !== storedMasterProjectId
    ) {
        throw new Error("project_master_linkage_mutation_rejected");
    }

    return storedMasterProjectId || null;
};

const nextProjectVersion = (currentVersion: unknown, exhaustedCode: string): number => {
    if (currentVersion === Number.MAX_SAFE_INTEGER) {
        throw new Error(exhaustedCode);
    }

    return typeof currentVersion === "number"
        && Number.isSafeInteger(currentVersion)
        && currentVersion >= 0
        ? currentVersion + 1
        : 1;
};

export const nextProjectMenuVersion = (currentVersion: unknown): number => (
    nextProjectVersion(currentVersion, "project_menu_version_exhausted")
);

export const nextProjectLocalVersion = (currentVersion: unknown): number => (
    nextProjectVersion(currentVersion, "project_local_version_exhausted")
);
