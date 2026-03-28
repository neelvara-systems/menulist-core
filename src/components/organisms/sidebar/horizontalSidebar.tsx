import { NavItemType, SIDEBAR_DASHBOARD_LAYOUT, SUPPORT_MENU_OPTIONS } from '@constant/navigations';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useTodayAction } from '@providers/TodayActionProvider';
import { getDarkModeState, getSidebarLayoutState, toggleAppSettingsPanel, toggleDarkMode } from '@reduxSlices/clientThemeConfig';
import { Button, Flex, Menu, MenuProps, Popover, theme } from 'antd';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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

    // Today action indicator (per Strategy Doc: small dot when action exists)
    const { hasAction: hasTodayAction } = useTodayAction();

    const ACTION_MENUS: NavItemType[] = [
        { label: 'App Appearance', route: 'dashboard-settings', icon: <MdOutlineSettingsSuggest /> },
        { label: 'Dark Mode', route: 'darkMode', icon: <MdDarkMode /> },
        { label: 'Support', route: 'dashboard-help', icon: <TbPhoneCalling /> },
    ]

    const getMenuItems = () => {
        const menuCopy = [];
        SIDEBAR_DASHBOARD_LAYOUT.map((nav: NavItemType) => {
            // Add dot indicator for Today when action exists (per Strategy Doc)
            const isToday = nav.label === 'Today';
            const showDot = isToday && hasTodayAction;

            const navItem: any = {
                key: nav.label,
                label: showDot ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {tNav(nav.label as any)}
                        <span style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor: token.colorPrimary,
                            display: 'inline-block'
                        }} />
                    </span>
                ) : tNav(nav.label as any),
                icon: <nav.icon />,
                route: `${nav.route}`,
                children: Boolean(nav.subNav?.length) ?
                    nav.subNav.map((subnav: NavItemType, subIndex: number) => {
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
    }, [pathname])

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

