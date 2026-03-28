import CategoryIcon from '@atoms/CategoryIcon';
import { KnowledgeBaseCategory } from '@type/knowledgeBase';
import { Card, Col, Flex, Row, theme, Typography } from 'antd';

const { Title, Text } = Typography;

interface CategoriesProps {
    categories: KnowledgeBaseCategory[];
    onCategorySelect: (category: KnowledgeBaseCategory) => void;
}

const Categories = ({ categories, onCategorySelect }: CategoriesProps) => {
    const { token } = theme.useToken();

    return (
        <Row gutter={[16, 16]}>
            {categories.map(category => (
                <Col xs={24} sm={12} md={8} key={category.id}>
                    <Card
                        hoverable
                        onClick={() => onCategorySelect(category)}
                        style={{ padding: '1rem', height: '100%', borderRadius: 16, backgroundColor: token.colorBgLayout }}
                    >
                        <Flex vertical gap="small">
                            <Flex justify='flex-start' align='center' gap="small">
                                <CategoryIcon icon={category.icon} />
                                <Title level={5} style={{ margin: 'unset' }}>{category.title}</Title>
                            </Flex>
                            <Text type="secondary">{category.description}</Text>
                        </Flex>
                    </Card>
                </Col>
            ))}
        </Row>
    );
};

export default Categories;
