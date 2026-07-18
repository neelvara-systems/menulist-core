import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { parseSignalDeskContactIdentityDocument } from "@lib/signaldesk/targetContracts";
import type { SignalDeskTargetSummary } from "@type/signaldesk";
import { createHash } from "crypto";

export type SignalDeskWebhookProvider = "email" | "whatsapp" | "instagram" | "messenger" | "apify";
export type SignalDeskWebhookDirection = "inbound" | "source" | "status";

export type SignalDeskWebhookContactAuthority = {
    channel: "email" | "whatsapp" | "instagram" | "messenger";
    identityId: string;
    permissionState: "permissioned" | "research_only" | "blocked" | "review_required" | "expired";
    sourcePolicyId: string;
    sourceRunId: string;
    targetId: string;
    value: string;
};

export type SignalDeskWebhookDeliveryAuthority = {
    approvalId: string;
    channel: "email" | "whatsapp" | "instagram" | "messenger";
    createdAtMillis: number;
    draftId: string;
    exportId: string;
    provider: "smtp" | "meta-whatsapp" | "meta-instagram" | "meta-messenger";
    providerMessageId: string;
    targetId: string;
    targetName: string;
};

export type SignalDeskWebhookEventAuthority = {
    channel: "email" | "whatsapp" | "instagram" | "messenger" | null;
    direction: SignalDeskWebhookDirection;
    eventFingerprintHash: string | null;
    eventId: string;
    inboundState: SignalDeskWebhookInboundState | null;
    payloadHash: string;
    provider: "email" | "meta" | "apify";
    providerMessageId: string | null;
    revenueSyncStatus: "not-applicable" | "pending" | "updated";
    status: "received" | "processed";
    targetId: string | null;
};

export type SignalDeskWebhookInboundState =
    | "interested"
    | "not_interested"
    | "dnc"
    | "wrong_contact"
    | "complaint"
    | "privacy_request"
    | "legal_request"
    | "needs_review";

export type SignalDeskWebhookChannelHealthAuthority = {
    channel: "email" | "whatsapp" | "instagram" | "messenger";
    configured: boolean;
    lastError: string | null;
    lastEventAtMillis: number | null;
    requiresCanonicalRewrite: boolean;
    status: "healthy" | "paused" | "not_configured" | "warning";
    updatedAtMillis: number;
};

export type SignalDeskWebhookTargetLifecycleState = "active" | "pending" | "failed" | "completed" | null;
export type SignalDeskWebhookSuppressionIdentity = {
    identityHash: string;
    suppressionId: string;
};

const CANONICAL_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const HASH = /^[a-f0-9]{64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROVIDER_CHANNELS: ReadonlySet<string> = new Set(["email", "whatsapp", "instagram", "messenger"]);
const INBOUND_STATES: ReadonlySet<string> = new Set([
    "interested",
    "not_interested",
    "dnc",
    "wrong_contact",
    "complaint",
    "privacy_request",
    "legal_request",
    "needs_review",
]);

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

const isInboundState = (value: unknown): value is SignalDeskWebhookInboundState => (
    typeof value === "string" && INBOUND_STATES.has(value)
);

const fail = (code: string): never => {
    throw new Error(code);
};

const recordValue = (value: unknown, code: string): Record<string, unknown> => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(code);
    return value as Record<string, unknown>;
};

const boundedCanonicalId = (value: unknown, minimum: number, maximum: number, code: string): string => {
    if (
        typeof value !== "string"
        || value.length < minimum
        || value.length > maximum
        || value !== value.trim()
        || !CANONICAL_ID.test(value)
    ) return fail(code);
    return value;
};

const boundedText = (value: unknown, minimum: number, maximum: number, code: string): string => {
    if (
        typeof value !== "string"
        || value.length < minimum
        || value.length > maximum
        || value !== value.trim()
        || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
    ) return fail(code);
    return value;
};

const nullableBoundedText = (value: unknown, maximum: number, code: string): string | null => {
    if (value == null) return null;
    return boundedText(value, 1, maximum, code);
};

const timestampMillis = (value: unknown, code: string): number => {
    try {
        if (value instanceof Date) {
            const millis = value.getTime();
            if (Number.isFinite(millis) && millis > 0) return millis;
        }
        if (typeof value === "object" && value !== null && "toMillis" in value && typeof value.toMillis === "function") {
            const millis = value.toMillis();
            if (Number.isFinite(millis) && millis > 0) return millis;
        }
        if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
            const date = value.toDate();
            const millis = date instanceof Date ? date.getTime() : Number.NaN;
            if (Number.isFinite(millis) && millis > 0) return millis;
        }
    } catch {
        // The stable error below intentionally hides SDK/object details.
    }
    return fail(code);
};

const nullableTimestampMillis = (value: unknown, code: string): number | null => (
    value == null ? null : timestampMillis(value, code)
);

const providerChannel = (provider: SignalDeskWebhookProvider) => (
    provider === "apify" ? null : provider
);

const persistedProvider = (provider: SignalDeskWebhookProvider): SignalDeskWebhookEventAuthority["provider"] => (
    provider === "apify" || provider === "email" ? provider : "meta"
);

const deliveryProvider = (
    provider: Exclude<SignalDeskWebhookProvider, "apify">,
): SignalDeskWebhookDeliveryAuthority["provider"] => (
    provider === "email" ? "smtp" : `meta-${provider}`
);

export const canonicalizeSignalDeskWebhookIdentity = (
    provider: SignalDeskWebhookProvider,
    identity: string,
): string | null => {
    const trimmed = identity.trim();
    if (!trimmed || trimmed.length > 500) return null;
    if (provider === "apify") return null;
    if (provider === "email") {
        const value = trimmed.toLowerCase();
        return value.length <= 180 && EMAIL.test(value) ? value : null;
    }
    if (provider === "whatsapp") {
        const digits = trimmed.replace(/\D/g, "");
        return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
    }
    if (provider === "instagram") {
        const value = trimmed.toLowerCase().replace(/^@/, "");
        return /^[a-z0-9._]{1,30}$/.test(value) ? value : null;
    }
    return /^[A-Za-z0-9._:-]{1,180}$/.test(trimmed) ? trimmed : null;
};

export const signalDeskWebhookContactIdentityIdFor = (
    provider: SignalDeskWebhookProvider,
    identity: string,
): string | null => {
    const value = canonicalizeSignalDeskWebhookIdentity(provider, identity);
    return value && provider !== "apify" ? `${provider}_${hashValue(value)}` : null;
};

export const signalDeskWebhookSuppressionIdentityFor = (
    provider: SignalDeskWebhookProvider,
    identity: string,
    targetId: string | null,
): SignalDeskWebhookSuppressionIdentity | null => {
    const canonicalIdentity = canonicalizeSignalDeskWebhookIdentity(provider, identity);
    if (provider === "email" && canonicalIdentity) {
        return { identityHash: hashValue(canonicalIdentity), suppressionId: `email_${hashValue(canonicalIdentity)}` };
    }
    if (provider === "whatsapp" && canonicalIdentity) {
        return { identityHash: hashValue(canonicalIdentity), suppressionId: `phone_${hashValue(canonicalIdentity)}` };
    }
    if (provider === "instagram" && canonicalIdentity) {
        return { identityHash: hashValue(canonicalIdentity), suppressionId: `instagram_${hashValue(canonicalIdentity)}` };
    }
    if (provider === "messenger" && canonicalIdentity) {
        return { identityHash: hashValue(canonicalIdentity), suppressionId: `messenger_${hashValue(canonicalIdentity)}` };
    }
    return targetId
        ? { identityHash: hashValue(targetId), suppressionId: `${provider}_${hashValue(targetId)}` }
        : null;
};

export const classifySignalDeskWebhookInboundMessage = (
    message: string,
): SignalDeskWebhookInboundState => {
    const text = message.toLowerCase();
    if (/\b(stop|unsubscribe|do not contact|don't contact|dnc)\b/.test(text)) return "dnc";
    if (/\b(complaint|report you|spam complaint|harassment|unwanted message)\b/.test(text)) return "complaint";
    if (/\b(delete my data|privacy request|data request|personal data|right to erasure)\b/.test(text)) return "privacy_request";
    if (/\b(legal notice|lawyer|solicitor|cease and desist|legal action)\b/.test(text)) return "legal_request";
    if (/\bwrong (person|contact|number|email)\b/.test(text)) return "wrong_contact";
    if (
        /\b(not interested|no thanks|no thank you|do not need|don't need|not now|not right now|maybe later|perhaps later)\b/.test(text)
        || /^\s*no(?:\s|[,.!?]|$)/.test(text)
        || /^\s*later[.!?]?\s*$/.test(text)
    ) return "not_interested";
    if (/\b(yes|interested|pricing|price|demo|call|send|how much)\b/.test(text)) return "interested";
    return "needs_review";
};

export const parseSignalDeskWebhookContactAuthority = (params: {
    documentId: string;
    identity: string;
    provider: Exclude<SignalDeskWebhookProvider, "apify">;
    raw: unknown;
}): SignalDeskWebhookContactAuthority => {
    const expectedValue = canonicalizeSignalDeskWebhookIdentity(params.provider, params.identity);
    const expectedId = expectedValue ? `${params.provider}_${hashValue(expectedValue)}` : null;
    let parsed: ReturnType<typeof parseSignalDeskContactIdentityDocument>;
    try {
        parsed = parseSignalDeskContactIdentityDocument(params.raw, params.documentId);
    } catch (error) {
        const raw = recordValue(params.raw, "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH");
        const expectedIdentityHash = expectedValue
            ? hashValue(JSON.stringify([params.provider, expectedValue]))
            : null;
        const lifecycleTokenValid = typeof raw.sourceDataLifecycleToken === "string"
            && raw.sourceDataLifecycleToken.length >= 3
            && raw.sourceDataLifecycleToken.length <= 160
            && raw.sourceDataLifecycleToken === raw.sourceDataLifecycleToken.trim()
            && CANONICAL_ID.test(raw.sourceDataLifecycleToken);
        const tombstoned = expectedValue
            && expectedId === params.documentId
            && raw.pId === SIGNALDESK_PRODUCT_CODE
            && raw.identityId === params.documentId
            && raw.channel === params.provider
            && raw.permissionState === "expired"
            && raw.rawValueStored === false
            && raw.value === undefined
            && raw.sourceDataLifecycleKind === "source-data-retention-v1"
            && raw.sourceDataLifecycleState === "completed"
            && raw.identityHash === expectedIdentityHash
            && lifecycleTokenValid
            && timestampMillis(raw.sourceDataLifecycleCompletedAt, "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH") > 0
            && timestampMillis(raw.updatedAt, "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH") > 0;
        if (!tombstoned) throw error;
        return {
            channel: params.provider,
            identityId: params.documentId,
            permissionState: "expired",
            sourcePolicyId: boundedCanonicalId(
                raw.sourcePolicyId,
                3,
                160,
                "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
            ),
            sourceRunId: boundedCanonicalId(
                raw.sourceRunId,
                3,
                160,
                "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
            ),
            targetId: boundedCanonicalId(
                raw.targetId,
                3,
                160,
                "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
            ),
            value: expectedValue,
        };
    }
    const storedValue = canonicalizeSignalDeskWebhookIdentity(params.provider, parsed.value);
    if (
        !expectedValue
        || !storedValue
        || parsed.channel !== params.provider
        || parsed.value !== storedValue
        || storedValue !== expectedValue
        || parsed.identityId !== expectedId
    ) fail("SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH");
    const sourcePolicyId = boundedCanonicalId(
        parsed.sourcePolicyId,
        3,
        160,
        "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
    );
    const sourceRunId = boundedCanonicalId(
        parsed.sourceRunId,
        3,
        160,
        "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
    );
    const targetId = boundedCanonicalId(
        parsed.targetId,
        3,
        160,
        "SIGNALDESK_WEBHOOK_CONTACT_AUTHORITY_MISMATCH",
    );
    return {
        channel: params.provider,
        identityId: parsed.identityId,
        permissionState: parsed.permissionState,
        sourcePolicyId,
        sourceRunId,
        targetId,
        value: parsed.value,
    };
};

export const assertSignalDeskWebhookConversationId = (value: string): string => (
    boundedCanonicalId(value, 3, 200, "SIGNALDESK_WEBHOOK_CONVERSATION_ID_INVALID")
);

export const assertSignalDeskWebhookContactTargetCoupling = (
    contact: SignalDeskWebhookContactAuthority,
    target: SignalDeskTargetSummary,
) => {
    if (
        contact.targetId !== target.targetId
        || !target.sourcePolicyId
        || contact.sourcePolicyId !== target.sourcePolicyId
        || !target.sourceRunId
        || contact.sourceRunId !== target.sourceRunId
    ) fail("SIGNALDESK_WEBHOOK_CONTACT_TARGET_LINEAGE_MISMATCH");
};

export const canApplySignalDeskWebhookInboundToTarget = (
    target: SignalDeskTargetSummary,
    safetyEvent: boolean,
    lifecycleState: SignalDeskWebhookTargetLifecycleState = null,
    retentionHeld = lifecycleState === "pending" || lifecycleState === "failed" || lifecycleState === "completed",
) => {
    // Retained targets still need to accept inbound communication and rights
    // requests. The caller must preserve the held target state and mark the new
    // communication records for legal-retention review.
    if (retentionHeld) return true;
    if (safetyEvent) return true;
    return target.suppressionStatus === "clear"
        && (target.status === "contacted" || target.status === "replied" || target.status === "converted")
        && Boolean(target.latestConversationId);
};

export const shouldCreateSignalDeskWebhookFallbackConversation = (
    safetyEvent: boolean,
    retentionHeld: boolean,
): boolean => safetyEvent || retentionHeld;

export const parseSignalDeskWebhookTargetLifecycleState = (
    raw: unknown,
): SignalDeskWebhookTargetLifecycleState => {
    const record = recordValue(raw, "SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_SHAPE_INVALID");
    const state = record.sourceDataLifecycleState;
    if (state == null) return null;
    const lifecycleState: Exclude<SignalDeskWebhookTargetLifecycleState, null> = state === "active"
        || state === "pending"
        || state === "failed"
        || state === "completed"
        ? state
        : fail("SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_SHAPE_INVALID");
    if (
        (lifecycleState === "pending" || lifecycleState === "failed" || lifecycleState === "completed")
        && (record.status !== "held" || record.nextAction !== "hold")
    ) fail("SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_HOLD_INVALID");
    if (lifecycleState === "active") {
        timestampMillis(record.sourceDataExpiresAt, "SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_EXPIRY_INVALID");
    }
    return lifecycleState;
};

export const isSignalDeskWebhookTargetRetentionHeld = (
    raw: unknown,
    atMillis: number,
): boolean => {
    if (!Number.isFinite(atMillis) || atMillis <= 0) fail("SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_TIME_INVALID");
    const lifecycleState = parseSignalDeskWebhookTargetLifecycleState(raw);
    if (lifecycleState === "pending" || lifecycleState === "failed" || lifecycleState === "completed") return true;
    if (lifecycleState !== "active") return false;
    const record = recordValue(raw, "SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_SHAPE_INVALID");
    return timestampMillis(
        record.sourceDataExpiresAt,
        "SIGNALDESK_WEBHOOK_TARGET_LIFECYCLE_EXPIRY_INVALID",
    ) <= atMillis;
};

export const getSignalDeskWebhookLegalRetentionFields = (
    lifecycleState: SignalDeskWebhookTargetLifecycleState,
    requiresIncidentPause: boolean,
    retentionHeld = lifecycleState === "pending" || lifecycleState === "failed" || lifecycleState === "completed",
): Readonly<Record<string, unknown>> => {
    const reason = retentionHeld
        ? "post-retention-inbound-communication"
        : requiresIncidentPause ? "rights-or-complaint-communication" : null;
    return reason ? {
        legalRetentionReviewReason: reason,
        legalRetentionReviewRequired: true,
    } : {};
};

export const buildSignalDeskWebhookTargetTransition = (params: {
    conversationId: string | null;
    inboundState: SignalDeskWebhookInboundState | null;
    lifecycleState: SignalDeskWebhookTargetLifecycleState;
    ownerQualifiedAtValue: unknown;
    retentionHeld?: boolean;
    requiresIncidentPause: boolean;
    shouldSuppress: boolean;
    target: SignalDeskTargetSummary;
}): Readonly<Record<string, unknown>> => {
    const lifecycleHeld = params.retentionHeld ?? (params.lifecycleState === "pending"
        || params.lifecycleState === "failed"
        || params.lifecycleState === "completed");
    if (lifecycleHeld) {
        return {
            nextAction: "hold",
            status: "held",
            ...(params.shouldSuppress ? {
                suppressionStatus: params.requiresIncidentPause
                    ? "complaint"
                    : params.inboundState === "wrong_contact" ? "wrong-contact" : "suppressed",
            } : {}),
        };
    }
    if (params.shouldSuppress) {
        return {
            nextAction: "hold",
            status: "held",
            suppressionStatus: params.requiresIncidentPause
                ? "complaint"
                : params.inboundState === "wrong_contact" ? "wrong-contact" : "suppressed",
        };
    }
    if (params.target.status === "converted") return { nextAction: "outcome", status: "converted" };
    if (params.target.suppressionStatus !== "clear") {
        return { nextAction: "hold", status: params.target.status };
    }
    if (!params.inboundState) return {};
    return {
        latestConversationId: params.conversationId,
        nextAction: params.inboundState === "interested"
            ? "outcome"
            : params.inboundState === "needs_review" || params.requiresIncidentPause ? "review" : "hold",
        status: "replied",
        ...(params.inboundState === "interested" && !params.target.ownerQualifiedAt
            ? { ownerQualifiedAt: params.ownerQualifiedAtValue }
            : {}),
    };
};

export const parseSignalDeskWebhookDeliveryAuthority = (params: {
    documentId: string;
    provider: Exclude<SignalDeskWebhookProvider, "apify">;
    providerMessageId: string;
    raw: unknown;
}): SignalDeskWebhookDeliveryAuthority => {
    const raw = recordValue(params.raw, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    if (raw.pId !== SIGNALDESK_PRODUCT_CODE) fail("SIGNALDESK_WEBHOOK_DELIVERY_PRODUCT_MISMATCH");
    const exportId = boundedCanonicalId(raw.exportId, 3, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    if (exportId !== params.documentId) fail("SIGNALDESK_WEBHOOK_DELIVERY_IDENTITY_MISMATCH");
    const channel = raw.channel;
    if (typeof channel !== "string" || !PROVIDER_CHANNELS.has(channel) || channel !== params.provider) {
        fail("SIGNALDESK_WEBHOOK_DELIVERY_CHANNEL_MISMATCH");
    }
    const provider = raw.provider;
    const expectedProvider = deliveryProvider(params.provider);
    if (provider !== expectedProvider) fail("SIGNALDESK_WEBHOOK_DELIVERY_PROVIDER_MISMATCH");
    const providerMessageId = boundedText(raw.providerMessageId, 1, 998, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    if (providerMessageId !== params.providerMessageId) fail("SIGNALDESK_WEBHOOK_DELIVERY_MESSAGE_MISMATCH");
    if (raw.status !== "sent") fail("SIGNALDESK_WEBHOOK_DELIVERY_STATUS_INVALID");
    const ctaFingerprintHash = boundedText(raw.ctaFingerprintHash, 64, 64, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    if (!HASH.test(ctaFingerprintHash)) fail("SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    boundedCanonicalId(raw.ctaId, 1, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    boundedText(raw.body, 1, 50_000, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    boundedText(raw.subject, 1, 2_000, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    boundedText(raw.createdBy, 1, 512, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const approvalId = boundedCanonicalId(raw.approvalId, 3, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const draftId = boundedCanonicalId(raw.draftId, 3, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const targetId = boundedCanonicalId(raw.targetId, 3, 160, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const targetName = boundedText(raw.targetName, 2, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const senderDomainId = nullableBoundedText(raw.senderDomainId, 180, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    const senderFingerprint = nullableBoundedText(raw.senderDomainFingerprintHash, 64, "SIGNALDESK_WEBHOOK_DELIVERY_SHAPE_INVALID");
    if (params.provider === "email") {
        if (!senderDomainId || !senderFingerprint || !HASH.test(senderFingerprint)) {
            fail("SIGNALDESK_WEBHOOK_DELIVERY_SENDER_LINEAGE_INVALID");
        }
    } else if (senderDomainId || senderFingerprint) {
        fail("SIGNALDESK_WEBHOOK_DELIVERY_SENDER_LINEAGE_INVALID");
    }
    return {
        approvalId,
        channel: params.provider,
        createdAtMillis: timestampMillis(raw.createdAt, "SIGNALDESK_WEBHOOK_DELIVERY_TIMESTAMP_INVALID"),
        draftId,
        exportId,
        provider: expectedProvider,
        providerMessageId,
        targetId,
        targetName,
    };
};

export const selectSignalDeskWebhookDeliveryAuthority = (
    deliveries: readonly SignalDeskWebhookDeliveryAuthority[],
): SignalDeskWebhookDeliveryAuthority | null => {
    if (deliveries.length > 1) fail("SIGNALDESK_WEBHOOK_DELIVERY_AMBIGUOUS");
    return deliveries[0] || null;
};

export const resolveSignalDeskWebhookTargetAuthority = (params: {
    contact: SignalDeskWebhookContactAuthority | null;
    delivery: SignalDeskWebhookDeliveryAuthority | null;
    direction: SignalDeskWebhookDirection;
    suppliedTargetId: string | null;
}): string | null => {
    if (params.direction === "source") {
        if (params.contact || params.delivery || params.suppliedTargetId) {
            fail("SIGNALDESK_WEBHOOK_TARGET_AUTHORITY_INVALID");
        }
        return null;
    }
    const authority = params.direction === "status" ? params.delivery : params.contact;
    if (
        params.direction === "status"
        && params.contact
        && params.delivery
        && params.contact.targetId !== params.delivery.targetId
    ) fail("SIGNALDESK_WEBHOOK_TARGET_AUTHORITY_CONFLICT");
    if (params.suppliedTargetId && (!authority || params.suppliedTargetId !== authority.targetId)) {
        fail("SIGNALDESK_WEBHOOK_SUPPLIED_TARGET_UNTRUSTED");
    }
    return authority?.targetId || null;
};

export const parseSignalDeskWebhookEventDocument = (params: {
    documentId: string;
    expectedProvider: SignalDeskWebhookProvider;
    raw: unknown;
}): SignalDeskWebhookEventAuthority => {
    const raw = recordValue(params.raw, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    if (raw.pId !== SIGNALDESK_PRODUCT_CODE) fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_PRODUCT_MISMATCH");
    const eventId = boundedCanonicalId(raw.eventId, 3, 180, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    if (eventId !== params.documentId) fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_IDENTITY_MISMATCH");
    const direction: SignalDeskWebhookDirection = raw.direction === "inbound"
        || raw.direction === "source"
        || raw.direction === "status"
        ? raw.direction
        : fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const expectedChannel = providerChannel(params.expectedProvider);
    if ((raw.channel ?? null) !== expectedChannel || raw.provider !== persistedProvider(params.expectedProvider)) {
        fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_PROVIDER_MISMATCH");
    }
    const eventFingerprintHash = nullableBoundedText(raw.eventFingerprintHash, 64, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    if (eventFingerprintHash && !HASH.test(eventFingerprintHash)) fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const payloadHash = boundedText(raw.payloadHash, 64, 64, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const externalIdHash = boundedText(raw.externalIdHash, 64, 64, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    if (!HASH.test(payloadHash) || !HASH.test(externalIdHash)) fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    boundedText(raw.eventType, 2, 160, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    timestampMillis(raw.occurredAt, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_TIMESTAMP_INVALID");
    timestampMillis(raw.createdAt, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_TIMESTAMP_INVALID");
    timestampMillis(raw.updatedAt, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_TIMESTAMP_INVALID");
    const targetId = raw.targetId == null
        ? null
        : boundedCanonicalId(raw.targetId, 3, 160, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const status: SignalDeskWebhookEventAuthority["status"] = raw.status === "received" || raw.status === "processed"
        ? raw.status
        : fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_STATUS_INVALID");
    if ((status === "processed") !== Boolean(targetId)) {
        fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_STATUS_INVALID");
    }
    const providerMessageId = nullableBoundedText(raw.providerMessageId, 998, "SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const inboundState: SignalDeskWebhookInboundState | null = raw.inboundState == null
        ? null
        : isInboundState(raw.inboundState)
            ? raw.inboundState
            : fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    const rawRevenueSyncStatus = raw.revenueSyncStatus ?? "not-applicable";
    const revenueSyncStatus: SignalDeskWebhookEventAuthority["revenueSyncStatus"] = rawRevenueSyncStatus === "not-applicable"
        || rawRevenueSyncStatus === "pending"
        || rawRevenueSyncStatus === "updated"
        ? rawRevenueSyncStatus
        : fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_SHAPE_INVALID");
    if (
        revenueSyncStatus !== "not-applicable"
        && (direction !== "inbound" || inboundState !== "interested" || !targetId)
    ) fail("SIGNALDESK_WEBHOOK_EVENT_DOCUMENT_REVENUE_STATE_INVALID");
    return {
        channel: expectedChannel,
        direction,
        eventFingerprintHash,
        eventId,
        inboundState,
        payloadHash,
        provider: persistedProvider(params.expectedProvider),
        providerMessageId,
        revenueSyncStatus,
        status,
        targetId,
    };
};

export const parseSignalDeskWebhookChannelHealthDocument = (params: {
    documentId: string;
    raw: unknown;
}): SignalDeskWebhookChannelHealthAuthority => {
    const raw = recordValue(params.raw, "SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_SHAPE_INVALID");
    const exactLegacyKeys = new Set(["channel", "configured", "lastError", "lastEventAt", "status", "updatedAt"]);
    const exactLegacyProductMissing = raw.pId === undefined
        && Object.keys(raw).every((key) => exactLegacyKeys.has(key));
    if (raw.pId !== SIGNALDESK_PRODUCT_CODE && !exactLegacyProductMissing) {
        fail("SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_PRODUCT_MISMATCH");
    }
    if (raw.channel !== params.documentId || !PROVIDER_CHANNELS.has(params.documentId)) {
        fail("SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_IDENTITY_MISMATCH");
    }
    const configured: boolean = typeof raw.configured === "boolean"
        ? raw.configured
        : fail("SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_SHAPE_INVALID");
    const requiresCanonicalRewrite = exactLegacyProductMissing || raw.status === "blocked";
    const normalizedStatus = raw.status === "blocked" ? "paused" : raw.status;
    const status: SignalDeskWebhookChannelHealthAuthority["status"] = normalizedStatus === "healthy"
        || normalizedStatus === "paused"
        || normalizedStatus === "not_configured"
        || normalizedStatus === "warning"
        ? normalizedStatus
        : fail("SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_SHAPE_INVALID");
    if ((status === "healthy" && !configured) || (status === "not_configured" && configured)) {
        fail("SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_STATUS_INVALID");
    }
    return {
        channel: params.documentId as SignalDeskWebhookChannelHealthAuthority["channel"],
        configured,
        lastError: nullableBoundedText(raw.lastError, 500, "SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_SHAPE_INVALID"),
        lastEventAtMillis: nullableTimestampMillis(raw.lastEventAt, "SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_TIMESTAMP_INVALID"),
        requiresCanonicalRewrite,
        status,
        updatedAtMillis: timestampMillis(raw.updatedAt, "SIGNALDESK_WEBHOOK_CHANNEL_HEALTH_TIMESTAMP_INVALID"),
    };
};
