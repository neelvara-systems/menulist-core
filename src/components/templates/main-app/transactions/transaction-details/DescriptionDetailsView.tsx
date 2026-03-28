import { AI_ACTIONS_TYPES } from '@constant/common';
import { Descriptions, Divider, Table, Tag, Typography } from 'antd';
import React from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface DescriptionDetailsViewProps {
    transaction: TransactionDetails;
}

const DescriptionDetailsView: React.FC<DescriptionDetailsViewProps> = ({ transaction }) => {
    const { clientResponse, action, itemsList, sourceLang, targetLang, contentLength } = transaction;

    if (!clientResponse) return <Typography.Text>No descriptions available</Typography.Text>;

    // For rewrite action, we need to show before and after
    const isRewrite = action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION;

    // Convert the description object to an array of entries for the table
    const descriptionEntries: Array<{
        itemId: string;
        itemName: string;
        language: string;
        description: string;
        originalDescription?: string;
    }> = [];

    // Process the response which has format: {itemId: {langCode: description}}
    Object.entries(clientResponse).forEach(([itemId, langDescriptions]: [string, any]) => {
        if (typeof langDescriptions === 'object' && langDescriptions !== null) {
            Object.entries(langDescriptions).forEach(([langCode, description]: [string, any]) => {
                // Find original description and item name if available
                let originalDescription;
                let itemName = 'Unknown';

                if (itemsList) {
                    const item = itemsList.find(item => item.id === itemId);
                    if (item) {
                        // Get item name
                        itemName = item.name || 'Unknown';

                        // Get original description for rewrites
                        if (isRewrite && item.description && item.description[langCode]) {
                            originalDescription = item.description[langCode];
                        }
                    }
                }

                descriptionEntries.push({
                    itemId,
                    itemName,
                    language: langCode,
                    description: description as string,
                    originalDescription
                });
            });
        }
    });

    const actionLabel = isRewrite ? 'Rewritten' : 'Generated';

    // Define columns based on action type
    const columns = isRewrite ? [
        { title: 'ID', dataIndex: 'itemId', key: 'itemId', width: '10%' },
        { title: 'Item Name', dataIndex: 'itemName', key: 'itemName', width: '15%' },
        { title: 'Language', dataIndex: 'language', key: 'language', width: '10%' },
        // { title: 'Before', dataIndex: 'originalDescription', key: 'originalDescription', width: '32.5%' },
        { title: 'After', dataIndex: 'description', key: 'description', width: '32.5%' }
    ] : [
        { title: 'ID', dataIndex: 'itemId', key: 'itemId', width: '10%' },
        { title: 'Item Name', dataIndex: 'itemName', key: 'itemName', width: '20%' },
        { title: 'Language', dataIndex: 'language', key: 'language', width: '10%' },
        { title: 'Description', dataIndex: 'description', key: 'description', width: '60%' }
    ];

    return (
        <>
            <Descriptions title="Description Information" column={1}>
                {/* Source Language */}
                <Descriptions.Item label="Source Language">
                    {sourceLang &&
                        `${sourceLang.name} (${sourceLang.code})`
                    }
                </Descriptions.Item>

                {/* Target Languages */}
                <Descriptions.Item label="Target Languages">
                    {/* For description operations, targetLang is an array */}
                    {Array.isArray(targetLang) &&
                        targetLang.map((lang) => (
                            <Tag key={lang.code}>{lang.name} ({lang.code})</Tag>
                        ))
                    }
                </Descriptions.Item>

                {/* Content Length */}
                {contentLength && (
                    <Descriptions.Item label="Description Length">
                        <Tag>{contentLength}</Tag>
                    </Descriptions.Item>
                )}
            </Descriptions>

            <Divider />
            <Typography.Title level={5}>{actionLabel} Descriptions</Typography.Title>
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
                <Table
                    dataSource={descriptionEntries.map((entry, index) => ({
                        key: `desc-${index}-${entry.itemId}-${entry.language}`,
                        ...entry
                    }))}
                    columns={columns}
                    pagination={false}
                    size="small"
                    scroll={{ y: 300 }}
                />
            </div>
        </>
    );
};

export default DescriptionDetailsView;
