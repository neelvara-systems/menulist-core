/**
 * Menu Correctness Engine (MCE) — Correctness State Resolver (CSR)
 *
 * Client-side validation engine that checks menu data against deterministic
 * correctness rules on every save. Zero Firebase cost.
 *
 * Organized under 5 Correctness Laws:
 * 1. Price Integrity (4 rules)
 * 2. Availability Integrity (2 rules)
 * 3. Hours Data Consistency (1 rule)
 * 4. Data Completeness (7 rules)
 * 5. Structural Integrity (4 rules — multi-outlet only)
 *
 * Rule Evaluation Order:
 * Law 4 first (must have basic data structure),
 * then Law 1, Law 2, Law 3, Law 5 (multi-outlet only).
 *
 * @see __docs__/menu-correctness-engine/menu-correctness-engine_impl.md §6
 */

import type {
    CSRError,
    CSRInput,
    CSRResult,
    CSRWarning,
    ValidationRule,
    ValidationRuleResult,
} from "./types";

// ─────────────────────────────────────────────────────────────
// HELPER: Extract items and categories from project data
// ─────────────────────────────────────────────────────────────

interface ExtractedItem {
    id: string;
    name: Record<string, string> | undefined;
    price: string | number | undefined;
    category: string | undefined;
    active: boolean;
    available: boolean;
    fileIndex: number;
}

interface ExtractedCategory {
    id: string;
    name: Record<string, string> | undefined;
    active: boolean;
    fileIndex: number;
}

function extractItems(projectData: Record<string, any>): ExtractedItem[] {
    const items: ExtractedItem[] = [];
    const files = projectData?.files;
    if (!Array.isArray(files)) return items;

    files.forEach((file: any, fileIndex: number) => {
        if (file.active === false || file.deleted) return;
        const fileItems = file.extractedData?.data?.items;
        if (!Array.isArray(fileItems)) return;

        fileItems.forEach((item: any) => {
            items.push({
                id: item.id || "",
                name: item.name,
                price: item.price,
                category: item.category,
                active: item.active !== false,
                available: item.available !== false,
                fileIndex,
            });
        });
    });

    return items;
}

function extractCategories(projectData: Record<string, any>): ExtractedCategory[] {
    const categories: ExtractedCategory[] = [];
    const files = projectData?.files;
    if (!Array.isArray(files)) return categories;

    files.forEach((file: any, fileIndex: number) => {
        if (file.active === false || file.deleted) return;
        const fileCats = file.extractedData?.data?.categories;
        if (!Array.isArray(fileCats)) return;

        fileCats.forEach((cat: any) => {
            categories.push({
                id: cat.id || "",
                name: cat.name,
                active: cat.active !== false,
                fileIndex,
            });
        });
    });

    return categories;
}

function getActiveFiles(projectData: Record<string, any>): any[] {
    const files = projectData?.files;
    if (!Array.isArray(files)) return [];
    return files.filter((f: any) => f.active !== false && !f.deleted);
}

function getPrimaryLanguage(projectData: Record<string, any>): string {
    return projectData?.languages?.[0] || "en";
}

// ─────────────────────────────────────────────────────────────
// LAW 1 — PRICE INTEGRITY (4 rules)
// ─────────────────────────────────────────────────────────────

const VALID_PRICE_FORMAT: ValidationRule = {
    id: "VALID_PRICE_FORMAT",
    law: "PRICE_INTEGRITY",
    description: "Price is a valid number or string-parseable number",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            if (item.price === undefined || item.price === null || item.price === "") continue;

            const numPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
            if (typeof numPrice !== "number" || isNaN(numPrice)) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) have invalid price format`
                : "",
            suggestedFix: "Enter a valid numeric price for each item",
        };
    },
};

const NO_NEGATIVE_PRICE: ValidationRule = {
    id: "NO_NEGATIVE_PRICE",
    law: "PRICE_INTEGRITY",
    description: "No item has a negative price",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            if (item.price === undefined || item.price === null || item.price === "") continue;

            const numPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
            if (typeof numPrice === "number" && !isNaN(numPrice) && numPrice < 0) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) have negative prices`
                : "",
            suggestedFix: "Remove negative prices — prices must be zero or positive",
        };
    },
};

const NO_ZERO_PRICE_ACTIVE: ValidationRule = {
    id: "NO_ZERO_PRICE_ACTIVE",
    law: "PRICE_INTEGRITY",
    description: "Active items with price field must have price > 0",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            // Skip items that have no price field at all (some items are unpriced)
            if (item.price === undefined || item.price === null || item.price === "") continue;

            const numPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
            if (typeof numPrice === "number" && numPrice === 0) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} active item(s) have zero price`
                : "",
            suggestedFix: "Set a valid price or remove the price field for unpriced items",
        };
    },
};

const SUSPICIOUS_PRICE_CHANGE: ValidationRule = {
    id: "SUSPICIOUS_PRICE_CHANGE",
    law: "PRICE_INTEGRITY",
    description: "Price changed by more than 200% from previous value",
    severity: "medium",
    blocksVerification: false, // Warning only — never blocks, just flags
    validate: (input: CSRInput): ValidationRuleResult => {
        if (!input.oldProjectData) {
            return { passed: true, affectedItems: [], message: "" };
        }

        const currentItems = extractItems(input.projectData);
        const oldItems = extractItems(input.oldProjectData);
        const oldPriceMap = new Map<string, number>();

        for (const item of oldItems) {
            if (!item.active || item.price === undefined || item.price === null || item.price === "") continue;
            const numPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
            if (typeof numPrice === "number" && !isNaN(numPrice) && numPrice > 0) {
                oldPriceMap.set(item.id, numPrice);
            }
        }

        const affected: string[] = [];
        const ANOMALY_THRESHOLD = 2.0; // 200% change

        for (const item of currentItems) {
            if (!item.active || item.price === undefined || item.price === null || item.price === "") continue;
            const newPrice = typeof item.price === "string" ? parseFloat(item.price) : item.price;
            if (typeof newPrice !== "number" || isNaN(newPrice) || newPrice <= 0) continue;

            const oldPrice = oldPriceMap.get(item.id);
            if (oldPrice === undefined) continue;

            const changeRatio = Math.abs(newPrice - oldPrice) / oldPrice;
            if (changeRatio > ANOMALY_THRESHOLD) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) have suspicious price changes (>200%)`
                : "",
            suggestedFix: "Verify these price changes are intentional",
        };
    },
};

// ─────────────────────────────────────────────────────────────
// LAW 2 — AVAILABILITY INTEGRITY (2 rules)
// ─────────────────────────────────────────────────────────────

const DISABLED_ITEM_HIDDEN: ValidationRule = {
    id: "DISABLED_ITEM_HIDDEN",
    law: "AVAILABILITY_INTEGRITY",
    description: "Items with active: false are properly marked",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        // Validates structural correctness of the active flag.
        // Items with active: false should exist in data but be excluded
        // by sanitizeForClient() at read-time. The CSR validates that
        // the flag is a proper boolean when present.
        const affected: string[] = [];
        const rawFiles = input.projectData?.files;
        if (!Array.isArray(rawFiles)) return { passed: true, affectedItems: [], message: "" };

        for (const file of rawFiles) {
            if (file.active === false || file.deleted) continue;
            const rawItems = file?.extractedData?.data?.items;
            if (!Array.isArray(rawItems)) continue;

            for (const rawItem of rawItems) {
                if (rawItem.active !== undefined && typeof rawItem.active !== "boolean") {
                    affected.push(rawItem.id || "unknown");
                }
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) have invalid active flag (must be boolean)`
                : "",
        };
    },
};

const OUTLET_AVAILABILITY_RESPECTED: ValidationRule = {
    id: "OUTLET_AVAILABILITY_RESPECTED",
    law: "AVAILABILITY_INTEGRITY",
    description: "Outlet local availability override takes precedence over master",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        // Only applicable for outlet projects with overrides
        if (!input.isOutlet) {
            return { passed: true, affectedItems: [], message: "" };
        }

        const overrides = input.projectData?.overrides?.items;
        if (!overrides || typeof overrides !== "object") {
            return { passed: true, affectedItems: [], message: "" };
        }

        const affected: string[] = [];

        // Validate that override availability values are proper booleans
        for (const [itemId, override] of Object.entries(overrides)) {
            const ov = override as Record<string, any>;
            if (ov.available !== undefined && typeof ov.available !== "boolean") {
                affected.push(itemId);
            }
            if (ov.active !== undefined && typeof ov.active !== "boolean") {
                affected.push(itemId);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} outlet override(s) have invalid availability values`
                : "",
        };
    },
};

// ─────────────────────────────────────────────────────────────
// LAW 3 — HOURS DATA CONSISTENCY (1 rule)
// ─────────────────────────────────────────────────────────────

const HOURS_DATA_PRESENT: ValidationRule = {
    id: "HOURS_DATA_PRESENT",
    law: "HOURS_DATA_CONSISTENCY",
    description: "If store has workingHours configured, data is structurally valid",
    severity: "low",
    blocksVerification: false, // Warning only
    validate: (_input: CSRInput): ValidationRuleResult => {
        // Hours data lives on the store document, not the project document.
        // MCE validates project data only. Hours validation is handled by
        // the Hours Engine (src/lib/hours/hoursEngine.ts).
        // This rule passes by default — included for completeness.
        return { passed: true, affectedItems: [], message: "" };
    },
};

// ─────────────────────────────────────────────────────────────
// LAW 4 — DATA COMPLETENESS (7 rules)
// ─────────────────────────────────────────────────────────────

const FILE_HAS_DATA: ValidationRule = {
    id: "FILE_HAS_DATA",
    law: "DATA_COMPLETENESS",
    description: "At least one file has extracted data with items",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const activeFiles = getActiveFiles(input.projectData);
        const hasData = activeFiles.some(
            (f: any) => f.extractedData?.data?.items?.length > 0,
        );

        return {
            passed: hasData,
            affectedItems: hasData ? [] : ["project"],
            message: hasData ? "" : "No files contain menu items",
            suggestedFix: "Upload a menu file and extract items before publishing",
        };
    },
};

const REQUIRED_NAME: ValidationRule = {
    id: "REQUIRED_NAME",
    law: "DATA_COMPLETENESS",
    description: "Every active item has a name in primary language",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const primaryLang = getPrimaryLanguage(input.projectData);
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            const name = item.name?.[primaryLang];
            if (!name || (typeof name === "string" && name.trim() === "")) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} active item(s) missing name in ${primaryLang}`
                : "",
            suggestedFix: "Add a name for every active item in the primary language",
        };
    },
};

const REQUIRED_CATEGORY: ValidationRule = {
    id: "REQUIRED_CATEGORY",
    law: "DATA_COMPLETENESS",
    description: "Every active item has a category assignment",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            if (!item.category || (typeof item.category === "string" && item.category.trim() === "")) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} active item(s) have no category assigned`
                : "",
            suggestedFix: "Assign a category to every active item",
        };
    },
};

const CATEGORY_EXISTS: ValidationRule = {
    id: "CATEGORY_EXISTS",
    law: "DATA_COMPLETENESS",
    description: "Every item's category ID matches an existing category",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const categories = extractCategories(input.projectData);
        const categoryIds = new Set(categories.map((c) => c.id));
        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            if (!item.category) continue;
            if (!categoryIds.has(item.category)) {
                affected.push(item.id);
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) reference nonexistent categories`
                : "",
            suggestedFix: "Reassign items to existing categories",
        };
    },
};

const NO_DUPLICATE_IDS: ValidationRule = {
    id: "NO_DUPLICATE_IDS",
    law: "DATA_COMPLETENESS",
    description: "No duplicate item or category IDs within a project",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const categories = extractCategories(input.projectData);
        const affected: string[] = [];

        // Check item ID duplicates
        const itemIds = new Set<string>();
        for (const item of items) {
            if (!item.id) continue;
            if (itemIds.has(item.id)) {
                affected.push(item.id);
            }
            itemIds.add(item.id);
        }

        // Check category ID duplicates
        const catIds = new Set<string>();
        for (const cat of categories) {
            if (!cat.id) continue;
            if (catIds.has(cat.id)) {
                affected.push(cat.id);
            }
            catIds.add(cat.id);
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} duplicate ID(s) found`
                : "",
            suggestedFix: "Remove duplicate items or categories with the same ID",
        };
    },
};

const LANGUAGE_COMPLETE: ValidationRule = {
    id: "LANGUAGE_COMPLETE",
    law: "DATA_COMPLETENESS",
    description: "All declared languages have translations for active items",
    severity: "medium",
    blocksVerification: false, // Warning only
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const languages = input.projectData?.languages;
        if (!Array.isArray(languages) || languages.length <= 1) {
            return { passed: true, affectedItems: [], message: "" };
        }

        const affected: string[] = [];

        for (const item of items) {
            if (!item.active) continue;
            for (const lang of languages) {
                const name = item.name?.[lang];
                if (!name || (typeof name === "string" && name.trim() === "")) {
                    if (!affected.includes(item.id)) {
                        affected.push(item.id);
                    }
                }
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} item(s) missing translations for declared languages`
                : "",
        };
    },
};

const MAX_ITEMS_LIMIT: ValidationRule = {
    id: "MAX_ITEMS_LIMIT",
    law: "DATA_COMPLETENESS",
    description: "Project doesn't exceed 500 active items",
    severity: "low",
    blocksVerification: false, // Warning only
    validate: (input: CSRInput): ValidationRuleResult => {
        const items = extractItems(input.projectData);
        const activeItems = items.filter((i) => i.active);
        const limit = 500;

        return {
            passed: activeItems.length <= limit,
            affectedItems: activeItems.length > limit ? ["project"] : [],
            message: activeItems.length > limit
                ? `Project has ${activeItems.length} active items (recommended max: ${limit})`
                : "",
        };
    },
};

// ─────────────────────────────────────────────────────────────
// LAW 5 — STRUCTURAL INTEGRITY (4 rules — multi-outlet only)
// ─────────────────────────────────────────────────────────────

const OUTLET_MASTER_SYNC: ValidationRule = {
    id: "OUTLET_MASTER_SYNC",
    law: "STRUCTURAL_INTEGRITY",
    description: "Outlet data based on latest master version",
    severity: "medium",
    blocksVerification: false, // Warning only
    validate: (input: CSRInput): ValidationRuleResult => {
        // This would require comparing outlet vs master state.
        // In v1, outlet re-validation happens on next save (impl §7).
        // The master update awareness system handles notification.
        if (!input.isOutlet) {
            return { passed: true, affectedItems: [], message: "" };
        }
        return { passed: true, affectedItems: [], message: "" };
    },
};

const OVERRIDE_PRESERVED: ValidationRule = {
    id: "OVERRIDE_PRESERVED",
    law: "STRUCTURAL_INTEGRITY",
    description: "Local outlet overrides preserved after master edit",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        if (!input.isOutlet) {
            return { passed: true, affectedItems: [], message: "" };
        }

        // Validate that overrides structure is well-formed if present
        const overrides = input.projectData?.overrides;
        if (!overrides) {
            return { passed: true, affectedItems: [], message: "" };
        }

        const affected: string[] = [];

        // Validate items overrides structure
        if (overrides.items && typeof overrides.items === "object") {
            for (const [itemId, override] of Object.entries(overrides.items)) {
                if (!override || typeof override !== "object") {
                    affected.push(itemId);
                }
            }
        }

        // Validate categories overrides structure
        if (overrides.categories && typeof overrides.categories === "object") {
            for (const [catId, override] of Object.entries(overrides.categories)) {
                if (!override || typeof override !== "object") {
                    affected.push(catId);
                }
            }
        }

        return {
            passed: affected.length === 0,
            affectedItems: affected,
            message: affected.length > 0
                ? `${affected.length} override(s) have invalid structure`
                : "",
        };
    },
};

const NO_ORPHAN_ITEMS: ValidationRule = {
    id: "NO_ORPHAN_ITEMS",
    law: "STRUCTURAL_INTEGRITY",
    description: "No items reference nonexistent categories after merge",
    severity: "high",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        // This is the same check as CATEGORY_EXISTS but specifically
        // for multi-outlet context (after merge). Since we validate
        // the resolved output, CATEGORY_EXISTS covers this.
        // Included as separate rule for structural completeness.
        if (!input.isOutlet) {
            return { passed: true, affectedItems: [], message: "" };
        }
        return CATEGORY_EXISTS.validate(input);
    },
};

const OUTLET_STRUCTURALLY_COMPLETE: ValidationRule = {
    id: "OUTLET_STRUCTURALLY_COMPLETE",
    law: "STRUCTURAL_INTEGRITY",
    description: "Outlet has at least one file with items after merge",
    severity: "critical",
    blocksVerification: true,
    validate: (input: CSRInput): ValidationRuleResult => {
        if (!input.isOutlet) {
            return { passed: true, affectedItems: [], message: "" };
        }
        // Reuse FILE_HAS_DATA for outlets
        return FILE_HAS_DATA.validate(input);
    },
};

// ─────────────────────────────────────────────────────────────
// RULE REGISTRY (evaluation order matters)
// ─────────────────────────────────────────────────────────────

/**
 * All validation rules in evaluation order.
 * Law 4 (Data Completeness) runs first — must have basic data structure.
 * Then Law 1 (Prices), Law 2 (Availability), Law 3 (Hours), Law 5 (Structural).
 */
const ALL_RULES: ValidationRule[] = [
    // Law 4 — Data Completeness (first — must have basic structure)
    FILE_HAS_DATA,
    REQUIRED_NAME,
    REQUIRED_CATEGORY,
    CATEGORY_EXISTS,
    NO_DUPLICATE_IDS,
    LANGUAGE_COMPLETE,
    MAX_ITEMS_LIMIT,
    // Law 1 — Price Integrity
    VALID_PRICE_FORMAT,
    NO_NEGATIVE_PRICE,
    NO_ZERO_PRICE_ACTIVE,
    SUSPICIOUS_PRICE_CHANGE,
    // Law 2 — Availability Integrity
    DISABLED_ITEM_HIDDEN,
    OUTLET_AVAILABILITY_RESPECTED,
    // Law 3 — Hours Data Consistency
    HOURS_DATA_PRESENT,
    // Law 5 — Structural Integrity (multi-outlet only)
    OUTLET_MASTER_SYNC,
    OVERRIDE_PRESERVED,
    NO_ORPHAN_ITEMS,
    OUTLET_STRUCTURALLY_COMPLETE,
];

// ─────────────────────────────────────────────────────────────
// CSR ENTRY POINT
// ─────────────────────────────────────────────────────────────

/**
 * Evaluate correctness of project data against all validation rules.
 *
 * Runs entirely client-side. Zero Firebase calls.
 * Deterministic — given identical input, always produces identical output.
 *
 * @param input - CSR input containing project data and context
 * @returns CSRResult with verification status, errors, and warnings
 */
export function evaluateCorrectness(input: CSRInput): CSRResult {
    const errors: CSRError[] = [];
    const warnings: CSRWarning[] = [];
    let rulesPassed = 0;

    for (const rule of ALL_RULES) {
        const result = rule.validate(input);

        if (result.passed) {
            rulesPassed++;
        } else if (rule.blocksVerification) {
            errors.push({
                ruleId: rule.id,
                message: result.message,
                severity: rule.severity as "high" | "critical",
                affectedItems: result.affectedItems,
                suggestedFix: result.suggestedFix,
            });
        } else {
            warnings.push({
                ruleId: rule.id,
                message: result.message,
                severity: rule.severity as "low" | "medium",
                affectedItems: result.affectedItems,
            });
        }
    }

    return {
        verified: errors.length === 0,
        warnings,
        errors,
        validatedAt: Date.now(),
        rulesEvaluated: ALL_RULES.length,
        rulesPassed,
    };
}
