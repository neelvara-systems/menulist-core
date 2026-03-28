import CategoryIcon from '@atoms/CategoryIcon';
import { KnowledgeBaseCategory } from '@type/knowledgeBase';
import { Card, Flex, theme, Typography } from 'antd';

const { Title, Text } = Typography;

interface CategoryCardPreviewProps {
    category: Partial<KnowledgeBaseCategory>;
}

const CategoryCardPreview = ({ category }: CategoryCardPreviewProps) => {
    const { token } = theme.useToken();

    // Provide default values for preview
    const title = category.title || 'Category Title';
    const description = category.description || 'Category description will appear here.';
    const icon = category.icon || '';

    return (
        <Card style={{ height: '100%', borderRadius: 8 }} styles={{ body: { padding: 16 } }}>
            <Flex vertical gap="small">
                <Flex justify='flex-start' align='center' gap="small">
                    {icon && <CategoryIcon icon={icon} />}
                    <Title level={5} style={{ margin: 'unset' }}>{title}</Title>
                </Flex>
                <Text type="secondary" style={{ margin: 'unset' }}>{description}</Text>
            </Flex>
        </Card>
    );
};

export default CategoryCardPreview;
