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
    CANONICA_GOVERNANCE_TABS,
    CANONICA_ROUTES,
    CANONICA_SIDEBAR_NAV,
    CanonicaNavItem,
    getCanonicaGovernanceRoute,
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
import { useMemo } from 'react';
import { LuLifeBuoy, LuMoon, LuSettings2, LuSun } from 'react-icons/lu';

interface CanonicaSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
    onOpenAppSettings?: () => void;
}

export default function CanonicaSidebar({ mobile = false, onNavigate, onOpenAppSettings }: CanonicaSidebarProps) {
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

    const selectedKey = useMemo(() => {
        if (
            normalizedPathname === CANONICA_ROUTES.GOVERNANCE &&
            searchParams.get('tab') === CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE
        ) {
            return getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE);
        }

        const exact = CANONICA_SIDEBAR_NAV.find(n => n.route === normalizedPathname);
        if (exact) return exact.route;

        const prefix = CANONICA_SIDEBAR_NAV.find(n => normalizedPathname.startsWith(`${n.route}/`));
        if (prefix) return prefix.route;

        return CANONICA_SIDEBAR_NAV[0]?.route || '';
    }, [normalizedPathname, searchParams]);

    const visibleNav = useMemo(() => (
        CANONICA_SIDEBAR_NAV.filter((nav: CanonicaNavItem) => {
            if ((nav.managementOnly || nav.platformOnly) && !canUseManagementSurfaces) return false;
            if (nav.requiredPermission && !access?.isPlatformAdmin && access?.permissions?.[nav.requiredPermission] !== true) return false;
            if (!nav.featureFlag) return true;
            return FEATURE_FLAGS[nav.featureFlag as keyof typeof FEATURE_FLAGS] === true;
        })
    ), [access?.isPlatformAdmin, access?.permissions, canUseManagementSurfaces]);

    const navItems = useMemo<DashboardSidebarShellItem[]>(() => (
        visibleNav.map((nav: CanonicaNavItem) => ({
            key: nav.route,
            label: nav.label,
            icon: nav.icon,
            active: selectedKey === nav.route,
            onClick: () => {
                router.push(toCanonicaDashboardRoute(nav.route, currentHostname));
                onNavigate?.();
            },
        }))
    ), [currentHostname, onNavigate, router, selectedKey, visibleNav]);

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
        />
    );
}
