import { FEATURE_FLAGS } from '@config/features';
import { NAVIGARIONS_ROUTINGS, NavItemType, SIDEBAR_DASHBOARD_LAYOUT, SUPPORT_MENU_OPTIONS } from '@constant/navigations';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { shouldShowGrowthOSNavigation } from '@lib/growthos/entitlements';
import { getPermissionRequirementForPath, satisfiesPermissionRequirement } from '@lib/permissions/permissionRequirements';
import { canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import { hasStarterWorkspaceAccess, isStarterWorkspaceRoute } from '@lib/onboarding/starterActivation';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState, getSidebarLayoutState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, Flex, Menu, MenuProps, Popover, theme } from 'antd';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { LuArrowBigDown } from 'react-icons/lu';
import { MdDarkMode, MdLightMode, MdOutlineSettingsSuggest } from 'react-icons/md';
import { TbPhoneCalling } from 'react-icons/tb';
import styles from './horizontalSidebarComponent.module.scss';

const HorizontalSidebarComponent = () => {

    const tNav = useTranslations('Navigation');
    const tSupport = useTranslations('SupportMenu');
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const router = useRouter()
    const [activeNav, setActiveNav] = useState<any[]>([]);
    const [supportPopoverOpen, setSupportPopoverOpen] = useState(false);
    const isDarkMode = useAppSelector(getDarkModeState);
    const currentLayout = useAppSelector(getSidebarLayoutState)
    const pathname = usePathname()
    const { data: session } = useSession();
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const { activeSubscription, tenantDetails, storeDetails, isMasterUser, userPermissions } = useContext(PlatformGlobalDataContext);

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

    const getMenuItems = () => {
        const menuCopy = [];
        const navFeatureAllowed = (nav: NavItemType) => {
            if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_ENTITY_BLOCKS) {
                return FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_ASSET_TEMPLATES) {
                return FEATURE_FLAGS.ENABLE_PLATFORM_ASSET_TEMPLATE_MANAGER;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_COST_POSTURE) {
                return FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.PLATFORM_FOUNDER_MONITOR) {
                return FEATURE_FLAGS.ENABLE_PLATFORM_FOUNDER_MONITOR;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.AI_MENU_MANAGER) {
                return FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER;
            }
            return true;
        };

        SIDEBAR_DASHBOARD_LAYOUT.map((nav: NavItemType) => {
            if (hasStarterAccess && !isStarterWorkspaceRoute(nav.route)) {
                return;
            }
            if (!navFeatureAllowed(nav)) {
                return;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.LOCATIONS) {
                if (!canManageLocations) {
                    return;
                }
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.GROWTH_KITS) {
                if (!shouldShowGrowthOSNavigation({
                    activeSubscription,
                    storeDetails,
                    storeId: storeDetails?.storeId,
                })) {
                    return;
                }
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.RESELLER) {
                if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD || ![ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE].includes(platformRole)) {
                    return;
                }
            }
            if (nav.allowedPlatformRoles?.length && !nav.allowedPlatformRoles.includes(platformRole)) {
                return;
            }
            const parentPermissionAllowed = canShowNavForPermissions(nav);
            const visibleSubNav = nav.subNav?.filter((subnav) => {
                if (!navFeatureAllowed(subnav)) return false;
                const platformRoleAllowed = !subnav.allowedPlatformRoles?.length || subnav.allowedPlatformRoles.includes(platformRole);
                const subNavPermissionAllowed = canShowNavForPermissions(subnav)
                    || (Boolean(nav.defaultRoute) && subnav.route === nav.defaultRoute && parentPermissionAllowed);
                return platformRoleAllowed && subNavPermissionAllowed;
            });
            if (!parentPermissionAllowed && !visibleSubNav?.length) {
                return;
            }

            const navItem: any = {
                key: nav.label,
                label: tNav(nav.label as any),
                icon: <nav.icon />,
                route: `${nav.route}`,
                children: Boolean(visibleSubNav?.length) ?
                    visibleSubNav.map((subnav: NavItemType, subIndex: number) => {
                        return {
                            key: `${nav.label}-${subnav.label}`,
                            label: tNav(subnav.label as any),
                            icon: <subnav.icon />,
                            route: `${subnav.route}`,
                            className: styles.menuItemWrap,
                        }
                    }) : null,
                className: styles.menuItemWrap,
                popupClassName: styles.subMenuWrap,
            }
            menuCopy.push(navItem)
        })
        return menuCopy;
    }

    useEffect(() => {
        let currentNav, currentSubNav;
        getMenuItems().map((nav: any, index: number) => {
            //second level sub nav clicked
            if (Boolean(nav?.children?.length)) {
                nav.children.map((subnav: NavItemType, subIndex: number) => {
                    subnav.active = false
                    if (pathname == `${subnav.route}`) {
                        // nav.showSubNav = true;
                        currentSubNav = subnav;
                        currentNav = nav;
                    }
                })
            } else if (pathname == `${nav.route}`) {
                currentNav = nav;
            }
        })

        if (currentNav) {
            if (currentSubNav) {
                setActiveNav([currentNav.key, currentSubNav.key])
            } else {
                setActiveNav([currentNav.key])
            }
        }
    }, [pathname, platformRole, canManageLocations, hasStarterAccess, userPermissions])

    const onClickNav: MenuProps['onClick'] = (menu: any) => {
        getMenuItems().map((nav: any) => {
            if (Boolean(nav?.children?.length)) {
                nav.children.map((subnav: NavItemType) => {
                    if (subnav.key == menu.key) {
                        // activeSubNav = subnav;
                        // activeNav = nav;
                        if (subnav.route) router.push(`${subnav.route}`);
                    }
                })
            } else {
                if (nav.key == menu.key) {
                    // activeNav = nav;
                    router.push(`${nav.route}`);
                }
            }
        })
    };

    const onClickSupportMenuItem = (option: typeof SUPPORT_MENU_OPTIONS[number]) => {
        setSupportPopoverOpen(false);
        router.push(option.route);
    };

    const onClickActionsMenu = (navItem: NavItemType) => {
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
    };

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

    return (
        <motion.div
            className={`${styles.sidebarContainer} ${styles[currentLayout]}`}
            style={{ backgroundColor: token.colorBgBase, top: "52px", zIndex: 99 }}>
            <Flex gap={10} justify="space-between" align="center" style={{ width: '100%' }}>
                <Menu
                    className={styles.sidebarMenu}
                    expandIcon={<LuArrowBigDown />}
                    style={{ flex: 1 }}
                    defaultSelectedKeys={activeNav}
                    selectedKeys={activeNav}
                    mode={"horizontal"}
                    items={getMenuItems()}
                    onClick={onClickNav}
                />
                <Flex gap={8} align="center" style={{ paddingRight: 16 }}>
                    {ACTION_MENUS.map((nav: NavItemType, i: number) => {
                        const isSupportMenu = nav.route === 'dashboard-help';
                        const isDarkModeMenu = nav.route === 'darkMode';

                        const buttonElement = (
                            <Button
                                key={i}
                                type="text"
                                onClick={() => onClickActionsMenu(nav)}
                                aria-label={nav.label}
                                icon={
                                    isDarkModeMenu ? (
                                        isDarkMode ? <MdLightMode style={{ fontSize: 18 }} /> : <MdDarkMode style={{ fontSize: 18 }} />
                                    ) : (
                                        typeof nav.icon === 'object' ? nav.icon : <nav.icon style={{ fontSize: 18 }} />
                                    )
                                }
                                style={{
                                    color: token.colorText,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            />
                        );

                        if (isSupportMenu) {
                            return (
                                <Popover
                                    key={i}
                                    content={<SupportPopoverContent />}
                                    trigger="click"
                                    open={supportPopoverOpen}
                                    onOpenChange={setSupportPopoverOpen}
                                    placement="bottomRight"
                                >
                                    {buttonElement}
                                </Popover>
                            );
                        }

                        return buttonElement;
                    })}
                </Flex>
            </Flex>
        </motion.div>
    )
}

export default HorizontalSidebarComponent
