import {
    ActiveCampaignType,
    CampaignConfidence,
    CampaignKind,
    CampaignType,
    CONFIDENCE_THRESHOLDS,
    ExecutionSurface,
    OutputIntent,
    PassiveCampaignType,
    TodayCampaignSummary
} from "@type/campaigns";

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN ENGINE
// 
// Per Strategy Doc:
// - Heuristic-based distribution (no ML at launch)
// - Confidence gate with formalized thresholds
// - One PRIMARY campaign per day (active OR passive)
// - Passive campaigns CAN coexist as OPERATIONAL below the fold
// - Menu Highlight is evergreen fallback (confidence = 0)
// ═══════════════════════════════════════════════════════════════

/**
 * Menu item data needed for campaign generation
 */
export interface MenuItemForCampaign {
    id: string;
    name: string;
    categoryId?: string;
    categoryName?: string;
    available: boolean;
    isBestSeller?: boolean;
    price?: number;
    imageUrl?: string;
    createdAt?: Date;
    // Analytics signals (from owner dashboard)
    viewCount?: number;
    tapCount?: number;
}

/**
 * Project context for campaign generation
 */
export interface ProjectContext {
    projectId: string;
    tId: string;
    sId: string;
    items: MenuItemForCampaign[];
    // Business context
    businessType?: string;
    isOpenToday?: boolean;
    isWeekend?: boolean;
    // Suppression state
    suppressedTypes: CampaignType[];
    // Silence governor: activity count from last 7 days
    // If >= 4 actions in 7 days, allow intentional silence days
    last7DaysActionCount?: number;
    // Multi-project fairness (ChatGPT Review Fix #3)
    // Days since this project was last featured
    daysSinceLastFeatured?: number;
}

/**
 * Calculate project recency decay factor (ChatGPT Review Fix #3)
 * Prevents one project from dominating forever in multi-outlet scenarios.
 * 
 * High confidence still wins, but dominance decays over days.
 * No UI change. No explanation. Just fairness.
 */
export function getProjectRecencyDecay(daysSinceLastFeatured?: number): number {
    if (!daysSinceLastFeatured || daysSinceLastFeatured >= 7) {
        return 1.0; // No penalty after 7 days
    }
    if (daysSinceLastFeatured === 0) {
        return 0.7; // 30% penalty if featured today
    }
    if (daysSinceLastFeatured === 1) {
        return 0.85; // 15% penalty if featured yesterday
    }
    if (daysSinceLastFeatured <= 3) {
        return 0.95; // 5% penalty for 2-3 days ago
    }
    return 1.0; // No penalty after 3 days
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate confidence score for an item
 * Per Strategy Doc: availabilityScore * behaviorScore * timingScore
 */
export function calculateConfidence(
    item: MenuItemForCampaign,
    campaignType: CampaignType,
    context: ProjectContext
): CampaignConfidence {
    // Availability: Is item available?
    const availabilityScore = item.available ? 1.0 : 0.0;

    // Behavior: Customer interaction signals (normalized 0-1)
    let behaviorScore = 0.5; // Default baseline

    if (item.isBestSeller) {
        behaviorScore = 0.9;
    } else if (item.viewCount && item.viewCount > 50) {
        behaviorScore = 0.7;
    } else if (item.viewCount && item.viewCount > 10) {
        behaviorScore = 0.6;
    }

    // For slow_item_rescue, invert behavior (target low-engagement items)
    if (campaignType === 'slow_item_rescue') {
        behaviorScore = 1 - behaviorScore;
    }

    // Timing: Right time of day/week?
    let timingScore = 0.5; // Default

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    switch (campaignType) {
        case 'meal_push':
            // Higher score during meal times
            if ((hour >= 11 && hour <= 14) || (hour >= 18 && hour <= 21)) {
                timingScore = 0.9;
            }
            break;

        case 'weekend_pick':
            // Friday = 5
            if (dayOfWeek === 5) {
                timingScore = 1.0;
            } else if (dayOfWeek === 4 || dayOfWeek === 6) {
                timingScore = 0.5;
            } else {
                timingScore = 0.1;
            }
            break;

        case 'todays_special':
            // Higher in morning (prep time)
            if (hour >= 8 && hour <= 12) {
                timingScore = 0.8;
            }
            break;

        case 'now_available':
            // Always relevant
            timingScore = 0.8;
            break;

        case 'menu_highlight':
            // Evergreen fallback - always qualifies
            timingScore = 1.0;
            break;

        default:
            timingScore = 0.6;
    }

    // Suppress if type is suppressed
    if (context.suppressedTypes.includes(campaignType)) {
        timingScore = 0.0;
    }

    const total = availabilityScore * behaviorScore * timingScore;

    return {
        availabilityScore,
        behaviorScore,
        timingScore,
        total
    };
}

/**
 * Get kind (active/passive) for a campaign type
 */
export function getCampaignKind(type: CampaignType): CampaignKind {
    const passiveTypes: PassiveCampaignType[] = [
        'todays_special',
        'weekend_pick',
        'now_available',
        'menu_highlight'
    ];

    return passiveTypes.includes(type as PassiveCampaignType) ? 'passive' : 'active';
}

/**
 * Get threshold for campaign kind
 */
export function getThreshold(type: CampaignType): number {
    if (type === 'menu_highlight') {
        return CONFIDENCE_THRESHOLDS.menu_highlight;
    }
    const kind = getCampaignKind(type);
    return CONFIDENCE_THRESHOLDS[kind];
}

// ═══════════════════════════════════════════════════════════════
// SURFACE SELECTION (HEURISTIC)
// ═══════════════════════════════════════════════════════════════

/**
 * Surface selection per Strategy Doc heuristic table
 */
const SURFACE_HEURISTICS: Record<CampaignType, { primary: ExecutionSurface; secondary?: ExecutionSurface }> = {
    // Passive
    todays_special: { primary: 'whatsapp_status', secondary: 'print_poster' },
    weekend_pick: { primary: 'print_poster', secondary: 'whatsapp_status' },
    now_available: { primary: 'whatsapp_message', secondary: 'whatsapp_status' },
    menu_highlight: { primary: 'whatsapp_status' },
    // Active
    meal_push: { primary: 'whatsapp_status', secondary: 'whatsapp_message' },
    bestseller_boost: { primary: 'qr_tent', secondary: 'whatsapp_status' },
    slow_item_rescue: { primary: 'qr_tent', secondary: 'print_poster' },
    festival: { primary: 'whatsapp_status', secondary: 'print_poster' },
    new_item: { primary: 'whatsapp_status', secondary: 'print_poster' }
};

/**
 * Get output intent for campaign type
 */
export function getOutputIntent(type: CampaignType): OutputIntent {
    switch (type) {
        case 'now_available':
            return 'direct_customer_notify';

        case 'bestseller_boost':
        case 'slow_item_rescue':
            return 'in_store_reinforcement';

        default:
            return 'broadcast_attention';
    }
}

/**
 * Get primary surface for campaign type (heuristic)
 */
export function getPrimarySurface(type: CampaignType): ExecutionSurface {
    return SURFACE_HEURISTICS[type]?.primary || 'whatsapp_status';
}

/**
 * Get secondary surfaces for campaign type
 */
export function getSecondarySurfaces(type: CampaignType): ExecutionSurface[] {
    const secondary = SURFACE_HEURISTICS[type]?.secondary;
    return secondary ? [secondary] : [];
}

// ═══════════════════════════════════════════════════════════════
// CAMPAIGN GENERATION
// ═══════════════════════════════════════════════════════════════

interface CampaignCandidate {
    type: CampaignType;
    item: MenuItemForCampaign;
    confidence: CampaignConfidence;
    kind: CampaignKind;
}

/**
 * Generate campaign candidates from menu items
 * Returns all candidates that pass their respective thresholds
 */
export function generateCampaignCandidates(context: ProjectContext): CampaignCandidate[] {
    const candidates: CampaignCandidate[] = [];
    const { items, isWeekend, suppressedTypes } = context;

    // Get available items
    const availableItems = items.filter(item => item.available);

    if (availableItems.length === 0) {
        return candidates;
    }

    // Campaign types to evaluate
    const passiveTypes: PassiveCampaignType[] = [
        'todays_special',
        'weekend_pick',
        'now_available',
        'menu_highlight'
    ];

    const activeTypes: ActiveCampaignType[] = [
        'meal_push',
        'bestseller_boost',
        'slow_item_rescue'
        // 'festival', 'new_item' require special triggers
    ];

    // Evaluate passive campaigns
    for (const type of passiveTypes) {
        // Skip weekend_pick if not Friday
        if (type === 'weekend_pick') {
            const dayOfWeek = new Date().getDay();
            if (dayOfWeek !== 5) continue; // Only on Friday
        }

        // Find best item for this campaign type
        let bestItem: MenuItemForCampaign | null = null;
        let bestConfidence: CampaignConfidence | null = null;

        for (const item of availableItems) {
            const confidence = calculateConfidence(item, type, context);
            const threshold = getThreshold(type);

            if (confidence.total >= threshold) {
                if (!bestConfidence || confidence.total > bestConfidence.total) {
                    bestItem = item;
                    bestConfidence = confidence;
                }
            }
        }

        if (bestItem && bestConfidence) {
            candidates.push({
                type,
                item: bestItem,
                confidence: bestConfidence,
                kind: 'passive'
            });
        }
    }

    // Evaluate active campaigns
    for (const type of activeTypes) {
        let bestItem: MenuItemForCampaign | null = null;
        let bestConfidence: CampaignConfidence | null = null;

        // Filter items based on campaign type
        let eligibleItems = availableItems;

        if (type === 'bestseller_boost') {
            eligibleItems = availableItems.filter(item => item.isBestSeller);
        }

        for (const item of eligibleItems) {
            const confidence = calculateConfidence(item, type, context);
            const threshold = getThreshold(type);

            if (confidence.total >= threshold) {
                if (!bestConfidence || confidence.total > bestConfidence.total) {
                    bestItem = item;
                    bestConfidence = confidence;
                }
            }
        }

        if (bestItem && bestConfidence) {
            candidates.push({
                type,
                item: bestItem,
                confidence: bestConfidence,
                kind: 'active'
            });
        }
    }

    // Sort by confidence (highest first)
    candidates.sort((a, b) => b.confidence.total - a.confidence.total);

    return candidates;
}

/**
 * Select today's campaigns from candidates
 * Per Strategy Doc:
 * - One PRIMARY campaign per day (highest confidence active OR passive)
 * - Passive campaigns CAN coexist as OPERATIONAL (max 2)
 */
export function selectTodayCampaigns(candidates: CampaignCandidate[]): {
    primary?: CampaignCandidate;
    operational: CampaignCandidate[];
} {
    if (candidates.length === 0) {
        return { primary: undefined, operational: [] };
    }

    // Primary = highest confidence candidate
    const primary = candidates[0];

    // Operational = other passive candidates (max 2)
    const operational = candidates
        .slice(1)
        .filter(c => c.kind === 'passive')
        .slice(0, 2);

    return { primary, operational };
}

/**
 * Convert candidate to TodayCampaignSummary (for UI)
 */
export function candidateToSummary(
    candidate: CampaignCandidate,
    context: ProjectContext
): TodayCampaignSummary {
    return {
        campaignId: '', // Will be assigned when persisted
        projectId: context.projectId,
        type: candidate.type,
        kind: candidate.kind,
        subject: {
            itemId: candidate.item.id,
            itemName: candidate.item.name
        },
        intent: getOutputIntent(candidate.type),
        primarySurface: getPrimarySurface(candidate.type),
        status: 'suggested',
        confidence: candidate.confidence.total
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════

/**
 * Generate today's campaigns for a project
 * Main entry point for campaign engine
 * 
 * SILENCE GOVERNOR (ChatGPT Review Fix #1):
 * If owner has completed/skipped >= 4 actions in last 7 days,
 * we may intentionally return empty to preserve authority.
 * "Silence must feel earned, not accidental."
 */
export function generateTodayCampaigns(context: ProjectContext): {
    primary?: TodayCampaignSummary;
    operational: TodayCampaignSummary[];
    isEmpty: boolean;
    isSilenceDay?: boolean;
} {
    // SILENCE GOVERNOR: Prevent "always something" trap
    // If active owner (>=4 actions in 7 days), allow intentional silence
    if (context.last7DaysActionCount && context.last7DaysActionCount >= 4) {
        const dayOfWeek = new Date().getDay();
        // Silence on specific days to feel intentional (Tuesday, Thursday)
        if (dayOfWeek === 2 || dayOfWeek === 4) {
            return {
                primary: undefined,
                operational: [],
                isEmpty: true,
                isSilenceDay: true
            };
        }
    }

    const candidates = generateCampaignCandidates(context);
    const { primary, operational } = selectTodayCampaigns(candidates);

    return {
        primary: primary ? candidateToSummary(primary, context) : undefined,
        operational: operational.map(c => candidateToSummary(c, context)),
        isEmpty: !primary && operational.length === 0,
        isSilenceDay: false
    };
}
