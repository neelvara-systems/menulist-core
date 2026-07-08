import { Alert, Flex, Radio, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type {
    ActiveInactivePreview,
    ActiveInactiveTarget,
    SelectedItemInfo,
} from '../../../types/commandCenter.types';
import { computeActiveInactivePreview } from '../utils/bulkOperations';

const { Text } = Typography;

interface ActiveInactiveActionProps {
    selectedItems: SelectedItemInfo[];
    onPreviewChange: (preview: ActiveInactivePreview | null) => void;
    onConfigReady: (target: ActiveInactiveTarget | null) => void;
}

export default function ActiveInactiveAction({
    selectedItems,
    onPreviewChange,
    onConfigReady,
}: ActiveInactiveActionProps) {
    const { token } = theme.useToken();
    const [target, setTarget] = useState<ActiveInactiveTarget | null>(null);

    const preview = useMemo(() => {
        if (!target) return null;
        return computeActiveInactivePreview(selectedItems, target);
    }, [target, selectedItems]);

    useEffect(() => {
        onPreviewChange(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview]);

    useEffect(() => {
        onConfigReady(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target]);

    const lockedCount = selectedItems.filter((i) => i.isLocked).length;

    return (
        <Flex vertical gap={16}>
            <Flex vertical gap={8}>
                <Text strong style={{ fontSize: 13 }}>Choose what customers can see</Text>
                <Radio.Group
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                >
                    <Flex vertical gap={8}>
                        <Radio value="show" style={{ fontSize: 13 }}>
                            Show to customers
                        </Radio>
                        <Radio value="hide" style={{ fontSize: 13 }}>
                            Hide from customers
                        </Radio>
                    </Flex>
                </Radio.Group>
            </Flex>

            {preview && (
                <Flex vertical gap={4}>
                    {preview.itemsToChange > 0 ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            {preview.itemsToChange} {preview.itemsToChange === 1 ? 'item' : 'items'} will change.
                        </Text>
                    ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            All selected items are already in this state.
                        </Text>
                    )}
                    {preview.itemsAlreadyInState > 0 && preview.itemsToChange > 0 && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {preview.itemsAlreadyInState} already {target === 'show' ? 'shown' : 'hidden'}.
                        </Text>
                    )}
                </Flex>
            )}

            {lockedCount > 0 && (
                <Alert
                    type="info"
                    message={`${lockedCount} locked items will not be changed.`}
                    showIcon
                    style={{ padding: '6px 12px', fontSize: 12 }}
                />
            )}

            <Text type="secondary" style={{ fontSize: 11 }}>
                Hidden items do not appear for customers. Use &quot;Change Availability&quot; for temporary out-of-stock items instead.
            </Text>
        </Flex>
    );
}
