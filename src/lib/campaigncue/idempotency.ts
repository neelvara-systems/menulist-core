import { createHash } from "crypto";

export interface CampaignCueIdempotencyRecord {
    action: string;
    actorId: string;
    claimId?: string;
    expiresAt?: unknown;
    leaseExpiresAt?: unknown;
    requestHash: string;
    responseError?: string;
    responseStatus?: number;
    resultId?: string;
    status: "in_progress" | "completed";
}

export class CampaignCueIdempotencyIdentityError extends Error {
    constructor(message = "This CampaignCue retry key is already running or was reused.") {
        super(message);
        this.name = "CampaignCueIdempotencyIdentityError";
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const stableSerialize = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new CampaignCueIdempotencyIdentityError("CampaignCue retry identity contains an invalid number.");
        return JSON.stringify(value);
    }
    if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
    if (!isRecord(value)) throw new CampaignCueIdempotencyIdentityError("CampaignCue retry identity is invalid.");
    return `{${Object.entries(value)
        .filter(([, nested]) => nested !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableSerialize(nested)}`)
        .join(",")}}`;
};

export const buildCampaignCueIdempotencyRequestHash = (value: unknown) => (
    createHash("sha256").update(stableSerialize(value)).digest("hex")
);

const isBoundedString = (value: unknown, max: number) => (
    typeof value === "string" && value.length > 0 && value.length <= max
);

const timestampMillis = (value: unknown) => {
    if (!isRecord(value)) return null;
    if (typeof value.toMillis === "function") {
        const millis = value.toMillis.call(value);
        return Number.isFinite(millis) ? Number(millis) : null;
    }
    if (!Number.isSafeInteger(value.seconds) || !Number.isSafeInteger(value.nanoseconds)) return null;
    return Number(value.seconds) * 1_000 + Math.floor(Number(value.nanoseconds) / 1_000_000);
};

export function assertCampaignCueIdempotencyIdentity(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
): CampaignCueIdempotencyRecord {
    if (!isRecord(value)) throw new CampaignCueIdempotencyIdentityError();
    if (
        value.action !== expected.action
        || value.actorId !== expected.actorId
        || value.requestHash !== expected.requestHash
        || (value.status !== "in_progress" && value.status !== "completed")
        || !isBoundedString(value.action, 80)
        || !isBoundedString(value.actorId, 160)
        || typeof value.requestHash !== "string"
        || !/^[a-f0-9]{64}$/.test(value.requestHash)
        || (value.claimId !== undefined && !isBoundedString(value.claimId, 160))
        || (value.resultId !== undefined && !isBoundedString(value.resultId, 160))
        || (value.responseError !== undefined && !isBoundedString(value.responseError, 500))
        || (value.responseStatus !== undefined && (
            !Number.isInteger(value.responseStatus)
            || Number(value.responseStatus) < 400
            || Number(value.responseStatus) > 599
        ))
    ) {
        throw new CampaignCueIdempotencyIdentityError(
            "This CampaignCue retry key was already used for a different request.",
        );
    }
    return value as unknown as CampaignCueIdempotencyRecord;
}

export function getCampaignCueIdempotencyReplay(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
): CampaignCueIdempotencyRecord {
    const record = assertCampaignCueIdempotencyIdentity(value, expected);
    if (record.status !== "completed" || !record.resultId) {
        throw new CampaignCueIdempotencyIdentityError();
    }
    return record;
}

export type CampaignCueIdempotencyClaimDecision =
    | { kind: "claim"; reason: "missing" | "expired" | "legacy_or_malformed" }
    | { kind: "conflict" }
    | { kind: "replay"; replay: CampaignCueIdempotencyRecord };

export function getCampaignCueIdempotencyClaimDecision(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
    nowMillis: number,
): CampaignCueIdempotencyClaimDecision {
    if (value === null || value === undefined) return { kind: "claim", reason: "missing" };
    const record = assertCampaignCueIdempotencyIdentity(value, expected);
    if (record.status === "completed") return { kind: "replay", replay: getCampaignCueIdempotencyReplay(record, expected) };
    const leaseMillis = timestampMillis(record.leaseExpiresAt);
    if (!record.claimId || leaseMillis === null) return { kind: "claim", reason: "legacy_or_malformed" };
    return leaseMillis > nowMillis ? { kind: "conflict" } : { kind: "claim", reason: "expired" };
}

export function assertCampaignCueIdempotencyClaimOwnership(
    value: unknown,
    expected: { action: string; actorId: string; requestHash: string },
    claimId: string,
) {
    const record = assertCampaignCueIdempotencyIdentity(value, expected);
    if (record.status !== "in_progress" || record.claimId !== claimId) {
        throw new CampaignCueIdempotencyIdentityError("This CampaignCue retry claim was replaced before it could finish.");
    }
    return record;
}
