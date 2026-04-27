'use client';
import { FEATURE_FLAGS } from '@config/features';
import { getStoreLanguageLabel, getStoreManagedLanguages, getStorePreferredLanguage, getLocalizedStoreValue } from '@lib/localization/storeContent';
import { getActiveBusinessAttributeLabels } from '@services/ai/businessCopy/utils';
import generateSeoViaAPI from '@services/ai/seo/generateSeoViaAPI';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { Button, Card, Divider, Form, Input, Select, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { memo, useEffect, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import SeoPreviewCard from './SeoPreviewCard';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface SeoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
}

function getLocalizedSeoValues(storeDetails?: any) {
    const contentLanguage = getStorePreferredLanguage(storeDetails);
    return {
        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, contentLanguage, ''),
        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, contentLanguage, ''),
        tagline: getLocalizedStoreValue(storeDetails?.tagline, contentLanguage, ''),
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
    const businessAttributes = Form.useWatch('businessAttributes');
    const metaDescription = Form.useWatch('metaDescription');
    const metaTitle = Form.useWatch('metaTitle');
    const addressLine = Form.useWatch('addressLine');
    const publicPresence = Form.useWatch('publicPresence');
    const socialMedia = Form.useWatch('socialMedia');
    const state = Form.useWatch('state');
    const subdomain = Form.useWatch('subdomain');
    const tagline = Form.useWatch('tagline');
    const localizedSeoDrafts = Form.useWatch('__localizedSeoDrafts') || {};
    const storeContentLanguage = Form.useWatch('__storeContentLanguage');
    const [isGenerating, setIsGenerating] = useState(false);
    const localizedSeoValues = getLocalizedSeoValues(storeDetails);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const currentLanguage = storeContentLanguage || getStorePreferredLanguage(storeDetails);
    const referenceLanguage = getStorePreferredLanguage(storeDetails);
    const currentPwaShortName = getLocalizedStoreValue(storeDetails?.pwaSettings?.pwaShortName, currentLanguage, '');
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

    useEffect(() => {
        if (!storeDetails) return;
        const nextDrafts = Object.keys(localizedSeoDrafts || {}).length > 0
            ? localizedSeoDrafts
            : Object.fromEntries(
                managedLanguages.map((languageCode) => [
                    languageCode,
                    {
                        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                        tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                    },
                ]),
            );

        form.setFieldsValue({
            __localizedSeoDrafts: nextDrafts,
            __storeContentLanguage: currentLanguage,
            metaDescription: nextDrafts[currentLanguage]?.metaDescription || '',
            metaTitle: nextDrafts[currentLanguage]?.metaTitle || '',
            tagline: nextDrafts[currentLanguage]?.tagline || '',
        });
    }, [storeDetails]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!currentLanguage) return;
        form.setFieldsValue({
            __localizedSeoDrafts: {
                ...localizedSeoDrafts,
                [currentLanguage]: {
                    metaDescription: metaDescription || '',
                    metaTitle: metaTitle || '',
                    tagline: tagline || '',
                },
            },
        });
    }, [currentLanguage, metaDescription, metaTitle, tagline]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    businessAttributes: getActiveBusinessAttributeLabels(businessAttributes),
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
                        googleReviewUrl: publicPresence?.googleReviewUrl || '',
                        knownFor: firstText(publicPresence?.knownFor),
                        orderUrl: publicPresence?.orderUrl || '',
                        reservationUrl: publicPresence?.reservationUrl || '',
                        whatsappNumber: publicPresence?.whatsappNumber || '',
                    },
                    pwaShortName: currentPwaShortName,
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
                __localizedSeoDrafts: {
                    ...localizedSeoDrafts,
                    [currentLanguage]: {
                        metaDescription: generated.metaDescription,
                        metaTitle: generated.metaTitle,
                        tagline: generated.tagline || '',
                    },
                },
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
        const resetDrafts = Object.fromEntries(
            managedLanguages.map((languageCode) => [
                languageCode,
                {
                    metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                    metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                    tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                },
            ]),
        );
        form.setFieldsValue({
            __localizedSeoDrafts: resetDrafts,
            __storeContentLanguage: currentLanguage,
            canonicalUrl: storeDetails?.canonicalUrl || '',
            keywords: storeDetails?.keywords || [],
            metaDescription: resetDrafts[currentLanguage]?.metaDescription || '',
            metaTitle: resetDrafts[currentLanguage]?.metaTitle || '',
            tagline: resetDrafts[currentLanguage]?.tagline || '',
        });
    };

    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('title')}</Title>
            <Divider />
            {managedLanguages.length > 1 ? (
                <Form.Item label="SEO content language">
                    <Select
                        value={currentLanguage}
                        options={managedLanguages.map((languageCode) => ({
                            label: getStoreLanguageLabel(languageCode),
                            value: languageCode,
                        }))}
                        onChange={(nextLanguage) => {
                            const nextDrafts = {
                                ...localizedSeoDrafts,
                                [currentLanguage]: {
                                    metaDescription: metaDescription || '',
                                    metaTitle: metaTitle || '',
                                    tagline: tagline || '',
                                },
                            };

                            form.setFieldsValue({
                                __localizedSeoDrafts: nextDrafts,
                                __storeContentLanguage: nextLanguage,
                                metaDescription: nextDrafts[nextLanguage]?.metaDescription || '',
                                metaTitle: nextDrafts[nextLanguage]?.metaTitle || '',
                                tagline: nextDrafts[nextLanguage]?.tagline || '',
                            });
                        }}
                    />
                </Form.Item>
            ) : null}
            <Form.Item
                label={t('tagline')}
                name="tagline"
                extra={<Text type="secondary">{t('taglineHelp')}</Text>}
            >
                <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder={t('taglinePlaceholder')}
                    maxLength={100}
                    showCount
                />
            </Form.Item>
            {currentLanguage !== referenceLanguage ? (
                <DesktopLocalizedReferenceHint
                    onUseReference={() => {
                        const nextDrafts = {
                            ...localizedSeoDrafts,
                            [currentLanguage]: {
                                metaDescription: metaDescription || '',
                                metaTitle: metaTitle || '',
                                tagline: referenceValue(localizedSeoDrafts[referenceLanguage]?.tagline),
                            },
                        };

                        form.setFieldsValue({
                            __localizedSeoDrafts: nextDrafts,
                            tagline: referenceValue(localizedSeoDrafts[referenceLanguage]?.tagline),
                        });
                    }}
                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                    referenceValue={localizedSeoDrafts[referenceLanguage]?.tagline || ''}
                />
            ) : null}

            <Form.Item
                label={t('metaTitle')}
                name="metaTitle"
                extra={<Text type="secondary">{t('metaTitleHelp')}</Text>}
            >
                <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder={t('metaTitlePlaceholder')}
                    maxLength={60}
                    showCount
                />
            </Form.Item>
            {currentLanguage !== referenceLanguage ? (
                <DesktopLocalizedReferenceHint
                    onUseReference={() => {
                        const nextDrafts = {
                            ...localizedSeoDrafts,
                            [currentLanguage]: {
                                metaDescription: metaDescription || '',
                                metaTitle: referenceValue(localizedSeoDrafts[referenceLanguage]?.metaTitle),
                                tagline: tagline || '',
                            },
                        };

                        form.setFieldsValue({
                            __localizedSeoDrafts: nextDrafts,
                            metaTitle: referenceValue(localizedSeoDrafts[referenceLanguage]?.metaTitle),
                        });
                    }}
                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                    referenceValue={localizedSeoDrafts[referenceLanguage]?.metaTitle || ''}
                />
            ) : null}

            <Form.Item
                label={t('metaDescription')}
                name="metaDescription"
                extra={<Text type="secondary">{t('metaDescHelp')}</Text>}
            >
                <TextArea rows={3} placeholder={t('metaDescPlaceholder')} maxLength={160} showCount />
            </Form.Item>
            {currentLanguage !== referenceLanguage ? (
                <DesktopLocalizedReferenceHint
                    onUseReference={() => {
                        const nextDrafts = {
                            ...localizedSeoDrafts,
                            [currentLanguage]: {
                                metaDescription: referenceValue(localizedSeoDrafts[referenceLanguage]?.metaDescription),
                                metaTitle: metaTitle || '',
                                tagline: tagline || '',
                            },
                        };

                        form.setFieldsValue({
                            __localizedSeoDrafts: nextDrafts,
                            metaDescription: referenceValue(localizedSeoDrafts[referenceLanguage]?.metaDescription),
                        });
                    }}
                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                    referenceValue={localizedSeoDrafts[referenceLanguage]?.metaDescription || ''}
                />
            ) : null}

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
                <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder={t('canonicalUrlPlaceholder')}
                />
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

function DesktopLocalizedReferenceHint({
    onUseReference,
    referenceLabel,
    referenceValue,
}: {
    onUseReference: () => void;
    referenceLabel: string;
    referenceValue: string;
}) {
    const { token } = theme.useToken();

    return (
        <div style={{ margin: '-12px 0 16px' }}>
            <Card
                size="small"
                style={{
                    background: token.colorFillAlter,
                    borderColor: token.colorBorderSecondary,
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                        <Text type="secondary">{`${referenceLabel} reference`}</Text>
                        <div style={{ marginTop: 4 }}>
                            <Text>{referenceValue || 'No reference content available yet.'}</Text>
                        </div>
                    </div>
                    {referenceValue ? (
                        <Button size="small" type="link" onClick={onUseReference}>
                            Use reference
                        </Button>
                    ) : null}
                </div>
            </Card>
        </div>
    );
}

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

function referenceValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}
