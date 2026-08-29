import { Alert, Flex, Select, Typography, theme } from 'antd';
import { getProjectDefaultLanguage } from '@lib/localization/projectContent';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../../../types';
import type {
    MoveCategoryPreview,
    SelectedItemInfo,
} from '../../../types/commandCenter.types';
import { computeMoveCategoryPreview, getAllCategories } from '../utils/bulkOperations';

const { Text } = Typography;

interface MoveCategoryActionProps {
    selectedItems: SelectedItemInfo[];
    projectData: Project;
    onPreviewChange: (preview: MoveCategoryPreview | null) => void;
    onConfigReady: (destinationCategoryId: string | null) => void;
}

export default function MoveCategoryAction({
    selectedItems,
    projectData,
    onPreviewChange,
    onConfigReady,
}: MoveCategoryActionProps) {
    const { token } = theme.useToken();
    const [destinationId, setDestinationId] = useState<string | null>(null);
    const activeLang = getProjectDefaultLanguage(projectData);

    const categories = useMemo(
        () => getAllCategories(projectData, activeLang),
        [projectData, activeLang]
    );

    const selectedCategory = categories.find((c) => c.id === destinationId);

    const preview = useMemo(() => {
        if (!destinationId || !selectedCategory) return null;
        return computeMoveCategoryPreview(selectedItems, destinationId, selectedCategory.name);
    }, [destinationId, selectedCategory, selectedItems]);

    useEffect(() => {
        onPreviewChange(preview);
    }, [onPreviewChange, preview]);

    useEffect(() => {
        onConfigReady(destinationId && preview && preview.itemsToMove > 0 ? destinationId : null);
    }, [destinationId, onConfigReady, preview]);

    const lockedCount = selectedItems.filter((i) => i.isLocked).length;

    return (
        <Flex vertical gap={16}>
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Move to category</Text>
                <Select
                    aria-label="Select destination category"
                    value={destinationId}
                    onChange={(val) => setDestinationId(val)}
                    placeholder="Select destination category"
                    style={{ width: '100%' }}
                    size="large"
                    options={categories.map((cat) => ({
                        value: cat.id,
                        label: `${cat.name} (${cat.itemCount} items)`,
                    }))}
                    showSearch
                    filterOption={(input, option) =>
                        (option?.label as string || '').toLowerCase().includes(input.toLowerCase())
                    }
                />
            </Flex>

            {preview && (
                <Flex vertical gap={4}>
                    {preview.itemsToMove > 0 ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {preview.itemsToMove} {preview.itemsToMove === 1 ? 'item' : 'items'} will move to &quot;{preview.destinationCategory}&quot;.
                        </Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            All selected items are already in this category.
                        </Text>
                    )}
                    {preview.sourceCategories.length > 0 && preview.itemsToMove > 0 && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            From: {preview.sourceCategories.join(', ')}
                        </Text>
                    )}
                </Flex>
            )}

            {lockedCount > 0 && (
                <Alert
                    type="info"
                    message={`${lockedCount} locked items will not be moved.`}
                    showIcon
                    style={{ padding: '6px 12px', fontSize: 12 }}
                />
            )}
        </Flex>
    );
}
