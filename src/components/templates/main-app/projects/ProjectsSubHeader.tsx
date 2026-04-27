import { DEVICE_TYPES_LIST } from "@constant/builder";
import { Button, Flex, Space, theme, Tooltip } from "antd";
import { LuArrowLeft, LuEye, LuMonitor, LuRectangleVertical, LuShare, LuTablet, LuUploadCloud } from "react-icons/lu";
import { DeviceTypes } from "./b2cView/types";
import { ProjectSelector } from "./ProjectDetails/ProjectSelector";
import { ProjectMetadata } from "./types";

interface ProjectsSubHeaderProps {
    currentView: number;
    setCurrentView: (view: number) => void;

    // Project selector props
    projects: ProjectMetadata[];
    selectedProject: ProjectMetadata | null;
    setSelectedProject: (project: ProjectMetadata | null) => void;
    onOpenModal: (project?: ProjectMetadata) => void;
    onDuplicateProject: (project: ProjectMetadata) => void;
    onDeleteProject: (project: ProjectMetadata) => void;
    onSetDefaultProject: (project: ProjectMetadata) => void;

    // Device type props (for UI Editor view)
    activeDeviceType?: DeviceTypes;
    setActiveDeviceType?: (type: DeviceTypes) => void;

    // Actions
    onPreview?: () => void;
    onShare?: () => void;
    onPublish?: () => void;
    hasChanges?: boolean;
    canPublish?: boolean;
}

export default function ProjectsSubHeader({
    currentView,
    setCurrentView,
    projects,
    selectedProject,
    setSelectedProject,
    onOpenModal,
    onDuplicateProject,
    onDeleteProject,
    onSetDefaultProject,
    activeDeviceType,
    setActiveDeviceType,
    onPreview,
    onShare,
    onPublish,
    hasChanges = false,
    canPublish = true,
}: ProjectsSubHeaderProps) {
    const { token } = theme.useToken();
    const isUIEditorView = currentView === 3;

    return (
        <Flex
            align="center"
            justify="space-between"
            style={{
                width: '100%',
                padding: 8,
                background: token.colorBgContainer,
                minHeight: 48,
                borderRadius: 4
            }}
        >
            {/* Left: Back button (UI Editor only) + Device buttons (UI Editor only) + Project Selector */}
            <Flex align="center" gap={12}>
                {/* Back button - only in UI Editor view */}
                {isUIEditorView && (
                    <Tooltip title="Back to Editor">
                        <Button shape="circle" icon={<LuArrowLeft />} onClick={() => setCurrentView(2)} />
                    </Tooltip>
                )}

                {/* Project Selector - Chrome-style modal */}
                <ProjectSelector
                    projects={projects}
                    selectedProject={selectedProject}
                    setSelectedProject={setSelectedProject}
                    onOpenModal={onOpenModal}
                    onDuplicateProject={onDuplicateProject}
                    onDeleteProject={onDeleteProject}
                    onSetDefaultProject={onSetDefaultProject}
                />
            </Flex>

            {/* Device type buttons - only in UI Editor view */}
            {isUIEditorView && activeDeviceType && setActiveDeviceType && (
                <Space size={4}>
                    <Tooltip title="Desktop View">
                        <Button
                            shape="circle"
                            type={activeDeviceType === DEVICE_TYPES_LIST.DESKTOP ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.DESKTOP)}
                            icon={<LuMonitor />}
                        />
                    </Tooltip>
                    <Tooltip title="Tablet View">
                        <Button
                            shape="circle"
                            type={activeDeviceType === DEVICE_TYPES_LIST.TABLET ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.TABLET)}
                            icon={<LuTablet />}
                        />
                    </Tooltip>
                    <Tooltip title="Mobile View">
                        <Button
                            shape="circle"
                            type={activeDeviceType === DEVICE_TYPES_LIST.MOBILE ? 'primary' : 'default'}
                            onClick={() => setActiveDeviceType(DEVICE_TYPES_LIST.MOBILE)}
                            icon={<LuRectangleVertical />}
                        />
                    </Tooltip>
                </Space>
            )}

            {/* Right: Preview + Share (both views) + Publish (UI Editor only) */}
            <Flex align="center" gap={8}>
                {onPreview && (
                    <Button icon={<LuEye />} onClick={onPreview}>Preview</Button>
                )}
                {onShare && (
                    <Button icon={<LuShare />} onClick={onShare}>
                        Share
                    </Button>
                )}
                {/* Publish button - only in UI Editor view */}
                {isUIEditorView && onPublish && (
                    <Tooltip title={!hasChanges ? "No changes to publish" : ""}>
                        <Button
                            type="primary"
                            ghost
                            icon={<LuUploadCloud />}
                            onClick={onPublish}
                            disabled={!hasChanges || !canPublish}
                        >
                            Publish
                        </Button>
                    </Tooltip>
                )}
            </Flex>
        </Flex>
    );
}
