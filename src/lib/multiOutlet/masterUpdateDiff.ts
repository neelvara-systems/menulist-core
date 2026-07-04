/**
 * Master Update Diff Engine
 *
 * Computes operational differences between the stored snapshot
 * and the current master menu state. Runs in the browser at runtime.
 *
 * Design decisions:
 * - Pure function (testable, no side effects)
 * - Only tracks OPERATIONAL changes (not cosmetic)
 * - Includes outlet context (override awareness)
 * - Returns structured data for UI rendering
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
 */

import {
    ExtractedDataAttribute,
    ExtractedDataCategory,
    ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import type { Project, ProjectOverrides } from "@template/main-app/projects/types/project.types";
import type {
    MasterSnapshot,
    MasterUpdateDiff,
    OperationalChange,
    SnapshotAttribute,
    SnapshotCategory,
    SnapshotItem,
} from "@type/multiOutlet.types";
import { Timestamp } from "firebase/firestore";

const toFirestoreSafeOutletContext = (
    context: OperationalChange["outletContext"],
): OperationalChange["outletContext"] | undefined => {
    if (!context) return undefined;

    const safeContext: NonNullable<OperationalChange["outletContext"]> = {
        hasOverride: Boolean(context.hasOverride),
    };

    if (typeof context.overrideValue === "string") {
        safeContext.overrideValue = context.overrideValue;
    }

    if (typeof context.impactNote === "string") {
        safeContext.impactNote = context.impactNote;
    }

    return safeContext;
};

const toFirestoreSafeOperationalChange = (
    change: OperationalChange,
): OperationalChange => {
    const safeChange: OperationalChange = {
        type: change.type,
        entityId: String(change.entityId || ""),
        entityName: String(change.entityName || ""),
    };

    if (typeof change.oldValue === "string") {
        safeChange.oldValue = change.oldValue;
    }

    if (typeof change.newValue === "string") {
        safeChange.newValue = change.newValue;
    }

    const outletContext = toFirestoreSafeOutletContext(change.outletContext);
    if (outletContext) {
        safeChange.outletContext = outletContext;
    }

    return safeChange;
};

const toFirestoreSafeMasterUpdateDiff = (
    diff: MasterUpdateDiff | null,
): MasterUpdateDiff | null => {
    if (!diff) return null;

    return {
        ...diff,
        changes: diff.changes.map(toFirestoreSafeOperationalChange),
    };
};

// ══════════════════════════════════════════════════════════════════
// DIFF COMPUTATION
// Compare snapshot vs current master to find operational changes
// ══════════════════════════════════════════════════════════════════

/**
 * Compute operational diff between snapshot and current master state
 *
 * @param snapshotItems - Items from outlet's masterSnapshot
 * @param snapshotCategories - Categories from outlet's masterSnapshot
 * @param currentItems - Current master project items
 * @param currentCategories - Current master project categories
 * @param outletOverrides - Outlet's current overrides (for context)
 * @param masterModifiedOn - Master's current modifiedOn timestamp
 */
export function computeMasterUpdateDiff(
    snapshotItems: SnapshotItem[],
    snapshotCategories: SnapshotCategory[],
    currentItems: ExtractedDataItem[],
    currentCategories: ExtractedDataCategory[],
    outletOverrides: ProjectOverrides | undefined,
    masterModifiedOn: Timestamp,
): MasterUpdateDiff {
    const changes: OperationalChange[] = [];
    const overrides = outletOverrides || {
        items: {},
        categories: {},
        attributes: {},
    };

    // Build lookup maps
    const snapshotItemMap = new Map(snapshotItems.map((i) => [i.id, i]));
    const currentItemMap = new Map(currentItems.map((i) => [i.id, i]));
    const snapshotCatMap = new Map(snapshotCategories.map((c) => [c.id, c]));
    const currentCatMap = new Map(currentCategories.map((c) => [c.id, c]));

    // ── ITEM CHANGES ──────────────────────────────────────────────

    // Items added (in current but not in snapshot)
    currentItemMap.forEach((item, id) => {
        if (!snapshotItemMap.has(id)) {
            changes.push({
                type: "ITEM_ADDED",
                entityId: id,
                entityName: getItemPrimaryName(item),
                newValue: item.price || "",
                outletContext: {
                    hasOverride: false,
                    impactNote: "New item will appear in your menu",
                },
            });
        }
    });

    // Items removed (in snapshot but not in current)
    snapshotItemMap.forEach((snapItem, id) => {
        if (!currentItemMap.has(id)) {
            const hasOverride = Boolean(overrides.items[id]);
            changes.push({
                type: "ITEM_REMOVED",
                entityId: id,
                entityName: snapItem.name,
                oldValue: snapItem.price,
                outletContext: {
                    hasOverride,
                    impactNote: hasOverride
                        ? "This item had local overrides which are now orphaned"
                        : "Item removed from your menu",
                },
            });
        }
    });

    // Items changed (present in both)
    currentItemMap.forEach((currentItem, id) => {
        const snapItem = snapshotItemMap.get(id);
        if (!snapItem) return;

        const currentName = getItemPrimaryName(currentItem);
        const currentPrice = currentItem.price || "";
        const itemOverride = overrides.items[id];
        const itemOverridePrice = typeof itemOverride?.price === "string"
            ? itemOverride.price
            : undefined;

        // Price change
        if (currentPrice !== snapItem.price) {
            changes.push({
                type: "ITEM_PRICE_CHANGED",
                entityId: id,
                entityName: currentName,
                oldValue: snapItem.price,
                newValue: currentPrice,
                outletContext: {
                    hasOverride: Boolean(itemOverridePrice),
                    ...(itemOverridePrice ? { overrideValue: itemOverridePrice } : {}),
                    impactNote: itemOverridePrice
                        ? `Your outlet price (${itemOverridePrice}) is unaffected`
                        : `Your menu will show the new price: ${currentPrice}`,
                },
            });
        }

        // Active state change
        if (currentItem.active !== snapItem.active) {
            changes.push({
                type: currentItem.active ? "ITEM_ENABLED" : "ITEM_DISABLED",
                entityId: id,
                entityName: currentName,
                oldValue: String(snapItem.active),
                newValue: String(currentItem.active),
                outletContext: {
                    hasOverride: Boolean(itemOverride?.active !== undefined),
                    impactNote: currentItem.active
                        ? "Item is now visible in your menu"
                        : "Item is now hidden from your menu",
                },
            });
        }

        // Category change (item moved to different category)
        if (currentItem.category !== snapItem.categoryId) {
            changes.push({
                type: "ITEM_MOVED_CATEGORY",
                entityId: id,
                entityName: currentName,
                oldValue: snapItem.categoryId,
                newValue: currentItem.category,
                outletContext: {
                    hasOverride: false,
                    impactNote: "Item moved to a different category",
                },
            });
        }

        // Availability change (sold-out status)
        const currentAvailable = currentItem.available ?? true;
        const snapAvailable = snapItem.available ?? true;
        if (currentAvailable !== snapAvailable) {
            changes.push({
                type: "ITEM_AVAILABILITY_CHANGED",
                entityId: id,
                entityName: currentName,
                oldValue: snapAvailable ? "Available" : "Sold out",
                newValue: currentAvailable ? "Available" : "Sold out",
                outletContext: {
                    hasOverride: Boolean(itemOverride?.available !== undefined),
                    impactNote: currentAvailable
                        ? "Item is back in stock from master"
                        : "Item marked as sold out by master",
                },
            });
        }

        // Bestseller change
        const currentBestseller = currentItem.isBestSeller ?? false;
        const snapBestseller = snapItem.isBestSeller ?? false;
        if (currentBestseller !== snapBestseller) {
            changes.push({
                type: "ITEM_BESTSELLER_CHANGED",
                entityId: id,
                entityName: currentName,
                oldValue: snapBestseller ? "Bestseller" : "Regular",
                newValue: currentBestseller ? "Bestseller" : "Regular",
                outletContext: {
                    hasOverride: Boolean(itemOverride?.isBestSeller !== undefined),
                    impactNote: currentBestseller
                        ? "Item is now marked as a bestseller"
                        : "Item is no longer marked as a bestseller",
                },
            });
        }

        // Duration (prep time) change
        if ((currentItem.duration ?? 0) !== (snapItem.duration ?? 0)) {
            changes.push({
                type: "ITEM_DURATION_CHANGED",
                entityId: id,
                entityName: currentName,
                oldValue: snapItem.duration ? `${snapItem.duration} min` : "Not set",
                newValue: currentItem.duration ? `${currentItem.duration} min` : "Not set",
                outletContext: {
                    hasOverride: Boolean(itemOverride?.duration !== undefined),
                    impactNote: itemOverride?.duration
                        ? `Your outlet prep time (${itemOverride.duration} min) is unaffected`
                        : "Prep time updated from master",
                },
            });
        }

        // ── ATTRIBUTE (VARIANT) CHANGES ──────────────────────────
        const currentAttrs = currentItem.attributes || [];
        const snapAttrs = snapItem.attributes || [];
        const snapAttrMap = new Map(snapAttrs.map((a) => [a.id, a]));
        const currentAttrMap = new Map(currentAttrs.map((a) => [a.id, a]));

        // Attributes added
        currentAttrs.forEach((attr) => {
            if (!snapAttrMap.has(attr.id)) {
                changes.push({
                    type: "ATTRIBUTE_ADDED",
                    entityId: attr.id,
                    entityName: `${currentName} — ${getAttributePrimaryName(attr)}`,
                    newValue: attr.price || "",
                    outletContext: {
                        hasOverride: false,
                        impactNote: "New variant added to this item",
                    },
                });
            }
        });

        // Attributes removed
        snapAttrs.forEach((snapAttr) => {
            if (!currentAttrMap.has(snapAttr.id)) {
                const hasAttrOverride = Boolean(overrides.attributes[snapAttr.id]);
                changes.push({
                    type: "ATTRIBUTE_REMOVED",
                    entityId: snapAttr.id,
                    entityName: `${currentName} — ${snapAttr.name}`,
                    oldValue: snapAttr.price,
                    outletContext: {
                        hasOverride: hasAttrOverride,
                        impactNote: hasAttrOverride
                            ? "This variant had local overrides which are now orphaned"
                            : "Variant removed from this item",
                    },
                });
            }
        });

        // Attributes changed (present in both)
        currentAttrs.forEach((currentAttr) => {
            const snapAttr = snapAttrMap.get(currentAttr.id);
            if (!snapAttr) return;

            const attrOverride = overrides.attributes[currentAttr.id];
            const attrDisplayName = `${currentName} — ${getAttributePrimaryName(currentAttr)}`;
            const currentAttrPrice = currentAttr.price || "";
            const attrOverridePrice = typeof attrOverride?.price === "string"
                ? attrOverride.price
                : undefined;

            // Variant price change
            if (currentAttrPrice !== snapAttr.price) {
                changes.push({
                    type: "ATTRIBUTE_PRICE_CHANGED",
                    entityId: currentAttr.id,
                    entityName: attrDisplayName,
                    oldValue: snapAttr.price,
                    newValue: currentAttrPrice,
                    outletContext: {
                        hasOverride: Boolean(attrOverridePrice),
                        ...(attrOverridePrice ? { overrideValue: attrOverridePrice } : {}),
                        impactNote: attrOverridePrice
                            ? `Your outlet variant price (${attrOverridePrice}) is unaffected`
                            : `Your menu will show the new variant price: ${currentAttrPrice}`,
                    },
                });
            }

            // Variant active state change
            if (currentAttr.active !== snapAttr.active) {
                changes.push({
                    type: currentAttr.active ? "ATTRIBUTE_ENABLED" : "ATTRIBUTE_DISABLED",
                    entityId: currentAttr.id,
                    entityName: attrDisplayName,
                    oldValue: String(snapAttr.active),
                    newValue: String(currentAttr.active),
                    outletContext: {
                        hasOverride: Boolean(attrOverride?.active !== undefined),
                        impactNote: currentAttr.active
                            ? "Variant is now visible in your menu"
                            : "Variant is now hidden from your menu",
                    },
                });
            }
        });
    });

    // ── CATEGORY CHANGES ──────────────────────────────────────────

    // Categories added
    currentCatMap.forEach((cat, id) => {
        if (!snapshotCatMap.has(id)) {
            changes.push({
                type: "CATEGORY_ADDED",
                entityId: id,
                entityName: getCategoryPrimaryName(cat),
                outletContext: {
                    hasOverride: false,
                    impactNote: "New category will appear in your menu",
                },
            });
        }
    });

    // Categories removed
    snapshotCatMap.forEach((snapCat, id) => {
        if (!currentCatMap.has(id)) {
            const hasOverride = Boolean(overrides.categories[id]);
            changes.push({
                type: "CATEGORY_REMOVED",
                entityId: id,
                entityName: snapCat.name,
                outletContext: {
                    hasOverride,
                    impactNote: hasOverride
                        ? "This category had local overrides which are now orphaned"
                        : "Category removed from your menu",
                },
            });
        }
    });

    // Categories changed (active state)
    currentCatMap.forEach((currentCat, id) => {
        const snapCat = snapshotCatMap.get(id);
        if (!snapCat) return;

        if (currentCat.active !== snapCat.active) {
            changes.push({
                type: currentCat.active ? "CATEGORY_ENABLED" : "CATEGORY_DISABLED",
                entityId: id,
                entityName: getCategoryPrimaryName(currentCat),
                oldValue: String(snapCat.active),
                newValue: String(currentCat.active),
                outletContext: {
                    hasOverride: Boolean(overrides.categories[id]?.active !== undefined),
                    impactNote: currentCat.active
                        ? "Category is now visible in your menu"
                        : "Category is now hidden from your menu",
                },
            });
        }
    });

    // ── BUILD SUMMARY ─────────────────────────────────────────────

    const summary = {
        itemsAdded: changes.filter((c) => c.type === "ITEM_ADDED").length,
        itemsRemoved: changes.filter((c) => c.type === "ITEM_REMOVED").length,
        priceChanges: changes.filter((c) => c.type === "ITEM_PRICE_CHANGED").length,
        itemsDisabled: changes.filter((c) => c.type === "ITEM_DISABLED").length,
        itemsEnabled: changes.filter((c) => c.type === "ITEM_ENABLED").length,
        availabilityChanges: changes.filter((c) => c.type === "ITEM_AVAILABILITY_CHANGED").length,
        bestsellerChanges: changes.filter((c) => c.type === "ITEM_BESTSELLER_CHANGED").length,
        durationChanges: changes.filter((c) => c.type === "ITEM_DURATION_CHANGED").length,
        categoriesAdded: changes.filter((c) => c.type === "CATEGORY_ADDED").length,
        categoriesRemoved: changes.filter((c) => c.type === "CATEGORY_REMOVED").length,
        categoriesDisabled: changes.filter((c) => c.type === "CATEGORY_DISABLED").length,
        categoriesEnabled: changes.filter((c) => c.type === "CATEGORY_ENABLED").length,
        itemsMovedCategory: changes.filter((c) => c.type === "ITEM_MOVED_CATEGORY").length,
        attributesAdded: changes.filter((c) => c.type === "ATTRIBUTE_ADDED").length,
        attributesRemoved: changes.filter((c) => c.type === "ATTRIBUTE_REMOVED").length,
        attributePriceChanges: changes.filter((c) => c.type === "ATTRIBUTE_PRICE_CHANGED").length,
        attributesDisabled: changes.filter((c) => c.type === "ATTRIBUTE_DISABLED").length,
        attributesEnabled: changes.filter((c) => c.type === "ATTRIBUTE_ENABLED").length,
    };

    const firestoreSafeChanges = changes.map(toFirestoreSafeOperationalChange);

    return {
        hasChanges: firestoreSafeChanges.length > 0,
        changes: firestoreSafeChanges,
        summary,
        masterModifiedOn,
        totalChanges: firestoreSafeChanges.length,
    };
}

// ══════════════════════════════════════════════════════════════════
// SNAPSHOT CREATION
// Build minimal snapshot from current master data
// ══════════════════════════════════════════════════════════════════

/**
 * Create a minimal snapshot from master project data
 * Called when outlet owner acknowledges changes
 *
 * @param masterItems - Current master items
 * @param masterCategories - Current master categories
 * @param operationalVersion - Current operationalVersion from signal doc
 * @param acknowledgedBy - User ID who acknowledged
 * @param lastDiff - The computed diff to persist for "Last changes" re-view.
 *                   Pass null on initial link (no diff yet).
 */
export function createMasterSnapshot(
    masterItems: ExtractedDataItem[],
    masterCategories: ExtractedDataCategory[],
    operationalVersion: number,
    acknowledgedBy: string,
    lastDiff: MasterUpdateDiff | null = null,
): MasterSnapshot {
    const items: SnapshotItem[] = masterItems.map((item) => {
        const snapItem: SnapshotItem = {
            id: item.id,
            name: getItemPrimaryName(item),
            price: item.price || "",
            categoryId: item.category || "",
            active: item.active !== false,
        };
        // Only include optional fields when they have non-default values
        // to keep snapshot size minimal (Firestore 1MB limit)
        if (item.available === false) snapItem.available = false;
        if (item.isBestSeller) snapItem.isBestSeller = true;
        if (item.duration) snapItem.duration = item.duration;
        if (item.attributes?.length) {
            snapItem.attributes = item.attributes.map((attr): SnapshotAttribute => ({
                id: attr.id,
                name: getAttributePrimaryName(attr),
                price: attr.price || "",
                active: attr.active !== false,
            }));
        }
        return snapItem;
    });

    const categories: SnapshotCategory[] = masterCategories.map((cat) => ({
        id: cat.id,
        name: getCategoryPrimaryName(cat),
        active: cat.active !== false,
    }));

    return {
        acknowledgedOn: Timestamp.now(),
        acknowledgedBy,
        operationalVersion,
        items,
        categories,
        lastDiff: toFirestoreSafeMasterUpdateDiff(lastDiff),
    };
}

// ══════════════════════════════════════════════════════════════════
// SUMMARY TEXT BUILDER
// Human-readable summary for the banner
// ══════════════════════════════════════════════════════════════════

/**
 * Build a human-readable summary text from a diff result.
 * Used in the awareness banner: "Main menu updated — 3 items added, 2 price changes"
 */
export function buildSummaryText(diff: MasterUpdateDiff): string {
    if (!diff.hasChanges) return "";

    const parts: string[] = [];
    const { summary } = diff;

    if (summary.itemsRemoved > 0) parts.push(`${summary.itemsRemoved} item${summary.itemsRemoved > 1 ? "s" : ""} removed`);
    if (summary.attributesRemoved > 0) parts.push(`${summary.attributesRemoved} variant${summary.attributesRemoved > 1 ? "s" : ""} removed`);
    if (summary.itemsAdded > 0) parts.push(`${summary.itemsAdded} item${summary.itemsAdded > 1 ? "s" : ""} added`);
    if (summary.attributesAdded > 0) parts.push(`${summary.attributesAdded} variant${summary.attributesAdded > 1 ? "s" : ""} added`);
    if (summary.priceChanges > 0) parts.push(`${summary.priceChanges} price change${summary.priceChanges > 1 ? "s" : ""}`);
    if (summary.attributePriceChanges > 0) parts.push(`${summary.attributePriceChanges} variant price${summary.attributePriceChanges > 1 ? "s" : ""} changed`);
    if (summary.availabilityChanges > 0) parts.push(`${summary.availabilityChanges} availability change${summary.availabilityChanges > 1 ? "s" : ""}`);
    if (summary.itemsDisabled > 0) parts.push(`${summary.itemsDisabled} item${summary.itemsDisabled > 1 ? "s" : ""} disabled`);
    if (summary.itemsEnabled > 0) parts.push(`${summary.itemsEnabled} item${summary.itemsEnabled > 1 ? "s" : ""} enabled`);
    if (summary.attributesDisabled > 0) parts.push(`${summary.attributesDisabled} variant${summary.attributesDisabled > 1 ? "s" : ""} disabled`);
    if (summary.attributesEnabled > 0) parts.push(`${summary.attributesEnabled} variant${summary.attributesEnabled > 1 ? "s" : ""} enabled`);
    if (summary.bestsellerChanges > 0) parts.push(`${summary.bestsellerChanges} bestseller change${summary.bestsellerChanges > 1 ? "s" : ""}`);
    if (summary.durationChanges > 0) parts.push(`${summary.durationChanges} prep time change${summary.durationChanges > 1 ? "s" : ""}`);
    if (summary.categoriesAdded > 0) parts.push(`${summary.categoriesAdded} categor${summary.categoriesAdded > 1 ? "ies" : "y"} added`);
    if (summary.categoriesRemoved > 0) parts.push(`${summary.categoriesRemoved} categor${summary.categoriesRemoved > 1 ? "ies" : "y"} removed`);
    if (summary.categoriesDisabled > 0) parts.push(`${summary.categoriesDisabled} categor${summary.categoriesDisabled > 1 ? "ies" : "y"} disabled`);
    if (summary.categoriesEnabled > 0) parts.push(`${summary.categoriesEnabled} categor${summary.categoriesEnabled > 1 ? "ies" : "y"} enabled`);
    if (summary.itemsMovedCategory > 0) parts.push(`${summary.itemsMovedCategory} item${summary.itemsMovedCategory > 1 ? "s" : ""} moved`);

    if (parts.length === 0) return "";

    // Cap at 3 most important changes for banner brevity
    const displayParts = parts.slice(0, 3);
    if (parts.length > 3) {
        displayParts.push(`+${parts.length - 3} more`);
    }

    return displayParts.join(", ");
}

// ══════════════════════════════════════════════════════════════════
// OPERATIONAL CHANGE DETECTION
// Lightweight check for master save pipeline (Section 8.4)
// ══════════════════════════════════════════════════════════════════

/**
 * Detect if a project update contains operational changes.
 *
 * Operational = items/categories added/removed, prices, active status.
 * NON-operational = theme, config, description, images.
 *
 * This is intentionally lightweight — just checks if items/categories
 * arrays differ in length or key operational fields. No full diff needed.
 *
 * @param oldProject - Project state before save
 * @param newData - Partial project data being saved
 * @returns true if operational change detected
 */
export function detectOperationalChange(
    oldProject: Project,
    newData: Partial<Project>,
): boolean {
    // If newData doesn't include files, no operational change
    if (!newData.files) return false;

    const oldItems = extractItemsFromProject(oldProject);
    const newItems = newData.files.flatMap(
        (f) => f.extractedData?.data?.items || [],
    );

    const oldCategories = extractCategoriesFromProject(oldProject);
    const newCategories = newData.files.flatMap(
        (f) => f.extractedData?.data?.categories || [],
    );

    // Quick check: count changed?
    if (oldItems.length !== newItems.length) return true;
    if (oldCategories.length !== newCategories.length) return true;

    // Deep check: operational fields changed?
    const oldItemMap = new Map(oldItems.map((i) => [i.id, i]));
    for (const newItem of newItems) {
        const old = oldItemMap.get(newItem.id);
        if (!old) return true; // New item
        if (old.price !== newItem.price) return true;
        if (old.active !== newItem.active) return true;
        if (old.category !== newItem.category) return true;
        if ((old.available ?? true) !== (newItem.available ?? true)) return true;
        if ((old.isBestSeller ?? false) !== (newItem.isBestSeller ?? false)) return true;
        if ((old.duration ?? 0) !== (newItem.duration ?? 0)) return true;

        // Attribute (variant) changes
        const oldAttrs = old.attributes || [];
        const newAttrs = newItem.attributes || [];
        if (oldAttrs.length !== newAttrs.length) return true;
        const oldAttrMap = new Map(oldAttrs.map((a) => [a.id, a]));
        for (const newAttr of newAttrs) {
            const oldAttr = oldAttrMap.get(newAttr.id);
            if (!oldAttr) return true; // New attribute
            if (oldAttr.price !== newAttr.price) return true;
            if (oldAttr.active !== newAttr.active) return true;
        }
    }

    const oldCatMap = new Map(oldCategories.map((c) => [c.id, c]));
    for (const newCat of newCategories) {
        const old = oldCatMap.get(newCat.id);
        if (!old) return true; // New category
        if (old.active !== newCat.active) return true;
    }

    return false;
}

// ══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// Extract primary language names from multilingual objects
// ══════════════════════════════════════════════════════════════════

/**
 * Get primary language name from an ExtractedDataItem
 * Falls back through: en → first available key → 'Unknown'
 */
function getItemPrimaryName(item: ExtractedDataItem): string {
    if (!item.name) return "Unknown";
    return item.name["en"] || Object.values(item.name)[0] || "Unknown";
}

/**
 * Get primary language name from an ExtractedDataCategory
 */
function getCategoryPrimaryName(cat: ExtractedDataCategory): string {
    if (!cat.name) return "Unknown";
    return cat.name["en"] || Object.values(cat.name)[0] || "Unknown";
}

/**
 * Get primary language name from an ExtractedDataAttribute (item variant)
 */
function getAttributePrimaryName(attr: ExtractedDataAttribute): string {
    if (!attr.name) return "Unknown";
    return attr.name["en"] || Object.values(attr.name)[0] || "Unknown";
}

/**
 * Extract all items from a project (across all files)
 * Mirrors resolveProject.ts:extractItems but exported for reuse
 */
export function extractItemsFromProject(project: Project): ExtractedDataItem[] {
    return (
        project.files?.flatMap((f) => f.extractedData?.data?.items || []) || []
    );
}

/**
 * Extract all categories from a project (across all files)
 * Mirrors resolveProject.ts:extractCategories but exported for reuse
 */
export function extractCategoriesFromProject(project: Project): ExtractedDataCategory[] {
    return (
        project.files?.flatMap((f) => f.extractedData?.data?.categories || []) || []
    );
}
