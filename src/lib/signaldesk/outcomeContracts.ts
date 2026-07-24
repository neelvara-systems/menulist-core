import { SIGNALDESK_OUTCOME_ROUTE_SCOPE } from "@constant/signaldesk/integrations";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { parseSignalDeskTargetSummaryDocument } from "@lib/signaldesk/targetContracts";
import type {
    SignalDeskActivationSurface,
    SignalDeskConversationSummary,
    SignalDeskDemandSignalSummary,
    SignalDeskOutcomeSummary,
    SignalDeskTargetSummary,
} from "@type/signaldesk";
import { createHash, createHmac } from "crypto";
import { z } from "zod";

export const SIGNALDESK_OUTCOME_TYPES = [
    "route_created",
    "upload_started",
    "preview_prepared",
    "published",
    "two_surface_activation",
] as const satisfies readonly SignalDeskOutcomeSummary["outcomeType"][];

export const SIGNALDESK_OUTCOME_SOURCES = [
    "manual",
    "route-token",
    "demand-signal",
] as const satisfies readonly SignalDeskOutcomeSummary["source"][];

export const SIGNALDESK_OUTCOME_CHANNELS = [
    "email",
    "manual",
    "qr",
    "share",
    "claim",
] as const satisfies readonly SignalDeskOutcomeSummary["channel"][];

export const SIGNALDESK_ACTIVATION_SURFACES = [
    "qr",
    "whatsapp",
    "google-profile",
    "instagram",
    "website",
    "print",
    "other",
] as const satisfies readonly SignalDeskActivationSurface[];

export const SIGNALDESK_CONVERSATION_STATES = [
    "new",
    "exported",
    "contacted",
    "interested",
    "not_interested",
    "dnc",
    "wrong_contact",
    "complaint",
    "privacy_request",
    "legal_request",
    "needs_review",
] as const satisfies readonly SignalDeskConversationSummary["state"][];

export const SIGNALDESK_CONVERSATION_CHANNELS = [
    "email",
    "manual",
    "whatsapp",
    "instagram",
    "messenger",
] as const satisfies readonly SignalDeskConversationSummary["channel"][];

export const SIGNALDESK_ATTRIBUTION_METHODS = [
    "manual-direct-v1",
    "route-token-direct-v1",
    "demand-signal-direct-v1",
] as const;

const ROUTE_TOKEN_FINGERPRINT_DOMAIN = "signaldesk:outcome-route-fingerprint:v1";
const ROUTE_TOKEN_INTENT_DOMAIN = "signaldesk:outcome-route-intent:v1";
const ROUTE_TOKEN_IDEMPOTENCY_DOMAIN = "signaldesk:outcome-route-idempotency:v1";
const ROUTE_TOKEN_MATERIAL_DOMAIN = "signaldesk:outcome-route-token:v1";
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
const MAX_ROUTE_LIFETIME_MS = 14 * 24 * 60 * 60 * 1_000;
const SOURCE_DATA_LIFECYCLE_KIND = "source-data-retention-v1";
const SOURCE_DATA_LIFECYCLE_SYSTEM_ACTOR = "signaldesk-source-data-lifecycle";
const SOURCE_DATA_LIFECYCLE_FIELDS = [
    "sourceDataLifecycleCompletedAt",
    "sourceDataLifecycleKind",
    "sourceDataLifecycleState",
    "sourceDataLifecycleToken",
    "updatedBy",
] as const;
const HEX_64 = /^[a-f0-9]{64}$/;
const CANONICAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

type SignalDeskOutcomeType = SignalDeskOutcomeSummary["outcomeType"];
type SignalDeskOutcomeSource = SignalDeskOutcomeSummary["source"];
type SignalDeskOutcomeChannel = SignalDeskOutcomeSummary["channel"];
type SignalDeskOutcomeIntegrity = NonNullable<SignalDeskOutcomeSummary["integrityStatus"]>;

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const fail = (code: string): never => {
    throw new Error(code);
};
const requireKeys = (value: object, keys: readonly string[], errorCode: string) => {
    if (keys.some((key) => !hasOwn(value, key))) fail(errorCode);
};

const canonicalId = (minimum: number, maximum: number) => z.string()
    .min(minimum)
    .max(maximum)
    .refine((value) => value === value.trim() && CANONICAL_ID.test(value));

const canonicalText = (minimum: number, maximum: number) => z.string()
    .min(minimum)
    .max(maximum)
    .refine((value) => (
        value === value.trim()
        && !/[\u0000-\u001f\u007f]/.test(value)
    ));

const canonicalHash = z.string().regex(HEX_64);
const nullableId = (minimum: number, maximum: number) => canonicalId(minimum, maximum).nullable().optional();
const nullableText = (minimum: number, maximum: number) => canonicalText(minimum, maximum).nullable().optional();

const idempotencyKeySchema = z.string()
    .min(8)
    .max(180)
    .refine((value) => value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value));

const canonicalDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});

const timestampToIso = (value: unknown): string | null => {
    if (typeof value !== "object" || value === null || !("toDate" in value) || typeof value.toDate !== "function") {
        return null;
    }
    try {
        const date = value.toDate();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

const requiredTimestamp = (value: unknown, errorCode: string) => timestampToIso(value) || fail(errorCode);
const optionalTimestamp = (value: unknown, errorCode: string) => {
    if (value === undefined || value === null) return null;
    return timestampToIso(value) || fail(errorCode);
};
const toMillis = (value: string) => Date.parse(value);

const parseCompletedSourceDataLifecycle = (
    raw: Record<string, unknown>,
    updatedAt: string,
    errorCode: string,
) => {
    const presentFields = SOURCE_DATA_LIFECYCLE_FIELDS.filter((field) => hasOwn(raw, field));
    if (!presentFields.length) return null;
    if (presentFields.length !== SOURCE_DATA_LIFECYCLE_FIELDS.length) fail(errorCode);
    const parsed = z.object({
        sourceDataLifecycleCompletedAt: z.unknown(),
        sourceDataLifecycleKind: z.literal(SOURCE_DATA_LIFECYCLE_KIND),
        sourceDataLifecycleState: z.literal("completed"),
        sourceDataLifecycleToken: z.string().regex(/^source_data_target_[a-f0-9]{40}$/),
        updatedBy: z.literal(SOURCE_DATA_LIFECYCLE_SYSTEM_ACTOR),
    }).strict().safeParse(Object.fromEntries(
        SOURCE_DATA_LIFECYCLE_FIELDS.map((field) => [field, raw[field]]),
    ));
    if (!parsed.success) fail(errorCode);
    const completedAt = requiredTimestamp(parsed.data.sourceDataLifecycleCompletedAt, errorCode);
    if (toMillis(completedAt) > toMillis(updatedAt)) fail(errorCode);
    return {
        completedAt,
        kind: parsed.data.sourceDataLifecycleKind,
        state: parsed.data.sourceDataLifecycleState,
        token: parsed.data.sourceDataLifecycleToken,
        updatedBy: parsed.data.updatedBy,
    };
};

const isAfterWithSkew = (later: string, earlier: string) => toMillis(later) + CLOCK_SKEW_MS >= toMillis(earlier);

const assertOutcomeTemporalIntegrity = (params: {
    createdOrUpdatedAt: string;
    errorCode: string;
    outcomeType: SignalDeskOutcomeType;
    ownerQualifiedAt: string | null;
    ownerReviewedAt: string | null;
    surfaces: SignalDeskActivationSurface[];
}) => {
    const uniqueSurfaces = new Set(params.surfaces);
    if (uniqueSurfaces.size !== params.surfaces.length) fail(params.errorCode);
    if (params.ownerReviewedAt && !params.ownerQualifiedAt) fail(params.errorCode);
    if (params.ownerQualifiedAt && !isAfterWithSkew(params.createdOrUpdatedAt, params.ownerQualifiedAt)) fail(params.errorCode);
    if (params.ownerReviewedAt && !isAfterWithSkew(params.createdOrUpdatedAt, params.ownerReviewedAt)) fail(params.errorCode);
    if (params.ownerQualifiedAt && params.ownerReviewedAt && toMillis(params.ownerReviewedAt) < toMillis(params.ownerQualifiedAt)) {
        fail(params.errorCode);
    }
    if (
        params.outcomeType === "two_surface_activation"
        && (!params.ownerQualifiedAt || !params.ownerReviewedAt || uniqueSurfaces.size < 2)
    ) {
        fail(params.errorCode);
    }
};

const assertOutcomeSourceIntegrity = (params: {
    errorCode: string;
    integrityStatus: SignalDeskOutcomeIntegrity;
    routeTokenId: string | null;
    source: SignalDeskOutcomeSource;
    sourceEventId: string | null;
    outcomeType: SignalDeskOutcomeType;
}) => {
    if (params.source === "route-token") {
        if (!params.routeTokenId || !params.sourceEventId || params.integrityStatus !== "menulist-signed") {
            fail(params.errorCode);
        }
        return;
    }
    if (params.routeTokenId) fail(params.errorCode);
    if (params.source === "manual" && params.sourceEventId) fail(params.errorCode);
    if (
        params.source === "demand-signal"
        && (!params.sourceEventId || !/^demand_[a-f0-9]{32}$/.test(params.sourceEventId))
    ) fail(params.errorCode);
    const expectedIntegrity = params.outcomeType === "two_surface_activation"
        ? "owner-reviewed-manual"
        : "unverified";
    if (params.integrityStatus !== expectedIntegrity) fail(params.errorCode);
};

const outcomeTypeSchema = z.enum(SIGNALDESK_OUTCOME_TYPES);
const outcomeSourceSchema = z.enum(SIGNALDESK_OUTCOME_SOURCES);
const outcomeChannelSchema = z.enum(SIGNALDESK_OUTCOME_CHANNELS);
const outcomeIntegritySchema = z.enum(["unverified", "owner-reviewed-manual", "menulist-signed"]);
const activationSurfaceSchema = z.enum(SIGNALDESK_ACTIVATION_SURFACES);

export interface SignalDeskRouteTokenFingerprintInput {
    actorId: string;
    channel: SignalDeskOutcomeChannel;
    ctaId?: string | null;
    expiresAt: string;
    ownerQualifiedAt: string;
    sourceActionId: string;
    sourcePolicyId: string;
    sourceRunId: string;
    targetId: string;
    templateId?: string | null;
}

export interface SignalDeskRouteTokenIntentInput {
    actionId?: string | null;
    actorId: string;
    channel: SignalDeskOutcomeChannel;
    ctaId?: string | null;
    targetId: string;
    templateId?: string | null;
}

const routeTokenIntentInputSchema = z.object({
    actionId: nullableId(3, 180),
    actorId: canonicalId(3, 180),
    channel: outcomeChannelSchema,
    ctaId: nullableId(1, 180),
    targetId: canonicalId(3, 160),
    templateId: nullableId(1, 160),
}).strict();

export const createSignalDeskRouteTokenIntentFingerprint = (
    input: SignalDeskRouteTokenIntentInput,
) => {
    const parsed = routeTokenIntentInputSchema.safeParse(input);
    if (!parsed.success) return fail("ROUTE_TOKEN_INTENT_INPUT_INVALID");
    const canonicalFacts = JSON.stringify({
        actionId: parsed.data.actionId || null,
        actorId: parsed.data.actorId,
        channel: parsed.data.channel,
        ctaId: parsed.data.ctaId || null,
        targetId: parsed.data.targetId,
        templateId: parsed.data.templateId || null,
    });
    return hashValue(`${ROUTE_TOKEN_INTENT_DOMAIN}\0${canonicalFacts}`);
};

export const signalDeskRouteTokenIdempotencyHashFor = (params: {
    actorId: string;
    idempotencyKey: string;
}) => {
    const parsed = z.object({
        actorId: canonicalId(3, 180),
        idempotencyKey: idempotencyKeySchema,
    }).strict().safeParse(params);
    if (!parsed.success) return fail("ROUTE_TOKEN_IDEMPOTENCY_INPUT_INVALID");
    return hashValue(`${ROUTE_TOKEN_IDEMPOTENCY_DOMAIN}\0${parsed.data.actorId}\0${parsed.data.idempotencyKey}`);
};

const routeTokenFingerprintInputSchema = z.object({
    actorId: canonicalId(3, 180),
    channel: outcomeChannelSchema,
    ctaId: nullableId(1, 180),
    expiresAt: z.string().datetime({ offset: true }),
    ownerQualifiedAt: z.string().datetime({ offset: true }),
    sourceActionId: canonicalId(3, 180),
    sourcePolicyId: canonicalId(3, 160),
    sourceRunId: canonicalId(3, 160),
    targetId: canonicalId(3, 160),
    templateId: nullableId(1, 160),
}).strict();

export const createSignalDeskRouteTokenRequestFingerprint = (
    input: SignalDeskRouteTokenFingerprintInput,
) => {
    const parsed = routeTokenFingerprintInputSchema.safeParse(input);
    if (!parsed.success) return fail("ROUTE_TOKEN_FINGERPRINT_INPUT_INVALID");
    const ownerQualifiedAt = new Date(parsed.data.ownerQualifiedAt).toISOString();
    const expiresAt = new Date(parsed.data.expiresAt).toISOString();
    if (toMillis(expiresAt) <= toMillis(ownerQualifiedAt)) fail("ROUTE_TOKEN_FINGERPRINT_INPUT_INVALID");
    const canonicalFacts = JSON.stringify({
        actorId: parsed.data.actorId,
        channel: parsed.data.channel,
        ctaId: parsed.data.ctaId || null,
        expiresAt,
        ownerQualifiedAt,
        scope: SIGNALDESK_OUTCOME_ROUTE_SCOPE,
        sourceActionId: parsed.data.sourceActionId,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        targetId: parsed.data.targetId,
        templateId: parsed.data.templateId || null,
    });
    return hashValue(`${ROUTE_TOKEN_FINGERPRINT_DOMAIN}\0${canonicalFacts}`);
};

export const deriveSignalDeskRouteTokenMaterial = (params: {
    bridgeSecret: string;
    idempotencyKey: string;
    requestFingerprintHash: string;
}) => {
    if (
        typeof params.bridgeSecret !== "string"
        || params.bridgeSecret.length < 32
        || params.bridgeSecret.length > 4_096
        || params.bridgeSecret !== params.bridgeSecret.trim()
        || typeof params.idempotencyKey !== "string"
        || params.idempotencyKey.length < 8
        || params.idempotencyKey.length > 180
        || params.idempotencyKey !== params.idempotencyKey.trim()
        || !HEX_64.test(params.requestFingerprintHash)
    ) {
        return fail("ROUTE_TOKEN_DERIVATION_INPUT_INVALID");
    }
    const token = createHmac("sha256", params.bridgeSecret)
        .update(`${ROUTE_TOKEN_MATERIAL_DOMAIN}\0${params.idempotencyKey}\0${params.requestFingerprintHash}`)
        .digest("base64url");
    const tokenHash = hashValue(token);
    return {
        routeTokenId: `route_${tokenHash.slice(0, 32)}`,
        token,
        tokenHash,
    };
};

export interface SignalDeskRouteTokenAuthority {
    channel: SignalDeskOutcomeChannel;
    createdAt: string;
    createdBy: string;
    ctaId: string | null;
    expiresAt: string;
    lastOutcomeAt: string | null;
    lastOutcomeEventIdHash: string | null;
    ownerQualifiedAt: string;
    revokedAt: string | null;
    revokedBy: string | null;
    revocationReason: string | null;
    routeTokenId: string;
    scope: typeof SIGNALDESK_OUTCOME_ROUTE_SCOPE;
    sourceActionId: string;
    sourcePolicyId: string;
    sourceRunId: string;
    status: "active" | "revoked";
    targetId: string;
    targetName: string;
    templateId: string | null;
    tokenHash: string;
    updatedAt: string;
}

const routeTokenSchema = z.object({
    channel: outcomeChannelSchema,
    createdAt: z.unknown(),
    createdBy: canonicalId(3, 180),
    ctaId: nullableId(1, 180),
    expiresAt: z.unknown(),
    lastOutcomeAt: z.unknown().optional(),
    lastOutcomeEventIdHash: canonicalHash.nullable().optional(),
    ownerQualifiedAt: z.unknown(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    revokedAt: z.unknown().optional(),
    revokedBy: nullableId(3, 180),
    revocationReason: nullableText(3, 500),
    routeTokenId: z.string().regex(/^route_[a-f0-9]{32}$/),
    scope: z.literal(SIGNALDESK_OUTCOME_ROUTE_SCOPE),
    sourceActionId: canonicalId(3, 180),
    sourceDataLifecycleCompletedAt: z.unknown().optional(),
    sourceDataLifecycleKind: z.unknown().optional(),
    sourceDataLifecycleState: z.unknown().optional(),
    sourceDataLifecycleToken: z.unknown().optional(),
    sourcePolicyId: canonicalId(3, 160),
    sourceRunId: canonicalId(3, 160),
    status: z.enum(["active", "revoked"]),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
    templateId: nullableId(1, 160),
    tokenHash: canonicalHash,
    updatedAt: z.unknown(),
    updatedBy: z.unknown().optional(),
}).strict();

export const parseSignalDeskRouteTokenDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskRouteTokenAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("ROUTE_TOKEN_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("ROUTE_TOKEN_PRODUCT_MISMATCH");
    if (identity.routeTokenId !== documentId) fail("ROUTE_TOKEN_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "channel",
        "createdAt",
        "createdBy",
        "expiresAt",
        "ownerQualifiedAt",
        "pId",
        "revokedAt",
        "revokedBy",
        "routeTokenId",
        "scope",
        "sourceActionId",
        "sourcePolicyId",
        "status",
        "targetId",
        "targetName",
        "tokenHash",
        "updatedAt",
    ], "ROUTE_TOKEN_SHAPE_INVALID");
    const parsed = routeTokenSchema.safeParse(raw);
    if (!parsed.success) fail("ROUTE_TOKEN_SHAPE_INVALID");
    if (parsed.data.routeTokenId !== documentId) fail("ROUTE_TOKEN_IDENTITY_MISMATCH");
    const expectedRouteTokenId = `route_${parsed.data.tokenHash.slice(0, 32)}`;
    if (documentId !== expectedRouteTokenId) fail("ROUTE_TOKEN_HASH_IDENTITY_MISMATCH");
    const createdAt = requiredTimestamp(parsed.data.createdAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    const expiresAt = requiredTimestamp(parsed.data.expiresAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    const ownerQualifiedAt = requiredTimestamp(parsed.data.ownerQualifiedAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    const updatedAt = requiredTimestamp(parsed.data.updatedAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    const revokedAt = optionalTimestamp(parsed.data.revokedAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    const lastOutcomeAt = optionalTimestamp(parsed.data.lastOutcomeAt, "ROUTE_TOKEN_TIMESTAMP_INVALID");
    if (
        toMillis(expiresAt) <= toMillis(createdAt)
        || toMillis(expiresAt) > toMillis(createdAt) + MAX_ROUTE_LIFETIME_MS + CLOCK_SKEW_MS
        || !isAfterWithSkew(createdAt, ownerQualifiedAt)
        || toMillis(updatedAt) < toMillis(createdAt)
    ) {
        fail("ROUTE_TOKEN_TIME_ORDER_INVALID");
    }
    const revokedBy = parsed.data.revokedBy || null;
    const revocationReason = parsed.data.revocationReason || null;
    if (parsed.data.status === "active" && (revokedAt || revokedBy || revocationReason)) {
        fail("ROUTE_TOKEN_STATUS_INVALID");
    }
    if (parsed.data.status === "revoked") {
        if (!revokedAt || !revokedBy || !revocationReason) fail("ROUTE_TOKEN_STATUS_INVALID");
        if (toMillis(revokedAt) < toMillis(createdAt) || toMillis(revokedAt) > toMillis(updatedAt)) {
            fail("ROUTE_TOKEN_TIME_ORDER_INVALID");
        }
    }
    const lastOutcomeEventIdHash = parsed.data.lastOutcomeEventIdHash || null;
    if (Boolean(lastOutcomeAt) !== Boolean(lastOutcomeEventIdHash)) fail("ROUTE_TOKEN_OUTCOME_STATE_INVALID");
    if (lastOutcomeAt && (toMillis(lastOutcomeAt) < toMillis(createdAt) || toMillis(lastOutcomeAt) > toMillis(updatedAt))) {
        fail("ROUTE_TOKEN_TIME_ORDER_INVALID");
    }
    const lifecycle = parseCompletedSourceDataLifecycle(identity, updatedAt, "ROUTE_TOKEN_LIFECYCLE_STATE_INVALID");
    if (lifecycle && (parsed.data.status !== "revoked" || parsed.data.targetName !== "Retained target record")) {
        fail("ROUTE_TOKEN_LIFECYCLE_STATE_INVALID");
    }
    return {
        channel: parsed.data.channel,
        createdAt,
        createdBy: parsed.data.createdBy,
        ctaId: parsed.data.ctaId || null,
        expiresAt,
        lastOutcomeAt,
        lastOutcomeEventIdHash,
        ownerQualifiedAt,
        revokedAt,
        revokedBy,
        revocationReason,
        routeTokenId: parsed.data.routeTokenId,
        scope: parsed.data.scope,
        sourceActionId: parsed.data.sourceActionId,
        sourcePolicyId: parsed.data.sourcePolicyId,
        sourceRunId: parsed.data.sourceRunId,
        status: parsed.data.status,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
        templateId: parsed.data.templateId || null,
        tokenHash: parsed.data.tokenHash,
        updatedAt,
    };
};

export const isSignalDeskRouteTokenActiveAt = (
    routeToken: SignalDeskRouteTokenAuthority,
    atMillis: number,
) => (
    Number.isFinite(atMillis)
    && routeToken.status === "active"
    && !routeToken.revokedAt
    && atMillis >= toMillis(routeToken.createdAt) - CLOCK_SKEW_MS
    && atMillis < toMillis(routeToken.expiresAt)
);

export interface SignalDeskRouteTokenIdempotencyClaimAuthority {
    actorId: string;
    entityId: string;
    idempotencyKeyHash: string;
    operation: "route_token_create";
    requestFingerprintHash: string;
    tokenFingerprintHash: string;
    updatedAt: string;
}

const routeTokenIdempotencyClaimSchema = z.object({
    actorId: canonicalId(3, 180),
    entityId: z.string().regex(/^route_[a-f0-9]{32}$/),
    idempotencyKeyHash: canonicalHash,
    operation: z.literal("route_token_create"),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    requestFingerprintHash: canonicalHash,
    tokenFingerprintHash: canonicalHash,
    updatedAt: z.unknown(),
}).strict();

export const parseSignalDeskRouteTokenIdempotencyClaimDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskRouteTokenIdempotencyClaimAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("ROUTE_TOKEN_CLAIM_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("ROUTE_TOKEN_CLAIM_PRODUCT_MISMATCH");
    requireKeys(identity, [
        "actorId",
        "entityId",
        "idempotencyKeyHash",
        "operation",
        "pId",
        "requestFingerprintHash",
        "tokenFingerprintHash",
        "updatedAt",
    ], "ROUTE_TOKEN_CLAIM_SHAPE_INVALID");
    const parsed = routeTokenIdempotencyClaimSchema.safeParse(raw);
    if (!parsed.success) fail("ROUTE_TOKEN_CLAIM_SHAPE_INVALID");
    if (documentId !== `route_token_${parsed.data.idempotencyKeyHash}`) {
        fail("ROUTE_TOKEN_CLAIM_IDENTITY_MISMATCH");
    }
    return {
        actorId: parsed.data.actorId,
        entityId: parsed.data.entityId,
        idempotencyKeyHash: parsed.data.idempotencyKeyHash,
        operation: parsed.data.operation,
        requestFingerprintHash: parsed.data.requestFingerprintHash,
        tokenFingerprintHash: parsed.data.tokenFingerprintHash,
        updatedAt: requiredTimestamp(parsed.data.updatedAt, "ROUTE_TOKEN_CLAIM_TIMESTAMP_INVALID"),
    };
};

export interface SignalDeskOutcomeEventAuthority {
    channel: SignalDeskOutcomeChannel;
    createdAt: string;
    createdBy: string;
    evidenceRef: string;
    idempotencyKeyHash: string;
    integrityStatus: SignalDeskOutcomeIntegrity;
    outcomeEventId: string;
    outcomeType: SignalDeskOutcomeType;
    ownerQualifiedAt: string | null;
    ownerReviewedAt: string | null;
    routeTokenId: string | null;
    source: SignalDeskOutcomeSource;
    sourceEventId: string | null;
    surfaces: SignalDeskActivationSurface[];
    targetId: string;
    targetName: string;
}

export type SignalDeskOutcomeEventProjection = Omit<
    SignalDeskOutcomeEventAuthority,
    "createdBy" | "idempotencyKeyHash"
>;

const outcomeEventSchema = z.object({
    channel: outcomeChannelSchema,
    createdAt: z.unknown(),
    createdBy: canonicalId(3, 180),
    evidenceRef: canonicalText(3, 500),
    idempotencyKeyHash: canonicalHash,
    integrityStatus: outcomeIntegritySchema,
    outcomeEventId: z.string().regex(/^outcome_[a-f0-9]{32}$/),
    outcomeType: outcomeTypeSchema,
    ownerQualifiedAt: z.unknown().optional(),
    ownerReviewedAt: z.unknown().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    routeTokenId: z.string().regex(/^route_[a-f0-9]{32}$/).nullable().optional(),
    source: outcomeSourceSchema,
    sourceEventId: nullableId(3, 180),
    surfaces: z.array(activationSurfaceSchema).max(SIGNALDESK_ACTIVATION_SURFACES.length),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
}).strict();

export const parseSignalDeskOutcomeEventDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskOutcomeEventAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_EVENT_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("OUTCOME_EVENT_PRODUCT_MISMATCH");
    if (identity.outcomeEventId !== documentId) fail("OUTCOME_EVENT_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "channel",
        "createdAt",
        "createdBy",
        "evidenceRef",
        "idempotencyKeyHash",
        "integrityStatus",
        "outcomeEventId",
        "outcomeType",
        "ownerQualifiedAt",
        "ownerReviewedAt",
        "pId",
        "routeTokenId",
        "source",
        "sourceEventId",
        "surfaces",
        "targetId",
        "targetName",
    ], "OUTCOME_EVENT_SHAPE_INVALID");
    const parsed = outcomeEventSchema.safeParse(raw);
    if (!parsed.success) fail("OUTCOME_EVENT_SHAPE_INVALID");
    if (parsed.data.outcomeEventId !== documentId) fail("OUTCOME_EVENT_IDENTITY_MISMATCH");
    if (documentId !== `outcome_${parsed.data.idempotencyKeyHash.slice(0, 32)}`) {
        fail("OUTCOME_EVENT_IDEMPOTENCY_IDENTITY_MISMATCH");
    }
    const createdAt = requiredTimestamp(parsed.data.createdAt, "OUTCOME_EVENT_TIMESTAMP_INVALID");
    const ownerQualifiedAt = optionalTimestamp(parsed.data.ownerQualifiedAt, "OUTCOME_EVENT_TIMESTAMP_INVALID");
    const ownerReviewedAt = optionalTimestamp(parsed.data.ownerReviewedAt, "OUTCOME_EVENT_TIMESTAMP_INVALID");
    const surfaces = [...parsed.data.surfaces];
    const routeTokenId = parsed.data.routeTokenId || null;
    const sourceEventId = parsed.data.sourceEventId || null;
    assertOutcomeTemporalIntegrity({
        createdOrUpdatedAt: createdAt,
        errorCode: "OUTCOME_EVENT_INTEGRITY_INVALID",
        outcomeType: parsed.data.outcomeType,
        ownerQualifiedAt,
        ownerReviewedAt,
        surfaces,
    });
    assertOutcomeSourceIntegrity({
        errorCode: "OUTCOME_EVENT_INTEGRITY_INVALID",
        integrityStatus: parsed.data.integrityStatus,
        outcomeType: parsed.data.outcomeType,
        routeTokenId,
        source: parsed.data.source,
        sourceEventId,
    });
    return {
        channel: parsed.data.channel,
        createdAt,
        createdBy: parsed.data.createdBy,
        evidenceRef: parsed.data.evidenceRef,
        idempotencyKeyHash: parsed.data.idempotencyKeyHash,
        integrityStatus: parsed.data.integrityStatus,
        outcomeEventId: parsed.data.outcomeEventId,
        outcomeType: parsed.data.outcomeType,
        ownerQualifiedAt,
        ownerReviewedAt,
        routeTokenId,
        source: parsed.data.source,
        sourceEventId,
        surfaces,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
    };
};

export const projectSignalDeskOutcomeEvent = (
    event: SignalDeskOutcomeEventAuthority,
): SignalDeskOutcomeEventProjection => ({
    channel: event.channel,
    createdAt: event.createdAt,
    evidenceRef: event.evidenceRef,
    integrityStatus: event.integrityStatus,
    outcomeEventId: event.outcomeEventId,
    outcomeType: event.outcomeType,
    ownerQualifiedAt: event.ownerQualifiedAt,
    ownerReviewedAt: event.ownerReviewedAt,
    routeTokenId: event.routeTokenId,
    source: event.source,
    sourceEventId: event.sourceEventId,
    surfaces: [...event.surfaces],
    targetId: event.targetId,
    targetName: event.targetName,
});

export interface SignalDeskOutcomeDemandSourceAuthority {
    createdAt: string;
    demandSignalId: string;
    signalType: SignalDeskDemandSignalSummary["signalType"];
    sourceSurface: SignalDeskDemandSignalSummary["sourceSurface"];
    targetId: string;
    targetName: string;
}

const outcomeDemandSourceSchema = z.object({
    createdAt: z.unknown(),
    createdBy: canonicalId(3, 180),
    demandSignalId: z.string().regex(/^demand_[a-f0-9]{32}$/),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    signalType: z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]),
    sourceSurface: z.enum(["menu", "qr", "website", "manual", "other"]),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
}).strict();

export const parseSignalDeskOutcomeDemandSourceDocument = (
    raw: unknown,
    documentId: string,
    atMillis = Date.now(),
): SignalDeskOutcomeDemandSourceAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_DEMAND_SOURCE_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("OUTCOME_DEMAND_SOURCE_PRODUCT_MISMATCH");
    if (identity.demandSignalId !== documentId) fail("OUTCOME_DEMAND_SOURCE_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "createdAt",
        "createdBy",
        "demandSignalId",
        "pId",
        "signalType",
        "sourceSurface",
        "targetId",
        "targetName",
    ], "OUTCOME_DEMAND_SOURCE_SHAPE_INVALID");
    const parsed = outcomeDemandSourceSchema.safeParse(raw);
    if (!parsed.success) fail("OUTCOME_DEMAND_SOURCE_SHAPE_INVALID");
    if (parsed.data.demandSignalId !== documentId) fail("OUTCOME_DEMAND_SOURCE_IDENTITY_MISMATCH");
    const createdAt = requiredTimestamp(parsed.data.createdAt, "OUTCOME_DEMAND_SOURCE_TIMESTAMP_INVALID");
    if (!Number.isFinite(atMillis) || toMillis(createdAt) > atMillis + CLOCK_SKEW_MS) {
        fail("OUTCOME_DEMAND_SOURCE_TIMESTAMP_INVALID");
    }
    return {
        createdAt,
        demandSignalId: parsed.data.demandSignalId,
        signalType: parsed.data.signalType,
        sourceSurface: parsed.data.sourceSurface,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
    };
};

const outcomeSummarySchema = z.object({
    channel: outcomeChannelSchema,
    count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    day: canonicalDay,
    evidenceRef: canonicalText(3, 500),
    integrityStatus: outcomeIntegritySchema,
    latestOutcomeEventId: z.string().regex(/^outcome_[a-f0-9]{32}$/),
    outcomeSummaryId: canonicalId(3, 300),
    outcomeType: outcomeTypeSchema,
    ownerQualifiedAt: z.unknown().optional(),
    ownerReviewedAt: z.unknown().optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    routeTokenId: z.string().regex(/^route_[a-f0-9]{32}$/).nullable().optional(),
    source: outcomeSourceSchema,
    sourceEventId: nullableId(3, 180),
    surfaces: z.array(activationSurfaceSchema).max(SIGNALDESK_ACTIVATION_SURFACES.length),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: z.unknown(),
}).strict();

export type SignalDeskOutcomeSummaryAuthority = SignalDeskOutcomeSummary & {
    latestOutcomeEventId: string;
};

export const signalDeskOutcomeSummaryIdFor = (params: {
    channel: SignalDeskOutcomeChannel;
    day: string;
    outcomeType: SignalDeskOutcomeType;
    source: SignalDeskOutcomeSource;
    targetId: string;
}) => {
    const parsed = z.object({
        channel: outcomeChannelSchema,
        day: canonicalDay,
        outcomeType: outcomeTypeSchema,
        source: outcomeSourceSchema,
        targetId: canonicalId(3, 160),
    }).strict().safeParse(params);
    if (!parsed.success) fail("OUTCOME_SUMMARY_ID_INPUT_INVALID");
    return `${parsed.data.day}_${parsed.data.outcomeType}_${parsed.data.source}_${parsed.data.channel}_${parsed.data.targetId}`;
};

export const signalDeskOutcomeDayForMillis = (atMillis: number) => {
    if (!Number.isSafeInteger(atMillis) || atMillis < 0) fail("OUTCOME_DAY_INPUT_INVALID");
    return new Date(atMillis).toISOString().slice(0, 10);
};

export const parseSignalDeskOutcomeSummaryDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskOutcomeSummaryAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_SUMMARY_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("OUTCOME_SUMMARY_PRODUCT_MISMATCH");
    if (identity.outcomeSummaryId !== documentId) fail("OUTCOME_SUMMARY_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "channel",
        "count",
        "day",
        "evidenceRef",
        "integrityStatus",
        "latestOutcomeEventId",
        "outcomeSummaryId",
        "outcomeType",
        "ownerQualifiedAt",
        "ownerReviewedAt",
        "pId",
        "routeTokenId",
        "source",
        "sourceEventId",
        "surfaces",
        "targetId",
        "targetName",
        "updatedAt",
    ], "OUTCOME_SUMMARY_SHAPE_INVALID");
    const parsed = outcomeSummarySchema.safeParse(raw);
    if (!parsed.success) fail("OUTCOME_SUMMARY_SHAPE_INVALID");
    const expectedId = signalDeskOutcomeSummaryIdFor({
        channel: parsed.data.channel,
        day: parsed.data.day,
        outcomeType: parsed.data.outcomeType,
        source: parsed.data.source,
        targetId: parsed.data.targetId,
    });
    if (documentId !== expectedId || parsed.data.outcomeSummaryId !== expectedId) {
        fail("OUTCOME_SUMMARY_IDENTITY_MISMATCH");
    }
    const updatedAt = requiredTimestamp(parsed.data.updatedAt, "OUTCOME_SUMMARY_TIMESTAMP_INVALID");
    const ownerQualifiedAt = optionalTimestamp(parsed.data.ownerQualifiedAt, "OUTCOME_SUMMARY_TIMESTAMP_INVALID");
    const ownerReviewedAt = optionalTimestamp(parsed.data.ownerReviewedAt, "OUTCOME_SUMMARY_TIMESTAMP_INVALID");
    const surfaces = [...parsed.data.surfaces];
    const routeTokenId = parsed.data.routeTokenId || null;
    const sourceEventId = parsed.data.sourceEventId || null;
    assertOutcomeTemporalIntegrity({
        createdOrUpdatedAt: updatedAt,
        errorCode: "OUTCOME_SUMMARY_INTEGRITY_INVALID",
        outcomeType: parsed.data.outcomeType,
        ownerQualifiedAt,
        ownerReviewedAt,
        surfaces,
    });
    assertOutcomeSourceIntegrity({
        errorCode: "OUTCOME_SUMMARY_INTEGRITY_INVALID",
        integrityStatus: parsed.data.integrityStatus,
        outcomeType: parsed.data.outcomeType,
        routeTokenId,
        source: parsed.data.source,
        sourceEventId,
    });
    return {
        channel: parsed.data.channel,
        count: parsed.data.count,
        day: parsed.data.day,
        evidenceRef: parsed.data.evidenceRef,
        integrityStatus: parsed.data.integrityStatus,
        latestOutcomeEventId: parsed.data.latestOutcomeEventId,
        outcomeSummaryId: parsed.data.outcomeSummaryId,
        outcomeType: parsed.data.outcomeType,
        ownerQualifiedAt,
        ownerReviewedAt,
        routeTokenId,
        source: parsed.data.source,
        sourceEventId,
        surfaces,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
        updatedAt,
    };
};

export const projectSignalDeskOutcomeSummary = (
    summary: SignalDeskOutcomeSummaryAuthority,
): SignalDeskOutcomeSummary => ({
    channel: summary.channel,
    count: summary.count,
    day: summary.day,
    evidenceRef: summary.evidenceRef,
    integrityStatus: summary.integrityStatus,
    outcomeSummaryId: summary.outcomeSummaryId,
    outcomeType: summary.outcomeType,
    ownerQualifiedAt: summary.ownerQualifiedAt,
    ownerReviewedAt: summary.ownerReviewedAt,
    routeTokenId: summary.routeTokenId,
    source: summary.source,
    sourceEventId: summary.sourceEventId,
    surfaces: [...(summary.surfaces || [])],
    targetId: summary.targetId,
    targetName: summary.targetName,
    updatedAt: summary.updatedAt,
});

export interface SignalDeskOutcomeIdempotencyClaimAuthority {
    actorId: string;
    entityId: string;
    entityType: "outcome";
    idempotencyKeyHash: string;
    operation: "outcome_record";
    requestFingerprintHash: string;
    updatedAt: string;
}

const outcomeIdempotencyClaimSchema = z.object({
    actorId: canonicalId(3, 180),
    entityId: z.string().regex(/^outcome_[a-f0-9]{32}$/),
    entityType: z.literal("outcome"),
    idempotencyKeyHash: canonicalHash,
    operation: z.literal("outcome_record"),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    requestFingerprintHash: canonicalHash,
    updatedAt: z.unknown(),
}).strict();

export const parseSignalDeskOutcomeIdempotencyClaimDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskOutcomeIdempotencyClaimAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_CLAIM_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("OUTCOME_CLAIM_PRODUCT_MISMATCH");
    requireKeys(identity, [
        "actorId",
        "entityId",
        "entityType",
        "idempotencyKeyHash",
        "operation",
        "pId",
        "requestFingerprintHash",
        "updatedAt",
    ], "OUTCOME_CLAIM_SHAPE_INVALID");
    const parsed = outcomeIdempotencyClaimSchema.safeParse(raw);
    if (!parsed.success) fail("OUTCOME_CLAIM_SHAPE_INVALID");
    const expectedDocumentId = `outcome_${parsed.data.idempotencyKeyHash}`;
    const expectedEntityId = `outcome_${parsed.data.idempotencyKeyHash.slice(0, 32)}`;
    if (documentId !== expectedDocumentId || parsed.data.entityId !== expectedEntityId) {
        fail("OUTCOME_CLAIM_IDENTITY_MISMATCH");
    }
    return {
        actorId: parsed.data.actorId,
        entityId: parsed.data.entityId,
        entityType: parsed.data.entityType,
        idempotencyKeyHash: parsed.data.idempotencyKeyHash,
        operation: parsed.data.operation,
        requestFingerprintHash: parsed.data.requestFingerprintHash,
        updatedAt: requiredTimestamp(parsed.data.updatedAt, "OUTCOME_CLAIM_TIMESTAMP_INVALID"),
    };
};

export interface SignalDeskAttributionTouchAuthority {
    actionId: string;
    channel: SignalDeskOutcomeChannel;
    createdAt: string;
    eventId: string;
    method: (typeof SIGNALDESK_ATTRIBUTION_METHODS)[number];
    targetId: string;
    touchId: string;
    touchType: "direct";
    weight: 1;
}

const attributionTouchSchema = z.object({
    actionId: canonicalId(3, 180),
    channel: outcomeChannelSchema,
    createdAt: z.unknown(),
    eventId: z.string().regex(/^outcome_[a-f0-9]{32}$/),
    method: z.enum(SIGNALDESK_ATTRIBUTION_METHODS),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    targetId: canonicalId(3, 160),
    touchId: z.string().regex(/^touch_[a-f0-9]{32}$/),
    touchType: z.literal("direct"),
    weight: z.literal(1),
}).strict();

export const parseSignalDeskAttributionTouchDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskAttributionTouchAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("ATTRIBUTION_TOUCH_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("ATTRIBUTION_TOUCH_PRODUCT_MISMATCH");
    if (identity.touchId !== documentId) fail("ATTRIBUTION_TOUCH_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "actionId",
        "channel",
        "createdAt",
        "eventId",
        "method",
        "pId",
        "targetId",
        "touchId",
        "touchType",
        "weight",
    ], "ATTRIBUTION_TOUCH_SHAPE_INVALID");
    const parsed = attributionTouchSchema.safeParse(raw);
    if (!parsed.success) fail("ATTRIBUTION_TOUCH_SHAPE_INVALID");
    const expectedTouchId = `touch_${hashValue(parsed.data.eventId).slice(0, 32)}`;
    if (documentId !== expectedTouchId || parsed.data.touchId !== expectedTouchId) {
        fail("ATTRIBUTION_TOUCH_IDENTITY_MISMATCH");
    }
    return {
        actionId: parsed.data.actionId,
        channel: parsed.data.channel,
        createdAt: requiredTimestamp(parsed.data.createdAt, "ATTRIBUTION_TOUCH_TIMESTAMP_INVALID"),
        eventId: parsed.data.eventId,
        method: parsed.data.method,
        targetId: parsed.data.targetId,
        touchId: parsed.data.touchId,
        touchType: parsed.data.touchType,
        weight: parsed.data.weight,
    };
};

export interface SignalDeskOutcomeTargetAuthority {
    sourceDataExpiresAt: string;
    sourceDataLifecycleState: "active";
    sourceDataObservedAt: string;
    sourcePolicyId: string;
    sourceRunId: string;
    target: SignalDeskTargetSummary;
}

export const parseSignalDeskOutcomeTargetAuthority = (
    raw: unknown,
    documentId: string,
    atMillis = Date.now(),
): SignalDeskOutcomeTargetAuthority => {
    const target = parseSignalDeskTargetSummaryDocument(raw, documentId);
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID");
    const persisted = raw as Record<string, unknown>;
    requireKeys(persisted, [
        "sourceDataExpiresAt",
        "sourceDataLifecycleState",
        "sourceDataObservedAt",
        "sourcePolicyId",
        "sourceRunId",
    ], "OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID");
    const lifecycleState = z.enum(["active", "pending", "failed", "completed"])
        .safeParse(persisted.sourceDataLifecycleState);
    const sourcePolicyId = canonicalId(3, 160).safeParse(persisted.sourcePolicyId);
    const sourceRunId = canonicalId(3, 160).safeParse(persisted.sourceRunId);
    if (!lifecycleState.success || !sourcePolicyId.success || !sourceRunId.success) {
        fail("OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID");
    }
    if (
        target.sourcePolicyId !== sourcePolicyId.data
        || target.sourceRunId !== sourceRunId.data
    ) {
        fail("OUTCOME_TARGET_SOURCE_LINEAGE_MISMATCH");
    }
    const sourceDataObservedAt = requiredTimestamp(
        persisted.sourceDataObservedAt,
        "OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID",
    );
    const sourceDataExpiresAt = requiredTimestamp(
        persisted.sourceDataExpiresAt,
        "OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID",
    );
    if (
        !Number.isFinite(atMillis)
        || toMillis(sourceDataObservedAt) > toMillis(sourceDataExpiresAt)
        || toMillis(sourceDataObservedAt) > toMillis(target.updatedAt) + CLOCK_SKEW_MS
    ) {
        fail("OUTCOME_TARGET_SOURCE_LIFECYCLE_INVALID");
    }
    if (lifecycleState.data !== "active" || toMillis(sourceDataExpiresAt) <= atMillis) {
        fail("OUTCOME_TARGET_SOURCE_LIFECYCLE_INACTIVE");
    }
    return {
        sourceDataExpiresAt,
        sourceDataLifecycleState: "active",
        sourceDataObservedAt,
        sourcePolicyId: sourcePolicyId.data,
        sourceRunId: sourceRunId.data,
        target,
    };
};

export interface SignalDeskOutcomeEvidenceAuthority {
    allowedUse: string[];
    confidence: "high" | "medium" | "low";
    createdAt: string;
    evidencePacketId: string;
    targetId: string;
    targetName: string;
    updatedAt: string;
}

const outcomeEvidenceSchema = z.object({
    allowedUse: z.array(canonicalId(3, 80)).min(1).max(12),
    confidence: z.enum(["high", "medium", "low"]),
    createdAt: z.unknown(),
    currentMenuPresence: z.record(z.string(), z.unknown()),
    evidencePacketId: z.string().regex(/^evidence_[a-f0-9]{32}$/),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    rejectedFacts: z.array(canonicalText(1, 500)).max(30),
    summary: canonicalText(3, 1_500),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: z.unknown(),
}).strict();

export const parseSignalDeskOutcomeEvidenceAuthority = (
    raw: unknown,
    documentId: string,
    targetAuthority: SignalDeskOutcomeTargetAuthority,
    atMillis = Date.now(),
): SignalDeskOutcomeEvidenceAuthority => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("OUTCOME_EVIDENCE_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("OUTCOME_EVIDENCE_PRODUCT_MISMATCH");
    if (identity.evidencePacketId !== documentId) fail("OUTCOME_EVIDENCE_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "allowedUse",
        "confidence",
        "createdAt",
        "currentMenuPresence",
        "evidencePacketId",
        "pId",
        "rejectedFacts",
        "summary",
        "targetId",
        "targetName",
        "updatedAt",
    ], "OUTCOME_EVIDENCE_SHAPE_INVALID");
    const parsed = outcomeEvidenceSchema.safeParse(raw);
    if (!parsed.success) fail("OUTCOME_EVIDENCE_SHAPE_INVALID");
    if (parsed.data.evidencePacketId !== documentId) fail("OUTCOME_EVIDENCE_IDENTITY_MISMATCH");
    if (
        parsed.data.targetId !== targetAuthority.target.targetId
        || parsed.data.targetName !== targetAuthority.target.displayName
    ) {
        fail("OUTCOME_EVIDENCE_TARGET_MISMATCH");
    }
    const allowedUse = [...parsed.data.allowedUse];
    if (new Set(allowedUse).size !== allowedUse.length || !allowedUse.includes("evidence")) {
        fail("OUTCOME_EVIDENCE_USE_INVALID");
    }
    const createdAt = requiredTimestamp(parsed.data.createdAt, "OUTCOME_EVIDENCE_TIMESTAMP_INVALID");
    const updatedAt = requiredTimestamp(parsed.data.updatedAt, "OUTCOME_EVIDENCE_TIMESTAMP_INVALID");
    if (
        !Number.isFinite(atMillis)
        || toMillis(createdAt) > toMillis(updatedAt)
        || toMillis(updatedAt) > atMillis + CLOCK_SKEW_MS
    ) {
        fail("OUTCOME_EVIDENCE_TIMESTAMP_INVALID");
    }
    if (toMillis(updatedAt) + CLOCK_SKEW_MS < toMillis(targetAuthority.sourceDataObservedAt)) {
        fail("OUTCOME_EVIDENCE_STALE");
    }
    return {
        allowedUse,
        confidence: parsed.data.confidence,
        createdAt,
        evidencePacketId: parsed.data.evidencePacketId,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
        updatedAt,
    };
};

const conversationSummarySchema = z.object({
    channel: z.enum(SIGNALDESK_CONVERSATION_CHANNELS),
    conversationId: canonicalId(3, 200),
    lastInboundAt: z.unknown().optional(),
    lastInboundOccurredAt: z.unknown().optional(),
    latestMessageExportId: canonicalId(3, 200).optional(),
    lastMessagePreview: nullableText(1, 180),
    lastOutboundAt: z.unknown().optional(),
    legalRetentionReviewReason: z.enum([
        "conversation-record",
        "post-retention-inbound-communication",
        "rights-or-complaint-communication",
    ]).optional(),
    legalRetentionReviewRequired: z.literal(true).optional(),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    state: z.enum(SIGNALDESK_CONVERSATION_STATES),
    sourceDataLifecycleCompletedAt: z.unknown().optional(),
    sourceDataLifecycleKind: z.unknown().optional(),
    sourceDataLifecycleState: z.unknown().optional(),
    sourceDataLifecycleToken: z.unknown().optional(),
    targetId: canonicalId(3, 160),
    targetName: canonicalText(2, 180),
    updatedAt: z.unknown(),
    updatedBy: z.unknown().optional(),
}).strict();

export const parseSignalDeskConversationSummaryDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskConversationSummary => {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) fail("CONVERSATION_SUMMARY_SHAPE_INVALID");
    const identity = raw as Record<string, unknown>;
    if (identity.pId !== SIGNALDESK_PRODUCT_CODE) fail("CONVERSATION_SUMMARY_PRODUCT_MISMATCH");
    if (identity.conversationId !== documentId) fail("CONVERSATION_SUMMARY_IDENTITY_MISMATCH");
    requireKeys(identity, [
        "channel",
        "conversationId",
        "pId",
        "state",
        "targetId",
        "targetName",
        "updatedAt",
    ], "CONVERSATION_SUMMARY_SHAPE_INVALID");
    const parsed = conversationSummarySchema.safeParse(raw);
    if (!parsed.success) fail("CONVERSATION_SUMMARY_SHAPE_INVALID");
    if (parsed.data.conversationId !== documentId) fail("CONVERSATION_SUMMARY_IDENTITY_MISMATCH");
    if (Boolean(parsed.data.legalRetentionReviewReason) !== Boolean(parsed.data.legalRetentionReviewRequired)) {
        fail("CONVERSATION_SUMMARY_SHAPE_INVALID");
    }
    const updatedAt = requiredTimestamp(parsed.data.updatedAt, "CONVERSATION_SUMMARY_TIMESTAMP_INVALID");
    const lifecycle = parseCompletedSourceDataLifecycle(
        identity,
        updatedAt,
        "CONVERSATION_SUMMARY_LIFECYCLE_STATE_INVALID",
    );
    if (
        (lifecycle && !parsed.data.legalRetentionReviewRequired)
        || (parsed.data.legalRetentionReviewReason === "conversation-record" && !lifecycle)
    ) {
        fail("CONVERSATION_SUMMARY_LIFECYCLE_STATE_INVALID");
    }
    const lastInboundAt = optionalTimestamp(parsed.data.lastInboundAt, "CONVERSATION_SUMMARY_TIMESTAMP_INVALID");
    const lastInboundOccurredAt = optionalTimestamp(parsed.data.lastInboundOccurredAt, "CONVERSATION_SUMMARY_TIMESTAMP_INVALID");
    const lastOutboundAt = optionalTimestamp(parsed.data.lastOutboundAt, "CONVERSATION_SUMMARY_TIMESTAMP_INVALID");
    for (const eventTime of [lastInboundAt, lastInboundOccurredAt, lastOutboundAt]) {
        if (eventTime && !isAfterWithSkew(updatedAt, eventTime)) fail("CONVERSATION_SUMMARY_TIME_ORDER_INVALID");
    }
    if (lastInboundAt && lastInboundOccurredAt && !isAfterWithSkew(lastInboundAt, lastInboundOccurredAt)) {
        fail("CONVERSATION_SUMMARY_TIME_ORDER_INVALID");
    }
    return {
        channel: parsed.data.channel,
        conversationId: parsed.data.conversationId,
        lastInboundAt,
        lastInboundOccurredAt,
        lastMessagePreview: parsed.data.lastMessagePreview || null,
        lastOutboundAt,
        state: parsed.data.state,
        targetId: parsed.data.targetId,
        targetName: parsed.data.targetName,
        updatedAt,
    };
};

export const assertSignalDeskOutcomeEventMatchesRouteToken = (
    event: SignalDeskOutcomeEventAuthority,
    routeToken: SignalDeskRouteTokenAuthority,
) => {
    const eventCreatedAt = toMillis(event.createdAt);
    if (
        event.source !== "route-token"
        || event.integrityStatus !== "menulist-signed"
        || event.routeTokenId !== routeToken.routeTokenId
        || event.targetId !== routeToken.targetId
        || event.targetName !== routeToken.targetName
        || event.channel !== routeToken.channel
        || event.ownerQualifiedAt !== routeToken.ownerQualifiedAt
        || eventCreatedAt < toMillis(routeToken.createdAt) - CLOCK_SKEW_MS
        || eventCreatedAt >= toMillis(routeToken.expiresAt)
        || (routeToken.revokedAt && eventCreatedAt > toMillis(routeToken.revokedAt))
    ) {
        fail("OUTCOME_ROUTE_TOKEN_COUPLING_INVALID");
    }
};

export const assertSignalDeskRouteTokenClaimMatchesDocument = (
    claim: SignalDeskRouteTokenIdempotencyClaimAuthority,
    routeToken: SignalDeskRouteTokenAuthority,
) => {
    if (
        claim.actorId !== routeToken.createdBy
        || claim.entityId !== routeToken.routeTokenId
        || claim.updatedAt !== routeToken.createdAt
    ) {
        fail("ROUTE_TOKEN_CLAIM_DOCUMENT_COUPLING_INVALID");
    }
};

export const assertSignalDeskOutcomeClaimMatchesEvent = (
    claim: SignalDeskOutcomeIdempotencyClaimAuthority,
    event: SignalDeskOutcomeEventAuthority,
) => {
    if (
        claim.actorId !== event.createdBy
        || claim.entityId !== event.outcomeEventId
        || claim.idempotencyKeyHash !== event.idempotencyKeyHash
        || claim.updatedAt !== event.createdAt
    ) {
        fail("OUTCOME_CLAIM_EVENT_COUPLING_INVALID");
    }
};

export const assertSignalDeskOutcomeSummaryMatchesEvent = (
    summary: SignalDeskOutcomeSummaryAuthority,
    event: SignalDeskOutcomeEventAuthority,
) => {
    const eventDay = event.createdAt.slice(0, 10);
    if (
        summary.day !== eventDay
        || summary.latestOutcomeEventId !== event.outcomeEventId
        || summary.targetId !== event.targetId
        || summary.targetName !== event.targetName
        || summary.outcomeType !== event.outcomeType
        || summary.source !== event.source
        || summary.channel !== event.channel
        || summary.evidenceRef !== event.evidenceRef
        || summary.integrityStatus !== event.integrityStatus
        || summary.ownerQualifiedAt !== event.ownerQualifiedAt
        || summary.ownerReviewedAt !== event.ownerReviewedAt
        || summary.sourceEventId !== event.sourceEventId
        || summary.routeTokenId !== event.routeTokenId
        || JSON.stringify(summary.surfaces || []) !== JSON.stringify(event.surfaces)
        || summary.count < 1
        || summary.updatedAt !== event.createdAt
    ) {
        fail("OUTCOME_SUMMARY_EVENT_COUPLING_INVALID");
    }
};

export const assertSignalDeskAttributionTouchMatchesOutcome = (
    touch: SignalDeskAttributionTouchAuthority,
    event: SignalDeskOutcomeEventAuthority,
    routeToken?: SignalDeskRouteTokenAuthority | null,
) => {
    const expectedMethod = event.source === "route-token"
        ? "route-token-direct-v1"
        : event.source === "demand-signal"
            ? "demand-signal-direct-v1"
            : "manual-direct-v1";
    const expectedActionId = event.source === "route-token"
        ? routeToken?.sourceActionId || ""
        : event.source === "demand-signal"
            ? event.sourceEventId || ""
            : event.outcomeEventId;
    if (
        touch.eventId !== event.outcomeEventId
        || touch.targetId !== event.targetId
        || touch.channel !== event.channel
        || touch.method !== expectedMethod
        || touch.actionId !== expectedActionId
        || touch.createdAt !== event.createdAt
        || (event.source === "route-token" && routeToken?.routeTokenId !== event.routeTokenId)
    ) {
        fail("ATTRIBUTION_TOUCH_OUTCOME_COUPLING_INVALID");
    }
};
