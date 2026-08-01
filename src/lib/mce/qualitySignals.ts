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

import { normalizePublicMenuImages } from '@lib/menu/publicMenuImages';
import { getMissingProjectPublicContentGaps } from '@lib/localization/projectContent';
import { parseSingleMenuPrice } from '@lib/pricing/formatMenuPrice';

export interface QualitySignal {
    id: string;
    label: string;
    helpText?: string;
    count: number;
    status: 'warning' | 'ok';
    actionLabel?: string;
    actionRoute?: string;
}

export function normalizePriceForReview(price: unknown): string {
    if (typeof price !== 'string') return '';
    return price.replace(/[^0-9.]/g, '').trim();
}

export function isPriceOutlierReviewed(item: unknown): boolean {
    const qualityReview = readOwnField(item, 'qualityReview');
    const rawReviewedPrice = readOwnField(qualityReview, 'priceOutlierReviewedPrice');
    const reviewedPrice = typeof rawReviewedPrice === 'string' ? rawReviewedPrice.trim() : '';
    if (!reviewedPrice) return false;
    return reviewedPrice === normalizePriceForReview(readOwnField(item, 'price'));
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
    projectContent: 6,
    hidden: 7,
    priceOutliers: 8,
};
const REPAIR_MENU_SIGNAL_IDS = new Set(['descriptions', 'categoryIcons', 'translations', 'projectContent']);

interface ComputeQualitySignalsOptions {
    projectPublicContent?: unknown;
    showCategoryIcons?: boolean;
    showItemPrices?: boolean;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readOwnField(value: unknown, key: string): unknown {
    if (!isRecord(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Flatten all items from all files' extractedData into a single array.
 */
function getAllItems(files: unknown): UnknownRecord[] {
    if (!Array.isArray(files)) return [];
    const items: UnknownRecord[] = [];
    try {
        for (const file of files) {
            const data = readOwnField(readOwnField(file, 'extractedData'), 'data');
            const fileItems = readOwnField(data, 'items');
            if (Array.isArray(fileItems)) {
                items.push(...fileItems.filter(isRecord));
            }
        }
    } catch {
        return [];
    }
    return items;
}

function getAllCategories(files: unknown): UnknownRecord[] {
    if (!Array.isArray(files)) return [];
    const categories: UnknownRecord[] = [];
    try {
        for (const file of files) {
            const data = readOwnField(readOwnField(file, 'extractedData'), 'data');
            const fileCategories = readOwnField(data, 'categories');
            if (Array.isArray(fileCategories)) {
                categories.push(...fileCategories.filter(isRecord));
            }
        }
    } catch {
        return [];
    }
    return categories;
}

/**
 * Get primary language code from the first file's languages array.
 */
function getPrimaryLang(files: unknown, projectLanguages?: unknown): string {
    if (Array.isArray(projectLanguages)) {
        const firstProjectLanguage = projectLanguages.find((language) => (
            typeof language === 'string' && Boolean(language.trim())
        ));
        if (typeof firstProjectLanguage === 'string') return firstProjectLanguage.trim();
    }

    if (!Array.isArray(files)) return 'en';
    try {
        for (const file of files) {
            const data = readOwnField(readOwnField(file, 'extractedData'), 'data');
            const languages = readOwnField(data, 'languages');
            if (!Array.isArray(languages)) continue;
            const languageRecords = languages.filter(isRecord);
            const primary = languageRecords.find((language) => readOwnField(language, 'isPrimary') === true);
            const primaryCode = readOwnField(primary, 'code');
            if (typeof primaryCode === 'string' && primaryCode.trim()) return primaryCode.trim();
            const fallbackCode = readOwnField(languageRecords[0], 'code');
            if (typeof fallbackCode === 'string' && fallbackCode.trim()) return fallbackCode.trim();
        }
    } catch {
        return 'en';
    }
    return 'en';
}

function isDescriptionMissing(item: UnknownRecord, languages: string[]): boolean {
    const description = readOwnField(item, 'description');
    if (!isRecord(description)) return true;
    return languages.some((lang) => {
        const text = readOwnField(description, lang);
        return typeof text !== 'string' || !text.trim();
    });
}

function isImageMissing(item: UnknownRecord): boolean {
    return normalizePublicMenuImages(readOwnField(item, 'images')).length === 0;
}

function hasCategoryIcon(category: UnknownRecord): boolean {
    const icon = readOwnField(category, 'icon');

    if (typeof icon === 'string') {
        return icon.trim().length > 0;
    }

    if (icon && typeof icon === 'object') {
        return ['icon', 'value', 'name'].some((key) => {
            const candidate = readOwnField(icon, key);
            return typeof candidate === 'string' && candidate.trim().length > 0;
        });
    }

    return false;
}

function isPriceMissing(item: UnknownRecord): boolean {
    const attributes = readOwnField(item, 'attributes');
    if (Array.isArray(attributes) && attributes.length > 0) return false;
    const price = readOwnField(item, 'price');
    return typeof price !== 'string' || !price.trim();
}

function hasLocalizedValue(value: unknown, languageCode: string): boolean {
    const localizedValue = readOwnField(value, languageCode);
    return typeof localizedValue === 'string' && localizedValue.trim().length > 0;
}

function collectLocalizedLanguageCodes(value: unknown, unique: Set<string>): void {
    if (!isRecord(value)) return;

    try {
        for (const [languageCode, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
            if ('value' in descriptor && typeof descriptor.value === 'string' && descriptor.value.trim().length > 0) {
                unique.add(languageCode);
            }
        }
    } catch {
        return;
    }
}

function isTranslationMissing(item: UnknownRecord, primaryLang: string, allLangs: string[]): boolean {
    if (allLangs.length <= 1) return false;

    return allLangs
        .filter((lang) => lang !== primaryLang)
        .some((lang) => {
            const itemName = readOwnField(item, 'name');
            const itemDescription = readOwnField(item, 'description');
            if (hasLocalizedValue(itemName, primaryLang) && !hasLocalizedValue(itemName, lang)) {
                return true;
            }

            if (hasLocalizedValue(itemDescription, primaryLang) && !hasLocalizedValue(itemDescription, lang)) {
                return true;
            }

            const attributes = readOwnField(item, 'attributes');
            return (Array.isArray(attributes) ? attributes.filter(isRecord) : []).some((attribute) => (
                hasLocalizedValue(readOwnField(attribute, 'name'), primaryLang)
                && !hasLocalizedValue(readOwnField(attribute, 'name'), lang)
            ));
        });
}

function getAllLanguageCodes(files: unknown, projectLanguages?: unknown): string[] {
    if (Array.isArray(projectLanguages)) {
        const normalized = projectLanguages
            .filter((value): value is string => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean);
        if (normalized.length) return Array.from(new Set(normalized));
    }

    const unique = new Set<string>();

    if (!Array.isArray(files)) return Array.from(unique);

    try {
        for (const file of files) {
            const data = readOwnField(readOwnField(file, 'extractedData'), 'data');
            const languages = readOwnField(data, 'languages');
            (Array.isArray(languages) ? languages.filter(isRecord) : []).forEach((language) => {
                const code = readOwnField(language, 'code');
                if (typeof code === 'string' && code.trim()) unique.add(code.trim());
            });

            const categories = readOwnField(data, 'categories');
            (Array.isArray(categories) ? categories.filter(isRecord) : []).forEach((category) => {
                collectLocalizedLanguageCodes(readOwnField(category, 'name'), unique);
            });

            const items = readOwnField(data, 'items');
            (Array.isArray(items) ? items.filter(isRecord) : []).forEach((item) => {
                collectLocalizedLanguageCodes(readOwnField(item, 'name'), unique);
                collectLocalizedLanguageCodes(readOwnField(item, 'description'), unique);
                const attributes = readOwnField(item, 'attributes');
                (Array.isArray(attributes) ? attributes.filter(isRecord) : []).forEach((attribute) => {
                    collectLocalizedLanguageCodes(readOwnField(attribute, 'name'), unique);
                });
            });
        }
    } catch {
        return [];
    }

    return Array.from(unique);
}

function parsePrice(price: unknown): number {
    return typeof price === 'string' ? (parseSingleMenuPrice(price) ?? NaN) : NaN;
}

function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function countPriceOutliers(activeItems: UnknownRecord[]): number {
    const catPrices: Record<string, number[]> = {};

    for (const item of activeItems) {
        const attributes = readOwnField(item, 'attributes');
        if (Array.isArray(attributes) && attributes.length > 0) continue;
        if (isPriceOutlierReviewed(item)) continue;
        const price = parsePrice(readOwnField(item, 'price'));
        if (isNaN(price) || price <= 0) continue;
        const category = readOwnField(item, 'category');
        const catId = typeof category === 'string' && category.trim() ? category.trim() : 'uncategorized';
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
    files: unknown,
    projectLanguages?: string[] | unknown,
    options?: ComputeQualitySignalsOptions
): QualitySignal[] {
    const allItems = getAllItems(files);
    const allCategories = getAllCategories(files);
    if (allItems.length === 0) return [];

    const lang = getPrimaryLang(files, projectLanguages);
    const allLanguages = getAllLanguageCodes(files, projectLanguages);
    const activeItems = allItems.filter(item => readOwnField(item, 'active') !== false);
    const activeCategories = allCategories.filter((category) => readOwnField(category, 'active') !== false);
    const showItemPrices = options?.showItemPrices !== false;
    const signals: QualitySignal[] = [];

    // Signal 1: Description coverage
    // Secondary-language gaps have their own translation signal. Keeping this
    // check primary-language-only avoids showing the same issue twice.
    const missingDesc = activeItems.filter(item => isDescriptionMissing(item, [lang])).length;
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
    const hiddenItems = allItems.filter(item => readOwnField(item, 'active') === false);
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

        const projectPublicContentGaps = getMissingProjectPublicContentGaps(
            options?.projectPublicContent,
            allLanguages,
        );
        const projectPublicContentLanguages = new Set(
            projectPublicContentGaps.map((gap) => gap.languageCode),
        );

        signals.push({
            id: 'projectContent',
            label: projectPublicContentGaps.length > 0
                ? `${projectPublicContentGaps.length} project detail${projectPublicContentGaps.length !== 1 ? 's' : ''} missing translations`
                : 'Project details are translated',
            helpText: projectPublicContentGaps.length > 0
                ? `Project name, description, or notes are incomplete in ${projectPublicContentLanguages.size} menu language${projectPublicContentLanguages.size !== 1 ? 's' : ''}`
                : undefined,
            count: projectPublicContentGaps.length,
            status: projectPublicContentGaps.length > 0 ? 'warning' : 'ok',
            actionLabel: projectPublicContentGaps.length > 0 ? 'Repair' : undefined,
            actionRoute: projectPublicContentGaps.length > 0 ? 'projectContent' : undefined,
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

export function isRepairMenuSignal(signal: QualitySignal | string): boolean {
    const id = typeof signal === 'string' ? signal : signal.id;
    return REPAIR_MENU_SIGNAL_IDS.has(id);
}

export function getPrimaryQualitySignal(signals: QualitySignal[]): QualitySignal | null {
    const warnings = signals
        .filter((signal) => signal.status === 'warning')
        .sort((a, b) => {
            const aPriority = SIGNAL_PRIORITY[a.id] ?? 999;
            const bPriority = SIGNAL_PRIORITY[b.id] ?? 999;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return b.count - a.count;
        });

    return warnings.find(isRepairMenuSignal) || warnings[0] || null;
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
        if (s.id === 'projectContent' && s.count >= 1) return true;
        return false;
    });
}
