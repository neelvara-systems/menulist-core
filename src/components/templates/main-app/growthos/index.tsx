"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getProjectsListWithoutLoader } from "@database/projects";
import {
    createGrowthOSKitForProject,
    prepareGrowthOSReviewReply,
    recordGrowthOSKitExport,
    refreshGrowthOSForProject,
    useGrowthOS,
} from "@hook/useGrowthOS";
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
import { useContext, useEffect, useMemo, useState } from "react";
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

const writeClipboardWithTimeout = (text: string) => (
    Promise.race([
        navigator.clipboard.writeText(text),
        new Promise((_, reject) => window.setTimeout(() => reject(new Error("Clipboard write timed out")), 1200)),
    ])
);

const copyWithTextarea = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
};

const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
        try {
            await writeClipboardWithTimeout(text);
            return;
        } catch {
            copyWithTextarea(text);
            return;
        }
    }
    copyWithTextarea(text);
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
    const entitlement = evaluateGrowthOSEntitlement({
        activeSubscription,
        storeDetails,
        storeId: storeDetails?.storeId,
    });
    const isCheckingEntitlement = FEATURE_FLAGS.ENABLE_GROWTHOS_ADDON && activeSubscriptionLoading;
    const { growthOSSummary, isLoading, mutate } = useGrowthOS(!isCheckingEntitlement && entitlement.allowed);

    const { data: projects = [] } = useSWR<ProjectSummary[]>(
        !isCheckingEntitlement && entitlement.allowed ? "growthos-projects" : null,
        async () => {
            const result = await getProjectsListWithoutLoader(true);
            return (result?.projects || []) as ProjectSummary[];
        },
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 30000,
        },
    );

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

    const selectedProjectOptions = useMemo(() => projects.map((project) => ({
        label: resolveName(project.name),
        value: project.projectId,
    })), [projects]);

    const handleRefresh = async () => {
        if (!selectedProjectId) {
            notification.warning({ message: "Select a menu first", placement: "bottomRight" });
            return;
        }
        setIsRefreshing(true);
        try {
            const payload = await refreshGrowthOSForProject(selectedProjectId, true);
            await mutate(payload.data, { revalidate: false });
            notification.success({ message: "Menu checked", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not check menu", description: (error as Error).message, placement: "bottomRight" });
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleGenerate = async (nextAction?: GrowthOSActionSummary | null) => {
        if (!selectedProjectId) return;
        setIsGenerating(true);
        try {
            const payload = await createGrowthOSKitForProject({
                projectId: selectedProjectId,
                actionId: nextAction?.id || action?.id,
            });
            await mutate(payload.data.summary, { revalidate: false });
            notification.success({ message: "Sales Pack ready", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not prepare Sales Pack", description: (error as Error).message, placement: "bottomRight" });
        } finally {
            setIsGenerating(false);
        }
    };

    const recordUse = async (output: GrowthOSOutput, method: "copy" | "share" | "download" | "mark_used") => {
        if (!latestKit) return;
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
            await recordUse(output, "copy");
            await copyToClipboard(output.text);
            notification.success({ message: "Copied", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not copy", description: (error as Error).message, placement: "bottomRight" });
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
            await recordUse(output, "share");
            if (navigator.share) {
                await navigator.share({ text: output.text });
            } else {
                await copyToClipboard(output.text);
            }
            notification.success({ message: navigator.share ? "Shared" : "Copied", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not share", description: (error as Error).message, placement: "bottomRight" });
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
            await recordUse(output, "download");
            downloadText(`${output.destination}.txt`, output.text);
            notification.success({ message: "Download started", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not download", description: (error as Error).message, placement: "bottomRight" });
        }
    };

    const handleMarkUsed = async (output: GrowthOSOutput) => {
        try {
            await recordUse(output, "mark_used");
            notification.success({ message: "Marked used", placement: "bottomRight" });
        } catch (error) {
            notification.error({ message: "Could not mark used", description: (error as Error).message, placement: "bottomRight" });
        }
    };

    const handleReviewGuard = async () => {
        setIsReviewing(true);
        try {
            const payload = await prepareGrowthOSReviewReply({
                reviewText,
                rating: reviewRating,
                tone: reviewRating >= 4 ? "thank_you" : "calm",
            });
            setReviewResult(payload.result);
        } catch (error) {
            notification.error({ message: "Could not prepare reply", description: (error as Error).message, placement: "bottomRight" });
        } finally {
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
                                {reviewResult.reply ? <Button onClick={() => copyToClipboard(reviewResult.reply || "")}>Copy reply</Button> : null}
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
