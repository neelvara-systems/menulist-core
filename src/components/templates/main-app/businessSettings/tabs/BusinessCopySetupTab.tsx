'use client';

import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import generateBusinessCopyViaAPI, { BusinessCopyGenerationResult } from '@services/ai/businessCopy/generateBusinessCopyViaAPI';
import { firstText, getActiveBusinessAttributeLabels } from '@services/ai/businessCopy/utils';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { Alert, Button, Card, Divider, Form, List, Typography, message } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuSparkles } from 'react-icons/lu';

const { Text, Title } = Typography;

interface BusinessCopySetupTabProps {
    onApplyGeneratedCopy: (generated: BusinessCopyGenerationResult, projectId?: string) => Promise<void>;
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
}

export default function BusinessCopySetupTab({ onApplyGeneratedCopy, scrollRef, storeDetails }: BusinessCopySetupTabProps) {
    const t = useTranslations('BusinessSettings');
    const form = Form.useFormInstance();
    const businessName = Form.useWatch('name');
    const businessCategory = Form.useWatch('businessCategory');
    const businessType = Form.useWatch('businessType');
    const city = Form.useWatch('city');
    const country = Form.useWatch('country');
    const description = Form.useWatch('description');
    const addressLine = Form.useWatch('addressLine');
    const publicPresence = Form.useWatch('publicPresence');
    const socialMedia = Form.useWatch('socialMedia');
    const state = Form.useWatch('state');
    const tagline = Form.useWatch('tagline');
    const businessAttributes = Form.useWatch('businessAttributes');
    const [isGenerating, setIsGenerating] = useState(false);
    const contentLanguage = storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en';
    const sourceLanguage = GlobalLanguagesList.find((language) => language.code === contentLanguage);

    const handleGenerate = async () => {
        if (!businessName?.trim()) {
            message.error(t('businessCopyMissingName'));
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

            const generated = await generateBusinessCopyViaAPI({
                sourceLang: sourceLanguage,
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
                    pwaShortName: getLocalizedText(
                        storeDetails?.pwaSettings?.pwaShortName,
                        contentLanguage,
                        getPrimaryLocalizedLanguage(storeDetails?.pwaSettings?.pwaShortName, contentLanguage),
                        '',
                    ),
                    socialMedia: socialValues,
                    state,
                    tagline,
                },
            });

            if (!generated) {
                message.error(t('businessCopyFailed'));
                return;
            }

            await onApplyGeneratedCopy(generated, projectContext?.projectId);
            form.setFieldsValue({
                keywords: generated.keywords,
                metaDescription: generated.metaDescription,
                metaTitle: generated.metaTitle,
                publicPresence: {
                    ...form.getFieldValue('publicPresence'),
                    descriptor: generated.descriptor,
                    displayName: generated.displayName,
                    knownFor: generated.knownFor,
                },
                tagline: generated.tagline,
            });
            message.success(t('businessCopySuccess'));
        } catch (error: any) {
            message.error(error?.message || t('businessCopyFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    if (!FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION) {
        return null;
    }

    return (
        <Card size="small" ref={scrollRef}>
            <Title level={5} style={{ margin: 'unset' }}>
                {t('businessCopySetup')}
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
                {t('businessCopySetupDesc')}
            </Text>
            <Divider />

            <Alert
                message={t('businessCopySourceHint')}
                showIcon
                style={{ marginBottom: 16 }}
                type="info"
            />

            <List
                dataSource={[
                    t('businessCopyUpdatesOfficialPage'),
                    t('businessCopyUpdatesSeo'),
                    t('businessCopyUpdatesCustomerApp'),
                ]}
                header={<Text strong>{t('businessCopyUpdatesTitle')}</Text>}
                renderItem={(item) => <List.Item>{item}</List.Item>}
                style={{ marginBottom: 16 }}
            />

            <Button
                block
                icon={<LuSparkles />}
                loading={isGenerating}
                onClick={() => void handleGenerate()}
                type="primary"
            >
                {t('generateBusinessCopy')}
            </Button>

            <Text style={{ display: 'block', fontSize: 12, marginTop: 12 }} type="secondary">
                {t('businessCopyApplyNote')}
            </Text>
        </Card>
    );
}
