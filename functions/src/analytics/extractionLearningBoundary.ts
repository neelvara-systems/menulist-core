const EXTRACTION_FIELDS = ['name', 'price', 'description', 'categoryId', 'tags'] as const;
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
const MAX_CORRECTIONS_PER_EVENT = 10_000;

type ExtractionField = typeof EXTRACTION_FIELDS[number];
type ConfidenceLevel = typeof CONFIDENCE_LEVELS[number];

export interface ExtractionCorrectionContribution {
    total: number;
    byField: Record<ExtractionField, number>;
    byConfidence: Record<ConfidenceLevel, number>;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === 'object' && !Array.isArray(value)
);

const getCorrectionCount = (value: unknown): number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= MAX_CORRECTIONS_PER_EVENT
        ? value
        : 0
);

const emptyContribution = (): ExtractionCorrectionContribution => ({
    total: 0,
    byField: {
        name: 0,
        price: 0,
        description: 0,
        categoryId: 0,
        tags: 0,
    },
    byConfidence: {
        high: 0,
        medium: 0,
        low: 0,
    },
});

const isExtractionField = (value: unknown): value is ExtractionField => (
    EXTRACTION_FIELDS.some(candidate => candidate === value)
);

const isConfidenceLevel = (value: unknown): value is ConfidenceLevel => (
    CONFIDENCE_LEVELS.some(candidate => candidate === value)
);

export const readExtractionCorrectionContribution = (
    value: unknown,
): ExtractionCorrectionContribution => {
    const contribution = emptyContribution();
    if (!isRecord(value)) return contribution;

    if (value.changeType === 'EXTRACTION_CORRECTION') {
        const oldValue = isRecord(value.oldValue) ? value.oldValue : {};
        const newValue = isRecord(value.newValue) ? value.newValue : {};
        const field = oldValue.field ?? newValue.field;
        if (!isExtractionField(field)) return contribution;

        contribution.total = 1;
        contribution.byField[field] = 1;
        const confidence = oldValue.confidence;
        if (isConfidenceLevel(confidence)) {
            contribution.byConfidence[confidence] = 1;
        }
        return contribution;
    }

    if (value.changeType !== 'MENU_REVISION_SUMMARY' || !isRecord(value.newValue)) {
        return contribution;
    }

    const fieldCounts = isRecord(value.newValue.extractionCorrectionsByField)
        ? value.newValue.extractionCorrectionsByField
        : {};
    let attributedTotal = 0;
    for (const field of EXTRACTION_FIELDS) {
        const count = getCorrectionCount(fieldCounts[field]);
        contribution.byField[field] = count;
        attributedTotal += count;
    }
    if (attributedTotal > MAX_CORRECTIONS_PER_EVENT) return emptyContribution();

    const declaredTotal = getCorrectionCount(value.newValue.extractionCorrections);
    contribution.total = attributedTotal > 0 ? attributedTotal : declaredTotal;

    const confidenceCounts = isRecord(value.newValue.extractionCorrectionsByConfidence)
        ? value.newValue.extractionCorrectionsByConfidence
        : {};
    let confidenceTotal = 0;
    for (const confidence of CONFIDENCE_LEVELS) {
        const count = Math.min(
            getCorrectionCount(confidenceCounts[confidence]),
            contribution.total,
        );
        contribution.byConfidence[confidence] = count;
        confidenceTotal += count;
    }
    if (confidenceTotal > contribution.total) {
        for (const confidence of CONFIDENCE_LEVELS) {
            contribution.byConfidence[confidence] = 0;
        }
    }
    return contribution;
};
