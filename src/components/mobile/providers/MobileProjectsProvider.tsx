'use client'

import { getProjectDataWithoutLoader, getProjectsListWithoutLoader } from '@database/projects';
import { useClientAuthSession } from '@hook/useClientAuthSession';
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
    refreshCachedProject: (projectId?: string | null, options?: { showLoader?: boolean }) => Promise<any | null>;
    refreshProjects: (options?: { force?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => Promise<void>;
    removeCachedProject: (projectId: string) => void;
    selectedProject: any | null;
    selectedProjectId: string | null;
    selectedProjectSummary: ProjectSummary | null;
    selectProject: (projectId?: string | null) => Promise<void>;
    upsertCachedProject: (project: any) => void;
};

const MobileProjectsContext = createContext<MobileProjectsContextValue>({
    isLoading: true,
    projectsById: {},
    projectsList: [],
    refreshCachedProject: async () => null,
    refreshProjects: async () => { },
    removeCachedProject: () => { },
    selectedProject: null,
    selectedProjectId: null,
    selectedProjectSummary: null,
    selectProject: async () => { },
    upsertCachedProject: () => { },
});

export function useMobileProjects() {
    return useContext(MobileProjectsContext);
}

export default function MobileProjectsProvider({ children }: { children: React.ReactNode }) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const loggedInSession = useClientAuthSession();
    const sessionStoreId = loggedInSession?.sId || null;
    const sessionTenantId = loggedInSession?.tId || null;
    const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
    const [projectsById, setProjectsById] = useState<Record<string, any>>({});
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hydratedStoreIdRef = useRef<string | number | null>(null);
    const hasHydratedRef = useRef(false);
    const inFlightProjectLoadsRef = useRef<Record<string, Promise<any>>>({});
    const projectsListRef = useRef<ProjectSummary[]>([]);
    const projectsByIdRef = useRef<Record<string, any>>({});

    useEffect(() => {
        projectsListRef.current = projectsList;
    }, [projectsList]);

    useEffect(() => {
        projectsByIdRef.current = projectsById;
    }, [projectsById]);

    const loadProjectIntoCache = useCallback(async (
        projectId?: string | null,
        options?: { force?: boolean }
    ) => {
        const nextProjectId = projectId || null;
        if (!nextProjectId) return null;
        if (!sessionStoreId || !sessionTenantId) return null;

        if (!options?.force && projectsByIdRef.current[nextProjectId]) {
            return projectsByIdRef.current[nextProjectId];
        }

        if (!options?.force && inFlightProjectLoadsRef.current[nextProjectId]) {
            return inFlightProjectLoadsRef.current[nextProjectId];
        }

        const request = getProjectDataWithoutLoader(nextProjectId)
            .then((project) => {
                const sanitizedProject = removeObjRef(project);
                setProjectsById((prev) => ({
                    ...prev,
                    [nextProjectId]: sanitizedProject,
                }));
                return sanitizedProject;
            })
            .finally(() => {
                delete inFlightProjectLoadsRef.current[nextProjectId];
            });

        inFlightProjectLoadsRef.current[nextProjectId] = request;
        return request;
    }, [sessionStoreId, sessionTenantId]);

    const refreshProjects = useCallback(async (options?: { force?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => {
        const storeId = storeDetails?.storeId;
        if (!sessionStoreId || !sessionTenantId) {
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            return;
        }
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
                const resolvedProject = resolveMobileSelectedProject(projectsListRef.current, options.preferredProjectId || null);
                const preferred = resolvedProject?.projectId || null;
                await loadProjectIntoCache(preferred);
                setSelectedProjectId(preferred);
                setStoredMobileProjectId(preferred, storeId);
            }
            return;
        }

        try {
            if (shouldShowLoader) {
                setIsLoading(true);
            }

            const result = await getProjectsListWithoutLoader(true);
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
                const validProjectIds = new Set(summaries.map((project) => project.projectId));
                setProjectsById((prev) => Object.fromEntries(
                    Object.entries(prev).filter(([projectId]) => validProjectIds.has(projectId))
                ));

                if (resolvedProjectId) {
                    await loadProjectIntoCache(resolvedProjectId, { force: shouldForce });
                }
            }

            hydratedStoreIdRef.current = storeId;
            hasHydratedRef.current = true;
        } finally {
            if (shouldShowLoader) {
                setIsLoading(false);
            }
        }
    }, [loadProjectIntoCache, sessionStoreId, sessionTenantId, storeDetails?.storeId]);

    const refreshCachedProject = useCallback(async (
        projectId?: string | null,
        options?: { showLoader?: boolean }
    ) => {
        const nextProjectId = projectId || selectedProjectId || null;
        if (!nextProjectId || !sessionStoreId || !sessionTenantId) {
            return null;
        }

        const shouldShowLoader = options?.showLoader ?? false;

        try {
            if (shouldShowLoader) {
                setIsLoading(true);
            }

            return await loadProjectIntoCache(nextProjectId, { force: true });
        } finally {
            if (shouldShowLoader) {
                setIsLoading(false);
            }
        }
    }, [loadProjectIntoCache, sessionStoreId, sessionTenantId, selectedProjectId]);

    useEffect(() => {
        if (!storeDetails?.storeId) {
            hasHydratedRef.current = false;
            hydratedStoreIdRef.current = null;
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            setIsLoading(true);
            return;
        }

        if (!sessionStoreId || !sessionTenantId) {
            hasHydratedRef.current = false;
            hydratedStoreIdRef.current = null;
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            setIsLoading(true);
            return;
        }

        const storeId = storeDetails.storeId;

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
    }, [refreshProjects, sessionStoreId, sessionTenantId, storeDetails?.storeId]);

    const selectProject = useCallback(async (projectId?: string | null) => {
        if (!sessionStoreId || !sessionTenantId) return;

        const resolvedProject = resolveMobileSelectedProject(projectsListRef.current, projectId || null);
        const nextProjectId = resolvedProject?.projectId || null;
        const needsFetch = Boolean(nextProjectId) && !projectsByIdRef.current[nextProjectId];

        if (needsFetch) {
            setIsLoading(true);
        }

        setSelectedProjectId(nextProjectId);
        setStoredMobileProjectId(nextProjectId, storeDetails?.storeId);

        try {
            let selectedProjectData = nextProjectId ? projectsByIdRef.current[nextProjectId] || null : null;
            if (needsFetch) {
                selectedProjectData = await loadProjectIntoCache(nextProjectId);
            }

            if (!needsFetch && nextProjectId) {
                selectedProjectData = projectsByIdRef.current[nextProjectId] || null;
            }

            if (nextProjectId) {
                console.log('[MobileProjectSelect] Selected project', {
                    projectSummary: resolvedProject || null,
                    projectData: selectedProjectData,
                });
            }
        } finally {
            if (needsFetch) {
                setIsLoading(false);
            }
        }
    }, [loadProjectIntoCache, sessionStoreId, sessionTenantId, storeDetails?.storeId]);

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
        refreshCachedProject,
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
        refreshCachedProject,
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
