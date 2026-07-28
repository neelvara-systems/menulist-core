export type ComplianceOverrideField =
    | "privacyOverride"
    | "termsOverride"
    | "refundOverride";

export interface ProjectedComplianceOverride {
    sId: string;
    tId: string;
    privacyOverride?: string;
    termsOverride?: string;
    refundOverride?: string;
    modifiedOn: unknown;
}

const OVERRIDE_FIELDS: readonly ComplianceOverrideField[] = [
    "privacyOverride",
    "termsOverride",
    "refundOverride",
];

function normalizeExactIdentity(value: unknown): string | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const normalized = String(value);
    return normalized.length > 0 && normalized.trim() === normalized
        ? normalized
        : null;
}

function isTimestampLike(value: unknown): boolean {
    if (!value || typeof value !== "object") return false;
    try {
        const millis = (value as { toMillis?: unknown }).toMillis;
        return typeof millis === "function"
            && Number.isFinite(millis.call(value));
    } catch {
        return false;
    }
}

export function projectComplianceOverride(
    value: unknown,
    expectedStoreId: string,
    expectedTenantId: string,
): ProjectedComplianceOverride | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const sId = normalizeExactIdentity(record.sId);
    const tId = normalizeExactIdentity(record.tId);
    if (
        sId !== expectedStoreId
        || tId !== expectedTenantId
        || !isTimestampLike(record.modifiedOn)
    ) {
        return null;
    }

    const projected: ProjectedComplianceOverride = {
        sId,
        tId,
        modifiedOn: record.modifiedOn,
    };
    for (const field of OVERRIDE_FIELDS) {
        const content = record[field];
        if (content === undefined) continue;
        if (
            typeof content !== "string"
            || content.length === 0
            || content.length > 15_000
        ) {
            return null;
        }
        projected[field] = content;
    }
    return projected;
}
