import { FEATURE_FLAGS } from "@config/features";
import { SIGNALDESK_COLLECTIONS, SIGNALDESK_SUMMARY_DOCS } from "@constant/signaldesk/database";
import { SIGNALDESK_PRODUCT_CODE } from "@constant/signaldesk/product";
import { admin, signaldeskFirestoreAdmin } from "@lib/firebase/signaldeskFirebaseAdmin";
import { isSignalDeskFirebaseConfigured } from "@lib/firebase/signaldeskConfig";
import { secureError } from "@lib/security/secureLogger";
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

const toIso = (value: any): string | null => {
    if (!value) return null;
    const date = typeof value?.toDate === "function"
        ? value.toDate()
        : typeof value?.seconds === "number"
            ? new Date(value.seconds * 1000)
            : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const numberOrZero = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

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

const KILL_SWITCH_SCOPES = new Set<SignalDeskKillSwitchScope>([
    "global-outbound",
    "email",
    "whatsapp",
    "instagram",
    "messenger",
    "source-provider",
    "ai-worker",
    "campaign",
    "menu-list-bridge",
]);

const KILL_SWITCH_STATUSES = new Set<SignalDeskKillSwitchStatus>(["active", "inactive"]);

const enumOrFallback = <T extends string>(
    allowed: Set<T>,
    value: unknown,
    fallback: T,
): T => (typeof value === "string" && allowed.has(value as T) ? value as T : fallback);

const sanitizeForFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value !== "object") return value;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (typeof value?.toDate === "function" && typeof value?.seconds === "number") return value;
    if (Array.isArray(value)) return value.map(sanitizeForFirestore);
    return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, sanitizeForFirestore(nested)]),
    );
};

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

const normalizeControlRoom = (data: Record<string, any> | undefined): SignalDeskControlRoomSummary => ({
    ...defaultControlRoom(),
    activeKillSwitchCount: numberOrZero(data?.activeKillSwitchCount),
    channelStatus: enumOrFallback(CHANNEL_STATUSES, data?.channelStatus, "not_configured"),
    costStatus: enumOrFallback(COST_STATUSES, data?.costStatus, "not_configured"),
    demandSignalCount: numberOrZero(data?.demandSignalCount),
    openIncidentCount: numberOrZero(data?.openIncidentCount),
    outcomeCount: numberOrZero(data?.outcomeCount),
    sourceStatus: enumOrFallback(SOURCE_STATUSES, data?.sourceStatus, "not_configured"),
    targetCount: numberOrZero(data?.targetCount),
    updatedAt: toIso(data?.updatedAt),
});

const normalizeQueues = (data: Record<string, any> | undefined): SignalDeskQueueSummary => ({
    approvalBacklog: numberOrZero(data?.approvalBacklog),
    humanReview: numberOrZero(data?.humanReview),
    inboxBacklog: numberOrZero(data?.inboxBacklog),
    overdue: numberOrZero(data?.overdue),
});

const normalizeCost = (data: Record<string, any> | undefined): SignalDeskCostSummary => ({
    aiCostEstimate: numberOrZero(data?.aiCostEstimate),
    firestoreReadEstimate: numberOrZero(data?.firestoreReadEstimate),
    firestoreWriteEstimate: numberOrZero(data?.firestoreWriteEstimate),
    providerCostEstimate: numberOrZero(data?.providerCostEstimate),
    updatedAt: toIso(data?.updatedAt),
});

const normalizeKillSwitch = (id: string, data: Record<string, any>): SignalDeskKillSwitch => ({
    activatedAt: toIso(data.activatedAt),
    activatedBy: data.activatedBy || null,
    deactivatedAt: toIso(data.deactivatedAt),
    deactivatedBy: data.deactivatedBy || null,
    expiresAt: toIso(data.expiresAt),
    killSwitchId: id,
    reason: String(data.reason || ""),
    scope: enumOrFallback(KILL_SWITCH_SCOPES, data.scope, "global-outbound"),
    status: enumOrFallback(KILL_SWITCH_STATUSES, data.status, "inactive"),
    updatedAt: toIso(data.updatedAt),
});

const normalizeIncident = (id: string, data: Record<string, any>): SignalDeskIncidentSummary => ({
    incidentId: id,
    severity: enumOrFallback(INCIDENT_SEVERITIES, data.severity, "medium"),
    status: enumOrFallback(INCIDENT_STATUSES, data.status, "open"),
    title: data.title || "SignalDesk incident",
    updatedAt: toIso(data.updatedAt),
});

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
        const [controlSnap, queueSnap, costSnap, killSwitchSnap, incidentSnap] = await Promise.all([
            db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM).get(),
            db.collection(SIGNALDESK_COLLECTIONS.QUEUE_SUMMARIES).doc(SIGNALDESK_SUMMARY_DOCS.QUEUES).get(),
            db.collection(SIGNALDESK_COLLECTIONS.COST_DAILY_SUMMARIES).doc(today).get(),
            db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).where("status", "==", "active").limit(10).get(),
            db.collection(SIGNALDESK_COLLECTIONS.INCIDENTS).where("status", "==", "open").limit(10).get(),
        ]);

        const controlRoom = normalizeControlRoom(controlSnap.data());
        const queues = normalizeQueues(queueSnap.data());
        const cost = normalizeCost(costSnap.data());
        const activeKillSwitches = killSwitchSnap.docs.map((doc) => normalizeKillSwitch(doc.id, doc.data()));
        const incidents = incidentSnap.docs.map((doc) => normalizeIncident(doc.id, doc.data()));

        controlRoom.activeKillSwitchCount = activeKillSwitches.length;
        controlRoom.openIncidentCount = incidents.length;

        return {
            access,
            activeKillSwitches,
            controlRoom,
            cost,
            incidents,
            metrics: buildMetrics(controlRoom, queues, cost),
            queues,
            setup: {
                firebaseConfigured: true,
                providerSendEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND,
                runtimeEnabled: FEATURE_FLAGS.ENABLE_MENULIST_SIGNALDESK_APP_SHELL,
            },
        };
    } catch (error) {
        secureError("[SignalDesk] Failed to load overview", error as Error, { userId: access.userId });
        throw error;
    }
}

export async function setSignalDeskKillSwitchServer(params: {
    access: SignalDeskAccessContext;
    reason: string;
    scope: SignalDeskKillSwitchScope;
    status: SignalDeskKillSwitchStatus;
}) {
    const db = getSignalDeskDb();
    if (!db) {
        throw new Error("SignalDesk Firebase is not configured");
    }

    const now = admin.firestore.Timestamp.now();
    const killSwitchId = `scope_${params.scope}`;
    const isActive = params.status === "active";
    const killSwitchRef = db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES).doc(killSwitchId);
    const auditRef = db.collection(SIGNALDESK_COLLECTIONS.AUDIT_EVENTS).doc();

    const killSwitchData = sanitizeForFirestore({
        killSwitchId,
        pId: SIGNALDESK_PRODUCT_CODE,
        scope: params.scope,
        status: params.status,
        reason: params.reason,
        activatedAt: isActive ? now : undefined,
        activatedBy: isActive ? params.access.userId : undefined,
        deactivatedAt: isActive ? undefined : now,
        deactivatedBy: isActive ? undefined : params.access.userId,
        updatedAt: now,
        updatedBy: params.access.userId,
    });

    const auditData = sanitizeForFirestore({
        auditEventId: auditRef.id,
        pId: SIGNALDESK_PRODUCT_CODE,
        actorId: params.access.userId,
        actorRole: params.access.role,
        action: isActive ? "kill_switch_activate" : "kill_switch_deactivate",
        entityType: "killSwitch",
        entityId: killSwitchId,
        reason: params.reason,
        createdAt: now,
    });

    const batch = db.batch();
    batch.set(killSwitchRef, killSwitchData, { merge: true });
    batch.set(auditRef, auditData);
    await batch.commit();

    const activeSwitches = await db.collection(SIGNALDESK_COLLECTIONS.KILL_SWITCHES)
        .where("status", "==", "active")
        .limit(20)
        .get();

    await db.collection(SIGNALDESK_COLLECTIONS.CONTROL_ROOM_SUMMARIES)
        .doc(SIGNALDESK_SUMMARY_DOCS.CONTROL_ROOM)
        .set(sanitizeForFirestore({
            activeKillSwitchCount: activeSwitches.size,
            channelStatus: activeSwitches.size > 0 ? "paused" : "not_configured",
            updatedAt: now,
        }), { merge: true });

    return normalizeKillSwitch(killSwitchId, killSwitchData);
}
