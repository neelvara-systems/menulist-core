import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { firstText } from '@services/ai/businessCopy/utils';
import {
    normalizeDefaultProjectAiContextRequest,
    type DefaultProjectAiContextRequest,
    type DefaultProjectAiContextStoreInput,
} from './defaultProjectAiContextBoundary';

type DefaultProjectAiContext = {
    categories: string[];
    items: string[];
    projectDescription: string;
    projectId: string;
    projectName: string;
};

const CACHE_TTL_MS = 60 * 1000;

let cachedContext: DefaultProjectAiContext | null = null;
let cachedKey = '';
let cachedAt = 0;
let cachedPromise: Promise<DefaultProjectAiContext | null> | null = null;
let cachedPromiseKey = '';

function isActiveSpecialMenuSummary(projectSummary: {
    isSpecialMenu?: boolean;
    specialMenuEndsAt?: string;
    specialMenuStatus?: string;
}) {
    if (!projectSummary?.isSpecialMenu) return false;
    if (projectSummary.specialMenuStatus !== 'active') return false;
    const endsAt = projectSummary.specialMenuEndsAt ? new Date(projectSummary.specialMenuEndsAt).getTime() : null;
    return endsAt == null || (Number.isFinite(endsAt) && endsAt > Date.now());
}

async function loadDefaultProjectAiContext(
    request: DefaultProjectAiContextRequest,
): Promise<DefaultProjectAiContext | null> {
    const projectListResult = await getExistingProjectsListWithoutLoader(false, request.expectedScope);
    const allProjects = projectListResult?.projects || [];
    const activeNonSpecialProjects = allProjects.filter((project) =>
        project?.active !== false
        && project?.isSpecialMenu !== true,
    );

    let targetProjectSummary =
        (request.activeSpecialMenuId
            ? allProjects.find((project) =>
                project?.projectId === request.activeSpecialMenuId
                && isActiveSpecialMenuSummary(project),
            )
            : null)
        || (request.primaryProjectId
            ? activeNonSpecialProjects.find((project) => project?.projectId === request.primaryProjectId)
            : null)
        || activeNonSpecialProjects[0]
        || null;

    if (!targetProjectSummary?.projectId) {
        return null;
    }

    const projectDetails = await getProjectDataWithoutLoader(
        targetProjectSummary.projectId,
        request.expectedScope,
    );

    const categories = Array.from(new Set(
        projectDetails?.files
            ?.flatMap((file) => file.extractedData?.data?.categories || [])
            .map((category) => firstText(category?.name))
            .filter(Boolean) || [],
    )).slice(0, 12) as string[];

    const items = Array.from(new Set(
        projectDetails?.files
            ?.flatMap((file) => file.extractedData?.data?.items || [])
            .map((item) => firstText(item?.name))
            .filter(Boolean) || [],
    )).slice(0, 24) as string[];

    return {
        categories,
        items,
        projectDescription: getLocalizedText(
            targetProjectSummary?.description,
            CANONICAL_SOURCE_LANGUAGE,
            getPrimaryLocalizedLanguage(targetProjectSummary?.description, CANONICAL_SOURCE_LANGUAGE),
            '',
        ),
        projectId: targetProjectSummary.projectId,
        projectName: getLocalizedText(
            targetProjectSummary?.name,
            CANONICAL_SOURCE_LANGUAGE,
            getPrimaryLocalizedLanguage(targetProjectSummary?.name, CANONICAL_SOURCE_LANGUAGE),
            '',
        ),
    };
}

export default async function getDefaultProjectAiContext(
    storeDetails?: DefaultProjectAiContextStoreInput,
    forceRefresh = false,
): Promise<DefaultProjectAiContext | null> {
    const request = normalizeDefaultProjectAiContextRequest(storeDetails);
    if (!request) return null;

    const now = Date.now();
    const nextKey = request.cacheKey;
    if (!forceRefresh && cachedContext && cachedKey === nextKey && (now - cachedAt) < CACHE_TTL_MS) {
        return cachedContext;
    }

    if (!forceRefresh && cachedPromise && cachedPromiseKey === nextKey) {
        return cachedPromise;
    }

    cachedPromiseKey = nextKey;
    const nextPromise = loadDefaultProjectAiContext(request);
    cachedPromise = nextPromise;

    try {
        const nextContext = await nextPromise;
        cachedContext = nextContext;
        cachedKey = nextKey;
        cachedAt = Date.now();
        return nextContext;
    } finally {
        if (cachedPromise === nextPromise) {
            cachedPromise = null;
            cachedPromiseKey = '';
        }
    }
}
