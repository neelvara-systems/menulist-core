'use client'

import { Fragment, useState } from 'react';
import type { CSSProperties, ComponentType, ReactNode } from 'react';
import { Button, theme } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { LuChevronRight } from 'react-icons/lu';
import styles from '@organisms/sidebar/sidebarComponent.module.scss';

export const DASHBOARD_SIDEBAR_EXPANDED_WIDTH = 200;
export const DASHBOARD_SIDEBAR_COLLAPSED_WIDTH = 62;

type DashboardShellIcon = ComponentType<any> | ReactNode;

export interface DashboardSidebarShellItem {
    key: string;
    label: ReactNode;
    icon: DashboardShellIcon;
    active?: boolean;
    subNavActive?: boolean;
    expanded?: boolean;
    iconActive?: boolean;
    subNav?: DashboardSidebarShellItem[];
    onClick?: () => void;
    renderWrapper?: (button: ReactNode) => ReactNode;
}

interface DashboardSidebarShellProps {
    navItems: DashboardSidebarShellItem[];
    actionItems?: DashboardSidebarShellItem[];
    logoExpanded: ReactNode;
    logoCollapsed?: ReactNode;
    isCollapsed?: boolean;
    mobile?: boolean;
    ariaLabel?: string;
    className?: string;
    style?: CSSProperties;
}

function renderIcon(icon: DashboardShellIcon) {
    if (typeof icon === 'function') {
        const Icon = icon as ComponentType<any>;
        return <Icon />;
    }

    return icon;
}

export default function DashboardSidebarShell({
    navItems,
    actionItems = [],
    logoExpanded,
    logoCollapsed,
    isCollapsed = false,
    mobile = false,
    ariaLabel = 'Main navigation',
    className = '',
    style,
}: DashboardSidebarShellProps) {
    const { token } = theme.useToken();
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [isHover, setIsHover] = useState(false);
    const showExpandedSidebar = mobile || !isCollapsed || isHover;

    const renderMenuButton = (
        item: DashboardSidebarShellItem,
        options: {
            subItem?: boolean;
            showChevron?: boolean;
        } = {},
    ) => {
        const itemHover = hoverId === item.key || item.subNavActive;
        const isActive = Boolean(item.active);
        const iconActive = Boolean(item.iconActive || isActive || itemHover);
        const foreground = isActive ? token.colorTextLightSolid : (itemHover ? token.colorPrimaryTextActive : token.colorText);
        const button = (
            <Button
                aria-current={isActive ? 'page' : undefined}
                aria-expanded={item.subNav ? item.expanded : undefined}
                aria-label={typeof item.label === 'string' ? item.label : item.key}
                className={`${styles.menuItemWrap} ${options.subItem ? styles.subMenuItemWrap : ''} ${isActive ? styles.active : ''}`}
                onClick={item.onClick}
                onMouseEnter={() => setHoverId(item.key)}
                onMouseLeave={() => setHoverId(null)}
                type="text"
                style={{
                    backgroundColor: isActive ? token.colorPrimaryBorder : (itemHover ? token.colorBgTextHover : token.colorBgBase),
                    color: foreground,
                    display: 'flex',
                    height: 'auto',
                    justifyContent: 'flex-start',
                    padding: 0,
                    position: 'relative',
                    textAlign: 'left',
                    width: '100%',
                }}
            >
                <div className={styles.navWrap}>
                    <div className={styles.labelIconWrap}>
                        <div
                            className={styles.iconWrap}
                            style={{
                                color: iconActive ? (isActive ? token.colorTextLightSolid : token.colorPrimaryTextActive) : token.colorText,
                            }}
                        >
                            {renderIcon(item.icon)}
                        </div>
                        {showExpandedSidebar && (
                            <motion.div
                                animate={{ width: 'max-content', opacity: 1 }}
                                className={styles.label}
                                exit={{ width: 0, opacity: 0 }}
                                initial={{ width: 0, opacity: 0 }}
                                style={{ color: foreground }}
                            >
                                {item.label}
                            </motion.div>
                        )}
                    </div>
                    {options.showChevron && (
                        <motion.div
                            animate={{ rotate: item.expanded ? 90 : 0 }}
                            className={`${styles.subNavIcon} ${styles.iconWrap}`}
                            style={{ color: foreground }}
                            transition={{ duration: 0.1 }}
                        >
                            <LuChevronRight />
                        </motion.div>
                    )}
                </div>

                <AnimatePresence>
                    {((isActive || item.subNavActive) && isCollapsed && !isHover && !mobile) && (
                        <motion.div
                            animate={{ height: '100%', opacity: 1 }}
                            className={styles.activeMark}
                            exit={{ height: 0, opacity: 0 }}
                            initial={{ height: '100%', opacity: 0 }}
                            style={{ background: token.colorPrimary }}
                        />
                    )}
                </AnimatePresence>
            </Button>
        );

        return item.renderWrapper ? item.renderWrapper(button) : button;
    };

    return (
        <motion.nav
            animate={{ width: mobile ? '100%' : (showExpandedSidebar ? `${DASHBOARD_SIDEBAR_EXPANDED_WIDTH}px` : `${DASHBOARD_SIDEBAR_COLLAPSED_WIDTH}px`) }}
            aria-label={ariaLabel}
            className={`${styles.sidebarContainer} ${className}`}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            role="navigation"
            style={{
                backgroundColor: token.colorBgBase,
                borderRight: mobile ? undefined : `1px solid ${token.colorBorder}`,
                color: token.colorTextBase,
                height: mobile ? '100dvh' : undefined,
                minHeight: mobile ? '100dvh' : undefined,
                overflowY: 'auto',
                paddingBottom: mobile ? 'env(safe-area-inset-bottom)' : undefined,
                paddingTop: mobile ? 'env(safe-area-inset-top)' : undefined,
                position: mobile ? 'relative' : undefined,
                width: mobile ? '100%' : undefined,
                WebkitOverflowScrolling: mobile ? 'touch' : undefined,
                ...style,
            }}
        >
            <div
                className={styles.itemWrap}
                style={{
                    borderBottom: `1px solid ${token.colorBorder}`,
                    padding: showExpandedSidebar ? 20 : 2,
                }}
            >
                <div className={styles.logo}>
                    {showExpandedSidebar ? logoExpanded : (logoCollapsed || logoExpanded)}
                </div>
            </div>

            <div className={styles.menuItemsWrap}>
                {navItems.map((item) => (
                    <Fragment key={item.key}>
                        {renderMenuButton(item, { showChevron: Boolean(item.subNav?.length) })}
                        <AnimatePresence>
                            {Boolean(item.expanded && showExpandedSidebar && item.subNav?.length) && (
                                <motion.div
                                    animate={{ height: 'max-content', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    initial={{ height: 0, opacity: 0 }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 5,
                                        paddingLeft: 10,
                                        width: '100%',
                                    }}
                                >
                                    {item.subNav?.map((subItem, index) => (
                                        <motion.div
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            initial={{ opacity: 0, x: -10 }}
                                            key={subItem.key}
                                            transition={{
                                                delay: index * 0.05,
                                                duration: 0.2,
                                                ease: 'easeOut',
                                            }}
                                        >
                                            {renderMenuButton(subItem, { subItem: true })}
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </Fragment>
                ))}
            </div>

            {actionItems.length ? (
                <div
                    className={`${styles.menuItemsWrap} ${styles.actionNavItem}`}
                    style={{
                        background: token.colorBgBase,
                        borderTop: `1px solid ${token.colorBorder}`,
                    }}
                >
                    {actionItems.map((item) => (
                        <Fragment key={item.key}>
                            {renderMenuButton(item)}
                        </Fragment>
                    ))}
                </div>
            ) : null}
        </motion.nav>
    );
}
