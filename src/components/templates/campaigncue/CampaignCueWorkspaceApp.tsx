"use client";

import { SIGNIN_URL } from "@constant/urls";
import { CAMPAIGNCUE_PAGE_SIZE } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX } from "@constant/campaigncue/domains";
import { CAMPAIGNCUE_ERROR_CODES } from "@constant/campaigncue/errors";
import { CAMPAIGNCUE_WORKSPACE_TABS, type CampaignCueWorkspaceTabKey } from "@constant/campaigncue/navigations";
import {
    CAMPAIGNCUE_API_ROUTES,
    buildCampaignCueAuthLaunchUrl,
    getCampaignCueCampaignActionApiPath,
} from "@constant/campaigncue/routes";
import {
    CAMPAIGNCUE_CHANNEL_STUDIO_COPY,
    CAMPAIGNCUE_DEFAULT_LOCALE,
    CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
    CAMPAIGNCUE_DEFAULT_TIMEZONE,
    CAMPAIGNCUE_SOURCE_TYPE_LABELS,
} from "@constant/campaigncue/workspace";
import type {
    CampaignCueActionType,
    CampaignCueAsset,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueLocation,
    CampaignCueOutput,
    CampaignCueOverview,
    CampaignCueProviderStatus,
    CampaignCueSourceInput,
} from "@type/campaigncue";
import type { ComponentType } from "react";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
    LuArrowRight,
    LuBuilding2,
    LuCalendarDays,
    LuCheck,
    LuCheckCircle2,
    LuClipboard,
    LuDownload,
    LuFileText,
    LuImage,
    LuMapPin,
    LuPackageCheck,
    LuRefreshCw,
    LuSend,
    LuShieldCheck,
    LuSparkles,
    LuStore,
    LuUpload,
    LuUsers,
} from "react-icons/lu";
import styles from "./CampaignCueWorkspaceApp.module.scss";

interface ApiState {
    code?: string;
    data?: CampaignCueOverview;
    error?: string;
    loading: boolean;
    status?: number;
}

const channelTone = (channel: CampaignCueChannel) => {
    if (channel === "ads" || channel === "google_local") return "amber";
    if (channel === "whatsapp" || channel === "creative") return "green";
    return undefined;
};

const trustTone = (gate?: string) => {
    if (gate === "blocked" || gate === "needs_fix") return "red";
    if (gate === "warning") return "amber";
    return "green";
};

const displayLabel = (value?: string) => (value || "").replace(/_/g, " ");

const noticeTone = (notice: string) => (
    /blocked|could|failed|not|unavailable|error/i.test(notice) ? "red" : "green"
);

const providerOwnerSummary = (provider: CampaignCueProviderStatus) => {
    if (provider.status === "manual_only") {
        return "No account connection is needed. Download the pack and paste it manually.";
    }
    if (provider.status === "disabled") {
        return "This future provider layer is off. Use copy or download.";
    }
    return provider.reason;
};

const buildIdempotencyKey = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const getLocalSignInUrl = () => {
    if (typeof window === "undefined") return buildCampaignCueAuthLaunchUrl(SIGNIN_URL);
    const callbackUrl = encodeURIComponent(window.location.href);
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocal ? `/signin?callbackUrl=${callbackUrl}` : buildCampaignCueAuthLaunchUrl(SIGNIN_URL);
};

const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const node = document.createElement("textarea");
    node.value = text;
    node.style.position = "fixed";
    node.style.left = "-9999px";
    document.body.appendChild(node);
    node.select();
    document.execCommand("copy");
    document.body.removeChild(node);
};

const downloadText = (filename: string, text: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};

const outputFilename = (campaign: CampaignCueCampaign, output: CampaignCueOutput) => (
    `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${output.channel}.txt`
);

const campaignPackFilename = (campaign: CampaignCueCampaign) => (
    `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-campaigncue-pack.md`
);

const buildCampaignPackExport = (campaign: CampaignCueCampaign) => {
    const lines = [
        `# ${campaign.title}`,
        campaign.brief,
        `Status: ${displayLabel(campaign.status)}`,
        `Trust: ${displayLabel(campaign.trustGate)}`,
        "",
        "## Outputs",
        ...campaign.outputs.flatMap((output) => [
            "",
            `### ${output.label}`,
            `Mode: ${displayLabel(output.mode)}`,
            `Trust: ${displayLabel(output.trustGate)}`,
            "",
            output.text,
            "",
            `CTA: ${output.fields.cta}`,
            `Destination: ${output.fields.destination || "Not set"}`,
            `Format: ${output.fields.dimensions}`,
            `Consent: ${output.fields.consentNote}`,
            `Policy: ${output.fields.policyNote}`,
            output.fields.utm ? `UTM: ${output.fields.utm}` : "",
            "",
            "Manual steps:",
            ...output.fields.manualSteps.map((step, index) => `${index + 1}. ${step}`),
        ]),
    ];
    return `${lines.filter((line) => line !== "").join("\n")}\n`;
};

const bumpAnalytics = (
    data: CampaignCueOverview,
    action: CampaignCueActionType | "campaign_created",
): CampaignCueOverview["analytics"] => {
    const analytics = data.analytics;
    return {
        ...analytics,
        campaignCount: action === "campaign_created" ? analytics.campaignCount + 1 : analytics.campaignCount,
        usedCount: action === "mark_used" ? analytics.usedCount + 1 : analytics.usedCount,
        exportCount: action === "copy" || action === "download" || action === "export"
            ? analytics.exportCount + 1
            : analytics.exportCount,
        approvalRequestCount: action === "request_approval"
            ? analytics.approvalRequestCount + 1
            : analytics.approvalRequestCount,
        manualFallbackCount: analytics.manualFallbackCount,
        ownerReportedOutcomeCount: action === "record_outcome"
            ? (analytics.ownerReportedOutcomeCount || 0) + 1
            : analytics.ownerReportedOutcomeCount || 0,
        latestEventAt: new Date().toISOString(),
    };
};

const prependBounded = <T extends { id: string }>(items: T[], item: T, limit: number) => (
    [item, ...items.filter((existing) => existing.id !== item.id)].slice(0, limit)
);

const replaceBounded = <T extends { id: string }>(items: T[], item: T, limit: number) => {
    const exists = items.some((existing) => existing.id === item.id);
    const next = exists
        ? items.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...items];
    return next.slice(0, limit);
};

function LoadingState() {
    return (
        <div className={styles.loader}>
            <div className={styles.loaderBox}>
                <div className={styles.spinner} />
                <strong>Opening CampaignCue</strong>
            </div>
        </div>
    );
}

function SignedOutState() {
    return (
        <div className={styles.shell}>
            <div className={styles.loader}>
                <section className={styles.statePanel}>
                    <span className={styles.eyebrow}>Authentication</span>
                    <h1>Sign in to open CampaignCue</h1>
                    <p className={styles.muted}>
                        CampaignCue workspaces are private and scoped to the signed-in owner account.
                    </p>
                    <a className={styles.button} href={getLocalSignInUrl()}>
                        Sign in
                    </a>
                </section>
            </div>
        </div>
    );
}

function ErrorState({ code, message, onRetry }: { code?: string; message: string; onRetry: () => void }) {
    const isSetupBlocked = code === CAMPAIGNCUE_ERROR_CODES.FIREBASE_UNAVAILABLE;
    return (
        <div className={styles.shell}>
            <div className={styles.loader}>
                <section className={styles.statePanel}>
                    <span className={styles.eyebrow}>{isSetupBlocked ? "Setup not ready" : "Unavailable"}</span>
                    <h1>{isSetupBlocked ? "CampaignCue is not ready for this workspace yet" : "CampaignCue could not open"}</h1>
                    <p className={styles.muted}>
                        {isSetupBlocked
                            ? "The workspace connection for this environment is still being prepared."
                            : message}
                    </p>
                    {isSetupBlocked ? (
                        <p className={styles.muted}>
                            No owner action is needed. Once the connection is ready, refresh this page.
                        </p>
                    ) : null}
                    <button className={styles.ghostButton} onClick={onRetry} type="button">
                        <LuRefreshCw size={16} />
                        Retry
                    </button>
                </section>
            </div>
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
    return (
        <div className={styles.stat}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function ProviderCard({ provider }: { provider: CampaignCueProviderStatus }) {
    return (
        <article className={styles.provider}>
            <div className={styles.rowStart}>
                <div className={styles.iconBox}>
                    <LuSend size={18} />
                </div>
                <div className={styles.titleBlock}>
                    <h3>{provider.label}</h3>
                    <p>{providerOwnerSummary(provider)}</p>
                </div>
            </div>
            <div className={styles.chips}>
                <span className={styles.chip} data-tone="amber">{displayLabel(provider.mode)}</span>
                <span className={styles.chip}>{displayLabel(provider.status)}</span>
            </div>
        </article>
    );
}

type OwnerStepCardProps = {
    actionLabel: string;
    disabled?: boolean;
    done: boolean;
    icon: ComponentType<{ size?: number }>;
    onAction: () => void;
    text: string;
    title: string;
};

function OwnerStepCard({
    actionLabel,
    disabled,
    done,
    icon: Icon,
    onAction,
    text,
    title,
}: OwnerStepCardProps) {
    return (
        <article className={styles.stepCard} data-done={done}>
            <div className={styles.rowStart}>
                <div className={styles.iconBox}>
                    {done ? <LuCheckCircle2 size={18} /> : <Icon size={18} />}
                </div>
                <div className={styles.titleBlock}>
                    <h3>{title}</h3>
                    <p>{text}</p>
                </div>
            </div>
            <button
                className={done ? styles.ghostButton : styles.button}
                disabled={disabled}
                onClick={onAction}
                type="button"
            >
                {actionLabel}
                <LuArrowRight size={16} />
            </button>
        </article>
    );
}

function OutputFieldSummary({ output }: { output: CampaignCueOutput }) {
    const fields = output.fields;
    if (!fields) return null;
    return (
        <div className={styles.detailStack}>
            <div className={styles.detailGrid}>
                <div>
                    <span>CTA</span>
                    <strong>{fields.cta}</strong>
                </div>
                <div>
                    <span>Destination</span>
                    <strong>{fields.destination || "Needs link or phone"}</strong>
                </div>
                <div>
                    <span>Format</span>
                    <strong>{fields.dimensions}</strong>
                </div>
                <div>
                    <span>Approval note</span>
                    <strong>{fields.approvalNote}</strong>
                </div>
            </div>
            <div className={styles.noteBox}>
                <strong>Manual handoff</strong>
                <ol>
                    {fields.manualSteps.map((step) => (
                        <li key={step}>{step}</li>
                    ))}
                </ol>
            </div>
        </div>
    );
}

export default function CampaignCueWorkspaceApp() {
    const [state, setState] = useState<ApiState>({ loading: true });
    const [tab, setTab] = useState<CampaignCueWorkspaceTabKey>("home");
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");
    const [publicSiteHref, setPublicSiteHref] = useState("/");
    const [businessDraft, setBusinessDraft] = useState({
        agencyMode: false,
        bookingUrl: "",
        businessType: "restaurant",
        locale: CAMPAIGNCUE_DEFAULT_LOCALE,
        locality: "",
        logoUrl: "",
        multiLocationMode: false,
        name: "",
        phone: "",
        primaryColor: CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
        publicMenuUrl: "",
        timezone: CAMPAIGNCUE_DEFAULT_TIMEZONE,
        voice: "friendly",
        website: "",
        whatsapp: "",
    });
    const [sourceDraft, setSourceDraft] = useState({
        expiresAt: "",
        label: "",
        sourceType: "manual_note",
        status: "needs_review",
        value: "",
    });
    const [locationDraft, setLocationDraft] = useState({
        locality: "",
        name: "",
        status: "draft",
    });
    const [assetDraft, setAssetDraft] = useState({
        name: "",
        assetType: "image",
        consentType: "unknown",
        rightsNote: "",
        rightsStatus: "needs_review",
        tags: "",
    });
    const [outcomeDraft, setOutcomeDraft] = useState("Got replies, bookings, walk-ins, orders, or useful comments.");

    const load = async () => {
        setState((current) => ({ ...current, loading: true, error: undefined }));
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.WORKSPACE, {
                cache: "no-store",
                credentials: "include",
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setState({
                    code: payload?.code,
                    loading: false,
                    error: payload?.error || "CampaignCue is unavailable.",
                    status: res.status,
                });
                return;
            }
            setState({ data: payload.data, loading: false });
        } catch {
            setState({ loading: false, error: "Network error while opening CampaignCue." });
        }
    };

    useEffect(() => {
        void load();
    }, []);

    useEffect(() => {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        setPublicSiteHref(isLocal ? CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX : "/");
    }, []);

    const data = state.data;

    const updateOverview = (updater: (current: CampaignCueOverview) => CampaignCueOverview) => {
        setState((current) => (
            current.data
                ? { ...current, data: updater(current.data), loading: false }
                : current
        ));
    };

    useEffect(() => {
        if (!data) return;
        setBusinessDraft({
            agencyMode: data.workspace.agencyMode,
            bookingUrl: data.businessBrain.contacts.bookingUrl || "",
            businessType: data.businessBrain.businessType,
            locale: data.workspace.settings.locale || data.businessBrain.locale || CAMPAIGNCUE_DEFAULT_LOCALE,
            locality: data.businessBrain.locality || "",
            logoUrl: data.businessBrain.brandKit.logoUrl || "",
            multiLocationMode: data.workspace.multiLocationMode,
            name: data.businessBrain.name,
            phone: data.businessBrain.contacts.phone || "",
            primaryColor: data.businessBrain.brandKit.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
            publicMenuUrl: data.businessBrain.contacts.publicMenuUrl || "",
            timezone: data.workspace.settings.timezone || data.businessBrain.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE,
            voice: data.businessBrain.brandKit.voice,
            website: data.businessBrain.contacts.website || "",
            whatsapp: data.businessBrain.contacts.whatsapp || "",
        });
    }, [data]);

    const latestCampaign = data?.campaigns?.[0];
    const trustFindings = useMemo(() => (
        data?.campaigns.flatMap((campaign) => campaign.outputs.map((output) => ({
            campaign,
            output,
        }))) || []
    ), [data?.campaigns]);

    const outputsForChannel = (channel: CampaignCueChannel) => (
        data?.campaigns.flatMap((campaign) => campaign.outputs
            .filter((output) => output.channel === channel)
            .map((output) => ({ campaign, output }))) || []
    );

    const createCampaign = async (opportunityId?: string) => {
        setBusyKey(`cue:${opportunityId || "default"}`);
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CAMPAIGNS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    opportunityId,
                    idempotencyKey: buildIdempotencyKey("create"),
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Campaign pack could not be created.");
                return;
            }
            setNotice("Campaign pack created.");
            setTab("campaigns");
            const result = payload?.data as { campaign?: CampaignCueCampaign; replayed?: boolean };
            if (result?.campaign) {
                updateOverview((current) => ({
                    ...current,
                    analytics: result.replayed ? current.analytics : bumpAnalytics(current, "campaign_created"),
                    campaigns: prependBounded(current.campaigns, result.campaign as CampaignCueCampaign, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const saveBusinessDetails = async () => {
        setBusyKey("business");
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.WORKSPACE, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(businessDraft),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Business details could not be saved.");
                return;
            }
            setNotice("Business details saved.");
            const result = payload?.data as Partial<CampaignCueOverview>;
            if (result?.businessBrain && result?.workspace) {
                updateOverview((current) => ({
                    ...current,
                    businessBrain: result.businessBrain as CampaignCueOverview["businessBrain"],
                    opportunities: result.opportunities || current.opportunities,
                    workspace: result.workspace as CampaignCueOverview["workspace"],
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const createSourceInput = async () => {
        setBusyKey("source");
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.SOURCES, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...sourceDraft,
                    expiresAt: sourceDraft.expiresAt || undefined,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Source input could not be saved.");
                return;
            }
            setSourceDraft({ expiresAt: "", label: "", sourceType: "manual_note", status: "needs_review", value: "" });
            setNotice("Source input saved.");
            const sourceInput = payload?.data as CampaignCueSourceInput | undefined;
            if (sourceInput?.id) {
                updateOverview((current) => ({
                    ...current,
                    sourceInputs: prependBounded(current.sourceInputs, sourceInput, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const createLocation = async () => {
        setBusyKey("location");
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.LOCATIONS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(locationDraft),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Location could not be saved.");
                return;
            }
            setLocationDraft({ locality: "", name: "", status: "draft" });
            setNotice("Location saved.");
            const location = payload?.data as CampaignCueLocation | undefined;
            if (location?.id) {
                updateOverview((current) => ({
                    ...current,
                    locations: prependBounded(current.locations, location, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const recordAction = async (
        campaign: CampaignCueCampaign,
        action: CampaignCueActionType,
        output?: CampaignCueOutput,
    ) => {
        const key = `${campaign.id}:${action}:${output?.id || "campaign"}`;
        setBusyKey(key);
        setNotice("");
        try {
            const scheduledAt = action === "schedule"
                ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                : undefined;
            const res = await fetch(getCampaignCueCampaignActionApiPath(campaign.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    channel: output?.channel || campaign.channels[0],
                    outputId: output?.id,
                    scheduledAt,
                    note: action === "schedule"
                        ? "Manual CampaignCue task"
                        : action === "record_outcome"
                            ? outcomeDraft
                            : undefined,
                    idempotencyKey: buildIdempotencyKey(action),
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Action could not be recorded.");
                return;
            }
            if (action === "copy" && output) {
                await copyToClipboard(output.text);
                setNotice("Copied and recorded.");
            } else if (action === "download" && output) {
                downloadText(outputFilename(campaign, output), output.text);
                setNotice("Downloaded and recorded.");
            } else if (action === "export") {
                downloadText(campaignPackFilename(campaign), buildCampaignPackExport(campaign));
                setNotice("Campaign pack downloaded and recorded.");
            } else if (action === "record_outcome") {
                setNotice("Result recorded.");
            } else {
                setNotice("Action recorded.");
            }
            const result = payload?.data as { campaign?: CampaignCueCampaign | null; replayed?: boolean; schedule?: CampaignCueOverview["schedules"][number] | null };
            if (result?.campaign) {
                updateOverview((current) => ({
                    ...current,
                    analytics: result.replayed ? current.analytics : bumpAnalytics(current, action),
                    campaigns: replaceBounded(current.campaigns, result.campaign as CampaignCueCampaign, CAMPAIGNCUE_PAGE_SIZE),
                    schedules: result.schedule
                        ? prependBounded(current.schedules, result.schedule, CAMPAIGNCUE_PAGE_SIZE)
                        : current.schedules,
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const registerAsset = async () => {
        setBusyKey("asset");
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...assetDraft,
                    source: "manual",
                    tags: assetDraft.tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                setNotice(payload?.error || "Asset could not be registered.");
                return;
            }
            setAssetDraft({
                name: "",
                assetType: "image",
                consentType: "unknown",
                rightsNote: "",
                rightsStatus: "needs_review",
                tags: "",
            });
            setNotice("Asset registered.");
            const asset = payload?.data as CampaignCueAsset | undefined;
            if (asset?.id) {
                updateOverview((current) => ({
                    ...current,
                    assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const renderChannelStudio = (channel: CampaignCueChannel) => {
        const copy = CAMPAIGNCUE_CHANNEL_STUDIO_COPY[channel];
        const rows = outputsForChannel(channel);
        return (
            <section className={styles.section}>
                <div className={styles.sectionHeader}>
                    <div>
                        <span className={styles.eyebrow}>{copy?.eyebrow || "Studio"}</span>
                        <h2>{copy?.title || "Outputs"}</h2>
                        <p>{rows.length ? `${rows.length} output${rows.length === 1 ? "" : "s"} ready to copy or download.` : copy?.empty}</p>
                    </div>
                    <button className={styles.ghostButton} disabled={busyKey === "cue:default"} onClick={() => createCampaign()} type="button">
                        <LuPackageCheck size={16} />
                        Create pack
                    </button>
                </div>
                <div className={styles.list}>
                    {rows.map(({ campaign, output }) => (
                        <article className={styles.output} key={`${campaign.id}:${output.id}`}>
                            <div className={styles.row}>
                                <div className={styles.titleBlock}>
                                    <h3>{campaign.title}</h3>
                                    <p>{displayLabel(output.mode)} · {displayLabel(output.providerMode)}</p>
                                </div>
                                <span className={styles.chip} data-tone={trustTone(output.trustGate)}>
                                    {displayLabel(output.trustGate)}
                                </span>
                            </div>
                            <div className={styles.outputText}>{output.text}</div>
                            <OutputFieldSummary output={output} />
                            <div className={styles.chips}>
                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "copy", output)} type="button">
                                    <LuClipboard size={16} />
                                    Copy
                                </button>
                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "download", output)} type="button">
                                    <LuDownload size={16} />
                                    Download
                                </button>
                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "schedule", output)} type="button">
                                    <LuCalendarDays size={16} />
                                    Schedule
                                </button>
                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "request_approval", output)} type="button">
                                    <LuUsers size={16} />
                                    Approval
                                </button>
                            </div>
                        </article>
                    ))}
                    {!rows.length ? <div className={styles.empty}><p>{copy?.empty || "No outputs yet."}</p></div> : null}
                </div>
            </section>
        );
    };

    if (state.loading && !data) return <LoadingState />;
    if (state.status === 401) return <SignedOutState />;
    if (state.error && !data) return <ErrorState code={state.code} message={state.error} onRetry={load} />;
    if (!data) return <LoadingState />;

    const firstOpportunity = data.opportunities[0];
    const businessHasContact = Boolean(
        data.businessBrain.contacts.phone
        || data.businessBrain.contacts.website
        || data.businessBrain.contacts.whatsapp
        || data.businessBrain.contacts.bookingUrl
        || data.businessBrain.contacts.publicMenuUrl,
    );
    const setupSteps = [
        {
            actionLabel: businessHasContact ? "Review" : "Add details",
            done: businessHasContact,
            icon: LuStore,
            onAction: () => setTab("details"),
            text: businessHasContact
                ? "Your name, area, and contact links are available for campaign copy."
                : "Add phone, WhatsApp, website, booking, or menu links before using packs.",
            title: "Confirm business details",
        },
        {
            actionLabel: data.sourceInputs.length ? "Review" : "Add input",
            done: data.sourceInputs.length > 0,
            icon: LuFileText,
            onAction: () => setTab("sources"),
            text: data.sourceInputs.length
                ? `${data.sourceInputs.length} saved input${data.sourceInputs.length === 1 ? "" : "s"} can be used in packs.`
                : "Add today's offer, service, event, or note so CampaignCue has something current.",
            title: "Add today's input",
        },
        {
            actionLabel: data.campaigns.length ? "Open packs" : "Create pack",
            disabled: !data.campaigns.length && (!firstOpportunity || busyKey === `cue:${firstOpportunity.id}`),
            done: data.campaigns.length > 0,
            icon: LuPackageCheck,
            onAction: () => (data.campaigns.length ? setTab("campaigns") : createCampaign(firstOpportunity?.id)),
            text: data.campaigns.length
                ? `${data.campaigns.length} campaign pack${data.campaigns.length === 1 ? "" : "s"} ready.`
                : "Create one pack that includes copy, channel notes, and trust checks.",
            title: "Create a campaign pack",
        },
        {
            actionLabel: "Use pack",
            disabled: !data.campaigns.length,
            done: data.analytics.exportCount > 0 || data.analytics.usedCount > 0,
            icon: LuClipboard,
            onAction: () => setTab("campaigns"),
            text: data.analytics.exportCount > 0 || data.analytics.usedCount > 0
                ? "At least one pack has been copied, downloaded, or marked used."
                : "Copy or download a pack, then mark it used when it goes live.",
            title: "Post manually",
        },
    ];

    return (
        <main className={styles.shell}>
            <header className={styles.topbar}>
                <div className={styles.brand}>
                    <span className={styles.brandMark}>CC</span>
                    <div className={styles.brandText}>
                        <strong>CampaignCue</strong>
                        <span>{data.workspace.name}</span>
                    </div>
                </div>
                <div className={styles.topActions}>
                    {notice ? (
                        <span aria-live="polite" className={styles.chip} data-tone={noticeTone(notice)} role="status">
                            {notice}
                        </span>
                    ) : null}
                    <button className={styles.ghostButton} disabled={state.loading} onClick={load} type="button">
                        <LuRefreshCw size={16} />
                        Refresh
                    </button>
                    <a className={styles.ghostButton} href={publicSiteHref}>
                        Public site
                    </a>
                </div>
            </header>

            <div className={styles.layout}>
                <aside className={styles.sidebar} aria-label="CampaignCue sections">
                    {CAMPAIGNCUE_WORKSPACE_TABS.map((item, index) => {
                        const Icon = item.icon;
                        const showGroup = index === 0 || CAMPAIGNCUE_WORKSPACE_TABS[index - 1]?.group !== item.group;
                        return (
                            <Fragment key={item.key}>
                                {showGroup ? <span className={styles.navGroupLabel}>{item.group}</span> : null}
                                <button
                                    className={styles.tabButton}
                                    data-active={tab === item.key}
                                    onClick={() => setTab(item.key)}
                                    type="button"
                                >
                                    <Icon size={17} />
                                    {item.label}
                                </button>
                            </Fragment>
                        );
                    })}
                </aside>

                <div className={styles.content}>
                    {tab === "home" ? (
                        <>
                            <section className={styles.hero}>
                                <div className={styles.panel}>
                                    <div className={styles.headline}>
                                        <span className={styles.eyebrow}>Today</span>
                                        <h1>{data.businessBrain.name}</h1>
                                        <p>
                                            {displayLabel(data.businessBrain.businessType)}
                                            {data.businessBrain.locality ? ` in ${data.businessBrain.locality}` : ""}
                                            . Prepare campaign packs from saved business details, owner inputs, and ready-to-use copy.
                                        </p>
                                        <div className={styles.chips}>
                                            <span className={styles.chip} data-tone={trustTone(data.businessBrain.readiness.status)}>
                                                {displayLabel(data.businessBrain.readiness.status)}
                                            </span>
                                            <span className={styles.chip}>{data.sourceInputs.length} saved input{data.sourceInputs.length === 1 ? "" : "s"}</span>
                                            <span className={styles.chip}>Manual posting ready</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.statusGrid}>
                                    <StatCard label="Packs" value={data.analytics.campaignCount} />
                                    <StatCard label="Copied or downloaded" value={data.analytics.exportCount} />
                                    <StatCard label="Marked used" value={data.analytics.usedCount} />
                                    <StatCard label="Scheduled" value={data.schedules.length} />
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Saved facts</span>
                                        <h2>What CampaignCue can safely use</h2>
                                        <p>
                                            These facts come from business details and owner inputs. Review anything marked needs review before using a pack.
                                        </p>
                                    </div>
                                    <button className={styles.ghostButton} onClick={() => setTab("sources")} type="button">
                                        <LuFileText size={16} />
                                        Add input
                                    </button>
                                </div>
                                <div className={styles.grid}>
                                    {data.sourceFacts.slice(0, 6).map((fact) => (
                                        <article className={styles.provider} key={fact.id}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuShieldCheck size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{fact.label}</h3>
                                                    <p>{fact.value}</p>
                                                </div>
                                            </div>
                                            <div className={styles.chips}>
                                                <span className={styles.chip}>{displayLabel(fact.sourceType)}</span>
                                                <span className={styles.chip} data-tone={fact.risk === "low" ? "green" : fact.risk === "blocked" ? "red" : "amber"}>
                                                    {fact.risk === "low" ? "ready" : displayLabel(fact.risk)}
                                                </span>
                                            </div>
                                        </article>
                                    ))}
                                    {!data.sourceFacts.length ? (
                                        <div className={styles.empty}>
                                            <p>Add business details or an owner input so CampaignCue has facts to use.</p>
                                        </div>
                                    ) : null}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Start here</span>
                                        <h2>What to do first</h2>
                                        <p>Follow these steps when opening CampaignCue for a business or location.</p>
                                    </div>
                                </div>
                                <div className={styles.stepGrid}>
                                    {setupSteps.map((step) => (
                                        <OwnerStepCard
                                            actionLabel={step.actionLabel}
                                            disabled={step.disabled}
                                            done={step.done}
                                            icon={step.icon}
                                            key={step.title}
                                            onAction={step.onAction}
                                            text={step.text}
                                            title={step.title}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Next idea</span>
                                        <h2>{firstOpportunity?.title || "Add an input to get a campaign idea"}</h2>
                                        <p>
                                            {firstOpportunity?.ownerBenefit || firstOpportunity?.reason || "CampaignCue needs business details or a current offer, service, or event before it can prepare a useful pack."}
                                        </p>
                                    </div>
                                    <button
                                        className={styles.button}
                                        disabled={!firstOpportunity || busyKey === `cue:${firstOpportunity?.id}`}
                                        onClick={() => createCampaign(firstOpportunity?.id)}
                                        type="button"
                                    >
                                        <LuPackageCheck size={16} />
                                        {firstOpportunity?.actionLabel || "Create pack"}
                                    </button>
                                </div>
                                <div className={styles.twoGrid}>
                                    {data.providers.slice(0, 2).map((provider) => <ProviderCard key={provider.provider} provider={provider} />)}
                                </div>
                            </section>
                        </>
                    ) : null}

                    {tab === "details" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Business</span>
                                    <h2>Business details</h2>
                                    <p>CampaignCue uses these details for names, links, calls to action, and basic checks.</p>
                                </div>
                                <button className={styles.button} disabled={busyKey === "business" || !businessDraft.name.trim()} onClick={saveBusinessDetails} type="button">
                                    <LuCheck size={16} />
                                    Save details
                                </button>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="business-name">Business name</label>
                                        <input className={styles.input} id="business-name" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Example: Green Leaf Cafe" value={businessDraft.name} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-type">Business type</label>
                                        <select className={styles.select} id="business-type" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, businessType: event.target.value }))} value={businessDraft.businessType}>
                                            <option value="restaurant">Restaurant</option>
                                            <option value="salon">Salon</option>
                                            <option value="multi_location">Multi-location</option>
                                            <option value="agency_client">Agency client</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-locality">Area or city</label>
                                        <input className={styles.input} id="business-locality" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, locality: event.target.value }))} placeholder="Example: Koramangala" value={businessDraft.locality} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-phone">Phone</label>
                                        <input className={styles.input} id="business-phone" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, phone: event.target.value }))} placeholder="+91..." value={businessDraft.phone} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-whatsapp">WhatsApp</label>
                                        <input className={styles.input} id="business-whatsapp" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, whatsapp: event.target.value }))} placeholder="WhatsApp number or link" value={businessDraft.whatsapp} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-website">Website</label>
                                        <input className={styles.input} id="business-website" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, website: event.target.value }))} placeholder="https://..." value={businessDraft.website} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-booking">Booking link</label>
                                        <input className={styles.input} id="business-booking" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, bookingUrl: event.target.value }))} placeholder="Booking page or form link" value={businessDraft.bookingUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-menu">Public menu link</label>
                                        <input className={styles.input} id="business-menu" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, publicMenuUrl: event.target.value }))} placeholder="Menu, service list, or catalog link" value={businessDraft.publicMenuUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-logo">Logo link</label>
                                        <input className={styles.input} id="business-logo" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, logoUrl: event.target.value }))} placeholder="Optional logo link" value={businessDraft.logoUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-color">Brand color</label>
                                        <input className={styles.input} id="business-color" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, primaryColor: event.target.value }))} value={businessDraft.primaryColor} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-voice">Writing style</label>
                                        <select className={styles.select} id="business-voice" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, voice: event.target.value }))} value={businessDraft.voice}>
                                            <option value="calm">Calm</option>
                                            <option value="friendly">Friendly</option>
                                            <option value="premium">Premium</option>
                                            <option value="direct">Direct</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {tab === "sources" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Inputs</span>
                                    <h2>Offers, events, and notes</h2>
                                    <p>Add one current thing CampaignCue can safely use in the next pack.</p>
                                </div>
                                <button className={styles.button} disabled={busyKey === "source" || !sourceDraft.label.trim() || !sourceDraft.value.trim()} onClick={createSourceInput} type="button">
                                    <LuUpload size={16} />
                                    Save input
                                </button>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="source-type">Type</label>
                                        <select className={styles.select} id="source-type" onChange={(event) => setSourceDraft((draft) => ({ ...draft, sourceType: event.target.value }))} value={sourceDraft.sourceType}>
                                            <option value="manual_note">Manual note</option>
                                            <option value="menu_link">Menu link</option>
                                            <option value="booking_link">Booking link</option>
                                            <option value="offer">Offer</option>
                                            <option value="event">Event</option>
                                            <option value="upload_metadata">Uploaded file note</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="source-label">Short title</label>
                                        <input className={styles.input} id="source-label" onChange={(event) => setSourceDraft((draft) => ({ ...draft, label: event.target.value }))} placeholder="Example: Weekend haircut offer" value={sourceDraft.label} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="source-status">Status</label>
                                        <select className={styles.select} id="source-status" onChange={(event) => setSourceDraft((draft) => ({ ...draft, status: event.target.value }))} value={sourceDraft.status}>
                                            <option value="needs_review">Needs review</option>
                                            <option value="active">Ready to use</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="source-expires">Valid until</label>
                                        <input
                                            className={styles.input}
                                            id="source-expires"
                                            onChange={(event) => setSourceDraft((draft) => ({ ...draft, expiresAt: event.target.value ? new Date(event.target.value).toISOString() : "" }))}
                                            type="datetime-local"
                                            value={sourceDraft.expiresAt ? sourceDraft.expiresAt.slice(0, 16) : ""}
                                        />
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="source-value">Details to use in campaigns</label>
                                        <textarea className={styles.textarea} id="source-value" onChange={(event) => setSourceDraft((draft) => ({ ...draft, value: event.target.value }))} placeholder="Example: 20% off hair spa this Friday, valid from 4 PM to 7 PM, booking link..." value={sourceDraft.value} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.sourceInputs.map((source: CampaignCueSourceInput) => (
                                    <div className={styles.assetRow} key={source.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}><LuFileText size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{source.label}</h3>
                                                <p>{CAMPAIGNCUE_SOURCE_TYPE_LABELS[source.sourceType] || source.sourceType} · {source.value}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip} data-tone={source.status === "active" ? "green" : "amber"}>{source.status === "active" ? "ready to use" : displayLabel(source.status)}</span>
                                    </div>
                                ))}
                                {!data.sourceInputs.length ? (
                                    <div className={styles.empty}>
                                        <p>No inputs yet. Add an offer, event, menu link, booking link, or simple note first.</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "delivery" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Exports</span>
                                    <h2>Export and download</h2>
                                    <p>{data.deliveryPolicy.dayOneSummary}</p>
                                </div>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Active mode" value={displayLabel(data.deliveryPolicy.activeMode)} />
                                <StatCard label="Direct posting" value="Off" />
                                <StatCard label="Provider accounts" value="Not connected" />
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.rowStart}>
                                    <div className={styles.iconBox}>
                                        <LuDownload size={18} />
                                    </div>
                                    <div className={styles.titleBlock}>
                                        <h3>Day-one delivery</h3>
                                        <p>Use Copy, Download text, Download pack, Schedule task, Request approval, Mark used, and Record result. CampaignCue does not post to social platforms.</p>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.grid}>
                                {data.providers.map((provider) => (
                                    <article className={styles.provider} key={provider.provider}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuShieldCheck size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>{provider.label}</h3>
                                                <p>{providerOwnerSummary(provider)}</p>
                                            </div>
                                        </div>
                                        <div className={styles.chips}>
                                            <span className={styles.chip} data-tone="amber">{displayLabel(provider.mode)}</span>
                                            <span className={styles.chip}>future provider layer off</span>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {tab === "settings" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Settings</span>
                                    <h2>Owner settings</h2>
                                    <p>Choose the workspace shape. Export/download stays on; direct social posting is not an owner setting.</p>
                                </div>
                                <button className={styles.button} disabled={busyKey === "business"} onClick={saveBusinessDetails} type="button">
                                    <LuCheck size={16} />
                                    Save settings
                                </button>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="settings-timezone">Timezone</label>
                                        <input className={styles.input} id="settings-timezone" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, timezone: event.target.value }))} value={businessDraft.timezone} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="settings-locale">Locale</label>
                                        <input className={styles.input} id="settings-locale" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, locale: event.target.value }))} value={businessDraft.locale} />
                                    </div>
                                    <label className={styles.toggleRow}>
                                        <input checked={businessDraft.agencyMode} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, agencyMode: event.target.checked }))} type="checkbox" />
                                        Agency workspace
                                    </label>
                                    <label className={styles.toggleRow}>
                                        <input checked={businessDraft.multiLocationMode} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, multiLocationMode: event.target.checked }))} type="checkbox" />
                                        Multiple locations
                                    </label>
                                    <div className={styles.fieldWide}>
                                        <div className={styles.noteBox}>
                                            <strong>Delivery boundary</strong>
                                            <p>CampaignCue prepares packs for copy and download. It does not connect social accounts or post on behalf of the business.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {tab === "cues" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Ideas</span>
                                    <h2>Campaign ideas</h2>
                                    <p>{data.opportunities.length ? `${data.opportunities.length} idea${data.opportunities.length === 1 ? "" : "s"} ready from current business details.` : "Add a current input to get campaign ideas."}</p>
                                </div>
                            </div>
                            <div className={styles.grid}>
                                {data.opportunities.map((cue) => (
                                    <article className={styles.cue} key={cue.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuSparkles size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>{cue.title}</h3>
                                                <p>{cue.reason}</p>
                                                <p>{cue.ownerBenefit}</p>
                                            </div>
                                        </div>
                                        <div className={styles.chips}>
                                            {cue.evidence.slice(0, 2).map((item) => (
                                                <span className={styles.chip} data-tone="green" key={item}>
                                                    {item}
                                                </span>
                                            ))}
                                            {cue.channels.map((channel) => (
                                                <span className={styles.chip} data-tone={channelTone(channel)} key={channel}>
                                                    {displayLabel(channel)}
                                                </span>
                                            ))}
                                        </div>
                                        <button
                                            className={styles.button}
                                            disabled={busyKey === `cue:${cue.id}`}
                                            onClick={() => createCampaign(cue.id)}
                                            type="button"
                                        >
                                            <LuPackageCheck size={16} />
                                            {cue.actionLabel}
                                        </button>
                                    </article>
                                ))}
                                {!data.opportunities.length ? (
                                    <div className={styles.empty}>
                                        <p>No ideas yet. Add a current offer, event, service, or menu link in Inputs.</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "campaigns" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Packs</span>
                                    <h2>Campaign packs</h2>
                                    <p>{data.campaigns.length ? "Packs are ready to copy, download, export, schedule, or send for approval." : "Create your first pack from a campaign idea or saved business details."}</p>
                                </div>
                                <button className={styles.ghostButton} disabled={busyKey === "cue:default"} onClick={() => createCampaign()} type="button">
                                    <LuPackageCheck size={16} />
                                    Create pack
                                </button>
                            </div>
                            {data.campaigns.length ? (
                                <div className={styles.list}>
                                    {data.campaigns.map((campaign) => (
                                        <article className={styles.campaign} key={campaign.id}>
                                            <div className={styles.row}>
                                                <div className={styles.titleBlock}>
                                                    <h3>{campaign.title}</h3>
                                                    <p>{campaign.brief}</p>
                                                </div>
                                                <span className={styles.chip} data-tone={trustTone(campaign.trustGate)}>
                                                    {displayLabel(campaign.trustGate)}
                                                </span>
                                            </div>
                                            <div className={styles.grid}>
                                                {campaign.outputs.map((output) => (
                                                    <article className={styles.output} key={output.id}>
                                                        <div className={styles.row}>
                                                            <h3>{output.label}</h3>
                                                            <span className={styles.chip} data-tone={trustTone(output.trustGate)}>
                                                                {displayLabel(output.trustGate)}
                                                            </span>
                                                        </div>
                                                        <p>{displayLabel(output.mode)} · {displayLabel(output.providerMode)}</p>
                                                        <div className={styles.outputText}>{output.text}</div>
                                                        <OutputFieldSummary output={output} />
                                                        <div className={styles.chips}>
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={busyKey === `${campaign.id}:copy:${output.id}`}
                                                                onClick={() => recordAction(campaign, "copy", output)}
                                                                type="button"
                                                            >
                                                                <LuClipboard size={16} />
                                                                Copy
                                                            </button>
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={busyKey === `${campaign.id}:download:${output.id}`}
                                                                onClick={() => recordAction(campaign, "download", output)}
                                                                type="button"
                                                            >
                                                                <LuDownload size={16} />
                                                                Download text
                                                            </button>
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                            <div className={styles.chips}>
                                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "schedule")} type="button">
                                                    <LuCalendarDays size={16} />
                                                    Schedule task
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "request_approval")} type="button">
                                                    <LuUsers size={16} />
                                                    Request approval
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={busyKey === `${campaign.id}:export:campaign`}
                                                    onClick={() => recordAction(campaign, "export")}
                                                    type="button"
                                                >
                                                    <LuDownload size={16} />
                                                    Download pack
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "mark_used")} type="button">
                                                    <LuCheck size={16} />
                                                    Mark used
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "record_outcome")} type="button">
                                                    <LuCheckCircle2 size={16} />
                                                    Record result
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <p>No campaign packs yet. Use Create pack after your business details or current input is saved.</p>
                                </div>
                            )}
                        </section>
                    ) : null}

                    {tab === "creative" ? renderChannelStudio("creative") : null}
                    {tab === "video" ? renderChannelStudio("video") : null}
                    {tab === "ugc" ? renderChannelStudio("ugc") : null}
                    {tab === "whatsapp" ? renderChannelStudio("whatsapp") : null}
                    {tab === "google" ? renderChannelStudio("google_local") : null}
                    {tab === "ads" ? renderChannelStudio("ads") : null}

                    {tab === "trust" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Checks</span>
                                    <h2>Can this be used?</h2>
                                    <p>{trustFindings.length ? "Each output shows whether it is ready, needs review, or should not be used yet." : "Create a pack to see checks."}</p>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {trustFindings.map(({ campaign, output }) => (
                                    <div className={styles.findingRow} key={`${campaign.id}:${output.id}`}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuShieldCheck size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>{output.label}</h3>
                                                <p>{campaign.title}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip} data-tone={trustTone(output.trustGate)}>
                                            {displayLabel(output.trustGate)}
                                        </span>
                                    </div>
                                ))}
                                {!trustFindings.length ? <div className={styles.empty}><p>No checks yet. Create a campaign pack first.</p></div> : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "calendar" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Calendar</span>
                                    <h2>Posting reminders</h2>
                                    <p>{data.schedules.length ? "Manual posting reminders are ready." : "No reminders yet. Schedule a pack when you want to post it later."}</p>
                                </div>
                                {latestCampaign ? (
                                    <button className={styles.button} onClick={() => recordAction(latestCampaign, "schedule")} type="button">
                                        <LuCalendarDays size={16} />
                                        Schedule latest
                                    </button>
                                ) : null}
                            </div>
                            <div className={styles.list}>
                                {data.schedules.map((schedule) => (
                                    <div className={styles.scheduleRow} key={schedule.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuCalendarDays size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>{displayLabel(schedule.channel)}</h3>
                                                <p>{schedule.note}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip}>{schedule.status}</span>
                                    </div>
                                ))}
                                {!data.schedules.length ? <div className={styles.empty}><p>No scheduled tasks.</p></div> : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "assets" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Asset Library</span>
                                    <h2>Photos and files</h2>
                                    <p>{data.assets.length ? "Saved assets can be checked before they are reused in packs." : "Save photos, logos, or files that may be used in campaigns."}</p>
                                </div>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="asset-name">Asset name</label>
                                        <input
                                            className={styles.input}
                                            id="asset-name"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, name: event.target.value }))}
                                            value={assetDraft.name}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="asset-type">Type</label>
                                        <select
                                            className={styles.select}
                                            id="asset-type"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, assetType: event.target.value }))}
                                            value={assetDraft.assetType}
                                        >
                                            <option value="image">Image</option>
                                            <option value="video">Video</option>
                                            <option value="document">Document</option>
                                            <option value="logo">Logo</option>
                                            <option value="export">Export</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="rights-status">Rights</label>
                                        <select
                                            className={styles.select}
                                            id="rights-status"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, rightsStatus: event.target.value }))}
                                            value={assetDraft.rightsStatus}
                                        >
                                            <option value="confirmed">Confirmed</option>
                                            <option value="needs_review">Needs review</option>
                                            <option value="restricted">Restricted</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="asset-consent">Consent</label>
                                        <select
                                            className={styles.select}
                                            id="asset-consent"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, consentType: event.target.value }))}
                                            value={assetDraft.consentType}
                                        >
                                            <option value="unknown">Unknown</option>
                                            <option value="not_applicable">Not applicable</option>
                                            <option value="owner_confirmed">Owner confirmed</option>
                                            <option value="creator_release">Creator release</option>
                                            <option value="customer_release">Customer release</option>
                                        </select>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="asset-tags">Tags</label>
                                        <input
                                            className={styles.input}
                                            id="asset-tags"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, tags: event.target.value }))}
                                            placeholder="Example: lunch, storefront, staff"
                                            value={assetDraft.tags}
                                        />
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="asset-note">Rights note</label>
                                        <textarea
                                            className={styles.textarea}
                                            id="asset-note"
                                            onChange={(event) => setAssetDraft((draft) => ({ ...draft, rightsNote: event.target.value }))}
                                            placeholder="Example: Owner confirmed photo can be used this month."
                                            value={assetDraft.rightsNote}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label>&nbsp;</label>
                                        <button
                                            className={styles.button}
                                            disabled={!assetDraft.name.trim() || busyKey === "asset"}
                                            onClick={registerAsset}
                                            type="button"
                                        >
                                            <LuUpload size={16} />
                                            Save asset
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.assets.map((asset: CampaignCueAsset) => (
                                    <div className={styles.assetRow} key={asset.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuImage size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>{asset.name}</h3>
                                                <p>
                                                    {displayLabel(asset.assetType)} · {displayLabel(asset.source)}
                                                    {asset.rights.consentType ? ` · ${displayLabel(asset.rights.consentType)}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles.chips}>
                                            {asset.tags?.slice(0, 3).map((tag) => (
                                                <span className={styles.chip} key={tag}>{tag}</span>
                                            ))}
                                            <span className={styles.chip} data-tone={asset.status === "blocked" ? "red" : asset.rights.status === "confirmed" ? "green" : "amber"}>
                                                {displayLabel(asset.rights.status)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {!data.assets.length ? <div className={styles.empty}><p>No assets yet. Save a photo, logo, or file note before reusing it in packs.</p></div> : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "analytics" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Results</span>
                                    <h2>Usage summary</h2>
                                    <p>Counts update when a pack is copied, downloaded, exported, scheduled, approved, or marked used.</p>
                                </div>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Campaigns" value={data.analytics.campaignCount} />
                                <StatCard label="Exports" value={data.analytics.exportCount} />
                                <StatCard label="Manual use" value={data.analytics.usedCount} />
                                <StatCard label="Reported results" value={data.analytics.ownerReportedOutcomeCount || 0} />
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="outcome-note">Result note</label>
                                        <textarea
                                            className={styles.textarea}
                                            id="outcome-note"
                                            onChange={(event) => setOutcomeDraft(event.target.value)}
                                            value={outcomeDraft}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <button
                                            className={styles.button}
                                            disabled={!latestCampaign || busyKey === `${latestCampaign?.id}:record_outcome:campaign`}
                                            onClick={() => latestCampaign && recordAction(latestCampaign, "record_outcome")}
                                            type="button"
                                        >
                                            <LuCheckCircle2 size={16} />
                                            Record result
                                        </button>
                                    </div>
                                    <div className={styles.field}>
                                        <div className={styles.noteBox}>
                                            <strong>Confidence</strong>
                                            <ol>
                                                <li>Copied or downloaded means the owner exported a pack.</li>
                                                <li>Marked used means the owner says it was posted or shared.</li>
                                                <li>Reported result is owner-entered and not treated as platform proof.</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {tab === "agency" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Agency Workspace</span>
                                    <h2>Approvals and handoff</h2>
                                    <p>Send prepared packs for client or owner approval before they are used.</p>
                                </div>
                                <button className={styles.button} disabled={!latestCampaign} onClick={() => latestCampaign && recordAction(latestCampaign, "request_approval")} type="button">
                                    <LuUsers size={16} />
                                    Request latest approval
                                </button>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Agency mode" value={data.workspace.agencyMode ? "On" : "Off"} />
                                <StatCard label="Approval requests" value={data.analytics.approvalRequestCount} />
                                <StatCard label="Campaigns" value={data.analytics.campaignCount} />
                                <StatCard label="Provider actions" value="Off" />
                            </div>
                            <div className={styles.list}>
                                {data.campaigns.map((campaign) => (
                                    <div className={styles.findingRow} key={campaign.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}><LuUsers size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{campaign.title}</h3>
                                                <p>{displayLabel(campaign.ownerApprovalState)}</p>
                                            </div>
                                        </div>
                                        <button className={styles.ghostButton} onClick={() => recordAction(campaign, "request_approval")} type="button">
                                            Request approval
                                        </button>
                                    </div>
                                ))}
                                {!data.campaigns.length ? <div className={styles.empty}><p>No campaign packs ready for approval.</p></div> : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "locations" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Multi-location Center</span>
                                    <h2>Locations</h2>
                                    <p>Add each branch once so packs can be prepared for the right place.</p>
                                </div>
                                <button className={styles.button} disabled={busyKey === "location" || !locationDraft.name.trim()} onClick={createLocation} type="button">
                                    <LuBuilding2 size={16} />
                                    Add location
                                </button>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="location-name">Location name</label>
                                        <input className={styles.input} id="location-name" onChange={(event) => setLocationDraft((draft) => ({ ...draft, name: event.target.value }))} value={locationDraft.name} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-locality">Locality</label>
                                        <input className={styles.input} id="location-locality" onChange={(event) => setLocationDraft((draft) => ({ ...draft, locality: event.target.value }))} value={locationDraft.locality} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-status">Status</label>
                                        <select className={styles.select} id="location-status" onChange={(event) => setLocationDraft((draft) => ({ ...draft, status: event.target.value }))} value={locationDraft.status}>
                                            <option value="draft">Draft</option>
                                            <option value="active">Active</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.locations.map((location: CampaignCueLocation) => (
                                    <div className={styles.assetRow} key={location.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}><LuBuilding2 size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{location.name}</h3>
                                                <p>{location.locality || "No locality set"}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip} data-tone={location.status === "active" ? "green" : "amber"}>{displayLabel(location.status)}</span>
                                    </div>
                                ))}
                                {!data.locations.length ? <div className={styles.empty}><p>No locations yet. Add a branch name and area when you manage more than one location.</p></div> : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "billing" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Plan</span>
                                    <h2>Plan and access</h2>
                                    <p>Billing is not active yet. No spend-changing or social-posting action can run from this workspace.</p>
                                </div>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Billing" value={displayLabel(data.workspace.billingStatus)} />
                                <StatCard label="Default role" value={displayLabel(data.workspace.defaultRole)} />
                                <StatCard label="Billing enabled" value={data.workspace.settings.billingEnabled ? "On" : "Off"} />
                                <StatCard label="Delivery mode" value={displayLabel(data.deliveryPolicy.activeMode)} />
                            </div>
                            <div className={styles.list}>
                                {data.launchReadiness.checks.map((check) => (
                                    <div className={styles.findingRow} key={check.id}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}><LuShieldCheck size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{check.label}</h3>
                                                <p>{check.detail}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip} data-tone={check.status === "ready" ? "green" : check.status === "blocked" ? "red" : "amber"}>
                                            {displayLabel(check.status)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className={styles.list}>
                                {Object.entries(data.workspace.members).map(([memberId, member]) => (
                                    <div className={styles.findingRow} key={memberId}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}><LuUsers size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{displayLabel(member.role)}</h3>
                                                <p>Workspace member ending {memberId.slice(-6)}</p>
                                            </div>
                                        </div>
                                        <span className={styles.chip}>workspace member</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
