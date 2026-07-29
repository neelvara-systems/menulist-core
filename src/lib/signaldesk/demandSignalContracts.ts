import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { z } from "zod";

const signalTypeSchema = z.enum(["qr_scan", "link_click", "share", "claim_attempt", "referral"]);
const sourceSurfaceSchema = z.enum(["menu", "qr", "website", "manual", "other"]);
const canonicalId = (max: number) => z.string().trim().min(3).max(max);
const nullableTargetId = canonicalId(160).nullable();
const nullableTargetName = z.string().trim().min(2).max(180).nullable();

type FirestoreTimestampLike = {
    toMillis: () => number;
};

const readTimestampMillis = (value: unknown): number | null => {
    if ((typeof value !== "object" && typeof value !== "function") || value === null) return null;
    try {
        const toMillis = Reflect.get(value, "toMillis");
        if (typeof toMillis !== "function") return null;
        const millis = Reflect.apply(toMillis, value, []);
        if (typeof millis !== "number" || !Number.isFinite(millis)) return null;
        return Number.isFinite(new Date(millis).getTime()) ? millis : null;
    } catch {
        return null;
    }
};

const timestampSchema = z.custom<FirestoreTimestampLike>(
    (value) => readTimestampMillis(value) !== null,
    "Invalid Firestore timestamp",
);

const demandSignalEventSchema = z.object({
    createdAt: timestampSchema,
    createdBy: canonicalId(180),
    demandSignalId: z.string().regex(/^demand_[a-f0-9]{32}$/),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    signalType: signalTypeSchema,
    sourceSurface: sourceSurfaceSchema,
    targetId: nullableTargetId,
    targetName: nullableTargetName,
}).strict().superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Demand target identity is incomplete." });
    }
});

const demandSignalSummarySchema = z.object({
    count: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    demandSignalId: canonicalId(300),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    signalType: signalTypeSchema,
    sourceSurface: sourceSurfaceSchema,
    targetId: nullableTargetId,
    targetName: nullableTargetName,
    updatedAt: timestampSchema,
}).strict().superRefine((value, context) => {
    if (Boolean(value.targetId) !== Boolean(value.targetName)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "Demand target identity is incomplete." });
    }
});

const demandSignalClaimSchema = z.object({
    actorId: canonicalId(180),
    entityId: z.string().regex(/^demand_[a-f0-9]{32}$/),
    operation: z.literal("demand_signal_capture"),
    pId: z.literal(SIGNALDESK_PRODUCT_CODE),
    requestFingerprintHash: z.string().regex(/^[a-f0-9]{64}$/),
    updatedAt: timestampSchema,
}).strict();

export type SignalDeskDemandSignalEventAuthority = z.infer<typeof demandSignalEventSchema>;
export type SignalDeskDemandSignalSummaryAuthority = z.infer<typeof demandSignalSummarySchema>;
export type SignalDeskDemandSignalClaimAuthority = z.infer<typeof demandSignalClaimSchema>;

const parseStrict = <T>(schema: z.ZodType<T>, raw: unknown, errorCode: string): T => {
    let parsed: z.SafeParseReturnType<unknown, T>;
    try {
        parsed = schema.safeParse(raw);
    } catch {
        throw new Error(errorCode);
    }
    if (!parsed.success) throw new Error(errorCode);
    return parsed.data;
};

export const getSignalDeskDemandSignalEventDay = (
    event: SignalDeskDemandSignalEventAuthority,
): string => {
    const millis = readTimestampMillis(event.createdAt);
    if (millis === null) throw new Error("DEMAND_SIGNAL_EVENT_INVALID");
    return new Date(millis).toISOString().slice(0, 10);
};

export const parseSignalDeskDemandSignalEventDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskDemandSignalEventAuthority => {
    const event = parseStrict(demandSignalEventSchema, raw, "DEMAND_SIGNAL_EVENT_INVALID");
    if (event.demandSignalId !== documentId) throw new Error("DEMAND_SIGNAL_EVENT_INVALID");
    return event;
};

export const parseSignalDeskDemandSignalSummaryDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskDemandSignalSummaryAuthority => {
    const summary = parseStrict(demandSignalSummarySchema, raw, "DEMAND_SIGNAL_SUMMARY_INVALID");
    if (summary.demandSignalId !== documentId) throw new Error("DEMAND_SIGNAL_SUMMARY_INVALID");
    return summary;
};

export const parseSignalDeskDemandSignalClaimDocument = (
    raw: unknown,
): SignalDeskDemandSignalClaimAuthority => (
    parseStrict(demandSignalClaimSchema, raw, "DEMAND_SIGNAL_CLAIM_INVALID")
);

export const assertSignalDeskDemandSignalSummaryMatchesEvent = (
    summary: SignalDeskDemandSignalSummaryAuthority,
    event: SignalDeskDemandSignalEventAuthority,
): void => {
    const eventDay = getSignalDeskDemandSignalEventDay(event);
    if (
        summary.day !== eventDay
        || summary.signalType !== event.signalType
        || summary.sourceSurface !== event.sourceSurface
        || summary.targetId !== event.targetId
        || summary.targetName !== event.targetName
    ) {
        throw new Error("DEMAND_SIGNAL_SUMMARY_LINEAGE_INVALID");
    }
};
