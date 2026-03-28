'use client'

/**
 * Canonica — Dashboard Header
 * 
 * Minimal header with breadcrumb and user menu.
 * Separate from MenuList's HeaderComponent.
 */

import { CANONICA_SIDEBAR_NAV } from '@constant/canonica/navigations';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import type { MenuProps } from 'antd';
import { Avatar, Dropdown, Flex, Layout, theme, Typography } from 'antd';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { LuLogOut, LuUser } from 'react-icons/lu';

const { Header } = Layout;
const { Text } = Typography;

export default function CanonicaHeader() {
    const session = useClientAuthSession();
    const pathname = usePathname();
    const { token } = theme.useToken();

    // Derive page title from current route
    const pageTitle = useMemo(() => {
        const nav = CANONICA_SIDEBAR_NAV.find(n => pathname === n.route || pathname.startsWith(n.route + '/'));
        return nav?.label || 'Dashboard';
    }, [pathname]);

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

    return (
        <Header
            style={{
                background: token.colorBgContainer,
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                padding: '0 24px',
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
            <Text strong style={{ fontSize: 16 }}>{pageTitle}</Text>

            <Flex align="center" gap={12}>
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
