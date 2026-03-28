import { getIngestionJobStatusData, IngestionJob } from '@type/knowledgeBase';
import { Tag } from 'antd';

function JobStatusTag({ status }: { status: IngestionJob['status'] }) {

    const config = getIngestionJobStatusData()[status];
    const Icon = config.icon;

    return (
        <Tag style={{ maxWidth: "max-content", padding: 10, lineHeight: 1, fontSize: 12, marginLeft: 'auto', borderRadius: 28 }} icon={<Icon />} color={config.color}>{config.label}</Tag>
    )
}

export default JobStatusTag