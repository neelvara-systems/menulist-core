import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_INTEGRATION_ENV } from "@constant/signaldesk/integrations";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { qualifySignalDeskRevenueAccountServer } from "@lib/signaldesk/workflowServer";
import type { SignalDeskAccessContext } from "@type/signaldesk";
import { createHash, createHmac, timingSafeEqual } from "crypto";

type SignalDeskWebhookProvider = "email" | "whatsapp" | "instagram" | "messenger" | "apify";
type SignalDeskWebhookPayload = Record<string, unknown>;
type SignalDeskWebhookDirection = "inbound" | "source" | "status";

type SignalDeskNormalizedWebhookEvent = {
    direction: SignalDeskWebhookDirection;
    eventType: string;
    externalId: string;
    identity: string;
    message: string;
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
const SIGNALDESK_WEBHOOK_MAX_EXTERNAL_ID_CHARS = 500;
const SIGNALDESK_WEBHOOK_MAX_IDENTITY_CHARS = 500;
const SIGNALDESK_WEBHOOK_MAX_MESSAGE_CHARS = 4000;
const SIGNALDESK_WEBHOOK_MAX_PROVIDER_MESSAGE_ID_CHARS = 500;
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
const increment = (value: number) => admin.firestore.FieldValue.increment(value);
const env = (key: string) => process.env[key]?.trim() || "";
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

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
    if (typeof value === "string") return value.trim().slice(0, maxLength);
    if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, maxLength);
    return "";
};

const hasWebhookValue = (value: unknown) => normalizeWebhookString(value, SIGNALDESK_WEBHOOK_MAX_EXTERNAL_ID_CHARS).length > 0;

const normalizeWebhookIdentity = (provider: SignalDeskWebhookProvider, identity: string) => {
    const trimmed = identity.trim();
    if (provider === "email") return trimmed.toLowerCase();
    if (provider === "whatsapp") return trimmed.replace(/[^\d+]/g, "");
    if (provider === "instagram") return trimmed.toLowerCase().replace(/^@/, "");
    return trimmed;
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
    const normalized = (fullValue || fallback).slice(0, SIGNALDESK_WEBHOOK_MAX_MESSAGE_CHARS);
    return {
        message: normalized,
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

const classifyInbound = (message: string) => {
    const text = message.toLowerCase();
    if (/\b(stop|unsubscribe|do not contact|don't contact|dnc)\b/.test(text)) return "dnc";
    if (/\b(complaint|report you|spam complaint|harassment|unwanted message)\b/.test(text)) return "complaint";
    if (/\b(delete my data|privacy request|data request|personal data|right to erasure)\b/.test(text)) return "privacy_request";
    if (/\b(legal notice|lawyer|solicitor|cease and desist|legal action)\b/.test(text)) return "legal_request";
    if (/\bwrong (person|contact|number|email)\b/.test(text)) return "wrong_contact";
    if (/\b(yes|interested|pricing|price|demo|call|send|how much)\b/.test(text)) return "interested";
    if (/\b(no|not interested|later)\b/.test(text)) return "not_interested";
    return "needs_review";
};

const requiresInboxReview = (state: string) => (
    state === "needs_review"
    || state === "interested"
    || state === "complaint"
    || state === "privacy_request"
    || state === "legal_request"
);

const isSafetyState = (state: string) => (
    state === "dnc"
    || state === "wrong_contact"
    || state === "complaint"
    || state === "privacy_request"
    || state === "legal_request"
);

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
    "eventType" | "externalId" | "identity" | "message" | "messageTruncated" | "providerMessageId"
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
    if (!events.length || events.some((event) => !event.eventType || !event.externalId)) {
        const error = new Error(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID);
        logRuntimeFailure(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, error, getWebhookPayloadLogContext({ provider, rawBody }));
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, 422);
    }
    if (events.length > SIGNALDESK_WEBHOOK_MAX_EVENTS) {
        throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, 422);
    }
    return events;
};

const contactIdentityRefs = (db: FirebaseFirestore.Firestore, provider: SignalDeskWebhookProvider, identity: string) => {
    if (!identity) return [];
    const normalized = normalizeWebhookIdentity(provider, identity);
    if (!normalized) return [];
    const whatsappValues = provider === "whatsapp"
        ? Array.from(new Set([
            normalized,
            normalized.replace(/\D/g, ""),
            normalized.replace(/\D/g, "") ? `+${normalized.replace(/\D/g, "")}` : "",
        ].filter(Boolean)))
        : [];
    const variants = provider === "email"
        ? [`email_${hashValue(normalized)}`]
        : provider === "whatsapp"
            ? whatsappValues.flatMap((value) => [`whatsapp_${hashValue(value)}`, `phone_${hashValue(value)}`])
            : [`${provider}_${hashValue(normalized)}`];
    return variants.map((id) => db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(id));
};

const findTargetByIdentity = async (
    transaction: FirebaseFirestore.Transaction,
    db: FirebaseFirestore.Firestore,
    provider: SignalDeskWebhookProvider,
    identity: string,
) => {
    for (const ref of contactIdentityRefs(db, provider, identity)) {
        const snap = await transaction.get(ref);
        const targetId = normalizeTargetId(snap.data()?.targetId);
        if (snap.exists && targetId) return targetId;
    }
    return null;
};

const getWebhookSuppressionIdentity = (
    provider: SignalDeskWebhookProvider,
    identity: string,
    targetId: string | null,
) => {
    const normalized = normalizeWebhookIdentity(provider, identity);
    if (provider === "email" && normalized) return { identityHash: hashValue(normalized), suppressionId: `email_${hashValue(normalized)}` };
    if (provider === "whatsapp" && normalized) {
        const canonicalPhone = normalized.replace(/\D/g, "");
        if (canonicalPhone) return { identityHash: hashValue(canonicalPhone), suppressionId: `phone_${hashValue(canonicalPhone)}` };
    }
    if (provider === "instagram" && normalized) return { identityHash: hashValue(normalized), suppressionId: `instagram_${hashValue(normalized)}` };
    if (provider === "messenger" && normalized) return { identityHash: hashValue(normalized), suppressionId: `messenger_${hashValue(normalized)}` };
    if (targetId) return { identityHash: hashValue(targetId), suppressionId: `${provider}_${hashValue(targetId)}` };
    return null;
};

const webhookEventFingerprint = (provider: SignalDeskWebhookProvider, event: SignalDeskNormalizedWebhookEvent) => hashValue(JSON.stringify({
    direction: event.direction,
    eventType: event.eventType,
    externalId: event.externalId,
    identity: normalizeWebhookIdentity(provider, event.identity),
    message: event.message,
    occurredAtMillis: event.occurredAtMillis,
    providerMessageId: event.providerMessageId,
    suppliedTargetId: event.suppliedTargetId,
}));

const verifyWebhookDuplicate = (
    data: Record<string, unknown>,
    eventFingerprintHash: string,
    payloadHash: string,
) => {
    const storedFingerprint = normalizeWebhookString(data.eventFingerprintHash, 128);
    const storedPayloadHash = normalizeWebhookString(data.payloadHash, 128);
    if ((storedFingerprint && storedFingerprint === eventFingerprintHash) || (!storedFingerprint && storedPayloadHash === payloadHash)) return;
    throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_EVENT_CONFLICT, 409);
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

    const transactionResult = await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const existingEventSnap = await transaction.get(eventRef);
        if (existingEventSnap.exists) {
            verifyWebhookDuplicate(existingEventSnap.data() || {}, eventFingerprintHash, payloadHash);
            return {
                duplicate: true,
                eventId: eventRef.id,
                inboundState: null,
                targetId: null,
            };
        }

        const suppliedTargetId = event.suppliedTargetId;
        if (suppliedTargetId && !new RegExp(`^[A-Za-z0-9_-]{3,${SIGNALDESK_WEBHOOK_MAX_TARGET_ID_CHARS}}$`).test(suppliedTargetId)) {
            throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 422);
        }
        const identityTargetId = await findTargetByIdentity(transaction, db, provider, event.identity);
        if (suppliedTargetId && identityTargetId && suppliedTargetId !== identityTargetId) {
            throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 409);
        }
        const targetId = suppliedTargetId || identityTargetId;
        const targetRef = targetId ? db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId) : null;
        const targetSnap = targetRef ? await transaction.get(targetRef) : null;
        if (suppliedTargetId && !targetSnap?.exists) {
            throw new SignalDeskWebhookRequestError(SIGNALDESK_WEBHOOK_TARGET_CONFLICT, 422);
        }
        const targetData = targetSnap?.exists ? targetSnap.data() || {} : {};
        const timestamp = now();
        const eventOccurredAtMillis = event.occurredAtMillis || timestamp.toMillis();
        const eventOccurredAt = admin.firestore.Timestamp.fromMillis(eventOccurredAtMillis);
        let estimatedWrites = 1;
        const eventTypeLower = event.eventType.toLowerCase();
        const inboundState = event.direction === "inbound" && event.message ? classifyInbound(event.message) : null;
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
        let conversationId: string | null = null;
        let outOfOrder = false;
        let projectedInboundState = inboundState;
        let conversationRef: FirebaseFirestore.DocumentReference | null = null;
        let currentConversationState = "";
        let queueRef: FirebaseFirestore.DocumentReference | null = null;
        let nextInboxBacklog: number | null = null;

        if (targetId && inboundState && event.message) {
            conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(`conv_${targetId}`);
            const conversationSnap = await transaction.get(conversationRef);
            const conversationData = conversationSnap.exists ? conversationSnap.data() || {} : {};
            const lastInboundMillis = timestampMillis(conversationData.lastInboundOccurredAt || conversationData.lastInboundAt);
            outOfOrder = Boolean(lastInboundMillis && eventOccurredAtMillis < lastInboundMillis);
            currentConversationState = normalizeWebhookString(conversationData.state, 80);
            const targetSuppressed = normalizeWebhookString(targetData.suppressionStatus, 80) !== "clear";
            if (outOfOrder || (targetSuppressed && isSafetyState(currentConversationState) && !isSafetyState(inboundState))) {
                projectedInboundState = currentConversationState || inboundState;
            }
            conversationId = conversationRef.id;
            if (!outOfOrder) {
                const previousNeedsReview = requiresInboxReview(currentConversationState);
                const nextNeedsReview = requiresInboxReview(projectedInboundState);
                if (previousNeedsReview !== nextNeedsReview) {
                    queueRef = db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES);
                    const queueSnap = await transaction.get(queueRef);
                    const currentBacklog = Number(queueSnap.data()?.inboxBacklog || 0);
                    nextInboxBacklog = Math.max(0, currentBacklog + (nextNeedsReview ? 1 : -1));
                }
            }
        }

        transaction.create(eventRef, {
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
            status: targetId ? "processed" : "received",
            targetId: targetId || null,
            createdAt: timestamp,
            updatedAt: timestamp,
        });

        if (provider === "apify") {
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.SOURCE_HEALTH_SUMMARIES).doc("provider_apify"), {
                pId: SIGNALDESK_PRODUCT_CODE,
                provider: "apify",
                lastEventAt: timestamp,
                lastEventType: event.eventType,
                status: "healthy",
                updatedAt: timestamp,
            }, { merge: true });
            estimatedWrites += 1;
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(new Date().toISOString().slice(0, 10)), {
                firestoreWriteEstimate: increment(estimatedWrites),
                updatedAt: timestamp,
            }, { merge: true });
            return {
                duplicate: false,
                eventId: eventRef.id,
                inboundState: null,
                targetId: null,
            };
        }

        if (targetId && inboundState && event.message && conversationRef) {
            const messageRef = db.collection(SIGNALDESK_COLLECTIONS.MESSAGES)
                .doc(`message_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.set(messageRef, {
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
                createdAt: timestamp,
            });
            estimatedWrites += 1;
            const classificationRef = db.collection(SIGNALDESK_COLLECTIONS.REPLY_CLASSIFICATIONS)
                .doc(`classification_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.set(classificationRef, {
                classificationId: classificationRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                conversationId: conversationRef.id,
                targetId,
                state: inboundState,
                confidence: inboundState === "needs_review" ? "low" : "high",
                classifierVersion: "rules-v1",
                createdAt: timestamp,
            });
            estimatedWrites += 1;
            if (!outOfOrder) {
                transaction.set(conversationRef, {
                    conversationId: conversationRef.id,
                    pId: SIGNALDESK_PRODUCT_CODE,
                    targetId,
                    targetName: normalizeWebhookString(targetData.displayName, 180) || null,
                    channel: provider,
                    state: projectedInboundState,
                    lastMessagePreview: event.message.slice(0, 180),
                    lastInboundAt: timestamp,
                    lastInboundOccurredAt: eventOccurredAt,
                    updatedAt: timestamp,
                }, { merge: true });
                estimatedWrites += 1;
                if (queueRef && nextInboxBacklog !== null) {
                    transaction.set(queueRef, {
                        inboxBacklog: nextInboxBacklog,
                        updatedAt: timestamp,
                    }, { merge: true });
                    estimatedWrites += 1;
                }
            }
        }

        const suppressionIdentity = shouldSuppress
            ? getWebhookSuppressionIdentity(provider, event.identity, targetId || null)
            : null;
        if (suppressionIdentity) {
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(suppressionIdentity.suppressionId), {
                suppressionId: suppressionIdentity.suppressionId,
                pId: SIGNALDESK_PRODUCT_CODE,
                targetId: targetId || null,
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
                createdAt: timestamp,
            }, { merge: true });
            estimatedWrites += 1;
        }

        if (targetRef && targetSnap?.exists && ((inboundState && !outOfOrder) || shouldSuppress)) {
            const currentStatus = normalizeWebhookString(targetData.status, 80);
            const currentSuppressionStatus = normalizeWebhookString(targetData.suppressionStatus, 80);
            const targetAlreadySuppressed = currentSuppressionStatus && currentSuppressionStatus !== "clear";
            const targetUpdates: Record<string, unknown> = {
                updatedAt: timestamp,
            };
            if (shouldSuppress) {
                targetUpdates.nextAction = "hold";
                targetUpdates.status = "held";
                targetUpdates.suppressionStatus = requiresIncidentPause
                    ? "complaint"
                    : inboundState === "wrong_contact" ? "wrong-contact" : "suppressed";
            } else if (currentStatus === "converted") {
                targetUpdates.nextAction = "outcome";
                targetUpdates.status = "converted";
            } else if (targetAlreadySuppressed) {
                targetUpdates.nextAction = "hold";
                targetUpdates.status = currentStatus || "held";
            } else if (inboundState) {
                targetUpdates.latestConversationId = conversationId;
                targetUpdates.nextAction = inboundState === "interested"
                    ? "outcome"
                    : inboundState === "needs_review" || requiresIncidentPause ? "review" : "hold";
                targetUpdates.status = "replied";
                if (inboundState === "interested" && !targetData.ownerQualifiedAt) targetUpdates.ownerQualifiedAt = eventOccurredAt;
            }
            transaction.set(targetRef, targetUpdates, { merge: true });
            estimatedWrites += 1;
        }

        if (targetId && inboundState) {
            const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS)
                .doc(`audit_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.set(auditRef, {
                auditEventId: auditRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                actorId: webhookSystemAccess.userId,
                actorRole: webhookSystemAccess.role,
                action: "provider_reply_capture",
                entityType: "webhookEvent",
                entityId: eventRef.id,
                reason: `${inboundState}:${outOfOrder ? "out-of-order" : "current"}`,
                createdAt: timestamp,
            });
            estimatedWrites += 1;
        }

        if (requiresIncidentPause) {
            const incidentRef = db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
                .doc(`incident_${hashValue(eventRef.id).slice(0, 32)}`);
            transaction.set(incidentRef, {
                incidentId: incidentRef.id,
                pId: SIGNALDESK_PRODUCT_CODE,
                severity: inboundState === "complaint" || eventTypeLower.includes("complaint") ? "high" : "critical",
                status: "open",
                title: "Inbound complaint or rights request requires founder review",
                targetId: targetId || null,
                channel: provider,
                createdAt: timestamp,
                updatedAt: timestamp,
            });
            estimatedWrites += 1;
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${provider}`), {
                killSwitchId: `scope_${provider}`,
                pId: SIGNALDESK_PRODUCT_CODE,
                scope: provider,
                status: "active",
                reason: "Inbound complaint or rights request received; channel paused pending founder review.",
                activatedAt: timestamp,
                activatedBy: webhookSystemAccess.userId,
                updatedAt: timestamp,
            }, { merge: true });
            estimatedWrites += 1;
            transaction.set(db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM), {
                incidentCount: increment(1),
                safetyStatus: "blocked",
                updatedAt: timestamp,
            }, { merge: true });
            estimatedWrites += 1;
        }

        transaction.set(db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(provider), {
            channel: provider,
            configured: true,
            lastEventAt: timestamp,
            lastEventType: event.eventType,
            status: requiresIncidentPause ? "blocked" : "healthy",
            updatedAt: timestamp,
        }, { merge: true });
        estimatedWrites += 1;
        transaction.set(db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(new Date().toISOString().slice(0, 10)), {
            firestoreWriteEstimate: increment(estimatedWrites),
            updatedAt: timestamp,
        }, { merge: true });

        return {
            duplicate: false,
            eventId: eventRef.id,
            inboundState,
            targetId: targetId || null,
        };
    });

    if (transactionResult.duplicate) {
        return {
            eventId: transactionResult.eventId,
            revenueSyncStatus: "not-applicable" as const,
            status: "duplicate" as const,
        };
    }

    let revenueSyncStatus: SignalDeskWebhookProcessResult["revenueSyncStatus"] = "not-applicable";
    if (
        transactionResult.inboundState === "interested"
        && transactionResult.targetId
        && FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_REVENUE_OPERATING_LAYER
    ) {
        try {
            await qualifySignalDeskRevenueAccountServer(webhookSystemAccess, {
                locationType: "single-location",
                targetId: transactionResult.targetId,
            });
            revenueSyncStatus = "updated";
        } catch (error) {
            revenueSyncStatus = "pending";
            logRuntimeFailure("signaldesk_webhook_interested_reply_revenue_sync_failed", error, {
                product: "signaldesk",
                provider,
                targetIdPresent: true,
            });
        }
    }

    return {
        eventId: transactionResult.eventId,
        revenueSyncStatus,
        status: transactionResult.targetId ? "processed" as const : "received" as const,
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
