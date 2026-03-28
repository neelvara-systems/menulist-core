import { Button, Dropdown, Flex, Modal, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { useState } from 'react';
// NOTE: Segmented and AnimatePresence removed - archive tabs functionality deprecated
import { IoChevronDown } from "react-icons/io5";
import { LuCheck, LuCopy, LuFolderOpen, LuMoreVertical, LuPen, LuPlus, LuTrash2 } from 'react-icons/lu';
import { ProjectMetadata } from '../types';

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

interface CatalogCardProps {
    project: ProjectMetadata;
    isSelected: boolean;
    token: any;
    onSelect: () => void;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    index: number;
}

const CatalogCard = ({
    project,
    isSelected,
    token,
    onSelect,
    onEdit,
    onDuplicate,
    onDelete,
    index
}: CatalogCardProps) => {
    const [isHovered, setIsHovered] = useState(false);
    const avatarColor = getAvatarColor(project.name);
    const initials = getInitials(project.name);

    const handleMenuClick = (info: { domEvent: React.MouseEvent }, action: () => void) => {
        info.domEvent.stopPropagation();
        action();
    };

    const menuItems = [
        { key: 'edit', label: 'Edit', icon: <LuPen size={14} />, onClick: (e: any) => handleMenuClick(e, onEdit) },
        { key: 'duplicate', label: 'Duplicate', icon: <LuCopy size={14} />, onClick: (e: any) => handleMenuClick(e, onDuplicate) },
        { type: 'divider' as const },
        { key: 'delete', label: 'Delete', icon: <LuTrash2 size={14} />, danger: true, onClick: (e: any) => handleMenuClick(e, onDelete) },
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
                    }}
                >
                    <Text style={{
                        color: avatarColor.text,
                        fontSize: 22,
                        fontWeight: 600,
                        letterSpacing: 1
                    }}>
                        {initials}
                    </Text>
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
                    {project.name}
                </Text>
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
    projects: ProjectMetadata[];
    selectedProject: ProjectMetadata | null;
    setSelectedProject: (project: ProjectMetadata | null) => void;
    onOpenModal: (project?: ProjectMetadata) => void;
    onDuplicateProject: (project: ProjectMetadata) => void;
    onDeleteProject: (project: ProjectMetadata) => void;
}

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

    const confirmDuplicate = (project: ProjectMetadata) => {
        setModalOpen(false);
        Modal.confirm({
            title: 'Duplicate Catalog',
            content: (
                <div>
                    <p>Create a copy of <strong>&quot;{project.name}&quot;</strong>?</p>
                    <p style={{ fontSize: 12, opacity: 0.7 }}>This will duplicate all files, items, and settings.</p>
                </div>
            ),
            okText: 'Duplicate',
            cancelText: 'Cancel',
            onOk: () => onDuplicateProject(project),
        });
    };

    const confirmDelete = (project: ProjectMetadata) => {
        setModalOpen(false);
        Modal.confirm({
            title: 'Delete Catalog',
            content: (
                <div>
                    <p>Permanently delete <strong>&quot;{project.name}&quot;</strong>?</p>
                    <p style={{ fontSize: 12, color: '#ff4d4f' }}>This action cannot be undone. All data will be lost.</p>
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
                {selectedProject ? selectedProject.name : 'Select Catalog'}
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
                        Select a Catalog
                    </Title>
                    <Text type="secondary" style={{ marginBottom: 24, textAlign: 'center' }}>
                        Choose a catalog to work with, or create a new one
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
                        {projects.filter(Boolean).map((project, index) => (
                            <CatalogCard
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
                                    onOpenModal(project);
                                    setModalOpen(false);
                                }}
                                onDuplicate={() => confirmDuplicate(project)}
                                onDelete={() => confirmDelete(project)}
                            />
                        ))}

                        <AddCatalogCard
                            token={token}
                            index={projects.length}
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
