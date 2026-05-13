import { getProjectDataByStore } from '@database/projects';
import { parseProjectId } from '@lib/multiOutlet/resolveProject';
import type { Project } from '@template/main-app/projects/types';
import type { ExistingCategory, ExistingItem } from './comparisonEngine.types';

export type ComparisonProjectInput = {
    categories: ExistingCategory[];
    items: ExistingItem[];
};

export function buildComparisonProjectInput(project?: Project | null): ComparisonProjectInput {
    return {
        categories: project?.files?.flatMap(file => (file.extractedData?.data?.categories || []).map((category: any) => ({
            ...category,
            fileUid: file.uid,
        }))) || [],
        items: project?.files?.flatMap(file => (file.extractedData?.data?.items || []).map((item: any) => ({
            ...item,
            fileUid: file.uid,
        }))) || [],
    };
}

export async function getLinkedMasterComparisonInput(
    storeProject?: Project | null,
): Promise<ComparisonProjectInput | undefined> {
    if (!storeProject?.masterProjectId) return undefined;

    const { tId, sId } = parseProjectId(storeProject.masterProjectId);
    const masterProject = await getProjectDataByStore(
        tId,
        sId,
        storeProject.masterProjectId,
    );

    return buildComparisonProjectInput(masterProject);
}
