'use client'

import { BatchImageGenerationJobType, Project } from '@template/main-app/projects/types';
import { createContext, useEffect, useState } from 'react';

export type ProjectsDataProviderType = {

    activeProject: Project | null;
    setActiveProject: any;
    currentView: number;
    setCurrentView: any;
    activeBatchImageJob: BatchImageGenerationJobType;
    setActiveBatchImageJob: any;
}

const InititalState: ProjectsDataProviderType = {

    activeProject: null,
    setActiveProject: () => { },
    currentView: 1,
    setCurrentView: () => { },
    activeBatchImageJob: null,
    setActiveBatchImageJob: () => { },
}

export const ProjectsDataContext = createContext<ProjectsDataProviderType>(InititalState)

function ProjectsDataProvider({ children, contextData }: { children: any, contextData: ProjectsDataProviderType }) {
    const [contextState, setContextState] = useState(contextData)

    useEffect(() => {
        setContextState(contextData)
    }, [contextData])

    return (
        <ProjectsDataContext.Provider value={contextState} >
            {children}
        </ProjectsDataContext.Provider>
    )
}

export default ProjectsDataProvider