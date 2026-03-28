import { KnowledgeBaseCategory } from "@type/knowledgeBase";
import { Spin, Typography, theme } from "antd";
import PaneContent from './PaneContent';
import PaneHeader from './PaneHeader';

const { Title, Text } = Typography;

interface CategoryPaneProps {
    isLoading: boolean;
    categories: KnowledgeBaseCategory[];
    selectedCategory: KnowledgeBaseCategory | null;
    onCategorySelect: (category: KnowledgeBaseCategory) => void;
    onAddCategory: () => void;
    onEditCategory: (category: KnowledgeBaseCategory) => void;
    onDeleteCategory: (id: string) => void;
}

const CategoryPane = ({ isLoading, categories, selectedCategory, onCategorySelect, onAddCategory, onEditCategory, onDeleteCategory }: CategoryPaneProps) => {
    const { token } = theme.useToken();
    return (
        <div style={{ background: token.colorBgContainer, padding: '16px', height: '100%', overflowY: 'auto' }}>
            <Spin spinning={isLoading} size="large">
                <PaneHeader
                title="Categories"
                buttonText="Add Category"
                onButtonClick={onAddCategory}
            />
            <PaneContent
                from="Category"
                dataSource={categories}
                selectedItem={selectedCategory}
                onItemSelect={onCategorySelect}
                onEditItem={onEditCategory}
                onDeleteItem={onDeleteCategory}
                emptyState={{
                    description: "No categories found",
                    buttonText: "Create Now",
                    onButtonClick: onAddCategory
                }}
            />
            </Spin>
        </div>
    );
}

export default CategoryPane;
