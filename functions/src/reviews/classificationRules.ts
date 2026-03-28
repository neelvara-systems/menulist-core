/**
 * Review Classification Rules — Rule-Based (Not ML)
 *
 * Priority order: volatile > negative_high_risk > negative_low_risk > informational > benign
 * Owner NEVER sees internal classification — only block/escalation state.
 *
 * @see __docs__/reviews-reputation/reviews-reputation_impl.md §3.3
 */

export type ReviewClassification =
    | "benign"
    | "informational"
    | "negative_low_risk"
    | "negative_high_risk"
    | "volatile";

export interface ClassificationRule {
    id: string;
    name: string;
    keywords: string[];
    patterns: RegExp[];
    resultState: ReviewClassification;
    priority: number;
}

export const CLASSIFICATION_RULES: ClassificationRule[] = [
    // VOLATILE (Escalation) — Check first
    {
        id: "volatile_legal",
        name: "Legal threat detection",
        keywords: ["lawyer", "sue", "legal action", "court", "attorney"],
        patterns: [/\b(i will|going to)\s+(sue|report|contact|lawyer)/i],
        resultState: "volatile",
        priority: 100,
    },
    {
        id: "volatile_viral",
        name: "Viral threat detection",
        keywords: ["viral", "news", "reporter", "journalist", "expose"],
        patterns: [/\b(go|going)\s+viral/i, /\bcontact(ing)?\s+(news|media)/i],
        resultState: "volatile",
        priority: 99,
    },
    {
        id: "volatile_health",
        name: "Health department threat",
        keywords: ["health department", "health inspector", "fda", "food safety"],
        patterns: [/\breport(ing)?\s+(to\s+)?(health|food\s+safety)/i],
        resultState: "volatile",
        priority: 98,
    },

    // NEGATIVE_HIGH_RISK (Block) — Check second
    {
        id: "high_risk_hygiene",
        name: "Hygiene complaints",
        keywords: ["dirty", "filthy", "cockroach", "roach", "rat", "mouse", "bug", "hair in food", "unsanitary"],
        patterns: [/\b(found|saw)\s+(a\s+)?(bug|hair|insect|roach)/i],
        resultState: "negative_high_risk",
        priority: 80,
    },
    {
        id: "high_risk_safety",
        name: "Safety concerns",
        keywords: ["food poisoning", "sick", "hospital", "vomit", "diarrhea", "allergic reaction"],
        patterns: [/\b(got|made\s+me)\s+sick/i, /\bfood\s+poisoning/i],
        resultState: "negative_high_risk",
        priority: 79,
    },
    {
        id: "high_risk_price",
        name: "Price dispute (verifiable)",
        keywords: ["overcharged", "wrong price", "price mismatch", "charged more"],
        patterns: [/\b(charged|cost)\s+(more|extra|wrong)/i, /\bprice\s+(was|is)\s+(wrong|different)/i],
        resultState: "negative_high_risk",
        priority: 78,
    },
    {
        id: "high_risk_staff",
        name: "Staff misconduct",
        keywords: ["rude staff", "manager yelled", "staff cursed", "discriminat"],
        patterns: [/\b(staff|manager|waiter|server)\s+(was\s+)?(rude|yelled|cursed)/i],
        resultState: "negative_high_risk",
        priority: 77,
    },

    // NEGATIVE_LOW_RISK — Recoverable negatives
    {
        id: "low_risk_service",
        name: "Service complaints (recoverable)",
        keywords: ["slow service", "long wait", "forgot order", "cold food"],
        patterns: [/\b(waited|wait)\s+(too\s+)?long/i, /\bfood\s+(was\s+)?cold/i],
        resultState: "negative_low_risk",
        priority: 50,
    },

    // INFORMATIONAL — Neutral
    {
        id: "info_question",
        name: "Questions/requests",
        keywords: ["?", "do you", "can you", "please add", "would be nice"],
        patterns: [/\?$/],
        resultState: "informational",
        priority: 20,
    },

    // BENIGN — Default (safe)
    {
        id: "benign_positive",
        name: "Positive review",
        keywords: [],
        patterns: [],
        resultState: "benign",
        priority: 0,
    },
];

/**
 * Classify a review based on rules.
 */
export function classifyReview(
    rating: number,
    comment: string | undefined,
): { classification: ReviewClassification; triggerKeywords: string[] } {
    // Positive reviews (4-5 stars) without concerning content = benign
    if (rating >= 4 && !comment) {
        return { classification: "benign", triggerKeywords: [] };
    }

    // Check rules in priority order
    const sortedRules = [...CLASSIFICATION_RULES].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
        if (!comment) continue;

        const lowerComment = comment.toLowerCase();
        const matchedKeywords: string[] = [];

        for (const keyword of rule.keywords) {
            if (lowerComment.includes(keyword.toLowerCase())) {
                matchedKeywords.push(keyword);
            }
        }

        for (const pattern of rule.patterns) {
            if (pattern.test(comment)) {
                matchedKeywords.push(`pattern:${pattern.source}`);
            }
        }

        if (matchedKeywords.length > 0) {
            return { classification: rule.resultState, triggerKeywords: matchedKeywords };
        }
    }

    // Default based on rating
    if (rating === 1) return { classification: "negative_high_risk", triggerKeywords: ["1_star_rating"] };
    if (rating === 2) return { classification: "negative_low_risk", triggerKeywords: ["2_star_rating"] };
    if (rating === 3) return { classification: "informational", triggerKeywords: ["neutral_rating"] };

    return { classification: "benign", triggerKeywords: [] };
}
