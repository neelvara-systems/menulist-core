'use client'

import TicketView from '@template/main-app/helpCenter/TicketView';
import { Flex, Typography } from 'antd';

const { Title, Text } = Typography;

export default function CanonicaSupportPage() {
    return (
        <Flex vertical gap={16} style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
            <Flex vertical gap={4}>
                <Title level={3} style={{ margin: 0 }}>Support Tickets</Title>
                <Text type="secondary">Create or track MenuList support requests.</Text>
            </Flex>
            <TicketView />
        </Flex>
    );
}
