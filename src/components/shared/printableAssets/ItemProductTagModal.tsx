'use client';

import type { PrintableAssetRenderInput } from '@lib/printable-asset-templates/types';
import { Flex, Tag, Typography } from 'antd';
import { LuTag } from 'react-icons/lu';
import PrintableAssetWorkflowModal from './PrintableAssetWorkflowModal';

const { Text } = Typography;

export default function ItemProductTagModal({ input, onClose, open }: {
    input: PrintableAssetRenderInput | null;
    onClose: () => void;
    open: boolean;
}) {
    return (
        <PrintableAssetWorkflowModal
            assetTitle="Product Tag"
            icon={<LuTag />}
            input={input}
            introDescription="Uses this selected menu item only. Review the exact source data below before downloading or editing."
            introTitle="Ready from this item"
            metadata={input?.productTagContent ? (
                <Flex gap={6} vertical>
                    <Text strong>Data used from the selected item</Text>
                    <Flex gap={6} wrap="wrap">
                        <Tag>Name: {input.productTagContent.name}</Tag>
                        <Tag>Price: {input.productTagContent.price || 'Not shown'}</Tag>
                        <Tag>Description: {input.productTagContent.detail ? 'Included' : 'Not available'}</Tag>
                        <Tag>Options: {input.productTagContent.options?.length || 0}</Tag>
                    </Flex>
                    <Text type="secondary">The QR opens this exact item. Update the item in Menu if any source detail is wrong.</Text>
                </Flex>
            ) : null}
            onClose={onClose}
            open={open}
            previewAlt={`Product Tag preview for ${input?.productTagContent?.name || 'item'}`}
            productLabel="MenuList Product Tag"
            sourceLabel="Menu item"
            unavailableDescription="Add a real item name and public store link before creating a Product Tag"
        />
    );
}
