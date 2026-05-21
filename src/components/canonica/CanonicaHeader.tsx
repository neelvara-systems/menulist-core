'use client'

/**
 * Canonica — Dashboard Header
 * 
 * Minimal header with breadcrumb and user menu.
 * Separate from MenuList's HeaderComponent.
 */

import {
    CANONICA_ROUTES,
    CANONICA_SIDEBAR_NAV,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { PRODUCT_IDS } from '@constant/product';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { clearForceDesktopMode } from '@lib/mobile/forceDesktopMode';
import type { MenuProps } from 'antd';
import { Avatar, Button, Dropdown, Flex, Layout, theme, Typography } from 'antd';
import { signOut } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { LuArrowLeft, LuLogOut, LuMenu, LuUser } from 'react-icons/lu';

const { Header } = Layout;
const { Text } = Typography;

interface CanonicaHeaderProps {
    showMenuButton?: boolean;
    onMenuClick?: () => void;
}

export default function CanonicaHeader({ showMenuButton = false, onMenuClick }: CanonicaHeaderProps) {
    const session = useClientAuthSession();
    const pathname = usePathname();
    const router = useRouter();
    const { token } = theme.useToken();
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);

    // Derive page title from current route
    const pageTitle = useMemo(() => {
        const nav = CANONICA_SIDEBAR_NAV.find(n => normalizedPathname === n.route || normalizedPathname.startsWith(n.route + '/'));
        return nav?.label || 'Dashboard';
    }, [normalizedPathname]);

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            label: session?.user?.email || 'User',
            icon: <LuUser />,
            disabled: true,
        },
        { type: 'divider' },
        {
            key: 'signout',
            label: 'Sign Out',
            icon: <LuLogOut />,
            danger: true,
            onClick: () => signOut({ callbackUrl: '/signin' }),
        },
    ];

    const initials = useMemo(() => {
        const name = session?.user?.name || session?.user?.email || 'U';
        return name.charAt(0).toUpperCase();
    }, [session]);

    const sourceProductId = (session as any)?.pId || (session?.user as any)?.pId || (session?.user as any)?.productId;
    const isMenuListClient = sourceProductId === PRODUCT_IDS.MENULIST;
    const returnLabel = isMenuListClient
        ? (showMenuButton ? 'MenuList' : 'Back to MenuList')
        : (showMenuButton ? 'Home' : 'Canonica Home');

    const handleReturn = () => {
        clearForceDesktopMode();
        router.push(isMenuListClient
            ? (showMenuButton ? '/dashboard#mobile/more' : '/dashboard')
            : toCanonicaDashboardRoute(CANONICA_ROUTES.DASHBOARD, currentHostname)
        );
    };

    return (
        <Header
            style={{
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                padding: showMenuButton ? '0 12px' : '0 24px',
                height: 56,
                lineHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 99,
            }}
        >
            <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                {showMenuButton && (
                    <Button
                        type="text"
                        aria-label="Open navigation"
                        icon={<LuMenu size={20} />}
                        onClick={onMenuClick}
                        style={{ width: 44, height: 44, flex: '0 0 auto' }}
                    />
                )}
                <Text
                    strong
                    style={{
                        fontSize: 16,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {pageTitle}
                </Text>
            </Flex>

            <Flex align="center" gap={8}>
                <Button
                    type="text"
                    icon={<LuArrowLeft size={16} />}
                    onClick={handleReturn}
                    style={{ minHeight: 40, paddingInline: showMenuButton ? 8 : 12 }}
                >
                    {returnLabel}
                </Button>
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" trigger={['click']}>
                    <Avatar
                        size={32}
                        style={{
                            backgroundColor: token.colorPrimary,
                            cursor: 'pointer',
                            fontSize: 14,
                        }}
                    >
                        {initials}
                    </Avatar>
                </Dropdown>
            </Flex>
        </Header>
    );
}
