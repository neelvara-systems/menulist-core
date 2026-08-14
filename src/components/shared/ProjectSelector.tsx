'use client'

import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { Button, Card, Flex, Tag, theme, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { ProjectAvatarImage } from './ProjectAvatarImage';
import type { SpecialMenuStatus } from '../templates/main-app/projects/types';
import { LuCheck, LuChevronDown, LuFolderOpen, LuMoreVertical, LuPlus, LuSparkles, LuXCircle } from 'react-icons/lu';

const { Text } = Typography;

export type ProjectSelectorItem = {
    id: string;
    name: string | Record<string, string>;
    isDefault?: boolean;
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    projectImage?: string | null;
    specialMenuBaseProjectId?: string;
    specialMenuBaseProjectName?: string | Record<string, string>;
    specialMenuEndsAt?: string;
    specialMenuStatus?: SpecialMenuStatus;
    secondaryLabel?: string | Record<string, string>;
};

type ProjectStatus = 'active' | 'inactive' | 'deleted';
type ResolvedSpecialMenuStatus = SpecialMenuStatus | null;

const getProjectStatus = (project: Pick<ProjectSelectorItem, 'active' | 'deleted'> | null | undefined): ProjectStatus => {
    if (project?.deleted === true) return 'deleted';
    if (project?.active === false) return 'inactive';
    return 'active';
};

const getStatusPresentation = (status: ProjectStatus, labels: { active: string; inactive: string; deleted: string }) => {
    if (status === 'deleted') {
        return { color: 'error' as const, icon: <LuXCircle size={13} />, label: labels.deleted };
    }
    if (status === 'inactive') {
        return { color: 'error' as const, icon: <LuXCircle size={13} />, label: labels.inactive };
    }
    return null;
};

const getResolvedSpecialMenuStatus = (
    project: Pick<ProjectSelectorItem, 'isSpecialMenu' | 'specialMenuEndsAt' | 'specialMenuStatus'> | null | undefined
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

const renderSpecialMenuTag = (status: ResolvedSpecialMenuStatus) => {
    if (!status) return null;
    if (status === 'expired') return <Tag color="warning" icon={<LuSparkles size={12} />}>Ended</Tag>;
    if (status === 'active') return <Tag color="success" icon={<LuSparkles size={12} />}>Special</Tag>;
    if (status === 'scheduled') return <Tag color="processing" icon={<LuSparkles size={12} />}>Special</Tag>;
    return <Tag icon={<LuSparkles size={12} />}>Cancelled</Tag>;
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
    emptyLabel?: string;
    helperText?: string;
    onClick?: () => void;
    rightContent?: React.ReactNode;
    clickable?: boolean;
}

export function ProjectSelectorTrigger({
    currentProject,
    emptyLabel,
    helperText,
    onClick,
    rightContent,
    clickable = false,
}: ProjectSelectorTriggerProps) {
    const t = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
    const projectName = currentProject
        ? getLocalizedText(currentProject.name, undefined, getPrimaryLocalizedLanguage(currentProject.name, 'en'), t('untitled'))
        : emptyLabel || t('untitled');
    const avatarColors = getAvatarColor(projectName);
    const projectStatus = getProjectStatus(currentProject);
    const statusPresentation = getStatusPresentation(projectStatus, {
        active: t('statusActive'),
        inactive: t('statusInactive'),
        deleted: t('statusDeleted'),
    });
    const specialMenuStatus = getResolvedSpecialMenuStatus(currentProject);
    const statusTag = statusPresentation ? (
        <Tag color={statusPresentation.color} style={{ marginInlineEnd: 0 }}>
            <Flex align="center" gap={4}>
                {statusPresentation.icon}
                <span>{statusPresentation.label}</span>
            </Flex>
        </Tag>
    ) : null;

    const content = (
        <Flex gap={0} style={{ width: '100%' }} vertical>
            <Flex align="center" justify="space-between" gap={10} style={{ minWidth: 0, width: '100%' }}>
                <Flex
                    align="center"
                    gap={10}
                    style={{ flex: 1, minWidth: 0 }}
                >
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
                            overflow: 'hidden',
                        }}
                    >
                        <ProjectAvatarImage projectImage={currentProject?.projectImage}>
                            {currentProject ? getInitials(projectName) : <LuFolderOpen size={14} />}
                        </ProjectAvatarImage>
                    </Flex>
                    <Text strong ellipsis>{projectName}</Text>
                </Flex>
                <Flex align="center" gap={8} wrap="wrap" justify="flex-end" style={{ flexShrink: 0 }}>
                    {renderSpecialMenuTag(specialMenuStatus)}
                    {statusTag}
                    {currentProject?.isDefault ? <Tag color="processing">{t('default')}</Tag> : null}
                    {rightContent}
                    {clickable ? <LuChevronDown color={token.colorTextSecondary} size={14} /> : null}
                </Flex>
            </Flex>

            {helperText ? (
                <Text type="secondary" style={{ fontSize: 12, paddingLeft: 42, textAlign: 'left' }}>
                    {helperText}
                </Text>
            ) : null}
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
                    borderColor: token.colorBorderSecondary,
                    background: token.colorBgContainer,
                    boxShadow: 'none',
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
    const t = useTranslations('MobileProjectSelector');
    const { token } = theme.useToken();
    const resolveText = (value: string | Record<string, string> | null | undefined, fallback = '') => (
        getLocalizedText(value, undefined, getPrimaryLocalizedLanguage(value, 'en'), fallback)
    );
    const baseProjectNameById = Object.fromEntries(projects.map((project) => [
        project.id,
        resolveText(project.name, t('untitled')),
    ]));

    return (
        <Flex gap={12} justify="flex-start" wrap="wrap">
            {projects.map((project) => {
                const projectName = resolveText(project.name, t('untitled'));
                const avatarColors = getAvatarColor(projectName || t('untitled'));
                const isSelected = project.id === currentProjectId;
                const projectStatus = getProjectStatus(project);
                const isInactive = projectStatus === 'inactive';
                const statusPresentation = getStatusPresentation(projectStatus, {
                    active: t('statusActive'),
                    inactive: t('statusInactive'),
                    deleted: t('statusDeleted'),
                });
                const specialMenuStatus = getResolvedSpecialMenuStatus(project);
                const baseProjectName = resolveText(
                    project.specialMenuBaseProjectName,
                    project.specialMenuBaseProjectId ? baseProjectNameById[project.specialMenuBaseProjectId] : '',
                );
                const secondaryLabel = resolveText(project.secondaryLabel);

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
                            opacity: isInactive ? 0.9 : 1,
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
                                style={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
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
                                    zIndex: 1,
                                }}
                            >
                                <LuCheck size={13} />
                            </Flex>
                        ) : null}

                        <Flex align="center" justify="center" style={{ marginBottom: 14 }}>
                            <Flex align="center" gap={8} justify="center" wrap="wrap" style={{ minWidth: 0 }}>
                                {renderSpecialMenuTag(specialMenuStatus)}
                                {statusPresentation ? (
                                    <Tag color={statusPresentation.color} style={{ marginInlineEnd: 0 }}>
                                        <Flex align="center" gap={4}>
                                            {statusPresentation.icon}
                                            <span>{statusPresentation.label}</span>
                                        </Flex>
                                    </Tag>
                                ) : null}
                            </Flex>
                        </Flex>

                        <Flex align="center" gap={12} justify="center" style={{ minHeight: 110, textAlign: 'center' }} vertical>
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
                                    overflow: 'hidden',
                                }}
                            >
                                <ProjectAvatarImage projectImage={project.projectImage}>
                                    {getInitials(projectName || t('untitled'))}
                                </ProjectAvatarImage>
                            </Flex>
                            <Flex align="center" gap={6} justify="center" wrap="wrap">
                                <Text strong style={{ fontSize: 16, textAlign: 'center' }}>
                                    {projectName || t('untitled')}
                                </Text>
                            </Flex>
                            {project.isSpecialMenu && baseProjectName ? (
                                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                                    From {baseProjectName}
                                </Text>
                            ) : null}
                            {project.isDefault ? (
                                <Tag color="processing" style={{ marginInlineEnd: 0 }}>
                                    {t('default')}
                                </Tag>
                            ) : null}
                            {secondaryLabel ? (
                                <Text type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
                                    {secondaryLabel}
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
                    <div style={{ minHeight: 26, marginBottom: 14 }} />
                    <Flex align="center" gap={12} justify="center" style={{ minHeight: 110, textAlign: 'center' }} vertical>
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
                            {t('createCatalog')}
                        </Text>
                    </Flex>
                </Card>
            ) : null}
        </Flex>
    );
}
