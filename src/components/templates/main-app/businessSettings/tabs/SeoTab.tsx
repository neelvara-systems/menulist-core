'use client';
import { FEATURE_FLAGS } from '@config/features';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import generateSeoViaAPI from '@services/ai/seo/generateSeoViaAPI';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { Button, Card, Divider, Form, Input, Select, Typography, message } from 'antd';
import { useTranslations } from 'next-intl';
import { memo, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import SeoPreviewCard from './SeoPreviewCard';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface SeoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
}

function getLocalizedSeoValues(storeDetails?: any) {
    const contentLanguage = storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en';
    return {
        metaDescription: getLocalizedText(
            storeDetails?.metaDescription,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeDetails?.metaDescription, contentLanguage),
            '',
        ),
        metaTitle: getLocalizedText(
            storeDetails?.metaTitle,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeDetails?.metaTitle, contentLanguage),
            '',
        ),
        tagline: getLocalizedText(
            storeDetails?.tagline,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeDetails?.tagline, contentLanguage),
            '',
        ),
    };
}

function SeoTab({ scrollRef, storeDetails }: SeoTabProps) {
    const t = useTranslations('SEO');
    const form = Form.useFormInstance();
    const businessName = Form.useWatch('name');
    const businessCategory = Form.useWatch('businessCategory');
    const businessType = Form.useWatch('businessType');
    const city = Form.useWatch('city');
    const country = Form.useWatch('country');
    const description = Form.useWatch('description');
    const canonicalUrl = Form.useWatch('canonicalUrl');
    const customDomain = Form.useWatch('customDomain');
    const keywords = Form.useWatch('keywords');
    const logoUrl = Form.useWatch('logo');
    const metaDescription = Form.useWatch('metaDescription');
    const metaTitle = Form.useWatch('metaTitle');
    const addressLine = Form.useWatch('addressLine');
    const publicPresence = Form.useWatch('publicPresence');
    const socialMedia = Form.useWatch('socialMedia');
    const state = Form.useWatch('state');
    const subdomain = Form.useWatch('subdomain');
    const tagline = Form.useWatch('tagline');
    const [isGenerating, setIsGenerating] = useState(false);
    const localizedSeoValues = getLocalizedSeoValues(storeDetails);
    const isSeoDirty = JSON.stringify({
        canonicalUrl,
        keywords,
        metaDescription,
        metaTitle,
        tagline,
    }) !== JSON.stringify({
        canonicalUrl: storeDetails?.canonicalUrl || '',
        keywords: storeDetails?.keywords || [],
        metaDescription: localizedSeoValues.metaDescription,
        metaTitle: localizedSeoValues.metaTitle,
        tagline: localizedSeoValues.tagline,
    });

    const handleGenerateSeo = async () => {
        if (!businessName?.trim()) {
            message.error(t('generateSeoMissingName'));
            return;
        }

        try {
            setIsGenerating(true);

            const projectContext = await getDefaultProjectAiContext(storeDetails);

            const socialValues = [
                ...Object.values(socialMedia || {}),
                ...Object.values(publicPresence || {}).filter((value) => typeof value === 'string'),
            ]
                .map((value) => String(value || '').trim())
                .filter(Boolean)
                .slice(0, 12);

            const generated = await generateSeoViaAPI({
                menu: {
                    categories: projectContext?.categories || [],
                    items: projectContext?.items || [],
                    projectDescription: projectContext?.projectDescription || '',
                    projectName: projectContext?.projectName || '',
                },
                store: {
                    addressLine,
                    businessCategory,
                    businessType,
                    city,
                    country,
                    description,
                    name: businessName,
                    publicPresence: {
                        accentColor: publicPresence?.accentColor || '',
                        descriptor: firstText(publicPresence?.descriptor),
                        displayName: firstText(publicPresence?.displayName),
                        establishedYear: typeof publicPresence?.establishedYear === 'number' ? publicPresence.establishedYear : undefined,
                        googleMapsUrl: publicPresence?.googleMapsUrl || '',
                        knownFor: firstText(publicPresence?.knownFor),
                        orderUrl: publicPresence?.orderUrl || '',
                        reservationUrl: publicPresence?.reservationUrl || '',
                        whatsappNumber: publicPresence?.whatsappNumber || '',
                    },
                    socialMedia: socialValues,
                    state,
                    tagline,
                },
            });

            if (!generated) {
                message.error(t('generateSeoFailed'));
                return;
            }

            form.setFieldsValue({
                keywords: generated.keywords,
                metaDescription: generated.metaDescription,
                metaTitle: generated.metaTitle,
                tagline: generated.tagline || '',
            });
            message.success(t('generateSeoSuccess'));
        } catch (error: any) {
            message.error(error?.message || t('generateSeoFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleResetSeo = () => {
        form.setFieldsValue({
            canonicalUrl: storeDetails?.canonicalUrl || '',
            keywords: storeDetails?.keywords || [],
            metaDescription: localizedSeoValues.metaDescription,
            metaTitle: localizedSeoValues.metaTitle,
            tagline: localizedSeoValues.tagline,
        });
    };

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

            <Card
                size='small'
                style={{
                    background: '#fafafa',
                    marginBottom: 16,
                }}
            >
                <Title level={5} style={{ marginBottom: 8, marginTop: 0 }}>
                    {t('aeoCardTitle')}
                </Title>
                <Text style={{ display: 'block', marginBottom: 12 }} type="secondary">
                    {t('aeoCardDescription')}
                </Text>
                <Text style={{ display: 'block', marginBottom: 8 }}>
                    {t('aeoCardPoint1')}
                </Text>
                <Text style={{ display: 'block', marginBottom: 8 }}>
                    {t('aeoCardPoint2')}
                </Text>
                <Text style={{ display: 'block' }}>
                    {t('aeoCardPoint3')}
                </Text>
            </Card>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' }}>
                {FEATURE_FLAGS.ENABLE_SEO_AEO_GENERATION ? (
                    <Button icon={<LuSparkles />} loading={isGenerating} onClick={() => void handleGenerateSeo()} type="default">
                        {t('generateSeoButton')}
                    </Button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button disabled={!isSeoDirty} onClick={handleResetSeo}>
                        Reset
                    </Button>
                    <Button disabled={!isSeoDirty || isGenerating} onClick={() => form.submit()} type="primary">
                        Save
                    </Button>
                </div>
            </div>

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

function firstText(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'object') {
        const firstValue = Object.entries(value as Record<string, unknown>)
            .sort(([leftKey], [rightKey]) => (leftKey === 'en' ? -1 : rightKey === 'en' ? 1 : leftKey.localeCompare(rightKey)))
            .map(([, entry]) => entry)
            .find((entry) => typeof entry === 'string' && entry.trim());
        return typeof firstValue === 'string' ? firstValue.trim() : '';
    }
    return '';
}
