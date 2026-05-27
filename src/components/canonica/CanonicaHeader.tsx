'use client'

/**
 * Canonica — Dashboard Header
 *
 * Product-specific Canonica header content wired into the shared dashboard header shell.
 */

import {
    CANONICA_DEFAULT_GOVERNANCE_TAB,
    CANONICA_DEFAULT_TEAM_TAB,
    CANONICA_DEFAULT_WIDGET_TAB,
    CANONICA_ROUTES,
    CANONICA_SIDEBAR_NAV,
    CanonicaNavItem,
    getCanonicaGovernanceRoute,
    getCanonicaGovernanceTabFromPathname,
    getCanonicaTeamRoute,
    getCanonicaTeamTabFromPathname,
    getCanonicaWidgetRoute,
    getCanonicaWidgetTabFromPathname,
    isCanonicaGovernanceTab,
    isCanonicaTeamTab,
    isCanonicaWidgetTab,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { FEATURE_FLAGS } from '@config/features';
import DashboardHeaderShell from '@/components/shared/dashboardShell/DashboardHeaderShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import { clearForceDesktopMode } from '@lib/mobile/forceDesktopMode';
import ProfileActionsModal from '@organisms/headerComponent/profileActionsModal';
import { useCanonicaAccess } from '@providers/canonicaAccessProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { Avatar, Badge, Button, Divider, Dropdown, Flex, Space, theme, Tooltip, Typography } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { LuChevronDown, LuChevronRight, LuHome, LuMenu, LuMoon, LuPanelLeftClose, LuPanelLeftOpen, LuSun } from 'react-icons/lu';

const { Text } = Typography;

interface CanonicaHeaderProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
    onOpenAppSettings?: () => void;
    workspaceSwitcher?: ReactNode;
}

function renderHeaderNavIcon(Icon: CanonicaNavItem['icon']) {
    return (
        <Icon
            size={18}
            style={{
                alignSelf: 'center',
                flex: '0 0 auto',
                marginRight: 2,
                verticalAlign: 'middle',
            }}
        />
    );
}

export default function CanonicaHeader({ showMenuButton = false, onMenuClick, onOpenAppSettings, workspaceSwitcher }: CanonicaHeaderProps) {
    const dispatch = useAppDispatch();
    const session = useClientAuthSession();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const { access } = useCanonicaAccess();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseCanonicaManagement(session);

    const canShowNavItem = useCallback((nav: CanonicaNavItem) => {
        if ((nav.managementOnly || nav.platformOnly) && !canUseManagementSurfaces) return false;
        if (nav.requiredPermission && !access?.isPlatformAdmin && access?.permissions?.[nav.requiredPermission] !== true) return false;
        if (!nav.featureFlag) return true;
        return FEATURE_FLAGS[nav.featureFlag as keyof typeof FEATURE_FLAGS] === true;
    }, [access?.isPlatformAdmin, access?.permissions, canUseManagementSurfaces]);

    const visibleNav = useMemo(() => (
        CANONICA_SIDEBAR_NAV
            .map((nav: CanonicaNavItem) => ({
                ...nav,
                subNav: nav.subNav?.filter(canShowNavItem),
            }))
            .filter((nav: CanonicaNavItem) => canShowNavItem(nav) || Boolean(nav.subNav?.length))
    ), [canShowNavItem]);

    const selectedRoute = useMemo(() => {
        const governancePathTab = getCanonicaGovernanceTabFromPathname(normalizedPathname);
        const legacyGovernanceTab = normalizedPathname === CANONICA_ROUTES.GOVERNANCE ? searchParams.get('tab') : null;
        const activeGovernanceTab = governancePathTab || (isCanonicaGovernanceTab(legacyGovernanceTab) ? legacyGovernanceTab : null);
        const widgetPathTab = getCanonicaWidgetTabFromPathname(normalizedPathname);
        const legacyWidgetTab = normalizedPathname === CANONICA_ROUTES.WIDGET ? searchParams.get('tab') : null;
        const activeWidgetTab = widgetPathTab || (isCanonicaWidgetTab(legacyWidgetTab) ? legacyWidgetTab : null);
        const teamPathTab = getCanonicaTeamTabFromPathname(normalizedPathname);
        const legacyTeamTab = normalizedPathname === CANONICA_ROUTES.TEAM ? searchParams.get('tab') : null;
        const activeTeamTab = teamPathTab || (isCanonicaTeamTab(legacyTeamTab) ? legacyTeamTab : null);

        if (activeGovernanceTab) return getCanonicaGovernanceRoute(activeGovernanceTab);
        if (normalizedPathname === CANONICA_ROUTES.GOVERNANCE) return getCanonicaGovernanceRoute(CANONICA_DEFAULT_GOVERNANCE_TAB);
        if (activeWidgetTab) return getCanonicaWidgetRoute(activeWidgetTab);
        if (normalizedPathname === CANONICA_ROUTES.WIDGET) return getCanonicaWidgetRoute(CANONICA_DEFAULT_WIDGET_TAB);
        if (activeTeamTab) return getCanonicaTeamRoute(activeTeamTab);
        if (normalizedPathname === CANONICA_ROUTES.TEAM) return getCanonicaTeamRoute(CANONICA_DEFAULT_TEAM_TAB);

        const flatNav = visibleNav.flatMap((nav) => [nav, ...(nav.subNav || [])]);
        const exact = flatNav.find(n => normalizedPathname === n.route);
        if (exact) return exact.route;

        const prefix = flatNav
            .slice()
            .sort((a, b) => b.route.length - a.route.length)
            .find(n => normalizedPathname.startsWith(`${n.route}/`));

        return prefix?.route || visibleNav[0]?.route || '';
    }, [normalizedPathname, searchParams, visibleNav]);

    const activeBreadcrumb = useMemo(() => {
        const activeParent = visibleNav.find((nav) => (
            nav.route === selectedRoute ||
            nav.subNav?.some((subItem) => subItem.route === selectedRoute) ||
            normalizedPathname === nav.route ||
            normalizedPathname.startsWith(`${nav.route}/`)
        ));

        if (!activeParent) return null;

        const activeSubNav = activeParent.subNav?.find((subItem) => subItem.route === selectedRoute) || null;
        return {
            parent: activeParent,
            subNav: activeParent.subNav || [],
            activeSubNav,
        };
    }, [normalizedPathname, selectedRoute, visibleNav]);

    const pageTitle = activeBreadcrumb?.activeSubNav?.label || activeBreadcrumb?.parent.label || 'Dashboard';

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

            {!showMenuButton ? (
                <>
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
                </>
            ) : null}

            {showMenuButton || !activeBreadcrumb ? (
                <Text
                    strong
                    style={{
                        color: token.colorTextBase,
                        fontSize: 14,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {pageTitle}
                </Text>
            ) : (
                <Space align="center" size={8} style={{ minWidth: 0 }}>
                    <Tooltip title={activeBreadcrumb.parent.label}>
                        <Text
                            strong
                            style={{
                                alignItems: 'center',
                                background: token.colorFillContent,
                                borderRadius: 6,
                                color: token.colorTextBase,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                fontSize: 12,
                                gap: 6,
                                lineHeight: 1,
                                maxWidth: 180,
                                minWidth: 0,
                                overflow: 'hidden',
                                padding: '7px 10px',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => router.push(toCanonicaDashboardRoute(activeBreadcrumb.parent.route, currentHostname))}
                        >
                            {renderHeaderNavIcon(activeBreadcrumb.parent.icon)}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeBreadcrumb.parent.label}
                            </span>
                        </Text>
                    </Tooltip>
                    {activeBreadcrumb.activeSubNav ? (
                        <>
                            <LuChevronRight
                                size={16}
                                style={{
                                    alignSelf: 'center',
                                    color: token.colorTextTertiary,
                                    flex: '0 0 auto',
                                    verticalAlign: 'middle',
                                }}
                            />
                            <Dropdown
                                menu={{
                                    items: activeBreadcrumb.subNav.map((subItem) => ({
                                        key: subItem.route,
                                        label: subItem.label,
                                        icon: (
                                            <subItem.icon
                                                size={18}
                                                style={{ flex: '0 0 auto' }}
                                            />
                                        ),
                                    })),
                                    onClick: ({ key }) => {
                                        router.push(toCanonicaDashboardRoute(String(key), currentHostname));
                                    },
                                    selectable: true,
                                    selectedKeys: [activeBreadcrumb.activeSubNav.route],
                                }}
                                trigger={['click']}
                            >
                                <Text
                                    strong
                                    style={{
                                        alignItems: 'center',
                                        background: token.colorFillContent,
                                        borderRadius: 6,
                                        color: token.colorTextBase,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        fontSize: 12,
                                        gap: 6,
                                        lineHeight: 1,
                                        maxWidth: 240,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        padding: '7px 10px',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {renderHeaderNavIcon(activeBreadcrumb.activeSubNav.icon)}
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {activeBreadcrumb.activeSubNav.label}
                                    </span>
                                    {activeBreadcrumb.subNav.length > 1 ? (
                                        <LuChevronDown
                                            size={16}
                                            style={{
                                                alignSelf: 'center',
                                                flex: '0 0 auto',
                                                verticalAlign: 'middle',
                                            }}
                                        />
                                    ) : null}
                                </Text>
                            </Dropdown>
                        </>
                    ) : null}
                </Space>
            )}
        </Flex>
    );

    const right = (
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, minWidth: 0 }}>
            {workspaceSwitcher ? (
                <div style={{ minWidth: 0 }}>
                    {workspaceSwitcher}
                </div>
            ) : null}
            {!showMenuButton ? (
                <>
                    <Tooltip title={isDarkMode ? 'Use light mode' : 'Use dark mode'}>
                        <Button
                            aria-label={isDarkMode ? 'Use light mode' : 'Use dark mode'}
                            icon={isDarkMode ? <LuSun /> : <LuMoon />}
                            onClick={() => dispatch(toggleDarkMode(!isDarkMode))}
                            style={{ height: 44, minWidth: 44, padding: 0 }}
                            type="text"
                        />
                    </Tooltip>
                </>
            ) : null}
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
