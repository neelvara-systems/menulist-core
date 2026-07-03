import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { getIngestionJobStatusData, IngestionJob } from '@type/knowledgeBase';
import { Card, Flex, Tag, Typography } from 'antd';
import React from 'react';
import JobActionMenu from './JobActionMenu';

interface JobPreviewCardProps {
    job: IngestionJob;
    onCardClick: () => void;
}

const JobPreviewCard: React.FC<JobPreviewCardProps> = ({ job, onCardClick }) => {
    const { status, createdOn, sourceFiles, id } = job;
    const config = getIngestionJobStatusData()[status] || {
        color: 'default',
        icon: null,
        label: 'Unknown',
    };
    const StatusIcon = config.icon;

    return (
        <Card hoverable style={{ minHeight: 180, borderRadius: 18 }} onClick={onCardClick}>
            <Flex justify="space-between" align="start">
                <Tag color={config.color} style={{ border: 'none', background: 'none', fontSize: 24, padding: 0 }}>
                    {StatusIcon ? <StatusIcon /> : null}
                </Tag>
                <JobActionMenu jobId={id} onCardClick={onCardClick} />
            </Flex>
            <Flex vertical justify='end' style={{ height: '100%', marginTop: 16 }}>
                <Typography.Title level={5} style={{ marginTop: 'auto' }}>
                    Job ID: {id.substring(0, 8)}...
                </Typography.Title>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    <DateTimeDisplay value={createdOn} mode='datetime' /> · {sourceFiles.length} sources
                </Typography.Text>
            </Flex>
        </Card>
    );
};

export default JobPreviewCard;
