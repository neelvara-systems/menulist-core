/**
 * Menu Image Processing Job Logic
 * 
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
 * 
 * This module handles job-based menu image processing:
 * 1. Updates job status to "processing"
 * 2. Calls existing processMenuImagesLogic for AI processing
 * 3. Redistributes combined data to individual files by sourceFileIndex
 * 4. Saves files to project
 * 5. Updates job as completed/failed
 * 
 * Triggered by:
 * - PRODUCTION: Firestore onCreate trigger on menuImageProcessingJobs/{jobId}
 * - DEVELOPMENT: dev_triggerProcessMenuImages callable function
 */

import { Timestamp } from "firebase-admin/firestore";
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from "../constants/database";
import { FUNCTION_RETENTION_CONFIG, isFunctionFeatureEnabled } from "../constants/features";
import { firestoreAdmin } from "../firebaseAdmin";
import { normalizeBusinessCategory, resolveStoreBusinessCategory } from "../sharedData/businessTypes";
import { applyCategoryIconDefaults } from "../sharedData/categoryIconSuggestions";
import {
    getSuggestionValue,
    normalizeCurrencyCode,
    normalizeLanguageCodes,
    type ExtractedBusinessProfile,
    type ExtractedBusinessProfileConfidence,
    type ExtractedBusinessProfileField,
    type ExtractedBusinessProfileSuggestion,
} from "../sharedData/extractedBusinessProfile";
import {
    MENU_EXTRACTION_DESTINATION_TYPES,
    MENU_EXTRACTION_JOB_LIMITS,
    MENU_EXTRACTION_SOURCES,
    MENU_LINK_IMPORT_MIME_TYPES,
    MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES,
    OWNER_MENU_UPLOAD_MIME_TYPES,
    PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES,
} from "../sharedData/menuExtractionJob";
import { ConfidenceSummary, MENU_IMAGE_PROCESSING_JOBS_COLLECTION, MENU_PROCESSING_STATUS, MenuImageProcessingJob, MenuItem, ProcessMenuImagesRequest } from "../types";
import { buildExtractionResultSummary } from "../utils/menuExtractionResultSummary";
import { hardenExtractedData } from "./extractionHardening";
import { tryExtractMenuLinkTextFromJob } from "./menuLinkTextExtraction";
import { processMenuImagesLogic } from "./processMenuImages";
import { buildExistingCategoriesMap, processParallelResponse } from "./redistributeUtils";
import { getProject, saveFilesToProject } from "./saveFilesToProject";
import { applyMenuDerivedBusinessAttributeDefaultsForStore } from "./businessAttributeDefaults";
import { revalidatePublicClientCacheForStore } from "./publicCacheRevalidation";

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE SUMMARY (Infrastructure Compounding 10.1)
// Computes aggregate confidence stats from per-item confidence data
// ═══════════════════════════════════════════════════════════════════════════

const CONFIDENCE_SCORE_MAP: Record<string, number> = { high: 1, medium: 0.6, low: 0.2 };
const DEFAULT_OUTLET_EXTRACTION_POLICY = {
    canUseMenuExtraction: false,
};
const DEFAULT_STORAGE_BUCKET = "menulist-qa.appspot.com";
const OWNER_JOB_FILE_TYPES = new Set<string>(OWNER_MENU_UPLOAD_MIME_TYPES);
const PUBLIC_CREATE_MENU_IMAGE_FILE_TYPES = new Set<string>(PUBLIC_CREATE_MENU_IMAGE_MIME_TYPES);
const LINK_IMPORT_JOB_FILE_TYPES = new Set<string>(MENU_LINK_IMPORT_MIME_TYPES);
const MESSAGING_JOB_FILE_TYPES = new Set<string>(MESSAGING_ONBOARDING_MENU_UPLOAD_MIME_TYPES);
const CANONICAL_SOURCE_LANGUAGE = "en";
const PROFILE_CONFIDENCE_RANK: Record<ExtractedBusinessProfileConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
};
const EXTRACTION_DETAIL_RETENTION_MS = FUNCTION_RETENTION_CONFIG.MENU_EXTRACTION_DETAIL_RETENTION_HOURS * 60 * 60 * 1000;

function timestampMillis(value: unknown): number | null {
    if (!value) return null;
    if (typeof (value as any).toMillis === "function") {
        return (value as any).toMillis();
    }
    if (typeof (value as any).seconds === "number") {
        return (value as any).seconds * 1000;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    return null;
}

function addTimestamp(target: Record<string, unknown>, key: string, millis?: number | null): void {
    if (typeof millis === "number" && Number.isFinite(millis)) {
        target[key] = Timestamp.fromMillis(millis);
    }
}

function buildExtractionDetailRetentionFields(nowMillis: number): Record<string, unknown> {
    return {
        detailExpiresAt: Timestamp.fromMillis(nowMillis + EXTRACTION_DETAIL_RETENTION_MS),
        detailRetentionHours: FUNCTION_RETENTION_CONFIG.MENU_EXTRACTION_DETAIL_RETENTION_HOURS,
        detailRetentionMode: "summary_after_retention",
    };
}

function addDuration(target: Record<string, unknown>, key: string, value?: number | null): void {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
        target[key] = Math.round(value);
    }
}

function buildExtractionTimings(params: {
    aiCompletedAtMillis?: number | null;
    aiStartedAtMillis?: number | null;
    completedAtMillis?: number | null;
    failedAtMillis?: number | null;
    jobCreatedAt?: unknown;
    postProcessingCompletedAtMillis?: number | null;
    previewReadyAtMillis?: number | null;
    providerTimings?: unknown;
    saveCompletedAtMillis?: number | null;
    saveStartedAtMillis?: number | null;
    workerStartedAtMillis: number;
}): Record<string, unknown> {
    const createdAtMillis = timestampMillis(params.jobCreatedAt);
    const timings: Record<string, unknown> = {};

    addTimestamp(timings, "workerStartedAt", params.workerStartedAtMillis);
    addTimestamp(timings, "aiStartedAt", params.aiStartedAtMillis);
    addTimestamp(timings, "aiCompletedAt", params.aiCompletedAtMillis);
    addTimestamp(timings, "postProcessingCompletedAt", params.postProcessingCompletedAtMillis);
    addTimestamp(timings, "saveStartedAt", params.saveStartedAtMillis);
    addTimestamp(timings, "saveCompletedAt", params.saveCompletedAtMillis);
    addTimestamp(timings, "previewReadyAt", params.previewReadyAtMillis);
    addTimestamp(timings, "completedAt", params.completedAtMillis);
    addTimestamp(timings, "failedAt", params.failedAtMillis);

    addDuration(timings, "queueWaitMs", createdAtMillis !== null ? params.workerStartedAtMillis - createdAtMillis : null);
    addDuration(timings, "aiProcessingMs", params.aiStartedAtMillis && params.aiCompletedAtMillis ? params.aiCompletedAtMillis - params.aiStartedAtMillis : null);
    addDuration(timings, "postProcessingMs", params.aiCompletedAtMillis && params.postProcessingCompletedAtMillis ? params.postProcessingCompletedAtMillis - params.aiCompletedAtMillis : null);
    addDuration(timings, "saveMs", params.saveStartedAtMillis && params.saveCompletedAtMillis ? params.saveCompletedAtMillis - params.saveStartedAtMillis : null);
    addDuration(timings, "workerTotalMs", (params.completedAtMillis || params.failedAtMillis || params.previewReadyAtMillis) ? (params.completedAtMillis || params.failedAtMillis || params.previewReadyAtMillis)! - params.workerStartedAtMillis : null);

    if (
        params.providerTimings &&
        typeof params.providerTimings === "object" &&
        Object.keys(params.providerTimings).length > 0
    ) {
        timings.provider = params.providerTimings;
    }

    return timings;
}

function resolveJobBusinessCategory(businessType?: string, businessCategory?: string): string | undefined {
    return resolveStoreBusinessCategory(businessType, businessCategory || normalizeBusinessCategory(businessType));
}

function parseStoreIdFromProjectId(projectId?: string): string | null {
    if (!projectId) return null;
    const parts = projectId.split("-");
    const storeId = parts[parts.length - 1];
    return storeId && Number.isSafeInteger(Number(storeId)) ? storeId : null;
}

function shouldSkipProjectSave(job: MenuImageProcessingJob): boolean {
    return job.skipProjectSave === true ||
        job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT ||
        job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING ||
        job.projectId?.startsWith("msg-onboarding-");
}

function getAllowedStorageBucket(): string {
    return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}

function getStoragePathFromDownloadUrl(value: string): string | null {
    try {
        const url = new URL(value);
        if (process.env.FUNCTIONS_EMULATOR === "true" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
            return "local-dev";
        }
        if (url.protocol !== "https:") return null;

        const allowedBucket = getAllowedStorageBucket();
        if (url.hostname === "firebasestorage.googleapis.com") {
            const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
            if (decodeURIComponent(match?.[1] || "") !== allowedBucket) return null;
            return match?.[2] ? decodeURIComponent(match[2]) : null;
        }

        if (url.hostname === "storage.googleapis.com") {
            const parts = url.pathname.split("/").filter(Boolean);
            const bucket = decodeURIComponent(parts[0] || "");
            if (bucket !== allowedBucket) return null;
            return parts.length >= 2 ? decodeURIComponent(parts.slice(1).join("/")) : null;
        }

        return null;
    } catch {
        return null;
    }
}

function isAllowedJobStoragePath(job: MenuImageProcessingJob, storagePath: string): boolean {
    if (storagePath === "local-dev") return process.env.FUNCTIONS_EMULATOR === "true";

    if (job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT) {
        return storagePath.startsWith(`publicMenuDrafts/${job.destination.draftId}/`);
    }

    if (job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING) {
        return storagePath.startsWith(`messagingOnboarding/${job.destination.sessionId}/`);
    }

    if (job.source === MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING && job.projectId?.startsWith("msg-onboarding-")) {
        const sessionId = job.projectId.replace(/^msg-onboarding-/, "");
        return storagePath.startsWith(`messagingOnboarding/${sessionId}/`);
    }

    if (job.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT) {
        return storagePath.startsWith(`menuLinkImports/${job.tId}/${job.sId}/${job.projectId}/`);
    }

    return storagePath.startsWith(`projects/files/${job.tId}/${job.sId}/`);
}

function isSupportedJobFileType(job: MenuImageProcessingJob, type: string): boolean {
    if (
        job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING ||
        job.source === MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING
    ) {
        return MESSAGING_JOB_FILE_TYPES.has(type);
    }

    if (
        job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT &&
        job.destination.sourceType === "image_upload"
    ) {
        return PUBLIC_CREATE_MENU_IMAGE_FILE_TYPES.has(type);
    }

    if (
        job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT &&
        job.destination.sourceType === "menu_link_import"
    ) {
        return LINK_IMPORT_JOB_FILE_TYPES.has(type);
    }

    if (job.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT) {
        return LINK_IMPORT_JOB_FILE_TYPES.has(type);
    }

    return OWNER_JOB_FILE_TYPES.has(type);
}

function validateJobFiles(job: MenuImageProcessingJob): void {
    if (!Array.isArray(job.files) || job.files.length === 0) {
        throw new Error("No files found in extraction job.");
    }
    if (job.files.length > MENU_EXTRACTION_JOB_LIMITS.MAX_FILES) {
        throw new Error("Too many files in extraction job.");
    }

    for (const file of job.files) {
        if (!file?.uid || !file?.name || !file?.url) {
            throw new Error("Invalid extraction file metadata.");
        }
        if (!isSupportedJobFileType(job, String(file.type || ""))) {
            throw new Error(`Unsupported extraction file type: ${file.type || "unknown"}`);
        }
        if (Number(file.size || 0) > MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES) {
            throw new Error("Extraction file is too large.");
        }

        const storagePath = getStoragePathFromDownloadUrl(file.url);
        if (!storagePath || !isAllowedJobStoragePath(job, storagePath)) {
            throw new Error("Extraction file URL is not allowed for this job.");
        }
    }
}

function normalizeDraftExtractionLanguages(languages: any): Array<{ code: string; name: string; isPrimary?: boolean }> {
    const normalized = Array.isArray(languages)
        ? languages
            .map((language) => typeof language === "string"
                ? { code: language, name: language === CANONICAL_SOURCE_LANGUAGE ? "English" : language, isPrimary: language === CANONICAL_SOURCE_LANGUAGE }
                : {
                    code: String(language?.code || "").trim().toLowerCase(),
                    name: String(language?.name || "").trim(),
                    isPrimary: Boolean(language?.isPrimary),
                })
            .filter((language) => language.code)
        : [];

    const deduped = Array.from(new Map(normalized.map((language) => [language.code, language])).values());
    const hasPrimary = deduped.some((language) => language.isPrimary);
    const withPrimary = hasPrimary
        ? deduped
        : deduped.map((language, index) => ({ ...language, isPrimary: index === 0 }));

    if (withPrimary.some((language) => language.code === CANONICAL_SOURCE_LANGUAGE)) {
        return withPrimary;
    }

    return [
        ...withPrimary,
        { code: CANONICAL_SOURCE_LANGUAGE, name: "English", isPrimary: false },
    ];
}

function cleanProfileText(value: unknown, maxLength = 160): string | null {
    if (typeof value !== "string" && typeof value !== "number") return null;
    const normalized = String(value).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeProfileConfidence(value: unknown): ExtractedBusinessProfileConfidence {
    const normalized = cleanProfileText(value, 16)?.toLowerCase();
    return normalized === "high" || normalized === "medium" || normalized === "low"
        ? normalized
        : "low";
}

function makeIdentityProfileSuggestion<T>(
    field: ExtractedBusinessProfileField,
    value: T | null | undefined,
    confidence: ExtractedBusinessProfileConfidence,
): ExtractedBusinessProfileSuggestion<T> | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === "string" && !value.trim()) return undefined;
    if (Array.isArray(value) && value.length === 0) return undefined;

    return {
        field,
        value,
        confidence,
        source: "menu_intake_identity",
    };
}

function buildProfileFromIdentityCheck(job: MenuImageProcessingJob): ExtractedBusinessProfile | undefined {
    const identity = (job.sourceMetadata?.identityCheck as any)?.identity;
    if (!identity || typeof identity !== "object") return undefined;

    const confidence = normalizeProfileConfidence(identity.confidence);
    const currencyCode = normalizeCurrencyCode(identity.currencyHint);
    const languages = normalizeLanguageCodes(identity.languages);
    const profile: ExtractedBusinessProfile = {
        identity: {
            businessName: makeIdentityProfileSuggestion("businessName", cleanProfileText(identity.businessName, 100), confidence),
            phoneNumber: makeIdentityProfileSuggestion("phoneNumber", cleanProfileText(identity.phoneNumber, 40), confidence),
            addressLine: makeIdentityProfileSuggestion("addressLine", cleanProfileText(identity.address, 250), confidence),
            businessType: makeIdentityProfileSuggestion("businessType", cleanProfileText(identity.businessType, 80), confidence),
            businessCategory: makeIdentityProfileSuggestion("businessCategory", normalizeBusinessCategory(identity.businessCategory), confidence),
            currencyCode: makeIdentityProfileSuggestion("currencyCode", currencyCode, confidence),
            defaultLanguage: makeIdentityProfileSuggestion("defaultLanguage", languages[0], confidence),
            activeLanguages: makeIdentityProfileSuggestion("activeLanguages", languages, confidence),
        },
    };

    return Object.values(profile.identity || {}).some(Boolean) ? profile : undefined;
}

function chooseProfileSuggestion<T>(
    existing?: ExtractedBusinessProfileSuggestion<T>,
    incoming?: ExtractedBusinessProfileSuggestion<T>,
): ExtractedBusinessProfileSuggestion<T> | undefined {
    if (!existing) return incoming;
    if (!incoming) return existing;
    return PROFILE_CONFIDENCE_RANK[incoming.confidence] > PROFILE_CONFIDENCE_RANK[existing.confidence]
        ? incoming
        : existing;
}

function mergeExtractedBusinessProfiles(
    extractionProfile?: ExtractedBusinessProfile,
    identityProfile?: ExtractedBusinessProfile,
): ExtractedBusinessProfile | undefined {
    const merged: ExtractedBusinessProfile = {
        identity: {
            businessName: chooseProfileSuggestion(extractionProfile?.identity?.businessName, identityProfile?.identity?.businessName),
            phoneNumber: chooseProfileSuggestion(extractionProfile?.identity?.phoneNumber, identityProfile?.identity?.phoneNumber),
            addressLine: chooseProfileSuggestion(extractionProfile?.identity?.addressLine, identityProfile?.identity?.addressLine),
            businessType: chooseProfileSuggestion(extractionProfile?.identity?.businessType, identityProfile?.identity?.businessType),
            businessCategory: chooseProfileSuggestion(extractionProfile?.identity?.businessCategory, identityProfile?.identity?.businessCategory),
            currencyCode: chooseProfileSuggestion(extractionProfile?.identity?.currencyCode, identityProfile?.identity?.currencyCode),
            defaultLanguage: chooseProfileSuggestion(extractionProfile?.identity?.defaultLanguage, identityProfile?.identity?.defaultLanguage),
            activeLanguages: chooseProfileSuggestion(extractionProfile?.identity?.activeLanguages, identityProfile?.identity?.activeLanguages),
        },
        ...(extractionProfile?.visualBrand ? { visualBrand: extractionProfile.visualBrand } : {}),
        ...(extractionProfile?.project ? { project: extractionProfile.project } : {}),
    };

    if (!Object.values(merged.identity || {}).some(Boolean)) {
        delete merged.identity;
    }

    return Object.values(merged).some(Boolean) ? merged : undefined;
}

function getIdentityBusinessName(job: MenuImageProcessingJob): string | null {
    const identity = (job.sourceMetadata?.identityCheck as any)?.identity;
    return typeof identity?.businessName === "string" && identity.businessName.trim()
        ? identity.businessName.trim()
        : null;
}

function getIdentityBusinessType(job: MenuImageProcessingJob): string | null {
    const identity = (job.sourceMetadata?.identityCheck as any)?.identity;
    return typeof identity?.businessType === "string" && identity.businessType.trim()
        ? identity.businessType.trim()
        : null;
}

function getIdentityBusinessCategory(job: MenuImageProcessingJob): string | null {
    const identity = (job.sourceMetadata?.identityCheck as any)?.identity;
    return typeof identity?.businessCategory === "string" && identity.businessCategory.trim()
        ? identity.businessCategory.trim()
        : null;
}

function getProfileBusinessName(menuData: any): string | null {
    return getSuggestionValue(menuData?.extractedBusinessProfile?.identity?.businessName, "medium") || null;
}

function getProfileBusinessType(menuData: any): string | null {
    return getSuggestionValue(menuData?.extractedBusinessProfile?.identity?.businessType, "medium") || null;
}

function getProfileBusinessCategory(menuData: any): string | null {
    return getSuggestionValue(menuData?.extractedBusinessProfile?.identity?.businessCategory, "medium") || null;
}

function normalizeDraftCategory(category: any): any | null {
    if (category?.id === undefined || category?.id === null || !category?.name || typeof category.name !== "object") return null;
    const { sourceFileIndex: _sourceFileIndex, ...rest } = category;
    return {
        ...rest,
        id: String(category.id),
        active: category.active !== false,
    };
}

function normalizeDraftItem(item: any): any | null {
    if (item?.id === undefined || item?.id === null || !item?.name || typeof item.name !== "object") return null;
    const {
        sourceFileIndex: _sourceFileIndex,
        categoryId,
        attributes: rawAttributes,
        price: rawPrice,
        ...rest
    } = item;
    const normalizedAttributes = Array.isArray(rawAttributes)
        ? rawAttributes.map((attribute: any) => ({
            ...attribute,
            id: String(attribute?.id || ""),
            name: attribute?.name && typeof attribute.name === "object" ? attribute.name : {},
            price: attribute?.price != null ? String(attribute.price) : "",
            active: attribute?.active !== false,
        })).filter((attribute: any) => attribute.id && Object.keys(attribute.name).length > 0)
        : [];

    return {
        ...rest,
        id: String(item.id),
        category: String(item.category ?? categoryId ?? ""),
        name: item.name,
        price: rawPrice != null ? String(rawPrice) : "",
        active: item.active !== false,
        available: item.available !== false,
        attributes: normalizedAttributes,
    };
}

function buildPublicDraftExtractedData(menuData: any, redistributedFiles?: Record<string, any>) {
    const fileData = Object.values(redistributedFiles || {})
        .map((file: any) => file?.data)
        .filter((data: any) => data && typeof data === "object");
    const sourceData = fileData.length > 0
        ? {
            categories: fileData.flatMap((data: any) => Array.isArray(data.categories) ? data.categories : []),
            items: fileData.flatMap((data: any) => Array.isArray(data.items) ? data.items : []),
            languages: fileData.find((data: any) => Array.isArray(data.languages) && data.languages.length > 0)?.languages || menuData?.languages,
        }
        : menuData;

    return {
        categories: (Array.isArray(sourceData?.categories) ? sourceData.categories : [])
            .map(normalizeDraftCategory)
            .filter((category: any) => category !== null),
        items: (Array.isArray(sourceData?.items) ? sourceData.items : [])
            .map(normalizeDraftItem)
            .filter((item: any) => item !== null),
        languages: normalizeDraftExtractionLanguages(sourceData?.languages),
    };
}

async function updatePublicDraftFromExtraction(
    jobId: string,
    job: MenuImageProcessingJob,
    menuData: any,
    redistributedFiles?: Record<string, any>,
): Promise<void> {
    if (job.destination?.type !== MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT) return;

    const draftRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)
        .doc(job.destination.draftId);
    const extractedData = buildPublicDraftExtractedData(menuData, redistributedFiles);

    await draftRef.update({
        extractionStatus: "completed",
        extractedData,
        detectedBusinessName: getIdentityBusinessName(job) || getProfileBusinessName(menuData),
        detectedBusinessType: getIdentityBusinessType(job) || getProfileBusinessType(menuData) || job.businessType || null,
        detectedBusinessCategory: resolveJobBusinessCategory(
            getIdentityBusinessType(job) || getProfileBusinessType(menuData) || job.businessType,
            getIdentityBusinessCategory(job) || getProfileBusinessCategory(menuData) || job.businessCategory,
        ) || null,
        detectedCurrencyCode: getSuggestionValue(menuData?.extractedBusinessProfile?.identity?.currencyCode, "medium") || null,
        extractedBusinessProfile: menuData?.extractedBusinessProfile || null,
        suggestedProjectName: getSuggestionValue(menuData?.extractedBusinessProfile?.project?.projectName, "medium") || null,
        detectedBrandAccentColor: getSuggestionValue(menuData?.extractedBusinessProfile?.visualBrand?.brandAccentColor, "medium") || null,
        detectedImageBackgroundColor: getSuggestionValue(menuData?.extractedBusinessProfile?.visualBrand?.imageBackgroundColor, "medium") || null,
        extractionJobId: jobId,
        updatedAt: Timestamp.now(),
    });
}

async function markPublicDraftExtractionFailed(job: MenuImageProcessingJob, message: string): Promise<void> {
    if (job.destination?.type !== MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT) return;
    await firestoreAdmin
        .collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)
        .doc(job.destination.draftId)
        .update({
            extractionStatus: "failed",
            extractionError: message,
            updatedAt: Timestamp.now(),
        })
        .catch(() => undefined);
}

async function markPublicDraftExtractionProcessing(job: MenuImageProcessingJob): Promise<void> {
    if (job.destination?.type !== MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT) return;
    await firestoreAdmin
        .collection(DB_COLLECTIONS.PUBLIC_MENU_DRAFTS)
        .doc(job.destination.draftId)
        .update({
            extractionStatus: "processing",
            updatedAt: Timestamp.now(),
        })
        .catch(() => undefined);
}

function getExtractionShapeError(menuData: any): string | null {
    const categories = Array.isArray(menuData?.categories) ? menuData.categories : [];
    const items = Array.isArray(menuData?.items) ? menuData.items : [];
    if (categories.length === 0 && items.length === 0) {
        return "No menu items were found in this upload.";
    }
    if (items.length === 0) {
        return "No menu items were found in this upload.";
    }
    return null;
}

async function getOutletExtractionPolicyBlockReason(job: MenuImageProcessingJob, existingProject: any | null): Promise<string | null> {
    const masterProjectId = existingProject?.masterProjectId;
    if (!masterProjectId) return null;

    const masterStoreId = parseStoreIdFromProjectId(masterProjectId);
    if (!masterStoreId || String(masterStoreId) === String(job.sId)) return null;

    const masterStoreSnap = await firestoreAdmin
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(masterStoreId))
        .get();
    const policy = {
        ...DEFAULT_OUTLET_EXTRACTION_POLICY,
        ...(masterStoreSnap.data()?.outletPolicy || {}),
    };

    if (policy.canUseMenuExtraction === false) {
        return "Menu extraction is disabled for this outlet";
    }

    return null;
}

function computeConfidenceSummary(items: MenuItem[]): ConfidenceSummary | undefined {
    if (!items || items.length === 0) return undefined;

    let high = 0, medium = 0, low = 0;
    let totalScore = 0;

    for (const item of items) {
        const conf = item.confidence;
        if (!conf) {
            // No confidence = assume high (AI omits when confident)
            high++;
            totalScore += 1;
            continue;
        }

        const nameScore = CONFIDENCE_SCORE_MAP[conf.name] ?? 0.6;
        const priceScore = CONFIDENCE_SCORE_MAP[conf.price] ?? 0.6;
        const avgItemScore = (nameScore + priceScore) / 2;

        if (avgItemScore >= 0.8) high++;
        else if (avgItemScore >= 0.4) medium++;
        else low++;

        totalScore += avgItemScore;
    }

    const total = items.length || 1;

    return {
        highConfidenceCount: high,
        mediumConfidenceCount: medium,
        lowConfidenceCount: low,
        averageConfidenceScore: Math.round((totalScore / total) * 100) / 100,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED JOB PROCESSING LOGIC
// Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 5
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Process a menu image processing job
 * 
 * Called by both:
 * - Production: Firestore onCreate trigger
 * - Development: dev_triggerProcessMenuImages callable
 * 
 * @param jobId - The job document ID
 * @param job - The job data (from Firestore document)
 */
export async function processMenuImagesJobLogic(
    jobId: string,
    job: MenuImageProcessingJob
): Promise<void> {
    const logger = functions.logger;
    const jobRef = firestoreAdmin
        .collection(MENU_IMAGE_PROCESSING_JOBS_COLLECTION)
        .doc(jobId);
    const skipProjectSave = shouldSkipProjectSave(job);
    let existingProjectCache: any | null | undefined;
    const workerStartedAtMillis = Date.now();
    let aiStartedAtMillis: number | null = null;
    let aiCompletedAtMillis: number | null = null;
    let postProcessingCompletedAtMillis: number | null = null;
    let saveStartedAtMillis: number | null = null;
    let saveCompletedAtMillis: number | null = null;
    const loadExistingProject = async () => {
        if (skipProjectSave) return null;
        if (existingProjectCache === undefined) {
            existingProjectCache = await getProject(job.projectId);
        }
        return existingProjectCache;
    };

    logger.info(`[processMenuProcessingJob] === JOB PROCESSING START ===`, {
        jobId,
        step: 'START',
        timestamp: Date.now(),
    });

    try {
        if (job.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT && !isFunctionFeatureEnabled('ENABLE_MENU_LINK_IMPORT')) {
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.FAILED,
                completedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                error: {
                    code: 'FEATURE_DISABLED',
                    message: 'Menu link import is not enabled.',
                    retryable: false,
                },
            });
            return;
        }

        validateJobFiles(job);

        // ─────────────────────────────────────────────────────────────
        // Step 0: Validate tenant isolation (server-side defense-in-depth)
        // Ensures projectId is consistent with job's tId/sId
        // Prevents cross-tenant data injection even if Firestore rules are bypassed
        // ─────────────────────────────────────────────────────────────
        if (job.tId && job.projectId) {
            const projectIdParts = job.projectId.split('-');
            if (projectIdParts.length >= 3) {
                const projectTId = projectIdParts[0];
                const projectSId = projectIdParts[projectIdParts.length - 1];
                if (projectTId !== String(job.tId) || projectSId !== String(job.sId)) {
                    logger.error(`[processMenuImagesJob] SECURITY: projectId tenant mismatch`, {
                        jobId,
                        jobTId: job.tId,
                        jobSId: job.sId,
                        projectTId,
                        projectSId,
                        projectId: job.projectId,
                    });
                    await jobRef.update({
                        status: MENU_PROCESSING_STATUS.FAILED,
                        completedAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                        error: {
                            code: 'TENANT_MISMATCH',
                            message: 'Project does not belong to the job tenant',
                            retryable: false,
                        },
                    });
                    return;
                }
            }
        }

        // ─────────────────────────────────────────────────────────────
        // Step 1: Update status to processing (with idempotency check)
        // Spec Reference: Section 8.6 (Idempotency)
        // ─────────────────────────────────────────────────────────────
        logger.info(`[processMenuImagesJob] Starting transaction for job ${jobId}`);

        const updated = await firestoreAdmin.runTransaction(async (transaction) => {
            const jobDoc = await transaction.get(jobRef);
            const jobData = jobDoc.data();

            logger.info(`[processMenuImagesJob] Transaction - Job status check:`, {
                jobId,
                status: jobData?.status,
                startedAt: jobData?.startedAt?.toMillis?.(),
                now: Date.now()
            });

            if (jobData?.status !== MENU_PROCESSING_STATUS.PENDING) {
                // Job already picked up by another instance - skip immediately
                // Strict idempotency: only PENDING jobs can be processed
                logger.info(`[processMenuImagesJob] Transaction - Job ${jobId} already being processed (status: ${jobData?.status}), skipping`);
                return false;
            }

            // Set timeoutAt to 10 minutes from now (spec Section 8.2)
            const timeoutMs = 10 * 60 * 1000; // 10 minutes
            const processingUpdate: Record<string, unknown> = {
                status: MENU_PROCESSING_STATUS.PROCESSING,
                startedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                timeoutAt: Timestamp.fromMillis(Date.now() + timeoutMs),
                currentStep: "Starting...",
                progress: 0,
                "timings.workerStartedAt": Timestamp.fromMillis(workerStartedAtMillis),
            };
            const createdAtMillis = timestampMillis(jobData?.createdAt || job.createdAt);
            if (createdAtMillis !== null) {
                processingUpdate["timings.queueWaitMs"] = Math.max(0, workerStartedAtMillis - createdAtMillis);
            }
            transaction.update(jobRef, processingUpdate);
            return true;
        });

        if (!updated) {
            return; // Job already being processed
        }

        await markPublicDraftExtractionProcessing(job);

        logger.info(`[processMenuImagesJob] === STEP 1 COMPLETE - Transaction updated ===`, {
            jobId,
            step: 'TRANSACTION_COMPLETE',
            status: MENU_PROCESSING_STATUS.PROCESSING,
            timestamp: Date.now()
        });

        const outletPolicyBlockReason = await getOutletExtractionPolicyBlockReason(
            job,
            await loadExistingProject(),
        );
        if (outletPolicyBlockReason) {
            logger.warn(`[processMenuImagesJob] Outlet policy blocked extraction`, {
                jobId,
                projectId: job.projectId,
                storeId: job.sId,
                tenantId: job.tId,
                reason: outletPolicyBlockReason,
            });
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.FAILED,
                completedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
                progress: 0,
                currentStep: "Blocked by outlet rules",
                error: {
                    code: "OUTLET_POLICY_BLOCKED",
                    message: outletPolicyBlockReason,
                    retryable: false,
                },
            });
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // Step 2: Process images using existing AI logic
        // Spec Reference: Section 5 (Function Design)
        // Note: Removed pre-AI cancellation check to save 1 read
        //       (AI is the expensive part, so we check AFTER)
        // ─────────────────────────────────────────────────────────────

        // Build request for existing processMenuImagesLogic
        logger.info(`[processMenuImagesJob] === STEP 2 START - Building AI request ===`, {
            jobId,
            step: 'AI_REQUEST_BUILD',
            filesCount: job.files.length,
            targetLanguages: job.targetLanguages,
            timestamp: Date.now()
        });
        const request: ProcessMenuImagesRequest = {
            files: job.files.map(f => ({
                uid: f.uid,
                name: f.name,
                size: f.size,
                type: f.type,
                url: f.url,
            })),
            targetLanguages: job.targetLanguages,
            projectId: job.projectId,
            action: job.action || "IMAGE_PROCESSING",
            businessCategory: job.businessCategory,
            businessType: job.businessType,
            auditContext: {
                jobId,
                tId: job.tId,
                sId: job.sId,
                uId: job.uId,
                source: job.source,
                destinationType: job.destinationType || job.destination?.type,
                destinationId: job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT
                    ? job.destination.draftId
                    : job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
                        ? job.destination.sessionId
                        : job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
                            ? job.destination.projectId
                            : job.projectId,
                jobMode: job.jobMode,
                skipProjectSave,
            },
        };

        // Link imports can arrive as clean text artifacts after safe acquisition
        // and browser rendering. Parse those directly when names/prices are
        // already explicit; otherwise fall through to the normal AI extractor.
        logger.info(`[processMenuImagesJob] === STEP 2 AI PROCESSING START ===`, {
            jobId,
            step: 'AI_PROCESSING_START',
            timestamp: Date.now()
        });

        aiStartedAtMillis = Date.now();
        const deterministicLinkResult = await tryExtractMenuLinkTextFromJob(jobId, job);
        const result = deterministicLinkResult || await processMenuImagesLogic(request);
        aiCompletedAtMillis = Date.now();

        logger.info(`[processMenuImagesJob] === STEP 2 AI PROCESSING COMPLETE ===`, {
            jobId,
            step: 'AI_PROCESSING_COMPLETE',
            hasResult: !!result,
            hasData: !!result?.data,
            hasDataData: !!result?.data?.data,
            qualityScore: result?.data?.qualityScore,
            categoriesCount: result?.data?.data?.categories?.length,
            itemsCount: result?.data?.data?.items?.length,
            extractionProvider: deterministicLinkResult ? 'deterministic-text-parser' : 'ai',
            timestamp: Date.now()
        });

        // ─────────────────────────────────────────────────────────────
        // Step 2b: Extraction Hardening (P1 — Mar 2026)
        // Category normalization + integrity validation + anomaly detection
        // Non-blocking: logs issues but never fails the job
        // ─────────────────────────────────────────────────────────────
        try {
            const hardening = hardenExtractedData(result.data.data);
            // Apply normalized data back (categories merged, items remapped)
            result.data.data = hardening.data;

            logger.info(`[processMenuImagesJob] Hardening complete`, {
                jobId,
                categoriesMerged: hardening.normalization.mergedCategories,
                categoriesRenamed: hardening.normalization.renamedCategories,
                integrityValid: hardening.integrity.valid,
                integrityIssues: hardening.integrity.issueCount,
                anomalyFlags: hardening.anomalies.length,
            });
        } catch (hardeningError: any) {
            // Hardening failure must NEVER block extraction
            logger.warn(`[processMenuImagesJob] Hardening failed (non-blocking)`, {
                jobId,
                error: hardeningError.message,
            });
        }

        const mergedBusinessProfile = mergeExtractedBusinessProfiles(
            result.data.data?.extractedBusinessProfile,
            buildProfileFromIdentityCheck(job),
        );
        result.data.data = {
            ...result.data.data,
            ...(mergedBusinessProfile ? { extractedBusinessProfile: mergedBusinessProfile } : {}),
        };

        const extractionShapeError = getExtractionShapeError(result.data.data);
        if (extractionShapeError) {
            throw new Error(extractionShapeError);
        }
        const extractedBusinessProfile = result.data.data?.extractedBusinessProfile;
        postProcessingCompletedAtMillis = Date.now();

        // ─────────────────────────────────────────────────────────────
        // Step 3: Check for cancellation after AI processing
        // Note: Single check after AI (AI is the expensive part)
        // ─────────────────────────────────────────────────────────────
        const postProcessJob = await jobRef.get();
        if (postProcessJob.data()?.status === MENU_PROCESSING_STATUS.CANCELLING) {
            const cancelledAtMillis = Date.now();
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.CANCELLED,
                completedAt: Timestamp.fromMillis(cancelledAtMillis),
                updatedAt: Timestamp.fromMillis(cancelledAtMillis),
                currentStep: "Cancelled after AI processing",
                // Save partial results
                result: {
                    combinedData: result.data.data,
                    ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                    summary: buildExtractionResultSummary(result.data.data, null, extractedBusinessProfile),
                },
                timings: buildExtractionTimings({
                    aiCompletedAtMillis,
                    aiStartedAtMillis,
                    completedAtMillis: cancelledAtMillis,
                    jobCreatedAt: job.createdAt,
                    postProcessingCompletedAtMillis,
                    providerTimings: result.timings,
                    workerStartedAtMillis,
                }),
            });
            logger.info(`[processMenuImagesJob] Job ${jobId} cancelled after AI processing`);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // Step 4: Update progress - AI complete, now processing
        // OPTIMIZATION: Single update instead of 3 separate ones (70%, 80%, 90%)
        // ─────────────────────────────────────────────────────────────
        await jobRef.update({
            currentStep: "Processing complete, saving to project...",
            progress: 50,
            updatedAt: Timestamp.now(),
            timings: buildExtractionTimings({
                aiCompletedAtMillis,
                aiStartedAtMillis,
                jobCreatedAt: job.createdAt,
                postProcessingCompletedAtMillis,
                providerTimings: result.timings,
                workerStartedAtMillis,
            }),
        });

        // ─────────────────────────────────────────────────────────────
        // Step 5: Fetch existing project and detect first extraction
        // Spec Reference: ai-extraction-integration.md Section 5.2
        // ─────────────────────────────────────────────────────────────

        logger.info(`[processMenuImagesJob] === STEP 5 START - Resolving project context ===`, {
            jobId,
            projectId: job.projectId,
            step: 'FETCH_PROJECT',
            skipProjectSave,
            timestamp: Date.now()
        });

        // Fetch existing project to get existing categories (Section 8.12).
        // Messaging onboarding only needs extraction output for its session,
        // so it skips the temp project read/write/delete cycle.
        const existingProject = await loadExistingProject();

        logger.info(`[processMenuImagesJob] === STEP 5 PROJECT CONTEXT RESOLVED ===`, {
            jobId,
            projectId: job.projectId,
            step: 'PROJECT_FETCHED',
            hasExistingProject: !!existingProject,
            existingFilesCount: existingProject?.files?.length || 0,
            skipProjectSave,
            timestamp: Date.now()
        });
        const primaryLang = job.targetLanguages[0]?.code || 'en';
        const existingCategories = existingProject?.files
            ? buildExistingCategoriesMap(existingProject.files, primaryLang)
            : undefined;
        const businessCategory = resolveJobBusinessCategory(
            job.businessType || existingProject?.businessType,
            job.businessCategory || existingProject?.businessCategory,
        );
        const categoriesBeforeIconDefaults = result.data.data?.categories?.length || 0;
        result.data.data = {
            ...result.data.data,
            categories: applyCategoryIconDefaults(
                result.data.data?.categories || [],
                result.data.data?.items || [],
                businessCategory,
            ),
        };
        const categoriesWithIconDefaults = (result.data.data?.categories || []).filter((category: any) => typeof category?.icon === 'string' && category.icon.length > 0).length;

        logger.info(`[processMenuImagesJob] Category icon defaults applied`, {
            jobId,
            businessCategory: businessCategory || null,
            categoriesCount: categoriesBeforeIconDefaults,
            categoriesWithIcons: categoriesWithIconDefaults,
            hasExtractedBusinessProfile: Boolean(extractedBusinessProfile),
        });

        // Detect first extraction vs re-extraction
        // First extraction = no existing menu items
        // Re-extraction = has existing menu items → needs preview/review
        // EXCEPTION: Linked outlets always require review (even first extraction)
        //            because they have master items, local items, and overrides
        const hasExistingItems = existingProject?.files?.some((f: any) => f.extractedData?.data?.items?.length > 0);
        const isLinkedOutlet = !!existingProject?.masterProjectId;

        // Linked outlets always require review for safety
        const forceReview = job.forceReview === true;
        const requiresReview = skipProjectSave ? false : (forceReview || hasExistingItems || isLinkedOutlet);
        const isFirstExtraction = !requiresReview;

        logger.info(`[processMenuImagesJob] Extraction type detected`, {
            jobId,
            isFirstExtraction,
            hasExistingItems,
            isLinkedOutlet,
            forceReview,
            source: job.source || null,
            existingFilesCount: existingProject?.files?.length || 0,
            masterProjectId: existingProject?.masterProjectId || null,
        });

        // Wrap result.data in the format expected by processParallelResponse
        // Cast to any to handle flexible AI output format
        const combinedResponse = {
            data: result.data.data as any,
            qualityScore: result.data.qualityScore,
            qualityDetails: result.data.qualityDetails,
        };

        // Calculate per-file results (including processingMessages - Section 8.14)
        const fileResults: { [uid: string]: { categoriesCount: number; itemsCount: number; processingMessages?: any[] } } = {};

        // ─────────────────────────────────────────────────────────────
        // Step 6: Branch based on first extraction vs re-extraction
        // Spec Reference: ai-extraction-integration.md Section 6.2
        // ─────────────────────────────────────────────────────────────

        if (isFirstExtraction) {
            // ═══════════════════════════════════════════════════════════
            // FIRST EXTRACTION: Auto-save directly (existing behavior)
            // Fast onboarding - no review needed
            // ═══════════════════════════════════════════════════════════

            logger.info(`[processMenuImagesJob] === STEP 6 FIRST EXTRACTION - Processing ===`, {
                jobId,
                step: 'FIRST_EXTRACTION_START',
                isFirstExtraction,
                timestamp: Date.now()
            });

            // Redistribute and transform IDs (passing existing categories for cross-file refs)
            logger.info(`[processMenuImagesJob] === STEP 6 REDISTRIBUTING DATA ===`, {
                jobId,
                step: 'REDISTRIBUTE_START',
                filesCount: job.files.length,
                timestamp: Date.now()
            });

            const redistributedData = processParallelResponse(combinedResponse, job.files, existingCategories);

            logger.info(`[processMenuImagesJob] === STEP 6 REDISTRIBUTION COMPLETE ===`, {
                jobId,
                step: 'REDISTRIBUTE_COMPLETE',
                redistributedDataSize: redistributedData?.size,
                timestamp: Date.now()
            });

            redistributedData.forEach((extractedData, fileUid) => {
                fileResults[fileUid] = {
                    categoriesCount: extractedData?.data?.categories?.length || 0,
                    itemsCount: extractedData?.data?.items?.length || 0,
                    ...(extractedData?.processingMessages?.length ? {
                        processingMessages: extractedData.processingMessages
                    } : {})
                };
            });
            const redistributedFiles = Object.fromEntries([...redistributedData.entries()]);

            saveStartedAtMillis = Date.now();
            if (!skipProjectSave) {
                // Save files to project directly
                logger.info(`[processMenuImagesJob] === STEP 6 SAVING TO PROJECT ===`, {
                    jobId,
                    projectId: job.projectId,
                    step: 'SAVE_TO_PROJECT_START',
                    filesCount: job.files.length,
                    redistributedDataSize: redistributedData?.size,
                    timestamp: Date.now(),
                    fullRedistributedData: JSON.stringify([...redistributedData.entries()])
                });

                await saveFilesToProject(
                    job.projectId,
                    redistributedData,
                    job.files,
                    result.data.data.languages || [],
                    true, // enableAutoMerge
                    existingProject,
                    extractedBusinessProfile,
                );

                let businessAttributeDefaultsApplied = false;
                try {
                    businessAttributeDefaultsApplied = await applyMenuDerivedBusinessAttributeDefaultsForStore({
                        storeId: job.sId,
                        menuData: result.data.data,
                        context: 'processMenuImagesJob:firstExtraction',
                    });
                } catch (attributeError: any) {
                    logger.warn(`[processMenuImagesJob] Business attribute defaults failed (non-blocking)`, {
                        jobId,
                        storeId: job.sId,
                        error: attributeError?.message || String(attributeError),
                    });
                }
                if (!businessAttributeDefaultsApplied) {
                    await revalidatePublicClientCacheForStore(job.sId, 'processMenuImagesJob:firstExtractionProjectSave');
                }

                logger.info(`[processMenuImagesJob] === STEP 6 SAVE TO PROJECT COMPLETE ===`, {
                    jobId,
                    projectId: job.projectId,
                    step: 'SAVE_TO_PROJECT_COMPLETE',
                    timestamp: Date.now()
                });

                // Verify the project was actually updated
                const projectVerifyRef = firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(String(job.tId)).collection(String(job.sId)).doc(job.projectId);
                const verifyDoc = await projectVerifyRef.get();
                logger.info(`[processMenuImagesJob] === VERIFY PROJECT UPDATE ===`, {
                    jobId,
                    projectId: job.projectId,
                    projectExists: verifyDoc.exists,
                    projectFilesCount: verifyDoc.data()?.files?.length || 0,
                    projectLanguages: verifyDoc.data()?.languages || [],
                    projectPath: projectVerifyRef.path,
                });
            } else {
                logger.info(`[processMenuImagesJob] Project save skipped for extraction-only job`, {
                    jobId,
                    projectId: job.projectId,
                    source: job.source || null,
                });
                await updatePublicDraftFromExtraction(jobId, job, result.data.data, redistributedFiles);
            }
            saveCompletedAtMillis = Date.now();

            // Compute confidence summary (Infrastructure Compounding 10.1)
            const confidenceSummary = computeConfidenceSummary(
                (result.data.data?.items as MenuItem[]) || []
            );
            const completedAtMillis = Date.now();

            // Update job as completed
            logger.info(`[processMenuImagesJob] Updating job status to COMPLETED`, { jobId });
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.COMPLETED,
                completedAt: Timestamp.fromMillis(completedAtMillis),
                ...buildExtractionDetailRetentionFields(completedAtMillis),
                updatedAt: Timestamp.fromMillis(completedAtMillis),
                progress: 100,
                currentStep: "Completed",
                isFirstExtraction: true,
                result: {
                    combinedData: result.data.data,
                    ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                    summary: buildExtractionResultSummary(result.data.data, confidenceSummary, extractedBusinessProfile),
                    batchResults: (result as any).batchResults,
                    // Infrastructure Compounding 10.1 — piggybacked on existing write
                    ...(confidenceSummary ? { confidenceSummary } : {}),
                    ...(skipProjectSave ? { redistributedFiles } : {}),
                    // Extraction provenance (P0 hardening — Mar 2026)
                    ...(result.provenance ? {
                        rawBatchResponses: result.provenance.rawBatchResponses,
                        promptVersion: result.provenance.promptVersion,
                        model: result.provenance.model,
                    } : {}),
                },
                timings: buildExtractionTimings({
                    aiCompletedAtMillis,
                    aiStartedAtMillis,
                    completedAtMillis,
                    jobCreatedAt: job.createdAt,
                    postProcessingCompletedAtMillis,
                    providerTimings: result.timings,
                    saveCompletedAtMillis,
                    saveStartedAtMillis,
                    workerStartedAtMillis,
                }),
                fileResults,
                transaction: {
                    transactionId: result.transaction.transactionId,
                    totalCredits: result.transaction.totalCredits,
                    totalCharge: result.transaction.totalCharge,
                    unitsConsumed: result.transaction.unitsConsumed || 0,
                    tokenUsage: {
                        promptTokenCount: result.transaction.promptTokenCount || 0,
                        candidatesTokenCount: result.transaction.candidatesTokenCount || 0,
                        totalTokenCount: result.transaction.totalTokenCount || 0,
                    },
                },
            });

            logger.info(`[processMenuImagesJob] Job status updated to COMPLETED successfully`, { jobId });

            logger.info(`[processMenuImagesJob] First extraction completed - auto-saved`, {
                jobId,
                projectId: job.projectId,
                qualityScore: result.data.qualityScore,
                categoriesCount: result.data.data.categories?.length || 0,
                itemsCount: result.data.data.items?.length || 0,
                processingTime: result.transaction.processingTime,
            });

        } else {
            // ═══════════════════════════════════════════════════════════
            // RE-EXTRACTION: Write raw data, set preview_ready
            // Client will handle comparison, review, and save
            // ═══════════════════════════════════════════════════════════

            // Set TTL to 24 hours for unapproved jobs
            const ttlMs = 24 * 60 * 60 * 1000; // 24 hours

            // Compute confidence summary (Infrastructure Compounding 10.1)
            const reExtractConfidence = computeConfidenceSummary(
                (result.data.data?.items as MenuItem[]) || []
            );

            const previewReadyAtMillis = Date.now();
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.PREVIEW_READY,
                updatedAt: Timestamp.fromMillis(previewReadyAtMillis),
                ...buildExtractionDetailRetentionFields(previewReadyAtMillis),
                progress: 100,
                currentStep: "Preview ready - awaiting review",
                isFirstExtraction: false,
                expiresAt: Timestamp.fromMillis(Date.now() + ttlMs),
                result: {
                    combinedData: result.data.data, // Raw combined data with sourceFileIndex
                    ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
                    qualityScore: result.data.qualityScore,
                    qualityDetails: result.data.qualityDetails,
                    processingTime: result.transaction.processingTime,
                    summary: buildExtractionResultSummary(result.data.data, reExtractConfidence, extractedBusinessProfile),
                    batchResults: (result as any).batchResults,
                    // Infrastructure Compounding 10.1 — piggybacked on existing write
                    ...(reExtractConfidence ? { confidenceSummary: reExtractConfidence } : {}),
                    // Extraction provenance (P0 hardening — Mar 2026)
                    ...(result.provenance ? {
                        rawBatchResponses: result.provenance.rawBatchResponses,
                        promptVersion: result.provenance.promptVersion,
                        model: result.provenance.model,
                    } : {}),
                },
                timings: buildExtractionTimings({
                    aiCompletedAtMillis,
                    aiStartedAtMillis,
                    jobCreatedAt: job.createdAt,
                    postProcessingCompletedAtMillis,
                    previewReadyAtMillis,
                    providerTimings: result.timings,
                    workerStartedAtMillis,
                }),
                transaction: {
                    transactionId: result.transaction.transactionId,
                    totalCredits: result.transaction.totalCredits,
                    totalCharge: result.transaction.totalCharge,
                    unitsConsumed: result.transaction.unitsConsumed || 0,
                    tokenUsage: {
                        promptTokenCount: result.transaction.promptTokenCount || 0,
                        candidatesTokenCount: result.transaction.candidatesTokenCount || 0,
                        totalTokenCount: result.transaction.totalTokenCount || 0,
                    },
                },
            });

            logger.info(`[processMenuImagesJob] Re-extraction ready for preview`, {
                jobId,
                projectId: job.projectId,
                qualityScore: result.data.qualityScore,
                categoriesCount: result.data.data.categories?.length || 0,
                itemsCount: result.data.data.items?.length || 0,
                processingTime: result.transaction.processingTime,
                expiresIn: '24 hours',
            });
        }

    } catch (error: any) {
        // ─────────────────────────────────────────────────────────────
        // Step 7: Update job as failed
        // Spec Reference: Section 4 (Data Models - error field)
        // Safety: If this update itself fails, the 15-min cleanup
        // scheduler will catch the job via timeoutAt and mark it failed.
        // ─────────────────────────────────────────────────────────────
        logger.error(`[processMenuImagesJob] Job ${jobId} failed`, {
            jobId,
            projectId: job.projectId,
            error: error.message,
        });

        try {
            await markPublicDraftExtractionFailed(
                job,
                job.destination?.type === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT && job.destination.sourceType === "menu_link_import"
                    ? "We could not read this menu link. Upload a photo or try another public menu link."
                    : "Extraction failed. Please try again with a clearer photo.",
            );
            const failedAtMillis = Date.now();
            await jobRef.update({
                status: MENU_PROCESSING_STATUS.FAILED,
                completedAt: Timestamp.fromMillis(failedAtMillis),
                updatedAt: Timestamp.fromMillis(failedAtMillis),
                progress: 0,
                currentStep: "Failed",
                timings: buildExtractionTimings({
                    aiCompletedAtMillis,
                    aiStartedAtMillis,
                    failedAtMillis,
                    jobCreatedAt: job.createdAt,
                    postProcessingCompletedAtMillis,
                    saveCompletedAtMillis,
                    saveStartedAtMillis,
                    workerStartedAtMillis,
                }),
                error: {
                    code: getErrorCode(error),
                    message: error.message || "Unknown error",
                    retryable: isRetryable(error),
                    ...(getRetryAfterSeconds(error) ? { retryAfterSeconds: getRetryAfterSeconds(error) } : {}),
                },
            });
        } catch (updateError: any) {
            // Critical: job stuck in 'processing' — cleanup scheduler handles via timeoutAt
            logger.error(`[processMenuImagesJob] CRITICAL: Failed to update job ${jobId} status to failed`, {
                jobId,
                originalError: error.message,
                updateError: updateError.message,
            });
        }

    }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map error to error code
 */
function getErrorCode(error: any): string {
    const message = error.message?.toLowerCase() || "";

    if (message.includes("rate limit") || message.includes("quota")) {
        return "RATE_LIMIT";
    }
    if (message.includes("timeout")) {
        return "TIMEOUT";
    }
    if (message.includes("circuit") || message.includes("breaker")) {
        return "CIRCUIT_BREAKER";
    }
    if (message.includes("gemini") || message.includes("ai")) {
        return "AI_ERROR";
    }
    if (message.includes("upload") || message.includes("file")) {
        return "FILE_ERROR";
    }

    return "INTERNAL_ERROR";
}

/**
 * Determine if error is retryable
 */
function isRetryable(error: any): boolean {
    const code = getErrorCode(error);

    // Rate limits, timeouts, circuit breaker trips, and transient AI errors are retryable
    // FILE_ERROR and INTERNAL_ERROR are NOT retryable (likely persistent issues)
    return code === "RATE_LIMIT" || code === "TIMEOUT" || code === "CIRCUIT_BREAKER" || code === "AI_ERROR";
}

function getRetryAfterSeconds(error: any): number | null {
    const message = String(error?.message || error || "");
    const retryDelayMatch = message.match(/retryDelay["']?\s*:\s*["']?(\d+(?:\.\d+)?)s/i);
    const retryInMatch = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
    const waitSecondsMatch = message.match(/wait\s+(\d+(?:\.\d+)?)\s+seconds/i);
    const value = retryDelayMatch?.[1] || retryInMatch?.[1] || waitSecondsMatch?.[1];
    if (!value) return null;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}
