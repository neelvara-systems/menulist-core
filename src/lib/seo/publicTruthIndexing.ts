import { isStarterPublicSurfaceExpired, STARTER_ACTIVATION_STATUS } from '@lib/onboarding/starterActivation';
import type { StoreDataType } from '@type/platform/store';

export type PublicTruthSurface = 'obp' | 'outlet_obp' | 'menu';

export type PublicTruthIndexReason =
    | 'indexable_public_truth'
    | 'missing_store'
    | 'inactive_or_blocked_store'
    | 'starter_surface_expired'
    | 'missing_public_identity'
    | 'insufficient_public_facts'
    | 'missing_menu_content';

export interface PublicTruthIndexDecision {
    index: boolean;
    follow: boolean;
    includeInSitemap: boolean;
    reason: PublicTruthIndexReason;
}

interface PublicTruthIndexOptions {
    surface: PublicTruthSurface;
    hasPublishedMenu?: boolean;
    projectData?: Record<string, any> | null;
    projectSummary?: Record<string, any> | null;
}

const INDEXABLE_DECISION: PublicTruthIndexDecision = {
    index: true,
    follow: true,
    includeInSitemap: true,
    reason: 'indexable_public_truth',
};

function noindex(reason: PublicTruthIndexReason): PublicTruthIndexDecision {
    return {
        index: false,
        follow: true,
        includeInSitemap: false,
        reason,
    };
}

function hasText(value: unknown): boolean {
    return typeof value === 'string' && value.trim().length > 0;
}

function hasLocalizedText(value: unknown): boolean {
    if (hasText(value)) return true;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value as Record<string, unknown>).some(hasText);
}

function hasAnyWorkingHours(workingHours: unknown): boolean {
    if (!workingHours || typeof workingHours !== 'object') return false;
    return Object.values(workingHours as Record<string, unknown>).some(hasText);
}

function isStoreActiveForPublicTruth(store: Record<string, any>): boolean {
    return store.active !== false
        && store.deleted !== true
        && store.blocked !== true
        && store.tenantBlocked !== true
        && store.blockDetails?.active !== true;
}

function isStarterSurfaceBlocked(store: Record<string, any>): boolean {
    return isStarterPublicSurfaceExpired(store as Pick<StoreDataType, 'activationDeadline' | 'activePlanType' | 'onboardingSource' | 'starterActivationStatus'>)
        || store.starterActivationStatus === STARTER_ACTIVATION_STATUS.STARTER_EXPIRED
        || store.starterActivationStatus === STARTER_ACTIVATION_STATUS.ARCHIVED;
}

function hasPublicIdentity(store: Record<string, any>): boolean {
    return hasLocalizedText(store.name)
        || hasLocalizedText(store.tenantName)
        || hasLocalizedText(store.publicPresence?.descriptor);
}

function hasLocationFact(store: Record<string, any>): boolean {
    return hasText(store.addressLine)
        || hasText(store.city)
        || hasText(store.area)
        || hasText(store.state)
        || Boolean(store.geo?.latitude && store.geo?.longitude);
}

function hasContactFact(store: Record<string, any>): boolean {
    return hasText(store.phoneNumber)
        || hasText(store.alternatePhoneNumber)
        || hasText(store.publicPresence?.whatsappNumber)
        || hasText(store.email);
}

function hasPublicActionFact(store: Record<string, any>): boolean {
    const pp = store.publicPresence || {};
    const socials = store.socialMedia || {};
    return hasText(store.url)
        || hasText(pp.googleMapsUrl)
        || hasText(pp.reservationUrl)
        || hasText(pp.orderUrl)
        || Object.values(socials).some(hasText);
}

function hasPublishedMenuSignal(store: Record<string, any>, options: PublicTruthIndexOptions): boolean {
    return options.hasPublishedMenu === true
        || Boolean(store.lastPublishedAt)
        || hasText(store.primaryProjectId)
        || Boolean(options.projectData?.lastPublishedAt)
        || Boolean(options.projectData?.menuVersion);
}

function hasPublicBusinessFacts(store: Record<string, any>, options: PublicTruthIndexOptions): boolean {
    const facts = [
        hasLocationFact(store),
        hasContactFact(store),
        hasAnyWorkingHours(store.workingHours),
        hasPublicActionFact(store),
        hasPublishedMenuSignal(store, options),
    ];
    return facts.filter(Boolean).length >= 2;
}

function hasActiveProjectSummary(projectSummary: Record<string, any> | null | undefined): boolean {
    if (!projectSummary) return false;
    return projectSummary.active !== false
        && projectSummary.deleted !== true
        && projectSummary.isSpecialMenu !== true
        && hasText(projectSummary.slug)
        && hasLocalizedText(projectSummary.name);
}

function hasPublicProjectContent(projectData: Record<string, any> | null | undefined): boolean {
    if (!projectData) return false;
    if (projectData.active === false || projectData.deleted === true || projectData.isSpecialMenu === true) return false;

    const files = Array.isArray(projectData.files) ? projectData.files : [];
    for (const file of files) {
        const data = file?.extractedData?.data;
        const categories = Array.isArray(data?.categories) ? data.categories : [];
        const items = Array.isArray(data?.items) ? data.items : [];

        if (categories.some((category: any) => category?.active !== false && hasLocalizedText(category?.name))) {
            return true;
        }
        if (items.some((item: any) => item?.active !== false && hasLocalizedText(item?.name))) {
            return true;
        }
    }

    return false;
}

export function evaluatePublicTruthIndexability(
    store: Partial<StoreDataType> | Record<string, any> | null | undefined,
    options: PublicTruthIndexOptions,
): PublicTruthIndexDecision {
    if (!store) return noindex('missing_store');

    const publicStore = store as Record<string, any>;
    if (!isStoreActiveForPublicTruth(publicStore)) return noindex('inactive_or_blocked_store');
    if (isStarterSurfaceBlocked(publicStore)) return noindex('starter_surface_expired');
    if (!hasPublicIdentity(publicStore)) return noindex('missing_public_identity');

    if (options.surface === 'menu') {
        if (options.projectData) {
            return hasPublicProjectContent(options.projectData)
                ? INDEXABLE_DECISION
                : noindex('missing_menu_content');
        }
        if (!hasActiveProjectSummary(options.projectSummary)) {
            return noindex('missing_menu_content');
        }
        return INDEXABLE_DECISION;
    }

    if (!hasPublicBusinessFacts(publicStore, options)) {
        return noindex('insufficient_public_facts');
    }

    return INDEXABLE_DECISION;
}

export function buildPublicTruthRobots(decision: Pick<PublicTruthIndexDecision, 'index' | 'follow'>) {
    return {
        index: decision.index,
        follow: decision.follow,
    };
}
