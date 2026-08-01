import { SIDEBAR_DASHBOARD_LAYOUT } from '@constant/navigations';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { resolveAppBreadcrumb, type ResolvedAppBreadcrumbSubpath } from '@lib/navigation/resolveAppBreadcrumb';
import { getBreadcrumbLayoutState, getSidebarLayoutState, getSidebarState, toggleSidbar } from '@reduxSlices/clientThemeConfig';
import { Button, Divider, Dropdown, Flex, Space, Tooltip, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useMemo } from 'react';
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
    const isVerticalBreadcrumb = useAppSelector(getBreadcrumbLayoutState);
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState);
    const breadcrumbs = useMemo(
        () => resolveAppBreadcrumb(pathname ?? '', SIDEBAR_DASHBOARD_LAYOUT),
        [pathname],
    );

    const navigateToSubpath = (subNav: ResolvedAppBreadcrumbSubpath) => {
        router.replace(subNav.route);
    };

    return (
        <Fragment>
            <div className={styles.breadcrumbsWrap}>
                <Space align="center">
                    {isVerticalSidebar ? (
                        <Button
                            icon={isCollapsed ? <LuPanelLeftOpen /> : <LuPanelLeftClose />}
                            type="text"
                            style={{ padding: 0, fontSize: 20 }}
                            onClick={() => dispatch(toggleSidbar(!isCollapsed))}
                        />
                    ) : null}

                    <Divider type="vertical" plain style={{ height: 32, margin: 0, borderInlineStartWidth: 2, top: 2 }} />

                    <Tooltip title={tHeader('goToHomePage')}>
                        <Button icon={<LuHome />} type="text" style={{ padding: 0, fontSize: 20 }} onClick={() => router.push('/')} />
                    </Tooltip>

                    <Divider type="vertical" plain style={{ height: 32, margin: 0, borderInlineStartWidth: 2, top: 2 }} />

                    <Space align="center" size={0}>
                        {breadcrumbs.map((breadcrumb) => {
                            const activeSubNav = breadcrumb.subNav.find((subBreadcrumb) => subBreadcrumb.active);
                            return (
                                <Fragment key={breadcrumb.key}>
                                    <Tooltip title={tHeader('currentlyOnTab', { tab: tNav(breadcrumb.label as never) })}>
                                        <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent }}>
                                            <breadcrumb.icon />
                                            {tNav(breadcrumb.label as never)}
                                        </Text>
                                    </Tooltip>
                                    {breadcrumb.subNav.length > 0 ? (
                                        <>
                                            <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorBgBase, padding: '0 5px' }}>{'>'}</Text>
                                            {breadcrumb.subNav.length > 1 ? (
                                                !isVerticalBreadcrumb ? (
                                                    <Flex gap={10}>
                                                        {breadcrumb.subNav.map((subBreadcrumb) => {
                                                            const active = pathname === subBreadcrumb.route;
                                                            return (
                                                                <Button
                                                                    key={subBreadcrumb.key}
                                                                    onClick={() => navigateToSubpath(subBreadcrumb)}
                                                                    icon={<subBreadcrumb.icon style={{ fontSize: 15 }} />}
                                                                    ghost={active}
                                                                    type={active ? 'primary' : 'default'}
                                                                >
                                                                    {tNav(subBreadcrumb.label as never)}
                                                                </Button>
                                                            );
                                                        })}
                                                    </Flex>
                                                ) : activeSubNav ? (
                                                    <Dropdown
                                                        menu={{
                                                            items: breadcrumb.subNav.map((subBreadcrumb) => ({
                                                                key: subBreadcrumb.key,
                                                                label: subBreadcrumb.label,
                                                                icon: <subBreadcrumb.icon style={{ fontSize: 15 }} />,
                                                            })),
                                                            onClick: ({ key }) => {
                                                                const selected = breadcrumb.subNav.find((subBreadcrumb) => String(subBreadcrumb.key) === key);
                                                                if (selected) navigateToSubpath(selected);
                                                            },
                                                            selectable: true,
                                                            selectedKeys: [String(activeSubNav.key)],
                                                        }}
                                                    >
                                                        <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent, cursor: 'pointer' }}>
                                                            <activeSubNav.icon style={{ fontSize: 15 }} />
                                                            {tNav(activeSubNav.label as never)} <LuChevronDown />
                                                        </Text>
                                                    </Dropdown>
                                                ) : null
                                            ) : (
                                                <Text className={styles.bradcrumbLabel} style={{ color: token.colorTextBase, background: token.colorFillContent }}>
                                                    {tNav(breadcrumb.subNav[0]?.label as never)}
                                                </Text>
                                            )}
                                        </>
                                    ) : null}
                                </Fragment>
                            );
                        })}
                    </Space>
                </Space>
            </div>
        </Fragment>
    );
}

export default AppBreadcrumb;
