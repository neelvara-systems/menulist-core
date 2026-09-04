import {
    MENU_EXTRACTION_DESTINATION_TYPES,
    MENU_EXTRACTION_JOB_LIMITS,
    type MenuExtractionJobDestination,
} from '@data/shared/menuExtractionJob';
import { normalizeBusinessAttributeInferenceKey } from '@data/shared/businessAttributeInference';
import { normalizeCategoryIcon } from '@data/shared/categoryIconSuggestions';
import { normalizeExtractedBusinessProfile } from '@data/shared/extractedBusinessProfile';
import type {
    MenuProcessingCombinedData,
    MenuProcessingFileMessage,
    MenuProcessingJobStatus,
    MenuProcessingLocalizedText,
} from '@lib/firebase/menuProcessing';
import { normalizeMenuExtractionProjectId } from './projectIdBoundary';

const JOB_STATUSES = new Set<MenuProcessingJobStatus['status']>([
    'pending',
    'processing',
    'preview_ready',
    'cancelling',
    'cancelled',
    'completed',
    'failed',
]);
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low']);
const SPICE_LEVELS = new Set(['none', 'mild', 'medium', 'hot', 'very-hot']);
// The worker admits at most 200 categories and 1,000 items per ten-file
// provider batch. A job accepts fifteen files, so the persisted combined
// result can contain two valid batches.
const MAX_CATEGORIES = 400;
const MAX_ITEMS = 2_000;
const MAX_ATTRIBUTES_PER_ITEM = 50;
const MAX_LOCALIZED_VALUES = 12;
const MAX_TAGS = 40;
const MAX_FILE_MESSAGES = 100;
const MAX_FILE_RESULTS = MENU_EXTRACTION_JOB_LIMITS.MAX_FILES;
const INVALID_JOB_ERROR_CODE = 'MENU_PROCESSING_JOB_DATA_INVALID';

type RecordValue = Record<string, unknown>;

export interface MenuProcessingJobStatusNormalization {
    issueCode?: typeof INVALID_JOB_ERROR_CODE;
    job: MenuProcessingJobStatus;
}

function getRecord(value: unknown): RecordValue | null {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value as RecordValue
        : null;
}

function cleanString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return cleaned ? cleaned.slice(0, maxLength) : null;
}

function normalizeId(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return null;
    return cleanString(String(value), 160);
}

function normalizeFiniteNumber(
    value: unknown,
    minimum: number,
    maximum: number,
): number | null {
    return typeof value === 'number'
        && Number.isFinite(value)
        && value >= minimum
        && value <= maximum
        ? value
        : null;
}

function normalizeInteger(value: unknown, minimum: number, maximum: number): number | null {
    const number = normalizeFiniteNumber(value, minimum, maximum);
    return number !== null && Number.isInteger(number) ? number : null;
}

function normalizeLocalizedText(value: unknown): MenuProcessingLocalizedText | null {
    if (typeof value === 'string') {
        const text = cleanString(value, 2_000);
        return text ? { en: text } : null;
    }

    const record = getRecord(value);
    if (!record) return null;
    const output: MenuProcessingLocalizedText = {};
    for (const [rawCode, rawText] of Object.entries(record).slice(0, MAX_LOCALIZED_VALUES)) {
        const code = cleanString(rawCode, 12)?.toLowerCase();
        const text = cleanString(rawText, 2_000);
        if (code && /^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(code) && text) {
            output[code] = text;
        }
    }
    return Object.keys(output).length > 0 ? output : null;
}

function normalizeStringList(value: unknown, maximum = MAX_TAGS): string[] | undefined {
    const candidates = Array.isArray(value)
        ? value
        : getRecord(value)
            ? Object.values(getRecord(value) as RecordValue)
            : [];
    const result: string[] = [];
    const seen = new Set<string>();
    for (const candidate of candidates) {
        const values = typeof candidate === 'string' ? candidate.split(',') : [];
        for (const valueEntry of values) {
            const text = cleanString(valueEntry, 100);
            const key = text?.toLowerCase();
            if (text && key && !seen.has(key)) {
                seen.add(key);
                result.push(text);
            }
            if (result.length >= maximum) break;
        }
        if (result.length >= maximum) break;
    }
    return result.length > 0 ? result : undefined;
}

function normalizeSourceFileIndex(value: unknown): number | null {
    return normalizeInteger(value, 0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES - 1);
}

function normalizeFileMessage(value: unknown): MenuProcessingFileMessage | null {
    const record = getRecord(value);
    if (!record) return null;
    const sourceFileIndex = normalizeSourceFileIndex(record.sourceFileIndex);
    const status = record.status === 'error' || record.status === 'warning' ? record.status : null;
    const type = cleanString(record.type, 80);
    const message = cleanString(record.message, 500);
    if (sourceFileIndex === null || !status || !type || !message) return null;

    const details = getRecord(record.details);
    const omittedItems = Array.isArray(details?.omittedItems)
        ? details.omittedItems.slice(0, 100).flatMap((entry) => {
            const item = getRecord(entry);
            const reason = cleanString(item?.reason, 300);
            if (!item || !reason) return [];
            const position = cleanString(item.position, 80);
            const partialName = cleanString(item.partialName, 160);
            return [{
                ...(position ? { position } : {}),
                ...(partialName ? { partialName } : {}),
                reason,
            }];
        })
        : undefined;
    const affectedFields = Array.isArray(details?.affectedFields)
        ? details.affectedFields.slice(0, 100).flatMap((entry) => {
            const item = getRecord(entry);
            const field = cleanString(item?.field, 80);
            const reason = cleanString(item?.reason, 300);
            if (!item || !field || !reason) return [];
            const itemId = normalizeInteger(item.itemId, 0, Number.MAX_SAFE_INTEGER);
            const itemName = cleanString(item.itemName, 160);
            return [{
                ...(itemId !== null ? { itemId } : {}),
                ...(itemName ? { itemName } : {}),
                field,
                reason,
            }];
        })
        : undefined;
    const omittedCount = normalizeInteger(details?.omittedCount, 0, 100_000);
    const extractedCount = normalizeInteger(details?.extractedCount, 0, 100_000);
    const normalizedDetails = omittedItems?.length || affectedFields?.length
        || omittedCount !== null || extractedCount !== null
        ? {
            ...(omittedItems?.length ? { omittedItems } : {}),
            ...(affectedFields?.length ? { affectedFields } : {}),
            ...(omittedCount !== null ? { omittedCount } : {}),
            ...(extractedCount !== null ? { extractedCount } : {}),
        }
        : undefined;

    return { sourceFileIndex, status, type, message, ...(normalizedDetails ? { details: normalizedDetails } : {}) };
}

function normalizeCombinedData(value: unknown): MenuProcessingCombinedData | null {
    const record = getRecord(value);
    if (!record || !Array.isArray(record.categories) || !Array.isArray(record.items) || !Array.isArray(record.languages)) {
        return null;
    }
    if (record.categories.length > MAX_CATEGORIES || record.items.length > MAX_ITEMS || record.languages.length > MAX_LOCALIZED_VALUES) {
        return null;
    }

    const categories = record.categories.map((entry) => {
        const category = getRecord(entry);
        const id = normalizeId(category?.id);
        const sourceFileIndex = normalizeSourceFileIndex(category?.sourceFileIndex);
        const name = normalizeLocalizedText(category?.name);
        if (!category || !id || sourceFileIndex === null || !name) return null;
        const icon = normalizeCategoryIcon(category.icon);
        return {
            id,
            sourceFileIndex,
            name,
            ...(typeof category.active === 'boolean' ? { active: category.active } : {}),
            ...(icon ? { icon } : {}),
        };
    });
    if (categories.some((category) => category === null)) return null;

    const categoryNames = new Map(
        categories.map((category) => [category?.id, Object.values(category?.name || {})[0] || '']),
    );
    const items = record.items.map((entry) => {
        const item = getRecord(entry);
        const id = normalizeId(item?.id);
        const sourceFileIndex = normalizeSourceFileIndex(item?.sourceFileIndex);
        const name = normalizeLocalizedText(item?.name);
        const category = normalizeId(item?.category ?? item?.categoryId);
        if (!item || !id || sourceFileIndex === null || !name || !category) return null;
        if (item.attributes !== undefined && (!Array.isArray(item.attributes) || item.attributes.length > MAX_ATTRIBUTES_PER_ITEM)) {
            return null;
        }
        const attributes = Array.isArray(item.attributes)
            ? item.attributes.map((entryValue) => {
                const attribute = getRecord(entryValue);
                const attributeId = normalizeId(attribute?.id);
                const attributeName = normalizeLocalizedText(attribute?.name);
                if (!attribute || !attributeId || !attributeName) return null;
                const price = normalizeId(attribute.price);
                return {
                    id: attributeId,
                    name: attributeName,
                    ...(price ? { price } : {}),
                    active: attribute.active !== false,
                };
            })
            : undefined;
        if (attributes?.some((attribute) => attribute === null)) return null;
        const description = normalizeLocalizedText(item.description);
        const price = normalizeId(item.price);
        const tags = normalizeStringList(item.tags);
        const dietaryTags = normalizeStringList(item.dietaryTags);
        const rawSpiceLevel = cleanString(item.spiceLevel, 20)?.toLowerCase();
        const spiceLevel = rawSpiceLevel && SPICE_LEVELS.has(rawSpiceLevel)
            ? rawSpiceLevel as 'none' | 'mild' | 'medium' | 'hot' | 'very-hot'
            : undefined;
        const duration = normalizeFiniteNumber(item.duration, 0, 1_440);
        return {
            id,
            sourceFileIndex,
            name,
            category,
            categoryId: category,
            categoryName: categoryNames.get(category) || '',
            ...(description ? { description } : {}),
            ...(price ? { price } : {}),
            ...(attributes?.length ? { attributes: attributes.filter((attribute) => attribute !== null) } : {}),
            ...(tags ? { tags } : {}),
            ...(dietaryTags ? { dietaryTags } : {}),
            ...(spiceLevel ? { spiceLevel } : {}),
            ...(duration !== null ? { duration } : {}),
            ...(typeof item.active === 'boolean' ? { active: item.active } : {}),
        };
    });
    if (items.some((item) => item === null)) return null;

    const languages = record.languages.map((entry) => {
        const language = getRecord(entry);
        const name = cleanString(language?.name, 80);
        const code = cleanString(language?.code, 12)?.toLowerCase();
        if (!language || !name || !code || !/^[a-z]{2,3}(?:-[a-z]{2,4})?$/.test(code)) return null;
        return { name, code, ...(typeof language.isPrimary === 'boolean' ? { isPrimary: language.isPrimary } : {}) };
    });
    if (languages.some((language) => language === null)) return null;

    const suggestions = Array.isArray(record.businessAttributeSuggestions)
        ? record.businessAttributeSuggestions.slice(0, 100).flatMap((entry) => {
            const suggestion = getRecord(entry);
            const key = normalizeBusinessAttributeInferenceKey(suggestion?.key);
            if (!suggestion || !key || suggestion.value !== true) return [];
            const confidence = typeof suggestion.confidence === 'string' && CONFIDENCE_VALUES.has(suggestion.confidence)
                ? suggestion.confidence as 'high' | 'medium' | 'low'
                : undefined;
            const evidence = cleanString(suggestion.evidence, 300);
            const sourceFileIndex = normalizeSourceFileIndex(suggestion.sourceFileIndex);
            return [{
                key,
                value: true as const,
                ...(confidence ? { confidence } : {}),
                ...(evidence ? { evidence } : {}),
                ...(sourceFileIndex !== null ? { sourceFileIndex } : {}),
            }];
        })
        : undefined;
    const fileMessages = Array.isArray(record.fileMessages)
        ? record.fileMessages.slice(0, MAX_FILE_MESSAGES).flatMap((entry) => {
            const message = normalizeFileMessage(entry);
            return message ? [message] : [];
        })
        : undefined;
    const extractedBusinessProfile = normalizeExtractedBusinessProfile(record.extractedBusinessProfile);

    return {
        categories: categories.filter((category) => category !== null),
        items: items.filter((item) => item !== null),
        languages: languages.filter((language) => language !== null),
        ...(suggestions?.length ? { businessAttributeSuggestions: suggestions } : {}),
        ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
        ...(fileMessages?.length ? { fileMessages } : {}),
    };
}

function normalizeQualityDetails(value: unknown) {
    const record = getRecord(value);
    if (!record) return null;
    const categoryQuality = normalizeFiniteNumber(record.categoryQuality, 0, 100);
    const itemQuality = normalizeFiniteNumber(record.itemQuality, 0, 100);
    const priceQuality = normalizeFiniteNumber(record.priceQuality, 0, 100);
    const descriptionQuality = normalizeFiniteNumber(record.descriptionQuality, 0, 100);
    return categoryQuality !== null && itemQuality !== null && priceQuality !== null && descriptionQuality !== null
        ? { categoryQuality, itemQuality, priceQuality, descriptionQuality }
        : null;
}

function normalizeResult(value: unknown): MenuProcessingJobStatus['result'] | null {
    const record = getRecord(value);
    if (!record) return null;
    const qualityScore = normalizeFiniteNumber(record.qualityScore, 0, 100);
    const qualityDetails = normalizeQualityDetails(record.qualityDetails);
    const processingTime = normalizeFiniteNumber(record.processingTime, 0, 86_400_000);
    if (qualityScore === null || !qualityDetails || processingTime === null) return null;
    const combinedData = record.combinedData === undefined ? undefined : normalizeCombinedData(record.combinedData);
    if (record.combinedData !== undefined && !combinedData) return null;

    const summaryRecord = getRecord(record.summary);
    const categoriesCount = normalizeInteger(summaryRecord?.categoriesCount, 0, 100_000);
    const itemsCount = normalizeInteger(summaryRecord?.itemsCount, 0, 1_000_000);
    const summary = categoriesCount !== null || itemsCount !== null
        ? { ...(categoriesCount !== null ? { categoriesCount } : {}), ...(itemsCount !== null ? { itemsCount } : {}) }
        : undefined;
    const batchResults = Array.isArray(record.batchResults)
        ? record.batchResults.slice(0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES).flatMap((entry) => {
            const batch = getRecord(entry);
            const batchIndex = normalizeInteger(batch?.batchIndex, 0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES - 1);
            const filesProcessed = normalizeInteger(batch?.filesProcessed, 0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES);
            return batch && batchIndex !== null && filesProcessed !== null && typeof batch.success === 'boolean'
                ? [{ batchIndex, filesProcessed, success: batch.success }]
                : [];
        })
        : undefined;
    const confidenceRecord = getRecord(record.confidenceSummary);
    const confidenceValues = confidenceRecord ? {
        highConfidenceCount: normalizeInteger(confidenceRecord.highConfidenceCount, 0, 1_000_000),
        mediumConfidenceCount: normalizeInteger(confidenceRecord.mediumConfidenceCount, 0, 1_000_000),
        lowConfidenceCount: normalizeInteger(confidenceRecord.lowConfidenceCount, 0, 1_000_000),
        averageConfidenceScore: normalizeFiniteNumber(confidenceRecord.averageConfidenceScore, 0, 1),
    } : null;
    const confidenceSummary = confidenceValues && Object.values(confidenceValues).every((entry) => entry !== null)
        ? {
            highConfidenceCount: confidenceValues.highConfidenceCount as number,
            mediumConfidenceCount: confidenceValues.mediumConfidenceCount as number,
            lowConfidenceCount: confidenceValues.lowConfidenceCount as number,
            averageConfidenceScore: confidenceValues.averageConfidenceScore as number,
        }
        : undefined;
    const rawBatchResponses = Array.isArray(record.rawBatchResponses)
        ? record.rawBatchResponses.slice(0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES).flatMap((entry) => {
            const batch = getRecord(entry);
            const batchIndex = normalizeInteger(batch?.batchIndex, 0, MENU_EXTRACTION_JOB_LIMITS.MAX_FILES - 1);
            const rawText = cleanString(batch?.rawText, 10_000);
            return batch && batchIndex !== null && rawText && typeof batch.truncated === 'boolean'
                ? [{ batchIndex, rawText, truncated: batch.truncated }]
                : [];
        })
        : undefined;
    const model = cleanString(record.model, 100);
    const promptVersion = cleanString(record.promptVersion, 100);
    const dataPrunedReason = cleanString(record.dataPrunedReason, 160);
    const redistributedFiles = getRecord(record.redistributedFiles);
    const extractedBusinessProfile = normalizeExtractedBusinessProfile(record.extractedBusinessProfile);

    return {
        qualityScore,
        qualityDetails,
        processingTime,
        ...(combinedData ? { combinedData } : {}),
        ...(summary ? { summary } : {}),
        ...(record.dataPrunedAt !== undefined ? { dataPrunedAt: record.dataPrunedAt } : {}),
        ...(dataPrunedReason ? { dataPrunedReason } : {}),
        ...(batchResults?.length ? { batchResults } : {}),
        ...(confidenceSummary ? { confidenceSummary } : {}),
        ...(model ? { model } : {}),
        ...(promptVersion ? { promptVersion } : {}),
        ...(rawBatchResponses?.length ? { rawBatchResponses } : {}),
        ...(redistributedFiles ? { redistributedFiles } : {}),
        ...(extractedBusinessProfile ? { extractedBusinessProfile } : {}),
    };
}

function normalizeDestination(value: unknown): MenuExtractionJobDestination | undefined {
    const record = getRecord(value);
    if (!record) return undefined;
    if (record.type === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT) {
        const projectId = normalizeMenuExtractionProjectId(record.projectId);
        const saveMode = record.saveMode === 'review' || record.saveMode === 'auto_or_review' ? record.saveMode : undefined;
        return projectId ? { type: record.type, projectId, ...(saveMode ? { saveMode } : {}) } : undefined;
    }
    return undefined;
}

function createInvalidJob(jobId: string): MenuProcessingJobStatus {
    return {
        id: jobId,
        projectId: '',
        status: 'failed',
        progress: 0,
        currentStep: '',
        createdAt: null,
        updatedAt: null,
        error: {
            code: INVALID_JOB_ERROR_CODE,
            message: 'Menu processing status could not be verified.',
            retryable: true,
        },
    };
}

export function normalizeMenuProcessingJobStatus(
    jobId: string,
    value: unknown,
): MenuProcessingJobStatusNormalization {
    const record = getRecord(value);
    const projectId = normalizeMenuExtractionProjectId(record?.projectId);
    const status = typeof record?.status === 'string' && JOB_STATUSES.has(record.status as MenuProcessingJobStatus['status'])
        ? record.status as MenuProcessingJobStatus['status']
        : null;
    if (!record || !projectId || !status) {
        return { issueCode: INVALID_JOB_ERROR_CODE, job: createInvalidJob(jobId) };
    }

    const rawResultPresent = record.result !== undefined;
    const result = rawResultPresent ? normalizeResult(record.result) : null;
    if (status === 'preview_ready' && (!result?.combinedData || !rawResultPresent)) {
        return { issueCode: INVALID_JOB_ERROR_CODE, job: createInvalidJob(jobId) };
    }
    const hasInvalidOptionalResult = rawResultPresent && !result;
    const progress = normalizeFiniteNumber(record.progress, 0, 100) ?? 0;
    const currentStep = cleanString(record.currentStep, 300) || '';
    const appliedChangeCount = normalizeInteger(record.appliedChangeCount, 1, 5_000);
    const source = cleanString(record.source, 80);
    const sourceFingerprint = cleanString(record.sourceFingerprint, 256);
    const sourceFingerprintVersion = normalizeInteger(record.sourceFingerprintVersion, 0, 100);
    const destination = normalizeDestination(record.destination);
    const destinationType = destination?.type;
    const sourceMetadata = getRecord(record.sourceMetadata);
    const timings = getRecord(record.timings);
    const errorRecord = getRecord(record.error);
    const errorCode = cleanString(errorRecord?.code, 100);
    const errorMessage = cleanString(errorRecord?.message, 500);
    const error = errorCode && errorMessage && typeof errorRecord?.retryable === 'boolean'
        ? { code: errorCode, message: errorMessage, retryable: errorRecord.retryable }
        : status === 'failed'
            ? { code: INVALID_JOB_ERROR_CODE, message: 'Menu processing failed.', retryable: true }
            : undefined;
    const fileResultsRecord = getRecord(record.fileResults);
    const fileResults = fileResultsRecord
        ? Object.fromEntries(Object.entries(fileResultsRecord).slice(0, MAX_FILE_RESULTS).flatMap(([uid, entry]) => {
            const file = getRecord(entry);
            const safeUid = cleanString(uid, 160);
            const categoriesCount = normalizeInteger(file?.categoriesCount, 0, 100_000);
            const itemsCount = normalizeInteger(file?.itemsCount, 0, 1_000_000);
            if (!file || !safeUid || categoriesCount === null || itemsCount === null) return [];
            const processingMessages = Array.isArray(file.processingMessages)
                ? file.processingMessages.slice(0, MAX_FILE_MESSAGES).flatMap((messageValue) => {
                    const message = normalizeFileMessage(messageValue);
                    return message ? [message] : [];
                })
                : undefined;
            return [[safeUid, { categoriesCount, itemsCount, ...(processingMessages?.length ? { processingMessages } : {}) }]];
        }))
        : undefined;

    return {
        ...(hasInvalidOptionalResult ? { issueCode: INVALID_JOB_ERROR_CODE } : {}),
        job: {
            id: jobId,
            projectId,
            status,
            progress,
            currentStep,
            createdAt: record.createdAt ?? null,
            updatedAt: record.updatedAt ?? null,
            ...(typeof record.isFirstExtraction === 'boolean' ? { isFirstExtraction: record.isFirstExtraction } : {}),
            ...(record.expiresAt !== undefined ? { expiresAt: record.expiresAt } : {}),
            ...(typeof record.forceReview === 'boolean' ? { forceReview: record.forceReview } : {}),
            ...(appliedChangeCount !== null ? { appliedChangeCount } : {}),
            ...(source ? { source } : {}),
            ...(sourceFingerprint ? { sourceFingerprint } : {}),
            ...(sourceFingerprintVersion !== null ? { sourceFingerprintVersion } : {}),
            ...(destination ? { destination } : {}),
            ...(destinationType ? { destinationType } : {}),
            ...(typeof record.skipProjectSave === 'boolean' ? { skipProjectSave: record.skipProjectSave } : {}),
            ...(sourceMetadata ? { sourceMetadata } : {}),
            ...(timings ? { timings } : {}),
            ...(result ? { result } : {}),
            ...(error ? { error } : {}),
            ...(fileResults && Object.keys(fileResults).length > 0 ? { fileResults } : {}),
        },
    };
}
