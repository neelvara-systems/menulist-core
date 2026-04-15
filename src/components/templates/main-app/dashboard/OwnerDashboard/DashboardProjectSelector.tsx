/**
 * Dashboard Project Selector
 * Simple project selector for Owner Dashboard.
 */

import { getMetadataProjectsList } from '@database/projects';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { ProjectMetadata } from '@template/main-app/projects/types';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Flex, Skeleton, Typography, theme } from 'antd';
import { useEffect, useMemo } from 'react';
import { LuCheck, LuChevronDown, LuFolderOpen } from 'react-icons/lu';
import useSWR from 'swr';

const { Text } = Typography;
const { useToken } = theme;

const AVATAR_COLORS = [
    { bg: '#E91E63', text: '#fff' },
    { bg: '#9C27B0', text: '#fff' },
    { bg: '#2196F3', text: '#fff' },
    { bg: '#4CAF50', text: '#fff' },
    { bg: '#FF9800', text: '#fff' },
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
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
};

interface Props {
    selectedProjectId: string | null;
    onProjectChange: (projectId: string, projectName: string) => void;
    onReady?: () => void;
}

export const DashboardProjectSelector: React.FC<Props> = ({
    selectedProjectId,
    onProjectChange,
    onReady,
}) => {
    const { token } = useToken();
    const session = useClientAuthSession();

    const sessionLoading = session === null;
    const sessionReady = session != null && session.sId != null && session.tId != null;

    const { data, isLoading } = useSWR(
        sessionReady ? `dashboard-projects-${session!.tId}-${session!.sId}` : null,
        () => getMetadataProjectsList(),
        { dedupingInterval: 3600000, revalidateOnFocus: false, revalidateOnMount: false }
    );

    const projects: ProjectMetadata[] = data?.projects || [];

    useEffect(() => {
        // Don't do anything while session is still loading
        if (sessionLoading) return;
        // Don't do anything while SWR is still fetching
        if (isLoading) return;

        if (!selectedProjectId && projects.length > 0) {
            const def = projects.find(p => p.isDefault) || projects[0];
            if (def.projectId) {
                onProjectChange(def.projectId, def.name);
                return;
            }
        }

        // Session resolved + projects fetched (even if empty) — unblock dashboard
        onReady?.();
    }, [selectedProjectId, projects, sessionLoading, isLoading, onProjectChange, onReady]);

    const selectedProject = projects.find(p => p.projectId === selectedProjectId);

    const menuItems: MenuProps['items'] = useMemo(() => {
        return projects.map((p) => ({
            key: p.projectId || p.name,
            label: (
                <Flex align="center" gap={12}>
                    <Avatar size={24} style={{ backgroundColor: getAvatarColor(p.name).bg, fontSize: 10 }}>
                        {getInitials(p.name)}
                    </Avatar>
                    <Text style={{ flex: 1 }}>{p.name}</Text>
                    {p.projectId === selectedProjectId && <LuCheck size={14} color={token.colorPrimary} />}
                </Flex>
            ),
            onClick: () => p.projectId && onProjectChange(p.projectId, p.name),
        }));
    }, [projects, selectedProjectId, token.colorPrimary, onProjectChange]);

    if (isLoading) return <Skeleton.Input active size="small" style={{ width: 150 }} />;
    if (!projects.length) return <Text type="secondary">No catalogs</Text>;

    const color = selectedProject ? getAvatarColor(selectedProject.name) : { bg: '#ccc', text: '#fff' };

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
                <Avatar size={28} style={{ backgroundColor: color.bg, color: color.text, fontSize: 11 }}>
                    {selectedProject ? getInitials(selectedProject.name) : <LuFolderOpen size={14} />}
                </Avatar>
                <Text strong style={{ maxWidth: 150 }} ellipsis>
                    {selectedProject?.name || 'Select catalog'}
                </Text>
                <LuChevronDown size={14} color={token.colorTextSecondary} />
            </Flex>
        </Dropdown>
    );
};

export default DashboardProjectSelector;
