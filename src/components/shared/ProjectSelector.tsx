'use client'

import { Button, Card, Flex, List, Tag, theme, Typography } from 'antd';
import { LuCheck, LuLayers } from 'react-icons/lu';

const { Text } = Typography;

export type ProjectSelectorItem = {
    id: string;
    name: string;
    isDefault?: boolean;
    secondaryLabel?: string;
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

    const content = (
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
            <Flex align="center" gap={10}>
                <LuLayers color={token.colorPrimary} size={18} />
                <Flex vertical gap={0}>
                    <Text strong>{currentProject?.name || 'Untitled'}</Text>
                    {helperText ? <Text type="secondary" style={{ fontSize: 12 }}>{helperText}</Text> : null}
                </Flex>
            </Flex>
            <Flex align="center" gap={8}>
                {currentProject?.isDefault ? <Tag color="processing">Default</Tag> : null}
                {rightContent}
            </Flex>
        </Flex>
    );

    if (clickable) {
        return (
            <Button
                block
                onClick={onClick}
                size="large"
                style={{ height: 'auto', justifyContent: 'flex-start', paddingBlock: 10, paddingInline: 14 }}
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
}

export function ProjectSelectorList({ currentProjectId, onSelect, projects }: ProjectSelectorListProps) {
    const { token } = theme.useToken();

    return (
        <List
            dataSource={projects}
            renderItem={(project) => (
                <List.Item
                    onClick={() => onSelect(project.id)}
                    style={{ cursor: 'pointer', paddingInline: 0 }}
                >
                    <List.Item.Meta
                        avatar={<LuLayers color={token.colorPrimary} size={18} />}
                        title={(
                            <Flex align="center" gap={8}>
                                <Text strong>{project.name || 'Untitled'}</Text>
                                {project.isDefault ? <Tag color="processing">Default</Tag> : null}
                            </Flex>
                        )}
                        description={project.secondaryLabel ? <Text type="secondary">{project.secondaryLabel}</Text> : null}
                    />
                    {project.id === currentProjectId ? <LuCheck color={token.colorPrimary} size={18} /> : null}
                </List.Item>
            )}
        />
    );
}
