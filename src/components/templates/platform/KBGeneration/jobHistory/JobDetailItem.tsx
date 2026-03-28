import { Flex, Typography } from 'antd';
import React from 'react';

const { Text } = Typography;

interface JobDetailItemProps {
    label: string;
    children: React.ReactNode;
}

const JobDetailItem: React.FC<JobDetailItemProps> = ({ label, children }) => {
    return (
        <Flex justify="space-between" align="center" style={{ marginBottom: 12, gap: 16 }}>
            <Text type="secondary" style={{ flexShrink: 0 }}>{label}</Text>
            <Flex justify="end" style={{ flexGrow: 1, textAlign: 'right' }}>
                {children}
            </Flex>
        </Flex>
    );
};

export default JobDetailItem;
