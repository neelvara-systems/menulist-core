import { KnowledgeBaseCategory, KnowledgeBaseSection } from '@type/knowledgeBase';
import { List, Typography } from 'antd';

const { Title, Text } = Typography;

interface SectionsProps {
    category: KnowledgeBaseCategory;
    onSectionSelect: (section: KnowledgeBaseSection) => void;
}

const Sections = ({ category, onSectionSelect }: SectionsProps) => {
    return (
        <div>
            <Title level={2}>{category.title}</Title>
            <Text type="secondary">{category.description}</Text>
            <List
                dataSource={category.sections}
                renderItem={section => (
                    <List.Item onClick={() => onSectionSelect(section)} style={{ padding: '16px 8px', cursor: 'pointer' }}>
                        <List.Item.Meta
                            title={<Text strong>{section.title}</Text>}
                            description={<Text type="secondary">{section.description}</Text>}
                        />
                    </List.Item>
                )}
            />
        </div>
    );
};

export default Sections;
