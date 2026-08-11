import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    ANSWERLATTICE_RETENTION_DAY_MS,
    ANSWERLATTICE_RETENTION_DAYS,
} from '@data/shared/answerlatticeRetention';
import { z } from 'zod';

export const ANSWERLATTICE_POST_CHANGE_WINDOW_DAYS = 14;
export const ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS = 5;
export const ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT = 200;
export const ANSWERLATTICE_POST_CHANGE_RELEASE_CANDIDATE_LIMIT = 8;
export const ANSWERLATTICE_POST_CHANGE_CORRECTION_CANDIDATE_LIMIT = 8;
export const ANSWERLATTICE_POST_CHANGE_CANDIDATE_LIMIT = 12;
export const ANSWERLATTICE_POST_CHANGE_RESPONSE_MAX_BYTES = 64 * 1024;
export const ANSWERLATTICE_POST_CHANGE_REQUEST_TIMEOUT_MS = 15_000;

export const ANSWERLATTICE_POST_CHANGE_TYPES = [
    'release',
    'knowledge_correction',
] as const;

export const ANSWERLATTICE_POST_CHANGE_REVIEW_STATUSES = [
    'waiting_for_post_window',
    'ready',
    'insufficient_evidence',
    'source_window_saturated',
    'outside_retention',
] as const;

export const ANSWERLATTICE_POST_CHANGE_DIRECTIONS = [
    'lower_observed',
    'same_observed',
    'higher_observed',
] as const;

export const ANSWERLATTICE_POST_CHANGE_LIMITATIONS = [
    'Counts are support-evidence events, not unique customers or questions.',
    'Only directly linked product topics and retained ticket, negative-feedback, and escalation signals are included.',
    'The comparison shows observed association and does not prove that the selected change caused the result.',
] as const;

const StrictDocumentIdSchema = z.string()
    .trim()
    .min(1)
    .max(180)
    .refine(isValidFirestoreDocumentId, 'Invalid change ID');
const IsoDateTimeSchema = z.string().datetime({ offset: true });
const UtcDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const AnswerlatticePostChangeTypeSchema = z.enum(ANSWERLATTICE_POST_CHANGE_TYPES);

export const AnswerlatticePostChangeCandidateSchema = z.object({
    changeId: StrictDocumentIdSchema,
    changeType: AnswerlatticePostChangeTypeSchema,
    label: z.string().trim().min(1).max(140),
    changedAt: IsoDateTimeSchema,
    entityCount: z.number().int().min(1).max(25),
}).strict();

export const AnswerlatticePostChangeCandidateListResponseSchema = z.object({
    schemaVersion: z.literal(1),
    mode: z.literal('list'),
    generatedAt: IsoDateTimeSchema,
    candidates: z.array(AnswerlatticePostChangeCandidateSchema)
        .max(ANSWERLATTICE_POST_CHANGE_CANDIDATE_LIMIT),
}).strict().superRefine((response, context) => {
    const identities = response.candidates.map(candidate => `${candidate.changeType}:${candidate.changeId}`);
    if (new Set(identities).size !== identities.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change candidates must be unique.',
            path: ['candidates'],
        });
    }
    for (let index = 1; index < response.candidates.length; index += 1) {
        const previous = Date.parse(response.candidates[index - 1]!.changedAt);
        const current = Date.parse(response.candidates[index]!.changedAt);
        if (current > previous) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Post-change candidates must be newest first.',
                path: ['candidates', index, 'changedAt'],
            });
            break;
        }
    }
});

export const AnswerlatticePostChangeWindowSchema = z.object({
    startAt: IsoDateTimeSchema,
    endAt: IsoDateTimeSchema,
    startDate: UtcDateSchema,
    endDate: UtcDateSchema,
}).strict().superRefine((window, context) => {
    const start = Date.parse(window.startAt);
    const end = Date.parse(window.endAt);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change evidence window is invalid.',
        });
    }
});

export const AnswerlatticePostChangeBreakdownSchema = z.object({
    total: z.number().int().nonnegative().max(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
    ticketCount: z.number().int().nonnegative().max(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
    chatNegativeCount: z.number().int().nonnegative().max(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
    escalationCount: z.number().int().nonnegative().max(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
}).strict().superRefine((breakdown, context) => {
    if (breakdown.total !== (
        breakdown.ticketCount
        + breakdown.chatNegativeCount
        + breakdown.escalationCount
    )) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change evidence total must match its components.',
            path: ['total'],
        });
    }
});

export const AnswerlatticePostChangeComparisonSchema = z.object({
    before: AnswerlatticePostChangeBreakdownSchema,
    after: AnswerlatticePostChangeBreakdownSchema,
    eventDelta: z.number().int().min(-ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT).max(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
    relativeChangePercent: z.number().int().min(-100).max(10_000).nullable(),
    direction: z.enum(ANSWERLATTICE_POST_CHANGE_DIRECTIONS).nullable(),
}).strict().superRefine((comparison, context) => {
    const expectedDelta = comparison.after.total - comparison.before.total;
    if (comparison.eventDelta !== expectedDelta) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change event delta is inconsistent.',
            path: ['eventDelta'],
        });
    }
    const hasSufficientBaseline = comparison.before.total >= ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS;
    if (!hasSufficientBaseline) {
        if (comparison.direction !== null || comparison.relativeChangePercent !== null) {
            context.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Insufficient baseline evidence cannot have a direction.',
            });
        }
        return;
    }
    const expectedDirection = expectedDelta < 0
        ? 'lower_observed'
        : expectedDelta > 0 ? 'higher_observed' : 'same_observed';
    const expectedPercentage = Math.round((expectedDelta / comparison.before.total) * 100);
    if (comparison.direction !== expectedDirection) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change direction is inconsistent.',
            path: ['direction'],
        });
    }
    if (comparison.relativeChangePercent !== expectedPercentage) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change relative difference is inconsistent.',
            path: ['relativeChangePercent'],
        });
    }
});

export const AnswerlatticePostChangeReviewResponseSchema = z.object({
    schemaVersion: z.literal(1),
    mode: z.literal('review'),
    generatedAt: IsoDateTimeSchema,
    change: AnswerlatticePostChangeCandidateSchema,
    status: z.enum(ANSWERLATTICE_POST_CHANGE_REVIEW_STATUSES),
    mappingScope: z.literal('direct_entity_links_only'),
    excludedUtcDate: UtcDateSchema,
    eligibleAt: IsoDateTimeSchema,
    beforeWindow: AnswerlatticePostChangeWindowSchema,
    afterWindow: AnswerlatticePostChangeWindowSchema,
    sourceCapPerWindow: z.literal(ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT),
    comparison: AnswerlatticePostChangeComparisonSchema.nullable(),
    limitations: z.tuple([
        z.literal(ANSWERLATTICE_POST_CHANGE_LIMITATIONS[0]),
        z.literal(ANSWERLATTICE_POST_CHANGE_LIMITATIONS[1]),
        z.literal(ANSWERLATTICE_POST_CHANGE_LIMITATIONS[2]),
    ]),
}).strict().superRefine((response, context) => {
    if (response.eligibleAt !== response.afterWindow.endAt) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change eligibility must match the after-window end.',
            path: ['eligibleAt'],
        });
    }
    const comparisonRequired = response.status === 'ready' || response.status === 'insufficient_evidence';
    if (comparisonRequired !== Boolean(response.comparison)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Post-change comparison availability is inconsistent.',
            path: ['comparison'],
        });
        return;
    }
    if (response.status === 'ready'
        && response.comparison
        && response.comparison.before.total < ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Ready comparison requires sufficient baseline evidence.',
            path: ['status'],
        });
    }
    if (response.status === 'insufficient_evidence'
        && response.comparison
        && response.comparison.before.total >= ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Insufficient comparison cannot have a sufficient baseline.',
            path: ['status'],
        });
    }
});

export type AnswerlatticePostChangeType = z.infer<typeof AnswerlatticePostChangeTypeSchema>;
export type AnswerlatticePostChangeDirection = typeof ANSWERLATTICE_POST_CHANGE_DIRECTIONS[number];
export type AnswerlatticePostChangeCandidate = z.infer<typeof AnswerlatticePostChangeCandidateSchema>;
export type AnswerlatticePostChangeCandidateListResponse = z.infer<typeof AnswerlatticePostChangeCandidateListResponseSchema>;
export type AnswerlatticePostChangeWindow = z.infer<typeof AnswerlatticePostChangeWindowSchema>;
export type AnswerlatticePostChangeBreakdown = z.infer<typeof AnswerlatticePostChangeBreakdownSchema>;
export type AnswerlatticePostChangeComparison = z.infer<typeof AnswerlatticePostChangeComparisonSchema>;
export type AnswerlatticePostChangeReviewResponse = z.infer<typeof AnswerlatticePostChangeReviewResponseSchema>;

export type AnswerlatticePostChangeWindowPlan = {
    status: 'query_ready' | 'waiting_for_post_window' | 'outside_retention';
    excludedUtcDate: string;
    eligibleAt: string;
    beforeWindow: AnswerlatticePostChangeWindow;
    afterWindow: AnswerlatticePostChangeWindow;
};

const toUtcDate = (millis: number): string => new Date(millis).toISOString().slice(0, 10);

const startOfUtcDay = (millis: number): number => {
    const date = new Date(millis);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const buildWindow = (startMillis: number, endMillis: number): AnswerlatticePostChangeWindow => (
    AnswerlatticePostChangeWindowSchema.parse({
        startAt: new Date(startMillis).toISOString(),
        endAt: new Date(endMillis).toISOString(),
        startDate: toUtcDate(startMillis),
        endDate: toUtcDate(endMillis - ANSWERLATTICE_RETENTION_DAY_MS),
    })
);

export function buildAnswerlatticePostChangeWindowPlan(
    changedAtMillis: number,
    nowMillis = Date.now(),
): AnswerlatticePostChangeWindowPlan | null {
    if (!Number.isFinite(changedAtMillis)
        || !Number.isFinite(nowMillis)
        || changedAtMillis < 0
        || nowMillis < 0
        || changedAtMillis > nowMillis + 5 * 60 * 1000) {
        return null;
    }

    const changeDayStart = startOfUtcDay(changedAtMillis);
    const windowMillis = ANSWERLATTICE_POST_CHANGE_WINDOW_DAYS * ANSWERLATTICE_RETENTION_DAY_MS;
    const beforeStart = changeDayStart - windowMillis;
    const beforeEnd = changeDayStart;
    const afterStart = changeDayStart + ANSWERLATTICE_RETENTION_DAY_MS;
    const afterEnd = afterStart + windowMillis;
    const retentionStart = nowMillis
        - ANSWERLATTICE_RETENTION_DAYS.signalEvents * ANSWERLATTICE_RETENTION_DAY_MS;
    const status = beforeStart < retentionStart
        ? 'outside_retention'
        : nowMillis < afterEnd ? 'waiting_for_post_window' : 'query_ready';

    return {
        status,
        excludedUtcDate: toUtcDate(changeDayStart),
        eligibleAt: new Date(afterEnd).toISOString(),
        beforeWindow: buildWindow(beforeStart, beforeEnd),
        afterWindow: buildWindow(afterStart, afterEnd),
    };
}

export function buildAnswerlatticePostChangeBreakdown(
    signalTypes: readonly unknown[],
): AnswerlatticePostChangeBreakdown {
    let ticketCount = 0;
    let chatNegativeCount = 0;
    let escalationCount = 0;
    for (const signalType of signalTypes) {
        if (signalType === 'ticket') ticketCount += 1;
        if (signalType === 'chat_negative') chatNegativeCount += 1;
        if (signalType === 'escalation') escalationCount += 1;
    }
    return AnswerlatticePostChangeBreakdownSchema.parse({
        total: ticketCount + chatNegativeCount + escalationCount,
        ticketCount,
        chatNegativeCount,
        escalationCount,
    });
}

export function buildAnswerlatticePostChangeComparison(
    before: AnswerlatticePostChangeBreakdown,
    after: AnswerlatticePostChangeBreakdown,
): {
    status: 'ready' | 'insufficient_evidence';
    comparison: AnswerlatticePostChangeComparison;
} {
    const validBefore = AnswerlatticePostChangeBreakdownSchema.parse(before);
    const validAfter = AnswerlatticePostChangeBreakdownSchema.parse(after);
    const eventDelta = validAfter.total - validBefore.total;
    const hasSufficientBaseline = validBefore.total >= ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS;
    const comparison = AnswerlatticePostChangeComparisonSchema.parse({
        before: validBefore,
        after: validAfter,
        eventDelta,
        relativeChangePercent: hasSufficientBaseline
            ? Math.round((eventDelta / validBefore.total) * 100)
            : null,
        direction: !hasSufficientBaseline
            ? null
            : eventDelta < 0 ? 'lower_observed' : eventDelta > 0 ? 'higher_observed' : 'same_observed',
    });
    return {
        status: hasSufficientBaseline ? 'ready' : 'insufficient_evidence',
        comparison,
    };
}
