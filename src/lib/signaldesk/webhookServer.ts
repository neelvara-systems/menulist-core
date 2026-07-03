import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_INTEGRATION_ENV } from "@constant/signaldesk/integrations";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { createHash, createHmac, timingSafeEqual } from "crypto";

type SignalDeskWebhookProvider = "email" | "whatsapp" | "instagram" | "messenger" | "apify";
type SignalDeskWebhookPayload = Record<string, unknown>;

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db = signaldeskFirestoreAdmin as any;
    return db && typeof db.collection === "function" ? signaldeskFirestoreAdmin : null;
};

const now = () => admin.firestore.Timestamp.now();
const increment = (value: number) => admin.firestore.FieldValue.increment(value);
const env = (key: string) => process.env[key]?.trim() || "";
const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED = "signaldesk_webhook_body_parse_failed";
const SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID = "signaldesk_webhook_body_shape_invalid";
const SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID = "signaldesk_webhook_event_shape_invalid";
const normalizeWebhookIdentity = (provider: SignalDeskWebhookProvider, identity: string) => {
    const trimmed = String(identity || "").trim();
    if (provider === "email") return trimmed.toLowerCase();
    if (provider === "whatsapp") return trimmed.replace(/[^\d+]/g, "");
    if (provider === "instagram") return trimmed.toLowerCase().replace(/^@/, "");
    return trimmed;
};

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
        throw new Error("Invalid SignalDesk webhook payload");
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(bodyText) as unknown;
    } catch (error) {
        logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_PARSE_FAILED, error, getWebhookPayloadLogContext(params));
        throw new Error("Invalid SignalDesk webhook payload");
    }

    if (!isRecord(parsed)) {
        const error = new Error(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID);
        logRuntimeFailure(SIGNALDESK_WEBHOOK_BODY_SHAPE_INVALID, error, getWebhookPayloadLogContext(params));
        throw new Error("Invalid SignalDesk webhook payload");
    }

    return parsed;
};

const normalizeWebhookString = (value: unknown) => String(value || "").trim();
const hasWebhookValue = (value: unknown) => normalizeWebhookString(value).length > 0;
const fallbackWebhookExternalId = (provider: SignalDeskWebhookProvider, rawBody: string) => (
    `${provider}_${hashValue(rawBody).slice(0, 32)}`
);

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
    if (/\bwrong (person|contact|number|email)\b/.test(text)) return "wrong_contact";
    if (/\b(yes|interested|pricing|price|demo|call|send|how much)\b/.test(text)) return "interested";
    if (/\b(no|not interested|later)\b/.test(text)) return "not_interested";
    return "needs_review";
};

export function verifySignalDeskWebhookChallenge(provider: SignalDeskWebhookProvider, url: URL) {
    if (provider !== "whatsapp" && provider !== "instagram" && provider !== "messenger") return null;
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === env(SIGNALDESK_INTEGRATION_ENV.META_VERIFY_TOKEN)) {
        return challenge || "";
    }
    return null;
}

const getProviderEvent = (provider: SignalDeskWebhookProvider, payload: any, rawBody: string) => {
    const fallbackExternalId = fallbackWebhookExternalId(provider, rawBody);

    if (provider === "apify") {
        const resource = payload?.resource || {};
        const eventData = payload?.eventData || {};
        const hasEventSignal = [
            payload?.eventType,
            payload?.runId,
            payload?.runStatus,
            resource?.id,
            resource?.status,
            eventData?.actorRunId,
            eventData?.status,
        ].some(hasWebhookValue);
        if (!hasEventSignal) return null;
        const runId = normalizeWebhookString(payload?.runId || resource?.id || eventData?.actorRunId || fallbackExternalId);
        const status = normalizeWebhookString(payload?.runStatus || resource?.status || eventData?.status || "received");
        return {
            eventType: normalizeWebhookString(payload?.eventType || `apify.run.${status.toLowerCase()}`),
            externalId: `apify_${runId}`,
            identity: "",
            message: status,
            providerMessageId: runId,
            targetId: null,
        };
    }

    if (provider === "email") {
        const hasEventSignal = [
            payload?.event,
            payload?.type,
            payload?.eventId,
            payload?.messageId,
            payload?.providerMessageId,
            payload?.id,
            payload?.email,
            payload?.recipient,
            payload?.message,
            payload?.reason,
        ].some(hasWebhookValue);
        if (!hasEventSignal) return null;
        return {
            eventType: normalizeWebhookString(payload?.event || payload?.type || "email.event"),
            externalId: normalizeWebhookString(payload?.eventId || payload?.messageId || payload?.id || fallbackExternalId),
            identity: normalizeWebhookString(payload?.email || payload?.recipient).toLowerCase(),
            message: normalizeWebhookString(payload?.message || payload?.reason),
            providerMessageId: normalizeWebhookString(payload?.messageId || payload?.providerMessageId),
            targetId: payload?.targetId ? String(payload.targetId) : null,
        };
    }

    const value = payload?.entry?.[0]?.changes?.[0]?.value || {};
    const message = value?.messages?.[0] || null;
    const status = value?.statuses?.[0] || null;
    if (!message && !status) return null;
    return {
        eventType: message ? `${provider}.message` : status ? `${provider}.status` : `${provider}.event`,
        externalId: normalizeWebhookString(message?.id || status?.id || fallbackExternalId),
        identity: normalizeWebhookString(message?.from || status?.recipient_id),
        message: normalizeWebhookString(message?.text?.body || status?.status),
        providerMessageId: normalizeWebhookString(message?.id || status?.id),
        targetId: null,
    };
};

const requireProviderEvent = (
    provider: SignalDeskWebhookProvider,
    payload: SignalDeskWebhookPayload,
    rawBody: string,
) => {
    const event = getProviderEvent(provider, payload, rawBody);
    if (event) return event;

    const error = new Error(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID);
    logRuntimeFailure(SIGNALDESK_WEBHOOK_EVENT_SHAPE_INVALID, error, getWebhookPayloadLogContext({
        provider,
        rawBody,
    }));
    throw new Error("Invalid SignalDesk webhook event");
};

async function findTargetByIdentity(db: any, provider: SignalDeskWebhookProvider, identity: string) {
    if (!identity) return null;
    const normalized = normalizeWebhookIdentity(provider, identity);
    const variants = provider === "email"
        ? [`email_${hashValue(normalized)}`]
        : provider === "whatsapp"
            ? [`whatsapp_${hashValue(normalized)}`, `phone_${hashValue(normalized)}`]
            : [`${provider}_${hashValue(normalized)}`];
    for (const id of variants) {
        const snap = await db.collection(SIGNALDESK_COLLECTIONS.CONTACT_IDENTITIES).doc(id).get();
        if (snap.exists && snap.data()?.targetId) return String(snap.data()?.targetId);
    }
    return null;
}

const getWebhookSuppressionIdentity = (
    provider: SignalDeskWebhookProvider,
    identity: string,
    targetId: string,
) => {
    const normalized = normalizeWebhookIdentity(provider, identity);
    if (provider === "email" && normalized) return { identityHash: hashValue(normalized), suppressionId: `email_${hashValue(normalized)}` };
    if (provider === "whatsapp" && normalized) return { identityHash: hashValue(normalized), suppressionId: `phone_${hashValue(normalized)}` };
    if (provider === "instagram" && normalized) return { identityHash: hashValue(normalized), suppressionId: `instagram_${hashValue(normalized)}` };
    if (provider === "messenger" && normalized) return { identityHash: hashValue(normalized), suppressionId: `messenger_${hashValue(normalized)}` };
    return { identityHash: hashValue(targetId), suppressionId: `${provider}_${hashValue(targetId)}` };
};

export async function processSignalDeskProviderWebhook(params: {
    provider: SignalDeskWebhookProvider;
    rawBody: string;
    requestHeaders: Headers;
}) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_WEBHOOKS) {
        return { status: "ignored" as const };
    }

    if (params.provider === "email") {
        const secret = env(SIGNALDESK_INTEGRATION_ENV.EMAIL_WEBHOOK_SECRET);
        const provided = params.requestHeaders.get("x-signaldesk-webhook-secret") || "";
        if (!secret || !safeEqual(provided, secret)) throw new Error("Invalid SignalDesk webhook signature");
    } else if (params.provider === "apify") {
        if (!verifyApifySecret(params.requestHeaders)) throw new Error("Invalid SignalDesk webhook signature");
    } else if (!verifyMetaSignature(params.rawBody, params.requestHeaders.get("x-hub-signature-256"))) {
        throw new Error("Invalid SignalDesk webhook signature");
    }

    const payload = parseSignalDeskWebhookPayload({
        provider: params.provider,
        rawBody: params.rawBody,
    });
    const db = getSignalDeskDb();
    if (!db) throw new Error("SignalDesk Firebase is not configured");
    const event = requireProviderEvent(params.provider, payload, params.rawBody);
    const targetId = event.targetId || await findTargetByIdentity(db, params.provider, event.identity);
    const eventRef = db.collection(SIGNALDESK_COLLECTIONS.WEBHOOK_EVENTS).doc(event.externalId);
    const existingEventSnap = await eventRef.get();
    if (existingEventSnap.exists) {
        return { eventId: eventRef.id, status: "duplicate" as const };
    }
    const batch = db.batch();
    const timestamp = now();

    if (params.provider === "apify") {
        batch.set(eventRef, {
            eventId: eventRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            channel: null,
            eventType: event.eventType,
            payloadHash: hashValue(params.rawBody),
            provider: "apify",
            providerMessageId: event.providerMessageId || null,
            status: "received",
            targetId: null,
            updatedAt: timestamp,
        }, { merge: true });
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.SOURCE_HEALTH_SUMMARIES).doc("provider_apify"), {
            pId: SIGNALDESK_PRODUCT_CODE,
            provider: "apify",
            lastEventAt: timestamp,
            lastEventType: event.eventType,
            status: "healthy",
            updatedAt: timestamp,
        }, { merge: true });
        await batch.commit();

        return { eventId: eventRef.id, status: "received" as const };
    }

    const eventTypeLower = event.eventType.toLowerCase();
    const messageLower = event.message.toLowerCase();
    const shouldSuppress = /unsubscribe|complaint|bounce|dnc/.test(eventTypeLower) || /\b(stop|unsubscribe|dnc)\b/.test(messageLower);

    batch.set(eventRef, {
        eventId: eventRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        channel: params.provider,
        eventType: event.eventType,
        payloadHash: hashValue(params.rawBody),
        provider: params.provider === "email" ? "email" : "meta",
        providerMessageId: event.providerMessageId || null,
        status: targetId ? "processed" : "received",
        targetId: targetId || null,
        updatedAt: timestamp,
    }, { merge: true });

    if (targetId && event.message) {
        const state = classifyInbound(event.message);
        const conversationRef = db.collection(SIGNALDESK_COLLECTIONS.CONVERSATION_SUMMARIES).doc(`conv_${targetId}`);
        const messageRef = db.collection(SIGNALDESK_COLLECTIONS.MESSAGES).doc();
        batch.set(conversationRef, {
            conversationId: conversationRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId,
            channel: params.provider,
            state,
            lastMessagePreview: event.message.slice(0, 180),
            lastInboundAt: timestamp,
            updatedAt: timestamp,
        }, { merge: true });
        batch.set(messageRef, {
            messageId: messageRef.id,
            pId: SIGNALDESK_PRODUCT_CODE,
            conversationId: conversationRef.id,
            targetId,
            direction: "inbound",
            body: event.message,
            channel: params.provider,
            providerMessageId: event.providerMessageId || null,
            createdAt: timestamp,
        });
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES), {
            inboxBacklog: increment(state === "needs_review" || state === "interested" ? 1 : 0),
        }, { merge: true });
    }

    if (targetId && shouldSuppress) {
        const suppressionIdentity = getWebhookSuppressionIdentity(params.provider, event.identity, targetId);
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.SUPPRESSION_LEDGER).doc(suppressionIdentity.suppressionId), {
            suppressionId: suppressionIdentity.suppressionId,
            pId: SIGNALDESK_PRODUCT_CODE,
            targetId,
            identityHash: suppressionIdentity.identityHash,
            channel: params.provider,
            reason: eventTypeLower.includes("complaint")
                ? "complaint"
                : eventTypeLower.includes("bounce")
                    ? "bounce"
                    : "dnc",
            source: "provider-webhook",
            createdAt: timestamp,
        }, { merge: true });
        batch.set(db.collection(SIGNALDESK_COLLECTIONS.TARGET_SUMMARIES).doc(targetId), {
            nextAction: "hold",
            status: "held",
            suppressionStatus: eventTypeLower.includes("complaint") ? "complaint" : "suppressed",
            updatedAt: timestamp,
        }, { merge: true });
    }

    batch.set(db.collection(SIGNALDESK_COLLECTIONS.CHANNEL_HEALTH_SUMMARIES).doc(params.provider), {
        channel: params.provider,
        configured: true,
        lastEventAt: timestamp,
        status: "healthy",
        updatedAt: timestamp,
    }, { merge: true });
    await batch.commit();

    return { eventId: eventRef.id, status: targetId ? "processed" as const : "received" as const };
}
