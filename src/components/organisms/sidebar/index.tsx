import EcomsIconLogo from '@atoms/ecomsLogo';
import EcomsHorizontalLogo from '@atoms/ecomsLogo/ecomsHorizontalLogo';
import { FEATURE_FLAGS } from '@config/features';
import { NAVIGARIONS_ROUTINGS, NavItemType, SIDEBAR_DASHBOARD_LAYOUT, SUPPORT_MENU_OPTIONS } from '@constant/navigations';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import DashboardSidebarShell, { DashboardSidebarShellItem } from '@/components/shared/dashboardShell/DashboardSidebarShell';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { shouldShowGrowthOSNavigation } from '@lib/growthos/entitlements';
import { canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import { hasStarterWorkspaceAccess, isStarterWorkspaceRoute } from '@lib/onboarding/starterActivation';
import { getPermissionRequirementForPath, satisfiesPermissionRequirement } from '@lib/permissions/permissionRequirements';
import ClientOnlyProvider from '@providers/clientOnlyProvider';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Popover, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import { MdDarkMode, MdLightMode, MdOutlineSettingsSuggest } from 'react-icons/md';
import { TbPhoneCalling } from 'react-icons/tb';

interface SidebarComponentProps {
    onExpandedChange?: (expanded: boolean) => void;
}

const SidebarComponent = ({ onExpandedChange }: SidebarComponentProps) => {
    const tNav = useTranslations('Navigation');
    const tSupport = useTranslations('SupportMenu');
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const router = useRouter()
    const isDarkMode = useAppSelector(getDarkModeState);
    const isCollapsed = useAppSelector(getSidebarState)
    const { activeSubscription, tenantDetails, storeDetails, isMasterUser, userPermissions } = useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const [activeNav, setActiveNav] = useState<NavItemType>({ label: 'Builder', route: 'builder', icon: 'builder', isChild: false });
    const [sidebarMenusList, setSidebarMenusList] = useState(SIDEBAR_DASHBOARD_LAYOUT);
    const [supportPopoverOpen, setSupportPopoverOpen] = useState(false);
    const pathname = usePathname()

    const ACTION_MENUS: NavItemType[] = [
        { label: 'App Appearance', route: 'dashboard-settings', icon: <MdOutlineSettingsSuggest /> },
        { label: 'Dark Mode', route: 'darkMode', icon: <MdDarkMode /> },
        { label: 'Support', route: 'dashboard-help', icon: <TbPhoneCalling /> },
    ]

    const canShowNavForPermissions = (nav: NavItemType) => (
        satisfiesPermissionRequirement(userPermissions, getPermissionRequirementForPath(nav.route))
    )
    const canManageLocations = canManageLocationSettings({
        isMasterUser,
        storeDetails,
        tenantDetails,
        userPermissions,
    });
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasPaidAccess);

    useEffect(() => {
        const getVisibleSubNav = (nav: NavItemType) => {
            const parentPermissionAllowed = canShowNavForPermissions(nav);

            return nav.subNav?.filter(subnav => {
                const platformRoleAllowed = !subnav.allowedPlatformRoles?.length || subnav.allowedPlatformRoles.includes(platformRole);
                const subNavPermissionAllowed = canShowNavForPermissions(subnav)
                    || (Boolean(nav.defaultRoute) && subnav.route === nav.defaultRoute && parentPermissionAllowed);
                return platformRoleAllowed && subNavPermissionAllowed;
            }) || [];
        };

        // Filter nav items based on user context
        const filteredLayout = SIDEBAR_DASHBOARD_LAYOUT.filter(nav => {
            if (hasStarterAccess && !isStarterWorkspaceRoute(nav.route)) {
                return false;
            }
            // Hide Locations for non-master users or when feature is disabled
            if (nav.route === NAVIGARIONS_ROUTINGS.LOCATIONS) {
                return canManageLocations;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.GROWTH_KITS) {
                return shouldShowGrowthOSNavigation({
                    activeSubscription,
                    storeDetails,
                    storeId: storeDetails?.storeId,
                });
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.RESELLER) {
                return FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD
                    && [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE].includes(platformRole);
            }
            if (nav.allowedPlatformRoles?.length && !nav.allowedPlatformRoles.includes(platformRole)) {
                return false;
            }
            if (nav.subNav?.length) {
                return getVisibleSubNav(nav).length > 0 || canShowNavForPermissions(nav);
            }
            return canShowNavForPermissions(nav);
        });

        // Create deep copy to avoid state mutation
        const menuCopy = filteredLayout.map(nav => ({
            ...nav,
            showSubNav: false,
            subNavActive: false,
            active: false,
            subNav: getVisibleSubNav(nav).map(subnav => ({
                ...subnav,
                active: false
            }))
        }));

        let currentNav: NavItemType | null = null;

        menuCopy.forEach((nav, index) => {
            // Check sub-nav matches
            if (nav?.subNav?.length) {
                nav.subNav.forEach((subnav) => {
                    if (pathname === subnav.route) {
                        nav.showSubNav = true;
                        subnav.active = true;
                        nav.subNavActive = true;
                        currentNav = subnav;
                    }
                });
            }

            // Check main nav match
            if (pathname === nav.route) {
                currentNav = nav;
                nav.active = true;
            }
        });

        if (currentNav) setActiveNav(currentNav);
        setSidebarMenusList(menuCopy);
    }, [pathname, canManageLocations, hasStarterAccess, platformRole, userPermissions])

    const onClickNav = (navItem: NavItemType, menuLevel: number, navIndex: number, subNavIndex: number = -1) => {
        if (menuLevel === 1) {
            if (Boolean(navItem?.subNav?.length)) {
                const menuCopy = [...sidebarMenusList];
                menuCopy[navIndex].showSubNav = !menuCopy[navIndex].showSubNav;
                setSidebarMenusList(menuCopy);
                if (navItem.defaultRoute) router.push(`${navItem.defaultRoute}`);
            } else {
                router.push(`${navItem.route}`);
            }
        } else {
            router.push(`${navItem.route}`);
        }
    };

    const onClickSupportMenuItem = (option: typeof SUPPORT_MENU_OPTIONS[number]) => {
        setSupportPopoverOpen(false);
        router.push(option.route);
    };

    const onClickActionsMenu = (navItem) => {
        switch (navItem.route) {
            case 'darkMode':
                dispatch(toggleDarkMode(!isDarkMode))
                break;
            case 'dashboard-settings':
                dispatch(toggleAppSettingsPanel(true))
                break;
            case 'dashboard-help':
                setSupportPopoverOpen(!supportPopoverOpen);
                break;
            default:
                break;
        }
    }

    const SupportPopoverContent = () => (
        <div style={{ width: 280, padding: '8px 0' }}>
            <div style={{
                padding: '8px 16px',
                marginBottom: 8,
                borderBottom: `1px solid ${token.colorBorderSecondary}`
            }}>
                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: token.colorText,
                    marginBottom: 4
                }}>{tSupport('title')}</div>
                <div style={{
                    fontSize: 12,
                    color: token.colorTextSecondary
                }}>{tSupport('subtitle')}</div>
            </div>
            {SUPPORT_MENU_OPTIONS.map((option) => (
                <div
                    key={option.key}
                    onClick={() => onClickSupportMenuItem(option)}
                    style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        transition: 'all 0.2s',
                        borderRadius: 4,
                        margin: '0 8px',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = token.colorBgTextHover;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <div style={{
                        color: token.colorPrimary,
                        marginTop: 2
                    }}>
                        <option.icon style={{ fontSize: 20 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: token.colorText,
                            marginBottom: 2
                        }}>
                            {tSupport(option.key as any)}
                        </div>
                        <div style={{
                            fontSize: 12,
                            color: token.colorTextSecondary,
                            lineHeight: 1.4
                        }}>
                            {tSupport(`${option.key}_desc` as any)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const navItems = useMemo<DashboardSidebarShellItem[]>(() => (
        sidebarMenusList.map((nav: NavItemType, navIndex: number) => ({
            key: nav.route,
            label: tNav(nav.label as any),
            icon: nav.icon,
            active: nav.active,
            subNavActive: nav.subNavActive,
            expanded: nav.showSubNav,
            onClick: () => onClickNav(nav, 1, navIndex),
            subNav: nav.subNav?.map((subNav: NavItemType, subnavIndex: number) => ({
                key: subNav.route,
                label: tNav(subNav.label as any),
                icon: subNav.icon,
                active: subNav.active,
                onClick: () => onClickNav(subNav, 2, navIndex, subnavIndex),
            })),
        }))
    ), [sidebarMenusList, tNav]);

    const actionItems = useMemo<DashboardSidebarShellItem[]>(() => (
        ACTION_MENUS.map((nav: NavItemType) => {
            const isSupportMenu = nav.route === 'dashboard-help';
            const item: DashboardSidebarShellItem = {
                key: nav.route,
                label: tNav(nav.label as any),
                icon: nav.route === 'darkMode' ? (isDarkMode ? <MdLightMode /> : <MdDarkMode />) : nav.icon,
                active: nav.route === activeNav.route,
                iconActive: nav.route === 'darkMode' && isDarkMode,
                onClick: () => onClickActionsMenu(nav),
            };

            if (isSupportMenu) {
                item.renderWrapper = (button) => (
                    <Popover
                        content={<SupportPopoverContent />}
                        onOpenChange={setSupportPopoverOpen}
                        open={supportPopoverOpen}
                        placement="rightTop"
                        trigger="click"
                    >
                        {button}
                    </Popover>
                );
            }

            return item;
        })
    ), [activeNav.route, isDarkMode, supportPopoverOpen, tNav]);

    return (
        <ClientOnlyProvider>
            <DashboardSidebarShell
                actionItems={actionItems}
                isCollapsed={isCollapsed}
                logoCollapsed={<EcomsIconLogo />}
                logoExpanded={<EcomsHorizontalLogo color={token.colorText} />}
                navItems={navItems}
                onExpandedChange={onExpandedChange}
            />
        </ClientOnlyProvider>
    )
}

export default SidebarComponent
