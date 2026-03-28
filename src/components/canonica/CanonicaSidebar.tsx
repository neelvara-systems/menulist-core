'use client'

/**
 * Canonica — Dashboard Sidebar
 * 
 * Clean sidebar for Canonica dashboard using antd Menu component.
 * Separate from MenuList sidebar — different product, different navigation.
 * 
 * @see src/constants/canonicaNavigations.ts
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    CANONICA_NAV_GROUPS,
    CANONICA_SIDEBAR_NAV,
    CanonicaNavItem,
} from '@constant/canonica/navigations';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Typography } from 'antd';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

const { Sider } = Layout;
const { Text } = Typography;

export default function CanonicaSidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const { token } = theme.useToken();

    // Filter nav items based on feature flags, then build menu items with group dividers
    const menuItems: MenuProps['items'] = useMemo(() => {
        const items: MenuProps['items'] = [];
        let lastGroup = '';

        const visibleNav = CANONICA_SIDEBAR_NAV.filter((nav: CanonicaNavItem) => {
            if (!nav.featureFlag) return true;
            return FEATURE_FLAGS[nav.featureFlag as keyof typeof FEATURE_FLAGS] === true;
        });

        visibleNav.forEach((nav: CanonicaNavItem) => {
            // Add group divider if group changed
            if (nav.group && nav.group !== lastGroup) {
                if (lastGroup !== '') {
                    items.push({ type: 'divider' });
                }
                items.push({
                    key: `group-${nav.group}`,
                    label: CANONICA_NAV_GROUPS[nav.group] || nav.group,
                    type: 'group',
                });
                lastGroup = nav.group;
            }

            const NavIcon = nav.icon;
            items.push({
                key: nav.route,
                icon: <NavIcon />,
                label: nav.label,
                onClick: () => router.push(nav.route),
            });
        });

        return items;
    }, [router]);

    // Determine selected key from pathname
    const selectedKey = useMemo(() => {
        // Exact match first
        const exact = CANONICA_SIDEBAR_NAV.find(n => n.route === pathname);
        if (exact) return exact.route;
        // Prefix match (for nested pages)
        const prefix = CANONICA_SIDEBAR_NAV.find(n => pathname.startsWith(n.route + '/'));
        if (prefix) return prefix.route;
        return CANONICA_SIDEBAR_NAV[0]?.route || '';
    }, [pathname]);

    return (
        <Sider
            width={240}
            style={{
                background: token.colorBgContainer,
                borderRight: `1px solid ${token.colorBorderSecondary}`,
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 0,
                overflow: 'auto',
                zIndex: 100,
            }}
        >
            {/* Logo / Brand */}
            <div style={{
                padding: '20px 24px 12px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                marginBottom: 8,
            }}>
                <Text strong style={{ fontSize: 18, letterSpacing: '-0.3px' }}>
                    Canonica
                </Text>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Knowledge Control Plane
                </Text>
            </div>

            {/* Navigation Menu */}
            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={menuItems}
                style={{
                    border: 'none',
                    background: 'transparent',
                }}
            />
        </Sider>
    );
}
