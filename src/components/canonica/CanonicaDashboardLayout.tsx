'use client'

/**
 * Canonica — Dashboard Layout Wrapper
 * 
 * Renders the Canonica sidebar + header + content area.
 * Separate from MenuList's AntdLayoutWrapper — different product, different layout.
 * 
 * Shares: AntdThemeProvider, NetworkStatusProvider
 * Does NOT share: MenuList sidebar, MenuList header, mobile shell
 * 
 * @see src/components/canonica/CanonicaSidebar.tsx
 */

import { useAppSelector } from '@hook/useAppSelector';
import AntdThemeProvider from '@providers/antdThemeProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { Layout, theme } from 'antd';
import CanonicaSidebar from './CanonicaSidebar';
import CanonicaHeader from './CanonicaHeader';

const { Content } = Layout;

export default function CanonicaDashboardLayout({ children }: { children: React.ReactNode }) {
    const isDarkMode = useAppSelector(getDarkModeState);
    const { token } = theme.useToken();

    return (
        <AntdThemeProvider>
            <NetworkStatusProvider>
                <Layout style={{ minHeight: '100vh' }}>
                    <CanonicaSidebar />
                    <Layout style={{ marginLeft: 240 }}>
                        <CanonicaHeader />
                        <Content
                            style={{
                                padding: 24,
                                minHeight: 'calc(100vh - 56px)',
                                backgroundImage: isDarkMode
                                    ? `radial-gradient(#dee1ec57 0.8px, transparent 0)`
                                    : `radial-gradient(#cbcbcb 1px, transparent 0)`,
                                backgroundSize: '24px 24px',
                            }}
                        >
                            {children}
                        </Content>
                    </Layout>
                </Layout>
            </NetworkStatusProvider>
        </AntdThemeProvider>
    );
}
