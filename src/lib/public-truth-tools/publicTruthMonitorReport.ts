import { FEATURE_FLAGS } from "@config/features";
import {
    PUBLIC_TRUTH_MONITOR_DEFAULT_HISTORY_LIMIT,
    PUBLIC_TRUTH_MONITOR_SOURCE_BOUNDARY,
} from "@constant/publicTruthMonitor";
import type {
    OwnerPublicTruthReadinessModule,
    OwnerPublicTruthReadinessReport,
} from "@lib/public-truth-tools/ownerPublicTruthReadiness";
import type {
    PublicTruthMonitorCadenceMode,
    PublicTruthMonitorEntitlementResult,
    PublicTruthMonitorHistoryEntry,
    PublicTruthMonitorModuleSnapshot,
    PublicTruthMonitorPrimaryFix,
    PublicTruthMonitorSummaryDocument,
} from "@type/publicTruthMonitor";

const STATUS_LABELS: Record<OwnerPublicTruthReadinessReport["status"], string> = {
    manual_review_needed: "Needs checking",
    missing_basics: "Missing basics",
    not_checked: "Not checked",
    ready: "Ready",
    unclear: "Needs checking",
};

function normalizeHistoryLimit(): number {
    const configured = Number(FEATURE_FLAGS.PUBLIC_TRUTH_MONITOR_HISTORY_LIMIT);
    if (!Number.isFinite(configured) || configured <= 0) return PUBLIC_TRUTH_MONITOR_DEFAULT_HISTORY_LIMIT;
    return Math.min(Math.floor(configured), 12);
}

function makeEntryId(tId: string | number, sId: string | number, generatedAt: string): string {
    return `public_truth_${tId}_${sId}_${generatedAt.replace(/[^0-9A-Za-z]/g, "").slice(0, 20)}`;
}

function snapshotModule(module: Pick<
    OwnerPublicTruthReadinessModule,
    "actionLabel" | "evidenceText" | "fixHref" | "id" | "mobileFixTarget" | "status" | "title"
>): PublicTruthMonitorModuleSnapshot {
    return {
        actionLabel: module.actionLabel,
        evidenceText: module.evidenceText,
        fixHref: module.fixHref,
        id: module.id,
        mobileFixTarget: module.mobileFixTarget,
        status: module.status,
        title: module.title,
    };
}

function getPrimaryFix(report: OwnerPublicTruthReadinessReport): PublicTruthMonitorPrimaryFix | undefined {
    const job = report.setupJobList[0];
    if (!job) return undefined;
    return {
        actionLabel: job.actionLabel,
        evidenceText: job.evidenceText,
        fixHref: job.fixHref,
        id: job.id,
        title: job.title,
    };
}

export function buildPublicTruthMonitorHistoryEntry(params: {
    generatedAt?: string;
    report: OwnerPublicTruthReadinessReport;
    sId: string | number;
    tId: string | number;
}): PublicTruthMonitorHistoryEntry {
    const generatedAt = params.generatedAt || new Date().toISOString();
    const moduleSummaries = params.report.modules.map(snapshotModule);

    return {
        checkedProjectName: params.report.sourceSummary.checkedProjectName,
        generatedAt,
        id: makeEntryId(params.tId, params.sId, generatedAt),
        moduleSummaries,
        notCheckedFactCount: params.report.summary.notChecked,
        primaryFix: getPrimaryFix(params.report),
        publicLinks: params.report.publicLinks,
        readyModuleCount: moduleSummaries.filter((module) => module.status === "ready").length,
        sourceBoundary: PUBLIC_TRUTH_MONITOR_SOURCE_BOUNDARY,
        sourceSummary: params.report.sourceSummary,
        setupJobCount: params.report.setupJobList.length,
        setupJobs: params.report.setupJobList.map(snapshotModule),
        status: params.report.status,
        totalModuleCount: moduleSummaries.length,
        unclearFactCount: params.report.summary.unclear,
        missingFactCount: params.report.summary.missing,
    };
}

function getNextScheduledAt(cadence: PublicTruthMonitorCadenceMode, generatedAt: string): string | null {
    if (cadence !== "monthly") return null;
    const date = new Date(generatedAt);
    if (Number.isNaN(date.getTime())) return null;
    date.setUTCMonth(date.getUTCMonth() + 1);
    return date.toISOString();
}

export function buildPublicTruthMonitorSummary(params: {
    current?: PublicTruthMonitorSummaryDocument | null;
    entitlement: PublicTruthMonitorEntitlementResult;
    entry: PublicTruthMonitorHistoryEntry;
    generatedByUserId?: string;
    sId: string | number;
    tId: string | number;
}): PublicTruthMonitorSummaryDocument {
    const historyLimit = normalizeHistoryLimit();
    const existingHistory = Array.isArray(params.current?.history) ? params.current.history : [];
    const withoutDuplicate = existingHistory.filter((entry) => entry.id !== params.entry.id);
    const history = [params.entry, ...withoutDuplicate].slice(0, historyLimit);
    const cadence: PublicTruthMonitorCadenceMode = FEATURE_FLAGS.PUBLIC_TRUTH_MONITOR_SCHEDULER_MODE === "scheduled"
        ? "monthly"
        : "manual";

    return {
        cadence,
        entitlement: {
            allowed: params.entitlement.allowed,
            checkedAt: params.entry.generatedAt,
            mode: params.entitlement.mode,
            reason: params.entitlement.reason,
        },
        generatedBy: {
            source: "manual_owner",
            userId: params.generatedByUserId ? String(params.generatedByUserId) : undefined,
        },
        history,
        historyLimit,
        latest: params.entry,
        nextScheduledAt: getNextScheduledAt(cadence, params.entry.generatedAt),
        sId: String(params.sId),
        sourceBoundary: PUBLIC_TRUTH_MONITOR_SOURCE_BOUNDARY,
        status: "ready",
        tId: String(params.tId),
    };
}

function formatDate(value?: string): string {
    if (!value) return "Not run yet";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toISOString().slice(0, 10);
}

function statusLine(entry: PublicTruthMonitorHistoryEntry): string {
    return `${STATUS_LABELS[entry.status]} - ${entry.readyModuleCount}/${entry.totalModuleCount} modules ready, ${entry.missingFactCount} missing facts`;
}

export function buildPublicTruthMonitorExportText(summary: PublicTruthMonitorSummaryDocument | null): string {
    if (!summary?.latest) {
        return [
            "MenuList Public Truth Report",
            "",
            "No saved report is available yet.",
            "Run the check from Business Health to create the first saved report.",
        ].join("\n");
    }

    const latest = summary.latest;
    const lines = [
        "MenuList Public Truth Report",
        `Store: ${summary.sId}`,
        `Generated: ${formatDate(latest.generatedAt)}`,
        `Status: ${statusLine(latest)}`,
        `Checked menu: ${latest.checkedProjectName || "None"}`,
        "",
        "What was checked",
        "MenuList store facts and selected/default menu data.",
        "",
        "What was not checked",
        "No external websites, social profiles, Google profiles, AI answers, search rankings, QR scans, or third-party platforms were inspected or changed.",
        "",
        "Fix list",
        ...(latest.setupJobs.length
            ? latest.setupJobs.map((job, index) => `${index + 1}. ${job.title} - ${job.actionLabel} (${job.fixHref})`)
            : ["No open fix items in the saved report."]),
        "",
        "History",
        ...summary.history.map((entry) => `- ${formatDate(entry.generatedAt)}: ${statusLine(entry)}`),
    ];

    return lines.join("\n");
}
