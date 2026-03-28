import { Alert, Flex, Radio, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import type {
    AvailabilityPreview,
    AvailabilityTarget,
    SelectedItemInfo,
} from '../../../types/commandCenter.types';
import { computeAvailabilityPreview } from '../utils/bulkOperations';

const { Text } = Typography;

interface AvailabilityActionProps {
    selectedItems: SelectedItemInfo[];
    onPreviewChange: (preview: AvailabilityPreview | null) => void;
    onConfigReady: (target: AvailabilityTarget | null) => void;
}

export default function AvailabilityAction({
    selectedItems,
    onPreviewChange,
    onConfigReady,
}: AvailabilityActionProps) {
    const { token } = theme.useToken();
    const [target, setTarget] = useState<AvailabilityTarget | null>(null);

    const preview = useMemo(() => {
        if (!target) return null;
        return computeAvailabilityPreview(selectedItems, target);
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
                <Text strong style={{ fontSize: 13 }}>Change availability to</Text>
                <Radio.Group
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                >
                    <Flex vertical gap={8}>
                        <Radio value="available" style={{ fontSize: 13 }}>
                            Mark as Available
                        </Radio>
                        <Radio value="unavailable" style={{ fontSize: 13 }}>
                            Mark as Unavailable (Sold Out)
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
                            {preview.itemsAlreadyInState} already {target === 'available' ? 'available' : 'unavailable'}.
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
                Unavailable items show as &quot;Sold Out&quot; on the customer menu.
            </Text>
        </Flex>
    );
}
