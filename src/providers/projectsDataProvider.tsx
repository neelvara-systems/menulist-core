'use client';

import type { BatchImageGenerationJobType, Project } from '@template/main-app/projects/types';
import {
    createContext,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from 'react';

export type ProjectsDataProviderType = {
    activeProject: Project | null;
    setActiveProject: (project: Project) => void;
    currentView: number;
    setCurrentView: Dispatch<SetStateAction<number>>;
    activeBatchImageJob: BatchImageGenerationJobType | null;
    setActiveBatchImageJob: Dispatch<SetStateAction<BatchImageGenerationJobType | null>>;
};

const INITIAL_STATE: ProjectsDataProviderType = {
    activeProject: null,
    setActiveProject: () => undefined,
    currentView: 1,
    setCurrentView: () => undefined,
    activeBatchImageJob: null,
    setActiveBatchImageJob: () => undefined,
};

export const ProjectsDataContext = createContext<ProjectsDataProviderType>(INITIAL_STATE);

function ProjectsDataProvider({
    children,
    contextData,
}: {
    children: ReactNode;
    contextData: ProjectsDataProviderType;
}) {
    return (
        <ProjectsDataContext.Provider value={contextData}>
            {children}
        </ProjectsDataContext.Provider>
    );
}

export default ProjectsDataProvider;
