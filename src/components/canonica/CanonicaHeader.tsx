'use client'

/**
 * Canonica — Dashboard Header
 *
 * Product-specific Canonica header content wired into the shared dashboard header shell.
 */

import {
    CANONICA_ROUTES,
    CANONICA_SIDEBAR_NAV,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import DashboardHeaderShell from '@/components/shared/dashboardShell/DashboardHeaderShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { clearForceDesktopMode } from '@lib/mobile/forceDesktopMode';
import ProfileActionsModal from '@organisms/headerComponent/profileActionsModal';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { Avatar, Badge, Button, Divider, Flex, theme, Tooltip, Typography } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { LuHelpCircle, LuHome, LuMenu, LuMoon, LuPanelLeftClose, LuPanelLeftOpen, LuSun } from 'react-icons/lu';

const { Text } = Typography;

interface CanonicaHeaderProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
    onOpenAppSettings?: () => void;
    workspaceSwitcher?: ReactNode;
}

export default function CanonicaHeader({ showMenuButton = false, onMenuClick, onOpenAppSettings, workspaceSwitcher }: CanonicaHeaderProps) {
    const dispatch = useAppDispatch();
    const session = useClientAuthSession();
    const pathname = usePathname();
    const router = useRouter();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);

    const pageTitle = useMemo(() => {
        const nav = CANONICA_SIDEBAR_NAV.find(n => normalizedPathname === n.route || normalizedPathname.startsWith(`${n.route}/`));
        return nav?.label || 'Dashboard';
    }, [normalizedPathname]);

    const handleOpenAppSettings = () => {
        if (showMenuButton && onOpenAppSettings) {
            onOpenAppSettings();
            return;
        }

        dispatch(toggleAppSettingsPanel(true));
    };

    const initials = useMemo(() => {
        const name = session?.user?.name || session?.user?.email || 'U';
        return name.charAt(0).toUpperCase();
    }, [session]);

    const headerHeight = showMenuButton ? 'calc(var(--header-Height) + env(safe-area-inset-top))' : 'var(--header-Height)';

    const handleReturn = () => {
        clearForceDesktopMode();
        router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.ACTIVATION, currentHostname));
    };

    const handleOpenHelp = () => {
        router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.HELP, currentHostname));
    };

    const userData = {
        ...(session?.user || {}),
        email: session?.user?.email || '',
        image: (session?.user as any)?.image || '',
        name: session?.user?.name || session?.user?.email || 'User',
    };

    const left = (
        <Flex align="center" gap={10} style={{ minWidth: 0 }}>
            {showMenuButton ? (
                <Button
                    aria-label="Open navigation"
                    icon={<LuMenu size={20} />}
                    onClick={onMenuClick}
                    style={{ flex: '0 0 auto', height: 44, padding: 0, width: 44 }}
                    type="text"
                />
            ) : (
                <Button
                    aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
                    icon={isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
                    onClick={() => dispatch(toggleSidbar(!isCollapsed))}
                    style={{ fontSize: 20, padding: 0 }}
                    type="text"
                />
            )}

            <Divider
                plain
                style={{ borderInlineStartWidth: 2, height: 32, margin: 0, top: 2 }}
                type="vertical"
            />

            <Tooltip title="Canonica home">
                <Button
                    aria-label="Canonica home"
                    icon={<LuHome />}
                    onClick={handleReturn}
                    style={{ fontSize: 20, padding: 0 }}
                    type="text"
                />
            </Tooltip>

            <Divider
                plain
                style={{ borderInlineStartWidth: 2, height: 32, margin: 0, top: 2 }}
                type="vertical"
            />

            <Text
                strong
                style={{
                    background: token.colorFillContent,
                    borderRadius: 4,
                    color: token.colorTextBase,
                    fontSize: 12,
                    minWidth: 0,
                    overflow: 'hidden',
                    padding: '7px 10px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {pageTitle}
            </Text>
        </Flex>
    );

    const right = (
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, minWidth: 0 }}>
            {workspaceSwitcher ? (
                <div style={{ minWidth: 0 }}>
                    {workspaceSwitcher}
                </div>
            ) : null}
            <Tooltip title="Help">
                <Button
                    aria-label="Open help"
                    icon={<LuHelpCircle />}
                    onClick={handleOpenHelp}
                    style={{ height: 44, minWidth: 44, padding: 0 }}
                    type="text"
                />
            </Tooltip>
            <Tooltip title={isDarkMode ? 'Use light mode' : 'Use dark mode'}>
                <Button
                    aria-label={isDarkMode ? 'Use light mode' : 'Use dark mode'}
                    icon={isDarkMode ? <LuSun /> : <LuMoon />}
                    onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
                    style={{ height: 44, minWidth: 44, padding: 0 }}
                    type="text"
                />
            </Tooltip>
            <ProfileActionsModal
                onOpenAppearance={handleOpenAppSettings}
                userData={userData}
            >
                <Button
                    aria-label="Open profile"
                    style={{
                        alignItems: 'center',
                        display: 'inline-flex',
                        height: 44,
                        justifyContent: 'center',
                        minWidth: 44,
                        padding: 0,
                    }}
                    type="text"
                >
                    <Badge dot status="success" style={{ right: 8, top: 3 }}>
                        <Avatar
                            size={32}
                            src={(session?.user as any)?.image || undefined}
                            style={{
                                backgroundColor: token.colorPrimary,
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                        >
                            {initials}
                        </Avatar>
                    </Badge>
                </Button>
            </ProfileActionsModal>
        </div>
    );

    return (
        <DashboardHeaderShell
            left={left}
            right={right}
            style={{
                boxSizing: 'border-box',
                height: headerHeight,
                padding: showMenuButton ? 'env(safe-area-inset-top) 12px 0' : '0 10px',
                zIndex: 99,
            }}
        />
    );
}
