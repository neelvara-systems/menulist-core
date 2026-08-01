import { isTodayCampaignSummary } from './campaignActionState';
import type {
    Campaign,
    CampaignExport,
    ExecutionSurface,
    PhysicalSurfaceEligibility,
    StaffPrompt,
} from '@type/campaigns';

type CampaignClientScope = {
    sId?: unknown;
    tId?: unknown;
};

export type CampaignCacheScope = {
    sId: number;
    tId: number;
};

const EXECUTION_SURFACES = new Set<ExecutionSurface>([
    'whatsapp_status',
    'whatsapp_message',
    'print_poster',
    'qr_tent',
    'digital_screen',
]);
const CAMPAIGN_EXPORT_METHODS = new Set<CampaignExport['method']>([
    'whatsapp_share',
    'download',
    'copy_text',
]);

export const isCampaignExecutionSurface = (value: unknown): value is ExecutionSurface => (
    EXECUTION_SURFACES.has(value as ExecutionSurface)
);

export const isCampaignExportMethod = (value: unknown): value is CampaignExport['method'] => (
    CAMPAIGN_EXPORT_METHODS.has(value as CampaignExport['method'])
);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isBoundedString = (value: unknown, maxLength = 4096): value is string => (
    typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength
);

const isOptionalBoundedString = (value: unknown, maxLength = 4096): value is string | undefined => (
    value === undefined || (typeof value === 'string' && value.length <= maxLength)
);

const isTimestampLike = (value: unknown): value is Campaign['createdAt'] => (
    isRecord(value)
    && typeof value.toDate === 'function'
    && typeof value.toMillis === 'function'
);

const isUnitNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
);

const isNonNegativeInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
);

const isIsoDate = (value: unknown): value is string => (
    typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && (() => {
        const parsed = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    })()
);

export const projectStaffPrompt = (value: unknown): StaffPrompt | undefined => {
    if (!isRecord(value) || !isRecord(value.inertia)) return undefined;
    if (
        typeof value.eligible !== 'boolean'
        || !isBoundedString(value.text, 1000)
        || !isBoundedString(value.itemId, 160)
        || !isBoundedString(value.itemName, 1000)
        || !isUnitNumber(value.confidence)
        || !isNonNegativeInteger(value.stableDays)
        || !isIsoDate(value.inertia.startDate)
        || !isNonNegativeInteger(value.inertia.consecutiveDays)
        || !isNonNegativeInteger(value.inertia.weekAppearances)
        || !isIsoDate(value.inertia.weekStartDate)
        || !Array.isArray(value.validatedOnSurfaces)
        || value.validatedOnSurfaces.length > 3
        || !value.validatedOnSurfaces.every((surface) => (
            surface === 'decision_blocks'
            || surface === 'digital_screen'
            || surface === 'physical_surface'
        ))
        || new Set(value.validatedOnSurfaces).size !== value.validatedOnSurfaces.length
    ) {
        return undefined;
    }

    return {
        confidence: value.confidence,
        eligible: value.eligible,
        inertia: {
            consecutiveDays: value.inertia.consecutiveDays,
            startDate: value.inertia.startDate,
            weekAppearances: value.inertia.weekAppearances,
            weekStartDate: value.inertia.weekStartDate,
        },
        itemId: value.itemId,
        itemName: value.itemName,
        stableDays: value.stableDays,
        text: value.text,
        validatedOnSurfaces: value.validatedOnSurfaces,
    };
};

const isTemplateId = (value: unknown): value is 1 | 2 | 3 | 4 => (
    value === 1 || value === 2 || value === 3 || value === 4
);

const projectTentCard = (
    value: unknown,
): NonNullable<PhysicalSurfaceEligibility['tentCard']> | undefined => {
    if (
        !isRecord(value)
        || typeof value.eligible !== 'boolean'
        || !isTemplateId(value.templateId)
        || !isUnitNumber(value.confidence)
        || !isBoundedString(value.qrUrl)
        || !isTimestampLike(value.recheckAfter)
        || !isOptionalBoundedString(value.itemId, 160)
        || !isOptionalBoundedString(value.itemName, 1000)
        || !isOptionalBoundedString(value.itemImageUrl)
    ) {
        return undefined;
    }
    return {
        confidence: value.confidence,
        eligible: value.eligible,
        ...(value.itemId !== undefined ? { itemId: value.itemId } : {}),
        ...(value.itemImageUrl !== undefined ? { itemImageUrl: value.itemImageUrl } : {}),
        ...(value.itemName !== undefined ? { itemName: value.itemName } : {}),
        qrUrl: value.qrUrl,
        recheckAfter: value.recheckAfter,
        templateId: value.templateId,
    };
};

const projectCounterSticker = (
    value: unknown,
): NonNullable<PhysicalSurfaceEligibility['counterSticker']> | undefined => {
    if (
        !isRecord(value)
        || typeof value.eligible !== 'boolean'
        || !isTemplateId(value.templateId)
        || !isUnitNumber(value.confidence)
        || !isNonNegativeInteger(value.stableSinceDays)
        || !isBoundedString(value.qrUrl)
        || !isTimestampLike(value.recheckAfter)
        || !isOptionalBoundedString(value.itemId, 160)
        || !isOptionalBoundedString(value.itemName, 1000)
    ) {
        return undefined;
    }
    return {
        confidence: value.confidence,
        eligible: value.eligible,
        ...(value.itemId !== undefined ? { itemId: value.itemId } : {}),
        ...(value.itemName !== undefined ? { itemName: value.itemName } : {}),
        qrUrl: value.qrUrl,
        recheckAfter: value.recheckAfter,
        stableSinceDays: value.stableSinceDays,
        templateId: value.templateId,
    };
};

export const projectPhysicalSurfaceEligibility = (
    value: unknown,
): PhysicalSurfaceEligibility | undefined => {
    if (!isRecord(value)) return undefined;
    const tentCard = value.tentCard === undefined ? undefined : projectTentCard(value.tentCard);
    const counterSticker = value.counterSticker === undefined
        ? undefined
        : projectCounterSticker(value.counterSticker);
    if (
        (value.tentCard !== undefined && tentCard === undefined)
        || (value.counterSticker !== undefined && counterSticker === undefined)
    ) {
        return undefined;
    }
    return {
        ...(counterSticker !== undefined ? { counterSticker } : {}),
        ...(tentCard !== undefined ? { tentCard } : {}),
    };
};

const isCampaignAssets = (value: unknown): value is NonNullable<Campaign['assets']> => {
    if (!isRecord(value)) return false;
    return (value.source === 'existing_image' || value.source === 'generated_image')
        && isOptionalBoundedString(value.imageUrl)
        && isOptionalBoundedString(value.caption, 4000)
        && isOptionalBoundedString(value.whatsappMessage, 8000)
        && isOptionalBoundedString(value.posterPdfUrl)
        && (value.generatedAt === undefined || isTimestampLike(value.generatedAt));
};

const isCampaignOutcome = (value: unknown): value is NonNullable<Campaign['outcome']> => (
    isRecord(value)
    && (value.signal === 'positive' || value.signal === 'neutral' || value.signal === 'insufficient_data')
    && isBoundedString(value.observation, 2000)
    && isBoundedString(value.closure, 1000)
);

const isCampaignSequence = (value: unknown): value is NonNullable<Campaign['sequence']> => (
    isRecord(value)
    && Number.isSafeInteger(value.totalSteps)
    && Number(value.totalSteps) > 0
    && Number(value.totalSteps) <= 365
    && Number.isSafeInteger(value.currentStep)
    && Number(value.currentStep) > 0
    && Number(value.currentStep) <= Number(value.totalSteps)
    && isOptionalBoundedString(value.parentCampaignId, 160)
);

export const projectCampaignRecord = (
    value: unknown,
    expected: { campaignId?: string; sId: number; tId: number },
): Campaign | null => {
    if (!isRecord(value) || !isRecord(value.subject) || !isRecord(value.confidence)) return null;
    const secondarySurfaces = value.secondarySurfaces;
    const assets = value.assets;
    const outcome = value.outcome;
    const resolvedAt = value.resolvedAt;
    const sequence = value.sequence;
    const suppressedUntil = value.suppressedUntil;
    if (!isBoundedString(value.id, 160) || (expected.campaignId !== undefined && value.id !== expected.campaignId)) return null;
    if (!isBoundedString(value.projectId, 160) || value.tId !== expected.tId || value.sId !== expected.sId) return null;
    if (
        !Array.isArray(secondarySurfaces)
        || secondarySurfaces.length > EXECUTION_SURFACES.size
        || !secondarySurfaces.every(isCampaignExecutionSurface)
        || new Set(secondarySurfaces).size !== secondarySurfaces.length
    ) return null;
    const summary = {
        campaignId: value.id,
        confidence: value.confidence.total,
        intent: value.intent,
        kind: value.kind,
        primarySurface: value.primarySurface,
        projectId: value.projectId,
        status: value.status,
        subject: value.subject,
        type: value.type,
    };
    if (!isTodayCampaignSummary(summary)) return null;
    if (
        !isOptionalBoundedString(value.subject.itemId, 160)
        || !isOptionalBoundedString(value.subject.itemName, 1000)
        || !isOptionalBoundedString(value.subject.categoryId, 160)
        || !isOptionalBoundedString(value.subject.categoryName, 1000)
    ) return null;
    if (
        !isUnitNumber(value.confidence.availabilityScore)
        || !isUnitNumber(value.confidence.behaviorScore)
        || !isUnitNumber(value.confidence.timingScore)
        || !isUnitNumber(value.confidence.total)
    ) return null;
    if (!isIsoDate(value.suggestedFor)) return null;
    if (!isTimestampLike(value.createdAt) || !isTimestampLike(value.updatedAt)) return null;
    const projectedResolvedAt = resolvedAt === undefined
        ? undefined
        : isTimestampLike(resolvedAt) ? resolvedAt : null;
    const projectedSuppressedUntil = suppressedUntil === undefined
        ? undefined
        : isTimestampLike(suppressedUntil) ? suppressedUntil : null;
    if (projectedResolvedAt === null || projectedSuppressedUntil === null) return null;
    if (typeof value.skipCount !== 'number' || !Number.isSafeInteger(value.skipCount) || value.skipCount < 0) return null;
    const projectedAssets = assets === undefined ? undefined : isCampaignAssets(assets) ? assets : null;
    const projectedOutcome = outcome === undefined ? undefined : isCampaignOutcome(outcome) ? outcome : null;
    const projectedSequence = sequence === undefined ? undefined : isCampaignSequence(sequence) ? sequence : null;
    if (projectedAssets === null || projectedOutcome === null || projectedSequence === null) return null;

    return {
        ...(projectedAssets !== undefined ? { assets: projectedAssets } : {}),
        confidence: {
            availabilityScore: value.confidence.availabilityScore,
            behaviorScore: value.confidence.behaviorScore,
            timingScore: value.confidence.timingScore,
            total: value.confidence.total,
        },
        createdAt: value.createdAt,
        id: summary.campaignId,
        intent: summary.intent,
        kind: summary.kind,
        ...(projectedOutcome !== undefined ? { outcome: projectedOutcome } : {}),
        primarySurface: summary.primarySurface,
        projectId: summary.projectId,
        ...(projectedResolvedAt !== undefined ? { resolvedAt: projectedResolvedAt } : {}),
        sId: expected.sId,
        secondarySurfaces,
        ...(projectedSequence !== undefined ? { sequence: projectedSequence } : {}),
        skipCount: value.skipCount,
        status: summary.status,
        subject: {
            ...(value.subject.itemId !== undefined ? { itemId: value.subject.itemId } : {}),
            ...(value.subject.itemName !== undefined ? { itemName: value.subject.itemName } : {}),
            ...(value.subject.categoryId !== undefined ? { categoryId: value.subject.categoryId } : {}),
            ...(value.subject.categoryName !== undefined ? { categoryName: value.subject.categoryName } : {}),
        },
        suggestedFor: value.suggestedFor,
        ...(projectedSuppressedUntil !== undefined ? { suppressedUntil: projectedSuppressedUntil } : {}),
        tId: expected.tId,
        type: summary.type,
        updatedAt: value.updatedAt,
    };
};

export const projectCampaignExportRecord = (
    value: unknown,
    expected: {
        campaignId: string;
        exportId: string;
        method: CampaignExport['method'];
        projectId: string;
        sId: number;
        surface: ExecutionSurface;
        tId: number;
    },
): CampaignExport | null => {
    if (!isRecord(value)) return null;
    if (
        value.id !== expected.exportId
        || value.campaignId !== expected.campaignId
        || value.projectId !== expected.projectId
        || value.tId !== expected.tId
        || value.sId !== expected.sId
        || value.surface !== expected.surface
        || value.method !== expected.method
        || !isTimestampLike(value.exportedAt)
        || !isOptionalBoundedString(value.menuLinkWithTracking)
    ) {
        return null;
    }
    return {
        campaignId: expected.campaignId,
        exportedAt: value.exportedAt,
        id: expected.exportId,
        ...(value.menuLinkWithTracking !== undefined
            ? { menuLinkWithTracking: value.menuLinkWithTracking }
            : {}),
        method: expected.method,
        projectId: expected.projectId,
        sId: expected.sId,
        surface: expected.surface,
        tId: expected.tId,
    };
};

export const getCampaignCacheScope = (
    session: CampaignClientScope | null | undefined,
): CampaignCacheScope | null => {
    if (
        !Number.isSafeInteger(session?.tId)
        || Number(session?.tId) <= 0
        || !Number.isSafeInteger(session?.sId)
        || Number(session?.sId) <= 0
    ) {
        return null;
    }

    return {
        sId: Number(session?.sId),
        tId: Number(session?.tId),
    };
};

export const getTodayCampaignsCacheKey = (
    scope: CampaignCacheScope | null,
): readonly ['today-campaigns', number, number] | null => (
    scope ? ['today-campaigns', scope.tId, scope.sId] : null
);

export const getPastActivityProjectsCacheKey = (
    scope: CampaignCacheScope | null,
): readonly ['past-activity-projects', number, number] | null => (
    scope ? ['past-activity-projects', scope.tId, scope.sId] : null
);

export const getPastActivityCacheKey = (
    scope: CampaignCacheScope | null,
    projectId?: string | null,
): readonly ['past-activity', number, number, string] | null => {
    const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : '';
    return scope && normalizedProjectId
        ? ['past-activity', scope.tId, scope.sId, normalizedProjectId]
        : null;
};

export const normalizeCampaignActivityDate = (value: unknown): Date | null => {
    try {
        let candidate = value;
        if (candidate instanceof Date) {
            return Number.isFinite(candidate.getTime()) ? candidate : null;
        }

        if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
            return null;
        }

        const timestamp = candidate as {
            seconds?: unknown;
            nanoseconds?: unknown;
            toDate?: unknown;
            toMillis?: unknown;
        };

        if (typeof timestamp.toDate === 'function') {
            candidate = timestamp.toDate();
            return candidate instanceof Date && Number.isFinite(candidate.getTime())
                ? candidate
                : null;
        }

        if (typeof timestamp.toMillis === 'function') {
            const millis = timestamp.toMillis();
            if (typeof millis !== 'number' || !Number.isFinite(millis)) return null;
            const date = new Date(millis);
            return Number.isFinite(date.getTime()) ? date : null;
        }

        if (
            typeof timestamp.seconds === 'number'
            && Number.isSafeInteger(timestamp.seconds)
            && (
                timestamp.nanoseconds === undefined
                || (
                    typeof timestamp.nanoseconds === 'number'
                    && Number.isSafeInteger(timestamp.nanoseconds)
                    && timestamp.nanoseconds >= 0
                    && timestamp.nanoseconds < 1_000_000_000
                )
            )
        ) {
            const millis = (timestamp.seconds * 1000) + (Number(timestamp.nanoseconds || 0) / 1_000_000);
            if (!Number.isFinite(millis)) return null;
            const date = new Date(millis);
            return Number.isFinite(date.getTime()) ? date : null;
        }
    } catch {
        return null;
    }

    return null;
};
