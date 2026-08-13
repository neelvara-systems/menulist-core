import { useOfferingLabels } from '@hook/useOfferingLabels';
import { ProjectAvatarImage } from '@/components/shared/ProjectAvatarImage';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { Button, Dropdown, Flex, Modal, Tag, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { useMemo, useState, type CSSProperties } from 'react';
// NOTE: Segmented and AnimatePresence removed - archive tabs functionality deprecated
import { IoChevronDown } from "react-icons/io5";
import { LuCheck, LuCopy, LuFolderOpen, LuMoreVertical, LuPen, LuPlus, LuSparkles, LuTrash2, LuXCircle } from 'react-icons/lu';
import { ProjectMetadata, SpecialMenuStatus } from '../types';

const { Text, Title } = Typography;
const { useToken } = theme;

// Generate consistent color from string (like Chrome does)
const AVATAR_COLORS = [
    { bg: '#E91E63', text: '#fff' }, // Pink
    { bg: '#9C27B0', text: '#fff' }, // Purple
    { bg: '#673AB7', text: '#fff' }, // Deep Purple
    { bg: '#3F51B5', text: '#fff' }, // Indigo
    { bg: '#2196F3', text: '#fff' }, // Blue
    { bg: '#00BCD4', text: '#fff' }, // Cyan
    { bg: '#009688', text: '#fff' }, // Teal
    { bg: '#4CAF50', text: '#fff' }, // Green
    { bg: '#FF9800', text: '#fff' }, // Orange
    { bg: '#FF5722', text: '#fff' }, // Deep Orange
];

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

type ProjectStatus = 'active' | 'inactive' | 'deleted';
type ResolvedSpecialMenuStatus = SpecialMenuStatus | null;
type SelectorProjectMetadata = ProjectMetadata & {
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: SpecialMenuStatus;
};

const getProjectStatus = (project: SelectorProjectMetadata | null | undefined): ProjectStatus => {
    if ((project as any)?.deleted === true) return 'deleted';
    if ((project as any)?.active === false) return 'inactive';
    return 'active';
};

const getStatusPresentation = (status: ProjectStatus) => {
    if (status === 'deleted') {
        return { color: 'error' as const, icon: <LuXCircle size={13} />, label: 'Deleted' };
    }
    if (status === 'inactive') {
        return { color: 'error' as const, icon: <LuXCircle size={13} />, label: 'Inactive' };
    }
    return null;
};

const getResolvedSpecialMenuStatus = (
    project: SelectorProjectMetadata | null | undefined
): ResolvedSpecialMenuStatus => {
    if (!project?.isSpecialMenu) return null;
    if (project.specialMenuStatus === 'cancelled') return 'cancelled';
    if (project.specialMenuStatus === 'expired') return 'expired';

    const endsAtMs = project.specialMenuEndsAt ? new Date(project.specialMenuEndsAt).getTime() : null;
    if (endsAtMs != null && Number.isFinite(endsAtMs) && endsAtMs <= Date.now()) {
        return 'expired';
    }

    return project.specialMenuStatus || 'scheduled';
};

const renderSpecialMenuTag = (status: ResolvedSpecialMenuStatus, style?: CSSProperties) => {
    if (!status) return null;
    if (status === 'expired') return <Tag color="warning" icon={<LuSparkles size={12} />} style={style}>Ended</Tag>;
    if (status === 'active') return <Tag color="success" icon={<LuSparkles size={12} />} style={style}>Special</Tag>;
    if (status === 'scheduled') return <Tag color="processing" icon={<LuSparkles size={12} />} style={style}>Special</Tag>;
    return <Tag icon={<LuSparkles size={12} />} style={style}>Cancelled</Tag>;
};

interface CatalogCardProps {
    project: SelectorProjectMetadata;
    isSelected: boolean;
    token: any;
    onSelect: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    index: number;
    baseProjectName?: string | null;
}

const CatalogCard = ({
    project,
    isSelected,
    token,
    onSelect,
    onEdit,
    onDuplicate,
    onDelete,
    index,
    baseProjectName,
}: CatalogCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const primaryLanguage = getPrimaryLocalizedLanguage(project.name, 'en');
    const projectName = getLocalizedText(project.name, undefined, primaryLanguage, 'Untitled');
    const avatarColor = getAvatarColor(projectName);
    const initials = getInitials(projectName);
    const projectStatus = getProjectStatus(project);
    const isInactive = projectStatus === 'inactive';
    const statusPresentation = getStatusPresentation(projectStatus);
    const specialMenuStatus = getResolvedSpecialMenuStatus(project);
    const canDeleteProject = project.isSpecialMenu !== true
        || project.specialMenuStatus === 'expired'
        || project.specialMenuStatus === 'cancelled';

    const handleMenuClick = (info: { domEvent: React.MouseEvent }, action: () => void) => {
        info.domEvent.stopPropagation();
        action();
    };

    const menuItems = [
        { key: 'edit', label: 'Edit', icon: <LuPen size={14} />, onClick: (e: any) => handleMenuClick(e, onEdit) },
        ...(project.isSpecialMenu ? [] : [
            { key: 'duplicate', label: 'Duplicate', icon: <LuCopy size={14} />, onClick: (e: any) => handleMenuClick(e, onDuplicate) },
        ]),
        ...(canDeleteProject ? [
            { type: 'divider' as const },
            { key: 'delete', label: 'Delete', icon: <LuTrash2 size={14} />, danger: true, onClick: (e: any) => handleMenuClick(e, onDelete) },
        ] : []),
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
        >
            <Flex
                vertical
                align="center"
                style={{
                    padding: 16,
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isSelected ? token.colorPrimaryBg : (isHovered ? token.colorFillSecondary : token.colorFillQuaternary),
                    border: isSelected ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minWidth: 120,
                    maxWidth: 140,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onSelect}
            >
                {/* 3-dot menu - top right */}
                <Dropdown
                    menu={{ items: menuItems }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<LuMoreVertical size={14} />}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            opacity: isHovered ? 0.8 : 0,
                            transition: 'opacity 0.2s',
                        }}
                    />
                </Dropdown>

                {/* Selected checkmark */}
                {isSelected && (
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: token.colorPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <LuCheck size={12} color="#fff" />
                    </div>
                )}

                {projectStatus !== 'active' && statusPresentation && (
                    <Tag
                        color={statusPresentation.color}
                        style={{
                            position: 'absolute',
                            top: 8,
                            left: isSelected ? 34 : 8,
                            margin: 0,
                        }}
                    >
                        <Flex align="center" gap={4}>
                            {statusPresentation.icon}
                            <span>{statusPresentation.label}</span>
                        </Flex>
                    </Tag>
                )}

                {/* Avatar */}
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: avatarColor.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        boxShadow: isSelected ? `0 0 0 3px ${token.colorPrimaryBg}` : 'none',
                        transition: 'all 0.2s ease',
                        overflow: 'hidden',
                    }}
                >
                    <ProjectAvatarImage projectImage={project.projectImage}>
                        <Text style={{
                            color: avatarColor.text,
                            fontSize: 22,
                            fontWeight: 600,
                            letterSpacing: 1
                        }}>
                            {initials}
                        </Text>
                    </ProjectAvatarImage>
                </div>

                {/* Name */}
                <Text
                    strong
                    ellipsis
                    style={{
                        fontSize: 13,
                        textAlign: 'center',
                        maxWidth: '100%',
                        lineHeight: 1.3,
                    }}
                >
                    {projectName}
                </Text>
                {project.isSpecialMenu && baseProjectName ? (
                    <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                        From {baseProjectName}
                    </Text>
                ) : null}
                {project.isDefault ? (
                    <Tag color="processing" style={{ marginTop: 6, marginInlineEnd: 0 }}>
                        Default
                    </Tag>
                ) : null}
                {renderSpecialMenuTag(specialMenuStatus, { marginTop: 6, marginInlineEnd: 0 })}
                {statusPresentation ? (
                    <Tag
                        color={statusPresentation.color}
                        style={{ marginTop: 6, marginInlineEnd: 0 }}
                    >
                        <Flex align="center" gap={4}>
                            {statusPresentation.icon}
                            <span>{statusPresentation.label}</span>
                        </Flex>
                    </Tag>
                ) : null}
            </Flex>
        </motion.div>
    );
};

// Add New Card
const AddCatalogCard = ({ token, onClick, index }: { token: any; onClick: () => void; index: number }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
        >
            <Flex
                vertical
                align="center"
                justify="center"
                style={{
                    padding: 16,
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: isHovered ? token.colorFillSecondary : 'transparent',
                    border: `2px dashed ${token.colorBorder}`,
                    transition: 'all 0.2s ease',
                    minWidth: 120,
                    maxWidth: 140,
                    minHeight: 130,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={onClick}
            >
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        background: token.colorFillTertiary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                    }}
                >
                    <LuPlus size={28} color={token.colorTextSecondary} />
                </div>
                <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    Add
                </Text>
            </Flex>
        </motion.div>
    );
};

interface ProjectSelectorProps {
    projects: SelectorProjectMetadata[];
    selectedProject: SelectorProjectMetadata | null;
    setSelectedProject: (project: SelectorProjectMetadata | null) => void;
    onOpenModal: (project?: SelectorProjectMetadata) => void;
    onDuplicateProject: (project: SelectorProjectMetadata) => void;
    onDeleteProject: (project: SelectorProjectMetadata) => void;
}

const normalizeSelectorProjects = (projects: unknown): SelectorProjectMetadata[] => {
    if (Array.isArray(projects)) {
        return projects.filter(Boolean) as SelectorProjectMetadata[];
    }

    if (!projects || typeof projects !== 'object') {
        return [];
    }

    return Object.entries(projects as Record<string, any>)
        .filter(([, project]) => project && typeof project === 'object')
        .map(([projectId, project]) => ({
            ...project,
            projectId: project.projectId || projectId,
        })) as SelectorProjectMetadata[];
};

export const ProjectSelector = ({
    projects,
    selectedProject,
    setSelectedProject,
    onOpenModal,
    onDuplicateProject,
    onDeleteProject,
}: ProjectSelectorProps) => {
    const { token } = useToken();
    const [modalOpen, setModalOpen] = useState(false);
    const labels = useOfferingLabels();
    const offeringName = labels.offeringPhrase.charAt(0).toUpperCase() + labels.offeringPhrase.slice(1);
    const safeProjects = useMemo(() => normalizeSelectorProjects(projects), [projects]);
    const baseProjectNameById = useMemo(
        () => Object.fromEntries(safeProjects.map((project) => [
            project.projectId,
            getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled'),
        ])),
        [safeProjects]
    );
    const selectedStatus = getProjectStatus(selectedProject);
    const selectedStatusPresentation = getStatusPresentation(selectedStatus);
    const selectedSpecialMenuStatus = getResolvedSpecialMenuStatus(selectedProject);
    const selectedBaseProjectName = selectedProject?.specialMenuBaseProjectId
        ? baseProjectNameById[selectedProject.specialMenuBaseProjectId]
        : null;

    const confirmDuplicate = (project: SelectorProjectMetadata) => {
        setModalOpen(false);
        const projectName = getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled');
        Modal.confirm({
            title: `Duplicate ${offeringName}`,
            content: (
                <div>
                    <p>Create a copy of <strong>&quot;{projectName}&quot;</strong>?</p>
                    <p style={{ fontSize: 12, opacity: 0.7 }}>This will duplicate all files, {labels.itemsPlural}, and settings.</p>
                </div>
            ),
            okText: 'Duplicate',
            cancelText: 'Cancel',
            onOk: () => onDuplicateProject(project),
        });
    };

    const confirmDelete = (project: SelectorProjectMetadata) => {
        setModalOpen(false);
        const projectName = getLocalizedText(project.name, undefined, getPrimaryLocalizedLanguage(project.name, 'en'), 'Untitled');
        Modal.confirm({
            title: `Delete ${offeringName}`,
            content: (
                <div>
                    <p>Permanently delete <strong>&quot;{projectName}&quot;</strong>?</p>
                    <p style={{ fontSize: 12, color: '#ff4d4f' }}>
                        Customers will no longer see this {labels.offeringLower}. This action cannot be undone. All {labels.offeringPhrase} data will be lost.
                    </p>
                </div>
            ),
            okText: 'Delete',
            okButtonProps: { danger: true },
            cancelText: 'Cancel',
            onOk: () => onDeleteProject(project),
        });
    };

    return (
        <>
            {/* Trigger Button */}
            <Button type="default" icon={<LuFolderOpen size={18} />} onClick={() => setModalOpen(true)}>
                <Flex align="center" gap={8}>
                    <Flex vertical gap={0}>
                        <span>{selectedProject ? getLocalizedText(selectedProject.name, undefined, getPrimaryLocalizedLanguage(selectedProject.name, 'en'), `Select ${offeringName}`) : `Select ${offeringName}`}</span>
                        {selectedProject?.isSpecialMenu && selectedBaseProjectName ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                From {selectedBaseProjectName}
                            </Text>
                        ) : null}
                    </Flex>
                    {selectedProject ? (
                        <>
                            {selectedProject.isDefault ? (
                                <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                                    Default
                                </Tag>
                            ) : null}
                            {renderSpecialMenuTag(selectedSpecialMenuStatus, { marginInlineEnd: 0 })}
                        </>
                    ) : null}
                    {selectedProject && selectedStatusPresentation ? (
                        <Tag
                            color={selectedStatusPresentation.color}
                            style={{ marginInlineEnd: 0 }}
                        >
                            <Flex align="center" gap={4}>
                                {selectedStatusPresentation.icon}
                                <span>{selectedStatusPresentation.label}</span>
                            </Flex>
                        </Tag>
                    ) : null}
                </Flex>
                <IoChevronDown style={{ marginLeft: 8 }} />
            </Button>

            {/* Chrome-style Catalog Picker Modal */}
            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                footer={null}
                width={680}
                centered
                closeIcon={null}
                styles={{
                    content: {
                        padding: 0,
                        borderRadius: 16,
                        overflow: 'hidden',
                    },
                    body: {
                        padding: 0,
                    }
                }}
            >
                <Flex
                    vertical
                    align="center"
                    style={{
                        padding: '32px 24px 24px',
                        background: token.colorBgContainer,
                    }}
                >
                    {/* Header */}
                    <Title level={4} style={{ marginBottom: 8 }}>
                        Select {offeringName}
                    </Title>
                    <Text type="secondary" style={{ marginBottom: 24, textAlign: 'center' }}>
                        Choose the {labels.offeringPhrase} you want to work with, or create a new one
                    </Text>

                    {/* Grid of Catalog Cards */}
                    <Flex
                        wrap="wrap"
                        gap={16}
                        justify="center"
                        style={{
                            maxHeight: 400,
                            overflowY: 'auto',
                            padding: '4px 0',
                        }}
                    >
                        {safeProjects.map((project, index) => (
                            <CatalogCard
                                baseProjectName={project.specialMenuBaseProjectId ? baseProjectNameById[project.specialMenuBaseProjectId] : null}
                                key={project.projectId || index}
                                project={project}
                                isSelected={selectedProject?.projectId === project.projectId}
                                token={token}
                                index={index}
                                onSelect={() => {
                                    setSelectedProject(project);
                                    setModalOpen(false);
                                }}
                                onEdit={() => {
                                    setModalOpen(false);
                                    onOpenModal(project);
                                }}
                                onDuplicate={() => confirmDuplicate(project)}
                                onDelete={() => confirmDelete(project)}
                            />
                        ))}

                        <AddCatalogCard
                            token={token}
                            index={safeProjects.length}
                            onClick={() => {
                                onOpenModal();
                                setModalOpen(false);
                            }}
                        />
                    </Flex>
                </Flex>
            </Modal>
        </>
    );
};
