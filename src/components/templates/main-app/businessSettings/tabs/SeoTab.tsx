'use client';
import {
    getStoreLanguageLabel,
    getStoreManagedLanguages,
    getStorePreferredLanguage,
    getLocalizedStoreKeywords,
    getLocalizedStoreValue,
} from '@lib/localization/storeContent';
import { generateOBPUrl } from '@lib/obp/generateOBPUrl';
import { normalizePublicCanonicalUrl } from '@lib/seo/publicMetadata';
import { Button, Card, Divider, Form, Input, Select, Tooltip, Typography, message, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { memo, useEffect } from 'react';
import { LuInfo } from 'react-icons/lu';
import SeoPreviewCard from './SeoPreviewCard';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface SeoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    storeDetails?: any;
}

function getLocalizedSeoValues(storeDetails?: any) {
    const contentLanguage = getStorePreferredLanguage(storeDetails);
    return {
        keywords: getLocalizedStoreKeywords(storeDetails?.keywords, contentLanguage, []),
        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, contentLanguage, ''),
        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, contentLanguage, ''),
        tagline: getLocalizedStoreValue(storeDetails?.tagline, contentLanguage, ''),
    };
}

function getDefaultCanonicalUrl(storeDetails?: any): string {
    return normalizePublicCanonicalUrl(storeDetails?.canonicalUrl)
        || generateOBPUrl(storeDetails?.subdomain, storeDetails?.customDomain)
        || '';
}

function SeoTab({ scrollRef, storeDetails }: SeoTabProps) {
    const t = useTranslations('SEO');
    const { token } = theme.useToken();
    const form = Form.useFormInstance();
    const businessName = Form.useWatch('name');
    const canonicalUrl = Form.useWatch('canonicalUrl');
    const customDomain = Form.useWatch('customDomain');
    const keywords = Form.useWatch('keywords');
    const logoUrl = Form.useWatch('logo');
    const metaDescription = Form.useWatch('metaDescription');
    const metaTitle = Form.useWatch('metaTitle');
    const subdomain = Form.useWatch('subdomain');
    const tagline = Form.useWatch('tagline');
    const localizedSeoDrafts = Form.useWatch('__localizedSeoDrafts') || {};
    const storeContentLanguage = Form.useWatch('__storeContentLanguage');
    const localizedSeoValues = getLocalizedSeoValues(storeDetails);
    const defaultCanonicalUrl = getDefaultCanonicalUrl(storeDetails);
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
        canonicalUrl: defaultCanonicalUrl,
        keywords: localizedSeoValues.keywords,
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
                        keywords: getLocalizedStoreKeywords(storeDetails?.keywords, languageCode, []),
                        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                        tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                    },
                ]),
            );

        form.setFieldsValue({
            __localizedSeoDrafts: nextDrafts,
            __storeContentLanguage: currentLanguage,
            canonicalUrl: defaultCanonicalUrl,
            keywords: nextDrafts[currentLanguage]?.keywords || [],
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
                    keywords: Array.isArray(keywords) ? keywords : [],
                    metaDescription: metaDescription || '',
                    metaTitle: metaTitle || '',
                    tagline: tagline || '',
                },
            },
        });
    }, [currentLanguage, keywords, metaDescription, metaTitle, tagline]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleResetSeo = () => {
        const resetDrafts = Object.fromEntries(
            managedLanguages.map((languageCode) => [
                    languageCode,
                    {
                        keywords: getLocalizedStoreKeywords(storeDetails?.keywords, languageCode, []),
                        metaDescription: getLocalizedStoreValue(storeDetails?.metaDescription, languageCode, ''),
                        metaTitle: getLocalizedStoreValue(storeDetails?.metaTitle, languageCode, ''),
                        tagline: getLocalizedStoreValue(storeDetails?.tagline, languageCode, ''),
                },
            ]),
        );
        form.setFieldsValue({
            __localizedSeoDrafts: resetDrafts,
            __storeContentLanguage: currentLanguage,
            canonicalUrl: defaultCanonicalUrl,
            keywords: resetDrafts[currentLanguage]?.keywords || [],
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
                                    keywords: Array.isArray(keywords) ? keywords : [],
                                    metaDescription: metaDescription || '',
                                    metaTitle: metaTitle || '',
                                    tagline: tagline || '',
                                },
                            };

                            form.setFieldsValue({
                                __localizedSeoDrafts: nextDrafts,
                                __storeContentLanguage: nextLanguage,
                                keywords: nextDrafts[nextLanguage]?.keywords || [],
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
                                keywords: Array.isArray(keywords) ? keywords : [],
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
                label={<FieldLabel label={t('metaTitle')} tooltip={t('metaTitleHelp')} />}
                name="metaTitle"
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
                                keywords: Array.isArray(keywords) ? keywords : [],
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
                label={<FieldLabel label={t('metaDescription')} tooltip={t('metaDescHelp')} />}
                name="metaDescription"
            >
                <TextArea rows={3} placeholder={t('metaDescPlaceholder')} maxLength={160} showCount />
            </Form.Item>
            {currentLanguage !== referenceLanguage ? (
                <DesktopLocalizedReferenceHint
                    onUseReference={() => {
                        const nextDrafts = {
                            ...localizedSeoDrafts,
                            [currentLanguage]: {
                                keywords: Array.isArray(keywords) ? keywords : [],
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
                label={<FieldLabel label={t('keywords')} tooltip={t('keywordsHelp')} />}
                name="keywords"
            >
                <Select
                    mode="tags"
                    style={{ width: '100%' }}
                    placeholder={t('keywordsPlaceholder')}
                    tokenSeparators={[',']}
                />
            </Form.Item>
            {currentLanguage !== referenceLanguage ? (
                <DesktopLocalizedReferenceHint
                    onUseReference={() => {
                        const referenceKeywords = Array.isArray(localizedSeoDrafts[referenceLanguage]?.keywords)
                            ? localizedSeoDrafts[referenceLanguage].keywords
                            : [];
                        const nextDrafts = {
                            ...localizedSeoDrafts,
                            [currentLanguage]: {
                                keywords: referenceKeywords,
                                metaDescription: metaDescription || '',
                                metaTitle: metaTitle || '',
                                tagline: tagline || '',
                            },
                        };

                        form.setFieldsValue({
                            __localizedSeoDrafts: nextDrafts,
                            keywords: referenceKeywords,
                        });
                    }}
                    referenceLabel={getStoreLanguageLabel(referenceLanguage)}
                    referenceValue={Array.isArray(localizedSeoDrafts[referenceLanguage]?.keywords) ? localizedSeoDrafts[referenceLanguage].keywords.join(', ') : ''}
                />
            ) : null}

            <Form.Item
                label={<FieldLabel label={t('canonicalUrl')} tooltip={t('canonicalUrlHelp')} />}
                name="canonicalUrl"
                rules={[{
                    validator: (_, value) => normalizePublicCanonicalUrl(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error('Enter a valid HTTPS canonical URL.')),
                }]}
            >
                <TextArea
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder={t('canonicalUrlPlaceholder')}
                />
            </Form.Item>

            <Card
                size='small'
                style={{
                    background: token.colorFillAlter,
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

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button aria-label="Reset SEO and AEO" disabled={!isSeoDirty} onClick={handleResetSeo}>
                        Reset
                    </Button>
                    <Button aria-label="Save SEO and AEO" disabled={!isSeoDirty} onClick={() => form.submit()} type="primary">
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

function referenceValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function FieldLabel({ label, tooltip }: { label: string; tooltip: string }) {
    return (
        <span style={{ alignItems: 'center', display: 'inline-flex', gap: 6 }}>
            <span>{label}</span>
            <Tooltip title={tooltip}>
                <span style={{ color: 'inherit', display: 'inline-flex', lineHeight: 0 }}>
                    <LuInfo size={14} />
                </span>
            </Tooltip>
        </span>
    );
}
