'use client';

import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import { getStoreLanguageLabel, getStoreSourceLanguage } from '@lib/localization/storeContent';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { AICapacityError } from '@services/ai/capacityError';
import generateBusinessCopyViaAPI, { BusinessCopyGenerationResult } from '@services/ai/businessCopy/generateBusinessCopyViaAPI';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { firstText, getActiveBusinessAttributeLabels } from '@services/ai/businessCopy/utils';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { formatDateTime } from '@util/dateTime';
import { Alert, Button, Card, Divider, Flex, Form, List, Tag, Typography, message, theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { LuAlertCircle, LuCheckCircle, LuLanguages, LuSparkles } from 'react-icons/lu';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from '../utils/businessSettingsDiagnostics';

const { Text, Title } = Typography;

interface BusinessCopySetupTabProps {
    onApplyGeneratedCopy: (generated: BusinessCopyGenerationResult, projectId?: string) => Promise<{ translationIncomplete: boolean }>;
    onGenerateMissingTranslations?: (projectId?: string) => Promise<boolean>;
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
}

const BUSINESS_COPY_CAPACITY_MESSAGE = 'Get more enhancements to continue. Visit Billing to add an enhancement pack.';

export default function BusinessCopySetupTab({ onApplyGeneratedCopy, onGenerateMissingTranslations, scrollRef, storeDetails }: BusinessCopySetupTabProps) {
    const t = useTranslations('BusinessSettings');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const form = Form.useFormInstance();
    const tenantName = Form.useWatch('tenantName');
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
    const [isGeneratingTranslations, setIsGeneratingTranslations] = useState(false);
    const contentLanguage = getStoreSourceLanguage();
    const sourceLanguage = GlobalLanguagesList.find((language) => language.code === contentLanguage);
    const coverage = useMemo(
        () => computeBusinessCopyCoverage(storeDetails, { includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA }),
        [storeDetails]
    );
    const hasEmptyBusinessCopyFields = coverage.fields.some((field) => field.status === 'empty');
    const hasCoverageGaps = coverage.missingFieldCount > 0;
    const showFullGenerationCta = coverage.repairableGapCount === 0 || hasEmptyBusinessCopyFields;
    const fullGenerationLabel = hasCoverageGaps ? t('generateBusinessCopy') : t('regenerateBusinessCopy');
    const businessCopyMeta = storeDetails?.businessCopyMeta;
    const formatAuditTime = (value?: string) => value ? formatDateTime(value, 'datetime', formatter) : '';

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
                        establishedYear: typeof publicPresence?.establishedYear === 'number' ? publicPresence.establishedYear : undefined,
                        googleMapsUrl: publicPresence?.googleMapsUrl || '',
                        googleReviewUrl: publicPresence?.googleReviewUrl || '',
                        knownFor: firstText(publicPresence?.knownFor),
                        orderUrl: publicPresence?.orderUrl || '',
                        reservationUrl: publicPresence?.reservationUrl || '',
                        specialNote: firstText(publicPresence?.specialNote),
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
                    tagline: getLocalizedText(
                        storeDetails?.tagline,
                        contentLanguage,
                        getPrimaryLocalizedLanguage(storeDetails?.tagline, contentLanguage),
                        '',
                    ),
                    tenantName: tenantName || storeDetails?.tenantName || '',
                },
            });

            if (!generated) {
                message.error(t('businessCopyFailed'));
                return;
            }

            const applyResult = await onApplyGeneratedCopy(generated, projectContext?.projectId);
            form.setFieldsValue({
                __localizedPublicPresenceDrafts: {
                    ...(form.getFieldValue('__localizedPublicPresenceDrafts') || {}),
                    [contentLanguage]: {
                        ...((form.getFieldValue('__localizedPublicPresenceDrafts') || {})[contentLanguage] || {}),
                        descriptor: generated.descriptor,
                        knownFor: generated.knownFor,
                        specialNote: generated.specialNote,
                    },
                },
                __localizedSeoDrafts: {
                    ...(form.getFieldValue('__localizedSeoDrafts') || {}),
                    [contentLanguage]: {
                        ...((form.getFieldValue('__localizedSeoDrafts') || {})[contentLanguage] || {}),
                        keywords: generated.keywords,
                        metaDescription: generated.metaDescription,
                        metaTitle: generated.metaTitle,
                        tagline: generated.tagline,
                    },
                },
                keywords: generated.keywords,
                metaDescription: generated.metaDescription,
                metaTitle: generated.metaTitle,
                publicPresence: {
                    ...form.getFieldValue('publicPresence'),
                    descriptor: generated.descriptor,
                    knownFor: generated.knownFor,
                    specialNote: generated.specialNote,
                },
                tagline: generated.tagline,
            });
            message.success(t(applyResult.translationIncomplete ? 'businessCopyPartialSuccess' : 'businessCopySuccess'));
        } catch (error) {
            logBusinessSettingsFailure('business_settings_business_copy_generation_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
                ...getBoundedBusinessSettingsStringContext('businessName', businessName),
                coverageMissingFieldCount: coverage.missingFieldCount,
                hasBusinessCategory: Boolean(businessCategory),
                hasBusinessType: Boolean(businessType),
            });
            message.error(error instanceof AICapacityError
                ? BUSINESS_COPY_CAPACITY_MESSAGE
                : t('businessCopyFailed'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateMissingTranslations = async () => {
        try {
            setIsGeneratingTranslations(true);
            const projectContext = await getDefaultProjectAiContext(storeDetails);
            const generated = await onGenerateMissingTranslations?.(projectContext?.projectId);
            if (!generated) {
                message.info(t('businessCopyCoverageGenerateNoMissing'));
                return;
            }
            message.success(t('businessCopyCoverageGenerateSuccess'));
        } catch (error) {
            logBusinessSettingsFailure('business_settings_business_copy_translation_repair_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
                ...getBoundedBusinessSettingsStringContext('referenceLanguage', coverage.referenceLanguage),
                coverageMissingFieldCount: coverage.missingFieldCount,
                repairableGapCount: coverage.repairableGapCount,
            });
            message.error(error instanceof AICapacityError
                ? BUSINESS_COPY_CAPACITY_MESSAGE
                : t('businessCopyCoverageGenerateFailed'));
        } finally {
            setIsGeneratingTranslations(false);
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

            <Card
                size="small"
                style={{
                    background: hasCoverageGaps ? token.colorFillAlter : token.colorSuccessBg,
                    marginBottom: 16,
                }}
                title={(
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            <LuLanguages size={16} />
                            <Text strong>{t('businessCopyCoverageTitle')}</Text>
                        </Flex>
                        <Tag color={hasCoverageGaps ? 'warning' : 'success'}>
                            {hasCoverageGaps
                                ? t('businessCopyCoverageGapCount', { count: coverage.missingFieldCount })
                                : t('businessCopyCoverageAllClear')}
                        </Tag>
                    </Flex>
                )}
            >
                <Flex vertical gap={10}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('businessCopyCoverageSummary', {
                            languages: coverage.managedLanguages.map(getStoreLanguageLabel).join(', '),
                        })}
                    </Text>
                    <List
                        dataSource={coverage.fields}
                        renderItem={(field) => (
                            <List.Item>
                                <Flex align="center" justify="space-between" style={{ width: '100%' }} gap={12}>
                                    <Flex align="center" gap={8}>
                                        {field.status === 'ok'
                                            ? <LuCheckCircle color={token.colorSuccess} size={16} />
                                            : <LuAlertCircle color={field.status === 'warning' ? token.colorWarning : token.colorTextTertiary} size={16} />}
                                        <div>
                                            <Text>{t(`businessCopyCoverageFields.${field.key}`)}</Text>
                                            <br />
                                            <Text type="secondary" style={{ fontSize: 11 }}>
                                                {field.status === 'ok'
                                                    ? (field.scope === 'shared'
                                                        ? t('businessCopyCoverageStatusSharedReadyDesc')
                                                        : t('businessCopyCoverageStatusReadyDesc'))
                                                    : field.status === 'empty'
                                                        ? (field.scope === 'shared'
                                                            ? t('businessCopyCoverageStatusSharedEmptyDesc')
                                                            : t('businessCopyCoverageStatusEmptyDesc'))
                                                        : t('businessCopyCoverageMissing', {
                                                            languages: field.missingLanguages.map(getStoreLanguageLabel).join(', '),
                                                        })}
                                            </Text>
                                        </div>
                                    </Flex>
                                    {field.status === 'ok'
                                        ? <Tag color="success">{t('businessCopyCoverageStatusReady')}</Tag>
                                        : field.status === 'warning'
                                            ? <Tag color="warning">{t('businessCopyCoverageStatusWarning')}</Tag>
                                            : <Tag>{t('businessCopyCoverageStatusEmpty')}</Tag>}
                                </Flex>
                            </List.Item>
                        )}
                    />
                    {coverage.repairableGapCount > 0 ? (
                        <Button
                            block
                            loading={isGeneratingTranslations}
                            onClick={() => void handleGenerateMissingTranslations()}
                        >
                            {t('businessCopyCoverageGenerateMissing')}
                        </Button>
                    ) : null}
                </Flex>
            </Card>

            {businessCopyMeta?.lastGeneratedAt || businessCopyMeta?.lastRepairedAt || businessCopyMeta?.lastManualOverrideAt ? (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Flex vertical gap={6}>
                        <Text strong>{t('businessCopyAuditTitle')}</Text>
                        {businessCopyMeta?.lastGeneratedAt ? (
                            <Text type="secondary">{t('businessCopyAuditGenerated', { when: formatAuditTime(businessCopyMeta.lastGeneratedAt) })}</Text>
                        ) : null}
                        {businessCopyMeta?.lastRepairedAt ? (
                            <Text type="secondary">{t('businessCopyAuditRepaired', { when: formatAuditTime(businessCopyMeta.lastRepairedAt) })}</Text>
                        ) : null}
                        {businessCopyMeta?.lastManualOverrideAt ? (
                            <Text type="secondary">{t('businessCopyAuditManual', { when: formatAuditTime(businessCopyMeta.lastManualOverrideAt) })}</Text>
                        ) : null}
                    </Flex>
                </Card>
            ) : null}

            {showFullGenerationCta ? (
                <>
                    <Button
                        block
                        icon={<LuSparkles />}
                        loading={isGenerating}
                        onClick={() => void handleGenerate()}
                        type="primary"
                    >
                        {fullGenerationLabel}
                    </Button>

                    <Text style={{ display: 'block', fontSize: 12, marginTop: 12 }} type="secondary">
                        {t('businessCopyApplyNote')}
                    </Text>
                </>
            ) : null}
        </Card>
    );
}
