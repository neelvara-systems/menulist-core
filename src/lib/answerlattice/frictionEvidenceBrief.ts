import type {
    AnswerlatticeFrictionEntitySummary,
    AnswerlatticeSupportMetricWindow,
} from '@type/answerlattice';
import { isAnswerlatticeDateKey } from '@data/shared/answerlatticeSupportMetrics';

export const ANSWERLATTICE_FRICTION_EVIDENCE_BRIEF_MAX_BYTES = 8 * 1024;

export const ANSWERLATTICE_FRICTION_REVIEW_PATHS = {
    investigate_further: {
        label: 'Investigate further',
        nextStep: 'Gather the missing product-side evidence before deciding what should change.',
    },
    review_support_knowledge: {
        label: 'Review support knowledge',
        nextStep: 'Review the approved answer, supporting documentation, and contextual guidance for this product area.',
    },
    review_product_behavior: {
        label: 'Review product behavior',
        nextStep: 'Take this evidence into the product or engineering investigation without treating it as defect proof.',
    },
    review_known_limitation: {
        label: 'Review known limitation',
        nextStep: 'Verify whether this is an intentional approved constraint, then review how that limitation is explained before treating it as a defect.',
    },
    review_access_explanation: {
        label: 'Review plan or permission explanation',
        nextStep: 'Verify the applicable plan, role, and permission rules, then check how those limits are explained.',
    },
    watch_next_window: {
        label: 'Watch the next completed window',
        nextStep: 'Compare this area again after the next completed seven-day evidence window.',
    },
    no_action_now: {
        label: 'No action now',
        nextStep: 'Keep the evidence packet for reference and make no product or knowledge change from this review.',
    },
} as const;

export type AnswerlatticeFrictionReviewPath =
    keyof typeof ANSWERLATTICE_FRICTION_REVIEW_PATHS;

export type AnswerlatticeFrictionEvidenceBrief = {
    fileName: string;
    markdown: string;
    title: string;
};

type BuildAnswerlatticeFrictionEvidenceBriefInput = {
    entity: AnswerlatticeFrictionEntitySummary;
    reviewPath: AnswerlatticeFrictionReviewPath;
    sourceLastUpdated?: string;
    window: AnswerlatticeSupportMetricWindow;
};

const normalizeSingleLine = (value: string, maxLength: number): string => (
    value
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
);

const requireDateKey = (value: string | undefined, fieldName: string): string => {
    if (!isAnswerlatticeDateKey(value)) {
        throw new Error(`answerlattice_friction_evidence_brief_${fieldName}_invalid`);
    }
    return value;
};

const requireNonNegativeInteger = (value: number, fieldName: string): number => {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`answerlattice_friction_evidence_brief_${fieldName}_invalid`);
    }
    return value;
};

const requireNonNegativeMetric = (value: number, fieldName: string): number => {
    if (!Number.isFinite(value) || value < 0) {
        throw new Error(`answerlattice_friction_evidence_brief_${fieldName}_invalid`);
    }
    return value;
};

const formatMetric = (value: number): string => (
    Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
);

const formatTrend = (
    entity: AnswerlatticeFrictionEntitySummary,
    currentCount: number,
    previousCount: number,
): string => {
    switch (entity.trendDirection) {
        case 'new':
            return 'New evidence in the current completed window.';
        case 'rising':
            return previousCount > 0
                ? `Rising: ${Math.round(((currentCount - previousCount) / previousCount) * 100)}% more evidence events than the previous completed window.`
                : 'Rising from no evidence in the previous completed window.';
        case 'improving':
            return previousCount > 0
                ? `Improving: ${Math.round(((previousCount - currentCount) / previousCount) * 100)}% fewer evidence events than the previous completed window.`
                : 'Improving relative to the previous completed window.';
        case 'stable':
        default:
            return 'Stable relative to the previous completed window.';
    }
};

const buildEvidenceBreakdown = (
    entity: AnswerlatticeFrictionEntitySummary,
    totalCount: number,
): string[] => {
    const evidence = entity.last7d;
    const values = [
        evidence.ticketCount,
        evidence.chatNegativeCount,
        evidence.escalationCount,
        evidence.canonicalMissCount,
    ];
    const hasBreakdown = values.every(value => Number.isSafeInteger(value) && Number(value) >= 0);

    if (!hasBreakdown) {
        return ['- Evidence component breakdown: Available after the next nightly refresh.'];
    }

    const ticketCount = Number(evidence.ticketCount);
    const negativeFeedbackCount = Number(evidence.chatNegativeCount);
    const escalationCount = Number(evidence.escalationCount);
    const canonicalMissCount = Number(evidence.canonicalMissCount);
    const explainedCount = ticketCount + negativeFeedbackCount + escalationCount + canonicalMissCount;
    if (explainedCount > totalCount) {
        throw new Error('answerlattice_friction_evidence_brief_component_total_invalid');
    }

    const lines = [
        `- Ticket evidence: ${ticketCount}`,
        `- Negative-feedback evidence: ${negativeFeedbackCount}`,
        `- Escalation evidence: ${escalationCount}`,
        `- Canonical-miss evidence: ${canonicalMissCount}`,
    ];
    const otherCount = totalCount - explainedCount;
    if (otherCount > 0) lines.push(`- Other admitted support evidence: ${otherCount}`);
    return lines;
};

const buildSafeFileName = (entityName: string, currentEndDate: string): string => {
    const slug = entityName
        .normalize('NFKD')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 56) || 'product-area';
    return `answerlattice-friction-evidence-${slug}-${currentEndDate}.md`;
};

export const isAnswerlatticeFrictionReviewPath = (
    value: unknown,
): value is AnswerlatticeFrictionReviewPath => (
    typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(ANSWERLATTICE_FRICTION_REVIEW_PATHS, value)
);

export const buildAnswerlatticeFrictionEvidenceBrief = ({
    entity,
    reviewPath,
    sourceLastUpdated,
    window,
}: BuildAnswerlatticeFrictionEvidenceBriefInput): AnswerlatticeFrictionEvidenceBrief => {
    if (!isAnswerlatticeFrictionReviewPath(reviewPath)) {
        throw new Error('answerlattice_friction_evidence_brief_review_path_invalid');
    }
    if (window.kind !== 'utc_calendar_7_days' || window.complete !== true) {
        throw new Error('answerlattice_friction_evidence_brief_window_invalid');
    }

    const entityId = normalizeSingleLine(entity.entityId, 200);
    const entityName = normalizeSingleLine(entity.entityName, 200);
    const entityType = normalizeSingleLine(entity.entityType, 80);
    if (!entityId || !entityName || !entityType) {
        throw new Error('answerlattice_friction_evidence_brief_entity_invalid');
    }

    const currentStartDate = requireDateKey(window.currentStartDate, 'current_start_date');
    const currentEndDate = requireDateKey(window.currentEndDate, 'current_end_date');
    const previousStartDate = requireDateKey(window.previousStartDate, 'previous_start_date');
    const previousEndDate = requireDateKey(window.previousEndDate, 'previous_end_date');
    const currentCount = requireNonNegativeInteger(entity.last7d.queryCount, 'current_count');
    const currentEscalations = requireNonNegativeInteger(
        entity.last7d.escalationCount,
        'current_escalation_count',
    );
    const previousCount = requireNonNegativeInteger(entity.previous7d.queryCount, 'previous_count');
    const currentLoad = requireNonNegativeMetric(entity.last7d.frictionScore, 'current_load');
    const previousLoad = requireNonNegativeMetric(entity.previous7d.frictionScore, 'previous_load');
    if (currentEscalations > currentCount) {
        throw new Error('answerlattice_friction_evidence_brief_escalation_count_invalid');
    }

    const review = ANSWERLATTICE_FRICTION_REVIEW_PATHS[reviewPath];
    const safeSourceLastUpdated = sourceLastUpdated
        ? normalizeSingleLine(sourceLastUpdated, 100)
        : '';
    const title = `Friction evidence: ${entityName}`;
    const lines = [
        `# ${title}`,
        '',
        '## Review scope',
        `- Product area: ${entityName}`,
        `- Entity type: ${entityType}`,
        `- Answerlattice entity: ${entityId}`,
        `- Current completed window: ${currentStartDate} to ${currentEndDate}`,
        `- Previous completed window: ${previousStartDate} to ${previousEndDate}`,
        ...(safeSourceLastUpdated ? [`- Source snapshot updated: ${safeSourceLastUpdated}`] : []),
        '',
        '## Observed support evidence',
        `- Support-evidence events: ${currentCount}`,
        `- Previous-window support-evidence events: ${previousCount}`,
        `- Escalations: ${currentEscalations}`,
        `- Escalation rate: ${currentCount > 0 ? Math.round((currentEscalations / currentCount) * 100) : 0}%`,
        `- Support-evidence load: ${formatMetric(currentLoad)}`,
        `- Previous-window support-evidence load: ${formatMetric(previousLoad)}`,
        `- Trend: ${formatTrend(entity, currentCount, previousCount)}`,
        '',
        '### Evidence mix',
        ...buildEvidenceBreakdown(entity, currentCount),
        '',
        '## Owner review',
        `- Selected review path: ${review.label}`,
        `- Next step: ${review.nextStep}`,
        '',
        '## Evidence boundary',
        'This packet is a bounded summary of mapped support evidence. It does not prove unique affected users, a product defect, root cause, resolution, churn, revenue impact, or release causation. Review the linked product and support evidence before changing product behavior or approved knowledge.',
        '',
    ];
    const markdown = lines.join('\n');
    if (new TextEncoder().encode(markdown).byteLength > ANSWERLATTICE_FRICTION_EVIDENCE_BRIEF_MAX_BYTES) {
        throw new Error('answerlattice_friction_evidence_brief_too_large');
    }

    return {
        fileName: buildSafeFileName(entityName, currentEndDate),
        markdown,
        title,
    };
};
