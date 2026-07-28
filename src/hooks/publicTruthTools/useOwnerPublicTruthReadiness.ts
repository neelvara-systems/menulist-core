'use client';

import { getExistingProjectsListWithoutLoader, getProjectDataWithoutLoader } from '@database/projects';
import {
  buildOwnerPublicTruthReadinessReport,
  type OwnerPublicTruthProjectSummary,
  type OwnerPublicTruthReadinessReport,
} from '@lib/public-truth-tools/ownerPublicTruthReadiness';
import type { Project } from '@template/main-app/projects/types';
import type { StoreDataType } from '@type/platform/store';
import { useMemo } from 'react';
import useSWR from 'swr';
import { FEATURE_FLAGS } from '@config/features';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveOwnerBusinessAssistantClientScope } from '@lib/ownerBusinessAssistant/clientScope';

type UseOwnerPublicTruthReadinessOptions = {
  enabled?: boolean;
  projectDataById?: Record<string, Partial<Project> | Record<string, any> | null | undefined>;
  projectSummaries?: OwnerPublicTruthProjectSummary[];
  selectedProjectId?: string | null;
  storeDetails?: Partial<StoreDataType> | Record<string, any> | null;
};

function isSelectableProject(project?: OwnerPublicTruthProjectSummary | null): boolean {
  return Boolean(project?.projectId)
    && project?.active !== false
    && project?.deleted !== true
    && project?.isSpecialMenu !== true;
}

function pickProjectId(projectSummaries: OwnerPublicTruthProjectSummary[], selectedProjectId?: string | null): string | null {
  const selectable = projectSummaries.filter(isSelectableProject);
  if (selectedProjectId && selectable.some((project) => project.projectId === selectedProjectId)) {
    return selectedProjectId;
  }
  return selectable.find((project) => project.isDefault)?.projectId || selectable[0]?.projectId || null;
}

export function useOwnerPublicTruthReadiness({
  enabled = true,
  projectDataById,
  projectSummaries,
  selectedProjectId,
  storeDetails,
}: UseOwnerPublicTruthReadinessOptions) {
  const session = useClientAuthSession();
  const scope = useMemo(
    () => resolveOwnerBusinessAssistantClientScope(
      session,
      storeDetails?.storeId,
      storeDetails?.tenantId,
    ),
    [session, storeDetails?.storeId, storeDetails?.tenantId],
  );
  const storeId = scope?.storeId || null;
  const tenantId = scope?.tenantId || null;
  const scopedStoreDetails = scope ? storeDetails : null;
  const isEnabled = Boolean(enabled && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_TOOLS && FEATURE_FLAGS.ENABLE_PUBLIC_TRUTH_OWNER_CHECK && scope);
  const shouldLoadProjectSummaries = isEnabled && !projectSummaries;
  const summariesRequest = useSWR(
    shouldLoadProjectSummaries ? ['businessHealthProjectScope', tenantId, storeId] : null,
    () => getExistingProjectsListWithoutLoader(true),
    {
      dedupingInterval: 60 * 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const resolvedProjectSummaries = useMemo(
    () => projectSummaries || ((summariesRequest.data as { projects?: OwnerPublicTruthProjectSummary[] } | undefined)?.projects || []),
    [projectSummaries, summariesRequest.data],
  );
  const primaryProjectId = useMemo(
    () => pickProjectId(resolvedProjectSummaries, selectedProjectId),
    [resolvedProjectSummaries, selectedProjectId],
  );
  const providedProjectData = primaryProjectId ? projectDataById?.[primaryProjectId] : null;
  const shouldLoadProjectData = Boolean(isEnabled && primaryProjectId && !providedProjectData);
  const projectRequest = useSWR(
    shouldLoadProjectData ? ['ownerPublicTruthReadinessProjectData', tenantId, storeId, primaryProjectId] : null,
    () => getProjectDataWithoutLoader(primaryProjectId as string),
    {
      dedupingInterval: 30 * 60 * 1000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );
  const projectData = providedProjectData || projectRequest.data || null;

  const report: OwnerPublicTruthReadinessReport | null = useMemo(() => {
    if (!isEnabled || !scopedStoreDetails) return null;
    return buildOwnerPublicTruthReadinessReport({
      projectData,
      projectSummaries: resolvedProjectSummaries,
      selectedProjectId,
      store: scopedStoreDetails,
    });
  }, [isEnabled, projectData, resolvedProjectSummaries, selectedProjectId, scopedStoreDetails]);

  return {
    error: summariesRequest.error || projectRequest.error,
    isLoading: Boolean(isEnabled && ((shouldLoadProjectSummaries && summariesRequest.isLoading) || (shouldLoadProjectData && projectRequest.isLoading))),
    primaryProjectId,
    refresh: async () => {
      await Promise.all([
        summariesRequest.mutate(),
        projectRequest.mutate(),
      ]);
    },
    report,
  };
}
