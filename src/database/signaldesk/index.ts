import { SIGNALDESK_API_ROUTES } from "@constant/signaldesk/routes";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import type { SignalDeskAuditCursor } from "@lib/signaldesk/auditContracts";
import type { SignalDeskTargetCursor } from "@lib/signaldesk/targetContracts";
import type {
    SignalDeskAccessContext,
    SignalDeskAiVolumeRunSummary,
    SignalDeskContentSourceSummary,
    SignalDeskKillSwitch,
    SignalDeskKillSwitchScope,
    SignalDeskKillSwitchStatus,
    SignalDeskOverview,
    SignalDeskPermission,
    SignalDeskRole,
    SignalDeskSection,
    SignalDeskWorkspaceData,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

export const getSignalDeskClientModeHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const mobileUserAgent = /\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone)\b/i.test(window.navigator.userAgent || "");
    const mobileViewport = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
    return mobileUserAgent || mobileViewport
        ? { "x-signaldesk-client-mode": "mobile-readonly" }
        : {};
};

const isSignalDeskMobileClient = () => Object.keys(getSignalDeskClientModeHeaders()).length > 0;
const SIGNALDESK_OVERVIEW_LOAD_FAILED = "Failed to load SignalDesk";
const SIGNALDESK_WORKSPACE_LOAD_FAILED = "Failed to load SignalDesk workspace";
const SIGNALDESK_ACTION_FAILED = "SignalDesk action failed";
const SIGNALDESK_PAUSE_UPDATE_FAILED = "Failed to update SignalDesk pause";
const SIGNALDESK_CLIENT_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
const SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED = "signaldesk_client_response_parse_failed";
const SIGNALDESK_CLIENT_RESPONSE_REJECTED = "signaldesk_client_response_rejected";
const SIGNALDESK_CLIENT_RESPONSE_INVALID = "signaldesk_client_response_invalid";
const SIGNALDESK_CLIENT_COLLECTION_MAX_ITEMS = 500;
const SIGNALDESK_CLIENT_OVERVIEW_MAX_ITEMS = 50;
const SIGNALDESK_ACTION_MAX_ARRAY_ITEMS = 500;
const SIGNALDESK_ACTION_MAX_DEPTH = 6;
const SIGNALDESK_ACTION_MAX_KEYS = 100;
const SIGNALDESK_ACTION_MAX_NODES = 10_000;
const SIGNALDESK_ACTION_MAX_STRING_LENGTH = 10_000;
const SIGNALDESK_ACTION_MAX_KEY_LENGTH = 120;

const SIGNALDESK_PRIVATE_RESPONSE_KEYS = new Set([
    "accesstoken",
    "apikey",
    "authorization",
    "constructor",
    "credential",
    "credentials",
    "password",
    "private",
    "privatekey",
    "prototype",
    "refreshtoken",
    "secret",
]);

const SIGNALDESK_ROLES = new Set<SignalDeskRole>([
    "founder-admin",
    "growth-manager",
    "operator",
    "compliance-reviewer",
    "readonly-analyst",
]);

const SIGNALDESK_PERMISSIONS = new Set<SignalDeskPermission>([
    "signaldesk.view",
    "signaldesk.configure",
    "target.review",
    "contact.reveal",
    "draft.create",
    "draft.approve",
    "message.export",
    "message.send",
    "source.configure",
    "channel.configure",
    "policy.approve",
    "kill-switch.activate",
    "kill-switch.deactivate",
    "audit.view",
]);

export const SIGNALDESK_WORKSPACE_SECTIONS = [
    "dashboard",
    "mission",
    "revenue",
    "targets",
    "imports",
    "approvals",
    "templates",
    "inbox",
    "attribution",
    "policies",
    "sources",
    "ai",
    "channels",
    "content",
    "partners",
    "settings",
    "control-room",
    "audit",
] as const satisfies readonly SignalDeskSection[];

const SIGNALDESK_SECTIONS = new Set<string>(SIGNALDESK_WORKSPACE_SECTIONS);

/**
 * Workspace reads require the baseline view permission plus one permission
 * associated with each non-dashboard operational domain.
 */
export const SIGNALDESK_WORKSPACE_SECTION_PERMISSIONS: Readonly<Record<SignalDeskSection, readonly SignalDeskPermission[]>> = {
    dashboard: ["signaldesk.view"],
    mission: ["target.review", "draft.create", "source.configure"],
    revenue: ["target.review", "signaldesk.configure"],
    targets: ["target.review"],
    imports: ["target.review", "source.configure"],
    approvals: ["draft.approve", "message.export"],
    templates: ["draft.create", "draft.approve"],
    inbox: ["message.export", "message.send"],
    attribution: ["target.review", "audit.view"],
    policies: ["source.configure", "policy.approve", "signaldesk.configure"],
    sources: ["source.configure"],
    ai: ["target.review", "signaldesk.configure"],
    channels: ["channel.configure", "message.export", "message.send"],
    content: ["source.configure", "draft.create", "draft.approve"],
    partners: ["source.configure", "policy.approve", "signaldesk.configure"],
    settings: ["channel.configure", "signaldesk.configure"],
    "control-room": [
        "signaldesk.configure",
        "audit.view",
        "kill-switch.activate",
        "kill-switch.deactivate",
    ],
    audit: ["audit.view"],
};

export const parseSignalDeskWorkspaceSection = (value: string | null): SignalDeskSection | null => {
    const candidate = value === null ? "dashboard" : value;
    return SIGNALDESK_SECTIONS.has(candidate) ? candidate as SignalDeskSection : null;
};

export const hasSignalDeskWorkspaceSectionAccess = (
    access: Pick<SignalDeskAccessContext, "permissions" | "role">,
    section: SignalDeskSection,
): boolean => {
    if (!access.permissions.includes("signaldesk.view")) return false;
    if (access.role === "system-worker") return false;
    if (access.role === "readonly-analyst") return section === "dashboard";
    if (section === "dashboard") return true;
    return SIGNALDESK_WORKSPACE_SECTION_PERMISSIONS[section].some((permission) => (
        access.permissions.includes(permission)
    ));
};

export const isExactSignalDeskMobileReadonlyMode = (value: string | null): boolean => (
    value === "mobile-readonly"
);

export const canServeSignalDeskMobileWorkspaceSection = (section: SignalDeskSection): boolean => (
    section === "dashboard"
);

export const SIGNALDESK_WORKSPACE_ARRAY_KEYS = [
    "activationOpportunities",
    "activationWatches",
    "aiVolumeRuns",
    "aiWorkerRuns",
    "approvalPackets",
    "audienceSegments",
    "budgetPolicies",
    "channelWindows",
    "channelHealth",
    "approvals",
    "auditEvents",
    "conversations",
    "connectorSettings",
    "contentAssets",
    "contentCalendarItems",
    "contentDistributionDrafts",
    "contentPerformanceSummaries",
    "contentSources",
    "demandSignals",
    "drafts",
    "enrichmentResults",
    "enrichmentWaterfalls",
    "evidencePackets",
    "experimentCards",
    "growthMissions",
    "imports",
    "marketPods",
    "modelEvals",
    "modelRoutes",
    "outcomes",
    "offerCtas",
    "commercialOffers",
    "commercialOpportunities",
    "operatingEnvelopes",
    "policies",
    "proofPermissions",
    "providerAccounts",
    "providerEvaluations",
    "providerEvents",
    "providerRuns",
    "providerSourceRetentions",
    "researchRuns",
    "researchTableRows",
    "runTimelines",
    "scores",
    "selfServiceCtas",
    "senderDomains",
    "sequencerHandoffs",
    "sequencerSteps",
    "strategistMemos",
    "replyPlaybooks",
    "revenueAccounts",
    "revenueControlSummaries",
    "sourceQualitySnapshots",
    "targets",
    "teamMembers",
    "templates",
    "trustPartnerBriefs",
    "trustPartnerDeals",
    "trustPartnerDeliverables",
    "trustPartnerMetrics",
    "trustPartnerNicheTests",
    "trustPartnerProfiles",
    "trustPartnerRenewalDecisions",
    "vendorRuns",
] as const satisfies readonly Exclude<keyof SignalDeskWorkspaceData, "section">[];

export const createEmptySignalDeskWorkspace = (
    section: SignalDeskSection = "dashboard",
): SignalDeskWorkspaceData => ({
    activationOpportunities: [],
    activationWatches: [],
    aiVolumeRuns: [],
    aiWorkerRuns: [],
    approvalPackets: [],
    approvals: [],
    audienceSegments: [],
    auditEvents: [],
    budgetPolicies: [],
    channelHealth: [],
    channelWindows: [],
    commercialOffers: [],
    commercialOpportunities: [],
    connectorSettings: [],
    contentAssets: [],
    contentCalendarItems: [],
    contentDistributionDrafts: [],
    contentPerformanceSummaries: [],
    contentSources: [],
    conversations: [],
    demandSignals: [],
    drafts: [],
    enrichmentResults: [],
    enrichmentWaterfalls: [],
    evidencePackets: [],
    experimentCards: [],
    growthMissions: [],
    imports: [],
    marketPods: [],
    modelEvals: [],
    modelRoutes: [],
    offerCtas: [],
    operatingEnvelopes: [],
    outcomes: [],
    policies: [],
    proofPermissions: [],
    providerAccounts: [],
    providerEvaluations: [],
    providerEvents: [],
    providerRuns: [],
    providerSourceRetentions: [],
    replyPlaybooks: [],
    researchRuns: [],
    researchTableRows: [],
    revenueAccounts: [],
    revenueControlSummaries: [],
    runTimelines: [],
    scores: [],
    section,
    selfServiceCtas: [],
    senderDomains: [],
    sequencerHandoffs: [],
    sequencerSteps: [],
    sourceQualitySnapshots: [],
    strategistMemos: [],
    targets: [],
    teamMembers: [],
    templates: [],
    trustPartnerBriefs: [],
    trustPartnerDeals: [],
    trustPartnerDeliverables: [],
    trustPartnerMetrics: [],
    trustPartnerNicheTests: [],
    trustPartnerProfiles: [],
    trustPartnerRenewalDecisions: [],
    vendorRuns: [],
});

const SIGNALDESK_OVERVIEW_KEYS = [
    "access",
    "activeKillSwitches",
    "controlRoom",
    "cost",
    "incidents",
    "metrics",
    "queues",
    "setup",
] as const;

type SignalDeskClientJsonContext = {
    action?: string;
    operation: "overview" | "workspace" | "action" | "kill-switch";
    scope?: string;
    section?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const hasAllowedAndRequiredKeys = (
    value: Record<string, unknown>,
    allowedKeys: readonly string[],
    requiredKeys: readonly string[] = allowedKeys,
): boolean => {
    const allowed = new Set(allowedKeys);
    return Object.keys(value).every((key) => allowed.has(key))
        && requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
};

export const isSignalDeskClientDataEnvelope = (value: unknown): value is { data: unknown } => (
    isRecord(value) && hasAllowedAndRequiredKeys(value, ["data"])
);

const isBoundedString = (value: unknown, maxLength = 512, allowEmpty = true): value is string => (
    typeof value === "string"
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
);

const isNullableIsoString = (value: unknown): value is string | null => (
    value === null
    || (
        isBoundedString(value, 64, false)
        && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
        && !Number.isNaN(Date.parse(value))
        && new Date(value).toISOString() === value
    )
);

const isOptionalString = (
    record: Record<string, unknown>,
    key: string,
    maxLength = 512,
): boolean => (
    !Object.prototype.hasOwnProperty.call(record, key)
    || isBoundedString(record[key], maxLength)
);

const isOptionalNullableString = (
    record: Record<string, unknown>,
    key: string,
    maxLength = 512,
): boolean => (
    !Object.prototype.hasOwnProperty.call(record, key)
    || record[key] === null
    || isBoundedString(record[key], maxLength)
);

const isOptionalNullableTimestamp = (
    record: Record<string, unknown>,
    key: string,
): boolean => (
    !Object.prototype.hasOwnProperty.call(record, key)
    || isNullableIsoString(record[key])
);

const isFiniteNonnegative = (value: unknown): value is number => (
    typeof value === "number" && Number.isFinite(value) && value >= 0
);

const isFiniteNonnegativeInteger = (value: unknown): value is number => (
    isFiniteNonnegative(value) && Number.isSafeInteger(value)
);

const isStringEnumValue = <Value extends string>(
    value: unknown,
    values: readonly Value[],
): value is Value => (
    typeof value === "string" && values.some((candidate) => candidate === value)
);

const isBoundedRecordArray = (value: unknown, maxItems: number): value is Record<string, unknown>[] => (
    Array.isArray(value)
    && value.length <= maxItems
    && value.every(isRecord)
);

const isSignalDeskAccessData = (value: unknown): value is SignalDeskAccessContext => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        ["active", "email", "firebaseConfigured", "isPlatformAdmin", "name", "permissions", "role", "userId"],
        ["active", "firebaseConfigured", "isPlatformAdmin", "permissions", "role", "userId"],
    )) return false;
    if (
        typeof value.active !== "boolean"
        || typeof value.firebaseConfigured !== "boolean"
        || typeof value.isPlatformAdmin !== "boolean"
        || !isBoundedString(value.userId, 512, false)
        || typeof value.role !== "string"
        || !SIGNALDESK_ROLES.has(value.role as SignalDeskRole)
        || !isOptionalString(value, "email", 254)
        || !isOptionalString(value, "name", 200)
        || !Array.isArray(value.permissions)
        || value.permissions.length > SIGNALDESK_PERMISSIONS.size
        || !value.permissions.every((permission) => (
            typeof permission === "string"
            && SIGNALDESK_PERMISSIONS.has(permission as SignalDeskPermission)
        ))
    ) return false;
    return new Set(value.permissions).size === value.permissions.length;
};

const isSignalDeskControlRoomData = (value: unknown): boolean => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        [
            "activeKillSwitchCount", "channelStatus", "costStatus", "demandSignalCount",
            "openIncidentCount", "outcomeCount", "sourceStatus", "targetCount", "updatedAt",
        ],
        [
            "activeKillSwitchCount", "channelStatus", "costStatus", "demandSignalCount",
            "openIncidentCount", "outcomeCount", "sourceStatus", "targetCount",
        ],
    )) return false;
    const counters = [
        value.activeKillSwitchCount,
        value.demandSignalCount,
        value.openIncidentCount,
        value.outcomeCount,
        value.targetCount,
    ];
    return counters.every(isFiniteNonnegativeInteger)
        && isStringEnumValue(value.channelStatus, ["healthy", "paused", "warning", "stale", "not_configured"])
        && isStringEnumValue(value.costStatus, ["healthy", "warning", "over_limit", "not_configured"])
        && isStringEnumValue(value.sourceStatus, ["healthy", "warning", "stale", "not_configured"])
        && isOptionalNullableTimestamp(value, "updatedAt");
};

const isSignalDeskCostData = (value: unknown): boolean => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        ["aiCostEstimate", "firestoreReadEstimate", "firestoreWriteEstimate", "providerCostEstimate", "updatedAt"],
        ["aiCostEstimate", "firestoreReadEstimate", "firestoreWriteEstimate", "providerCostEstimate"],
    )) return false;
    return [
        value.aiCostEstimate,
        value.firestoreReadEstimate,
        value.firestoreWriteEstimate,
        value.providerCostEstimate,
    ].every(isFiniteNonnegative) && isOptionalNullableTimestamp(value, "updatedAt");
};

const isSignalDeskQueueData = (value: unknown): boolean => (
    isRecord(value)
    && hasAllowedAndRequiredKeys(value, ["approvalBacklog", "inboxBacklog", "humanReview", "overdue"])
    && [value.approvalBacklog, value.inboxBacklog, value.humanReview, value.overdue]
        .every(isFiniteNonnegativeInteger)
);

const isSignalDeskSetupData = (value: unknown): boolean => (
    isRecord(value)
    && hasAllowedAndRequiredKeys(value, ["firebaseConfigured", "providerSendEnabled", "runtimeEnabled"])
    && typeof value.firebaseConfigured === "boolean"
    && typeof value.providerSendEnabled === "boolean"
    && typeof value.runtimeEnabled === "boolean"
);

export const isSignalDeskKillSwitchData = (value: unknown): value is SignalDeskKillSwitch => {
    const allowedKeys = [
        "activatedAt", "activatedBy", "deactivatedAt", "deactivatedBy",
        "killSwitchId", "reason", "scope", "status", "updatedAt",
    ];
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        allowedKeys,
    )) return false;
    const scopeValues = [
        "global-outbound", "email", "whatsapp", "instagram", "messenger", "source-provider",
        "ai-worker", "campaign", "content-distribution", "trust-partner", "menu-list-bridge",
    ] as const;
    if (!isStringEnumValue(value.scope, scopeValues)) return false;
    return value.killSwitchId === `scope_${value.scope}`
        && isBoundedString(value.reason, 500, false)
        && value.reason === value.reason.trim()
        && isStringEnumValue(value.status, ["active", "inactive"])
        && isOptionalNullableTimestamp(value, "activatedAt")
        && isOptionalNullableString(value, "activatedBy", 512)
        && isOptionalNullableTimestamp(value, "deactivatedAt")
        && isOptionalNullableString(value, "deactivatedBy", 512)
        && isNullableIsoString(value.updatedAt)
        && value.updatedAt !== null
        && (
            value.status === "active"
                ? value.activatedAt !== null && isBoundedString(value.activatedBy, 512, false)
                : value.deactivatedAt !== null && isBoundedString(value.deactivatedBy, 512, false)
        );
};

const isSignalDeskIncidentData = (value: unknown): boolean => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        ["incidentId", "severity", "status", "title", "updatedAt"],
        ["incidentId", "severity", "status", "title"],
    )) return false;
    return isBoundedString(value.incidentId, 200, false)
        && isStringEnumValue(value.severity, ["low", "medium", "high", "critical"])
        && isStringEnumValue(value.status, ["open", "acknowledged", "resolved"])
        && isBoundedString(value.title, 500, false)
        && isOptionalNullableTimestamp(value, "updatedAt");
};

const isSignalDeskMetricData = (value: unknown): boolean => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        ["key", "label", "tone", "value"],
        ["key", "label", "value"],
    )) return false;
    const metricString = typeof value.value === "string" ? value.value.trim() : "";
    const normalizedMetricNumber = metricString.replace(/^\$/, "").replace(/,/g, "");
    const numericMetricString = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalizedMetricNumber);
    const metricValueIsValid = isFiniteNonnegative(value.value)
        || (
            isBoundedString(value.value, 512, false)
            && !/^(?:NaN|[+-]?Infinity)$/i.test(metricString)
            && (!numericMetricString || isFiniteNonnegative(Number(normalizedMetricNumber)))
        );
    return isBoundedString(value.key, 120, false)
        && isBoundedString(value.label, 200, false)
        && metricValueIsValid
        && (
            !Object.prototype.hasOwnProperty.call(value, "tone")
            || isStringEnumValue(value.tone, ["neutral", "good", "warning", "danger"])
        );
};

const hasValidSignalDeskOverviewFields = (value: Record<string, unknown>): boolean => (
    isSignalDeskAccessData(value.access)
    && isSignalDeskControlRoomData(value.controlRoom)
    && isSignalDeskCostData(value.cost)
    && isSignalDeskQueueData(value.queues)
    && isSignalDeskSetupData(value.setup)
    && Array.isArray(value.activeKillSwitches)
    && value.activeKillSwitches.length <= SIGNALDESK_CLIENT_OVERVIEW_MAX_ITEMS
    && value.activeKillSwitches.every(isSignalDeskKillSwitchData)
    && Array.isArray(value.incidents)
    && value.incidents.length <= SIGNALDESK_CLIENT_OVERVIEW_MAX_ITEMS
    && value.incidents.every(isSignalDeskIncidentData)
    && Array.isArray(value.metrics)
    && value.metrics.length <= SIGNALDESK_CLIENT_OVERVIEW_MAX_ITEMS
    && value.metrics.every(isSignalDeskMetricData)
);

export const isSignalDeskOverviewData = (value: unknown): value is SignalDeskOverview => (
    isRecord(value)
    && hasAllowedAndRequiredKeys(value, SIGNALDESK_OVERVIEW_KEYS)
    && hasValidSignalDeskOverviewFields(value)
);

export const isSignalDeskWorkspaceData = (
    value: unknown,
    requestedSection: SignalDeskSection,
): value is SignalDeskWorkspaceResponse => {
    if (!isRecord(value) || !hasAllowedAndRequiredKeys(
        value,
        [...SIGNALDESK_OVERVIEW_KEYS, "workspace"],
    ) || !hasValidSignalDeskOverviewFields(value) || !isRecord(value.workspace)) return false;

    const workspace = value.workspace;
    if (!hasAllowedAndRequiredKeys(
        workspace,
        ["section", ...SIGNALDESK_WORKSPACE_ARRAY_KEYS],
    )) return false;
    if (
        typeof workspace.section !== "string"
        || !SIGNALDESK_SECTIONS.has(workspace.section as SignalDeskSection)
        || workspace.section !== requestedSection
    ) return false;
    return SIGNALDESK_WORKSPACE_ARRAY_KEYS.every((key) => (
        isBoundedRecordArray(workspace[key], SIGNALDESK_CLIENT_COLLECTION_MAX_ITEMS)
    ));
};

export type SignalDeskActionJsonValue =
    | boolean
    | null
    | number
    | string
    | SignalDeskActionJsonValue[]
    | { [key: string]: SignalDeskActionJsonValue };

export type SignalDeskActionAcknowledgement = Record<string, SignalDeskActionJsonValue>;

export type SignalDeskAiVolumeActionResult = Pick<
    SignalDeskAiVolumeRunSummary,
    "aiRunId" | "status" | "volumeRunId"
>;

export type SignalDeskContentSourceActionResult = Pick<
    SignalDeskContentSourceSummary,
    "contentSourceId"
>;

const isPrivateSignalDeskResponseKey = (key: string): boolean => (
    key.startsWith("_")
    || key.startsWith("$")
    || SIGNALDESK_PRIVATE_RESPONSE_KEYS.has(key.toLowerCase())
);

const isBoundedSignalDeskActionValue = (
    value: unknown,
    depth: number,
    budget: { remaining: number },
): value is SignalDeskActionJsonValue => {
    budget.remaining -= 1;
    if (budget.remaining < 0 || depth > SIGNALDESK_ACTION_MAX_DEPTH) return false;
    if (value === null || typeof value === "boolean") return true;
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") return value.length <= SIGNALDESK_ACTION_MAX_STRING_LENGTH;
    if (Array.isArray(value)) {
        return value.length <= SIGNALDESK_ACTION_MAX_ARRAY_ITEMS
            && value.every((item) => isBoundedSignalDeskActionValue(item, depth + 1, budget));
    }
    if (!isRecord(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    const keys = Object.keys(value);
    if (keys.length > SIGNALDESK_ACTION_MAX_KEYS) return false;
    return keys.every((key) => (
        key.length > 0
        && key.length <= SIGNALDESK_ACTION_MAX_KEY_LENGTH
        && !isPrivateSignalDeskResponseKey(key)
        && isBoundedSignalDeskActionValue(value[key], depth + 1, budget)
    ));
};

const isSignalDeskAcknowledgementMarker = (
    key: string,
    value: SignalDeskActionJsonValue,
): boolean => {
    if (key === "status") {
        return isBoundedString(value, 80, false) && value === value.trim();
    }
    if (key === "duplicate" || key === "qualified") return typeof value === "boolean";
    if (/Id$/.test(key)) {
        return isBoundedString(value, 200, false) && value === value.trim();
    }
    if (/Ids$/.test(key)) {
        return Array.isArray(value)
            && value.length <= SIGNALDESK_ACTION_MAX_ARRAY_ITEMS
            && value.every((item) => (
                isBoundedString(item, 200, false) && item === item.trim()
            ));
    }
    if ([
        "account",
        "activationWatch",
        "approval",
        "approvalPacket",
        "draft",
        "drafts",
        "modelEval",
        "opportunity",
        "rows",
        "run",
        "targets",
    ].includes(key)) {
        return isRecord(value)
            ? Object.keys(value).length > 0
            : Array.isArray(value) && value.length > 0;
    }
    return false;
};

export const isSignalDeskActionAcknowledgementData = (
    value: unknown,
): value is SignalDeskActionAcknowledgement => {
    if (!isRecord(value)) return false;
    const keys = Object.keys(value);
    if (keys.length === 0 || keys.length > SIGNALDESK_ACTION_MAX_KEYS) return false;
    const budget = { remaining: SIGNALDESK_ACTION_MAX_NODES };
    return isBoundedSignalDeskActionValue(value, 0, budget)
        && keys.some((key) => isSignalDeskAcknowledgementMarker(key, value[key]));
};

const projectSignalDeskAiVolumeActionResult = (
    value: unknown,
): SignalDeskAiVolumeActionResult | null => {
    if (!isSignalDeskActionAcknowledgementData(value)) return null;
    const status = value.status;
    if (
        !isBoundedString(value.aiRunId, 200, false)
        || !isBoundedString(value.volumeRunId, 200, false)
        || value.aiRunId !== value.volumeRunId
        || (
            status !== "running"
            && status !== "completed"
            && status !== "partial"
            && status !== "blocked"
        )
    ) return null;
    return {
        aiRunId: value.aiRunId,
        status,
        volumeRunId: value.volumeRunId,
    };
};

const projectSignalDeskContentSourceActionResult = (
    value: unknown,
): SignalDeskContentSourceActionResult | null => {
    if (
        !isSignalDeskActionAcknowledgementData(value)
        || !isBoundedString(value.contentSourceId, 180, false)
        || value.contentSourceId !== value.contentSourceId.trim()
        || value.contentSourceId.includes("/")
    ) return null;
    return { contentSourceId: value.contentSourceId };
};

const getSignalDeskClientResponseLogContext = (
    response: Response,
    context: SignalDeskClientJsonContext,
) => ({
    ...getBoundedRuntimeStringContext("action", context.action),
    ...getBoundedRuntimeStringContext("scope", context.scope),
    ...getBoundedRuntimeStringContext("section", context.section),
    mobileClient: isSignalDeskMobileClient(),
    operation: context.operation,
    product: "signaldesk",
    responseOk: response.ok,
    responseStatus: response.status,
});

const isAbortError = (error: unknown): boolean => (
    getBoundedErrorName(error) === "AbortError"
);

const readSignalDeskClientProjectedDataResponse = async <T>(
    response: Response,
    context: SignalDeskClientJsonContext,
    projectData: (value: unknown) => T | null,
): Promise<T | null> => {
    const logContext = getSignalDeskClientResponseLogContext(response, context);
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            SIGNALDESK_CLIENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        if (isAbortError(error)) throw error;
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_PARSE_FAILED, error, logContext);
        return null;
    }

    if (!response.ok) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_REJECTED, undefined, logContext);
        return null;
    }

    if (!isSignalDeskClientDataEnvelope(payload)) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_INVALID, undefined, logContext);
        return null;
    }

    const projectedData = projectData(payload.data);
    if (projectedData === null) {
        logRuntimeFailure(SIGNALDESK_CLIENT_RESPONSE_INVALID, undefined, logContext);
        return null;
    }
    return projectedData;
};

const readSignalDeskClientDataResponse = async <T>(
    response: Response,
    context: SignalDeskClientJsonContext,
    isValidData: (value: unknown) => value is T,
): Promise<T | null> => readSignalDeskClientProjectedDataResponse(
    response,
    context,
    (value) => isValidData(value) ? value : null,
);

export type SignalDeskAction =
    | "seed-defaults"
    | "create-source-policy"
    | "renew-source-policy"
    | "import-targets"
    | "score-target"
    | "create-evidence"
    | "create-draft"
    | "review-approval"
    | "export-message"
    | "record-manual-contact"
    | "capture-reply"
    | "record-outcome"
    | "create-route-token"
    | "revoke-route-token"
    | "capture-demand-signal"
    | "run-source-provider"
    | "run-ai-assist"
    | "run-ai-volume-batch"
    | "review-ai-shadow-run"
    | "prepare-channel-handoff"
    | "upsert-channel-window-state"
    | "send-approved-message"
    | "upsert-provider-account"
    | "upsert-budget-policy"
    | "upsert-connector-setting"
    | "upsert-model-route"
    | "upsert-enrichment-waterfall"
    | "upsert-audience-segment"
    | "recommend-market-pod-plan"
    | "review-market-pod"
    | "upsert-sender-domain"
    | "upsert-self-service-cta"
    | "create-daily-growth-mission"
    | "review-growth-mission"
    | "create-experiment-card"
    | "review-experiment-card"
    | "upsert-offer-cta"
    | "qualify-revenue-account"
    | "upsert-commercial-opportunity"
    | "upsert-commercial-offer"
    | "upsert-operating-envelope"
    | "refresh-activation-watch"
    | "upsert-reply-playbook"
    | "create-source-quality-snapshot"
    | "create-research-agent-run"
    | "refresh-provider-source-retention"
    | "create-weekly-strategist-memo"
    | "create-provider-evaluation"
    | "run-enrichment-waterfall"
    | "create-approval-packet"
    | "create-sequencer-handoff"
    | "send-owned-sequence-step"
    | "upsert-content-source"
    | "upsert-proof-permission"
    | "create-content-asset"
    | "review-content-asset"
    | "generate-content-distribution-drafts"
    | "review-content-distribution-draft"
    | "schedule-content-distribution-draft"
    | "record-content-performance"
    | "upsert-trust-partner-profile"
    | "create-trust-partner-niche-test"
    | "create-trust-partner-brief"
    | "review-trust-partner-deal"
    | "record-trust-partner-deliverable"
    | "record-trust-partner-metrics"
    | "review-trust-partner-renewal"
    | "upsert-team-member";

export type SignalDeskActionResult<Action extends SignalDeskAction> =
    Action extends "run-ai-volume-batch"
        ? SignalDeskAiVolumeActionResult
        : Action extends "upsert-content-source"
            ? SignalDeskContentSourceActionResult
            : SignalDeskActionAcknowledgement;

type SignalDeskActionResultParser<Action extends SignalDeskAction> = (
    value: unknown,
) => SignalDeskActionResult<Action> | null;

type SignalDeskActionResultParsers = {
    [Action in SignalDeskAction]: SignalDeskActionResultParser<Action>;
};

const projectSignalDeskCommonActionAcknowledgement = (
    value: unknown,
): SignalDeskActionAcknowledgement | null => (
    isSignalDeskActionAcknowledgementData(value) ? value : null
);

const SIGNALDESK_ACTION_RESULT_PARSERS: SignalDeskActionResultParsers = {
    "capture-demand-signal": projectSignalDeskCommonActionAcknowledgement,
    "capture-reply": projectSignalDeskCommonActionAcknowledgement,
    "create-approval-packet": projectSignalDeskCommonActionAcknowledgement,
    "create-content-asset": projectSignalDeskCommonActionAcknowledgement,
    "create-daily-growth-mission": projectSignalDeskCommonActionAcknowledgement,
    "create-draft": projectSignalDeskCommonActionAcknowledgement,
    "create-evidence": projectSignalDeskCommonActionAcknowledgement,
    "create-experiment-card": projectSignalDeskCommonActionAcknowledgement,
    "create-provider-evaluation": projectSignalDeskCommonActionAcknowledgement,
    "create-research-agent-run": projectSignalDeskCommonActionAcknowledgement,
    "create-route-token": projectSignalDeskCommonActionAcknowledgement,
    "create-sequencer-handoff": projectSignalDeskCommonActionAcknowledgement,
    "create-source-policy": projectSignalDeskCommonActionAcknowledgement,
    "renew-source-policy": projectSignalDeskCommonActionAcknowledgement,
    "create-source-quality-snapshot": projectSignalDeskCommonActionAcknowledgement,
    "create-trust-partner-brief": projectSignalDeskCommonActionAcknowledgement,
    "create-trust-partner-niche-test": projectSignalDeskCommonActionAcknowledgement,
    "create-weekly-strategist-memo": projectSignalDeskCommonActionAcknowledgement,
    "export-message": projectSignalDeskCommonActionAcknowledgement,
    "generate-content-distribution-drafts": projectSignalDeskCommonActionAcknowledgement,
    "import-targets": projectSignalDeskCommonActionAcknowledgement,
    "prepare-channel-handoff": projectSignalDeskCommonActionAcknowledgement,
    "qualify-revenue-account": projectSignalDeskCommonActionAcknowledgement,
    "recommend-market-pod-plan": projectSignalDeskCommonActionAcknowledgement,
    "record-content-performance": projectSignalDeskCommonActionAcknowledgement,
    "record-manual-contact": projectSignalDeskCommonActionAcknowledgement,
    "record-outcome": projectSignalDeskCommonActionAcknowledgement,
    "record-trust-partner-deliverable": projectSignalDeskCommonActionAcknowledgement,
    "record-trust-partner-metrics": projectSignalDeskCommonActionAcknowledgement,
    "refresh-activation-watch": projectSignalDeskCommonActionAcknowledgement,
    "refresh-provider-source-retention": projectSignalDeskCommonActionAcknowledgement,
    "review-ai-shadow-run": projectSignalDeskCommonActionAcknowledgement,
    "review-approval": projectSignalDeskCommonActionAcknowledgement,
    "review-content-asset": projectSignalDeskCommonActionAcknowledgement,
    "review-content-distribution-draft": projectSignalDeskCommonActionAcknowledgement,
    "review-experiment-card": projectSignalDeskCommonActionAcknowledgement,
    "review-growth-mission": projectSignalDeskCommonActionAcknowledgement,
    "review-market-pod": projectSignalDeskCommonActionAcknowledgement,
    "review-trust-partner-deal": projectSignalDeskCommonActionAcknowledgement,
    "review-trust-partner-renewal": projectSignalDeskCommonActionAcknowledgement,
    "revoke-route-token": projectSignalDeskCommonActionAcknowledgement,
    "run-ai-assist": projectSignalDeskCommonActionAcknowledgement,
    "run-ai-volume-batch": projectSignalDeskAiVolumeActionResult,
    "run-enrichment-waterfall": projectSignalDeskCommonActionAcknowledgement,
    "run-source-provider": projectSignalDeskCommonActionAcknowledgement,
    "schedule-content-distribution-draft": projectSignalDeskCommonActionAcknowledgement,
    "score-target": projectSignalDeskCommonActionAcknowledgement,
    "seed-defaults": projectSignalDeskCommonActionAcknowledgement,
    "send-approved-message": projectSignalDeskCommonActionAcknowledgement,
    "send-owned-sequence-step": projectSignalDeskCommonActionAcknowledgement,
    "upsert-audience-segment": projectSignalDeskCommonActionAcknowledgement,
    "upsert-budget-policy": projectSignalDeskCommonActionAcknowledgement,
    "upsert-channel-window-state": projectSignalDeskCommonActionAcknowledgement,
    "upsert-commercial-offer": projectSignalDeskCommonActionAcknowledgement,
    "upsert-commercial-opportunity": projectSignalDeskCommonActionAcknowledgement,
    "upsert-connector-setting": projectSignalDeskCommonActionAcknowledgement,
    "upsert-content-source": projectSignalDeskContentSourceActionResult,
    "upsert-enrichment-waterfall": projectSignalDeskCommonActionAcknowledgement,
    "upsert-model-route": projectSignalDeskCommonActionAcknowledgement,
    "upsert-offer-cta": projectSignalDeskCommonActionAcknowledgement,
    "upsert-operating-envelope": projectSignalDeskCommonActionAcknowledgement,
    "upsert-proof-permission": projectSignalDeskCommonActionAcknowledgement,
    "upsert-provider-account": projectSignalDeskCommonActionAcknowledgement,
    "upsert-reply-playbook": projectSignalDeskCommonActionAcknowledgement,
    "upsert-self-service-cta": projectSignalDeskCommonActionAcknowledgement,
    "upsert-sender-domain": projectSignalDeskCommonActionAcknowledgement,
    "upsert-team-member": projectSignalDeskCommonActionAcknowledgement,
    "upsert-trust-partner-profile": projectSignalDeskCommonActionAcknowledgement,
};

export type SignalDeskReadOptions = {
    auditCursor?: SignalDeskAuditCursor;
    signal?: AbortSignal;
    targetCursor?: SignalDeskTargetCursor;
};

export async function getSignalDeskOverview(
    options: SignalDeskReadOptions = {},
): Promise<SignalDeskOverview> {
    const response = await fetch(SIGNALDESK_API_ROUTES.OVERVIEW, {
        cache: "no-store",
        headers: getSignalDeskClientModeHeaders(),
        signal: options.signal,
    });
    const payload = await readSignalDeskClientDataResponse(response, { operation: "overview" }, isSignalDeskOverviewData);

    if (!payload) {
        throw new Error(SIGNALDESK_OVERVIEW_LOAD_FAILED);
    }

    return payload;
}

export async function getSignalDeskWorkspace(
    section: SignalDeskSection,
    options: SignalDeskReadOptions = {},
): Promise<SignalDeskWorkspaceResponse> {
    const query = new URLSearchParams({ section });
    if (options.auditCursor) {
        query.set("auditAfter", options.auditCursor.createdAt);
        query.set("auditAfterId", options.auditCursor.auditEventId);
    }
    if (options.targetCursor) {
        query.set("targetAfter", options.targetCursor.updatedAt);
        query.set("targetAfterId", options.targetCursor.targetId);
    }
    const response = await fetch(`${SIGNALDESK_API_ROUTES.WORKSPACE}?${query.toString()}`, {
        cache: "no-store",
        headers: getSignalDeskClientModeHeaders(),
        signal: options.signal,
    });
    const payload = await readSignalDeskClientDataResponse(response, {
        operation: "workspace",
        section,
    }, (value): value is SignalDeskWorkspaceResponse => isSignalDeskWorkspaceData(value, section));

    if (!payload) {
        throw new Error(SIGNALDESK_WORKSPACE_LOAD_FAILED);
    }

    return payload;
}

export async function runSignalDeskAction<Action extends SignalDeskAction>(
    action: Action,
    payload: unknown = {},
): Promise<SignalDeskActionResult<Action>> {
    const response = await fetch(SIGNALDESK_API_ROUTES.ACTIONS, {
        body: JSON.stringify({ action, payload }),
        headers: {
            "Content-Type": "application/json",
            ...getSignalDeskClientModeHeaders(),
        },
        method: "POST",
    });
    const responsePayload = await readSignalDeskClientProjectedDataResponse(response, {
        action,
        operation: "action",
    }, SIGNALDESK_ACTION_RESULT_PARSERS[action]);

    if (!responsePayload) {
        throw new Error(SIGNALDESK_ACTION_FAILED);
    }

    return responsePayload;
}

export async function setSignalDeskKillSwitch(input: {
    idempotencyKey: string;
    reason: string;
    scope: SignalDeskKillSwitchScope;
    status: SignalDeskKillSwitchStatus;
}) {
    const mobileEmergencyPause = isSignalDeskMobileClient() && input.status === "active"
        ? { mobileConfirmation: "MOBILE_EMERGENCY_PAUSE" }
        : {};
    const response = await fetch(SIGNALDESK_API_ROUTES.KILL_SWITCHES, {
        body: JSON.stringify({ ...input, ...mobileEmergencyPause }),
        headers: {
            "Content-Type": "application/json",
            ...getSignalDeskClientModeHeaders(),
        },
        method: "POST",
    });
    const payload = await readSignalDeskClientDataResponse(response, {
        operation: "kill-switch",
        scope: input.scope,
    }, isSignalDeskKillSwitchData);

    if (!payload) {
        throw new Error(SIGNALDESK_PAUSE_UPDATE_FAILED);
    }

    return payload;
}
