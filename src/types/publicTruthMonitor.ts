import type {
    OwnerPublicTruthReadinessMobileFixTarget,
    OwnerPublicTruthReadinessModuleId,
    OwnerPublicTruthReadinessModuleStatus,
    OwnerPublicTruthReadinessReport,
} from "@lib/public-truth-tools/ownerPublicTruthReadiness";

export type PublicTruthMonitorAccessMode = "disabled" | "pilot" | "paid";

export type PublicTruthMonitorCadenceMode = "manual" | "monthly";

export type PublicTruthMonitorSchedulerMode = "disabled" | "manual" | "scheduled";

export type PublicTruthMonitorEntitlementReason =
    | "feature_off"
    | "access_disabled"
    | "not_pilot_store"
    | "not_paid"
    | "allowed";

export interface PublicTruthMonitorEntitlementResult {
    allowed: boolean;
    message: string;
    mode: PublicTruthMonitorAccessMode;
    reason: PublicTruthMonitorEntitlementReason;
}

export interface PublicTruthMonitorSourceBoundary {
    aiOrSearchChecked: false;
    externalPlatformMutation: false;
    externalSourcesFetched: false;
    publicRouteAdded: false;
    rankingPromise: false;
}

export interface PublicTruthMonitorModuleSnapshot {
    actionLabel: string;
    evidenceText: string;
    fixHref: string;
    id: OwnerPublicTruthReadinessModuleId;
    mobileFixTarget: OwnerPublicTruthReadinessMobileFixTarget;
    status: OwnerPublicTruthReadinessModuleStatus;
    title: string;
}

export interface PublicTruthMonitorPrimaryFix {
    actionLabel: string;
    evidenceText: string;
    fixHref: string;
    id: OwnerPublicTruthReadinessModuleId;
    title: string;
}

export interface PublicTruthMonitorHistoryEntry {
    checkedProjectName?: string;
    generatedAt: string;
    id: string;
    moduleSummaries: PublicTruthMonitorModuleSnapshot[];
    notCheckedFactCount: number;
    primaryFix?: PublicTruthMonitorPrimaryFix;
    publicLinks: OwnerPublicTruthReadinessReport["publicLinks"];
    readyModuleCount: number;
    sourceBoundary: PublicTruthMonitorSourceBoundary;
    sourceSummary: OwnerPublicTruthReadinessReport["sourceSummary"];
    setupJobCount: number;
    setupJobs: PublicTruthMonitorModuleSnapshot[];
    status: OwnerPublicTruthReadinessReport["status"];
    totalModuleCount: number;
    unclearFactCount: number;
    missingFactCount: number;
}

export interface PublicTruthMonitorSummaryDocument {
    cadence: PublicTruthMonitorCadenceMode;
    entitlement?: {
        allowed: boolean;
        checkedAt: string;
        mode: PublicTruthMonitorAccessMode;
        reason: PublicTruthMonitorEntitlementReason;
    };
    generatedBy?: {
        source: "manual_owner";
        userId?: string;
    };
    history: PublicTruthMonitorHistoryEntry[];
    historyLimit: number;
    latest: PublicTruthMonitorHistoryEntry | null;
    nextScheduledAt?: string | null;
    sId: string;
    sourceBoundary: PublicTruthMonitorSourceBoundary;
    status: "ready" | "not_ready";
    tId: string;
    updatedAt?: unknown;
}

export interface PublicTruthMonitorSummaryResponse {
    data: {
        entitlement: PublicTruthMonitorEntitlementResult;
        summary: PublicTruthMonitorSummaryDocument | null;
    };
}

export interface PublicTruthMonitorRefreshResponse {
    data: {
        entitlement: PublicTruthMonitorEntitlementResult;
        report: OwnerPublicTruthReadinessReport;
        summary: PublicTruthMonitorSummaryDocument;
    };
}
