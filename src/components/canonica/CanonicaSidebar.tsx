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
    CANONICA_GOVERNANCE_TABS,
    CANONICA_ROUTES,
    CANONICA_NAV_GROUPS,
    CANONICA_SIDEBAR_NAV,
    CanonicaNavItem,
    getCanonicaGovernanceRoute,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import type { MenuProps } from 'antd';
import { Layout, Menu, theme, Typography } from 'antd';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

const { Sider } = Layout;
const { Text } = Typography;

interface CanonicaSidebarProps {
    mobile?: boolean;
    onNavigate?: () => void;
}

export default function CanonicaSidebar({ mobile = false, onNavigate }: CanonicaSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { token } = theme.useToken();
    const session = useClientAuthSession();
    const canUseManagementSurfaces = canUseCanonicaManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);

    // Filter nav items based on feature flags, then build menu items with group dividers
    const menuItems: MenuProps['items'] = useMemo(() => {
        const items: MenuProps['items'] = [];
        let lastGroup = '';

        const visibleNav = CANONICA_SIDEBAR_NAV.filter((nav: CanonicaNavItem) => {
            if ((nav.managementOnly || nav.platformOnly) && !canUseManagementSurfaces) return false;
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
                onClick: () => {
                    router.push(toCanonicaDashboardRoute(nav.route, currentHostname));
                    onNavigate?.();
                },
            });
        });

        return items;
    }, [canUseManagementSurfaces, currentHostname, onNavigate, router]);

    // Determine selected key from pathname
    const selectedKey = useMemo(() => {
        if (
            normalizedPathname === CANONICA_ROUTES.GOVERNANCE &&
            searchParams.get('tab') === CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE
        ) {
            return getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.SIGNAL_QUEUE);
        }

        // Exact match first
        const exact = CANONICA_SIDEBAR_NAV.find(n => n.route === normalizedPathname);
        if (exact) return exact.route;
        // Prefix match (for nested pages)
        const prefix = CANONICA_SIDEBAR_NAV.find(n => normalizedPathname.startsWith(n.route + '/'));
        if (prefix) return prefix.route;
        return CANONICA_SIDEBAR_NAV[0]?.route || '';
    }, [normalizedPathname, searchParams]);

    const sidebarContent = (
        <>
            <div
                style={{
                    padding: '20px 24px 12px',
                    borderBottom: `1px solid ${token.colorBorderSecondary}`,
                    marginBottom: 8,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Image src="/canonica-logo-mark-wide.png" alt="" width={50} height={31} priority />
                    <Text strong style={{ fontSize: 18, letterSpacing: '-0.3px' }}>
                        Canonica
                    </Text>
                </div>
                <br />
                <Text type="secondary" style={{ fontSize: 11 }}>
                    Knowledge Control Plane
                </Text>
            </div>

            <Menu
                mode="inline"
                selectedKeys={[selectedKey]}
                items={menuItems}
                style={{
                    border: 'none',
                    background: 'transparent',
                }}
            />
        </>
    );

    if (mobile) {
        return (
            <div
                style={{
                    height: '100%',
                    minHeight: '100dvh',
                    overflowY: 'auto',
                    background: token.colorBgContainer,
                }}
            >
                {sidebarContent}
            </div>
        );
    }

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
            {sidebarContent}
        </Sider>
    );
}
