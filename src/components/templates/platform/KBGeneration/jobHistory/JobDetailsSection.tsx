import { Flex, Typography } from 'antd';
import React from 'react';

const { Title } = Typography;

interface JobDetailsSectionProps {
    title: string;
    children: React.ReactNode;
}

const JobDetailsSection: React.FC<JobDetailsSectionProps> = ({ title, children }) => {
    return (
        <Flex vertical style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>{title}</Title>
            {children}
        </Flex>
    );
};

export default JobDetailsSection;
