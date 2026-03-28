import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { IngestionJob } from '@type/knowledgeBase';
import { Card, Flex, Tag, Typography } from 'antd';
import React from 'react';
import { LuFile, LuFileCheck2, LuFileClock, LuFileCog, LuFileQuestion, LuFileSearch, LuFileSignature, LuFileX } from 'react-icons/lu';
import JobActionMenu from './JobActionMenu';

interface JobPreviewCardProps {
    job: IngestionJob;
    onCardClick: () => void;
}

const statusConfig: { [key: string]: { color: string; icon: React.ReactNode; label: string } } = {
    pending: {
        color: 'default',
        icon: <LuFile />,
        label: 'Pending',
    },
    processing: {
        color: 'blue',
        icon: <LuFileCog />,
        label: 'Processing',
    },
    reconciling: {
        color: 'cyan',
        icon: <LuFileSearch />,
        label: 'Reconciling',
    },
    needs_review: {
        color: 'orange',
        icon: <LuFileQuestion />,
        label: 'Needs Review',
    },
    approved: {
        color: 'lime',
        icon: <LuFileSignature />,
        label: 'Approved',
    },
    publishing: {
        color: 'purple',
        icon: <LuFileClock />,
        label: 'Publishing',
    },
    published: {
        color: 'green',
        icon: <LuFileCheck2 />,
        label: 'Published',
    },
    failed: {
        color: 'red',
        icon: <LuFileX />,
        label: 'Failed',
    },
};

const JobPreviewCard: React.FC<JobPreviewCardProps> = ({ job, onCardClick }) => {
    const { status, createdOn, sourceFiles, id } = job;
    const config = statusConfig[status];

    return (
        <Card hoverable style={{ minHeight: 180, borderRadius: 18 }} onClick={onCardClick}>
            <Flex justify="space-between" align="start">
                <Tag color={config.color} style={{ border: 'none', background: 'none', fontSize: 24, padding: 0 }}>
                    {config.icon}
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
