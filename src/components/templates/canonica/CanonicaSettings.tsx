'use client';

/**
 * Canonica Dashboard — Settings Template
 *
 * General workspace settings entry point. Widget installation/configuration
 * lives in /canonica/widget to keep a single save path and runtime contract.
 */

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Button, Card, Descriptions, Flex, Grid, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { LuCode, LuSettings } from 'react-icons/lu';

const { Title, Text } = Typography;

export default function CanonicaSettings() {
    const session = useClientAuthSession();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    return (
        <Flex vertical gap={isMobile ? 14 : 20}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Settings</Title>
                <Text type="secondary">Workspace settings and management shortcuts</Text>
            </div>

            <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Workspace</Flex>}>
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Signed in as">{session?.user?.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Tenant">{session?.tId || session?.user?.tenantId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Workspace">{session?.sId || session?.user?.storeId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Product"><Tag color="blue">Canonica</Tag></Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Management</Flex>}>
                <Flex vertical={isMobile} align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12}>
                    <Text type="secondary">
                        Configure the embeddable widget, create keys, copy install code, set origins, and preview desktop/mobile behavior.
                    </Text>
                    <Button type="primary" onClick={() => router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.WIDGET, currentHostname))}>
                        Open Widget Management
                    </Button>
                </Flex>
            </Card>
        </Flex>
    );
}
