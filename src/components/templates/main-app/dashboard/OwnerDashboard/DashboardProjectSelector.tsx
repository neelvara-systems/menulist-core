/**
 * Dashboard Project Selector
 * Simple project selector for Owner Dashboard.
 */

import { getExistingProjectsListWithoutLoader } from '@database/projects';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { resolveProjectImageUrl } from '@lib/image/projectImageDisplay';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { resolveSelectableProject } from '@lib/projects/projectSelection';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { ProjectMetadata, SpecialMenuStatus } from '@template/main-app/projects/types';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Flex, Skeleton, Tag, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo } from 'react';
import { LuCheck, LuChevronDown, LuFolderOpen, LuSparkles, LuXCircle } from 'react-icons/lu';
import useSWR from 'swr';

const { Text } = Typography;
const { useToken } = theme;

const AVATAR_COLOR_FACTORY: Array<(token: any) => { bg: string; text: string }> = [
    (token) => ({ bg: token.colorPrimaryBg, text: token.colorPrimary }),
    (token) => ({ bg: token.colorSuccessBg, text: token.colorSuccess }),
    (token) => ({ bg: token.colorWarningBg, text: token.colorWarning }),
    (token) => ({ bg: token.colorInfoBg, text: token.colorInfo }),
    (token) => ({ bg: token.colorErrorBg, text: token.colorError }),
];

const getAvatarColor = (name: string, token: any) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const factory = AVATAR_COLOR_FACTORY[Math.abs(hash) % AVATAR_COLOR_FACTORY.length];
    return factory(token);
};

const getInitials = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

interface Props {
    selectedProjectId: string | null;
    onProjectChange: (projectId: string, projectName: string) => void;
    onReady?: (resolvedProjectId: string | null) => void;
}

type DashboardProject = ProjectMetadata & {
    active?: boolean;
    isSpecialMenu?: boolean;
    specialMenuBaseProjectId?: string;
    specialMenuEndsAt?: string;
    specialMenuStatus?: SpecialMenuStatus;
};

type ProjectStatus = 'active' | 'inactive' | 'deleted';
type ResolvedSpecialMenuStatus = SpecialMenuStatus | null;
type DashboardTranslator = (key: string, values?: Record<string, string | number>) => string;

const resolveProjectName = (value: DashboardProject['name'] | undefined, fallback = 'Untitled') =>
    getLocalizedText(value, undefined, getPrimaryLocalizedLanguage(value, 'en'), fallback);

const getProjectStatus = (project: DashboardProject | null | undefined): ProjectStatus => {
    if ((project as any)?.deleted === true) return 'deleted';
    if (project?.active === false) return 'inactive';
    return 'active';
};

const getResolvedSpecialMenuStatus = (
    project: DashboardProject | null | undefined
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

const renderStatusTag = (status: ProjectStatus, t: DashboardTranslator) => {
    if (status === 'deleted') {
        return (
            <Tag color="error" style={{ marginInlineEnd: 0 }}>
                <Flex align="center" gap={4}>
                    <LuXCircle size={13} />
                    <span>{t('projectSelector.deleted')}</span>
                </Flex>
            </Tag>
        );
    }
    if (status === 'inactive') {
        return (
            <Tag color="error" style={{ marginInlineEnd: 0 }}>
                <Flex align="center" gap={4}>
                    <LuXCircle size={13} />
                    <span>{t('projectSelector.inactive')}</span>
                </Flex>
            </Tag>
        );
    }
    return null;
};

const renderSpecialMenuTag = (status: ResolvedSpecialMenuStatus, t: DashboardTranslator) => {
    if (!status) return null;

    if (status === 'expired') {
        return <Tag color="warning" icon={<LuSparkles size={12} />} style={{ marginInlineEnd: 0 }}>{t('projectSelector.ended')}</Tag>;
    }

    if (status === 'active') {
        return <Tag color="success" icon={<LuSparkles size={12} />} style={{ marginInlineEnd: 0 }}>{t('projectSelector.special')}</Tag>;
    }

    if (status === 'scheduled') {
        return <Tag color="processing" icon={<LuSparkles size={12} />} style={{ marginInlineEnd: 0 }}>{t('projectSelector.special')}</Tag>;
    }

    return <Tag icon={<LuSparkles size={12} />} style={{ marginInlineEnd: 0 }}>{t('projectSelector.cancelled')}</Tag>;
};

const renderDefaultTag = (isDefault: boolean | undefined, t: DashboardTranslator) => (
    isDefault ? <Tag color="processing" style={{ marginInlineEnd: 0 }}>{t('projectSelector.default')}</Tag> : null
);

export const DashboardProjectSelector: React.FC<Props> = ({
    selectedProjectId,
    onProjectChange,
    onReady,
}) => {
    const { token } = useToken();
    const t = useTranslations('Dashboard.owner');
    const session = useClientAuthSession();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const activeStoreScope = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const activeTenantScope = storeDetails?.tenantId ? String(storeDetails.tenantId) : session?.tId ? String(session.tId) : null;

    const sessionLoading = session === null;
    const sessionReady = session != null && activeStoreScope != null && activeTenantScope != null;

    const { data, isLoading } = useSWR(
        sessionReady ? `dashboard-projects-${activeTenantScope}-${activeStoreScope}` : null,
        () => getExistingProjectsListWithoutLoader(true),
        { dedupingInterval: 3600000, revalidateOnFocus: false }
    );

    const projects: DashboardProject[] = data?.projects || [];

    useEffect(() => {
        // Don't do anything while session is still loading
        if (sessionLoading) return;
        // Don't do anything while SWR is still fetching
        if (isLoading) return;

        const resolvedProject = resolveSelectableProject(projects, selectedProjectId);
        if (resolvedProject?.projectId && resolvedProject.projectId !== selectedProjectId) {
            onProjectChange(resolvedProject.projectId, resolveProjectName(resolvedProject.name, t('projectSelector.untitled')));
            onReady?.(resolvedProject.projectId);
            return;
        }

        // Session resolved + projects fetched (even if empty). Report the
        // validated selection so the parent can discard a stale browser value.
        onReady?.(resolvedProject?.projectId || null);
    }, [selectedProjectId, projects, sessionLoading, isLoading, onProjectChange, onReady, t]);

    const selectedProject = projects.find(p => p.projectId === selectedProjectId);
    const baseProjectNameById = useMemo(
        () => Object.fromEntries(projects.map((project) => [project.projectId, resolveProjectName(project.name, t('projectSelector.untitled'))])),
        [projects, t]
    );

    const menuItems: MenuProps['items'] = useMemo(() => {
        return projects.map((p) => ({
            key: p.projectId || resolveProjectName(p.name, t('projectSelector.untitled')),
            label: (
                <Flex align="center" gap={12}>
                    <Avatar
                        size={24}
                        src={resolveProjectImageUrl(p.projectImage) || undefined}
                        style={{ backgroundColor: getAvatarColor(resolveProjectName(p.name, t('projectSelector.untitled')), token).bg, fontSize: 10 }}
                    >
                        {getInitials(resolveProjectName(p.name, t('projectSelector.untitled')))}
                    </Avatar>
                    <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                        <Text>{resolveProjectName(p.name, t('projectSelector.untitled'))}</Text>
                        {p.isSpecialMenu && p.specialMenuBaseProjectId && baseProjectNameById[p.specialMenuBaseProjectId] ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t('projectSelector.fromBase', { name: baseProjectNameById[p.specialMenuBaseProjectId] })}
                            </Text>
                        ) : null}
                    </Flex>
                    {renderDefaultTag(p.isDefault, t)}
                    {renderSpecialMenuTag(getResolvedSpecialMenuStatus(p), t)}
                    {renderStatusTag(getProjectStatus(p), t)}
                    {p.projectId === selectedProjectId && <LuCheck size={14} color={token.colorPrimary} />}
                </Flex>
            ),
            onClick: () => p.projectId && onProjectChange(p.projectId, resolveProjectName(p.name, t('projectSelector.untitled'))),
        }));
    }, [
        baseProjectNameById,
        projects,
        selectedProjectId,
        onProjectChange,
        token.colorPrimary,
        token.colorPrimaryBg,
        token.colorSuccessBg,
        token.colorWarningBg,
        token.colorInfoBg,
        token.colorErrorBg,
        token.colorFillTertiary,
        token.colorTextSecondary,
        token.colorBorder,
        t,
    ]);

    if (isLoading) return <Skeleton.Input active size="small" style={{ width: 150 }} />;
    if (!projects.length) return <Text type="secondary">{t('projectSelector.noCatalogs')}</Text>;

    const color = selectedProject
        ? getAvatarColor(resolveProjectName(selectedProject.name, t('projectSelector.untitled')), token)
        : { bg: token.colorFillTertiary, text: token.colorTextSecondary };

    return (
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomLeft">
            <Flex
                align="center"
                gap={10}
                style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: token.colorFillQuaternary,
                    border: `1px solid ${token.colorBorder}`,
                }}
            >
                <Avatar
                    size={28}
                    src={resolveProjectImageUrl(selectedProject?.projectImage) || undefined}
                    style={{ backgroundColor: color.bg, color: color.text, fontSize: 11 }}
                >
                    {selectedProject ? getInitials(resolveProjectName(selectedProject.name, t('projectSelector.untitled'))) : <LuFolderOpen size={14} />}
                </Avatar>
                <Flex vertical style={{ minWidth: 0 }}>
                    <Text strong style={{ maxWidth: 150 }} ellipsis>
                        {selectedProject ? resolveProjectName(selectedProject.name, t('projectSelector.untitled')) : t('projectSelector.selectCatalog')}
                    </Text>
                    {selectedProject?.isSpecialMenu && selectedProject.specialMenuBaseProjectId && baseProjectNameById[selectedProject.specialMenuBaseProjectId] ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {t('projectSelector.fromBase', { name: baseProjectNameById[selectedProject.specialMenuBaseProjectId] })}
                        </Text>
                    ) : null}
                </Flex>
                {renderDefaultTag(selectedProject?.isDefault, t)}
                {renderSpecialMenuTag(getResolvedSpecialMenuStatus(selectedProject), t)}
                {renderStatusTag(getProjectStatus(selectedProject), t)}
                <LuChevronDown size={14} color={token.colorTextSecondary} />
            </Flex>
        </Dropdown>
    );
};

export default DashboardProjectSelector;
