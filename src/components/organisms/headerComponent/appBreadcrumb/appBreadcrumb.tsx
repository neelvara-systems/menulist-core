
import { NavItemType, SIDEBAR_DASHBOARD_LAYOUT } from '@constant/navigations';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { BreadcrumbSubpathsType, BreadcrumbType, getBreadcrumbLayoutState, getSidebarLayoutState, getSidebarState, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { Button, Divider, Dropdown, Flex, Space, Tooltip, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useCallback } from 'react';
import { LuChevronDown, LuHome, LuPanelLeftClose, LuPanelLeftOpen } from 'react-icons/lu';
import styles from '../headerComponent.module.scss';
const { Text } = Typography;

function AppBreadcrumb() {

    const tNav = useTranslations('Navigation');
    const tHeader = useTranslations('Header');
    const pathname = usePathname();
    const router = useRouter();
    const isCollapsed = useAppSelector(getSidebarState);
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();
    const isVerticalBreadcrumb = useAppSelector(getBreadcrumbLayoutState)
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState)

    const onClickBreadCrumb = (subNav, parentNav: any, isParent: boolean = false) => {
        if (isParent) {
            if (Boolean(parentNav?.key?.includes("websites"))) {
                Boolean(parentNav.route) && router.replace(`${parentNav.route}`)
            }
        } else {
            const newNav: NavItemType = parentNav.subNav.find((nav: NavItemType) => nav.key == subNav.key);
            router.replace(`${newNav.route}`)
        }
    }


    const getBredcrumbs = (pathname) => {
        let breadcrumbArray: any = [];
        const navCopy = [...SIDEBAR_DASHBOARD_LAYOUT]
        let activeParentNavIndex = -1;
        navCopy.map((navItem: NavItemType, pIndex: number) => {
            if (navItem.subNav) {
                navItem.subNav.map((subNavItem: any, sIndex) => {
                    subNavItem.key = `${pIndex}${sIndex}`
                    if (pathname == `${subNavItem.route}`) {
                        subNavItem.active = true;
                        activeParentNavIndex = pIndex;
                    } else subNavItem.active = false;
                })
            } else {
                if (pathname == `${navItem.route}`) {
                    activeParentNavIndex = pIndex;
                }
            }
        })
        if (activeParentNavIndex != -1) {
            let activeParentNav: NavItemType = navCopy[activeParentNavIndex];
            const subNavEle = [];
            const hasActiveSubNav = activeParentNav.subNav?.some((nav) => nav.active);
            if (activeParentNav.subNav && hasActiveSubNav) {
                const subNavCopy = [...activeParentNav.subNav]
                subNavCopy.map((nav) => {
                    subNavEle.push({
                        key: nav.key,
                        // active: nav.active,
                        label: nav.label,
                        icon: <nav.icon style={{ fontSize: 15 }} />,
                        route: nav.route,
                    })
                    //if subnav selected then subnav key set to parents key for displaying on dropdown label
                    if (nav.active) activeParentNav.key = nav.key;
                })
            }
            breadcrumbArray.push({ key: activeParentNav.key, icon: activeParentNav.icon, route: activeParentNav.route, label: activeParentNav.label, subNav: subNavEle.length ? subNavEle : [] })
        }
        // }
        return [...breadcrumbArray];
    }
    const breadcrumbs = useCallback(() => getBredcrumbs(pathname), [pathname])

    return (
        <Fragment>
            <div className={styles.breadcrumbsWrap}>
                <Space align='center'>

                    {isVerticalSidebar && <>
                        <Button icon={isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />} type='text' style={{ padding: "0", fontSize: "20px" }} onClick={() => dispatch(toggleSidbar(!isCollapsed))} />
                    </>}

                    <Divider type='vertical' plain style={{ height: "32px", margin: "0", borderInlineStartWidth: "2px", top: "2px", }} />

                    <Tooltip title={tHeader('goToHomePage')}>
                        <Button icon={<LuHome />} type='text' style={{ padding: "0", fontSize: "20px" }} onClick={() => router.push('/')} />
                    </Tooltip>

                    <Divider type='vertical' plain style={{ height: "32px", margin: "0", borderInlineStartWidth: "2px", top: "2px", }} />

                    <Space align='center' size={0}>
                        {breadcrumbs().map((breadcrumb: BreadcrumbType, i: number) => {
                            const activeSubNav = breadcrumb.subNav ? breadcrumb.subNav.find((subBreadcrumb: BreadcrumbSubpathsType) => breadcrumb.key == subBreadcrumb.key) : null;
                            return <Fragment key={i}>
                                <Tooltip title={tHeader('currentlyOnTab', { tab: tNav(breadcrumb.label as any) })}>
                                    <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent }} onClick={() => onClickBreadCrumb(null, breadcrumb, true)}>
                                        <breadcrumb.icon />
                                        {tNav(breadcrumb.label as any)}
                                    </Text>
                                </Tooltip>
                                {breadcrumb.subNav.length != 0 && <>
                                    <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorBgBase, padding: "0 5px" }}>{">"}</Text>
                                    {breadcrumb.subNav.length > 1 ? <>
                                        {!isVerticalBreadcrumb ? <>
                                            <Flex gap={10}>
                                                {breadcrumb.subNav.map((subBreadcrumb: BreadcrumbSubpathsType, j: number) => {
                                                    const active = pathname == subBreadcrumb.route;
                                                    return <Fragment key={j}>
                                                        <Button
                                                            onClick={() => onClickBreadCrumb(subBreadcrumb, breadcrumb, false)}
                                                            icon={subBreadcrumb.icon} ghost={active} type={active ? "primary" : "default"}>
                                                            {tNav(subBreadcrumb.label as any)}
                                                        </Button>
                                                    </Fragment>
                                                })}
                                            </Flex>
                                        </> : <>
                                            <Dropdown menu={{
                                                items: breadcrumb.subNav,
                                                onClick: (selectedKey) => onClickBreadCrumb(selectedKey, breadcrumb, false),
                                                selectable: true,
                                                defaultSelectedKeys: [`${breadcrumb.key.toString()}`],
                                            }}>
                                                <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent, cursor: "pointer" }}>
                                                    {activeSubNav.icon}
                                                    {tNav(activeSubNav?.label as any) || ''} <LuChevronDown />
                                                </Text>
                                            </Dropdown>
                                        </>}
                                    </>
                                        : <>
                                            <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent, cursor: "pointer" }}>
                                                {tNav(breadcrumb.subNav[0]?.label as any) || ''}
                                            </Text>
                                        </>}
                                </>}
                            </Fragment>
                        })}
                    </Space>
                </Space>
            </div>
        </Fragment>
    )
}

export default AppBreadcrumb
