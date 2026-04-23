'use client';
import { Card, Divider, Form, Input, Select, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { memo } from 'react';
import SeoPreviewCard from './SeoPreviewCard';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface SeoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

function SeoTab({ scrollRef }: SeoTabProps) {
    const t = useTranslations('SEO');
    const businessName = Form.useWatch('name');
    const canonicalUrl = Form.useWatch('canonicalUrl');
    const customDomain = Form.useWatch('customDomain');
    const keywords = Form.useWatch('keywords');
    const logoUrl = Form.useWatch('logo');
    const metaDescription = Form.useWatch('metaDescription');
    const metaTitle = Form.useWatch('metaTitle');
    const subdomain = Form.useWatch('subdomain');
    const tagline = Form.useWatch('tagline');

    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('title')}</Title>
            <Divider />
            <Form.Item
                label={t('tagline')}
                name="tagline"
                extra={<Text type="secondary">{t('taglineHelp')}</Text>}
            >
                <Input placeholder={t('taglinePlaceholder')} maxLength={100} showCount />
            </Form.Item>

            <Form.Item
                label={t('metaTitle')}
                name="metaTitle"
                extra={<Text type="secondary">{t('metaTitleHelp')}</Text>}
            >
                <Input placeholder={t('metaTitlePlaceholder')} maxLength={60} showCount />
            </Form.Item>

            <Form.Item
                label={t('metaDescription')}
                name="metaDescription"
                extra={<Text type="secondary">{t('metaDescHelp')}</Text>}
            >
                <TextArea rows={3} placeholder={t('metaDescPlaceholder')} maxLength={160} showCount />
            </Form.Item>

            <Form.Item
                label={t('keywords')}
                name="keywords"
                extra={<Text type="secondary">{t('keywordsHelp')}</Text>}
            >
                <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    placeholder={t('keywordsPlaceholder')}
                    tokenSeparators={[',']}
                />
            </Form.Item>

            <Form.Item
                label={t('canonicalUrl')}
                name="canonicalUrl"
                extra={<Text type="secondary">{t('canonicalUrlHelp')}</Text>}
            >
                <Input placeholder={t('canonicalUrlPlaceholder')} />
            </Form.Item>

            <SeoPreviewCard
                businessName={businessName}
                canonicalUrl={canonicalUrl}
                customDomain={customDomain}
                keywords={keywords}
                logoUrl={logoUrl}
                metaDescription={metaDescription}
                metaTitle={metaTitle}
                subdomain={subdomain}
                tagline={tagline}
            />

            {/* <Form.Item
                label="Schema Markup Type"
                name="schemaType"
                initialValue="Restaurant"
                extra={<Text type="secondary">This helps search engines understand what type of business you are. Choose the option that best matches your establishment.</Text>}
            >
                <Select
                    options={[
                        { label: 'Restaurant', value: 'Restaurant' },
                        { label: 'FoodEstablishment', value: 'FoodEstablishment' },
                        { label: 'Cafe', value: 'Cafe' },
                        { label: 'FastFoodRestaurant', value: 'FastFoodRestaurant' },
                    ]}
                />
            </Form.Item> */}
        </Card>
    );
}

export default memo(SeoTab);
