"use client";

import ContextualStateIllustration from "@atoms/contextualStateIllustration";
import { SIGNIN_URL } from "@constant/urls";
import { CAMPAIGNCUE_PAGE_SIZE } from "@constant/campaigncue/database";
import { CAMPAIGNCUE_CHANNEL_LABELS } from "@constant/campaigncue/channels";
import { CAMPAIGNCUE_DAILY_DESK_RECIPES } from "@constant/campaigncue/dailyDesk";
import { CAMPAIGNCUE_CREATIVE_EDITOR_AI_ACTIONS } from "@constant/campaigncue/creativeEditorAiTools";
import { CAMPAIGNCUE_DESIGN_CUE_COMMANDS } from "@constant/campaigncue/designCue";
import { CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX } from "@constant/campaigncue/domains";
import { CAMPAIGNCUE_ERROR_CODES } from "@constant/campaigncue/errors";
import { buildCampaignCueExportArchiveFilename } from "@constant/campaigncue/exportArchive";
import { CAMPAIGNCUE_CUE_LAYERS } from "@constant/campaigncue/cueLayers";
import { CAMPAIGNCUE_OFFER_PAGE_COPY } from "@constant/campaigncue/offerPage";
import { campaignCueCanRecordResultEvidence } from "@constant/campaigncue/resultEvidence";
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
    getCampaignCueOfferPageApiPath,
    getCampaignCuePublicOfferPath,
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
import {
    campaignCueOutputIntentSupportsOwnerGoal,
    type CampaignCueOutputPickerItem,
} from "@constant/campaigncue/outputPicker";
import { useAppDispatch } from "@hook/useAppDispatch";
import { useAppSelector } from "@hook/useAppSelector";
import { openIsolatedBrowserUrl } from "@lib/browser/openIsolatedBrowserUrl";
import { createTimestampedRuntimeId } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { FEATURE_FLAGS } from "@config/features";
import { runCampaignCueCreativeEditorAiTool } from "@lib/campaigncue/creativeEditorAiTools";
import {
    getCampaignCueMediaUploadFailureNotice,
    uploadCampaignCueMediaAsset,
} from "@lib/campaigncue/assetUploadClient";
import { uploadCampaignCueExportArchive } from "@lib/campaigncue/exportArchiveClient";
import type { CampaignCueMediaConsentType } from "@lib/campaigncue/mediaMissions";
import { buildCampaignCueDailyDesk } from "@lib/campaigncue/dailyDesk";
import {
    buildCampaignCueCampaignMemoryView,
    resolveCampaignCueCampaignMemorySummary,
} from "@lib/campaigncue/campaignMemory";
import {
    CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH,
    campaignCueInboxCandidateToBusinessPatch,
    campaignCueInboxCandidateToSourceInput,
    parseCampaignCueInboxText,
} from "@lib/campaigncue/campaignInbox";
import {
    campaignCueCanCommentOnApproval,
    campaignCueCanRequestApproval,
    campaignCueCanResolveApproval,
} from "@lib/campaigncue/approvalInbox";
import {
    campaignCueCanManageCampaignLocation,
    campaignCueCanManageSomeCampaignOutput,
    campaignCueCanManageWorkspaceContent,
    campaignCueCanPerformCampaignOutputAction,
    campaignCueCanRegisterAsset,
} from "@lib/campaigncue/permissions";
import { evaluateCampaignCuePackFreshness, isCampaignCueSourceInputCurrent } from "@lib/campaigncue/operatingLoop";
import { getStoreLocalDateKey } from "@lib/hours/hoursBoundary";
import { applyCampaignCueDesignCuePatchSet } from "@lib/campaigncue/design-cue/apply";
import { runCampaignCueDesignCue } from "@lib/campaigncue/design-cue/intent";
import {
    buildCampaignCueWorkspaceTemplateSaveInput,
    summarizeCampaignCuePackTemplateApplication,
} from "@lib/campaigncue/pack-templates/applyTemplate";
import {
    getCampaignCuePackTemplate,
    listCampaignCuePackTemplates,
    loadCampaignCuePackTemplateOverflow,
} from "@lib/campaigncue/pack-templates/catalog";
import { saveCampaignCueWorkspacePackTemplate } from "@lib/campaigncue/pack-templates/workspaceTemplates";
import { hydrateCampaignCuePackTemplateEditorDocument } from "@lib/campaigncue/pack-templates/editorDocumentBoundary";
import {
    getUnresolvedCampaignCueOutputIntentRequirements,
    getUnresolvedCampaignCuePackTemplateFactSlots,
} from "@lib/campaigncue/pack-templates/factSlotReadiness";
import { formatDateTime, fromNativeDateTimeInputValue, toNativeDateTimeInputValue, type DateLike, type IntlFormatter } from "@util/dateTime";
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
    CampaignCueAIAssistItem,
    CampaignCueAsset,
    CampaignCueCampaign,
    CampaignCueChannel,
    CampaignCueDailyDeskTask,
    CampaignCueDecision,
    CampaignCueInboxCandidate,
    CampaignCueInboxConfirmResult,
    CampaignCueInboxParseResult,
    CampaignCueLocation,
    CampaignCueLocalVisibilityCue,
    CampaignCueManualDeliveryCard,
    CampaignCueOutput,
    CampaignCueOutputPack,
    CampaignCueSourceFact,
    CampaignCueOverview,
    CampaignCueProviderStatus,
    CampaignCuePublicOfferPage,
    CampaignCueSourceInput,
    CampaignCueTrustSummaryItem,
    CampaignCueWorkspaceRole,
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
    LuCopy,
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
    LuVideo,
    LuX,
} from "react-icons/lu";
import PackTemplatePicker from "./PackTemplatePicker";
import CampaignCueVideoStudio from "./CampaignCueVideoStudio";
import styles from "./CampaignCueWorkspaceApp.module.scss";

const CAMPAIGNCUE_TAB_TRANSLATION_KEYS = {
    home: "tabs.home",
    details: "tabs.details",
    sources: "tabs.sources",
    delivery: "tabs.delivery",
    settings: "tabs.settings",
    cues: "tabs.cues",
    inspiration: "tabs.inspiration",
    campaigns: "tabs.campaigns",
    editor: "tabs.editor",
    creative: "tabs.creative",
    video: "tabs.video",
    ugc: "tabs.ugc",
    whatsapp: "tabs.whatsapp",
    google: "tabs.google",
    ads: "tabs.ads",
    trust: "tabs.trust",
    visibility: "tabs.visibility",
    calendar: "tabs.calendar",
    assets: "tabs.assets",
    analytics: "tabs.analytics",
    agency: "tabs.agency",
    locations: "tabs.locations",
    billing: "tabs.billing",
} as const satisfies Record<CampaignCueWorkspaceTabKey, `tabs.${CampaignCueWorkspaceTabKey}`>;

const CAMPAIGNCUE_GROUP_TRANSLATION_KEYS = {
    Start: "groups.Start",
    Campaigns: "groups.Campaigns",
    Channels: "groups.Channels",
    Operations: "groups.Operations",
} as const;

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
    loadingMore?: boolean;
}

const isCampaignCueWorkspaceTabEnabled = (key: CampaignCueWorkspaceTabKey) => {
    if (key === "sources") return FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS;
    if (key === "inspiration") {
        return FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS
            && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE;
    }
    if (key === "analytics") return FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_ANALYTICS;
    return true;
};

const getCampaignCueFallbackTab = (key: CampaignCueWorkspaceTabKey): CampaignCueWorkspaceTabKey => {
    if (key === "sources") return "details";
    if (key === "inspiration") return "cues";
    return "home";
};

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

const campaignMemoryConfidenceLabel = (confidence: CampaignCueOverview["campaignMemory"]["confidence"]) => {
    if (confidence === "repeated_signal") return "Repeated signal";
    if (confidence === "early_signal") return "Early signal";
    return "Not enough results";
};

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
    | { code?: string; message?: string; ok: false; status: number };

const isCampaignCueMutationOutcomeAuthoritative = <T,>(
    result: CampaignCueWorkspaceResponseResult<T>,
) => (
    result.ok
    || (
        result.status >= 400
        && result.status < 500
        && result.code !== CAMPAIGNCUE_ERROR_CODES.IDEMPOTENCY_CONFLICT
    )
);

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
    && isRecord(value.campaignMemory)
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
    && (() => {
        try {
            const url = new URL(value.url);
            return url.protocol === "https:"
                && (
                    url.hostname === "storage.googleapis.com"
                    || url.hostname.endsWith(".storage.googleapis.com")
                )
                && url.searchParams.has("X-Goog-Signature");
        } catch {
            return false;
        }
    })()
);

const isCampaignCueInboxConfirmResultData = (value: unknown): value is CampaignCueInboxConfirmResult => (
    isRecord(value)
    && typeof value.batchId === "string"
    && Array.isArray(value.sourceInputs)
    && value.sourceInputs.every((sourceInput) => isRecord(sourceInput) && typeof sourceInput.id === "string")
    && isRecord(value.sourceSnapshot)
    && typeof value.sourceSnapshot.sourceHash === "string"
    && Array.isArray(value.sourceSnapshot.facts)
);

const isCampaignCueOfferPageMutationResultData = (
    value: unknown,
): value is { campaign: CampaignCueCampaign; offerPage: CampaignCuePublicOfferPage | null; replayed: boolean } => (
    isRecord(value)
    && isRecord(value.campaign)
    && (value.offerPage === null || isRecord(value.offerPage))
    && typeof value.replayed === "boolean"
);

const isCampaignCueLocationVariantBatchResultData = (
    value: unknown,
): value is { campaigns: CampaignCueCampaign[]; replayed: boolean; variantGroupId: string } => (
    isRecord(value)
    && Array.isArray(value.campaigns)
    && value.campaigns.every((campaign) => isRecord(campaign) && typeof campaign.id === "string")
    && typeof value.replayed === "boolean"
    && typeof value.variantGroupId === "string"
);

const isCampaignCueWorkspaceResponseCode = (payload: unknown): string | undefined => (
    isRecord(payload) && typeof payload.code === "string" ? payload.code : undefined
);

const isCampaignCueWorkspaceResponseMessage = (payload: unknown): string | undefined => (
    isRecord(payload) && typeof payload.error === "string" ? payload.error.slice(0, 240) : undefined
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
        return {
            code: isCampaignCueWorkspaceResponseCode(payload),
            message: isCampaignCueWorkspaceResponseMessage(payload),
            ok: false,
            status: response.status,
        };
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

const isCampaignPackExpired = (campaign?: CampaignCueCampaign | null) => {
    const value = campaign?.pack?.freshness?.expiresAt;
    if (!value) return false;
    const date = value instanceof Date
        ? value
        : typeof value === "string" || typeof value === "number"
            ? new Date(value)
            : typeof (value as { toDate?: unknown }).toDate === "function"
                ? (value as { toDate: () => Date }).toDate()
                : null;
    return Boolean(date && !Number.isNaN(date.getTime()) && date.getTime() < Date.now());
};

const campaignBlocksPublicUse = (
    campaign?: CampaignCueCampaign | null,
    approvalRequired = false,
) => (
    campaign?.trustGate === "blocked"
    || campaign?.trustGate === "needs_fix"
    || campaign?.pack?.freshness?.status === "stale"
    || campaign?.pack?.freshness?.status === "expired"
    || isCampaignPackExpired(campaign)
    || campaign?.ownerApprovalState === "requested"
    || campaign?.ownerApprovalState === "rejected"
    || (approvalRequired && campaign?.ownerApprovalState !== "approved")
);

const publicUseBlockedLabel = "Resolve blocked checks, freshness, or required approval before downloading, saving a cloud copy, scheduling, or marking this pack used.";

const canRequestCampaignApproval = (
    campaign?: CampaignCueCampaign | null,
    role?: CampaignCueWorkspaceRole,
) => Boolean(
    FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_APPROVAL_COMMENT_INBOX
    &&
    campaign
    && campaignCueCanRequestApproval(role)
    && campaign.status !== "used"
    && campaign.status !== "archived"
    && campaign.ownerApprovalState !== "requested"
    && campaign.ownerApprovalState !== "approved"
);

const campaignApprovalActionLabel = (campaign: CampaignCueCampaign) => {
    if (campaign.ownerApprovalState === "requested") return "Approval waiting";
    if (campaign.ownerApprovalState === "approved") return "Approved";
    if (campaign.status === "used" || campaign.status === "archived") return "Campaign closed";
    return "Request approval";
};

const CAMPAIGNCUE_APPROVAL_INBOX_ACTIONS = new Set<CampaignCueActionType>([
    "request_approval",
    "approve",
    "reject",
    "add_approval_comment",
    "resolve_approval_comment",
]);

const campaignCueCanAcceptExperiment = (role?: CampaignCueWorkspaceRole) => (
    role === "owner"
    || role === "admin"
    || role === "marketer"
    || role === "local_manager"
);

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
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return buildCampaignCueAuthLaunchUrl(
        isLocal ? "/signin" : SIGNIN_URL,
        window.location.href,
    );
};

const getCampaignCueHostedOfferUrl = (slug: string) => {
    if (typeof window === "undefined") return "";
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    return new URL(getCampaignCuePublicOfferPath(slug, isLocal), window.location.origin).toString();
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
    buildCampaignCueExportArchiveFilename(campaign.title)
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
        matchingPackReview?.decision ? `Recommendation fit: ${matchingPackReview.decision.score.finalScore}/100` : "",
        matchingPackReview?.outputPack ? `Pack readiness: ${matchingPackReview.outputPack.readiness.score}/100 (${ownerStatusLabel(matchingPackReview.outputPack.readiness.status)})` : "",
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
        "## AI assistance plan",
        dailyDesk?.aiAssistance ? `Status: ${ownerStatusLabel(dailyDesk.aiAssistance.status)}` : "Status: Not included",
        dailyDesk?.aiAssistance ? `Next action: ${dailyDesk.aiAssistance.nextBestAction.label} - ${dailyDesk.aiAssistance.nextBestAction.detail}` : "",
        dailyDesk?.aiAssistance?.costPolicy.summary || "",
        ...(dailyDesk?.aiAssistance?.items.length
            ? dailyDesk.aiAssistance.items.map((item) => `- ${item.label}: ${ownerStatusLabel(item.status)}. ${item.suggestedAction}`)
            : ["- Assistant work plan was not included in this export."]),
        "",
        "## Campaign rhythm",
        dailyDesk?.rhythm ? `Next action: ${dailyDesk.rhythm.title}` : "Next action: Not included",
        dailyDesk?.rhythm?.detail || "",
        dailyDesk?.rhythm ? `Manual use: ${dailyDesk.rhythm.suggestedUse}` : "",
        dailyDesk?.rhythm ? `Follow-up: ${dailyDesk.rhythm.followUp}` : "",
        dailyDesk?.rhythm?.reuseCandidate ? `Safe reuse: ${dailyDesk.rhythm.reuseCandidate.title}` : "Safe reuse: No proven pack nominated.",
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
            value: business.locality || "",
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

const templateFactTaskInputType = (type: string): CampaignCueDailyDeskTask["inputType"] => {
    switch (type) {
        case "price": return "price_or_date";
        case "availability":
        case "availability_date": return "available_time_slot";
        case "booking_link": return "booking_link";
        case "location":
        case "branch_location":
        case "location_detail": return "location_detail";
        case "menu_item":
        case "product":
        case "service": return "menu_service_item";
        case "photo": return "photo";
        case "usage_rights":
        case "asset_rights": return "asset_rights";
        case "offer_end_date": return "offer_end_date";
        case "terms": return "terms";
        case "destination_url": return "destination_url";
        case "approved_claim": return "commercial_policy";
        case "whatsapp_number":
        case "phone": return "business_cta";
        default: return undefined;
    }
};

const buildPackTemplateEditorContext = (
    overview: CampaignCueOverview,
    template: CampaignCuePackTemplateHydrated,
    intent?: CampaignCueOutputPickerItem,
    unresolvedRequiredFactTypes: readonly string[] = template.payload.factSlots
        .filter((slot) => slot.required)
        .map((slot) => slot.type),
): CampaignCueEditorContext => {
    const unresolvedRequiredFactTypeSet = new Set(unresolvedRequiredFactTypes);
    const requiredFactSlots = template.payload.factSlots.filter((slot) => (
        slot.required && unresolvedRequiredFactTypeSet.has(slot.type)
    ));
    const hasOutputIntent = Boolean(intent && intent.id !== "recommended_pack");
    const templateProtectedFacts = template.payload.factSlots
        .filter((slot) => slot.protected)
        .map((slot): CampaignCueEditorProtectedFact => {
            const needsInput = slot.required && unresolvedRequiredFactTypeSet.has(slot.type);
            return {
                id: `template:${template.summary.templateId}:fact:${slot.type}`,
                label: displayLabel(slot.type),
                status: needsInput ? "needs_review" : "ready",
                value: needsInput ? "Required before reuse" : slot.required ? "Confirmed from current facts" : "Optional",
            };
        });
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
    const templateTasks = template.payload.factSlots.map((slot): CampaignCueDailyDeskTask => {
        const needsInput = slot.required && unresolvedRequiredFactTypeSet.has(slot.type);
        return {
            actionLabel: needsInput ? "Confirm fact" : "Review fact",
            detail: slot.ownerQuestion,
            id: `template:${template.summary.templateId}:slot:${slot.type}`,
            inputType: templateFactTaskInputType(slot.type),
            kind: "source_input",
            label: `${needsInput ? "Required" : slot.required ? "Confirmed" : "Optional"} · ${displayLabel(slot.type)}`,
            severity: needsInput ? "needs_fix" : "info",
            sourceReferences: [`template:${template.summary.templateId}`],
            targetTab: "sources",
        };
    });
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
    const stableEntryDate = new Date(Date.UTC(1980, 0, 1, 0, 0, 0));
    const writeFile = (path: string, content: string) => {
        const safePath = path.replace(/^\/+/, "");
        if (writtenPaths.has(safePath)) return;
        writtenPaths.add(safePath);
        zip.file(`${rootFolder}/${safePath}`, content, { date: stableEntryDate });
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

    const generatedBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
    });
    const blob = generatedBlob.type === "application/zip"
        ? generatedBlob
        : generatedBlob.slice(0, generatedBlob.size, "application/zip");
    return {
        blob,
        filename: campaignPackZipFilename(campaign),
    };
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
        exportCount: action === "download" || action === "export" || action === "archive_export"
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

const prependCampaignCueSourceInput = (
    items: CampaignCueSourceInput[],
    item: CampaignCueSourceInput,
) => {
    const next = [item, ...items.filter((existing) => existing.id !== item.id)];
    const pattern = next.find((source) => source.sourceType === "inspiration_pattern");
    const businessInputs = next.filter((source) => source.sourceType !== "inspiration_pattern").slice(0, CAMPAIGNCUE_PAGE_SIZE);
    return pattern ? [pattern, ...businessInputs] : businessInputs;
};

const prependCampaignCueSourceInputs = (
    items: CampaignCueSourceInput[],
    incoming: CampaignCueSourceInput[],
) => {
    const incomingIds = new Set(incoming.map((sourceInput) => sourceInput.id));
    const next = [...incoming, ...items.filter((sourceInput) => !incomingIds.has(sourceInput.id))];
    const pattern = next.find((source) => source.sourceType === "inspiration_pattern");
    const businessInputs = next
        .filter((source) => source.sourceType !== "inspiration_pattern")
        .slice(0, CAMPAIGNCUE_PAGE_SIZE);
    return pattern ? [pattern, ...businessInputs] : businessInputs;
};

const replaceBounded = <T extends { id: string }>(items: T[], item: T, limit: number) => {
    const exists = items.some((existing) => existing.id === item.id);
    const next = exists
        ? items.map((existing) => (existing.id === item.id ? item : existing))
        : [item, ...items];
    return next.slice(0, limit);
};

const withFreshDailyDesk = (overview: CampaignCueOverview): CampaignCueOverview => {
    const campaigns = overview.campaigns.map((campaign) => {
        const pack = campaign.pack;
        if (!pack) return campaign;
        const freshness = pack.freshness;
        const currentPatternHash = overview.workspace.patternCueSource?.patternCue?.sourceHash;
        const patternChanged = Boolean(
            pack.patternCueSourceHash
            && pack.patternCueSourceHash !== currentPatternHash,
        );
        const businessFactsChanged = Boolean(
            freshness?.sourceHash
            && overview.sourceHash
            && freshness.sourceHash !== overview.sourceHash,
        );
        if (!patternChanged && !businessFactsChanged) return campaign;
        const resolvedFreshness = evaluateCampaignCuePackFreshness({
            currentSourceHash: overview.sourceHash,
            freshness,
        });
        return {
            ...campaign,
            pack: {
                ...pack,
                freshness: {
                    ...resolvedFreshness,
                    status: "stale" as const,
                },
            },
        };
    });
    const current = { ...overview, campaigns };
    const campaignMemory = buildCampaignCueCampaignMemoryView(resolveCampaignCueCampaignMemorySummary({
        analytics: overview.analytics,
        campaigns,
    }));
    return {
        ...current,
        campaignMemory,
        dailyDesk: buildCampaignCueDailyDesk({
        analytics: overview.analytics,
        assets: overview.assets,
        businessBrain: overview.businessBrain,
        campaigns,
        locations: overview.locations,
        opportunities: overview.opportunities,
        schedules: overview.schedules,
        sourceFacts: overview.sourceFacts,
        sourceInputs: overview.sourceInputs,
        workspace: overview.workspace,
        }),
    };
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

const aiAssistIconForStage = (stage: CampaignCueAIAssistItem["stage"]): ComponentType<{ size?: number }> => {
    if (stage === "source_intake" || stage === "missing_input") return LuFileText;
    if (stage === "pack_drafting") return LuPackageCheck;
    if (stage === "trust_explainer") return LuShieldCheck;
    if (stage === "result_interpreter") return LuClipboardCheck;
    if (stage === "photo_coach") return LuCamera;
    return LuSparkles;
};

function AIAssistancePlan({
    onOpenTarget,
    plan,
}: {
    onOpenTarget: (target: CampaignCueWorkspaceTabKey) => void;
    plan: CampaignCueOverview["dailyDesk"]["aiAssistance"];
}) {
    return (
        <div className={styles.grid}>
            <article className={styles.provider}>
                <div className={styles.row}>
                    <div className={styles.titleBlock}>
                        <h3>Assistant boundary</h3>
                        <p>{plan.providerPolicy.summary}</p>
                    </div>
                    <span className={styles.chip} data-tone={ownerStatusTone(plan.status)}>
                        {ownerStatusLabel(plan.status)}
                    </span>
                </div>
                <div className={styles.noteBox}>
                    <strong>No extra Firebase or model cost</strong>
                    <p>{plan.costPolicy.summary}</p>
                </div>
                <button className={styles.ghostButton} onClick={() => onOpenTarget(plan.nextBestAction.targetTab as CampaignCueWorkspaceTabKey)} type="button">
                    {plan.nextBestAction.label}
                    <LuArrowRight size={16} />
                </button>
            </article>
            {plan.items.map((item) => {
                const Icon = aiAssistIconForStage(item.stage);
                return (
                    <article className={styles.provider} key={item.id}>
                        <div className={styles.rowStart}>
                            <div className={styles.iconBox}>
                                <Icon size={18} />
                            </div>
                            <div className={styles.titleBlock}>
                                <h3>{item.label}</h3>
                                <p>{item.ownerValue}</p>
                            </div>
                        </div>
                        <div className={styles.chips}>
                            <span className={styles.chip} data-tone={ownerStatusTone(item.status)}>
                                {ownerStatusLabel(item.status)}
                            </span>
                            <span className={styles.chip}>{displayLabel(item.authority)}</span>
                            <span className={styles.chip}>{item.providerCallAllowed ? "Provider call" : "No provider call"}</span>
                        </div>
                        <div className={styles.noteBox}>
                            <strong>{item.currentInput}</strong>
                            <p>{item.suggestedAction}</p>
                        </div>
                        <button className={styles.ghostButton} onClick={() => onOpenTarget(item.targetTab as CampaignCueWorkspaceTabKey)} type="button">
                            Open {displayLabel(item.targetTab)}
                            <LuArrowRight size={16} />
                        </button>
                    </article>
                );
            })}
        </div>
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
    archiveBusy,
    busy,
    campaign,
    disabled,
    disabledReason,
    onArchive,
    onDownloadArchive,
    onDownload,
    outputPack,
}: {
    archiveBusy?: boolean;
    busy: boolean;
    campaign?: CampaignCueCampaign;
    disabled?: boolean;
    disabledReason?: string;
    onArchive?: () => void;
    onDownloadArchive?: () => void;
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
                <span className={styles.chip} data-tone={ownerStatusTone(outputPack.readiness.status)}>
                    {ownerStatusLabel(outputPack.readiness.status)}
                </span>
            </div>
            <div className={styles.statusGrid}>
                <StatCard label="Pack readiness" value={`${outputPack.readiness.score}/100`} />
                <StatCard label="Ready files" value={counts.ready} />
                <StatCard label="Needs input" value={counts.needsInput} />
                <StatCard label="Needs review" value={counts.needsReview} />
                <StatCard label="Blocked" value={counts.blocked} />
            </div>
            <div className={styles.detailStack}>
                {outputPack.decision.outputIntent ? (
                    <div className={styles.noteBox}>
                        <strong>Requested output focus: {outputPack.decision.outputIntent.title}</strong>
                        <p>{outputPack.decision.outputIntent.requestedOutputTypes.map(displayLabel).join(", ")}</p>
                    </div>
                ) : null}
                <div className={styles.noteBox}>
                    <strong>Pack readiness: {ownerStatusLabel(outputPack.readiness.status)}</strong>
                    <p>{outputPack.readiness.summary}</p>
                    <div className={styles.chips}>
                        {outputPack.readiness.checks.map((check) => (
                            <span className={styles.chip} data-tone={ownerStatusTone(check.status)} key={check.id} title={check.detail}>
                                {check.label}: {check.points}/20
                            </span>
                        ))}
                    </div>
                    <p>This measures completeness and safety, not predicted engagement or reach.</p>
                </div>
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
                    <strong>Current facts and commercial safety</strong>
                    <p>
                        Truth receipt: {displayLabel(outputPack.freshness.status)}. Commercial check: {displayLabel(outputPack.commercialSafety.status)}.
                    </p>
                    {outputPack.commercialSafety.findings[0] ? <p>{outputPack.commercialSafety.findings[0]}</p> : null}
                </div>
                <div className={styles.noteBox}>
                    <strong>Local presence and languages</strong>
                    <p>{outputPack.presencePassport.profiles.filter((profile) => profile.status === "ready").length} owner-managed destinations are saved.</p>
                    <p>{outputPack.language.targetLocales.length ? `Review variants for ${outputPack.language.targetLocales.join(", ")}.` : "No local-language variant is requested."}</p>
                </div>
                <div className={styles.noteBox}>
                    <strong>Staff handoff and next test</strong>
                    <p>{outputPack.staffExecution.steps[0] || outputPack.staffExecution.completionPrompt}</p>
                    <p>{outputPack.learning.instruction}</p>
                </div>
                <div className={styles.noteBox}>
                    <strong>Result memory</strong>
                    <p>{outputPack.resultMemory.question}</p>
                </div>
                <div className={styles.noteBox}>
                    <strong>Campaign rhythm</strong>
                    <p>{outputPack.rhythm.title}: {outputPack.rhythm.detail}</p>
                    <p>{outputPack.rhythm.followUp}</p>
                </div>
            </div>
            {disabled && disabledReason ? (
                <p className={styles.muted}>{disabledReason}</p>
            ) : null}
            <div className={styles.topActions}>
                <button className={styles.button} disabled={busy || disabled} onClick={onDownload} type="button">
                    <LuDownload size={16} />
                    Download campaign pack ZIP
                </button>
                {onArchive ? (
                    <button className={styles.ghostButton} disabled={archiveBusy || disabled} onClick={onArchive} type="button">
                        <LuUploadCloud size={16} />
                        {campaign?.exportArchive ? "Replace cloud copy" : "Save cloud copy"}
                    </button>
                ) : null}
                {campaign?.exportArchive && onDownloadArchive ? (
                    <button className={styles.ghostButton} disabled={archiveBusy} onClick={onDownloadArchive} type="button">
                        <LuDownload size={16} />
                        Download saved copy
                    </button>
                ) : null}
            </div>
            {onArchive ? (
                <p className={styles.muted}>
                    CampaignCue exposes one current cloud copy and uses two rotating storage slots. Access uses a short-lived download link.
                </p>
            ) : null}
        </article>
    );
}

function HostedOfferPageCard({
    busy,
    campaign,
    disabled,
    disabledReason,
    expiresAtLabel,
    onCopy,
    onDownloadQr,
    onMutate,
    onOpen,
}: {
    busy: boolean;
    campaign: CampaignCueCampaign;
    disabled?: boolean;
    disabledReason?: string;
    expiresAtLabel: string;
    onCopy: () => void;
    onDownloadQr: () => void;
    onMutate: (action: "publish" | "unpublish") => void;
    onOpen: () => void;
}) {
    const offerPage = campaign.pack?.offerPage;
    const expiryTime = offerPage?.expiresAt ? Date.parse(String(offerPage.expiresAt)) : Number.NaN;
    const isLive = offerPage?.status === "published" && Number.isFinite(expiryTime) && expiryTime > Date.now();
    return (
        <article className={styles.provider}>
            <div className={styles.row}>
                <div className={styles.titleBlock}>
                    <h3>Hosted offer page and QR</h3>
                    <p>One short, checked destination for printed QR cards and manual channel handoff.</p>
                </div>
                <span className={styles.chip} data-tone={isLive ? "green" : offerPage ? "amber" : undefined}>
                    {isLive ? "Live" : offerPage ? "Not live" : "Not published"}
                </span>
            </div>
            <div className={styles.noteBox}>
                <strong>{isLive ? `Available until ${expiresAtLabel || "the pack expires"}` : "Owner-controlled publishing"}</strong>
                <p>{CAMPAIGNCUE_OFFER_PAGE_COPY.noTracking}</p>
            </div>
            {disabled && disabledReason ? <p className={styles.muted}>{disabledReason}</p> : null}
            <div className={styles.topActions}>
                {isLive ? (
                    <>
                        <button className={styles.ghostButton} disabled={busy} onClick={onOpen} type="button">
                            <LuExternalLink size={16} />
                            {CAMPAIGNCUE_OFFER_PAGE_COPY.open}
                        </button>
                        <button className={styles.ghostButton} disabled={busy} onClick={onCopy} type="button">
                            <LuClipboardCheck size={16} />
                            {CAMPAIGNCUE_OFFER_PAGE_COPY.copy}
                        </button>
                        <button className={styles.ghostButton} disabled={busy} onClick={onDownloadQr} type="button">
                            <LuDownload size={16} />
                            {CAMPAIGNCUE_OFFER_PAGE_COPY.downloadQr}
                        </button>
                        <button className={styles.dangerButton} disabled={busy} onClick={() => onMutate("unpublish")} type="button">
                            <LuX size={16} />
                            {CAMPAIGNCUE_OFFER_PAGE_COPY.unpublish}
                        </button>
                    </>
                ) : (
                    <button className={styles.button} disabled={busy || disabled} onClick={() => onMutate("publish")} type="button">
                        <LuExternalLink size={16} />
                        {CAMPAIGNCUE_OFFER_PAGE_COPY.publish}
                    </button>
                )}
            </div>
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
                    <span className={styles.chip}>Recommendation fit {decision.score.finalScore}/100</span>
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
                {decision.commercialGate ? (
                    <div className={styles.noteBox}>
                        <strong>Commercial safety: {ownerStatusLabel(decision.commercialGate.status)}</strong>
                        <p>{decision.commercialGate.findings[0] || "Promotion, discount, stock, and capacity rules are clear."}</p>
                    </div>
                ) : null}
                {decision.experiment ? (
                    <div className={styles.noteBox}>
                        <strong>Change one thing next: {displayLabel(decision.experiment.variable)}</strong>
                        <p>{decision.experiment.instruction}</p>
                    </div>
                ) : null}
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
        appleBusinessConnectUrl: "",
        avoidList: "",
        bookingUrl: "",
        brandFeel: "",
        businessState: "normal",
        businessType: "restaurant",
        capacityStatus: "unknown",
        currencyCode: "INR",
        discountApprovalRequired: true,
        discountsAllowed: true,
        doNotPromote: "",
        facebookUrl: "",
        googleBusinessProfileUrl: "",
        googleReviewUrl: "",
        inspirationNotes: "",
        instagramUrl: "",
        locale: CAMPAIGNCUE_DEFAULT_LOCALE,
        localMoment: "",
        locality: "",
        logoUrl: "",
        maxDiscountPercent: "",
        minimumPromotedPrice: "",
        multiLocationMode: false,
        name: "",
        phone: "",
        primaryColor: CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
        productFocus: "",
        promotionsAllowed: true,
        publicMenuUrl: "",
        pulseNote: "",
        pulseValidUntil: "",
        stockStatus: "unknown",
        targetLocales: "",
        targetAudience: "",
        timezone: CAMPAIGNCUE_DEFAULT_TIMEZONE,
        typographyNotes: "",
        visualMotifs: "",
        voice: "friendly",
        website: "",
        whatsapp: "",
        whatsappCatalogUrl: "",
    });
    const [sourceDraft, setSourceDraft] = useState({
        expiresAt: "",
        label: "",
        sourceType: "manual_note",
        status: "needs_review",
        value: "",
    });
    const [campaignInboxDraft, setCampaignInboxDraft] = useState("");
    const [campaignInboxReview, setCampaignInboxReview] = useState<CampaignCueInboxParseResult | null>(null);
    const [campaignInboxSelectedIds, setCampaignInboxSelectedIds] = useState<string[]>([]);
    const [inspirationDraft, setInspirationDraft] = useState({
        durationSeconds: "",
        label: "",
        ownerTakeaway: "",
        platform: "other",
        rightsStatus: "reference_only",
        sourceUrl: "",
        transcriptOrNotes: "",
    });
    const [locationDraft, setLocationDraft] = useState({
        contacts: {
            bookingUrl: "",
            phone: "",
            publicMenuUrl: "",
            website: "",
            whatsapp: "",
        },
        locality: "",
        name: "",
        status: "draft",
    });
    const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
    const [assetDraft, setAssetDraft] = useState({
        name: "",
        assetType: "image",
        consentType: "unknown",
        rightsNote: "",
        rightsStatus: "needs_review",
        tags: "",
    });
    const [mediaCaptureConsentType, setMediaCaptureConsentType] = useState<CampaignCueMediaConsentType | "">("");
    const [mediaCaptureMission, setMediaCaptureMission] = useState<{ recipeId: string; task: string } | null>(null);
    const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
    const assetCapturePanelRef = useRef<HTMLDivElement | null>(null);
    const mediaCameraInputRef = useRef<HTMLInputElement | null>(null);
    const mediaLibraryInputRef = useRef<HTMLInputElement | null>(null);
    const cueLayerUploadInputRef = useRef<HTMLInputElement | null>(null);
    const cueLayerAutosaveTimeoutRef = useRef<number | null>(null);
    const cueLayerLastSavedFingerprintRef = useRef("");
    const cueLayerListRequestRef = useRef(0);
    const cueLayerSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
    const cueLayerSessionRef = useRef(0);
    const activeCueLayerDesignRef = useRef<CampaignCueCueLayerDesign | null>(null);
    const activeCueLayerRevisionRef = useRef<number | null>(null);
    const packTemplateRequestRef = useRef(0);
    const mutationIdempotencyKeysRef = useRef(new Map<string, string>());
    const getMutationIdempotencyKey = (prefix: string, requestFingerprint: string) => {
        const existing = mutationIdempotencyKeysRef.current.get(requestFingerprint);
        if (existing) return existing;
        const key = buildIdempotencyKey(prefix);
        mutationIdempotencyKeysRef.current.set(requestFingerprint, key);
        return key;
    };
    const settleMutationIdempotencyKey = <T,>(
        requestFingerprint: string,
        result: CampaignCueWorkspaceResponseResult<T>,
    ) => {
        if (isCampaignCueMutationOutcomeAuthoritative(result)) {
            mutationIdempotencyKeysRef.current.delete(requestFingerprint);
        }
    };
    const [cueLayerDesigns, setCueLayerDesigns] = useState<CampaignCueCueLayerDesign[]>([]);
    const [activeCueLayerDesign, setActiveCueLayerDesign] = useState<CampaignCueCueLayerDesign | null>(null);
    const [activeCueLayerRevision, setActiveCueLayerRevision] = useState<number | null>(null);
    const [editorDraftDocument, setEditorDraftDocument] = useState<CreativeEditorDocument | null>(null);
    const [editorDocument, setEditorDocument] = useState<CreativeEditorDocument | null>(null);
    const [editorContext, setEditorContext] = useState<CampaignCueEditorContext | null>(null);
    const [editorSourceLabel, setEditorSourceLabel] = useState("Blank asset");
    const [outcomeDraft, setOutcomeDraft] = useState("");
    const [approvalDecisionNote, setApprovalDecisionNote] = useState("");
    const [approvalCommentDrafts, setApprovalCommentDrafts] = useState<Record<string, string>>({});
    const [selectedOutcomeSignalId, setSelectedOutcomeSignalId] = useState<string | undefined>();
    const [resultReceiptDraft, setResultReceiptDraft] = useState({
        bookings: "",
        calls: "",
        experimentVariable: "",
        linkClicks: "",
        orders: "",
        replies: "",
        usedAt: "",
        walkIns: "",
    });
    const [resultEvidenceDraft, setResultEvidenceDraft] = useState({
        callClicks: "",
        directionRequests: "",
        impressions: "",
        linkClicks: "",
        messages: "",
        note: "",
        periodEnd: "",
        periodStart: "",
        profileViews: "",
        provider: "google_business_profile",
        reach: "",
        scope: "location_window",
        websiteClicks: "",
    });
    const [staffTaskDraft, setStaffTaskDraft] = useState({
        assigneeLabel: "",
        scheduledAt: "",
        taskType: "post",
    });
    const [scheduleCampaignId, setScheduleCampaignId] = useState<string | undefined>();
    const [resultCampaignId, setResultCampaignId] = useState<string | undefined>();
    const [packTemplateState, setPackTemplateState] = useState<PackTemplateState>({ loading: false });
    const data = state.data;
    const campaignCueThemeVars = useMemo(() => getCampaignCueThemeVars(token), [token]);
    const visibleWorkspaceTabs = useMemo(() => (
        CAMPAIGNCUE_WORKSPACE_TABS.filter((item) => isCampaignCueWorkspaceTabEnabled(item.key))
    ), []);
    const openWorkspaceTab = (target: CampaignCueWorkspaceTabKey) => {
        setTab(isCampaignCueWorkspaceTabEnabled(target) ? target : getCampaignCueFallbackTab(target));
    };
    const activeTabDefinition = useMemo(() => (
        visibleWorkspaceTabs.find((item) => item.key === tab) || visibleWorkspaceTabs[0]
    ), [tab, visibleWorkspaceTabs]);
    const activeTabLabel = tChrome(CAMPAIGNCUE_TAB_TRANSLATION_KEYS[activeTabDefinition.key]);
    const sidebarOffset = isCollapsed && !sidebarShellExpanded
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : DASHBOARD_SIDEBAR_EXPANDED_WIDTH;
    const sessionUser = session?.user;
    const sessionUserId = String(session?.uId || sessionUser?.id || "");
    const userLoginLabel = sessionUser?.displayEmail
        || sessionUser?.phone
        || sessionUser?.phoneUsername
        || sessionUser?.email
        || "CampaignCue account";
    const userData = {
        email: String(sessionUser?.email || userLoginLabel || ""),
        image: String(sessionUser?.image || ""),
        name: String(sessionUser?.name || "CampaignCue owner"),
    };
    const userInitials = getUserInitials(userData.name, userLoginLabel);
    const currentWorkspaceMember = data?.workspace.members?.[sessionUserId];
    const currentWorkspaceRole = currentWorkspaceMember?.role;
    const campaignCueNavItems = useMemo<DashboardSidebarShellItem[]>(() => {
        const groups = visibleWorkspaceTabs.reduce((groupMap, item) => {
            const items = groupMap.get(item.group) || [];
            items.push(item);
            groupMap.set(item.group, items);
            return groupMap;
        }, new Map<typeof CAMPAIGNCUE_WORKSPACE_TABS[number]["group"], typeof CAMPAIGNCUE_WORKSPACE_TABS[number][]>());

        return Array.from(groups.entries()).map(([group, items]) => {
            const firstItem = items[0];
            const activeItem = items.find((item) => item.key === tab);
            return {
                active: false,
                expanded: Boolean(activeItem),
                icon: firstItem.icon,
                key: group,
                label: tChrome(CAMPAIGNCUE_GROUP_TRANSLATION_KEYS[group]),
                onClick: () => setTab((activeItem || firstItem).key),
                subNavActive: Boolean(activeItem),
                subNav: items.map((item) => ({
                    active: item.key === tab,
                    icon: item.icon,
                    key: item.key,
                    label: tChrome(CAMPAIGNCUE_TAB_TRANSLATION_KEYS[item.key]),
                    onClick: () => setTab(item.key),
                })),
            };
        });
    }, [tChrome, tab, visibleWorkspaceTabs]);
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
        const requestId = ++packTemplateRequestRef.current;
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PACK_TEMPLATE_REGISTRY || !overview) return;
        if (!campaignCueCanManageWorkspaceContent(overview.workspace.members?.[sessionUserId]?.role)) {
            if (requestId === packTemplateRequestRef.current) setPackTemplateState({ loading: false });
            return;
        }
        setPackTemplateState((current) => ({ ...current, error: undefined, loading: true }));
        try {
            const catalog = await listCampaignCuePackTemplates({
                businessCategory: (overview.businessBrain as CampaignCueOverview["businessBrain"] & { businessCategory?: string }).businessCategory,
                businessType: overview.businessBrain.businessType,
                includeWorkspaceTemplates: true,
                workspaceId: overview.workspace.workspaceId,
            });
            if (requestId === packTemplateRequestRef.current) {
                setPackTemplateState({ catalog, loading: false });
            }
        } catch (error) {
            if (requestId !== packTemplateRequestRef.current) return;
            setPackTemplateState((current) => ({
                ...current,
                error: getCampaignCueWorkspaceFailureNotice(error, "Templates could not be loaded."),
                loading: false,
            }));
        }
    };

    const loadMorePackTemplates = async () => {
        const catalog = packTemplateState.catalog;
        const catalogId = catalog?.platformOverflowDocIds[0];
        if (!catalog || !catalogId || !data || packTemplateState.loadingMore) return;
        const requestId = packTemplateRequestRef.current;
        setPackTemplateState((current) => ({ ...current, error: undefined, loadingMore: true }));
        try {
            const platformTemplates = await loadCampaignCuePackTemplateOverflow({
                businessCategory: catalog.businessCategory,
                catalogId,
                workspaceId: data.workspace.workspaceId,
            });
            setPackTemplateState((current) => {
                if (
                    requestId !== packTemplateRequestRef.current
                    || !current.catalog
                    || current.catalog.businessCategory !== catalog.businessCategory
                ) {
                    return { ...current, loadingMore: false };
                }
                const templatesById = new Map(current.catalog.platformTemplates.map((template) => [template.templateId, template]));
                platformTemplates.forEach((template) => templatesById.set(template.templateId, template));
                return {
                    ...current,
                    catalog: {
                        ...current.catalog,
                        platformOverflowDocIds: current.catalog.platformOverflowDocIds.filter((id) => id !== catalogId),
                        platformTemplates: Array.from(templatesById.values()),
                    },
                    loadingMore: false,
                };
            });
        } catch (error) {
            if (requestId !== packTemplateRequestRef.current) return;
            setPackTemplateState((current) => ({
                ...current,
                error: getCampaignCueWorkspaceFailureNotice(error, "More templates could not be loaded."),
                loadingMore: false,
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
        currentWorkspaceRole,
        sessionUserId,
    ]);

    useEffect(() => {
        if (!data || !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS) return;
        void loadCueLayerDesigns();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentWorkspaceRole, data?.workspace.workspaceId]);

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
        const currentPath = window.location.pathname.replace(/\/+$/, "") || "/";
        const isLocalCampaignCuePath = currentPath === CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX
            || currentPath.startsWith(`${CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX}/`);
        setPublicSiteHref(isLocalCampaignCuePath ? CAMPAIGNCUE_LOCAL_DEV_PATH_PREFIX : "/");
    }, []);

    useEffect(() => {
        if (tab !== "assets" || !mediaCaptureMission) return;
        const frame = window.requestAnimationFrame(() => {
            assetCapturePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [mediaCaptureMission, tab]);

    const updateOverview = (updater: (current: CampaignCueOverview) => CampaignCueOverview) => {
        setState((current) => (
            current.data
                ? { ...current, data: withFreshDailyDesk(updater(current.data)), loading: false }
                : current
        ));
    };

    const loadCueLayerDesigns = async () => {
        const requestId = ++cueLayerListRequestRef.current;
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS) return;
        if (!campaignCueCanManageWorkspaceContent(currentWorkspaceRole)) {
            if (requestId === cueLayerListRequestRef.current) setCueLayerDesigns([]);
            return;
        }
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
            if (requestId === cueLayerListRequestRef.current && payload.ok) {
                setCueLayerDesigns(payload.data);
            }
        } catch {
            if (requestId === cueLayerListRequestRef.current) setCueLayerDesigns([]);
        }
    };

    const openCueLayerBootPackage = (boot: CampaignCueCueLayerBootPackage) => {
        cueLayerSessionRef.current += 1;
        activeCueLayerDesignRef.current = boot.design;
        activeCueLayerRevisionRef.current = boot.design.current.revision;
        setActiveCueLayerDesign(boot.design);
        setActiveCueLayerRevision(boot.design.current.revision);
        setEditorDocument(boot.document);
        setEditorDraftDocument(boot.document);
        cueLayerLastSavedFingerprintRef.current = fingerprintDocument(boot.document);
        setEditorSourceLabel(`CueLayers · ${boot.design.title}`);
        if (data) setEditorContext(buildCueLayersEditorContext(data, boot));
        setTab("editor");
    };

    const clearActiveCueLayerSession = () => {
        cueLayerSessionRef.current += 1;
        activeCueLayerDesignRef.current = null;
        activeCueLayerRevisionRef.current = null;
        setActiveCueLayerDesign(null);
        setActiveCueLayerRevision(null);
    };

    const openCueLayerDesign = async (designId: string) => {
        if (!campaignCueCanManageWorkspaceContent(currentWorkspaceRole)) {
            setNotice("Your workspace role cannot edit reusable images.");
            return;
        }
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

    const saveCueLayerDocumentNow = (documentValue: CreativeEditorDocument): Promise<number | null> => {
        const designAtRequest = activeCueLayerDesignRef.current;
        const sessionAtRequest = cueLayerSessionRef.current;
        if (!designAtRequest || activeCueLayerRevisionRef.current == null) {
            return Promise.resolve(activeCueLayerRevisionRef.current);
        }
        if (!campaignCueCanManageWorkspaceContent(currentWorkspaceRole)) {
            return Promise.reject(new Error("This workspace role cannot edit reusable images."));
        }
        if (cueLayerAutosaveTimeoutRef.current) {
            window.clearTimeout(cueLayerAutosaveTimeoutRef.current);
            cueLayerAutosaveTimeoutRef.current = null;
        }
        const saveOperation = async (): Promise<number | null> => {
            if (
                cueLayerSessionRef.current !== sessionAtRequest
                || activeCueLayerDesignRef.current?.id !== designAtRequest.id
            ) {
                return activeCueLayerRevisionRef.current;
            }
            const expectedRevision = activeCueLayerRevisionRef.current;
            if (expectedRevision == null) return null;
            const fingerprint = fingerprintDocument(documentValue);
            if (fingerprint === cueLayerLastSavedFingerprintRef.current) return expectedRevision;
            const requestFingerprint = `cue_layers_save:${designAtRequest.id}:${expectedRevision}:${fingerprint}`;
            const idempotencyKey = getMutationIdempotencyKey("cue_layers_save", requestFingerprint);
            const res = await fetch(getCampaignCueCueLayersAutosaveApiPath(designAtRequest.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    document: documentValue,
                    expectedRevision,
                    idempotencyKey,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "cue_layers_autosave",
                isCueLayerAutosaveData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) throw new Error("Reusable image could not be saved.");
            const revision = Number(payload.data.revision || expectedRevision);
            if (
                cueLayerSessionRef.current !== sessionAtRequest
                || activeCueLayerDesignRef.current?.id !== designAtRequest.id
            ) {
                return revision;
            }
            const design = payload.data.design;
            if (design?.id) {
                activeCueLayerDesignRef.current = design;
                setActiveCueLayerDesign(design);
                setCueLayerDesigns((current) => replaceBounded(current, design, CAMPAIGNCUE_PAGE_SIZE));
            }
            activeCueLayerRevisionRef.current = revision;
            setActiveCueLayerRevision(revision);
            cueLayerLastSavedFingerprintRef.current = fingerprint;
            return revision;
        };
        const queuedSave = cueLayerSaveQueueRef.current.then(saveOperation, saveOperation);
        cueLayerSaveQueueRef.current = queuedSave.then(() => undefined, () => undefined);
        return queuedSave;
    };

    const uploadCueLayerFile = async (file: File) => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD) return;
        if (!campaignCueCanManageWorkspaceContent(currentWorkspaceRole)) {
            setNotice("Your workspace role can review campaigns but cannot add reusable images.");
            return;
        }
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
            const requestFingerprint = `cue_layers_upload:${file.name}:${file.type}:${file.size}:${file.lastModified}`;
            const idempotencyKey = getMutationIdempotencyKey("cue_layers_upload", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CUE_LAYERS_UPLOADS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dataUrl,
                    fileName: file.name,
                    height: dimensions.height,
                    idempotencyKey,
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
            settleMutationIdempotencyKey(requestFingerprint, payload);
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
        if (!campaignCueCanManageWorkspaceContent(currentWorkspaceRole)) {
            setNotice("Your workspace role cannot change reusable images.");
            return;
        }
        setBusyKey("cue-layer-repair");
        setNotice("");
        try {
            const requestFingerprint = `cue_layers_repair:${activeCueLayerDesign.id}:${activeCueLayerRevision}:restore_fallback`;
            const idempotencyKey = getMutationIdempotencyKey("cue_layers_repair", requestFingerprint);
            const res = await fetch(getCampaignCueCueLayersRepairApiPath(activeCueLayerDesign.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correctionType: "restore_fallback",
                    expectedRevision: activeCueLayerRevision,
                    idempotencyKey,
                }),
            });
            const payload = await readCampaignCueWorkspaceData(res, "cue_layers_repair", isRecordData);
            settleMutationIdempotencyKey(requestFingerprint, payload);
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
        const operatingPulse = data.businessBrain.operatingPulse;
        const commercialPolicy = data.businessBrain.commercialPolicy;
        const presence = data.businessBrain.presence;
        setBusinessDraft({
            agencyMode: data.workspace.agencyMode,
            appleBusinessConnectUrl: presence.appleBusinessConnectUrl || "",
            avoidList: playbook.avoidList.join(", "),
            bookingUrl: data.businessBrain.contacts.bookingUrl || "",
            brandFeel: playbook.brandFeel.join(", "),
            businessState: operatingPulse.businessState,
            businessType: data.businessBrain.businessType,
            capacityStatus: operatingPulse.capacityStatus,
            currencyCode: commercialPolicy.currencyCode,
            discountApprovalRequired: commercialPolicy.discountApprovalRequired,
            discountsAllowed: commercialPolicy.discountsAllowed,
            doNotPromote: commercialPolicy.doNotPromote.join(", "),
            facebookUrl: presence.facebookUrl || "",
            googleBusinessProfileUrl: presence.googleBusinessProfileUrl || "",
            googleReviewUrl: presence.googleReviewUrl || "",
            inspirationNotes: playbook.inspirationNotes.join(", "),
            instagramUrl: presence.instagramUrl || "",
            locale: data.workspace.settings.locale || data.businessBrain.locale || CAMPAIGNCUE_DEFAULT_LOCALE,
            localMoment: operatingPulse.localMoment || "",
            locality: data.businessBrain.locality || "",
            logoUrl: data.businessBrain.brandKit.logoUrl || "",
            maxDiscountPercent: commercialPolicy.maxDiscountPercent == null ? "" : String(commercialPolicy.maxDiscountPercent),
            minimumPromotedPrice: commercialPolicy.minimumPromotedPrice == null ? "" : String(commercialPolicy.minimumPromotedPrice),
            multiLocationMode: data.workspace.multiLocationMode,
            name: data.businessBrain.name,
            phone: data.businessBrain.contacts.phone || "",
            primaryColor: data.businessBrain.brandKit.primaryColor || CAMPAIGNCUE_DEFAULT_PRIMARY_COLOR,
            productFocus: playbook.productFocus.join(", "),
            promotionsAllowed: commercialPolicy.promotionsAllowed,
            publicMenuUrl: data.businessBrain.contacts.publicMenuUrl || "",
            pulseNote: operatingPulse.note || "",
            pulseValidUntil: operatingPulse.validUntil
                ? toNativeDateTimeInputValue(operatingPulse.validUntil as DateLike, data.businessBrain.timezone)
                : "",
            stockStatus: operatingPulse.stockStatus,
            targetLocales: data.businessBrain.languagePolicy.targetLocales.join(", "),
            targetAudience: playbook.targetAudience || "",
            timezone: data.workspace.settings.timezone || data.businessBrain.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE,
            typographyNotes: playbook.typographyNotes || "",
            visualMotifs: playbook.visualMotifs.join(", "),
            voice: data.businessBrain.brandKit.voice,
            website: data.businessBrain.contacts.website || "",
            whatsapp: data.businessBrain.contacts.whatsapp || "",
            whatsappCatalogUrl: presence.whatsappCatalogUrl || "",
        });
    }, [data]);

    const latestCampaign = data?.campaigns?.[0];
    const latestGlobalCampaign = data?.campaigns.find((campaign) => (
        !campaign.locationId
        && !campaign.variantRootCampaignId
        && campaign.status !== "archived"
    ));
    const scheduleCampaign = data?.campaigns.find((campaign) => campaign.id === scheduleCampaignId) || latestCampaign;
    const resultCampaign = data?.campaigns.find((campaign) => campaign.id === resultCampaignId) || latestCampaign;
    const resultCampaignRecipe = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => (
        recipe.id === resultCampaign?.pack?.recipeId
    ));
    const resultOptions = resultCampaignRecipe?.resultOptions
        || data?.dailyDesk.readyPack?.resultOptions
        || data?.dailyDesk.resultPrompt?.resultOptions
        || data?.dailyDesk.recipe.resultOptions
        || [];
    const hasResultEvidenceMetrics = ([
        "impressions",
        "reach",
        "profileViews",
        "websiteClicks",
        "callClicks",
        "directionRequests",
        "messages",
        "linkClicks",
    ] as const).some((key) => resultEvidenceDraft[key].trim() !== "");
    const campaignMemoryRecipe = CAMPAIGNCUE_DAILY_DESK_RECIPES.find((recipe) => (
        recipe.id === data?.campaignMemory.topRecipe?.key
    ));
    const campaignMemoryChannel = data?.campaignMemory.topChannel
        ? CAMPAIGNCUE_CHANNEL_LABELS[data.campaignMemory.topChannel.key as CampaignCueChannel]
        : undefined;
    const approvalInboxEnabled = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_APPROVAL_COMMENT_INBOX;
    const canManageWorkspaceContent = campaignCueCanManageWorkspaceContent(currentWorkspaceRole);
    const canManageSomeCampaignOutput = campaignCueCanManageSomeCampaignOutput(currentWorkspaceRole);
    const canResolveCampaignApproval = approvalInboxEnabled && campaignCueCanResolveApproval(currentWorkspaceRole);
    const canCommentOnCampaignApproval = approvalInboxEnabled && campaignCueCanCommentOnApproval(currentWorkspaceRole);
    const canAcceptCampaignExperiment = campaignCueCanAcceptExperiment(currentWorkspaceRole);
    const canRecordResultEvidence = campaignCueCanRecordResultEvidence(currentWorkspaceRole);
    const resultEvidenceTodayKey = getStoreLocalDateKey(
        data?.workspace.settings.timezone || data?.businessBrain.timezone || CAMPAIGNCUE_DEFAULT_TIMEZONE,
    );
    const isCampaignActionBusy = (
        campaignId: string,
        action: CampaignCueActionType,
        outputId = "campaign",
    ) => busyKey === `${campaignId}:${action}:${outputId}`;
    const isCampaignApprovalBusy = (campaignId: string) => (
        Boolean(busyKey?.startsWith(`${campaignId}:request_approval:`))
        || Boolean(busyKey?.startsWith(`${campaignId}:approve:`))
        || Boolean(busyKey?.startsWith(`${campaignId}:reject:`))
        || Boolean(busyKey?.startsWith(`${campaignId}:add_approval_comment:`))
        || Boolean(busyKey?.startsWith(`${campaignId}:resolve_approval_comment:`))
    );
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

    const campaignCreationBlockedReason = (opportunityId?: string, recipeId?: string) => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_GENERATION) {
            return "Campaign pack creation is unavailable right now.";
        }
        if (!canManageWorkspaceContent) {
            return "Your workspace role can review campaign packs but cannot create or change them.";
        }
        const decisions = data?.dailyDesk.candidateDecisions || [];
        const decision = recipeId
            ? decisions.find((item) => item.recipeId === recipeId)
            : opportunityId
                ? decisions.find((item) => item.opportunityId === opportunityId)
                : data?.dailyDesk.decision;
        if (!decision || decision.decisionStatus === "ready_to_prepare") return "";
        const firstMissingInput = decision.missingInputs.find((input) => input.required) || decision.missingInputs[0];
        if (firstMissingInput?.ownerQuestion) return firstMissingInput.ownerQuestion;
        if (decision.decisionStatus === "blocked") return "Review blocked campaign risk before creating this pack.";
        return "Confirm required campaign details before creating this pack.";
    };

    const decisionForOutputIntent = (intent?: CampaignCueOutputPickerItem): CampaignCueDecision | undefined => {
        if (!data || !intent || intent.id === "recommended_pack" || !intent.ownerGoals.length) {
            return data?.dailyDesk.decision;
        }
        const matching = data.dailyDesk.candidateDecisions.filter((decision) => (
            campaignCueOutputIntentSupportsOwnerGoal(intent, decision.ownerGoal)
        ));
        return matching.find((decision) => decision.decisionStatus === "ready_to_prepare") || matching[0];
    };

    const createCampaign = async (
        opportunityId?: string,
        templateDraft?: {
            brief: string;
            channels: CampaignCueChannel[];
            outputIntentId?: CampaignCueOutputPickerItem["id"];
            sourceTemplateId?: string;
            templateId: string;
            title: string;
        },
        reuseCampaignId?: string,
    ) => {
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role can review campaign packs but cannot create or change them.");
            return;
        }
        const reuseSource = reuseCampaignId
            ? data?.campaigns.find((campaign) => campaign.id === reuseCampaignId)
            : undefined;
        const blockedReason = campaignCreationBlockedReason(opportunityId, reuseSource?.pack?.recipeId);
        if (blockedReason) {
            setNotice(blockedReason);
            openWorkspaceTab((data?.dailyDesk.summary.targetTab as CampaignCueWorkspaceTabKey | undefined) || "sources");
            return;
        }
        setBusyKey(
            reuseCampaignId
                ? `cue-reuse:${reuseCampaignId}`
                : templateDraft ? `cue-template:${templateDraft.templateId}` : `cue:${opportunityId || "default"}`,
        );
        setNotice("");
        try {
            const requestIdentity = {
                brief: templateDraft?.brief,
                channels: templateDraft?.channels,
                opportunityId,
                outputIntentId: templateDraft?.outputIntentId,
                reuseCampaignId,
                sourceTemplateId: templateDraft?.sourceTemplateId,
                title: templateDraft?.title,
            };
            const requestFingerprint = `create:${JSON.stringify(requestIdentity)}`;
            const idempotencyKey = getMutationIdempotencyKey("create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CAMPAIGNS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...requestIdentity,
                    idempotencyKey,
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
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Campaign pack could not be created.");
                return;
            }
            setNotice(
                reuseCampaignId
                    ? "Campaign pack rebuilt from current checked facts."
                    : templateDraft ? "Campaign pack created from reusable base." : "Campaign pack created.",
            );
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
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot change Business Brain facts.");
            return;
        }
        setBusyKey("business");
        setNotice("");
        try {
            const {
                appleBusinessConnectUrl,
                businessState,
                capacityStatus,
                currencyCode,
                discountApprovalRequired,
                discountsAllowed,
                doNotPromote,
                facebookUrl,
                googleBusinessProfileUrl,
                googleReviewUrl,
                instagramUrl,
                localMoment,
                maxDiscountPercent,
                minimumPromotedPrice,
                promotionsAllowed,
                pulseNote,
                pulseValidUntil,
                stockStatus,
                targetLocales,
                whatsappCatalogUrl,
                ...businessFields
            } = businessDraft;
            const requestPayload = {
                ...businessFields,
                commercialPolicy: {
                    currencyCode,
                    discountApprovalRequired,
                    discountsAllowed,
                    doNotPromote,
                    maxDiscountPercent: maxDiscountPercent.trim() ? Number(maxDiscountPercent) : null,
                    minimumPromotedPrice: minimumPromotedPrice.trim() ? Number(minimumPromotedPrice) : null,
                    promotionsAllowed,
                },
                operatingPulse: {
                    businessState,
                    capacityStatus,
                    localMoment,
                    note: pulseNote,
                    stockStatus,
                    validUntil: parseDateTimeLocal(pulseValidUntil, businessDraft.timezone) || null,
                },
                presence: {
                    appleBusinessConnectUrl,
                    facebookUrl,
                    googleBusinessProfileUrl,
                    googleReviewUrl,
                    instagramUrl,
                    whatsappCatalogUrl,
                },
                targetLocales,
            };
            const requestFingerprint = `business_patch:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("business_patch", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.WORKSPACE, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData<Partial<CampaignCueOverview>>(
                res,
                "business_details_save",
                isRecordData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
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
                    sourceHash: result.sourceHash || current.sourceHash,
                    sourceFacts: result.sourceFacts || current.sourceFacts,
                    workspace: result.workspace as CampaignCueOverview["workspace"],
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const createSourceInput = async () => {
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot add campaign source facts.");
            return;
        }
        setBusyKey("source");
        setNotice("");
        try {
            const requestPayload = {
                ...sourceDraft,
                expiresAt: parseDateTimeLocal(sourceDraft.expiresAt, businessDraft.timezone) || undefined,
            };
            const requestFingerprint = `source_input_create:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("source_input_create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.SOURCES, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "source_input_create",
                (value): value is CampaignCueSourceInput => isRecord(value) && typeof value.id === "string",
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Source input could not be saved.");
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
                    sourceHash: `changed:${sourceInput.id}`,
                    sourceInputs: prependCampaignCueSourceInput(current.sourceInputs, sourceInput),
                }));
            }
        } finally {
            setBusyKey(null);
        }
    };

    const reviewCampaignInbox = () => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CAMPAIGN_INBOX) return;
        const review = parseCampaignCueInboxText(campaignInboxDraft);
        setCampaignInboxReview(review);
        setCampaignInboxSelectedIds(
            review.candidates
                .filter((candidate) => candidate.destination === "source_input")
                .map((candidate) => candidate.id),
        );
        if (review.blocked) {
            setNotice(review.notices[0] || "Review this update before saving.");
            return;
        }
        const sourceCount = review.candidates.filter((candidate) => candidate.destination === "source_input").length;
        const businessCount = review.candidates.length - sourceCount;
        setNotice(
            `${review.candidates.length} detail${review.candidates.length === 1 ? "" : "s"} ready to review${businessCount ? `; ${businessCount} belongs in Business details` : ""}.`,
        );
    };

    const toggleCampaignInboxCandidate = (candidateId: string) => {
        setCampaignInboxSelectedIds((selectedIds) => (
            selectedIds.includes(candidateId)
                ? selectedIds.filter((selectedId) => selectedId !== candidateId)
                : [...selectedIds, candidateId]
        ));
    };

    const routeCampaignInboxBusinessCandidate = (candidate: CampaignCueInboxCandidate) => {
        const patch = campaignCueInboxCandidateToBusinessPatch(candidate);
        if (!patch) return;
        setBusinessDraft((draft) => ({ ...draft, ...patch }));
        setTab("details");
        setNotice(`${candidate.label} added to Business details. Review and save it there.`);
    };

    const saveCampaignInbox = async () => {
        if (!campaignInboxReview || campaignInboxReview.blocked) return;
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot confirm Campaign Inbox facts.");
            return;
        }
        const candidates = campaignInboxReview.candidates
            .filter((candidate) => campaignInboxSelectedIds.includes(candidate.id))
            .map(campaignCueInboxCandidateToSourceInput)
            .filter((candidate): candidate is NonNullable<ReturnType<typeof campaignCueInboxCandidateToSourceInput>> => Boolean(candidate));
        if (!candidates.length) {
            setNotice("Select at least one campaign detail to save.");
            return;
        }
        setBusyKey("campaign-inbox");
        setNotice("");
        try {
            const requestPayload = { action: "confirm_inbox" as const, candidates };
            const requestFingerprint = `campaign_inbox_confirm:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("campaign_inbox_confirm", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.SOURCES, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "campaign_inbox_confirm",
                isCampaignCueInboxConfirmResultData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Campaign details could not be saved.");
                return;
            }
            updateOverview((current) => ({
                ...current,
                sourceFacts: payload.data.sourceSnapshot.facts,
                sourceHash: payload.data.sourceSnapshot.sourceHash,
                sourceInputs: prependCampaignCueSourceInputs(current.sourceInputs, payload.data.sourceInputs),
            }));
            setCampaignInboxDraft("");
            setCampaignInboxReview(null);
            setCampaignInboxSelectedIds([]);
            setNotice(`${payload.data.sourceInputs.length} campaign detail${payload.data.sourceInputs.length === 1 ? "" : "s"} saved.`);
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Campaign details could not be saved."));
        } finally {
            setBusyKey(null);
        }
    };

    const createInspirationPattern = async () => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE) return;
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot add example patterns.");
            return;
        }
        setBusyKey("inspiration-pattern");
        setNotice("");
        try {
            const requestPayload = {
                inspiration: {
                    durationSeconds: inspirationDraft.durationSeconds
                        ? Number(inspirationDraft.durationSeconds)
                        : undefined,
                    ownerTakeaway: inspirationDraft.ownerTakeaway || undefined,
                    platform: inspirationDraft.platform,
                    rightsStatus: inspirationDraft.rightsStatus,
                    sourceUrl: inspirationDraft.sourceUrl,
                    transcriptOrNotes: inspirationDraft.transcriptOrNotes,
                },
                label: inspirationDraft.label,
                sourceType: "inspiration_pattern",
                status: "active",
                value: inspirationDraft.sourceUrl,
            };
            const requestFingerprint = `source_input_create:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("source_input_create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.SOURCES, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "inspiration_pattern_create",
                (value): value is CampaignCueSourceInput => isRecord(value) && typeof value.id === "string" && isRecord(value.patternCue),
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Example pattern could not be prepared.");
                return;
            }
            setInspirationDraft({
                durationSeconds: "",
                label: "",
                ownerTakeaway: "",
                platform: "other",
                rightsStatus: "reference_only",
                sourceUrl: "",
                transcriptOrNotes: "",
            });
            setNotice("Example pattern ready for the next reel or creator brief.");
            const sourceInput = payload.data;
            updateOverview((current) => ({
                ...current,
                sourceInputs: prependCampaignCueSourceInput(current.sourceInputs, sourceInput),
                workspace: { ...current.workspace, patternCueSource: sourceInput },
            }));
        } finally {
            setBusyKey(null);
        }
    };

    const createLocation = async () => {
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot add locations.");
            return;
        }
        setBusyKey("location");
        setNotice("");
        try {
            const requestFingerprint = `location_create:${JSON.stringify(locationDraft)}`;
            const idempotencyKey = getMutationIdempotencyKey("location_create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.LOCATIONS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...locationDraft, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "location_create",
                (value): value is CampaignCueLocation => isRecord(value) && typeof value.id === "string",
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice("Location could not be saved.");
                return;
            }
            setLocationDraft({
                contacts: {
                    bookingUrl: "",
                    phone: "",
                    publicMenuUrl: "",
                    website: "",
                    whatsapp: "",
                },
                locality: "",
                name: "",
                status: "draft",
            });
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

    const createLocationVariants = async () => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_GENERATION) {
            setNotice("Branch pack creation is unavailable right now.");
            return;
        }
        if (!canManageSomeCampaignOutput) {
            setNotice("Your workspace role cannot prepare location campaign packs.");
            return;
        }
        if (!latestGlobalCampaign || !selectedLocationIds.length) {
            setNotice("Choose an original campaign pack and at least one active location.");
            return;
        }
        const locationIds = [...selectedLocationIds].sort((left, right) => left.localeCompare(right));
        setBusyKey("location-variants");
        setNotice("");
        try {
            const requestPayload = {
                baseCampaignId: latestGlobalCampaign.id,
                locationIds,
            };
            const requestFingerprint = `location_variants:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("location_variants", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.CAMPAIGN_VARIANTS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "location_variants",
                isCampaignCueLocationVariantBatchResultData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Branch packs could not be created.");
                return;
            }
            updateOverview((current) => {
                const createdIds = new Set(payload.data.campaigns.map((campaign) => campaign.id));
                return {
                    ...current,
                    campaigns: [
                        ...payload.data.campaigns,
                        ...current.campaigns.filter((campaign) => !createdIds.has(campaign.id)),
                    ].slice(0, CAMPAIGNCUE_PAGE_SIZE),
                };
            });
            setSelectedLocationIds([]);
            setNotice(`${payload.data.campaigns.length} branch pack${payload.data.campaigns.length === 1 ? "" : "s"} ready for independent review.`);
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
        commentId?: string,
    ) => {
        if (CAMPAIGNCUE_APPROVAL_INBOX_ACTIONS.has(action) && !approvalInboxEnabled) {
            setNotice("Campaign approval and comments are unavailable right now.");
            return;
        }
        if (
            !CAMPAIGNCUE_APPROVAL_INBOX_ACTIONS.has(action)
            && !campaignCueCanPerformCampaignOutputAction({
                action,
                locationId: campaign.locationId,
                member: currentWorkspaceMember,
            })
        ) {
            setNotice("Your workspace role cannot complete this campaign action.");
            return;
        }
        const key = `${campaign.id}:${action}:${output?.id || "campaign"}`;
        setBusyKey(key);
        setNotice("");
        try {
            const exportZip = action === "export" || action === "archive_export"
                ? await buildCampaignPackZipBlob(campaign, data?.dailyDesk)
                : null;
            const archiveUpload = action === "archive_export" && exportZip
                ? await uploadCampaignCueExportArchive({
                    blob: exportZip.blob,
                    campaignId: campaign.id,
                    filename: exportZip.filename,
                    workspaceId: campaign.workspaceId,
                })
                : null;
            if (archiveUpload?.status === "already_stored") {
                updateOverview((current) => ({
                    ...current,
                    campaigns: replaceBounded(current.campaigns, {
                        ...campaign,
                        exportArchive: archiveUpload.archive,
                    }, CAMPAIGNCUE_PAGE_SIZE),
                }));
                setNotice("The current Campaign Pack ZIP is already saved in CampaignCue.");
                return;
            }
            const resultMetrics = Object.fromEntries(
                (["replies", "calls", "bookings", "orders", "walkIns", "linkClicks"] as const)
                    .map((key) => [key, resultReceiptDraft[key].trim() ? Number(resultReceiptDraft[key]) : undefined] as const)
                    .filter(([, value]) => typeof value === "number" && Number.isFinite(value)),
            );
            const resultEvidenceMetrics = Object.fromEntries(
                ([
                    "impressions",
                    "reach",
                    "profileViews",
                    "websiteClicks",
                    "callClicks",
                    "directionRequests",
                    "messages",
                    "linkClicks",
                ] as const)
                    .map((metric) => [
                        metric,
                        resultEvidenceDraft[metric].trim() ? Number(resultEvidenceDraft[metric]) : undefined,
                    ] as const)
                    .filter(([, value]) => typeof value === "number" && Number.isSafeInteger(value)),
            );
            const scheduledAt = action === "schedule"
                ? parseDateTimeLocal(staffTaskDraft.scheduledAt, businessDraft.timezone) || undefined
                : undefined;
            const requestIdentity = {
                action,
                channel: output?.channel || campaign.channels[0],
                commentId: action === "resolve_approval_comment" ? commentId : undefined,
                locationId: CAMPAIGNCUE_APPROVAL_INBOX_ACTIONS.has(action) ? campaign.locationId : undefined,
                outputId: output?.id,
                scheduledAt,
                note: action === "schedule"
                    ? staffTaskDraft.assigneeLabel.trim()
                        ? `Manual CampaignCue task for ${staffTaskDraft.assigneeLabel.trim()}`
                        : "Manual CampaignCue task"
                    : action === "record_outcome"
                        ? noteOverride ?? outcomeDraft
                        : action === "approve" || action === "reject"
                            ? (noteOverride ?? approvalDecisionNote.trim()) || undefined
                            : action === "add_approval_comment"
                                ? noteOverride?.trim() || undefined
                            : undefined,
                resultSignalId: action === "record_outcome"
                    ? resultSignalId || selectedOutcomeSignalId
                    : undefined,
                resultReceipt: action === "record_outcome" ? {
                    evidenceNote: noteOverride ?? outcomeDraft,
                    experimentVariable: resultReceiptDraft.experimentVariable || undefined,
                    metrics: resultMetrics,
                    usedAt: parseDateTimeLocal(resultReceiptDraft.usedAt, businessDraft.timezone) || undefined,
                } : undefined,
                resultEvidence: action === "record_result_evidence" ? {
                    metrics: resultEvidenceMetrics,
                    note: resultEvidenceDraft.note.trim() || undefined,
                    periodEnd: resultEvidenceDraft.periodEnd,
                    periodStart: resultEvidenceDraft.periodStart,
                    provider: resultEvidenceDraft.provider,
                    scope: resultEvidenceDraft.scope,
                } : undefined,
                exportArchive: archiveUpload?.status === "uploaded" ? archiveUpload.finalize : undefined,
                staffAssignee: action === "schedule" ? staffTaskDraft.assigneeLabel : undefined,
                taskType: action === "schedule" ? staffTaskDraft.taskType : undefined,
            };
            const requestFingerprint = `campaign_action:${campaign.id}:${JSON.stringify(requestIdentity)}`;
            const idempotencyKey = getMutationIdempotencyKey(action, requestFingerprint);
            const res = await fetch(getCampaignCueCampaignActionApiPath(campaign.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...requestIdentity,
                    idempotencyKey,
                }),
            });
            const payload = await readCampaignCueWorkspaceData<{
                analytics?: CampaignCueOverview["analytics"];
                asset?: CampaignCueAsset;
                campaign?: CampaignCueCampaign | null;
                replayed?: boolean;
                schedule?: CampaignCueOverview["schedules"][number] | null;
            }>(
                res,
                "campaign_action_record",
                isRecordData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (payload.ok === false) {
                setNotice(("message" in payload && payload.message) || "Action could not be recorded.");
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
            } else if (action === "archive_export") {
                setNotice(campaign.exportArchive
                    ? "Cloud copy replaced. CampaignCue keeps at most two rotating archive objects for this campaign."
                    : "Cloud copy saved. You can download it again from CampaignCue.");
            } else if (action === "record_outcome") {
                setNotice("Result recorded.");
                setResultCampaignId(campaign.id);
                setSelectedOutcomeSignalId(undefined);
                setOutcomeDraft("");
                setResultReceiptDraft((current) => ({
                    ...current,
                    bookings: "",
                    calls: "",
                    experimentVariable: "",
                    linkClicks: "",
                    orders: "",
                    replies: "",
                    usedAt: "",
                    walkIns: "",
                }));
            } else if (action === "record_result_evidence") {
                setNotice("Report numbers saved as directional evidence.");
                setResultEvidenceDraft((current) => ({
                    ...current,
                    callClicks: "",
                    directionRequests: "",
                    impressions: "",
                    linkClicks: "",
                    messages: "",
                    note: "",
                    periodEnd: "",
                    periodStart: "",
                    profileViews: "",
                    reach: "",
                    websiteClicks: "",
                }));
            } else if (action === "approve") {
                setNotice("Campaign pack approved.");
                setApprovalDecisionNote("");
            } else if (action === "reject") {
                setNotice("Campaign pack rejected with review notes.");
                setApprovalDecisionNote("");
            } else if (action === "request_approval") {
                setNotice(payload.data.replayed ? "Approval is already waiting." : "Approval requested.");
            } else if (action === "add_approval_comment") {
                setApprovalCommentDrafts((current) => ({ ...current, [campaign.id]: "" }));
                setNotice("Review comment added.");
            } else if (action === "resolve_approval_comment") {
                setNotice("Review comment resolved.");
            } else if (action === "schedule") {
                setNotice("Manual campaign reminder scheduled.");
                setStaffTaskDraft((current) => ({ ...current, scheduledAt: "" }));
                setScheduleCampaignId(undefined);
            } else if (action === "accept_experiment") {
                setNotice(payload.data.replayed ? "This one-change test is already in use." : "One-change test accepted.");
            } else {
                setNotice("Action recorded.");
            }
            if (payload.data.campaign) {
                updateOverview((current) => {
                    const campaigns = replaceBounded(
                        current.campaigns,
                        payload.data.campaign as CampaignCueCampaign,
                        CAMPAIGNCUE_PAGE_SIZE,
                    );
                    const analytics = payload.data.analytics
                        || (
                            payload.data.replayed
                            || action === "accept_experiment"
                            || action === "record_result_evidence"
                                ? current.analytics
                                : bumpAnalytics(current, action)
                        );
                    return {
                        ...current,
                        analytics,
                        campaignMemory: buildCampaignCueCampaignMemoryView(resolveCampaignCueCampaignMemorySummary({
                            analytics,
                            campaigns,
                        })),
                        campaigns,
                        schedules: payload.data.schedule
                            ? prependBounded(current.schedules, payload.data.schedule, CAMPAIGNCUE_PAGE_SIZE)
                            : current.schedules,
                        assets: payload.data.asset
                            ? prependBounded(current.assets, payload.data.asset, CAMPAIGNCUE_PAGE_SIZE)
                            : current.assets,
                    };
                });
            }
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Action could not be completed."));
        } finally {
            setBusyKey(null);
        }
    };

    const registerAsset = async () => {
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot add Asset Library records.");
            return;
        }
        setBusyKey("asset");
        setNotice("");
        try {
            const requestPayload = {
                ...assetDraft,
                source: "manual",
                tags: assetDraft.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
            };
            const requestFingerprint = `asset_create:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("asset_create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "asset_register",
                (value): value is CampaignCueAsset => isRecord(value) && typeof value.id === "string",
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
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

    const uploadMissionMedia = async (file: File) => {
        if (!FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SECURE_MEDIA_CAPTURE) return;
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot upload photos or clips.");
            return;
        }
        if (!data) {
            setNotice("CampaignCue workspace is unavailable. Refresh before uploading.");
            return;
        }
        if (!mediaCaptureConsentType) {
            setNotice("Choose the permission status before adding a photo or clip.");
            return;
        }
        setBusyKey("media-capture-upload");
        setMediaUploadProgress(0);
        setNotice("");
        try {
            const asset = await uploadCampaignCueMediaAsset({
                allowedAssetTypes: ["image", "video"],
                consentType: mediaCaptureConsentType,
                file,
                missionTask: mediaCaptureMission?.task,
                onProgress: setMediaUploadProgress,
                recipeId: mediaCaptureMission?.recipeId,
                tags: ["asset-library"],
                workspaceId: data.workspace.workspaceId,
            });
            updateOverview((current) => ({
                ...current,
                assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
            }));
            setMediaCaptureConsentType("");
            setMediaCaptureMission(null);
            setNotice(asset.rights.status === "confirmed"
                ? "Photo or clip uploaded privately and ready to review."
                : "Photo or clip uploaded privately. Confirm permission before public use.");
        } catch (error) {
            setNotice(getCampaignCueMediaUploadFailureNotice(error));
        } finally {
            setBusyKey(null);
        }
    };

    const onMissionMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) await uploadMissionMedia(file);
    };

    const downloadAssetById = async (assetId: string, name: string) => {
        setBusyKey(`asset-download:${assetId}`);
        setNotice("");
        try {
            const res = await fetch(getCampaignCueAssetDownloadApiPath(assetId), {
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
            openDownloadUrl(url, name || "campaigncue-asset");
            setNotice("Asset download opened.");
        } finally {
            setBusyKey(null);
        }
    };

    const downloadAsset = async (asset: CampaignCueAsset) => {
        if (!asset.file?.downloadUrl && !asset.file?.storagePath) {
            setNotice("This asset does not have a downloadable file yet.");
            return;
        }
        await downloadAssetById(asset.id, asset.name);
    };

    const downloadCampaignArchive = async (campaign: CampaignCueCampaign) => {
        const archive = campaign.exportArchive;
        if (!archive) {
            setNotice("Save a cloud copy before downloading it again.");
            return;
        }
        await downloadAssetById(archive.assetId, archive.filename);
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
        && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CUE_LAYERS_UPLOAD
        && canManageWorkspaceContent;
    const secureMediaCaptureEnabled = FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SECURE_MEDIA_CAPTURE
        && canManageWorkspaceContent;

    const saveCurrentCampaignPackTemplate = async () => {
        if (!data || !latestCampaign) {
            setNotice("Create or open a campaign pack before saving it as a reusable base.");
            return;
        }
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot save reusable campaign pack bases.");
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
            const savedTemplate = await saveCampaignCueWorkspacePackTemplate(input);
            setNotice(savedTemplate.editorDocumentPath
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
        return intent.channels;
    };

    const createCampaignFromOutputIntent = (intent: CampaignCueOutputPickerItem) => {
        if (intent.id === "custom_size") {
            if (!creativeEditorEnabled) {
                setNotice("The creative editor is unavailable right now.");
                return;
            }
            openBlankCreativeEditor();
            return;
        }
        if (intent.id === "reuse_old_asset") {
            if (!cueLayersUploadEnabled) {
                setNotice("Old-image reuse is unavailable right now. You can still choose an existing ready asset.");
                setTab("assets");
                return;
            }
            cueLayerUploadInputRef.current?.click();
            return;
        }
        if (!data) return;
        const unresolvedRequirements = getUnresolvedCampaignCueOutputIntentRequirements(intent, {
            assets: data.assets,
            businessBrain: data.businessBrain,
            sourceFacts: data.sourceFacts,
            sourceInputs: data.sourceInputs,
        });
        if (unresolvedRequirements.length) {
            setNotice(unresolvedRequirements[0].ownerQuestion);
            openWorkspaceTab("sources");
            return;
        }
        const intentDecision = decisionForOutputIntent(intent);
        if (intent.ownerGoals.length && !intentDecision) {
            setNotice("This output does not match a current campaign opportunity for this business.");
            openWorkspaceTab("cues");
            return;
        }
        void createCampaign(intentDecision?.opportunityId, {
            brief: `${intent.title}: ${intent.description}`,
            channels: intent.channels.length ? intent.channels : data.dailyDesk.recipe.recommendedChannels || ["creative"],
            outputIntentId: intent.id,
            templateId: `output-intent-${intent.id}`,
            title: intent.title,
        });
    };

    const openCampaignCuePackTemplate = async (
        template: CampaignCuePackTemplateSummary,
        intent?: CampaignCueOutputPickerItem,
    ) => {
        if (!data) return;
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role can review campaign packs but cannot create one from a reusable base.");
            return;
        }
        const intentDecision = decisionForOutputIntent(intent);
        if (intent?.ownerGoals.length && !intentDecision) {
            setNotice("This output does not match a current campaign opportunity for this business.");
            openWorkspaceTab("cues");
            return;
        }
        const intentBlockedReason = intent && intent.id !== "recommended_pack" && intentDecision
            ? campaignCreationBlockedReason(intentDecision.opportunityId, intentDecision.recipeId)
            : "";
        if (intentBlockedReason) {
            setNotice(intentBlockedReason);
            openWorkspaceTab("sources");
            return;
        }
        setBusyKey(`pack-template-open:${template.templateId}`);
        setNotice("");
        try {
            const hydrated = await getCampaignCuePackTemplate(template, {
                workspaceId: data.workspace.workspaceId,
            });
            const unresolvedRequiredFactSlots = getUnresolvedCampaignCuePackTemplateFactSlots(
                hydrated.payload.factSlots,
                {
                    assets: data.assets,
                    businessBrain: data.businessBrain,
                    sourceFacts: data.sourceFacts,
                    sourceInputs: data.sourceInputs,
                },
            );
            const unresolvedIntentRequirements = intent && intent.id !== "recommended_pack"
                ? getUnresolvedCampaignCueOutputIntentRequirements(intent, {
                    assets: data.assets,
                    businessBrain: data.businessBrain,
                    sourceFacts: data.sourceFacts,
                    sourceInputs: data.sourceInputs,
                })
                : [];
            setNotice(summarizeCampaignCuePackTemplateApplication(hydrated, unresolvedRequiredFactSlots.length));
            if (unresolvedRequiredFactSlots.length || unresolvedIntentRequirements.length) {
                if (unresolvedIntentRequirements.length) {
                    setNotice(unresolvedIntentRequirements[0].ownerQuestion);
                }
                openWorkspaceTab("sources");
                return;
            }
            if (hydrated.editorDocument && creativeEditorEnabled) {
                const hydratedEditorDocument = hydrateCampaignCuePackTemplateEditorDocument({
                    businessFacts: {
                        brandKit: {
                            name: data.businessBrain.name,
                            primaryColor: data.businessBrain.brandKit.primaryColor,
                            voice: data.businessBrain.brandKit.voice,
                        },
                        contacts: data.businessBrain.contacts,
                        locality: data.businessBrain.locality,
                        name: data.businessBrain.name,
                    },
                    document: hydrated.editorDocument,
                    template,
                    workspaceId: data.workspace.workspaceId,
                });
                clearActiveCueLayerSession();
                setEditorDraftDocument(null);
                cueLayerLastSavedFingerprintRef.current = "";
                setEditorDocument(hydratedEditorDocument);
                setEditorContext(buildPackTemplateEditorContext(
                    data,
                    hydrated,
                    intent,
                    unresolvedRequiredFactSlots.map((slot) => slot.type),
                ));
                setEditorSourceLabel(`Template · ${template.title}`);
                setTab("editor");
                return;
            }
            await createCampaign(intentDecision?.opportunityId, {
                brief: intent && intent.id !== "recommended_pack"
                    ? `${template.description} Focus this pack on ${intent.title.toLowerCase()}.`
                    : template.description,
                channels: channelsForOutputIntent(intent, template.channels),
                outputIntentId: intent?.id === "recommended_pack" ? undefined : intent?.id,
                sourceTemplateId: template.templateId,
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
        if (!canManageWorkspaceContent) {
            setNotice("Your workspace role cannot create a new design.");
            return;
        }
        clearActiveCueLayerSession();
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
        if (!campaignCueCanManageCampaignLocation({
            locationId: campaign.locationId,
            member: currentWorkspaceMember,
        })) {
            setNotice("Your workspace role cannot edit this campaign output.");
            return;
        }
        clearActiveCueLayerSession();
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
        const linkedCampaign = result.document.metadata?.campaignId
            ? data.campaigns.find((campaign) => campaign.id === result.document.metadata?.campaignId)
            : undefined;
        if (!campaignCueCanRegisterAsset({
            locationId: linkedCampaign?.locationId,
            member: currentWorkspaceMember,
        })) {
            setNotice("Your workspace role cannot save this editor export.");
            return;
        }
        setBusyKey("editor-export");
        setNotice("");
        try {
            if (activeCueLayerDesign && activeCueLayerRevision != null) {
                if (result.format === "svg") {
                    setNotice("Use PNG export for reused images.");
                    return;
                }
                const savedRevision = await saveCueLayerDocumentNow(result.document);
                const requestIdentity = {
                    document: result.document,
                    format: result.format === "json" ? "json" : result.format,
                    mimeType: result.mimeType,
                    renderedDataUrl: result.dataUrl,
                    sizeBytes: result.sizeBytes,
                    sourceRevision: savedRevision ?? activeCueLayerRevision,
                };
                const requestFingerprint = `cue_layers_export:${activeCueLayerDesign.id}:${JSON.stringify(requestIdentity)}`;
                const idempotencyKey = getMutationIdempotencyKey("cue_layers_export", requestFingerprint);
                const res = await fetch(getCampaignCueCueLayersExportApiPath(activeCueLayerDesign.id), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...requestIdentity,
                        idempotencyKey,
                    }),
                });
                const payload = await readCampaignCueWorkspaceData<{
                    asset?: CampaignCueAsset;
                }>(
                    res,
                    "cue_layers_export",
                    isRecordData,
                );
                settleMutationIdempotencyKey(requestFingerprint, payload);
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
            const requestPayload = {
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
            };
            const requestFingerprint = `asset_create:${JSON.stringify(requestPayload)}`;
            const idempotencyKey = getMutationIdempotencyKey("asset_create", requestFingerprint);
            const res = await fetch(CAMPAIGNCUE_API_ROUTES.ASSETS, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...requestPayload, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                res,
                "creative_asset_save",
                (value): value is CampaignCueAsset => isRecord(value) && typeof value.id === "string",
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
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
                    <button className={styles.ghostButton} disabled={busyKey === "cue:default" || !canManageWorkspaceContent} onClick={() => createCampaign()} type="button">
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
                                    disabled={
                                        isCampaignActionBusy(campaign.id, "download", output.id)
                                        || campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)
                                        || !campaignCueCanPerformCampaignOutputAction({ action: "download", locationId: campaign.locationId, member: currentWorkspaceMember })
                                    }
                                    onClick={() => recordAction(campaign, "download", output)}
                                    title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                    type="button"
                                >
                                    <LuDownload size={16} />
                                    Download
                                </button>
                                {creativeEditorEnabled && campaignCueCanManageCampaignLocation({ locationId: campaign.locationId, member: currentWorkspaceMember }) ? (
                                    <button className={styles.ghostButton} onClick={() => openOutputCreativeEditor(campaign, output)} type="button">
                                        <LuImage size={16} />
                                        Open editor
                                    </button>
                                ) : null}
                                <button
                                    className={styles.ghostButton}
                                    disabled={
                                        campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)
                                        || !campaignCueCanPerformCampaignOutputAction({ action: "schedule", locationId: campaign.locationId, member: currentWorkspaceMember })
                                    }
                                    onClick={() => openScheduleCampaign(campaign)}
                                    title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                    type="button"
                                >
                                    <LuCalendarDays size={16} />
                                    Plan reminder
                                </button>
                                <button
                                    className={styles.ghostButton}
                                    disabled={!canRequestCampaignApproval(campaign, currentWorkspaceRole) || isCampaignApprovalBusy(campaign.id)}
                                    onClick={() => recordAction(campaign, "request_approval", output)}
                                    type="button"
                                >
                                    <LuUsers size={16} />
                                    {campaignApprovalActionLabel(campaign)}
                                </button>
                            </div>
                        </article>
                    ))}
                    {!rows.length ? (
                        <div className={styles.empty}>
                            <p>{copy?.empty || "No outputs yet."}</p>
                        </div>
                    ) : null}
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
    const openDeskTarget = (target: CampaignCueWorkspaceTabKey) => openWorkspaceTab(target);
    const runLocalVisibilityAction = (cue: CampaignCueLocalVisibilityCue) => {
        if (cue.actionKind === "create_visibility_pack") {
            void createCampaign("cue_local_visibility_refresh");
            return;
        }
        openDeskTarget(cue.targetTab as CampaignCueWorkspaceTabKey);
    };
    const openScheduleCampaign = (campaign: CampaignCueCampaign) => {
        setScheduleCampaignId(campaign.id);
        setTab("calendar");
    };
    const openResultCampaign = (campaign: CampaignCueCampaign) => {
        setResultCampaignId(campaign.id);
        setSelectedOutcomeSignalId(undefined);
        setOutcomeDraft("");
        setResultReceiptDraft({
            bookings: "",
            calls: "",
            experimentVariable: "",
            linkClicks: "",
            orders: "",
            replies: "",
            usedAt: "",
            walkIns: "",
        });
        openWorkspaceTab("analytics");
    };
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
    const mutateHostedOfferPage = async (campaign: CampaignCueCampaign, action: "publish" | "unpublish") => {
        const key = `${campaign.id}:offer-page:${action}`;
        setBusyKey(key);
        setNotice("");
        const requestFingerprint = [
            "offer_page",
            campaign.id,
            action,
            campaign.pack?.offerPage?.slug || "new",
            campaign.pack?.offerPage?.status || "none",
        ].join(":");
        try {
            const idempotencyKey = getMutationIdempotencyKey(`offer_page_${action}`, requestFingerprint);
            const response = await fetch(getCampaignCueOfferPageApiPath(campaign.id), {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, idempotencyKey }),
            });
            const payload = await readCampaignCueWorkspaceData(
                response,
                `offer_page_${action}`,
                isCampaignCueOfferPageMutationResultData,
            );
            settleMutationIdempotencyKey(requestFingerprint, payload);
            if (!payload.ok) {
                setNotice(("message" in payload && payload.message) || "Campaign page could not be updated.");
                return;
            }
            updateOverview((current) => ({
                ...current,
                campaigns: replaceBounded(current.campaigns, payload.data.campaign, CAMPAIGNCUE_PAGE_SIZE),
            }));
            setNotice(action === "publish"
                ? payload.data.replayed ? "Campaign page is already published." : "Campaign page published."
                : payload.data.replayed ? "Campaign page is already unpublished." : "Campaign page unpublished.");
        } catch (error) {
            setNotice(getCampaignCueWorkspaceFailureNotice(error, "Campaign page could not be updated."));
        } finally {
            setBusyKey(null);
        }
    };
    const openHostedOfferPage = (campaign: CampaignCueCampaign) => {
        const slug = campaign.pack?.offerPage?.slug;
        if (!slug) return;
        openIsolatedBrowserUrl(getCampaignCueHostedOfferUrl(slug));
    };
    const copyHostedOfferPage = async (campaign: CampaignCueCampaign) => {
        const slug = campaign.pack?.offerPage?.slug;
        if (!slug) return;
        await copyHandoffValue(getCampaignCueHostedOfferUrl(slug));
    };
    const downloadHostedOfferQr = async (campaign: CampaignCueCampaign) => {
        const slug = campaign.pack?.offerPage?.slug;
        if (!slug || !data) return;
        setBusyKey(`${campaign.id}:offer-page:qr`);
        setNotice("");
        try {
            const { buildQrCodeFilename, downloadQrCode, generateBrandedQrCodeDataUrl } = await import("@lib/utils/qrCode");
            const url = getCampaignCueHostedOfferUrl(slug);
            const dataUrl = await generateBrandedQrCodeDataUrl(url, {
                brandColor: data.businessBrain.brandKit.primaryColor,
                footer: url.replace(/^https?:\/\//, ""),
                storeName: data.businessBrain.name,
                subtitle: "Scan to open this campaign",
                title: campaign.title,
            });
            downloadQrCode(dataUrl, buildQrCodeFilename(`${data.businessBrain.name}-${campaign.title}`, "campaign-qr"));
            setNotice("Campaign QR downloaded.");
        } catch (error) {
            logRuntimeFailure("campaigncue_offer_qr_download_failed", error, {
                campaignId: campaign.id,
                surface: "campaigncue_workspace",
            });
            setNotice("Campaign QR could not be downloaded.");
        } finally {
            setBusyKey(null);
        }
    };
    const runDailyDeskPrimaryAction = () => {
        if (dailyDesk.summary.actionKind === "campaign_pack" && !dailyDesk.readyPack) {
            void createCampaign(primaryCreateOpportunityId);
            return;
        }
        if (dailyDesk.summary.actionKind === "result_memory" && dailyDesk.rhythm.resultCampaignId) {
            const campaign = data.campaigns.find((item) => item.id === dailyDesk.rhythm.resultCampaignId);
            if (campaign) {
                openResultCampaign(campaign);
                return;
            }
        }
        openDeskTarget(dailyDesk.summary.targetTab as CampaignCueWorkspaceTabKey);
    };
    const runCampaignRhythmAction = () => {
        const rhythm = dailyDesk.rhythm;
        if (rhythm.status === "reuse_ready" && rhythm.reuseCandidate) {
            void createCampaign(undefined, undefined, rhythm.reuseCandidate.campaignId);
            return;
        }
        if (rhythm.status === "approval_due" && rhythm.approvalCampaignId) {
            const campaign = data.campaigns.find((item) => item.id === rhythm.approvalCampaignId);
            if (campaign?.ownerApprovalState === "not_requested") {
                void recordAction(campaign, "request_approval");
                return;
            }
        }
        if (rhythm.status === "result_due" && rhythm.resultCampaignId) {
            const campaign = data.campaigns.find((item) => item.id === rhythm.resultCampaignId);
            if (campaign) {
                openResultCampaign(campaign);
                return;
            }
        }
        openDeskTarget(rhythm.primaryAction.targetTab as CampaignCueWorkspaceTabKey);
    };
    const editorPublicUseBlocked = Boolean(editorContext?.campaign && campaignBlocksPublicUse(editorContext.campaign, data?.workspace.agencyMode));
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
            disabled: editorPublicUseBlocked || isCampaignActionBusy(editorContext.campaign.id, "export"),
            icon: <LuDownload size={16} />,
            id: "campaigncue-download-pack",
            label: "Download pack",
            loading: isCampaignActionBusy(editorContext.campaign.id, "export"),
            onClick: () => recordAction(editorContext.campaign as CampaignCueCampaign, "export"),
            tone: "accent" as const,
        },
        {
            icon: <LuClipboardCheck size={16} />,
            id: "campaigncue-record-result",
            label: "Record result",
            onClick: () => openResultCampaign(editorContext.campaign as CampaignCueCampaign),
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
            {secureMediaCaptureEnabled ? (
                <>
                    <input
                        ref={mediaCameraInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        capture="environment"
                        hidden
                        onChange={onMissionMediaChange}
                        type="file"
                    />
                    <input
                        ref={mediaLibraryInputRef}
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
                        hidden
                        onChange={onMissionMediaChange}
                        type="file"
                    />
                </>
            ) : null}
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
                                        <Avatar size={32} src={userData.image}>
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
                                                disabled={dailyDesk.summary.actionKind === "campaign_pack" && (
                                                    !primaryCreateOpportunityId
                                                    || Boolean(primaryCreateBlockedReason)
                                                    || busyKey === `cue:${primaryCreateOpportunityId}`
                                                )}
                                                onClick={runDailyDeskPrimaryAction}
                                                title={primaryCreateBlockedReason || undefined}
                                                type="button"
                                            >
                                                <LuPackageCheck size={16} />
                                                {dailyDesk.summary.actionLabel}
                                            </button>
                                            <button className={styles.ghostButton} onClick={() => openWorkspaceTab("sources")} type="button">
                                                <LuFileText size={16} />
                                                {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_SOURCE_INTEGRATIONS
                                                    ? "Tell us what changed"
                                                    : "Review business details"}
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

                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_OPERATING_LOOP ? (
                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Owner pulse</span>
                                        <h2>What can the business handle right now?</h2>
                                        <p>One quick update keeps recommendations aligned with current stock, slots, capacity, and local context.</p>
                                    </div>
                                    <button className={styles.button} disabled={busyKey === "business" || !canManageWorkspaceContent} onClick={saveBusinessDetails} type="button">
                                        <LuCheck size={16} />
                                        Save pulse
                                    </button>
                                </div>
                                <div className={styles.panel}>
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-business-state">Business right now</label>
                                            <select className={styles.select} id="pulse-business-state" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, businessState: event.target.value }))} value={businessDraft.businessState}>
                                                <option value="normal">Running normally</option>
                                                <option value="quiet">Quiet, more demand is useful</option>
                                                <option value="busy">Busy, reduce demand</option>
                                                <option value="closed">Closed for this window</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-capacity">Slots or capacity</label>
                                            <select className={styles.select} id="pulse-capacity" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, capacityStatus: event.target.value }))} value={businessDraft.capacityStatus}>
                                                <option value="unknown">Not confirmed</option>
                                                <option value="available">Available</option>
                                                <option value="limited">Limited</option>
                                                <option value="full">Full</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-stock">Stock or promoted item</label>
                                            <select className={styles.select} id="pulse-stock" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, stockStatus: event.target.value }))} value={businessDraft.stockStatus}>
                                                <option value="unknown">Not confirmed</option>
                                                <option value="available">Available</option>
                                                <option value="low">Low</option>
                                                <option value="unavailable">Unavailable</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-valid-until">Keep this pulse until</label>
                                            <input className={styles.input} id="pulse-valid-until" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, pulseValidUntil: event.target.value }))} type="datetime-local" value={businessDraft.pulseValidUntil} />
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-local-moment">Local or seasonal moment</label>
                                            <input className={styles.input} id="pulse-local-moment" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, localMoment: event.target.value }))} placeholder="Example: festival weekend, rain, local event" value={businessDraft.localMoment} />
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="pulse-note">Short owner note</label>
                                            <input className={styles.input} id="pulse-note" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, pulseNote: event.target.value }))} placeholder="Example: two slots open after 4 PM" value={businessDraft.pulseNote} />
                                        </div>
                                    </div>
                                    <div className={styles.chips}>
                                        <span className={styles.chip} data-tone={dailyDesk.decision.commercialGate?.status === "blocked" ? "red" : dailyDesk.decision.commercialGate?.status === "needs_review" ? "amber" : "green"}>
                                            Commercial check: {displayLabel(dailyDesk.decision.commercialGate?.status || "ready")}
                                        </span>
                                        {dailyDesk.decision.experiment ? (
                                            <span className={styles.chip}>Next test: {displayLabel(dailyDesk.decision.experiment.variable)}</span>
                                        ) : null}
                                    </div>
                                </div>
                            </section>
                            ) : null}

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
                                        <span className={styles.eyebrow}>Campaign rhythm</span>
                                        <h2>{dailyDesk.rhythm.title}</h2>
                                        <p>{dailyDesk.rhythm.detail}</p>
                                    </div>
                                    <button
                                        className={styles.button}
                                        disabled={
                                            (dailyDesk.rhythm.status === "reuse_ready"
                                                && busyKey === `cue-reuse:${dailyDesk.rhythm.reuseCandidate?.campaignId || ""}`)
                                            || (dailyDesk.rhythm.status === "approval_due"
                                                && Boolean(dailyDesk.rhythm.approvalCampaignId)
                                                && isCampaignApprovalBusy(dailyDesk.rhythm.approvalCampaignId || ""))
                                        }
                                        onClick={runCampaignRhythmAction}
                                        type="button"
                                    >
                                        <LuRefreshCw size={16} />
                                        {dailyDesk.rhythm.primaryAction.label}
                                    </button>
                                </div>
                                <div className={styles.statusGrid}>
                                    <StatCard label="Due manual tasks" value={dailyDesk.rhythm.dueTaskCount} />
                                    <StatCard label="Scheduled next" value={dailyDesk.rhythm.scheduledTaskCount} />
                                    <StatCard
                                        label="Next time"
                                        value={formatCampaignCueDateTime(dailyDesk.rhythm.nextScheduledAt, formatter) || "Owner chooses"}
                                    />
                                    <StatCard label="Safe reuse" value={dailyDesk.rhythm.reuseCandidate ? "Available" : "Not yet"} />
                                </div>
                                <div className={styles.grid}>
                                    <div className={styles.noteBox}>
                                        <strong>Manual use window</strong>
                                        <p>{dailyDesk.rhythm.suggestedUse}</p>
                                    </div>
                                    <div className={styles.noteBox}>
                                        <strong>Follow-up</strong>
                                        <p>{dailyDesk.rhythm.followUp}</p>
                                    </div>
                                    <div className={styles.noteBox}>
                                        <strong>{dailyDesk.rhythm.reuseCandidate ? "Useful pack available" : "Reuse after a useful result"}</strong>
                                        <p>
                                            {dailyDesk.rhythm.reuseCandidate
                                                ? `${dailyDesk.rhythm.reuseCandidate.title}. ${dailyDesk.rhythm.reuseCandidate.reason}`
                                                : "Record an owner-observed result first. CampaignCue never recycles a pack automatically."}
                                        </p>
                                        {dailyDesk.rhythm.reuseCandidate?.positiveEvidence.length ? (
                                            <ul>
                                                {dailyDesk.rhythm.reuseCandidate.positiveEvidence.map((item) => <li key={item}>{item}</li>)}
                                            </ul>
                                        ) : null}
                                        {dailyDesk.rhythm.reuseCandidate ? (
                                            <div className={styles.chips}>
                                                <span className={styles.chip}>
                                                    {dailyDesk.rhythm.reuseCandidate.currentFit === "recommended_now" ? "Recommended now" : "Review timing"}
                                                </span>
                                                <span className={styles.chip}>
                                                    {campaignMemoryConfidenceLabel(dailyDesk.rhythm.reuseCandidate.confidence)}
                                                </span>
                                                {dailyDesk.rhythm.reuseCandidate.seasonalContext ? (
                                                    <span className={styles.chip}>Current moment: {dailyDesk.rhythm.reuseCandidate.seasonalContext}</span>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            </section>

                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_AI_ASSISTANCE_PLAN ? (
                                <section className={styles.section}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>AI assistance plan</span>
                                            <h2>Use AI where it removes owner work</h2>
                                            <p>CampaignCue can use AI for intake, draft wording, trust explanations, results, and photo coaching. The model does not choose campaigns, change protected facts, or post anywhere.</p>
                                        </div>
                                        <button className={styles.ghostButton} onClick={() => openDeskTarget(dailyDesk.aiAssistance.nextBestAction.targetTab as CampaignCueWorkspaceTabKey)} type="button">
                                            <LuSparkles size={16} />
                                            {dailyDesk.aiAssistance.nextBestAction.label}
                                        </button>
                                    </div>
                                    <AIAssistancePlan onOpenTarget={openDeskTarget} plan={dailyDesk.aiAssistance} />
                                </section>
                            ) : null}

                            <section className={styles.section}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>Missing input inbox</span>
                                        <h2>Answer only what the pack needs</h2>
                                        <p>CampaignCue keeps this short: current offer, date, price, photo rights, destination, or result detail when needed.</p>
                                    </div>
                                    <button className={styles.ghostButton} onClick={() => openWorkspaceTab("sources")} type="button">
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
                                                    disabled={isCampaignActionBusy(dailyDeskCampaign.id, "export") || campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode)}
                                                    onClick={() => recordAction(dailyDeskCampaign, "export")}
                                                    title={campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
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
                                                    disabled={isCampaignActionBusy(dailyDeskCampaign.id, "mark_used") || campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode)}
                                                    onClick={() => recordAction(dailyDeskCampaign, "mark_used")}
                                                    title={campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuCheck size={16} />
                                                    Mark used
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => openResultCampaign(dailyDeskCampaign)} type="button">
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
                                                disabled={!primaryCreateOpportunityId || Boolean(primaryCreateBlockedReason) || busyKey === `cue:${primaryCreateOpportunityId}`}
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
                                            archiveBusy={Boolean(dailyDeskCampaign && busyKey === `${dailyDeskCampaign.id}:archive_export:campaign`)}
                                            busy={Boolean(dailyDeskCampaign && busyKey === `${dailyDeskCampaign.id}:export:campaign`)}
                                            campaign={dailyDeskCampaign}
                                            disabled={campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode)}
                                            disabledReason={publicUseBlockedLabel}
                                            onArchive={FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE && dailyDeskCampaign
                                                ? () => recordAction(dailyDeskCampaign, "archive_export")
                                                : undefined}
                                            onDownloadArchive={dailyDeskCampaign?.exportArchive
                                                ? () => downloadCampaignArchive(dailyDeskCampaign)
                                                : undefined}
                                            onDownload={() => dailyDeskCampaign && recordAction(dailyDeskCampaign, "export")}
                                            outputPack={dailyDesk.packReview.outputPack}
                                        />
                                        {dailyDeskCampaign && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES ? (
                                            <HostedOfferPageCard
                                                busy={Boolean(busyKey?.startsWith(`${dailyDeskCampaign.id}:offer-page:`))}
                                                campaign={dailyDeskCampaign}
                                                disabled={campaignBlocksPublicUse(dailyDeskCampaign, data.workspace.agencyMode)}
                                                disabledReason={publicUseBlockedLabel}
                                                expiresAtLabel={formatCampaignCueDate(dailyDeskCampaign.pack?.offerPage?.expiresAt, formatter)}
                                                onCopy={() => void copyHostedOfferPage(dailyDeskCampaign)}
                                                onDownloadQr={() => void downloadHostedOfferQr(dailyDeskCampaign)}
                                                onMutate={(action) => void mutateHostedOfferPage(dailyDeskCampaign, action)}
                                                onOpen={() => openHostedOfferPage(dailyDeskCampaign)}
                                            />
                                        ) : null}
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
                                    busy={Boolean(
                                        busyKey?.startsWith("cue-template:")
                                        || busyKey?.startsWith("pack-template-open:"),
                                    )}
                                    canSaveCurrent={Boolean(latestCampaign) && canManageWorkspaceContent}
                                    error={packTemplateState.error}
                                    hasMoreTemplates={Boolean(packTemplateState.catalog?.platformOverflowDocIds.length)}
                                    loading={packTemplateState.loading}
                                    loadingMore={Boolean(packTemplateState.loadingMore)}
                                    onCreateFromOutputIntent={createCampaignFromOutputIntent}
                                    onLoadMore={loadMorePackTemplates}
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
                                            onAction={() => {
                                                setMediaCaptureMission(task.severity === "ready"
                                                    ? null
                                                    : { recipeId: dailyDesk.recipe.id, task: task.detail });
                                                openDeskTarget(task.targetTab as CampaignCueWorkspaceTabKey);
                                            }}
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
                                            onAction={() => runLocalVisibilityAction(cue)}
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
                                    <button className={styles.ghostButton} onClick={() => openWorkspaceTab("sources")} type="button">
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
                                            <ContextualStateIllustration color={token.colorPrimary} size={72} treatment="softHalo" variant="uploadContext" />
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
                                <button className={styles.button} disabled={busyKey === "business" || !businessDraft.name.trim() || !canManageWorkspaceContent} onClick={saveBusinessDetails} type="button">
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
                                    <div className={styles.fieldWide}>
                                        <div className={styles.noteBox}>
                                            <strong>Commercial safety</strong>
                                            <p>These rules can block an unsafe recommendation before a pack is created.</p>
                                        </div>
                                    </div>
                                    <label className={styles.toggleRow}>
                                        <input checked={businessDraft.promotionsAllowed} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, promotionsAllowed: event.target.checked }))} type="checkbox" />
                                        Promotional campaigns are allowed
                                    </label>
                                    <label className={styles.toggleRow}>
                                        <input checked={businessDraft.discountsAllowed} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, discountsAllowed: event.target.checked }))} type="checkbox" />
                                        Discount campaigns are allowed
                                    </label>
                                    <label className={styles.toggleRow}>
                                        <input checked={businessDraft.discountApprovalRequired} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, discountApprovalRequired: event.target.checked }))} type="checkbox" />
                                        Review every discount before use
                                    </label>
                                    <div className={styles.field}>
                                        <label htmlFor="business-max-discount">Maximum discount %</label>
                                        <input className={styles.input} id="business-max-discount" min="0" max="100" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, maxDiscountPercent: event.target.value }))} placeholder="Example: 20" type="number" value={businessDraft.maxDiscountPercent} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-min-price">Minimum promoted price</label>
                                        <input className={styles.input} id="business-min-price" min="0" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, minimumPromotedPrice: event.target.value }))} placeholder="Example: 499" type="number" value={businessDraft.minimumPromotedPrice} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="business-currency">Currency code</label>
                                        <input className={styles.input} id="business-currency" maxLength={3} onChange={(event) => setBusinessDraft((draft) => ({ ...draft, currencyCode: event.target.value.toUpperCase() }))} placeholder="INR" value={businessDraft.currencyCode} />
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="business-do-not-promote">Do not promote</label>
                                        <textarea className={styles.textarea} id="business-do-not-promote" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, doNotPromote: event.target.value }))} placeholder="Items, services, offers, or claims CampaignCue must never recommend" rows={3} value={businessDraft.doNotPromote} />
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
                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CAMPAIGN_INBOX ? (
                                <div className={`${styles.panel} ${styles.campaignInboxPanel}`}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>Campaign Inbox</span>
                                            <h3>Tell CampaignCue what changed</h3>
                                            <p>Use one line per detail. Nothing is saved until you review and confirm it.</p>
                                        </div>
                                        <button
                                            className={styles.button}
                                            disabled={!campaignInboxDraft.trim() || Boolean(busyKey)}
                                            onClick={reviewCampaignInbox}
                                            type="button"
                                        >
                                            <LuClipboardCheck size={16} />
                                            Review update
                                        </button>
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="campaign-inbox-draft">What changed?</label>
                                        <textarea
                                            aria-describedby="campaign-inbox-hint campaign-inbox-count"
                                            className={styles.textarea}
                                            id="campaign-inbox-draft"
                                            maxLength={CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH}
                                            onChange={(event) => {
                                                setCampaignInboxDraft(event.target.value);
                                                setCampaignInboxReview(null);
                                                setCampaignInboxSelectedIds([]);
                                            }}
                                            placeholder={"Offer: Weekend haircut package\nPrice: INR 799\nAvailability: Four Saturday slots\nEnds: Sunday at 6 PM"}
                                            rows={5}
                                            value={campaignInboxDraft}
                                        />
                                        <div className={styles.campaignInboxHintRow}>
                                            <p id="campaign-inbox-hint">Unlabelled text stays as a note. Contact and location details go to Business details.</p>
                                            <span id="campaign-inbox-count">{campaignInboxDraft.length} / {CAMPAIGNCUE_INBOX_MAX_DRAFT_LENGTH}</span>
                                        </div>
                                    </div>
                                    {campaignInboxReview ? (
                                        <div aria-live="polite" className={styles.campaignInboxReview}>
                                            {campaignInboxReview.notices.map((item) => (
                                                <p className={styles.campaignInboxNotice} data-blocked={campaignInboxReview.blocked} key={item}>{item}</p>
                                            ))}
                                            {campaignInboxReview.candidates.map((candidate) => {
                                                const sourceCandidate = candidate.destination === "source_input";
                                                const selected = campaignInboxSelectedIds.includes(candidate.id);
                                                const candidateDetails = (
                                                    <div className={styles.titleBlock}>
                                                        <h3>{candidate.label}</h3>
                                                        <p>{candidate.value}</p>
                                                        <span>{candidate.reason}</span>
                                                    </div>
                                                );
                                                return (
                                                    <div className={styles.campaignInboxCandidate} data-destination={candidate.destination} key={candidate.id}>
                                                        {sourceCandidate ? (
                                                            <label className={styles.campaignInboxCandidateMain}>
                                                                <input
                                                                    aria-label={`Save ${candidate.label}`}
                                                                    checked={selected}
                                                                    onChange={() => toggleCampaignInboxCandidate(candidate.id)}
                                                                    type="checkbox"
                                                                />
                                                                {candidateDetails}
                                                            </label>
                                                        ) : (
                                                            <div className={styles.campaignInboxCandidateMain}>
                                                                <LuShieldCheck aria-hidden="true" size={18} />
                                                                {candidateDetails}
                                                            </div>
                                                        )}
                                                        {sourceCandidate ? (
                                                            <span className={styles.chip} data-tone={candidate.recommendedStatus === "active" ? "green" : "amber"}>
                                                                {candidate.recommendedStatus === "active" ? "Ready to use" : "Needs review"}
                                                            </span>
                                                        ) : (
                                                            <button className={styles.ghostButton} onClick={() => routeCampaignInboxBusinessCandidate(candidate)} type="button">
                                                                Use in Business details
                                                                <LuArrowRight size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            <div className={styles.campaignInboxActions}>
                                                <button
                                                    className={styles.button}
                                                    disabled={
                                                        campaignInboxReview.blocked
                                                        || !campaignInboxSelectedIds.length
                                                        || Boolean(busyKey)
                                                        || !canManageWorkspaceContent
                                                    }
                                                    onClick={saveCampaignInbox}
                                                    type="button"
                                                >
                                                    <LuCheck size={16} />
                                                    Save selected details
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={Boolean(busyKey)}
                                                    onClick={() => {
                                                        setCampaignInboxReview(null);
                                                        setCampaignInboxSelectedIds([]);
                                                    }}
                                                    type="button"
                                                >
                                                    <LuRotateCcw size={16} />
                                                    Edit update
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                            <div className={styles.panel}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <h3>Add one detailed input</h3>
                                        <p>Use this form when you need a specific type, readiness state, or expiry time.</p>
                                    </div>
                                    <button className={styles.button} disabled={busyKey === "source" || !sourceDraft.label.trim() || !sourceDraft.value.trim() || !canManageWorkspaceContent} onClick={createSourceInput} type="button">
                                        <LuUpload size={16} />
                                        Save input
                                    </button>
                                </div>
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
                                        <p>For return-customer packs, describe the audience only. Do not paste customer names, phone numbers, email addresses, or contact lists.</p>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.sourceInputs.filter((source) => source.sourceType !== "inspiration_pattern").map((source: CampaignCueSourceInput) => {
                                    const current = isCampaignCueSourceInputCurrent(source);
                                    return (
                                        <div className={styles.assetRow} key={source.id}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}><LuFileText size={18} /></div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{source.label}</h3>
                                                    <p>{CAMPAIGNCUE_SOURCE_TYPE_LABELS[source.sourceType] || source.sourceType} · {source.value}</p>
                                                </div>
                                            </div>
                                            <span className={styles.chip} data-tone={current ? "green" : "amber"}>
                                                {current ? "ready to use" : source.status === "active" ? "expired" : displayLabel(source.status)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {!data.sourceInputs.some((source) => source.sourceType !== "inspiration_pattern") ? (
                                    <div className={styles.empty}>
                                        <ContextualStateIllustration color={token.colorPrimary} size={72} treatment="softHalo" variant="uploadContext" />
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
                                        <p>Use Download text, Download campaign pack ZIP, Plan reminder, Request approval, Mark used, and Record result. CampaignCue does not post to social platforms.</p>
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
                                        <>
                                            <OutputPackSummary
                                                archiveBusy={busyKey === `${dailyDeskCampaign.id}:archive_export:campaign`}
                                                busy={busyKey === `${dailyDeskCampaign.id}:export:campaign`}
                                                campaign={dailyDeskCampaign}
                                                disabled={campaignBlocksPublicUse(dailyDeskCampaign, data?.workspace.agencyMode)}
                                                disabledReason={publicUseBlockedLabel}
                                                onArchive={FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE
                                                    ? () => recordAction(dailyDeskCampaign, "archive_export")
                                                    : undefined}
                                                onDownloadArchive={dailyDeskCampaign.exportArchive
                                                    ? () => downloadCampaignArchive(dailyDeskCampaign)
                                                    : undefined}
                                                onDownload={() => recordAction(dailyDeskCampaign, "export")}
                                                outputPack={dailyDesk.packReview.outputPack}
                                            />
                                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_HOSTED_OFFER_PAGES ? (
                                                <HostedOfferPageCard
                                                    busy={Boolean(busyKey?.startsWith(`${dailyDeskCampaign.id}:offer-page:`))}
                                                    campaign={dailyDeskCampaign}
                                                    disabled={campaignBlocksPublicUse(dailyDeskCampaign, data.workspace.agencyMode)}
                                                    disabledReason={publicUseBlockedLabel}
                                                    expiresAtLabel={formatCampaignCueDate(dailyDeskCampaign.pack?.offerPage?.expiresAt, formatter)}
                                                    onCopy={() => void copyHostedOfferPage(dailyDeskCampaign)}
                                                    onDownloadQr={() => void downloadHostedOfferQr(dailyDeskCampaign)}
                                                    onMutate={(action) => void mutateHostedOfferPage(dailyDeskCampaign, action)}
                                                    onOpen={() => openHostedOfferPage(dailyDeskCampaign)}
                                                />
                                            ) : null}
                                        </>
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
                                <button className={styles.button} disabled={busyKey === "business" || !canManageWorkspaceContent} onClick={saveBusinessDetails} type="button">
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
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="settings-target-locales">Local-language pack variants</label>
                                        <input className={styles.input} id="settings-target-locales" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, targetLocales: event.target.value }))} placeholder="Example: hi-IN, kn-IN" value={businessDraft.targetLocales} />
                                        <p>CampaignCue prepares a protected-fact handoff. A person must review names, prices, dates, contacts, links, and offer terms before use.</p>
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
                                        <ContextualStateIllustration color={token.colorPrimary} size={72} treatment="softHalo" variant="feedbackContext" />
                                        <p>No ideas yet. Add a current offer, event, service, or menu link in Offers, events, and notes.</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "inspiration" && FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_PATTERN_CUE ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Use an example</span>
                                    <h2>Learn the format, not the content</h2>
                                    <p>Add one public example and your notes. CampaignCue prepares an original reel or creator brief from your checked business facts.</p>
                                </div>
                                <button
                                    className={styles.button}
                                    disabled={
                                        busyKey === "inspiration-pattern"
                                        || !inspirationDraft.label.trim()
                                        || !inspirationDraft.sourceUrl.trim()
                                        || inspirationDraft.transcriptOrNotes.trim().length < 20
                                        || !canManageWorkspaceContent
                                    }
                                    onClick={createInspirationPattern}
                                    type="button"
                                >
                                    <LuSparkles size={16} />
                                    Prepare pattern
                                </button>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="inspiration-label">Short title</label>
                                        <input
                                            className={styles.input}
                                            id="inspiration-label"
                                            maxLength={120}
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, label: event.target.value }))}
                                            placeholder="Example: Quick lunch reveal"
                                            value={inspirationDraft.label}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="inspiration-platform">Where you found it</label>
                                        <select
                                            className={styles.select}
                                            id="inspiration-platform"
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, platform: event.target.value }))}
                                            value={inspirationDraft.platform}
                                        >
                                            <option value="other">Detect from link</option>
                                            <option value="instagram">Instagram</option>
                                            <option value="tiktok">TikTok</option>
                                            <option value="youtube">YouTube</option>
                                        </select>
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="inspiration-url">Public example link</label>
                                        <input
                                            className={styles.input}
                                            id="inspiration-url"
                                            maxLength={1000}
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, sourceUrl: event.target.value }))}
                                            placeholder="https://www.instagram.com/reel/..."
                                            type="url"
                                            value={inspirationDraft.sourceUrl}
                                        />
                                        <p>Public HTTPS links only. CampaignCue does not monitor accounts, bypass platform access, or fetch private posts.</p>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="inspiration-duration">Approximate length</label>
                                        <input
                                            className={styles.input}
                                            id="inspiration-duration"
                                            max="600"
                                            min="1"
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, durationSeconds: event.target.value }))}
                                            placeholder="Seconds"
                                            type="number"
                                            value={inspirationDraft.durationSeconds}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="inspiration-rights">How the source may be used</label>
                                        <select
                                            className={styles.select}
                                            id="inspiration-rights"
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, rightsStatus: event.target.value }))}
                                            value={inspirationDraft.rightsStatus}
                                        >
                                            <option value="reference_only">Format reference only</option>
                                            <option value="owner_authorized">I control or may reuse the source</option>
                                        </select>
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="inspiration-notes">Transcript or format notes</label>
                                        <textarea
                                            className={styles.textarea}
                                            id="inspiration-notes"
                                            maxLength={12000}
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, transcriptOrNotes: event.target.value }))}
                                            placeholder="Describe the opening, shots, pacing, proof moment, and CTA. Do not paste private messages or customer contact data."
                                            value={inspirationDraft.transcriptOrNotes}
                                        />
                                        <p>These notes are analyzed during this request and are not stored. CampaignCue keeps only the compact format observation.</p>
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="inspiration-takeaway">What should CampaignCue learn?</label>
                                        <input
                                            className={styles.input}
                                            id="inspiration-takeaway"
                                            maxLength={320}
                                            onChange={(event) => setInspirationDraft((draft) => ({ ...draft, ownerTakeaway: event.target.value }))}
                                            placeholder="Example: The product appears in the first two seconds and the CTA is simple."
                                            value={inspirationDraft.ownerTakeaway}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.sourceInputs.filter((source) => source.sourceType === "inspiration_pattern" && source.patternCue).map((source) => (
                                    <article className={styles.campaign} key={source.id}>
                                        <div className={styles.row}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}><LuVideo size={18} /></div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{source.label}</h3>
                                                    <p>{source.patternCue?.summary}</p>
                                                </div>
                                            </div>
                                            <span className={styles.chip} data-tone={source.status === "active" ? "green" : "amber"}>
                                                {source.status === "active" ? "Ready for next reel" : "Needs review"}
                                            </span>
                                        </div>
                                        <div className={styles.chips}>
                                            <span className={styles.chip}>{displayLabel(source.patternCue?.platform)}</span>
                                            <span className={styles.chip}>{displayLabel(source.patternCue?.format)}</span>
                                            <span className={styles.chip}>{displayLabel(source.patternCue?.pacing)}</span>
                                            <span className={styles.chip}>{source.patternCue?.rightsStatus === "reference_only" ? "Format only" : "Owner authorized"}</span>
                                        </div>
                                        <div className={styles.noteBox}>
                                            <strong>Original hook options</strong>
                                            {source.patternCue?.candidateHooks.map((hook) => <p key={hook}>{hook}</p>)}
                                        </div>
                                        <div className={styles.row}>
                                            <p className={styles.muted}>The raw transcript is not saved. The next video or creator output uses this structure only.</p>
                                            <a className={styles.ghostButton} href={source.patternCue?.sourceUrl} rel="noopener noreferrer" target="_blank">
                                                <LuExternalLink size={16} />
                                                Open example
                                            </a>
                                        </div>
                                    </article>
                                ))}
                                {!data.sourceInputs.some((source) => source.sourceType === "inspiration_pattern" && source.patternCue) ? (
                                    <div className={styles.empty}>
                                        <ContextualStateIllustration color={token.colorPrimary} size={72} treatment="softHalo" variant="uploadContext" />
                                        <p>No saved examples yet. Add one useful public format instead of browsing hundreds of templates.</p>
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
                                    <p>{data.campaigns.length ? "Review each pack's trust, freshness, and approval state before manual use." : "Create your first pack from a campaign idea or saved business details."}</p>
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
                                            <div className={styles.chips}>
                                                <span className={styles.chip} data-tone={campaign.ownerApprovalState === "approved" ? "green" : campaign.ownerApprovalState === "rejected" ? "red" : campaign.ownerApprovalState === "requested" ? "amber" : undefined}>
                                                    Approval: {displayLabel(campaign.ownerApprovalState)}
                                                </span>
                                                {campaign.pack?.reusedFromCampaignId ? (
                                                    <span className={styles.chip}>Rebuilt from a useful pack</span>
                                                ) : null}
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
                                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_EXPERIMENT_COACH && campaign.pack?.experiment ? (
                                                <div className={styles.noteBox}>
                                                    <div className={styles.row}>
                                                        <div className={styles.titleBlock}>
                                                            <strong>Try one controlled change: {displayLabel(campaign.pack.experiment.variable)}</strong>
                                                            <p>{campaign.pack.experiment.instruction}</p>
                                                        </div>
                                                        <span
                                                            className={styles.chip}
                                                            data-tone={campaign.pack.experiment.status === "completed" ? "green" : campaign.pack.experiment.status === "accepted" ? "amber" : undefined}
                                                        >
                                                            {campaign.pack.experiment.status === "completed"
                                                                ? "Result recorded"
                                                                : campaign.pack.experiment.status === "accepted"
                                                                    ? "In use"
                                                                    : "Suggested"}
                                                        </span>
                                                    </div>
                                                    <p>{campaign.pack.experiment.reason}</p>
                                                    {campaign.pack.experiment.evidence?.length ? (
                                                        <ul>
                                                            {campaign.pack.experiment.evidence.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
                                                        </ul>
                                                    ) : null}
                                                    {campaign.pack.experiment.keepConstant?.length ? (
                                                        <p className={styles.muted}>
                                                            Keep unchanged: {campaign.pack.experiment.keepConstant.map(displayLabel).join(", ")}.
                                                        </p>
                                                    ) : null}
                                                    <div className={styles.chips}>
                                                        <span className={styles.chip}>
                                                            {campaign.pack.experiment.confidence === "owner_history" ? "Based on owner-reported history" : "Guidance only"}
                                                        </span>
                                                        {(campaign.pack.experiment.status || "suggested") === "suggested" ? (
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={
                                                                    !canAcceptCampaignExperiment
                                                                    || isCampaignActionBusy(campaign.id, "accept_experiment")
                                                                    || Boolean(data.workspace.agencyMode && campaign.ownerApprovalState !== "approved")
                                                                }
                                                                onClick={() => recordAction(campaign, "accept_experiment")}
                                                                title={!canAcceptCampaignExperiment
                                                                    ? "Your workspace role cannot choose this test."
                                                                    : data.workspace.agencyMode && campaign.ownerApprovalState !== "approved"
                                                                        ? "Approve this pack before using its test."
                                                                        : undefined}
                                                                type="button"
                                                            >
                                                                <LuClipboardCheck size={16} />
                                                                Use this test
                                                            </button>
                                                        ) : null}
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
                                                                disabled={
                                                                    busyKey === `${campaign.id}:download:${output.id}`
                                                                    || campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)
                                                                    || !campaignCueCanPerformCampaignOutputAction({ action: "download", locationId: campaign.locationId, member: currentWorkspaceMember })
                                                                }
                                                                onClick={() => recordAction(campaign, "download", output)}
                                                                title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                                type="button"
                                                            >
                                                                <LuDownload size={16} />
                                                                Download text
                                                            </button>
                                                            {creativeEditorEnabled && campaignCueCanManageCampaignLocation({ locationId: campaign.locationId, member: currentWorkspaceMember }) ? (
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
                                                    disabled={
                                                        campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)
                                                        || !campaignCueCanPerformCampaignOutputAction({ action: "schedule", locationId: campaign.locationId, member: currentWorkspaceMember })
                                                    }
                                                    onClick={() => openScheduleCampaign(campaign)}
                                                    title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuCalendarDays size={16} />
                                                    Plan reminder
                                                </button>
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={!canRequestCampaignApproval(campaign, currentWorkspaceRole) || isCampaignApprovalBusy(campaign.id)}
                                                    onClick={() => recordAction(campaign, "request_approval")}
                                                    type="button"
                                                >
                                                    <LuUsers size={16} />
                                                    {campaignApprovalActionLabel(campaign)}
                                                </button>
                                                {dailyDesk.rhythm.reuseCandidate?.campaignId === campaign.id ? (
                                                    <button
                                                        className={styles.ghostButton}
                                                        disabled={busyKey === `cue-reuse:${campaign.id}`}
                                                        onClick={() => createCampaign(undefined, undefined, campaign.id)}
                                                        type="button"
                                                    >
                                                        <LuRefreshCw size={16} />
                                                        Reuse safely
                                                    </button>
                                                ) : null}
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={busyKey === `${campaign.id}:export:campaign` || campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)}
                                                    onClick={() => recordAction(campaign, "export")}
                                                    title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuDownload size={16} />
                                                    Download campaign pack ZIP
                                                </button>
                                                {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CLOUD_EXPORT_ARCHIVE ? (
                                                    <button
                                                        className={styles.ghostButton}
                                                        disabled={busyKey === `${campaign.id}:archive_export:campaign` || campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)}
                                                        onClick={() => recordAction(campaign, "archive_export")}
                                                        title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                        type="button"
                                                    >
                                                        <LuUploadCloud size={16} />
                                                        {campaign.exportArchive ? "Replace cloud copy" : "Save cloud copy"}
                                                    </button>
                                                ) : null}
                                                {campaign.exportArchive ? (
                                                    <button
                                                        className={styles.ghostButton}
                                                        disabled={busyKey === `asset-download:${campaign.exportArchive.assetId}`}
                                                        onClick={() => downloadCampaignArchive(campaign)}
                                                        type="button"
                                                    >
                                                        <LuDownload size={16} />
                                                        Download saved copy
                                                    </button>
                                                ) : null}
                                                <button
                                                    className={styles.ghostButton}
                                                    disabled={isCampaignActionBusy(campaign.id, "mark_used") || campaignBlocksPublicUse(campaign, data?.workspace.agencyMode)}
                                                    onClick={() => recordAction(campaign, "mark_used")}
                                                    title={campaignBlocksPublicUse(campaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : undefined}
                                                    type="button"
                                                >
                                                    <LuCheck size={16} />
                                                    Mark used
                                                </button>
                                                <button className={styles.ghostButton} onClick={() => openResultCampaign(campaign)} type="button">
                                                    <LuCheckCircle2 size={16} />
                                                    Record result
                                                </button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.empty}>
                                    <ContextualStateIllustration color={token.colorPrimary} size={88} treatment="softHalo" variant="emptyWorkspace" />
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
                                    {creativeEditorEnabled && canManageWorkspaceContent ? (
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
                                                                disabled={busyKey === `cue-layer-open:${design.id}` || !canManageWorkspaceContent}
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
                    {tab === "video" ? (
                        <>
                            <CampaignCueVideoStudio
                                key={data.workspace.workspaceId}
                                assets={data.assets}
                                campaigns={data.campaigns}
                                onAssetRegistered={(asset) => updateOverview((current) => ({
                                    ...current,
                                    assets: prependBounded(current.assets, asset, CAMPAIGNCUE_PAGE_SIZE),
                                }))}
                                onNotice={setNotice}
                                workspaceMember={currentWorkspaceMember}
                                workspaceId={data.workspace.workspaceId}
                            />
                            {renderChannelStudio("video")}
                        </>
                    ) : null}
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
                                <div className={styles.topActions}>
                                    <button className={styles.ghostButton} disabled={busyKey === "business" || !canManageWorkspaceContent} onClick={saveBusinessDetails} type="button">
                                        <LuCheck size={16} />
                                        Save destinations
                                    </button>
                                    <button className={styles.ghostButton} disabled={busyKey === "cue:cue_local_visibility_refresh"} onClick={() => createCampaign("cue_local_visibility_refresh")} type="button">
                                        <LuSearch size={16} />
                                        Create visibility pack
                                    </button>
                                </div>
                            </div>
                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_LOCAL_VISIBILITY_ACTION_CENTER ? (
                                <div className={styles.panel}>
                                    <div className={styles.row}>
                                        <div className={styles.titleBlock}>
                                            <h3>What needs attention</h3>
                                            <p>Actions are derived from saved business truth, current inputs, approved assets, and existing Campaign Packs. CampaignCue does not inspect or update external profiles.</p>
                                        </div>
                                        <div className={styles.chips}>
                                            <span className={styles.chip} data-tone="red">
                                                {dailyDesk.localVisibilityCues.filter((cue) => cue.priority === "do_now").length} do now
                                            </span>
                                            <span className={styles.chip} data-tone="amber">
                                                {dailyDesk.localVisibilityCues.filter((cue) => cue.priority === "review").length} review
                                            </span>
                                            <span className={styles.chip} data-tone="green">
                                                {dailyDesk.localVisibilityCues.filter((cue) => cue.priority === "ready").length} ready
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-google-profile">Google Business Profile</label>
                                        <input className={styles.input} id="presence-google-profile" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, googleBusinessProfileUrl: event.target.value }))} placeholder="https://..." value={businessDraft.googleBusinessProfileUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-google-review">Customer review destination</label>
                                        <input className={styles.input} id="presence-google-review" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, googleReviewUrl: event.target.value }))} placeholder="Verified review link" value={businessDraft.googleReviewUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-apple">Apple Business Connect</label>
                                        <input className={styles.input} id="presence-apple" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, appleBusinessConnectUrl: event.target.value }))} placeholder="https://..." value={businessDraft.appleBusinessConnectUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-whatsapp-catalog">WhatsApp catalog</label>
                                        <input className={styles.input} id="presence-whatsapp-catalog" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, whatsappCatalogUrl: event.target.value }))} placeholder="Owner-managed catalog link" value={businessDraft.whatsappCatalogUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-instagram">Instagram</label>
                                        <input className={styles.input} id="presence-instagram" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, instagramUrl: event.target.value }))} placeholder="https://..." value={businessDraft.instagramUrl} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="presence-facebook">Facebook</label>
                                        <input className={styles.input} id="presence-facebook" onChange={(event) => setBusinessDraft((draft) => ({ ...draft, facebookUrl: event.target.value }))} placeholder="https://..." value={businessDraft.facebookUrl} />
                                    </div>
                                    <div className={styles.fieldWide}>
                                        <div className={styles.noteBox}>
                                            <strong>Manual presence passport</strong>
                                            <p>CampaignCue checks and packages these destinations. It does not connect, update, publish to, or send through them.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.topActions}>
                                <button className={styles.ghostButton} disabled={busyKey === "cue:cue_review_request"} onClick={() => createCampaign("cue_review_request")} type="button">
                                    <LuClipboardCheck size={16} />
                                    Prepare review request
                                </button>
                                <button className={styles.ghostButton} disabled={busyKey === "cue:cue_return_customer"} onClick={() => createCampaign("cue_return_customer")} type="button">
                                    <LuUsers size={16} />
                                    Prepare return-customer pack
                                </button>
                            </div>
                            <div className={styles.list}>
                                {dailyDesk.localVisibilityCues.map((cue) => (
                                    <article className={styles.campaign} key={cue.id}>
                                        <div className={styles.row}>
                                            <div className={styles.rowStart}>
                                                <div className={styles.iconBox}><LuSearch size={18} /></div>
                                                <div className={styles.titleBlock}>
                                                    <h3>{cue.label}</h3>
                                                    <p>{cue.detail}</p>
                                                </div>
                                            </div>
                                            <div className={styles.chips}>
                                                <span className={styles.chip}>{displayLabel(cue.category)}</span>
                                                <span className={styles.chip} data-tone={ownerStatusTone(cue.status)}>
                                                    {cue.priority === "do_now" ? "Do now" : cue.priority === "review" ? "Review" : "Ready"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.grid}>
                                            <div className={styles.noteBox}>
                                                <strong>Evidence</strong>
                                                <ul>
                                                    {(cue.evidence.length ? cue.evidence : ["No supporting item is saved yet."]).slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                                                </ul>
                                                <p className={styles.muted}>{cue.evidenceLevel === "business_truth" ? "From saved business truth" : "Derived readiness check"}</p>
                                            </div>
                                            <div className={styles.noteBox}>
                                                <strong>Manual next step</strong>
                                                <ul>
                                                    {cue.manualSteps.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
                                                </ul>
                                            </div>
                                            <div className={styles.noteBox}>
                                                <strong>What this unlocks</strong>
                                                <div className={styles.chips}>
                                                    {cue.unlocks.slice(0, 4).map((item) => <span className={styles.chip} key={item}>{item}</span>)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className={styles.topActions}>
                                            <button
                                                className={styles.ghostButton}
                                                disabled={cue.actionKind === "create_visibility_pack" && busyKey === "cue:cue_local_visibility_refresh"}
                                                onClick={() => runLocalVisibilityAction(cue)}
                                                type="button"
                                            >
                                                <LuArrowRight size={16} />
                                                {cue.actionLabel}
                                            </button>
                                        </div>
                                    </article>
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
                                    <h2>Manual campaign reminders</h2>
                                    <p>{data.schedules.length ? "Manual campaign reminders are ready." : "No reminders yet. Choose a pack and save a time when you plan to use it."}</p>
                                </div>
                                {scheduleCampaign ? (
                                    <button
                                        className={styles.button}
                                        disabled={
                                            !staffTaskDraft.scheduledAt
                                            || isCampaignActionBusy(scheduleCampaign.id, "schedule")
                                            || campaignBlocksPublicUse(scheduleCampaign, data?.workspace.agencyMode)
                                        }
                                        onClick={() => recordAction(scheduleCampaign, "schedule")}
                                        title={campaignBlocksPublicUse(scheduleCampaign, data?.workspace.agencyMode) ? publicUseBlockedLabel : !staffTaskDraft.scheduledAt ? "Choose a local date and time first." : undefined}
                                        type="button"
                                    >
                                        <LuCalendarDays size={16} />
                                        Save reminder
                                    </button>
                                ) : null}
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.row}>
                                    <div className={styles.rowStart}>
                                        <div className={styles.iconBox}><LuRefreshCw size={18} /></div>
                                        <div className={styles.titleBlock}>
                                            <h3>{dailyDesk.rhythm.title}</h3>
                                            <p>{dailyDesk.rhythm.detail}</p>
                                            <p>{dailyDesk.rhythm.followUp}</p>
                                        </div>
                                    </div>
                                    <span className={styles.chip} data-tone={dailyDesk.rhythm.status === "approval_due" ? "red" : dailyDesk.rhythm.status === "result_due" || dailyDesk.rhythm.status === "task_due" ? "amber" : "green"}>
                                        {displayLabel(dailyDesk.rhythm.status)}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.fieldWide}>
                                        <div className={styles.noteBox}>
                                            <strong>{scheduleCampaign ? `Scheduling: ${scheduleCampaign.title}` : "Choose a campaign pack"}</strong>
                                            <p>This creates a manual reminder only. CampaignCue does not post or send automatically.</p>
                                        </div>
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="staff-task-scheduled-at">Local date and time</label>
                                        <input
                                            className={styles.input}
                                            id="staff-task-scheduled-at"
                                            onChange={(event) => setStaffTaskDraft((draft) => ({ ...draft, scheduledAt: event.target.value }))}
                                            type="datetime-local"
                                            value={staffTaskDraft.scheduledAt}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="staff-task-assignee">Owner or staff assignee</label>
                                        <input className={styles.input} id="staff-task-assignee" onChange={(event) => setStaffTaskDraft((draft) => ({ ...draft, assigneeLabel: event.target.value }))} placeholder="Example: front desk, Rahul, owner" value={staffTaskDraft.assigneeLabel} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="staff-task-type">Manual task</label>
                                        <select className={styles.select} id="staff-task-type" onChange={(event) => setStaffTaskDraft((draft) => ({ ...draft, taskType: event.target.value }))} value={staffTaskDraft.taskType}>
                                            <option value="post">Post or send</option>
                                            <option value="print">Print and place</option>
                                            <option value="staff_share">Share with staff</option>
                                            <option value="follow_up">Customer follow-up</option>
                                            <option value="result_check">Record result</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.schedules.map((schedule) => {
                                    const scheduledLabel = formatCampaignCueDateTime(schedule.scheduledAt, formatter);
                                    const scheduledDate = schedule.scheduledAt instanceof Date
                                        ? schedule.scheduledAt
                                        : typeof schedule.scheduledAt === "string" || typeof schedule.scheduledAt === "number"
                                            ? new Date(schedule.scheduledAt)
                                            : typeof (schedule.scheduledAt as { toDate?: unknown })?.toDate === "function"
                                                ? (schedule.scheduledAt as { toDate: () => Date }).toDate()
                                                : null;
                                    const scheduleStatus = schedule.status === "scheduled"
                                        && scheduledDate
                                        && !Number.isNaN(scheduledDate.getTime())
                                        && scheduledDate.getTime() <= Date.now()
                                        ? "due"
                                        : schedule.status;
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
                                                        {schedule.assigneeLabel ? ` · ${schedule.assigneeLabel}` : ""}
                                                        {schedule.taskType ? ` · ${displayLabel(schedule.taskType)}` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={styles.chip} data-tone={scheduleStatus === "due" ? "amber" : scheduleStatus === "completed" ? "green" : undefined}>{scheduleStatus}</span>
                                        </div>
                                    );
                                })}
                                {!data.schedules.length ? (
                                    <div className={styles.empty}>
                                        <ContextualStateIllustration color={token.colorPrimary} size={72} treatment="softHalo" variant="scheduleContext" />
                                        <p>No scheduled tasks.</p>
                                    </div>
                                ) : null}
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
                                    {creativeEditorEnabled && canManageWorkspaceContent ? (
                                        <button className={styles.button} onClick={openBlankCreativeEditor} type="button">
                                            <LuImage size={16} />
                                            Create from scratch
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            {secureMediaCaptureEnabled ? (
                                <div className={styles.panel} ref={assetCapturePanelRef}>
                                    <div className={styles.captureHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>{mediaCaptureMission ? "Photo task" : "Private media"}</span>
                                            <h3>{mediaCaptureMission ? mediaCaptureMission.task : "Add a real photo or clip"}</h3>
                                            <p>Confirm permission first. CampaignCue stores the original and one preview privately; it does not post the file.</p>
                                        </div>
                                        {mediaCaptureMission ? (
                                            <button className={styles.ghostButton} onClick={() => setMediaCaptureMission(null)} type="button">
                                                <LuX size={16} />
                                                Clear task
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className={styles.formGrid}>
                                        <div className={styles.fieldWide}>
                                            <label htmlFor="media-capture-consent">Permission for this photo or clip</label>
                                            <select
                                                className={styles.select}
                                                id="media-capture-consent"
                                                onChange={(event) => setMediaCaptureConsentType(event.target.value as CampaignCueMediaConsentType | "")}
                                                value={mediaCaptureConsentType}
                                            >
                                                <option value="">Choose permission status</option>
                                                <option value="not_applicable">No person is shown</option>
                                                <option value="owner_confirmed">People are shown and permission is confirmed</option>
                                                <option value="creator_release">Creator release is available</option>
                                                <option value="customer_release">Customer release is available</option>
                                                <option value="unknown">I still need to check</option>
                                            </select>
                                        </div>
                                        <div className={styles.mediaCaptureActions}>
                                            <button
                                                className={styles.button}
                                                disabled={!mediaCaptureConsentType || busyKey === "media-capture-upload"}
                                                onClick={() => mediaCameraInputRef.current?.click()}
                                                type="button"
                                            >
                                                <LuCamera size={16} />
                                                Take photo
                                            </button>
                                            <button
                                                className={styles.ghostButton}
                                                disabled={!mediaCaptureConsentType || busyKey === "media-capture-upload"}
                                                onClick={() => mediaLibraryInputRef.current?.click()}
                                                type="button"
                                            >
                                                <LuUploadCloud size={16} />
                                                Choose photo or clip
                                            </button>
                                        </div>
                                    </div>
                                    {busyKey === "media-capture-upload" ? (
                                        <div className={styles.mediaUploadProgress} aria-live="polite">
                                            <progress max={100} value={mediaUploadProgress} />
                                            <span>Uploading privately · {mediaUploadProgress}%</span>
                                        </div>
                                    ) : null}
                                    <p className={styles.muted}>Images: up to 12 MB. Video clips: up to 250 MB. Files with unconfirmed permission stay in review.</p>
                                </div>
                            ) : null}
                            <div className={styles.panel}>
                                <div className={styles.captureHeader}>
                                    <div>
                                        <span className={styles.eyebrow}>File note</span>
                                        <h3>Add a file note without upload</h3>
                                        <p>Use this only to record that an asset exists elsewhere. A note does not fulfill a photo task.</p>
                                    </div>
                                </div>
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
                                            <option value="audio">Audio</option>
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
                                            disabled={!assetDraft.name.trim() || busyKey === "asset" || !canManageWorkspaceContent}
                                            onClick={registerAsset}
                                            type="button"
                                        >
                                            <LuUpload size={16} />
                                            Save file note
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
                                {!data.assets.length ? (
                                    <div className={styles.empty}>
                                        <p>No assets yet. Save a photo, logo, or file note before reusing it in packs.</p>
                                    </div>
                                ) : null}
                            </div>
                        </section>
                    ) : null}

                    {tab === "analytics" ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Results</span>
                                    <h2>Usage summary</h2>
                                    <p>
                                        {resultCampaign
                                            ? `Recording for ${resultCampaign.title}. Choose what happened before saving.`
                                            : "This summary uses campaign creation, exports, manual use, and owner-recorded result receipts."}
                                    </p>
                                </div>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Campaigns" value={data.analytics.campaignCount} />
                                <StatCard label="Exports" value={data.analytics.exportCount} />
                                <StatCard label="Manual use" value={data.analytics.usedCount} />
                                <StatCard label="Reported results" value={data.analytics.ownerReportedOutcomeCount || 0} />
                            </div>
                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_CAMPAIGN_MEMORY ? (
                                <div className={styles.panel}>
                                    <div className={styles.findingRow}>
                                        <div className={styles.rowStart}>
                                            <div className={styles.iconBox}>
                                                <LuClipboardCheck size={18} />
                                            </div>
                                            <div className={styles.titleBlock}>
                                                <h3>Campaign memory</h3>
                                                <p>{data.campaignMemory.ownerSummary}</p>
                                                <p>{data.campaignMemory.sourceLabel}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={styles.chip}
                                            data-tone={data.campaignMemory.status === "usable" ? "green" : "amber"}
                                        >
                                            {campaignMemoryConfidenceLabel(data.campaignMemory.confidence)}
                                        </span>
                                    </div>
                                    <div className={styles.list}>
                                        {data.campaignMemory.topRecipe ? (
                                            <div className={styles.findingRow}>
                                                <div className={styles.titleBlock}>
                                                    <h3>Recipe evidence</h3>
                                                    <p>{campaignMemoryRecipe?.title || "Recent campaign recipe"}</p>
                                                </div>
                                                <span className={styles.chip}>
                                                    {data.campaignMemory.topRecipe.usefulCount} useful / {data.campaignMemory.topRecipe.notUsefulCount} not useful
                                                </span>
                                            </div>
                                        ) : null}
                                        {data.campaignMemory.topChannel ? (
                                            <div className={styles.findingRow}>
                                                <div className={styles.titleBlock}>
                                                    <h3>Channel evidence</h3>
                                                    <p>{campaignMemoryChannel || "Recent manual channel"}</p>
                                                </div>
                                                <span className={styles.chip}>
                                                    {data.campaignMemory.topChannel.sampleCount} result{data.campaignMemory.topChannel.sampleCount === 1 ? "" : "s"}
                                                </span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className={styles.noteBox}>
                                        <strong>Next useful step</strong>
                                        <p>{data.campaignMemory.nextAction}</p>
                                        <p>{data.campaignMemory.cautions[0]}</p>
                                    </div>
                                </div>
                            ) : null}
                            <div className={styles.panel}>
                                <div className={styles.formGrid}>
                                    <div className={styles.fieldWide}>
                                        <label htmlFor="outcome-note">Result note</label>
                                        <div className={styles.chips}>
                                            {resultOptions.map((option) => {
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
                                            placeholder="Optional owner note"
                                            value={outcomeDraft}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="result-used-at">Used at</label>
                                        <input className={styles.input} id="result-used-at" onChange={(event) => setResultReceiptDraft((draft) => ({ ...draft, usedAt: event.target.value }))} type="datetime-local" value={resultReceiptDraft.usedAt} />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="result-experiment">One thing tested</label>
                                        <select className={styles.select} id="result-experiment" onChange={(event) => setResultReceiptDraft((draft) => ({ ...draft, experimentVariable: event.target.value }))} value={resultReceiptDraft.experimentVariable}>
                                            <option value="">Not recorded</option>
                                            <option value="channel">Channel</option>
                                            <option value="timing">Timing</option>
                                            <option value="offer">Offer</option>
                                            <option value="photo">Photo</option>
                                            <option value="cta">Customer next step</option>
                                            <option value="format">Format</option>
                                        </select>
                                    </div>
                                    {([
                                        ["replies", "Replies"],
                                        ["calls", "Calls"],
                                        ["bookings", "Bookings"],
                                        ["orders", "Orders"],
                                        ["walkIns", "Walk-ins"],
                                        ["linkClicks", "Link clicks"],
                                    ] as const).map(([key, label]) => (
                                        <div className={styles.field} key={key}>
                                            <label htmlFor={`result-${key}`}>{label}</label>
                                            <input
                                                className={styles.input}
                                                id={`result-${key}`}
                                                min="0"
                                                onChange={(event) => setResultReceiptDraft((draft) => ({ ...draft, [key]: event.target.value }))}
                                                placeholder="Optional"
                                                step="1"
                                                type="number"
                                                value={resultReceiptDraft[key]}
                                            />
                                        </div>
                                    ))}
                                    {resultCampaign?.pack?.experiment ? (
                                        <div className={styles.fieldWide}>
                                            <div className={styles.noteBox}>
                                                <strong>
                                                    {resultCampaign.pack.experiment.status === "completed"
                                                        ? "Recorded one-change test"
                                                        : resultCampaign.pack.experiment.status === "accepted"
                                                            ? "Test currently in use"
                                                            : "Suggested next change"}
                                                </strong>
                                                <p>{resultCampaign.pack.experiment.instruction}</p>
                                                <span className={styles.chip}>{displayLabel(resultCampaign.pack.experiment.variable)}</span>
                                                <p className={styles.muted}>
                                                    Select this variable above only if it was the one thing you actually changed.
                                                </p>
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className={styles.field}>
                                        <button
                                            className={styles.button}
                                            disabled={!resultCampaign || !selectedOutcomeSignalId || isCampaignActionBusy(resultCampaign.id, "record_outcome")}
                                            onClick={() => resultCampaign && recordAction(resultCampaign, "record_outcome")}
                                            title={!selectedOutcomeSignalId ? "Choose a result first." : undefined}
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
                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_READ_ONLY_RESULT_EVIDENCE && canRecordResultEvidence ? (
                                <div className={styles.panel}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>Numbers from a provider report</span>
                                            <h3>Keep a small evidence snapshot</h3>
                                            <p>Copy totals from a report you can see. This is not a live account connection and is not treated as proof that this campaign caused the result.</p>
                                        </div>
                                    </div>
                                    {resultCampaign?.resultMemory?.latestExternalEvidence ? (
                                        <div className={styles.noteBox}>
                                            <strong>Latest saved snapshot</strong>
                                            <p>
                                                {displayLabel(resultCampaign.resultMemory.latestExternalEvidence.provider)} · {resultCampaign.resultMemory.latestExternalEvidence.periodStart} to {resultCampaign.resultMemory.latestExternalEvidence.periodEnd}
                                            </p>
                                            <div className={styles.chips}>
                                                {Object.entries(resultCampaign.resultMemory.latestExternalEvidence.metrics).map(([metric, value]) => (
                                                    <span className={styles.chip} key={metric}>{displayLabel(metric)}: {value}</span>
                                                ))}
                                            </div>
                                            <p className={styles.muted}>Directional evidence only. It does not change Campaign Memory recommendations.</p>
                                        </div>
                                    ) : null}
                                    <div className={styles.formGrid}>
                                        <div className={styles.field}>
                                            <label htmlFor="result-evidence-provider">Report source</label>
                                            <select className={styles.select} id="result-evidence-provider" onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, provider: event.target.value }))} value={resultEvidenceDraft.provider}>
                                                <option value="google_business_profile">Google Business Profile</option>
                                                <option value="google_ads">Google Ads</option>
                                                <option value="meta_ads">Meta Ads</option>
                                                <option value="instagram_insights">Instagram insights</option>
                                                <option value="facebook_insights">Facebook insights</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="result-evidence-scope">What the report covers</label>
                                            <select className={styles.select} id="result-evidence-scope" onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, scope: event.target.value }))} value={resultEvidenceDraft.scope}>
                                                <option value="campaign_specific">This exact campaign</option>
                                                <option value="location_window">This location during the date window</option>
                                                <option value="account_window">The whole account during the date window</option>
                                            </select>
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="result-evidence-start">Report starts</label>
                                            <input className={styles.input} id="result-evidence-start" max={resultEvidenceTodayKey} onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, periodStart: event.target.value }))} type="date" value={resultEvidenceDraft.periodStart} />
                                        </div>
                                        <div className={styles.field}>
                                            <label htmlFor="result-evidence-end">Report ends</label>
                                            <input className={styles.input} id="result-evidence-end" max={resultEvidenceTodayKey} onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, periodEnd: event.target.value }))} type="date" value={resultEvidenceDraft.periodEnd} />
                                        </div>
                                        {([
                                            ["impressions", "Impressions"],
                                            ["reach", "Reach"],
                                            ["profileViews", "Profile views"],
                                            ["websiteClicks", "Website clicks"],
                                            ["callClicks", "Call clicks"],
                                            ["directionRequests", "Direction requests"],
                                            ["messages", "Messages"],
                                            ["linkClicks", "Link clicks"],
                                        ] as const).map(([metric, label]) => (
                                            <div className={styles.field} key={metric}>
                                                <label htmlFor={`result-evidence-${metric}`}>{label}</label>
                                                <input
                                                    className={styles.input}
                                                    id={`result-evidence-${metric}`}
                                                    max="1000000000"
                                                    min="0"
                                                    onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, [metric]: event.target.value }))}
                                                    placeholder="Optional"
                                                    step="1"
                                                    type="number"
                                                    value={resultEvidenceDraft[metric]}
                                                />
                                            </div>
                                        ))}
                                        <div className={styles.fieldWide}>
                                            <label htmlFor="result-evidence-note">Short source note</label>
                                            <input className={styles.input} id="result-evidence-note" maxLength={200} onChange={(event) => setResultEvidenceDraft((draft) => ({ ...draft, note: event.target.value }))} placeholder="Example: copied from the Google performance report" value={resultEvidenceDraft.note} />
                                        </div>
                                        <div className={styles.field}>
                                            <button
                                                className={styles.button}
                                                disabled={
                                                    !resultCampaign
                                                    || !resultEvidenceDraft.periodStart
                                                    || !resultEvidenceDraft.periodEnd
                                                    || !hasResultEvidenceMetrics
                                                    || isCampaignActionBusy(resultCampaign.id, "record_result_evidence")
                                                }
                                                onClick={() => resultCampaign && recordAction(resultCampaign, "record_result_evidence")}
                                                type="button"
                                            >
                                                <LuCheckCircle2 size={16} />
                                                Save report snapshot
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </section>
                    ) : null}

                    {tab === "agency" && !approvalInboxEnabled ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Agency Workspace</span>
                                    <h2>Approvals are unavailable</h2>
                                    <p>Campaign approval and review comments are currently turned off for this workspace.</p>
                                </div>
                            </div>
                        </section>
                    ) : null}

                    {tab === "agency" && approvalInboxEnabled ? (
                        <section className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <div>
                                    <span className={styles.eyebrow}>Agency Workspace</span>
                                    <h2>Approvals and handoff</h2>
                                    <p>Send prepared packs for client or owner approval before they are used.</p>
                                </div>
                                <button
                                    className={styles.button}
                                    disabled={!canRequestCampaignApproval(latestCampaign, currentWorkspaceRole) || Boolean(latestCampaign && isCampaignApprovalBusy(latestCampaign.id))}
                                    onClick={() => latestCampaign && recordAction(latestCampaign, "request_approval")}
                                    type="button"
                                >
                                    <LuUsers size={16} />
                                    {latestCampaign ? campaignApprovalActionLabel(latestCampaign) : "Request latest approval"}
                                </button>
                            </div>
                            <div className={styles.statusGrid}>
                                <StatCard label="Agency mode" value={data.workspace.agencyMode ? "On" : "Off"} />
                                <StatCard label="Approval requests" value={data.analytics.approvalRequestCount} />
                                <StatCard label="Campaigns" value={data.analytics.campaignCount} />
                                <StatCard label="Provider actions" value="Off" />
                            </div>
                            <div className={styles.panel}>
                                <div className={styles.fieldWide}>
                                    <label htmlFor="approval-decision-note">Approval note</label>
                                    <textarea
                                        className={styles.textarea}
                                        id="approval-decision-note"
                                        maxLength={400}
                                        onChange={(event) => setApprovalDecisionNote(event.target.value)}
                                        placeholder="Required when rejecting. Keep the note short and specific."
                                        value={approvalDecisionNote}
                                    />
                                    <p>Approval confirms review only. Trust, freshness, rights, and protected-fact checks still apply.</p>
                                </div>
                            </div>
                            <div className={styles.list}>
                                {data.campaigns.map((campaign) => {
                                    const comments = campaign.approvalInbox?.comments || [];
                                    const openComments = comments.filter((comment) => comment.status === "open");
                                    const commentDraft = approvalCommentDrafts[campaign.id] || "";
                                    return (
                                        <div className={styles.panel} key={campaign.id}>
                                            <div className={styles.findingRow}>
                                                <div className={styles.rowStart}>
                                                    <div className={styles.iconBox}><LuUsers size={18} /></div>
                                                    <div className={styles.titleBlock}>
                                                        <h3>{campaign.title}</h3>
                                                        <p>{displayLabel(campaign.ownerApprovalState)}{campaign.approvalInbox ? ` · review ${campaign.approvalInbox.requestRevision}` : ""}</p>
                                                    </div>
                                                </div>
                                                <div className={styles.chips}>
                                                    {openComments.length ? <span className={styles.chip} data-tone="amber">{openComments.length} open</span> : null}
                                                    {campaign.ownerApprovalState === "requested" && canResolveCampaignApproval ? (
                                                        <>
                                                            <button
                                                                className={styles.button}
                                                                disabled={Boolean(openComments.length) || isCampaignApprovalBusy(campaign.id)}
                                                                onClick={() => recordAction(campaign, "approve")}
                                                                title={openComments.length ? "Resolve open review comments before approval." : undefined}
                                                                type="button"
                                                            >
                                                                <LuCheck size={16} />
                                                                Approve
                                                            </button>
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={!approvalDecisionNote.trim() || isCampaignApprovalBusy(campaign.id)}
                                                                onClick={() => recordAction(campaign, "reject")}
                                                                type="button"
                                                            >
                                                                <LuX size={16} />
                                                                Reject
                                                            </button>
                                                        </>
                                                    ) : campaign.ownerApprovalState === "requested" ? (
                                                        <span className={styles.chip} data-tone="amber">Reviewer access required</span>
                                                    ) : campaign.ownerApprovalState === "approved" ? (
                                                        <span className={styles.chip} data-tone="green">Approved</span>
                                                    ) : canRequestCampaignApproval(campaign, currentWorkspaceRole) ? (
                                                        <button className={styles.ghostButton} disabled={isCampaignApprovalBusy(campaign.id)} onClick={() => recordAction(campaign, "request_approval")} type="button">
                                                            Request approval
                                                        </button>
                                                    ) : (
                                                        <span className={styles.chip}>{campaignApprovalActionLabel(campaign)}</span>
                                                    )}
                                                </div>
                                            </div>
                                            {campaign.ownerApprovalState === "requested" ? (
                                                <div className={styles.stack}>
                                                    {comments.length ? comments.map((comment) => (
                                                        <div className={styles.noteBox} key={comment.id}>
                                                            <div className={styles.findingRow}>
                                                                <div className={styles.titleBlock}>
                                                                    <strong>{displayLabel(comment.authorRole)} · {formatCampaignCueDate(comment.createdAt, formatter)}</strong>
                                                                    <p>{comment.note}</p>
                                                                    <div className={styles.chips}>
                                                                        <span className={styles.chip} data-tone={comment.status === "open" ? "amber" : "green"}>{displayLabel(comment.status)}</span>
                                                                        {comment.outputId ? <span className={styles.chip}>Specific output</span> : <span className={styles.chip}>Whole pack</span>}
                                                                        {comment.locationId ? <span className={styles.chip}>Location scoped</span> : null}
                                                                    </div>
                                                                </div>
                                                                {comment.status === "open" && canResolveCampaignApproval ? (
                                                                    <button
                                                                        className={styles.ghostButton}
                                                                        disabled={isCampaignApprovalBusy(campaign.id)}
                                                                        onClick={() => recordAction(campaign, "resolve_approval_comment", undefined, undefined, undefined, comment.id)}
                                                                        type="button"
                                                                    >
                                                                        <LuCheck size={16} />
                                                                        Resolve
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    )) : <p className={styles.muted}>No review comments yet.</p>}
                                                    {canCommentOnCampaignApproval ? (
                                                        <div className={styles.fieldWide}>
                                                            <label htmlFor={`approval-comment-${campaign.id}`}>Add review comment</label>
                                                            <textarea
                                                                className={styles.textarea}
                                                                id={`approval-comment-${campaign.id}`}
                                                                maxLength={400}
                                                                onChange={(event) => setApprovalCommentDrafts((current) => ({ ...current, [campaign.id]: event.target.value }))}
                                                                placeholder="Describe one specific change or question."
                                                                value={commentDraft}
                                                            />
                                                            <button
                                                                className={styles.ghostButton}
                                                                disabled={!commentDraft.trim() || comments.length >= 20 || isCampaignApprovalBusy(campaign.id)}
                                                                onClick={() => recordAction(campaign, "add_approval_comment", undefined, commentDraft)}
                                                                type="button"
                                                            >
                                                                Add comment
                                                            </button>
                                                            <p>Comments stay inside this review request. CampaignCue stores at most 20 comments per request.</p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
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
                                <button className={styles.button} disabled={busyKey === "location" || !locationDraft.name.trim() || !canManageWorkspaceContent} onClick={createLocation} type="button">
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
                                    <div className={styles.field}>
                                        <label htmlFor="location-phone">Branch phone</label>
                                        <input
                                            className={styles.input}
                                            id="location-phone"
                                            onChange={(event) => setLocationDraft((draft) => ({
                                                ...draft,
                                                contacts: { ...draft.contacts, phone: event.target.value },
                                            }))}
                                            placeholder="Uses business phone when blank"
                                            value={locationDraft.contacts.phone}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-whatsapp">Branch WhatsApp</label>
                                        <input
                                            className={styles.input}
                                            id="location-whatsapp"
                                            onChange={(event) => setLocationDraft((draft) => ({
                                                ...draft,
                                                contacts: { ...draft.contacts, whatsapp: event.target.value },
                                            }))}
                                            placeholder="Uses business WhatsApp when blank"
                                            value={locationDraft.contacts.whatsapp}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-booking">Branch booking link</label>
                                        <input
                                            className={styles.input}
                                            id="location-booking"
                                            onChange={(event) => setLocationDraft((draft) => ({
                                                ...draft,
                                                contacts: { ...draft.contacts, bookingUrl: event.target.value },
                                            }))}
                                            placeholder="https://"
                                            type="url"
                                            value={locationDraft.contacts.bookingUrl}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-menu">Branch menu or service link</label>
                                        <input
                                            className={styles.input}
                                            id="location-menu"
                                            onChange={(event) => setLocationDraft((draft) => ({
                                                ...draft,
                                                contacts: { ...draft.contacts, publicMenuUrl: event.target.value },
                                            }))}
                                            placeholder="https://"
                                            type="url"
                                            value={locationDraft.contacts.publicMenuUrl}
                                        />
                                    </div>
                                    <div className={styles.field}>
                                        <label htmlFor="location-website">Branch website</label>
                                        <input
                                            className={styles.input}
                                            id="location-website"
                                            onChange={(event) => setLocationDraft((draft) => ({
                                                ...draft,
                                                contacts: { ...draft.contacts, website: event.target.value },
                                            }))}
                                            placeholder="https://"
                                            type="url"
                                            value={locationDraft.contacts.website}
                                        />
                                    </div>
                                </div>
                                <p className={styles.muted}>Leave a branch contact blank to use the confirmed business-wide contact.</p>
                            </div>
                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_MULTI_LOCATION_VARIANTS ? (
                                <div className={styles.panel}>
                                    <div className={styles.sectionHeader}>
                                        <div>
                                            <span className={styles.eyebrow}>Branch packs</span>
                                            <h3>Create one checked pack per location</h3>
                                            <p>
                                                {latestGlobalCampaign
                                                    ? `Using ${latestGlobalCampaign.title} as the source. Each branch gets its own contacts, trust report, approval, export, and result.`
                                                    : "Create one workspace campaign pack first, then choose up to eight active locations."}
                                            </p>
                                        </div>
                                        <button
                                            className={styles.button}
                                            disabled={
                                                !FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_GENERATION
                                                || busyKey === "location-variants"
                                                || !latestGlobalCampaign
                                                || !selectedLocationIds.length
                                                || !canManageSomeCampaignOutput
                                            }
                                            onClick={createLocationVariants}
                                            type="button"
                                        >
                                            <LuCopy size={16} />
                                            Create {selectedLocationIds.length || "branch"} pack{selectedLocationIds.length === 1 ? "" : "s"}
                                        </button>
                                    </div>
                                    <p className={styles.muted}>Only active locations with an area or city can be selected. A batch is limited to eight branches.</p>
                                </div>
                            ) : null}
                            <div className={styles.list}>
                                {data.locations.map((location: CampaignCueLocation) => {
                                    const selectable = location.status === "active" && Boolean(location.locality?.trim());
                                    const selected = selectedLocationIds.includes(location.id);
                                    return (
                                    <div className={styles.assetRow} key={location.id}>
                                        <div className={styles.rowStart}>
                                            {FEATURE_FLAGS.ENABLE_CAMPAIGNCUE_MULTI_LOCATION_VARIANTS ? (
                                                <input
                                                    aria-label={`Select ${location.name} for a branch pack`}
                                                    checked={selected}
                                                    disabled={!selectable}
                                                    onChange={(event) => {
                                                        if (event.target.checked) {
                                                            setSelectedLocationIds((current) => {
                                                                if (current.includes(location.id)) return current;
                                                                if (current.length >= 8) {
                                                                    setNotice("Choose up to eight locations in one branch-pack batch.");
                                                                    return current;
                                                                }
                                                                return [...current, location.id];
                                                            });
                                                        } else {
                                                            setSelectedLocationIds((current) => current.filter((locationId) => locationId !== location.id));
                                                        }
                                                    }}
                                                    type="checkbox"
                                                />
                                            ) : null}
                                            <div className={styles.iconBox}><LuBuilding2 size={18} /></div>
                                            <div className={styles.titleBlock}>
                                                <h3>{location.name}</h3>
                                                <p>
                                                    {location.locality || "Add an area or city before creating a branch pack"}
                                                    {location.contacts?.whatsapp ? ` · Branch WhatsApp ${location.contacts.whatsapp}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles.chips}>
                                            {data.campaigns.some((campaign) => campaign.locationId === location.id) ? (
                                                <span className={styles.chip} data-tone="green">Pack ready</span>
                                            ) : null}
                                            <span className={styles.chip} data-tone={location.status === "active" ? "green" : "amber"}>{displayLabel(location.status)}</span>
                                        </div>
                                    </div>
                                    );
                                })}
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
