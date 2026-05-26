'use client'

/**
 * Canonica — Dashboard Sidebar
 *
 * Product-specific Canonica navigation wired into the shared dashboard sidebar shell.
 *
 * @see src/constants/canonicaNavigations.ts
 */

import CanonicaLogoMark from '@atoms/canonicaLogoMark';
import { FEATURE_FLAGS } from '@config/features';
import {
    CANONICA_DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    CANONICA_DEFAULT_GOVERNANCE_TAB,
    CANONICA_DEFAULT_TEAM_TAB,
    CANONICA_DEFAULT_WIDGET_TAB,
    CANONICA_FLAT_SIDEBAR_NAV,
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
import DashboardSidebarShell, { DashboardSidebarShellItem } from '@/components/shared/dashboardShell/DashboardSidebarShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import { useCanonicaAccess } from '@providers/canonicaAccessProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { theme } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuLifeBuoy, LuMoon, LuSettings2, LuSun } from 'react-icons/lu';

interface CanonicaSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
    onOpenAppSettings?: () => void;
    onExpandedChange?: (expanded: boolean) => void;
}

export default function CanonicaSidebar({ mobile = false, onNavigate, onOpenAppSettings, onExpandedChange }: CanonicaSidebarProps) {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const session = useClientAuthSession();
    const { access } = useCanonicaAccess();
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseCanonicaManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

    const selectedKey = useMemo(() => {
        const governancePathTab = getCanonicaGovernanceTabFromPathname(normalizedPathname);
        const legacyQueryTab = normalizedPathname === CANONICA_ROUTES.GOVERNANCE ? searchParams.get('tab') : null;
        const activeGovernanceTab = governancePathTab || (isCanonicaGovernanceTab(legacyQueryTab) ? legacyQueryTab : null);
        const widgetPathTab = getCanonicaWidgetTabFromPathname(normalizedPathname);
        const legacyWidgetTab = normalizedPathname === CANONICA_ROUTES.WIDGET ? searchParams.get('tab') : null;
        const activeWidgetTab = widgetPathTab || (isCanonicaWidgetTab(legacyWidgetTab) ? legacyWidgetTab : null);
        const teamPathTab = getCanonicaTeamTabFromPathname(normalizedPathname);
        const legacyTeamTab = normalizedPathname === CANONICA_ROUTES.TEAM ? searchParams.get('tab') : null;
        const activeTeamTab = teamPathTab || (isCanonicaTeamTab(legacyTeamTab) ? legacyTeamTab : null);

        if (activeGovernanceTab) {
            return getCanonicaGovernanceRoute(activeGovernanceTab);
        }

        if (normalizedPathname === CANONICA_ROUTES.GOVERNANCE) {
            return getCanonicaGovernanceRoute(CANONICA_DEFAULT_GOVERNANCE_TAB);
        }

        if (activeWidgetTab) {
            return getCanonicaWidgetRoute(activeWidgetTab);
        }

        if (normalizedPathname === CANONICA_ROUTES.WIDGET) {
            return getCanonicaWidgetRoute(CANONICA_DEFAULT_WIDGET_TAB);
        }

        if (activeTeamTab) {
            return getCanonicaTeamRoute(activeTeamTab);
        }

        if (normalizedPathname === CANONICA_ROUTES.TEAM) {
            return getCanonicaTeamRoute(CANONICA_DEFAULT_TEAM_TAB);
        }

        const exact = CANONICA_FLAT_SIDEBAR_NAV.find(n => n.route === normalizedPathname);
        if (exact) return exact.route;

        const prefix = CANONICA_FLAT_SIDEBAR_NAV.find(n => normalizedPathname.startsWith(`${n.route}/`));
        if (prefix) return prefix.route;

        return CANONICA_SIDEBAR_NAV[0]?.route || '';
    }, [normalizedPathname, searchParams]);

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

    useEffect(() => {
        setExpandedParents((prev) => {
            const next = { ...prev };

            visibleNav.forEach((nav) => {
                if (!nav.subNav?.length) return;

                const hasActiveChild = nav.subNav.some((subItem) => selectedKey === subItem.route);
                const isParentRoute = selectedKey === nav.route;

                if (hasActiveChild || isParentRoute) {
                    next[nav.route] = true;
                }
            });

            return next;
        });
    }, [selectedKey, visibleNav]);

    const navItems = useMemo<DashboardSidebarShellItem[]>(() => (
        visibleNav.map((nav: CanonicaNavItem) => {
            const subNav = nav.subNav?.map((subItem) => ({
                key: subItem.route,
                label: subItem.label,
                icon: subItem.icon,
                active: selectedKey === subItem.route,
                onClick: () => {
                    router.push(toCanonicaDashboardRoute(subItem.route, currentHostname));
                    onNavigate?.();
                },
            })) || [];
            const subNavActive = subNav.some((subItem) => subItem.active);
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

                    router.push(toCanonicaDashboardRoute(clickRoute, currentHostname));
                    onNavigate?.();
                },
            };
        })
    ), [currentHostname, expandedParents, onNavigate, router, selectedKey, visibleNav]);

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
        {
            key: 'help',
            label: 'Help',
            icon: LuLifeBuoy,
            active: selectedKey === CANONICA_ROUTES.HELP,
            onClick: () => {
                router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.HELP, currentHostname));
                onNavigate?.();
            },
        },
    ];

    const markStyle = { height: 28, width: 46 };

    return (
        <DashboardSidebarShell
            actionItems={actionItems}
            ariaLabel="Canonica navigation"
            expandedWidth={CANONICA_DASHBOARD_SIDEBAR_EXPANDED_WIDTH}
            isCollapsed={isCollapsed}
            logoCollapsed={(
                <CanonicaLogoMark
                    height={28}
                    idPrefix="canonica-sidebar-collapsed"
                    style={markStyle}
                    width={46}
                />
            )}
            logoExpanded={(
                <span style={{ alignItems: 'center', display: 'flex', gap: 10, minWidth: 0 }}>
                    <CanonicaLogoMark
                        height={28}
                        idPrefix="canonica-sidebar-expanded"
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
                        Canonica
                    </span>
                </span>
            )}
            mobile={mobile}
            navItems={navItems}
            onExpandedChange={onExpandedChange}
        />
    );
}
