import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    getAiOperationHistoryJsonObject,
    getAiOperationHistoryJsonObjectArray,
    formatAiOperationHistoryLanguage,
    type AiOperationHistoryJsonObject,
    type AiOperationHistoryJsonValue,
} from '@lib/ai/operationHistoryClientContract';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { formatNumber } from '@util/formatters';
import { Descriptions, Divider, Image, Table, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useContext } from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface ImageProcessingDetailsViewProps {
    transaction: TransactionDetails;
}

const getLocalizedName = (value: AiOperationHistoryJsonValue | undefined, fallback: string) => {
    if (typeof value === 'string' && value.trim()) return value;
    const localized = getAiOperationHistoryJsonObject(value);
    return typeof localized?.en === 'string' && localized.en.trim() ? localized.en : fallback;
};

const getHistoryCount = (value: unknown): number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0
);

// Helper to render extracted menu items from image processing
const renderExtractedMenuItems = (
    clientResponse: AiOperationHistoryJsonValue | undefined,
    categories: AiOperationHistoryJsonObject[],
    currencySymbol: string,
    t: (key: string) => string,
) => {
    const response = getAiOperationHistoryJsonObject(clientResponse);
    const data = getAiOperationHistoryJsonObject(response?.data);
    const items = getAiOperationHistoryJsonObjectArray(data?.items);
    if (items.length === 0) return null;

    return (
        <Table
            dataSource={items.map((item, index) => ({
                key: typeof item.id === 'string' ? item.id : `item-${index}`,
                name: getLocalizedName(item.name, t('unnamedItem')),
                category: (() => {
                    const category = categories.find((entry) => entry.id === item.category);
                    return getLocalizedName(category?.name, t('unknown'));
                })(),
                price: typeof item.price === 'string' || typeof item.price === 'number'
                    ? String(item.price)
                    : Array.isArray(item.attributes)
                        ? t('multiplePrices')
                        : t('notAvailable'),
            }))}
            columns={[
                { title: t('itemName'), dataIndex: 'name', key: 'name' },
                { title: t('category'), dataIndex: 'category', key: 'category' },
                {
                    title: t('price'), dataIndex: 'price', key: 'price',
                    render: (price) => {
                        if (typeof price === 'string' && price !== t('notAvailable') && price !== t('multiplePrices')) {
                            const numericPrice = parseFloat(price);
                            return isNaN(numericPrice) ? price : formatMenuPrice(numericPrice, currencySymbol, { fractionDigits: 2 });
                        }
                        return price;
                    }
                }
            ]}
            expandable={{
                expandedRowRender: (record: { key: string; name: string }) => {
                    const item = items.find((entry, index) => (
                        (typeof entry.id === 'string' ? entry.id : `item-${index}`) === record.key
                    ));
                    const attributes = getAiOperationHistoryJsonObjectArray(item?.attributes);
                    if (attributes.length === 0) return null;

                    return (
                        <Table
                            dataSource={attributes.map((attr, index) => ({
                                    key: `${record.key}-attr-${index}`,
                                    name: typeof attr.name === 'string' ? attr.name : t('variation'),
                                    price: typeof attr.price === 'string' || typeof attr.price === 'number' ? String(attr.price) : '0',
                                }))}
                            columns={[
                                { title: t('variation'), dataIndex: 'name', key: 'name' },
                                {
                                    title: t('price'),
                                    dataIndex: 'price',
                                    key: 'price',
                                    render: (price) => {
                                        const numericPrice = parseFloat(price);
                                        return isNaN(numericPrice) ? price : formatMenuPrice(numericPrice, currencySymbol, { fractionDigits: 2 });
                                    }
                                }
                            ]}
                            pagination={false}
                            size="small"
                        />
                    );
                },
                rowExpandable: (record: { key: string }) => {
                    const item = items.find((entry, index) => (
                        (typeof entry.id === 'string' ? entry.id : `item-${index}`) === record.key
                    ));
                    return getAiOperationHistoryJsonObjectArray(item?.attributes).length > 0;
                }
            }}
            pagination={false}
            size="small"
        />
    );
};

const ImageProcessingDetailsView: React.FC<ImageProcessingDetailsViewProps> = ({ transaction }) => {
    const t = useTranslations('Transactions');
    const { files, targetLanguages, clientResponse } = transaction;
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const currencySymbol = storeDetails?.currencySymbol || '₹';

    const response = getAiOperationHistoryJsonObject(clientResponse);
    const data = getAiOperationHistoryJsonObject(response?.data);
    const dataSummary = getAiOperationHistoryJsonObject(response?.dataSummary);
    const categories = getAiOperationHistoryJsonObjectArray(data?.categories);
    const items = getAiOperationHistoryJsonObjectArray(data?.items);
    const categoryCount = categories.length || getHistoryCount(dataSummary?.categoriesCount);
    const itemCount = items.length || getHistoryCount(dataSummary?.itemsCount);

    return (
        <>
            <Descriptions title={t('processingInformation')} column={1}>
                <Descriptions.Item label={t('targetLanguages')}>
                    {targetLanguages?.map((lang) => (
                        <Tag key={formatAiOperationHistoryLanguage(lang)}>{formatAiOperationHistoryLanguage(lang)}</Tag>
                    ))}
                </Descriptions.Item>
            </Descriptions>

            <Divider />

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {/* Left section - Image */}
                {files && files.length > 0 && (
                    <div style={{ flex: '0 0 45%', minWidth: '300px' }}>
                        <Typography.Title level={5}>{t('inputImage')}</Typography.Title>
                        <div style={{ textAlign: 'center' }}>
                            <Image
                                src={files[0].url || undefined}
                                alt={t('inputImage')}
                                style={{ maxHeight: '400px', maxWidth: '100%' }}
                            />
                        </div>
                    </div>
                )}

                {/* Right section - Extracted Content */}
                <div style={{ flex: '1 1 45%', minWidth: '300px' }}>
                    <Typography.Title level={5}>{t('extractedContent')}</Typography.Title>
                    <div style={{ maxHeight: 400, overflow: 'auto' }}>
                        {categories.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <Typography.Text strong>{t('menuCategories')}</Typography.Text>
                                {categories.map((category, index) => {
                                    const localizedName = getAiOperationHistoryJsonObject(category.name)?.en;
                                    const categoryName = typeof localizedName === 'string'
                                        ? localizedName
                                        : typeof category.name === 'string'
                                            ? category.name
                                            : t('unnamedCategory');
                                    return (
                                        <Tag key={typeof category.id === 'string' ? category.id : `category-${index}`} color="blue" style={{ margin: '4px' }}>
                                            {categoryName}
                                        </Tag>
                                    );
                                })}
                            </div>
                        )}

                        {renderExtractedMenuItems(clientResponse, categories, currencySymbol, t)}

                        {items.length === 0 && categories.length === 0 && (itemCount > 0 || categoryCount > 0) && (
                            <Typography.Text>{t('itemsCategoriesExtracted', {
                                items: formatNumber(itemCount),
                                categories: formatNumber(categoryCount),
                            })}</Typography.Text>
                        )}

                        {itemCount === 0 && categoryCount === 0 && (
                            <Typography.Text>{t('noMenuItemsOrCategoriesFound')}</Typography.Text>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImageProcessingDetailsView;
