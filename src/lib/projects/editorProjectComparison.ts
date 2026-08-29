import { isSameObjects, removeObjRef } from "@util/utils";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function removeEmptyItemAttributes(project: unknown): unknown {
    const normalized = removeObjRef(project);
    if (!isRecord(normalized) || !Array.isArray(normalized.files)) return normalized;

    for (const file of normalized.files) {
        if (!isRecord(file) || !isRecord(file.extractedData)) continue;
        const data = file.extractedData.data;
        if (!isRecord(data) || !Array.isArray(data.items)) continue;

        for (const item of data.items) {
            if (!isRecord(item)) continue;
            if (Array.isArray(item.attributes) && item.attributes.length === 0) {
                delete item.attributes;
            }
        }
    }

    return normalized;
}

export function areEditorProjectsEquivalent(left: unknown, right: unknown): boolean {
    if (!left || !right) return false;
    return isSameObjects(
        removeEmptyItemAttributes(left),
        removeEmptyItemAttributes(right),
    );
}
