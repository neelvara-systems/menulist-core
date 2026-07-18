import { AI_ACTIONS_TYPES } from '@constant/common';
import { formatAiOperationHistoryLanguage, getAiOperationHistoryJsonObject } from '@lib/ai/operationHistoryClientContract';
import { Descriptions, Divider, Table, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface DescriptionDetailsViewProps {
    transaction: TransactionDetails;
}

const DescriptionDetailsView: React.FC<DescriptionDetailsViewProps> = ({ transaction }) => {
    const t = useTranslations('Transactions');
    const { clientResponse, action, itemsList, sourceLang, targetLang, contentLength } = transaction;

    const response = getAiOperationHistoryJsonObject(clientResponse);
    if (!response || typeof response.responseSummaryKind === 'string') {
        return <Typography.Text>{t('noDescriptionsRecorded')}</Typography.Text>;
    }

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
    Object.entries(response).forEach(([itemId, langDescriptions]) => {
        const descriptions = getAiOperationHistoryJsonObject(langDescriptions);
        if (descriptions) {
            Object.entries(descriptions).forEach(([langCode, description]) => {
                if (typeof description !== 'string') return;
                // Find original description and item name if available
                let originalDescription;
                let itemName = t('unknown');

                if (itemsList) {
                    const item = itemsList.find(item => item.id === itemId);
                    if (item) {
                        // Get item name
                        itemName = item.name || t('unknown');

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
                    description,
                    originalDescription
                });
            });
        }
    });

    if (descriptionEntries.length === 0) {
        return <Typography.Text>{t('noDescriptionsRecorded')}</Typography.Text>;
    }

    const actionLabel = isRewrite ? t('rewritten') : t('generated');

    // Define columns based on action type
    const columns = isRewrite ? [
        { title: t('id'), dataIndex: 'itemId', key: 'itemId', width: '10%' },
        { title: t('itemName'), dataIndex: 'itemName', key: 'itemName', width: '15%' },
        { title: t('language'), dataIndex: 'language', key: 'language', width: '10%' },
        // { title: 'Before', dataIndex: 'originalDescription', key: 'originalDescription', width: '32.5%' },
        { title: t('after'), dataIndex: 'description', key: 'description', width: '32.5%' }
    ] : [
        { title: t('id'), dataIndex: 'itemId', key: 'itemId', width: '10%' },
        { title: t('itemName'), dataIndex: 'itemName', key: 'itemName', width: '20%' },
        { title: t('language'), dataIndex: 'language', key: 'language', width: '10%' },
        { title: t('description'), dataIndex: 'description', key: 'description', width: '60%' }
    ];

    return (
        <>
            <Descriptions title={t('descriptionInformation')} column={1}>
                {/* Source Language */}
                <Descriptions.Item label={t('sourceLanguage')}>
                    {formatAiOperationHistoryLanguage(sourceLang)}
                </Descriptions.Item>

                {/* Target Languages */}
                <Descriptions.Item label={t('targetLanguages')}>
                    {/* For description operations, targetLang is an array */}
                    {Array.isArray(targetLang) &&
                        targetLang.map((lang) => (
                            <Tag key={formatAiOperationHistoryLanguage(lang)}>{formatAiOperationHistoryLanguage(lang)}</Tag>
                        ))
                    }
                </Descriptions.Item>

                {/* Content Length */}
                {contentLength && (
                    <Descriptions.Item label={t('descriptionLength')}>
                        <Tag>{contentLength}</Tag>
                    </Descriptions.Item>
                )}
            </Descriptions>

            <Divider />
            <Typography.Title level={5}>{t('descriptionsHeading', { action: actionLabel })}</Typography.Title>
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
