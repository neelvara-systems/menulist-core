import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatMenuPrice } from '@lib/pricing/formatMenuPrice';
import { Descriptions, Divider, Image, Table, Tag, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useContext } from 'react';
import { TransactionDetails } from '../TransactionDetailsModal'; // Adjust import path if needed

interface ImageProcessingDetailsViewProps {
    transaction: TransactionDetails;
}

// Helper to render extracted menu items from image processing
const renderExtractedMenuItems = (
    clientResponse: any,
    categories: any[],
    currencySymbol: string,
    t: (key: string) => string,
) => {
    if (!clientResponse?.data?.items || clientResponse.data.items.length === 0) {
        return <Typography.Text>{t('noMenuItemsFound')}</Typography.Text>;
    }
    const items = clientResponse.data.items;

    return (
        <Table
            dataSource={items.map((item: any) => ({
                key: item.id,
                name: typeof item.name === 'object' ? item.name?.en : String(item.name) || t('unnamedItem'),
                category: (() => {
                    const category = categories.find((c: any) => c.id === item.category);
                    if (category && typeof category.name === 'object') {
                        return category.name?.en || t('unknown');
                    }
                    return category?.name || t('unknown');
                })(),
                price: item.price || (item.attributes ? t('multiplePrices') : t('notAvailable'))
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
                expandedRowRender: (record: any) => {
                    const item = items.find((i: any) => {
                        if (typeof i.name === 'object') {
                            return i.name?.en === record.name;
                        }
                        return String(i.name) === record.name;
                    });
                    if (!item || !Array.isArray(item.attributes) || item.attributes.length === 0) return null;

                    return (
                        <Table
                            dataSource={Array.isArray(item.attributes) ?
                                item.attributes.map((attr: any, index: number) => ({
                                    ...attr,
                                    key: `${record.key}-attr-${index}`,
                                    name: typeof attr.name === 'string' ? attr.name : t('variation'),
                                    price: typeof attr.price === 'string' ? attr.price : '0'
                                })) : []}
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
                rowExpandable: (record: any) => {
                    const item = items.find((i: any) => {
                        if (typeof i.name === 'object') {
                            return i.name?.en === record.name;
                        }
                        return String(i.name) === record.name;
                    });
                    return item && Array.isArray(item.attributes) && item.attributes.length > 0;
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

    const categories = clientResponse?.data?.categories || [];
    const items = clientResponse?.data?.items || [];

    return (
        <>
            <Descriptions title={t('processingInformation')} column={1}>
                <Descriptions.Item label={t('targetLanguages')}>
                    {targetLanguages?.map((lang) => (
                        <Tag key={lang.code}>{lang.name} ({lang.code})</Tag>
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
                                src={files[0].url}
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
                                {categories.map((category: any) => (
                                    <Tag key={category.id} color="blue" style={{ margin: '4px' }}>
                                        {category.name?.en || t('unnamedCategory')}
                                    </Tag>
                                ))}
                            </div>
                        )}

                        {renderExtractedMenuItems(clientResponse, categories, currencySymbol, t)}

                        {items.length === 0 && categories.length === 0 && (
                            <Typography.Text>{t('noMenuItemsOrCategoriesFound')}</Typography.Text>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImageProcessingDetailsView;
