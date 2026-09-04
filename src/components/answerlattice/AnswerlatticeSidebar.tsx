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
import { ANSWERLATTICE_CUSTOMER_LANGUAGE } from '@constant/answerlattice/customerLanguage';
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
import { projectAnswerlatticeSidebarNavigation } from '@lib/answerlattice/sidebarNavigation';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { theme } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { LuChevronUp, LuLayoutGrid, LuMoon, LuSettings2, LuSun } from 'react-icons/lu';

interface AnswerlatticeSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
    onOpenAppSettings?: () => void;
}

export default function AnswerlatticeSidebar({ mobile = false, onNavigate, onOpenAppSettings }: AnswerlatticeSidebarProps) {
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
    const [allToolsRevealed, setAllToolsRevealed] = useState(false);

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

    const authorizedItems = useMemo(() => {
        const byRoute = new Map<string, AnswerlatticeNavItem>();

        authorizedNav.forEach((parent) => {
            const candidates = parent.subNav?.length ? parent.subNav : [parent];
            candidates.forEach((item) => {
                if (!byRoute.has(item.route)) {
                    byRoute.set(item.route, item);
                }
            });
        });

        return Array.from(byRoute.values());
    }, [authorizedNav]);

    const { advancedItems, primarySections, visibleAdvancedItems } = useMemo(() => (
        projectAnswerlatticeSidebarNavigation(authorizedItems, selectedKey, allToolsRevealed)
    ), [allToolsRevealed, authorizedItems, selectedKey]);

    const createRouteItem = useCallback((
        item: AnswerlatticeNavItem,
        sectionLabel?: string,
    ): DashboardSidebarShellItem => ({
        key: item.route,
        label: item.label,
        icon: item.icon,
        sectionLabel,
        active: selectedKey === item.route,
        onClick: () => {
            router.push(toAnswerlatticeDashboardRoute(item.route, currentHostname));
            onNavigate?.();
        },
    }), [currentHostname, onNavigate, router, selectedKey]);

    const navItems = useMemo<DashboardSidebarShellItem[]>(() => {
        const primaryItems = primarySections.flatMap(section => (
            section.items.map((item, index) => createRouteItem(
                item,
                index === 0 ? section.label : undefined,
            ))
        ));

        if (advancedItems.length === 0) return primaryItems;

        primaryItems.push({
            key: 'answerlattice-all-tools',
            label: allToolsRevealed
                ? ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.showFewerTools
                : ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.allTools,
            icon: allToolsRevealed ? LuChevronUp : LuLayoutGrid,
            sectionLabel: ANSWERLATTICE_CUSTOMER_LANGUAGE.navigation.advanced,
            onClick: () => setAllToolsRevealed(current => !current),
        });

        visibleAdvancedItems.forEach(item => {
            primaryItems.push(createRouteItem(item));
        });

        return primaryItems;
    }, [advancedItems.length, allToolsRevealed, createRouteItem, primarySections, visibleAdvancedItems]);

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
        />
    );
}
