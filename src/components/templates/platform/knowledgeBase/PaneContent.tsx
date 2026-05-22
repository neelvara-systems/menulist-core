import CategoryIcon from "@atoms/CategoryIcon";
import { Badge, Button, Checkbox, Empty, Flex, List, theme, Tooltip } from "antd";
import { LuCheckCircle, LuClock, LuPencil, LuPlusCircle, LuTrash2 } from "react-icons/lu";

interface PaneContentItem {
    id: string;
    title: string;
    active?: boolean;
    icon?: string;
    modifiedOn?: any;
    lastReviewedOn?: any;
}

interface PaneContentProps<T extends PaneContentItem, S extends PaneContentItem> {
    from: 'Category' | 'Section' | 'Article';
    dataSource: T[];
    selectedItem: S | null;
    onItemSelect: (item: T) => void;
    onEditItem: (item: S) => void;
    onDeleteItem: (id: string) => void;
    emptyState: {
        description: string;
        buttonText: string;
        onButtonClick: () => void;
    };
    selectedIds?: string[];
    onSelectionChange?: (ids: string[]) => void;
}

const STALE_THRESHOLD_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const isStaleArticle = (item: PaneContentItem): boolean => {
    const reviewDate = item.lastReviewedOn?.toMillis?.() || item.modifiedOn?.toMillis?.();
    if (!reviewDate) return false;
    return Date.now() - reviewDate > STALE_THRESHOLD_MS;
};

const PaneContent = <T extends PaneContentItem, S extends PaneContentItem>({ from, dataSource, selectedItem, onItemSelect, onEditItem, onDeleteItem, emptyState, selectedIds, onSelectionChange }: PaneContentProps<T, S>) => {
    const { token } = theme.useToken();
    const isSelectable = Boolean(selectedIds && onSelectionChange);

    const toggleSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedIds || !onSelectionChange) return;
        const newIds = selectedIds.includes(id)
            ? selectedIds.filter(i => i !== id)
            : [...selectedIds, id];
        onSelectionChange(newIds);
    };

    return (
        <List
            dataSource={dataSource}
            locale={{
                emptyText: (
                    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={emptyState.description}
                            styles={{
                                footer: {
                                    textAlign: 'center',
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }
                            }}
                        >
                            {emptyState.buttonText && <Button
                                type="primary"
                                icon={<LuPlusCircle />}
                                onClick={emptyState.onButtonClick}>
                                {emptyState.buttonText}
                            </Button>}
                        </Empty>
                    </div>
                )
            }}
            renderItem={(item: T) => (
                <List.Item
                    key={item.id}
                    onClick={(e) => onItemSelect(item)}
                    style={{
                        marginBottom: 12,
                        cursor: 'pointer',
                        borderRadius: '8px',
                        background: selectedItem?.id === item.id ? token.colorPrimaryBg : 'transparent',
                        padding: '8px 0 8px 12px',
                        border: `1px solid ${selectedItem?.id === item.id ? token.colorPrimaryBorder : token.colorBorderSecondary}`
                    }}
                    actions={[
                        <Button
                            key={`edit-${item.id}`}
                            type="text"
                            shape="circle"
                            icon={<LuPencil />}
                            onClick={(e) => {
                                e.stopPropagation();
                                const itemToEdit: any = item;
                                onEditItem(itemToEdit as S);
                            }} />,
                        <Button
                            key={`delete-${item.id}`}
                            type="text"
                            shape="circle"
                            danger
                            icon={<LuTrash2 />}
                            onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} />
                    ]}
                >
                    <List.Item.Meta
                        title={
                            <Flex align="center" justify="flex-start" gap={8}>
                                {isSelectable && from === 'Article' && (
                                    <Checkbox
                                        checked={selectedIds?.includes(item.id)}
                                        onClick={(e) => toggleSelection(item.id, e as any)}
                                    />
                                )}
                                {from == "Category" && <CategoryIcon icon={item.icon} />}
                                <Flex align="center" justify="flex-start" gap={4}>
                                    <Badge status={item.active ? 'success' : 'error'} />
                                    {item.title}
                                    {from === 'Article' && <Tooltip title="Search data is ready for this article">
                                        <LuCheckCircle color={token.colorSuccess} />
                                    </Tooltip>}
                                    {from === 'Article' && isStaleArticle(item) && (
                                        <Tooltip title="Content may be stale — not reviewed in 90+ days">
                                            <LuClock color={token.colorWarning} />
                                        </Tooltip>
                                    )}
                                </Flex>
                            </Flex>
                        }
                        style={{ margin: "unset" }}
                    />
                </List.Item>
            )}
        />
    );
};

export default PaneContent;
