'use client'

/**
 * Answerlattice — Dashboard Sidebar
 *
 * Product-specific Answerlattice navigation wired into the shared dashboard sidebar shell.
 *
 * @see src/constants/answerlatticeNavigations.ts
 */

import AnswerlatticeLogoMark from '@atoms/answerlatticeLogoMark';
import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB,
    ANSWERLATTICE_DEFAULT_TEAM_TAB,
    ANSWERLATTICE_DEFAULT_WIDGET_TAB,
    ANSWERLATTICE_FLAT_SIDEBAR_NAV,
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
import DashboardSidebarShell, { DashboardSidebarShellItem } from '@/components/shared/dashboardShell/DashboardSidebarShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { theme } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuMoon, LuSettings2, LuSun } from 'react-icons/lu';

interface AnswerlatticeSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
    onOpenAppSettings?: () => void;
    onExpandedChange?: (expanded: boolean) => void;
}

export default function AnswerlatticeSidebar({ mobile = false, onNavigate, onOpenAppSettings, onExpandedChange }: AnswerlatticeSidebarProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const session = useClientAuthSession();
    const { access } = useAnswerlatticeAccess();
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseAnswerlatticeManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname ?? '');
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

    const selectedKey = useMemo(() => {
        const governancePathTab = getAnswerlatticeGovernanceTabFromPathname(normalizedPathname);
        const legacyQueryTab = normalizedPathname === ANSWERLATTICE_ROUTES.GOVERNANCE ? searchParams?.get('tab') : null;
        const activeGovernanceTab = governancePathTab || (isAnswerlatticeGovernanceTab(legacyQueryTab) ? legacyQueryTab : null);
        const widgetPathTab = getAnswerlatticeWidgetTabFromPathname(normalizedPathname);
        const legacyWidgetTab = normalizedPathname === ANSWERLATTICE_ROUTES.WIDGET ? searchParams?.get('tab') : null;
        const activeWidgetTab = widgetPathTab || (isAnswerlatticeWidgetTab(legacyWidgetTab) ? legacyWidgetTab : null);
        const teamPathTab = getAnswerlatticeTeamTabFromPathname(normalizedPathname);
        const legacyTeamTab = normalizedPathname === ANSWERLATTICE_ROUTES.TEAM ? searchParams?.get('tab') : null;
        const activeTeamTab = teamPathTab || (isAnswerlatticeTeamTab(legacyTeamTab) ? legacyTeamTab : null);

        if (activeGovernanceTab) {
            return getAnswerlatticeGovernanceRoute(activeGovernanceTab);
        }

        if (normalizedPathname === ANSWERLATTICE_ROUTES.GOVERNANCE) {
            return getAnswerlatticeGovernanceRoute(ANSWERLATTICE_DEFAULT_GOVERNANCE_TAB);
        }

        if (activeWidgetTab) {
            return getAnswerlatticeWidgetRoute(activeWidgetTab);
        }

        if (normalizedPathname === ANSWERLATTICE_ROUTES.WIDGET) {
            return getAnswerlatticeWidgetRoute(ANSWERLATTICE_DEFAULT_WIDGET_TAB);
        }

        if (activeTeamTab) {
            return getAnswerlatticeTeamRoute(activeTeamTab);
        }

        if (normalizedPathname === ANSWERLATTICE_ROUTES.TEAM) {
            return getAnswerlatticeTeamRoute(ANSWERLATTICE_DEFAULT_TEAM_TAB);
        }

        const exact = ANSWERLATTICE_FLAT_SIDEBAR_NAV.find(n => n.route === normalizedPathname);
        if (exact) return exact.route;

        const prefix = ANSWERLATTICE_FLAT_SIDEBAR_NAV.find(n => normalizedPathname.startsWith(`${n.route}/`));
        if (prefix) return prefix.route;

        return ANSWERLATTICE_SIDEBAR_NAV[0]?.route || '';
    }, [normalizedPathname, searchParams]);

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

    const visibleNav = useMemo(() => (
        authorizedNav.map((nav) => ({
            ...nav,
            subNav: nav.subNav?.filter(subItem => subItem.advanced !== true),
        }))
    ), [authorizedNav]);

    useEffect(() => {
        setExpandedParents((prev) => {
            const next = { ...prev };

            visibleNav.forEach((nav) => {
                if (!nav.subNav?.length) return;

                const authorizedParent = authorizedNav.find(item => item.route === nav.route);
                const hasActiveChild = authorizedParent?.subNav?.some((subItem) => selectedKey === subItem.route) === true;
                const isParentRoute = selectedKey === nav.route;

                if (hasActiveChild || isParentRoute) {
                    next[nav.route] = true;
                }
            });

            return next;
        });
    }, [authorizedNav, selectedKey, visibleNav]);

    const navItems = useMemo<DashboardSidebarShellItem[]>(() => (
        visibleNav.map((nav: AnswerlatticeNavItem) => {
            const subNav = nav.subNav?.map((subItem) => ({
                key: subItem.route,
                label: subItem.label,
                icon: subItem.icon,
                active: selectedKey === subItem.route,
                onClick: () => {
                    router.push(toAnswerlatticeDashboardRoute(subItem.route, currentHostname));
                    onNavigate?.();
                },
            })) || [];
            const authorizedParent = authorizedNav.find(item => item.route === nav.route);
            const subNavActive = subNav.some((subItem) => subItem.active)
                || authorizedParent?.subNav?.some(subItem => subItem.advanced === true && selectedKey === subItem.route) === true;
            const clickRoute = nav.route;
            const hasSubNav = Boolean(subNav.length);
            const active = !hasSubNav && selectedKey === nav.route;
            const expanded = hasSubNav ? Boolean(expandedParents[nav.route]) : false;
            const nextExpanded = !expanded;

            return {
                key: nav.route,
                label: nav.label,
                icon: nav.icon,
                active,
                subNavActive,
                expanded,
                subNav,
                onClick: () => {
                    if (hasSubNav) {
                        setExpandedParents((prev) => ({
                            ...prev,
                            [nav.route]: nextExpanded,
                        }));
                        return;
                    }

                    router.push(toAnswerlatticeDashboardRoute(clickRoute, currentHostname));
                    onNavigate?.();
                },
            };
        })
    ), [authorizedNav, currentHostname, expandedParents, onNavigate, router, selectedKey, visibleNav]);

    const openAppAppearance = () => {
        if (mobile && onOpenAppSettings) {
            onOpenAppSettings();
            onNavigate?.();
            return;
        }

        dispatch(toggleAppSettingsPanel(true));
    };

    const actionItems: DashboardSidebarShellItem[] = [
        {
            key: 'app-appearance',
            label: 'App Appearance',
            icon: LuSettings2,
            onClick: openAppAppearance,
        },
        {
            key: 'dark-mode',
            label: 'Dark Mode',
            icon: isDarkMode ? <LuSun /> : <LuMoon />,
            iconActive: isDarkMode,
            onClick: () => dispatch(toggleDarkMode(!isDarkMode)),
        },
    ];

    const markStyle = { height: 28, width: 46 };

    return (
        <DashboardSidebarShell
            actionItems={actionItems}
            ariaLabel="Answerlattice navigation"
            expandedWidth={ANSWERLATTICE_DASHBOARD_SIDEBAR_EXPANDED_WIDTH}
            isCollapsed={isCollapsed}
            logoCollapsed={(
                <AnswerlatticeLogoMark
                    height={28}
                    idPrefix="answerlattice-sidebar-collapsed"
                    style={markStyle}
                    width={46}
                />
            )}
            logoExpanded={(
                <span style={{ alignItems: 'center', display: 'flex', gap: 10, minWidth: 0 }}>
                    <AnswerlatticeLogoMark
                        height={28}
                        idPrefix="answerlattice-sidebar-expanded"
                        style={markStyle}
                        width={46}
                    />
                    <span
                        style={{
                            color: token.colorText,
                            fontSize: 18,
                            fontWeight: 700,
                            lineHeight: 1,
                        }}
                    >
                        Answerlattice
                    </span>
                </span>
            )}
            mobile={mobile}
            navItems={navItems}
            onExpandedChange={onExpandedChange}
        />
    );
}
