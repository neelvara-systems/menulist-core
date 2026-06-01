import type { GrowthOSReviewGuardResult, GrowthOSReviewRisk, GrowthOSReviewTone } from "@type/growthos";

const FOOD_SAFETY_TERMS = ["sick", "food poisoning", "poison", "unsafe", "vomit", "hospital"];
const LEGAL_TERMS = ["legal", "lawyer", "police", "sue", "court", "fraud"];
const ABUSIVE_TERMS = ["idiot", "stupid", "hate you", "shut"];

function classifyReview(text: string, rating?: number): GrowthOSReviewRisk {
    const normalized = text.toLowerCase();
    if (!text.trim()) return "unclear";
    if (FOOD_SAFETY_TERMS.some((term) => normalized.includes(term))) return "food_safety";
    if (LEGAL_TERMS.some((term) => normalized.includes(term))) return "legal_or_threatening";
    if (ABUSIVE_TERMS.some((term) => normalized.includes(term))) return "abusive";
    if (normalized.includes("refund") || normalized.includes("scam")) return "volatile";
    if (rating && rating >= 4) return "positive";
    if (rating && rating <= 2) return "negative";
    return "neutral";
}

function buildReply(risk: GrowthOSReviewRisk, tone: GrowthOSReviewTone): string | undefined {
    if (risk === "food_safety" || risk === "legal_or_threatening" || risk === "abusive") return undefined;
    if (risk === "positive") {
        return "Thank you for your kind words. We are glad you had a good experience and appreciate your support.";
    }
    if (risk === "negative" || risk === "volatile") {
        return tone === "apology"
            ? "Thank you for sharing this. We are sorry the experience did not meet expectations and will review it carefully with the team."
            : "Thank you for the feedback. We will review this with the team and work on improving the experience.";
    }
    return "Thank you for sharing your feedback. We appreciate you taking the time and will keep improving.";
}

export function guardGrowthOSReviewReply(params: {
    reviewText: string;
    rating?: number;
    tone?: GrowthOSReviewTone;
}): GrowthOSReviewGuardResult {
    const risk = classifyReview(params.reviewText, params.rating);
    const tone = params.tone || "calm";
    const reply = buildReply(risk, tone);

    if (!reply) {
        return {
            risk,
            publicReplyRecommended: false,
            recommendation: "Do not reply publicly from this tool. Review this with the owner or manager first.",
            privateRecoveryMessage: "Please contact us directly so we can review this properly.",
            internalCheckLine: "Check the issue with the team before any public response.",
        };
    }

    return {
        risk,
        publicReplyRecommended: risk !== "volatile",
        recommendation: risk === "volatile"
            ? "Use this only after owner review."
            : "Owner review is still required before posting.",
        reply,
        privateRecoveryMessage: risk === "negative" || risk === "volatile"
            ? "Please contact us directly so we can understand what happened."
            : undefined,
        internalCheckLine: risk === "negative" || risk === "volatile"
            ? "Check this feedback with the team before replying."
            : undefined,
    };
}
