"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getExistingProjectsListWithoutLoader } from "@database/projects";
import {
    createGrowthOSKitForProject,
    prepareGrowthOSReviewReply,
    recordGrowthOSKitExport,
    refreshGrowthOSForProject,
    useGrowthOS,
} from "@hook/useGrowthOS";
import { getGrowthOSBoundedStringContext, logGrowthOSApiFailure } from "@lib/growthos/diagnostics";
import { getGrowthOSClientScope } from "@lib/growthos/clientContracts";
import { evaluateGrowthOSEntitlement } from "@lib/growthos/entitlements";
import { isGrowthOSKitExpired } from "@lib/growthos/readiness";
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
import { ProjectsDataContext } from "@providers/projectsDataProvider";
import type {
    GrowthOSActionSummary,
    GrowthOSDestination,
    GrowthOSOutput,
    GrowthOSReviewGuardResult,
    GrowthOSStaffBriefOutput,
} from "@type/growthos";
import { Alert, App, Button, Card, Divider, Input, Select, Space, Spin, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { LuArrowLeft, LuClipboard, LuDownload, LuRefreshCw, LuSend, LuShieldCheck } from "react-icons/lu";
import useSWR from "swr";
import styles from "./styles.module.scss";

const { Text, Title } = Typography;

type ProjectSummary = {
    active?: boolean;
    deleted?: boolean;
    isDefault?: boolean;
    name?: string | Record<string, string>;
    projectId: string;
};

const resolveName = (name: ProjectSummary["name"], fallback = "Untitled") => {
    if (typeof name === "string") return name || fallback;
    if (name && typeof name === "object") {
        const first = Object.values(name).find((value) => typeof value === "string" && value.trim());
        return typeof first === "string" ? first : fallback;
    }
    return fallback;
};

const getOutputPreview = (output?: GrowthOSOutput) => output?.text || "";
const GROWTHOS_REFRESH_FAILED_DESCRIPTION = "Try again in a moment.";
const GROWTHOS_GENERATE_FAILED_DESCRIPTION = "Try preparing the pack again.";
const GROWTHOS_COPY_FAILED_DESCRIPTION = "Copy the text manually for now.";
const GROWTHOS_SHARE_FAILED_DESCRIPTION = "Copy the text and share it manually.";
const GROWTHOS_DOWNLOAD_FAILED_DESCRIPTION = "Copy the text manually for now.";
const GROWTHOS_MARK_USED_FAILED_DESCRIPTION = "Try again in a moment.";
const GROWTHOS_REVIEW_REPLY_FAILED_DESCRIPTION = "Try preparing the reply again.";
const DESKTOP_GROWTHOS_COPY_CLIPBOARD_UNAVAILABLE = "desktop_growthos_copy_clipboard_unavailable";
const DESKTOP_GROWTHOS_COPY_FALLBACK_FAILED = "desktop_growthos_copy_fallback_failed";

const buildDesktopGrowthOSCopyError = (code: string) => Object.assign(new Error(code), { code });

const hasDesktopGrowthOSClipboardWrite = () => (
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText)
);

const hasDesktopGrowthOSCopyFallback = () => (
    typeof document !== "undefined"
    && Boolean(document.body)
    && typeof document.createElement === "function"
    && typeof document.execCommand === "function"
);

const getDesktopGrowthOSCopySupportContext = () => ({
    hasClipboardWrite: hasDesktopGrowthOSClipboardWrite(),
    hasCopyFallback: hasDesktopGrowthOSCopyFallback(),
});

const writeClipboardWithTimeout = async (text: string) => {
    if (!hasDesktopGrowthOSClipboardWrite()) {
        throw buildDesktopGrowthOSCopyError(DESKTOP_GROWTHOS_COPY_CLIPBOARD_UNAVAILABLE);
    }

    await Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Clipboard write timed out")), 1200)),
    ]);
};

const copyWithTextarea = (text: string) => {
    if (!hasDesktopGrowthOSCopyFallback()) {
        throw buildDesktopGrowthOSCopyError(DESKTOP_GROWTHOS_COPY_CLIPBOARD_UNAVAILABLE);
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const copied = document.execCommand("copy");
        if (!copied) {
            throw buildDesktopGrowthOSCopyError(DESKTOP_GROWTHOS_COPY_FALLBACK_FAILED);
        }
        return true;
    } finally {
        document.body.removeChild(textArea);
    }
};

const copyToClipboard = async (text: string) => {
    if (hasDesktopGrowthOSClipboardWrite()) {
        try {
            await writeClipboardWithTimeout(text);
            return true;
        } catch {
            return copyWithTextarea(text);
        }
    }
    return copyWithTextarea(text);
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

const canUseOutput = (output: GrowthOSOutput) => output.preflight?.status !== "blocked";
const isStaffBriefOutput = (output: GrowthOSOutput): output is GrowthOSStaffBriefOutput => (
    output.destination === "staff_brief"
);
type GrowthOSClientLogContext = Record<string, boolean | number | string | null | undefined>;

const GrowthOSPage = () => {
    const { notification } = App.useApp();
    const router = useRouter();
    const { activeSubscription, activeSubscriptionLoading, storeDetails } = useContext(PlatformGlobalDataContext);
    const { activeProject } = useContext(ProjectsDataContext);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(activeProject?.projectId || null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reviewText, setReviewText] = useState("");
    const [reviewRating, setReviewRating] = useState<number>(5);
    const [reviewResult, setReviewResult] = useState<GrowthOSReviewGuardResult | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const pendingOperationsRef = useRef(new Set<string>());
    const entitlement = evaluateGrowthOSEntitlement({
        activeSubscription,
        storeDetails,
        storeId: storeDetails?.storeId,
    });
    const isCheckingEntitlement = FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON && activeSubscriptionLoading;
    const clientScope = getGrowthOSClientScope({
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId,
    });
    const { growthOSSummary, isLoading, mutate } = useGrowthOS({
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId,
    }, !isCheckingEntitlement && entitlement.allowed);

    const { data: projects = [] } = useSWR<ProjectSummary[]>(
        !isCheckingEntitlement && entitlement.allowed && clientScope
            ? ["growthos-projects", clientScope.tId, clientScope.sId]
            : null,
        async () => {
            const result = await getExistingProjectsListWithoutLoader(true);
            return (result?.projects || []) as ProjectSummary[];
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000,
        },
    );

    useEffect(() => {
        setSelectedProjectId(null);
    }, [clientScope?.sId, clientScope?.tId]);

    useEffect(() => {
        if (selectedProjectId || !projects.length) return;
        const available = projects.filter((project) => project.deleted !== true && project.active !== false);
        setSelectedProjectId((available.find((project) => project.isDefault) || available[0] || projects[0])?.projectId || null);
    }, [projects, selectedProjectId]);

    const latestKit = growthOSSummary?.latestKit || null;
    const isLatestKitStale = Boolean(latestKit?.isStale)
        || Boolean(latestKit?.sourceFactsHash && growthOSSummary?.sourceFactsHash && latestKit.sourceFactsHash !== growthOSSummary.sourceFactsHash)
        || isGrowthOSKitExpired(latestKit?.expiresAt);
    const staffBrief = latestKit?.outputs.find(isStaffBriefOutput);
    const counterPrompt = latestKit?.outputs.find((output) => output.destination === "counter_prompt");
    const channelOutputs = latestKit?.outputs.filter((output) => (
        output.destination !== "staff_brief" && output.destination !== "counter_prompt"
    )) || [];

    const action = growthOSSummary?.primaryAction || null;
    const secondaryActions = growthOSSummary?.secondaryActions || [];
    const buildGrowthOSClientLogContext = (
        flow: string,
        output?: GrowthOSOutput | null,
        metadata: GrowthOSClientLogContext = {},
    ): GrowthOSClientLogContext => ({
        surface: "desktop_growth_kits",
        flow,
        hasLatestKit: Boolean(latestKit),
        hasPrimaryAction: Boolean(action),
        isLatestKitStale,
        outputTextLength: output?.text?.length || 0,
        ...getGrowthOSBoundedStringContext("projectId", selectedProjectId),
        ...getGrowthOSBoundedStringContext("storeId", storeDetails?.storeId),
        ...getGrowthOSBoundedStringContext("tenantId", storeDetails?.tenantId),
        ...getGrowthOSBoundedStringContext("kitId", latestKit?.id),
        ...getGrowthOSBoundedStringContext("actionId", action?.id),
        ...getGrowthOSBoundedStringContext("outputId", output?.id),
        ...getGrowthOSBoundedStringContext("destination", output?.destination),
        ...metadata,
    });

    const logGrowthOSClientFailure = (
        failureCode: string,
        error: unknown,
        flow: string,
        output?: GrowthOSOutput | null,
        metadata: GrowthOSClientLogContext = {},
    ) => {
        logGrowthOSApiFailure("[GrowthOS Desktop] Operation failed", failureCode, error, buildGrowthOSClientLogContext(flow, output, metadata));
    };

    const selectedProjectOptions = useMemo(() => projects.map((project) => ({
        label: resolveName(project.name),
        value: project.projectId,
    })), [projects]);

    const handleRefresh = async () => {
        if (pendingOperationsRef.current.has("refresh")) return;
        if (!selectedProjectId) {
            notification.warning({ message: "Select a menu first", placement: "bottomRight" });
            return;
        }
        pendingOperationsRef.current.add("refresh");
        setIsRefreshing(true);
        try {
            const payload = await refreshGrowthOSForProject(selectedProjectId, true);
            await mutate(payload.data, { revalidate: false });
            notification.success({ message: "Menu checked", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_refresh_failed", error, "refresh");
            notification.error({ message: "Could not check menu", description: GROWTHOS_REFRESH_FAILED_DESCRIPTION, placement: "bottomRight" });
        } finally {
            pendingOperationsRef.current.delete("refresh");
            setIsRefreshing(false);
        }
    };

    const handleGenerate = async (nextAction?: GrowthOSActionSummary | null) => {
        if (pendingOperationsRef.current.has("generate")) return;
        if (!selectedProjectId) return;
        pendingOperationsRef.current.add("generate");
        setIsGenerating(true);
        try {
            const payload = await createGrowthOSKitForProject({
                projectId: selectedProjectId,
                actionId: nextAction?.id || action?.id,
            });
            await mutate(payload.data.summary, { revalidate: false });
            notification.success({ message: "Sales Pack ready", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_generate_failed", error, "generate", null, {
                ...getGrowthOSBoundedStringContext("requestedActionId", nextAction?.id || action?.id),
            });
            notification.error({ message: "Could not prepare Sales Pack", description: GROWTHOS_GENERATE_FAILED_DESCRIPTION, placement: "bottomRight" });
        } finally {
            pendingOperationsRef.current.delete("generate");
            setIsGenerating(false);
        }
    };

    const recordUse = async (output: GrowthOSOutput, method: "copy" | "share" | "download" | "mark_used") => {
        if (!latestKit) return;
        const operationKey = `record:${latestKit.id}:${output.id}:${method}`;
        if (pendingOperationsRef.current.has(operationKey)) return;
        pendingOperationsRef.current.add(operationKey);
        try {
            const payload = await recordGrowthOSKitExport({
                kitId: latestKit.id,
                destination: output.destination as GrowthOSDestination,
                method,
                outputId: output.id,
            });
            await mutate((current) => current ? {
                ...current,
                latestKit: current.latestKit ? {
                    ...current.latestKit,
                    status: method === "mark_used" ? "used" : method === "copy" ? "copied" : method === "share" ? "shared" : "downloaded",
                    isStale: typeof payload?.data?.isStale === "boolean" ? payload.data.isStale : current.latestKit.isStale,
                } : current.latestKit,
            } : current, { revalidate: false });
        } finally {
            pendingOperationsRef.current.delete(operationKey);
        }
    };

    const handleCopy = async (output: GrowthOSOutput) => {
        if (!canUseOutput(output)) {
            notification.warning({ message: "This output needs review first", placement: "bottomRight" });
            return;
        }
        if (isLatestKitStale) {
            notification.warning({ message: "Create it again before using", description: "This kit may use old menu details.", placement: "bottomRight" });
            return;
        }
        try {
            const copied = await copyToClipboard(output.text);
            if (!copied) throw new Error("desktop_growthos_copy_failed");
            await recordUse(output, "copy");
            notification.success({ message: "Copied", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_copy_failed", error, "copy", output, getDesktopGrowthOSCopySupportContext());
            notification.error({ message: "Could not copy", description: GROWTHOS_COPY_FAILED_DESCRIPTION, placement: "bottomRight" });
        }
    };

    const handleShare = async (output: GrowthOSOutput) => {
        if (!canUseOutput(output)) {
            notification.warning({ message: "This output needs review first", placement: "bottomRight" });
            return;
        }
        if (isLatestKitStale) {
            notification.warning({ message: "Create it again before sharing", description: "This kit may use old menu details.", placement: "bottomRight" });
            return;
        }
        try {
            const usedNativeShare = typeof navigator.share === 'function';
            if (usedNativeShare) {
                await navigator.share({ text: output.text });
            } else {
                const copied = await copyToClipboard(output.text);
                if (!copied) throw new Error("desktop_growthos_share_fallback_copy_failed");
            }
            await recordUse(output, "share");
            notification.success({ message: usedNativeShare ? "Shared" : "Copied", placement: "bottomRight" });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            logGrowthOSClientFailure("desktop_growthos_share_failed", error, "share", output, {
                ...getDesktopGrowthOSCopySupportContext(),
                usedNativeShare: Boolean(navigator.share),
            });
            notification.error({ message: "Could not share", description: GROWTHOS_SHARE_FAILED_DESCRIPTION, placement: "bottomRight" });
        }
    };

    const handleDownload = async (output: GrowthOSOutput) => {
        if (!canUseOutput(output)) {
            notification.warning({ message: "This output needs review first", placement: "bottomRight" });
            return;
        }
        if (isLatestKitStale) {
            notification.warning({ message: "Create it again before downloading", description: "This kit may use old menu details.", placement: "bottomRight" });
            return;
        }
        try {
            downloadText(`${output.destination}.txt`, output.text);
            await recordUse(output, "download");
            notification.success({ message: "Download started", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_download_failed", error, "download", output);
            notification.error({ message: "Could not download", description: GROWTHOS_DOWNLOAD_FAILED_DESCRIPTION, placement: "bottomRight" });
        }
    };

    const handleMarkUsed = async (output: GrowthOSOutput) => {
        try {
            await recordUse(output, "mark_used");
            notification.success({ message: "Marked used", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_mark_used_failed", error, "mark_used", output);
            notification.error({ message: "Could not mark used", description: GROWTHOS_MARK_USED_FAILED_DESCRIPTION, placement: "bottomRight" });
        }
    };

    const handleReviewReplyCopy = async () => {
        if (!reviewResult?.reply) return;
        try {
            const copied = await copyToClipboard(reviewResult.reply);
            if (!copied) throw new Error("desktop_growthos_review_reply_copy_failed");
            notification.success({ message: "Copied", placement: "bottomRight" });
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_review_reply_copy_failed", error, "review_reply_copy", null, {
                ...getDesktopGrowthOSCopySupportContext(),
                reviewReplyTextLength: reviewResult.reply.length,
            });
            notification.error({ message: "Could not copy", description: GROWTHOS_COPY_FAILED_DESCRIPTION, placement: "bottomRight" });
        }
    };

    const handleReviewGuard = async () => {
        if (pendingOperationsRef.current.has("review")) return;
        pendingOperationsRef.current.add("review");
        setIsReviewing(true);
        try {
            const payload = await prepareGrowthOSReviewReply({
                reviewText,
                rating: reviewRating,
                tone: reviewRating >= 4 ? "thank_you" : "calm",
            });
            setReviewResult(payload.result);
        } catch (error) {
            logGrowthOSClientFailure("desktop_growthos_review_reply_failed", error, "review_reply", null, {
                hasReviewText: Boolean(reviewText.trim()),
                reviewTextLength: reviewText.trim().length,
                reviewRating,
            });
            notification.error({ message: "Could not prepare reply", description: GROWTHOS_REVIEW_REPLY_FAILED_DESCRIPTION, placement: "bottomRight" });
        } finally {
            pendingOperationsRef.current.delete("review");
            setIsReviewing(false);
        }
    };

    if (isCheckingEntitlement) {
        return (
            <div className={styles.growthOSContainer}>
                <Button icon={<LuArrowLeft />} onClick={() => router.push("/today")} type="text">Back to Today</Button>
                <div className={styles.emptyState}>
                    <Spin />
                    <Title level={3}>Growth Kits</Title>
                    <Text type="secondary">Checking plan access...</Text>
                </div>
            </div>
        );
    }

    if (!FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON || !entitlement.allowed) {
        return (
            <div className={styles.growthOSContainer}>
                <Button icon={<LuArrowLeft />} onClick={() => router.push("/today")} type="text">Back to Today</Button>
                <div className={styles.emptyState}>
                    <LuShieldCheck className={styles.emptyIcon} />
                    <Title level={3}>Growth Kits</Title>
                    <Text type="secondary">{entitlement.message}</Text>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.growthOSContainer}>
            <div className={styles.headerRow}>
                <div>
                    <Title level={2}>Growth Kits</Title>
                    <Text type="secondary">Today&apos;s Sales Pack from the current menu.</Text>
                </div>
                <Space wrap>
                    <Select
                        aria-label="Menu"
                        className={styles.projectSelect}
                        onChange={setSelectedProjectId}
                        options={selectedProjectOptions}
                        placeholder="Select menu"
                        value={selectedProjectId || undefined}
                    />
                    <Button icon={<LuRefreshCw />} loading={isRefreshing} onClick={handleRefresh}>
                        Refresh
                    </Button>
                </Space>
            </div>

            {isLoading ? (
                <div className={styles.loadingState}>
                    <Spin size="large" />
                    <Text type="secondary">Preparing Growth Kits...</Text>
                </div>
            ) : null}

            {growthOSSummary?.readiness?.warnings?.length ? (
                <Alert
                    className={styles.banner}
                    message={growthOSSummary.readiness.warnings[0]}
                    showIcon
                    type="warning"
                />
            ) : null}

            {action ? (
                <Card className={styles.actionPanel}>
                    <div className={styles.actionHeader}>
                        <div>
                            <Text type="secondary">Today&apos;s Sales Pack</Text>
                            <Title level={3}>{action.title}</Title>
                            <Text type="secondary">{action.reason}</Text>
                        </div>
                        <Tag color={isLatestKitStale ? "orange" : "green"}>{isLatestKitStale ? "Update first" : "Menu checked"}</Tag>
                    </div>
                    <div className={styles.packPromise}>
                        <Tag color="blue">Customer message</Tag>
                        <Tag color="blue">Staff line</Tag>
                        <Tag color="blue">Counter line</Tag>
                    </div>
                    <Button type="primary" loading={isGenerating} onClick={() => handleGenerate(action)}>
                        Prepare Sales Pack
                    </Button>
                    {secondaryActions.length ? (
                        <div className={styles.secondaryActions}>
                            {secondaryActions.map((nextAction) => (
                                <Button key={nextAction.id} onClick={() => handleGenerate(nextAction)} loading={isGenerating}>
                                    Prepare: {nextAction.title}
                                </Button>
                            ))}
                        </div>
                    ) : null}
                </Card>
            ) : (
                <Card className={styles.actionPanel}>
                    <Text strong>No Growth Kit is ready yet.</Text>
                    <Text type="secondary">Refresh after the menu has at least one available item.</Text>
                </Card>
            )}

            {latestKit ? (
                <section className={styles.kitSection}>
                    <div className={styles.sectionTitle}>
                        <Title level={3}>{latestKit.title}</Title>
                        <Tag color={isLatestKitStale ? "orange" : "blue"}>{isLatestKitStale ? "Update first" : "Ready to use"}</Tag>
                    </div>
                    {isLatestKitStale ? (
                        <Alert
                            className={styles.banner}
                            action={(
                                <Button loading={isGenerating} onClick={() => handleGenerate(action)} size="small" type="primary">
                                    Prepare fresh pack
                                </Button>
                            )}
                            message="Menu details changed. Prepare a fresh pack before copying, sharing, or downloading."
                            type="warning"
                            showIcon
                        />
                    ) : null}
                    <div className={styles.outputGrid}>
                        {channelOutputs.map((output) => (
                            <Card key={output.id} className={styles.outputCard} size="small">
                                <Text strong>{output.label}</Text>
                                <Text className={styles.outputText}>{getOutputPreview(output)}</Text>
                                {output.preflight.status !== "ready" ? (
                                    <Tag color={output.preflight.status === "blocked" ? "red" : "orange"}>{output.preflight.status}</Tag>
                                ) : null}
                                <Space wrap>
                                    <Button disabled={isLatestKitStale || !canUseOutput(output)} icon={<LuClipboard />} onClick={() => handleCopy(output)}>Copy</Button>
                                    <Button disabled={isLatestKitStale || !canUseOutput(output)} icon={<LuSend />} onClick={() => handleShare(output)}>Share</Button>
                                    <Button disabled={isLatestKitStale || !canUseOutput(output)} icon={<LuDownload />} onClick={() => handleDownload(output)}>Download</Button>
                                </Space>
                            </Card>
                        ))}
                    </div>
                    {staffBrief ? (
                        <Card className={styles.staffPanel}>
                            <Text strong>Staff line</Text>
                            <Text className={styles.outputText}>{staffBrief.mainLine || staffBrief.text}</Text>
                            <Button disabled={isLatestKitStale || !canUseOutput(staffBrief)} onClick={() => handleMarkUsed(staffBrief)}>Done</Button>
                        </Card>
                    ) : null}
                    {counterPrompt ? (
                        <Card className={styles.staffPanel}>
                            <Text strong>Counter line</Text>
                            <Text className={styles.outputText}>{counterPrompt.text}</Text>
                            <Button disabled={isLatestKitStale || !canUseOutput(counterPrompt)} icon={<LuClipboard />} onClick={() => handleCopy(counterPrompt)}>Copy counter line</Button>
                        </Card>
                    ) : null}
                </section>
            ) : null}

            {FEATURE_FLAGS.GROWTHOS_REVIEW_REPLY_MODE === "manual_paste_guarded" ? (
                <>
                    <Divider />
                    <section className={styles.reviewSection}>
                        <Title level={3}>Review reply guard</Title>
                        <Text type="secondary">Paste a review and check the reply before posting it yourself.</Text>
                        <Select
                            aria-label="Review rating"
                            className={styles.ratingSelect}
                            onChange={setReviewRating}
                            options={[5, 4, 3, 2, 1].map((rating) => ({ label: `${rating} stars`, value: rating }))}
                            value={reviewRating}
                        />
                        <Input.TextArea
                            maxLength={2000}
                            onChange={(event) => setReviewText(event.target.value)}
                            placeholder="Paste review text"
                            rows={4}
                            value={reviewText}
                        />
                        <Button disabled={!reviewText.trim()} loading={isReviewing} onClick={handleReviewGuard} type="primary">
                            Check reply
                        </Button>
                        {reviewResult ? (
                            <Card size="small" className={styles.reviewResult}>
                                <Text strong>{reviewResult.recommendation}</Text>
                                {reviewResult.reply ? <Text className={styles.outputText}>{reviewResult.reply}</Text> : null}
                                {reviewResult.reply ? <Button onClick={() => void handleReviewReplyCopy()}>Copy reply</Button> : null}
                                {reviewResult.internalCheckLine ? <Text type="secondary">{reviewResult.internalCheckLine}</Text> : null}
                            </Card>
                        ) : null}
                    </section>
                </>
            ) : null}
        </div>
    );
};

export default GrowthOSPage;
