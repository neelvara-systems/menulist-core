import { PRODUCT_IDS } from '@constant/product';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import { normalizeAnswerlatticePublicCitationUrl } from '@lib/answerlattice/publicAnswerContracts';
import { AnswerlatticeProcedureSchema } from '@lib/answerlattice/procedureValidation';
import {
    ANSWERLATTICE_PREDICTIVE_CONSTRAINTS,
    ANSWERLATTICE_TRIGGER_ACTION_TYPES,
    ANSWERLATTICE_TRIGGER_SOURCE,
    ANSWERLATTICE_TRIGGER_STATUS,
    type AnswerlatticeContextPayload,
    type AnswerlatticePredictiveSuggestion,
    type AnswerlatticePredictiveTrigger,
} from '@type/answerlattice';
import { z } from 'zod';

export const ANSWERLATTICE_PREDICTIVE_INTERACTION_CONTRACT_VERSION = 'answerlattice.predictive.v1';
export const ANSWERLATTICE_PREDICTIVE_MAX_BODY_BYTES = 4 * 1024;
export const ANSWERLATTICE_PREDICTIVE_RESPONSE_MAX_BYTES = 32 * 1024;
export const ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN = /^[a-z0-9_-]+$/;

const ACTION_TYPES = new Set<string>(Object.values(ANSWERLATTICE_TRIGGER_ACTION_TYPES));
const TRIGGER_STATUSES = new Set<string>(Object.values(ANSWERLATTICE_TRIGGER_STATUS));
const TRIGGER_SOURCES = new Set<string>(Object.values(ANSWERLATTICE_TRIGGER_SOURCE));
const PREDICTIVE_INTERACTIONS = ['suggestion_shown', 'suggestion_clicked', 'suggestion_dismissed'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean => {
    const allowedKeys = new Set(allowed);
    return Object.keys(value).every((key) => allowedKeys.has(key));
};

const normalizeText = (value: unknown, maxLength: number): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().slice(0, maxLength);
    return normalized || undefined;
};

export const normalizeAnswerlatticePredictiveCondition = (
    value: unknown,
    maxLength = 100,
): string | undefined => {
    const normalized = normalizeText(value, maxLength)?.toLowerCase();
    return normalized && ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN.test(normalized)
        ? normalized
        : undefined;
};

export const getAnswerlatticePredictiveTimestampMillis = (value: unknown): number | null => {
    if (!value) return null;
    try {
        if (value instanceof Date) {
            const millis = value.getTime();
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof (value as { toMillis?: unknown }).toMillis === 'function') {
            const millis = Number((value as { toMillis: () => number }).toMillis());
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof value === 'string' || typeof value === 'number') {
            const millis = new Date(value).getTime();
            return Number.isFinite(millis) ? millis : null;
        }
        const seconds = (value as { seconds?: unknown }).seconds;
        if (typeof seconds === 'number' && Number.isFinite(seconds)) return seconds * 1000;
    } catch {
        return null;
    }
    return null;
};

const normalizeConditions = (value: unknown): AnswerlatticePredictiveTrigger['conditions'] | null => {
    const keys = ['page', 'feature', 'workflow', 'plan', 'userRole'] as const;
    if (!isRecord(value) || !hasOnlyKeys(value, keys)) return null;
    const normalized: AnswerlatticePredictiveTrigger['conditions'] = {};
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
        const condition = normalizeAnswerlatticePredictiveCondition(value[key]);
        if (!condition) return null;
        normalized[key] = condition;
    }
    return normalized;
};

const normalizeAction = (value: unknown): AnswerlatticePredictiveTrigger['action'] | null => {
    const keys = ['type', 'entityId', 'articleId', 'customTitle', 'customSummary'] as const;
    if (
        !isRecord(value)
        || !hasOnlyKeys(value, keys)
        || typeof value.type !== 'string'
        || !ACTION_TYPES.has(value.type)
    ) return null;
    const entityId = normalizeText(value.entityId, 180);
    const articleId = normalizeText(value.articleId, 180);
    const customTitle = normalizeText(value.customTitle, 160);
    const customSummary = normalizeText(
        value.customSummary,
        ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_CUSTOM_SUMMARY_LENGTH,
    );
    if (
        (Object.prototype.hasOwnProperty.call(value, 'entityId') && !entityId)
        || (Object.prototype.hasOwnProperty.call(value, 'articleId') && !articleId)
        || (Object.prototype.hasOwnProperty.call(value, 'customTitle') && !customTitle)
        || (Object.prototype.hasOwnProperty.call(value, 'customSummary') && !customSummary)
    ) return null;
    return {
        type: value.type as AnswerlatticePredictiveTrigger['action']['type'],
        ...(entityId ? { entityId } : {}),
        ...(articleId ? { articleId } : {}),
        ...(customTitle ? { customTitle } : {}),
        ...(customSummary ? { customSummary } : {}),
    };
};

const normalizeResolvedSuggestion = (
    value: unknown,
): AnswerlatticePredictiveTrigger['resolvedSuggestion'] | undefined => {
    if (!isRecord(value)) return undefined;
    const title = normalizeText(value.title, 160);
    if (!title) return undefined;
    const summary = typeof value.summary === 'string' ? value.summary.trim().slice(0, 600) : '';
    const articles = Array.isArray(value.articles)
        ? value.articles.slice(0, 3).flatMap((article) => {
            if (!isRecord(article)) return [];
            const id = normalizeText(article.id, 180);
            const articleTitle = normalizeText(article.title, 160);
            return id && articleTitle ? [{ id, title: articleTitle }] : [];
        })
        : [];
    const procedureResult = AnswerlatticeProcedureSchema.safeParse(value.procedure);
    return {
        title,
        summary,
        ...(normalizeText(value.sourceAnswerId, 180) ? { sourceAnswerId: normalizeText(value.sourceAnswerId, 180) } : {}),
        ...(typeof value.sourceAnswerVersion === 'string' || typeof value.sourceAnswerVersion === 'number'
            ? { sourceAnswerVersion: value.sourceAnswerVersion }
            : {}),
        ...(articles.length > 0 ? { articles } : {}),
        ...(procedureResult.success ? { procedure: procedureResult.data } : {}),
    };
};

const normalizeKnownIssue = (value: unknown): AnswerlatticePredictiveTrigger['knownIssue'] | undefined => {
    if (
        !isRecord(value)
        || !hasOnlyKeys(value, ['severity', 'startsAt', 'endsAt', 'statusPageUrl'])
        || !['info', 'degraded', 'outage'].includes(String(value.severity))
    ) return undefined;
    const hasStartsAt = Object.prototype.hasOwnProperty.call(value, 'startsAt');
    const hasEndsAt = Object.prototype.hasOwnProperty.call(value, 'endsAt');
    const hasStatusPageUrl = Object.prototype.hasOwnProperty.call(value, 'statusPageUrl');
    const startsAt = hasStartsAt && getAnswerlatticePredictiveTimestampMillis(value.startsAt) !== null
        ? value.startsAt
        : undefined;
    const endsAt = value.endsAt === null
        ? null
        : hasEndsAt && getAnswerlatticePredictiveTimestampMillis(value.endsAt) !== null
            ? value.endsAt
            : undefined;
    const publicUrl = hasStatusPageUrl
        ? normalizeAnswerlatticePublicCitationUrl(value.statusPageUrl)
        : undefined;
    const statusPageUrl = publicUrl?.startsWith('https:') ? publicUrl : undefined;
    if (
        (hasStartsAt && startsAt === undefined)
        || (hasEndsAt && endsAt === undefined)
        || (hasStatusPageUrl && !statusPageUrl)
    ) return undefined;
    return {
        severity: value.severity as 'info' | 'degraded' | 'outage',
        ...(startsAt !== undefined ? { startsAt: startsAt as any } : {}),
        ...(endsAt !== undefined ? { endsAt: endsAt as any } : {}),
        ...(statusPageUrl ? { statusPageUrl } : {}),
    };
};

const normalizeEffectiveness = (value: unknown): AnswerlatticePredictiveTrigger['effectiveness'] | undefined => {
    if (!isRecord(value) || !hasOnlyKeys(value, ['impressions', 'clicks', 'dismissals', 'score', 'lastEvaluated'])) return undefined;
    const impressions = value.impressions;
    const clicks = value.clicks;
    const dismissals = value.dismissals;
    const score = value.score;
    if (
        typeof impressions !== 'number' || !Number.isSafeInteger(impressions) || impressions < 0
        || typeof clicks !== 'number' || !Number.isSafeInteger(clicks) || clicks < 0 || clicks > impressions
        || typeof dismissals !== 'number' || !Number.isSafeInteger(dismissals) || dismissals < 0 || dismissals > impressions
        || typeof score !== 'number' || !Number.isFinite(score) || score < -1 || score > 1
        || (Object.prototype.hasOwnProperty.call(value, 'lastEvaluated')
            && getAnswerlatticePredictiveTimestampMillis(value.lastEvaluated) === null)
    ) return undefined;
    return {
        impressions,
        clicks,
        dismissals,
        score,
        ...(getAnswerlatticePredictiveTimestampMillis(value.lastEvaluated) !== null
            ? { lastEvaluated: value.lastEvaluated as any }
            : {}),
    };
};

const normalizeFrictionSource = (value: unknown): AnswerlatticePredictiveTrigger['frictionSource'] | undefined => {
    if (!isRecord(value) || !hasOnlyKeys(value, ['entityId', 'entityName', 'frictionScore', 'signalCount'])) return undefined;
    const entityId = normalizeText(value.entityId, 180);
    const entityName = normalizeText(value.entityName, 160);
    const frictionScore = value.frictionScore;
    const signalCount = value.signalCount;
    if (
        !entityId || !entityName
        || typeof frictionScore !== 'number' || !Number.isFinite(frictionScore) || frictionScore < 0
        || typeof signalCount !== 'number' || !Number.isSafeInteger(signalCount) || signalCount < 0
    ) {
        return undefined;
    }
    return { entityId, entityName, frictionScore, signalCount };
};

export const normalizeAnswerlatticePredictiveTrigger = (params: {
    id: unknown;
    value: unknown;
    scope?: { tId: number; sId: number };
}): AnswerlatticePredictiveTrigger | null => {
    const id = normalizeAnswerlatticePredictiveTriggerId(params.id);
    if (!id || !isRecord(params.value)) return null;
    const value = params.value;
    const tId = value.tId;
    const sId = value.sId;
    if (
        value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || typeof tId !== 'number' || !Number.isSafeInteger(tId) || tId <= 0
        || typeof sId !== 'number' || !Number.isSafeInteger(sId) || sId <= 0
        || (params.scope && (tId !== params.scope.tId || sId !== params.scope.sId))
    ) return null;

    const name = normalizeText(value.name, ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_NAME_LENGTH);
    const conditions = normalizeConditions(value.conditions);
    const action = normalizeAction(value.action);
    const priority = value.priority;
    const cooldownHours = value.cooldownHours;
    if (
        !name || !conditions || !action
        || (value.kind !== undefined && value.kind !== 'predictive_help' && value.kind !== 'known_issue')
        || typeof value.status !== 'string' || !TRIGGER_STATUSES.has(value.status)
        || typeof value.source !== 'string' || !TRIGGER_SOURCES.has(value.source)
        || typeof priority !== 'number' || !Number.isSafeInteger(priority)
        || priority < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY
        || priority > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY
        || typeof cooldownHours !== 'number' || !Number.isSafeInteger(cooldownHours)
        || cooldownHours < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS
        || cooldownHours > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS
        || (value.status === ANSWERLATTICE_TRIGGER_STATUS.ACTIVE && !conditions.page)
    ) return null;

    const kind = value.kind === 'known_issue'
        || (value.kind === undefined && action.type === ANSWERLATTICE_TRIGGER_ACTION_TYPES.KNOWN_ISSUE)
        ? 'known_issue'
        : 'predictive_help';
    if ((kind === 'known_issue') !== (action.type === ANSWERLATTICE_TRIGGER_ACTION_TYPES.KNOWN_ISSUE)) return null;
    const knownIssue = kind === 'known_issue' ? normalizeKnownIssue(value.knownIssue) : undefined;
    if (
        (kind === 'known_issue' && !knownIssue)
        || (kind === 'predictive_help' && Object.prototype.hasOwnProperty.call(value, 'knownIssue'))
    ) return null;

    const description = normalizeText(value.description, ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_DESCRIPTION_LENGTH);
    const resolvedSuggestion = normalizeResolvedSuggestion(value.resolvedSuggestion);
    const effectiveness = normalizeEffectiveness(value.effectiveness);
    const frictionSource = normalizeFrictionSource(value.frictionSource);
    const maxImpressionsPerUser = typeof value.maxImpressionsPerUser === 'number'
        && Number.isSafeInteger(value.maxImpressionsPerUser)
        && value.maxImpressionsPerUser > 0
        && value.maxImpressionsPerUser <= 1_000
        ? value.maxImpressionsPerUser
        : undefined;

    return {
        id,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        name,
        ...(description ? { description } : {}),
        kind,
        conditions,
        action,
        ...(resolvedSuggestion ? { resolvedSuggestion } : {}),
        priority,
        cooldownHours,
        ...(maxImpressionsPerUser ? { maxImpressionsPerUser } : {}),
        status: value.status as AnswerlatticePredictiveTrigger['status'],
        source: value.source as AnswerlatticePredictiveTrigger['source'],
        ...(effectiveness ? { effectiveness } : {}),
        ...(frictionSource ? { frictionSource } : {}),
        ...(knownIssue ? { knownIssue } : {}),
        ...(getAnswerlatticePredictiveTimestampMillis(value.createdOn) !== null ? { createdOn: value.createdOn as any } : {}),
        ...(getAnswerlatticePredictiveTimestampMillis(value.modifiedOn) !== null ? { modifiedOn: value.modifiedOn as any } : {}),
        ...(normalizeText(value.createdBy, 180) ? { createdBy: normalizeText(value.createdBy, 180) } : {}),
    };
};

export const projectAnswerlatticePredictiveTriggerForRuntime = (
    trigger: AnswerlatticePredictiveTrigger,
): AnswerlatticePredictiveTrigger => ({
    id: trigger.id,
    pId: PRODUCT_IDS.ANSWERLATTICE,
    tId: trigger.tId,
    sId: trigger.sId,
    name: trigger.name,
    ...(trigger.description ? { description: trigger.description } : {}),
    kind: trigger.kind === 'known_issue' ? 'known_issue' : 'predictive_help',
    conditions: { ...trigger.conditions },
    action: { ...trigger.action },
    ...(trigger.resolvedSuggestion ? { resolvedSuggestion: trigger.resolvedSuggestion } : {}),
    priority: trigger.priority,
    cooldownHours: trigger.cooldownHours,
    status: trigger.status,
    source: trigger.source,
    ...(trigger.knownIssue ? { knownIssue: trigger.knownIssue } : {}),
});

export const isAnswerlatticePredictiveTriggerWithinWindow = (
    trigger: AnswerlatticePredictiveTrigger,
    nowMs = Date.now(),
): boolean => {
    if (trigger.kind !== 'known_issue') return true;
    const startsAt = getAnswerlatticePredictiveTimestampMillis(trigger.knownIssue?.startsAt);
    const endsAt = getAnswerlatticePredictiveTimestampMillis(trigger.knownIssue?.endsAt);
    return (startsAt === null || startsAt <= nowMs) && (endsAt === null || endsAt > nowMs);
};

export const doesAnswerlatticePredictiveTriggerMatchContext = (
    trigger: AnswerlatticePredictiveTrigger,
    context: Pick<AnswerlatticeContextPayload, 'page' | 'feature' | 'workflow' | 'plan' | 'userRole'>,
): boolean => {
    const page = normalizeAnswerlatticePredictiveCondition(context.page);
    if (!page || normalizeAnswerlatticePredictiveCondition(trigger.conditions.page) !== page) return false;
    for (const key of ['feature', 'workflow', 'plan', 'userRole'] as const) {
        const expected = normalizeAnswerlatticePredictiveCondition(trigger.conditions[key]);
        if (expected && normalizeAnswerlatticePredictiveCondition(context[key]) !== expected) return false;
    }
    return true;
};

export const normalizeAnswerlatticePredictiveSuggestion = (
    value: unknown,
): AnswerlatticePredictiveSuggestion | null => {
    if (!isRecord(value)) return null;
    const triggerId = normalizeAnswerlatticePredictiveTriggerId(value.triggerId);
    const title = normalizeText(value.title, 160);
    if (!triggerId || !title || typeof value.type !== 'string' || !ACTION_TYPES.has(value.type)) return null;
    const summary = typeof value.summary === 'string' ? value.summary.trim().slice(0, 600) : '';
    const articles = Array.isArray(value.articles)
        ? value.articles.slice(0, 3).flatMap((article) => {
            if (!isRecord(article)) return [];
            const id = normalizeText(article.id, 180);
            const articleTitle = normalizeText(article.title, 160);
            return id && articleTitle ? [{ id, title: articleTitle }] : [];
        })
        : [];
    const procedureResult = AnswerlatticeProcedureSchema.safeParse(value.procedure);
    const knownIssue = normalizeKnownIssue(value.knownIssue);
    if (value.type === ANSWERLATTICE_TRIGGER_ACTION_TYPES.KNOWN_ISSUE && !knownIssue) return null;
    return {
        triggerId,
        type: value.type as AnswerlatticePredictiveSuggestion['type'],
        title,
        summary,
        ...(articles.length > 0 ? { articles } : {}),
        ...(value.type === ANSWERLATTICE_TRIGGER_ACTION_TYPES.WORKFLOW_GUIDE && procedureResult.success
            ? { procedure: procedureResult.data }
            : {}),
        ...(knownIssue ? {
            knownIssue: {
                severity: knownIssue.severity,
                ...(knownIssue.statusPageUrl ? { statusPageUrl: knownIssue.statusPageUrl } : {}),
            },
        } : {}),
    };
};

export const AnswerlatticePredictiveInteractionSchema = z.object({
    contractVersion: z.literal(ANSWERLATTICE_PREDICTIVE_INTERACTION_CONTRACT_VERSION),
    interactionId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
    sessionId: z.string().regex(/^[A-Za-z0-9_.:-]{8,120}$/),
    triggerId: z.string().trim().min(1).max(180),
    type: z.enum(PREDICTIVE_INTERACTIONS),
    page: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN),
    feature: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    workflow: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    plan: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    userRole: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
    contextKey: z.string().trim().min(1).max(100).regex(ANSWERLATTICE_PREDICTIVE_CONDITION_PATTERN).optional(),
}).strict();

export type AnswerlatticePredictiveInteraction = z.infer<typeof AnswerlatticePredictiveInteractionSchema>;

export const buildAnswerlatticePredictiveInteractionIdempotencyKey = (
    interaction: Pick<AnswerlatticePredictiveInteraction, 'interactionId' | 'triggerId' | 'type'>,
): string => `predictive:${interaction.triggerId}:${interaction.interactionId}:${interaction.type}`;
