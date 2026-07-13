import type { Project } from "@template/main-app/projects/types";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};

const mergeDefinedProjectValue = (currentValue: unknown, patchValue: unknown): unknown => {
    if (!isPlainRecord(currentValue) || !isPlainRecord(patchValue)) return patchValue;

    const merged: Record<string, unknown> = { ...currentValue };
    for (const [key, value] of Object.entries(patchValue)) {
        merged[key] = mergeDefinedProjectValue(currentValue[key], value);
    }
    return merged;
};

/** Project updates use omission semantics for undefined object fields. */
export const sanitizeProjectPartialUpdate = <T extends Partial<Project>>(patch: T): T => (
    sanitizeForFirestore(patch, { undefinedObjectValue: "omit" }) as T
);

/**
 * Mirrors the top-level effect of a Firestore merge write for local validators
 * and observers. Undefined patch fields are omitted by the project persistence path;
 * explicit values, including `files: []`, remain authoritative.
 */
export const buildProjectAfterPartialUpdate = (
    currentProject: Project,
    patch: Partial<Project>,
): Project => {
    const cleanPatch = sanitizeProjectPartialUpdate(patch);
    return mergeDefinedProjectValue(currentProject, cleanPatch) as Project;
};
