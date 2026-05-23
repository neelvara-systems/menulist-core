import EcomsIconLogo from '@atoms/ecomsLogo';
import EcomsHorizontalLogo from '@atoms/ecomsLogo/ecomsHorizontalLogo';
import { FEATURE_FLAGS } from '@config/features';
import { NAVIGARIONS_ROUTINGS, NavItemType, SIDEBAR_DASHBOARD_LAYOUT, SUPPORT_MENU_OPTIONS } from '@constant/navigations';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import { hasStarterWorkspaceAccess, isStarterWorkspaceRoute } from '@lib/onboarding/starterActivation';
import { getPermissionRequirementForPath, satisfiesPermissionRequirement } from '@lib/permissions/permissionRequirements';
import ClientOnlyProvider from '@providers/clientOnlyProvider';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState, getSidebarState, toggleAppSettingsPanel, toggleDarkMode, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, Popover, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useContext, useEffect, useMemo, useState } from 'react';
import { MdDarkMode, MdLightMode, MdOutlineNavigateNext, MdOutlineSettingsSuggest } from 'react-icons/md';
import { TbPhoneCalling } from 'react-icons/tb';
import styles from './sidebarComponent.module.scss';

const SidebarComponent = () => {
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
    const [hoverId, setHoverId] = useState(null);
    const [activeParentNav, setActiveParentNav] = useState<NavItemType>({ label: '', route: '', icon: '', isChild: false })
    const [activeNav, setActiveNav] = useState<NavItemType>({ label: 'Builder', route: 'builder', icon: 'builder', isChild: false });
    const [isHover, setIsHover] = useState(false);
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
        // Filter nav items based on user context
        const filteredLayout = SIDEBAR_DASHBOARD_LAYOUT.filter(nav => {
            if (hasStarterAccess && !isStarterWorkspaceRoute(nav.route)) {
                return false;
            }
            // Hide Locations for non-master users or when feature is disabled
            if (nav.route === NAVIGARIONS_ROUTINGS.LOCATIONS) {
                return canManageLocations;
            }
            if (nav.route === NAVIGARIONS_ROUTINGS.RESELLER) {
                return FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD
                    && [ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE].includes(platformRole);
            }
            if (nav.allowedPlatformRoles?.length && !nav.allowedPlatformRoles.includes(platformRole)) {
                return false;
            }
            return canShowNavForPermissions(nav);
        });

        // Create deep copy to avoid state mutation
        const menuCopy = filteredLayout.map(nav => ({
            ...nav,
            showSubNav: false,
            subNavActive: false,
            active: false,
            subNav: nav.subNav?.map(subnav => ({
                ...subnav,
                active: false
            })).filter(subnav => !subnav.allowedPlatformRoles?.length || subnav.allowedPlatformRoles.includes(platformRole))
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
                        setActiveParentNav(nav);
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

    const showExpandedSidebar = useMemo(() => Boolean(!isCollapsed || isHover), [isCollapsed, isHover])

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
            case 'collapsed':
                dispatch(toggleSidbar(!isCollapsed))
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

    return (
        <ClientOnlyProvider>
            <>
                <motion.nav
                    role="navigation"
                    aria-label="Main navigation"
                    className={styles.sidebarContainer}
                    onMouseEnter={() => setIsHover(true)}
                    onMouseLeave={() => setIsHover(false)}
                    animate={{ width: showExpandedSidebar ? '200px' : "62px" }}
                    style={{ backgroundColor: token.colorBgBase, color: token.colorTextBase, borderRight: `1px solid ${token.colorBorder}` }}>

                    <div className={styles.itemWrap} style={{ borderBottom: `1px solid ${token.colorBorder}`, padding: showExpandedSidebar ? "20px" : "2px" }}>
                        <div className={styles.logo}>
                            {isHover || !isCollapsed ? <EcomsHorizontalLogo color={token.colorText} /> : <EcomsIconLogo />}
                        </div>
                    </div>

                    <div className={styles.menuItemsWrap}>
                        {sidebarMenusList.map((nav: NavItemType, navIndex: number) => {
                            const isActive = nav.active;
                            const NAV_ICON = nav.icon;
                            return <Fragment key={navIndex}>
                                <Button
                                    type="text"
                                    className={`${styles.menuItemWrap} ${isActive ? styles.active : ""} ${styles[nav.route]}`}
                                    onMouseEnter={() => setHoverId(nav.route)}
                                    onMouseLeave={() => setHoverId('')}
                                    onClick={() => onClickNav(nav, 1, navIndex)}
                                    aria-label={nav.label}
                                    aria-expanded={nav.subNav ? nav.showSubNav : undefined}
                                    aria-current={isActive ? 'page' : undefined}
                                    style={{
                                        backgroundColor: (isActive) ? token.colorPrimaryBorder : (nav.route === hoverId || nav.subNavActive ? token.colorBgTextHover : token.colorBgBase),
                                        color: (isActive) ? token.colorTextLightSolid : (nav.route === hoverId || nav.subNavActive ? token.colorPrimaryTextActive : token.colorText),
                                        width: '100%',
                                        height: 'auto',
                                        padding: 0,
                                        display: 'flex',
                                        justifyContent: 'flex-start',
                                        position: 'relative',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div className={styles.navWrap}>
                                        <div className={styles.labelIconWrap}>
                                            <div className={styles.iconWrap} style={{
                                                color: (isActive) ? token.colorTextLightSolid : (nav.route === hoverId || nav.subNavActive ? token.colorPrimaryTextActive : token.colorText),
                                            }}>
                                                <NAV_ICON />
                                            </div>
                                            {showExpandedSidebar && <motion.div
                                                initial={{ width: "0", opacity: 0 }}
                                                animate={{ width: 'max-content', opacity: 1 }}
                                                exit={{ width: "0", opacity: 0 }}
                                                className={styles.label}
                                                style={{ color: (isActive) ? token.colorPrimary : (nav.route === hoverId || nav.subNavActive ? token.colorPrimaryTextActive : token.colorText), }}
                                            >
                                                {tNav(nav.label as any)}
                                            </motion.div>}
                                        </div>
                                        {nav.subNav &&
                                            <motion.div
                                                className={`${styles.subNavIcon} ${styles.iconWrap}`}
                                                style={{
                                                    color: (isActive) ? token.colorTextLightSolid : (nav.route === hoverId ? token.colorPrimaryTextActive : token.colorText),
                                                }}
                                                transition={{ duration: 0.1 }}
                                                animate={{
                                                    rotate: Boolean(nav.showSubNav) ? 90 : 0,
                                                }}>
                                                <MdOutlineNavigateNext />
                                            </motion.div>}
                                    </div>

                                    {/* sidebar collapsed active mark strip */}
                                    <AnimatePresence>
                                        {((isActive || nav.subNavActive) && isCollapsed && !isHover) && <motion.div
                                            initial={{ height: "100%", opacity: 0 }}
                                            animate={{ height: '100%', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={styles.activeMark} style={{ background: token.colorPrimary }}></motion.div>}
                                    </AnimatePresence>
                                </Button>
                                <AnimatePresence>
                                    {Boolean(nav.showSubNav && (showExpandedSidebar)) && <>
                                        <motion.div
                                            style={{
                                                width: "100%",
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '5px',
                                                paddingLeft: '10px'
                                            }}
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'max-content', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                        >
                                            {nav.subNav?.map((subNav: NavItemType, subnavIndex: number) => {
                                                const SUB_NAV_ICON = subNav.icon;
                                                return <motion.div
                                                    key={subnavIndex}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    transition={{
                                                        duration: 0.2,
                                                        delay: subnavIndex * 0.05,
                                                        ease: "easeOut"
                                                    }}
                                                >
                                                    <Button
                                                        type="text"
                                                        className={`${styles.menuItemWrap} ${styles.subMenuItemWrap} ${subNav.active ? styles.active : ""}`}
                                                        onMouseEnter={() => setHoverId(subNav.route)}
                                                        onMouseLeave={() => setHoverId('')}
                                                        onClick={() => onClickNav(subNav, 2, navIndex, subnavIndex)}
                                                        aria-label={subNav.label}
                                                        aria-current={subNav.active ? 'page' : undefined}
                                                        style={{
                                                            background: `${(subNav.active) ? token.colorPrimaryBorder : ((hoverId && (subNav.route === hoverId)) ? token.colorBgTextHover : token.colorBgBase)}`,
                                                            color: (subNav.active) ? token.colorTextLightSolid : ((hoverId && (subNav.route === hoverId)) ? token.colorPrimaryTextActive : token.colorText),
                                                            width: '100%',
                                                            height: 'auto',
                                                            padding: 0,
                                                            display: 'flex',
                                                            justifyContent: 'flex-start',
                                                            textAlign: 'left'
                                                        }}
                                                    >
                                                        <div className={styles.navWrap}>
                                                            <div className={styles.labelIconWrap}>
                                                                <div className={styles.iconWrap} style={{
                                                                    color: (subNav.active) ? token.colorTextLightSolid : ((hoverId && (subNav.route === hoverId)) ? token.colorPrimaryTextActive : token.colorText),
                                                                }}>
                                                                    <SUB_NAV_ICON />
                                                                </div>
                                                                <div className={styles.label}>
                                                                    {tNav(subNav.label as any)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Button>
                                                </motion.div>
                                            })}
                                        </motion.div>
                                    </>}
                                </AnimatePresence>
                            </Fragment>
                        })}
                    </div>
                    <div className={`${styles.menuItemsWrap} ${styles.actionNavItem} `} style={{ background: token.colorBgBase, borderTop: `1px solid ${token.colorBorder}` }}>
                        {ACTION_MENUS.map((nav: NavItemType, i: number) => {
                            const isActive = nav.route === activeNav.route;
                            const isSupportMenu = nav.route === 'dashboard-help';

                            const buttonElement = (
                                <Button
                                    type="text"
                                    className={`${styles.menuItemWrap}`}
                                    onMouseEnter={() => setHoverId(nav.route)}
                                    onMouseLeave={() => setHoverId('')}
                                    onClick={() => onClickActionsMenu(nav)}
                                    aria-label={nav.label}
                                    style={{
                                        backgroundColor: `${(isActive) ? token.colorPrimaryBgHover : ((hoverId && (nav.route === hoverId || nav.route === activeParentNav.route)) ? token.colorBgTextHover : token.colorBgBase)}`,
                                        color: (isActive) ? token.colorTextLightSolid : ((hoverId && (nav.route === hoverId || nav.route === activeParentNav.route)) ? token.colorPrimaryTextActive : token.colorText),
                                        width: '100%',
                                        height: 'auto',
                                        padding: 0,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        textAlign: 'left'
                                    }}
                                >
                                    <div className={styles.navWrap}>
                                        <div className={styles.labelIconWrap}>
                                            <>
                                                {nav.route === "collapsed" ? <motion.div
                                                    className={`${styles.iconWrap}`}
                                                    style={{ color: (nav.route === hoverId || isCollapsed) ? token.colorPrimaryTextActive : token.colorText }}
                                                    transition={{ duration: 0.07 }}
                                                    animate={{ rotate: !Boolean(isCollapsed) ? 180 : 0, }}>
                                                    {nav.icon}
                                                </motion.div> : <>
                                                    {nav.route === "darkMode" ? <motion.div
                                                        className={`${styles.iconWrap}`}
                                                        style={{ color: (nav.route === hoverId || isDarkMode) ? token.colorPrimaryTextActive : token.colorText }}
                                                        transition={{ duration: 0.07 }}
                                                        animate={{ rotate: !Boolean(isDarkMode) ? 360 : 0, }}>
                                                        {isDarkMode ? <MdLightMode /> : <MdDarkMode />}
                                                    </motion.div> :
                                                        <div className={styles.iconWrap} style={{ color: (isActive) ? token.colorTextLightSolid : (nav.route === hoverId ? token.colorPrimaryTextActive : token.colorText), }}>{nav.icon}</div>}
                                                </>}

                                            </>

                                            {showExpandedSidebar && <motion.div
                                                initial={{ width: "max-content", opacity: 0 }}
                                                animate={{ width: 'max-content', opacity: 1 }}
                                                exit={{ width: "0", opacity: 0 }}
                                                className={styles.label}
                                            >
                                                {tNav(nav.label as any)}
                                            </motion.div>}
                                        </div>
                                    </div>
                                </Button>
                            );

                            return <Fragment key={i}>
                                {isSupportMenu ? (
                                    <Popover
                                        content={<SupportPopoverContent />}
                                        trigger="click"
                                        open={supportPopoverOpen}
                                        onOpenChange={setSupportPopoverOpen}
                                        placement="rightTop"
                                    // arrow={false}
                                    >
                                        {buttonElement}
                                    </Popover>
                                ) : (
                                    buttonElement
                                )}
                            </Fragment>
                        })}
                    </div>
                </motion.nav>
            </>
        </ClientOnlyProvider>
    )
}

export default SidebarComponent
