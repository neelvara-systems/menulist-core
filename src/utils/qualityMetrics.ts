type SimilarityReference = { similarityScore?: number };

/**
 * Quality flag thresholds for similarity scores
 */
export const QUALITY_THRESHOLDS = {
    GOOD: 0.6,        // 60% - Minimum for acceptable quality
    VERY_LOW: 0.4     // 40% - Critical quality threshold
} as const;

/**
 * Quality flags interface for chat messages
 */
export interface QualityFlags {
    lowConfidence: boolean;      // All references < 60% similarity
    veryLowConfidence: boolean;  // All references < 40% similarity
    averageSimilarity: number;   // Average score of all references
}

/**
 * Calculate quality metrics from references in real-time
 * Used in admin view to identify low-quality AI responses
 * 
 * @param references - Array of KB articles with similarity scores
 * @returns Quality flags or null if no references
 * 
 * @example
 * const flags = calculateQualityFlags(message.references);
 * if (flags?.veryLowConfidence) {
 *   // Show critical alert
 * }
 */
export function calculateQualityFlags(
    references?: ReadonlyArray<SimilarityReference>
): QualityFlags | null {
    if (!references || references.length === 0) {
        return null;
    }

    // Extract similarity scores, defaulting to 0 for missing scores
    const scores = references.map((reference) => (
        typeof reference.similarityScore === 'number'
        && Number.isFinite(reference.similarityScore)
        && reference.similarityScore >= 0
        && reference.similarityScore <= 1
            ? reference.similarityScore
            : 0
    ));

    // Calculate average similarity
    const averageSimilarity = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Check if ALL references are below thresholds
    const lowConfidence = scores.every(score => score < QUALITY_THRESHOLDS.GOOD);
    const veryLowConfidence = scores.every(score => score < QUALITY_THRESHOLDS.VERY_LOW);

    return {
        lowConfidence,
        veryLowConfidence,
        averageSimilarity
    };
}

/**
 * Get confidence level label based on similarity score
 * Used for displaying color-coded badges
 * 
 * @param score - Similarity score (0-1)
 * @returns Confidence level and color
 */
export function getConfidenceLevel(score: number): {
    label: string;
    color: 'success' | 'processing' | 'warning' | 'error';
} {
    if (score >= 0.8) {
        return { label: 'Excellent', color: 'success' };
    } else if (score >= 0.6) {
        return { label: 'Good', color: 'processing' };
    } else if (score >= 0.4) {
        return { label: 'Fair', color: 'warning' };
    } else {
        return { label: 'Low', color: 'error' };
    }
}
