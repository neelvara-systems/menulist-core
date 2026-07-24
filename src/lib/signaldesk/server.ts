import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { sanitizeForFirestore as sanitizeFirestoreValue } from "@lib/firestore/sanitizeForFirestore";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { getSignalDeskAccessLogContext, logSignalDeskFailure } from "@lib/signaldesk/apiGuards";
import {
    buildSignalDeskDailyCostMutation,
    parseSignalDeskDailyCostDocument,
} from "@lib/signaldesk/accountingContracts";
import { createHash } from "crypto";
import type {
    SignalDeskAccessContext,
    SignalDeskControlRoomSummary,
    SignalDeskCostSummary,
    SignalDeskIncidentSummary,
    SignalDeskKillSwitch,
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskOverview,
    SignalDeskQueueSummary,
} from "@type/signaldesk";

const getSignalDeskDb = () => {
    if (!isSignalDeskFirebaseConfigured && !process.env.FIRESTORE_EMULATOR_HOST) return null;
    const db = signaldeskFirestoreAdmin as any;
    return db && typeof db.collection === "function" ? signaldeskFirestoreAdmin : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null && !Array.isArray(value)
);

const timestampToIso = (value: unknown): string | null => {
    if (value == null) return null;
    let date: Date;
    try {
        if (value instanceof Date) {
            date = value;
        } else if (isRecord(value) && typeof value.toDate === "function") {
            date = (value.toDate as () => Date)();
        } else {
            return null;
        }
    } catch {
        return null;
    }
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
};

const isNonnegativeSafeInteger = (value: unknown): value is number => (
    typeof value === "number"
    && Number.isSafeInteger(value)
    && value >= 0
);

const optionalBoundedString = (value: unknown, maximum: number): string | null | undefined => {
    if (value == null) return null;
    if (typeof value !== "string" || value !== value.trim() || value.length > maximum) return undefined;
    return value;
};

const hashValue = (value: string) => createHash("sha256").update(value).digest("hex");

const CHANNEL_STATUSES = new Set<SignalDeskControlRoomSummary["channelStatus"]>([
    "healthy",
    "paused",
    "warning",
    "stale",
    "not_configured",
]);

const COST_STATUSES = new Set<SignalDeskControlRoomSummary["costStatus"]>([
    "healthy",
    "warning",
    "over_limit",
    "not_configured",
]);

const SOURCE_STATUSES = new Set<SignalDeskControlRoomSummary["sourceStatus"]>([
    "healthy",
    "warning",
    "stale",
    "not_configured",
]);

const INCIDENT_SEVERITIES = new Set<SignalDeskIncidentSummary["severity"]>([
    "low",
    "medium",
    "high",
    "critical",
]);

const INCIDENT_STATUSES = new Set<SignalDeskIncidentSummary["status"]>([
    "open",
    "acknowledged",
    "resolved",
]);

export const SIGNALDESK_KILL_SWITCH_SCOPE_VALUES = [
    "global-outbound",
    "email",
    "whatsapp",
    "instagram",
    "messenger",
    "source-provider",
    "ai-worker",
    "campaign",
    "content-distribution",
    "trust-partner",
    "menu-list-bridge",
] as const satisfies readonly SignalDeskKillSwitchScope[];

const KILL_SWITCH_SCOPES = new Set<SignalDeskKillSwitchScope>(SIGNALDESK_KILL_SWITCH_SCOPE_VALUES);

const KILL_SWITCH_STATUSES = new Set<SignalDeskKillSwitchStatus>(["active", "inactive"]);

const sanitizeForFirestore = (value: unknown) => sanitizeFirestoreValue(value, {
    dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
});

const defaultControlRoom = (): SignalDeskControlRoomSummary => ({
    activeKillSwitchCount: 0,
    channelStatus: "not_configured",
    costStatus: "not_configured",
    demandSignalCount: 0,
    openIncidentCount: 0,
    outcomeCount: 0,
    sourceStatus: "not_configured",
    targetCount: 0,
    updatedAt: null,
});

const defaultQueues = (): SignalDeskQueueSummary => ({
    approvalBacklog: 0,
    humanReview: 0,
    inboxBacklog: 0,
    overdue: 0,
});

const defaultCost = (): SignalDeskCostSummary => ({
    aiCostEstimate: 0,
    firestoreReadEstimate: 0,
    firestoreWriteEstimate: 0,
    providerCostEstimate: 0,
    updatedAt: null,
});

const optionalStrictTimestamp = (value: unknown): string | null | undefined => {
    if (value == null) return null;
    return timestampToIso(value) || undefined;
};

const readOptionalCount = (data: Record<string, unknown>, field: string): number | null => {
    if (!Object.prototype.hasOwnProperty.call(data, field)) return 0;
    return isNonnegativeSafeInteger(data[field]) ? data[field] : null;
};

export const projectSignalDeskControlRoomDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskControlRoomSummary | null => {
    if (!isRecord(raw) || raw.pId !== SIGNALDESK_PRODUCT_CODE || raw.controlRoomSummaryId !== documentId) return null;
    const activeKillSwitchCount = readOptionalCount(raw, "activeKillSwitchCount");
    const demandSignalCount = readOptionalCount(raw, "demandSignalCount");
    const openIncidentCount = readOptionalCount(raw, "openIncidentCount");
    const outcomeCount = readOptionalCount(raw, "outcomeCount");
    const targetCount = readOptionalCount(raw, "targetCount");
    const updatedAt = optionalStrictTimestamp(raw.updatedAt);
    if (
        activeKillSwitchCount == null
        || demandSignalCount == null
        || openIncidentCount == null
        || outcomeCount == null
        || targetCount == null
        || updatedAt === undefined
        || !updatedAt
        || (raw.channelStatus != null && (typeof raw.channelStatus !== "string" || !CHANNEL_STATUSES.has(raw.channelStatus as SignalDeskControlRoomSummary["channelStatus"])))
        || (raw.costStatus != null && (typeof raw.costStatus !== "string" || !COST_STATUSES.has(raw.costStatus as SignalDeskControlRoomSummary["costStatus"])))
        || (raw.sourceStatus != null && (typeof raw.sourceStatus !== "string" || !SOURCE_STATUSES.has(raw.sourceStatus as SignalDeskControlRoomSummary["sourceStatus"])))
    ) return null;
    return {
        activeKillSwitchCount,
        channelStatus: (raw.channelStatus as SignalDeskControlRoomSummary["channelStatus"] | undefined) || "not_configured",
        costStatus: (raw.costStatus as SignalDeskControlRoomSummary["costStatus"] | undefined) || "not_configured",
        demandSignalCount,
        openIncidentCount,
        outcomeCount,
        sourceStatus: (raw.sourceStatus as SignalDeskControlRoomSummary["sourceStatus"] | undefined) || "not_configured",
        targetCount,
        updatedAt,
    };
};

export const projectSignalDeskQueueDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskQueueSummary | null => {
    if (!isRecord(raw) || raw.pId !== SIGNALDESK_PRODUCT_CODE || raw.queueSummaryId !== documentId) return null;
    const approvalBacklog = readOptionalCount(raw, "approvalBacklog");
    const humanReview = readOptionalCount(raw, "humanReview");
    const inboxBacklog = readOptionalCount(raw, "inboxBacklog");
    const overdue = readOptionalCount(raw, "overdue");
    const updatedAt = optionalStrictTimestamp(raw.updatedAt);
    if (
        approvalBacklog == null
        || humanReview == null
        || inboxBacklog == null
        || overdue == null
        || updatedAt === undefined
        || !updatedAt
    ) return null;
    // Persisted freshness is authoritative and must validate, but the public
    // queue DTO intentionally exposes counts only.
    return { approvalBacklog, humanReview, inboxBacklog, overdue };
};

export const projectSignalDeskCostDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskCostSummary | null => {
    try {
        const authority = parseSignalDeskDailyCostDocument(raw, documentId);
        return {
            aiCostEstimate: authority.aiCostEstimate,
            firestoreReadEstimate: authority.firestoreReadEstimate,
            firestoreWriteEstimate: authority.firestoreWriteEstimate,
            providerCostEstimate: authority.providerCostEstimate,
            updatedAt: authority.updatedAt,
        };
    } catch {
        return null;
    }
};

export const parseSignalDeskKillSwitchDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskKillSwitch => {
    if (!isRecord(raw)) throw new Error("KILL_SWITCH_SHAPE_INVALID");
    if (raw.pId !== SIGNALDESK_PRODUCT_CODE) throw new Error("KILL_SWITCH_PRODUCT_MISMATCH");
    if (raw.killSwitchId !== documentId) throw new Error("KILL_SWITCH_IDENTITY_MISMATCH");
    const scope = raw.scope as SignalDeskKillSwitchScope;
    const status = raw.status as SignalDeskKillSwitchStatus;
    const activatedAt = optionalStrictTimestamp(raw.activatedAt);
    const deactivatedAt = optionalStrictTimestamp(raw.deactivatedAt);
    const updatedAt = optionalStrictTimestamp(raw.updatedAt);
    const activatedBy = optionalBoundedString(raw.activatedBy, 512);
    const deactivatedBy = optionalBoundedString(raw.deactivatedBy, 512);
    if (
        !KILL_SWITCH_SCOPES.has(scope)
        || documentId !== `scope_${scope}`
        || !KILL_SWITCH_STATUSES.has(status)
        || typeof raw.reason !== "string"
        || raw.reason !== raw.reason.trim()
        || raw.reason.length < 1
        || raw.reason.length > 500
        || activatedAt === undefined
        || activatedBy === undefined
        || deactivatedAt === undefined
        || deactivatedBy === undefined
        || updatedAt === undefined
        || !updatedAt
        || (status === "active" && (!activatedAt || !activatedBy))
        || (status === "inactive" && (!deactivatedAt || !deactivatedBy))
    ) throw new Error("KILL_SWITCH_SHAPE_INVALID");
    return {
        activatedAt,
        activatedBy,
        deactivatedAt,
        deactivatedBy,
        killSwitchId: documentId,
        reason: raw.reason,
        scope,
        status,
        updatedAt,
    };
};

export const projectSignalDeskKillSwitchDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskKillSwitch | null => {
    try {
        return parseSignalDeskKillSwitchDocument(raw, documentId);
    } catch {
        return null;
    }
};

export const projectSignalDeskIncidentDocument = (
    raw: unknown,
    documentId: string,
): SignalDeskIncidentSummary | null => {
    if (!isRecord(raw) || raw.pId !== SIGNALDESK_PRODUCT_CODE || raw.incidentId !== documentId) return null;
    const severity = raw.severity as SignalDeskIncidentSummary["severity"];
    const status = raw.status as SignalDeskIncidentSummary["status"];
    const updatedAt = optionalStrictTimestamp(raw.updatedAt);
    if (
        !INCIDENT_SEVERITIES.has(severity)
        || !INCIDENT_STATUSES.has(status)
        || typeof raw.title !== "string"
        || raw.title !== raw.title.trim()
        || raw.title.length < 1
        || raw.title.length > 500
        || updatedAt === undefined
        || !updatedAt
    ) return null;
    return { incidentId: documentId, severity, status, title: raw.title, updatedAt };
};

type LegacyOverviewSummaryProjection = {
    controlRoom?: SignalDeskControlRoomSummary;
    cost?: SignalDeskCostSummary;
    queues?: SignalDeskQueueSummary;
};

const hasMissingLegacyIdentity = (
    raw: unknown,
    identityField: string,
): raw is Record<string, unknown> => (
    isRecord(raw)
    && (raw.pId === undefined || raw.pId === SIGNALDESK_PRODUCT_CODE)
    && raw[identityField] === undefined
);

const canonicalizeLegacyOverviewSummaries = async (params: {
    controlSnapshot: FirebaseFirestore.DocumentSnapshot;
    costSnapshot: FirebaseFirestore.DocumentSnapshot;
    db: FirebaseFirestore.Firestore;
    queueSnapshot: FirebaseFirestore.DocumentSnapshot;
}): Promise<LegacyOverviewSummaryProjection> => {
    const timestamp = admin.firestore.Timestamp.now();
    const controlCandidate = params.controlSnapshot.exists
        && hasMissingLegacyIdentity(params.controlSnapshot.data(), "controlRoomSummaryId")
        ? projectSignalDeskControlRoomDocument({
            ...params.controlSnapshot.data(),
            controlRoomSummaryId: params.controlSnapshot.id,
            pId: SIGNALDESK_PRODUCT_CODE,
        }, params.controlSnapshot.id)
        : null;
    const queueRaw = params.queueSnapshot.data();
    const queueCandidate = params.queueSnapshot.exists
        && hasMissingLegacyIdentity(queueRaw, "queueSummaryId")
        ? projectSignalDeskQueueDocument({
            ...queueRaw,
            pId: SIGNALDESK_PRODUCT_CODE,
            queueSummaryId: params.queueSnapshot.id,
            updatedAt: queueRaw.updatedAt === undefined ? timestamp : queueRaw.updatedAt,
        }, params.queueSnapshot.id)
        : null;
    const costCandidate = params.costSnapshot.exists
        && hasMissingLegacyIdentity(params.costSnapshot.data(), "day")
        ? projectSignalDeskCostDocument({
            ...params.costSnapshot.data(),
            day: params.costSnapshot.id,
            pId: SIGNALDESK_PRODUCT_CODE,
        }, params.costSnapshot.id)
        : null;

    if (!controlCandidate && !queueCandidate && !costCandidate) return {};

    return params.db.runTransaction(async (transaction) => {
        const [controlSnapshot, queueSnapshot, costSnapshot] = await Promise.all([
            transaction.get(params.controlSnapshot.ref),
            transaction.get(params.queueSnapshot.ref),
            transaction.get(params.costSnapshot.ref),
        ]);
        const result: LegacyOverviewSummaryProjection = {};

        const currentControlRoom = controlSnapshot.exists
            ? projectSignalDeskControlRoomDocument(controlSnapshot.data(), controlSnapshot.id)
            : null;
        if (controlCandidate && currentControlRoom) {
            result.controlRoom = currentControlRoom;
        } else if (controlCandidate && hasMissingLegacyIdentity(controlSnapshot.data(), "controlRoomSummaryId")) {
            const projected = projectSignalDeskControlRoomDocument({
                ...controlSnapshot.data(),
                controlRoomSummaryId: controlSnapshot.id,
                pId: SIGNALDESK_PRODUCT_CODE,
            }, controlSnapshot.id);
            if (!projected) throw new Error("CONTROL_ROOM_LEGACY_SUMMARY_SHAPE_INVALID");
            transaction.set(controlSnapshot.ref, {
                controlRoomSummaryId: controlSnapshot.id,
                pId: SIGNALDESK_PRODUCT_CODE,
            }, { merge: true });
            result.controlRoom = projected;
        }

        const currentQueues = queueSnapshot.exists
            ? projectSignalDeskQueueDocument(queueSnapshot.data(), queueSnapshot.id)
            : null;
        if (queueCandidate && currentQueues) {
            result.queues = currentQueues;
        } else if (queueCandidate && hasMissingLegacyIdentity(queueSnapshot.data(), "queueSummaryId")) {
            const currentQueue = queueSnapshot.data();
            const updatedAt = currentQueue.updatedAt === undefined ? timestamp : currentQueue.updatedAt;
            const projected = projectSignalDeskQueueDocument({
                ...currentQueue,
                pId: SIGNALDESK_PRODUCT_CODE,
                queueSummaryId: queueSnapshot.id,
                updatedAt,
            }, queueSnapshot.id);
            if (!projected) throw new Error("QUEUE_LEGACY_SUMMARY_SHAPE_INVALID");
            transaction.set(queueSnapshot.ref, {
                pId: SIGNALDESK_PRODUCT_CODE,
                queueSummaryId: queueSnapshot.id,
                ...(currentQueue.updatedAt === undefined ? { updatedAt } : {}),
            }, { merge: true });
            result.queues = projected;
        }

        const currentCost = costSnapshot.exists
            ? projectSignalDeskCostDocument(costSnapshot.data(), costSnapshot.id)
            : null;
        if (costCandidate && currentCost) {
            result.cost = currentCost;
        } else if (costCandidate && hasMissingLegacyIdentity(costSnapshot.data(), "day")) {
            const projected = projectSignalDeskCostDocument({
                ...costSnapshot.data(),
                day: costSnapshot.id,
                pId: SIGNALDESK_PRODUCT_CODE,
            }, costSnapshot.id);
            if (!projected) throw new Error("COST_LEGACY_SUMMARY_SHAPE_INVALID");
            transaction.set(costSnapshot.ref, {
                day: costSnapshot.id,
                pId: SIGNALDESK_PRODUCT_CODE,
            }, { merge: true });
            result.cost = projected;
        }

        return result;
    });
};

const SIGNALDESK_INCIDENT_LIST_LIMIT = 50;
const SIGNALDESK_INCIDENT_STRICT_COUNT_MAX_DOCUMENTS = 500;

const logInvalidOverviewDocuments = (
    access: SignalDeskAccessContext,
    kind: string,
    invalidCount: number,
    scanTruncated = false,
) => {
    if (!invalidCount && !scanTruncated) return;
    logSignalDeskFailure(
        "signaldesk_overview_document_invalid",
        new Error("signaldesk_overview_document_invalid"),
        {
            ...getSignalDeskAccessLogContext(access),
            invalidCount,
            kind,
            scanTruncated,
        },
    );
};

const readActiveKillSwitches = async (db: FirebaseFirestore.Firestore, access: SignalDeskAccessContext) => {
    const snapshots = await Promise.all(SIGNALDESK_KILL_SWITCH_SCOPE_VALUES.map((scope) => (
        db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(`scope_${scope}`).get()
    )));
    let invalidCount = 0;
    const activeKillSwitches = snapshots.flatMap((snapshot) => {
        if (!snapshot.exists) return [];
        const projected = projectSignalDeskKillSwitchDocument(snapshot.data(), snapshot.id);
        if (!projected) {
            invalidCount += 1;
            return [];
        }
        return projected.status === "active" ? [projected] : [];
    });
    logInvalidOverviewDocuments(access, "kill-switch", invalidCount);
    return activeKillSwitches;
};

const readOpenIncidents = async (db: FirebaseFirestore.Firestore, access: SignalDeskAccessContext) => {
    const snapshot = await db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS)
        .where("pId", "==", SIGNALDESK_PRODUCT_CODE)
        .where("status", "in", ["open", "acknowledged"])
        .orderBy(admin.firestore.FieldPath.documentId())
        .limit(SIGNALDESK_INCIDENT_STRICT_COUNT_MAX_DOCUMENTS + 1)
        .get();
    if (snapshot.size > SIGNALDESK_INCIDENT_STRICT_COUNT_MAX_DOCUMENTS) {
        const error = new Error("SIGNALDESK_INCIDENT_STRICT_COUNT_LIMIT_EXCEEDED");
        logSignalDeskFailure(
            "signaldesk_incident_strict_count_limit_exceeded",
            error,
            {
                ...getSignalDeskAccessLogContext(access),
                matchedDocumentCountAtLeast: snapshot.size,
                maxDocuments: SIGNALDESK_INCIDENT_STRICT_COUNT_MAX_DOCUMENTS,
            },
        );
        throw error;
    }

    const incidents: SignalDeskIncidentSummary[] = [];
    let invalidCount = 0;
    let openIncidentCount = 0;
    for (const document of snapshot.docs) {
        const projected = projectSignalDeskIncidentDocument(document.data(), document.id);
        if (!projected) {
            invalidCount += 1;
            continue;
        }
        openIncidentCount += 1;
        if (incidents.length < SIGNALDESK_INCIDENT_LIST_LIMIT) incidents.push(projected);
    }
    logInvalidOverviewDocuments(access, "incident", invalidCount);
    return { incidents, openIncidentCount };
};

const buildMetrics = (
    controlRoom: SignalDeskControlRoomSummary,
    queues: SignalDeskQueueSummary,
    cost: SignalDeskCostSummary,
) => [
    { key: "targets", label: "Targets", value: controlRoom.targetCount, tone: "neutral" as const },
    { key: "approval", label: "Approval Queue", value: queues.approvalBacklog, tone: queues.approvalBacklog ? "warning" as const : "good" as const },
    { key: "inbox", label: "Inbox Review", value: queues.inboxBacklog, tone: queues.inboxBacklog ? "warning" as const : "good" as const },
    { key: "outcomes", label: "MenuList Outcomes", value: controlRoom.outcomeCount, tone: "good" as const },
    { key: "demand", label: "Demand Signals", value: controlRoom.demandSignalCount, tone: "neutral" as const },
    { key: "cost", label: "Daily Cost Estimate", value: `$${(cost.aiCostEstimate + cost.providerCostEstimate).toFixed(2)}`, tone: controlRoom.costStatus === "over_limit" ? "danger" as const : "neutral" as const },
];

export async function loadSignalDeskOverviewServer(access: SignalDeskAccessContext): Promise<SignalDeskOverview> {
    const db = getSignalDeskDb();
    if (!db) {
        const controlRoom = defaultControlRoom();
        const queues = defaultQueues();
        const cost = defaultCost();
        return {
            access,
            activeKillSwitches: [],
            controlRoom,
            cost,
            incidents: [],
            metrics: buildMetrics(controlRoom, queues, cost),
            queues,
            setup: {
                firebaseConfigured: false,
                providerSendEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND,
                runtimeEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL,
            },
        };
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const [controlSnap, queueSnap, costSnap, activeKillSwitches, incidentOverview] = await Promise.all([
            db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).get(),
            db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get(),
            db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(today).get(),
            readActiveKillSwitches(db, access),
            readOpenIncidents(db, access),
        ]);

        const legacySummaries = await canonicalizeLegacyOverviewSummaries({
            controlSnapshot: controlSnap,
            costSnapshot: costSnap,
            db,
            queueSnapshot: queueSnap,
        });

        const controlRoom = controlSnap.exists
            ? projectSignalDeskControlRoomDocument(controlSnap.data(), controlSnap.id) || legacySummaries.controlRoom || null
            : defaultControlRoom();
        const queues = queueSnap.exists
            ? projectSignalDeskQueueDocument(queueSnap.data(), queueSnap.id) || legacySummaries.queues || null
            : defaultQueues();
        const cost = costSnap.exists
            ? projectSignalDeskCostDocument(costSnap.data(), costSnap.id) || legacySummaries.cost || null
            : defaultCost();
        if (!controlRoom) logInvalidOverviewDocuments(access, "control-room-summary", 1);
        if (!queues) logInvalidOverviewDocuments(access, "queue-summary", 1);
        if (!cost) logInvalidOverviewDocuments(access, "cost-summary", 1);
        const projectedControlRoom = controlRoom || defaultControlRoom();
        const projectedQueues = queues || defaultQueues();
        const projectedCost = cost || defaultCost();

        projectedControlRoom.activeKillSwitchCount = activeKillSwitches.length;
        projectedControlRoom.openIncidentCount = incidentOverview.openIncidentCount;

        return {
            access,
            activeKillSwitches,
            controlRoom: projectedControlRoom,
            cost: projectedCost,
            incidents: incidentOverview.incidents,
            metrics: buildMetrics(projectedControlRoom, projectedQueues, projectedCost),
            queues: projectedQueues,
            setup: {
                firebaseConfigured: true,
                providerSendEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND,
                runtimeEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL,
            },
        };
    } catch (error) {
        logSignalDeskFailure(
            "signaldesk_overview_load_failed",
            error,
            getSignalDeskAccessLogContext(access),
        );
        throw error;
    }
}

export async function setSignalDeskKillSwitchServer(params: {
    access: SignalDeskAccessContext;
    idempotencyKey: string;
    reason: string;
    scope: SignalDeskKillSwitchScope;
    status: SignalDeskKillSwitchStatus;
}) {
    const db = getSignalDeskDb();
    if (!db) {
        throw new Error("SignalDesk Firebase is not configured");
    }

    const idempotencyKey = params.idempotencyKey.trim();
    const reason = params.reason.trim();
    if (idempotencyKey.length < 8 || idempotencyKey.length > 180) {
        throw new Error("KILL_SWITCH_IDEMPOTENCY_KEY_REQUIRED");
    }
    if (reason.length < 6 || reason.length > 500) throw new Error("KILL_SWITCH_REASON_INVALID");
    if (!KILL_SWITCH_SCOPES.has(params.scope) || !KILL_SWITCH_STATUSES.has(params.status)) {
        throw new Error("KILL_SWITCH_SHAPE_INVALID");
    }

    const timestamp = admin.firestore.Timestamp.now();
    const day = timestamp.toDate().toISOString().slice(0, 10);
    const killSwitchId = `scope_${params.scope}`;
    const isActive = params.status === "active";
    const killSwitchRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(killSwitchId);
    const idempotencyKeyHash = hashValue(idempotencyKey);
    const operationHash = hashValue(`${params.access.userId}|${idempotencyKey}`);
    const requestFingerprintHash = hashValue(JSON.stringify({
        actorId: params.access.userId,
        reason,
        scope: params.scope,
        status: params.status,
    }));
    const claimRef = db.collection(SIGNALDESK_COLLECTIONS.IDEMPOTENCY_KEYS).doc(`kill_switch_${operationHash}`);
    const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).doc();
    const costRef = db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(day);

    return db.runTransaction(async (transaction) => {
        const claimSnapshot = await transaction.get(claimRef);
        if (claimSnapshot.exists) {
            const claim = claimSnapshot.data();
            if (
                !isRecord(claim)
                || claim.pId !== SIGNALDESK_PRODUCT_CODE
                || claim.claimId !== claimRef.id
                || claim.operation !== "kill_switch_set"
                || claim.actorId !== params.access.userId
                || claim.entityId !== killSwitchId
                || claim.idempotencyKeyHash !== idempotencyKeyHash
                || claim.requestFingerprintHash !== requestFingerprintHash
            ) throw new Error("KILL_SWITCH_IDEMPOTENCY_CONFLICT");
            return parseSignalDeskKillSwitchDocument(claim.resultSnapshot, killSwitchId);
        }

        const [currentSnapshot, costSnapshot] = await Promise.all([
            transaction.get(killSwitchRef),
            transaction.get(costRef),
        ]);
        const current = currentSnapshot.exists
            ? parseSignalDeskKillSwitchDocument(currentSnapshot.data(), currentSnapshot.id)
            : null;
        const currentData = currentSnapshot.exists ? currentSnapshot.data() : null;
        const killSwitchData = sanitizeForFirestore({
            activatedAt: isActive ? timestamp : currentData?.activatedAt || null,
            activatedBy: isActive ? params.access.userId : current?.activatedBy || null,
            deactivatedAt: isActive ? null : timestamp,
            deactivatedBy: isActive ? null : params.access.userId,
            killSwitchId,
            pId: SIGNALDESK_PRODUCT_CODE,
            reason,
            scope: params.scope,
            status: params.status,
            updatedAt: timestamp,
            updatedBy: params.access.userId,
        });
        const projected = parseSignalDeskKillSwitchDocument(killSwitchData, killSwitchId);
        transaction.set(killSwitchRef, killSwitchData);
        transaction.create(auditRef, sanitizeForFirestore({
            action: isActive ? "kill_switch_activate" : "kill_switch_deactivate",
            actorId: params.access.userId,
            actorRole: params.access.role,
            auditEventId: auditRef.id,
            createdAt: timestamp,
            entityId: killSwitchId,
            entityType: "killSwitch",
            pId: SIGNALDESK_PRODUCT_CODE,
            reason: `event:${isActive ? "kill_switch_activate" : "kill_switch_deactivate"}`,
        }));
        transaction.create(claimRef, sanitizeForFirestore({
            actorId: params.access.userId,
            claimId: claimRef.id,
            entityId: killSwitchId,
            idempotencyKeyHash,
            operation: "kill_switch_set",
            pId: SIGNALDESK_PRODUCT_CODE,
            requestFingerprintHash,
            resultSnapshot: killSwitchData,
            status: "completed",
            updatedAt: timestamp,
        }));
        transaction.set(costRef, sanitizeForFirestore(buildSignalDeskDailyCostMutation({
            current: costSnapshot.exists ? costSnapshot.data() : null,
            day,
            delta: { firestoreWriteEstimate: 4 },
            updatedAt: timestamp,
        })));
        return projected;
    });
}

export async function recordSignalDeskMobileActionBlockedServer(params: {
    access: SignalDeskAccessContext;
    action: string;
    actionClass: string;
}) {
    const db = getSignalDeskDb();
    if (!db) return;
    const now = admin.firestore.Timestamp.now();
    const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).doc();
    await auditRef.set(sanitizeForFirestore({
        auditEventId: auditRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        actorId: params.access.userId,
        actorRole: params.access.role,
        action: "mobile_action_blocked",
        actionClass: params.actionClass,
        entityType: "signaldeskAction",
        entityId: params.action,
        reason: "MOBILE_READ_ONLY_ACTION_BLOCKED",
        createdAt: now,
    }));
}
