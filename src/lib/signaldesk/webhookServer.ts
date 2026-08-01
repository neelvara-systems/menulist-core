import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_INTEGRATION_ENV } from "@constant/signaldesk/integrations";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { buildSignalDeskDailyCostMutation } from "@lib/signaldesk/accountingContracts";
import { parseSignalDeskConversationSummaryDocument } from "@lib/signaldesk/outcomeContracts";
import {
    parseSignalDeskKillSwitchDocument,
    projectSignalDeskControlRoomDocument,
    projectSignalDeskQueueDocument,
} from "@lib/signaldesk/server";
import { parseSignalDeskTargetSummaryDocument } from "@lib/signaldesk/targetContracts";
import {
    assertSignalDeskWebhookContactTargetCoupling,
    assertSignalDeskWebhookConversationId,
    buildSignalDeskWebhookTargetTransition,
    canApplySignalDeskWebhookInboundToTarget,
    canonicalizeSignalDeskWebhookIdentity,
    classifySignalDeskWebhookInboundMessage,
    getSignalDeskWebhookLegalRetentionFields,
    isSignalDeskInboxReviewState,
    isSignalDeskSafetyReplyState,
    isSignalDeskWebhookTargetRetentionHeld,
    parseSignalDeskWebhookChannelHealthDocument,
    parseSignalDeskWebhookContactAuthority,
    parseSignalDeskWebhookDeliveryAuthority,
    parseSignalDeskWebhookEventDocument,
    parseSignalDeskWebhookTargetLifecycleState,
    resolveSignalDeskWebhookTargetAuthority,
    selectSignalDeskWebhookDeliveryAuthority,
    shouldCreateSignalDeskWebhookFallbackConversation,
    signalDeskWebhookContactIdentityIdFor,
    signalDeskWebhookSuppressionIdentityFor,
    type SignalDeskWebhookContactAuthority,
    type SignalDeskWebhookDeliveryAuthority,
    type SignalDeskWebhookDirection,
    type SignalDeskWebhookInboundState,
    type SignalDeskWebhookProvider,
    type SignalDeskWebhookTargetLifecycleState,
} from "@lib/signaldesk/webhookContracts";
import { qualifySignalDeskRevenueAccountServer } from "@lib/signaldesk/workflowServer";
import type { SignalDeskAccessContext, SignalDeskTargetSummary } from "@type/signaldesk";
import { createHash, createHmac, timingSafeEqual } from "crypto";

type SignalDeskWebhookPayload = Record<string, unknown>;

type SignalDeskNormalizedWebhookEvent = {
    direction: SignalDeskWebhookDirection;
    eventType: string;
    externalId: string;
    identity: string;
    message: string;
    messageHash: string;
    messageTruncated: boolean;
    occurredAtMillis: number | null;
    providerMessageId: string;
    suppliedTargetId: string | null;
};

type SignalDeskWebhookProcessResult = {
    eventId: string;
    revenueSyncStatus: "not-applicable" | "pending" | "updated";
    status: "duplicate" | "processed" | "received";
};

const SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED = "signaldesk_webhook_body_parse_failed";
const SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID = "signaldesk_webhook_body_shape_invalid";
const SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID = "signaldesk_webhook_event_shape_invalid";
const SIGNALDESK_WEBHOOK_EVENT_CONFLICT = "signaldesk_webhook_event_conflict";
const SIGNALDESK_WEBHOOK_TARGET_CONFLICT = "signaldesk_webhook_target_conflict";
const SIGNALDESK_WEBHOOK_MAX_EVENTS = 100;
const SIGNALDESK_WEBHOOK_MAX_EVENT_TYPE_CHARS = 160;
const SIGNALDESK_WEBHOOK_MAX_EXTERNAL_ID_CHARS = 1200;
const SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS = 500;
const SIGNALDESK_WEBHOOK_MAX_MESSAGE_CHARS = 4000;
const SIGNALDESK_WEBHOOK_MAX_PROVIDER_MESSAGE_ID_CHARS = 998;
const SIGNALDESK_WEBHOOK_MAX_TARGET_ID_CHARS = 160;
const SIGNALDESK_WEBHOOK_FUTURE_SKEW_MS = 5 * 60 * 1000;

const webhookSystemAccess: SignalDeskAccessContext = {
    active: true,
    email: undefined,
    firebaseConfigured: true,
    isPlatformAdmin: false,
    name: "SignalDesk provider webhook",
    permissions: [],
    role: "system-worker",
    userId: "signaldesk-provider-webhook",
};

class SignalDeskWebhookRequestError extends Error {
    readonly code: string;
    readonly status: 400 | 401 | 409 | 422;

    constructor(code: string, status: 400 | 401 | 409 | 422) {
        super(code);
        this.code = code;
        this.name = "SignalDeskWebhookRequestError";
        this.status = status;
    }
}

export const getSignalDeskWebhookRequestErrorStatus = (error: unknown) => (
    error instanceof SignalDeskWebhookRequestError ? error.status : null
);

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db: FirebaseFirestore.Firestore | null = signaldeskFirestoreAdmin;
    return db && typeof db.collection === "function" ? signaldeskFirestoreAdmin : null;
};

const now = () => admin.firestore.Timestamp.now();
const env = (key: string) => process.env[key]?.trim() || "";
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const sanitizeForFirestore = <T>(value: T): T extends undefined ? null : T => sanitizeFirestoreValue(value, {
    dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
});

const safeEqual = (left: string, right: string) => {
    try {
        return timingSafeEqual(Buffer.from(left), Buffer.from(right));
    } catch {
        return false;
    }
};

const isRecord = (value: unknown): value is SignalDeskWebhookPayload => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const asRecord = (value: unknown): SignalDeskWebhookPayload | null => isRecord(value) ? value : null;
const asRecordArray = (value: unknown): SignalDeskWebhookPayload[] => (
    Array.isArray(value) ? value.filter(isRecord) : []
);

const normalizeWebhookString = (value: unknown, maxLength: number) => {
    const normalized = typeof value === "string"
        ? value.trim()
        : typeof value === "number" && Number.isFinite(value) ? String(value) : "";
    if (normalized.length > maxLength || /[\u0000-\u001f\u007f]/.test(normalized)) {
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, 422);
    }
    return normalized;
};

const hasWebhookValue = (value: unknown) => (
    (typeof value === "string" && value.trim().length > 0)
    || (typeof value === "number" && Number.isFinite(value))
);

const normalizeWebhookIdentity = (provider: SignalDeskWebhookProvider, identity: string) => {
    return canonicalizeSignalDeskWebhookIdentity(provider, identity) || identity.trim();
};

const normalizeTargetId = (value: unknown) => {
    if (typeof value !== "string") return null;
    const normalized = value.trim();
    return normalized || null;
};

const parseWebhookTimestamp = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const numeric = typeof value === "number" ? value : Number(value);
    let millis = Number.isFinite(numeric)
        ? numeric < 10_000_000_000 ? numeric * 1000 : numeric
        : typeof value === "string" ? new Date(value).getTime() : Number.NaN;
    if (!Number.isFinite(millis) || millis <= 0 || millis > Date.now() + SIGNALDESK_WEBHOOK_FUTURE_SKEW_MS) return null;
    millis = Math.floor(millis);
    return millis;
};

const timestampMillis = (value: unknown): number | null => {
    if (!value) return null;
    if (typeof (value as { toMillis?: unknown }).toMillis === "function") {
        const millis = (value as { toMillis: () => number }).toMillis();
        return Number.isFinite(millis) ? millis : null;
    }
    if (typeof (value as { toDate?: unknown }).toDate === "function") {
        const millis = (value as { toDate: () => Date }).toDate().getTime();
        return Number.isFinite(millis) ? millis : null;
    }
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
    return parseWebhookTimestamp(value);
};

const fallbackWebhookExternalId = (
    provider: SignalDeskWebhookProvider,
    rawBody: string,
    eventIndex: number,
) => `${provider}_${hashValue(`${eventIndex}:${rawBody}`).slice(0, 32)}`;

const boundedMessage = (value: unknown, fallback = "") => {
    const fullValue = typeof value === "string" ? value.trim() : "";
    const canonicalValue = fullValue || fallback;
    const normalized = canonicalValue.slice(0, SIGNALDESK_WEBHOOK_MAX_MESSAGE_CHARS);
    return {
        message: normalized,
        messageHash: hashValue(canonicalValue),
        messageTruncated: fullValue.length > SIGNALDESK_WEBHOOK_MAX_MESSAGE_CHARS,
    };
};

const getWebhookPayloadLogContext = (params: { provider: SignalDeskWebhookProvider; rawBody: string }) => ({
    rawBodyBytes: Buffer.byteLength(params.rawBody, "utf8"),
    ...getBoundedRuntimeStringContext("rawBodyHash", hashValue(params.rawBody)),
    product: "signaldesk",
    provider: params.provider,
});

const parseSignalDeskWebhookPayload = (params: {
    provider: SignalDeskWebhookProvider;
    rawBody: string;
}): SignalDeskWebhookPayload => {
    const bodyText = params.rawBody.trim();
    if (!bodyText) {
        const error = new Error(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID);
        logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID, error, getWebhookPayloadLogContext(params));
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID, 400);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(bodyText) as unknown;
    } catch (error) {
        logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED, error, getWebhookPayloadLogContext(params));
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED, 400);
    }

    if (!isRecord(parsed)) {
        const error = new Error(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID);
        logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID, error, getWebhookPayloadLogContext(params));
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID, 400);
    }

    return parsed;
};

const verifyMetaSignature = (rawBody: string, signature: string | null) => {
    const appSecret = env(SIGNALDESK_INTEGRATION_ENV.META_APP_SECRET);
    if (!appSecret || !signature) return false;
    const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
    return safeEqual(signature, expected);
};

const verifyApifySecret = (headers: Headers) => {
    const secret = env(SIGNALDESK_INTEGRATION_ENV.APIFY_WEBHOOK_SECRET);
    const provided = headers.get("x-signaldesk-webhook-secret") || headers.get("x-apify-webhook-secret") || "";
    return Boolean(secret && provided && safeEqual(provided, secret));
};

export function verifySignalDeskWebhookChallenge(provider: SignalDeskWebhookProvider, url: URL) {
    if (provider !== "whatsapp" && provider !== "instagram" && provider !== "messenger") return null;
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = env(SIGNALDESK_INTEGRATION_ENV.META_VERIFY_TOKEN);
    if (mode === "subscribe" && token && expectedToken && safeEqual(token, expectedToken)) return challenge || "";
    return null;
}

const makeEvent = (input: Omit<
    SignalDeskNormalizedWebhookEvent,
    "eventType" | "externalId" | "identity" | "message" | "messageHash" | "messageTruncated" | "providerMessageId"
> & {
    eventType: unknown;
    externalId: unknown;
    identity: unknown;
    message?: unknown;
    messageFallback?: string;
    providerMessageId: unknown;
}): SignalDeskNormalizedWebhookEvent => {
    const message = boundedMessage(input.message, input.messageFallback);
    return {
        direction: input.direction,
        eventType: normalizeWebhookString(input.eventType, SIGNALDESK_WEBHOOK_MAX_EVENT_TYPE_CHARS),
        externalId: normalizeWebhookString(input.externalId, SIGNALDESK_WEBHOOK_MAX_EXTERNAL_ID_CHARS),
        identity: normalizeWebhookString(input.identity, SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS),
        message: message.message,
        messageHash: message.messageHash,
        messageTruncated: message.messageTruncated,
        occurredAtMillis: input.occurredAtMillis,
        providerMessageId: normalizeWebhookString(input.providerMessageId, SIGNALDESK_WEBHOOK_MAX_PROVIDER_MESSAGE_ID_CHARS),
        suppliedTargetId: input.suppliedTargetId,
    };
};

const getApifyEvents = (payload: SignalDeskWebhookPayload, rawBody: string) => {
    const resource = asRecord(payload.resource) || {};
    const eventData = asRecord(payload.eventData) || {};
    const hasEventSignal = [
        payload.eventType,
        payload.runId,
        payload.runStatus,
        resource.id,
        resource.status,
        eventData.actorRunId,
        eventData.status,
    ].some(hasWebhookValue);
    if (!hasEventSignal) return [];
    const runId = normalizeWebhookString(
        payload.runId || resource.id || eventData.actorRunId || fallbackWebhookExternalId("apify", rawBody, 0),
        SIGNALDESK_WEBHOOK_MAX_EXTERNAL_ID_CHARS,
    );
    const status = normalizeWebhookString(payload.runStatus || resource.status || eventData.status || "received", 80);
    return [makeEvent({
        direction: "source",
        eventType: payload.eventType || `apify.run.${status.toLowerCase()}`,
        externalId: `apify_${runId}`,
        identity: "",
        occurredAtMillis: parseWebhookTimestamp(payload.eventTime || payload.createdAt || payload.timestamp),
        providerMessageId: runId,
        suppliedTargetId: null,
    })];
};

const getEmailEvents = (payload: SignalDeskWebhookPayload, rawBody: string) => {
    const hasEventSignal = [
        payload.event,
        payload.type,
        payload.eventId,
        payload.messageId,
        payload.providerMessageId,
        payload.id,
        payload.email,
        payload.recipient,
        payload.from,
        payload.message,
        payload.reason,
    ].some(hasWebhookValue);
    if (!hasEventSignal) return [];
    const eventType = normalizeWebhookString(payload.event || payload.type || "email.event", SIGNALDESK_WEBHOOK_MAX_EVENT_TYPE_CHARS);
    const isInbound = /(^|[._-])(reply|inbound|received)([._-]|$)/i.test(eventType);
    const identity = isInbound
        ? payload.from || payload.sender || payload.email || payload.recipient
        : payload.recipient || payload.to || payload.email;
    const providerMessageId = normalizeWebhookString(
        payload.messageId || payload.providerMessageId,
        SIGNALDESK_WEBHOOK_MAX_PROVIDER_MESSAGE_ID_CHARS,
    );
    const externalId = payload.eventId
        || payload.id
        || (providerMessageId ? isInbound ? providerMessageId : `${providerMessageId}:${eventType}` : fallbackWebhookExternalId("email", rawBody, 0));
    return [makeEvent({
        direction: isInbound ? "inbound" : "status",
        eventType,
        externalId,
        identity,
        message: isInbound ? payload.message || payload.text || payload.body || payload.reason : "",
        occurredAtMillis: parseWebhookTimestamp(payload.occurredAt || payload.timestamp || payload.createdAt),
        providerMessageId,
        suppliedTargetId: normalizeTargetId(payload.targetId),
    })];
};

const getWhatsAppEvents = (payload: SignalDeskWebhookPayload, rawBody: string) => {
    const events: SignalDeskNormalizedWebhookEvent[] = [];
    let eventIndex = 0;
    for (const entry of asRecordArray(payload.entry)) {
        for (const change of asRecordArray(entry.changes)) {
            const value = asRecord(change.value) || {};
            for (const message of asRecordArray(value.messages)) {
                const type = normalizeWebhookString(message.type || "unknown", 80);
                const text = asRecord(message.text);
                events.push(makeEvent({
                    direction: "inbound",
                    eventType: `whatsapp.message.${type.toLowerCase()}`,
                    externalId: message.id || fallbackWebhookExternalId("whatsapp", rawBody, eventIndex),
                    identity: message.from,
                    message: text?.body,
                    messageFallback: `[${type || "non-text"} message]`,
                    occurredAtMillis: parseWebhookTimestamp(message.timestamp),
                    providerMessageId: message.id,
                    suppliedTargetId: null,
                }));
                eventIndex += 1;
            }
            for (const status of asRecordArray(value.statuses)) {
                const statusName = normalizeWebhookString(status.status || "unknown", 80).toLowerCase();
                const providerMessageId = normalizeWebhookString(status.id, SIGNALDESK_WEBHOOK_MAX_PROVIDER_MESSAGE_ID_CHARS);
                events.push(makeEvent({
                    direction: "status",
                    eventType: `whatsapp.status.${statusName}`,
                    externalId: `${providerMessageId || fallbackWebhookExternalId("whatsapp", rawBody, eventIndex)}:${statusName}`,
                    identity: status.recipient_id,
                    occurredAtMillis: parseWebhookTimestamp(status.timestamp),
                    providerMessageId,
                    suppliedTargetId: null,
                }));
                eventIndex += 1;
            }
        }
    }
    return events;
};

const getInstagramOrMessengerEvents = (
    provider: "instagram" | "messenger",
    payload: SignalDeskWebhookPayload,
    rawBody: string,
) => {
    const events: SignalDeskNormalizedWebhookEvent[] = [];
    let eventIndex = 0;
    for (const entry of asRecordArray(payload.entry)) {
        const accountId = normalizeWebhookString(entry.id, SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS);
        for (const messaging of asRecordArray(entry.messaging)) {
            const sender = asRecord(messaging.sender) || {};
            const recipient = asRecord(messaging.recipient) || {};
            const message = asRecord(messaging.message);
            const postback = asRecord(messaging.postback);
            const senderId = normalizeWebhookString(sender.id, SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS);
            const recipientId = normalizeWebhookString(recipient.id, SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS);
            if (message) {
                const isEcho = message.is_echo === true || message.is_self === true || Boolean(accountId && senderId === accountId);
                const attachments = Array.isArray(message.attachments) ? message.attachments : [];
                events.push(makeEvent({
                    direction: isEcho ? "status" : "inbound",
                    eventType: `${provider}.message${isEcho ? ".echo" : ""}`,
                    externalId: message.mid || fallbackWebhookExternalId(provider, rawBody, eventIndex),
                    identity: isEcho ? recipientId : senderId,
                    message: isEcho ? "" : message.text,
                    messageFallback: isEcho ? "" : attachments.length ? "[attachment message]" : "[non-text message]",
                    occurredAtMillis: parseWebhookTimestamp(messaging.timestamp || entry.time),
                    providerMessageId: message.mid,
                    suppliedTargetId: null,
                }));
                eventIndex += 1;
            } else if (postback) {
                events.push(makeEvent({
                    direction: "inbound",
                    eventType: `${provider}.postback`,
                    externalId: postback.mid || fallbackWebhookExternalId(provider, rawBody, eventIndex),
                    identity: senderId,
                    message: postback.title || postback.payload,
                    messageFallback: "[postback]",
                    occurredAtMillis: parseWebhookTimestamp(messaging.timestamp || entry.time),
                    providerMessageId: postback.mid,
                    suppliedTargetId: null,
                }));
                eventIndex += 1;
            }
        }
    }
    return events;
};

const requireProviderEvents = (
    provider: SignalDeskWebhookProvider,
    payload: SignalDeskWebhookPayload,
    rawBody: string,
) => {
    const events = provider === "apify"
        ? getApifyEvents(payload, rawBody)
        : provider === "email"
            ? getEmailEvents(payload, rawBody)
            : provider === "whatsapp"
                ? getWhatsAppEvents(payload, rawBody)
                : getInstagramOrMessengerEvents(provider, payload, rawBody);
    if (
        !events.length
        || events.some((event) => (
            !event.eventType
            || !event.externalId
            || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(event.eventType)
        ))
    ) {
        const error = new Error(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID);
        logRuntimeFailure(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, error, getWebhookPayloadLogContext({ provider, rawBody }));
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, 422);
    }
    if (events.length > SIGNALDESK_WEBHOOK_MAX_EVENTS) {
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, 422);
    }
    return events;
};

const findContactAuthorityByIdentity = async (
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    provider: Exclude<SignalDeskWebhookProvider, "apify">,
    identity: string,
): Promise<SignalDeskWebhookContactAuthority | null> => {
    const identityId = signalDeskWebhookContactIdentityIdFor(provider, identity);
    if (!identityId) return null;
    const ref = db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(identityId);
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    return parseSignalDeskWebhookContactAuthority({
        documentId: snapshot.id,
        identity,
        provider,
        raw: snapshot.data(),
    });
};

const findDeliveryAuthority = async (
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    provider: Exclude<SignalDeskWebhookProvider, "apify">,
    providerMessageId: string,
): Promise<SignalDeskWebhookDeliveryAuthority | null> => {
    if (!providerMessageId) return null;
    const deliverySnapshot = await transaction.get(
        db.collection(SIGNALDESK_COLLECTIONS.MESSAGE_EXPORTS)
            .where("channel", "==", provider)
            .where("providerMessageId", "==", providerMessageId)
            .limit(2),
    );
    const deliveries = deliverySnapshot.docs.map((document) => parseSignalDeskWebhookDeliveryAuthority({
        documentId: document.id,
        provider,
        providerMessageId,
        raw: document.data(),
    }));
    return selectSignalDeskWebhookDeliveryAuthority(deliveries);
};

const webhookEventFingerprint = (provider: SignalDeskWebhookProvider, event: SignalDeskNormalizedWebhookEvent) => hashValue(JSON.stringify({
    direction: event.direction,
    eventType: event.eventType,
    externalId: event.externalId,
    identity: normalizeWebhookIdentity(provider, event.identity),
    message: event.message,
    messageHash: event.messageHash,
    occurredAtMillis: event.occurredAtMillis,
    providerMessageId: event.providerMessageId,
    suppliedTargetId: event.suppliedTargetId,
}));

const verifyWebhookDuplicate = (
    data: unknown,
    documentId: string,
    eventFingerprintHash: string,
    payloadHash: string,
    provider: SignalDeskWebhookProvider,
) => {
    const stored = parseSignalDeskWebhookEventDocument({
        documentId,
        expectedProvider: provider,
        raw: data,
    });
    if (
        (stored.eventFingerprintHash && stored.eventFingerprintHash === eventFingerprintHash)
        || (!stored.eventFingerprintHash && stored.payloadHash === payloadHash)
    ) return stored;
    throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_CONFLICT, 409);
};

const settleSignalDeskWebhookRevenueSync = async (params: {
    db: FirebaseFirestore.Firestore;
    eventRef: FirebaseFirestore.DocumentReference;
    provider: SignalDeskWebhookProvider;
}) => {
    await params.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const timestamp = now();
        const costDay = timestamp.toDate().toISOString().slice(0, 10);
        const costRef = params.db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(costDay);
        const [eventSnapshot, costSnapshot] = await Promise.all([
            transaction.get(params.eventRef),
            transaction.get(costRef),
        ]);
        if (!eventSnapshot.exists) throw new Error("SIGNALDESK_WEBHOOK_REVENUE_EVENT_MISSING");
        const event = parseSignalDeskWebhookEventDocument({
            documentId: eventSnapshot.id,
            expectedProvider: params.provider,
            raw: eventSnapshot.data(),
        });
        if (event.revenueSyncStatus === "updated") return;
        if (event.revenueSyncStatus !== "pending" || event.inboundState !== "interested" || !event.targetId) {
            throw new Error("SIGNALDESK_WEBHOOK_REVENUE_SETTLEMENT_CONFLICT");
        }
        transaction.set(params.eventRef, sanitizeForFirestore({
            revenueSyncStatus: "updated",
            updatedAt: timestamp,
        }), { merge: true });
        transaction.set(costRef, sanitizeForFirestore(buildSignalDeskDailyCostMutation({
            current: costSnapshot.exists ? costSnapshot.data() : null,
            day: costDay,
            delta: { firestoreWriteEstimate: 2 },
            updatedAt: timestamp,
        })));
    });
};

const processNormalizedWebhookEvent = async (params: {
    db: FirebaseFirestore.Firestore;
    event: SignalDeskNormalizedWebhookEvent;
    payloadHash: string;
    provider: SignalDeskWebhookProvider;
}) => {
    const { db, event, payloadHash, provider } = params;
    const eventFingerprintHash = webhookEventFingerprint(provider, event);
    const eventRef = db.collection(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS)
        .doc(`webhook_${provider}_${hashValue(event.externalId).slice(0, 40)}`);
    const eventTypeLower = event.eventType.toLowerCase();
    const inboundState = event.direction === "inbound" && event.message
        ? classifySignalDeskWebhookInboundMessage(event.message)
        : null;
    const shouldSuppress = /unsubscribe|complaint|hard[._-]?bounce|dnc/.test(eventTypeLower)
        || inboundState === "dnc"
        || inboundState === "wrong_contact"
        || inboundState === "complaint"
        || inboundState === "privacy_request"
        || inboundState === "legal_request";
    const requiresIncidentPause = eventTypeLower.includes("complaint")
        || inboundState === "complaint"
        || inboundState === "privacy_request"
        || inboundState === "legal_request";

    const transactionResult = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const existingEventSnap = await transaction.get(eventRef);
        if (existingEventSnap.exists) {
            const stored = verifyWebhookDuplicate(
                existingEventSnap.data(),
                existingEventSnap.id,
                eventFingerprintHash,
                payloadHash,
                provider,
            );
            return {
                duplicate: true,
                eventId: eventRef.id,
                inboundState: stored.inboundState,
                revenueSyncStatus: stored.revenueSyncStatus,
                targetId: stored.targetId,
            };
        }

        const suppliedTargetId = event.suppliedTargetId;
        if (suppliedTargetId && !new RegExp(`^[A-Za-z0-9_-]{3,${SIGNALDESK_WEBHOOK_MAX_TARGET_ID_CHARS}}$`).test(suppliedTargetId)) {
            throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 422);
        }
        const contactAuthority = event.direction !== "source" && provider !== "apify"
            ? await findContactAuthorityByIdentity(transaction, db, provider, event.identity)
            : null;
        const deliveryAuthority = event.direction === "status" && provider !== "apify"
            ? await findDeliveryAuthority(transaction, db, provider, event.providerMessageId)
            : null;
        if (
            deliveryAuthority
            && event.occurredAtMillis
            && event.occurredAtMillis + SIGNALDESK_WEBHOOK_FUTURE_SKEW_MS < deliveryAuthority.createdAtMillis
        ) {
            throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 422);
        }
        let authorityTargetId: string | null;
        try {
            authorityTargetId = resolveSignalDeskWebhookTargetAuthority({
                contact: contactAuthority,
                delivery: deliveryAuthority,
                direction: event.direction,
                suppliedTargetId,
            });
        } catch (error) {
            if (error instanceof Error && error.message === "SIGNALDESK_WEBHOOK_SUPPLIED_TARGET_UNTRUSTED") {
                throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 409);
            }
            if (error instanceof Error && error.message === "SIGNALDESK_WEBHOOK_TARGET_AUTHORITY_CONFLICT") {
                throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 409);
            }
            throw error;
        }

        const authorityTargetRef = authorityTargetId
            ? db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(authorityTargetId)
            : null;
        const authorityTargetSnap = authorityTargetRef ? await transaction.get(authorityTargetRef) : null;
        const authorityTargetRaw = authorityTargetSnap?.exists ? authorityTargetSnap.data() : null;
        const authorityTarget = authorityTargetSnap?.exists
            ? parseSignalDeskTargetSummaryDocument(authorityTargetRaw, authorityTargetSnap.id)
            : null;
        const timestamp = now();
        const targetLifecycleState: SignalDeskWebhookTargetLifecycleState = authorityTargetRaw
            ? parseSignalDeskWebhookTargetLifecycleState(authorityTargetRaw)
            : null;
        const targetLifecycleHeld = authorityTargetRaw
            ? isSignalDeskWebhookTargetRetentionHeld(authorityTargetRaw, timestamp.toMillis())
            : false;
        if (event.direction === "inbound" && contactAuthority && authorityTarget) {
            assertSignalDeskWebhookContactTargetCoupling(contactAuthority, authorityTarget);
        }
        let targetId = authorityTarget?.targetId || null;
        let target: SignalDeskTargetSummary | null = authorityTarget;
        if (
            event.direction === "inbound"
            && target
            && !canApplySignalDeskWebhookInboundToTarget(
                target,
                shouldSuppress,
                targetLifecycleState,
                targetLifecycleHeld,
            )
        ) {
            targetId = null;
            target = null;
        }

        const costDay = timestamp.toDate().toISOString().slice(0, 10);
        const costRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(costDay);
        const costSnap = await transaction.get(costRef);
        const eventOccurredAtMillis = event.occurredAtMillis || timestamp.toMillis();
        const eventOccurredAt = admin.firestore.Timestamp.fromMillis(eventOccurredAtMillis);
        let estimatedWrites = 1;
        let conversationId: string | null = null;
        let outOfOrder = false;
        let projectedInboundState = inboundState;
        let conversationRef: FirebaseFirestore.DocumentReference | null = null;
        let conversationSnapshot: FirebaseFirestore.DocumentSnapshot | null = null;
        let conversationAuthority: ReturnType<typeof parseSignalDeskConversationSummaryDocument> | null = null;
        let currentConversationState = "";
        let queueRef: FirebaseFirestore.DocumentReference | null = null;
        let queueAuthority: ReturnType<typeof projectSignalDeskQueueDocument> = null;
        let nextInboxBacklog: number | null = null;

        if (targetId && target && inboundState && event.message && provider !== "apify") {
            const preferredConversationRef = target.latestConversationId
                ? db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES)
                    .doc(assertSignalDeskWebhookConversationId(target.latestConversationId))
                : null;
            const preferredSnapshot = preferredConversationRef
                ? await transaction.get(preferredConversationRef)
                : null;
            const preferredAuthority = preferredSnapshot?.exists
                ? parseSignalDeskConversationSummaryDocument(preferredSnapshot.data(), preferredSnapshot.id)
                : null;
            if (preferredAuthority && preferredAuthority.targetId !== targetId) {
                throw new Error("SIGNALDESK_WEBHOOK_CONVERSATION_TARGET_MISMATCH");
            }
            if (preferredAuthority?.channel === provider) {
                conversationRef = preferredConversationRef;
                conversationSnapshot = preferredSnapshot;
                conversationAuthority = preferredAuthority;
            } else if (shouldCreateSignalDeskWebhookFallbackConversation(shouldSuppress, targetLifecycleHeld)) {
                conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES)
                    .doc(`conv_${provider}_${targetId}`);
                conversationSnapshot = preferredConversationRef?.path === conversationRef.path
                    ? preferredSnapshot
                    : await transaction.get(conversationRef);
                conversationAuthority = conversationSnapshot?.exists
                    ? parseSignalDeskConversationSummaryDocument(conversationSnapshot.data(), conversationSnapshot.id)
                    : null;
                if (
                    conversationAuthority
                    && (conversationAuthority.targetId !== targetId || conversationAuthority.channel !== provider)
                ) throw new Error("SIGNALDESK_WEBHOOK_CONVERSATION_LINEAGE_MISMATCH");
            } else {
                targetId = null;
                target = null;
            }
        }

        if (targetId && target && inboundState && event.message && conversationRef) {
            const lastInboundMillis = conversationAuthority
                ? timestampMillis(conversationAuthority.lastInboundOccurredAt || conversationAuthority.lastInboundAt)
                : null;
            outOfOrder = Boolean(lastInboundMillis && eventOccurredAtMillis < lastInboundMillis);
            currentConversationState = conversationAuthority?.state ?? "";
            const targetSuppressed = target.suppressionStatus !== "clear";
            if (outOfOrder || (targetSuppressed && isSignalDeskSafetyReplyState(currentConversationState) && !isSignalDeskSafetyReplyState(inboundState))) {
                projectedInboundState = (currentConversationState || inboundState) as SignalDeskWebhookInboundState;
            }
            conversationId = conversationRef.id;
            if (!outOfOrder) {
                const previousNeedsReview = isSignalDeskInboxReviewState(currentConversationState);
                const nextNeedsReview = isSignalDeskInboxReviewState(projectedInboundState ?? inboundState);
                if (previousNeedsReview !== nextNeedsReview) {
                    queueRef = db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES);
                    const queueSnap = await transaction.get(queueRef);
                    const queueData = queueSnap.data();
                    const legacyQueueKeys = new Set([
                        "approvalBacklog", "humanReview", "inboxBacklog", "overdue", "updatedAt",
                    ]);
                    const exactLegacyQueue = queueData?.pId === undefined
                        && queueData?.queueSummaryId === undefined
                        && Object.keys(queueData || {}).every((key) => legacyQueueKeys.has(key))
                        ? projectSignalDeskQueueDocument({
                            ...queueData,
                            pId: SIGNALDESK_PRODUCT_CODE,
                            queueSummaryId: queueRef.id,
                            updatedAt: queueData?.updatedAt || timestamp,
                        }, queueRef.id)
                        : null;
                    queueAuthority = queueSnap.exists
                        ? projectSignalDeskQueueDocument(queueData, queueRef.id) || exactLegacyQueue
                        : { approvalBacklog: 0, humanReview: 0, inboxBacklog: 0, overdue: 0 };
                    if (!queueAuthority) throw new Error("SIGNALDESK_QUEUE_SUMMARY_SHAPE_INVALID");
                    const currentBacklog = queueAuthority.inboxBacklog;
                    nextInboxBacklog = Math.max(0, currentBacklog + (nextNeedsReview ? 1 : -1));
                }
            }
        }

        const suppressionIdentityValue = event.direction === "status"
            && (!contactAuthority || contactAuthority.targetId !== targetId)
            ? ""
            : event.identity;
        const suppressionIdentity = shouldSuppress
            ? signalDeskWebhookSuppressionIdentityFor(provider, suppressionIdentityValue, targetId)
            : null;
        const suppressionRef = suppressionIdentity
            ? db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(suppressionIdentity.suppressionId)
            : null;
        const suppressionSnapshot = suppressionRef ? await transaction.get(suppressionRef) : null;
        if (suppressionSnapshot?.exists) {
            const existingSuppression = suppressionSnapshot.data() || {};
            if (
                existingSuppression.pId !== SIGNALDESK_PRODUCT_CODE
                || existingSuppression.suppressionId !== suppressionSnapshot.id
                || existingSuppression.identityHash !== suppressionIdentity?.identityHash
                || existingSuppression.channel !== provider
                || (existingSuppression.targetId && targetId && existingSuppression.targetId !== targetId)
                || timestampMillis(existingSuppression.createdAt) === null
            ) throw new Error("SIGNALDESK_WEBHOOK_SUPPRESSION_LINEAGE_MISMATCH");
        }

        const channelRef = provider === "apify"
            ? null
            : db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(provider);
        const killSwitchRef = provider === "apify"
            ? null
            : db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${provider}`);
        const controlRef = requiresIncidentPause
            ? db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM)
            : null;
        const [channelSnapshot, killSwitchSnapshot, controlSnapshot] = await Promise.all([
            channelRef ? transaction.get(channelRef) : Promise.resolve(null),
            killSwitchRef ? transaction.get(killSwitchRef) : Promise.resolve(null),
            controlRef ? transaction.get(controlRef) : Promise.resolve(null),
        ]);
        const channelAuthority = channelSnapshot?.exists
            ? parseSignalDeskWebhookChannelHealthDocument({
                documentId: channelSnapshot.id,
                raw: channelSnapshot.data(),
            })
            : null;
        const killSwitchAuthority = killSwitchSnapshot?.exists
            ? parseSignalDeskKillSwitchDocument(killSwitchSnapshot.data(), killSwitchSnapshot.id)
            : null;
        const controlAuthority = controlSnapshot?.exists
            ? projectSignalDeskControlRoomDocument(controlSnapshot.data(), controlSnapshot.id)
            : null;
        if (controlSnapshot?.exists && !controlAuthority) {
            throw new Error("SIGNALDESK_WEBHOOK_CONTROL_ROOM_SHAPE_INVALID");
        }

        const revenueSyncStatus = inboundState === "interested"
            && targetId
            && !targetLifecycleHeld
            && FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER
            ? "pending" as const
            : "not-applicable" as const;
        const legalRetentionFields = getSignalDeskWebhookLegalRetentionFields(
            targetLifecycleState,
            requiresIncidentPause,
            targetLifecycleHeld,
        );

        transaction.create(eventRef, sanitizeForFirestore({
            eventId: eventRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            channel: provider === "apify" ? null : provider,
            direction: event.direction,
            eventFingerprintHash,
            eventType: event.eventType,
            externalIdHash: hashValue(event.externalId),
            occurredAt: eventOccurredAt,
            payloadHash,
            provider: provider === "email" || provider === "apify" ? provider : "meta",
            providerMessageId: event.providerMessageId || null,
            inboundState,
            revenueSyncStatus,
            status: targetId ? "processed" : "received",
            targetId: targetId || null,
            createdAt: timestamp,
            updatedAt: timestamp,
        }));

        if (provider === "apify") {
            // The provider_apify document is the source-run authority. A webhook
            // acknowledgement must not merge an incompatible health shape into it.
            transaction.set(costRef, sanitizeForFirestore(buildSignalDeskDailyCostMutation({
                current: costSnap.exists ? costSnap.data() : null,
                day: costDay,
                delta: { firestoreWriteEstimate: estimatedWrites + 1 },
                updatedAt: timestamp,
            })));
            return {
                duplicate: false,
                eventId: eventRef.id,
                inboundState: null,
                revenueSyncStatus,
                targetId: null,
            };
        }

        if (targetId && target && inboundState && event.message && conversationRef) {
            const messageRef = db.collection(SIGNALDESK_COLLECTIONS.MESSAGES)
                .doc(`message_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.create(messageRef, sanitizeForFirestore({
                messageId: messageRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                conversationId: conversationRef.id,
                targetId,
                direction: "inbound",
                body: event.message,
                bodyTruncated: event.messageTruncated,
                channel: provider,
                isOutOfOrder: outOfOrder,
                occurredAt: eventOccurredAt,
                providerMessageId: event.providerMessageId || null,
                ...legalRetentionFields,
                createdAt: timestamp,
            }));
            estimatedWrites += 1;
            const classificationRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS)
                .doc(`classification_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.create(classificationRef, sanitizeForFirestore({
                classificationId: classificationRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                conversationId: conversationRef.id,
                targetId,
                state: inboundState,
                confidence: inboundState === "needs_review" ? "low" : "high",
                classifierVersion: "rules-v1",
                ...legalRetentionFields,
                createdAt: timestamp,
            }));
            estimatedWrites += 1;
            if (!outOfOrder) {
                transaction.set(conversationRef, sanitizeForFirestore({
                    conversationId: conversationRef.id,
                    pId: SIGNALDESK_PRODUCT_CODE,
                    targetId,
                    targetName: target.displayName,
                    channel: provider,
                    state: projectedInboundState,
                    lastMessagePreview: event.message.slice(0, 180),
                    lastInboundAt: timestamp,
                    lastInboundOccurredAt: eventOccurredAt,
                    lastOutboundAt: conversationAuthority?.lastOutboundAt
                        ? admin.firestore.Timestamp.fromDate(new Date(conversationAuthority.lastOutboundAt))
                        : null,
                    ...legalRetentionFields,
                    updatedAt: timestamp,
                }), { merge: true });
                estimatedWrites += 1;
                if (queueRef && queueAuthority && nextInboxBacklog !== null) {
                    transaction.set(queueRef, sanitizeForFirestore({
                        ...queueAuthority,
                        inboxBacklog: nextInboxBacklog,
                        pId: SIGNALDESK_PRODUCT_CODE,
                        queueSummaryId: queueRef.id,
                        updatedAt: timestamp,
                    }));
                    estimatedWrites += 1;
                }
            }
        }

        if (suppressionIdentity && suppressionRef) {
            const existingCreatedAt = suppressionSnapshot?.exists ? suppressionSnapshot.data()?.createdAt : null;
            transaction.set(suppressionRef, sanitizeForFirestore({
                suppressionId: suppressionIdentity.suppressionId,
                pId: SIGNALDESK_PRODUCT_CODE,
                targetId: targetId || suppressionSnapshot?.data()?.targetId || null,
                identityHash: suppressionIdentity.identityHash,
                channel: provider,
                reason: eventTypeLower.includes("complaint") || inboundState === "complaint"
                    ? "complaint"
                    : inboundState === "privacy_request" || inboundState === "legal_request"
                        ? inboundState
                        : /hard[._-]?bounce/.test(eventTypeLower)
                            ? "bounce"
                            : inboundState === "wrong_contact"
                                ? "wrong-contact"
                                : "dnc",
                source: "provider-webhook",
                createdAt: existingCreatedAt || timestamp,
            }));
            estimatedWrites += 1;
        }

        const targetRef = targetId ? db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId) : null;
        if (targetRef && target && ((inboundState && !outOfOrder) || shouldSuppress)) {
            const targetUpdates: Record<string, unknown> = {
                ...buildSignalDeskWebhookTargetTransition({
                    conversationId,
                    inboundState,
                    lifecycleState: targetLifecycleState,
                    ownerQualifiedAtValue: eventOccurredAt,
                    retentionHeld: targetLifecycleHeld,
                    requiresIncidentPause,
                    shouldSuppress,
                    target,
                }),
                updatedAt: timestamp,
            };
            transaction.set(targetRef, sanitizeForFirestore(targetUpdates), { merge: true });
            estimatedWrites += 1;
        }

        if (targetId && inboundState) {
            const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
                .doc(`audit_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.create(auditRef, sanitizeForFirestore({
                auditEventId: auditRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                actorId: webhookSystemAccess.userId,
                actorRole: webhookSystemAccess.role,
                action: "provider_reply_capture",
                entityType: "webhookEvent",
                entityId: eventRef.id,
                reason: `${inboundState}:${outOfOrder ? "out-of-order" : "current"}`,
                createdAt: timestamp,
            }));
            estimatedWrites += 1;
        }

        if (requiresIncidentPause) {
            const incidentRef = db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
                .doc(`incident_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.create(incidentRef, sanitizeForFirestore({
                incidentId: incidentRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                severity: inboundState === "complaint" || eventTypeLower.includes("complaint") ? "high" : "critical",
                status: "open",
                title: "Inbound complaint or rights request requires founder review",
                targetId: targetId || null,
                channel: provider,
                createdAt: timestamp,
                updatedAt: timestamp,
            }));
            estimatedWrites += 1;
            const activatingKillSwitch = killSwitchAuthority?.status !== "active";
            if (killSwitchRef && activatingKillSwitch) {
                transaction.set(killSwitchRef, sanitizeForFirestore({
                    killSwitchId: killSwitchRef.id,
                    pId: SIGNALDESK_PRODUCT_CODE,
                    scope: provider,
                    status: "active",
                    reason: "Inbound complaint or rights request received; channel paused pending founder review.",
                    activatedAt: timestamp,
                    activatedBy: webhookSystemAccess.userId,
                    deactivatedAt: null,
                    deactivatedBy: null,
                    updatedAt: timestamp,
                }));
                estimatedWrites += 1;
            }
            const currentControl = controlAuthority || {
                activeKillSwitchCount: 0,
                channelStatus: "not_configured" as const,
                costStatus: "not_configured" as const,
                demandSignalCount: 0,
                openIncidentCount: 0,
                outcomeCount: 0,
                sourceStatus: "not_configured" as const,
                targetCount: 0,
                updatedAt: null,
            };
            if (!controlRef) throw new Error("SIGNALDESK_WEBHOOK_CONTROL_ROOM_REFERENCE_MISSING");
            transaction.set(controlRef, sanitizeForFirestore({
                ...currentControl,
                controlRoomSummaryId: SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM,
                activeKillSwitchCount: currentControl.activeKillSwitchCount + (activatingKillSwitch ? 1 : 0),
                channelStatus: "paused",
                openIncidentCount: currentControl.openIncidentCount + 1,
                pId: SIGNALDESK_PRODUCT_CODE,
                updatedAt: timestamp,
            }));
            estimatedWrites += 1;
        }

        if (!channelRef) throw new Error("SIGNALDESK_WEBHOOK_CHANNEL_REFERENCE_MISSING");
        const channelPaused = requiresIncidentPause
            || killSwitchAuthority?.status === "active"
            || channelAuthority?.status === "paused";
        transaction.set(channelRef, sanitizeForFirestore({
            channel: provider,
            configured: true,
            lastEventAt: timestamp,
            lastError: channelPaused
                ? channelAuthority?.lastError || "Channel paused pending founder review."
                : null,
            pId: SIGNALDESK_PRODUCT_CODE,
            status: channelPaused ? "paused" : "healthy",
            updatedAt: timestamp,
        }));
        estimatedWrites += 1;
        transaction.set(costRef, sanitizeForFirestore(buildSignalDeskDailyCostMutation({
            current: costSnap.exists ? costSnap.data() : null,
            day: costDay,
            delta: { firestoreWriteEstimate: estimatedWrites + 1 },
            updatedAt: timestamp,
        })));

        return {
            duplicate: false,
            eventId: eventRef.id,
            inboundState,
            revenueSyncStatus,
            targetId: targetId || null,
        };
    });

    let revenueSyncStatus: SignalDeskWebhookProcessResult["revenueSyncStatus"] = transactionResult.revenueSyncStatus;
    if (
        transactionResult.inboundState === "interested"
        && transactionResult.targetId
        && revenueSyncStatus === "pending"
        && FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER
    ) {
        try {
            await qualifySignalDeskRevenueAccountServer(webhookSystemAccess, {
                locationType: "single-location",
                targetId: transactionResult.targetId,
            });
            await settleSignalDeskWebhookRevenueSync({ db, eventRef, provider });
            revenueSyncStatus = "updated";
        } catch (error) {
            revenueSyncStatus = "pending";
            logRuntimeFailure("signaldesk_webhook_interested_reply_revenue_sync_failed", error, {
                product: "signaldesk",
                provider,
                targetIdPresent: true,
            });
            // The core event is already durable and idempotent. Returning a
            // retryable failure lets the provider replay drive the pending
            // post-processing step without repeating webhook side effects.
            throw new Error("SIGNALDESK_WEBHOOK_REVENUE_SYNC_PENDING", { cause: error });
        }
    }

    return {
        eventId: transactionResult.eventId,
        revenueSyncStatus,
        status: transactionResult.duplicate
            ? "duplicate" as const
            : transactionResult.targetId ? "processed" as const : "received" as const,
    };
};

export async function processSignalDeskProviderWebhook(params: {
    provider: SignalDeskWebhookProvider;
    rawBody: string;
    requestHeaders: Headers;
}) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_WEBHOOKS) return { status: "ignored" as const };

    if (params.provider === "email") {
        const secret = env(SIGNALDESK_INTEGRATION_ENV.EMAIL_WEBHOOK_SECRET);
        const provided = params.requestHeaders.get("x-signaldesk-webhook-secret") || "";
        if (!secret || !safeEqual(provided, secret)) {
            throw new SignalDeskWebhookRequestError("Invalid SignalDesk webhook signature", 401);
        }
    } else if (params.provider === "apify") {
        if (!verifyApifySecret(params.requestHeaders)) {
            throw new SignalDeskWebhookRequestError("Invalid SignalDesk webhook signature", 401);
        }
    } else if (!verifyMetaSignature(params.rawBody, params.requestHeaders.get("x-hub-signature-256"))) {
        throw new SignalDeskWebhookRequestError("Invalid SignalDesk webhook signature", 401);
    }

    const payload = parseSignalDeskWebhookPayload({ provider: params.provider, rawBody: params.rawBody });
    const events = requireProviderEvents(params.provider, payload, params.rawBody);
    const db = getSignalDeskDb();
    if (!db) throw new Error("SignalDesk Firebase is not configured");
    const payloadHash = hashValue(params.rawBody);
    const results: SignalDeskWebhookProcessResult[] = [];
    for (const event of events) {
        results.push(await processNormalizedWebhookEvent({
            db,
            event,
            payloadHash,
            provider: params.provider,
        }));
    }
    const status = results.some((result) => result.status === "processed")
        ? "processed" as const
        : results.some((result) => result.status === "received")
            ? "received" as const
            : "duplicate" as const;
    return {
        duplicateCount: results.filter((result) => result.status === "duplicate").length,
        eventCount: results.length,
        eventId: results[0]?.eventId,
        eventIds: results.map((result) => result.eventId),
        processedCount: results.filter((result) => result.status !== "duplicate").length,
        revenueSyncStatus: results.some((result) => result.revenueSyncStatus === "pending")
            ? "pending" as const
            : results.some((result) => result.revenueSyncStatus === "updated") ? "updated" as const : "not-applicable" as const,
        status,
    };
}
