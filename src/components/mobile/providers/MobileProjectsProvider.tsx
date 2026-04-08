'use client'

import { getProjectDataWithoutLoader, getProjectsListWithoutLoader } from '@database/projects';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { removeObjRef } from '@util/utils';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getStoredMobileProjectId, resolveMobileSelectedProject, setStoredMobileProjectId } from '../utils/projectSelection';

type ProjectSummary = {
    active?: boolean;
    description?: string;
    isDefault?: boolean;
    name?: string;
    projectId: string;
    [key: string]: any;
};

type MobileProjectsContextValue = {
    isLoading: boolean;
    projectsById: Record<string, any>;
    projectsList: ProjectSummary[];
    refreshProjects: (options?: { force?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => Promise<void>;
    removeCachedProject: (projectId: string) => void;
    selectedProject: any | null;
    selectedProjectId: string | null;
    selectedProjectSummary: ProjectSummary | null;
    selectProject: (projectId?: string | null) => void;
    upsertCachedProject: (project: any) => void;
};

const MobileProjectsContext = createContext<MobileProjectsContextValue>({
    isLoading: true,
    projectsById: {},
    projectsList: [],
    refreshProjects: async () => { },
    removeCachedProject: () => { },
    selectedProject: null,
    selectedProjectId: null,
    selectedProjectSummary: null,
    selectProject: () => { },
    upsertCachedProject: () => { },
});

export function useMobileProjects() {
    return useContext(MobileProjectsContext);
}

export default function MobileProjectsProvider({ children }: { children: React.ReactNode }) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
    const [projectsById, setProjectsById] = useState<Record<string, any>>({});
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hydratedStoreIdRef = useRef<string | number | null>(null);
    const hasHydratedRef = useRef(false);

    const refreshProjects = useCallback(async (options?: { force?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => {
        const storeId = storeDetails?.storeId;
        if (!storeId) {
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            setIsLoading(false);
            return;
        }

        const shouldForce = options?.force ?? false;
        const shouldShowLoader = options?.showLoader ?? !hasHydratedRef.current;

        if (!shouldForce && hasHydratedRef.current && hydratedStoreIdRef.current === storeId) {
            if (options?.preferredProjectId !== undefined) {
                const preferred = options.preferredProjectId || null;
                setSelectedProjectId(preferred);
                setStoredMobileProjectId(preferred, storeId);
            }
            return;
        }

        try {
            if (shouldShowLoader) {
                setIsLoading(true);
            }

            const result = await getProjectsListWithoutLoader();
            const summaries = (result?.projects || []) as ProjectSummary[];
            const resolvedProject = resolveMobileSelectedProject(
                summaries,
                options?.preferredProjectId || getStoredMobileProjectId(storeId)
            );
            const resolvedProjectId = resolvedProject?.projectId || null;

            setProjectsList(summaries);
            setSelectedProjectId(resolvedProjectId);
            setStoredMobileProjectId(resolvedProjectId, storeId);

            if (summaries.length === 0) {
                setProjectsById({});
            } else {
                const fullProjects = await Promise.all(
                    summaries.map(async (project) => {
                        const full = await getProjectDataWithoutLoader(project.projectId);
                        return [project.projectId, removeObjRef(full)] as const;
                    })
                );
                setProjectsById(Object.fromEntries(fullProjects));
            }

            hydratedStoreIdRef.current = storeId;
            hasHydratedRef.current = true;
        } finally {
            if (shouldShowLoader) {
                setIsLoading(false);
            }
        }
    }, [storeDetails?.storeId]);

    useEffect(() => {
        const storeId = storeDetails?.storeId;
        if (!storeId) return;

        if (hydratedStoreIdRef.current !== storeId) {
            hasHydratedRef.current = false;
            hydratedStoreIdRef.current = null;
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
        }

        void refreshProjects({
            force: true,
            showLoader: true,
        });
    }, [refreshProjects, storeDetails?.storeId]);

    const selectProject = useCallback((projectId?: string | null) => {
        const nextProjectId = projectId || null;
        setSelectedProjectId(nextProjectId);
        setStoredMobileProjectId(nextProjectId, storeDetails?.storeId);
    }, [storeDetails?.storeId]);

    const upsertCachedProject = useCallback((project: any) => {
        if (!project?.projectId) return;

        const nextProject = removeObjRef(project);

        setProjectsById((prev) => ({
            ...prev,
            [nextProject.projectId]: nextProject,
        }));

        setProjectsList((prev) => {
            const existingIndex = prev.findIndex((entry) => entry.projectId === nextProject.projectId);
            const nextSummary = existingIndex >= 0
                ? {
                    ...prev[existingIndex],
                    ...nextProject,
                    projectId: nextProject.projectId,
                }
                : {
                    ...nextProject,
                    projectId: nextProject.projectId,
                };

            if (existingIndex >= 0) {
                const copy = [...prev];
                copy[existingIndex] = nextSummary;
                return copy;
            }

            return [...prev, nextSummary];
        });
    }, []);

    const removeCachedProject = useCallback((projectId: string) => {
        setProjectsById((prev) => {
            const next = { ...prev };
            delete next[projectId];
            return next;
        });
        setProjectsList((prev) => prev.filter((project) => project.projectId !== projectId));
        setSelectedProjectId((prev) => prev === projectId ? null : prev);
    }, []);

    const selectedProject = useMemo(
        () => (selectedProjectId ? projectsById[selectedProjectId] || null : null),
        [projectsById, selectedProjectId]
    );

    const selectedProjectSummary = useMemo(
        () => projectsList.find((project) => project.projectId === selectedProjectId) || null,
        [projectsList, selectedProjectId]
    );

    const value = useMemo<MobileProjectsContextValue>(() => ({
        isLoading,
        projectsById,
        projectsList,
        refreshProjects,
        removeCachedProject,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
        upsertCachedProject,
    }), [
        isLoading,
        projectsById,
        projectsList,
        refreshProjects,
        removeCachedProject,
        selectedProject,
        selectedProjectId,
        selectedProjectSummary,
        selectProject,
        upsertCachedProject,
    ]);

    return (
        <MobileProjectsContext.Provider value={value}>
            {children}
        </MobileProjectsContext.Provider>
    );
}
