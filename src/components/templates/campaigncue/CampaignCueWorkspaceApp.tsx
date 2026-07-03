"use client";

import { SIGNIN_URL } from "@constant/urls";
import { CAMPAIGNCUE_PAGE_SIZE } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS } from "@constant/campaigncue/creativeEditorAiTools";
import { CAMPAIGNCUE_DESIGN_CUE_COMMANDS } from "@constant/campaigncue/designCue";
import { CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX } from "@constant/campaigncue/domains";
import { CAMPAIGNCUE_ERROR_CODES } from "@constant/campaigncue/errors";
import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import { CAMPAIGNCUE_WORKSPACE_TABS, type CampaignCueWorkspaceTabKey } from "@constant/campaigncue/navigations";
import {
    CAMPAIGNCUE_API_ROUTES,
    buildCampaignCueAuthLaunchUrl,
    getCampaignCueAssetDownloadApiPath,
    getCampaignCueCueLayersAutosaveApiPath,
    getCampaignCueCueLayersBootApiPath,
    getCampaignCueCueLayersExportApiPath,
    getCampaignCueCueLayersRepairApiPath,
    getCampaignCueCampaignActionApiPath,
} from "@constant/campaigncue/routes";
import DashboardHeaderShell from "@/components/shared/dashboardShell/DashboardHeaderShell";
import DashboardSidebarShell, {
    DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
    DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    type DashboardSidebarShellItem,
} from "@/components/shared/dashboardShell/DashboardSidebarShell";
import {
    CAMPAIGNCUE_CHANNEL_STUDIO_COPY,
    CAMPAIGNCUE_DEFAULT_LOCALE,
    CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
    CAMPAIGNCUE_DEFAULT_TIMEZONE,
    CAMPAIGNCUE_SOURCE_TYPE_LABELS,
} from "@constant/campaigncue/workspace";
import type { CampaignCueOutputPickerItem } from "@constant/campaigncue/outputPicker";
import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { FEATURE_FLAGS } from "@config/features";
import { runCampaignCueCreativeEditorAiTool } from "@lib/campaigncue/creativeEditorAiTools";
import { buildCampaignCueDailyDesk } from "@lib/campaigncue/dailyDesk";
import { applyCampaignCueDesignCuePatchSet } from "@lib/campaigncue/design-cue/apply";
import { runCampaignCueDesignCue } from "@lib/campaigncue/design-cue/intent";
import {
    buildCampaignCueWorkspaceTemplateSaveInput,
    summarizeCampaignCuePackTemplateApplication,
} from "@lib/campaigncue/pack-templates/applyTemplate";
import {
    getCampaignCuePackTemplate,
    listCampaignCuePackTemplates,
} from "@lib/campaigncue/pack-templates/catalog";
import { saveCampaignCueWorkspacePackTemplate } from "@lib/campaigncue/pack-templates/workspaceTemplates";
import { formatDateTime, fromNativeDateTimeInputValue, type DateLike, type IntlFormatter } from "@util/dateTime";
import {
    type CreativeEditorDocument,
    type CreativeEditorDesignCueApplyHandler,
    type CreativeEditorDesignCueHandler,
    type CreativeEditorAiToolHandler,
    type CreativeEditorExportResult,
} from "@/modules/creative-editor/types";
import {
    buildCampaignCueBlankCreativeDocument,
    buildCampaignCueCreativeAssetSources,
    buildCampaignCueOutputCreativeDocument,
} from "@/modules/creative-editor/providers/campaigncue";
import type {
    CampaignCueActionType,
    CampaignCueAsset,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueDailyDeskTask,
    CampaignCueDecision,
    CampaignCueLocation,
    CampaignCueManualDeliveryCard,
    CampaignCueOutput,
    CampaignCueOutputPack,
    CampaignCueSourceFact,
    CampaignCueOverview,
    CampaignCueProviderStatus,
    CampaignCueSourceInput,
    CampaignCueTrustSummaryItem,
} from "@type/campaigncue";
import type {
    CampaignCueCueLayerBootPackage,
    CampaignCueCueLayerDesign,
    CampaignCueCueLayerUploadResult,
} from "@type/campaigncueCueLayers";
import type {
    CampaignCuePackTemplateHydrated,
    CampaignCuePackTemplateListResult,
    CampaignCuePackTemplateSummary,
} from "@type/campaigncuePackTemplates";
import AppSettingsPanel from "@organisms/sidebar/appSettingsPanel";
import ProfileActionsModal from "@organisms/headerComponent/profileActionsModal";
import {
    getDarkModeState,
    getRTLDirectionState,
    getSidebarState,
    toggleAppSettingsPanel,
    toggleDarkMode,
    toggleSidbar,
} from "@reduxSlices/clientThemeConfig";
import { Avatar, Badge, Button, Divider, Flex, Tooltip, theme } from "antd";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useFormatter, useTranslations } from "next-intl";
import type { CSSProperties, ChangeEvent, ComponentType } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
    LuArrowRight,
    LuBuilding2,
    LuCamera,
    LuCalendarDays,
    LuCheck,
    LuCheckCircle2,
    LuChevronLeft,
    LuChevronRight,
    LuAlertCircle,
    LuClipboardCheck,
    LuDownload,
    LuExternalLink,
    LuFileText,
    LuHome,
    LuImage,
    LuLayers,
    LuMapPin,
    LuMoon,
    LuPackageCheck,
    LuPrinter,
    LuRefreshCw,
    LuRotateCcw,
    LuSearch,
    LuSend,
    LuSettings2,
    LuShieldCheck,
    LuSparkles,
    LuSun,
    LuUpload,
    LuUploadCloud,
    LuUsers,
} from "react-icons/lu";
import PackTemplatePicker from "./PackTemplatePicker";
import styles from "./CampaignCueWorkspaceApp.module.scss";

const CreativeEditor = dynamic(() => import("@/modules/creative-editor/CreativeEditor"), {
    ssr: false,
    loading: () => (
        <div className={styles.empty}>
            <p>Loading editor...</p>
        </div>
    ),
});

interface ApiState {
    code?: string;
    data?: CampaignCueOverview;
    error?: string;
    loading: boolean;
    status?: number;
}

interface PackTemplateState {
    catalog?: CampaignCuePackTemplateListResult;
    error?: string;
    loading: boolean;
}

type CampaignCueEditorContextKind = "blank" | "campaign_output" | "cue_layers" | "pack_template";

interface CampaignCueEditorProtectedFact {
    id: string;
    label: string;
    sourceRef?: string;
    status: "ready" | "needs_review" | "blocked";
    value: string;
}

interface CampaignCueEditorContext {
    campaign?: CampaignCueCampaign;
    cueLayerDesign?: CampaignCueCueLayerDesign;
    deliveryCards: CampaignCueManualDeliveryCard[];
    kind: CampaignCueEditorContextKind;
    mobileNote: string;
    output?: CampaignCueOutput;
    outputFormats: string[];
    outputPack?: CampaignCueOutputPack;
    printFormats: string[];
    protectedFacts: CampaignCueEditorProtectedFact[];
    resultOptions: CampaignCueDailyDeskTask["resultOptions"];
    resultQuestion: string;
    subtitle: string;
    tasks: CampaignCueDailyDeskTask[];
    title: string;
    trustSummary: CampaignCueTrustSummaryItem[];
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

const formatCampaignCueDate = (value: unknown, formatter: IntlFormatter) => {
    if (!value) return "";
    const label = formatDateTime(value as DateLike, "date", formatter);
    return label === "N/A" ? "" : label;
};

const formatCampaignCueDateTime = (value: unknown, formatter: IntlFormatter) => {
    if (!value) return "";
    const label = formatDateTime(value as DateLike, "datetime", formatter);
    return label === "N/A" ? "" : label;
};

const noticeTone = (notice: string) => (
    /blocked|could|failed|not|unavailable|error/i.test(notice) ? "red" : "green"
);

const getCampaignCueWorkspaceFailureNotice = (_error: unknown, fallback: string) => fallback;
const CAMPAIGNCUE_WORKSPACE_RESPONSE_JSON_MAX_BYTES = 4 * 1024 * 1024;
const CAMPAIGNCUE_HANDOFF_COPY_CLIPBOARD_UNAVAILABLE = "campaigncue_handoff_copy_clipboard_unavailable";
const CAMPAIGNCUE_HANDOFF_COPY_FALLBACK_FAILED = "campaigncue_handoff_copy_fallback_failed";

type CampaignCueWorkspaceResponseResult<T> =
    | { code?: undefined; ok: true; data: T; status: number }
    | { code?: string; ok: false; status: number };

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === "number" && Number.isFinite(value)
);

const isDataEnvelope = (value: unknown): value is { data: unknown } => (
    isRecord(value) && "data" in value
);

const isRecordData = (value: unknown): value is Record<string, unknown> => isRecord(value);

const isCampaignCueOverviewData = (value: unknown): value is CampaignCueOverview => (
    isRecord(value)
    && isRecord(value.workspace)
    && isRecord(value.businessBrain)
    && isRecord(value.dailyDesk)
    && Array.isArray(value.campaigns)
    && Array.isArray(value.assets)
    && Array.isArray(value.sourceInputs)
    && Array.isArray(value.locations)
);

const isCueLayerBootPackageData = (value: unknown): value is CampaignCueCueLayerBootPackage => (
    isRecord(value)
    && isRecord(value.design)
    && isRecord(value.document)
);

const isCueLayerAutosaveData = (
    value: unknown,
): value is { design?: CampaignCueCueLayerDesign; revision: number } => (
    isRecord(value)
    && isFiniteNumber(value.revision)
    && (value.design === undefined || isRecord(value.design))
);

const isCueLayerUploadResultData = (value: unknown): value is CampaignCueCueLayerUploadResult => (
    isRecord(value)
    && isRecord(value.design)
    && isCueLayerBootPackageData(value.boot)
);

const isAssetDownloadData = (value: unknown): value is { url: string } => (
    isRecord(value)
    && typeof value.url === "string"
    && value.url.length > 0
);

const isCampaignCueWorkspaceResponseCode = (payload: unknown): string | undefined => (
    isRecord(payload) && typeof payload.code === "string" ? payload.code : undefined
);

const readCampaignCueWorkspaceData = async <T,>(
    response: Response,
    operation: string,
    isValidData: (value: unknown) => value is T,
): Promise<CampaignCueWorkspaceResponseResult<T>> => {
    const context = {
        surface: "campaigncue_workspace",
        ...getBoundedRuntimeStringContext("operation", operation),
        responseOk: response.ok,
        responseStatus: response.status,
    };
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            CAMPAIGNCUE_WORKSPACE_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure("campaigncue_workspace_response_parse_failed", error, context);
        return { ok: false, status: response.status };
    }

    if (!response.ok) {
        logRuntimeFailure("campaigncue_workspace_response_rejected", undefined, context);
        return { code: isCampaignCueWorkspaceResponseCode(payload), ok: false, status: response.status };
    }

    if (!isDataEnvelope(payload) || !isValidData(payload.data)) {
        logRuntimeFailure("campaigncue_workspace_response_invalid", undefined, context);
        return { ok: false, status: response.status };
    }

    return { data: payload.data, ok: true, status: response.status };
};

const buildCampaignCueHandoffCopyError = (code: string) => Object.assign(new Error(code), { code });

const hasCampaignCueHandoffClipboardWrite = () => (
    typeof navigator !== "undefined" && Boolean(navigator.clipboard?.writeText)
);

const hasCampaignCueHandoffCopyFallback = () => (
    typeof document !== "undefined"
    && Boolean(document.body)
    && typeof document.createElement === "function"
    && typeof document.execCommand === "function"
);

const copyCampaignCueHandoffValueToClipboard = async (value: string) => {
    if (hasCampaignCueHandoffClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch {
            // Continue to the acknowledged textarea fallback before surfacing failure.
        }
    }

    if (!hasCampaignCueHandoffCopyFallback()) {
        throw buildCampaignCueHandoffCopyError(CAMPAIGNCUE_HANDOFF_COPY_CLIPBOARD_UNAVAILABLE);
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand("copy");
        if (!copied) {
            throw buildCampaignCueHandoffCopyError(CAMPAIGNCUE_HANDOFF_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

const cueLayerDesignTone = (status?: string) => {
    if (status === "ready") return "green";
    if (status === "failed" || status === "cancelled") return "red";
    return "amber";
};

const ownerStatusTone = (status?: string) => {
    if (status === "ready" || status === "clear") return "green";
    if (status === "blocked" || status === "missing" || status === "needs_fix") return "red";
    return "amber";
};

const ownerStatusLabel = (status?: string) => {
    if (status === "clear" || status === "ready") return "Ready";
    if (status === "missing") return "Missing";
    if (status === "blocked" || status === "needs_fix") return "Blocked";
    return "Needs review";
};

const campaignBlocksPublicUse = (campaign?: CampaignCueCampaign | null) => (
    campaign?.trustGate === "blocked" || campaign?.trustGate === "needs_fix"
);

const publicUseBlockedLabel = "Fix blocked trust issues before downloading, scheduling, or marking this pack used.";

const decisionTone = (value?: string) => {
    if (value === "high" || value === "ready_to_prepare") return "green";
    if (value === "medium" || value === "needs_owner_input" || value === "safe_evergreen_only") return "amber";
    return "red";
};

const decisionLabel = (value?: string) => {
    if (value === "ready_to_prepare") return "Ready to prepare";
    if (value === "needs_owner_input") return "Needs input";
    if (value === "safe_evergreen_only") return "Safer action";
    if (value === "blocked") return "Blocked";
    return displayLabel(value);
};

const providerOwnerSummary = (provider: CampaignCueProviderStatus) => {
    if (provider.status === "manual_only") {
        return "No account connection is needed. Download the pack and paste it manually.";
    }
    if (provider.status === "disabled") {
        return "This future provider layer is off. Download prepared assets when available.";
    }
    return provider.reason;
};

const buildIdempotencyKey = (prefix: string) => createTimestampedRuntimeId(prefix, 8);

const formatMegabytes = (bytes: number) => `${Math.max(1, Math.floor(bytes / (1024 * 1024)))} MB`;

const fingerprintDocument = (documentValue: CreativeEditorDocument | null) => (
    documentValue ? JSON.stringify(documentValue) : ""
);

const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.readAsDataURL(file);
});

const readImageDimensions = (dataUrl: string) => new Promise<{ height: number; width: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({
        height: image.naturalHeight || 1080,
        width: image.naturalWidth || 1080,
    });
    image.onerror = () => resolve({ height: 1080, width: 1080 });
    image.src = dataUrl;
});

const getLocalSignInUrl = () => {
    if (typeof window === "undefined") return buildCampaignCueAuthLaunchUrl(SIGNIN_URL);
    const callbackUrl = encodeURIComponent(window.location.href);
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return isLocal ? `/signin?callbackUrl=${callbackUrl}` : buildCampaignCueAuthLaunchUrl(SIGNIN_URL);
};

const getUserInitials = (name?: string | null, email?: string | null) => {
    const source = (name || email || "CC").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
};

const getCampaignCueThemeVars = (token: ReturnType<typeof theme.useToken>["token"]) => ({
    "--cc-bg": token.colorBgLayout,
    "--cc-panel": token.colorBgContainer,
    "--cc-panel-alt": token.colorFillAlter,
    "--cc-surface": token.colorBgElevated,
    "--cc-border": token.colorBorder,
    "--cc-border-soft": token.colorBorderSecondary,
    "--cc-text": token.colorText,
    "--cc-text-muted": token.colorTextSecondary,
    "--cc-text-soft": token.colorTextTertiary,
    "--cc-primary": token.colorPrimary,
    "--cc-primary-bg": token.colorPrimaryBg,
    "--cc-primary-border": token.colorPrimaryBorder,
    "--cc-success-bg": token.colorSuccessBg,
    "--cc-success-text": token.colorSuccessText,
    "--cc-warning-bg": token.colorWarningBg,
    "--cc-warning-text": token.colorWarningText,
    "--cc-error-bg": token.colorErrorBg,
    "--cc-error-text": token.colorErrorText,
    "--cc-shadow": token.boxShadowSecondary,
} as CSSProperties);

const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
};

const downloadText = (filename: string, text: string) => {
    downloadBlob(filename, new Blob([text], { type: "text/plain;charset=utf-8" }));
};

const openDownloadUrl = (url: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener noreferrer";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
};

const parseDateTimeLocal = (value: string, timeZone?: string): string => {
    if (!value) return "";
    const normalized = value.trim();
    if (!normalized) return "";

    try {
        return fromNativeDateTimeInputValue(normalized, timeZone || CAMPAIGNCUE_DEFAULT_TIMEZONE);
    } catch {
        return "";
    }
};

const outputFilename = (campaign: CampaignCueCampaign, output: CampaignCueOutput) => (
    `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${output.channel}.txt`
);

const campaignPackZipFilename = (campaign: CampaignCueCampaign) => (
    `${campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-campaigncue-pack.zip`
);

const buildCampaignPackExport = (
    campaign: CampaignCueCampaign,
    dailyDesk?: CampaignCueOverview["dailyDesk"],
) => {
    const matchingReadyPack = dailyDesk?.readyPack?.campaignId === campaign.id
        ? dailyDesk.readyPack
        : undefined;
    const matchingPackReview = dailyDesk?.packReview?.campaignId === campaign.id
        ? dailyDesk.packReview
        : undefined;
    const lines = [
        `# ${campaign.title}`,
        campaign.brief,
        `Status: ${displayLabel(campaign.status)}`,
        `Trust: ${displayLabel(campaign.trustGate)}`,
        "",
        "## Owner desk",
        dailyDesk?.summary.title ? `Recommended action: ${dailyDesk.summary.title}` : "",
        dailyDesk?.summary.detail ? `Why: ${dailyDesk.summary.detail}` : "",
        matchingReadyPack?.plainAction ? `Owner goal: ${matchingReadyPack.plainAction}` : "",
        matchingReadyPack?.outputFormats?.length ? `Ready formats: ${matchingReadyPack.outputFormats.join(", ")}` : "",
        matchingReadyPack?.printFormats?.length ? `Print and in-store: ${matchingReadyPack.printFormats.join(", ")}` : "",
        matchingReadyPack?.photoTasks?.length ? `Photo task: ${matchingReadyPack.photoTasks.join(" / ")}` : "",
        matchingPackReview?.reason ? `Pack reason: ${matchingPackReview.reason}` : "",
        matchingPackReview?.decision ? `Decision confidence: ${matchingPackReview.decision.confidence}` : "",
        matchingPackReview?.decision ? `Decision status: ${decisionLabel(matchingPackReview.decision.decisionStatus)}` : "",
        matchingPackReview?.decision ? `Decision score: ${matchingPackReview.decision.score.finalScore}/100` : "",
        "",
        "## Why this recommendation",
        ...(matchingPackReview?.decision?.explanation.whyThis.length
            ? matchingPackReview.decision.explanation.whyThis.map((item) => `- ${item}`)
            : dailyDesk?.decision?.explanation.whyThis.length
                ? dailyDesk.decision.explanation.whyThis.map((item) => `- ${item}`)
                : ["- Decision evidence was not included in this export."]),
        "",
        "## Trust preflight",
        ...(matchingPackReview?.decision?.trustPreflight.findings.length
            ? matchingPackReview.decision.trustPreflight.findings.map((item) => `- ${item}`)
            : dailyDesk?.decision?.trustPreflight.findings.length
                ? dailyDesk.decision.trustPreflight.findings.map((item) => `- ${item}`)
                : ["- No blocking preflight issue from current facts."]),
        "",
        "## Trust review",
        ...(matchingPackReview?.trustSummary?.length
            ? matchingPackReview.trustSummary.map((item) => `- ${item.label}: ${ownerStatusLabel(item.status)}. ${item.detail}`)
            : [`- Trust: ${displayLabel(campaign.trustGate)}`]),
        "",
        "## Manual delivery checklist",
        ...(matchingReadyPack?.manualDeliveryTasks?.length
            ? matchingReadyPack.manualDeliveryTasks.map((task, index) => `${index + 1}. ${task}`)
            : dailyDesk?.manualDeliveryTasks?.length
                ? dailyDesk.manualDeliveryTasks.map((task, index) => `${index + 1}. ${task.detail}`)
                : ["1. Download the pack and use it manually."]),
        "",
        "## Manual handoff fields",
        ...(matchingPackReview?.deliveryCards?.length
            ? matchingPackReview.deliveryCards.flatMap((card) => [
                `### ${card.title}`,
                `Status: ${ownerStatusLabel(card.status)}`,
                `Use: ${card.ownerUseCase}`,
                ...card.fields.map((field) => `- ${field.label}: ${field.value} (${ownerStatusLabel(field.status)})`),
            ])
            : ["- Create a pack to see channel handoff fields."]),
        "",
        "## Local visibility",
        ...(matchingPackReview?.localVisibilityCues?.length
            ? matchingPackReview.localVisibilityCues.map((cue) => `- ${cue.label}: ${ownerStatusLabel(cue.status)}. ${cue.detail}`)
            : dailyDesk?.localVisibilityCues?.length
                ? dailyDesk.localVisibilityCues.map((cue) => `- ${cue.label}: ${ownerStatusLabel(cue.status)}. ${cue.detail}`)
                : ["- No local visibility cues recorded."]),
        "",
        "## Result memory",
        matchingReadyPack?.resultQuestion || dailyDesk?.recipe?.resultQuestion || "What happened after using this pack?",
        ...(matchingReadyPack?.resultOptions?.length
            ? matchingReadyPack.resultOptions.map((option) => `- ${option.label}: ${option.note}`)
            : []),
        "",
        "## Small details to confirm",
        ...(dailyDesk?.missingInputs?.length
            ? dailyDesk.missingInputs.map((task) => `- ${task.label}: ${task.detail}`)
            : ["- No blocking detail recorded in the current desk."]),
        "",
        "## Outputs",
        ...campaign.outputs.flatMap((output) => [
            "",
            `### ${output.label}`,
            `Mode: ${displayLabel(output.mode)}`,
            `Trust: ${displayLabel(output.trustGate)}`,
            output.fields.ownerUseCase ? `Use: ${output.fields.ownerUseCase}` : "",
            "",
            output.text,
            "",
            `CTA: ${output.fields.cta}`,
            `Destination: ${output.fields.destination || "Not set"}`,
            `Format: ${output.fields.dimensions}`,
            output.fields.outputFormats?.length ? `Owner formats: ${output.fields.outputFormats.join(", ")}` : "",
            output.fields.printFormats?.length ? `Print formats: ${output.fields.printFormats.join(", ")}` : "",
            output.fields.photoTasks?.length ? `Photo tasks: ${output.fields.photoTasks.join(" / ")}` : "",
            `Consent: ${output.fields.consentNote}`,
            `Policy: ${output.fields.policyNote}`,
            output.fields.utm ? `UTM: ${output.fields.utm}` : "",
            "",
            "Review before use:",
            ...(output.fields.reviewChecklist || []).map((step, index) => `${index + 1}. ${step}`),
            "",
            "Manual steps:",
            ...output.fields.manualSteps.map((step, index) => `${index + 1}. ${step}`),
        ]),
    ];
    return `${lines.filter((line) => line !== "").join("\n")}\n`;
};

const outputPackForCampaign = (
    campaign: CampaignCueCampaign,
    dailyDesk?: CampaignCueOverview["dailyDesk"],
) => {
    if (dailyDesk?.outputPack?.campaignId === campaign.id) return dailyDesk.outputPack;
    if (dailyDesk?.packReview?.campaignId === campaign.id) return dailyDesk.packReview.outputPack;
    return undefined;
};

const outputPackStatusCounts = (outputPack?: CampaignCueOutputPack) => {
    const files = outputPack?.downloadBundle.files || [];
    return {
        blocked: files.filter((file) => file.status === "blocked").length,
        needsInput: files.filter((file) => file.status === "needs_input").length,
        needsReview: files.filter((file) => file.status === "needs_review").length,
        ready: files.filter((file) => file.status === "ready").length,
        total: files.length,
    };
};

const sourceFactStatus = (fact: CampaignCueSourceFact): CampaignCueEditorProtectedFact["status"] => {
    if (fact.risk === "blocked") return "blocked";
    if (fact.risk === "needs_review") return "needs_review";
    return "ready";
};

const protectedFactFromSourceFact = (fact: CampaignCueSourceFact): CampaignCueEditorProtectedFact => ({
    id: fact.id,
    label: fact.label,
    sourceRef: fact.sourceRef,
    status: sourceFactStatus(fact),
    value: fact.value,
});

const dedupeEditorProtectedFacts = (
    facts: CampaignCueEditorProtectedFact[],
): CampaignCueEditorProtectedFact[] => {
    const seen = new Set<string>();
    return facts.filter((fact) => {
        const key = `${fact.label}:${fact.value}`.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return Boolean(fact.value);
    });
};

const buildBusinessProtectedFacts = (overview: CampaignCueOverview): CampaignCueEditorProtectedFact[] => {
    const business = overview.businessBrain;
    const contact = business.contacts.whatsapp
        || business.contacts.phone
        || business.contacts.bookingUrl
        || business.contacts.publicMenuUrl
        || business.contacts.website
        || "";
    const primaryItem = business.catalog.items.find((item) => item.available)
        || business.catalog.services.find((item) => item.available);
    const playbook = business.brandKit.playbook;
    return dedupeEditorProtectedFacts([
        {
            id: "business-name",
            label: "Business name",
            status: business.name ? "ready" : "needs_review",
            value: business.name,
        },
        {
            id: "business-locality",
            label: "Location",
            status: business.locality ? "ready" : "needs_review",
            value: business.locality,
        },
        {
            id: "business-contact",
            label: "Contact",
            status: contact ? "ready" : "needs_review",
            value: contact,
        },
        {
            id: "primary-item",
            label: "Item or service",
            status: primaryItem?.name ? "ready" : "needs_review",
            value: primaryItem?.name || "",
        },
        {
            id: "primary-price",
            label: "Price",
            status: primaryItem?.priceLabel ? "ready" : "needs_review",
            value: primaryItem?.priceLabel || "",
        },
        {
            id: "brand-feel",
            label: "Brand feel",
            status: playbook.brandFeel.length ? "ready" : "needs_review",
            value: playbook.brandFeel.join(", "),
        },
        {
            id: "brand-visual-motifs",
            label: "Brand visual motifs",
            status: playbook.visualMotifs.length ? "ready" : "needs_review",
            value: playbook.visualMotifs.join(", "),
        },
        {
            id: "brand-avoid-list",
            label: "Brand avoid list",
            status: playbook.avoidList.length ? "ready" : "needs_review",
            value: playbook.avoidList.join(", "),
        },
    ]);
};

const collectEditorProtectedFacts = (params: {
    campaign?: CampaignCueCampaign;
    outputPack?: CampaignCueOutputPack;
    overview: CampaignCueOverview;
    sourceFacts?: CampaignCueSourceFact[];
}) => {
    const sourceFacts = dedupeEditorProtectedFacts([
        ...(params.sourceFacts || []),
        ...params.overview.sourceFacts,
        ...params.overview.sourceInputs.flatMap((input) => input.facts),
    ].map(protectedFactFromSourceFact));
    const selectedIds = new Set([
        ...(params.outputPack?.facts.usedFactRefs || []),
        ...(params.campaign?.pack?.sourceFactIds || []),
    ]);
    const selectedFacts = selectedIds.size
        ? sourceFacts.filter((fact) => selectedIds.has(fact.id) || (fact.sourceRef && selectedIds.has(fact.sourceRef)))
        : [];
    return dedupeEditorProtectedFacts([
        ...selectedFacts,
        ...buildBusinessProtectedFacts(params.overview),
        ...sourceFacts,
    ]).slice(0, 8);
};

const outputFormatsForEditorContext = (
    campaign?: CampaignCueCampaign,
    output?: CampaignCueOutput,
    outputPack?: CampaignCueOutputPack,
) => {
    const formats = new Set<string>();
    output?.fields.outputFormats?.forEach((format) => formats.add(format));
    campaign?.outputs.forEach((campaignOutput) => campaignOutput.fields.outputFormats?.forEach((format) => formats.add(format)));
    outputPack?.creative.visualAssets.forEach((asset) => formats.add(`${displayLabel(asset.channel)} ${asset.size}`));
    return Array.from(formats).slice(0, 8);
};

const printFormatsForEditorContext = (
    campaign?: CampaignCueCampaign,
    output?: CampaignCueOutput,
    outputPack?: CampaignCueOutputPack,
) => {
    const formats = new Set<string>();
    output?.fields.printFormats?.forEach((format) => formats.add(format));
    campaign?.outputs.forEach((campaignOutput) => campaignOutput.fields.printFormats?.forEach((format) => formats.add(format)));
    outputPack?.creative.visualAssets
        .filter((asset) => asset.exportFormat === "pdf_flattened")
        .forEach((asset) => formats.add(`${displayLabel(asset.channel)} ${asset.size}`));
    return Array.from(formats).slice(0, 6);
};

const buildCampaignOutputEditorContext = (
    overview: CampaignCueOverview,
    campaign: CampaignCueCampaign,
    output: CampaignCueOutput,
): CampaignCueEditorContext => {
    const packReview = overview.dailyDesk.packReview?.campaignId === campaign.id
        ? overview.dailyDesk.packReview
        : undefined;
    const outputPack = outputPackForCampaign(campaign, overview.dailyDesk);
    const deliveryCards = (packReview?.deliveryCards || []).filter((card) => (
        card.outputId === output.id || card.channel === output.channel
    ));
    const tasks = [
        ...(packReview?.missingInputs || []),
        ...overview.dailyDesk.manualDeliveryTasks,
        ...overview.dailyDesk.assetReuseTasks,
        ...overview.dailyDesk.printTasks,
        overview.dailyDesk.resultPrompt,
    ].filter(Boolean) as CampaignCueDailyDeskTask[];
    const trustSummary = packReview?.trustSummary.length
        ? packReview.trustSummary
        : [{
            detail: output.trustGate === "clear"
                ? "Current output has no blocking trust issue."
                : "Review this output before public use.",
            id: `${output.id}:trust`,
            label: output.label,
            status: output.trustGate === "blocked" || output.trustGate === "needs_fix"
                ? "blocked"
                : output.trustGate === "warning"
                    ? "needs_review"
                    : "ready",
        } satisfies CampaignCueTrustSummaryItem];

    return {
        campaign,
        deliveryCards,
        kind: "campaign_output",
        mobileNote: "Mobile is for review, copy, download, and result capture. Use desktop for precise layer editing.",
        output,
        outputFormats: outputFormatsForEditorContext(campaign, output, outputPack),
        outputPack,
        printFormats: printFormatsForEditorContext(campaign, output, outputPack),
        protectedFacts: collectEditorProtectedFacts({
            campaign,
            outputPack,
            overview,
            sourceFacts: packReview?.sourceFacts,
        }),
        resultOptions: packReview?.resultOptions || overview.dailyDesk.readyPack?.resultOptions || overview.dailyDesk.resultPrompt?.resultOptions,
        resultQuestion: packReview?.resultQuestion
            || campaign.pack?.resultQuestion
            || overview.dailyDesk.readyPack?.resultQuestion
            || overview.dailyDesk.recipe.resultQuestion,
        subtitle: `${displayLabel(output.channel)} · ${output.fields.dimensions}`,
        tasks: dedupeDailyDeskTasks(tasks).slice(0, 6),
        title: campaign.title,
        trustSummary: trustSummary.slice(0, 6),
    };
};

const dedupeDailyDeskTasks = (tasks: CampaignCueDailyDeskTask[]) => {
    const seen = new Set<string>();
    return tasks.filter((task) => {
        if (seen.has(task.id)) return false;
        seen.add(task.id);
        return true;
    });
};

const buildPackTemplateEditorContext = (
    overview: CampaignCueOverview,
    template: CampaignCuePackTemplateHydrated,
    intent?: CampaignCueOutputPickerItem,
): CampaignCueEditorContext => {
    const requiredFactSlots = template.payload.factSlots.filter((slot) => slot.required);
    const hasOutputIntent = Boolean(intent && intent.id !== "recommended_pack");
    const templateProtectedFacts = template.payload.factSlots
        .filter((slot) => slot.protected)
        .map((slot): CampaignCueEditorProtectedFact => ({
            id: `template:${template.summary.templateId}:fact:${slot.type}`,
            label: displayLabel(slot.type),
            status: slot.required ? "needs_review" : "ready",
            value: slot.required ? "Required before reuse" : "Optional",
        }));
    const outputFormats = Array.from(new Set([
        ...template.payload.outputPackShape.channels.map(displayLabel),
        ...template.summary.outputTypes.map(displayLabel),
        ...(hasOutputIntent ? intent?.channels.map(displayLabel) || [] : []),
        ...(hasOutputIntent ? intent?.outputTypes.map(displayLabel) || [] : []),
        ...(overview.dailyDesk.readyPack?.outputFormats || []),
    ].filter(Boolean))).slice(0, 8);
    const printFormats = Array.from(new Set([
        ...template.payload.outputPackShape.printFormats.map(displayLabel),
        ...(hasOutputIntent ? intent?.outputTypes
            .filter((outputType) => outputType.includes("pdf"))
            .map(displayLabel) || [] : []),
        ...(overview.dailyDesk.readyPack?.printFormats || []),
    ].filter(Boolean))).slice(0, 6);
    const outputIntentTask: CampaignCueDailyDeskTask | null = hasOutputIntent && intent
        ? {
            actionLabel: intent.actionLabel,
            detail: intent.description,
            id: `template:${template.summary.templateId}:intent:${intent.id}`,
            kind: "campaign_pack",
            label: `Output focus · ${intent.title}`,
            severity: "info",
            sourceReferences: [`template:${template.summary.templateId}`, `output-intent:${intent.id}`],
            targetTab: "delivery",
        }
        : null;
    const templateTasks = template.payload.factSlots.map((slot): CampaignCueDailyDeskTask => ({
        actionLabel: slot.required ? "Confirm fact" : "Review fact",
        detail: slot.ownerQuestion,
        id: `template:${template.summary.templateId}:slot:${slot.type}`,
        inputType: slot.type as CampaignCueDailyDeskTask["inputType"],
        kind: "source_input",
        label: `${slot.required ? "Required" : "Optional"} · ${displayLabel(slot.type)}`,
        severity: slot.required ? "needs_fix" : "info",
        sourceReferences: [`template:${template.summary.templateId}`],
        targetTab: "sources",
    }));
    const deliveryCards = template.payload.outputPackShape.deliveryCards
        .slice(0, 3)
        .map((cardTitle, index): CampaignCueManualDeliveryCard => ({
            channel: template.summary.channels[index] || template.summary.channels[0] || "creative",
            fields: [{
                copyable: false,
                id: `template:${template.summary.templateId}:delivery:${index}:field`,
                label: "Template handoff",
                required: false,
                status: requiredFactSlots.length ? "needs_review" : "ready",
                value: displayLabel(cardTitle),
            }],
            id: `template:${template.summary.templateId}:delivery:${index}`,
            instructions: [
                "Confirm protected facts before using this saved pack.",
                hasOutputIntent && intent
                    ? `Keep the pack focused on ${intent.title.toLowerCase()} while reviewing the saved layout.`
                    : "Generate or refresh the campaign pack, then download or copy the handoff items.",
            ],
            ownerUseCase: "Reuse this saved campaign handoff without starting from a blank canvas.",
            status: requiredFactSlots.length ? "needs_review" : "ready",
            title: displayLabel(cardTitle),
        }));
    const trustSummary = [
        ...(requiredFactSlots.length ? [{
            detail: `${requiredFactSlots.length} required template input${requiredFactSlots.length === 1 ? "" : "s"} must be confirmed before export.`,
            id: `template:${template.summary.templateId}:required-facts`,
            label: "Template facts",
            status: "needs_review" as const,
        }] : []),
        ...template.payload.trustChecks.map((check): CampaignCueTrustSummaryItem => ({
            detail: "Template reuse keeps this check visible before owner export.",
            id: `template:${template.summary.templateId}:trust:${check}`,
            label: displayLabel(check),
            status: requiredFactSlots.length ? "needs_review" : "ready",
        })),
        ...(overview.dailyDesk.packReview?.trustSummary || []),
    ].slice(0, 6);

    return {
        deliveryCards: deliveryCards.length ? deliveryCards : overview.dailyDesk.packReview?.deliveryCards.slice(0, 3) || [],
        kind: "pack_template",
        mobileNote: "Mobile can review the saved pack, download files, and record results. Precise template editing stays on desktop.",
        outputFormats,
        outputPack: overview.dailyDesk.outputPack || overview.dailyDesk.packReview?.outputPack,
        printFormats,
        protectedFacts: dedupeEditorProtectedFacts([
            ...templateProtectedFacts,
            ...collectEditorProtectedFacts({ overview }),
        ]).slice(0, 8),
        resultOptions: overview.dailyDesk.resultPrompt?.resultOptions || overview.dailyDesk.readyPack?.resultOptions,
        resultQuestion: template.payload.outputPackShape.resultQuestion || overview.dailyDesk.recipe.resultQuestion,
        subtitle: [
            "Saved pack base",
            displayLabel(template.summary.businessCategory),
            hasOutputIntent && intent ? `focus: ${intent.title}` : "",
            requiredFactSlots.length ? `${requiredFactSlots.length} inputs need review` : "ready for reuse",
        ].filter(Boolean).join(" · "),
        tasks: dedupeDailyDeskTasks([
            outputIntentTask,
            ...templateTasks,
            ...overview.dailyDesk.manualDeliveryTasks,
            ...overview.dailyDesk.assetReuseTasks,
            overview.dailyDesk.resultPrompt,
        ].filter(Boolean) as CampaignCueDailyDeskTask[]).slice(0, 6),
        title: hasOutputIntent && intent ? `${template.summary.title} · ${intent.title}` : template.summary.title,
        trustSummary,
    };
};

const buildBlankEditorContext = (overview: CampaignCueOverview): CampaignCueEditorContext => ({
    deliveryCards: [],
    kind: "blank",
    mobileNote: "Mobile review can confirm facts and downloads later. Build the editable layout on desktop first.",
    outputFormats: overview.dailyDesk.readyPack?.outputFormats || ["WhatsApp image", "Instagram square", "Story"],
    printFormats: overview.dailyDesk.readyPack?.printFormats || ["Poster PDF"],
    protectedFacts: collectEditorProtectedFacts({ overview }),
    resultOptions: overview.dailyDesk.resultPrompt?.resultOptions || overview.dailyDesk.readyPack?.resultOptions,
    resultQuestion: overview.dailyDesk.recipe.resultQuestion,
    subtitle: "Start with saved business facts. Design Cue can add contact, location, checks, and export guidance.",
    tasks: dedupeDailyDeskTasks([
        ...overview.dailyDesk.missingInputs,
        ...overview.dailyDesk.photoTasks,
        ...overview.dailyDesk.manualDeliveryTasks,
    ]).slice(0, 6),
    title: "New campaign asset",
    trustSummary: overview.dailyDesk.packReview?.trustSummary.slice(0, 4) || [],
});

const buildCueLayersEditorContext = (
    overview: CampaignCueOverview,
    boot: CampaignCueCueLayerBootPackage,
): CampaignCueEditorContext => ({
    cueLayerDesign: boot.design,
    deliveryCards: overview.dailyDesk.packReview?.deliveryCards || [],
    kind: "cue_layers",
    mobileNote: "Mobile can review the reused image and download exports. Dense layer editing stays on desktop.",
    outputFormats: ["Editable approximation", "PNG export", "Asset Library reuse"],
    outputPack: overview.dailyDesk.outputPack || overview.dailyDesk.packReview?.outputPack,
    printFormats: overview.dailyDesk.readyPack?.printFormats || ["Poster PDF", "Flyer PDF"],
    protectedFacts: collectEditorProtectedFacts({ overview }),
    resultOptions: overview.dailyDesk.resultPrompt?.resultOptions || overview.dailyDesk.readyPack?.resultOptions,
    resultQuestion: overview.dailyDesk.recipe.resultQuestion,
    subtitle: "Original preserved. Edit only what is safe, keep uncertain text as image, and export manually.",
    tasks: dedupeDailyDeskTasks([
        ...overview.dailyDesk.assetReuseTasks,
        ...overview.dailyDesk.manualDeliveryTasks,
        ...overview.dailyDesk.missingInputs,
    ]).slice(0, 6),
    title: boot.design.title,
    trustSummary: overview.dailyDesk.packReview?.trustSummary.slice(0, 4) || [],
});

const buildCampaignPackZipBlob = async (
    campaign: CampaignCueCampaign,
    dailyDesk?: CampaignCueOverview["dailyDesk"],
) => {
    const [{ default: JSZip }] = await Promise.all([import("jszip")]);
    const zip = new JSZip();
    const outputPack = outputPackForCampaign(campaign, dailyDesk);
    const rootFolder = outputPack?.downloadBundle.rootFolder
        || campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        || "campaigncue-pack";
    const writtenPaths = new Set<string>();
    const writeFile = (path: string, content: string) => {
        const safePath = path.replace(/^\/+/, "");
        if (writtenPaths.has(safePath)) return;
        writtenPaths.add(safePath);
        zip.file(`${rootFolder}/${safePath}`, content);
    };

    writeFile("campaign-pack-summary.md", buildCampaignPackExport(campaign, dailyDesk));
    if (outputPack) {
        writeFile("campaign-pack.json", JSON.stringify(outputPack, null, 2));
        outputPack.downloadBundle.files.forEach((file) => {
            writeFile(file.path, file.content);
        });
    } else {
        campaign.outputs.forEach((output) => {
            writeFile(`outputs/${output.channel}.txt`, output.text);
        });
    }

    const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });
    return {
        blob,
        filename: campaignPackZipFilename(campaign),
    };
};

const downloadCampaignPackZip = async (
    campaign: CampaignCueCampaign,
    dailyDesk?: CampaignCueOverview["dailyDesk"],
) => {
    const zip = await buildCampaignPackZipBlob(campaign, dailyDesk);
    downloadBlob(zip.filename, zip.blob);
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
        exportCount: action === "download" || action === "export"
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

const withFreshDailyDesk = (overview: CampaignCueOverview): CampaignCueOverview => ({
    ...overview,
    dailyDesk: buildCampaignCueDailyDesk({
        analytics: overview.analytics,
        assets: overview.assets,
        businessBrain: overview.businessBrain,
        campaigns: overview.campaigns,
        locations: overview.locations,
        opportunities: overview.opportunities,
        schedules: overview.schedules,
        sourceFacts: overview.sourceFacts,
        sourceInputs: overview.sourceInputs,
        workspace: overview.workspace,
    }),
});

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

function ManualDeliveryCard({
    card,
    onCopy,
}: {
    card: CampaignCueManualDeliveryCard;
    onCopy: (value: string) => void;
}) {
    return (
        <article className={styles.provider}>
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h3>{card.title}</h3>
                    <p>{card.ownerUseCase}</p>
                </div>
                <span className={styles.chip} data-tone={ownerStatusTone(card.status)}>
                    {ownerStatusLabel(card.status)}
                </span>
            </div>
            <div className={styles.detailStack}>
                {card.fields.map((field) => (
                    <div className={styles.handoffField} key={field.id}>
                        <div>
                            <span>{field.label}</span>
                            <strong>{field.value}</strong>
                        </div>
                        <span className={styles.chip} data-tone={ownerStatusTone(field.status)}>
                            {ownerStatusLabel(field.status)}
                        </span>
                        {field.copyable ? (
                            <button className={styles.ghostButton} onClick={() => onCopy(field.value)} type="button">
                                <LuClipboardCheck size={16} />
                                Copy
                            </button>
                        ) : null}
                    </div>
                ))}
            </div>
            {card.instructions.length ? (
                <div className={styles.noteBox}>
                    <strong>Use manually</strong>
                    <ol>
                        {card.instructions.map((step) => (
                            <li key={step}>{step}</li>
                        ))}
                    </ol>
                </div>
            ) : null}
        </article>
    );
}

function OutputPackSummary({
    busy,
    disabled,
    disabledReason,
    onDownload,
    outputPack,
}: {
    busy: boolean;
    disabled?: boolean;
    disabledReason?: string;
    onDownload: () => void;
    outputPack?: CampaignCueOutputPack;
}) {
    if (!outputPack) return null;
    const counts = outputPackStatusCounts(outputPack);
    const folders = Array.from(new Set(outputPack.downloadBundle.files.map((file) => file.path.split("/")[0]).filter(Boolean)));
    return (
        <article className={styles.provider}>
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h3>Campaign Pack Output</h3>
                    <p>One bundle with decision, copy, handoff fields, trust notes, reuse notes, and result memory.</p>
                </div>
                <span className={styles.chip} data-tone={ownerStatusTone(outputPack.trustReport.status)}>
                    {ownerStatusLabel(outputPack.trustReport.status)}
                </span>
            </div>
            <div className={styles.statusGrid}>
                <StatCard label="Ready files" value={counts.ready} />
                <StatCard label="Needs input" value={counts.needsInput} />
                <StatCard label="Needs review" value={counts.needsReview} />
                <StatCard label="Blocked" value={counts.blocked} />
            </div>
            <div className={styles.detailStack}>
                <div className={styles.noteBox}>
                    <strong>Folders included</strong>
                    <p>{folders.join(", ")}</p>
                </div>
                <div className={styles.noteBox}>
                    <strong>Mini-page and QR brief</strong>
                    <p>{outputPack.miniPage.manualNote}</p>
                    <span className={styles.chip} data-tone={ownerStatusTone(outputPack.miniPage.status)}>
                        {ownerStatusLabel(outputPack.miniPage.status)}
                    </span>
                </div>
                <div className={styles.noteBox}>
                    <strong>Campaign proof deck</strong>
                    <p>{outputPack.proofDeck.manualNote}</p>
                    <span className={styles.chip} data-tone={ownerStatusTone(outputPack.proofDeck.status)}>
                        {ownerStatusLabel(outputPack.proofDeck.status)}
                    </span>
                </div>
                <div className={styles.noteBox}>
                    <strong>Result memory</strong>
                    <p>{outputPack.resultMemory.question}</p>
                </div>
            </div>
            {disabled && disabledReason ? (
                <p className={styles.muted}>{disabledReason}</p>
            ) : null}
            <button className={styles.button} disabled={busy || disabled} onClick={onDownload} type="button">
                <LuDownload size={16} />
                Download campaign pack ZIP
            </button>
        </article>
    );
}

function DecisionEvidenceCard({ decision }: { decision: CampaignCueDecision }) {
    return (
        <article className={styles.campaign}>
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h3>{decision.recommendationTitle}</h3>
                    <p>{decision.explanation.whyThis[0]}</p>
                </div>
                <div className={styles.chips}>
                    <span className={styles.chip} data-tone={decisionTone(decision.confidence)}>
                        {decision.confidence} confidence
                    </span>
                    <span className={styles.chip} data-tone={decisionTone(decision.decisionStatus)}>
                        {decisionLabel(decision.decisionStatus)}
                    </span>
                    <span className={styles.chip}>{decision.score.finalScore}/100</span>
                </div>
            </div>
            <div className={styles.grid}>
                <div className={styles.noteBox}>
                    <strong>Why this</strong>
                    <ul>
                        {decision.explanation.whyThis.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div className={styles.noteBox}>
                    <strong>Why now</strong>
                    <ul>
                        {decision.explanation.whyNow.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </div>
                <div className={styles.noteBox}>
                    <strong>Trust preflight</strong>
                    {decision.trustPreflight.findings.length ? (
                        <ul>
                            {decision.trustPreflight.findings.slice(0, 4).map((item) => <li key={item}>{item}</li>)}
                        </ul>
                    ) : (
                        <p>No blocking preflight issue from current facts.</p>
                    )}
                </div>
                <div className={styles.noteBox}>
                    <strong>Pack outputs</strong>
                    <div className={styles.chips}>
                        {decision.recommendedOutputs.slice(0, 6).map((output) => (
                            <span className={styles.chip} key={output.outputType}>{displayLabel(output.outputType)}</span>
                        ))}
                    </div>
                </div>
            </div>
            {decision.missingInputs.length ? (
                <div className={styles.noteBox}>
                    <strong>Needs your input</strong>
                    <ul>
                        {decision.missingInputs.slice(0, 4).map((input) => (
                            <li key={`${input.type}:${input.ownerQuestion}`}>{input.ownerQuestion}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </article>
    );
}

export default function CampaignCueWorkspaceApp() {
    const dispatch = useAppDispatch();
    const { data: session } = useSession();
    const formatter = useFormatter();
    const tChrome = useTranslations("CampaignCue.Navigation");
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const isRTLDirection = useAppSelector(getRTLDirectionState);
    const [state, setState] = useState<ApiState>({ loading: true });
    const [tab, setTab] = useState<CampaignCueWorkspaceTabKey>("home");
    const [sidebarShellExpanded, setSidebarShellExpanded] = useState(false);
    const [busyKey, setBusyKey] = useState<string | null>(null);
    const [notice, setNotice] = useState<string>("");
    const [publicSiteHref, setPublicSiteHref] = useState("/");
    const [businessDraft, setBusinessDraft] = useState({
        agencyMode: false,
        avoidList: "",
        bookingUrl: "",
        brandFeel: "",
        businessType: "restaurant",
        inspirationNotes: "",
        locale: CAMPAIGNCUE_DEFAULT_LOCALE,
        locality: "",
        logoUrl: "",
        multiLocationMode: false,
        name: "",
        phone: "",
        primaryColor: CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
        productFocus: "",
        publicMenuUrl: "",
        targetAudience: "",
        timezone: CAMPAIGNCUE_DEFAULT_TIMEZONE,
        typographyNotes: "",
        visualMotifs: "",
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
    const cueLayerUploadInputRef = useRef<HTMLInputElement | null>(null);
    const cueLayerAutosaveTimeoutRef = useRef<number | null>(null);
    const cueLayerLastSavedFingerprintRef = useRef("");
    const [cueLayerDesigns, setCueLayerDesigns] = useState<CampaignCueCueLayerDesign[]>([]);
    const [activeCueLayerDesign, setActiveCueLayerDesign] = useState<CampaignCueCueLayerDesign | null>(null);
    const [activeCueLayerRevision, setActiveCueLayerRevision] = useState<number | null>(null);
    const [editorDraftDocument, setEditorDraftDocument] = useState<CreativeEditorDocument | null>(null);
    const [editorDocument, setEditorDocument] = useState<CreativeEditorDocument | null>(null);
    const [editorContext, setEditorContext] = useState<CampaignCueEditorContext | null>(null);
    const [editorSourceLabel, setEditorSourceLabel] = useState("Blank asset");
    const [outcomeDraft, setOutcomeDraft] = useState("Got replies, bookings, walk-ins, orders, or useful comments.");
    const [selectedOutcomeSignalId, setSelectedOutcomeSignalId] = useState<string | undefined>();
    const [packTemplateState, setPackTemplateState] = useState<PackTemplateState>({ loading: false });
    const data = state.data;
    const campaignCueThemeVars = useMemo(() => getCampaignCueThemeVars(token), [token]);
    const activeTabDefinition = useMemo(() => (
        CAMPAIGNCUE_WORKSPACE_TABS.find((item) => item.key === tab) || CAMPAIGNCUE_WORKSPACE_TABS[0]
    ), [tab]);
    const activeTabLabel = tChrome(`tabs.${activeTabDefinition.key}` as any);
    const sidebarOffset = isCollapsed && !sidebarShellExpanded
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : DASHBOARD_SIDEBAR_EXPANDED_WIDTH;
    const sessionUser = session?.user || {};
    const userLoginLabel = (sessionUser as any)?.displayEmail
        || (sessionUser as any)?.phone
        || (sessionUser as any)?.phoneUsername
        || (sessionUser as any)?.email
        || "CampaignCue account";
    const userData = {
        email: String((sessionUser as any)?.email || userLoginLabel || ""),
        image: String((sessionUser as any)?.image || ""),
        name: String((sessionUser as any)?.name || "CampaignCue owner"),
    };
    const userInitials = getUserInitials(userData.name, userLoginLabel);
    const campaignCueNavItems = useMemo<DashboardSidebarShellItem[]>(() => {
        const groups = CAMPAIGNCUE_WORKSPACE_TABS.reduce((groupMap, item) => {
            const items = groupMap.get(item.group) || [];
            items.push(item);
            groupMap.set(item.group, items);
            return groupMap;
        }, new Map<string, typeof CAMPAIGNCUE_WORKSPACE_TABS[number][]>());

        return Array.from(groups.entries()).map(([group, items]) => {
            const firstItem = items[0];
            const activeItem = items.find((item) => item.key === tab);
            return {
                active: false,
                expanded: Boolean(activeItem),
                icon: firstItem.icon,
                key: group,
                label: tChrome(`groups.${group}` as any),
                onClick: () => setTab((activeItem || firstItem).key),
                subNavActive: Boolean(activeItem),
                subNav: items.map((item) => ({
                    active: item.key === tab,
                    icon: item.icon,
                    key: item.key,
                    label: tChrome(`tabs.${item.key}` as any),
                    onClick: () => setTab(item.key),
                })),
            };
        });
    }, [tChrome, tab]);
    const campaignCueActionItems = useMemo<DashboardSidebarShellItem[]>(() => ([
        {
            icon: LuSettings2,
            key: "campaigncue-app-settings",
            label: tChrome("actions.appAppearance"),
            onClick: () => dispatch(toggleAppSettingsPanel(true)),
        },
        {
            icon: isDarkMode ? LuSun : LuMoon,
            key: "campaigncue-theme-mode",
            label: isDarkMode ? tChrome("actions.lightMode") : tChrome("actions.darkMode"),
            onClick: () => dispatch(toggleDarkMode(!isDarkMode)),
        },
        {
            icon: LuExternalLink,
            key: "campaigncue-public-site",
            label: tChrome("actions.publicSite"),
            onClick: () => {
                if (typeof window !== "undefined") window.location.href = publicSiteHref;
            },
        },
    ]), [dispatch, isDarkMode, publicSiteHref, tChrome]);

    const load = async () => {
        setState((current) => ({ ...current, loading: true, error: undefined }));
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.WORKSPACE, {
                cache: "no-store",
                credentials: "include",
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "workspace_load",
                isCampaignCueOverviewData,
            );
            if (!payload.ok) {
                setState({
                    code: payload.code,
                    loading: false,
                    error: "CampaignCue is unavailable.",
                    status: payload.status,
                });
                return;
            }
            setState({ data: withFreshDailyDesk(payload.data), loading: false });
        } catch {
            setState({ loading: false, error: "Network error while opening CampaignCue." });
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const loadPackTemplates = async (overview: CampaignCueOverview | undefined = data) => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY || !overview) return;
        setPackTemplateState((current) => ({ ...current, error: undefined, loading: true }));
        try {
            const catalog = await listCampaignCuePackTemplates({
                businessCategory: (overview.businessBrain as CampaignCueOverview["businessBrain"] & { businessCategory?: string }).businessCategory,
                businessType: overview.businessBrain.businessType,
                includeWorkspaceTemplates: true,
                workspaceId: overview.workspace.workspaceId,
            });
            setPackTemplateState({ catalog, loading: false });
        } catch (error) {
            setPackTemplateState((current) => ({
                ...current,
                error: getCampaignCueWorkspaceFailureNotice(error, "Templates could not be loaded."),
                loading: false,
            }));
        }
    };

    useEffect(() => {
        if (!data || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY) return;
        void loadPackTemplates(data);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        data?.workspace.workspaceId,
        data?.businessBrain.businessType,
        (data?.businessBrain as (CampaignCueOverview["businessBrain"] & { businessCategory?: string }) | undefined)?.businessCategory,
    ]);

    useEffect(() => {
        if (!data || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS) return;
        void loadCueLayerDesigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data?.workspace.workspaceId]);

    useEffect(() => {
        if (!activeCueLayerDesign || !editorDraftDocument || activeCueLayerRevision == null) return;
        const fingerprint = fingerprintDocument(editorDraftDocument);
        if (!fingerprint || fingerprint === cueLayerLastSavedFingerprintRef.current) return;
        if (cueLayerAutosaveTimeoutRef.current) window.clearTimeout(cueLayerAutosaveTimeoutRef.current);
        cueLayerAutosaveTimeoutRef.current = window.setTimeout(() => {
            void saveCueLayerDocumentNow(editorDraftDocument).catch((error) => {
                setNotice(getCampaignCueWorkspaceFailureNotice(error, "Reusable image autosave failed."));
            });
        }, 1800);
        return () => {
            if (cueLayerAutosaveTimeoutRef.current) {
                window.clearTimeout(cueLayerAutosaveTimeoutRef.current);
                cueLayerAutosaveTimeoutRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeCueLayerDesign?.id, activeCueLayerRevision, editorDraftDocument]);

    useEffect(() => {
        const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        setPublicSiteHref(isLocal ? CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX : "/");
    }, []);

    const updateOverview = (updater: (current: CampaignCueOverview) => CampaignCueOverview) => {
        setState((current) => (
            current.data
                ? { ...current, data: withFreshDailyDesk(updater(current.data)), loading: false }
                : current
        ));
    };

    const loadCueLayerDesigns = async () => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS) return;
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_DESIGNS, {
                cache: "no-store",
                credentials: "include",
            });
            const payload = await readCampaignCueWorkspaceData<CampaignCueCueLayerDesign[]>(
                res,
                "cue_layers_designs_load",
                (value): value is CampaignCueCueLayerDesign[] => Array.isArray(value),
            );
            if (payload.ok) setCueLayerDesigns(payload.data);
        } catch {
            setCueLayerDesigns([]);
        }
    };

    const openCueLayerBootPackage = (boot: CampaignCueCueLayerBootPackage) => {
        setActiveCueLayerDesign(boot.design);
        setActiveCueLayerRevision(boot.design.current.revision);
        setEditorDocument(boot.document);
        setEditorDraftDocument(boot.document);
        cueLayerLastSavedFingerprintRef.current = fingerprintDocument(boot.document);
        setEditorSourceLabel(`CueLayers · ${boot.design.title}`);
        if (data) setEditorContext(buildCueLayersEditorContext(data, boot));
        setTab("editor");
    };

    const openCueLayerDesign = async (designId: string) => {
        setBusyKey(`cue-layer-open:${designId}`);
        setNotice("");
        try {
            const res = await fetch(getCampaignCueCueLayersBootApiPath(designId), {
                cache: "no-store",
                credentials: "include",
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "cue_layers_boot_load",
                isCueLayerBootPackageData,
            );
            if (!payload.ok) {
                setNotice("Reusable image could not open.");
                return;
            }
            openCueLayerBootPackage(payload.data);
        } finally {
            setBusyKey(null);
        }
    };

    const saveCueLayerDocumentNow = async (documentValue: CreativeEditorDocument) => {
        if (!activeCueLayerDesign || activeCueLayerRevision == null) return activeCueLayerRevision;
        if (cueLayerAutosaveTimeoutRef.current) {
            window.clearTimeout(cueLayerAutosaveTimeoutRef.current);
            cueLayerAutosaveTimeoutRef.current = null;
        }
        const fingerprint = fingerprintDocument(documentValue);
        if (fingerprint === cueLayerLastSavedFingerprintRef.current) return activeCueLayerRevision;
        const res = await fetch(getCampaignCueCueLayersAutosaveApiPath(activeCueLayerDesign.id), {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                document: documentValue,
                expectedRevision: activeCueLayerRevision,
                idempotencyKey: buildIdempotencyKey("cue_layers_save"),
            }),
        });
        const payload = await readCampaignCueWorkspaceData(
            res,
            "cue_layers_autosave",
            isCueLayerAutosaveData,
        );
        if (!payload.ok) {
            throw new Error("Reusable image could not be saved.");
        }
        const revision = Number(payload.data.revision || activeCueLayerRevision);
        const design = payload.data.design;
        if (design?.id) {
            setActiveCueLayerDesign(design);
            setCueLayerDesigns((current) => replaceBounded(current, design, CAMPAIGNCUE_PAGE_SIZE));
        }
        setActiveCueLayerRevision(revision);
        cueLayerLastSavedFingerprintRef.current = fingerprint;
        return revision;
    };

    const uploadCueLayerFile = async (file: File) => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setNotice("Use a PNG, JPEG, or WebP image.");
            return;
        }
        if (file.size > CAMPAIGNCUE_CUE_LAYERS.MAX_UPLOAD_BYTES) {
            setNotice(`Use an image under ${formatMegabytes(CAMPAIGNCUE_CUE_LAYERS.MAX_UPLOAD_BYTES)}.`);
            return;
        }
        setBusyKey("cue-layer-upload");
        setNotice("");
        try {
            const dataUrl = await fileToDataUrl(file);
            const dimensions = await readImageDimensions(dataUrl);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_UPLOADS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataUrl,
                    fileName: file.name,
                    height: dimensions.height,
                    idempotencyKey: buildIdempotencyKey("cue_layers_upload"),
                    mimeType: file.type,
                    sourceKind: "user_upload",
                    title: `${file.name.replace(/\.[a-z0-9]+$/i, "")} reusable edit`,
                    width: dimensions.width,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "cue_layers_upload",
                isCueLayerUploadResultData,
            );
            if (!payload.ok) {
                setNotice("Image could not be prepared for reuse.");
                return;
            }
            setCueLayerDesigns((current) => prependBounded(current, payload.data.design, CAMPAIGNCUE_PAGE_SIZE));
            openCueLayerBootPackage(payload.data.boot);
            setNotice("Reusable image ready. Original preserved.");
        } finally {
            setBusyKey(null);
        }
    };

    const repairCueLayerFallback = async () => {
        if (!activeCueLayerDesign || activeCueLayerRevision == null) return;
        setBusyKey("cue-layer-repair");
        setNotice("");
        try {
            const res = await fetch(getCampaignCueCueLayersRepairApiPath(activeCueLayerDesign.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correctionType: "restore_fallback",
                    expectedRevision: activeCueLayerRevision,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(res, "cue_layers_repair", isRecordData);
            setNotice(payload.ok ? "Original fallback is available." : "Fallback could not be prepared.");
        } finally {
            setBusyKey(null);
        }
    };

    const onCueLayerUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) await uploadCueLayerFile(file);
    };

    useEffect(() => {
        if (!data) return;
        const playbook = data.businessBrain.brandKit.playbook;
        setBusinessDraft({
            agencyMode: data.workspace.agencyMode,
            avoidList: playbook.avoidList.join(", "),
            bookingUrl: data.businessBrain.contacts.bookingUrl || "",
            brandFeel: playbook.brandFeel.join(", "),
            businessType: data.businessBrain.businessType,
            inspirationNotes: playbook.inspirationNotes.join(", "),
            locale: data.workspace.settings.locale || data.businessBrain.locale || CAMPAIGNCUE_DEFAULT_LOCALE,
            locality: data.businessBrain.locality || "",
            logoUrl: data.businessBrain.brandKit.logoUrl || "",
            multiLocationMode: data.workspace.multiLocationMode,
            name: data.businessBrain.name,
            phone: data.businessBrain.contacts.phone || "",
            primaryColor: data.businessBrain.brandKit.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
            productFocus: playbook.productFocus.join(", "),
            publicMenuUrl: data.businessBrain.contacts.publicMenuUrl || "",
            targetAudience: playbook.targetAudience || "",
            timezone: data.workspace.settings.timezone || data.businessBrain.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE,
            typographyNotes: playbook.typographyNotes || "",
            visualMotifs: playbook.visualMotifs.join(", "),
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

    const campaignCreationBlockedReason = (opportunityId?: string) => {
        const decisions = data?.dailyDesk.candidateDecisions || [];
        const decision = opportunityId
            ? decisions.find((item) => item.opportunityId === opportunityId)
            : data?.dailyDesk.decision;
        if (!decision || decision.decisionStatus === "ready_to_prepare") return "";
        const firstMissingInput = decision.missingInputs.find((input) => input.required) || decision.missingInputs[0];
        if (firstMissingInput?.ownerQuestion) return firstMissingInput.ownerQuestion;
        if (decision.decisionStatus === "blocked") return "Review blocked campaign risk before creating this pack.";
        return "Confirm required campaign details before creating this pack.";
    };

    const createCampaign = async (
        opportunityId?: string,
        templateDraft?: {
            brief: string;
            channels: CampaignCueChannel[];
            templateId: string;
            title: string;
        },
    ) => {
        const blockedReason = campaignCreationBlockedReason(opportunityId);
        if (blockedReason) {
            setNotice(blockedReason);
            setTab((data?.dailyDesk.summary.targetTab as CampaignCueWorkspaceTabKey | undefined) || "sources");
            return;
        }
        setBusyKey(templateDraft ? `cue-template:${templateDraft.templateId}` : `cue:${opportunityId || "default"}`);
        setNotice("");
        try {
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CAMPAIGNS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    brief: templateDraft?.brief,
                    channels: templateDraft?.channels,
                    opportunityId,
                    title: templateDraft?.title,
                    idempotencyKey: buildIdempotencyKey("create"),
                }),
            });
            const payload = await readCampaignCueWorkspaceData<{
                campaign?: CampaignCueCampaign;
                replayed?: boolean;
            }>(
                res,
                "campaign_create",
                isRecordData,
            );
            if (!payload.ok) {
                setNotice("Campaign pack could not be created.");
                return;
            }
            setNotice(templateDraft ? "Campaign pack created from reusable base." : "Campaign pack created.");
            setTab("campaigns");
            if (payload.data.campaign) {
                updateOverview((current) => ({
                    ...current,
                    analytics: payload.data.replayed ? current.analytics : bumpAnalytics(current, "campaign_created"),
                    campaigns: prependBounded(current.campaigns, payload.data.campaign as CampaignCueCampaign, CAMPAIGNCUE_PAGE_SIZE),
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
            const payload = await readCampaignCueWorkspaceData<Partial<CampaignCueOverview>>(
                res,
                "business_details_save",
                isRecordData,
            );
            if (!payload.ok) {
                setNotice("Business details could not be saved.");
                return;
            }
            setNotice("Business details saved.");
            const result = payload.data;
            if (result?.businessBrain && result?.workspace) {
                updateOverview((current) => ({
                    ...current,
                    businessBrain: result.businessBrain as CampaignCueOverview["businessBrain"],
                    opportunities: result.opportunities || current.opportunities,
                    sourceFacts: result.sourceFacts || current.sourceFacts,
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
                    expiresAt: parseDateTimeLocal(sourceDraft.expiresAt, businessDraft.timezone) || undefined,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "source_input_create",
                (value): value is CampaignCueSourceInput => isRecord(value) && typeof value.id === "string",
            );
            if (!payload.ok) {
                setNotice("Source input could not be saved.");
                return;
            }
            setSourceDraft({ expiresAt: "", label: "", sourceType: "manual_note", status: "needs_review", value: "" });
            setNotice("Source input saved.");
            const sourceInput = payload.data;
            if (sourceInput.id) {
                updateOverview((current) => ({
                    ...current,
                    sourceFacts: [
                        ...(sourceInput.facts || []),
                        ...current.sourceFacts.filter((fact) => !(sourceInput.facts || []).some((nextFact) => nextFact.id === fact.id)),
                    ],
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
            const payload = await readCampaignCueWorkspaceData(
                res,
                "location_create",
                (value): value is CampaignCueLocation => isRecord(value) && typeof value.id === "string",
            );
            if (!payload.ok) {
                setNotice("Location could not be saved.");
                return;
            }
            setLocationDraft({ locality: "", name: "", status: "draft" });
            setNotice("Location saved.");
            const location = payload.data;
            if (location.id) {
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
        noteOverride?: string,
        resultSignalId?: string,
    ) => {
        const key = `${campaign.id}:${action}:${output?.id || "campaign"}`;
        setBusyKey(key);
        setNotice("");
        try {
            const exportZip = action === "export"
                ? await buildCampaignPackZipBlob(campaign, data?.dailyDesk)
                : null;
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
                            ? noteOverride ?? outcomeDraft
                            : undefined,
                    resultSignalId: action === "record_outcome"
                        ? resultSignalId || selectedOutcomeSignalId
                        : undefined,
                    idempotencyKey: buildIdempotencyKey(action),
                }),
            });
            const payload = await readCampaignCueWorkspaceData<{
                campaign?: CampaignCueCampaign | null;
                replayed?: boolean;
                schedule?: CampaignCueOverview["schedules"][number] | null;
            }>(
                res,
                "campaign_action_record",
                isRecordData,
            );
            if (!payload.ok) {
                setNotice("Action could not be recorded.");
                return;
            }
            if (action === "download" && output) {
                downloadText(outputFilename(campaign, output), output.text);
                setNotice("Downloaded and recorded.");
            } else if (action === "export") {
                if (exportZip) {
                    downloadBlob(exportZip.filename, exportZip.blob);
                }
                setNotice("Campaign pack ZIP downloaded and recorded.");
            } else if (action === "record_outcome") {
                setNotice("Result recorded.");
            } else {
                setNotice("Action recorded.");
            }
            if (payload.data.campaign) {
                updateOverview((current) => ({
                    ...current,
                    analytics: payload.data.replayed ? current.analytics : bumpAnalytics(current, action),
                    campaigns: replaceBounded(current.campaigns, payload.data.campaign as CampaignCueCampaign, CAMPAIGNCUE_PAGE_SIZE),
                    schedules: payload.data.schedule
                        ? prependBounded(current.schedules, payload.data.schedule, CAMPAIGNCUE_PAGE_SIZE)
                        : current.schedules,
                }));
            }
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Action could not be completed."));
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
            const payload = await readCampaignCueWorkspaceData(
                res,
                "asset_register",
                (value): value is CampaignCueAsset => isRecord(value) && typeof value.id === "string",
            );
            if (!payload.ok) {
                setNotice("Asset could not be registered.");
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
            const asset = payload.data;
            if (asset.id) {
                updateOverview((current) => ({
                    ...current,
                    assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const downloadAsset = async (asset: CampaignCueAsset) => {
        if (!asset.file?.downloadUrl && !asset.file?.storagePath) {
            setNotice("This asset does not have a downloadable file yet.");
            return;
        }
        setBusyKey(`asset-download:${asset.id}`);
        setNotice("");
        try {
            const res = await fetch(getCampaignCueAssetDownloadApiPath(asset.id), {
                cache: "no-store",
                credentials: "include",
            });
            const payload = await readCampaignCueWorkspaceData(res, "asset_download", isAssetDownloadData);
            if (!payload.ok) {
                setNotice("Asset download is unavailable.");
                return;
            }
            const url = payload.data.url;
            if (typeof url !== "string" || !url) {
                setNotice("Asset download is unavailable.");
                return;
            }
            openDownloadUrl(url, `${asset.name || "campaigncue-asset"}`);
            setNotice("Asset download opened.");
        } finally {
            setBusyKey(null);
        }
    };

    const creativeEditorEnabled = FEATURE_FLAGS.ENABLE_SHARED_CREATIVE_EDITOR
        && FEATURE_FLAGS.ENABLE_SHARED_CREATIVE_EDITOR_INTERACTIVE_CANVAS
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CREATIVE_EDITOR;
    const creativeEditorAiToolsEnabled = creativeEditorEnabled
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EDITOR_AI_TOOLS;
    const creativeEditorDesignCueEnabled = creativeEditorEnabled
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_DESIGN_CUE;
    const cueLayersUploadEnabled = creativeEditorEnabled
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD;

    const saveCurrentCampaignPackTemplate = async () => {
        if (!data || !latestCampaign) {
            setNotice("Create or open a campaign pack before saving it as a reusable base.");
            return;
        }
        setBusyKey("pack-template-save");
        setNotice("");
        try {
            const outputPack = outputPackForCampaign(latestCampaign, data.dailyDesk);
            const reusableEditorDocument = editorDocument && editorContext?.kind !== "cue_layers"
                ? editorDocument
                : undefined;
            const input = buildCampaignCueWorkspaceTemplateSaveInput({
                businessBrain: data.businessBrain,
                campaign: latestCampaign,
                editorDocument: reusableEditorDocument,
                outputPack,
                workspaceId: data.workspace.workspaceId,
            });
            await saveCampaignCueWorkspacePackTemplate(input);
            setNotice(reusableEditorDocument
                ? "Reusable campaign pack and editor layout saved."
                : "Reusable campaign pack saved.");
            await loadPackTemplates(data);
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Reusable campaign pack could not be saved."));
        } finally {
            setBusyKey(null);
        }
    };

    const channelsForOutputIntent = (
        intent: CampaignCueOutputPickerItem | undefined,
        fallbackChannels: CampaignCueChannel[],
    ) => {
        if (!intent?.channels.length || intent.id === "recommended_pack") return fallbackChannels;
        const matchingTemplateChannels = intent.channels.filter((channel) => fallbackChannels.includes(channel));
        return matchingTemplateChannels.length ? matchingTemplateChannels : intent.channels;
    };

    const createCampaignFromOutputIntent = (intent: CampaignCueOutputPickerItem) => {
        if (intent.id === "custom_size") {
            openBlankCreativeEditor();
            return;
        }
        void createCampaign(undefined, {
            brief: `${intent.title}: ${intent.description}`,
            channels: intent.channels.length ? intent.channels : data?.dailyDesk.recipe.recommendedChannels || ["creative"],
            templateId: `output-intent-${intent.id}`,
            title: intent.title,
        });
    };

    const openCampaignCuePackTemplate = async (
        template: CampaignCuePackTemplateSummary,
        intent?: CampaignCueOutputPickerItem,
    ) => {
        if (!data) return;
        setBusyKey(`pack-template-open:${template.templateId}`);
        setNotice("");
        try {
            const hydrated = await getCampaignCuePackTemplate(template);
            setNotice(summarizeCampaignCuePackTemplateApplication(hydrated));
            if (hydrated.editorDocument && creativeEditorEnabled) {
                setActiveCueLayerDesign(null);
                setActiveCueLayerRevision(null);
                setEditorDraftDocument(null);
                cueLayerLastSavedFingerprintRef.current = "";
                setEditorDocument(hydrated.editorDocument);
                setEditorContext(buildPackTemplateEditorContext(data, hydrated, intent));
                setEditorSourceLabel(`Template · ${template.title}`);
                setTab("editor");
                return;
            }
            const requiredMissingInputCount = hydrated.payload.factSlots.filter((slot) => slot.required).length;
            if (requiredMissingInputCount) {
                setTab("sources");
                return;
            }
            await createCampaign(undefined, {
                brief: intent && intent.id !== "recommended_pack"
                    ? `${template.description} Focus this pack on ${intent.title.toLowerCase()}.`
                    : template.description,
                channels: channelsForOutputIntent(intent, template.channels),
                templateId: template.templateId,
                title: intent && intent.id !== "recommended_pack"
                    ? `${template.title} · ${intent.title}`
                    : template.title,
            });
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Campaign pack template could not be opened."));
        } finally {
            setBusyKey(null);
        }
    };

    const runCreativeEditorAiTool: CreativeEditorAiToolHandler = async (request) => (
        runCampaignCueCreativeEditorAiTool({
            actionId: request.actionId,
            document: request.document,
            overview: data,
            selectedElement: request.selectedElement,
            selectedText: request.selectedText,
        })
    );

    const runDesignCueRequest: CreativeEditorDesignCueHandler = async (request) => (
        runCampaignCueDesignCue({
            ...request,
            overview: data,
        })
    );

    const applyDesignCueRequest: CreativeEditorDesignCueApplyHandler = async (request) => (
        applyCampaignCueDesignCuePatchSet(request)
    );

    const openBlankCreativeEditor = () => {
        if (!data || !creativeEditorEnabled) return;
        setActiveCueLayerDesign(null);
        setActiveCueLayerRevision(null);
        setEditorDraftDocument(null);
        cueLayerLastSavedFingerprintRef.current = "";
        setEditorDocument(buildCampaignCueBlankCreativeDocument({
            businessBrain: data.businessBrain,
            workspace: data.workspace,
        }));
        setEditorContext(buildBlankEditorContext(data));
        setEditorSourceLabel("Blank CampaignCue asset");
        setTab("editor");
    };

    const openOutputCreativeEditor = (campaign: CampaignCueCampaign, output: CampaignCueOutput) => {
        if (!data || !creativeEditorEnabled) return;
        setActiveCueLayerDesign(null);
        setActiveCueLayerRevision(null);
        setEditorDraftDocument(null);
        cueLayerLastSavedFingerprintRef.current = "";
        setEditorDocument(buildCampaignCueOutputCreativeDocument({
            businessBrain: data.businessBrain,
            campaign,
            output,
            workspace: data.workspace,
        }));
        setEditorContext(buildCampaignOutputEditorContext(data, campaign, output));
        setEditorSourceLabel(`${campaign.title} · ${displayLabel(output.channel)}`);
        setTab("editor");
    };

    const registerEditorExport = async (result: CreativeEditorExportResult) => {
        if (!data || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_RENDERED_ASSET_EXPORTS) return;
        setBusyKey("editor-export");
        setNotice("");
        try {
            if (activeCueLayerDesign && activeCueLayerRevision != null) {
                if (result.format === "svg") {
                    setNotice("Use PNG export for reused images.");
                    return;
                }
                const savedRevision = await saveCueLayerDocumentNow(result.document);
                const res = await fetch(getCampaignCueCueLayersExportApiPath(activeCueLayerDesign.id), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        document: result.document,
                        format: result.format === "json" ? "json" : result.format,
                        idempotencyKey: buildIdempotencyKey("cue_layers_export"),
                        mimeType: result.mimeType,
                        renderedDataUrl: result.dataUrl,
                        sizeBytes: result.sizeBytes,
                        sourceRevision: savedRevision ?? activeCueLayerRevision,
                    }),
                });
                const payload = await readCampaignCueWorkspaceData<{
                    asset?: CampaignCueAsset;
                }>(
                    res,
                    "cue_layers_export",
                    isRecordData,
                );
                if (!payload.ok) {
                    setNotice("Reusable export could not be saved.");
                    return;
                }
                const asset = payload.data.asset;
                if (asset?.id) {
                    updateOverview((current) => ({
                        ...current,
                        assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
                    }));
                }
                setNotice("Reusable export saved in Asset Library.");
                return;
            }
            const metadata = result.document.metadata || {};
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: result.document.title,
                    assetType: "export",
                    source: "generated",
                    rightsStatus: "needs_review",
                    rightsNote: "Created in the shared creative editor. Review image rights before public use.",
                    consentType: "not_applicable",
                    tags: [
                        "creative-editor",
                        result.format,
                        metadata.channel,
                    ].filter(Boolean),
                    mimeType: result.mimeType,
                    sizeBytes: result.sizeBytes,
                    campaignId: metadata.campaignId,
                    outputId: metadata.outputId,
                    channel: metadata.channel,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "creative_asset_save",
                (value): value is CampaignCueAsset => isRecord(value) && typeof value.id === "string",
            );
            if (!payload.ok) {
                setNotice("Creative asset could not be saved.");
                return;
            }
            const asset = payload.data;
            if (asset.id) {
                updateOverview((current) => ({
                    ...current,
                    assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
                }));
            }
            setNotice("Creative asset saved in Asset Library.");
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
                        <p>{rows.length ? `${rows.length} output${rows.length === 1 ? "" : "s"} ready to download.` : copy?.empty}</p>
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
                                <button
                                    className={styles.ghostButton}
                                    disabled={campaignBlocksPublicUse(campaign)}
                                    onClick={() => recordAction(campaign, "download", output)}
                                    title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                    type="button"
                                >
                                    <LuDownload size={16} />
                                    Download
                                </button>
                                {creativeEditorEnabled ? (
                                    <button className={styles.ghostButton} onClick={() => openOutputCreativeEditor(campaign, output)} type="button">
                                        <LuImage size={16} />
                                        Open editor
                                    </button>
                                ) : null}
                                <button
                                    className={styles.ghostButton}
                                    disabled={campaignBlocksPublicUse(campaign)}
                                    onClick={() => recordAction(campaign, "schedule", output)}
                                    title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                    type="button"
                                >
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
    const dailyDesk = data.dailyDesk;
    const dailyDeskCampaign = dailyDesk.readyPack
        ? data.campaigns.find((campaign) => campaign.id === dailyDesk.readyPack?.campaignId)
        : latestCampaign;
    const dailyDeskTasks = [
        ...dailyDesk.missingInputs,
        dailyDesk.resultPrompt,
        dailyDesk.approvalPrompt,
        dailyDesk.locationPrompt,
    ].filter(Boolean) as NonNullable<typeof dailyDesk.resultPrompt>[];
    const primaryCreateOpportunityId = dailyDesk.primaryOpportunity?.id || firstOpportunity?.id;
    const primaryCreateBlockedReason = campaignCreationBlockedReason(primaryCreateOpportunityId);
    const openDeskTarget = (target: CampaignCueWorkspaceTabKey) => setTab(target);
    const copyHandoffValue = async (value: string) => {
        try {
            await copyCampaignCueHandoffValueToClipboard(value);
            setNotice("Copied.");
        } catch (error) {
            logRuntimeFailure("campaigncue_handoff_copy_failed", error, {
                hasClipboardWrite: hasCampaignCueHandoffClipboardWrite(),
                hasCopyFallback: hasCampaignCueHandoffCopyFallback(),
                surface: "campaigncue_workspace",
                valueLength: value.length,
            });
            setNotice(hasCampaignCueHandoffClipboardWrite() ? "Copy failed." : "Copy is unavailable in this browser.");
        }
    };
    const runDailyDeskPrimaryAction = () => {
        if (dailyDesk.summary.actionKind === "campaign_pack" && !dailyDesk.readyPack) {
            void createCampaign(primaryCreateOpportunityId);
            return;
        }
        openDeskTarget(dailyDesk.summary.targetTab as CampaignCueWorkspaceTabKey);
    };
    const editorPublicUseBlocked = Boolean(editorContext?.campaign && campaignBlocksPublicUse(editorContext.campaign));
    const editorHeaderActions = editorContext?.campaign ? [
        {
            disabled: editorPublicUseBlocked,
            icon: <LuSend size={16} />,
            id: "campaigncue-use-campaign",
            label: "Use this campaign",
            onClick: () => openDeskTarget("delivery"),
            tone: "primary" as const,
        },
        {
            disabled: editorPublicUseBlocked || busyKey === "campaign-pack-zip",
            icon: <LuDownload size={16} />,
            id: "campaigncue-download-pack",
            label: "Download pack",
            loading: busyKey === "campaign-pack-zip",
            onClick: async () => {
                if (!editorContext.campaign) return;
                setBusyKey("campaign-pack-zip");
                try {
                    await downloadCampaignPackZip(editorContext.campaign, data.dailyDesk);
                    await recordAction(editorContext.campaign, "export");
                } finally {
                    setBusyKey(null);
                }
            },
            tone: "accent" as const,
        },
        {
            icon: <LuClipboardCheck size={16} />,
            id: "campaigncue-record-result",
            label: "Record result",
            onClick: () => openDeskTarget("analytics"),
            tone: "default" as const,
        },
    ] : editorContext ? [
        {
            icon: <LuShieldCheck size={16} />,
            id: "campaigncue-check-facts",
            label: "Check facts",
            onClick: () => openDeskTarget("trust"),
            tone: "default" as const,
        },
        {
            disabled: !cueLayersUploadEnabled,
            icon: <LuUploadCloud size={16} />,
            id: "campaigncue-reuse-image",
            label: "Reuse old image",
            onClick: () => cueLayerUploadInputRef.current?.click(),
            tone: "default" as const,
        },
    ] : [];
    const renderEditorOwnerPanel = () => {
        if (!editorContext) return null;
        const outputChips = [
            ...editorContext.outputFormats,
            ...editorContext.printFormats,
        ].filter(Boolean).slice(0, 10);
        const resultOptions = editorContext.resultOptions || [];
        return (
            <aside className={styles.editorOwnerPanel} aria-label="CampaignCue editor context">
                <div className={styles.editorPanelHeader}>
                    <span className={styles.eyebrow}>
                        {editorContext.kind === "cue_layers" ? "Reuse old asset" : "Campaign Pack Editor Mode"}
                    </span>
                    <h3>{editorContext.title}</h3>
                    <p>{editorContext.subtitle}</p>
                    <div className={styles.chips}>
                        {editorContext.output ? (
                            <span className={styles.chip} data-tone={trustTone(editorContext.output.trustGate)}>
                                {displayLabel(editorContext.output.trustGate)}
                            </span>
                        ) : null}
                        {editorContext.outputPack ? (
                            <span className={styles.chip} data-tone={ownerStatusTone(editorContext.outputPack.trustReport.status)}>
                                {ownerStatusLabel(editorContext.outputPack.trustReport.status)}
                            </span>
                        ) : null}
                        {editorContext.cueLayerDesign ? (
                            <span className={styles.chip} data-tone={cueLayerDesignTone(editorContext.cueLayerDesign.status)}>
                                Original preserved
                            </span>
                        ) : null}
                    </div>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuClipboardCheck size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Safe tasks</h3>
                            <p>Use these before detailed layer edits.</p>
                        </div>
                    </div>
                    <div className={styles.editorTaskList}>
                        {editorContext.tasks.length ? editorContext.tasks.slice(0, 4).map((task) => (
                            <button
                                className={styles.editorTaskButton}
                                key={task.id}
                                onClick={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                type="button"
                            >
                                <span>{task.label}</span>
                                <small>{task.actionLabel}</small>
                            </button>
                        )) : (
                            <p className={styles.muted}>No blocking input for this editor session.</p>
                        )}
                    </div>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuShieldCheck size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Protected business text</h3>
                            <p>Design Cue uses saved facts only.</p>
                        </div>
                    </div>
                    <div className={styles.protectedFactList}>
                        {editorContext.protectedFacts.slice(0, 6).map((fact) => (
                            <div className={styles.protectedFact} key={fact.id}>
                                <span>{fact.label}</span>
                                <strong>{fact.value}</strong>
                                <em data-tone={ownerStatusTone(fact.status)}>{ownerStatusLabel(fact.status)}</em>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuPackageCheck size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>One design, many outputs</h3>
                            <p>Prepare the asset once, then use the pack handoff.</p>
                        </div>
                    </div>
                    <div className={styles.chips}>
                        {outputChips.length ? outputChips.map((format) => (
                            <span className={styles.chip} key={format}>{format}</span>
                        )) : <span className={styles.chip}>Manual export</span>}
                    </div>
                    <button className={styles.ghostButton} onClick={() => openDeskTarget("delivery")} type="button">
                        <LuSend size={16} />
                        Use this campaign
                    </button>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuShieldCheck size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Trust check</h3>
                            <p>Ready, review, or blocked before public use.</p>
                        </div>
                    </div>
                    {editorContext.trustSummary.length ? (
                        <div className={styles.editorTrustList}>
                            {editorContext.trustSummary.slice(0, 4).map((item) => (
                                <div className={styles.editorTrustItem} key={item.id}>
                                    <span>{item.label}</span>
                                    <strong data-tone={ownerStatusTone(item.status)}>{ownerStatusLabel(item.status)}</strong>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.muted}>Run Check facts or open Trust Center before sharing.</p>
                    )}
                    <button className={styles.ghostButton} onClick={() => openDeskTarget("trust")} type="button">
                        <LuShieldCheck size={16} />
                        Open Trust Center
                    </button>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuSend size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Manual delivery</h3>
                            <p>No direct posting. Copy fields and download files.</p>
                        </div>
                    </div>
                    {editorContext.deliveryCards.length ? (
                        <div className={styles.editorTrustList}>
                            {editorContext.deliveryCards.slice(0, 3).map((card) => (
                                <div className={styles.editorTrustItem} key={card.id}>
                                    <span>{card.title}</span>
                                    <strong data-tone={ownerStatusTone(card.status)}>{ownerStatusLabel(card.status)}</strong>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className={styles.muted}>Open delivery cards after the pack is ready.</p>
                    )}
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuRefreshCw size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Result memory</h3>
                            <p>{editorContext.resultQuestion}</p>
                        </div>
                    </div>
                    <div className={styles.chips}>
                        {resultOptions.slice(0, 3).map((option) => (
                            <span className={styles.chip} key={option.id}>{option.label}</span>
                        ))}
                    </div>
                    <button className={styles.ghostButton} onClick={() => openDeskTarget("analytics")} type="button">
                        <LuClipboardCheck size={16} />
                        Record result later
                    </button>
                </div>

                <div className={styles.editorPanelBlock}>
                    <div className={styles.rowStart}>
                        <div className={styles.iconBox}><LuCamera size={18} /></div>
                        <div className={styles.titleBlock}>
                            <h3>Mobile review</h3>
                            <p>{editorContext.mobileNote}</p>
                        </div>
                    </div>
                </div>
            </aside>
        );
    };

    return (
        <main className={styles.shell} style={campaignCueThemeVars}>
            {cueLayersUploadEnabled ? (
                <input
                    ref={cueLayerUploadInputRef}
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={onCueLayerUploadChange}
                    type="file"
                />
            ) : null}
            <div className={styles.dashboardFrame} dir={isRTLDirection ? "rtl" : "ltr"}>
                <DashboardSidebarShell
                    actionItems={campaignCueActionItems}
                    ariaLabel="CampaignCue sections"
                    isCollapsed={isCollapsed}
                    logoCollapsed={<span className={styles.sidebarBrandMark}>CC</span>}
                    logoExpanded={
                        <div className={styles.sidebarBrand}>
                            <span className={styles.sidebarBrandMark}>CC</span>
                            <span>CampaignCue</span>
                        </div>
                    }
                    navItems={campaignCueNavItems}
                    onExpandedChange={setSidebarShellExpanded}
                />

                <div
                    className={styles.dashboardBody}
                    style={{
                        paddingLeft: `${sidebarOffset}px`,
                    }}
                >
                    <DashboardHeaderShell
                        className={styles.dashboardHeader}
                        left={
                            <Flex align="center" gap={8} className={styles.headerLeft}>
                                <Tooltip title={isCollapsed ? tChrome("header.expandSidebar") : tChrome("header.collapseSidebar")}>
                                    <Button
                                        aria-label={isCollapsed ? tChrome("header.expandSidebar") : tChrome("header.collapseSidebar")}
                                        icon={isCollapsed ? <LuChevronRight /> : <LuChevronLeft />}
                                        onClick={() => dispatch(toggleSidbar(!isCollapsed))}
                                        type="text"
                                    />
                                </Tooltip>
                                <Tooltip title={tChrome("header.dailyDesk")}>
                                    <Button
                                        aria-label={tChrome("header.openDailyDesk")}
                                        icon={<LuHome />}
                                        onClick={() => setTab("home")}
                                        type="text"
                                    />
                                </Tooltip>
                                <div className={styles.headerTitle}>
                                    <span>CampaignCue</span>
                                    <strong>{activeTabLabel}</strong>
                                </div>
                            </Flex>
                        }
                        right={
                            <>
                                {notice ? (
                                    <span aria-live="polite" className={styles.chip} data-tone={noticeTone(notice)} role="status">
                                        {notice}
                                    </span>
                                ) : null}
                                <Tooltip title={tChrome("header.refreshWorkspace")}>
                                    <Button
                                        aria-label={tChrome("header.refreshWorkspace")}
                                        disabled={state.loading}
                                        icon={<LuRefreshCw />}
                                        onClick={load}
                                        type="text"
                                    />
                                </Tooltip>
                                <Tooltip title={isDarkMode ? tChrome("header.useLightMode") : tChrome("header.useDarkMode")}>
                                    <Button
                                        aria-label={isDarkMode ? tChrome("header.useLightMode") : tChrome("header.useDarkMode")}
                                        icon={isDarkMode ? <LuSun /> : <LuMoon />}
                                        onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
                                        type="text"
                                    />
                                </Tooltip>
                                <Tooltip title={tChrome("header.appAppearance")}>
                                    <Button
                                        aria-label={tChrome("header.openAppAppearance")}
                                        icon={<LuSettings2 />}
                                        onClick={() => dispatch(toggleAppSettingsPanel(true))}
                                        type="text"
                                    />
                                </Tooltip>
                                <Tooltip title={tChrome("header.publicSite")}>
                                    <Button
                                        aria-label={tChrome("header.openPublicSite")}
                                        href={publicSiteHref}
                                        icon={<LuExternalLink />}
                                        type="text"
                                    />
                                </Tooltip>
                                <Divider type="vertical" style={{ height: 32, margin: 0 }} />
                                <ProfileActionsModal userData={userData}>
                                    <Badge dot status="success" offset={[-3, 29]}>
                                        <Avatar size={32} src={(userData as any)?.image}>
                                            {userInitials}
                                        </Avatar>
                                    </Badge>
                                </ProfileActionsModal>
                            </>
                        }
                    />

                    <div className={styles.content}>
                    {tab === "home" ? (
                        <>
                            <section className={styles.hero}>
                                <div className={styles.panel}>
                                    <div className={styles.headline}>
                                        <span className={styles.eyebrow}>Daily campaign desk</span>
                                        <h1>{dailyDesk.summary.title}</h1>
                                        <p>
                                            {dailyDesk.summary.detail}
                                        </p>
                                        <div className={styles.chips}>
                                            <span className={styles.chip} data-tone={dailyDesk.summary.blockerCount ? "red" : dailyDesk.summary.warningCount ? "amber" : "green"}>
                                                {dailyDesk.summary.blockerCount ? "Needs detail" : dailyDesk.summary.warningCount ? "Review first" : "Ready"}
                                            </span>
                                            <span className={styles.chip}>{dailyDesk.recipe.title}</span>
                                            <span className={styles.chip}>Download and post manually</span>
                                        </div>
                                        <div className={styles.topActions}>
                                            <button
                                                className={styles.button}
                                                disabled={dailyDesk.summary.actionKind === "campaign_pack" && (!primaryCreateOpportunityId || Boolean(primaryCreateBlockedReason))}
                                                onClick={runDailyDeskPrimaryAction}
                                                title={primaryCreateBlockedReason || undefined}
                                                type="button"
                                            >
                                                <LuPackageCheck size={16} />
                                                {dailyDesk.summary.actionLabel}
                                            </button>
                                            <button className={styles.ghostButton} onClick={() => setTab("sources")} type="button">
                                                <LuFileText size={16} />
                                                Add input
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.statusGrid}>
                                    <StatCard label="Ready outputs" value={dailyDesk.summary.readyOutputCount} />
                                    <StatCard label="Details to confirm" value={dailyDesk.summary.blockerCount + dailyDesk.summary.warningCount} />
                                    <StatCard label="Print uses" value={dailyDesk.readyPack?.printFormats.length || dailyDesk.printTasks.length} />
                                    <StatCard label="Results recorded" value={data.analytics.ownerReportedOutcomeCount || 0} />
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Why this recommendation</span>
                                        <h2>CampaignCue decides from facts, recipes, readiness, and memory</h2>
                                        <p>AI does not choose the campaign. The decision engine ranks safe campaign recipes from saved business facts, timing, asset readiness, trust gates, owner effort, and past results.</p>
                                    </div>
                                </div>
                                <DecisionEvidenceCard decision={dailyDesk.decision} />
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Missing input inbox</span>
                                        <h2>Answer only what the pack needs</h2>
                                        <p>CampaignCue keeps this short: current offer, date, price, photo rights, destination, or result detail when needed.</p>
                                    </div>
                                    <button className={styles.ghostButton} onClick={() => setTab("sources")} type="button">
                                        <LuFileText size={16} />
                                        Open inputs
                                    </button>
                                </div>
                                <div className={styles.stepGrid}>
                                    {dailyDesk.missingInputs.map((task) => (
                                        <OwnerStepCard
                                            actionLabel={task.actionLabel}
                                            done={task.severity === "ready"}
                                            icon={task.kind === "asset_rights" ? LuImage : LuFileText}
                                            key={task.id}
                                            onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={task.detail}
                                            title={task.label}
                                        />
                                    ))}
                                    {!dailyDesk.missingInputs.length ? (
                                        <div className={styles.empty}>
                                            <p>No required input is waiting. Create or use the latest pack.</p>
                                        </div>
                                    ) : null}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Today&apos;s cue</span>
                                        <h2>Finish today&apos;s campaign path</h2>
                                        <p>{dailyDesk.recipe.whenToUse}</p>
                                    </div>
                                </div>
                                <div className={styles.twoGrid}>
                                    {dailyDeskCampaign ? (
                                        <article className={styles.campaign}>
                                            <div className={styles.row}>
                                                <div className={styles.titleBlock}>
                                                    <h3>{dailyDeskCampaign.title}</h3>
                                                    <p>{dailyDesk.readyPack?.plainAction || dailyDesk.readyPack?.outputFormats.join(", ") || "Pack is ready to review."}</p>
                                                </div>
                                                <span className={styles.chip} data-tone={trustTone(dailyDeskCampaign.trustGate)}>
                                                    {displayLabel(dailyDeskCampaign.trustGate)}
                                                </span>
                                            </div>
                                            <div className={styles.chips}>
                                                <button
                                                    className={styles.button}
                                                    disabled={campaignBlocksPublicUse(dailyDeskCampaign)}
                                                    onClick={() => recordAction(dailyDeskCampaign, "export")}
                                                    title={campaignBlocksPublicUse(dailyDeskCampaign) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuDownload size={16} />
                                                    Download campaign pack ZIP
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => setTab("campaigns")} type="button">
                                                    <LuPackageCheck size={16} />
                                                    Open pack
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={campaignBlocksPublicUse(dailyDeskCampaign)}
                                                    onClick={() => recordAction(dailyDeskCampaign, "mark_used")}
                                                    title={campaignBlocksPublicUse(dailyDeskCampaign) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuCheck size={16} />
                                                    Mark used
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => recordAction(dailyDeskCampaign, "record_outcome")} type="button">
                                                    <LuClipboardCheck size={16} />
                                                    Record result
                                                </button>
                                            </div>
                                            {dailyDesk.readyPack?.resultOptions?.length ? (
                                                <div className={styles.noteBox}>
                                                    <strong>{dailyDesk.readyPack.resultQuestion}</strong>
                                                    <div className={styles.chips}>
                                                        {dailyDesk.readyPack.resultOptions.map((option) => {
                                                            const note = `${option.label}: ${option.note}`;
                                                            return (
                                                                <button
                                                                    className={styles.ghostButton}
                                                                    disabled={busyKey === `${dailyDeskCampaign.id}:record_outcome:campaign`}
                                                                    key={option.id}
                                                                    onClick={() => {
                                                                        setOutcomeDraft(note);
                                                                        setSelectedOutcomeSignalId(option.id);
                                                                        void recordAction(dailyDeskCampaign, "record_outcome", undefined, note, option.id);
                                                                    }}
                                                                    type="button"
                                                                >
                                                                    {option.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </article>
                                    ) : (
                                        <article className={styles.campaign}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuPackageCheck size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{dailyDesk.primaryOpportunity?.title || firstOpportunity?.title || dailyDesk.recipe.title}</h3>
                                                    <p>{dailyDesk.primaryOpportunity?.ownerBenefit || firstOpportunity?.ownerBenefit || dailyDesk.recipe.ownerOutcome}</p>
                                                </div>
                                            </div>
                                            <button
                                                className={styles.button}
                                                disabled={!primaryCreateOpportunityId || Boolean(primaryCreateBlockedReason)}
                                                onClick={() => createCampaign(primaryCreateOpportunityId)}
                                                title={primaryCreateBlockedReason || undefined}
                                                type="button"
                                            >
                                                <LuPackageCheck size={16} />
                                                {dailyDesk.primaryOpportunity?.actionLabel || firstOpportunity?.actionLabel || "Create pack"}
                                            </button>
                                        </article>
                                    )}
                                    <div className={styles.list}>
                                        {dailyDeskTasks.map((task) => (
                                            <article className={styles.findingRow} key={task.id}>
                                                <div className={styles.rowStart}>
                                                    <div className={styles.iconBox}>
                                                        {task.kind === "result_memory" ? <LuClipboardCheck size={18} /> : task.kind === "asset_rights" ? <LuImage size={18} /> : <LuAlertCircle size={18} />}
                                                    </div>
                                                    <div className={styles.titleBlock}>
                                                        <h3>{task.label}</h3>
                                                        <p>{task.detail}</p>
                                                    </div>
                                                </div>
                                                <button className={styles.ghostButton} onClick={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)} type="button">
                                                    {task.actionLabel}
                                                </button>
                                            </article>
                                        ))}
                                        {!dailyDeskTasks.length ? (
                                            <div className={styles.empty}>
                                                <p>No urgent detail is waiting. Open the latest pack or prepare the next campaign idea.</p>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <div className={styles.stepGrid}>
                                    {dailyDesk.manualDeliveryTasks.map((task) => (
                                        <OwnerStepCard
                                            actionLabel={task.actionLabel}
                                            done={task.severity === "ready"}
                                            icon={LuSend}
                                            key={task.id}
                                            onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={task.detail}
                                            title={task.label}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Campaign pack</span>
                                        <h2>Download once, use across channels and store</h2>
                                        <p>{dailyDesk.recipe.ownerOutcome}</p>
                                    </div>
                                </div>
                                {dailyDesk.packReview ? (
                                    <div className={styles.grid}>
                                        <article className={styles.campaign}>
                                            <div className={styles.titleBlock}>
                                                <h3>{dailyDesk.packReview.title}</h3>
                                                <p>{dailyDesk.packReview.reason}</p>
                                            </div>
                                            <div className={styles.grid}>
                                                {dailyDesk.packReview.trustSummary.slice(0, 4).map((item) => (
                                                    <div className={styles.noteBox} key={item.id}>
                                                        <strong>{item.label}</strong>
                                                        <p>{item.detail}</p>
                                                        <span className={styles.chip} data-tone={ownerStatusTone(item.status)}>
                                                            {ownerStatusLabel(item.status)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </article>
                                        <OutputPackSummary
                                            busy={Boolean(dailyDeskCampaign && busyKey === `${dailyDeskCampaign.id}:export:campaign`)}
                                            disabled={campaignBlocksPublicUse(dailyDeskCampaign)}
                                            disabledReason={publicUseBlockedLabel}
                                            onDownload={() => dailyDeskCampaign && recordAction(dailyDeskCampaign, "export")}
                                            outputPack={dailyDesk.packReview.outputPack}
                                        />
                                        {dailyDesk.packReview.deliveryCards[0] ? (
                                            <ManualDeliveryCard card={dailyDesk.packReview.deliveryCards[0]} onCopy={copyHandoffValue} />
                                        ) : (
                                            <div className={styles.empty}>
                                                <p>Create a pack to see channel handoff fields.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                                <div className={styles.grid}>
                                    {(dailyDesk.readyPack?.outputFormats.length ? dailyDesk.readyPack.outputFormats : dailyDesk.recipe.outputFormats).map((format) => (
                                        <article className={styles.provider} key={format}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuSend size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{format}</h3>
                                                    <p>Prepared from the same saved business facts and manual posting boundary.</p>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>

                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY ? (
                                <PackTemplatePicker
                                    businessCategory={packTemplateState.catalog?.businessCategory || "specialty"}
                                    canSaveCurrent={Boolean(latestCampaign)}
                                    error={packTemplateState.error}
                                    loading={packTemplateState.loading}
                                    onCreateFromOutputIntent={createCampaignFromOutputIntent}
                                    onOpenTemplate={openCampaignCuePackTemplate}
                                    onRefresh={() => void loadPackTemplates(data)}
                                    onSaveCurrent={() => void saveCurrentCampaignPackTemplate()}
                                    saving={busyKey === "pack-template-save"}
                                    showOutputPicker={FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_OUTPUT_PICKER}
                                    templates={[
                                        ...(packTemplateState.catalog?.workspaceTemplates || []),
                                        ...(packTemplateState.catalog?.platformTemplates || []),
                                    ]}
                                />
                            ) : null}

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Assets and reuse</span>
                                        <h2>Use real photos before generic visuals</h2>
                                        <p>Use the same pack for in-store material, simple owner photos, and safe reuse of existing images before opening the editor.</p>
                                    </div>
                                    {cueLayersUploadEnabled ? (
                                        <button className={styles.ghostButton} onClick={() => cueLayerUploadInputRef.current?.click()} type="button">
                                            <LuLayers size={16} />
                                            Reuse old image
                                        </button>
                                    ) : null}
                                </div>
                                <div className={styles.stepGrid}>
                                    {dailyDesk.assetReuseTasks.map((task) => (
                                        <OwnerStepCard
                                            actionLabel={task.actionLabel}
                                            done={task.severity === "ready"}
                                            icon={LuLayers}
                                            key={task.id}
                                            onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={task.detail}
                                            title={task.label}
                                        />
                                    ))}
                                    {dailyDesk.printTasks.slice(0, 3).map((task) => (
                                        <OwnerStepCard
                                            actionLabel={task.actionLabel}
                                            done={task.severity === "ready"}
                                            icon={LuPrinter}
                                            key={task.id}
                                            onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={task.detail}
                                            title={task.label}
                                        />
                                    ))}
                                    {dailyDesk.photoTasks.slice(0, 1).map((task) => (
                                        <OwnerStepCard
                                            actionLabel={task.actionLabel}
                                            done={task.severity === "ready"}
                                            icon={LuCamera}
                                            key={task.id}
                                            onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={task.detail}
                                            title={task.label}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Local visibility</span>
                                        <h2>Keep local search updates current</h2>
                                        <p>Use current facts, area, destination, and approved images before preparing a Google-ready update.</p>
                                    </div>
                                    <button className={styles.ghostButton} onClick={() => setTab("visibility")} type="button">
                                        <LuSearch size={16} />
                                        Open visibility
                                    </button>
                                </div>
                                <div className={styles.stepGrid}>
                                    {dailyDesk.localVisibilityCues.slice(0, 4).map((cue) => (
                                        <OwnerStepCard
                                            actionLabel={cue.actionLabel}
                                            done={cue.status === "ready"}
                                            icon={LuSearch}
                                            key={cue.id}
                                            onAction={() => openDeskTarget(cue.targetTab as CampaignCueWorkspaceTabKey)}
                                            text={cue.detail}
                                            title={cue.label}
                                        />
                                    ))}
                                </div>
                            </section>

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Saved facts</span>
                                        <h2>What CampaignCue can safely use</h2>
                                        <p>These facts come from business details and owner inputs. Review anything marked needs review before using a pack.</p>
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
                                            <option value="retail">Retail shop</option>
                                            <option value="local_service">Local service</option>
                                            <option value="fitness">Fitness or studio</option>
                                            <option value="clinic">Clinic or wellness office</option>
                                            <option value="multi_location">Multi-location</option>
                                            <option value="agency_client">Agency client</option>
                                            <option value="other">Other local business</option>
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
                                    <div className={styles.field}>
                                        <label htmlFor="business-target-audience">Target audience</label>
                                        <input className={styles.input} id="business-target-audience" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, targetAudience: event.target.value }))} placeholder="Example: nearby young professionals" value={businessDraft.targetAudience} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-brand-feel">Brand feel</label>
                                        <textarea className={styles.textarea} id="business-brand-feel" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, brandFeel: event.target.value }))} placeholder="friendly, polished, local, energetic" rows={3} value={businessDraft.brandFeel} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-inspiration">Style references</label>
                                        <textarea className={styles.textarea} id="business-inspiration" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, inspirationNotes: event.target.value }))} placeholder="editorial food photos, clean salon reels, storefront-first posts" rows={3} value={businessDraft.inspirationNotes} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-visual-motifs">Visual motifs</label>
                                        <textarea className={styles.textarea} id="business-visual-motifs" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, visualMotifs: event.target.value }))} placeholder="menu closeups, real staff, warm counter light" rows={3} value={businessDraft.visualMotifs} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-product-focus">Product or service focus</label>
                                        <textarea className={styles.textarea} id="business-product-focus" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, productFocus: event.target.value }))} placeholder="weekday lunch, bridal hair, new arrivals" rows={3} value={businessDraft.productFocus} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-typography">Typography notes</label>
                                        <input className={styles.input} id="business-typography" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, typographyNotes: event.target.value }))} placeholder="Example: clean sans, bold short headings" value={businessDraft.typographyNotes} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-avoid-list">Avoid list</label>
                                        <textarea className={styles.textarea} id="business-avoid-list" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, avoidList: event.target.value }))} placeholder="fake reviews, cartoon graphics, heavy discounts, result promises" rows={3} value={businessDraft.avoidList} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.campaigns
                                    .filter((campaign) => campaign.resultMemory?.lastNote)
                                    .map((campaign) => (
                                        <div className={styles.findingRow} key={`${campaign.id}:result-memory`}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuClipboardCheck size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{campaign.title}</h3>
                                                    <p>{campaign.resultMemory?.lastNote}</p>
                                                </div>
                                            </div>
                                            <span className={styles.chip} data-tone={Number(campaign.resultMemory?.notUsefulCount || 0) ? "amber" : "green"}>
                                                {Number(campaign.resultMemory?.notUsefulCount || 0) ? "Adjust next time" : "Can repeat"}
                                            </span>
                                        </div>
                                    ))}
                                {!data.campaigns.some((campaign) => campaign.resultMemory?.lastNote) ? (
                                    <div className={styles.empty}>
                                        <p>No result memory yet. Record one result after a pack is used.</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "sources" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Offers, events, and notes</span>
                                    <h2>Missing Input Inbox</h2>
                                    <p>Add only the current details CampaignCue needs: price, date, availability, destination, photo rights, terms, or result notes.</p>
                                </div>
                                <button className={styles.button} disabled={busyKey === "source" || !sourceDraft.label.trim() || !sourceDraft.value.trim()} onClick={createSourceInput} type="button">
                                    <LuUpload size={16} />
                                    Save input
                                </button>
                            </div>
                            <div className={styles.stepGrid}>
                                {dailyDesk.missingInputs.map((task) => (
                                    <OwnerStepCard
                                        actionLabel={task.actionLabel}
                                        done={task.severity === "ready"}
                                        icon={task.kind === "asset_rights" ? LuImage : LuFileText}
                                        key={task.id}
                                        onAction={() => openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey)}
                                        text={task.detail}
                                        title={task.label}
                                    />
                                ))}
                                {!dailyDesk.missingInputs.length ? (
                                    <div className={styles.empty}>
                                        <p>No missing campaign detail is waiting.</p>
                                    </div>
                                ) : null}
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
                                            onChange={(event) => setSourceDraft((draft) => ({ ...draft, expiresAt: event.target.value }))}
                                            type="datetime-local"
                                            value={sourceDraft.expiresAt}
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
                                        <p>Use Download text, Download campaign pack ZIP, Schedule task, Request approval, Mark used, and Record result. CampaignCue does not post to social platforms.</p>
                                    </div>
                                </div>
                            </div>
                            {dailyDesk.packReview ? (
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>Use this campaign</span>
                                            <h2>Manual delivery cards</h2>
                                            <p>Copy the prepared fields into the owner-managed channel. CampaignCue does not post, send, or spend.</p>
                                        </div>
                                    </div>
                                    {dailyDeskCampaign ? (
                                        <OutputPackSummary
                                            busy={busyKey === `${dailyDeskCampaign.id}:export:campaign`}
                                            disabled={campaignBlocksPublicUse(dailyDeskCampaign)}
                                            disabledReason={publicUseBlockedLabel}
                                            onDownload={() => recordAction(dailyDeskCampaign, "export")}
                                            outputPack={dailyDesk.packReview.outputPack}
                                        />
                                    ) : null}
                                    <div className={styles.grid}>
                                        {dailyDesk.packReview.deliveryCards.map((card) => (
                                            <ManualDeliveryCard card={card} key={card.id} onCopy={copyHandoffValue} />
                                        ))}
                                    </div>
                                </section>
                            ) : null}
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
                                            <p>CampaignCue prepares packs for download and manual posting. It does not connect social accounts or post on behalf of the business.</p>
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
                                {dailyDesk.candidateDecisions.slice(0, 2).map((candidate) => (
                                    <DecisionEvidenceCard decision={candidate} key={candidate.decisionId} />
                                ))}
                            </div>
                            <div className={styles.grid}>
                                {data.opportunities.map((cue) => {
                                    const createBlockedReason = campaignCreationBlockedReason(cue.id);
                                    return (
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
                                            {createBlockedReason ? <p className={styles.muted}>{createBlockedReason}</p> : null}
                                            <button
                                                className={styles.button}
                                                disabled={busyKey === `cue:${cue.id}` || Boolean(createBlockedReason)}
                                                onClick={() => createCampaign(cue.id)}
                                                title={createBlockedReason || undefined}
                                                type="button"
                                            >
                                                <LuPackageCheck size={16} />
                                                {cue.actionLabel}
                                            </button>
                                        </article>
                                    );
                                })}
                                {!data.opportunities.length ? (
                                    <div className={styles.empty}>
                                        <p>No ideas yet. Add a current offer, event, service, or menu link in Offers, events, and notes.</p>
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
                                    <p>{data.campaigns.length ? "Packs are ready to download, export, schedule, or send for approval." : "Create your first pack from a campaign idea or saved business details."}</p>
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
                                            {dailyDesk.packReview?.campaignId === campaign.id ? (
                                                <div className={styles.detailStack}>
                                                    <div className={styles.noteBox}>
                                                        <strong>Why this pack</strong>
                                                        <p>{dailyDesk.packReview.reason}</p>
                                                    </div>
                                                    <div className={styles.grid}>
                                                        {dailyDesk.packReview.trustSummary.map((item) => (
                                                            <div className={styles.noteBox} key={item.id}>
                                                                <strong>{item.label}</strong>
                                                                <p>{item.detail}</p>
                                                                <span className={styles.chip} data-tone={ownerStatusTone(item.status)}>
                                                                    {ownerStatusLabel(item.status)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className={styles.grid}>
                                                        {dailyDesk.packReview.deliveryCards.slice(0, 3).map((card) => (
                                                            <ManualDeliveryCard card={card} key={card.id} onCopy={copyHandoffValue} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : null}
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
                                                                disabled={busyKey === `${campaign.id}:download:${output.id}` || campaignBlocksPublicUse(campaign)}
                                                                onClick={() => recordAction(campaign, "download", output)}
                                                                title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                                                type="button"
                                                            >
                                                                <LuDownload size={16} />
                                                                Download text
                                                            </button>
                                                            {creativeEditorEnabled ? (
                                                                <button
                                                                    className={styles.ghostButton}
                                                                    onClick={() => openOutputCreativeEditor(campaign, output)}
                                                                    type="button"
                                                                >
                                                                    <LuImage size={16} />
                                                                    Open editor
                                                                </button>
                                                            ) : null}
                                                        </div>
                                                    </article>
                                                ))}
                                            </div>
                                            <div className={styles.chips}>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={campaignBlocksPublicUse(campaign)}
                                                    onClick={() => recordAction(campaign, "schedule")}
                                                    title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuCalendarDays size={16} />
                                                    Schedule task
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => recordAction(campaign, "request_approval")} type="button">
                                                    <LuUsers size={16} />
                                                    Request approval
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={busyKey === `${campaign.id}:export:campaign` || campaignBlocksPublicUse(campaign)}
                                                    onClick={() => recordAction(campaign, "export")}
                                                    title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuDownload size={16} />
                                                    Download campaign pack ZIP
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={campaignBlocksPublicUse(campaign)}
                                                    onClick={() => recordAction(campaign, "mark_used")}
                                                    title={campaignBlocksPublicUse(campaign) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
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
                    {tab === "editor" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Creative Editor</span>
                                    <h2>Campaign pack editor</h2>
                                    <p>Edit the campaign asset, keep protected facts visible, reuse old images safely, and prepare manual delivery.</p>
                                </div>
                                <div className={styles.topActions}>
                                    {cueLayersUploadEnabled ? (
                                        <button
                                            className={styles.ghostButton}
                                            disabled={busyKey === "cue-layer-upload"}
                                            onClick={() => cueLayerUploadInputRef.current?.click()}
                                            type="button"
                                        >
                                            <LuUploadCloud size={16} />
                                            Reuse old image
                                        </button>
                                    ) : null}
                                    {creativeEditorEnabled ? (
                                        <button className={styles.button} onClick={openBlankCreativeEditor} type="button">
                                            <LuImage size={16} />
                                            Create from scratch
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            {cueLayersUploadEnabled ? (
                                <>
                                    <div className={styles.panel}>
                                        <div className={styles.row}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuLayers size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{activeCueLayerDesign ? activeCueLayerDesign.title : "Reuse old image"}</h3>
                                                    <p>
                                                        {activeCueLayerDesign
                                                            ? "Original image is preserved. Save or export from the editor when the result is ready."
                                                            : "Upload an existing poster, screenshot, or flat image when you want a reusable editor version."}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={styles.chips}>
                                                {activeCueLayerDesign ? (
                                                    <>
                                                        <span className={styles.chip} data-tone={cueLayerDesignTone(activeCueLayerDesign.status)}>
                                                            {displayLabel(activeCueLayerDesign.status)}
                                                        </span>
                                                        <span className={styles.chip}>Revision {activeCueLayerRevision ?? activeCueLayerDesign.current.revision}</span>
                                                        <button
                                                            className={styles.ghostButton}
                                                            disabled={busyKey === "cue-layer-repair"}
                                                            onClick={repairCueLayerFallback}
                                                            type="button"
                                                        >
                                                            <LuRotateCcw size={16} />
                                                            Restore original
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={styles.chip}>Original preserved</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {cueLayerDesigns.length ? (
                                        <div className={styles.list}>
                                            {cueLayerDesigns.slice(0, 5).map((design) => {
                                                const updatedLabel = formatCampaignCueDate(design.updatedAt, formatter);
                                                return (
                                                    <div className={styles.assetRow} key={design.id}>
                                                        <div className={styles.rowStart}>
                                                            <div className={styles.iconBox}>
                                                                <LuLayers size={18} />
                                                            </div>
                                                            <div className={styles.titleBlock}>
                                                                <h3>{design.title}</h3>
                                                                <p>
                                                                    {displayLabel(design.source.kind)}
                                                                    {" · "}
                                                                    revision {design.current.revision}
                                                                    {updatedLabel ? ` · ${updatedLabel}` : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className={styles.chips}>
                                                            <span className={styles.chip} data-tone={cueLayerDesignTone(design.status)}>
                                                                {displayLabel(design.status)}
                                                            </span>
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={busyKey === `cue-layer-open:${design.id}`}
                                                                onClick={() => openCueLayerDesign(design.id)}
                                                                type="button"
                                                            >
                                                                <LuArrowRight size={16} />
                                                                Open
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                            {creativeEditorEnabled && editorDocument ? (
                                <div className={styles.editorWorkspace}>
                                    {renderEditorOwnerPanel()}
                                    <div className={styles.editorCanvasPanel}>
                                        <CreativeEditor
                                            allowDesignImport={!activeCueLayerDesign}
                                            allowNewDesign={!activeCueLayerDesign}
                                            allowRasterImports={!activeCueLayerDesign}
                                            assetSources={activeCueLayerDesign ? [] : buildCampaignCueCreativeAssetSources({
                                                assets: data.assets,
                                                businessBrain: data.businessBrain,
                                            })}
                                            aiToolActions={creativeEditorAiToolsEnabled ? CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS : []}
                                            designCueCommands={creativeEditorDesignCueEnabled ? CAMPAIGNCUE_DESIGN_CUE_COMMANDS : []}
                                            disabledExportFormats={activeCueLayerDesign ? ["svg", "json"] : []}
                                            headerActions={editorHeaderActions}
                                            initialDocument={editorDocument}
                                            onAiToolAction={creativeEditorAiToolsEnabled ? runCreativeEditorAiTool : undefined}
                                            onDesignCueApply={creativeEditorDesignCueEnabled ? applyDesignCueRequest : undefined}
                                            onDesignCueRequest={creativeEditorDesignCueEnabled ? runDesignCueRequest : undefined}
                                            onDocumentChange={setEditorDraftDocument}
                                            onExport={registerEditorExport}
                                            productLabel="CampaignCue"
                                            sourceLabel={editorSourceLabel}
                                        />
                                    </div>
                                </div>
                            ) : creativeEditorEnabled ? (
                                <div className={styles.empty}>
                                    <p>Start from a blank asset, upload an existing image, or open a campaign output from Packs or Social.</p>
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <p>The shared creative editor is currently off for CampaignCue.</p>
                                </div>
                            )}
                        </section>
                    ) : null}
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
                            {dailyDesk.packReview ? (
                                <div className={styles.grid}>
                                    {dailyDesk.packReview.trustSummary.map((item) => (
                                        <article className={styles.provider} key={item.id}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuShieldCheck size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{item.label}</h3>
                                                    <p>{item.detail}</p>
                                                </div>
                                            </div>
                                            <span className={styles.chip} data-tone={ownerStatusTone(item.status)}>
                                                {ownerStatusLabel(item.status)}
                                            </span>
                                        </article>
                                    ))}
                                </div>
                            ) : null}
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

                    {tab === "visibility" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Local visibility</span>
                                    <h2>Search and profile readiness</h2>
                                    <p>Keep customer-facing updates current with saved facts, area, destination, approved images, and manual Google handoff.</p>
                                </div>
                                <button className={styles.ghostButton} onClick={() => createCampaign("cue_local_visibility_refresh")} type="button">
                                    <LuSearch size={16} />
                                    Create visibility pack
                                </button>
                            </div>
                            <div className={styles.stepGrid}>
                                {dailyDesk.localVisibilityCues.map((cue) => (
                                    <OwnerStepCard
                                        actionLabel={cue.actionLabel}
                                        done={cue.status === "ready"}
                                        icon={LuSearch}
                                        key={cue.id}
                                        onAction={() => openDeskTarget(cue.targetTab as CampaignCueWorkspaceTabKey)}
                                        text={cue.detail}
                                        title={cue.label}
                                    />
                                ))}
                            </div>
                            {dailyDesk.packReview?.deliveryCards.some((card) => card.channel === "google_local") ? (
                                <div className={styles.grid}>
                                    {dailyDesk.packReview.deliveryCards
                                        .filter((card) => card.channel === "google_local")
                                        .map((card) => (
                                            <ManualDeliveryCard card={card} key={card.id} onCopy={copyHandoffValue} />
                                        ))}
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <p>Create a visibility pack to prepare Google update, offer, or event fields.</p>
                                </div>
                            )}
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
                                    <button
                                        className={styles.button}
                                        disabled={campaignBlocksPublicUse(latestCampaign)}
                                        onClick={() => recordAction(latestCampaign, "schedule")}
                                        title={campaignBlocksPublicUse(latestCampaign) ? publicUseBlockedLabel : undefined}
                                        type="button"
                                    >
                                        <LuCalendarDays size={16} />
                                        Schedule latest
                                    </button>
                                ) : null}
                            </div>
                            <div className={styles.list}>
                                {data.schedules.map((schedule) => {
                                    const scheduledLabel = formatCampaignCueDateTime(schedule.scheduledAt, formatter);
                                    return (
                                        <div className={styles.scheduleRow} key={schedule.id}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}>
                                                    <LuCalendarDays size={18} />
                                                </div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{displayLabel(schedule.channel)}</h3>
                                                    <p>
                                                        {schedule.note}
                                                        {scheduledLabel ? ` · ${scheduledLabel}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={styles.chip}>{schedule.status}</span>
                                        </div>
                                    );
                                })}
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
                                <div className={styles.topActions}>
                                    {cueLayersUploadEnabled ? (
                                        <button
                                            className={styles.ghostButton}
                                            disabled={busyKey === "cue-layer-upload"}
                                            onClick={() => cueLayerUploadInputRef.current?.click()}
                                            type="button"
                                        >
                                            <LuUploadCloud size={16} />
                                            Reuse old image
                                        </button>
                                    ) : null}
                                    {creativeEditorEnabled ? (
                                        <button className={styles.button} onClick={openBlankCreativeEditor} type="button">
                                            <LuImage size={16} />
                                            Create from scratch
                                        </button>
                                    ) : null}
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
                                            {asset.file?.downloadUrl || asset.file?.storagePath ? (
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={busyKey === `asset-download:${asset.id}`}
                                                    onClick={() => downloadAsset(asset)}
                                                    type="button"
                                                >
                                                    <LuDownload size={16} />
                                                    Download
                                                </button>
                                            ) : null}
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
                                    <p>Counts update when a pack is downloaded, exported, scheduled, approved, or marked used.</p>
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
                                        <div className={styles.chips}>
                                            {(data.dailyDesk.readyPack?.resultOptions || data.dailyDesk.resultPrompt?.resultOptions || data.dailyDesk.recipe.resultOptions).map((option) => {
                                                const note = `${option.label}: ${option.note}`;
                                                return (
                                                    <button
                                                        className={styles.ghostButton}
                                                        key={option.id}
                                                        onClick={() => {
                                                            setOutcomeDraft(note);
                                                            setSelectedOutcomeSignalId(option.id);
                                                        }}
                                                        type="button"
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
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
                                                <li>Downloaded means the owner downloaded a pack.</li>
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
                <AppSettingsPanel />
            </div>
            </div>
        </main>
    );
}
