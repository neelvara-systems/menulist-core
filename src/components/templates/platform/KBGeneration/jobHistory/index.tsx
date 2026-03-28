import { IngestionJob } from '@type/knowledgeBase';
import { Col, Empty, Row, Typography } from 'antd';
import JobPreviewCard from './JobPreviewCard';

const { Title } = Typography;

interface JobHistoryProps {
    jobs: IngestionJob[];
    onCardClick: (job: IngestionJob) => void;
}

const JobHistory = ({ jobs, onCardClick }: JobHistoryProps) => {
    return (
        <>
            <Title level={4} style={{ marginTop: 24 }}>Previous Jobs</Title>
            {jobs.length > 0 ? (
                <Row gutter={[16, 16]}>
                    {jobs.map(job => (
                        <Col key={job.id} xs={24} sm={12} md={8} lg={6}>
                            <JobPreviewCard job={job} onCardClick={() => onCardClick(job)} />
                        </Col>
                    ))}
                </Row>
            ) : (
                <Empty description="No previous jobs found." />
            )}
        </>
    );
};

export default JobHistory;
