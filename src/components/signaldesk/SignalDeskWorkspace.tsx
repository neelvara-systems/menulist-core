"use client";

import { SIGNALDESK_ROUTES } from "@constant/signaldesk/routes";
import { useSignalDeskOverview } from "@hook/signaldesk/useSignalDeskOverview";
import type {
    SignalDeskApprovalItem,
    SignalDeskKillSwitchScope,
    SignalDeskSection,
    SignalDeskTargetSummary,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";
import Link from "next/link";
import type { ComponentType, FormEvent } from "react";
import { useMemo, useState } from "react";
import {
    LuAlertTriangle,
    LuArchive,
    LuBarChart3,
    LuBell,
    LuClipboardCheck,
    LuDatabase,
    LuFileText,
    LuGlobe2,
    LuInbox,
    LuPauseCircle,
    LuRefreshCw,
    LuRouter,
    LuSend,
    LuSettings,
    LuShield,
    LuSparkles,
    LuTarget,
} from "react-icons/lu";
import { useSignalDeskPath } from "./SignalDeskPathProvider";
import styles from "./SignalDeskWorkspace.module.scss";

const SECTION_META: Record<SignalDeskSection, { description: string; label: string; title: string }> = {
    dashboard: {
        description: "Observe system movement, monitor risk, and approve only the work that needs human control.",
        label: "Dashboard",
        title: "SignalDesk Dashboard",
    },
    targets: {
        description: "System-prepared targets with source, dedupe, score, evidence, and next-action state.",
        label: "Targets",
        title: "Target Registry",
    },
    imports: {
        description: "Manual source runs and import history.",
        label: "Imports",
        title: "Imports",
    },
    approvals: {
        description: "Approve, hold, or reject system-prepared work before any outbound action.",
        label: "Approvals",
        title: "Approval Queue",
    },
    templates: {
        description: "Approved templates, safe drafts, and draft history.",
        label: "Templates",
        title: "Draft Control",
    },
    inbox: {
        description: "Manual replies, classification, and suppression-sensitive conversations.",
        label: "Inbox",
        title: "Inbox",
    },
    attribution: {
        description: "MenuList outcomes and demand signals.",
        label: "Attribution",
        title: "Outcome Bridge",
    },
    policies: {
        description: "Source policy and template seeds.",
        label: "Policies",
        title: "Policies",
    },
    sources: {
        description: "Approved live source-provider runs and provider import results.",
        label: "Sources",
        title: "Source Providers",
    },
    ai: {
        description: "Provider-backed AI assist runs with evidence and rejected facts.",
        label: "AI",
        title: "AI Assist",
    },
    channels: {
        description: "Assisted channels, provider send readiness, and signed webhook events.",
        label: "Channels",
        title: "Channels",
    },
    settings: {
        description: "Connector records, sender identity, and channel readiness.",
        label: "Settings",
        title: "Settings",
    },
    "control-room": {
        description: "Pause, redirect, and monitor health across sources, channels, cost, and queues.",
        label: "Control Room",
        title: "Control Room",
    },
    audit: {
        description: "Admin audit trail.",
        label: "Audit",
        title: "Audit",
    },
};

type SignalDeskNavItem = {
    href: string;
    icon: ComponentType<{ size?: number }>;
    section: SignalDeskSection;
};

const NAV_ITEMS: SignalDeskNavItem[] = [
    { href: SIGNALDESK_ROUTES.DASHBOARD, icon: LuBarChart3, section: "dashboard" },
    { href: SIGNALDESK_ROUTES.TARGETS, icon: LuTarget, section: "targets" },
    { href: SIGNALDESK_ROUTES.IMPORTS, icon: LuDatabase, section: "imports" },
    { href: SIGNALDESK_ROUTES.APPROVALS, icon: LuClipboardCheck, section: "approvals" },
    { href: SIGNALDESK_ROUTES.TEMPLATES, icon: LuFileText, section: "templates" },
    { href: SIGNALDESK_ROUTES.INBOX, icon: LuInbox, section: "inbox" },
    { href: SIGNALDESK_ROUTES.ATTRIBUTION, icon: LuRouter, section: "attribution" },
    { href: SIGNALDESK_ROUTES.POLICIES, icon: LuShield, section: "policies" },
    { href: SIGNALDESK_ROUTES.SOURCES, icon: LuGlobe2, section: "sources" },
    { href: SIGNALDESK_ROUTES.AI, icon: LuSparkles, section: "ai" },
    { href: SIGNALDESK_ROUTES.CHANNELS, icon: LuSend, section: "channels" },
    { href: SIGNALDESK_ROUTES.SETTINGS, icon: LuSettings, section: "settings" },
    { href: SIGNALDESK_ROUTES.CONTROL_ROOM, icon: LuAlertTriangle, section: "control-room" },
    { href: SIGNALDESK_ROUTES.AUDIT, icon: LuArchive, section: "audit" },
];

function SignalDeskNavLink({
    activeSection,
    item,
}: {
    activeSection: SignalDeskSection;
    item: SignalDeskNavItem;
}) {
    const href = useSignalDeskPath(item.href);
    const Icon = item.icon;
    const itemMeta = SECTION_META[item.section];
    const active = item.section === activeSection;

    return (
        <Link
            aria-current={active ? "page" : undefined}
            className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            href={href}
        >
            <Icon size={16} />
            {itemMeta.label}
        </Link>
    );
}

const PAUSE_SCOPES: SignalDeskKillSwitchScope[] = [
    "email",
    "whatsapp",
    "instagram",
    "messenger",
    "source-provider",
    "ai-worker",
    "campaign",
    "menu-list-bridge",
];

const tagClass = (tone?: string) => {
    if (tone === "good" || tone === "healthy" || tone === "active" || tone === "approved" || tone === "interested" || tone === "ready" || tone === "completed" || tone === "verified") return styles.tagGood;
    if (tone === "warning" || tone === "partial" || tone === "paused" || tone === "stale" || tone === "pending" || tone === "queued" || tone === "needs_review" || tone === "hold" || tone === "held" || tone === "evaluation" || tone === "candidate") return styles.tagWarning;
    if (tone === "danger" || tone === "missing" || tone === "over_limit" || tone === "critical" || tone === "rejected" || tone === "dnc" || tone === "blocked" || tone === "failed" || tone === "disabled" || tone === "suppressed") return styles.tagDanger;
    return styles.tag;
};

const metricClass = (tone?: string) => [
    styles.metric,
    tone === "good" ? styles.metricToneGood : "",
    tone === "warning" ? styles.metricToneWarning : "",
    tone === "danger" ? styles.metricToneDanger : "",
].filter(Boolean).join(" ");

const parseImportRows = (raw: string) => raw
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
        const [displayName, category, city, country, website, email, phone, currentListUrl, instagram] = line.split(",").map((part) => part?.trim() || "");
        return {
            category,
            city,
            country,
            currentListUrl,
            displayName,
            email,
            instagram,
            phone,
            website,
        };
    })
    .filter((row) => row.displayName);

const firstTargetId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.targets[0]?.targetId || "";
const firstPolicyId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.policies[0]?.sourcePolicyId || "";
const firstProviderPolicyId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.policies.find((policy) => policy.sourceType === "provider")?.sourcePolicyId || ""
);
const firstWaterfallId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.enrichmentWaterfalls[0]?.waterfallId || "";
const firstReadySenderDomainId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.senderDomains.find((sender) => (
        sender.status === "active" &&
        sender.authenticationState === "ready" &&
        sender.unsubscribeReady &&
        sender.brandRisk !== "high"
    ))?.senderDomainId || ""
);

function LoadingState() {
    return <div className={styles.empty}>Loading SignalDesk...</div>;
}

function SetupAlert({ data }: { data: SignalDeskWorkspaceResponse }) {
    if (data.setup.firebaseConfigured) return null;
    return (
        <div className={styles.alert}>
            <LuBell size={18} />
            <div>
                <strong>Firebase setup pending.</strong>
                <div>Writes stay blocked until the dedicated SignalDesk Firebase project is configured.</div>
            </div>
        </div>
    );
}

function TargetSelect({
    data,
    onChange,
    value,
}: {
    data: SignalDeskWorkspaceResponse;
    onChange: (targetId: string) => void;
    value: string;
}) {
    return (
        <select className={styles.input} onChange={(event) => onChange(event.target.value)} value={value || firstTargetId(data)}>
            {data.workspace.targets.map((target) => (
                <option key={target.targetId} value={target.targetId}>{target.displayName}</option>
            ))}
        </select>
    );
}

function SummaryMetrics({ data }: { data: SignalDeskWorkspaceResponse }) {
    return (
        <section className={styles.grid} aria-label="SignalDesk metrics">
            {data.metrics.map((metric) => (
                <div className={metricClass(metric.tone)} key={metric.key}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <strong className={styles.metricValue}>{metric.value}</strong>
                </div>
            ))}
        </section>
    );
}

function OwnerControlModel() {
    const items = [
        { label: "Observe", value: "Movement, outcomes, backlog" },
        { label: "Monitor", value: "Risk, cost, source and channel health" },
        { label: "Approve", value: "Sources, cohorts, drafts, scale" },
    ];
    return (
        <section className={styles.controlModel} aria-label="SignalDesk owner control model">
            {items.map((item) => (
                <div className={styles.controlModelItem} key={item.label}>
                    <strong>{item.label}</strong>
                    <span>{item.value}</span>
                </div>
            ))}
        </section>
    );
}

function OperatingPanels({ data }: { data: SignalDeskWorkspaceResponse }) {
    return (
        <section className={styles.contentGrid}>
            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2>Operating State</h2>
                    <span className={tagClass(data.controlRoom.channelStatus)}>{data.controlRoom.channelStatus}</span>
                </div>
                <div className={styles.statusList}>
                    <div className={styles.statusRow}><span>Runtime</span><span className={tagClass(data.setup.runtimeEnabled ? "good" : "danger")}>{data.setup.runtimeEnabled ? "enabled" : "disabled"}</span></div>
                    <div className={styles.statusRow}><span>Provider send</span><span className={tagClass(data.setup.providerSendEnabled ? "warning" : "neutral")}>{data.setup.providerSendEnabled ? "enabled" : "disabled"}</span></div>
                    <div className={styles.statusRow}><span>Source health</span><span className={tagClass(data.controlRoom.sourceStatus)}>{data.controlRoom.sourceStatus}</span></div>
                    <div className={styles.statusRow}><span>Cost status</span><span className={tagClass(data.controlRoom.costStatus)}>{data.controlRoom.costStatus}</span></div>
                    <div className={styles.statusRow}><span>Approval backlog</span><strong>{data.queues.approvalBacklog}</strong></div>
                    <div className={styles.statusRow}><span>Human review</span><strong>{data.queues.humanReview}</strong></div>
                    <div className={styles.statusRow}><span>Inbox backlog</span><strong>{data.queues.inboxBacklog}</strong></div>
                </div>
            </div>

            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2>Safety</h2>
                    <span className={tagClass(data.activeKillSwitches.length ? "warning" : "good")}>
                        {data.activeKillSwitches.length ? "paused" : "clear"}
                    </span>
                </div>
                {data.activeKillSwitches.length ? (
                    <div className={styles.list}>
                        {data.activeKillSwitches.map((item) => (
                            <div className={styles.listItem} key={item.killSwitchId}>
                                <strong>{item.scope}</strong>
                                <span>{item.reason}</span>
                            </div>
                        ))}
                    </div>
                ) : <div className={styles.empty}>No active kill switches.</div>}
            </div>

            <div className={styles.panel}>
                <div className={styles.panelHeader}>
                    <h2>Incidents</h2>
                    <span className={tagClass(data.incidents.length ? "danger" : "good")}>{data.incidents.length}</span>
                </div>
                {data.incidents.length ? (
                    <div className={styles.list}>
                        {data.incidents.map((item) => (
                            <div className={styles.listItem} key={item.incidentId}>
                                <strong>{item.title}</strong>
                                <span>{item.severity} / {item.status}</span>
                            </div>
                        ))}
                    </div>
                ) : <div className={styles.empty}>No open incidents.</div>}
            </div>
        </section>
    );
}

function TargetList({
    data,
    onDraft,
    onEvidence,
    onScore,
    saving,
}: {
    data: SignalDeskWorkspaceResponse;
    onDraft: (targetId: string) => void;
    onEvidence: (targetId: string) => void;
    onScore: (targetId: string) => void;
    saving: boolean;
}) {
    if (!data.workspace.targets.length) return <div className={styles.empty}>No targets.</div>;
    return (
        <div className={styles.table}>
            {data.workspace.targets.map((target) => (
                <div className={styles.tableRow} key={target.targetId}>
                    <div>
                        <strong>{target.displayName}</strong>
                        <span>{[target.category, target.city, target.country].filter(Boolean).join(" / ") || "Uncategorized"}</span>
                    </div>
                    <span className={tagClass(target.status)}>{target.status}</span>
                    <span className={tagClass(target.nextAction)}>{target.nextAction}</span>
                    <span>{target.segment.toUpperCase()}</span>
                    <div className={styles.rowActions}>
                        <button className={styles.ghostButton} disabled={saving} onClick={() => onScore(target.targetId)} type="button">Score</button>
                        <button className={styles.ghostButton} disabled={saving} onClick={() => onEvidence(target.targetId)} type="button">Evidence</button>
                        <button className={styles.ghostButton} disabled={saving} onClick={() => onDraft(target.targetId)} type="button">Draft</button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DashboardSection({ data }: { data: SignalDeskWorkspaceResponse }) {
    return (
        <>
            <OwnerControlModel />
            <SummaryMetrics data={data} />
            <OperatingPanels data={data} />
        </>
    );
}

export default function SignalDeskWorkspace({ activeSection }: { activeSection: SignalDeskSection }) {
    const { data, error, loading, refresh, runAction, saving, updateKillSwitch } = useSignalDeskOverview(activeSection);
    const [policyName, setPolicyName] = useState("Manual research");
    const [policySourceType, setPolicySourceType] = useState("manual-research");
    const [policyAllowContact, setPolicyAllowContact] = useState(true);
    const [policyAllowEvidence, setPolicyAllowEvidence] = useState(true);
    const [policyAllowPersonalization, setPolicyAllowPersonalization] = useState(true);
    const [retentionDays, setRetentionDays] = useState(90);
    const [sourcePolicyId, setSourcePolicyId] = useState("");
    const [sourceName, setSourceName] = useState("Manual import");
    const [importRows, setImportRows] = useState("Demo Cafe,Restaurant,Mumbai,India,https://example.com,owner@example.com,,,\nDemo Salon,Salon,Pune,India,,,919999999999,,");
    const [selectedTargetId, setSelectedTargetId] = useState("");
    const [replyChannel, setReplyChannel] = useState("email");
    const [replyText, setReplyText] = useState("");
    const [outcomeType, setOutcomeType] = useState("route_created");
    const [demandSignalType, setDemandSignalType] = useState("link_click");
    const [sourceProvider, setSourceProvider] = useState("google-places");
    const [sourceQuery, setSourceQuery] = useState("restaurants with PDF menu");
    const [sourceCity, setSourceCity] = useState("Mumbai");
    const [sourceCountry, setSourceCountry] = useState("India");
    const [sourceMaxResults, setSourceMaxResults] = useState(10);
    const [aiTask, setAiTask] = useState("evidence");
    const [aiInstruction, setAiInstruction] = useState("");
    const [channel, setChannel] = useState("whatsapp");
    const [selectedWaterfallId, setSelectedWaterfallId] = useState("");
    const [pauseScope, setPauseScope] = useState<SignalDeskKillSwitchScope>("source-provider");
    const [sequencerProvider, setSequencerProvider] = useState("owned-email");
    const [senderDomain, setSenderDomain] = useState("pending");
    const [connectorKind, setConnectorKind] = useState("email-smtp");
    const [connectorName, setConnectorName] = useState("MenuList email");
    const [connectorStatus, setConnectorStatus] = useState("hold");
    const [connectorSenderEmail, setConnectorSenderEmail] = useState("");
    const [connectorReplyToEmail, setConnectorReplyToEmail] = useState("");
    const [connectorFromName, setConnectorFromName] = useState("MenuList");
    const [connectorSenderDomain, setConnectorSenderDomain] = useState("");
    const [connectorPhoneNumber, setConnectorPhoneNumber] = useState("");
    const [connectorPhoneNumberId, setConnectorPhoneNumberId] = useState("");
    const [connectorInstagramPageId, setConnectorInstagramPageId] = useState("");
    const [connectorMessengerPageId, setConnectorMessengerPageId] = useState("");
    const [connectorAppId, setConnectorAppId] = useState("");
    const [connectorNotes, setConnectorNotes] = useState("");
    const meta = SECTION_META[activeSection];
    const resolvedTargetId = data ? (selectedTargetId || firstTargetId(data)) : "";
    const resolvedPolicyId = data ? (sourcePolicyId || firstPolicyId(data)) : "";
    const providerPolicies = data?.workspace.policies.filter((policy) => policy.sourceType === "provider") || [];
    const resolvedProviderPolicyId = data
        ? (providerPolicies.some((policy) => policy.sourcePolicyId === sourcePolicyId) ? sourcePolicyId : firstProviderPolicyId(data))
        : "";
    const resolvedWaterfallId = data ? (selectedWaterfallId || firstWaterfallId(data)) : "";
    const resolvedSenderDomainId = data ? firstReadySenderDomainId(data) : "";
    const globalPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === "global-outbound" && item.status === "active"));
    const scopedPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === pauseScope && item.status === "active"));
    const canPause = Boolean(data?.access.permissions.includes("kill-switch.activate"));
    const canResume = Boolean(data?.access.permissions.includes("kill-switch.deactivate"));

    const pendingApproval = useMemo(
        () => data?.workspace.approvals.find((item) => item.status === "pending") || null,
        [data?.workspace.approvals],
    );
    const approvedApproval = useMemo(
        () => data?.workspace.approvals.find((item) => item.status === "approved") || null,
        [data?.workspace.approvals],
    );

    const handlePauseToggle = () => {
        void updateKillSwitch({
            reason: globalPauseActive ? "Control room cleared global outbound pause." : "Control room activated global outbound pause.",
            scope: "global-outbound",
            status: globalPauseActive ? "inactive" : "active",
        });
    };

    const handleScopedPauseToggle = () => {
        void updateKillSwitch({
            reason: scopedPauseActive ? `Control room cleared ${pauseScope} pause.` : `Control room activated ${pauseScope} pause.`,
            scope: pauseScope,
            status: scopedPauseActive ? "inactive" : "active",
        });
    };

    const handleSeed = () => {
        void runAction("seed-defaults");
    };

    const handlePolicyCreate = (event: FormEvent) => {
        event.preventDefault();
        void runAction("create-source-policy", {
            allowContact: policyAllowContact,
            allowEvidence: policyAllowEvidence,
            allowPersonalization: policyAllowPersonalization,
            name: policyName,
            notes: "Internal approved source policy.",
            retentionDays,
            sourceType: policySourceType,
        });
    };

    const handlePolicySourceTypeChange = (sourceType: string) => {
        setPolicySourceType(sourceType);
        if (sourceType === "provider") {
            setPolicyAllowContact(false);
            setPolicyAllowEvidence(true);
            setPolicyAllowPersonalization(false);
        }
    };

    const handleImport = (event: FormEvent) => {
        event.preventDefault();
        void runAction("import-targets", {
            rows: parseImportRows(importRows),
            sourceName,
            sourcePolicyId: resolvedPolicyId,
        });
    };

    const scoreTarget = (targetId: string) => {
        void runAction("score-target", { targetId });
    };

    const createEvidence = (targetId: string) => {
        void runAction("create-evidence", { targetId });
    };

    const createDraft = (targetId: string) => {
        void runAction("create-draft", { targetId });
    };

    const reviewApproval = (approval: SignalDeskApprovalItem, status: "approved" | "rejected") => {
        void runAction("review-approval", {
            approvalId: approval.approvalId,
            reason: status === "approved" ? "Approved from control room." : "Rejected from control room.",
            status,
        });
    };

    const exportMessage = (approvalId: string) => {
        void runAction("export-message", { approvalId });
    };

    const captureReply = (event: FormEvent) => {
        event.preventDefault();
        void runAction("capture-reply", {
            channel: replyChannel,
            message: replyText,
            targetId: resolvedTargetId,
        });
    };

    const recordOutcome = (event: FormEvent) => {
        event.preventDefault();
        void runAction("record-outcome", {
            channel: "manual",
            outcomeType,
            source: "manual",
            targetId: resolvedTargetId || undefined,
        });
    };

    const captureDemand = (event: FormEvent) => {
        event.preventDefault();
        const target = data?.workspace.targets.find((item: SignalDeskTargetSummary) => item.targetId === resolvedTargetId);
        void runAction("capture-demand-signal", {
            signalType: demandSignalType,
            sourceSurface: "manual",
            targetId: resolvedTargetId || undefined,
            targetName: target?.displayName,
        });
    };

    const runSourceProvider = (event: FormEvent) => {
        event.preventDefault();
        void runAction("run-source-provider", {
            city: sourceCity,
            country: sourceCountry,
            maxResults: sourceMaxResults,
            provider: sourceProvider,
            query: sourceQuery,
            sourcePolicyId: resolvedProviderPolicyId,
        });
    };

    const runAiAssist = (event: FormEvent) => {
        event.preventDefault();
        void runAction("run-ai-assist", {
            instruction: aiInstruction || undefined,
            targetId: resolvedTargetId,
            task: aiTask,
        });
    };

    const runEnrichmentWaterfall = (event: FormEvent) => {
        event.preventDefault();
        void runAction("run-enrichment-waterfall", {
            targetId: resolvedTargetId,
            waterfallId: resolvedWaterfallId,
        });
    };

    const createApprovalPacket = (approval?: SignalDeskApprovalItem) => {
        void runAction("create-approval-packet", approval?.approvalId
            ? { approvalId: approval.approvalId }
            : { targetId: resolvedTargetId });
    };

    const createSequencerHandoff = (approvalId: string) => {
        void runAction("create-sequencer-handoff", {
            approvalId,
            provider: sequencerProvider,
            senderDomainId: resolvedSenderDomainId || undefined,
        });
    };

    const sendOwnedSequenceStep = (sequencerHandoffId: string) => {
        void runAction("send-owned-sequence-step", { sequencerHandoffId });
    };

    const approveOwnedEmailSequencerProvider = () => {
        void runAction("upsert-provider-account", {
            credentialState: "not_required",
            dailyBudgetUsd: 0,
            monthlyBudgetUsd: 0,
            ownerApproved: true,
            perRunBudgetUsd: 0,
            provider: "owned-email",
            status: "approved",
            use: "sequencer",
        });
    };

    const approveGeminiAiProvider = () => {
        void runAction("upsert-provider-account", {
            credentialState: "configured",
            dailyBudgetUsd: 5,
            monthlyBudgetUsd: 120,
            ownerApproved: true,
            perRunBudgetUsd: 0.15,
            provider: "gemini",
            status: "approved",
            use: "ai",
        });
    };

    const approveGooglePlacesProvider = () => {
        void runAction("upsert-provider-account", {
            credentialState: "configured",
            dailyBudgetUsd: 5,
            monthlyBudgetUsd: 75,
            ownerApproved: true,
            perRunBudgetUsd: 0.25,
            provider: "google-places",
            status: "approved",
            use: "discovery",
        });
    };

    const approveApifyProvider = () => {
        void runAction("upsert-provider-account", {
            credentialState: "configured",
            dailyBudgetUsd: 10,
            monthlyBudgetUsd: 150,
            ownerApproved: true,
            perRunBudgetUsd: 0.25,
            provider: "apify",
            status: "approved",
            use: "discovery",
        });
    };

    const holdSenderDomain = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-sender-domain", {
            authenticationState: "missing",
            bounceRate: 0,
            brandRisk: "medium",
            complaintRate: 0,
            domain: senderDomain,
            provider: "owned-email",
            status: "hold",
            unsubscribeReady: false,
            volumeRampState: "not_started",
        });
    };

    const readySenderDomain = () => {
        void runAction("upsert-sender-domain", {
            authenticationState: "ready",
            bounceRate: 0,
            brandRisk: "low",
            complaintRate: 0,
            domain: senderDomain,
            provider: "owned-email",
            status: "active",
            unsubscribeReady: true,
            volumeRampState: "low_volume",
        });
    };

    const handleConnectorKindChange = (kind: string) => {
        setConnectorKind(kind);
        if (kind === "email-smtp") setConnectorName("MenuList email");
        if (kind === "meta-whatsapp") setConnectorName("WhatsApp Business");
        if (kind === "meta-instagram") setConnectorName("Instagram");
        if (kind === "meta-messenger") setConnectorName("Messenger");
        if (kind === "smartlead") setConnectorName("Smartlead fallback");
        if (kind === "apify") setConnectorName("Apify source broker");
    };

    const upsertConnectorSetting = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-connector-setting", {
            appId: connectorAppId || undefined,
            connectorKind,
            displayName: connectorName,
            fromName: connectorFromName || undefined,
            instagramPageId: connectorInstagramPageId || undefined,
            messengerPageId: connectorMessengerPageId || undefined,
            notes: connectorNotes || undefined,
            phoneNumber: connectorPhoneNumber || undefined,
            phoneNumberId: connectorPhoneNumberId || undefined,
            replyToEmail: connectorReplyToEmail || undefined,
            senderDomain: connectorSenderDomain || undefined,
            senderEmail: connectorSenderEmail || undefined,
            status: connectorStatus,
        });
    };

    const prepareChannelHandoff = (approvalId: string) => {
        void runAction("prepare-channel-handoff", {
            approvalId,
            channel,
        });
    };

    const sendApprovedMessage = (approvalId: string) => {
        void runAction("send-approved-message", {
            approvalId,
            channel,
        });
    };

    const renderSection = () => {
        if (!data) return null;
        if (activeSection === "dashboard") return <DashboardSection data={data} />;
        if (activeSection === "targets") {
            return (
                <section className={styles.stack}>
                    <form className={styles.panel} onSubmit={handleImport}>
                        <div className={styles.panelHeader}>
                            <h2>Manual Import</h2>
                            <button className={styles.button} disabled={saving || !resolvedPolicyId} type="submit">Import</button>
                        </div>
                        <div className={styles.formGrid}>
                            <input className={styles.input} onChange={(event) => setSourceName(event.target.value)} value={sourceName} />
                            <select className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedPolicyId}>
                                {data.workspace.policies.map((policy) => (
                                    <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name}</option>
                                ))}
                            </select>
                        </div>
                        <textarea className={styles.textarea} onChange={(event) => setImportRows(event.target.value)} value={importRows} />
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Targets</h2><span className={styles.tag}>{data.workspace.targets.length}</span></div>
                        <TargetList data={data} onDraft={createDraft} onEvidence={createEvidence} onScore={scoreTarget} saving={saving} />
                    </div>
                </section>
            );
        }
        if (activeSection === "imports") {
            return (
                <section className={styles.stack}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Source Runs</h2><span className={styles.tag}>{data.workspace.imports.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.imports.map((run) => (
                                <div className={styles.listItem} key={run.sourceRunId}>
                                    <strong>{run.sourceName}</strong>
                                    <span>{run.status} / {run.importedCount} imported / {run.duplicateCount} duplicate / {run.suppressedCount} suppressed</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "policies") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={handlePolicyCreate}>
                        <div className={styles.panelHeader}>
                            <h2>Source Policy</h2>
                            <button className={styles.button} disabled={saving} type="submit">Create</button>
                        </div>
                        <div className={styles.formGrid}>
                            <input className={styles.input} onChange={(event) => setPolicyName(event.target.value)} value={policyName} />
                            <input className={styles.input} min={1} max={365} onChange={(event) => setRetentionDays(Number(event.target.value))} type="number" value={retentionDays} />
                        </div>
                        <select className={styles.input} onChange={(event) => handlePolicySourceTypeChange(event.target.value)} value={policySourceType}>
                            <option value="manual-research">manual-research</option>
                            <option value="manual-csv">manual-csv</option>
                            <option value="owned-demand">owned-demand</option>
                            <option value="provider">provider</option>
                            <option value="other">other</option>
                        </select>
                        <div className={styles.checkboxGrid}>
                            <label className={styles.checkboxLabel}>
                                <input checked={policyAllowContact} onChange={(event) => setPolicyAllowContact(event.target.checked)} type="checkbox" />
                                Contact use
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input checked={policyAllowEvidence} onChange={(event) => setPolicyAllowEvidence(event.target.checked)} type="checkbox" />
                                Evidence use
                            </label>
                            <label className={styles.checkboxLabel}>
                                <input checked={policyAllowPersonalization} onChange={(event) => setPolicyAllowPersonalization(event.target.checked)} type="checkbox" />
                                Personalization
                            </label>
                        </div>
                        <button className={styles.ghostButton} disabled={saving} onClick={handleSeed} type="button">Seed Defaults</button>
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Policies</h2><span className={styles.tag}>{data.workspace.policies.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.policies.map((policy) => (
                                <div className={styles.listItem} key={policy.sourcePolicyId}>
                                    <strong>{policy.name}</strong>
                                    <span>{policy.sourceType} / {policy.retentionDays} days / {policy.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}>
                            <h2>Provider Registry</h2>
                            <div className={styles.rowActions}>
                                <button className={styles.ghostButton} disabled={saving} onClick={approveOwnedEmailSequencerProvider} type="button">Approve Owned Rail</button>
                                <button className={styles.ghostButton} disabled={saving} onClick={approveGooglePlacesProvider} type="button">Approve Places</button>
                                <button className={styles.ghostButton} disabled={saving} onClick={approveApifyProvider} type="button">Approve Apify</button>
                                <button className={styles.ghostButton} disabled={saving} onClick={approveGeminiAiProvider} type="button">Approve Gemini</button>
                            </div>
                        </div>
                        <div className={styles.table}>
                            {data.workspace.providerAccounts.map((provider) => (
                                <div className={styles.tableRowCompact} key={provider.providerAccountId}>
                                    <div><strong>{provider.provider}</strong><span>{provider.use} / {provider.credentialState}</span></div>
                                    <span className={tagClass(provider.status)}>{provider.status}</span>
                                    <span>{provider.ownerApproved ? "approved" : "owner hold"}</span>
                                    <span>${provider.spentTodayUsd || 0} / ${provider.dailyBudgetUsd}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Budget Policies</h2><span className={styles.tag}>{data.workspace.budgetPolicies.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.budgetPolicies.map((budget) => (
                                <div className={styles.tableRowCompact} key={budget.budgetPolicyId}>
                                    <div><strong>{budget.name}</strong><span>{budget.scope} / {budget.provider || budget.scopeId || "global"}</span></div>
                                    <span className={tagClass(budget.status)}>{budget.status}</span>
                                    <span>${budget.perRunBudgetUsd} per run</span>
                                    <span>${budget.spentTodayUsd || 0} / ${budget.dailyBudgetUsd}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "templates") {
            return (
                <section className={styles.contentGrid}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Draft</h2>
                            <button className={styles.button} disabled={saving || !resolvedTargetId} onClick={() => createDraft(resolvedTargetId)} type="button">Create Draft</button>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Templates</h2><button className={styles.ghostButton} disabled={saving} onClick={handleSeed} type="button">Seed</button></div>
                        <div className={styles.list}>
                            {data.workspace.templates.map((template) => (
                                <div className={styles.listItem} key={template.templateId}>
                                    <strong>{template.name}</strong>
                                    <span>{template.channel} / {template.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Drafts</h2><span className={styles.tag}>{data.workspace.drafts.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.drafts.map((draft) => (
                                <div className={styles.listItem} key={draft.draftId}>
                                    <strong>{draft.targetName}</strong>
                                    <span>{draft.subject} / {draft.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "approvals") {
            return (
                <section className={styles.stack}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Queue</h2><span className={styles.tag}>{data.workspace.approvals.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.approvals.map((approval) => (
                                <div className={styles.tableRow} key={approval.approvalId}>
                                    <div><strong>{approval.targetName}</strong><span>{approval.reviewReason}</span></div>
                                    <span className={tagClass(approval.status)}>{approval.status}</span>
                                    <span>{approval.priority}</span>
                                    <div className={styles.rowActions}>
                                        <button className={styles.ghostButton} disabled={saving} onClick={() => createApprovalPacket(approval)} type="button">Packet</button>
                                        <button className={styles.ghostButton} disabled={saving || approval.status !== "pending"} onClick={() => reviewApproval(approval, "approved")} type="button">Approve</button>
                                        <button className={styles.ghostButton} disabled={saving || approval.status !== "pending"} onClick={() => reviewApproval(approval, "rejected")} type="button">Reject</button>
                                        <button className={styles.ghostButton} disabled={saving || approval.status !== "approved"} onClick={() => exportMessage(approval.approvalId)} type="button">Export</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    {pendingApproval ? <div className={styles.alert}>Next review: {pendingApproval.targetName}</div> : null}
                    {approvedApproval ? <div className={styles.alert}>Ready to export: {approvedApproval.targetName}</div> : null}
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Approval Packets</h2><span className={styles.tag}>{data.workspace.approvalPackets.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.approvalPackets.map((packet) => (
                                <div className={styles.listItem} key={packet.approvalPacketId}>
                                    <strong>{packet.targetName}</strong>
                                    <span>{packet.riskSummary}</span>
                                    <div className={styles.rowActions}>
                                        <span className={tagClass(packet.status)}>{packet.status}</span>
                                        <span className={tagClass(packet.channelReadiness)}>{packet.channelReadiness}</span>
                                        <span className={tagClass(packet.recommendedAction)}>{packet.recommendedAction}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "inbox") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={captureReply}>
                        <div className={styles.panelHeader}>
                            <h2>Reply</h2>
                            <button className={styles.button} disabled={saving || !resolvedTargetId || !replyText.trim()} type="submit">Capture</button>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <select className={styles.input} onChange={(event) => setReplyChannel(event.target.value)} value={replyChannel}>
                            <option value="email">email</option>
                            <option value="manual">manual</option>
                            <option value="whatsapp">whatsapp</option>
                            <option value="instagram">instagram</option>
                            <option value="messenger">messenger</option>
                        </select>
                        <textarea className={styles.textareaSmall} onChange={(event) => setReplyText(event.target.value)} value={replyText} />
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Conversations</h2><span className={styles.tag}>{data.workspace.conversations.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.conversations.map((conversation) => (
                                <div className={styles.listItem} key={conversation.conversationId}>
                                    <strong>{conversation.targetName}</strong>
                                    <span>{conversation.state} / {conversation.lastMessagePreview || "No preview"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "attribution") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={recordOutcome}>
                        <div className={styles.panelHeader}><h2>Outcome</h2><button className={styles.button} disabled={saving} type="submit">Record</button></div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <select className={styles.input} onChange={(event) => setOutcomeType(event.target.value)} value={outcomeType}>
                            <option value="route_created">route_created</option>
                            <option value="upload_started">upload_started</option>
                            <option value="preview_prepared">preview_prepared</option>
                            <option value="published">published</option>
                            <option value="two_surface_activation">two_surface_activation</option>
                        </select>
                    </form>
                    <form className={styles.panel} onSubmit={captureDemand}>
                        <div className={styles.panelHeader}><h2>Demand Signal</h2><button className={styles.button} disabled={saving} type="submit">Capture</button></div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <select className={styles.input} onChange={(event) => setDemandSignalType(event.target.value)} value={demandSignalType}>
                            <option value="link_click">link_click</option>
                            <option value="qr_scan">qr_scan</option>
                            <option value="share">share</option>
                            <option value="claim_attempt">claim_attempt</option>
                            <option value="referral">referral</option>
                        </select>
                    </form>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Outcomes</h2><span className={styles.tag}>{data.workspace.outcomes.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.outcomes.map((outcome) => (
                                <div className={styles.listItem} key={outcome.outcomeSummaryId}>
                                    <strong>{outcome.targetName || outcome.outcomeType}</strong>
                                    <span>{outcome.outcomeType} / {outcome.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Demand</h2><span className={styles.tag}>{data.workspace.demandSignals.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.demandSignals.map((signal) => (
                                <div className={styles.listItem} key={signal.demandSignalId}>
                                    <strong>{signal.targetName || signal.signalType}</strong>
                                    <span>{signal.signalType} / {signal.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Audience Segments</h2><span className={styles.tag}>{data.workspace.audienceSegments.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.audienceSegments.map((segment) => (
                                <div className={styles.listItem} key={segment.audienceSegmentId}>
                                    <strong>{segment.name}</strong>
                                    <span>{segment.triggerType} / {segment.criteriaSummary}</span>
                                    <span className={tagClass(segment.status)}>{segment.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Market Pods</h2><span className={styles.tag}>{data.workspace.marketPods.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.marketPods.map((pod) => (
                                <div className={styles.listItem} key={pod.marketPodId}>
                                    <strong>{pod.name}</strong>
                                    <span>{[pod.category, pod.city, pod.country].filter(Boolean).join(" / ")} / ${pod.monthlyBudgetUsd} / {pod.successMetric}</span>
                                    <span className={tagClass(pod.status)}>{pod.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "sources") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={runEnrichmentWaterfall}>
                        <div className={styles.panelHeader}>
                            <h2>Enrichment Waterfall</h2>
                            <button className={styles.button} disabled={saving || !resolvedTargetId || !resolvedWaterfallId} type="submit">Run</button>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <select className={styles.input} onChange={(event) => setSelectedWaterfallId(event.target.value)} value={resolvedWaterfallId}>
                            {data.workspace.enrichmentWaterfalls.map((waterfall) => (
                                <option key={waterfall.waterfallId} value={waterfall.waterfallId}>{waterfall.name} / {waterfall.status}</option>
                            ))}
                        </select>
                    </form>
                    <form className={styles.panel} onSubmit={runSourceProvider}>
                        <div className={styles.panelHeader}>
                            <h2>Live Source Run</h2>
                            <button className={styles.button} disabled={saving || !resolvedProviderPolicyId || !sourceQuery.trim()} type="submit">Run</button>
                        </div>
                        <select className={styles.input} onChange={(event) => setSourceProvider(event.target.value)} value={sourceProvider}>
                            <option value="google-places">Google Places</option>
                            <option value="apify">Apify</option>
                            <option value="foursquare">Foursquare</option>
                        </select>
                        <input className={styles.input} onChange={(event) => setSourceQuery(event.target.value)} value={sourceQuery} />
                        <div className={styles.formGrid}>
                            <input className={styles.input} onChange={(event) => setSourceCity(event.target.value)} value={sourceCity} />
                            <input className={styles.input} onChange={(event) => setSourceCountry(event.target.value)} value={sourceCountry} />
                            <input className={styles.input} max={20} min={1} onChange={(event) => setSourceMaxResults(Number(event.target.value))} type="number" value={sourceMaxResults} />
                        </div>
                        <select className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedProviderPolicyId}>
                            {providerPolicies.length ? providerPolicies.map((policy) => (
                                <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name} / {policy.sourceType}</option>
                            )) : <option value="">No provider source policy</option>}
                        </select>
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Waterfalls</h2><span className={styles.tag}>{data.workspace.enrichmentWaterfalls.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.enrichmentWaterfalls.map((waterfall) => (
                                <div className={styles.listItem} key={waterfall.waterfallId}>
                                    <strong>{waterfall.name}</strong>
                                    <span>{waterfall.requestedField} / {waterfall.providerOrder.join(" > ")} / ${waterfall.maxCostUsd}</span>
                                    <span className={tagClass(waterfall.status)}>{waterfall.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Source Runs</h2><span className={styles.tag}>{data.workspace.imports.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.imports.map((run) => (
                                <div className={styles.listItem} key={run.sourceRunId}>
                                    <strong>{run.sourceName}</strong>
                                    <span>{run.status} / {run.importedCount} imported / {run.blockedCount} blocked</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Vendor Runs</h2><span className={styles.tag}>{data.workspace.vendorRuns.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.vendorRuns.map((run) => (
                                <div className={styles.tableRowCompact} key={run.vendorRunId}>
                                    <div><strong>{run.provider}</strong><span>{run.targetName || run.requestedField || "source run"}</span></div>
                                    <span className={tagClass(run.status)}>{run.status}</span>
                                    <span>${run.costEstimateUsd}</span>
                                    <span>{run.blockedReason || `${run.resultCount} result`}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Enrichment Results</h2><span className={styles.tag}>{data.workspace.enrichmentResults.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.enrichmentResults.map((result) => (
                                <div className={styles.tableRowCompact} key={result.enrichmentResultId}>
                                    <div><strong>{result.targetName}</strong><span>{result.field} / {result.provider}</span></div>
                                    <span className={tagClass(result.status)}>{result.status}</span>
                                    <span>{result.confidence}</span>
                                    <span>{result.valuePreview || "no value"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Imported Targets</h2><span className={styles.tag}>{data.workspace.targets.length}</span></div>
                        <TargetList data={data} onDraft={createDraft} onEvidence={createEvidence} onScore={scoreTarget} saving={saving} />
                    </div>
                </section>
            );
        }
        if (activeSection === "ai") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={runAiAssist}>
                        <div className={styles.panelHeader}>
                            <h2>AI Assist</h2>
                            <button className={styles.button} disabled={saving || !resolvedTargetId} type="submit">Run</button>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <select className={styles.input} onChange={(event) => setAiTask(event.target.value)} value={aiTask}>
                            <option value="score">score</option>
                            <option value="evidence">evidence</option>
                            <option value="draft">draft</option>
                            <option value="reply-classification">reply-classification</option>
                            <option value="approval-packet">approval-packet</option>
                            <option value="weekly-strategist">weekly-strategist</option>
                            <option value="vendor-audit">vendor-audit</option>
                        </select>
                        <textarea className={styles.textareaSmall} onChange={(event) => setAiInstruction(event.target.value)} value={aiInstruction} />
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Model Routes</h2><span className={styles.tag}>{data.workspace.modelRoutes.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.modelRoutes.map((route) => (
                                <div className={styles.listItem} key={route.modelRouteId}>
                                    <strong>{route.task}</strong>
                                    <span>{route.defaultProvider} / {route.defaultModel} / ${route.maxCostUsd}</span>
                                    <span className={tagClass(route.status)}>{route.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Evidence</h2><span className={styles.tag}>{data.workspace.evidencePackets.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.evidencePackets.map((packet) => (
                                <div className={styles.listItem} key={packet.evidencePacketId}>
                                    <strong>{packet.targetName}</strong>
                                    <span>{packet.confidence} / {packet.summary}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Model Evals</h2><span className={styles.tag}>{data.workspace.modelEvals.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.modelEvals.map((evaluation) => (
                                <div className={styles.tableRowCompact} key={evaluation.modelEvalId}>
                                    <div><strong>{evaluation.task}</strong><span>{evaluation.provider} / {evaluation.model}</span></div>
                                    <span className={tagClass(evaluation.status)}>{evaluation.status}</span>
                                    <span>{evaluation.sampleSize} samples</span>
                                    <span>{evaluation.rejectedFactRate} rejected fact rate</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>AI Runs</h2><span className={styles.tag}>{data.workspace.scores.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.scores.map((score: any) => (
                                <div className={styles.listItem} key={score.scoreId || score.aiRunId || score.signaldeskAiWorkerRunsDocId}>
                                    <strong>{score.workerType || "target_score"}</strong>
                                    <span>{score.segment || score.confidence || "recorded"} / {score.targetId}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "channels") {
            const approvedItems = data.workspace.approvals.filter((approval) => approval.status === "approved");
            return (
                <section className={styles.contentGrid}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Approved Channel Action</h2><span className={styles.tag}>{approvedItems.length}</span></div>
                        <select className={styles.input} onChange={(event) => setChannel(event.target.value)} value={channel}>
                            <option value="email">email</option>
                            <option value="whatsapp">whatsapp</option>
                            <option value="instagram">instagram</option>
                            <option value="messenger">messenger</option>
                        </select>
                        <select className={styles.input} onChange={(event) => setSequencerProvider(event.target.value)} value={sequencerProvider}>
                            <option value="owned-email">owned-email</option>
                            <option value="smartlead">smartlead</option>
                            <option value="instantly">instantly</option>
                            <option value="lemlist">lemlist</option>
                        </select>
                        {resolvedSenderDomainId ? <div className={styles.statusRow}><span>Sender domain</span><span className={tagClass("ready")}>{resolvedSenderDomainId}</span></div> : <div className={styles.alert}>No ready sender domain.</div>}
                        <div className={styles.list}>
                            {approvedItems.map((approval) => (
                                <div className={styles.listItem} key={approval.approvalId}>
                                    <strong>{approval.targetName}</strong>
                                    <span>{approval.reviewReason}</span>
                                    <div className={styles.rowActions}>
                                        <button className={styles.ghostButton} disabled={saving} onClick={() => prepareChannelHandoff(approval.approvalId)} type="button">Handoff</button>
                                        <button className={styles.ghostButton} disabled={saving} onClick={() => createSequencerHandoff(approval.approvalId)} type="button">{sequencerProvider === "owned-email" ? "Queue Owned" : "Sequencer"}</button>
                                        <button className={styles.ghostButton} disabled={saving || !data.setup.providerSendEnabled} onClick={() => sendApprovedMessage(approval.approvalId)} type="button">Send</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <form className={styles.panel} onSubmit={holdSenderDomain}>
                        <div className={styles.panelHeader}>
                            <h2>Sender Domain</h2>
                            <div className={styles.rowActions}>
                                <button className={styles.ghostButton} disabled={saving || !senderDomain.trim()} type="submit">Register Hold</button>
                                <button className={styles.button} disabled={saving || !senderDomain.trim()} onClick={readySenderDomain} type="button">Mark Ready</button>
                            </div>
                        </div>
                        <input className={styles.input} onChange={(event) => setSenderDomain(event.target.value)} value={senderDomain} />
                        <div className={styles.list}>
                            {data.workspace.senderDomains.map((sender) => (
                                <div className={styles.listItem} key={sender.senderDomainId}>
                                    <strong>{sender.domain}</strong>
                                    <span>{sender.authenticationState} / {sender.volumeRampState} / unsubscribe {sender.unsubscribeReady ? "ready" : "missing"}</span>
                                    <span className={tagClass(sender.status)}>{sender.status}</span>
                                </div>
                            ))}
                        </div>
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Channel Health</h2><span className={styles.tag}>{data.workspace.channelHealth.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.channelHealth.map((item) => (
                                <div className={styles.listItem} key={`${item.channel}-${item.updatedAt || "state"}`}>
                                    <strong>{item.channel}</strong>
                                    <span>{item.status} / {item.configured ? "configured" : "not configured"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Sequencer Handoffs</h2><span className={styles.tag}>{data.workspace.sequencerHandoffs.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.sequencerHandoffs.map((handoff) => (
                                <div className={styles.tableRowCompact} key={handoff.sequencerHandoffId}>
                                    <div><strong>{handoff.provider}</strong><span>{handoff.targetName || handoff.approvalId || "handoff"}</span></div>
                                    <span className={tagClass(handoff.status)}>{handoff.status}</span>
                                    <span>{handoff.senderDomainId || "no sender"}</span>
                                    <div className={styles.rowActions}>
                                        <span>{handoff.blockedReason || handoff.nextSendAt || "ready"}</span>
                                        {handoff.provider === "owned-email" && (handoff.status === "queued" || handoff.status === "ready") ? (
                                            <button className={styles.ghostButton} disabled={saving || !data.setup.providerSendEnabled} onClick={() => sendOwnedSequenceStep(handoff.sequencerHandoffId)} type="button">Send Step</button>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Owned Sequence Steps</h2><span className={styles.tag}>{data.workspace.sequencerSteps.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.sequencerSteps.map((step) => (
                                <div className={styles.tableRowCompact} key={step.sequenceStepId}>
                                    <div><strong>{step.targetName || step.targetId || "target"}</strong><span>{step.subject}</span></div>
                                    <span className={tagClass(step.status)}>{step.status}</span>
                                    <span>step {step.stepNumber}</span>
                                    <span>{step.scheduledAt || step.sentAt || "not scheduled"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Webhook Events</h2><span className={styles.tag}>{data.workspace.providerEvents.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.providerEvents.map((event) => (
                                <div className={styles.listItem} key={event.eventId}>
                                    <strong>{event.provider} / {event.eventType}</strong>
                                    <span>{event.status} / {event.targetId || "unmatched"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "settings") {
            const showEmailFields = connectorKind === "email-smtp";
            const showMetaFields = connectorKind === "meta-whatsapp" || connectorKind === "meta-instagram" || connectorKind === "meta-messenger";
            const showWhatsAppFields = connectorKind === "meta-whatsapp";
            const showInstagramFields = connectorKind === "meta-instagram";
            const showMessengerFields = connectorKind === "meta-messenger";
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={upsertConnectorSetting}>
                        <div className={styles.panelHeader}>
                            <h2>Connector</h2>
                            <button className={styles.button} disabled={saving || !connectorName.trim()} type="submit">Save</button>
                        </div>
                        <div className={styles.formGrid}>
                            <select className={styles.input} onChange={(event) => handleConnectorKindChange(event.target.value)} value={connectorKind}>
                                <option value="email-smtp">Email SMTP</option>
                                <option value="meta-whatsapp">Meta WhatsApp</option>
                                <option value="meta-instagram">Meta Instagram</option>
                                <option value="meta-messenger">Meta Messenger</option>
                                <option value="smartlead">Smartlead</option>
                                <option value="apify">Apify</option>
                            </select>
                            <select className={styles.input} onChange={(event) => setConnectorStatus(event.target.value)} value={connectorStatus}>
                                <option value="hold">hold</option>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                                <option value="blocked">blocked</option>
                            </select>
                        </div>
                        <input className={styles.input} onChange={(event) => setConnectorName(event.target.value)} value={connectorName} />
                        {showEmailFields ? (
                            <>
                                <div className={styles.formGrid}>
                                    <input className={styles.input} onChange={(event) => setConnectorFromName(event.target.value)} placeholder="From name" value={connectorFromName} />
                                    <input className={styles.input} onChange={(event) => setConnectorSenderDomain(event.target.value)} placeholder="Sender domain" value={connectorSenderDomain} />
                                </div>
                                <div className={styles.formGrid}>
                                    <input className={styles.input} onChange={(event) => setConnectorSenderEmail(event.target.value)} placeholder="Sender email" value={connectorSenderEmail} />
                                    <input className={styles.input} onChange={(event) => setConnectorReplyToEmail(event.target.value)} placeholder="Reply-to email" value={connectorReplyToEmail} />
                                </div>
                            </>
                        ) : null}
                        {showMetaFields ? (
                            <>
                                <div className={styles.formGrid}>
                                    <input className={styles.input} onChange={(event) => setConnectorAppId(event.target.value)} placeholder="Meta app ID" value={connectorAppId} />
                                    {showWhatsAppFields ? <input className={styles.input} onChange={(event) => setConnectorPhoneNumberId(event.target.value)} placeholder="Phone number ID" value={connectorPhoneNumberId} /> : null}
                                    {showInstagramFields ? <input className={styles.input} onChange={(event) => setConnectorInstagramPageId(event.target.value)} placeholder="Instagram page ID" value={connectorInstagramPageId} /> : null}
                                    {showMessengerFields ? <input className={styles.input} onChange={(event) => setConnectorMessengerPageId(event.target.value)} placeholder="Messenger page ID" value={connectorMessengerPageId} /> : null}
                                </div>
                                {showWhatsAppFields ? <input className={styles.input} onChange={(event) => setConnectorPhoneNumber(event.target.value)} placeholder="Display number" value={connectorPhoneNumber} /> : null}
                            </>
                        ) : null}
                        <textarea className={styles.textareaSmall} onChange={(event) => setConnectorNotes(event.target.value)} placeholder="Notes" value={connectorNotes} />
                    </form>

                    <form className={styles.panel} onSubmit={holdSenderDomain}>
                        <div className={styles.panelHeader}>
                            <h2>Sender Domain</h2>
                            <div className={styles.rowActions}>
                                <button className={styles.ghostButton} disabled={saving || !senderDomain.trim()} type="submit">Hold</button>
                                <button className={styles.button} disabled={saving || !senderDomain.trim()} onClick={readySenderDomain} type="button">Ready</button>
                            </div>
                        </div>
                        <input className={styles.input} onChange={(event) => setSenderDomain(event.target.value)} value={senderDomain} />
                        <div className={styles.list}>
                            {data.workspace.senderDomains.map((sender) => (
                                <div className={styles.listItem} key={sender.senderDomainId}>
                                    <strong>{sender.domain}</strong>
                                    <span>{sender.authenticationState} / {sender.volumeRampState} / unsubscribe {sender.unsubscribeReady ? "ready" : "missing"}</span>
                                    <span className={tagClass(sender.status)}>{sender.status}</span>
                                </div>
                            ))}
                        </div>
                    </form>

                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Connectors</h2><span className={styles.tag}>{data.workspace.connectorSettings.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.connectorSettings.map((connector) => (
                                <div className={styles.tableRowCompact} key={connector.connectorId}>
                                    <div><strong>{connector.displayName}</strong><span>{connector.connectorKind} / {connector.channel} / {connector.provider}</span></div>
                                    <span className={tagClass(connector.status)}>{connector.status}</span>
                                    <span className={tagClass(connector.envReadiness)}>{connector.envReadiness}</span>
                                    <span>{connector.missingEnv.length ? connector.missingEnv.join(", ") : "env ready"}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Channel Health</h2><span className={styles.tag}>{data.workspace.channelHealth.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.channelHealth.map((item) => (
                                <div className={styles.listItem} key={`${item.channel}-${item.updatedAt || "state"}`}>
                                    <strong>{item.channel}</strong>
                                    <span>{item.status} / {item.configured ? "configured" : "not configured"}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Provider Accounts</h2><span className={styles.tag}>{data.workspace.providerAccounts.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.providerAccounts.map((provider) => (
                                <div className={styles.listItem} key={provider.providerAccountId}>
                                    <strong>{provider.provider}</strong>
                                    <span>{provider.use} / {provider.credentialState} / ${provider.dailyBudgetUsd}</span>
                                    <span className={tagClass(provider.status)}>{provider.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "control-room") {
            return (
                <>
                    <DashboardSection data={data} />
                    <section className={styles.contentGrid}>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Scoped Pause</h2>
                                <button
                                    className={scopedPauseActive ? styles.button : styles.dangerButton}
                                    disabled={saving || (!scopedPauseActive && !canPause) || (scopedPauseActive && !canResume)}
                                    onClick={handleScopedPauseToggle}
                                    type="button"
                                >
                                    {scopedPauseActive ? "Clear" : "Pause"}
                                </button>
                            </div>
                            <select className={styles.input} onChange={(event) => setPauseScope(event.target.value as SignalDeskKillSwitchScope)} value={pauseScope}>
                                {PAUSE_SCOPES.map((scope) => (
                                    <option key={scope} value={scope}>{scope}</option>
                                ))}
                            </select>
                            <div className={styles.statusRow}><span>Selected scope</span><span className={tagClass(scopedPauseActive ? "warning" : "good")}>{scopedPauseActive ? "paused" : "clear"}</span></div>
                        </div>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}><h2>Run Timelines</h2><span className={styles.tag}>{data.workspace.runTimelines.length}</span></div>
                            <div className={styles.list}>
                                {data.workspace.runTimelines.map((timeline) => (
                                    <div className={styles.listItem} key={timeline.runTimelineId}>
                                        <strong>{timeline.label}</strong>
                                        <span>{timeline.entityType} / {timeline.entityId}</span>
                                        <span className={tagClass(timeline.status)}>{timeline.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}><h2>Self-service CTAs</h2><span className={styles.tag}>{data.workspace.selfServiceCtas.length}</span></div>
                            <div className={styles.list}>
                                {data.workspace.selfServiceCtas.map((cta) => (
                                    <div className={styles.listItem} key={cta.ctaId}>
                                        <strong>{cta.label}</strong>
                                        <span>{cta.ctaType} / {cta.copy}</span>
                                        <span className={tagClass(cta.status)}>{cta.status}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.panelWide}>
                            <div className={styles.panelHeader}><h2>Investment Holds</h2><span className={styles.tag}>{data.workspace.providerAccounts.length + data.workspace.budgetPolicies.length}</span></div>
                            <div className={styles.table}>
                                {data.workspace.providerAccounts.filter((provider) => provider.status !== "approved").map((provider) => (
                                    <div className={styles.tableRowCompact} key={provider.providerAccountId}>
                                        <div><strong>{provider.provider}</strong><span>{provider.use} / {provider.disabledReason || "approval required"}</span></div>
                                        <span className={tagClass(provider.status)}>{provider.status}</span>
                                        <span>${provider.perRunBudgetUsd} per run</span>
                                        <span>{provider.ownerApproved ? "owner approved" : "owner hold"}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </>
            );
        }
        if (activeSection === "audit") {
            return (
                <section className={styles.panel}>
                    <div className={styles.panelHeader}><h2>Audit</h2><span className={styles.tag}>{data.workspace.auditEvents.length}</span></div>
                    <div className={styles.list}>
                        {data.workspace.auditEvents.map((event) => (
                            <div className={styles.listItem} key={event.auditEventId}>
                                <strong>{event.action}</strong>
                                <span>{event.entityType} / {event.actorRole || "role"} / {event.reason || "recorded"}</span>
                            </div>
                        ))}
                    </div>
                </section>
            );
        }
        return null;
    };

    return (
        <div className={styles.shell}>
            <div className={styles.layout}>
                <aside className={styles.sidebar}>
                    <div className={styles.brand}>
                        <div className={styles.mark}>SD</div>
                        <div className={styles.brandText}>
                            <strong>MenuList SignalDesk</strong>
                            <span>Internal growth control</span>
                        </div>
                    </div>
                    <nav className={styles.nav} aria-label="SignalDesk navigation">
                        {NAV_ITEMS.map((item) => {
                            return (
                                <SignalDeskNavLink
                                    activeSection={activeSection}
                                    item={item}
                                    key={item.section}
                                />
                            );
                        })}
                    </nav>
                </aside>

                <main className={styles.main}>
                    <header className={styles.header}>
                        <div>
                            <p className={styles.eyebrow}>Private internal tool</p>
                            <h1 className={styles.title}>{meta.title}</h1>
                            <p className={styles.subtitle}>{meta.description}</p>
                        </div>
                        <div className={styles.actions}>
                            <button className={styles.ghostButton} disabled={loading} onClick={() => void refresh()} type="button">
                                <LuRefreshCw size={16} />
                                Refresh
                            </button>
                            <button
                                className={globalPauseActive ? styles.button : styles.dangerButton}
                                disabled={saving || (!globalPauseActive && !canPause) || (globalPauseActive && !canResume)}
                                onClick={handlePauseToggle}
                                type="button"
                            >
                                <LuPauseCircle size={16} />
                                {globalPauseActive ? "Clear Pause" : "Global Pause"}
                            </button>
                        </div>
                    </header>

                    {error ? <div className={`${styles.alert} ${styles.error}`}>{error}</div> : null}
                    {loading || !data ? <LoadingState /> : (
                        <>
                            <SetupAlert data={data} />
                            {renderSection()}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
