'use client'

import { getProjectDataWithoutLoader, getProjectsListWithoutLoader, type ProjectExpectedScope } from '@database/projects';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { normalizeMultiOutletProjectId } from '@lib/multiOutlet/projectIdBoundary';
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
    refreshProjects: (options?: { force?: boolean; loadSelectedProject?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => Promise<void>;
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

function resolveMobileProjectScope(
    storeDetails: { storeId?: unknown; tenantId?: unknown } | null | undefined,
    session: { sId?: unknown; tId?: unknown } | null | undefined,
): ProjectExpectedScope | null {
    const storeId = Number(storeDetails?.storeId);
    const tenantId = Number(storeDetails?.tenantId);
    const sessionStoreId = Number(session?.sId);
    const sessionTenantId = Number(session?.tId);
    if (
        !Number.isSafeInteger(storeId)
        || storeId <= 0
        || !Number.isSafeInteger(tenantId)
        || tenantId <= 0
        || sessionStoreId !== storeId
        || sessionTenantId !== tenantId
    ) {
        return null;
    }
    return { sId: storeId, tId: tenantId };
}

function projectMatchesMobileScope(
    projectId: unknown,
    scope: ProjectExpectedScope,
): projectId is string {
    const projectScope = normalizeMultiOutletProjectId(projectId);
    return Boolean(
        projectScope
        && projectScope.tId === scope.tId
        && projectScope.sId === scope.sId
    );
}

export function useMobileProjects() {
    return useContext(MobileProjectsContext);
}

export default function MobileProjectsProvider({
    children,
    eagerLoadSelectedProject = true,
}: {
    children: React.ReactNode;
    eagerLoadSelectedProject?: boolean;
}) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const loggedInSession = useClientAuthSession();
    const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
    const [projectsById, setProjectsById] = useState<Record<string, any>>({});
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const currentScope = resolveMobileProjectScope(storeDetails, loggedInSession);
    const currentScopeRef = useRef<ProjectExpectedScope | null>(currentScope);
    currentScopeRef.current = currentScope;
    const latestProjectsRequestRef = useRef(0);
    const hydratedScopeKeyRef = useRef<string | null>(null);
    const hasHydratedRef = useRef(false);
    const inFlightProjectLoadsRef = useRef<Partial<Record<string, Promise<any>>>>({});
    const projectsListRef = useRef<ProjectSummary[]>([]);
    const projectsByIdRef = useRef<Record<string, any>>({});
    const isExpectedScope = useCallback((expectedScope: ProjectExpectedScope) => (
        currentScopeRef.current?.tId === expectedScope.tId
        && currentScopeRef.current?.sId === expectedScope.sId
    ), []);

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
        const expectedScope = currentScopeRef.current;
        if (!expectedScope || !projectMatchesMobileScope(nextProjectId, expectedScope)) return null;

        if (!options?.force && projectsByIdRef.current[nextProjectId]) {
            return projectsByIdRef.current[nextProjectId];
        }

        const requestKey = `${expectedScope.tId}:${expectedScope.sId}:${nextProjectId}`;
        if (!options?.force && inFlightProjectLoadsRef.current[requestKey]) {
            return inFlightProjectLoadsRef.current[requestKey];
        }

        let request: Promise<any>;
        request = getProjectDataWithoutLoader(nextProjectId, expectedScope)
            .then((project) => {
                if (
                    !isExpectedScope(expectedScope)
                    || inFlightProjectLoadsRef.current[requestKey] !== request
                ) return null;
                const sanitizedProject = removeObjRef(project);
                setProjectsById((prev) => {
                    if (
                        !isExpectedScope(expectedScope)
                        || inFlightProjectLoadsRef.current[requestKey] !== request
                    ) return prev;
                    const next = {
                        ...prev,
                        [nextProjectId]: sanitizedProject,
                    };
                    projectsByIdRef.current = next;
                    return next;
                });
                return sanitizedProject;
            })
            .finally(() => {
                if (inFlightProjectLoadsRef.current[requestKey] === request) {
                    delete inFlightProjectLoadsRef.current[requestKey];
                }
            });

        inFlightProjectLoadsRef.current[requestKey] = request;
        return request;
    }, [isExpectedScope]);

    const refreshProjects = useCallback(async (options?: { force?: boolean; loadSelectedProject?: boolean; preferredProjectId?: string | null; showLoader?: boolean }) => {
        const expectedScope = currentScopeRef.current;
        const requestId = latestProjectsRequestRef.current + 1;
        latestProjectsRequestRef.current = requestId;
        if (!expectedScope) {
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            projectsListRef.current = [];
            projectsByIdRef.current = {};
            hasHydratedRef.current = false;
            hydratedScopeKeyRef.current = null;
            setIsLoading(false);
            return;
        }
        const storeId = expectedScope.sId;
        const scopeKey = `${expectedScope.tId}:${expectedScope.sId}`;

        const shouldForce = options?.force ?? false;
        const shouldShowLoader = options?.showLoader ?? !hasHydratedRef.current;
        const shouldLoadSelectedProject = options?.loadSelectedProject ?? true;

        if (!shouldForce && hasHydratedRef.current && hydratedScopeKeyRef.current === scopeKey) {
            if (options?.preferredProjectId !== undefined) {
                const resolvedProject = resolveMobileSelectedProject(projectsListRef.current, options.preferredProjectId || null);
                const preferred = resolvedProject
                    && projectMatchesMobileScope(resolvedProject.projectId, expectedScope)
                    ? resolvedProject.projectId
                    : null;
                if (shouldLoadSelectedProject) {
                    await loadProjectIntoCache(preferred);
                }
                if (!isExpectedScope(expectedScope)) return;
                setSelectedProjectId((current) => isExpectedScope(expectedScope) ? preferred : current);
                setStoredMobileProjectId(preferred, storeId, expectedScope.tId);
            }
            return;
        }

        try {
            if (shouldShowLoader) {
                setIsLoading(true);
            }

            const result = await getProjectsListWithoutLoader(true, expectedScope);
            if (
                latestProjectsRequestRef.current !== requestId
                || !isExpectedScope(expectedScope)
            ) {
                return;
            }
            const summaries = ((result?.projects || []) as ProjectSummary[])
                .filter((project) => projectMatchesMobileScope(project.projectId, expectedScope));
            const resolvedProject = resolveMobileSelectedProject(
                summaries,
                options?.preferredProjectId || getStoredMobileProjectId(storeId, expectedScope.tId)
            );
            const resolvedProjectId = resolvedProject?.projectId || null;

            projectsListRef.current = summaries;
            setProjectsList((current) => isExpectedScope(expectedScope) ? summaries : current);
            setSelectedProjectId((current) => isExpectedScope(expectedScope) ? resolvedProjectId : current);
            setStoredMobileProjectId(resolvedProjectId, storeId, expectedScope.tId);

            if (summaries.length === 0) {
                setProjectsById((current) => {
                    if (!isExpectedScope(expectedScope)) return current;
                    projectsByIdRef.current = {};
                    return {};
                });
            } else {
                const validProjectIds = new Set(summaries.map((project) => project.projectId));
                setProjectsById((prev) => {
                    if (!isExpectedScope(expectedScope)) return prev;
                    const next = Object.fromEntries(
                        Object.entries(prev)
                            .filter(([projectId]) => validProjectIds.has(projectId))
                    );
                    projectsByIdRef.current = next;
                    return next;
                });

                if (resolvedProjectId && shouldLoadSelectedProject) {
                    await loadProjectIntoCache(resolvedProjectId, { force: shouldForce });
                }
            }

            if (
                latestProjectsRequestRef.current !== requestId
                || !isExpectedScope(expectedScope)
            ) {
                return;
            }
            hydratedScopeKeyRef.current = scopeKey;
            hasHydratedRef.current = true;
        } finally {
            if (
                shouldShowLoader
                && latestProjectsRequestRef.current === requestId
                && isExpectedScope(expectedScope)
            ) {
                setIsLoading(false);
            }
        }
    }, [isExpectedScope, loadProjectIntoCache]);

    const refreshCachedProject = useCallback(async (
        projectId?: string | null,
        options?: { showLoader?: boolean }
    ) => {
        const nextProjectId = projectId || selectedProjectId || null;
        const expectedScope = currentScopeRef.current;
        if (
            !nextProjectId
            || !expectedScope
            || !projectMatchesMobileScope(nextProjectId, expectedScope)
        ) {
            return null;
        }

        const shouldShowLoader = options?.showLoader ?? false;

        try {
            if (shouldShowLoader) {
                setIsLoading(true);
            }

            return await loadProjectIntoCache(nextProjectId, { force: true });
        } finally {
            if (shouldShowLoader && isExpectedScope(expectedScope)) {
                setIsLoading(false);
            }
        }
    }, [isExpectedScope, loadProjectIntoCache, selectedProjectId]);

    useEffect(() => {
        latestProjectsRequestRef.current += 1;
        if (!currentScope) {
            hasHydratedRef.current = false;
            hydratedScopeKeyRef.current = null;
            projectsListRef.current = [];
            projectsByIdRef.current = {};
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
            setIsLoading(true);
            return;
        }

        const scopeKey = `${currentScope.tId}:${currentScope.sId}`;
        if (hydratedScopeKeyRef.current !== scopeKey) {
            hasHydratedRef.current = false;
            hydratedScopeKeyRef.current = null;
            projectsListRef.current = [];
            projectsByIdRef.current = {};
            setProjectsList([]);
            setProjectsById({});
            setSelectedProjectId(null);
        }

        void refreshProjects({
            force: true,
            loadSelectedProject: false,
            showLoader: true,
        });
    }, [currentScope?.sId, currentScope?.tId, refreshProjects]);

    useEffect(() => {
        if (!eagerLoadSelectedProject || !selectedProjectId || projectsByIdRef.current[selectedProjectId]) return;

        void loadProjectIntoCache(selectedProjectId);
    }, [eagerLoadSelectedProject, loadProjectIntoCache, selectedProjectId]);

    const selectProject = useCallback(async (projectId?: string | null) => {
        const expectedScope = currentScopeRef.current;
        if (!expectedScope) return;

        const resolvedProject = resolveMobileSelectedProject(projectsListRef.current, projectId || null);
        const nextProjectId = resolvedProject
            && projectMatchesMobileScope(resolvedProject.projectId, expectedScope)
            ? resolvedProject.projectId
            : null;
        const needsFetch = nextProjectId !== null && !projectsByIdRef.current[nextProjectId];

        if (needsFetch) {
            setIsLoading(true);
        }

        setSelectedProjectId((current) => isExpectedScope(expectedScope) ? nextProjectId : current);
        setStoredMobileProjectId(nextProjectId, expectedScope.sId, expectedScope.tId);

        try {
            if (needsFetch) {
                await loadProjectIntoCache(nextProjectId);
            }

        } finally {
            if (needsFetch && isExpectedScope(expectedScope)) {
                setIsLoading(false);
            }
        }
    }, [isExpectedScope, loadProjectIntoCache]);

    const upsertCachedProject = useCallback((project: any) => {
        const expectedScope = currentScopeRef.current;
        if (
            !expectedScope
            || !projectMatchesMobileScope(project?.projectId, expectedScope)
        ) return;

        const nextProject = removeObjRef(project);

        projectsByIdRef.current = {
            ...projectsByIdRef.current,
            [nextProject.projectId]: nextProject,
        };

        const nextProjectsList = (() => {
            const existingIndex = projectsListRef.current.findIndex((entry) => entry.projectId === nextProject.projectId);
            const nextSummary = existingIndex >= 0
                ? {
                    ...projectsListRef.current[existingIndex],
                    ...nextProject,
                    projectId: nextProject.projectId,
                }
                : {
                    ...nextProject,
                    projectId: nextProject.projectId,
                };

            if (existingIndex >= 0) {
                const copy = [...projectsListRef.current];
                copy[existingIndex] = nextSummary;
                return copy;
            }

            return [...projectsListRef.current, nextSummary];
        })();
        projectsListRef.current = nextProjectsList;

        setProjectsById((prev) => isExpectedScope(expectedScope)
            ? {
                ...prev,
                [nextProject.projectId]: nextProject,
            }
            : prev);

        if (isExpectedScope(expectedScope)) {
            setProjectsList(nextProjectsList);
        }
    }, [isExpectedScope]);

    const removeCachedProject = useCallback((projectId: string) => {
        const expectedScope = currentScopeRef.current;
        if (
            !expectedScope
            || !projectMatchesMobileScope(projectId, expectedScope)
        ) return;
        const nextProjectsById = { ...projectsByIdRef.current };
        delete nextProjectsById[projectId];
        projectsByIdRef.current = nextProjectsById;
        projectsListRef.current = projectsListRef.current.filter((project) => project.projectId !== projectId);

        setProjectsById((prev) => {
            if (!isExpectedScope(expectedScope)) return prev;
            const next = { ...prev };
            delete next[projectId];
            return next;
        });
        if (isExpectedScope(expectedScope)) {
            setProjectsList(projectsListRef.current);
            setSelectedProjectId((prev) => prev === projectId ? null : prev);
        }
    }, [isExpectedScope]);

    const selectedProject = useMemo(
        () => (selectedProjectId ? projectsById[selectedProjectId] || null : null),
        [projectsById, selectedProjectId]
    );

    const selectedProjectSummary = useMemo(
        () => projectsList.find((project) => project.projectId === selectedProjectId) || null,
        [projectsList, selectedProjectId]
    );

    const hasCurrentHydratedScope = Boolean(
        currentScope
        && hasHydratedRef.current
        && hydratedScopeKeyRef.current === `${currentScope.tId}:${currentScope.sId}`
    );
    const value = useMemo<MobileProjectsContextValue>(() => ({
        isLoading: !hasCurrentHydratedScope || isLoading,
        projectsById: hasCurrentHydratedScope ? projectsById : {},
        projectsList: hasCurrentHydratedScope ? projectsList : [],
        refreshCachedProject,
        refreshProjects,
        removeCachedProject,
        selectedProject: hasCurrentHydratedScope ? selectedProject : null,
        selectedProjectId: hasCurrentHydratedScope ? selectedProjectId : null,
        selectedProjectSummary: hasCurrentHydratedScope ? selectedProjectSummary : null,
        selectProject,
        upsertCachedProject,
    }), [
        hasCurrentHydratedScope,
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
