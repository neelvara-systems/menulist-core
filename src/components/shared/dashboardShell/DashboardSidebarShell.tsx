'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
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
    sectionLabel?: ReactNode;
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
    expandedWidth?: number;
    collapsedWidth?: number;
    isCollapsed?: boolean;
    mobile?: boolean;
    ariaLabel?: string;
    className?: string;
    style?: CSSProperties;
    onExpandedChange?: (expanded: boolean) => void;
}

function renderIcon(icon: DashboardShellIcon) {
    if (typeof icon === 'function') {
        const Icon = icon as ComponentType<any>;
        return <Icon />;
    }

    return icon;
}

function getAccessibleLabel(item: DashboardSidebarShellItem) {
    return typeof item.label === 'string' ? item.label : item.key;
}

export default function DashboardSidebarShell({
    navItems,
    actionItems = [],
    logoExpanded,
    logoCollapsed,
    expandedWidth = DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    collapsedWidth = DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
    isCollapsed = false,
    mobile = false,
    ariaLabel = 'Main navigation',
    className = '',
    style,
    onExpandedChange,
}: DashboardSidebarShellProps) {
    const { token } = theme.useToken();
    const [hoverId, setHoverId] = useState<string | null>(null);
    const [isHover, setIsHover] = useState(false);
    const menuItemsRef = useRef<HTMLDivElement | null>(null);
    const pendingParentScrollRef = useRef<{ element: HTMLElement; top: number } | null>(null);
    const suppressNextActiveParentScrollRef = useRef(false);
    const showExpandedSidebar = mobile || !isCollapsed || isHover;
    const activeParentKey = useMemo(() => (
        navItems.find((item) => item.active || item.subNavActive)?.key || null
    ), [navItems]);

    useEffect(() => {
        onExpandedChange?.(showExpandedSidebar);
    }, [onExpandedChange, showExpandedSidebar]);

    useEffect(() => {
        if (!showExpandedSidebar || !activeParentKey) return;
        if (suppressNextActiveParentScrollRef.current) {
            suppressNextActiveParentScrollRef.current = false;
            return;
        }

        const menuItemsEl = menuItemsRef.current;
        if (!menuItemsEl) return;

        const activeParentEl = Array.from(menuItemsEl.querySelectorAll<HTMLElement>('[data-sidebar-item-key]'))
            .find((element) => element.getAttribute('data-sidebar-item-key') === activeParentKey);

        if (!activeParentEl) return;

        const keepActiveParentVisible = () => {
            const listRect = menuItemsEl.getBoundingClientRect();
            const parentRect = activeParentEl.getBoundingClientRect();
            const topDelta = parentRect.top - listRect.top;
            const bottomDelta = parentRect.bottom - listRect.bottom;

            if (topDelta < 8) {
                menuItemsEl.scrollTo({ top: Math.max(menuItemsEl.scrollTop + topDelta - 8, 0) });
                return;
            }

            if (bottomDelta > -8) {
                menuItemsEl.scrollTo({ top: menuItemsEl.scrollTop + bottomDelta + 8 });
            }
        };

        window.requestAnimationFrame(() => {
            keepActiveParentVisible();
            window.requestAnimationFrame(keepActiveParentVisible);
        });
    }, [activeParentKey, showExpandedSidebar]);

    const getScrollableParent = (target: HTMLElement) => {
        let parent = target.parentElement;

        while (parent) {
            const style = window.getComputedStyle(parent);
            const canScroll = /(auto|scroll|overlay)/.test(style.overflowY);

            if (canScroll && parent.scrollHeight > parent.clientHeight) {
                return parent;
            }

            parent = parent.parentElement;
        }

        return null;
    };

    const rememberParentScroll = (target: HTMLElement) => {
        const scrollParent = getScrollableParent(target);
        pendingParentScrollRef.current = scrollParent
            ? { element: scrollParent, top: scrollParent.scrollTop }
            : null;
    };

    const restoreParentScroll = () => {
        const snapshot = pendingParentScrollRef.current;
        if (!snapshot) return;

        const restore = () => {
            snapshot.element.scrollTop = snapshot.top;
        };

        restore();
        window.requestAnimationFrame(() => {
            restore();
            window.requestAnimationFrame(restore);
        });
        window.setTimeout(restore, 80);
        window.setTimeout(restore, 220);
        pendingParentScrollRef.current = null;
        suppressNextActiveParentScrollRef.current = true;
        window.setTimeout(() => {
            suppressNextActiveParentScrollRef.current = false;
        }, 500);
    };

    const renderMenuButton = (
        item: DashboardSidebarShellItem,
        options: {
            subItem?: boolean;
            showChevron?: boolean;
        } = {},
    ) => {
        const isExactActive = Boolean(item.active);
        const hasActiveChild = Boolean(item.subNavActive);
        const isActive = isExactActive || hasActiveChild;
        const isParentItem = Boolean(options.showChevron);
        const isCollapsedDesktop = isCollapsed && !isHover && !mobile;
        const collapsedActiveParent = hasActiveChild && isCollapsed && !isHover && !mobile;
        const useStrongActiveStyle = !(mobile && isParentItem) && (isExactActive || collapsedActiveParent);
        const itemHover = hoverId === item.key || hasActiveChild || isExactActive;
        const iconActive = Boolean(item.iconActive || isActive || itemHover);
        const foreground = useStrongActiveStyle ? token.colorTextLightSolid : (itemHover ? token.colorPrimaryTextActive : token.colorText);
        const isExpandedParent = isParentItem && item.expanded && showExpandedSidebar;
        const parentBackground = mobile || isExpandedParent ? token.colorBgBase : token.colorFillSecondary;
        const parentActiveBackground = mobile || isExpandedParent ? token.colorBgBase : token.colorPrimaryBg;
        const itemBackground = useStrongActiveStyle
            ? token.colorPrimary
            : (hasActiveChild ? parentActiveBackground : (isParentItem ? parentBackground : (itemHover ? token.colorBgTextHover : token.colorBgBase)));
        const button = (
            <Button
                aria-current={isExactActive ? 'page' : undefined}
                aria-expanded={item.subNav ? item.expanded : undefined}
                aria-label={typeof item.label === 'string' ? item.label : item.key}
                className={`${styles.menuItemWrap} ${options.subItem ? styles.subMenuItemWrap : ''} ${options.showChevron ? styles.parentMenuItemWrap : ''} ${isActive ? styles.active : ''}`}
                data-sidebar-item-key={item.key}
                onClick={(event) => {
                    if (options.showChevron && !pendingParentScrollRef.current) {
                        rememberParentScroll(event.currentTarget);
                    }

                    item.onClick?.();

                    if (options.showChevron) {
                        restoreParentScroll();
                    }
                }}
                onKeyDown={(event) => {
                    if (!options.showChevron) return;
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    rememberParentScroll(event.currentTarget);
                }}
                onMouseEnter={() => setHoverId(item.key)}
                onMouseLeave={() => setHoverId(null)}
                onPointerDown={(event) => {
                    if (options.showChevron) {
                        rememberParentScroll(event.currentTarget);
                    }
                }}
                type="text"
                style={{
                    background: itemBackground,
                    color: foreground,
                    display: 'flex',
                    height: 'auto',
                    justifyContent: isCollapsedDesktop ? 'center' : 'flex-start',
                    maxWidth: '100%',
                    overflow: 'visible',
                    padding: 0,
                    position: options.showChevron ? 'sticky' : 'relative',
                    textAlign: 'left',
                    top: options.showChevron ? 0 : undefined,
                    width: '100%',
                    zIndex: options.showChevron ? 3 : undefined,
                }}
            >
                <div
                    className={styles.navWrap}
                    style={{
                        justifyContent: isCollapsedDesktop ? 'center' : undefined,
                    }}
                >
                    <div
                        className={styles.labelIconWrap}
                        style={{
                            flex: isCollapsedDesktop ? '0 0 auto' : undefined,
                            justifyContent: isCollapsedDesktop ? 'center' : undefined,
                        }}
                    >
                        <div
                            className={styles.iconWrap}
                            style={{
                                color: iconActive ? (useStrongActiveStyle ? token.colorTextLightSolid : token.colorPrimaryTextActive) : token.colorText,
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
                                style={{ color: foreground, maxWidth: '100%' }}
                            >
                                {item.label}
                            </motion.div>
                        )}
                    </div>
                    {options.showChevron && showExpandedSidebar && (
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
            animate={{ width: mobile ? '100%' : (showExpandedSidebar ? `${expandedWidth}px` : `${collapsedWidth}px`) }}
            aria-label={ariaLabel}
            className={`${styles.sidebarContainer} ${className}`}
            onMouseEnter={() => setIsHover(true)}
            onMouseLeave={() => setIsHover(false)}
            role="navigation"
            style={{
                backgroundColor: token.colorBgBase,
                borderRight: mobile ? undefined : `1px solid ${token.colorBorder}`,
                color: token.colorTextBase,
                minHeight: '100dvh',
                maxHeight: '100dvh',
                height: '100dvh',
                overflowX: 'hidden',
                overflowY: 'hidden',
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

            <div
                className={styles.menuItemsWrap}
                ref={menuItemsRef}
            >
                {navItems.map((item) => (
                    <div
                        className={`${styles.menuSectionWrap} ${item.subNav?.length ? styles.parentMenuSectionWrap : ''}`}
                        key={item.key}
                    >
                        {showExpandedSidebar && item.sectionLabel ? (
                            <div className={styles.navSectionLabel}>
                                {item.sectionLabel}
                            </div>
                        ) : null}
                        {renderMenuButton(item, { showChevron: Boolean(item.subNav?.length) })}
                        <AnimatePresence>
                            {Boolean(item.expanded && showExpandedSidebar && item.subNav?.length) && (
                                <motion.div
                                    animate={{ height: 'max-content', opacity: 1 }}
                                    className={styles.subNavPanel}
                                    exit={{ height: 0, opacity: 0 }}
                                    initial={{ height: 0, opacity: 0 }}
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
                    </div>
                ))}
            </div>

            {actionItems.length ? (
                <div
                    className={`${styles.menuItemsWrap} ${styles.actionNavItem}`}
                    style={{
                        background: token.colorBgBase,
                        borderTop: `1px solid ${token.colorBorder}`,
                        ...(mobile ? {
                            alignItems: 'center',
                            display: 'grid',
                            gap: 8,
                            gridTemplateColumns: `repeat(${actionItems.length}, minmax(44px, 1fr))`,
                            padding: '10px 12px calc(env(safe-area-inset-bottom) + 10px)',
                        } : {}),
                    }}
                >
                    {actionItems.map((item) => {
                        if (!mobile) {
                            return (
                                <Fragment key={item.key}>
                                    {renderMenuButton(item)}
                                </Fragment>
                            );
                        }

                        const isActive = Boolean(item.active || item.iconActive);
                        return (
                            <Button
                                aria-current={item.active ? 'page' : undefined}
                                aria-label={getAccessibleLabel(item)}
                                icon={renderIcon(item.icon)}
                                key={item.key}
                                onClick={item.onClick}
                                style={{
                                    alignItems: 'center',
                                    background: item.active ? token.colorPrimaryBg : token.colorBgContainer,
                                    border: `1px solid ${item.active ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                                    borderRadius: 10,
                                    color: isActive ? token.colorPrimaryTextActive : token.colorText,
                                    display: 'inline-flex',
                                    height: 44,
                                    justifyContent: 'center',
                                    padding: 0,
                                    width: '100%',
                                }}
                                title={getAccessibleLabel(item)}
                                type="text"
                            />
                        );
                    })}
                </div>
            ) : null}
        </motion.nav>
    );
}
