'use client'

import { Button, Card, Flex, Tag, theme, Typography } from 'antd';
import { LuCheck, LuChevronDown, LuFolderOpen, LuMoreVertical, LuPlus } from 'react-icons/lu';

const { Text } = Typography;

export type ProjectSelectorItem = {
    id: string;
    name: string;
    isDefault?: boolean;
    secondaryLabel?: string;
};

const AVATAR_COLORS = [
    { bg: '#E91E63', text: '#fff' },
    { bg: '#9C27B0', text: '#fff' },
    { bg: '#2196F3', text: '#fff' },
    { bg: '#4CAF50', text: '#fff' },
    { bg: '#FF9800', text: '#fff' },
];

const getAvatarColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i += 1) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

interface ProjectSelectorTriggerProps {
    currentProject: ProjectSelectorItem | null;
    helperText?: string;
    onClick?: () => void;
    rightContent?: React.ReactNode;
    clickable?: boolean;
}

export function ProjectSelectorTrigger({
    currentProject,
    helperText,
    onClick,
    rightContent,
    clickable = false,
}: ProjectSelectorTriggerProps) {
    const { token } = theme.useToken();
    const projectName = currentProject?.name || 'Untitled';
    const avatarColors = getAvatarColor(projectName);

    const content = (
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
            <Flex align="center" gap={10}>
                <Flex
                    align="center"
                    justify="center"
                    style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: avatarColors.bg,
                        color: avatarColors.text,
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                    }}
                >
                    {currentProject ? getInitials(projectName) : <LuFolderOpen size={14} />}
                </Flex>
                <Flex vertical gap={0}>
                    <Text strong>{projectName}</Text>
                    {helperText ? <Text type="secondary" style={{ fontSize: 12 }}>{helperText}</Text> : null}
                </Flex>
            </Flex>
            <Flex align="center" gap={8}>
                {currentProject?.isDefault ? <Tag color="processing">Default</Tag> : null}
                {rightContent}
                {clickable ? <LuChevronDown color={token.colorTextSecondary} size={14} /> : null}
            </Flex>
        </Flex>
    );

    if (clickable) {
        return (
            <Button
                block
                onClick={onClick}
                size="large"
                style={{
                    height: 'auto',
                    justifyContent: 'flex-start',
                    paddingBlock: 10,
                    paddingInline: 14,
                    borderColor: token.colorBorder,
                    background: token.colorFillQuaternary,
                }}
            >
                {content}
            </Button>
        );
    }

    return (
        <Card size="small">
            {content}
        </Card>
    );
}

interface ProjectSelectorListProps {
    currentProjectId?: string | null;
    onSelect: (projectId: string) => void;
    projects: ProjectSelectorItem[];
    onCreate?: () => void;
    onManage?: (projectId: string) => void;
}

export function ProjectSelectorList({ currentProjectId, onCreate, onManage, onSelect, projects }: ProjectSelectorListProps) {
    const { token } = theme.useToken();

    return (
        <Flex gap={12} justify="flex-start" wrap="wrap">
            {projects.map((project) => {
                const avatarColors = getAvatarColor(project.name || 'Untitled');
                const isSelected = project.id === currentProjectId;

                return (
                    <Card
                        key={project.id}
                        hoverable
                        onClick={() => onSelect(project.id)}
                        size="small"
                        style={{
                            width: 'calc(50% - 6px)',
                            maxWidth: 'calc(50% - 6px)',
                            minHeight: 156,
                            cursor: 'pointer',
                            borderRadius: 16,
                            borderWidth: 2,
                            borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                            background: isSelected ? token.colorPrimaryBg : token.colorBgContainer,
                            boxShadow: 'none',
                            position: 'relative',
                        }}
                    >
                        {onManage ? (
                            <Button
                                onClick={(event) => {
                                    event.stopPropagation();
                                    onManage(project.id);
                                }}
                                size="small"
                                style={{ position: 'absolute', right: 6, top: 6, zIndex: 1 }}
                                type="text"
                            >
                                <LuMoreVertical size={16} />
                            </Button>
                        ) : null}

                        {isSelected ? (
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    position: 'absolute',
                                    top: 10,
                                    left: 10,
                                    width: 22,
                                    height: 22,
                                    borderRadius: '50%',
                                    background: token.colorPrimary,
                                    color: '#fff',
                                }}
                            >
                                <LuCheck size={13} />
                            </Flex>
                        ) : null}

                        <Flex align="center" gap={12} justify="center" style={{ minHeight: 124, textAlign: 'center' }} vertical>
                            <Flex
                                align="center"
                                justify="center"
                                style={{
                                    width: 72,
                                    height: 72,
                                    borderRadius: '50%',
                                    backgroundColor: avatarColors.bg,
                                    color: avatarColors.text,
                                    fontSize: 24,
                                    fontWeight: 700,
                                    flexShrink: 0,
                                }}
                            >
                                {getInitials(project.name || 'Untitled')}
                            </Flex>
                            <Flex align="center" gap={6} justify="center" wrap="wrap">
                                <Text strong style={{ fontSize: 16, textAlign: 'center' }}>
                                    {project.name || 'Untitled'}
                                </Text>
                                {project.isDefault ? <Tag color="processing">Default</Tag> : null}
                            </Flex>
                            {project.secondaryLabel ? (
                                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                                    {project.secondaryLabel}
                                </Text>
                            ) : null}
                        </Flex>
                    </Card>
                );
            })}

            {onCreate ? (
                <Card
                    hoverable
                    onClick={onCreate}
                    size="small"
                    style={{
                        width: 'calc(50% - 6px)',
                        maxWidth: 'calc(50% - 6px)',
                        minHeight: 156,
                        cursor: 'pointer',
                        borderRadius: 16,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: token.colorBorder,
                        background: token.colorBgContainer,
                        boxShadow: 'none',
                    }}
                >
                    <Flex align="center" gap={12} justify="center" style={{ minHeight: 124, textAlign: 'center' }} vertical>
                        <Flex
                            align="center"
                            justify="center"
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: '50%',
                                backgroundColor: token.colorFillTertiary,
                                color: token.colorTextSecondary,
                                flexShrink: 0,
                            }}
                        >
                            <LuPlus size={32} />
                        </Flex>
                        <Text strong style={{ fontSize: 16, textAlign: 'center' }}>
                            Add
                        </Text>
                    </Flex>
                </Card>
            ) : null}
        </Flex>
    );
}
