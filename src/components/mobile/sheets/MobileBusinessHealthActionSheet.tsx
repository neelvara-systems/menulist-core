'use client'

import type { OwnerBusinessAssistantActionOption } from '@lib/ownerBusinessAssistant/types';
import { Button, Flex, Popup, Text } from '../antd';

export default function MobileBusinessHealthActionSheet({ actions, open, onClose, onSelect }: {
    actions?: OwnerBusinessAssistantActionOption[];
    open: boolean;
    onClose: () => void;
    onSelect: (action: OwnerBusinessAssistantActionOption) => void;
}) {
    return (
        <Popup onMaskClick={onClose} visible={open}>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Text strong>Actions</Text>
                {actions?.length ? actions.map((action) => (
                    <Button block fill="outline" key={action.actionType} onClick={() => onSelect(action)}>
                        {action.label}
                    </Button>
                )) : <Text type="secondary">No actions available</Text>}
            </Flex>
        </Popup>
    );
}
