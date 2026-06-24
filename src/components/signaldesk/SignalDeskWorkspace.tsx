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
import { getDarkModeState, getSidebarState, toggleDarkMode, toggleSidbar } from "@reduxSlices/clientThemeConfig";
import type {
    SignalDeskApprovalItem,
    SignalDeskKillSwitchScope,
    SignalDeskSection,
    SignalDeskTargetSummary,
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
    LuArchive,
    LuBarChart3,
    LuBell,
    LuClipboardCheck,
    LuDatabase,
    LuFileText,
    LuGlobe2,
    LuInbox,
    LuListChecks,
    LuMegaphone,
    LuMenu,
    LuMoon,
    LuPanelLeftClose,
    LuPanelLeftOpen,
    LuPauseCircle,
    LuRefreshCw,
    LuRouter,
    LuSend,
    LuSettings,
    LuShield,
    LuSparkles,
    LuSun,
    LuTarget,
} from "react-icons/lu";
import { useSignalDeskBasePath, withSignalDeskBasePath } from "./SignalDeskPathProvider";
import styles from "./SignalDeskWorkspace.module.scss";

const { Content } = Layout;
const { Text } = Typography;
const SIGNALDESK_SIDEBAR_EXPANDED_WIDTH = 220;

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
        label: "Dashboard",
        title: "SignalDesk Dashboard",
    },
    mission: {
        description: "Daily founder mission, experiment cards, approved offers, reply playbooks, and source-learning decisions.",
        label: "Mission",
        title: "Daily Growth Mission",
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
    { href: SIGNALDESK_ROUTES.MISSION, icon: LuListChecks, section: "mission" },
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
    { href: SIGNALDESK_ROUTES.CONTENT, icon: LuMegaphone, section: "content" },
    { href: SIGNALDESK_ROUTES.PARTNERS, icon: LuTarget, section: "partners" },
    { href: SIGNALDESK_ROUTES.SETTINGS, icon: LuSettings, section: "settings" },
    { href: SIGNALDESK_ROUTES.CONTROL_ROOM, icon: LuAlertTriangle, section: "control-room" },
    { href: SIGNALDESK_ROUTES.AUDIT, icon: LuArchive, section: "audit" },
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
const firstMarketPodId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.marketPods[0]?.marketPodId || "";
const firstPartnerId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerProfiles[0]?.partnerId || "";
const firstNicheTestId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerNicheTests[0]?.nicheTestId || "";
const firstTrustDealId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerDeals[0]?.dealId || "";
const firstTrustDeliverableId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.trustPartnerDeliverables[0]?.deliverableId || "";
const firstTrustBudgetId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.budgetPolicies.find((budget) => budget.scope === "trust-partner")?.budgetPolicyId || ""
);
const firstCtaId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.selfServiceCtas[0]?.ctaId || "";
const firstGrowthMissionId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.growthMissions[0]?.growthMissionId || "";
const firstExperimentCardId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.experimentCards[0]?.experimentCardId || "";
const firstOfferCtaId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.offerCtas[0]?.offerCtaId || "";
const firstReplyPlaybookId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.replyPlaybooks[0]?.playbookId || "";
const firstSourceRunId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.imports[0]?.sourceRunId || "";
const firstContentSourceId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.contentSources[0]?.contentSourceId || "";
const firstContentAssetId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.contentAssets[0]?.contentAssetId || "";
const firstContentDraftId = (data: SignalDeskWorkspaceResponse | null) => data?.workspace.contentDistributionDrafts[0]?.contentDraftId || "";
const firstReadySenderDomainId = (data: SignalDeskWorkspaceResponse | null) => (
    data?.workspace.senderDomains.find((sender) => (
        sender.status === "active" &&
        sender.authenticationState === "ready" &&
        sender.unsubscribeReady &&
        sender.brandRisk !== "high"
    ))?.senderDomainId || ""
);

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
    const dispatch = useAppDispatch();
    const router = useRouter();
    const basePath = useSignalDeskBasePath();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [sidebarShellExpanded, setSidebarShellExpanded] = useState(false);
    const [mobileReadOnly, setMobileReadOnly] = useState(false);
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
    const [channelWindowSource, setChannelWindowSource] = useState("inbound");
    const [channelWindowStatus, setChannelWindowStatus] = useState("open");
    const [selectedWaterfallId, setSelectedWaterfallId] = useState("");
    const [providerEvaluationProvider, setProviderEvaluationProvider] = useState("google-places");
    const [providerEvaluationUse, setProviderEvaluationUse] = useState("discovery");
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
    const [partnerName, setPartnerName] = useState("Menu photographer partner");
    const [partnerType, setPartnerType] = useState("menu-photographer");
    const [partnerChannel, setPartnerChannel] = useState("instagram");
    const [partnerGeography, setPartnerGeography] = useState("Mumbai");
    const [partnerSourceNotes, setPartnerSourceNotes] = useState("Audience includes restaurant owners and operators.");
    const [partnerScore, setPartnerScore] = useState(75);
    const [nicheName, setNicheName] = useState("Menu photographers");
    const [nicheAngle, setNicheAngle] = useState("Current-list proof through menu refresh partners.");
    const [nicheAttempts, setNicheAttempts] = useState(3);
    const [dealFeeUsd, setDealFeeUsd] = useState(75);
    const [dealDeliverables, setDealDeliverables] = useState(1);
    const [briefText, setBriefText] = useState("Show how a restaurant can keep a clean current menu online and invite owners to request a private MenuList preview.");
    const [deliverablePostUrl, setDeliverablePostUrl] = useState("");
    const [metricViews, setMetricViews] = useState(0);
    const [metricOwnerLeads, setMetricOwnerLeads] = useState(0);
    const [contentSourceTitle, setContentSourceTitle] = useState("MenuList owned proof");
    const [contentSourceType, setContentSourceType] = useState("proof-page");
    const [contentSourceUrl, setContentSourceUrl] = useState("https://menulist.ai");
    const [contentSourceAudience, setContentSourceAudience] = useState("restaurant-owner");
    const [selectedContentSourceId, setSelectedContentSourceId] = useState("");
    const [contentAssetTitle, setContentAssetTitle] = useState("Current-list proof angle");
    const [contentAssetMessage, setContentAssetMessage] = useState("Restaurant owners need one clean current list customers can trust before they order, call, or visit.");
    const [contentAssetUrl, setContentAssetUrl] = useState("");
    const [contentAssetSourceType, setContentAssetSourceType] = useState("proof-page");
    const [contentAssetAudience, setContentAssetAudience] = useState("restaurant-owner");
    const [contentAssetProofLevel, setContentAssetProofLevel] = useState("owned");
    const [selectedContentAssetId, setSelectedContentAssetId] = useState("");
    const [selectedContentDraftId, setSelectedContentDraftId] = useState("");
    const [contentDraftChannels, setContentDraftChannels] = useState<string[]>(["linkedin", "email", "partner-brief"]);
    const [contentScheduleAt, setContentScheduleAt] = useState("");
    const [contentPerformanceViews, setContentPerformanceViews] = useState(0);
    const [contentPerformanceClicks, setContentPerformanceClicks] = useState(0);
    const [contentPerformanceOwnerLeads, setContentPerformanceOwnerLeads] = useState(0);
    const [contentPerformanceSubmissions, setContentPerformanceSubmissions] = useState(0);
    const [contentPerformanceActivations, setContentPerformanceActivations] = useState(0);
    const [selectedGrowthMissionId, setSelectedGrowthMissionId] = useState("");
    const [missionDecisionNote, setMissionDecisionNote] = useState("");
    const [selectedExperimentCardId, setSelectedExperimentCardId] = useState("");
    const [experimentHypothesis, setExperimentHypothesis] = useState("One narrow local restaurant pod will convert better when the ask is a private current-list preview.");
    const [experimentChannel, setExperimentChannel] = useState("email");
    const [experimentTargetCount, setExperimentTargetCount] = useState(25);
    const [experimentStopRule, setExperimentStopRule] = useState("Stop if 3 to 5 approved attempts produce no interested reply or upload-start signal.");
    const [experimentExpectedOutcome, setExperimentExpectedOutcome] = useState("At least one current-list upload, private preview, or interested owner reply.");
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

    useEffect(() => {
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
    const navItems = useMemo<DashboardSidebarShellItem[]>(() => NAV_ITEMS.map((item) => {
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
    const resolvedPolicyId = data ? (sourcePolicyId || firstPolicyId(data)) : "";
    const providerPolicies = data?.workspace.policies.filter((policy) => policy.sourceType === "provider") || [];
    const resolvedProviderPolicyId = data
        ? (providerPolicies.some((policy) => policy.sourcePolicyId === sourcePolicyId) ? sourcePolicyId : firstProviderPolicyId(data))
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
    const resolvedContentSourceId = data ? (selectedContentSourceId || firstContentSourceId(data)) : "";
    const resolvedContentAssetId = data ? (selectedContentAssetId || firstContentAssetId(data)) : "";
    const resolvedContentDraftId = data ? (selectedContentDraftId || firstContentDraftId(data)) : "";
    const resolvedSenderDomainId = data ? firstReadySenderDomainId(data) : "";
    const globalPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === "global-outbound" && item.status === "active"));
    const scopedPauseActive = Boolean(data?.activeKillSwitches.some((item) => item.scope === pauseScope && item.status === "active"));
    const canPause = Boolean(data?.access.permissions.includes("kill-switch.activate"));
    const canResume = Boolean(data?.access.permissions.includes("kill-switch.deactivate"));
    const actionDisabled = saving || mobileReadOnly;

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

    const recommendMarketPodPlan = (marketPodId?: string) => {
        void runAction("recommend-market-pod-plan", { marketPodId });
    };

    const createWeeklyStrategistMemo = () => {
        void runAction("create-weekly-strategist-memo");
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

    const approveTrustPartnerTestBudget = () => {
        void runAction("upsert-budget-policy", {
            dailyBudgetUsd: 75,
            monthlyBudgetUsd: 300,
            name: "First trust partner test cap",
            perRunBudgetUsd: 75,
            scope: "trust-partner",
            scopeId: "first_partner_test",
            status: "active",
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

    const upsertChannelWindow = () => {
        void runAction("upsert-channel-window-state", {
            channel,
            source: channelWindowSource,
            status: channelWindowStatus,
            targetId: resolvedTargetId || undefined,
        });
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

    const recordTrustPartnerMetrics = () => {
        void runAction("record-trust-partner-metrics", {
            activations: 0,
            commentQuality: metricOwnerLeads ? "medium" : "low",
            comments: 0,
            currentListSubmissions: 0,
            deliverableId: resolvedTrustDeliverableId || undefined,
            ownerLeads: metricOwnerLeads,
            partnerId: resolvedPartnerId,
            views: metricViews,
        });
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

    const upsertContentSource = (event: FormEvent) => {
        event.preventDefault();
        void runAction("upsert-content-source", {
            defaultAudience: contentSourceAudience,
            defaultMarketPodId: resolvedMarketPodId || undefined,
            sourceType: contentSourceType,
            sourceUrl: contentSourceUrl || undefined,
            status: "active",
            title: contentSourceTitle,
        });
    };

    const createContentAsset = (event: FormEvent) => {
        event.preventDefault();
        void runAction("create-content-asset", {
            canonicalMessage: contentAssetMessage,
            ctaId: resolvedCtaId || undefined,
            marketPodId: resolvedMarketPodId || undefined,
            primaryAudience: contentAssetAudience,
            proofLevel: contentAssetProofLevel,
            riskNotes: contentAssetProofLevel === "internal-note" ? ["Internal note needs proof before broad distribution."] : [],
            sourceId: resolvedContentSourceId || undefined,
            sourceNotes: "Prepared from internal owner-approved MenuList proof.",
            sourceType: contentAssetSourceType,
            sourceUrl: contentAssetUrl || contentSourceUrl || undefined,
            title: contentAssetTitle,
        });
    };

    const generateContentDrafts = () => {
        void runAction("generate-content-distribution-drafts", {
            channels: contentDraftChannels,
            contentAssetId: resolvedContentAssetId,
        });
    };

    const reviewContentDraft = (contentDraftId: string, approvalStatus: "approved" | "rejected" | "hold") => {
        void runAction("review-content-distribution-draft", {
            approvalStatus,
            contentDraftId,
            reviewReason: approvalStatus === "approved" ? "Approved by owner for manual scheduling." : "Needs revision before scheduling.",
        });
    };

    const scheduleContentDraft = (contentDraftId: string) => {
        void runAction("schedule-content-distribution-draft", {
            contentDraftId,
            scheduledFor: contentScheduleAt || undefined,
            status: "queued",
        });
    };

    const recordContentPerformance = () => {
        const draft = data?.workspace.contentDistributionDrafts.find((item) => item.contentDraftId === resolvedContentDraftId);
        void runAction("record-content-performance", {
            activations: contentPerformanceActivations,
            channel: draft?.channel || "linkedin",
            clicks: contentPerformanceClicks,
            contentAssetId: resolvedContentAssetId,
            contentDraftId: resolvedContentDraftId || undefined,
            currentListSubmissions: contentPerformanceSubmissions,
            engagementQuality: contentPerformanceOwnerLeads || contentPerformanceSubmissions || contentPerformanceActivations ? "medium" : "low",
            ownerLeads: contentPerformanceOwnerLeads,
            views: contentPerformanceViews,
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
        void runAction("create-experiment-card", {
            channel: experimentChannel,
            contentAssetId: resolvedContentAssetId || undefined,
            ctaId: resolvedOfferCtaId || undefined,
            expectedOutcome: experimentExpectedOutcome,
            hypothesis: experimentHypothesis,
            marketPodId: resolvedMarketPodId || undefined,
            proofAssetSummary: contentAssetTitle || undefined,
            sourcePolicyId: resolvedPolicyId || undefined,
            stopRule: experimentStopRule,
            targetCount: experimentTargetCount,
        });
    };

    const reviewExperimentCard = (ownerDecision: "repeat" | "narrow" | "stop" | "hold" | "complete") => {
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

    const renderSection = () => {
        if (!data) return null;
        if (activeSection === "dashboard") return <DashboardSection data={data} />;
        if (activeSection === "mission") {
            const activeMission = data.workspace.growthMissions.find((mission) => mission.growthMissionId === resolvedGrowthMissionId) || data.workspace.growthMissions[0];
            const selectedExperiment = data.workspace.experimentCards.find((experiment) => experiment.experimentCardId === resolvedExperimentCardId) || data.workspace.experimentCards[0];
            return (
                <section className={styles.stack}>
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
                                <WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Create</WorkspaceButton>
                            </div>
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setExperimentHypothesis(event.target.value)} value={experimentHypothesis} />
                            <div className={styles.formGrid}>
                                <WorkspaceSelect className={styles.input} onChange={(event) => setExperimentChannel(event.target.value)} value={experimentChannel}>
                                    {["email", "manual", "content", "partner", "referral", "other"].map((item) => <option key={item} value={item}>{item}</option>)}
                                </WorkspaceSelect>
                                <WorkspaceInput className={styles.input} min={1} max={500} onChange={(event) => setExperimentTargetCount(Number(event.target.value))} type="number" value={experimentTargetCount} />
                            </div>
                            <WorkspaceInput className={styles.input} onChange={(event) => setExperimentExpectedOutcome(event.target.value)} value={experimentExpectedOutcome} />
                            <WorkspaceTextarea className={styles.textarea} onChange={(event) => setExperimentStopRule(event.target.value)} value={experimentStopRule} />
                            {data.workspace.experimentCards.length ? (
                                <>
                                    <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedExperimentCardId(event.target.value)} value={resolvedExperimentCardId}>
                                        {data.workspace.experimentCards.map((experiment) => (
                                            <option key={experiment.experimentCardId} value={experiment.experimentCardId}>{experiment.hypothesis.slice(0, 90)}</option>
                                        ))}
                                    </WorkspaceSelect>
                                    <WorkspaceTextarea className={styles.textarea} onChange={(event) => setExperimentResultSummary(event.target.value)} placeholder="Result summary" value={experimentResultSummary} />
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedExperimentCardId} onClick={() => reviewExperimentCard("repeat")} type="button">Repeat</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedExperimentCardId} onClick={() => reviewExperimentCard("narrow")} type="button">Narrow</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedExperimentCardId} onClick={() => reviewExperimentCard("hold")} type="button">Hold</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedExperimentCardId} onClick={() => reviewExperimentCard("stop")} type="button">Stop</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || !resolvedExperimentCardId} onClick={() => reviewExperimentCard("complete")} type="button">Complete</WorkspaceButton>
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
        if (activeSection === "targets") {
            return (
                <section className={styles.stack}>
                    <form className={styles.panel} onSubmit={handleImport}>
                        <div className={styles.panelHeader}>
                            <h2>Manual Import</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedPolicyId} type="submit">Import</WorkspaceButton>
                        </div>
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceName(event.target.value)} value={sourceName} />
                            <WorkspaceSelect className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedPolicyId}>
                                {data.workspace.policies.map((policy) => (
                                    <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name}</option>
                                ))}
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceTextarea className={styles.textarea} onChange={(event) => setImportRows(event.target.value)} value={importRows} />
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Create</WorkspaceButton>
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
                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={handleSeed} type="button">Seed Defaults</WorkspaceButton>
                    </form>
                    <div className={styles.panel}>
                        <div className={styles.panelHeader}><h2>Policies</h2><span className={styles.tag}>{data.workspace.policies.length}</span></div>
                        <div className={styles.list}>
                            {data.workspace.policies.map((policy) => (
                                <div className={styles.listItem} key={policy.sourcePolicyId}>
                                    <strong>{policy.name}</strong>
                                    <span>{policy.sourceType} / {policy.retentionDays} days / {policy.policyState || policy.status}</span>
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
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={approveTrustPartnerTestBudget} type="button">Approve Trust Partner Test</WorkspaceButton>
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
                        <div className={styles.table}>
                            {data.workspace.approvals.map((approval) => (
                                <div className={styles.tableRow} key={approval.approvalId}>
                                    <div><strong>{approval.targetName}</strong><span>{approval.reviewReason}</span></div>
                                    <span className={tagClass(approval.status)}>{approval.status}</span>
                                    <span>{approval.priority}</span>
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => createApprovalPacket(approval)} type="button">Packet</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || approval.status !== "pending"} onClick={() => reviewApproval(approval, "approved")} type="button">Approve</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || approval.status !== "pending"} onClick={() => reviewApproval(approval, "rejected")} type="button">Reject</WorkspaceButton>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled || approval.status !== "approved"} onClick={() => exportMessage(approval.approvalId)} type="button">Export</WorkspaceButton>
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
                        <div className={styles.panelHeader}><h2>Outcome</h2><WorkspaceButton className={styles.button} disabled={actionDisabled} type="submit">Record</WorkspaceButton></div>
                        <TargetSelect data={data} onChange={setSelectedTargetId} value={resolvedTargetId} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setOutcomeType(event.target.value)} value={outcomeType}>
                            <option value="route_created">route_created</option>
                            <option value="upload_started">upload_started</option>
                            <option value="preview_prepared">preview_prepared</option>
                            <option value="published">published</option>
                            <option value="two_surface_activation">two_surface_activation</option>
                        </WorkspaceSelect>
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
                        <div className={styles.panelHeader}>
                            <h2>Market Pods</h2>
                            <div className={styles.rowActions}>
                                <span className={styles.tag}>{data.workspace.marketPods.length}</span>
                                <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => recommendMarketPodPlan()} type="button">Recommend</WorkspaceButton>
                            </div>
                        </div>
                        <div className={styles.list}>
                            {data.workspace.marketPods.map((pod) => (
                                <div className={styles.listItem} key={pod.marketPodId}>
                                    <strong>{pod.name}</strong>
                                    <span>{[pod.category, pod.city, pod.country].filter(Boolean).join(" / ")} / ${pod.monthlyBudgetUsd} / {pod.successMetric}</span>
                                    <span className={tagClass(pod.recommendation || pod.status)}>{pod.recommendation || pod.status}</span>
                                    {pod.recommendationReason ? <span>{pod.recommendationReason}</span> : null}
                                    {pod.recommendedActions?.length ? <span>{pod.recommendedActions.join(" | ")}</span> : null}
                                    <div className={styles.rowActions}>
                                        <WorkspaceButton className={styles.ghostButton} disabled={actionDisabled} onClick={() => recommendMarketPodPlan(pod.marketPodId)} type="button">Refresh Plan</WorkspaceButton>
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
                            <option value="foursquare">Foursquare</option>
                        </WorkspaceSelect>
                        <WorkspaceInput className={styles.input} onChange={(event) => setSourceQuery(event.target.value)} value={sourceQuery} />
                        <div className={styles.formGrid}>
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceCity(event.target.value)} value={sourceCity} />
                            <WorkspaceInput className={styles.input} onChange={(event) => setSourceCountry(event.target.value)} value={sourceCountry} />
                            <WorkspaceInput className={styles.input} max={20} min={1} onChange={(event) => setSourceMaxResults(Number(event.target.value))} type="number" value={sourceMaxResults} />
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSourcePolicyId(event.target.value)} value={resolvedProviderPolicyId}>
                            {providerPolicies.length ? providerPolicies.map((policy) => (
                                <option key={policy.sourcePolicyId} value={policy.sourcePolicyId}>{policy.name} / {policy.sourceType}</option>
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
                            <option value="score">score</option>
                            <option value="evidence">evidence</option>
                            <option value="draft">draft</option>
                            <option value="reply-classification">reply-classification</option>
                            <option value="approval-packet">approval-packet</option>
                            <option value="weekly-strategist">weekly-strategist</option>
                            <option value="vendor-audit">vendor-audit</option>
                        </WorkspaceSelect>
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setAiInstruction(event.target.value)} value={aiInstruction} />
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
            return (
                <section className={styles.contentGrid}>
                    <form className={styles.panel} onSubmit={upsertContentSource}>
                        <div className={styles.panelHeader}>
                            <h2>Source</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !contentSourceTitle.trim()} type="submit">Save</WorkspaceButton>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentSourceTitle(event.target.value)} value={contentSourceTitle} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentSourceType(event.target.value)} value={contentSourceType}>
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
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentSourceAudience(event.target.value)} value={contentSourceAudience}>
                                <option value="restaurant-owner">restaurant-owner</option>
                                <option value="agency-partner">agency-partner</option>
                                <option value="trust-partner">trust-partner</option>
                                <option value="local-operator">local-operator</option>
                                <option value="general">general</option>
                            </WorkspaceSelect>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentSourceUrl(event.target.value)} value={contentSourceUrl} />
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentSourceId(event.target.value)} value={resolvedContentSourceId}>
                            <option value="">No source selected</option>
                            {data.workspace.contentSources.map((source) => (
                                <option key={source.contentSourceId} value={source.contentSourceId}>{source.title}</option>
                            ))}
                        </WorkspaceSelect>
                    </form>
                    <form className={styles.panel} onSubmit={createContentAsset}>
                        <div className={styles.panelHeader}>
                            <h2>Asset</h2>
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !contentAssetTitle.trim() || !contentAssetMessage.trim()} type="submit">Create</WorkspaceButton>
                        </div>
                        <WorkspaceInput className={styles.input} onChange={(event) => setContentAssetTitle(event.target.value)} value={contentAssetTitle} />
                        <WorkspaceTextarea className={styles.textareaSmall} onChange={(event) => setContentAssetMessage(event.target.value)} value={contentAssetMessage} />
                        <div className={styles.formGrid}>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentAssetSourceType(event.target.value)} value={contentAssetSourceType}>
                                <option value="manual">manual</option>
                                <option value="proof-page">proof-page</option>
                                <option value="demo">demo</option>
                                <option value="case-note">case-note</option>
                                <option value="customer-story">customer-story</option>
                                <option value="blog">blog</option>
                                <option value="other">other</option>
                            </WorkspaceSelect>
                            <WorkspaceSelect className={styles.input} onChange={(event) => setContentAssetAudience(event.target.value)} value={contentAssetAudience}>
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
                            <WorkspaceInput className={styles.input} onChange={(event) => setContentAssetUrl(event.target.value)} value={contentAssetUrl} />
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentAssetId(event.target.value)} value={resolvedContentAssetId}>
                            <option value="">No asset selected</option>
                            {data.workspace.contentAssets.map((asset) => (
                                <option key={asset.contentAssetId} value={asset.contentAssetId}>{asset.title}</option>
                            ))}
                        </WorkspaceSelect>
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
                            <WorkspaceButton className={styles.button} disabled={actionDisabled || !resolvedContentAssetId} onClick={recordContentPerformance} type="button">Record</WorkspaceButton>
                        </div>
                        <WorkspaceSelect className={styles.input} onChange={(event) => setSelectedContentDraftId(event.target.value)} value={resolvedContentDraftId}>
                            <option value="">No draft selected</option>
                            {data.workspace.contentDistributionDrafts.map((draft) => (
                                <option key={draft.contentDraftId} value={draft.contentDraftId}>{draft.title}</option>
                            ))}
                        </WorkspaceSelect>
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
                                    <WorkspaceButton className={styles.ghostButton} disabled={saving} onClick={() => setSelectedContentSourceId(source.contentSourceId)} type="button">Select</WorkspaceButton>
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
                                    <WorkspaceButton className={styles.ghostButton} disabled={saving} onClick={() => setSelectedContentAssetId(asset.contentAssetId)} type="button">Select</WorkspaceButton>
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
                                        <WorkspaceButton className={styles.ghostButton} disabled={saving} onClick={() => setSelectedContentDraftId(draft.contentDraftId)} type="button">Select</WorkspaceButton>
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
                                    <span>{item.publishedAt || "not published"}</span>
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
                    <DashboardSection data={data} />
                    <section className={styles.contentGrid}>
                        <div className={styles.panel}>
                            <div className={styles.panelHeader}>
                                <h2>Scoped Pause</h2>
                                <WorkspaceButton
                                    className={scopedPauseActive ? styles.button : styles.dangerButton}
                                    disabled={actionDisabled || (!scopedPauseActive && !canPause) || (scopedPauseActive && !canResume)}
                                    onClick={handleScopedPauseToggle}
                                    type="button"
                                >
                                    {scopedPauseActive ? "Clear" : "Pause"}
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
                                disabled={actionDisabled || (!globalPauseActive && !canPause) || (globalPauseActive && !canResume)}
                                icon={<LuPauseCircle />}
                                onClick={handlePauseToggle}
                                type={globalPauseActive ? "primary" : "default"}
                            >
                                {globalPauseActive ? "Clear Pause" : "Global Pause"}
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
