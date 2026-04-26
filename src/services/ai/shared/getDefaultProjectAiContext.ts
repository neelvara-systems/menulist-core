import { getProjectDataWithoutLoader, getProjectsListWithoutLoader } from '@database/projects';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { firstText } from '@services/ai/businessCopy/utils';

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

function buildCacheKey(storeDetails?: any) {
    return JSON.stringify({
        activeSpecialMenuId: storeDetails?.activeSpecialMenuId || '',
        primaryProjectId: storeDetails?.primaryProjectId || '',
        storeId: storeDetails?.storeId || '',
    });
}

function isActiveSpecialMenuProject(projectData: any) {
    if (!projectData?._specialMenu) return false;
    if (projectData._specialMenu.status !== 'active') return false;
    const endsAt = projectData._specialMenu.endsAt ? new Date(projectData._specialMenu.endsAt).getTime() : null;
    return endsAt == null || (Number.isFinite(endsAt) && endsAt > Date.now());
}

async function loadDefaultProjectAiContext(storeDetails?: any): Promise<DefaultProjectAiContext | null> {
    const projectListResult = await getProjectsListWithoutLoader();
    const allProjects = projectListResult?.projects || [];
    const activeNonSpecialProjects = allProjects.filter((project: any) =>
        project?.active !== false
        && project?.deleted !== true
        && project?.isSpecialMenu !== true,
    );

    let targetProjectSummary =
        (storeDetails?.activeSpecialMenuId
            ? allProjects.find((project: any) => project?.projectId === storeDetails.activeSpecialMenuId)
            : null)
        || (storeDetails?.primaryProjectId
            ? activeNonSpecialProjects.find((project: any) => project?.projectId === storeDetails.primaryProjectId)
            : null)
        || activeNonSpecialProjects[0]
        || null;

    if (!targetProjectSummary?.projectId) {
        return null;
    }

    let projectDetails = await getProjectDataWithoutLoader(targetProjectSummary.projectId);

    if (storeDetails?.activeSpecialMenuId && targetProjectSummary.projectId === storeDetails.activeSpecialMenuId) {
        if (!isActiveSpecialMenuProject(projectDetails)) {
            targetProjectSummary =
                (storeDetails?.primaryProjectId
                    ? activeNonSpecialProjects.find((project: any) => project?.projectId === storeDetails.primaryProjectId)
                    : null)
                || activeNonSpecialProjects[0]
                || null;

            if (!targetProjectSummary?.projectId) {
                return null;
            }

            projectDetails = await getProjectDataWithoutLoader(targetProjectSummary.projectId);
        }
    }

    const categories = Array.from(new Set(
        projectDetails?.files
            ?.flatMap((file: any) => file.extractedData?.data?.categories || [])
            .map((category: any) => firstText(category?.name))
            .filter(Boolean) || [],
    )).slice(0, 12) as string[];

    const items = Array.from(new Set(
        projectDetails?.files
            ?.flatMap((file: any) => file.extractedData?.data?.items || [])
            .map((item: any) => firstText(item?.name))
            .filter(Boolean) || [],
    )).slice(0, 24) as string[];

    return {
        categories,
        items,
        projectDescription: getLocalizedText(
            targetProjectSummary?.description,
            undefined,
            getPrimaryLocalizedLanguage(targetProjectSummary?.description, 'en'),
            '',
        ),
        projectId: targetProjectSummary.projectId,
        projectName: getLocalizedText(
            targetProjectSummary?.name,
            undefined,
            getPrimaryLocalizedLanguage(targetProjectSummary?.name, 'en'),
            '',
        ),
    };
}

export default async function getDefaultProjectAiContext(storeDetails?: any, forceRefresh = false): Promise<DefaultProjectAiContext | null> {
    const now = Date.now();
    const nextKey = buildCacheKey(storeDetails);
    if (!forceRefresh && cachedContext && cachedKey === nextKey && (now - cachedAt) < CACHE_TTL_MS) {
        return cachedContext;
    }

    if (!forceRefresh && cachedPromise && cachedPromiseKey === nextKey) {
        return cachedPromise;
    }

    cachedPromiseKey = nextKey;
    cachedPromise = loadDefaultProjectAiContext(storeDetails);

    try {
        const nextContext = await cachedPromise;
        cachedContext = nextContext;
        cachedKey = nextKey;
        cachedAt = Date.now();
        return nextContext;
    } finally {
        cachedPromise = null;
        cachedPromiseKey = '';
    }
}
