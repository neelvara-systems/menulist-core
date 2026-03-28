/**
 * Extraction Hardening Utilities (P1 — Mar 2026)
 * 
 * Post-extraction validation, normalization, and anomaly detection.
 * Runs AFTER AI extraction and BEFORE writing to project.
 * 
 * Three responsibilities:
 * 1. Category synonym normalization — collapse "Starters" / "Appetizers" / "APPETIZERS"
 * 2. Semantic integrity validation — ensure valid menu structure
 * 3. Anomaly detection — flag suspicious outputs (hallucinations, extreme counts)
 * 
 * IMPORTANT: These are non-blocking. They log warnings and fix what they can,
 * but NEVER fail the extraction job. Partial data is always better than no data.
 */

import * as functions from 'firebase-functions';
import { ExtractedMenuData, MenuCategory, MenuItem } from '../types';

// ═══════════════════════════════════════════════════════════════
// 1. CATEGORY SYNONYM NORMALIZATION
// ═══════════════════════════════════════════════════════════════

/**
 * Common category synonym mapping.
 * Key = normalized lowercase form → Value = canonical display name.
 * When two categories match the same canonical name, they get merged.
 */
const CATEGORY_SYNONYMS: Record<string, string> = {
    // Food categories
    'starter': 'Starters',
    'starters': 'Starters',
    'appetizer': 'Starters',
    'appetizers': 'Starters',
    'appetiser': 'Starters',
    'appetisers': 'Starters',
    'small plates': 'Starters',
    'snack': 'Snacks',
    'snacks': 'Snacks',
    'main course': 'Main Course',
    'main courses': 'Main Course',
    'mains': 'Main Course',
    'main': 'Main Course',
    'entree': 'Main Course',
    'entrees': 'Main Course',
    'entrée': 'Main Course',
    'entrées': 'Main Course',
    'dessert': 'Desserts',
    'desserts': 'Desserts',
    'sweet': 'Desserts',
    'sweets': 'Desserts',
    'beverage': 'Beverages',
    'beverages': 'Beverages',
    'drink': 'Beverages',
    'drinks': 'Beverages',
    'soup': 'Soups',
    'soups': 'Soups',
    'salad': 'Salads',
    'salads': 'Salads',
    'bread': 'Breads',
    'breads': 'Breads',
    'naan': 'Breads',
    'roti': 'Breads',
    'rice': 'Rice',
    'biryani': 'Biryani',
    'biryanis': 'Biryani',
    'combo': 'Combos',
    'combos': 'Combos',
    'combo meal': 'Combos',
    'combo meals': 'Combos',
    'thali': 'Thali',
    'thalis': 'Thali',
    'side': 'Sides',
    'sides': 'Sides',
    'side dish': 'Sides',
    'side dishes': 'Sides',
    'accompaniment': 'Sides',
    'accompaniments': 'Sides',
    // Common food categories (expanded from edge-case simulation)
    'burger': 'Burgers',
    'burgers': 'Burgers',
    'pizza': 'Pizza',
    'pizzas': 'Pizza',
    'pasta': 'Pasta',
    'pastas': 'Pasta',
    'sandwich': 'Sandwiches',
    'sandwiches': 'Sandwiches',
    'wrap': 'Wraps',
    'wraps': 'Wraps',
    'curry': 'Curries',
    'curries': 'Curries',
    'dal': 'Dal',
    'dals': 'Dal',
    'daal': 'Dal',
    'tandoor': 'Tandoor',
    'tandoori': 'Tandoor',
    'dosa': 'Dosa',
    'dosas': 'Dosa',
    'idli': 'Idli',
    'idlis': 'Idli',
    'chaat': 'Chaat',
    'chaats': 'Chaat',
    'special': 'Specials',
    'specials': 'Specials',
    "today's special": 'Specials',
    "chef's special": 'Specials',
    "chef's specials": 'Specials',
    // Beverage subcategories
    'soft drink': 'Soft Drinks',
    'soft drinks': 'Soft Drinks',
    'cold drink': 'Cold Drinks',
    'cold drinks': 'Cold Drinks',
    'hot drink': 'Hot Drinks',
    'hot drinks': 'Hot Drinks',
    'mocktail': 'Mocktails',
    'mocktails': 'Mocktails',
    'cocktail': 'Cocktails',
    'cocktails': 'Cocktails',
    'shake': 'Shakes',
    'shakes': 'Shakes',
    'milkshake': 'Shakes',
    'milkshakes': 'Shakes',
    'juice': 'Juices',
    'juices': 'Juices',
    'smoothie': 'Smoothies',
    'smoothies': 'Smoothies',
    'tea': 'Tea',
    'coffee': 'Coffee',
    // Service categories
    'haircut': 'Haircuts',
    'haircuts': 'Haircuts',
    'facial': 'Facials',
    'facials': 'Facials',
    'massage': 'Massage',
    'massages': 'Massage',
    'manicure': 'Manicure',
    'pedicure': 'Pedicure',
};

/**
 * Normalize a category name for comparison purposes.
 * Trims, lowercases, removes punctuation, collapses whitespace.
 */
function normalizeCategoryKey(name: string): string {
    return name
        .trim()
        .toLowerCase()
        .replace(/[()[\]{}'".,!?;:–—]/g, '')  // Remove punctuation
        .replace(/\s+/g, ' ')                   // Collapse whitespace
        .replace(/\s*continued\s*$/i, '')        // Remove "continued" suffix
        .replace(/\s*contd\.?\s*$/i, '')         // Remove "contd" suffix
        .replace(/\.{2,}$/g, '')                 // Remove trailing dots
        .trim();
}

/**
 * Get canonical category name from synonym map.
 * Returns null if no synonym match found.
 */
function getCanonicalCategoryName(normalizedKey: string): string | null {
    return CATEGORY_SYNONYMS[normalizedKey] || null;
}

export interface CategoryNormalizationResult {
    categories: MenuCategory[];
    items: MenuItem[];
    mergedCount: number;
    renamedCount: number;
}

/**
 * Normalize and deduplicate categories across the extracted menu.
 * 
 * Strategy:
 * 1. Normalize category names (trim, lowercase key)
 * 2. Check synonym map for canonical names
 * 3. Merge categories with same canonical name (keep first occurrence's ID)
 * 4. Remap item category references
 * 
 * Non-destructive: only merges when confident. Unknown categories kept as-is.
 */
export function normalizeCategorySynonyms(data: ExtractedMenuData): CategoryNormalizationResult {
    const logger = functions.logger;

    if (!data.categories || data.categories.length <= 1) {
        return {
            categories: data.categories || [],
            items: data.items || [],
            mergedCount: 0,
            renamedCount: 0,
        };
    }

    // Build map: normalizedKey → { canonicalId, displayName }
    const categoryMap = new Map<string, { id: string; displayName: string }>();
    const idRemapping = new Map<string, string>(); // oldId → newId (for items)
    const finalCategories: MenuCategory[] = [];
    let mergedCount = 0;
    let renamedCount = 0;

    for (const cat of data.categories) {
        const primaryLang = Object.keys(cat.name)[0] || 'en';
        const originalName = cat.name[primaryLang] || '';
        let normalizedKey = normalizeCategoryKey(originalName);

        if (!normalizedKey) {
            finalCategories.push(cat);
            continue;
        }

        // Check synonym map — try ALL language values, not just primary
        // This fixes missed merges when Hindi/Arabic is the first language key
        let canonicalName = getCanonicalCategoryName(normalizedKey);
        if (!canonicalName) {
            for (const [lang, name] of Object.entries(cat.name)) {
                if (lang === primaryLang) continue; // Already checked
                const altKey = normalizeCategoryKey(name);
                const altCanonical = altKey ? getCanonicalCategoryName(altKey) : null;
                if (altCanonical) {
                    canonicalName = altCanonical;
                    normalizedKey = altKey;
                    break;
                }
            }
        }
        const lookupKey = canonicalName ? normalizeCategoryKey(canonicalName) : normalizedKey;

        if (categoryMap.has(lookupKey)) {
            // Category already exists — merge by remapping items to existing category
            const existing = categoryMap.get(lookupKey)!;
            idRemapping.set(String(cat.id), existing.id);
            mergedCount++;

            logger.info('[extractionHardening] Category merged', {
                merged: originalName,
                into: existing.displayName,
                oldId: cat.id,
                newId: existing.id,
            });
        } else {
            // New category — add to map
            const displayName = canonicalName || originalName;
            categoryMap.set(lookupKey, { id: String(cat.id), displayName });

            // Rename if synonym match found
            if (canonicalName && canonicalName !== originalName) {
                const updatedName = { ...cat.name };
                updatedName[primaryLang] = canonicalName;
                finalCategories.push({ ...cat, name: updatedName });
                renamedCount++;
            } else {
                finalCategories.push(cat);
            }
        }
    }

    // Remap item category references
    const remappedItems = (data.items || []).map(item => {
        const itemCatId = String((item as any).category || item.categoryId);
        const newCatId = idRemapping.get(itemCatId);
        if (newCatId) {
            return {
                ...item,
                category: newCatId,
                categoryId: newCatId,
            };
        }
        return item;
    });

    if (mergedCount > 0 || renamedCount > 0) {
        logger.info('[extractionHardening] Category normalization complete', {
            original: data.categories.length,
            final: finalCategories.length,
            merged: mergedCount,
            renamed: renamedCount,
        });
    }

    return {
        categories: finalCategories,
        items: remappedItems,
        mergedCount,
        renamedCount,
    };
}

// ═══════════════════════════════════════════════════════════════
// 2. SEMANTIC INTEGRITY VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface IntegrityIssue {
    type: 'orphan_item' | 'empty_category_name' | 'empty_category' | 'duplicate_item_id' | 'invalid_price';
    severity: 'warning' | 'error';
    message: string;
    itemId?: string;
    categoryId?: string;
}

export interface IntegrityValidationResult {
    valid: boolean;
    issues: IntegrityIssue[];
    fixedData?: ExtractedMenuData;
}

/**
 * Validate semantic integrity of extracted menu data.
 * 
 * Checks:
 * 1. Every item references a valid category
 * 2. No empty category names
 * 3. No duplicate item IDs
 * 4. Price strings are reasonable (not gibberish)
 * 
 * Non-blocking: logs issues, fixes what it can, returns results.
 * Never fails the extraction — partial data is better than no data.
 */
export function validateExtractionIntegrity(data: ExtractedMenuData): IntegrityValidationResult {
    const logger = functions.logger;
    const issues: IntegrityIssue[] = [];

    if (!data || !data.categories || !data.items) {
        return { valid: false, issues: [{ type: 'empty_category', severity: 'error', message: 'No data to validate' }] };
    }

    // Build valid category ID set
    const validCategoryIds = new Set(data.categories.map(c => String(c.id)));

    // Check 1: Orphan items (reference non-existent category)
    let orphanCount = 0;
    for (const item of data.items) {
        const catId = String((item as any).category || item.categoryId);
        if (catId && !validCategoryIds.has(catId)) {
            orphanCount++;
            if (orphanCount <= 5) { // Log max 5 to avoid spam
                issues.push({
                    type: 'orphan_item',
                    severity: 'warning',
                    message: `Item "${Object.values(item.name)[0] || item.id}" references non-existent category ${catId}`,
                    itemId: String(item.id),
                    categoryId: catId,
                });
            }
        }
    }
    if (orphanCount > 5) {
        issues.push({
            type: 'orphan_item',
            severity: 'warning',
            message: `${orphanCount} total orphan items found (${orphanCount - 5} more not shown)`,
        });
    }

    // Check 2: Empty category names
    for (const cat of data.categories) {
        const primaryName = Object.values(cat.name)[0] || '';
        if (!primaryName.trim()) {
            issues.push({
                type: 'empty_category_name',
                severity: 'warning',
                message: `Category ${cat.id} has empty name`,
                categoryId: String(cat.id),
            });
        }
    }

    // Check 3: Duplicate item IDs
    const itemIds = new Set<string>();
    for (const item of data.items) {
        const id = String(item.id);
        if (itemIds.has(id)) {
            issues.push({
                type: 'duplicate_item_id',
                severity: 'warning',
                message: `Duplicate item ID: ${id}`,
                itemId: id,
            });
        }
        itemIds.add(id);
    }

    // Check 4: Invalid prices (gibberish, extremely long)
    for (const item of data.items) {
        const price = item.price != null ? String(item.price) : null;
        if (price && price.length > 20) {
            issues.push({
                type: 'invalid_price',
                severity: 'warning',
                message: `Item "${Object.values(item.name)[0] || item.id}" has suspiciously long price: "${price.substring(0, 30)}..."`,
                itemId: String(item.id),
            });
        }

        // Check attribute prices too
        if (item.attributes) {
            for (const attr of item.attributes) {
                const attrPrice = attr.price != null ? String(attr.price) : null;
                if (attrPrice && attrPrice.length > 20) {
                    issues.push({
                        type: 'invalid_price',
                        severity: 'warning',
                        message: `Item "${Object.values(item.name)[0] || item.id}" attribute has long price: "${attrPrice.substring(0, 30)}..."`,
                        itemId: String(item.id),
                    });
                }
            }
        }
    }

    if (issues.length > 0) {
        logger.warn('[extractionHardening] Integrity issues found', {
            totalIssues: issues.length,
            byType: {
                orphan: issues.filter(i => i.type === 'orphan_item').length,
                emptyName: issues.filter(i => i.type === 'empty_category_name').length,
                duplicateId: issues.filter(i => i.type === 'duplicate_item_id').length,
                invalidPrice: issues.filter(i => i.type === 'invalid_price').length,
            },
        });
    }

    return {
        valid: issues.length === 0,
        issues,
    };
}

// ═══════════════════════════════════════════════════════════════
// 3. ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════

export interface AnomalyFlag {
    type: 'excessive_items' | 'excessive_categories' | 'extreme_price' | 'zero_items' | 'zero_categories' | 'suspicious_ratio';
    severity: 'info' | 'warning' | 'critical';
    message: string;
    value: number;
    threshold: number;
}

/**
 * Detect anomalies in extracted data that may indicate OCR hallucination
 * or corrupted input images.
 * 
 * Non-blocking: flags anomalies as warnings. Never fails the job.
 */
export function detectExtractionAnomalies(data: ExtractedMenuData): AnomalyFlag[] {
    const logger = functions.logger;
    const flags: AnomalyFlag[] = [];

    const itemCount = data.items?.length || 0;
    const categoryCount = data.categories?.length || 0;

    // Anomaly 1: Excessive items (likely hallucination)
    if (itemCount > 300) {
        flags.push({
            type: 'excessive_items',
            severity: 'critical',
            message: `Extraction produced ${itemCount} items — likely OCR hallucination`,
            value: itemCount,
            threshold: 300,
        });
    } else if (itemCount > 150) {
        flags.push({
            type: 'excessive_items',
            severity: 'warning',
            message: `Extraction produced ${itemCount} items — unusually large menu`,
            value: itemCount,
            threshold: 150,
        });
    }

    // Anomaly 2: Excessive categories
    if (categoryCount > 50) {
        flags.push({
            type: 'excessive_categories',
            severity: 'critical',
            message: `Extraction produced ${categoryCount} categories — likely misclassification`,
            value: categoryCount,
            threshold: 50,
        });
    } else if (categoryCount > 25) {
        flags.push({
            type: 'excessive_categories',
            severity: 'warning',
            message: `Extraction produced ${categoryCount} categories — unusually many`,
            value: categoryCount,
            threshold: 25,
        });
    }

    // Anomaly 3: Extreme prices
    for (const item of (data.items || [])) {
        const prices: (string | number | null | undefined)[] = [item.price];
        if (item.attributes) {
            prices.push(...item.attributes.map(a => a.price));
        }

        for (const p of prices) {
            if (p == null) continue;
            const priceStr = String(p);
            // Skip price ranges (e.g., "199-299", "300/400", "150–250") — not anomalies
            if (typeof p === 'string' && /[\-\/\–\—]/.test(priceStr.replace(/^[^\d]*/, '').replace(/[^\d]*$/, ''))) continue;
            const numPrice = typeof p === 'number' ? p : parseFloat(priceStr.replace(/[^\d.]/g, ''));
            if (!isNaN(numPrice) && numPrice > 50000) {
                flags.push({
                    type: 'extreme_price',
                    severity: 'warning',
                    message: `Item "${Object.values(item.name)[0] || item.id}" has extreme price: ${p}`,
                    value: numPrice,
                    threshold: 50000,
                });
                break; // One flag per item is enough
            }
        }
    }

    // Anomaly 4: Zero items extracted (complete failure)
    if (itemCount === 0 && categoryCount > 0) {
        flags.push({
            type: 'zero_items',
            severity: 'critical',
            message: `${categoryCount} categories extracted but 0 items — extraction likely failed`,
            value: 0,
            threshold: 1,
        });
    }

    // Anomaly 4b: Items without any categories (orphan items)
    if (itemCount > 0 && categoryCount === 0) {
        flags.push({
            type: 'zero_categories',
            severity: 'critical',
            message: `${itemCount} items extracted but 0 categories — all items are orphans`,
            value: 0,
            threshold: 1,
        });
    }

    // Anomaly 5: Suspicious ratio (too many categories per item)
    if (categoryCount > 0 && itemCount > 0) {
        const ratio = itemCount / categoryCount;
        if (ratio < 1.5 && categoryCount > 5) {
            flags.push({
                type: 'suspicious_ratio',
                severity: 'warning',
                message: `Suspicious items/category ratio: ${ratio.toFixed(1)} (${itemCount} items / ${categoryCount} categories)`,
                value: ratio,
                threshold: 1.5,
            });
        }
    }

    if (flags.length > 0) {
        logger.warn('[extractionHardening] Anomalies detected', {
            flagCount: flags.length,
            flags: flags.map(f => ({ type: f.type, severity: f.severity, value: f.value })),
        });
    }

    return flags;
}

// ═══════════════════════════════════════════════════════════════
// COMBINED HARDENING PIPELINE
// ═══════════════════════════════════════════════════════════════

export interface HardeningResult {
    data: ExtractedMenuData;
    normalization: {
        mergedCategories: number;
        renamedCategories: number;
    };
    integrity: {
        valid: boolean;
        issueCount: number;
    };
    anomalies: AnomalyFlag[];
}

/**
 * Run the full extraction hardening pipeline.
 * 
 * Order:
 * 1. Category synonym normalization (fix data)
 * 2. Semantic integrity validation (log issues)
 * 3. Anomaly detection (flag suspicious patterns)
 * 
 * Non-blocking: always returns data, even if issues are found.
 */
export function hardenExtractedData(data: ExtractedMenuData): HardeningResult {
    const logger = functions.logger;

    // Step 1: Normalize categories
    const normResult = normalizeCategorySynonyms(data);
    const normalizedData: ExtractedMenuData = {
        ...data,
        categories: normResult.categories,
        items: normResult.items,
    };

    // Step 2: Validate integrity
    const integrityResult = validateExtractionIntegrity(normalizedData);

    // Step 3: Detect anomalies
    const anomalies = detectExtractionAnomalies(normalizedData);

    logger.info('[extractionHardening] Pipeline complete', {
        categoriesMerged: normResult.mergedCount,
        categoriesRenamed: normResult.renamedCount,
        integrityValid: integrityResult.valid,
        integrityIssues: integrityResult.issues.length,
        anomalyFlags: anomalies.length,
    });

    return {
        data: normalizedData,
        normalization: {
            mergedCategories: normResult.mergedCount,
            renamedCategories: normResult.renamedCount,
        },
        integrity: {
            valid: integrityResult.valid,
            issueCount: integrityResult.issues.length,
        },
        anomalies,
    };
}
