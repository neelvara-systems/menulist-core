"use client";

import DashboardHeaderShell from "@/components/shared/dashboardShell/DashboardHeaderShell";
import DashboardSidebarShell, {
    DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
    type DashboardSidebarShellItem,
} from "@/components/shared/dashboardShell/DashboardSidebarShell";
import { SIGNALDESK_ROUTES } from "@constant/signaldesk/routes";
import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import { useSignalDeskOverview } from "@hook/signaldesk/useSignalDeskOverview";
import { parseSignalDeskTargetImportCsv, SIGNALDESK_IMPORT_CSV_COLUMNS } from "@lib/signaldesk/csvImport";
import { getDarkModeState, getSidebarState, toggleDarkMode, toggleSidbar } from "@reduxSlices/clientThemeConfig";
import type {
    SignalDeskAiShadowReviewDecision,
    SignalDeskAiVolumeRunSummary,
    SignalDeskAiVolumeTask,
    SignalDeskApprovalRejectionReason,
    SignalDeskApprovalItem,
    SignalDeskContentChannel,
    SignalDeskContentSourceSummary,
    SignalDeskContentSourceType,
    SignalDeskControlStatus,
    SignalDeskKillSwitchScope,
    SignalDeskManualContactResult,
    SignalDeskManualContactRoute,
    SignalDeskProofPermissionSummary,
    SignalDeskProofPermissionScope,
    SignalDeskRole,
    SignalDeskSection,
    SignalDeskSourcePolicy,
    SignalDeskTargetSummary,
    SignalDeskTeamMemberSummary,
    SignalDeskWorkspaceResponse,
} from "@type/signaldesk";
import { Alert, Button, Checkbox, Drawer, Flex, Input, InputNumber, Layout, Select, Spin, theme, Tooltip, Typography } from "antd";
import { useRouter } from "next/navigation";
import type {
    ButtonHTMLAttributes,
    ChangeEvent,
    ComponentType,
    FormEvent,
    InputHTMLAttributes,
    ReactNode,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react";
import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import {
    LuAlertTriangle,
    LuBarChart3,
    LuBell,
    LuInbox,
    LuMenu,
    LuMoon,
    LuPanelLeftClose,
    LuPanelLeftOpen,
    LuPauseCircle,
    LuRefreshCw,
    LuRouter,
    LuShield,
    LuSun,
    LuTarget,
} from "react-icons/lu";
import { useSignalDeskBasePath, withSignalDeskBasePath } from "./SignalDeskPathProvider";
import styles from "./SignalDeskWorkspace.module.scss";

const { Content } = Layout;
const { Text } = Typography;
const SIGNALDESK_SIDEBAR_EXPANDED_WIDTH = 220;
const SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY = "menulist.signaldesk.ai-volume-retry-v1";
const SIGNALDESK_ACTIVATION_SURFACES = ["qr", "whatsapp", "google-profile", "instagram", "website", "print", "other"] as const;
type ExperimentReadbackFormState = {
    baselineEndAt: string;
    baselineStartAt: string;
    candidateEndAt: string;
    candidateStartAt: string;
    confounders: string;
    nextReadbackAt: string;
    primaryMetric: string;
};
const toLocalDateTimeInputValue = (date: Date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60_000))
    .toISOString()
    .slice(0, 16);
const createDefaultExperimentReadbackForm = (): ExperimentReadbackFormState => {
    const candidateStart = new Date();
    candidateStart.setSeconds(0, 0);
    const baselineStart = new Date(candidateStart.getTime() - (7 * 24 * 60 * 60 * 1_000));
    const candidateEnd = new Date(candidateStart.getTime() + (7 * 24 * 60 * 60 * 1_000));
    return {
        baselineEndAt: toLocalDateTimeInputValue(candidateStart),
        baselineStartAt: toLocalDateTimeInputValue(baselineStart),
        candidateEndAt: toLocalDateTimeInputValue(candidateEnd),
        candidateStartAt: toLocalDateTimeInputValue(candidateStart),
        confounders: "Market pod changes, Source policy changes, Offer or CTA changes, Seasonal demand",
        nextReadbackAt: toLocalDateTimeInputValue(candidateEnd),
        primaryMetric: "Owner-reviewed two-surface activations",
    };
};
const toExperimentReadbackIso = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
};
const SIGNALDESK_PUBLIC_PROOF_SCOPES = new Set<SignalDeskProofPermissionScope>([
    "business-name",
    "logo",
    "quotation",
    "before-after-screenshots",
    "public-case-study",
    "partner-material",
]);
const isProofPermissionCurrentlyActive = (permission: SignalDeskProofPermissionSummary) => {
    if (permission.status !== "active" || !permission.grantedAt) return false;
    const grantedAt = new Date(permission.grantedAt).getTime();
    const expiresAt = permission.expiresAt ? new Date(permission.expiresAt).getTime() : null;
    return !Number.isNaN(grantedAt)
        && grantedAt <= Date.now()
        && (expiresAt === null || (!Number.isNaN(expiresAt) && expiresAt > Date.now()));
};
const SIGNALDESK_APPROVAL_REJECTION_OPTIONS: Array<{ label: string; value: SignalDeskApprovalRejectionReason }> = [
    { label: "Evidence weak or stale", value: "evidence-weak-or-stale" },
    { label: "Identity uncertain", value: "identity-uncertain" },
    { label: "No customer-truth gap", value: "no-customer-truth-gap" },
    { label: "Contact route not allowed", value: "contact-route-not-allowed" },
    { label: "Already solved", value: "already-solved" },
    { label: "Wrong segment", value: "wrong-segment" },
    { label: "Duplicate", value: "duplicate" },
    { label: "Other", value: "other" },
];
const SIGNALDESK_MANUAL_CONTACT_RESULTS: Array<{ label: string; value: SignalDeskManualContactResult }> = [
    { label: "Contacted", value: "contacted" },
    { label: "No answer", value: "no-answer" },
    { label: "Requested later", value: "requested-later" },
    { label: "Declined", value: "declined" },
    { label: "Wrong contact", value: "wrong-contact" },
    { label: "Introduced", value: "introduced" },
];

type SignalDeskAiVolumeRetryPayload = {
    idempotencyKey: string;
    instruction?: string;
    maxEstimatedCostUsd: number;
    targetIds: string[];
    tasks: SignalDeskAiVolumeTask[];
};

const parseAiVolumeRetryPayload = (value: string | null): SignalDeskAiVolumeRetryPayload | null => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value) as Partial<SignalDeskAiVolumeRetryPayload>;
        const allowedTasks: SignalDeskAiVolumeTask[] = ["score", "evidence", "draft", "reply-classification"];
        if (
            typeof parsed.idempotencyKey !== "string"
            || parsed.idempotencyKey.length < 8
            || parsed.idempotencyKey.length > 180
            || typeof parsed.maxEstimatedCostUsd !== "number"
            || parsed.maxEstimatedCostUsd < 0.01
            || parsed.maxEstimatedCostUsd > 5
            || !Array.isArray(parsed.targetIds)
            || parsed.targetIds.length < 1
            || parsed.targetIds.length > 5
            || parsed.targetIds.some((targetId) => typeof targetId !== "string" || targetId.length < 3 || targetId.length > 160)
            || !Array.isArray(parsed.tasks)
            || parsed.tasks.length < 1
            || parsed.tasks.length > 3
            || parsed.tasks.some((task) => !allowedTasks.includes(task))
        ) return null;
        return {
            idempotencyKey: parsed.idempotencyKey,
            instruction: typeof parsed.instruction === "string" ? parsed.instruction.slice(0, 500) : undefined,
            maxEstimatedCostUsd: parsed.maxEstimatedCostUsd,
            targetIds: Array.from(new Set(parsed.targetIds)),
            tasks: Array.from(new Set(parsed.tasks)),
        };
    } catch {
        return null;
    }
};

type WorkspaceButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type WorkspaceInputProps = InputHTMLAttributes<HTMLInputElement>;
type WorkspaceSelectProps = SelectHTMLAttributes<HTMLSelectElement>;
type WorkspaceTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
type SelectOptionLikeProps = {
    children?: ReactNode;
    value?: string | number;
};

function WorkspaceButton({
    children,
    className = "",
    type: htmlType = "button",
    ...props
}: WorkspaceButtonProps) {
    const isPrimary = className.includes(styles.button);
    const isDanger = className.includes(styles.dangerButton);

    return (
        <Button
            {...(props as any)}
            className={className}
            danger={isDanger}
            htmlType={htmlType === "submit" ? "submit" : "button"}
            type={isPrimary ? "primary" : "default"}
        >
            {children}
        </Button>
    );
}

function WorkspaceInput({
    children,
    className = "",
    max,
    min,
    onChange,
    type = "text",
    value,
    checked,
    ...props
}: WorkspaceInputProps) {
    if (type === "checkbox") {
        return (
            <Checkbox
                checked={Boolean(checked)}
                className={className}
                disabled={props.disabled}
                onChange={(event) => onChange?.(event as unknown as ChangeEvent<HTMLInputElement>)}
            >
                {children}
            </Checkbox>
        );
    }

    if (type === "number") {
        const numberValue = value === undefined || value === null || value === "" ? undefined : Number(value);
        const numberMin = min === undefined ? undefined : Number(min);
        const numberMax = max === undefined ? undefined : Number(max);

        return (
            <InputNumber
                {...(props as any)}
                className={className}
                max={numberMax}
                min={numberMin}
                onChange={(nextValue) => {
                    onChange?.({
                        target: {
                            value: nextValue === null || nextValue === undefined ? "" : String(nextValue),
                        },
                    } as ChangeEvent<HTMLInputElement>);
                }}
                value={numberValue}
            />
        );
    }

    return (
        <Input
            {...(props as any)}
            className={className}
            onChange={onChange as any}
            value={value as any}
        />
    );
}

function WorkspaceSelect({
    children,
    className = "",
    onChange,
    value,
    ...props
}: WorkspaceSelectProps) {
    const options = Children.toArray(children).flatMap((child) => {
        if (!isValidElement<SelectOptionLikeProps>(child)) return [];
        const optionValue = child.props.value;
        return [{
            label: child.props.children,
            value: String(optionValue ?? ""),
        }];
    });

    return (
        <Select
            {...(props as any)}
            className={className}
            onChange={(nextValue) => {
                onChange?.({
                    target: {
                        value: String(nextValue),
                    },
                } as ChangeEvent<HTMLSelectElement>);
            }}
            options={options}
            popupMatchSelectWidth={false}
            value={value === undefined || value === null ? undefined : String(value)}
        />
    );
}

function WorkspaceTextarea({
    className = "",
    onChange,
    value,
    ...props
}: WorkspaceTextareaProps) {
    return (
        <Input.TextArea
            {...(props as any)}
            autoSize={className.includes(styles.textareaSmall) ? { minRows: 3 } : { minRows: 4 }}
            className={className}
            onChange={onChange as any}
            value={value as any}
        />
    );
}

const SECTION_META: Record<SignalDeskSection, { description: string; label: string; title: string }> = {
    dashboard: {
        description: "Observe system movement, monitor risk, and approve only the work that needs human control.",
        label: "Today",
        title: "Today",
    },
    mission: {
        description: "Daily founder mission, experiment cards, approved offers, reply playbooks, and source-learning decisions.",
        label: "Opportunities",
        title: "Opportunities",
    },
    revenue: {
        description: "Commercial accounts, opportunities, standard offers, bounded operating envelopes, activation watches, and founder attention.",
        label: "Revenue",
        title: "Revenue Operating Layer",
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
        label: "Conversations",
        title: "Conversations",
    },
    attribution: {
        description: "MenuList outcomes and demand signals.",
        label: "Activations",
        title: "Activations",
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
    content: {
        description: "Owned proof assets, platform-ready drafts, approval, calendar queue, and manual performance capture.",
        label: "Content",
        title: "Content Distribution",
    },
    partners: {
        description: "Trust-channel partner tests, lean briefs, flat-fee deals, deliverables, metrics, and renewal decisions.",
        label: "Partners",
        title: "Trust Partners",
    },
    settings: {
        description: "Internal team access, connector records, sender identity, and channel readiness.",
        label: "Settings",
        title: "Settings",
    },
    "control-room": {
        description: "Pause, redirect, and monitor health across sources, channels, cost, and queues.",
        label: "Controls",
        title: "Controls",
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

const PRIMARY_NAV_ITEMS: SignalDeskNavItem[] = [
    { href: SIGNALDESK_ROUTES.DASHBOARD, icon: LuBarChart3, section: "dashboard" },
    { href: SIGNALDESK_ROUTES.OPPORTUNITIES, icon: LuTarget, section: "mission" },
    { href: SIGNALDESK_ROUTES.CONVERSATIONS, icon: LuInbox, section: "inbox" },
    { href: SIGNALDESK_ROUTES.ACTIVATIONS, icon: LuRouter, section: "attribution" },
    { href: SIGNALDESK_ROUTES.CONTROLS, icon: LuShield, section: "control-room" },
];

const PAUSE_SCOPES: SignalDeskKillSwitchScope[] = [
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
];

const TEAM_ROLE_OPTIONS: Array<{ label: string; value: SignalDeskRole }> = [
    { label: "Founder admin", value: "founder-admin" },
    { label: "Growth manager", value: "growth-manager" },
    { label: "Operator", value: "operator" },
    { label: "Compliance reviewer", value: "compliance-reviewer" },
    { label: "Read-only analyst", value: "readonly-analyst" },
];

const MARKET_SEARCH_PRESETS = [
    {
        label: "Indiranagar cafes",
        prompt: "Find independent cafes and dessert shops in Indiranagar Bengaluru with weak current-menu presence",
        researchType: "business-prospect",
    },
    {
        label: "Koramangala QSR",
        prompt: "Find independent quick-service restaurants in Koramangala Bengaluru with PDF-only or Instagram-only menus",
        researchType: "business-prospect",
    },
    {
        label: "Bengaluru partners",
        prompt: "Find menu photographers and restaurant consultants in Indiranagar and Koramangala Bengaluru for a zero-fee learning partnership",
        researchType: "partner-list",
    },
];

const tagClass = (tone?: string) => {
    if (tone === "good" || tone === "healthy" || tone === "active" || tone === "approved" || tone === "accepted" || tone === "interested" || tone === "ready" || tone === "completed" || tone === "verified") return styles.tagGood;
    if (tone === "warning" || tone === "partial" || tone === "paused" || tone === "stale" || tone === "pending" || tone === "queued" || tone === "needs_review" || tone === "hold" || tone === "held" || tone === "edited" || tone === "evaluation" || tone === "candidate") return styles.tagWarning;
    if (tone === "danger" || tone === "missing" || tone === "over_limit" || tone === "critical" || tone === "rejected" || tone === "dnc" || tone === "blocked" || tone === "failed" || tone === "disabled" || tone === "suppressed") return styles.tagDanger;
    return styles.tag;
};

const metricClass = (tone?: string) => [
    styles.metric,
    tone === "good" ? styles.metricToneGood : "",
    tone === "warning" ? styles.metricToneWarning : "",
    tone === "danger" ? styles.metricToneDanger : "",
].filter(Boolean).join(" ");

const formatRate = (value?: number | null) => `${Math.round(Math.max(0, Number(value) || 0) * 100)}%`;

const firstTargetId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.targets[0]?.targetId || "";
const firstPolicyId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.policies.find((policy) => policy.sourceType === "manual-research" && !policy.allowedUse.contact)?.sourcePolicyId
    || data?.workspace.policies[0]?.sourcePolicyId
    || ""
);
const isUsableProviderPolicy = (policy: SignalDeskSourcePolicy, provider: string) => {
    const expiresAt = policy.expiresAt ? Date.parse(policy.expiresAt) : Number.NaN;
    return policy.sourceType === "provider"
        && policy.provider === provider
        && (policy.status === "active" || policy.status === "approved")
        && (policy.policyState === "active" || policy.policyState === "expires_soon")
        && policy.allowedUse.evidence
        && policy.allowedUse.import
        && policy.allowedUse.providerRun
        && policy.retentionDays > 0
        && Number.isFinite(expiresAt)
        && expiresAt > Date.now();
};
const isUsableManualImportPolicy = (policy: SignalDeskSourcePolicy) => {
    const expiresAt = policy.expiresAt ? Date.parse(policy.expiresAt) : Number.NaN;
    return (policy.sourceType === "manual-csv" || policy.sourceType === "manual-research" || policy.sourceType === "owned-demand")
        && (policy.status === "active" || policy.status === "approved")
        && (policy.policyState === "active" || policy.policyState === "expires_soon")
        && policy.allowedUse.import
        && policy.retentionDays > 0
        && Number.isFinite(expiresAt)
        && expiresAt > Date.now();
};
const firstWaterfallId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.enrichmentWaterfalls[0]?.waterfallId || "";
const firstMarketPodId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.marketPods[0]?.marketPodId || "";
const firstActiveMarketPodId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.marketPods.find((pod) => pod.status === "active")?.marketPodId || "";
const firstPartnerId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerProfiles[0]?.partnerId || "";
const firstNicheTestId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerNicheTests[0]?.nicheTestId || "";
const firstTrustDealId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerDeals[0]?.dealId || "";
const firstTrustDeliverableId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerDeliverables[0]?.deliverableId || "";
const firstTrustBudgetId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.budgetPolicies.find((budget) => budget.scope === "trust-partner")?.budgetPolicyId || ""
);
const firstCtaId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.selfServiceCtas.find((cta) => cta.status === "active")?.ctaId || "";
const firstGrowthMissionId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.growthMissions[0]?.growthMissionId || "";
const firstExperimentCardId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.experimentCards[0]?.experimentCardId || "";
const firstOfferCtaId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.offerCtas[0]?.offerCtaId || "";
const firstReplyPlaybookId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.replyPlaybooks[0]?.playbookId || "";
const firstSourceRunId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.imports[0]?.sourceRunId || "";
const firstReadySenderDomainId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.senderDomains.find((sender) => (
        sender.status === "active" &&
        sender.authenticationState === "ready" &&
        sender.unsubscribeReady &&
        sender.brandRisk !== "high"
    ))?.senderDomainId || ""
);
const firstCommercialOfferId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.commercialOffers.find((offer) => offer.status === "active")?.commercialOfferId || data?.workspace.commercialOffers[0]?.commercialOfferId || "";
const firstCommercialOpportunityId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.commercialOpportunities[0]?.opportunityId || "";
const firstRevenueBudgetPolicyId = (data: SignalDeskWorkspaceResponse | null, marketPodId: string) => data?.workspace.budgetPolicies.find((budget) => (
    budget.status === "active"
    && (
        budget.scope === "global"
        || (budget.scope === "market-pod" && Boolean(marketPodId) && budget.scopeId === marketPodId)
    )
))?.budgetPolicyId || "";
const firstActiveTemplateId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.templates.find((template) => template.status === "active")?.templateId || "";

function LoadingState() {
    return (
        <div className={styles.empty}>
            <Spin />
            <span>Loading SignalDesk...</span>
        </div>
    );
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
        <WorkspaceSelect className={styles.input} onChange={(event) => onChange(event.target.value)} value={value || firstTargetId(data)}>
            {data.workspace.targets.map((target) => (
                <option key={target.targetId} value={target.targetId}>{target.displayName}</option>
            ))}
        </WorkspaceSelect>
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
    mobileReadOnly,
    onDraft,
    onEvidence,
    onScore,
    saving,
}: {
    data: SignalDeskWorkspaceResponse;
    mobileReadOnly: boolean;
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
                        <WorkspaceButton className={styles.ghostButton} disabled={saving || mobileReadOnly} onClick={() => onScore(target.targetId)} type="button">Score</WorkspaceButton>
                        <WorkspaceButton className={styles.ghostButton} disabled={saving || mobileReadOnly} onClick={() => onEvidence(target.targetId)} type="button">Evidence</WorkspaceButton>
                        <WorkspaceButton className={styles.ghostButton} disabled={saving || mobileReadOnly} onClick={() => onDraft(target.targetId)} type="button">Draft</WorkspaceButton>
                    </div>
                </div>
            ))}
        </div>
    );
}

type LeadPlan = {
    detail: string;
    label: string;
    tone?: string;
};

const opportunityLabelForLead = (opportunity?: string | null) => {
    if (opportunity === "missing-current-list") return "Missing current menu link";
    if (opportunity === "stale-menu") return "Stale menu signal";
    if (opportunity === "instagram-only") return "Instagram-only menu";
    if (opportunity === "pdf-only") return "PDF-only menu";
    if (opportunity === "no-link") return "No menu link";
    return "Menu presence unclear";
};

const actionLabelForLead = (action?: string) => {
    if (action === "score") return "Score next";
    if (action === "evidence") return "Build evidence";
    if (action === "partner-review") return "Review partner fit";
    if (action === "pod-review") return "Review pod fit";
    if (action === "hold") return "Hold";
    if (action === "draft") return "Draft";
    return action || "Review";
};

function LeadPlanBlock({ plan, title }: { plan: LeadPlan; title: string }) {
    return (
        <div className={styles.leadPlanBlock}>
            <span>{title}</span>
            <strong className={plan.tone ? tagClass(plan.tone) : undefined}>{plan.label}</strong>
            <small>{plan.detail}</small>
        </div>
    );
}

function LeadActionControls({
    disabled,
    nextAction,
    onDraft,
    onEvidence,
    onScore,
    targetId,
}: {
    disabled: boolean;
    nextAction?: string;
    onDraft: (targetId: string) => void;
    onEvidence: (targetId: string) => void;
    onScore: (targetId: string) => void;
    targetId?: string | null;
}) {
    if (!targetId || nextAction === "hold" || nextAction === "partner-review" || nextAction === "pod-review") {
        return <span className={tagClass(nextAction)}>{actionLabelForLead(nextAction)}</span>;
    }

    if (nextAction === "evidence") {
        return <WorkspaceButton className={styles.button} disabled={disabled} onClick={() => onEvidence(targetId)} type="button">Build Evidence</WorkspaceButton>;
    }

    if (nextAction === "draft") {
        return <WorkspaceButton className={styles.button} disabled={disabled} onClick={() => onDraft(targetId)} type="button">Draft</WorkspaceButton>;
    }

    return <WorkspaceButton className={styles.button} disabled={disabled} onClick={() => onScore(targetId)} type="button">Score Lead</WorkspaceButton>;
}

function TodayLeadBatch({
    data,
    mobileReadOnly,
    onDraft,
    onEvidence,
    onScore,
    saving,
}: {
    data: SignalDeskWorkspaceResponse;
    mobileReadOnly: boolean;
    onDraft: (targetId: string) => void;
    onEvidence: (targetId: string) => void;
    onScore: (targetId: string) => void;
    saving: boolean;
}) {
    const inventory = data.workspace.activationOpportunities.filter((opportunity) => (
        opportunity.state !== "activated"
        && opportunity.state !== "closed"
        && opportunity.state !== "rejected"
    ));
    const decisions = inventory.slice(0, 5);

    return (
        <div className={styles.panelWide}>
            <div className={styles.panelHeader}>
                <h2>Today&apos;s Decisions</h2>
                <span className={styles.tag}>{decisions.length} shown / {inventory.length} inventory</span>
            </div>
            {decisions.length ? (
                <div className={styles.table}>
                    {decisions.map((opportunity) => {
                        const target = data.workspace.targets.find((item) => item.targetId === opportunity.targetId);
                        const researchRow = data.workspace.researchTableRows.find((row) => row.targetId === opportunity.targetId);
                        const controlAction = opportunity.state === "actionable" || opportunity.state === "verified"
                            ? researchRow?.recommendedNextAction || target?.nextAction || "evidence"
                            : "hold";
                        return (
                            <div className={styles.leadCard} key={opportunity.activationOpportunityId}>
                                <div className={styles.leadCardHeader}>
                                    <div>
                                        <strong>{opportunity.displayName}</strong>
                                        <span>{[opportunity.category, opportunity.city].filter(Boolean).join(" / ") || "Location needs review"}</span>
                                    </div>
                                    <div className={styles.leadScore}>
                                        <span className={tagClass(opportunity.state === "suppressed" || opportunity.state === "expired" ? "danger" : opportunity.state === "engaged" || opportunity.state === "activation_started" ? "good" : "warning")}>{opportunity.state.replace(/_/g, " ")}</span>
                                    </div>
                                </div>
                                <div className={styles.leadPlanGrid}>
                                    <LeadPlanBlock plan={{
                                        detail: `Evidence ${opportunity.evidenceGrade}; source policy ${opportunity.sourcePolicyState}.`,
                                        label: opportunityLabelForLead(opportunity.truthGap),
                                        tone: opportunity.evidenceGrade === "high" ? "good" : "warning",
                                    }} title="Evidence" />
                                    <LeadPlanBlock plan={{
                                        detail: opportunity.allowedRouteReason,
                                        label: opportunity.allowedRoute === "none" ? "No contact action" : opportunity.allowedRoute,
                                        tone: opportunity.allowedRoute === "none" ? "warning" : "good",
                                    }} title="Allowed Route" />
                                    <LeadPlanBlock plan={{
                                        detail: opportunity.activationDeadlineAt ? `Deadline ${opportunity.activationDeadlineAt}` : "The seven-day clock starts only after owner-qualified intent.",
                                        label: opportunity.state.replace(/_/g, " "),
                                        tone: opportunity.state === "engaged" || opportunity.state === "activation_started" ? "good" : "warning",
                                    }} title="Activation" />
                                    <div className={styles.leadActionBlock}>
                                        <span>Next</span>
                                        <small>{opportunity.nextAction}</small>
                                        <LeadActionControls
                                            disabled={saving || mobileReadOnly}
                                            nextAction={controlAction}
                                            onDraft={onDraft}
                                            onEvidence={onEvidence}
                                            onScore={onScore}
                                            targetId={opportunity.targetId}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : <div className={styles.empty}>Run a bounded market search or handle the current conversation and activation queue.</div>}
        </div>
    );
}

function ResearchAgentSearchPanel({
    actionDisabled,
    buttonLabel = "Find Leads",
    onSubmit,
    researchMaxResults,
    researchPrompt,
    researchProvider,
    researchType,
    resolvedResearchPolicyId,
    setResearchMaxResults,
    setResearchPrompt,
    setResearchProvider,
    setResearchType,
    title = "Market Search",
}: {
    actionDisabled: boolean;
    buttonLabel?: string;
    onSubmit: (event: FormEvent) => void;
    researchMaxResults: number;
    researchPrompt: string;
    researchProvider: string;
    researchType: string;
    resolvedResearchPolicyId: string;
    setResearchMaxResults: (value: number) => void;
    setResearchPrompt: (value: string) => void;
    setResearchProvider: (value: string) => void;
    setResearchType: (value: string) => void;
    title?: string;
}) {
    return (
        <form className={styles.panel} onSubmit={onSubmit}>
            <div className={styles.panelHeader}>
                <h2>{title}</h2>
                <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedResearchPolicyId} type="submit">{buttonLabel}</WorkspaceButton>
            </div>
            <WorkspaceTextarea
                className={styles.textarea}
                onChange={(event) => setResearchPrompt(event.target.value)}
                placeholder="Find independent cafes in Indiranagar Bengaluru with weak current-menu presence"
                value={researchPrompt}
            />
            <div className={styles.quickPrompts}>
                {MARKET_SEARCH_PRESETS.map((preset) => (
                    <WorkspaceButton
                        className={styles.ghostButton}
                        disabled={actionDisabled}
                        key={preset.label}
                        onClick={() => {
                            setResearchPrompt(preset.prompt);
                            setResearchType(preset.researchType);
                            setResearchMaxResults(25);
                        }}
                        type="button"
                    >
                        {preset.label}
                    </WorkspaceButton>
                ))}
            </div>
            <div className={styles.formGrid}>
                <WorkspaceSelect className={styles.input} onChange={(event) => setResearchProvider(event.target.value)} value={researchProvider}>
                    <option value="google-places">Google Places-style</option>
                    <option value="apify">Apify Broker</option>
                    <option value="fhrs-fhis">FHRS/FHIS UK</option>
                </WorkspaceSelect>
                <WorkspaceSelect className={styles.input} onChange={(event) => setResearchType(event.target.value)} value={researchType}>
                    <option value="business-prospect">Business prospects</option>
                    <option value="market-map">Market map</option>
                    <option value="partner-list">Partner list</option>
                </WorkspaceSelect>
                <WorkspaceInput className={styles.input} min={1} max={30} onChange={(event) => setResearchMaxResults(Number(event.target.value))} type="number" value={researchMaxResults} />
            </div>
            <div className={styles.statusRow}>
                <span>Provider policy</span>
                <span className={tagClass(resolvedResearchPolicyId ? "ready" : "hold")}>{resolvedResearchPolicyId || "missing"}</span>
            </div>
        </form>
    );
}

function DashboardSection({
    actionDisabled,
    data,
    mobileReadOnly,
    onDraft,
    onEvidence,
    onResearchSubmit,
    onScore,
    researchMaxResults,
    researchPrompt,
    researchProvider,
    researchType,
    resolvedResearchPolicyId,
    saving,
    setResearchMaxResults,
    setResearchPrompt,
    setResearchProvider,
    setResearchType,
}: {
    actionDisabled: boolean;
    data: SignalDeskWorkspaceResponse;
    mobileReadOnly: boolean;
    onDraft: (targetId: string) => void;
    onEvidence: (targetId: string) => void;
    onResearchSubmit: (event: FormEvent) => void;
    onScore: (targetId: string) => void;
    researchMaxResults: number;
    researchPrompt: string;
    researchProvider: string;
    researchType: string;
    resolvedResearchPolicyId: string;
    saving: boolean;
    setResearchMaxResults: (value: number) => void;
    setResearchPrompt: (value: string) => void;
    setResearchProvider: (value: string) => void;
    setResearchType: (value: string) => void;
}) {
    return (
        <>
            <OwnerControlModel />
            <SummaryMetrics data={data} />
            <section className={styles.contentGrid}>
                <ResearchAgentSearchPanel
                    actionDisabled={actionDisabled}
                    onSubmit={onResearchSubmit}
                    researchMaxResults={researchMaxResults}
                    researchPrompt={researchPrompt}
                    researchProvider={researchProvider}
                    researchType={researchType}
                    resolvedResearchPolicyId={resolvedResearchPolicyId}
                    setResearchMaxResults={setResearchMaxResults}
                    setResearchPrompt={setResearchPrompt}
                    setResearchProvider={setResearchProvider}
                    setResearchType={setResearchType}
                />
                <div className={styles.panel}>
                    <div className={styles.panelHeader}>
                        <h2>Lead Batch Status</h2>
                        <span className={tagClass(data.workspace.researchRuns[0]?.status || "hold")}>{data.workspace.researchRuns[0]?.status || "waiting"}</span>
                    </div>
                    {data.workspace.researchRuns[0] ? (
                        <div className={styles.statusList}>
                            <div className={styles.statusRow}><span>Query</span><span>{data.workspace.researchRuns[0].normalizedQuery}</span></div>
                            <div className={styles.statusRow}><span>Rows</span><span>{data.workspace.researchRuns[0].tableRowCount}</span></div>
                            <div className={styles.statusRow}><span>Pass</span><span>{data.workspace.researchRuns[0].passCount}</span></div>
                            <div className={styles.statusRow}><span>Unsure</span><span>{data.workspace.researchRuns[0].unsureCount}</span></div>
                            <div className={styles.statusRow}><span>Fail</span><span>{data.workspace.researchRuns[0].failCount}</span></div>
                        </div>
                    ) : <div className={styles.empty}>No market search has run yet.</div>}
                </div>
            </section>
            <section className={styles.stack}>
                <TodayLeadBatch data={data} mobileReadOnly={mobileReadOnly} onDraft={onDraft} onEvidence={onEvidence} onScore={onScore} saving={saving} />
            </section>
            <OperatingPanels data={data} />
        </>
    );
}

export default function SignalDeskWorkspace({ activeSection }: { activeSection: SignalDeskSection }) {
    const { data, error, loading, refresh, runAction, saving, updateKillSwitch } = useSignalDeskOverview(activeSection);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const basePath = useSignalDeskBasePath();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [sidebarShellExpanded, setSidebarShellExpanded] = useState(false);
    const [mobileReadOnly, setMobileReadOnly] = useState(false);
    const [policyName, setPolicyName] = useState("Public business research");
    const [policySourceType, setPolicySourceType] = useState("manual-research");
    const [policyProvider, setPolicyProvider] = useState("google-places");
    const [policyAllowContact, setPolicyAllowContact] = useState(false);
    const [policyAllowEvidence, setPolicyAllowEvidence] = useState(true);
    const [policyAllowPersonalization, setPolicyAllowPersonalization] = useState(false);
    const [policyCreateRetry, setPolicyCreateRetry] = useState<{ idempotencyKey: string; lastReviewedAt: string; requestKey: string } | null>(null);
    const [retentionDays, setRetentionDays] = useState(30);
    const [sourcePolicyId, setSourcePolicyId] = useState("");
    const [sourceName, setSourceName] = useState("Manual import");
    const [importRows, setImportRows] = useState("Demo Cafe,Cafe,Bengaluru,India,https://example.invalid,,,,,\nDemo QSR,QSR,Bengaluru,India,https://example.invalid,,,,,");
    const [importRetry, setImportRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [importValidationError, setImportValidationError] = useState<string | null>(null);
    const [selectedTargetId, setSelectedTargetId] = useState("");
    const [selectedOpportunityId, setSelectedOpportunityId] = useState("");
    const [manualContactRoute, setManualContactRoute] = useState<SignalDeskManualContactRoute>("email-export");
    const [manualContactResult, setManualContactResult] = useState<SignalDeskManualContactResult>("contacted");
    const [manualContactOccurredAt, setManualContactOccurredAt] = useState("");
    const [manualContactNote, setManualContactNote] = useState("");
    const [approvalRejectionReason, setApprovalRejectionReason] = useState<SignalDeskApprovalRejectionReason | "">("");
    const [approvalRejectionNote, setApprovalRejectionNote] = useState("");
    const [replyChannel, setReplyChannel] = useState("email");
    const [replyText, setReplyText] = useState("");
    const [replyRetry, setReplyRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [outcomeType, setOutcomeType] = useState("route_created");
    const [outcomeEvidenceRef, setOutcomeEvidenceRef] = useState("");
    const [outcomeOwnerQualifiedAt, setOutcomeOwnerQualifiedAt] = useState("");
    const [outcomeOwnerReviewedAt, setOutcomeOwnerReviewedAt] = useState("");
    const [outcomeSurfaces, setOutcomeSurfaces] = useState<string[]>([]);
    const [outcomeRetry, setOutcomeRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [demandSignalType, setDemandSignalType] = useState("link_click");
    const [demandSignalRetry, setDemandSignalRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [sourceProvider, setSourceProvider] = useState("google-places");
    const [sourceQuery, setSourceQuery] = useState("independent cafes, dessert shops, and QSRs with weak current-menu presence in Indiranagar and Koramangala");
    const [sourceCity, setSourceCity] = useState("Bengaluru");
    const [sourceCountry, setSourceCountry] = useState("India");
    const [sourceMaxResults, setSourceMaxResults] = useState(25);
    const [sourceProviderRetry, setSourceProviderRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [researchAgentRetry, setResearchAgentRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [aiTask, setAiTask] = useState("evidence");
    const [aiInstruction, setAiInstruction] = useState("");
    const [aiAssistRetry, setAiAssistRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [aiVolumeInstruction, setAiVolumeInstruction] = useState("");
    const [aiVolumeMaxCostUsd, setAiVolumeMaxCostUsd] = useState(2);
    const [aiVolumeTargetCount, setAiVolumeTargetCount] = useState(5);
    const [aiVolumeTasks, setAiVolumeTasks] = useState<SignalDeskAiVolumeTask[]>(["score", "evidence", "draft"]);
    const [aiVolumeRetryPayload, setAiVolumeRetryPayload] = useState<SignalDeskAiVolumeRetryPayload | null>(null);
    const [aiShadowReviewReason, setAiShadowReviewReason] = useState("");
    const [aiShadowReviewMinutes, setAiShadowReviewMinutes] = useState(1);
    const [channel, setChannel] = useState("whatsapp");
    const [channelWindowSource, setChannelWindowSource] = useState("inbound");
    const [channelWindowStatus, setChannelWindowStatus] = useState("open");
    const [channelWindowRetry, setChannelWindowRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [selectedWaterfallId, setSelectedWaterfallId] = useState("");
    const [providerEvaluationProvider, setProviderEvaluationProvider] = useState("google-places");
    const [providerEvaluationUse, setProviderEvaluationUse] = useState("discovery");
    const [pauseScope, setPauseScope] = useState<SignalDeskKillSwitchScope>("source-provider");
    const [sequencerProvider, setSequencerProvider] = useState("owned-email");
    const [senderDomain, setSenderDomain] = useState("pending");
    const [senderDomainRetry, setSenderDomainRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
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
    const [teamMemberId, setTeamMemberId] = useState("");
    const [teamMemberEmail, setTeamMemberEmail] = useState("");
    const [teamMemberName, setTeamMemberName] = useState("");
    const [teamMemberUserId, setTeamMemberUserId] = useState("");
    const [teamMemberRole, setTeamMemberRole] = useState<SignalDeskRole>("growth-manager");
    const [teamMemberActive, setTeamMemberActive] = useState(true);
    const [partnerName, setPartnerName] = useState("Menu photographer partner");
    const [partnerType, setPartnerType] = useState("menu-photographer");
    const [partnerChannel, setPartnerChannel] = useState("instagram");
    const [partnerGeography, setPartnerGeography] = useState("Bengaluru - Indiranagar and Koramangala");
    const [partnerSourceNotes, setPartnerSourceNotes] = useState("Audience includes restaurant owners and operators.");
    const [partnerScore, setPartnerScore] = useState(75);
    const [nicheName, setNicheName] = useState("Menu photographers");
    const [nicheAngle, setNicheAngle] = useState("Current-list proof through menu refresh partners.");
    const [nicheAttempts, setNicheAttempts] = useState(5);
    const [dealFeeUsd, setDealFeeUsd] = useState(0);
    const [dealDeliverables, setDealDeliverables] = useState(1);
    const [briefText, setBriefText] = useState("Show how a restaurant can keep a clean current menu online and invite owners to request a private MenuList preview.");
    const [deliverablePostUrl, setDeliverablePostUrl] = useState("");
    const [metricViews, setMetricViews] = useState(0);
    const [metricOwnerLeads, setMetricOwnerLeads] = useState(0);
    const [trustMetricsRetry, setTrustMetricsRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentSourceTitle, setContentSourceTitle] = useState("MenuList owned proof");
    const [contentSourceType, setContentSourceType] = useState<SignalDeskContentSourceType>("proof-page");
    const [contentSourceUrl, setContentSourceUrl] = useState("https://menulist.ai");
    const [contentSourceAudience, setContentSourceAudience] = useState<SignalDeskContentSourceSummary["defaultAudience"]>("restaurant-owner");
    const [contentSourceStatus, setContentSourceStatus] = useState<SignalDeskControlStatus>("active");
    const [contentSourceDefaultMarketPodId, setContentSourceDefaultMarketPodId] = useState("");
    const [selectedContentSourceId, setSelectedContentSourceId] = useState("");
    const [selectedContentAssetSourceId, setSelectedContentAssetSourceId] = useState("");
    const [selectedContentMarketPodId, setSelectedContentMarketPodId] = useState("");
    const [selectedContentCtaId, setSelectedContentCtaId] = useState("");
    const [contentSourceRetry, setContentSourceRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentAssetTitle, setContentAssetTitle] = useState("Current-list proof angle");
    const [contentAssetMessage, setContentAssetMessage] = useState("Restaurant owners need one clean current list customers can trust before they order, call, or visit.");
    const [contentAssetUrl, setContentAssetUrl] = useState("");
    const [contentAssetSourceType, setContentAssetSourceType] = useState<SignalDeskContentSourceType>("proof-page");
    const [contentAssetAudience, setContentAssetAudience] = useState<SignalDeskContentSourceSummary["defaultAudience"]>("restaurant-owner");
    const [contentAssetProofLevel, setContentAssetProofLevel] = useState("owned");
    const [contentAssetRetry, setContentAssetRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentAssetReviewRetry, setContentAssetReviewRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [proofPermissionEvidenceRef, setProofPermissionEvidenceRef] = useState("");
    const [proofPermissionExpiresAt, setProofPermissionExpiresAt] = useState("");
    const [proofPermissionScopes, setProofPermissionScopes] = useState<string[]>(["business-name", "before-after-screenshots"]);
    const [proofPermissionRetry, setProofPermissionRetry] = useState<{ grantedAt?: string; idempotencyKey: string; requestKey: string } | null>(null);
    const [selectedProofPermissionEditorId, setSelectedProofPermissionEditorId] = useState("");
    const [selectedContentAssetProofPermissionId, setSelectedContentAssetProofPermissionId] = useState("");
    const [selectedContentAssetId, setSelectedContentAssetId] = useState("");
    const [selectedContentDraftId, setSelectedContentDraftId] = useState("");
    const [contentDraftChannels, setContentDraftChannels] = useState<string[]>(["linkedin", "email", "partner-brief"]);
    const [contentScheduleAt, setContentScheduleAt] = useState("");
    const [contentScheduleRetry, setContentScheduleRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentReviewRetry, setContentReviewRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentDraftGenerationRetry, setContentDraftGenerationRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [contentPerformanceViews, setContentPerformanceViews] = useState(0);
    const [contentPerformanceClicks, setContentPerformanceClicks] = useState(0);
    const [contentPerformanceOwnerLeads, setContentPerformanceOwnerLeads] = useState(0);
    const [contentPerformanceSubmissions, setContentPerformanceSubmissions] = useState(0);
    const [contentPerformanceActivations, setContentPerformanceActivations] = useState(0);
    const [contentPerformanceChannel, setContentPerformanceChannel] = useState<SignalDeskContentChannel | "">("");
    const [contentPerformancePublicationUrl, setContentPerformancePublicationUrl] = useState("");
    const [contentPerformancePublishedAt, setContentPerformancePublishedAt] = useState("");
    const [contentPerformanceRetry, setContentPerformanceRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [enrichmentWaterfallRetry, setEnrichmentWaterfallRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [selectedGrowthMissionId, setSelectedGrowthMissionId] = useState("");
    const [missionDecisionNote, setMissionDecisionNote] = useState("");
    const [selectedExperimentCardId, setSelectedExperimentCardId] = useState("");
    const [selectedExperimentContentAssetId, setSelectedExperimentContentAssetId] = useState("");
    const [experimentHypothesis, setExperimentHypothesis] = useState("One narrow local restaurant pod will convert better when the ask is a private current-list preview.");
    const [experimentChannel, setExperimentChannel] = useState("manual");
    const [experimentTargetCount, setExperimentTargetCount] = useState(25);
    const [experimentStopRule, setExperimentStopRule] = useState("Stop if five owner conversations produce no accepted private preview, or if fewer than two of the first five accepted previews activate on two surfaces.");
    const [experimentExpectedOutcome, setExperimentExpectedOutcome] = useState("Three owner-reviewed two-surface activations within seven days, plus one permissioned proof asset.");
    const [experimentReadbackPlan, setExperimentReadbackPlan] = useState<ExperimentReadbackFormState>(createDefaultExperimentReadbackForm);
    const [experimentResultSummary, setExperimentResultSummary] = useState("");
    const [offerTitle, setOfferTitle] = useState("Current list upload");
    const [offerAsk, setOfferAsk] = useState("Upload the current menu or service list so MenuList can prepare a private preview for review before publishing.");
    const [offerSurface, setOfferSurface] = useState("upload");
    const [offerSegment, setOfferSegment] = useState("restaurant-owner");
    const [offerProofRule, setOfferProofRule] = useState("Use only when target evidence or owned proof shows a current-list gap.");
    const [offerBlockedClaims, setOfferBlockedClaims] = useState("Guaranteed sales,Guaranteed Google ranking,Fully automatic publishing");
    const [replyPlaybookTitle, setReplyPlaybookTitle] = useState("Send details");
    const [replyPlaybookIntent, setReplyPlaybookIntent] = useState("send-details");
    const [replyPlaybookReply, setReplyPlaybookReply] = useState("Thanks. The useful next step is a private MenuList preview. You can upload the current list and review it before anything goes live.");
    const [replyPlaybookNextRoute, setReplyPlaybookNextRoute] = useState("self-serve-preview");
    const [replyPlaybookEscalation, setReplyPlaybookEscalation] = useState(false);
    const [replyPlaybookSuppression, setReplyPlaybookSuppression] = useState(false);
    const [selectedSourceRunId, setSelectedSourceRunId] = useState("");
    const [researchPrompt, setResearchPrompt] = useState("Find cafes, dessert shops, and QSRs in Indiranagar and Koramangala Bengaluru with weak current-menu presence");
    const [researchProvider, setResearchProvider] = useState("google-places");
    const [researchType, setResearchType] = useState("business-prospect");
    const [researchMaxResults, setResearchMaxResults] = useState(25);
    const [marketPodReviewReason, setMarketPodReviewReason] = useState("Approved for one zero-external-spend Bengaluru trial with manual preparation and per-item review.");
    const [marketPodReviewRetry, setMarketPodReviewRetry] = useState<{ idempotencyKey: string; requestKey: string } | null>(null);
    const [revenueOrganizationName, setRevenueOrganizationName] = useState("");
    const [revenueLocationType, setRevenueLocationType] = useState("single-location");
    const [selectedCommercialOpportunityId, setSelectedCommercialOpportunityId] = useState("");
    const [selectedCommercialOfferId, setSelectedCommercialOfferId] = useState("");
    const [commercialOpportunityStage, setCommercialOpportunityStage] = useState("qualified");
    const [commercialOpportunityStatus, setCommercialOpportunityStatus] = useState("open");
    const [commercialOpportunityValueMinor, setCommercialOpportunityValueMinor] = useState(0);
    const [commercialOpportunityProbability, setCommercialOpportunityProbability] = useState(20);
    const [commercialOpportunityNextAction, setCommercialOpportunityNextAction] = useState("Confirm the standard offer and next customer action.");
    const [commercialOpportunityAttentionMinutes, setCommercialOpportunityAttentionMinutes] = useState(0);
    const [commercialOpportunityWinLossReason, setCommercialOpportunityWinLossReason] = useState("");
    const [commercialOfferName, setCommercialOfferName] = useState("MenuList standard package");
    const [commercialOfferVersion, setCommercialOfferVersion] = useState(1);
    const [commercialOfferCurrency, setCommercialOfferCurrency] = useState("INR");
    const [commercialOfferPriceMinor, setCommercialOfferPriceMinor] = useState(49900);
    const [commercialOfferCadence, setCommercialOfferCadence] = useState("monthly");
    const [commercialOfferDiscountBps, setCommercialOfferDiscountBps] = useState(0);
    const [commercialOfferContents, setCommercialOfferContents] = useState("Current official menu link,Owner review before publishing,QR and share support");
    const [commercialOfferEligibility, setCommercialOfferEligibility] = useState("Standard single-location MenuList path with no custom terms.");
    const [commercialOfferApprovalConditions, setCommercialOfferApprovalConditions] = useState("Any discount,Custom terms,Multi-location commercial request");
    const [operatingEnvelopeName, setOperatingEnvelopeName] = useState("First pod revenue envelope");
    const [operatingEnvelopeMode, setOperatingEnvelopeMode] = useState("recommendation-only");
    const [operatingEnvelopeChannel, setOperatingEnvelopeChannel] = useState("manual");
    const [operatingEnvelopeDailyCap, setOperatingEnvelopeDailyCap] = useState(10);
    const [operatingEnvelopeTotalCap, setOperatingEnvelopeTotalCap] = useState(50);
    const [operatingEnvelopeCostCap, setOperatingEnvelopeCostCap] = useState(50);
    const [operatingEnvelopeDays, setOperatingEnvelopeDays] = useState(7);
    const [operatingEnvelopeVersion, setOperatingEnvelopeVersion] = useState(1);

    useEffect(() => {
        const retryPayload = parseAiVolumeRetryPayload(window.localStorage.getItem(SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY));
        if (retryPayload) setAiVolumeRetryPayload(retryPayload);
        else window.localStorage.removeItem(SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY);
        const evaluate = () => {
            const mobileUserAgent = /\b(Android|iPhone|iPad|iPod|Mobile|Windows Phone)\b/i.test(window.navigator.userAgent || "");
            const mobileViewport = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 767px)").matches;
            setMobileReadOnly(mobileUserAgent || mobileViewport);
        };
        evaluate();
        window.addEventListener("resize", evaluate);
        return () => window.removeEventListener("resize", evaluate);
    }, []);

    const meta = SECTION_META[activeSection];
    const sidebarOffset = isCollapsed && !sidebarShellExpanded
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : SIGNALDESK_SIDEBAR_EXPANDED_WIDTH;
    const navItems = useMemo<DashboardSidebarShellItem[]>(() => PRIMARY_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const href = withSignalDeskBasePath(item.href, basePath);
        return {
            active: item.section === activeSection,
            icon: <Icon size={18} />,
            key: item.section,
            label: SECTION_META[item.section].label,
            onClick: () => {
                setMobileNavOpen(false);
                router.push(href);
            },
        };
    }), [activeSection, basePath, router]);
    const resolvedTargetId = data ? (selectedTargetId || firstTargetId(data)) : "";
    const resolvedTarget = data?.workspace.targets.find((target) => target.targetId === resolvedTargetId) || null;
    const resolvedTargetPolicy = data?.workspace.policies.find((policy) => policy.sourcePolicyId === resolvedTarget?.sourcePolicyId) || null;
    const resolvedTargetConversation = data?.workspace.conversations.find((conversation) => conversation.targetId === resolvedTargetId) || null;
    const allowedManualContactRoutes = new Set<SignalDeskManualContactRoute>();
    const policyExpiresAtMillis = resolvedTargetPolicy?.expiresAt
        ? new Date(resolvedTargetPolicy.expiresAt).getTime()
        : Number.NaN;
    const contactPolicyActive = Boolean(
        resolvedTarget
        && resolvedTarget.suppressionStatus === "clear"
        && (resolvedTargetPolicy?.status === "active" || resolvedTargetPolicy?.status === "approved")
        && resolvedTargetPolicy?.allowedUse.contact
        && resolvedTargetPolicy.retentionDays > 0
        && (resolvedTargetPolicy.policyState === "active"
            || resolvedTargetPolicy.policyState === "expires_soon"
            || (!resolvedTargetPolicy.policyState && Number.isFinite(policyExpiresAtMillis) && policyExpiresAtMillis > Date.now()))
    );
    if (contactPolicyActive && resolvedTargetConversation?.state === "exported") allowedManualContactRoutes.add("email-export");
    if (contactPolicyActive && resolvedTargetPolicy?.accessMethod === "permissioned-referral") allowedManualContactRoutes.add("partner-intro");
    const resolvedManualContactRoute = allowedManualContactRoutes.has(manualContactRoute)
        ? manualContactRoute
        : Array.from(allowedManualContactRoutes)[0] || null;
    const resolvedPolicyId = data ? (sourcePolicyId || firstPolicyId(data)) : "";
    const manualImportPolicies = data?.workspace.policies.filter(isUsableManualImportPolicy) || [];
    const resolvedManualImportPolicyId = data
        ? (manualImportPolicies.some((policy) => policy.sourcePolicyId === sourcePolicyId)
            ? sourcePolicyId
            : manualImportPolicies[0]?.sourcePolicyId || "")
        : "";
    const providerPolicies = data?.workspace.policies.filter((policy) => (
        isUsableProviderPolicy(policy, sourceProvider)
    )) || [];
    const resolvedProviderPolicyId = data
        ? (providerPolicies.some((policy) => policy.sourcePolicyId === sourcePolicyId)
            ? sourcePolicyId
            : providerPolicies[0]?.sourcePolicyId || "")
        : "";
    const resolvedResearchPolicyId = data
        ? data.workspace.policies.find((policy) => isUsableProviderPolicy(policy, researchProvider))?.sourcePolicyId || ""
        : "";
    const resolvedWaterfallId = data ? (selectedWaterfallId || firstWaterfallId(data)) : "";
    const resolvedMarketPodId = data ? firstMarketPodId(data) : "";
    const resolvedPartnerId = data ? firstPartnerId(data) : "";
    const resolvedNicheTestId = data ? firstNicheTestId(data) : "";
    const resolvedTrustDealId = data ? firstTrustDealId(data) : "";
    const resolvedTrustDeliverableId = data ? firstTrustDeliverableId(data) : "";
    const resolvedTrustBudgetId = data ? firstTrustBudgetId(data) : "";
    const resolvedCtaId = data ? firstCtaId(data) : "";
    const resolvedGrowthMissionId = data ? (selectedGrowthMissionId || firstGrowthMissionId(data)) : "";
    const resolvedExperimentCardId = data ? (selectedExperimentCardId || firstExperimentCardId(data)) : "";
    const resolvedOfferCtaId = data ? firstOfferCtaId(data) : "";
    const resolvedReplyPlaybookId = data ? firstReplyPlaybookId(data) : "";
    const resolvedSourceRunId = data ? (selectedSourceRunId || firstSourceRunId(data)) : "";
    const selectedContentSource = data?.workspace.contentSources.find((source) => source.contentSourceId === selectedContentSourceId) || null;
    const selectedContentAssetSource = data?.workspace.contentSources.find((source) => source.contentSourceId === selectedContentAssetSourceId) || null;
    const approvedContentMarketPods = data?.workspace.marketPods.filter((pod) => (
        pod.status === "active" && pod.reviewDecision === "approved" && Boolean(pod.approvedBy)
    )) || [];
    const resolvedContentMarketPodId = approvedContentMarketPods.some((pod) => pod.marketPodId === selectedContentMarketPodId)
        ? selectedContentMarketPodId
        : "";
    const selectedContentAssetSourceUsable = Boolean(
        selectedContentAssetSource
        && selectedContentAssetSource.status === "active"
        && (!selectedContentAssetSource.defaultMarketPodId
            || approvedContentMarketPods.some((pod) => pod.marketPodId === selectedContentAssetSource.defaultMarketPodId))
    );
    const selectedContentAsset = data?.workspace.contentAssets.find((asset) => asset.contentAssetId === selectedContentAssetId) || null;
    const resolvedContentAssetId = selectedContentAsset?.contentAssetId || "";
    const contentDraftsForSelectedAsset = data?.workspace.contentDistributionDrafts.filter((draft) => (
        draft.contentAssetId === resolvedContentAssetId
    )) || [];
    const selectedProofPermissionEditor = data?.workspace.proofPermissions.find((permission) => (
        permission.proofPermissionId === selectedProofPermissionEditorId
    )) || null;
    const resolvedProofPermissionEditorId = selectedProofPermissionEditor?.proofPermissionId || "";
    const selectedContentAssetProofPermission = data?.workspace.proofPermissions.find((permission) => (
        permission.proofPermissionId === selectedContentAssetProofPermissionId
        && isProofPermissionCurrentlyActive(permission)
        && permission.scopes.some((scope) => SIGNALDESK_PUBLIC_PROOF_SCOPES.has(scope))
    )) || null;
    const resolvedContentAssetProofPermissionId = selectedContentAssetProofPermission?.proofPermissionId || "";
    const resolvedContentAssetPublicProofScopes = (selectedContentAssetProofPermission?.scopes || []).filter((scope) => (
        SIGNALDESK_PUBLIC_PROOF_SCOPES.has(scope)
    ));
    const resolvedContentDraftId = contentDraftsForSelectedAsset.some((draft) => draft.contentDraftId === selectedContentDraftId)
        ? selectedContentDraftId
        : "";
    const contentPerformanceHasObservedMetrics = (
        contentPerformanceViews
        + contentPerformanceClicks
        + contentPerformanceOwnerLeads
        + contentPerformanceSubmissions
        + contentPerformanceActivations
    ) > 0;
    const contentPerformanceHasPublicationEvidence = Boolean(
        contentPerformancePublicationUrl.trim() && contentPerformancePublishedAt.trim()
    );
    const contentPerformancePublicationIncomplete = (
        Boolean(contentPerformancePublicationUrl.trim()) !== Boolean(contentPerformancePublishedAt.trim())
        || (contentPerformanceHasObservedMetrics && !contentPerformanceHasPublicationEvidence)
    );
    const selectedContentPerformanceDraft = contentDraftsForSelectedAsset.find((draft) => (
        draft.contentDraftId === resolvedContentDraftId
    )) || null;
    const contentPerformanceDraftEligible = Boolean(
        selectedContentPerformanceDraft
        && selectedContentPerformanceDraft.approvalStatus === "approved"
        && ["approved", "queued", "published"].includes(selectedContentPerformanceDraft.status)
    );
    const resolvedContentPerformanceChannel = selectedContentPerformanceDraft?.channel || contentPerformanceChannel;
    const selectedExperimentContentAsset = data?.workspace.contentAssets.find((asset) => (
        asset.contentAssetId === selectedExperimentContentAssetId
    )) || null;
    const resolvedSenderDomainId = data ? firstReadySenderDomainId(data) : "";
    const resolvedCommercialOfferId = data ? (selectedCommercialOfferId || firstCommercialOfferId(data)) : "";
    const resolvedCommercialOpportunityId = data ? (selectedCommercialOpportunityId || firstCommercialOpportunityId(data)) : "";
    const resolvedRevenueMarketPodId = data ? firstActiveMarketPodId(data) : "";
    const resolvedRevenueBudgetPolicyId = data ? firstRevenueBudgetPolicyId(data, resolvedRevenueMarketPodId) : "";
    const resolvedRevenueTemplateId = data ? firstActiveTemplateId(data) : "";
    const selectedOpportunity = data?.workspace.activationOpportunities.find((opportunity) => opportunity.activationOpportunityId === selectedOpportunityId) || null;
    const globalPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === "global-outbound" && item.status === "active"));
    const scopedPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === pauseScope && item.status === "active"));
    const canPause = Boolean(data?.access.permissions.includes("kill-switch.activate"));
    const canResume = Boolean(data?.access.permissions.includes("kill-switch.deactivate"));
    const canConfigureSignalDesk = Boolean(data?.access.permissions.includes("signaldesk.configure"));
    const canReviewTargets = Boolean(data?.access.permissions.includes("target.review"));
    const canApproveContent = Boolean(data?.access.permissions.includes("draft.approve"));
    const canApproveMarketPod = Boolean(data?.access.role === "founder-admin" && data.access.permissions.includes("signaldesk.configure"));
    const canReviewAiShadow = Boolean(data?.access.role === "founder-admin" && canConfigureSignalDesk && !mobileReadOnly);
    const canRunAiVolume = Boolean(data?.access.role === "founder-admin" && canConfigureSignalDesk && !mobileReadOnly);
    const aiVolumeRetryActive = Boolean(aiVolumeRetryPayload);
    const actionDisabled = saving || mobileReadOnly;
    const experimentActionDisabled = actionDisabled || !canReviewTargets;
    const experimentReviewDisabled = experimentActionDisabled || !resolvedExperimentCardId || experimentResultSummary.trim().length < 2;
    const globalPauseDisabled = saving || (mobileReadOnly
        ? globalPauseActive || !canPause
        : (!globalPauseActive && !canPause) || (globalPauseActive && !canResume));
    const scopedPauseDisabled = saving || (mobileReadOnly
        ? scopedPauseActive || !canPause
        : (!scopedPauseActive && !canPause) || (scopedPauseActive && !canResume));
    const activationOutcomeIncomplete = outcomeType === "two_surface_activation" && (
        !outcomeOwnerQualifiedAt.trim()
        || !outcomeOwnerReviewedAt.trim()
        || new Set(outcomeSurfaces).size < 2
    );
    const manualOutcomeIncomplete = !resolvedTargetId
        || !outcomeEvidenceRef.trim()
        || activationOutcomeIncomplete;
    const manualContactIncomplete = !resolvedTarget
        || !resolvedTargetPolicy
        || !resolvedManualContactRoute
        || (manualContactResult === "introduced" && resolvedManualContactRoute !== "partner-intro");

    const pendingApproval = useMemo(
        () => data?.workspace.approvals.find((item) => item.status === "pending") || null,
        [data?.workspace.approvals],
    );
    const approvedApproval = useMemo(
        () => data?.workspace.approvals.find((item) => item.status === "approved") || null,
        [data?.workspace.approvals],
    );

    const handlePauseToggle = () => {
        if (mobileReadOnly && globalPauseActive) return;
        void updateKillSwitch({
            reason: globalPauseActive ? "Control room cleared global outbound pause." : "Control room activated global outbound pause.",
            scope: "global-outbound",
            status: globalPauseActive ? "inactive" : "active",
        });
    };

    const handleScopedPauseToggle = () => {
        if (mobileReadOnly && scopedPauseActive) return;
        void updateKillSwitch({
            reason: scopedPauseActive ? `Control room cleared ${pauseScope} pause.` : `Control room activated ${pauseScope} pause.`,
            scope: pauseScope,
            status: scopedPauseActive ? "inactive" : "active",
        });
    };

    const handleSeed = () => {
        void runAction("seed-defaults");
    };

    const handlePolicyCreate = async (event: FormEvent) => {
        event.preventDefault();
        const baseAllowedFields = ["displayName", "category", "city", "country", "currentListUrl", "website", "notes"];
        const sourceAllowedFields = policySourceType === "provider"
            ? [...baseAllowedFields, "providerRecordId", "providerRecordUrl"]
            : baseAllowedFields;
        const contactFields = ["email", "phone", "instagram"];
        const requestKey = JSON.stringify({
            allowContact: policyAllowContact,
            allowEvidence: policyAllowEvidence,
            allowPersonalization: policyAllowPersonalization,
            name: policyName.trim(),
            provider: policySourceType === "provider" ? policyProvider : null,
            retentionDays,
            sourceType: policySourceType,
        });
        const retry = policyCreateRetry?.requestKey === requestKey
            ? policyCreateRetry
            : {
                idempotencyKey: globalThis.crypto.randomUUID(),
                lastReviewedAt: new Date().toISOString(),
                requestKey,
            };
        setPolicyCreateRetry(retry);
        const expiresAt = new Date(
            new Date(retry.lastReviewedAt).getTime() + retentionDays * 24 * 60 * 60 * 1_000,
        ).toISOString();
        const result = await runAction("create-source-policy", {
            accessMethod: policyAllowContact
                ? "permissioned-referral"
                : policySourceType === "provider"
                    ? "licensed-api"
                    : "manual-public-research",
            allowContact: policyAllowContact,
            allowEvidence: policyAllowEvidence,
            allowPersonalization: policyAllowPersonalization,
            allowedContactChannels: policyAllowContact ? ["email", "manual"] : [],
            allowedFields: policyAllowContact ? [...sourceAllowedFields, ...contactFields] : sourceAllowedFields,
            attributionRequirements: ["Keep source policy, source run, and source reference attached to evidence."],
            blockedFields: policyAllowContact ? ["personal-profile", "sensitive-attribute"] : contactFields,
            expiresAt,
            idempotencyKey: retry.idempotencyKey,
            lastReviewedAt: retry.lastReviewedAt,
            name: policyName,
            notes: policyAllowContact
                ? "Contact use is limited to a permissioned manual introduction or referral; public availability alone is not permission."
                : "Candidate discovery and evidence review only; contact fields, personalization, export, and send remain blocked.",
            policyOwner: data?.access.userId || "founder-admin",
            prohibitedUses: policyAllowContact
                ? ["cold WhatsApp", "cold social DM", "unapproved provider send", "proof use without permission"]
                : ["contact", "personalization", "provider send", "raw provider payload storage"],
            provider: policySourceType === "provider" ? policyProvider : undefined,
            rawPayloadPolicy: "never-store",
            refreshMethod: policySourceType === "provider" ? "provider-refresh" : "manual-review",
            retentionDays,
            sourceType: policySourceType,
            termsVersion: "internal-source-rights-v1",
        });
        if (result) setPolicyCreateRetry(null);
    };

    const handlePolicySourceTypeChange = (sourceType: string) => {
        setPolicySourceType(sourceType);
        if (sourceType === "provider") {
            setPolicyAllowContact(false);
            setPolicyAllowEvidence(true);
            setPolicyAllowPersonalization(false);
        }
    };

    const handleImport = async (event: FormEvent) => {
        event.preventDefault();
        let rows: ReturnType<typeof parseSignalDeskTargetImportCsv>;
        try {
            rows = parseSignalDeskTargetImportCsv(importRows);
            setImportValidationError(null);
        } catch (parseError) {
            const message = parseError instanceof Error && parseError.message.startsWith("SIGNALDESK_IMPORT_CSV_INVALID:")
                ? parseError.message.slice("SIGNALDESK_IMPORT_CSV_INVALID:".length)
                : "The import could not be read. Check the CSV rows and try again.";
            setImportValidationError(message);
            return;
        }
        const requestKey = JSON.stringify({ rows, sourceName: sourceName.trim(), sourcePolicyId: resolvedManualImportPolicyId });
        const retry = importRetry?.requestKey === requestKey
            ? importRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setImportRetry(retry);
        const result = await runAction("import-targets", {
            idempotencyKey: retry.idempotencyKey,
            rows,
            sourceName,
            sourcePolicyId: resolvedManualImportPolicyId,
        });
        if (result) setImportRetry(null);
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
            reason: status === "approved" ? "Approved from control room." : approvalRejectionNote || undefined,
            rejectionReason: status === "rejected" ? approvalRejectionReason || undefined : undefined,
            status,
        });
    };

    const exportMessage = (approvalId: string) => {
        void runAction("export-message", { approvalId });
    };

    const recordManualContact = (event: FormEvent) => {
        event.preventDefault();
        if (!resolvedTarget || !resolvedTargetPolicy || !resolvedManualContactRoute) return;
        const occurredAtDate = manualContactOccurredAt
            ? new Date(manualContactOccurredAt)
            : new Date();
        if (Number.isNaN(occurredAtDate.getTime())) return;
        const occurredAt = occurredAtDate.toISOString();
        void runAction("record-manual-contact", {
            idempotencyKey: `manual:${resolvedTarget.targetId}:${resolvedManualContactRoute}:${manualContactResult}:${occurredAt.slice(0, 16)}`,
            note: manualContactNote || undefined,
            occurredAt,
            result: manualContactResult,
            route: resolvedManualContactRoute,
            sourcePolicyId: resolvedTargetPolicy.sourcePolicyId,
            targetId: resolvedTarget.targetId,
        });
    };

    const captureReply = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({
            channel: replyChannel,
            message: replyText.trim(),
            targetId: resolvedTargetId,
        });
        const retry = replyRetry?.requestKey === requestKey
            ? replyRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setReplyRetry(retry);
        const result = await runAction("capture-reply", {
            channel: replyChannel,
            idempotencyKey: retry.idempotencyKey,
            message: replyText,
            targetId: resolvedTargetId,
        });
        if (result) setReplyRetry(null);
    };

    const recordOutcome = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({
            evidenceRef: outcomeEvidenceRef.trim(),
            outcomeType,
            ownerQualifiedAt: outcomeOwnerQualifiedAt,
            ownerReviewedAt: outcomeOwnerReviewedAt,
            surfaces: [...outcomeSurfaces].sort(),
            targetId: resolvedTargetId,
        });
        const retry = outcomeRetry?.requestKey === requestKey
            ? outcomeRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setOutcomeRetry(retry);
        const result = await runAction("record-outcome", {
            channel: "manual",
            evidenceRef: outcomeEvidenceRef,
            idempotencyKey: retry.idempotencyKey,
            outcomeType,
            ownerQualifiedAt: outcomeOwnerQualifiedAt || undefined,
            ownerReviewedAt: outcomeOwnerReviewedAt || undefined,
            source: "manual",
            surfaces: outcomeSurfaces,
            targetId: resolvedTargetId,
        });
        if (result) setOutcomeRetry(null);
    };

    const toggleOutcomeSurface = (surface: string) => {
        setOutcomeSurfaces((current) => current.includes(surface)
            ? current.filter((item) => item !== surface)
            : [...current, surface]);
    };

    const captureDemand = async (event: FormEvent) => {
        event.preventDefault();
        const target = data?.workspace.targets.find((item: SignalDeskTargetSummary) => item.targetId === resolvedTargetId);
        const requestKey = JSON.stringify({ signalType: demandSignalType, targetId: resolvedTargetId });
        const retry = demandSignalRetry?.requestKey === requestKey
            ? demandSignalRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setDemandSignalRetry(retry);
        const result = await runAction("capture-demand-signal", {
            idempotencyKey: retry.idempotencyKey,
            signalType: demandSignalType,
            sourceSurface: "manual",
            targetId: resolvedTargetId || undefined,
            targetName: target?.displayName,
        });
        if (result) setDemandSignalRetry(null);
    };

    const recommendMarketPodPlan = (marketPodId?: string) => {
        void runAction("recommend-market-pod-plan", { marketPodId });
    };

    const reviewMarketPod = async (marketPodId: string, decision: "approved" | "held" | "rejected") => {
        const requestKey = JSON.stringify({ decision, marketPodId, reason: marketPodReviewReason });
        const retry = marketPodReviewRetry?.requestKey === requestKey
            ? marketPodReviewRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setMarketPodReviewRetry(retry);
        const result = await runAction("review-market-pod", {
            decision,
            idempotencyKey: retry.idempotencyKey,
            marketPodId,
            reason: marketPodReviewReason,
        });
        if (result) setMarketPodReviewRetry(null);
    };

    const createWeeklyStrategistMemo = () => {
        void runAction("create-weekly-strategist-memo");
    };

    const runSourceProvider = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({
            city: sourceCity.trim(),
            country: sourceCountry.trim(),
            maxResults: sourceMaxResults,
            provider: sourceProvider,
            query: sourceQuery.trim(),
            sourcePolicyId: resolvedProviderPolicyId,
        });
        const retry = sourceProviderRetry?.requestKey === requestKey
            ? sourceProviderRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setSourceProviderRetry(retry);
        const result = await runAction("run-source-provider", {
            city: sourceCity,
            country: sourceCountry,
            idempotencyKey: retry.idempotencyKey,
            maxResults: sourceMaxResults,
            provider: sourceProvider,
            query: sourceQuery,
            sourcePolicyId: resolvedProviderPolicyId,
        });
        if (result) setSourceProviderRetry(null);
    };

    const runAiAssist = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({ instruction: aiInstruction.trim(), targetId: resolvedTargetId, task: aiTask });
        const retry = aiAssistRetry?.requestKey === requestKey
            ? aiAssistRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setAiAssistRetry(retry);
        const result = await runAction("run-ai-assist", {
            idempotencyKey: retry.idempotencyKey,
            instruction: aiInstruction || undefined,
            targetId: resolvedTargetId,
            task: aiTask,
        });
        if (result) setAiAssistRetry(null);
    };

    const toggleAiVolumeTask = (task: SignalDeskAiVolumeTask, checked: boolean) => {
        setAiVolumeTasks((current) => checked
            ? Array.from(new Set([...current, task])).slice(0, 3)
            : current.filter((item) => item !== task));
    };

    const clearAiVolumeRetry = () => {
        setAiVolumeRetryPayload(null);
        window.localStorage.removeItem(SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY);
    };

    const runAiVolumeBatch = async (event: FormEvent) => {
        event.preventDefault();
        if (!data) return;
        const payload: SignalDeskAiVolumeRetryPayload = aiVolumeRetryPayload || {
            idempotencyKey: `ai-volume-${Date.now()}`,
            instruction: aiVolumeInstruction || undefined,
            maxEstimatedCostUsd: aiVolumeMaxCostUsd,
            targetIds: data.workspace.targets.slice(0, aiVolumeTargetCount).map((target) => target.targetId),
            tasks: aiVolumeTasks,
        };
        setAiVolumeRetryPayload(payload);
        window.localStorage.setItem(SIGNALDESK_AI_VOLUME_RETRY_STORAGE_KEY, JSON.stringify(payload));
        const result = await runAction<SignalDeskAiVolumeRunSummary>("run-ai-volume-batch", payload);
        if (result && result.status !== "running") clearAiVolumeRetry();
    };

    const reviewAiShadowRun = (aiRunId: string, decision: SignalDeskAiShadowReviewDecision) => {
        void runAction("review-ai-shadow-run", {
            aiRunId,
            decision,
            founderAttentionMinutes: aiShadowReviewMinutes,
            reason: aiShadowReviewReason || (decision === "accepted" ? "Accepted unchanged." : undefined),
        });
    };

    const runEnrichmentWaterfall = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({ targetId: resolvedTargetId, waterfallId: resolvedWaterfallId });
        const retry = enrichmentWaterfallRetry?.requestKey === requestKey ? enrichmentWaterfallRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setEnrichmentWaterfallRetry(retry);
        const result = await runAction("run-enrichment-waterfall", {
            idempotencyKey: retry.idempotencyKey,
            targetId: resolvedTargetId,
            waterfallId: resolvedWaterfallId,
        });
        if (result) setEnrichmentWaterfallRetry(null);
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

    const approveFhrsFhisProvider = () => {
        void runAction("upsert-provider-account", {
            credentialState: "not_required",
            dailyBudgetUsd: 0,
            monthlyBudgetUsd: 0,
            ownerApproved: true,
            perRunBudgetUsd: 0,
            provider: "fhrs-fhis",
            status: "approved",
            use: "discovery",
        });
    };

    const approveZeroSpendTrustPartnerTest = () => {
        void runAction("upsert-budget-policy", {
            dailyBudgetUsd: 0,
            monthlyBudgetUsd: 0,
            name: "Zero-spend trust partner learning test",
            perRunBudgetUsd: 0,
            scope: "trust-partner",
            scopeId: "first_partner_test",
            status: "active",
        });
    };

    const holdSenderDomain = async (event: FormEvent) => {
        event.preventDefault();
        const request = {
            authenticationState: "missing",
            bounceRate: 0,
            brandRisk: "medium",
            complaintRate: 0,
            domain: senderDomain.trim().toLowerCase().replace(/\.$/, ""),
            provider: "owned-email",
            status: "hold",
            unsubscribeReady: false,
            volumeRampState: "not_started",
        };
        const requestKey = JSON.stringify(request);
        const retry = senderDomainRetry?.requestKey === requestKey
            ? senderDomainRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setSenderDomainRetry(retry);
        const result = await runAction("upsert-sender-domain", { ...request, idempotencyKey: retry.idempotencyKey });
        if (result) setSenderDomainRetry(null);
    };

    const readySenderDomain = async () => {
        const request = {
            authenticationState: "ready",
            bounceRate: 0,
            brandRisk: "low",
            complaintRate: 0,
            domain: senderDomain.trim().toLowerCase().replace(/\.$/, ""),
            provider: "owned-email",
            status: "active",
            unsubscribeReady: true,
            volumeRampState: "low_volume",
        };
        const requestKey = JSON.stringify(request);
        const retry = senderDomainRetry?.requestKey === requestKey
            ? senderDomainRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setSenderDomainRetry(retry);
        const result = await runAction("upsert-sender-domain", { ...request, idempotencyKey: retry.idempotencyKey });
        if (result) setSenderDomainRetry(null);
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

    const resetTeamMemberForm = () => {
        setTeamMemberId("");
        setTeamMemberEmail("");
        setTeamMemberName("");
        setTeamMemberUserId("");
        setTeamMemberRole("growth-manager");
        setTeamMemberActive(true);
    };

    const editTeamMember = (member: SignalDeskTeamMemberSummary) => {
        setTeamMemberId(member.teamMemberId);
        setTeamMemberEmail(member.email || member.emailLower || "");
        setTeamMemberName(member.name || "");
        setTeamMemberUserId(member.userId || "");
        setTeamMemberRole(member.role);
        setTeamMemberActive(member.active);
    };

    const upsertTeamMember = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-team-member", {
            active: teamMemberActive,
            email: teamMemberEmail,
            name: teamMemberName || undefined,
            role: teamMemberRole,
            teamMemberId: teamMemberId || undefined,
            userId: teamMemberUserId || undefined,
        }).then((result) => {
            if (result) resetTeamMemberForm();
        });
    };

    const toggleTeamMemberActive = (member: SignalDeskTeamMemberSummary, active: boolean) => {
        void runAction("upsert-team-member", {
            active,
            email: member.email || member.emailLower,
            name: member.name || undefined,
            role: member.role,
            teamMemberId: member.teamMemberId,
            userId: member.userId || undefined,
        });
    };

    const upsertChannelWindow = async () => {
        const requestKey = JSON.stringify({ channel, source: channelWindowSource, status: channelWindowStatus, targetId: resolvedTargetId });
        const retry = channelWindowRetry?.requestKey === requestKey ? channelWindowRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setChannelWindowRetry(retry);
        const result = await runAction("upsert-channel-window-state", {
            channel,
            idempotencyKey: retry.idempotencyKey,
            source: channelWindowSource,
            status: channelWindowStatus,
            targetId: resolvedTargetId || undefined,
        });
        if (result) setChannelWindowRetry(null);
    };

    const refreshProviderRetention = (providerSourceRetentionId: string) => {
        void runAction("refresh-provider-source-retention", {
            notes: "Manual refresh state update from SignalDesk.",
            providerSourceRetentionId,
            status: "refreshed",
        });
    };

    const createProviderEvaluation = () => {
        void runAction("create-provider-evaluation", {
            provider: providerEvaluationProvider,
            use: providerEvaluationUse,
        });
    };

    const upsertTrustPartnerProfile = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-trust-partner-profile", {
            audienceFitScore: partnerScore,
            baselineReachScore: partnerScore,
            believableUsageScore: partnerScore,
            channel: partnerChannel,
            commentQualityScore: partnerScore,
            displayName: partnerName,
            geography: partnerGeography || undefined,
            partnerType,
            sourceNotes: partnerSourceNotes,
            trustFeelScore: partnerScore,
        });
    };

    const createTrustPartnerNicheTest = () => {
        void runAction("create-trust-partner-niche-test", {
            angle: nicheAngle,
            intendedAttempts: nicheAttempts,
            marketPodId: resolvedMarketPodId || undefined,
            nicheName,
            partnerIds: resolvedPartnerId ? [resolvedPartnerId] : [],
        });
    };

    const reviewTrustPartnerDeal = () => {
        void runAction("review-trust-partner-deal", {
            approvalStatus: "approved",
            budgetPolicyId: resolvedTrustBudgetId || undefined,
            deliverableCount: dealDeliverables,
            flatFeeUsd: dealFeeUsd,
            founderApproved: true,
            nicheTestId: resolvedNicheTestId || undefined,
            partnerId: resolvedPartnerId,
            pricingModel: "flat-fee",
        });
    };

    const createTrustPartnerBrief = () => {
        void runAction("create-trust-partner-brief", {
            approvedClaims: [
                "MenuList helps restaurants keep a clean current list online.",
                "Owners can request a private preview before changing anything public.",
            ],
            bannedClaims: [
                "Do not claim Meta, Google, POS, or delivery-platform partnership.",
                "Do not promise sales lift or guaranteed ranking.",
            ],
            ctaId: resolvedCtaId || undefined,
            dealId: resolvedTrustDealId || undefined,
            disclosureText: "Mention clearly if the post is paid, sponsored, or incentivized.",
            onePageBrief: briefText,
            partnerId: resolvedPartnerId,
        });
    };

    const recordTrustPartnerDeliverable = () => {
        void runAction("record-trust-partner-deliverable", {
            dealId: resolvedTrustDealId || undefined,
            disclosurePresent: true,
            partnerId: resolvedPartnerId,
            postUrl: deliverablePostUrl || undefined,
            reviewState: deliverablePostUrl ? "approved" : "pending",
            status: deliverablePostUrl ? "live" : "scheduled",
        });
    };

    const recordTrustPartnerMetrics = async () => {
        const requestKey = JSON.stringify({ deliverableId: resolvedTrustDeliverableId, ownerLeads: metricOwnerLeads, partnerId: resolvedPartnerId, views: metricViews });
        const retry = trustMetricsRetry?.requestKey === requestKey ? trustMetricsRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setTrustMetricsRetry(retry);
        const result = await runAction("record-trust-partner-metrics", {
            activations: 0,
            commentQuality: metricOwnerLeads ? "medium" : "low",
            comments: 0,
            currentListSubmissions: 0,
            deliverableId: resolvedTrustDeliverableId || undefined,
            idempotencyKey: retry.idempotencyKey,
            ownerLeads: metricOwnerLeads,
            partnerId: resolvedPartnerId,
            views: metricViews,
        });
        if (result) setTrustMetricsRetry(null);
    };

    const reviewTrustPartnerRenewal = () => {
        void runAction("review-trust-partner-renewal", {
            evidenceSummary: metricOwnerLeads ? "Owner-quality lead signal recorded." : "No owner-quality outcome recorded yet.",
            nicheTestId: resolvedNicheTestId || undefined,
            ownerDecision: "pending",
            partnerId: resolvedPartnerId,
            recommendation: metricOwnerLeads ? "retest" : "hold",
        });
    };

    const toggleContentDraftChannel = (channelValue: string) => {
        setContentDraftChannels((current) => (
            current.includes(channelValue)
                ? current.filter((item) => item !== channelValue)
                : [...current, channelValue]
        ));
    };

    const resetContentPerformanceInput = () => {
        setContentPerformanceViews(0);
        setContentPerformanceClicks(0);
        setContentPerformanceOwnerLeads(0);
        setContentPerformanceSubmissions(0);
        setContentPerformanceActivations(0);
        setContentPerformanceChannel("");
        setContentPerformancePublicationUrl("");
        setContentPerformancePublishedAt("");
        setContentPerformanceRetry(null);
    };

    const selectContentAsset = (contentAssetId: string) => {
        resetContentPerformanceInput();
        setSelectedContentAssetId(contentAssetId);
        setSelectedContentDraftId("");
    };

    const selectContentDraft = (contentDraftId: string) => {
        const draft = data?.workspace.contentDistributionDrafts.find((item) => item.contentDraftId === contentDraftId);
        resetContentPerformanceInput();
        if (!draft) {
            setSelectedContentDraftId("");
            return;
        }
        setSelectedContentAssetId(draft.contentAssetId);
        setSelectedContentDraftId(draft.contentDraftId);
    };

    const selectContentPerformanceChannel = (channelValue: SignalDeskContentChannel | "") => {
        resetContentPerformanceInput();
        setContentPerformanceChannel(channelValue);
    };

    const selectContentSourceForEdit = (contentSourceId: string) => {
        setSelectedContentSourceId(contentSourceId);
        setContentSourceRetry(null);
        const source = data?.workspace.contentSources.find((item) => item.contentSourceId === contentSourceId);
        if (!source) {
            setContentSourceTitle("MenuList owned proof");
            setContentSourceType("proof-page");
            setContentSourceUrl("https://menulist.ai");
            setContentSourceAudience("restaurant-owner");
            setContentSourceStatus("active");
            setContentSourceDefaultMarketPodId("");
            return;
        }
        setContentSourceTitle(source.title);
        setContentSourceType(source.sourceType);
        setContentSourceUrl(source.sourceUrl || "");
        setContentSourceAudience(source.defaultAudience);
        setContentSourceStatus(source.status);
        setContentSourceDefaultMarketPodId(source.defaultMarketPodId || "");
    };

    const upsertContentSource = async (event: FormEvent) => {
        event.preventDefault();
        const request = {
            contentSourceId: selectedContentSourceId || undefined,
            defaultAudience: contentSourceAudience,
            defaultMarketPodId: contentSourceDefaultMarketPodId || null,
            sourceType: contentSourceType,
            sourceUrl: contentSourceUrl || undefined,
            status: contentSourceStatus,
            title: contentSourceTitle,
        };
        const requestKey = JSON.stringify(request);
        const retry = contentSourceRetry?.requestKey === requestKey ? contentSourceRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentSourceRetry(retry);
        const result = await runAction<SignalDeskContentSourceSummary>("upsert-content-source", { ...request, idempotencyKey: retry.idempotencyKey });
        if (result?.contentSourceId) {
            setContentSourceRetry(null);
            setSelectedContentSourceId(result.contentSourceId);
        }
    };

    const createContentAsset = async (event: FormEvent) => {
        event.preventDefault();
        const proofScopes = contentAssetProofLevel === "customer-proof"
            ? Array.from(new Set(resolvedContentAssetPublicProofScopes)).sort()
            : [];
        const request = {
            canonicalMessage: contentAssetMessage,
            ctaId: selectedContentCtaId || undefined,
            marketPodId: selectedContentAssetSource ? undefined : resolvedContentMarketPodId || undefined,
            primaryAudience: selectedContentAssetSource?.defaultAudience || contentAssetAudience,
            proofLevel: contentAssetProofLevel,
            proofPermissionId: contentAssetProofLevel === "customer-proof" ? resolvedContentAssetProofPermissionId || undefined : undefined,
            proofScopes,
            riskNotes: contentAssetProofLevel === "internal-note" ? ["Internal note needs proof before broad distribution."] : [],
            sourceId: selectedContentAssetSource?.contentSourceId || undefined,
            sourceNotes: "Prepared from internal owner-approved MenuList proof.",
            sourceType: selectedContentAssetSource?.sourceType || contentAssetSourceType,
            sourceUrl: selectedContentAssetSource ? selectedContentAssetSource.sourceUrl || undefined : contentAssetUrl || undefined,
            title: contentAssetTitle,
        };
        const requestKey = JSON.stringify(request);
        const retry = contentAssetRetry?.requestKey === requestKey ? contentAssetRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentAssetRetry(retry);
        const result = await runAction("create-content-asset", { ...request, idempotencyKey: retry.idempotencyKey });
        if (result) setContentAssetRetry(null);
    };

    const reviewContentAsset = async (contentAssetId: string, status: "ready" | "hold" | "archived") => {
        const reason = status === "ready"
            ? "Current source, proof, CTA, and market-pod authority rechecked."
            : status === "archived"
                ? "Archived by founder review."
                : "Held by owner review.";
        const requestKey = JSON.stringify({ contentAssetId, reason, status });
        const retry = contentAssetReviewRetry?.requestKey === requestKey
            ? contentAssetReviewRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentAssetReviewRetry(retry);
        const result = await runAction("review-content-asset", {
            contentAssetId,
            idempotencyKey: retry.idempotencyKey,
            reason,
            status,
        });
        if (result) setContentAssetReviewRetry(null);
    };

    const toggleProofPermissionScope = (scope: string) => {
        setProofPermissionScopes((current) => current.includes(scope)
            ? current.filter((item) => item !== scope)
            : [...current, scope]);
    };

    const selectProofPermissionForEdit = (proofPermissionId: string) => {
        setSelectedProofPermissionEditorId(proofPermissionId);
        setProofPermissionRetry(null);
        const permission = data?.workspace.proofPermissions.find((item) => item.proofPermissionId === proofPermissionId);
        if (!permission) {
            setProofPermissionEvidenceRef("");
            setProofPermissionExpiresAt("");
            setProofPermissionScopes(["business-name", "before-after-screenshots"]);
            return;
        }
        setSelectedTargetId(permission.targetId);
        setProofPermissionEvidenceRef(permission.evidenceRef);
        setProofPermissionExpiresAt(permission.expiresAt || "");
        setProofPermissionScopes(permission.scopes);
    };

    const upsertProofPermission = async (event: FormEvent) => {
        event.preventDefault();
        const scopes = Array.from(new Set(proofPermissionScopes)).sort();
        const reactivationRequired = selectedProofPermissionEditor?.status === "revoked" || selectedProofPermissionEditor?.status === "expired";
        const grantedAt = reactivationRequired
            ? proofPermissionRetry?.grantedAt || new Date().toISOString()
            : undefined;
        const requestKey = JSON.stringify({ evidenceRef: proofPermissionEvidenceRef, expiresAt: proofPermissionExpiresAt || null, grantedAt: grantedAt || null, proofPermissionId: resolvedProofPermissionEditorId || null, scopes, status: "active", targetId: resolvedTargetId });
        const retry = proofPermissionRetry?.requestKey === requestKey
            ? proofPermissionRetry
            : { grantedAt, idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setProofPermissionRetry(retry);
        const result = await runAction("upsert-proof-permission", {
            evidenceRef: proofPermissionEvidenceRef,
            expiresAt: proofPermissionExpiresAt || undefined,
            grantedAt: retry.grantedAt,
            idempotencyKey: retry.idempotencyKey,
            proofPermissionId: resolvedProofPermissionEditorId || undefined,
            scopes,
            status: "active",
            targetId: resolvedTargetId,
        });
        if (result) setProofPermissionRetry(null);
    };

    const generateContentDrafts = async () => {
        const channels = Array.from(new Set(contentDraftChannels)).sort();
        const requestKey = JSON.stringify({ channels, contentAssetId: resolvedContentAssetId });
        const retry = contentDraftGenerationRetry?.requestKey === requestKey ? contentDraftGenerationRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentDraftGenerationRetry(retry);
        const result = await runAction("generate-content-distribution-drafts", {
            channels: contentDraftChannels,
            contentAssetId: resolvedContentAssetId,
            idempotencyKey: retry.idempotencyKey,
        });
        if (result) setContentDraftGenerationRetry(null);
    };

    const reviewContentDraft = async (contentDraftId: string, approvalStatus: "approved" | "rejected" | "hold") => {
        const reviewReason = approvalStatus === "approved" ? "Approved by owner for manual scheduling." : "Needs revision before scheduling.";
        const requestKey = JSON.stringify({ approvalStatus, contentDraftId, reviewReason });
        const retry = contentReviewRetry?.requestKey === requestKey ? contentReviewRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentReviewRetry(retry);
        const result = await runAction("review-content-distribution-draft", {
            approvalStatus,
            contentDraftId,
            idempotencyKey: retry.idempotencyKey,
            reviewReason,
        });
        if (result) setContentReviewRetry(null);
    };

    const scheduleContentDraft = async (contentDraftId: string) => {
        const requestKey = JSON.stringify({ contentDraftId, scheduledFor: contentScheduleAt || null, status: "queued" });
        const retry = contentScheduleRetry?.requestKey === requestKey ? contentScheduleRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentScheduleRetry(retry);
        const result = await runAction("schedule-content-distribution-draft", {
            contentDraftId,
            idempotencyKey: retry.idempotencyKey,
            scheduledFor: contentScheduleAt || undefined,
            status: "queued",
        });
        if (result) setContentScheduleRetry(null);
    };

    const recordContentPerformance = async () => {
        if (!resolvedContentPerformanceChannel) return;
        const requestKey = JSON.stringify({ activations: contentPerformanceActivations, channel: resolvedContentPerformanceChannel, clicks: contentPerformanceClicks, contentAssetId: resolvedContentAssetId, contentDraftId: resolvedContentDraftId, currentListSubmissions: contentPerformanceSubmissions, ownerLeads: contentPerformanceOwnerLeads, publicationUrl: contentPerformancePublicationUrl.trim() || null, publishedAt: contentPerformancePublishedAt.trim() || null, views: contentPerformanceViews });
        const retry = contentPerformanceRetry?.requestKey === requestKey ? contentPerformanceRetry : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setContentPerformanceRetry(retry);
        const result = await runAction("record-content-performance", {
            activations: contentPerformanceActivations,
            channel: resolvedContentPerformanceChannel,
            clicks: contentPerformanceClicks,
            contentAssetId: resolvedContentAssetId,
            contentDraftId: resolvedContentDraftId || undefined,
            currentListSubmissions: contentPerformanceSubmissions,
            engagementQuality: contentPerformanceOwnerLeads || contentPerformanceSubmissions || contentPerformanceActivations ? "medium" : "low",
            idempotencyKey: retry.idempotencyKey,
            ownerLeads: contentPerformanceOwnerLeads,
            publicationUrl: contentPerformancePublicationUrl.trim() || undefined,
            publishedAt: contentPerformancePublishedAt.trim() || undefined,
            views: contentPerformanceViews,
        });
        if (result) setContentPerformanceRetry(null);
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

    const createDailyGrowthMission = () => {
        void runAction("create-daily-growth-mission", {
            marketPodId: resolvedMarketPodId || undefined,
        });
    };

    const reviewGrowthMission = (ownerDecision: "approved" | "hold" | "redirected" | "completed") => {
        void runAction("review-growth-mission", {
            growthMissionId: resolvedGrowthMissionId,
            ownerDecision,
            ownerDecisionNote: missionDecisionNote || undefined,
        });
    };

    const createExperimentCard = (event: FormEvent) => {
        event.preventDefault();
        if (experimentActionDisabled) return;
        void runAction("create-experiment-card", {
            channel: experimentChannel,
            contentAssetId: selectedExperimentContentAsset?.contentAssetId || undefined,
            ctaId: resolvedOfferCtaId || undefined,
            expectedOutcome: experimentExpectedOutcome,
            hypothesis: experimentHypothesis,
            marketPodId: resolvedMarketPodId || undefined,
            proofAssetSummary: selectedExperimentContentAsset?.title || undefined,
            readbackPlan: {
                baselineWindow: {
                    endAt: toExperimentReadbackIso(experimentReadbackPlan.baselineEndAt),
                    startAt: toExperimentReadbackIso(experimentReadbackPlan.baselineStartAt),
                },
                candidateWindow: {
                    endAt: toExperimentReadbackIso(experimentReadbackPlan.candidateEndAt),
                    startAt: toExperimentReadbackIso(experimentReadbackPlan.candidateStartAt),
                },
                confounders: experimentReadbackPlan.confounders.split(",").map((item) => item.trim()).filter(Boolean),
                nextReadbackAt: toExperimentReadbackIso(experimentReadbackPlan.nextReadbackAt),
                primaryMetric: experimentReadbackPlan.primaryMetric,
            },
            sourcePolicyId: resolvedPolicyId || undefined,
            stopRule: experimentStopRule,
            targetCount: experimentTargetCount,
        });
    };

    const reviewExperimentCard = (ownerDecision: "repeat" | "narrow" | "stop" | "hold" | "complete") => {
        if (experimentReviewDisabled) return;
        void runAction("review-experiment-card", {
            experimentCardId: resolvedExperimentCardId,
            ownerDecision,
            resultSummary: experimentResultSummary || undefined,
        });
    };

    const upsertOfferCta = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-offer-cta", {
            activationSurface: offerSurface,
            approvedAsk: offerAsk,
            blockedClaims: offerBlockedClaims.split(",").map((claim) => claim.trim()).filter(Boolean),
            ctaId: resolvedCtaId || undefined,
            marketPodId: resolvedMarketPodId || undefined,
            proofMatchRule: offerProofRule,
            segment: offerSegment,
            status: "active",
            title: offerTitle,
        });
    };

    const upsertReplyPlaybook = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-reply-playbook", {
            approvedReply: replyPlaybookReply,
            escalationRequired: replyPlaybookEscalation,
            intent: replyPlaybookIntent,
            nextRoute: replyPlaybookNextRoute,
            status: "active",
            suppressionRequired: replyPlaybookSuppression,
            title: replyPlaybookTitle,
        });
    };

    const createSourceQualitySnapshot = () => {
        void runAction("create-source-quality-snapshot", {
            sourcePolicyId: resolvedPolicyId || undefined,
            sourceRunId: resolvedSourceRunId || undefined,
        });
    };

    const createResearchAgentRun = async (event: FormEvent) => {
        event.preventDefault();
        const requestKey = JSON.stringify({
            maxResults: researchMaxResults,
            prompt: researchPrompt.trim(),
            provider: researchProvider,
            researchType,
            sourcePolicyId: resolvedResearchPolicyId,
        });
        const retry = researchAgentRetry?.requestKey === requestKey
            ? researchAgentRetry
            : { idempotencyKey: globalThis.crypto.randomUUID(), requestKey };
        setResearchAgentRetry(retry);
        const result = await runAction("create-research-agent-run", {
            idempotencyKey: retry.idempotencyKey,
            maxResults: researchMaxResults,
            prompt: researchPrompt,
            provider: researchProvider,
            researchType,
            sourcePolicyId: resolvedResearchPolicyId || undefined,
        });
        if (result) setResearchAgentRetry(null);
    };

    const qualifyRevenueAccount = (event: FormEvent) => {
        event.preventDefault();
        void runAction("qualify-revenue-account", {
            locationType: revenueLocationType,
            organizationName: revenueOrganizationName || undefined,
            targetId: resolvedTargetId,
        });
    };

    const upsertCommercialOffer = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-commercial-offer", {
            allowedDiscountBps: commercialOfferDiscountBps,
            billingCadence: commercialOfferCadence,
            contents: commercialOfferContents.split(",").map((item) => item.trim()).filter(Boolean),
            currency: commercialOfferCurrency,
            eligibilitySummary: commercialOfferEligibility,
            founderApprovalConditions: commercialOfferApprovalConditions.split(",").map((item) => item.trim()).filter(Boolean),
            name: commercialOfferName,
            offerCtaId: resolvedOfferCtaId || undefined,
            priceMinor: commercialOfferPriceMinor,
            status: "active",
            version: commercialOfferVersion,
        });
    };

    const updateCommercialOpportunity = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-commercial-opportunity", {
            commercialOfferId: resolvedCommercialOfferId || undefined,
            founderAttentionMinutes: commercialOpportunityAttentionMinutes,
            nextAction: commercialOpportunityNextAction,
            opportunityId: resolvedCommercialOpportunityId,
            probabilityPercent: commercialOpportunityProbability,
            stage: commercialOpportunityStage,
            status: commercialOpportunityStatus,
            valueMinor: commercialOpportunityValueMinor,
            winLossReason: commercialOpportunityWinLossReason || undefined,
        });
    };

    const upsertOperatingEnvelope = (event: FormEvent) => {
        event.preventDefault();
        const startsAt = new Date();
        const expiresAt = new Date(startsAt.getTime() + Math.max(1, operatingEnvelopeDays) * 24 * 60 * 60 * 1000);
        void runAction("upsert-operating-envelope", {
            budgetPolicyId: resolvedRevenueBudgetPolicyId || undefined,
            channel: operatingEnvelopeChannel,
            commercialOfferId: resolvedCommercialOfferId,
            dailyVolumeCap: operatingEnvelopeDailyCap,
            expiresAt: expiresAt.toISOString(),
            fallbackAction: "founder-review",
            marketPodId: resolvedRevenueMarketPodId,
            maxCostUsd: operatingEnvelopeCostCap,
            name: operatingEnvelopeName,
            requestedApprovalMode: operatingEnvelopeMode,
            senderDomainId: operatingEnvelopeChannel === "email" ? resolvedSenderDomainId || undefined : undefined,
            sourcePolicyIds: [resolvedPolicyId],
            startsAt: startsAt.toISOString(),
            status: operatingEnvelopeMode === "manual" || operatingEnvelopeMode === "recommendation-only" ? "shadow" : "approved",
            stopConditions: ["Source policy changes", "Suppression or complaint risk rises", "Budget or volume cap is reached"],
            templateIds: [resolvedRevenueTemplateId],
            totalVolumeCap: operatingEnvelopeTotalCap,
            version: operatingEnvelopeVersion,
        });
    };

    const refreshActivationWatch = (targetId: string) => {
        void runAction("refresh-activation-watch", { targetId });
    };

    const renderSection = () => {
        if (!data) return null;
        if (activeSection === "dashboard") return (
            <DashboardSection
                actionDisabled={actionDisabled}
                data={data}
                mobileReadOnly={mobileReadOnly}
                onDraft={createDraft}
                onEvidence={createEvidence}
                onResearchSubmit={createResearchAgentRun}
                onScore={scoreTarget}
                researchMaxResults={researchMaxResults}
                researchPrompt={researchPrompt}
                researchProvider={researchProvider}
                researchType={researchType}
                resolvedResearchPolicyId={resolvedResearchPolicyId}
                saving={saving}
                setResearchMaxResults={setResearchMaxResults}
                setResearchPrompt={setResearchPrompt}
                setResearchProvider={setResearchProvider}
                setResearchType={setResearchType}
            />
        );
        if (activeSection === "mission") {
            const activeMission = data.workspace.growthMissions.find((mission) => mission.growthMissionId === resolvedGrowthMissionId) || data.workspace.growthMissions[0];
            const selectedExperiment = data.workspace.experimentCards.find((experiment) => experiment.experimentCardId === resolvedExperimentCardId) || data.workspace.experimentCards[0];
            const latestResearchRun = data.workspace.researchRuns[0];
            const latestResearchRows = latestResearchRun
                ? data.workspace.researchTableRows.filter((row) => row.researchRunId === latestResearchRun.researchRunId)
                : data.workspace.researchTableRows;
            return (
                <section className={styles.stack}>
                    <div className={styles.contentGrid}>
                        <ResearchAgentSearchPanel
                            actionDisabled={actionDisabled}
                            buttonLabel="Run Research"
                            onSubmit={createResearchAgentRun}
                            researchMaxResults={researchMaxResults}
                            researchPrompt={researchPrompt}
                            researchProvider={researchProvider}
                            researchType={researchType}
                            resolvedResearchPolicyId={resolvedResearchPolicyId}
                            setResearchMaxResults={setResearchMaxResults}
                            setResearchPrompt={setResearchPrompt}
                            setResearchProvider={setResearchProvider}
                            setResearchType={setResearchType}
                            title="Research Agent Table"
                        />

                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Research Output</h2>
                                <span className={tagClass(latestResearchRun?.status || "hold")}>{latestResearchRun?.status || "not run"}</span>
                            </div>
                            {latestResearchRun ? (
                                <div className={styles.list}>
                                    <div className={styles.listItem}>
                                        <strong>{latestResearchRun.normalizedQuery}</strong>
                                        <span>{latestResearchRun.passCount} pass / {latestResearchRun.unsureCount} unsure / {latestResearchRun.failCount} fail</span>
                                        <span>{latestResearchRun.sourceTransparency.join(" | ")}</span>
                                    </div>
                                    {latestResearchRows.slice(0, 30).map((row) => (
                                        <div className={styles.listItem} key={row.researchRowId}>
                                            <strong>{row.displayName}</strong>
                                            <span>{row.category || "category unknown"} / {row.city || "location unknown"} / {row.currentListGap}</span>
                                            <span>{row.allowedRouteReason}</span>
                                            <span className={tagClass(row.actionabilityState === "actionable" ? "good" : row.actionabilityState === "blocked" ? "danger" : "warning")}>{row.actionabilityState} / {row.allowedRoute}</span>
                                            {row.targetId ? (
                                                <WorkspaceButton
                                                    className={styles.ghostButton}
                                                    onClick={() => setSelectedOpportunityId(`activation_opportunity_${row.targetId}`)}
                                                    type="button"
                                                >
                                                    Open Case
                                                </WorkspaceButton>
                                            ) : null}
                                        </div>
                                    ))}
                                    {!latestResearchRows.length ? <div className={styles.empty}>Research run created but no table rows are ready.</div> : null}
                                </div>
                            ) : <div className={styles.empty}>No research table yet.</div>}
                        </div>
                    </div>

                    <div className={styles.contentGrid}>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Daily Mission</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} onClick={createDailyGrowthMission} type="button">Prepare Mission</WorkspaceButton>
                            </div>
                            {data.workspace.growthMissions.length ? (
                                <>
                                    <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedGrowthMissionId(event.target.value)} value={resolvedGrowthMissionId}>
                                        {data.workspace.growthMissions.map((mission) => (
                                            <option key={mission.growthMissionId} value={mission.growthMissionId}>{mission.title}</option>
                                        ))}
                                    </WorkspaceSelect>
                                    {activeMission ? (
                                        <div className={styles.list}>
                                            <div className={styles.listItem}>
                                                <strong>{activeMission.summary}</strong>
                                                <span>{activeMission.expectedOutcome}</span>
                                                <span className={tagClass(activeMission.ownerDecision)}>{activeMission.ownerDecision}</span>
                                            </div>
                                            {activeMission.missionActions.map((action) => (
                                                <div className={styles.listItem} key={action.actionId}>
                                                    <strong>{action.rank}. {action.label}</strong>
                                                    <span>{action.reason}</span>
                                                    <span>{action.expectedOutcome}</span>
                                                    <span className={tagClass(action.riskLevel)}>{action.actionType} / {action.riskLevel}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    <WorkspaceTextarea className={styles.textarea} onChange={(event) => setMissionDecisionNote(event.target.value)} placeholder="Decision note" value={missionDecisionNote} />
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedGrowthMissionId} onClick={() => reviewGrowthMission("approved")} type="button">Approve</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedGrowthMissionId} onClick={() => reviewGrowthMission("hold")} type="button">Hold</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedGrowthMissionId} onClick={() => reviewGrowthMission("redirected")} type="button">Redirect</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedGrowthMissionId} onClick={() => reviewGrowthMission("completed")} type="button">Complete</WorkspaceButton>
                                    </div>
                                </>
                            ) : <div className={styles.empty}>No mission prepared yet.</div>}
                        </div>

                        <form className={styles.panel} onSubmit={createExperimentCard}>
                            <div className={styles.panelHeader}>
                                <h2>Experiment Card</h2>
                                <WorkspaceButton className={styles.button} disabled={experimentActionDisabled} type="submit">Create</WorkspaceButton>
                            </div>
                            <WorkspaceTextarea className={styles.textarea} disabled={experimentActionDisabled} onChange={(event) => setExperimentHypothesis(event.target.value)} value={experimentHypothesis} />
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} disabled={experimentActionDisabled} onChange={(event) => setExperimentChannel(event.target.value)} value={experimentChannel}>
                                    {["email", "manual", "content", "partner", "referral", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceInput className={styles.input} disabled={experimentActionDisabled} min={1} max={500} onChange={(event) => setExperimentTargetCount(Number(event.target.value))} type="number" value={experimentTargetCount} />
                            </div>
                            <WorkspaceInput className={styles.input} disabled={experimentActionDisabled} onChange={(event) => setExperimentExpectedOutcome(event.target.value)} value={experimentExpectedOutcome} />
                            <WorkspaceTextarea className={styles.textarea} disabled={experimentActionDisabled} onChange={(event) => setExperimentStopRule(event.target.value)} value={experimentStopRule} />
                            <div className={styles.statusRow}><span>Baseline window</span><span>Comparison period</span></div>
                            <div className={styles.formGrid}>
                                <WorkspaceInput aria-label="Baseline start" className={styles.input} disabled={experimentActionDisabled} max={experimentReadbackPlan.baselineEndAt} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, baselineStartAt: event.target.value }))} required type="datetime-local" value={experimentReadbackPlan.baselineStartAt} />
                                <WorkspaceInput aria-label="Baseline end" className={styles.input} disabled={experimentActionDisabled} min={experimentReadbackPlan.baselineStartAt} max={experimentReadbackPlan.candidateStartAt} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, baselineEndAt: event.target.value }))} required type="datetime-local" value={experimentReadbackPlan.baselineEndAt} />
                            </div>
                            <div className={styles.statusRow}><span>Candidate window</span><span>Test period</span></div>
                            <div className={styles.formGrid}>
                                <WorkspaceInput aria-label="Candidate start" className={styles.input} disabled={experimentActionDisabled} min={experimentReadbackPlan.baselineEndAt} max={experimentReadbackPlan.candidateEndAt} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, candidateStartAt: event.target.value }))} required type="datetime-local" value={experimentReadbackPlan.candidateStartAt} />
                                <WorkspaceInput aria-label="Candidate end" className={styles.input} disabled={experimentActionDisabled} min={experimentReadbackPlan.candidateStartAt} max={experimentReadbackPlan.nextReadbackAt} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, candidateEndAt: event.target.value }))} required type="datetime-local" value={experimentReadbackPlan.candidateEndAt} />
                            </div>
                            <WorkspaceInput aria-label="Primary metric" className={styles.input} disabled={experimentActionDisabled} maxLength={160} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, primaryMetric: event.target.value }))} placeholder="Primary metric" required value={experimentReadbackPlan.primaryMetric} />
                            <WorkspaceTextarea aria-label="Known confounders" className={styles.textarea} disabled={experimentActionDisabled} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, confounders: event.target.value }))} placeholder="Known confounders, separated by commas" value={experimentReadbackPlan.confounders} />
                            <WorkspaceInput aria-label="Next readback" className={styles.input} disabled={experimentActionDisabled} min={experimentReadbackPlan.candidateEndAt} onChange={(event) => setExperimentReadbackPlan((current) => ({ ...current, nextReadbackAt: event.target.value }))} required type="datetime-local" value={experimentReadbackPlan.nextReadbackAt} />
                            <WorkspaceSelect className={styles.input} disabled={experimentActionDisabled} onChange={(event) => setSelectedExperimentContentAssetId(event.target.value)} value={selectedExperimentContentAsset?.contentAssetId || ""}>
                                <option value="">No proof asset</option>
                                {data.workspace.contentAssets.map((asset) => (
                                    <option key={asset.contentAssetId} value={asset.contentAssetId}>{asset.title}</option>
                                ))}
                            </WorkspaceSelect>
                            {data.workspace.experimentCards.length ? (
                                <>
                                    <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedExperimentCardId(event.target.value)} value={resolvedExperimentCardId}>
                                        {data.workspace.experimentCards.map((experiment) => (
                                            <option key={experiment.experimentCardId} value={experiment.experimentCardId}>{experiment.hypothesis.slice(0, 90)}</option>
                                        ))}
                                    </WorkspaceSelect>
                                    {selectedExperiment?.readbackPlan ? (
                                        <div className={styles.statusList}>
                                            <div className={styles.statusRow}><span>Primary metric</span><span>{selectedExperiment.readbackPlan.primaryMetric}</span></div>
                                            <div className={styles.statusRow}><span>Baseline</span><span>{selectedExperiment.readbackPlan.baselineWindow.startAt} → {selectedExperiment.readbackPlan.baselineWindow.endAt}</span></div>
                                            <div className={styles.statusRow}><span>Candidate</span><span>{selectedExperiment.readbackPlan.candidateWindow.startAt} → {selectedExperiment.readbackPlan.candidateWindow.endAt}</span></div>
                                            <div className={styles.statusRow}><span>Next readback</span><span>{selectedExperiment.readbackPlan.nextReadbackAt}</span></div>
                                            <div className={styles.statusRow}><span>Confounders</span><span>{selectedExperiment.readbackPlan.confounders.join(", ") || "None recorded"}</span></div>
                                        </div>
                                    ) : selectedExperiment ? <div className={styles.empty}>Legacy card: no readback plan was recorded.</div> : null}
                                    <WorkspaceTextarea className={styles.textarea} disabled={experimentActionDisabled} maxLength={1000} minLength={2} onChange={(event) => setExperimentResultSummary(event.target.value)} placeholder="Result summary required before a decision" required value={experimentResultSummary} />
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={experimentReviewDisabled} onClick={() => reviewExperimentCard("repeat")} type="button">Repeat</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={experimentReviewDisabled} onClick={() => reviewExperimentCard("narrow")} type="button">Narrow</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={experimentReviewDisabled} onClick={() => reviewExperimentCard("hold")} type="button">Hold</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={experimentReviewDisabled} onClick={() => reviewExperimentCard("stop")} type="button">Stop</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={experimentReviewDisabled} onClick={() => reviewExperimentCard("complete")} type="button">Complete</WorkspaceButton>
                                    </div>
                                </>
                            ) : null}
                        </form>
                    </div>

                    <div className={styles.contentGrid}>
                        <form className={styles.panel} onSubmit={upsertOfferCta}>
                            <div className={styles.panelHeader}>
                                <h2>Offer CTA</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Save</WorkspaceButton>
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setOfferTitle(event.target.value)} value={offerTitle} />
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setOfferAsk(event.target.value)} value={offerAsk} />
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setOfferSurface(event.target.value)} value={offerSurface}>
                                    {["claim", "upload", "preview", "qr", "whatsapp", "google-profile", "manual"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setOfferSegment(event.target.value)} value={offerSegment}>
                                    {["restaurant-owner", "agency-partner", "trust-partner", "local-operator", "general"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setOfferProofRule(event.target.value)} value={offerProofRule} />
                            <WorkspaceInput className={styles.input} onChange={(event) => setOfferBlockedClaims(event.target.value)} value={offerBlockedClaims} />
                            <div className={styles.list}>
                                {data.workspace.offerCtas.map((offer) => (
                                    <div className={styles.listItem} key={offer.offerCtaId}>
                                        <strong>{offer.title}</strong>
                                        <span>{offer.approvedAsk}</span>
                                        <span className={tagClass(offer.status)}>{offer.activationSurface} / {offer.status}</span>
                                    </div>
                                ))}
                                {!data.workspace.offerCtas.length ? <div className={styles.empty}>No offer CTAs.</div> : null}
                            </div>
                        </form>

                        <form className={styles.panel} onSubmit={upsertReplyPlaybook}>
                            <div className={styles.panelHeader}>
                                <h2>Reply Playbook</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Save</WorkspaceButton>
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setReplyPlaybookTitle(event.target.value)} value={replyPlaybookTitle} />
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setReplyPlaybookIntent(event.target.value)} value={replyPlaybookIntent}>
                                    {["send-details", "pricing", "who-are-you", "not-now", "wrong-person", "stop", "call-me", "interested", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setReplyPlaybookNextRoute(event.target.value)} value={replyPlaybookNextRoute}>
                                    {["self-serve-preview", "manual-reply", "suppress", "schedule-follow-up", "founder-review"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                            </div>
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setReplyPlaybookReply(event.target.value)} value={replyPlaybookReply} />
                            <WorkspaceInput className={styles.checkboxRow} checked={replyPlaybookEscalation} onChange={(event) => setReplyPlaybookEscalation(event.target.checked)} type="checkbox">
                                Founder review
                            </WorkspaceInput>
                            <WorkspaceInput className={styles.checkboxRow} checked={replyPlaybookSuppression} onChange={(event) => setReplyPlaybookSuppression(event.target.checked)} type="checkbox">
                                Suppression required
                            </WorkspaceInput>
                            <div className={styles.list}>
                                {data.workspace.replyPlaybooks.map((playbook) => (
                                    <div className={styles.listItem} key={playbook.playbookId}>
                                        <strong>{playbook.title}</strong>
                                        <span>{playbook.intent} {"->"} {playbook.nextRoute}</span>
                                        <span className={tagClass(playbook.status)}>{playbook.status}</span>
                                    </div>
                                ))}
                                {!data.workspace.replyPlaybooks.length ? <div className={styles.empty}>No reply playbooks.</div> : null}
                            </div>
                        </form>
                    </div>

                    <div className={styles.contentGrid}>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Source Quality</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} onClick={createSourceQualitySnapshot} type="button">Snapshot</WorkspaceButton>
                            </div>
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedPolicyId}>
                                    {data.workspace.policies.map((policy) => (
                                        <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name}</option>
                                    ))}
                                </WorkspaceSelect>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedSourceRunId(event.target.value)} value={resolvedSourceRunId}>
                                    {data.workspace.imports.map((item) => (
                                        <option key={item.sourceRunId} value={item.sourceRunId}>{item.sourceName}</option>
                                    ))}
                                </WorkspaceSelect>
                            </div>
                            <div className={styles.list}>
                                {data.workspace.sourceQualitySnapshots.map((snapshot) => (
                                    <div className={styles.listItem} key={snapshot.sourceQualitySnapshotId}>
                                        <strong>{snapshot.sourceName}</strong>
                                        <span>Usable {Math.round(snapshot.usableTargetRate * 100)}% / Duplicate {Math.round(snapshot.duplicateRate * 100)}% / Activation {Math.round(snapshot.activationRate * 100)}%</span>
                                        <span className={tagClass(snapshot.recommendation === "continue" ? "good" : snapshot.recommendation === "stop" ? "danger" : "warning")}>{snapshot.recommendation}</span>
                                    </div>
                                ))}
                                {!data.workspace.sourceQualitySnapshots.length ? <div className={styles.empty}>No source quality snapshots.</div> : null}
                            </div>
                        </div>

                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>7-Day Trial</h2>
                                <span className={tagClass(selectedExperiment?.status || "hold")}>{selectedExperiment?.status || "not started"}</span>
                            </div>
                            <div className={styles.statusList}>
                                <div className={styles.statusRow}><span>One market pod</span><span className={tagClass(resolvedMarketPodId ? "ready" : "hold")}>{resolvedMarketPodId ? "selected" : "missing"}</span></div>
                                <div className={styles.statusRow}><span>One offer CTA</span><span className={tagClass(resolvedOfferCtaId ? "ready" : "hold")}>{resolvedOfferCtaId || "missing"}</span></div>
                                <div className={styles.statusRow}><span>One reply playbook</span><span className={tagClass(resolvedReplyPlaybookId ? "ready" : "hold")}>{resolvedReplyPlaybookId || "missing"}</span></div>
                                <div className={styles.statusRow}><span>Sender identity</span><span className={tagClass(resolvedSenderDomainId ? "ready" : "hold")}>{resolvedSenderDomainId || "held"}</span></div>
                                <div className={styles.statusRow}><span>Provider send</span><span className={tagClass(data.setup.providerSendEnabled ? "warning" : "good")}>{data.setup.providerSendEnabled ? "enabled" : "disabled"}</span></div>
                            </div>
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "revenue") {
            const revenueSummary = data.workspace.revenueControlSummaries[0];
            const stalledActivationCount = data.workspace.activationWatches.filter((watch) => watch.status === "stalled").length;
            const selectedOpportunity = data.workspace.commercialOpportunities.find((opportunity) => (
                opportunity.opportunityId === resolvedCommercialOpportunityId
            ));
            return (
                <fieldset aria-label="Revenue operating layer" className={`${styles.stack} ${styles.readOnlyFieldset}`} disabled={mobileReadOnly}>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Revenue Control Summary</h2>
                            <span className={tagClass(data.setup.providerSendEnabled ? "warning" : "good")}>
                                provider send {data.setup.providerSendEnabled ? "enabled" : "disabled"}
                            </span>
                        </div>
                        <div className={styles.statusList}>
                            <div className={styles.statusRow}><span>Revenue accounts</span><strong>{revenueSummary?.revenueAccountCount || data.workspace.revenueAccounts.length}</strong></div>
                            <div className={styles.statusRow}><span>Open opportunities</span><strong>{revenueSummary?.openOpportunityCount || 0}</strong></div>
                            <div className={styles.statusRow}><span>Pipeline value</span><strong>{revenueSummary?.pipelineCurrency || "currency unset"} {revenueSummary?.pipelineValueMinor || 0} minor units</strong></div>
                            <div className={styles.statusRow}><span>Weighted pipeline</span><strong>{revenueSummary?.pipelineCurrency || "currency unset"} {revenueSummary?.weightedPipelineValueMinor || 0} minor units</strong></div>
                            <div className={styles.statusRow}><span>Activated accounts</span><strong>{revenueSummary?.activatedAccountCount || 0}</strong></div>
                            <div className={styles.statusRow}><span>Stalled activations</span><strong>{stalledActivationCount}</strong></div>
                            <div className={styles.statusRow}><span>Founder attention</span><strong>{revenueSummary?.founderAttentionMinutes || 0} minutes</strong></div>
                        </div>
                        <div className={styles.alert}>
                            <LuShield size={18} />
                            <div>
                                <strong>Bounded revenue control only.</strong>
                                <div>SignalDesk records commercial state and activation signals. MenuList remains authoritative for store, menu, publishing, billing, and customer truth.</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.contentGrid}>
                        <form className={styles.panel} onSubmit={qualifyRevenueAccount}>
                            <div className={styles.panelHeader}>
                                <h2>Revenue Account</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedTargetId} type="submit">Qualify</WorkspaceButton>
                            </div>
                            <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                            <div className={styles.formGrid}>
                                <WorkspaceInput className={styles.input} onChange={(event) => setRevenueOrganizationName(event.target.value)} placeholder="Organization or group name" value={revenueOrganizationName} />
                                <WorkspaceSelect className={styles.input} onChange={(event) => setRevenueLocationType(event.target.value)} value={revenueLocationType}>
                                    {[
                                        ["single-location", "Single location"],
                                        ["headquarters", "Headquarters"],
                                        ["branch", "Branch"],
                                    ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </WorkspaceSelect>
                            </div>
                            <div className={styles.list}>
                                {data.workspace.revenueAccounts.map((account) => (
                                    <div className={styles.listItem} key={account.revenueAccountId}>
                                        <strong>{account.displayName}</strong>
                                        <span>{account.city || "City unknown"} / {account.locationType} / {account.nextAction}</span>
                                        <span className={tagClass(account.complianceState === "eligible" ? account.lifecycleStage : "warning")}>
                                            {account.lifecycleStage} / {account.engagementState} / {account.complianceState}
                                        </span>
                                    </div>
                                ))}
                                {!data.workspace.revenueAccounts.length ? <div className={styles.empty}>No revenue accounts yet. Score a target, then qualify it here.</div> : null}
                            </div>
                        </form>

                        <form className={styles.panel} onSubmit={upsertCommercialOffer}>
                            <div className={styles.panelHeader}>
                                <h2>Commercial Offer Registry</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !canConfigureSignalDesk} type="submit">Save Version</WorkspaceButton>
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setCommercialOfferName(event.target.value)} value={commercialOfferName} />
                            <div className={styles.formGrid}>
                                <WorkspaceInput className={styles.input} onChange={(event) => setCommercialOfferCurrency(event.target.value.toUpperCase())} value={commercialOfferCurrency} />
                                <WorkspaceInput className={styles.input} min={0} onChange={(event) => setCommercialOfferPriceMinor(Number(event.target.value))} type="number" value={commercialOfferPriceMinor} />
                                <WorkspaceSelect className={styles.input} onChange={(event) => setCommercialOfferCadence(event.target.value)} value={commercialOfferCadence}>
                                    {[["one-time", "One time"], ["monthly", "Monthly"], ["annual", "Annual"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceInput className={styles.input} min={0} max={10000} onChange={(event) => setCommercialOfferDiscountBps(Number(event.target.value))} type="number" value={commercialOfferDiscountBps} />
                                <WorkspaceInput className={styles.input} min={1} onChange={(event) => setCommercialOfferVersion(Number(event.target.value))} type="number" value={commercialOfferVersion} />
                            </div>
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setCommercialOfferContents(event.target.value)} value={commercialOfferContents} />
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setCommercialOfferEligibility(event.target.value)} value={commercialOfferEligibility} />
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setCommercialOfferApprovalConditions(event.target.value)} value={commercialOfferApprovalConditions} />
                            <div className={styles.list}>
                                {data.workspace.commercialOffers.map((offer) => (
                                    <div className={styles.listItem} key={offer.commercialOfferId}>
                                        <strong>{offer.name} v{offer.version}</strong>
                                        <span>{offer.currency} {offer.priceMinor} minor units / {offer.billingCadence} / discount cap {offer.allowedDiscountBps} bps</span>
                                        <span className={tagClass(offer.status)}>{offer.status}</span>
                                    </div>
                                ))}
                                {!data.workspace.commercialOffers.length ? <div className={styles.empty}>No approved commercial offer version.</div> : null}
                            </div>
                        </form>
                    </div>

                    <div className={styles.contentGrid}>
                        <form className={styles.panel} onSubmit={updateCommercialOpportunity}>
                            <div className={styles.panelHeader}>
                                <h2>Opportunity</h2>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedCommercialOpportunityId} type="submit">Update</WorkspaceButton>
                            </div>
                            <WorkspaceSelect
                                className={styles.input}
                                onChange={(event) => {
                                    const opportunity = data.workspace.commercialOpportunities.find((item) => item.opportunityId === event.target.value);
                                    setSelectedCommercialOpportunityId(event.target.value);
                                    if (!opportunity) return;
                                    setCommercialOpportunityStage(opportunity.stage);
                                    setCommercialOpportunityStatus(opportunity.status);
                                    setCommercialOpportunityValueMinor(opportunity.valueMinor);
                                    setCommercialOpportunityProbability(opportunity.probabilityPercent);
                                    setCommercialOpportunityNextAction(opportunity.nextAction);
                                    setCommercialOpportunityAttentionMinutes(opportunity.founderAttentionMinutes);
                                    setCommercialOpportunityWinLossReason(opportunity.winLossReason || "");
                                    setSelectedCommercialOfferId(opportunity.commercialOfferId || "");
                                }}
                                value={resolvedCommercialOpportunityId}
                            >
                                {data.workspace.commercialOpportunities.map((opportunity) => (
                                    <option key={opportunity.opportunityId} value={opportunity.opportunityId}>{opportunity.title}</option>
                                ))}
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedCommercialOfferId(event.target.value)} value={resolvedCommercialOfferId}>
                                {data.workspace.commercialOffers.filter((offer) => offer.status === "active").map((offer) => (
                                    <option key={offer.commercialOfferId} value={offer.commercialOfferId}>{offer.name} v{offer.version} / {offer.currency} {offer.priceMinor}</option>
                                ))}
                            </WorkspaceSelect>
                            <div className={styles.formGrid}>
                                <WorkspaceSelect
                                    className={styles.input}
                                    onChange={(event) => {
                                        const stage = event.target.value;
                                        setCommercialOpportunityStage(stage);
                                        setCommercialOpportunityStatus(stage === "won" || stage === "lost" || stage === "nurture" ? stage : "open");
                                    }}
                                    value={commercialOpportunityStage}
                                >
                                    {["qualified", "discovery", "offer", "decision", "won", "lost", "nurture"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceSelect
                                    className={styles.input}
                                    onChange={(event) => {
                                        const status = event.target.value;
                                        setCommercialOpportunityStatus(status);
                                        if (status === "won" || status === "lost" || status === "nurture") setCommercialOpportunityStage(status);
                                        else if (["won", "lost", "nurture"].includes(commercialOpportunityStage)) setCommercialOpportunityStage("qualified");
                                    }}
                                    value={commercialOpportunityStatus}
                                >
                                    {["open", "won", "lost", "nurture"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceInput className={styles.input} min={0} onChange={(event) => setCommercialOpportunityValueMinor(Number(event.target.value))} type="number" value={commercialOpportunityValueMinor} />
                                <WorkspaceInput className={styles.input} min={0} max={100} onChange={(event) => setCommercialOpportunityProbability(Number(event.target.value))} type="number" value={commercialOpportunityProbability} />
                                <WorkspaceInput className={styles.input} min={0} onChange={(event) => setCommercialOpportunityAttentionMinutes(Number(event.target.value))} type="number" value={commercialOpportunityAttentionMinutes} />
                            </div>
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setCommercialOpportunityNextAction(event.target.value)} value={commercialOpportunityNextAction} />
                            {(commercialOpportunityStatus === "won" || commercialOpportunityStatus === "lost") ? (
                                <WorkspaceTextarea
                                    className={styles.textarea}
                                    onChange={(event) => setCommercialOpportunityWinLossReason(event.target.value)}
                                    placeholder="Required structured win or loss reason"
                                    value={commercialOpportunityWinLossReason}
                                />
                            ) : null}
                            {selectedOpportunity ? (
                                <div className={styles.listItem}>
                                    <strong>{selectedOpportunity.title}</strong>
                                    <span>{selectedOpportunity.stage} / {selectedOpportunity.status} / {selectedOpportunity.probabilityPercent}%</span>
                                    <span>{selectedOpportunity.nextAction}</span>
                                </div>
                            ) : <div className={styles.empty}>Qualify an eligible target to create an opportunity.</div>}
                        </form>

                        <form className={styles.panel} onSubmit={upsertOperatingEnvelope}>
                            <div className={styles.panelHeader}>
                                <h2>Operating Envelope</h2>
                                <WorkspaceButton
                                    className={styles.button}
                                    disabled={actionDisabled || !canConfigureSignalDesk || !resolvedCommercialOfferId || !resolvedPolicyId || !resolvedRevenueMarketPodId || !resolvedRevenueTemplateId}
                                    type="submit"
                                >
                                    Save Envelope
                                </WorkspaceButton>
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setOperatingEnvelopeName(event.target.value)} value={operatingEnvelopeName} />
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedCommercialOfferId(event.target.value)} value={resolvedCommercialOfferId}>
                                {data.workspace.commercialOffers.filter((offer) => offer.status === "active").map((offer) => (
                                    <option key={offer.commercialOfferId} value={offer.commercialOfferId}>{offer.name} v{offer.version} / {offer.currency} {offer.priceMinor}</option>
                                ))}
                            </WorkspaceSelect>
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setOperatingEnvelopeMode(event.target.value)} value={operatingEnvelopeMode}>
                                    {["manual", "recommendation-only", "prepare-and-approve-each", "approve-batch", "approve-sample", "exception-only"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setOperatingEnvelopeChannel(event.target.value)} value={operatingEnvelopeChannel}>
                                    {["manual", "email", "content", "partner", "referral"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceInput className={styles.input} min={1} max={500} onChange={(event) => setOperatingEnvelopeDailyCap(Number(event.target.value))} type="number" value={operatingEnvelopeDailyCap} />
                                <WorkspaceInput className={styles.input} min={1} max={5000} onChange={(event) => setOperatingEnvelopeTotalCap(Number(event.target.value))} type="number" value={operatingEnvelopeTotalCap} />
                                <WorkspaceInput className={styles.input} min={0} onChange={(event) => setOperatingEnvelopeCostCap(Number(event.target.value))} type="number" value={operatingEnvelopeCostCap} />
                                <WorkspaceInput className={styles.input} min={1} max={90} onChange={(event) => setOperatingEnvelopeDays(Number(event.target.value))} type="number" value={operatingEnvelopeDays} />
                                <WorkspaceInput className={styles.input} min={1} max={10000} onChange={(event) => setOperatingEnvelopeVersion(Number(event.target.value))} placeholder="Envelope version" type="number" value={operatingEnvelopeVersion} />
                            </div>
                            <div className={styles.statusList}>
                                <div className={styles.statusRow}><span>Active market pod</span><strong>{resolvedRevenueMarketPodId || "Required before approval"}</strong></div>
                                <div className={styles.statusRow}><span>Revenue budget</span><strong>{resolvedRevenueBudgetPolicyId || "No compatible global or active-pod budget attached"}</strong></div>
                            </div>
                            <div className={styles.alert}>
                                <LuAlertTriangle size={18} />
                                <div>
                                    <strong>Autonomy does not silently graduate.</strong>
                                    <div>Exception-only requests are stored as held. Approved modes remain shadow or approval-only and cannot activate provider sending.</div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.workspace.operatingEnvelopes.map((envelope) => (
                                    <div className={styles.listItem} key={envelope.operatingEnvelopeId}>
                                        <strong>{envelope.name} v{envelope.version}</strong>
                                        <span>{envelope.channel} / {envelope.dailyVolumeCap} daily / {envelope.totalVolumeCap} total / ${envelope.maxCostUsd}</span>
                                        <span className={tagClass(envelope.executionState === "held" ? "warning" : envelope.status)}>{envelope.requestedApprovalMode} requested / {envelope.approvalMode} effective / {envelope.executionState}</span>
                                    </div>
                                ))}
                                {!data.workspace.operatingEnvelopes.length ? <div className={styles.empty}>No bounded operating envelope.</div> : null}
                            </div>
                        </form>
                    </div>

                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Activation Orchestration</h2>
                            <span className={styles.tag}>automatic from read-only MenuList bridge events</span>
                        </div>
                        <div className={styles.list}>
                            {data.workspace.revenueAccounts.map((account) => {
                                const watch = data.workspace.activationWatches.find((item) => item.targetId === account.primaryTargetId);
                                return (
                                    <div className={styles.listItem} key={account.revenueAccountId}>
                                        <strong>{account.displayName}</strong>
                                        <span>{watch?.nextAction || "Waiting for a recorded SignalDesk activation outcome."}</span>
                                        <span className={tagClass(watch?.status === "stalled" ? "warning" : watch?.status || "neutral")}>
                                            {watch?.status || "not watched"} / {watch?.outcomeTypes.join(", ") || "no outcomes"}
                                        </span>
                                        <div className={styles.rowActions}>
                                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => refreshActivationWatch(account.primaryTargetId)} type="button">Recheck Watch</WorkspaceButton>
                                        </div>
                                    </div>
                                );
                            })}
                            {!data.workspace.revenueAccounts.length ? <div className={styles.empty}>Activation watches begin after an account is qualified.</div> : null}
                        </div>
                    </div>
                </fieldset>
            );
        }
        if (activeSection === "targets") {
            return (
                <section className={styles.stack}>
                    <form className={styles.panel} onSubmit={handleImport}>
                        <div className={styles.panelHeader}>
                            <h2>Manual Import</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedManualImportPolicyId} type="submit">Import</WorkspaceButton>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceName(event.target.value)} value={sourceName} />
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedManualImportPolicyId}>
                                {manualImportPolicies.map((policy) => (
                                    <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name}</option>
                                ))}
                            </WorkspaceSelect>
                        </div>
                        <div className={styles.empty}>Use exactly 10 columns in this order: {SIGNALDESK_IMPORT_CSV_COLUMNS.join(", ")}. The optional first row is treated as a header only when it matches these names exactly. Quote fields that contain commas, quotes, or line breaks.</div>
                        {importValidationError ? <Alert message={importValidationError} showIcon type="error" /> : null}
                        <WorkspaceTextarea className={styles.textarea} onChange={(event) => {
                            setImportRows(event.target.value);
                            setImportValidationError(null);
                        }} value={importRows} />
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Targets</h2><span className={styles.tag}>{data.workspace.targets.length}</span></div>
                        <TargetList data={data} mobileReadOnly={mobileReadOnly} onDraft={createDraft} onEvidence={createEvidence} onScore={scoreTarget} saving={saving} />
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !canConfigureSignalDesk} type="submit">Create</WorkspaceButton>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setPolicyName(event.target.value)} value={policyName} />
                            <WorkspaceInput className={styles.input} min={1} max={365} onChange={(event) => setRetentionDays(Number(event.target.value))} type="number" value={retentionDays} />
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => handlePolicySourceTypeChange(event.target.value)} value={policySourceType}>
                            <option value="manual-research">manual-research</option>
                            <option value="manual-csv">manual-csv</option>
                            <option value="owned-demand">owned-demand</option>
                            <option value="provider">provider</option>
                            <option value="other">other</option>
                        </WorkspaceSelect>
                        {policySourceType === "provider" ? (
                            <WorkspaceSelect className={styles.input} onChange={(event) => setPolicyProvider(event.target.value)} value={policyProvider}>
                                <option value="google-places">Google Places</option>
                                <option value="apify">Apify</option>
                                <option value="fhrs-fhis">FHRS/FHIS UK</option>
                                <option value="foursquare">Foursquare</option>
                            </WorkspaceSelect>
                        ) : null}
                        <div className={styles.checkboxGrid}>
                            <WorkspaceInput className={styles.checkboxLabel} checked={policyAllowContact} onChange={(event) => setPolicyAllowContact(event.target.checked)} type="checkbox">
                                Contact use
                            </WorkspaceInput>
                            <WorkspaceInput className={styles.checkboxLabel} checked={policyAllowEvidence} onChange={(event) => setPolicyAllowEvidence(event.target.checked)} type="checkbox">
                                Evidence use
                            </WorkspaceInput>
                            <WorkspaceInput className={styles.checkboxLabel} checked={policyAllowPersonalization} onChange={(event) => setPolicyAllowPersonalization(event.target.checked)} type="checkbox">
                                Personalization
                            </WorkspaceInput>
                        </div>
                        <div className={styles.empty}>Public-business research should stay evidence-only. Enable contact use only for a permissioned manual introduction or referral, and include a permission evidence reference in column 10 of each contact row.</div>
                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canConfigureSignalDesk} onClick={handleSeed} type="button">Seed Defaults</WorkspaceButton>
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Policies</h2><span className={styles.tag}>{data.workspace.policies.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.policies.map((policy) => (
                                <div className={styles.listItem} key={policy.sourcePolicyId}>
                                    <strong>{policy.name}</strong>
                                    <span>{policy.sourceType} / {policy.accessMethod || "rights review required"} / {policy.retentionDays} days / {policy.policyState || policy.status}</span>
                                    <span>{policy.allowedFields?.length || 0} allowed fields / {policy.prohibitedUses?.length || 0} prohibited uses / owner {policy.policyOwner || "unassigned"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}>
                            <h2>Provider Registry</h2>
                            <div className={styles.rowActions}>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveOwnedEmailSequencerProvider} type="button">Approve Owned Rail</WorkspaceButton>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveGooglePlacesProvider} type="button">Approve Places</WorkspaceButton>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveApifyProvider} type="button">Approve Apify</WorkspaceButton>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveFhrsFhisProvider} type="button">Approve FHRS/FHIS</WorkspaceButton>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveGeminiAiProvider} type="button">Approve Gemini</WorkspaceButton>
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
                        <div className={styles.panelHeader}>
                            <h2>Budget Policies</h2>
                            <div className={styles.rowActions}>
                                <span className={styles.tag}>{data.workspace.budgetPolicies.length}</span>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canConfigureSignalDesk} onClick={approveZeroSpendTrustPartnerTest} type="button">Approve Zero-Spend Trust Test</WorkspaceButton>
                            </div>
                        </div>
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedTargetId} onClick={() => createDraft(resolvedTargetId)} type="button">Create Draft</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Templates</h2><WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={handleSeed} type="button">Seed</WorkspaceButton></div>
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
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setApprovalRejectionReason(event.target.value as SignalDeskApprovalRejectionReason | "")} value={approvalRejectionReason}>
                                <option value="">Choose rejection reason</option>
                                {SIGNALDESK_APPROVAL_REJECTION_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </WorkspaceSelect>
                            <WorkspaceInput
                                className={styles.input}
                                maxLength={500}
                                onChange={(event) => setApprovalRejectionNote(event.target.value)}
                                placeholder={approvalRejectionReason === "other" ? "Required rejection note" : "Optional review note"}
                                value={approvalRejectionNote}
                            />
                        </div>
                        <div className={styles.table}>
                            {data.workspace.approvals.map((approval) => {
                                const packet = data.workspace.approvalPackets.find((item) => item.approvalId === approval.approvalId);
                                const packetActionReady = packet?.recommendedAction === "approve" && packet.allowedRoute !== "none";
                                return (
                                    <div className={styles.tableRow} key={approval.approvalId}>
                                        <div><strong>{approval.targetName}</strong><span>{approval.rejectionReason || approval.reviewReason}</span></div>
                                        <span className={tagClass(approval.status)}>{approval.status}</span>
                                        <span>{approval.priority}</span>
                                        <div className={styles.rowActions}>
                                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => createApprovalPacket(approval)} type="button">Packet</WorkspaceButton>
                                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || approval.status !== "pending" || !packetActionReady} onClick={() => reviewApproval(approval, "approved")} type="button">Approve</WorkspaceButton>
                                            <WorkspaceButton
                                                className={styles.ghostButton}
                                                disabled={actionDisabled || approval.status !== "pending" || !approvalRejectionReason || (approvalRejectionReason === "other" && !approvalRejectionNote.trim())}
                                                onClick={() => reviewApproval(approval, "rejected")}
                                                type="button"
                                            >
                                                Reject
                                            </WorkspaceButton>
                                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || approval.status !== "approved"} onClick={() => exportMessage(approval.approvalId)} type="button">Export</WorkspaceButton>
                                        </div>
                                    </div>
                                );
                            })}
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
                                    <span>{packet.evidenceSummary || "Evidence summary unavailable; refresh the packet."}</span>
                                    {packet.currentMenuPresence ? (
                                        <span>
                                            Current menu: {packet.currentMenuPresence.truthGap.replace(/-/g, " ")} / {packet.currentMenuPresence.observedFormat}; owner control {packet.currentMenuPresence.ownerControlState}; mobile access {packet.currentMenuPresence.mobileAccessState}.
                                        </span>
                                    ) : <span>Current-menu diagnostic missing; packet cannot be approved.</span>}
                                    <span>Allowed route: {packet.allowedRoute || "none"}. {packet.allowedRouteReason}</span>
                                    <span>Message: {packet.messageSubject || "No subject"} / {packet.messageBody || "No body"}</span>
                                    <span>Expected outcome: {packet.expectedOutcome || "Not recorded"}</span>
                                    <span>Rejected facts: {packet.evidenceRejectedFacts?.join(" ") || "None recorded"}</span>
                                    <span>Unsupported claims: {packet.unsupportedClaims?.length ? packet.unsupportedClaims.join(" ") : "none"}</span>
                                    <span>Action fingerprint: {packet.actionFingerprintHash?.slice(0, 12) || "missing"}</span>
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
                    <form className={styles.panel} onSubmit={recordManualContact}>
                        <div className={styles.panelHeader}>
                            <h2>Manual Contact</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || manualContactIncomplete} type="submit">Record</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        {allowedManualContactRoutes.size ? (
                            <WorkspaceSelect className={styles.input} onChange={(event) => setManualContactRoute(event.target.value as SignalDeskManualContactRoute)} value={resolvedManualContactRoute || ""}>
                                {Array.from(allowedManualContactRoutes).map((route) => (
                                    <option key={route} value={route}>{route}</option>
                                ))}
                            </WorkspaceSelect>
                        ) : <div className={styles.alert}>No policy-approved contact route is ready.</div>}
                        <WorkspaceSelect className={styles.input} onChange={(event) => setManualContactResult(event.target.value as SignalDeskManualContactResult)} value={manualContactResult}>
                            {SIGNALDESK_MANUAL_CONTACT_RESULTS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </WorkspaceSelect>
                        <WorkspaceInput
                            className={styles.input}
                            onChange={(event) => setManualContactOccurredAt(event.target.value)}
                            type="datetime-local"
                            value={manualContactOccurredAt}
                        />
                        <WorkspaceTextarea
                            className={styles.textareaSmall}
                            maxLength={300}
                            onChange={(event) => setManualContactNote(event.target.value)}
                            placeholder="Optional internal note"
                            value={manualContactNote}
                        />
                    </form>
                    <form className={styles.panel} onSubmit={captureReply}>
                        <div className={styles.panelHeader}>
                            <h2>Reply</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedTargetId || !replyText.trim()} type="submit">Capture</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setReplyChannel(event.target.value)} value={replyChannel}>
                            <option value="email">email</option>
                            <option value="manual">manual</option>
                            <option value="whatsapp">whatsapp</option>
                            <option value="instagram">instagram</option>
                            <option value="messenger">messenger</option>
                        </WorkspaceSelect>
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setReplyText(event.target.value)} value={replyText} />
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
                        <div className={styles.panelHeader}><h2>Outcome</h2><WorkspaceButton className={styles.button} disabled={actionDisabled || manualOutcomeIncomplete} type="submit">Record</WorkspaceButton></div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setOutcomeType(event.target.value)} value={outcomeType}>
                            <option value="route_created">route_created</option>
                            <option value="upload_started">upload_started</option>
                            <option value="preview_prepared">preview_prepared</option>
                            <option value="published">published</option>
                            <option value="two_surface_activation">two_surface_activation</option>
                        </WorkspaceSelect>
                        <WorkspaceInput className={styles.input} onChange={(event) => setOutcomeEvidenceRef(event.target.value)} placeholder="Evidence reference" value={outcomeEvidenceRef} />
                        <WorkspaceInput className={styles.input} onChange={(event) => setOutcomeOwnerQualifiedAt(event.target.value)} placeholder="Owner-qualified ISO time" value={outcomeOwnerQualifiedAt} />
                        <WorkspaceInput className={styles.input} onChange={(event) => setOutcomeOwnerReviewedAt(event.target.value)} placeholder="Owner-review ISO time" value={outcomeOwnerReviewedAt} />
                        <div className={styles.checkboxGrid}>
                            {SIGNALDESK_ACTIVATION_SURFACES.map((surface) => (
                                <WorkspaceInput className={styles.checkboxLabel} checked={outcomeSurfaces.includes(surface)} key={surface} onChange={() => toggleOutcomeSurface(surface)} type="checkbox">
                                    {surface}
                                </WorkspaceInput>
                            ))}
                        </div>
                    </form>
                    <form className={styles.panel} onSubmit={captureDemand}>
                        <div className={styles.panelHeader}><h2>Demand Signal</h2><WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Capture</WorkspaceButton></div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setDemandSignalType(event.target.value)} value={demandSignalType}>
                            <option value="link_click">link_click</option>
                            <option value="qr_scan">qr_scan</option>
                            <option value="share">share</option>
                            <option value="claim_attempt">claim_attempt</option>
                            <option value="referral">referral</option>
                        </WorkspaceSelect>
                    </form>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Outcomes</h2><span className={styles.tag}>{data.workspace.outcomes.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.outcomes.map((outcome) => (
                                <div className={styles.listItem} key={outcome.outcomeSummaryId}>
                                    <strong>{outcome.targetName || outcome.outcomeType}</strong>
                                    <span>{outcome.outcomeType} / {outcome.count} / {outcome.integrityStatus || "legacy-unverified"}</span>
                                    {outcome.surfaces?.length ? <span>{outcome.surfaces.join(" + ")}</span> : null}
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
                        <div className={styles.panelHeader}>
                            <h2>Market Pods</h2>
                            <div className={styles.rowActions}>
                                <span className={styles.tag}>{data.workspace.marketPods.length}</span>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => recommendMarketPodPlan()} type="button">Recommend</WorkspaceButton>
                            </div>
                        </div>
                        <div className={styles.list}>
                            <WorkspaceInput
                                className={styles.input}
                                disabled={actionDisabled || !canApproveMarketPod}
                                onChange={(event) => setMarketPodReviewReason(event.target.value)}
                                placeholder="Founder decision reason"
                                value={marketPodReviewReason}
                            />
                            {data.workspace.marketPods.map((pod) => (
                                <div className={styles.listItem} key={pod.marketPodId}>
                                    <strong>{pod.name}</strong>
                                    <span>{[pod.category, pod.city, pod.country].filter(Boolean).join(" / ")} / ${pod.monthlyBudgetUsd} / {pod.successMetric}</span>
                                    <span className={tagClass(pod.status)}>{pod.status} / recommendation {pod.recommendation || "pending"} / founder {pod.reviewDecision || "pending"}</span>
                                    {pod.recommendationReason ? <span>{pod.recommendationReason}</span> : null}
                                    {pod.recommendedActions?.length ? <span>{pod.recommendedActions.join(" | ")}</span> : null}
                                    {pod.reviewReason ? <span>Founder reason: {pod.reviewReason}</span> : null}
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => recommendMarketPodPlan(pod.marketPodId)} type="button">Refresh Plan</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canApproveMarketPod} onClick={() => reviewMarketPod(pod.marketPodId, "approved")} type="button">Approve Pod</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canApproveMarketPod} onClick={() => reviewMarketPod(pod.marketPodId, "held")} type="button">Hold Pod</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canApproveMarketPod} onClick={() => reviewMarketPod(pod.marketPodId, "rejected")} type="button">Reject Pod</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                            {!data.workspace.marketPods.length ? <div className={styles.empty}>No market pod yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}>
                            <h2>Weekly Strategist Memos</h2>
                            <div className={styles.rowActions}>
                                <span className={styles.tag}>{data.workspace.strategistMemos.length}</span>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} onClick={createWeeklyStrategistMemo} type="button">Create Memo</WorkspaceButton>
                            </div>
                        </div>
                        <div className={styles.list}>
                            {data.workspace.strategistMemos.map((memo) => (
                                <div className={styles.listItem} key={memo.strategistMemoId}>
                                    <strong>{memo.title}</strong>
                                    <span>{memo.summary}</span>
                                    <span>{memo.costSummary}</span>
                                    <span className={tagClass(memo.status)}>{memo.status}</span>
                                    {memo.nextDecisions.length ? <span>{memo.nextDecisions.join(" | ")}</span> : null}
                                    {memo.riskNotes.length ? <span>{memo.riskNotes.join(" | ")}</span> : null}
                                </div>
                            ))}
                            {!data.workspace.strategistMemos.length ? <div className={styles.empty}>No memo yet.</div> : null}
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedTargetId || !resolvedWaterfallId} type="submit">Run</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedWaterfallId(event.target.value)} value={resolvedWaterfallId}>
                            {data.workspace.enrichmentWaterfalls.map((waterfall) => (
                                <option key={waterfall.waterfallId} value={waterfall.waterfallId}>{waterfall.name} / {waterfall.status}</option>
                            ))}
                        </WorkspaceSelect>
                    </form>
                    <form className={styles.panel} onSubmit={runSourceProvider}>
                        <div className={styles.panelHeader}>
                            <h2>Live Source Run</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedProviderPolicyId || !sourceQuery.trim()} type="submit">Run</WorkspaceButton>
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSourceProvider(event.target.value)} value={sourceProvider}>
                            <option value="google-places">Google Places</option>
                            <option value="apify">Apify</option>
                            <option value="fhrs-fhis">FHRS/FHIS UK</option>
                            <option value="foursquare">Foursquare</option>
                        </WorkspaceSelect>
                        <WorkspaceInput className={styles.input} onChange={(event) => setSourceQuery(event.target.value)} value={sourceQuery} />
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceCity(event.target.value)} value={sourceCity} />
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceCountry(event.target.value)} value={sourceCountry} />
                            <WorkspaceInput className={styles.input} max={30} min={1} onChange={(event) => setSourceMaxResults(Number(event.target.value))} type="number" value={sourceMaxResults} />
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedProviderPolicyId}>
                            {providerPolicies.length ? providerPolicies.map((policy) => (
                                <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name} / {policy.provider}</option>
                            )) : <option value="">No provider source policy</option>}
                        </WorkspaceSelect>
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
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Provider Evaluation</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled} onClick={createProviderEvaluation} type="button">Create</WorkspaceButton>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setProviderEvaluationProvider(event.target.value)} value={providerEvaluationProvider}>
                                <option value="google-places">google-places</option>
                                <option value="apify">apify</option>
                                <option value="fhrs-fhis">fhrs-fhis</option>
                                <option value="owned-email">owned-email</option>
                                <option value="smartlead">smartlead</option>
                                <option value="openai">openai</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setProviderEvaluationUse(event.target.value)} value={providerEvaluationUse}>
                                <option value="discovery">discovery</option>
                                <option value="enrichment">enrichment</option>
                                <option value="verification">verification</option>
                                <option value="sender">sender</option>
                                <option value="sequencer">sequencer</option>
                                <option value="ai">ai</option>
                            </WorkspaceSelect>
                        </div>
                        <div className={styles.list}>
                            {data.workspace.providerEvaluations.map((evaluation) => (
                                <div className={styles.listItem} key={evaluation.providerEvaluationId}>
                                    <strong>{evaluation.provider} / {evaluation.use}</strong>
                                    <span>{evaluation.sampleSize} samples / {evaluation.evidenceQualityScore} evidence score</span>
                                    <span className={tagClass(evaluation.recommendation)}>{evaluation.recommendation}</span>
                                </div>
                            ))}
                            {!data.workspace.providerEvaluations.length ? <div className={styles.empty}>No provider evaluation yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Provider Source Retention</h2><span className={styles.tag}>{data.workspace.providerSourceRetentions.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.providerSourceRetentions.map((retention) => (
                                <div className={styles.tableRowCompact} key={retention.providerSourceRetentionId}>
                                    <div><strong>{retention.provider}</strong><span>{retention.targetName || retention.targetId || retention.providerRecordId || "source row"}</span></div>
                                    <span className={tagClass(retention.status)}>{retention.status}</span>
                                    <span>{retention.refreshDueAt || "no refresh due"}</span>
                                    <div className={styles.rowActions}>
                                        {retention.providerRecordUrl ? <a className={styles.ghostButton} href={retention.providerRecordUrl} rel="noreferrer" target="_blank">Open</a> : null}
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => refreshProviderRetention(retention.providerSourceRetentionId)} type="button">Mark Refreshed</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                            {!data.workspace.providerSourceRetentions.length ? <div className={styles.empty}>No provider retention records yet.</div> : null}
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
                        <TargetList data={data} mobileReadOnly={mobileReadOnly} onDraft={createDraft} onEvidence={createEvidence} onScore={scoreTarget} saving={saving} />
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedTargetId} type="submit">Run</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setAiTask(event.target.value)} value={aiTask}>
                            {data.workspace.modelRoutes
                                .filter((route) => route.status === "active" && route.task !== "quality-critic")
                                .map((route) => <option key={route.modelRouteId} value={route.task}>{route.task}</option>)}
                        </WorkspaceSelect>
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setAiInstruction(event.target.value)} value={aiInstruction} />
                    </form>
                    <form className={styles.panelWide} onSubmit={runAiVolumeBatch}>
                        <div className={styles.panelHeader}>
                            <div><h2>AI Volume Mode</h2><span>Fast generation, independent critic, and bounded escalation.</span></div>
                            <WorkspaceButton
                                className={styles.button}
                                disabled={!canRunAiVolume || saving || (!aiVolumeRetryActive && (!data.workspace.targets.length || !aiVolumeTasks.length))}
                                type="submit"
                            >{aiVolumeRetryActive ? "Retry Batch" : "Run Batch"}</WorkspaceButton>
                        </div>
                        {aiVolumeRetryActive ? (
                            <div className={styles.rowActions}>
                                <span>Retrying the same protected batch until it reaches a final state.</span>
                                <WorkspaceButton className={styles.ghostButton} disabled={!canRunAiVolume || saving} onClick={clearAiVolumeRetry} type="button">Clear Retry</WorkspaceButton>
                            </div>
                        ) : null}
                        <div className={styles.formGrid}>
                            <WorkspaceInput
                                className={styles.input}
                                disabled={!canRunAiVolume || saving || aiVolumeRetryActive}
                                max={5}
                                min={1}
                                onChange={(event) => setAiVolumeTargetCount(Math.max(1, Math.min(5, Number(event.target.value) || 1)))}
                                type="number"
                                value={aiVolumeTargetCount}
                            />
                            <WorkspaceInput
                                className={styles.input}
                                disabled={!canRunAiVolume || saving || aiVolumeRetryActive}
                                max={5}
                                min={0.01}
                                onChange={(event) => setAiVolumeMaxCostUsd(Math.max(0.01, Math.min(5, Number(event.target.value) || 0.01)))}
                                step="0.01"
                                type="number"
                                value={aiVolumeMaxCostUsd}
                            />
                        </div>
                        <span>First {Math.min(aiVolumeTargetCount, data.workspace.targets.length)} current targets / maximum estimated AI cost ${aiVolumeMaxCostUsd.toFixed(2)}</span>
                        <div className={styles.rowActions}>
                            {(["score", "evidence", "draft", "reply-classification"] as SignalDeskAiVolumeTask[]).map((task) => (
                                <WorkspaceInput
                                    checked={aiVolumeTasks.includes(task)}
                                    disabled={!canRunAiVolume || saving || aiVolumeRetryActive || (!aiVolumeTasks.includes(task) && aiVolumeTasks.length >= 3)}
                                    key={task}
                                    onChange={(event) => toggleAiVolumeTask(task, event.target.checked)}
                                    type="checkbox"
                                >{task}</WorkspaceInput>
                            ))}
                        </div>
                        <WorkspaceTextarea
                            className={styles.textareaSmall}
                            disabled={!canRunAiVolume || saving || aiVolumeRetryActive}
                            maxLength={500}
                            onChange={(event) => setAiVolumeInstruction(event.target.value)}
                            placeholder="Optional bounded instruction for every target/task pair"
                            value={aiVolumeInstruction}
                        />
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
                                    <span>{evaluation.sampleSize} runs / {evaluation.reviewedSampleSize || 0} reviewed</span>
                                    <span>{formatRate(evaluation.passRate)} pass / {formatRate(evaluation.rejectedFactRate)} rejected facts</span>
                                    <span>{formatRate(evaluation.acceptanceRate)} accepted / {formatRate(evaluation.editRate)} edited / {formatRate(evaluation.rejectionRate)} rejected</span>
                                    <span>{evaluation.founderAttentionMinutes || 0} founder min</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Shadow Review</h2><span className={tagClass(canReviewAiShadow ? "ready" : "held")}>{canReviewAiShadow ? "founder ready" : "read only"}</span></div>
                        <WorkspaceInput
                            className={styles.input}
                            disabled={!canReviewAiShadow || saving}
                            max={1440}
                            min={0}
                            onChange={(event) => setAiShadowReviewMinutes(Math.max(0, Number(event.target.value) || 0))}
                            type="number"
                            value={aiShadowReviewMinutes}
                        />
                        <span>Founder attention minutes for this review.</span>
                        <WorkspaceTextarea
                            className={styles.textareaSmall}
                            disabled={!canReviewAiShadow || saving}
                            maxLength={500}
                            onChange={(event) => setAiShadowReviewReason(event.target.value)}
                            placeholder="Reason required for edit, reject, or hold"
                            value={aiShadowReviewReason}
                        />
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>AI Volume Runs</h2><span className={styles.tag}>{data.workspace.aiVolumeRuns.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.aiVolumeRuns.map((run) => (
                                <div className={styles.listItem} key={run.volumeRunId}>
                                    <div><strong>{run.targetIds.length} targets / {run.tasks.length} tasks</strong><span>{run.completedPairCount}/{run.requestedPairCount} pairs / {run.modelCallCount} model calls</span></div>
                                    <span className={tagClass(run.status)}>{run.status}</span>
                                    <span>${Number(run.estimatedCostUsd || 0).toFixed(3)} estimated / ${Number(run.maxEstimatedCostUsd || 0).toFixed(2)} founder max</span>
                                    {run.failureCodes.length ? <span>{run.failureCodes.join(", ")}</span> : null}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Provider AI Runs</h2><span className={styles.tag}>{data.workspace.aiWorkerRuns.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.aiWorkerRuns.map((run) => (
                                <div className={styles.listItem} key={run.aiRunId}>
                                    <div><strong>{run.task || run.workerType}</strong><span>{run.provider} / {run.model} / {run.targetId}</span></div>
                                    <span className={tagClass(run.reviewDecision || (!run.provider || !run.modelEvalId ? "held" : run.confidence === "low" ? "held" : "pending"))}>{run.reviewDecision || (!run.provider || !run.modelEvalId ? "legacy run" : "pending review")}</span>
                                    <span>{run.confidence} confidence / {run.rejectedFactCount || 0} rejected facts / {run.modelCallCount || 1} calls / {run.founderAttentionMinutes || 0} min</span>
                                    {run.criticVerdict ? <span>critic {run.criticVerdict} / {run.criticConfidence} / {run.escalated ? `escalated ${run.escalationModel}` : run.escalationBlocked ? "escalation blocked" : "no escalation"}</span> : null}
                                    {run.reviewReason ? <span>{run.reviewReason}</span> : null}
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={!canReviewAiShadow || saving || !run.provider || !run.modelEvalId} onClick={() => reviewAiShadowRun(run.aiRunId, "accepted")} type="button">Accept</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={!canReviewAiShadow || saving || !run.provider || !run.modelEvalId || !aiShadowReviewReason.trim()} onClick={() => reviewAiShadowRun(run.aiRunId, "edited")} type="button">Edited</WorkspaceButton>
                                        <WorkspaceButton className={styles.dangerButton} disabled={!canReviewAiShadow || saving || !run.provider || !run.modelEvalId || !aiShadowReviewReason.trim()} onClick={() => reviewAiShadowRun(run.aiRunId, "rejected")} type="button">Reject</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={!canReviewAiShadow || saving || !run.provider || !run.modelEvalId || !aiShadowReviewReason.trim()} onClick={() => reviewAiShadowRun(run.aiRunId, "held")} type="button">Hold</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Rules Scores</h2><span className={styles.tag}>{data.workspace.scores.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.scores.map((score) => (
                                <div className={styles.listItem} key={score.scoreId}>
                                    <strong>target_score</strong>
                                    <span>{score.segment} / {score.targetId}</span>
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
                        <WorkspaceSelect className={styles.input} onChange={(event) => setChannel(event.target.value)} value={channel}>
                            <option value="email">email</option>
                            <option value="whatsapp">whatsapp</option>
                            <option value="instagram">instagram</option>
                            <option value="messenger">messenger</option>
                        </WorkspaceSelect>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSequencerProvider(event.target.value)} value={sequencerProvider}>
                            <option value="owned-email">owned-email</option>
                            <option value="smartlead">smartlead</option>
                            <option value="instantly">instantly</option>
                            <option value="lemlist">lemlist</option>
                        </WorkspaceSelect>
                        {resolvedSenderDomainId ? <div className={styles.statusRow}><span>Sender domain</span><span className={tagClass("ready")}>{resolvedSenderDomainId}</span></div> : <div className={styles.alert}>No ready sender domain.</div>}
                        <div className={styles.list}>
                            {approvedItems.map((approval) => (
                                <div className={styles.listItem} key={approval.approvalId}>
                                    <strong>{approval.targetName}</strong>
                                    <span>{approval.reviewReason}</span>
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => prepareChannelHandoff(approval.approvalId)} type="button">Handoff</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => createSequencerHandoff(approval.approvalId)} type="button">{sequencerProvider === "owned-email" ? "Queue Owned" : "Sequencer"}</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !data.setup.providerSendEnabled} onClick={() => sendApprovedMessage(approval.approvalId)} type="button">Send</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Channel Window</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || channel === "email"} onClick={upsertChannelWindow} type="button">Save</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setChannel(event.target.value)} value={channel}>
                                <option value="whatsapp">whatsapp</option>
                                <option value="instagram">instagram</option>
                                <option value="messenger">messenger</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setChannelWindowSource(event.target.value)} value={channelWindowSource}>
                                <option value="inbound">inbound</option>
                                <option value="opt-in">opt-in</option>
                                <option value="ad-click">ad-click</option>
                                <option value="template">template</option>
                                <option value="manual">manual</option>
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setChannelWindowStatus(event.target.value)} value={channelWindowStatus}>
                            <option value="open">open</option>
                            <option value="closed">closed</option>
                            <option value="expired">expired</option>
                            <option value="blocked">blocked</option>
                            <option value="needs-template">needs-template</option>
                        </WorkspaceSelect>
                        <div className={styles.list}>
                            {data.workspace.channelWindows.map((windowState) => (
                                <div className={styles.listItem} key={windowState.channelWindowId}>
                                    <strong>{windowState.channel}</strong>
                                    <span>{windowState.targetName || windowState.targetId || "global"} / {windowState.source}</span>
                                    <span className={tagClass(windowState.status)}>{windowState.eligibleForHandoff ? "eligible" : windowState.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <form className={styles.panel} onSubmit={holdSenderDomain}>
                        <div className={styles.panelHeader}>
                            <h2>Sender Domain</h2>
                            <div className={styles.rowActions}>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !senderDomain.trim()} type="submit">Register Hold</WorkspaceButton>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !senderDomain.trim()} onClick={readySenderDomain} type="button">Mark Ready</WorkspaceButton>
                            </div>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setSenderDomain(event.target.value)} value={senderDomain} />
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
                                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !data.setup.providerSendEnabled} onClick={() => sendOwnedSequenceStep(handoff.sequencerHandoffId)} type="button">Send Step</WorkspaceButton>
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
        if (activeSection === "content") {
            const contentChannelOptions = ["linkedin", "x", "email", "newsletter", "partner-brief", "blog", "short-video", "other"];
            const proofScopeOptions = ["internal-learning", "anonymous-aggregate", "business-name", "logo", "quotation", "before-after-screenshots", "public-case-study", "partner-material"];
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={upsertProofPermission}>
                        <div className={styles.panelHeader}>
                            <h2>Proof Permission</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !canConfigureSignalDesk || !resolvedTargetId || !proofPermissionEvidenceRef.trim() || !proofPermissionScopes.length} type="submit">Save</WorkspaceButton>
                        </div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceInput className={styles.input} onChange={(event) => setProofPermissionEvidenceRef(event.target.value)} placeholder="Consent record or evidence reference" value={proofPermissionEvidenceRef} />
                        <WorkspaceInput className={styles.input} onChange={(event) => setProofPermissionExpiresAt(event.target.value)} placeholder="Optional expiry ISO time" value={proofPermissionExpiresAt} />
                        <div className={styles.checkboxGrid}>
                            {proofScopeOptions.map((scope) => (
                                <WorkspaceInput className={styles.checkboxLabel} checked={proofPermissionScopes.includes(scope)} key={scope} onChange={() => toggleProofPermissionScope(scope)} type="checkbox">
                                    {scope}
                                </WorkspaceInput>
                            ))}
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => selectProofPermissionForEdit(event.target.value)} value={resolvedProofPermissionEditorId}>
                            <option value="">New permission</option>
                            {data.workspace.proofPermissions.map((permission) => (
                                <option key={permission.proofPermissionId} value={permission.proofPermissionId}>{permission.targetName || permission.targetId} / {permission.status}</option>
                            ))}
                        </WorkspaceSelect>
                    </form>
                    <form className={styles.panel} onSubmit={upsertContentSource}>
                        <div className={styles.panelHeader}>
                            <h2>Source</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !contentSourceTitle.trim() || Boolean(selectedContentSourceId && !selectedContentSource) || Boolean(contentSourceStatus === "active" && contentSourceDefaultMarketPodId && !approvedContentMarketPods.some((pod) => pod.marketPodId === contentSourceDefaultMarketPodId))} type="submit">Save</WorkspaceButton>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentSourceTitle(event.target.value)} value={contentSourceTitle} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} disabled={Boolean(selectedContentSource)} onChange={(event) => setContentSourceType(event.target.value as SignalDeskContentSourceType)} value={contentSourceType}>
                                <option value="manual">manual</option>
                                <option value="blog">blog</option>
                                <option value="changelog">changelog</option>
                                <option value="proof-page">proof-page</option>
                                <option value="demo">demo</option>
                                <option value="case-note">case-note</option>
                                <option value="customer-story">customer-story</option>
                                <option value="youtube">youtube</option>
                                <option value="podcast">podcast</option>
                                <option value="other">other</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentSourceAudience(event.target.value as SignalDeskContentSourceSummary["defaultAudience"])} value={contentSourceAudience}>
                                <option value="restaurant-owner">restaurant-owner</option>
                                <option value="agency-partner">agency-partner</option>
                                <option value="trust-partner">trust-partner</option>
                                <option value="local-operator">local-operator</option>
                                <option value="general">general</option>
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceInput className={styles.input} disabled={Boolean(selectedContentSource)} onChange={(event) => setContentSourceUrl(event.target.value)} value={contentSourceUrl} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentSourceStatus(event.target.value as SignalDeskControlStatus)} value={contentSourceStatus}>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                                <option value="hold">hold</option>
                                <option value="blocked">blocked</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentSourceDefaultMarketPodId(event.target.value)} value={contentSourceDefaultMarketPodId}>
                                <option value="">No default market pod</option>
                                {contentSourceDefaultMarketPodId && !approvedContentMarketPods.some((pod) => pod.marketPodId === contentSourceDefaultMarketPodId) ? (
                                    <option disabled value={contentSourceDefaultMarketPodId}>Current pod is not founder-approved</option>
                                ) : null}
                                {approvedContentMarketPods.map((pod) => (
                                    <option key={pod.marketPodId} value={pod.marketPodId}>{pod.name}</option>
                                ))}
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => selectContentSourceForEdit(event.target.value)} value={selectedContentSourceId}>
                            <option value="">New source</option>
                            {data.workspace.contentSources.map((source) => (
                                <option key={source.contentSourceId} value={source.contentSourceId}>{source.title}</option>
                            ))}
                        </WorkspaceSelect>
                    </form>
                    <form className={styles.panel} onSubmit={createContentAsset}>
                        <div className={styles.panelHeader}>
                            <h2>Asset</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !contentAssetTitle.trim() || !contentAssetMessage.trim() || Boolean(selectedContentAssetSourceId && !selectedContentAssetSourceUsable) || (contentAssetProofLevel === "customer-proof" && (!resolvedContentAssetProofPermissionId || !resolvedContentAssetPublicProofScopes.length))} type="submit">Create</WorkspaceButton>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentAssetTitle(event.target.value)} value={contentAssetTitle} />
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setContentAssetMessage(event.target.value)} value={contentAssetMessage} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentAssetSourceId(event.target.value)} value={selectedContentAssetSourceId}>
                            <option value="">Standalone asset</option>
                            {data.workspace.contentSources.map((source) => {
                                const usable = source.status === "active" && (!source.defaultMarketPodId || approvedContentMarketPods.some((pod) => pod.marketPodId === source.defaultMarketPodId));
                                return <option disabled={!usable} key={source.contentSourceId} value={source.contentSourceId}>{source.title}{usable ? "" : " / unavailable"}</option>;
                            })}
                        </WorkspaceSelect>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentCtaId(event.target.value)} value={selectedContentCtaId}>
                                <option value="">Use canonical active CTA</option>
                                {data.workspace.selfServiceCtas.filter((cta) => cta.status === "active").map((cta) => (
                                    <option key={cta.ctaId} value={cta.ctaId}>{cta.label}</option>
                                ))}
                            </WorkspaceSelect>
                            <WorkspaceSelect
                                className={styles.input}
                                disabled={Boolean(selectedContentAssetSource)}
                                onChange={(event) => setSelectedContentMarketPodId(event.target.value)}
                                value={selectedContentAssetSource?.defaultMarketPodId || resolvedContentMarketPodId}
                            >
                                <option value="">No market pod</option>
                                {approvedContentMarketPods.map((pod) => (
                                    <option key={pod.marketPodId} value={pod.marketPodId}>{pod.name}</option>
                                ))}
                            </WorkspaceSelect>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} disabled={Boolean(selectedContentAssetSource)} onChange={(event) => setContentAssetSourceType(event.target.value as SignalDeskContentSourceType)} value={selectedContentAssetSource?.sourceType || contentAssetSourceType}>
                                <option value="manual">manual</option>
                                <option value="proof-page">proof-page</option>
                                <option value="demo">demo</option>
                                <option value="case-note">case-note</option>
                                <option value="customer-story">customer-story</option>
                                <option value="blog">blog</option>
                                <option value="other">other</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} disabled={Boolean(selectedContentAssetSource)} onChange={(event) => setContentAssetAudience(event.target.value as SignalDeskContentSourceSummary["defaultAudience"])} value={selectedContentAssetSource?.defaultAudience || contentAssetAudience}>
                                <option value="restaurant-owner">restaurant-owner</option>
                                <option value="agency-partner">agency-partner</option>
                                <option value="trust-partner">trust-partner</option>
                                <option value="local-operator">local-operator</option>
                                <option value="general">general</option>
                            </WorkspaceSelect>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentAssetProofLevel(event.target.value)} value={contentAssetProofLevel}>
                                <option value="owned">owned</option>
                                <option value="customer-proof">customer-proof</option>
                                <option value="market-research">market-research</option>
                                <option value="internal-note">internal-note</option>
                            </WorkspaceSelect>
                            <WorkspaceInput className={styles.input} disabled={Boolean(selectedContentAssetSource)} onChange={(event) => setContentAssetUrl(event.target.value)} value={selectedContentAssetSource?.sourceUrl || contentAssetUrl} />
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => selectContentAsset(event.target.value)} value={resolvedContentAssetId}>
                            <option value="">No asset selected</option>
                            {data.workspace.contentAssets.map((asset) => (
                                <option key={asset.contentAssetId} value={asset.contentAssetId}>{asset.title}</option>
                            ))}
                        </WorkspaceSelect>
                        {contentAssetProofLevel === "customer-proof" ? (
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentAssetProofPermissionId(event.target.value)} value={resolvedContentAssetProofPermissionId}>
                                <option value="">Select proof permission</option>
                                {data.workspace.proofPermissions.filter((permission) => (
                                    isProofPermissionCurrentlyActive(permission)
                                    && permission.scopes.some((scope) => SIGNALDESK_PUBLIC_PROOF_SCOPES.has(scope))
                                )).map((permission) => (
                                    <option key={permission.proofPermissionId} value={permission.proofPermissionId}>
                                        {permission.targetName || permission.targetId} / {permission.scopes.filter((scope) => SIGNALDESK_PUBLIC_PROOF_SCOPES.has(scope)).join(", ")}
                                    </option>
                                ))}
                            </WorkspaceSelect>
                        ) : null}
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Drafts</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedContentAssetId || !contentDraftChannels.length} onClick={generateContentDrafts} type="button">Generate</WorkspaceButton>
                        </div>
                        <div className={styles.checkboxGrid}>
                            {contentChannelOptions.map((channelOption) => (
                                <WorkspaceInput className={styles.checkboxLabel} checked={contentDraftChannels.includes(channelOption)} key={channelOption} onChange={() => toggleContentDraftChannel(channelOption)} type="checkbox">
                                    {channelOption}
                                </WorkspaceInput>
                            ))}
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentScheduleAt(event.target.value)} placeholder="2026-06-25T09:00:00.000Z" value={contentScheduleAt} />
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}>
                            <h2>Performance</h2>
                            <WorkspaceButton
                                className={styles.button}
                                disabled={actionDisabled
                                    || !resolvedContentAssetId
                                    || !resolvedContentPerformanceChannel
                                    || contentPerformancePublicationIncomplete
                                    || ((contentPerformanceHasObservedMetrics || contentPerformanceHasPublicationEvidence) && !contentPerformanceDraftEligible)}
                                onClick={recordContentPerformance}
                                type="button"
                            >Record</WorkspaceButton>
                        </div>
                        <WorkspaceSelect
                            className={styles.input}
                            disabled={Boolean(selectedContentPerformanceDraft)}
                            onChange={(event) => selectContentPerformanceChannel(event.target.value as SignalDeskContentChannel | "")}
                            value={resolvedContentPerformanceChannel}
                        >
                            <option value="">Select channel</option>
                            {contentChannelOptions.map((channelOption) => (
                                <option key={channelOption} value={channelOption}>{channelOption}</option>
                            ))}
                        </WorkspaceSelect>
                        <WorkspaceSelect className={styles.input} onChange={(event) => selectContentDraft(event.target.value)} value={resolvedContentDraftId}>
                            <option value="">No draft selected</option>
                            {contentDraftsForSelectedAsset.map((draft) => (
                                <option key={draft.contentDraftId} value={draft.contentDraftId}>{draft.title} / {draft.status}</option>
                            ))}
                        </WorkspaceSelect>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentPerformancePublicationUrl(event.target.value)} placeholder="Published post URL" type="url" value={contentPerformancePublicationUrl} />
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentPerformancePublishedAt(event.target.value)} placeholder="Published time, for example 2026-07-15T10:30:00+05:30" value={contentPerformancePublishedAt} />
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setContentPerformanceViews(Number(event.target.value))} type="number" value={contentPerformanceViews} />
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setContentPerformanceClicks(Number(event.target.value))} type="number" value={contentPerformanceClicks} />
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setContentPerformanceOwnerLeads(Number(event.target.value))} type="number" value={contentPerformanceOwnerLeads} />
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setContentPerformanceSubmissions(Number(event.target.value))} type="number" value={contentPerformanceSubmissions} />
                        </div>
                        <WorkspaceInput className={styles.input} min={0} onChange={(event) => setContentPerformanceActivations(Number(event.target.value))} type="number" value={contentPerformanceActivations} />
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Sources</h2><span className={styles.tag}>{data.workspace.contentSources.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.contentSources.map((source) => (
                                <div className={styles.tableRowCompact} key={source.contentSourceId}>
                                    <div><strong>{source.title}</strong><span>{source.sourceType} / {source.defaultAudience}</span></div>
                                    <span className={tagClass(source.status)}>{source.status}</span>
                                    <span>{source.lastAssetAt || source.lastCheckedAt || "pending"}</span>
                                    <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => selectContentSourceForEdit(source.contentSourceId)} type="button">Edit</WorkspaceButton>
                                </div>
                            ))}
                            {!data.workspace.contentSources.length ? <div className={styles.empty}>No content source yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Assets</h2><span className={styles.tag}>{data.workspace.contentAssets.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.contentAssets.map((asset) => (
                                <div className={styles.tableRowCompact} key={asset.contentAssetId}>
                                    <div><strong>{asset.title}</strong><span>{asset.primaryAudience} / {asset.proofLevel}</span></div>
                                    <span className={tagClass(asset.status)}>{asset.status}</span>
                                    <span>{asset.sourceType}</span>
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={saving} onClick={() => selectContentAsset(asset.contentAssetId)} type="button">Select</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canApproveContent || asset.status === "ready" || asset.status === "distributed" || asset.status === "archived"} onClick={() => reviewContentAsset(asset.contentAssetId, "ready")} type="button">Ready</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canApproveContent || asset.status === "hold" || asset.status === "archived"} onClick={() => reviewContentAsset(asset.contentAssetId, "hold")} type="button">Hold</WorkspaceButton>
                                        <WorkspaceButton className={styles.dangerButton} disabled={actionDisabled || data.access.role !== "founder-admin" || asset.status === "archived"} onClick={() => reviewContentAsset(asset.contentAssetId, "archived")} type="button">Archive</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                            {!data.workspace.contentAssets.length ? <div className={styles.empty}>No content asset yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Distribution Drafts</h2><span className={styles.tag}>{data.workspace.contentDistributionDrafts.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.contentDistributionDrafts.map((draft) => (
                                <div className={styles.tableRowCompact} key={draft.contentDraftId}>
                                    <div><strong>{draft.title}</strong><span>{draft.hook}</span></div>
                                    <span className={tagClass(draft.approvalStatus)}>{draft.approvalStatus}</span>
                                    <span className={tagClass(draft.status)}>{draft.status}</span>
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={saving} onClick={() => selectContentDraft(draft.contentDraftId)} type="button">Select</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || draft.approvalStatus === "approved"} onClick={() => reviewContentDraft(draft.contentDraftId, "approved")} type="button">Approve</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || draft.approvalStatus === "rejected"} onClick={() => reviewContentDraft(draft.contentDraftId, "rejected")} type="button">Reject</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || draft.approvalStatus !== "approved"} onClick={() => scheduleContentDraft(draft.contentDraftId)} type="button">Schedule</WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                            {!data.workspace.contentDistributionDrafts.length ? <div className={styles.empty}>No distribution draft yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Calendar</h2><span className={styles.tag}>{data.workspace.contentCalendarItems.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.contentCalendarItems.map((item) => (
                                <div className={styles.tableRowCompact} key={item.contentCalendarItemId}>
                                    <div><strong>{item.channel}</strong><span>{item.contentDraftId}</span></div>
                                    <span className={tagClass(item.status)}>{item.status}</span>
                                    <span>{item.scheduledFor}</span>
                                    <span>{item.publicationUrl || item.publishedAt || "not published"}</span>
                                </div>
                            ))}
                            {!data.workspace.contentCalendarItems.length ? <div className={styles.empty}>No calendar item yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Performance Records</h2><span className={styles.tag}>{data.workspace.contentPerformanceSummaries.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.contentPerformanceSummaries.map((record) => (
                                <div className={styles.tableRowCompact} key={record.contentPerformanceId}>
                                    <div><strong>{record.channel}</strong><span>{record.contentAssetId}</span></div>
                                    <span>{record.views} views</span>
                                    <span>{record.clicks} clicks</span>
                                    <span>{record.ownerLeads + record.currentListSubmissions + record.activations} owner signals</span>
                                    <span>{record.publicationUrl || "no publication"}</span>
                                </div>
                            ))}
                            {!data.workspace.contentPerformanceSummaries.length ? <div className={styles.empty}>No performance record yet.</div> : null}
                        </div>
                    </div>
                </section>
            );
        }
        if (activeSection === "partners") {
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={upsertTrustPartnerProfile}>
                        <div className={styles.panelHeader}>
                            <h2>Partner Profile</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !partnerName.trim()} type="submit">Save</WorkspaceButton>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setPartnerName(event.target.value)} value={partnerName} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setPartnerType(event.target.value)} value={partnerType}>
                                <option value="restaurant-consultant">restaurant-consultant</option>
                                <option value="menu-photographer">menu-photographer</option>
                                <option value="local-business-creator">local-business-creator</option>
                                <option value="agency-freelancer">agency-freelancer</option>
                                <option value="pos-payment-partner">pos-payment-partner</option>
                                <option value="operator-advocate">operator-advocate</option>
                                <option value="generic-creator">generic-creator</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setPartnerChannel(event.target.value)} value={partnerChannel}>
                                <option value="instagram">instagram</option>
                                <option value="youtube">youtube</option>
                                <option value="tiktok">tiktok</option>
                                <option value="linkedin">linkedin</option>
                                <option value="newsletter">newsletter</option>
                                <option value="community">community</option>
                                <option value="offline">offline</option>
                                <option value="other">other</option>
                            </WorkspaceSelect>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setPartnerGeography(event.target.value)} value={partnerGeography} />
                            <WorkspaceInput className={styles.input} max={100} min={0} onChange={(event) => setPartnerScore(Number(event.target.value))} type="number" value={partnerScore} />
                        </div>
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setPartnerSourceNotes(event.target.value)} value={partnerSourceNotes} />
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Niche Test</h2><WorkspaceButton className={styles.button} disabled={actionDisabled} onClick={createTrustPartnerNicheTest} type="button">Create</WorkspaceButton></div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setNicheName(event.target.value)} value={nicheName} />
                        <WorkspaceInput className={styles.input} max={5} min={1} onChange={(event) => setNicheAttempts(Number(event.target.value))} type="number" value={nicheAttempts} />
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setNicheAngle(event.target.value)} value={nicheAngle} />
                        <div className={styles.statusRow}><span>Market pod</span><span>{resolvedMarketPodId || "none"}</span></div>
                        <div className={styles.statusRow}><span>Partner</span><span>{resolvedPartnerId || "none"}</span></div>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Deal And Brief</h2><WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedPartnerId} onClick={reviewTrustPartnerDeal} type="button">Approve Deal</WorkspaceButton></div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} max={100000} min={0} onChange={(event) => setDealFeeUsd(Number(event.target.value))} type="number" value={dealFeeUsd} />
                            <WorkspaceInput className={styles.input} max={10} min={1} onChange={(event) => setDealDeliverables(Number(event.target.value))} type="number" value={dealDeliverables} />
                        </div>
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setBriefText(event.target.value)} value={briefText} />
                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedPartnerId} onClick={createTrustPartnerBrief} type="button">Create Brief</WorkspaceButton>
                    </div>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Deliverable And Metrics</h2><WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedPartnerId} onClick={recordTrustPartnerDeliverable} type="button">Record</WorkspaceButton></div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setDeliverablePostUrl(event.target.value)} placeholder="Post URL" value={deliverablePostUrl} />
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setMetricViews(Number(event.target.value))} type="number" value={metricViews} />
                            <WorkspaceInput className={styles.input} min={0} onChange={(event) => setMetricOwnerLeads(Number(event.target.value))} type="number" value={metricOwnerLeads} />
                        </div>
                        <div className={styles.rowActions}>
                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedPartnerId} onClick={recordTrustPartnerMetrics} type="button">Record Metrics</WorkspaceButton>
                            <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedPartnerId} onClick={reviewTrustPartnerRenewal} type="button">Renewal</WorkspaceButton>
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Profiles</h2><span className={styles.tag}>{data.workspace.trustPartnerProfiles.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.trustPartnerProfiles.map((partner) => (
                                <div className={styles.tableRowCompact} key={partner.partnerId}>
                                    <div><strong>{partner.displayName}</strong><span>{partner.partnerType} / {partner.channel}</span></div>
                                    <span className={tagClass(partner.status)}>{partner.status}</span>
                                    <span>{partner.trustScore} trust</span>
                                    <span>{partner.sourceNotes}</span>
                                </div>
                            ))}
                            {!data.workspace.trustPartnerProfiles.length ? <div className={styles.empty}>No partner profile yet.</div> : null}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Niche Tests And Deals</h2><span className={styles.tag}>{data.workspace.trustPartnerNicheTests.length + data.workspace.trustPartnerDeals.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.trustPartnerNicheTests.map((test) => (
                                <div className={styles.tableRowCompact} key={test.nicheTestId}>
                                    <div><strong>{test.nicheName}</strong><span>{test.angle}</span></div>
                                    <span className={tagClass(test.status)}>{test.status}</span>
                                    <span>{test.partnerCount}/{test.intendedAttempts}</span>
                                    <span className={tagClass(test.recommendation)}>{test.recommendation}</span>
                                </div>
                            ))}
                            {data.workspace.trustPartnerDeals.map((deal) => (
                                <div className={styles.tableRowCompact} key={deal.dealId}>
                                    <div><strong>{deal.partnerName}</strong><span>{deal.pricingModel} / ${deal.flatFeeUsd}</span></div>
                                    <span className={tagClass(deal.approvalStatus)}>{deal.approvalStatus}</span>
                                    <span>{deal.deliverableCount} deliverable</span>
                                    <span>{deal.paymentState}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Deliverables And Metrics</h2><span className={styles.tag}>{data.workspace.trustPartnerDeliverables.length + data.workspace.trustPartnerMetrics.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.trustPartnerDeliverables.map((deliverable) => (
                                <div className={styles.tableRowCompact} key={deliverable.deliverableId}>
                                    <div><strong>{deliverable.partnerId}</strong><span>{deliverable.postUrl || "no post URL"}</span></div>
                                    <span className={tagClass(deliverable.status)}>{deliverable.status}</span>
                                    <span className={tagClass(deliverable.reviewState)}>{deliverable.reviewState}</span>
                                    <span>{deliverable.disclosurePresent ? "disclosed" : "missing disclosure"}</span>
                                </div>
                            ))}
                            {data.workspace.trustPartnerMetrics.map((metric) => (
                                <div className={styles.tableRowCompact} key={metric.metricsId}>
                                    <div><strong>{metric.partnerId}</strong><span>{metric.views} views / {metric.comments} comments</span></div>
                                    <span>{metric.ownerLeads} leads</span>
                                    <span>{metric.currentListSubmissions} submissions</span>
                                    <span>{metric.activations} activations</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Renewal Decisions</h2><span className={styles.tag}>{data.workspace.trustPartnerRenewalDecisions.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.trustPartnerRenewalDecisions.map((decision) => (
                                <div className={styles.tableRowCompact} key={decision.decisionId}>
                                    <div><strong>{decision.partnerId}</strong><span>{decision.evidenceSummary}</span></div>
                                    <span className={tagClass(decision.recommendation)}>{decision.recommendation}</span>
                                    <span>{decision.ownerDecision || "pending"}</span>
                                    <span>{decision.nicheTestId || "no test"}</span>
                                </div>
                            ))}
                            {!data.workspace.trustPartnerRenewalDecisions.length ? <div className={styles.empty}>No renewal decision yet.</div> : null}
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
                    <form className={styles.panel} onSubmit={upsertTeamMember}>
                        <div className={styles.panelHeader}>
                            <h2>Team Access</h2>
                            <div className={styles.rowActions}>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={resetTeamMemberForm} type="button">Clear</WorkspaceButton>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !canConfigureSignalDesk || !teamMemberEmail.trim()} type="submit">
                                    {teamMemberId ? "Update" : "Add"}
                                </WorkspaceButton>
                            </div>
                        </div>
                        {!canConfigureSignalDesk ? <Alert message="SignalDesk configure permission is required." showIcon type="warning" /> : null}
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setTeamMemberEmail(event.target.value)} placeholder="Login email" value={teamMemberEmail} />
                            <WorkspaceInput className={styles.input} onChange={(event) => setTeamMemberName(event.target.value)} placeholder="Name" value={teamMemberName} />
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setTeamMemberRole(event.target.value as SignalDeskRole)} value={teamMemberRole}>
                                {TEAM_ROLE_OPTIONS.map((role) => (
                                    <option key={role.value} value={role.value}>{role.label}</option>
                                ))}
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setTeamMemberActive(event.target.value === "active")} value={teamMemberActive ? "active" : "inactive"}>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setTeamMemberUserId(event.target.value)} placeholder="Auth user ID (optional)" value={teamMemberUserId} />
                    </form>

                    <div className={styles.panelWide}>
                        <div className={styles.panelHeader}><h2>Team Members</h2><span className={styles.tag}>{data.workspace.teamMembers.length}</span></div>
                        <div className={styles.table}>
                            {data.workspace.teamMembers.map((member) => (
                                <div className={styles.tableRowCompact} key={member.teamMemberId}>
                                    <div><strong>{member.name || member.email}</strong><span>{member.email} / {member.userId || "email match"}</span></div>
                                    <span className={tagClass(member.status)}>{member.status}</span>
                                    <span>{member.role}</span>
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !canConfigureSignalDesk} onClick={() => editTeamMember(member)} type="button">Edit</WorkspaceButton>
                                        <WorkspaceButton
                                            className={member.active ? styles.dangerButton : styles.ghostButton}
                                            disabled={actionDisabled || !canConfigureSignalDesk}
                                            onClick={() => toggleTeamMemberActive(member, !member.active)}
                                            type="button"
                                        >
                                            {member.active ? "Deactivate" : "Reactivate"}
                                        </WorkspaceButton>
                                    </div>
                                </div>
                            ))}
                            {!data.workspace.teamMembers.length ? <div className={styles.empty}>No team members yet.</div> : null}
                        </div>
                    </div>

                    <form className={styles.panel} onSubmit={upsertConnectorSetting}>
                        <div className={styles.panelHeader}>
                            <h2>Connector</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !connectorName.trim()} type="submit">Save</WorkspaceButton>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => handleConnectorKindChange(event.target.value)} value={connectorKind}>
                                <option value="email-smtp">Email SMTP</option>
                                <option value="meta-whatsapp">Meta WhatsApp</option>
                                <option value="meta-instagram">Meta Instagram</option>
                                <option value="meta-messenger">Meta Messenger</option>
                                <option value="smartlead">Smartlead</option>
                                <option value="apify">Apify</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setConnectorStatus(event.target.value)} value={connectorStatus}>
                                <option value="hold">hold</option>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                                <option value="blocked">blocked</option>
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setConnectorName(event.target.value)} value={connectorName} />
                        {showEmailFields ? (
                            <>
                                <div className={styles.formGrid}>
                                    <WorkspaceInput className={styles.input} onChange={(event) => setConnectorFromName(event.target.value)} placeholder="From name" value={connectorFromName} />
                                    <WorkspaceInput className={styles.input} onChange={(event) => setConnectorSenderDomain(event.target.value)} placeholder="Sender domain" value={connectorSenderDomain} />
                                </div>
                                <div className={styles.formGrid}>
                                    <WorkspaceInput className={styles.input} onChange={(event) => setConnectorSenderEmail(event.target.value)} placeholder="Sender email" value={connectorSenderEmail} />
                                    <WorkspaceInput className={styles.input} onChange={(event) => setConnectorReplyToEmail(event.target.value)} placeholder="Reply-to email" value={connectorReplyToEmail} />
                                </div>
                            </>
                        ) : null}
                        {showMetaFields ? (
                            <>
                                <div className={styles.formGrid}>
                                    <WorkspaceInput className={styles.input} onChange={(event) => setConnectorAppId(event.target.value)} placeholder="Meta app ID" value={connectorAppId} />
                                    {showWhatsAppFields ? <WorkspaceInput className={styles.input} onChange={(event) => setConnectorPhoneNumberId(event.target.value)} placeholder="Phone number ID" value={connectorPhoneNumberId} /> : null}
                                    {showInstagramFields ? <WorkspaceInput className={styles.input} onChange={(event) => setConnectorInstagramPageId(event.target.value)} placeholder="Instagram page ID" value={connectorInstagramPageId} /> : null}
                                    {showMessengerFields ? <WorkspaceInput className={styles.input} onChange={(event) => setConnectorMessengerPageId(event.target.value)} placeholder="Messenger page ID" value={connectorMessengerPageId} /> : null}
                                </div>
                                {showWhatsAppFields ? <WorkspaceInput className={styles.input} onChange={(event) => setConnectorPhoneNumber(event.target.value)} placeholder="Display number" value={connectorPhoneNumber} /> : null}
                            </>
                        ) : null}
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setConnectorNotes(event.target.value)} placeholder="Notes" value={connectorNotes} />
                    </form>

                    <form className={styles.panel} onSubmit={holdSenderDomain}>
                        <div className={styles.panelHeader}>
                            <h2>Sender Domain</h2>
                            <div className={styles.rowActions}>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !senderDomain.trim()} type="submit">Hold</WorkspaceButton>
                                <WorkspaceButton className={styles.button} disabled={actionDisabled || !senderDomain.trim()} onClick={readySenderDomain} type="button">Ready</WorkspaceButton>
                            </div>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setSenderDomain(event.target.value)} value={senderDomain} />
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
                    <DashboardSection
                        actionDisabled={actionDisabled}
                        data={data}
                        mobileReadOnly={mobileReadOnly}
                        onDraft={createDraft}
                        onEvidence={createEvidence}
                        onResearchSubmit={createResearchAgentRun}
                        onScore={scoreTarget}
                        researchMaxResults={researchMaxResults}
                        researchPrompt={researchPrompt}
                        researchProvider={researchProvider}
                        researchType={researchType}
                        resolvedResearchPolicyId={resolvedResearchPolicyId}
                        saving={saving}
                        setResearchMaxResults={setResearchMaxResults}
                        setResearchPrompt={setResearchPrompt}
                        setResearchProvider={setResearchProvider}
                        setResearchType={setResearchType}
                    />
                    <section className={styles.contentGrid}>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Scoped Pause</h2>
                                <WorkspaceButton
                                    className={scopedPauseActive ? styles.button : styles.dangerButton}
                                    disabled={scopedPauseDisabled}
                                    onClick={handleScopedPauseToggle}
                                    type="button"
                                >
                                    {scopedPauseActive ? (mobileReadOnly ? "Paused" : "Clear") : "Pause"}
                                </WorkspaceButton>
                            </div>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setPauseScope(event.target.value as SignalDeskKillSwitchScope)} value={pauseScope}>
                                {PAUSE_SCOPES.map((scope) => (
                                    <option key={scope} value={scope}>{scope}</option>
                                ))}
                            </WorkspaceSelect>
                            <div className={styles.statusRow}><span>Selected scope</span><span className={tagClass(scopedPauseActive ? "warning" : "good")}>{scopedPauseActive ? "paused" : "clear"}</span></div>
                        </div>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}><h2>Advanced Controls</h2><span className={styles.tag}>internal</span></div>
                            <div className={styles.rowActions}>
                                {[
                                    ["Team & connectors", SIGNALDESK_ROUTES.SETTINGS],
                                    ["Source policies", SIGNALDESK_ROUTES.POLICIES],
                                    ["Source providers", SIGNALDESK_ROUTES.SOURCES],
                                    ["Channels", SIGNALDESK_ROUTES.CHANNELS],
                                    ["AI controls", SIGNALDESK_ROUTES.AI],
                                    ["Content", SIGNALDESK_ROUTES.CONTENT],
                                    ["Partners", SIGNALDESK_ROUTES.PARTNERS],
                                    ["Audit", SIGNALDESK_ROUTES.AUDIT],
                                ].map(([label, href]) => (
                                    <WorkspaceButton className={styles.ghostButton} key={href} onClick={() => router.push(withSignalDeskBasePath(href, basePath))} type="button">{label}</WorkspaceButton>
                                ))}
                            </div>
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
        <Layout
            className={styles.dashboardFrame}
            style={{
                background: token.colorBgLayout,
                color: token.colorTextBase,
            }}
        >
            {!mobileReadOnly ? (
                <DashboardSidebarShell
                    ariaLabel="SignalDesk sections"
                    collapsedWidth={DASHBOARD_SIDEBAR_COLLAPSED_WIDTH}
                    expandedWidth={SIGNALDESK_SIDEBAR_EXPANDED_WIDTH}
                    isCollapsed={isCollapsed}
                    logoCollapsed={<span className={styles.sidebarBrandMark}>SD</span>}
                    logoExpanded={
                        <div className={styles.sidebarBrand}>
                            <span className={styles.sidebarBrandMark}>SD</span>
                            <span>SignalDesk</span>
                        </div>
                    }
                    navItems={navItems}
                    onExpandedChange={setSidebarShellExpanded}
                />
            ) : null}

            <Drawer
                destroyOnClose
                onClose={() => setMobileNavOpen(false)}
                open={mobileNavOpen}
                placement="left"
                styles={{
                    body: { padding: 0 },
                    content: { overflow: "hidden" },
                    header: { display: "none" },
                }}
                width={280}
            >
                <DashboardSidebarShell
                    ariaLabel="SignalDesk sections"
                    expandedWidth={SIGNALDESK_SIDEBAR_EXPANDED_WIDTH}
                    logoCollapsed={<span className={styles.sidebarBrandMark}>SD</span>}
                    logoExpanded={
                        <div className={styles.sidebarBrand}>
                            <span className={styles.sidebarBrandMark}>SD</span>
                            <span>SignalDesk</span>
                        </div>
                    }
                    mobile
                    navItems={navItems}
                />
            </Drawer>

            <Drawer
                destroyOnClose
                onClose={() => setSelectedOpportunityId("")}
                open={Boolean(selectedOpportunity)}
                placement="right"
                title={selectedOpportunity?.displayName || "Opportunity Case"}
                width="min(520px, 100vw)"
            >
                {selectedOpportunity ? (
                    <div className={styles.stack}>
                        <div className={styles.statusList}>
                            <div className={styles.statusRow}><span>State</span><span className={tagClass(selectedOpportunity.state)}>{selectedOpportunity.state.replace(/_/g, " ")}</span></div>
                            <div className={styles.statusRow}><span>Truth gap</span><span>{opportunityLabelForLead(selectedOpportunity.truthGap)}</span></div>
                            <div className={styles.statusRow}><span>Allowed route</span><span>{selectedOpportunity.allowedRoute}</span></div>
                            <div className={styles.statusRow}><span>Source policy</span><span>{selectedOpportunity.sourcePolicyState}</span></div>
                            <div className={styles.statusRow}><span>Owner qualified</span><span>{selectedOpportunity.ownerQualifiedAt || "not yet"}</span></div>
                            <div className={styles.statusRow}><span>Activation deadline</span><span>{selectedOpportunity.activationDeadlineAt || "not started"}</span></div>
                        </div>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}><h2>Decision Basis</h2><span className={styles.tag}>{selectedOpportunity.evidenceGrade}</span></div>
                            <div className={styles.list}>
                                <div className={styles.listItem}><strong>Route</strong><span>{selectedOpportunity.allowedRouteReason}</span></div>
                                <div className={styles.listItem}><strong>Next action</strong><span>{selectedOpportunity.nextAction}</span></div>
                                {selectedOpportunity.hardGateFailures.map((failure) => (
                                    <div className={styles.listItem} key={failure}><strong>Gate</strong><span>{failure}</span></div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}><h2>Dimensions</h2><span className={styles.tag}>separate</span></div>
                            <div className={styles.statusList}>
                                {Object.entries(selectedOpportunity.dimensions).map(([label, value]) => (
                                    <div className={styles.statusRow} key={label}><span>{label}</span><span>{value}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : null}
            </Drawer>

            <Layout
                className={styles.dashboardBody}
                style={{
                    background: token.colorBgLayout,
                    paddingLeft: mobileReadOnly ? 0 : `${sidebarOffset}px`,
                }}
            >
                <DashboardHeaderShell
                    className={styles.dashboardHeader}
                    left={
                        <Flex align="center" gap={10} className={styles.headerLeft}>
                            {mobileReadOnly ? (
                                <Tooltip title="Open navigation">
                                    <Button
                                        aria-label="Open navigation"
                                        icon={<LuMenu />}
                                        onClick={() => setMobileNavOpen(true)}
                                        type="text"
                                    />
                                </Tooltip>
                            ) : (
                                <Tooltip title={isCollapsed ? "Expand navigation" : "Collapse navigation"}>
                                    <Button
                                        aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                                        icon={isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
                                        onClick={() => dispatch(toggleSidbar(!isCollapsed))}
                                        type="text"
                                    />
                                </Tooltip>
                            )}
                            <div className={styles.headerTitle}>
                                <span>MenuList SignalDesk</span>
                                <strong>{meta.title}</strong>
                            </div>
                        </Flex>
                    }
                    right={
                        <Flex align="center" gap={8} wrap>
                            {mobileReadOnly ? <Text type="secondary">Observe-only mobile</Text> : null}
                            <Tooltip title="Refresh workspace">
                                <Button
                                    aria-label="Refresh SignalDesk"
                                    disabled={loading}
                                    icon={<LuRefreshCw />}
                                    onClick={() => void refresh()}
                                    type="text"
                                />
                            </Tooltip>
                            <Tooltip title={isDarkMode ? "Use light mode" : "Use dark mode"}>
                                <Button
                                    aria-label={isDarkMode ? "Use light mode" : "Use dark mode"}
                                    icon={isDarkMode ? <LuSun /> : <LuMoon />}
                                    onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
                                    type="text"
                                />
                            </Tooltip>
                            <Button
                                danger={!globalPauseActive}
                                disabled={globalPauseDisabled}
                                icon={<LuPauseCircle />}
                                onClick={handlePauseToggle}
                                type={globalPauseActive ? "primary" : "default"}
                            >
                                {globalPauseActive ? (mobileReadOnly ? "Paused" : "Clear Pause") : "Global Pause"}
                            </Button>
                        </Flex>
                    }
                />

                <Content className={styles.dashboardContent}>
                    <div className={styles.pageIntro}>
                        <Text type="secondary">Private internal tool</Text>
                        <Typography.Title level={2}>{meta.title}</Typography.Title>
                        <Typography.Paragraph type="secondary">{meta.description}</Typography.Paragraph>
                    </div>

                    {error ? <Alert message={error} showIcon type="error" /> : null}
                    {loading || !data ? <LoadingState /> : (
                        <>
                            <SetupAlert data={data} />
                            {renderSection()}
                        </>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
}
