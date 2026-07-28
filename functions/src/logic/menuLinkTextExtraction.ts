import * as functions from 'firebase-functions';
import { storageAdmin } from '../firebaseAdmin';
import {
    ExtractedMenuData,
    MenuImageProcessingJob,
    ProcessMenuImagesResponse,
    QualityDetails,
} from '../types';
import {
    getBoundedFunctionsErrorCode,
    getBoundedFunctionsErrorName,
    getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';

const TEXT_SOURCE_KINDS = new Set([
    'html_text',
    'rendered_html_text',
    'plain_text',
    'json_text',
]);

const TEXT_CONTROL_LINES = new Set([
    'add',
    'add item',
    'all',
    'back',
    'cart',
    'checkout',
    'close',
    'contact',
    'continue',
    'feedback',
    'filter',
    'grid menu view',
    'home',
    'login',
    'menu',
    'of stock',
    'out',
    'out of stock',
    'policy',
    'privacy',
    'read more',
    'search',
    'select',
    'share',
    'social',
    'switch to dinein',
    'terms & conditions',
    'toggle navigation',
    'us',
    'veg',
    'view',
    'view details',
]);

const MAX_DESCRIPTION_CHARS = 500;
const MAX_DETERMINISTIC_ITEMS = 800;
const MENU_LINK_TEXT_EXTRACTION_SKIPPED_CODE = 'MENU_LINK_TEXT_EXTRACTION_SKIPPED';

function getMenuLinkTextExtractionErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode?: string;
    sourceErrorStatus?: string;
} {
    if (error instanceof Error) {
        const sourceErrorCode = getBoundedFunctionsErrorCode(error);
        const sourceErrorStatus = getBoundedFunctionsErrorStatus(error);

        return {
            sourceErrorName: getBoundedFunctionsErrorName(error) || 'Error',
            ...(sourceErrorCode === undefined ? {} : { sourceErrorCode }),
            ...(sourceErrorStatus === undefined ? {} : {
                sourceErrorStatus: sourceErrorStatus.toString(),
            }),
        };
    }

    return {
        sourceErrorName: typeof error,
    };
}

type ParsedCategory = {
    id: string;
    name: Record<string, string>;
    sourceFileIndex: number;
};

type ParsedItem = {
    id: string;
    name: Record<string, string>;
    category: string;
    sourceFileIndex: number;
    price: string;
    description?: Record<string, string>;
};

type TextParseResult = {
    categoryCountMarkers: number;
    data: ExtractedMenuData;
    truncated: boolean;
};

function normalizeTextLine(line: string): string {
    return line.replace(/\s+/g, ' ').trim();
}

function stripAcquisitionPreamble(text: string): string {
    const marker = 'Visible source text:';
    const markerIndex = text.indexOf(marker);
    return markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
}

function isCountLine(line: string): boolean {
    return /^\(\d{1,4}\)$/.test(line);
}

function isControlLine(line: string): boolean {
    const normalized = line.toLowerCase();
    return (
        TEXT_CONTROL_LINES.has(normalized) ||
        /^0+$/.test(normalized) ||
        /^upcoming offer\b/i.test(line)
    );
}

function extractPriceValue(line: string): string | null {
    if (line.length > 32) return null;

    const hasCurrency = /(?:\binr\b|\brs\.?\b|₹|\$|usd|eur|€|£)/i.test(line);
    const standalonePrice = /^\d{1,6}(?:[,.]\d{1,2})?$/.test(line);
    const currencyPrice = /^(?:\s*(?:inr|rs\.?|₹|\$|usd|eur|€|£)\s*)?\d{1,6}(?:[,.]\d{1,2})?\s*(?:₹|inr|rs\.?|usd|eur|€|£)?\s*$/i.test(line);
    if (!hasCurrency && !standalonePrice) return null;
    if (!currencyPrice) return null;

    const numericMatch = line.replace(/,/g, '').match(/\d{1,6}(?:\.\d{1,2})?/);
    if (!numericMatch) return null;

    const value = Number(numericMatch[0]);
    if (!Number.isFinite(value) || value <= 0) return null;

    return numericMatch[0];
}

function isPriceLine(line: string): boolean {
    return extractPriceValue(line) !== null;
}

function isCandidateText(line: string): boolean {
    return (
        line.length >= 2 &&
        line.length <= 140 &&
        !isControlLine(line) &&
        !isCountLine(line) &&
        !isPriceLine(line)
    );
}

function buildQualityDetails(data: ExtractedMenuData): { score: number; details: QualityDetails } {
    const categories = data.categories || [];
    const items = data.items || [];
    const pricedItems = items.filter((item: any) => item.price !== undefined && item.price !== null && item.price !== '');
    const describedItems = items.filter((item) => item.description && Object.keys(item.description).length > 0);
    const categoryQuality = categories.length > 0 ? 25 : 0;
    const itemQuality = items.length > 0 ? 10 : 0;
    const priceQuality = items.length > 0 ? Math.round((pricedItems.length / items.length) * 50) : 0;
    const descriptionQuality = items.length > 0 ? Math.min(15, Math.round((describedItems.length / items.length) * 20)) : 0;
    const details = {
        categoryQuality,
        itemQuality,
        priceQuality,
        descriptionQuality,
    };

    return {
        score: categoryQuality + itemQuality + priceQuality + descriptionQuality,
        details,
    };
}

function parseVisibleMenuText(rawText: string): TextParseResult | null {
    const sourceText = stripAcquisitionPreamble(rawText);
    const lines = sourceText
        .split(/\r?\n/)
        .map(normalizeTextLine)
        .filter(Boolean);

    if (lines.length < 8) return null;

    const categories: ParsedCategory[] = [];
    const categoryIdsByName = new Map<string, string>();
    const categoryIdsWithItems = new Set<string>();
    const items: ParsedItem[] = [];
    const seenItemKeys = new Set<string>();
    let categoryCountMarkers = 0;
    let currentCategoryName = 'Imported Items';
    let lastBoundaryIndex = 0;

    const ensureCategory = (name: string): string => {
        const safeName = name.trim() || 'Imported Items';
        const key = safeName.toLowerCase();
        const existingId = categoryIdsByName.get(key);
        if (existingId) return existingId;

        const id = String(categories.length + 1);
        categoryIdsByName.set(key, id);
        categories.push({
            id,
            name: { en: safeName },
            sourceFileIndex: 0,
        });
        return id;
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (isCountLine(line) && index > 0 && isCandidateText(lines[index - 1])) {
            currentCategoryName = lines[index - 1];
            ensureCategory(currentCategoryName);
            categoryCountMarkers += 1;
            lastBoundaryIndex = index + 1;
            continue;
        }

        if (isControlLine(line) || !isPriceLine(line)) {
            continue;
        }

        const prices: string[] = [];
        let nextIndex = index;
        while (nextIndex < lines.length && (isPriceLine(lines[nextIndex]) || isControlLine(lines[nextIndex]))) {
            const price = extractPriceValue(lines[nextIndex]);
            if (price) prices.push(price);
            nextIndex += 1;
            if (prices.length > 0 && lines[nextIndex - 1].toLowerCase() === 'add') {
                break;
            }
        }

        const segment = lines
            .slice(lastBoundaryIndex, index)
            .filter(isCandidateText)
            .filter((candidate) => candidate.toLowerCase() !== currentCategoryName.toLowerCase());

        const itemName = segment[0];
        const itemPrice = prices[prices.length - 1] || extractPriceValue(line);
        if (!itemName || !itemPrice) {
            lastBoundaryIndex = nextIndex;
            index = nextIndex - 1;
            continue;
        }

        const categoryId = ensureCategory(currentCategoryName);
        const itemKey = `${categoryId}|${itemName.toLowerCase()}|${itemPrice}`;
        if (!seenItemKeys.has(itemKey)) {
            const description = segment
                .slice(1)
                .filter((candidate) => candidate !== itemName)
                .join(' ')
                .trim();

            items.push({
                id: String(items.length + 1),
                name: { en: itemName },
                category: categoryId,
                sourceFileIndex: 0,
                price: itemPrice,
                ...(description ? { description: { en: description.slice(0, MAX_DESCRIPTION_CHARS) } } : {}),
            });
            categoryIdsWithItems.add(categoryId);
            seenItemKeys.add(itemKey);
        }

        lastBoundaryIndex = nextIndex;
        index = nextIndex - 1;

        if (items.length >= MAX_DETERMINISTIC_ITEMS) {
            break;
        }
    }

    const usedCategories = categories.filter((category) => categoryIdsWithItems.has(category.id));
    if (items.length < 4 || usedCategories.length === 0) return null;

    const data = {
        languages: [{ name: 'English', code: 'en', isPrimary: true }],
        categories: usedCategories,
        items,
    } as unknown as ExtractedMenuData;

    return {
        categoryCountMarkers,
        data,
        truncated: items.length >= MAX_DETERMINISTIC_ITEMS,
    };
}

function parseFirebaseStorageUrl(fileUrl: string): { bucket: string; objectPath: string } | null {
    try {
        const url = new URL(fileUrl);
        if (url.hostname === 'firebasestorage.googleapis.com') {
            const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
            if (!match) return null;

            return {
                bucket: decodeURIComponent(match[1]),
                objectPath: decodeURIComponent(match[2]),
            };
        }

        if (url.hostname === 'storage.googleapis.com') {
            const parts = url.pathname.split('/').filter(Boolean);
            if (parts.length < 2) return null;
            return {
                bucket: decodeURIComponent(parts[0]),
                objectPath: decodeURIComponent(parts.slice(1).join('/')),
            };
        }

        return null;
    } catch {
        return null;
    }
}

function isAllowedMenuLinkTextArtifactPath(job: MenuImageProcessingJob, objectPath: string): boolean {
    const tId = String(job.tId || '').trim();
    const sId = String(job.sId || '').trim();
    const projectId = String(job.projectId || '').trim();
    if (!tId || !sId || !projectId || !objectPath) return false;
    if (objectPath.includes('..') || objectPath.includes('\\') || objectPath.startsWith('/')) return false;
    return objectPath.startsWith(`menuLinkImports/${tId}/${sId}/${projectId}/`);
}

async function downloadTextArtifact(job: MenuImageProcessingJob): Promise<string | null> {
    const file = job.files?.[0];
    if (!file || !/^text\/plain\b/i.test(file.type || '')) return null;

    const storageFromUrl = parseFirebaseStorageUrl(file.url);
    const metadataPath = typeof job.sourceMetadata?.storagePath === 'string' ? job.sourceMetadata.storagePath : '';
    const bucketName = storageFromUrl?.bucket || process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${process.env.GCLOUD_PROJECT}.appspot.com`;
    const objectPath = storageFromUrl?.objectPath || metadataPath;
    if (metadataPath && storageFromUrl?.objectPath && metadataPath !== storageFromUrl.objectPath) return null;
    if (!bucketName || !objectPath) return null;
    if (!isAllowedMenuLinkTextArtifactPath(job, objectPath)) return null;

    const [buffer] = await storageAdmin.bucket(bucketName).file(objectPath).download();
    return buffer.toString('utf8');
}

export async function tryExtractMenuLinkTextFromJob(
    jobId: string,
    job: MenuImageProcessingJob,
): Promise<ProcessMenuImagesResponse | null> {
    if (job.source !== 'menu_link_import') return null;
    if (!TEXT_SOURCE_KINDS.has(String(job.sourceMetadata?.sourceKind || ''))) return null;

    try {
        const rawText = await downloadTextArtifact(job);
        if (!rawText) return null;

        const parsed = parseVisibleMenuText(rawText);
        if (!parsed) return null;

        const pricedItemRatio = parsed.data.items.length > 0
            ? parsed.data.items.filter((item: any) => item.price !== undefined && item.price !== null && item.price !== '').length / parsed.data.items.length
            : 0;
        const hasStructuredSections = parsed.categoryCountMarkers > 0 || parsed.data.categories.length > 1;
        if (!hasStructuredSections || pricedItemRatio < 0.75) {
            return null;
        }

        const quality = buildQualityDetails(parsed.data);
        const processingTime = 0;
        functions.logger.info('[menuLinkTextExtraction] Deterministic link text extraction succeeded', {
            jobIdLength: jobId.length,
            categoriesCount: parsed.data.categories.length,
            itemsCount: parsed.data.items.length,
            qualityScore: quality.score,
            sourceKind: job.sourceMetadata?.sourceKind || null,
            truncated: parsed.truncated,
        });

        return {
            data: {
                message: parsed.truncated ? 'Some items were omitted because the menu link was too large for one review draft.' : '',
                data: parsed.data,
                qualityScore: quality.score,
                qualityDetails: quality.details,
            },
            transaction: {
                requestId: `link-text-${jobId}`,
                totalCharge: 0,
                totalCredits: 0,
                unitsConsumed: 0,
                processingTime,
                transactionId: null,
                recorded: false,
                promptTokenCount: 0,
                candidatesTokenCount: 0,
                totalTokenCount: 0,
            },
            provenance: {
                rawBatchResponses: [],
                promptVersion: 'menu-link-text-parser-v1',
                model: 'deterministic-text-parser',
            },
        };
    } catch (error: any) {
        functions.logger.warn('[menuLinkTextExtraction] Deterministic link text extraction skipped', {
            jobIdLength: jobId.length,
            failureCode: MENU_LINK_TEXT_EXTRACTION_SKIPPED_CODE,
            ...getMenuLinkTextExtractionErrorContext(error),
        });
        return null;
    }
}
