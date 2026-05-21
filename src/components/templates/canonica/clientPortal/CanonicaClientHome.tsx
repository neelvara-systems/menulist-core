'use client'

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import BrowseCategories from '@template/main-app/helpCenter/landing/BrowseCategories';
import RunningTickets from '@template/main-app/helpCenter/landing/RunningTickets';
import WhatsNew from '@template/main-app/helpCenter/landing/WhatsNew';
import { Button, Card, Col, Flex, Row, Typography, theme } from 'antd';
import { useRouter } from 'next/navigation';
import { LuBookOpen, LuReceipt, LuTicket } from 'react-icons/lu';

const { Title, Text } = Typography;

const supportActions = [
    {
        key: 'docs',
        title: 'Documentation',
        description: 'Browse help guides and answers.',
        icon: LuBookOpen,
        route: CANONICA_ROUTES.DOCS,
    },
    {
        key: 'support',
        title: 'Support Tickets',
        description: 'Create or track a support request.',
        icon: LuTicket,
        route: CANONICA_ROUTES.SUPPORT,
    },
    {
        key: 'release-notes',
        title: 'Release Notes',
        description: 'See recent fixes and product updates.',
        icon: LuReceipt,
        route: CANONICA_ROUTES.RELEASE_NOTES,
    },
];

export default function CanonicaClientHome() {
    const router = useRouter();
    const { token } = theme.useToken();
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Help Center</Title>
                <Text type="secondary">Client support runs through Canonica.</Text>
            </Flex>

            <Row gutter={[12, 12]}>
                {supportActions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Col key={action.key} xs={24} md={8}>
                            <Card
                                hoverable
                                onClick={() => router.push(toCanonicaDashboardRoute(action.route, currentHostname))}
                                styles={{ body: { minHeight: 132 } }}
                                style={{ height: '100%' }}
                            >
                                <Flex vertical gap={12}>
                                    <Icon color={token.colorPrimary} size={24} />
                                    <Flex vertical gap={4}>
                                        <Title level={5} style={{ margin: 0 }}>{action.title}</Title>
                                        <Text type="secondary">{action.description}</Text>
                                    </Flex>
                                    <Button type="link" style={{ alignSelf: 'flex-start', padding: 0 }}>
                                        Open
                                    </Button>
                                </Flex>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <RunningTickets />

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={14}>
                    <WhatsNew />
                </Col>
                <Col xs={24} lg={10}>
                    <BrowseCategories />
                </Col>
            </Row>
        </Flex>
    );
}
