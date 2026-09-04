'use client'

/**
 * Answerlattice — Dashboard Header
 *
 * Product-specific Answerlattice header content wired into the shared dashboard header shell.
 */

import {
    ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB,
    ANSWERLATTICE_DEFAULT_TEAM_TAB,
    ANSWERLATTICE_DEFAULT_WIDGET_TAB,
    ANSWERLATTICE_ROUTES,
    ANSWERLATTICE_SIDEBAR_NAV,
    AnswerlatticeNavItem,
    getAnswerlatticeGovernanceRoute,
    getAnswerlatticeGovernanceTabFromPathname,
    getAnswerlatticeTeamRoute,
    getAnswerlatticeTeamTabFromPathname,
    getAnswerlatticeWidgetRoute,
    getAnswerlatticeWidgetTabFromPathname,
    isAnswerlatticeGovernanceTab,
    isAnswerlatticeTeamTab,
    isAnswerlatticeWidgetTab,
    normalizeAnswerlatticeRoutePathname,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import { isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import { FEATURE_FLAGS } from '@config/features';
import DashboardHeaderShell from '@/components/shared/dashboardShell/DashboardHeaderShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import { clearForceDesktopMode } from '@lib/mobile/forceDesktopMode';
import ProfileActionsModal from '@organisms/headerComponent/profileActionsModal';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { Avatar, Badge, Button, Divider, Dropdown, Flex, Space, theme, Tooltip, Typography } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { LuChevronDown, LuChevronRight, LuHome, LuMenu, LuMoon, LuPanelLeftClose, LuPanelLeftOpen, LuSun } from 'react-icons/lu';

const { Text } = Typography;
const DESKTOP_HEADER_CONTROL_HEIGHT = 36;

interface AnswerlatticeHeaderProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
    onOpenAppSettings?: () => void;
    workspaceSwitcher?: ReactNode;
}

function renderHeaderNavIcon(Icon: AnswerlatticeNavItem['icon']) {
    return (
        <Icon
            size={18}
            style={{
                alignSelf: 'center',
                flex: '0 0 auto',
                verticalAlign: 'middle',
            }}
        />
    );
}

export default function AnswerlatticeHeader({ showMenuButton = false, onMenuClick, onOpenAppSettings, workspaceSwitcher }: AnswerlatticeHeaderProps) {
    const dispatch = useAppDispatch();
    const session = useClientAuthSession();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const { access } = useAnswerlatticeAccess();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const answerlatticeSignOutCallbackUrl = typeof window !== 'undefined'
        ? `/signin?callbackUrl=${encodeURIComponent(
            isAnswerlatticeProductHostname(window.location.hostname) ? '/dashboard' : '/answerlattice',
        )}`
        : '/signin?callbackUrl=%2Fanswerlattice';
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname ?? '');
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseAnswerlatticeManagement(session);

    const canShowNavItem = useCallback((nav: AnswerlatticeNavItem) => {
        if ((nav.managementOnly || nav.platformOnly) && !canUseManagementSurfaces) return false;
        if (nav.requiredPermission && !access?.isPlatformAdmin && access?.permissions?.[nav.requiredPermission] !== true) return false;
        if (!nav.featureFlag) return true;
        return FEATURE_FLAGS[nav.featureFlag as keyof typeof FEATURE_FLAGS] === true;
    }, [access?.isPlatformAdmin, access?.permissions, canUseManagementSurfaces]);

    const authorizedNav = useMemo(() => (
        ANSWERLATTICE_SIDEBAR_NAV
            .map((nav: AnswerlatticeNavItem) => ({
                ...nav,
                subNav: nav.subNav?.filter(canShowNavItem),
            }))
            .filter((nav: AnswerlatticeNavItem) => canShowNavItem(nav) || Boolean(nav.subNav?.length))
    ), [canShowNavItem]);

    const selectedRoute = useMemo(() => {
        const governancePathTab = getAnswerlatticeGovernanceTabFromPathname(normalizedPathname);
        const legacyGovernanceTab = normalizedPathname === ANSWERLATTICE_ROUTES.GOVERNANCE ? searchParams?.get('tab') : null;
        const activeGovernanceTab = governancePathTab || (isAnswerlatticeGovernanceTab(legacyGovernanceTab) ? legacyGovernanceTab : null);
        const widgetPathTab = getAnswerlatticeWidgetTabFromPathname(normalizedPathname);
        const legacyWidgetTab = normalizedPathname === ANSWERLATTICE_ROUTES.WIDGET ? searchParams?.get('tab') : null;
        const activeWidgetTab = widgetPathTab || (isAnswerlatticeWidgetTab(legacyWidgetTab) ? legacyWidgetTab : null);
        const teamPathTab = getAnswerlatticeTeamTabFromPathname(normalizedPathname);
        const legacyTeamTab = normalizedPathname === ANSWERLATTICE_ROUTES.TEAM ? searchParams?.get('tab') : null;
        const activeTeamTab = teamPathTab || (isAnswerlatticeTeamTab(legacyTeamTab) ? legacyTeamTab : null);

        if (activeGovernanceTab) return getAnswerlatticeGovernanceRoute(activeGovernanceTab);
        if (normalizedPathname === ANSWERLATTICE_ROUTES.GOVERNANCE) return getAnswerlatticeGovernanceRoute(ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB);
        if (activeWidgetTab) return getAnswerlatticeWidgetRoute(activeWidgetTab);
        if (normalizedPathname === ANSWERLATTICE_ROUTES.WIDGET) return getAnswerlatticeWidgetRoute(ANSWERLATTICE_DEFAULT_WIDGET_TAB);
        if (activeTeamTab) return getAnswerlatticeTeamRoute(activeTeamTab);
        if (normalizedPathname === ANSWERLATTICE_ROUTES.TEAM) return getAnswerlatticeTeamRoute(ANSWERLATTICE_DEFAULT_TEAM_TAB);

        const flatNav = authorizedNav.flatMap((nav) => [nav, ...(nav.subNav || [])]);
        const exact = flatNav.find(n => normalizedPathname === n.route);
        if (exact) return exact.route;

        const prefix = flatNav
            .slice()
            .sort((a, b) => b.route.length - a.route.length)
            .find(n => normalizedPathname.startsWith(`${n.route}/`));

        return prefix?.route || authorizedNav[0]?.route || '';
    }, [authorizedNav, normalizedPathname, searchParams]);

    const activeBreadcrumb = useMemo(() => {
        const activeParent = authorizedNav.find((nav) => (
            nav.route === selectedRoute ||
            nav.subNav?.some((subItem) => subItem.route === selectedRoute) ||
            normalizedPathname === nav.route ||
            normalizedPathname.startsWith(`${nav.route}/`)
        ));

        if (!activeParent) return null;

        const activeSubNav = activeParent.subNav?.find((subItem) => subItem.route === selectedRoute) || null;
        const primarySubNav = activeParent.subNav?.filter(subItem => subItem.advanced !== true) || [];
        const breadcrumbSubNav = activeSubNav?.advanced
            ? [...primarySubNav, activeSubNav]
            : primarySubNav;
        return {
            parent: activeParent,
            subNav: breadcrumbSubNav,
            activeSubNav,
        };
    }, [authorizedNav, normalizedPathname, selectedRoute]);

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
        router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.ACTIVATION, currentHostname));
    };

    const userData = {
        ...(session?.user || {}),
        email: session?.user?.email || '',
        image: session?.user?.image || '',
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
                    style={{
                        fontSize: 20,
                        height: DESKTOP_HEADER_CONTROL_HEIGHT,
                        minWidth: DESKTOP_HEADER_CONTROL_HEIGHT,
                        padding: 0,
                    }}
                    type="text"
                />
            )}

            {!showMenuButton ? (
                <>
                    <Divider
                        plain
                        style={{ borderInlineStartWidth: 1, height: 28, margin: 0, top: 2 }}
                        type="vertical"
                    />

                    <Tooltip title="Answerlattice home">
                        <Button
                            aria-label="Answerlattice home"
                            icon={<LuHome />}
                            onClick={handleReturn}
                            style={{
                                fontSize: 20,
                                height: DESKTOP_HEADER_CONTROL_HEIGHT,
                                minWidth: DESKTOP_HEADER_CONTROL_HEIGHT,
                                padding: 0,
                            }}
                            type="text"
                        />
                    </Tooltip>

                    <Divider
                        plain
                        style={{ borderInlineStartWidth: 1, height: 28, margin: 0, top: 2 }}
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
                        <Button
                            style={{
                                alignItems: 'center',
                                background: token.colorFillTertiary,
                                borderRadius: 6,
                                color: token.colorTextSecondary,
                                display: 'inline-flex',
                                flexDirection: 'row',
                                flexWrap: 'nowrap',
                                fontSize: 12,
                                gap: 6,
                                height: DESKTOP_HEADER_CONTROL_HEIGHT,
                                justifyContent: 'center',
                                lineHeight: 1.25,
                                maxWidth: 180,
                                minWidth: 0,
                                overflow: 'hidden',
                                padding: '0 10px',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            onClick={() => router.push(toAnswerlatticeDashboardRoute(activeBreadcrumb.parent.route, currentHostname))}
                            type="text"
                        >
                            {renderHeaderNavIcon(activeBreadcrumb.parent.icon)}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {activeBreadcrumb.parent.label}
                            </span>
                        </Button>
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
                                        router.push(toAnswerlatticeDashboardRoute(String(key), currentHostname));
                                    },
                                    selectable: true,
                                    selectedKeys: [activeBreadcrumb.activeSubNav.route],
                                }}
                                trigger={['click']}
                            >
                                <Button
                                    style={{
                                        alignItems: 'center',
                                        background: token.colorFillContent,
                                        borderRadius: 6,
                                        color: token.colorTextBase,
                                        display: 'inline-flex',
                                        flexDirection: 'row',
                                        flexWrap: 'nowrap',
                                        fontSize: 12,
                                        gap: 6,
                                        height: DESKTOP_HEADER_CONTROL_HEIGHT,
                                        justifyContent: 'center',
                                        lineHeight: 1.25,
                                        maxWidth: 240,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        padding: '0 10px',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                    type="text"
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
                                </Button>
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
                            style={{
                                height: DESKTOP_HEADER_CONTROL_HEIGHT,
                                minWidth: DESKTOP_HEADER_CONTROL_HEIGHT,
                                padding: 0,
                            }}
                            type="text"
                        />
                    </Tooltip>
                </>
            ) : null}
            <ProfileActionsModal
                onOpenAppearance={handleOpenAppSettings}
                signOutCallbackUrl={answerlatticeSignOutCallbackUrl}
                userData={userData}
            >
                <span
                    aria-hidden="true"
                    style={{
                        alignItems: 'center',
                        display: 'inline-flex',
                        height: 44,
                        justifyContent: 'center',
                        minWidth: 44,
                        padding: 0,
                    }}
                >
                    <Badge dot status="success" style={{ right: 8, top: 3 }}>
                        <Avatar
                            size={32}
                            src={session?.user?.image || undefined}
                            style={{
                                backgroundColor: token.colorPrimary,
                                cursor: 'pointer',
                                fontSize: 14,
                            }}
                        >
                            {initials}
                        </Avatar>
                    </Badge>
                </span>
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
