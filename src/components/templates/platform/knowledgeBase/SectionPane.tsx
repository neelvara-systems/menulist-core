import { KnowledgeBaseCategory, KnowledgeBaseSection } from "@type/knowledgeBase";
import { Spin, Typography, theme } from "antd";
import PaneContent from './PaneContent';
import PaneHeader from './PaneHeader';

const { Title, Text } = Typography;

interface SectionPaneProps {
    isLoading: boolean;
    selectedCategory: KnowledgeBaseCategory | null;
    selectedSection: KnowledgeBaseSection | null;
    onSectionSelect: (section: KnowledgeBaseSection) => void;
    onAddSection: () => void;
    onEditSection: (section: KnowledgeBaseSection) => void;
    onDeleteSection: (id: string) => void;
}

function SectionPane({
    isLoading,
    selectedCategory,
    selectedSection,
    onSectionSelect,
    onAddSection,
    onEditSection,
    onDeleteSection
}: SectionPaneProps) {
    const { token } = theme.useToken();

    if (!selectedCategory) {
        return (
            <div style={{ background: token.colorBgContainer, padding: '16px', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Text type="secondary">Select a category to see sections</Text>
            </div>
        );
    }

    return (
        <div style={{ background: token.colorBgContainer, padding: '16px', height: '100%', overflowY: 'auto' }}>
            <Spin spinning={isLoading} size="large">
                {!Boolean(selectedCategory?.articles?.length) ? <>
                <PaneHeader
                    title={selectedCategory?.title}
                    buttonText="Add Section"
                    onButtonClick={onAddSection}
                />
                <PaneContent
                    from="Section"
                    dataSource={selectedCategory?.sections || []}
                    selectedItem={selectedSection}
                    onItemSelect={onSectionSelect}
                    onEditItem={onEditSection}
                    onDeleteItem={onDeleteSection}
                    emptyState={{
                        description: "No sections in this category",
                        buttonText: "Add Section",
                        onButtonClick: onAddSection
                    }}
                />
            </> : <>
                <PaneHeader
                    title={selectedCategory?.title}
                    buttonText=""
                    onButtonClick={undefined}
                />
                <PaneContent
                    from="Section"
                    dataSource={selectedCategory?.sections || []}
                    selectedItem={selectedSection}
                    onItemSelect={onSectionSelect}
                    onEditItem={onEditSection}
                    onDeleteItem={onDeleteSection}
                    emptyState={{
                        description: "No sections in this category",
                        buttonText: "",
                        onButtonClick: () => { }
                    }}
                />
            </>}
            </Spin>
        </div>
    );
}

export default SectionPane;
