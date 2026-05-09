/**
 * Menu Quality Signals
 * 
 * Pure computation layer — reads project extractedData and computes
 * simple quality signals. No Firestore operations, no API calls.
 * 
 * Signals (v1.1):
 * 1. Missing descriptions — customers understand offerings better with details
 * 2. Missing images — customers choose faster when they see what they're getting
 * 3. Missing prices — customers compare before deciding
 * 4. Hidden items — items customers can't see
 * 5. Price outliers — possible price mistakes within a category
 * 6. Missing translations — secondary languages missing item content
 * 
 * @see __docs__/menu-quality-signals/menu-quality-signals_impl.md
 */

import type { ExtractedDataCategory, ExtractedDataItem } from '@template/main-app/projects/types/extractedData.types';
import type { ProjectFileType } from '@template/main-app/projects/types/project.types';
import { normalizePublicMenuImages } from '@lib/menu/publicMenuImages';

export interface QualitySignal {
    id: string;
    label: string;
    helpText?: string;
    count: number;
    status: 'warning' | 'ok';
    actionLabel?: string;
    actionRoute?: string;
}

export function normalizePriceForReview(price: string | undefined): string {
    if (!price) return '';
    return price.replace(/[^0-9.]/g, '').trim();
}

export function isPriceOutlierReviewed(item: Pick<ExtractedDataItem, 'price' | 'qualityReview'>): boolean {
    const reviewedPrice = item.qualityReview?.priceOutlierReviewedPrice?.trim();
    if (!reviewedPrice) return false;
    return reviewedPrice === normalizePriceForReview(item.price);
}

const MAX_VISIBLE_SIGNALS = 4;
const PRICE_OUTLIER_LOW_FACTOR = 0.35;
const PRICE_OUTLIER_HIGH_FACTOR = 3;
const MIN_ITEMS_FOR_PRICE_OUTLIER = 4;
const SIGNAL_PRIORITY: Record<string, number> = {
    prices: 1,
    images: 2,
    categoryIcons: 3,
    descriptions: 4,
    translations: 5,
    hidden: 6,
    priceOutliers: 7,
};

interface ComputeQualitySignalsOptions {
    showCategoryIcons?: boolean;
    showItemPrices?: boolean;
}

/**
 * Flatten all items from all files' extractedData into a single array.
 */
function getAllItems(files: ProjectFileType[] | undefined): ExtractedDataItem[] {
    if (!files) return [];
    const items: ExtractedDataItem[] = [];
    for (const file of files) {
        if (file.extractedData?.data?.items) {
            items.push(...file.extractedData.data.items);
        }
    }
    return items;
}

function getAllCategories(files: ProjectFileType[] | undefined): ExtractedDataCategory[] {
    if (!files) return [];
    const categories: ExtractedDataCategory[] = [];
    for (const file of files) {
        if (file.extractedData?.data?.categories) {
            categories.push(...file.extractedData.data.categories);
        }
    }
    return categories;
}

/**
 * Get primary language code from the first file's languages array.
 */
function getPrimaryLang(files: ProjectFileType[] | undefined, projectLanguages?: string[]): string {
    if (projectLanguages?.length) {
        return projectLanguages[0] || 'en';
    }

    if (!files) return 'en';
    for (const file of files) {
        const langs = file.extractedData?.data?.languages;
        if (langs && langs.length > 0) {
            const primary = langs.find(l => l.isPrimary);
            return primary?.code || langs[0].code || 'en';
        }
    }
    return 'en';
}

function isDescriptionMissing(item: ExtractedDataItem, languages: string[]): boolean {
    if (!item.description) return true;
    return languages.some((lang) => {
        const text = item.description?.[lang];
        return !text?.trim();
    });
}

function isImageMissing(item: ExtractedDataItem): boolean {
    return normalizePublicMenuImages(item.images).length === 0;
}

function hasCategoryIcon(category: ExtractedDataCategory): boolean {
    const icon = category?.icon;

    if (typeof icon === 'string') {
        return icon.trim().length > 0;
    }

    if (icon && typeof icon === 'object') {
        return ['icon', 'value', 'name'].some((key) => {
            const candidate = (icon as Record<string, unknown>)[key];
            return typeof candidate === 'string' && candidate.trim().length > 0;
        });
    }

    return false;
}

function isPriceMissing(item: ExtractedDataItem): boolean {
    if (item.attributes && item.attributes.length > 0) return false;
    return !item.price?.trim();
}

function hasLocalizedValue(value: unknown, languageCode: string): boolean {
    if (!value || typeof value !== 'object') return false;
    const localizedValue = (value as Record<string, unknown>)[languageCode];
    return typeof localizedValue === 'string' && localizedValue.trim().length > 0;
}

function collectLocalizedLanguageCodes(value: unknown, unique: Set<string>): void {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;

    for (const [languageCode, localizedValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof localizedValue === 'string' && localizedValue.trim().length > 0) {
            unique.add(languageCode);
        }
    }
}

function isTranslationMissing(item: ExtractedDataItem, primaryLang: string, allLangs: string[]): boolean {
    if (allLangs.length <= 1) return false;

    return allLangs
        .filter((lang) => lang !== primaryLang)
        .some((lang) => {
            if (hasLocalizedValue(item.name, primaryLang) && !hasLocalizedValue(item.name, lang)) {
                return true;
            }

            if (hasLocalizedValue(item.description, primaryLang) && !hasLocalizedValue(item.description, lang)) {
                return true;
            }

            return (item.attributes || []).some((attribute) => (
                hasLocalizedValue(attribute?.name, primaryLang) && !hasLocalizedValue(attribute?.name, lang)
            ));
        });
}

function getAllLanguageCodes(files: ProjectFileType[] | undefined, projectLanguages?: string[]): string[] {
    if (projectLanguages?.length) {
        return Array.from(new Set(projectLanguages.filter(Boolean)));
    }

    const unique = new Set<string>();

    if (!files) return Array.from(unique);

    for (const file of files) {
        const langs = file.extractedData?.data?.languages || [];
        langs.forEach((lang) => {
            if (lang?.code) unique.add(lang.code);
        });

        const categories = file.extractedData?.data?.categories || [];
        categories.forEach((category: ExtractedDataCategory) => {
            collectLocalizedLanguageCodes(category?.name, unique);
        });

        const items = file.extractedData?.data?.items || [];
        items.forEach((item) => {
            collectLocalizedLanguageCodes(item?.name, unique);
            collectLocalizedLanguageCodes(item?.description, unique);
            (item?.attributes || []).forEach((attribute) => {
                collectLocalizedLanguageCodes(attribute?.name, unique);
            });
        });
    }

    return Array.from(unique);
}

function parsePrice(price: string | undefined): number {
    const cleaned = normalizePriceForReview(price);
    if (!cleaned) return NaN;
    return parseFloat(cleaned);
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countPriceOutliers(activeItems: ExtractedDataItem[]): number {
    const catPrices: Record<string, number[]> = {};

    for (const item of activeItems) {
        if (item.attributes && item.attributes.length > 0) continue;
        if (isPriceOutlierReviewed(item)) continue;
        const price = parsePrice(item.price);
        if (isNaN(price) || price <= 0) continue;
        const catId = item.category || 'uncategorized';
        if (!catPrices[catId]) catPrices[catId] = [];
        catPrices[catId].push(price);
    }

    let outlierCount = 0;
    for (const catId of Object.keys(catPrices)) {
        const prices = catPrices[catId];
        if (prices.length < MIN_ITEMS_FOR_PRICE_OUTLIER) continue;
        const med = median(prices);
        if (med <= 0) continue;
        for (const price of prices) {
            if (price < med * PRICE_OUTLIER_LOW_FACTOR || price > med * PRICE_OUTLIER_HIGH_FACTOR) {
                outlierCount++;
            }
        }
    }
    return outlierCount;
}

/**
 * Compute quality signals from project files.
 * 
 * @param files - Project files array (project.files)
 * @returns Array of QualitySignal
 */
export function computeQualitySignals(
    files: ProjectFileType[] | undefined,
    projectLanguages?: string[],
    options?: ComputeQualitySignalsOptions
): QualitySignal[] {
    const allItems = getAllItems(files);
    const allCategories = getAllCategories(files);
    if (allItems.length === 0) return [];

    const lang = getPrimaryLang(files, projectLanguages);
    const allLanguages = getAllLanguageCodes(files, projectLanguages);
    const activeItems = allItems.filter(item => item.active !== false);
    const activeCategories = allCategories.filter((category) => category.active !== false);
    const showItemPrices = options?.showItemPrices !== false;
    const signals: QualitySignal[] = [];

    // Signal 1: Description coverage
    const missingDesc = activeItems.filter(item => isDescriptionMissing(item, allLanguages)).length;
    signals.push({
        id: 'descriptions',
        label: missingDesc > 0
            ? `${missingDesc} item${missingDesc !== 1 ? 's' : ''} missing descriptions`
            : 'All items have descriptions',
        helpText: missingDesc > 0 ? 'Customers understand offerings better with details' : undefined,
        count: missingDesc,
        status: missingDesc > 0 ? 'warning' : 'ok',
        actionLabel: missingDesc > 0 ? 'Generate' : undefined,
        actionRoute: missingDesc > 0 ? 'descriptions' : undefined,
    });

    // Signal 2: Image coverage
    const missingImages = activeItems.filter(item => isImageMissing(item)).length;
    signals.push({
        id: 'images',
        label: missingImages > 0
            ? `${missingImages} item${missingImages !== 1 ? 's' : ''} missing images`
            : 'All items have images',
        helpText: missingImages > 0 ? 'Customers choose faster when they see what they\'re getting' : undefined,
        count: missingImages,
        status: missingImages > 0 ? 'warning' : 'ok',
        actionLabel: missingImages > 0 ? 'Generate' : undefined,
        actionRoute: missingImages > 0 ? 'images' : undefined,
    });

    if (options?.showCategoryIcons) {
        const categoriesMissingIcons = activeCategories.filter((category) => !hasCategoryIcon(category)).length;
        signals.push({
            id: 'categoryIcons',
            label: categoriesMissingIcons > 0
                ? `${categoriesMissingIcons} categor${categoriesMissingIcons !== 1 ? 'ies' : 'y'} missing icons`
                : 'All categories have icons',
            helpText: categoriesMissingIcons > 0 ? 'Icons make categories easier to scan on your menu' : undefined,
            count: categoriesMissingIcons,
            status: categoriesMissingIcons > 0 ? 'warning' : 'ok',
            actionLabel: categoriesMissingIcons > 0 ? 'Review' : undefined,
            actionRoute: categoriesMissingIcons > 0 ? 'categories' : undefined,
        });
    }

    // Signal 3: Pricing gaps. If public prices are intentionally hidden by
    // design, price quality warnings become noise and should not surface.
    if (showItemPrices) {
        const missingPrices = activeItems.filter(item => isPriceMissing(item)).length;
        signals.push({
            id: 'prices',
            label: missingPrices > 0
                ? `${missingPrices} item${missingPrices !== 1 ? 's' : ''} missing prices`
                : 'All items have prices',
            helpText: missingPrices > 0 ? 'Customers compare prices before deciding' : undefined,
            count: missingPrices,
            status: missingPrices > 0 ? 'warning' : 'ok',
            actionLabel: missingPrices > 0 ? 'Review' : undefined,
            actionRoute: missingPrices > 0 ? 'editor' : undefined,
        });
    }

    // Signal 4: Hidden/inactive items (active: false means customers can't see them)
    const hiddenItems = allItems.filter(item => item.active === false);
    if (hiddenItems.length > 0) {
        signals.push({
            id: 'hidden',
            label: `${hiddenItems.length} item${hiddenItems.length !== 1 ? 's are' : ' is'} hidden from customers`,
            helpText: 'These items won\'t appear on your public menu',
            count: hiddenItems.length,
            status: 'warning',
            actionLabel: 'Review',
            actionRoute: 'editor',
        });
    }

    const outlierCount = showItemPrices ? countPriceOutliers(activeItems) : 0;
    if (outlierCount > 0) {
        signals.push({
            id: 'priceOutliers',
            label: `${outlierCount} price${outlierCount !== 1 ? 's need' : ' needs'} review`,
            helpText: 'We compare single-item prices inside the same category. If the price is intentional, mark it reviewed.',
            count: outlierCount,
            status: 'warning',
            actionLabel: 'Review',
            actionRoute: 'editor',
        });
    }

    const missingTranslations = activeItems.filter((item) => isTranslationMissing(item, lang, allLanguages)).length;
    if (allLanguages.length > 1) {
        signals.push({
            id: 'translations',
            label: missingTranslations > 0
                ? `${missingTranslations} item${missingTranslations !== 1 ? 's' : ''} missing translations`
                : 'All visible items are translated',
            helpText: missingTranslations > 0 ? 'Some items are incomplete in your selected menu languages' : undefined,
            count: missingTranslations,
            status: missingTranslations > 0 ? 'warning' : 'ok',
            actionLabel: missingTranslations > 0 ? 'Review' : undefined,
            actionRoute: missingTranslations > 0 ? 'translations' : undefined,
        });
    }

    return signals;
}

/**
 * Check if all signals are in 'ok' status (all clear state).
 */
export function isAllClear(signals: QualitySignal[]): boolean {
    return signals.length > 0 && signals.every(s => s.status === 'ok');
}

/**
 * Get warning signals only, capped at MAX_VISIBLE_SIGNALS.
 * Used by dashboard to avoid overwhelming the owner.
 */
export function getVisibleSignals(signals: QualitySignal[]): QualitySignal[] {
    const warnings = signals
        .filter(s => s.status === 'warning')
        .sort((a, b) => {
            const aPriority = SIGNAL_PRIORITY[a.id] ?? 999;
            const bPriority = SIGNAL_PRIORITY[b.id] ?? 999;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return b.count - a.count;
        });
    if (warnings.length > 0) {
        return warnings.slice(0, MAX_VISIBLE_SIGNALS);
    }

    return signals.filter(s => s.status === 'ok');
}

/**
 * Get signals that meet threshold for editor banner / publish intercept.
 * Only returns high-impact signals worth showing during editing or publishing.
 * Thresholds are higher to avoid noise during active work.
 */
export function getActionableSignals(signals: QualitySignal[]): QualitySignal[] {
    return signals.filter(s => {
        if (s.status === 'ok') return false;
        if (s.id === 'categoryIcons' && s.count >= 1) return true;
        if (s.id === 'descriptions' && s.count >= 3) return true;
        if (s.id === 'images' && s.count >= 3) return true;
        if (s.id === 'prices' && s.count >= 1) return true;
        if (s.id === 'priceOutliers' && s.count >= 1) return true;
        if (s.id === 'translations' && s.count >= 1) return true;
        return false;
    });
}
