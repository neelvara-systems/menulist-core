/**
 * Decision Blocks Component
 * 
 * Displays the three Decision Blocks at the top of the menu:
 * - ⭐ Popular Right Now
 * - ⚡ Quick Pick  
 * - 💰 Best Value
 * 
 * ARCHITECTURE (2-Layer System):
 * - Layer 1: Cloud Function precomputes top 3 candidates per block nightly
 * - Layer 2: This component applies runtime availability filter
 * - Fallback: Local computation if precomputed data is stale/unavailable
 * 
 * CORE RULE: Never show a Decision Block the customer cannot act on
 * - Availability always beats intelligence
 * - Hide block if no valid candidates (don't show empty/error states)
 * 
 * Features:
 * - Horizontal scrollable on mobile
 * - Business-type aware labels
 * - Tracks Decision Block clicks (views tracked via decision_blocks_rendered)
 * - Scrolls to item when tapped
 * - Runtime availability filtering on precomputed candidates
 * - TTL check with automatic fallback to local computation
 */

import { DECISION_REASON_KEYS, DecisionBlockType, getBlockLabels, getDecisionBlockTranslation, getEnabledBlocks } from '@config/decisionBlocks';
import { FEATURE_FLAGS } from '@config/features';
import CategoryIcon from '@atoms/CategoryIcon';
import useDeviceType from '@hook/useDeviceType';
import { trackDecisionBlockClick, trackDecisionBlocksRendered } from '@lib/analytics/unified';
import { getMenuItemImageAltText } from '@lib/media/altText';
import { getPrimaryPublicMenuImage } from '@lib/menu/publicMenuImages';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import Image from 'next/image';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DecisionBlockEntry, PrecomputedDecisionBlocks } from '../../types';
import { ExtractedDataCategory, ExtractedDataItem } from '../../types/extractedData.types';
import { MenuSettings } from '../../types/project.types';
import { MenuMoodConfig } from '../designSystem';
import { MenuLayout } from '../designSystem';

interface DecisionBlocksProps {
    items: ExtractedDataItem[];
    /** Categories for time-slot validation */
    categories?: ExtractedDataCategory[];
    activeLanguage: string;
    primaryLanguage?: string;
    businessType?: string;
    moodConfig: MenuMoodConfig;
    onItemClick?: (item: ExtractedDataItem) => void;
    currency?: string;
    menuSettings?: MenuSettings;
    /** Precomputed Decision Blocks from Cloud Function (optional) */
    precomputedBlocks?: PrecomputedDecisionBlocks | null;
    showItemPrices?: boolean;
    showCategoryIcons?: boolean;
    /** Required for project-wise analytics storage */
    analyticsIds?: Partial<Pick<import('@lib/analytics/unified').TrackingData, 'tenantId' | 'storeId' | 'projectId' | 'storeTimeZone' | 'businessDayEndTime'>>;
    /** Controls whether decision-block analytics should fire. */
    trackingEnabled?: boolean;
    menuLayout?: MenuLayout;
}

interface ComputedBlock {
    blockType: DecisionBlockType;
    item: ExtractedDataItem;
    reason: string;                      // i18n key or plain text
    reasonParams?: Record<string, any>;  // Optional params for interpolation
}

const OWNER_PINNED_TITLES: Record<DecisionBlockType, string> = {
    popular: 'Featured choice',
    quickPick: 'Quick choice',
    bestValue: 'Value choice',
};

function getLocalizedMenuText(value: unknown, language: string, fallback = ''): string {
    if (typeof value === 'string') return value || fallback;
    if (!value || typeof value !== 'object') return fallback;

    const localized = value as Record<string, unknown>;
    const direct = localized[language];
    if (typeof direct === 'string' && direct.trim()) return direct;

    const english = localized.en;
    if (typeof english === 'string' && english.trim()) return english;

    const firstText = Object.values(localized).find((entry): entry is string => (
        typeof entry === 'string' && entry.trim().length > 0
    ));

    return firstText || fallback;
}

/**
 * Owner controls for Decision Blocks
 */
interface OwnerControls {
    enablePopular?: boolean;
    enableQuickPick?: boolean;
    enableBestValue?: boolean;
    pinnedPopular?: string;
    pinnedQuickPick?: string;
    pinnedBestValue?: string;
}

// ═══════════════════════════════════════════════════════════════
// HARDENING: Lifecycle States + Activation Gates
// "Decision Blocks exist only when data earns the right to guide."
// ═══════════════════════════════════════════════════════════════

type LifecycleState = 'COLD' | 'LEARNING' | 'STABLE';

/** Thresholds for lifecycle gating */
const LIFECYCLE_THRESHOLDS = {
    COLD_MAX_VIEWS: 100,       // Below this = COLD (no blocks)
    LEARNING_MAX_VIEWS: 500,   // Below this = LEARNING (Popular only)
    MIN_CLICKS: 20,            // Global minimum clicks to show anything
    MIN_ITEMS: 5,              // Global minimum items to show anything
    MIN_ANALYTICS_DAYS: 3,     // Need at least 3 days of data
    POPULAR_MIN_CLICKS: 30,    // Popular block: min total clicks
    POPULAR_MIN_ITEMS: 3,      // Popular block: min unique items with clicks
    QUICK_PICK_DURATION_COV: 0.6,  // Quick Pick: 60% items need duration
    BEST_VALUE_PRICE_COV: 0.7,     // Best Value: 70% items need price
    BEST_VALUE_MIN_ITEMS: 5,       // Best Value: min items with price
    MIN_BLOCKS_TO_RENDER: 2,       // Minimum blocks or show nothing
    STALE_HOURS: 72,               // Hard cutoff: no blocks at all after 72h
} as const;

/**
 * Determine lifecycle state from statsUsed
 */
function getLifecycleState(stats: PrecomputedDecisionBlocks['statsUsed'] | undefined): LifecycleState {
    if (!stats) return 'COLD';
    const views = stats.totalViews ?? 0;
    if (views < LIFECYCLE_THRESHOLDS.COLD_MAX_VIEWS) return 'COLD';
    if (views < LIFECYCLE_THRESHOLDS.LEARNING_MAX_VIEWS) return 'LEARNING';
    return 'STABLE';
}

/**
 * Check if precomputed blocks are still valid (not expired)
 */
function isPrecomputedValid(precomputed: PrecomputedDecisionBlocks | null | undefined): boolean {
    if (!precomputed) return false;
    if (!precomputed.validUntil) return false;

    const validUntil = precomputed.validUntil instanceof Date
        ? precomputed.validUntil
        : new Date(precomputed.validUntil);

    return validUntil > new Date();
}

/**
 * Check if precomputed blocks are critically stale (>72h)
 * Beyond normal TTL, automatic picks should not show. Owner pins can still
 * render through the pinned-only fallback after runtime availability checks.
 */
function isHardStale(precomputed: PrecomputedDecisionBlocks | null | undefined): boolean {
    if (!precomputed) return false;
    if (!precomputed.computedAt) return true;

    const computedAt = (precomputed.computedAt as any)?.toDate
        ? (precomputed.computedAt as any).toDate()
        : precomputed.computedAt instanceof Date
            ? precomputed.computedAt
            : new Date(precomputed.computedAt as any);

    const hoursSinceCompute = (Date.now() - computedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCompute > LIFECYCLE_THRESHOLDS.STALE_HOURS;
}

/**
 * Global activation gate — all must pass before any blocks render
 */
function passesGlobalGate(precomputed: PrecomputedDecisionBlocks | null | undefined): boolean {
    if (!precomputed?.statsUsed) return false;
    const stats = precomputed.statsUsed;

    // Hard stale: scheduler hasn't run in >72h
    if (isHardStale(precomputed)) return false;

    // Minimum data thresholds
    if ((stats.totalViews ?? 0) < LIFECYCLE_THRESHOLDS.COLD_MAX_VIEWS) return false;
    if ((stats.totalClicks ?? 0) < LIFECYCLE_THRESHOLDS.MIN_CLICKS) return false;
    if (stats.totalItems < LIFECYCLE_THRESHOLDS.MIN_ITEMS) return false;

    // Need at least some analytics days (graceful: skip if field not yet populated)
    if (stats.daysWithData !== undefined && stats.daysWithData < LIFECYCLE_THRESHOLDS.MIN_ANALYTICS_DAYS) return false;

    return true;
}

/**
 * Check if current time falls within a category's time slots
 * Returns true if:
 * - Category has no time slots (always visible)
 * - Current time is within any of the category's time slots
 */
function isCategoryWithinTimeSlot(category: ExtractedDataCategory | undefined): boolean {
    if (!category) return true; // No category = always visible
    if (!Array.isArray(category.timeSlots) || category.timeSlots.length === 0) return true; // No slots = always visible

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const slot of category.timeSlots) {
        if (!slot?.startTime || !slot?.endTime) continue;

        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        if ([startHour, startMin, endHour, endMin].some((value) => Number.isNaN(value))) continue;

        const slotStart = startHour * 60 + startMin;
        const slotEnd = endHour * 60 + endMin;

        // Handle overnight slots (e.g., 22:00 - 02:00)
        if (slotEnd < slotStart) {
            if (currentMinutes >= slotStart || currentMinutes <= slotEnd) return true;
        } else {
            if (currentMinutes >= slotStart && currentMinutes <= slotEnd) return true;
        }
    }

    return false; // Current time not within any slot
}

/**
 * Runtime availability filter for precomputed candidates
 * Selects first available item from candidates list
 * 
 * CORE RULES (3 mandatory checks):
 * 1. active === true (item not disabled)
 * 2. available === true (item not sold out)
 * 3. Category time-slot is valid (item visible at current time)
 * 
 * - Availability always wins over score
 * - If pinned item unavailable, skip to next candidate
 * - If all candidates unavailable, return undefined (block will be hidden)
 */
function selectAvailableCandidate(
    candidates: DecisionBlockEntry[],
    items: ExtractedDataItem[],
    categoryMap: Map<string, ExtractedDataCategory>,
    usedItemIds: Set<string>,
    pinnedId?: string
): { item: ExtractedDataItem; reason: string; reasonParams?: Record<string, any> } | undefined {
    // Build lookup map for O(1) access
    const itemMap = new Map(items.map(item => [item.id, item]));

    // Check if item is available at runtime (3 mandatory checks)
    const isAvailable = (itemId: string): boolean => {
        const item = itemMap.get(itemId);
        if (!item) return false;

        // Check 1: Item not disabled
        if (item.active === false) return false;

        // Check 2: Item not sold out
        if (item.available === false) return false;

        // Check 3: Category time-slot validation
        const category = categoryMap.get(item.category);
        if (!isCategoryWithinTimeSlot(category)) return false;

        // Check 4: Not already used in another block
        if (usedItemIds.has(itemId)) return false;

        return true;
    };

    // If owner pinned an item, try it first (but only if available)
    if (pinnedId && isAvailable(pinnedId)) {
        const item = itemMap.get(pinnedId)!;
        usedItemIds.add(pinnedId);
        return { item, reason: DECISION_REASON_KEYS.pinned.ownerPick };
    }

    // Find first available candidate from precomputed list
    for (const candidate of candidates) {
        if (isAvailable(candidate.itemId)) {
            const item = itemMap.get(candidate.itemId)!;
            usedItemIds.add(candidate.itemId);
            return {
                item,
                reason: candidate.reason,
                reasonParams: candidate.reasonParams
            };
        }
    }

    // No available candidates - block will be hidden
    return undefined;
}

/**
 * Compute blocks from precomputed candidates with runtime filtering
 * 
 * HARDENING LAYERS (applied in order):
 * 1. Global activation gate (minimum data thresholds)
 * 2. Lifecycle state (COLD/LEARNING/STABLE)
 * 3. Block-level eligibility (data coverage per block)
 * 4. Runtime availability filter (active, available, time-slot)
 * 5. Minimum viability rule (≥2 blocks or nothing)
 */
function computeFromPrecomputed(
    precomputed: PrecomputedDecisionBlocks,
    items: ExtractedDataItem[],
    categories: ExtractedDataCategory[],
    businessType?: string,
    ownerControls?: OwnerControls,
    showItemPrices = true
): ComputedBlock[] {
    const stats = precomputed.statsUsed;
    const lifecycle = getLifecycleState(stats);
    const enabledBlocks = getEnabledBlocks(businessType);
    const blocks: ComputedBlock[] = [];
    const usedItemIds = new Set<string>();

    // Build category lookup map for time-slot validation
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // ── Block-level eligibility (data coverage gates) ──

    // ⭐ Popular: needs sufficient clicks + unique items with clicks
    const isPopularEligible =
        (stats.totalClicks ?? 0) >= LIFECYCLE_THRESHOLDS.POPULAR_MIN_CLICKS &&
        (stats.itemsWithClicks ?? 0) >= LIFECYCLE_THRESHOLDS.POPULAR_MIN_ITEMS;

    // ⚡ Quick Pick: needs STABLE lifecycle + duration data coverage
    const isQuickPickEligible =
        lifecycle === 'STABLE' &&
        (stats.durationCoverage ?? 0) >= LIFECYCLE_THRESHOLDS.QUICK_PICK_DURATION_COV;

    // 💰 Best Value: needs price data coverage
    const isBestValueEligible =
        showItemPrices &&
        (stats.priceCoverage ?? 0) >= LIFECYCLE_THRESHOLDS.BEST_VALUE_PRICE_COV &&
        (stats.itemsWithPrice ?? 0) >= LIFECYCLE_THRESHOLDS.BEST_VALUE_MIN_ITEMS;

    // ⭐ Popular Right Now
    const isPopularEnabled = ownerControls?.enablePopular !== false && enabledBlocks.includes('popular');
    if (isPopularEnabled && (ownerControls?.pinnedPopular || (isPopularEligible && precomputed.popular?.length > 0))) {
        const result = selectAvailableCandidate(
            isPopularEligible ? (precomputed.popular || []) : [],
            items,
            categoryMap,
            usedItemIds,
            ownerControls?.pinnedPopular
        );
        if (result) {
            blocks.push({
                blockType: 'popular',
                item: result.item,
                reason: result.reason,
                reasonParams: result.reasonParams,
            });
        }
    }

    // ⚡ Quick Pick (automatic picks require STABLE lifecycle with duration coverage)
    const isQuickPickEnabled = ownerControls?.enableQuickPick !== false && enabledBlocks.includes('quickPick');
    if (isQuickPickEnabled && (ownerControls?.pinnedQuickPick || (isQuickPickEligible && precomputed.quickPick?.length > 0))) {
        const result = selectAvailableCandidate(
            isQuickPickEligible ? (precomputed.quickPick || []) : [],
            items,
            categoryMap,
            usedItemIds,
            ownerControls?.pinnedQuickPick
        );
        if (result) {
            blocks.push({
                blockType: 'quickPick',
                item: result.item,
                reason: result.reason,
                reasonParams: result.reasonParams,
            });
        }
    }

    // 💰 Best Value (automatic picks require price coverage)
    const isBestValueEnabled = showItemPrices && ownerControls?.enableBestValue !== false && enabledBlocks.includes('bestValue');
    if (isBestValueEnabled && (ownerControls?.pinnedBestValue || (isBestValueEligible && precomputed.bestValue?.length > 0))) {
        const result = selectAvailableCandidate(
            isBestValueEligible ? (precomputed.bestValue || []) : [],
            items,
            categoryMap,
            usedItemIds,
            ownerControls?.pinnedBestValue
        );
        if (result) {
            blocks.push({
                blockType: 'bestValue',
                item: result.item,
                reason: result.reason,
                reasonParams: result.reasonParams,
            });
        }
    }

    // ── Minimum viability: require ≥2 automatic blocks or show nothing ──
    // Owner pins are explicit featured choices, so one pinned block may render.
    const hasOwnerPinnedBlock = blocks.some((block) => block.reason === DECISION_REASON_KEYS.pinned.ownerPick);
    if (!hasOwnerPinnedBlock && blocks.length < LIFECYCLE_THRESHOLDS.MIN_BLOCKS_TO_RENDER) {
        return [];
    }

    return blocks;
}

/**
 * Fallback when precomputed data is stale/unavailable
 * 
 * CRITICAL: Client should NEVER rank items - only the scheduler has analytics data.
 * Fallback behavior:
 * - If TTL expired: Show ONLY owner-pinned items (no intelligence, just owner picks)
 * - If no pinned items: Hide all blocks (better than wrong intelligence)
 * 
 * This avoids "dual authority" where client and scheduler produce different rankings.
 */
function computeBlocksFallback(
    items: ExtractedDataItem[],
    categories: ExtractedDataCategory[],
    businessType?: string,
    ownerControls?: OwnerControls,
    showItemPrices = true
): ComputedBlock[] {
    const enabledBlocks = getEnabledBlocks(businessType);
    const blocks: ComputedBlock[] = [];
    const usedItemIds = new Set<string>();

    // Build category lookup map for time-slot validation
    const categoryMap = new Map(categories.map(cat => [cat.id, cat]));

    // Build item lookup map
    const itemMap = new Map(items.map(item => [item.id, item]));

    // Check if item is available (same 3 checks as runtime gate)
    const isAvailable = (itemId: string): boolean => {
        const item = itemMap.get(itemId);
        if (!item) return false;
        if (item.active === false) return false;
        if (item.available === false) return false;
        const category = categoryMap.get(item.category);
        if (!isCategoryWithinTimeSlot(category)) return false;
        if (usedItemIds.has(itemId)) return false;
        return true;
    };

    // ONLY show owner-pinned items in fallback mode (no client-side ranking)
    // This ensures single source of truth: scheduler ranks, client only filters

    // ⭐ Popular - only if owner pinned
    const isPopularEnabled = ownerControls?.enablePopular !== false && enabledBlocks.includes('popular');
    if (isPopularEnabled && ownerControls?.pinnedPopular && isAvailable(ownerControls.pinnedPopular)) {
        const item = itemMap.get(ownerControls.pinnedPopular)!;
        usedItemIds.add(item.id);
        blocks.push({
            blockType: 'popular',
            item,
            reason: DECISION_REASON_KEYS.pinned.ownerPick,
        });
    }

    // ⚡ Quick Pick - only if owner pinned
    const isQuickPickEnabled = ownerControls?.enableQuickPick !== false && enabledBlocks.includes('quickPick');
    if (isQuickPickEnabled && ownerControls?.pinnedQuickPick && isAvailable(ownerControls.pinnedQuickPick)) {
        const item = itemMap.get(ownerControls.pinnedQuickPick)!;
        usedItemIds.add(item.id);
        blocks.push({
            blockType: 'quickPick',
            item,
            reason: DECISION_REASON_KEYS.pinned.ownerPick,
        });
    }

    // 💰 Best Value - only if owner pinned
    const isBestValueEnabled = showItemPrices && ownerControls?.enableBestValue !== false && enabledBlocks.includes('bestValue');
    if (isBestValueEnabled && ownerControls?.pinnedBestValue && isAvailable(ownerControls.pinnedBestValue)) {
        const item = itemMap.get(ownerControls.pinnedBestValue)!;
        usedItemIds.add(item.id);
        blocks.push({
            blockType: 'bestValue',
            item,
            reason: DECISION_REASON_KEYS.pinned.ownerPick,
        });
    }

    // If no pinned items available, return empty (hide all blocks)
    // This is correct behavior: better to show nothing than show wrong intelligence
    return blocks;
}

export default function DecisionBlocks({
    items,
    categories = [],
    activeLanguage,
    primaryLanguage = activeLanguage,
    businessType,
    moodConfig,
    onItemClick,
    currency = '',
    menuSettings,
    precomputedBlocks,
    showItemPrices = true,
    showCategoryIcons = true,
    analyticsIds,
    trackingEnabled = true,
    menuLayout = MenuLayout.LIST,
}: DecisionBlocksProps) {
    const { deviceType } = useDeviceType();
    const isDesktopLayout = deviceType === 'desktop';
    const containerRef = useRef<HTMLDivElement>(null);
    const [failedFeaturedImageKeys, setFailedFeaturedImageKeys] = useState<Set<string>>(() => new Set());
    const categoryMetaById = useMemo(() => {
        return new Map(categories.map((category) => [
            category.id,
            {
                icon: category.icon,
                label: getLocalizedMenuText(category.name, activeLanguage),
            },
        ]));
    }, [activeLanguage, categories]);
    const categoryAnalyticsLabelById = useMemo(() => {
        return new Map(categories.map((category) => [
            category.id,
            getLocalizedMenuText(category.name, primaryLanguage),
        ]));
    }, [categories, primaryLanguage]);

    /**
     * Translate reason key to localized text
     * 
     * NOTE: Customer-facing menu doesn't use next-intl
     * We use a simple static translation lookup instead
     * This keeps the menu lightweight and doesn't require i18n provider
     */
    const translateReason = useCallback((reason: string, params?: Record<string, any>): string => {
        // If reason doesn't look like an i18n key, return as-is (backward compat)
        if (!reason.startsWith('decision.')) {
            return reason;
        }

        // Get translation from static map
        const translation = getDecisionBlockTranslation(reason, activeLanguage);

        // Interpolate params (e.g., {minutes} -> 5)
        if (params && translation) {
            return Object.entries(params).reduce(
                (text, [key, value]) => text.replace(`{${key}}`, String(value)),
                translation
            );
        }

        return translation;
    }, [activeLanguage]);

    // Extract owner controls from menuSettings
    const ownerControls: OwnerControls | undefined = useMemo(() => {
        if (!menuSettings?.decisionBlocks) return undefined;
        return {
            enablePopular: menuSettings.decisionBlocks.enablePopular,
            enableQuickPick: menuSettings.decisionBlocks.enableQuickPick,
            enableBestValue: menuSettings.decisionBlocks.enableBestValue,
            pinnedPopular: menuSettings.decisionBlocks.pinnedPopular,
            pinnedQuickPick: menuSettings.decisionBlocks.pinnedQuickPick,
            pinnedBestValue: menuSettings.decisionBlocks.pinnedBestValue,
        };
    }, [menuSettings?.decisionBlocks]);

    // Compute blocks using hardened 2-layer system:
    // LAYER 0: Global activation gate (minimum data thresholds)
    // LAYER 1: If precomputed valid → lifecycle-aware block computation + runtime availability filter
    // LAYER 2: If precomputed stale → owner-pinned only (no client-side ranking)
    // LAYER 3: If hard stale (>72h) → owner-pinned only; automatic scoring hidden
    const blocks = useMemo(() => {
        // Hard stale guard: if scheduler hasn't run in >72h, keep owner pins only.
        // Owner pins are explicit menu truth; stale analytics should not suppress them.
        if (isHardStale(precomputedBlocks)) {
            return computeBlocksFallback(items, categories, businessType, ownerControls, showItemPrices);
        }

        const usePrecomputed = isPrecomputedValid(precomputedBlocks);

        if (usePrecomputed && precomputedBlocks) {
            // Global activation gate: minimum data thresholds must pass
            if (!passesGlobalGate(precomputedBlocks)) {
                // Automatic recommendations need enough behavior data. Owner pins
                // are owner-authored menu truth, so they can still render as
                // pinned-only blocks while the automatic system is learning.
                return computeBlocksFallback(items, categories, businessType, ownerControls, showItemPrices);
            }

            // Layer 1 + 2: Precomputed candidates with lifecycle-aware gating + runtime filter
            return computeFromPrecomputed(
                precomputedBlocks,
                items,
                categories,
                businessType,
                ownerControls,
                showItemPrices
            );
        }

        // Fallback: Only show owner-pinned items (client never ranks)
        // This ensures single source of truth - scheduler ranks, client filters
        return computeBlocksFallback(items, categories, businessType, ownerControls, showItemPrices);
    }, [items, categories, businessType, ownerControls, precomputedBlocks, showItemPrices]);

    // Handle block click
    const handleClick = useCallback((rec: ComputedBlock) => {
        const itemName = getLocalizedMenuText(rec.item.name, primaryLanguage, 'Unknown');
        const price = parseFloat(rec.item.price || '0');
        const analyticsCategoryName = categoryAnalyticsLabelById.get(rec.item.category) || rec.item.category;

        const revealInlineItem = () => {
            const itemElement = document.getElementById(`item-${rec.item.id}`);
            if (itemElement) {
                itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                itemElement.classList.add('ring-2', 'ring-offset-2');
                setTimeout(() => {
                    itemElement.classList.remove('ring-2', 'ring-offset-2');
                }, 2000);
            }
        };

        if (trackingEnabled) {
            trackDecisionBlockClick(
                rec.blockType,
                rec.item.id,
                itemName,
                analyticsCategoryName,
                price,
                {
                    ...analyticsIds,
                    categoryId: rec.item.category,
                    categoryName: analyticsCategoryName,
                }
            );
        }

        if (onItemClick) {
            onItemClick(rec.item);
            return;
        }

        // Fallback for non-modal renders: featured choice can still jump to the inline item.
        revealInlineItem();
    }, [analyticsIds, categoryAnalyticsLabelById, onItemClick, primaryLanguage, trackingEnabled]);

    // Track when blocks are rendered (once per session)
    // Why not use menu_view? It fires even when blocks DON'T render (feature off, no items, TTL expired)
    // Accurate CTR = clicks / renders (not clicks / menu_views)
    const hasTrackedRender = useRef(false);
    useEffect(() => {
        if (trackingEnabled && blocks.length > 0 && !hasTrackedRender.current) {
            hasTrackedRender.current = true;
            const blockTypes = blocks.map(b => b.blockType);
            trackDecisionBlocksRendered(
                blockTypes,
                { ...analyticsIds }
            );
        }
    }, [blocks, analyticsIds, trackingEnabled]);

    // Don't render if no blocks to show
    if (blocks.length === 0) {
        return null;
    }

    const featuredBlockEntries = blocks.map((rec) => {
        const imageUrl = getPrimaryPublicMenuImage(rec.item)?.trim();
        const imageKey = `${rec.blockType}:${rec.item.id}`;
        return {
            rec,
            imageKey,
            imageUrl: imageUrl && !failedFeaturedImageKeys.has(imageKey) ? imageUrl : undefined,
        };
    });
    const allBlocksHaveFeaturedImages = featuredBlockEntries.every(({ imageUrl }) => Boolean(imageUrl));
    const canUseFeaturedVisualLayout = allBlocksHaveFeaturedImages
        && (menuLayout === MenuLayout.CARD || menuLayout === MenuLayout.GRID);
    const allBlocksOwnerPinned = blocks.every((block) => block.reason === DECISION_REASON_KEYS.pinned.ownerPick);
    const isSingleBlock = blocks.length === 1;
    const useHorizontalScroller = !isDesktopLayout && !isSingleBlock;
    const featuredItemGap = canUseFeaturedVisualLayout ? 10 : 8;
    const featuredListMode = !canUseFeaturedVisualLayout;
    const useDesktopFeaturedRow = isDesktopLayout && !isSingleBlock;

    return (
        <section
            aria-label="Featured choices"
            style={{
                boxSizing: 'border-box',
                marginBottom: 14,
                maxWidth: '100%',
                minWidth: 0,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <div
                style={{
                    alignItems: 'center',
                    display: 'flex',
                    gap: 10,
                    justifyContent: 'space-between',
                    marginBottom: 8,
                }}
            >
                <h2
                    style={{
                        color: moodConfig.headingColor,
                        fontFamily: moodConfig.bodyFont,
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: 0,
                        lineHeight: '18px',
                        margin: 0,
                    }}
                >
                    Featured
                </h2>
                {allBlocksOwnerPinned && (
                    <span
                        style={{
                            color: moodConfig.descriptionColor || moodConfig.bodyColor,
                            fontFamily: moodConfig.bodyFont,
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: '16px',
                            opacity: 0.78,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        Business picks
                    </span>
                )}
            </div>

            <div
                ref={containerRef}
                className="w-full overflow-x-auto scrollbar-hide"
                style={{
                    boxSizing: 'border-box',
                    contain: 'layout paint',
                    maxWidth: '100%',
                    minWidth: 0,
                    overflowX: useHorizontalScroller ? 'auto' : 'hidden',
                    paddingBottom: useHorizontalScroller ? 8 : 0,
                    overscrollBehaviorX: 'contain',
                    scrollPaddingInline: 0,
                    scrollSnapType: useHorizontalScroller ? 'x proximity' : 'none',
                    WebkitOverflowScrolling: 'touch',
                    width: '100%',
                }}
            >
                <div
                    className="flex"
                    style={{
                        display: canUseFeaturedVisualLayout
                            ? isDesktopLayout
                                ? 'grid'
                                : 'flex'
                            : useDesktopFeaturedRow
                                ? 'grid'
                                : 'flex',
                        flexDirection: undefined,
                        gap: featuredItemGap,
                        gridTemplateColumns: (canUseFeaturedVisualLayout || featuredListMode) && useDesktopFeaturedRow
                            ? `repeat(${featuredBlockEntries.length}, minmax(0, 1fr))`
                            : undefined,
                        maxWidth: 'none',
                        minWidth: 0,
                        paddingRight: useHorizontalScroller ? 14 : 0,
                        width: (canUseFeaturedVisualLayout || useDesktopFeaturedRow) && (isDesktopLayout || isSingleBlock)
                            ? '100%'
                            : useHorizontalScroller
                                ? 'fit-content'
                                : '100%',
                    }}
                >
                    {featuredBlockEntries.map(({ rec, imageKey, imageUrl: itemImage }) => {
                        const labels = getBlockLabels(rec.blockType, businessType);
                        // Guard: labels should never be null here since blocks are pre-filtered by enabledBlocks
                        // But we check for type safety
                        if (!labels) return null;

                        const itemName = getLocalizedMenuText(rec.item.name, activeLanguage, 'Menu item');
                        const itemPrice = formatMenuPrice(rec.item.price, currency, { fractionDigits: 2 });
                        const isOwnerPinned = rec.reason === DECISION_REASON_KEYS.pinned.ownerPick;
                        const categoryMeta = categoryMetaById.get(rec.item.category);
                        const categoryLabel = categoryMeta?.label;
                        const categoryIcon = categoryMeta?.icon;
                        const showFeaturedCategoryIcon = Boolean(
                            FEATURE_FLAGS.ENABLE_CATEGORY_ICONS
                            && showCategoryIcons
                            && categoryIcon
                            && categoryLabel
                        );
                        const displayTitle = isOwnerPinned ? OWNER_PINNED_TITLES[rec.blockType] : labels.title;
                        const displayMeta = isOwnerPinned
                            ? categoryLabel
                            : translateReason(rec.reason, rec.reasonParams);

                        const visualImageHeight = isDesktopLayout ? 96 : 92;
                        const featuredImageSize = featuredListMode ? 56 : visualImageHeight;
                        const featuredRowMinHeight = featuredListMode
                            ? itemImage
                                ? 78
                                : 72
                            : isDesktopLayout
                                ? 176
                                : 168;

                        return (
                            <button
                                type="button"
                                key={rec.blockType}
                                onClick={() => handleClick(rec)}
                                aria-label={[
                                    displayTitle,
                                    itemName,
                                    displayMeta,
                                    showItemPrices && itemPrice ? itemPrice : null,
                                ].filter(Boolean).join('. ')}
                                className="flex-shrink-0 transition-all duration-150 active:scale-[0.98] hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                                style={{
                                    '--tw-ring-color': `${moodConfig.accentColor}AA`,
                                    alignItems: featuredListMode ? 'center' : 'stretch',
                                    appearance: 'none',
                                    background: moodConfig.itemStyle.background,
                                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                                    borderRadius: Math.min(10, moodConfig.itemStyle.borderRadius || 10),
                                    boxShadow: '0 1px 0 rgba(0, 0, 0, 0.03)',
                                    color: moodConfig.bodyColor,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: featuredListMode ? 'row' : 'column',
                                    flexShrink: useHorizontalScroller ? 0 : 1,
                                    gap: itemImage ? (featuredListMode ? 10 : 8) : 0,
                                    minHeight: featuredRowMinHeight,
                                    outline: 'none',
                                    overflow: 'hidden',
                                    padding: itemImage ? 10 : 12,
                                    position: 'relative',
                                    scrollSnapAlign: useHorizontalScroller ? 'start' : 'none',
                                    textAlign: 'left',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
                                    width: featuredListMode
                                        ? isSingleBlock
                                            ? '100%'
                                            : isDesktopLayout
                                                ? '100%'
                                                : 'min(calc(100vw - 48px), 292px)'
                                        : isSingleBlock
                                            ? '100%'
                                            : isDesktopLayout
                                                ? '100%'
                                                : 'min(calc(100vw - 48px), 316px)',
                                    WebkitTapHighlightColor: 'transparent',
                                } as CSSProperties}
                            >
                                {itemImage && (
                                    <div
                                        className="relative flex-shrink-0 overflow-hidden"
                                        style={{
                                            background: `${moodConfig.accentColor}12`,
                                            borderRadius: Math.min(8, moodConfig.itemStyle.imageRadius || 8),
                                            height: featuredImageSize,
                                            minHeight: featuredImageSize,
                                            minWidth: featuredListMode ? featuredImageSize : '100%',
                                            width: featuredListMode ? featuredImageSize : '100%',
                                        }}
                                    >
                                        <Image
                                            src={itemImage}
                                            alt={getMenuItemImageAltText(itemName)}
                                            fill
                                            className="object-cover"
                                            sizes={`${featuredImageSize}px`}
                                            onError={() => {
                                                setFailedFeaturedImageKeys((current) => {
                                                    if (current.has(imageKey)) return current;
                                                    const next = new Set(current);
                                                    next.add(imageKey);
                                                    return next;
                                                });
                                            }}
                                        />
                                    </div>
                                )}

                                <div
                                    className="min-w-0"
                                    style={{
                                        display: 'flex',
                                        flex: '1 1 auto',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        maxWidth: '100%',
                                        minWidth: 0,
                                        paddingLeft: 0,
                                    }}
                                >
                                    <div style={{ minWidth: 0 }}>
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                color: moodConfig.accentColor,
                                                display: 'flex',
                                                fontFamily: moodConfig.bodyFont,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                gap: 6,
                                                lineHeight: '16px',
                                                marginBottom: 4,
                                                minWidth: 0,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'block',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {displayTitle}
                                            </span>
                                        </div>

                                        <div
                                            style={{
                                                color: moodConfig.headingColor,
                                                display: '-webkit-box',
                                                fontFamily: moodConfig.headingFont,
                                                fontSize: 14,
                                                fontWeight: 700,
                                                lineHeight: '19px',
                                                overflow: 'hidden',
                                                WebkitBoxOrient: 'vertical',
                                                WebkitLineClamp: 2,
                                            }}
                                        >
                                            {itemName}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            alignItems: 'center',
                                            display: 'flex',
                                            gap: 10,
                                            justifyContent: 'space-between',
                                            marginTop: 10,
                                            minWidth: 0,
                                        }}
                                    >
                                        {displayMeta ? (
                                            <span
                                                style={{
                                                    alignItems: 'center',
                                                    color: moodConfig.descriptionColor || moodConfig.bodyColor,
                                                    display: 'inline-flex',
                                                    fontFamily: moodConfig.bodyFont,
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    gap: 5,
                                                    lineHeight: '16px',
                                                    minWidth: 0,
                                                    opacity: 0.82,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {showFeaturedCategoryIcon ? (
                                                    <span
                                                        aria-hidden="true"
                                                        style={{
                                                            alignItems: 'center',
                                                            display: 'inline-flex',
                                                            flexShrink: 0,
                                                            height: 14,
                                                            justifyContent: 'center',
                                                            width: 14,
                                                        }}
                                                    >
                                                        <CategoryIcon
                                                            color={moodConfig.descriptionColor || moodConfig.bodyColor}
                                                            defaultIcon="LuTag"
                                                            icon={categoryIcon}
                                                            size={13}
                                                        />
                                                    </span>
                                                ) : null}
                                                <span
                                                    style={{
                                                        display: 'block',
                                                        minWidth: 0,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {displayMeta}
                                                </span>
                                            </span>
                                        ) : (
                                            <span />
                                        )}
                                        {showItemPrices && itemPrice ? (
                                            <span
                                                style={{
                                                    color: moodConfig.priceColor,
                                                    flexShrink: 0,
                                                    fontFamily: moodConfig.bodyFont,
                                                    fontSize: 13,
                                                    fontWeight: 700,
                                                    lineHeight: '18px',
                                                }}
                                            >
                                                {itemPrice}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
