'use client'

import type { OwnerBusinessHealthSourceRef } from '@lib/ownerBusinessAssistant/types';
import { Flex, Popup, Text } from '../antd';

export default function MobileBusinessHealthSourceSheet({ open, onClose, sources }: {
    open: boolean;
    onClose: () => void;
    sources?: OwnerBusinessHealthSourceRef[];
}) {
    return (
        <Popup onMaskClick={onClose} visible={open}>
            <Flex gap={8} style={{ padding: 16 }} vertical>
                <Text strong>Sources</Text>
                {sources?.length ? sources.map((source) => (
                    <Text key={source.id} type="secondary">
                        {source.source}{source.freshnessLabel ? ` · ${source.freshnessLabel}` : ''}
                    </Text>
                )) : <Text type="secondary">No source details available</Text>}
            </Flex>
        </Popup>
    );
}
