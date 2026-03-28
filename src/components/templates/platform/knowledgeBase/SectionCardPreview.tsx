import { KnowledgeBaseSection } from '@type/knowledgeBase';
import { Card, Typography } from 'antd';

const { Title, Text } = Typography;

interface SectionCardPreviewProps {
    section: Partial<KnowledgeBaseSection>;
}

const SectionCardPreview = ({ section }: SectionCardPreviewProps) => {
    // Provide default values for preview
    const title = section.title || 'Section Title';
    const description = section.description || 'Section description will appear here.';

    return (
        <Card style={{ borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
            <Card.Meta
                title={<Title level={5} style={{ margin: 'unset' }}>{title}</Title>}
                description={<Text type="secondary" style={{ margin: 'unset' }}>{description}</Text>}
            />
        </Card>
    );
};

export default SectionCardPreview;
