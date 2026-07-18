export type CampaignCueCueLayersIdempotencyStatus = "in_progress" | "completed";

export interface CampaignCueCueLayersIdempotencyRecord {
    action: string;
    actorId: string;
    claimId?: string;
    leaseExpiresAt?: unknown;
    requestHash: string;
    responseError?: string;
    responseStatus?: number;
    resultId?: string;
    resultRevision?: number;
    secondaryResultId?: string;
    status: CampaignCueCueLayersIdempotencyStatus;
}

export class CampaignCueCueLayersIdempotencyConflictError extends Error {
    clientMessage: string;
    code = "campaigncue_idempotency_conflict";
    status = 409 as const;

    constructor(message = "This reusable-image request is already running or its retry key was reused.") {
        super(message);
        this.clientMessage = message;
        this.name = "CampaignCueCueLayersIdempotencyConflictError";
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const isBoundedIdentifier = (value: unknown) => (
    typeof value === "string"
    && value.length >= 3
    && value.length <= 160
    && /^[a-zA-Z0-9_-]+$/.test(value)
);

const timestampMillis = (value: unknown) => {
    if (!isRecord(value)) return null;
    const toMillis = value.toMillis;
    if (typeof toMillis === "function") {
        const millis = toMillis.call(value);
        return Number.isFinite(millis) ? Number(millis) : null;
    }
    const seconds = value.seconds;
    const nanoseconds = value.nanoseconds;
    if (!Number.isSafeInteger(seconds) || !Number.isSafeInteger(nanoseconds)) return null;
    return Number(seconds) * 1_000 + Math.floor(Number(nanoseconds) / 1_000_000);
};

export function assertCampaignCueCueLayersIdempotencyIdentity(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
): CampaignCueCueLayersIdempotencyRecord {
    if (!isRecord(value)) throw new CampaignCueCueLayersIdempotencyConflictError();
    if (
        value.action !== expected.action
        || value.actorId !== expected.actorId
        || value.requestHash !== expected.requestHash
        || (value.status !== "in_progress" && value.status !== "completed")
        || (value.claimId !== undefined && !isBoundedIdentifier(value.claimId))
        || (value.resultId !== undefined && !isBoundedIdentifier(value.resultId))
        || (value.secondaryResultId !== undefined && !isBoundedIdentifier(value.secondaryResultId))
        || (value.responseError !== undefined && (typeof value.responseError !== "string" || value.responseError.length > 500))
    ) {
        throw new CampaignCueCueLayersIdempotencyConflictError(
            "This retry key was already used for a different reusable-image request.",
        );
    }
    if (value.resultRevision !== undefined && (!Number.isSafeInteger(value.resultRevision) || Number(value.resultRevision) < 0)) {
        throw new CampaignCueCueLayersIdempotencyConflictError();
    }
    if (value.responseStatus !== undefined && (!Number.isInteger(value.responseStatus) || Number(value.responseStatus) < 400 || Number(value.responseStatus) > 599)) {
        throw new CampaignCueCueLayersIdempotencyConflictError();
    }
    return value as unknown as CampaignCueCueLayersIdempotencyRecord;
}

export type CampaignCueCueLayersClaimDecision =
    | { kind: "claim"; reason: "missing" | "expired" | "legacy_or_malformed" }
    | { kind: "conflict" }
    | { kind: "replay"; replay: CampaignCueCueLayersIdempotencyRecord };

export function getCampaignCueCueLayersClaimDecision(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
    nowMillis: number,
): CampaignCueCueLayersClaimDecision {
    if (value === null || value === undefined) return { kind: "claim", reason: "missing" };
    const record = assertCampaignCueCueLayersIdempotencyIdentity(value, expected);
    if (record.status === "completed") {
        return { kind: "replay", replay: getCampaignCueCueLayersIdempotencyReplay(record, expected) };
    }
    const leaseMillis = timestampMillis(record.leaseExpiresAt);
    if (!record.claimId || leaseMillis === null) {
        return { kind: "claim", reason: "legacy_or_malformed" };
    }
    return leaseMillis > nowMillis
        ? { kind: "conflict" }
        : { kind: "claim", reason: "expired" };
}

export function assertCampaignCueCueLayersClaimOwnership(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
    claimId: string,
) {
    const record = assertCampaignCueCueLayersIdempotencyIdentity(value, expected);
    if (record.status !== "in_progress" || record.claimId !== claimId) {
        throw new CampaignCueCueLayersIdempotencyConflictError(
            "This reusable-image retry claim was replaced before it could finish.",
        );
    }
    return record;
}

export function getCampaignCueCueLayersIdempotencyReplay(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
) {
    const record = assertCampaignCueCueLayersIdempotencyIdentity(value, expected);
    if (record.status !== "completed" || !record.resultId) {
        throw new CampaignCueCueLayersIdempotencyConflictError();
    }
    return record;
}
