import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS } from "@constant/signaldesk/database";
import { SIGNALDESK_INTEGRATION_ENV, SIGNALDESK_OUTCOME_ROUTE_SCOPE } from "@constant/signaldesk/integrations";
import { signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { recordSignalDeskOutcomeServer } from "@lib/signaldesk/workflowServer";
import type { SignalDeskAccessContext, SignalDeskOutcomeSummary } from "@type/signaldesk";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const OUTCOME_BRIDGE_MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const outcomeChannelSchema = z.enum(["email", "manual", "qr", "share", "claim"]);
const surfaceSchema = z.enum(["qr", "whatsapp", "google-profile", "instagram", "website", "print", "other"]);
const outcomeBridgePayloadSchema = z.object({
    evidenceRef: z.string().trim().min(3).max(500),
    eventId: z.string().trim().min(8).max(180),
    outcomeType: z.enum(["route_created", "upload_started", "preview_prepared", "published", "two_surface_activation"]),
    ownerQualifiedAt: z.string().datetime({ offset: true }),
    ownerReviewedAt: z.string().datetime({ offset: true }).optional(),
    routeToken: z.string().trim().min(32).max(256),
    surfaces: z.array(surfaceSchema).max(7).default([]),
    targetId: z.string().trim().min(3).max(160),
}).strict().superRefine((value, context) => {
    if (value.outcomeType !== "two_surface_activation") return;
    if (!value.ownerReviewedAt) context.addIssue({ code: z.ZodIssueCode.custom, message: "Owner review is required", path: ["ownerReviewedAt"] });
    if (new Set(value.surfaces).size < 2) context.addIssue({ code: z.ZodIssueCode.custom, message: "Two distinct surfaces are required", path: ["surfaces"] });
});

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");
const env = (key: string) => process.env[key]?.trim() || "";
const safeEqual = (left: string, right: string) => {
    try {
        return timingSafeEqual(Buffer.from(left), Buffer.from(right));
    } catch {
        return false;
    }
};

class SignalDeskOutcomeBridgeRequestError extends Error {
    readonly status: 400 | 401 | 409 | 422;

    constructor(message: string, status: 400 | 401 | 409 | 422) {
        super(message);
        this.name = "SignalDeskOutcomeBridgeRequestError";
        this.status = status;
    }
}

export const getSignalDeskOutcomeBridgeRequestErrorStatus = (error: unknown) => (
    error instanceof SignalDeskOutcomeBridgeRequestError ? error.status : null
);

const getDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db: FirebaseFirestore.Firestore | null = signaldeskFirestoreAdmin;
    return db && typeof db.collection === "function" ? db : null;
};

const systemAccess: SignalDeskAccessContext = {
    active: true,
    email: undefined,
    firebaseConfigured: true,
    isPlatformAdmin: false,
    name: "MenuList outcome bridge",
    permissions: [],
    role: "system-worker",
    userId: "menulist-outcome-bridge",
};

export async function processSignalDeskOutcomeBridge(params: {
    rawBody: string;
    requestHeaders: Headers;
}) {
    if (!FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_OUTCOME_BRIDGE) throw new Error("SignalDesk outcome bridge is disabled");
    const secret = env(SIGNALDESK_INTEGRATION_ENV.OUTCOME_BRIDGE_SECRET);
    const signature = params.requestHeaders.get("x-signaldesk-outcome-signature") || "";
    const timestampHeader = params.requestHeaders.get("x-signaldesk-outcome-timestamp") || "";
    const timestamp = Number(timestampHeader);
    if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature) || !/^\d{10,12}$/.test(timestampHeader) || !Number.isSafeInteger(timestamp)) {
        throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk outcome bridge signature", 401);
    }
    if (Math.abs(Date.now() - (timestamp * 1000)) > OUTCOME_BRIDGE_MAX_CLOCK_SKEW_MS) {
        throw new SignalDeskOutcomeBridgeRequestError("Stale SignalDesk outcome bridge request", 401);
    }
    const expected = `sha256=${createHmac("sha256", secret).update(`${timestampHeader}.${params.rawBody}`).digest("hex")}`;
    if (!safeEqual(signature, expected)) throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk outcome bridge signature", 401);

    let parsed: unknown;
    try {
        parsed = JSON.parse(params.rawBody);
    } catch {
        throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk outcome bridge payload", 400);
    }
    const validation = outcomeBridgePayloadSchema.safeParse(parsed);
    if (!validation.success) throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk outcome bridge payload", 422);
    const payload = validation.data;
    const db = getDb();
    if (!db) throw new Error("SignalDesk Firebase is not configured");
    const tokenHash = hashValue(payload.routeToken);
    const routeTokenId = `route_${tokenHash.slice(0, 32)}`;
    const routeSnap = await db.collection(SIGNALDESK_COLLECTIONS.ROUTE_TOKENS).doc(routeTokenId).get();
    if (!routeSnap.exists) throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk route token", 401);
    const route = routeSnap.data() || {};
    const channel = outcomeChannelSchema.safeParse(route.channel);
    if (
        route.scope !== SIGNALDESK_OUTCOME_ROUTE_SCOPE
        || route.tokenHash !== tokenHash
        || route.targetId !== payload.targetId
        || !channel.success
    ) {
        throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk route token", 401);
    }

    let result;
    try {
        result = await recordSignalDeskOutcomeServer(systemAccess, {
            channel: channel.data as SignalDeskOutcomeSummary["channel"],
            evidenceRef: payload.evidenceRef,
            idempotencyKey: `bridge:${payload.eventId}`,
            integrityStatus: "menulist-signed",
            outcomeType: payload.outcomeType,
            ownerQualifiedAt: payload.ownerQualifiedAt,
            ownerReviewedAt: payload.ownerReviewedAt,
            routeTokenValidation: {
                routeTokenHash: tokenHash,
                routeTokenId,
            },
            source: "route-token",
            sourceEventId: payload.eventId,
            surfaces: payload.surfaces,
            targetId: payload.targetId,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "INVALID_SIGNALDESK_ROUTE_TOKEN") {
            throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk route token", 401);
        }
        if (error instanceof Error && error.message === "OUTCOME_IDEMPOTENCY_CONFLICT") {
            throw new SignalDeskOutcomeBridgeRequestError("Outcome idempotency conflict", 409);
        }
        if (error instanceof Error && (
            error.message === "OUTCOME_TIMESTAMP_INVALID"
            || error.message === "ACTIVATION_OWNER_REVIEW_REQUIRED"
            || error.message === "ACTIVATION_TWO_DISTINCT_SURFACES_REQUIRED"
        )) {
            throw new SignalDeskOutcomeBridgeRequestError("Invalid SignalDesk outcome bridge payload", 422);
        }
        throw error;
    }
    return {
        duplicate: result.duplicate,
        eventId: result.outcomeEventId,
        status: result.duplicate ? "duplicate" as const : "processed" as const,
    };
}
