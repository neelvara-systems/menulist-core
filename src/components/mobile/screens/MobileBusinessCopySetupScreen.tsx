'use client'

import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import { updateStore } from '@database/stores';
import { getStoreSourceLanguage } from '@lib/localization/storeContent';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getPublicBusinessDescription } from '@lib/obp/getPublicBusinessDescription';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import generateBusinessCopyViaAPI from '@services/ai/businessCopy/generateBusinessCopyViaAPI';
import localizeBusinessCopyResult, { mergeLocalizedField, mergeLocalizedKeywordField } from '@services/ai/businessCopy/localizeBusinessCopyResult';
import { buildBusinessCopyGeneratedMeta, buildBusinessCopyRepairMeta } from '@services/ai/businessCopy/metadata';
import syncMissingBusinessCopyTranslations from '@services/ai/businessCopy/syncMissingBusinessCopyTranslations';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { getActiveBusinessAttributeLabels } from '@services/ai/businessCopy/utils';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { formatDateTime } from '@util/dateTime';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useContext, useMemo, useState } from 'react';
import { LuAlertCircle, LuCheckCircle, LuLanguages, LuSparkles } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, List, Tag, Text, Toast } from '../antd';
import AiActionProgressPanel from '../components/AiActionProgressPanel';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { getStoreLanguageLabel, getStoreManagedLanguages } from '../utils/localizedStoreContent';

interface MobileBusinessCopySetupScreenProps {
    onBack: () => void;
}

export default function MobileBusinessCopySetupScreen({ onBack }: MobileBusinessCopySetupScreenProps) {
    const t = useTranslations('BusinessSettings');
    const tMenu = useTranslations('MobileMenu');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isGeneratingTranslations, setIsGeneratingTranslations] = useState(false);
    const contentLanguage = getStoreSourceLanguage();
    const sourceLanguage = GlobalLanguagesList.find((language) => language.code === contentLanguage);
    const managedLanguages = getStoreManagedLanguages(storeDetails);
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
    const repairTargetLanguagesLabel = coverage.fields
        .flatMap((field) => field.missingLanguages)
        .filter((languageCode, index, list) => list.indexOf(languageCode) === index)
        .map(getStoreLanguageLabel)
        .join(', ');
    const infoContent = useMemo(() => (
        <Flex gap={8} style={{ maxWidth: 280 }} vertical>
            <Flex gap={2} vertical>
                <Text strong>{t('businessCopySetup')}</Text>
                <Text type="secondary">{t('businessCopySetupDesc')}</Text>
            </Flex>
            <Text type="secondary">{t('businessCopySourceHint')}</Text>
            <Text type="secondary">
                {t('businessCopyCoverageManagedLanguagesHint', {
                    languages: managedLanguages.map(getStoreLanguageLabel).join(', '),
                })}
            </Text>
            <Text>1. {t('businessCopyUpdatesOfficialPage')}</Text>
            <Text>2. {t('businessCopyUpdatesSeo')}</Text>
            <Text>3. {t('businessCopyUpdatesCustomerApp')}</Text>
            <Text type="secondary">{t('businessCopyApplyNote')}</Text>
        </Flex>
    ), [managedLanguages, t]);
    const currentPwaShortName = getLocalizedText(
        (storeDetails as any)?.pwaSettings?.pwaShortName,
        contentLanguage,
        getPrimaryLocalizedLanguage((storeDetails as any)?.pwaSettings?.pwaShortName, contentLanguage),
        '',
    );

    const handleGenerate = async () => {
        if (!storeDetails?.name?.trim() || !storeDetails?.storeId) {
            Toast.show({ content: t('businessCopyMissingName'), duration: 1500 });
            return;
        }

        try {
            setIsGenerating(true);

            const projectContext = await getDefaultProjectAiContext(storeDetails);

            const socialValues = [
                ...Object.values(storeDetails?.socialMedia || {}),
                ...Object.values(storeDetails?.publicPresence || {}).filter((value) => typeof value === 'string'),
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
                    addressLine: storeDetails?.addressLine || '',
                    businessAttributes: getActiveBusinessAttributeLabels(storeDetails?.businessAttributes),
                    businessCategory: storeDetails?.businessCategory || '',
                    businessType: storeDetails?.businessType || '',
                    city: storeDetails?.city || '',
                    country: storeDetails?.country || '',
                    description: getPublicBusinessDescription(storeDetails),
                    name: storeDetails.name,
                    publicPresence: {
                        accentColor: storeDetails?.publicPresence?.accentColor || '',
                        descriptor: getLocalizedText(storeDetails?.publicPresence?.descriptor, contentLanguage, getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.descriptor, contentLanguage), ''),
                        establishedYear: typeof storeDetails?.publicPresence?.establishedYear === 'number' ? storeDetails.publicPresence.establishedYear : undefined,
                        googleMapsUrl: storeDetails?.publicPresence?.googleMapsUrl || '',
                        googleReviewUrl: storeDetails?.publicPresence?.googleReviewUrl || '',
                        knownFor: getLocalizedText(storeDetails?.publicPresence?.knownFor, contentLanguage, getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.knownFor, contentLanguage), ''),
                        orderUrl: storeDetails?.publicPresence?.orderUrl || '',
                        reservationUrl: storeDetails?.publicPresence?.reservationUrl || '',
                        specialNote: getLocalizedText(storeDetails?.publicPresence?.specialNote, contentLanguage, getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.specialNote, contentLanguage), ''),
                        whatsappNumber: storeDetails?.publicPresence?.whatsappNumber || '',
                    },
                    pwaShortName: currentPwaShortName,
                    socialMedia: socialValues,
                    state: storeDetails?.state || '',
                    tagline: getLocalizedText(
                        storeDetails?.tagline,
                        contentLanguage,
                        getPrimaryLocalizedLanguage(storeDetails?.tagline, contentLanguage),
                        '',
                    ),
                    tenantName: storeDetails?.tenantName || '',
                },
            });

            if (!generated) {
                Toast.show({ content: t('businessCopyFailed'), duration: 1500 });
                return;
            }

            const localized = await localizeBusinessCopyResult({
                generated,
                projectId: projectContext?.projectId,
                storeDetails,
            });

            const nextPublicPresence = {
                ...(storeDetails?.publicPresence || {}),
                descriptor: mergeLocalizedField(
                    storeDetails?.publicPresence?.descriptor,
                    localized.descriptor,
                ),
                knownFor: mergeLocalizedField(
                    storeDetails?.publicPresence?.knownFor,
                    localized.knownFor,
                ),
                specialNote: mergeLocalizedField(
                    storeDetails?.publicPresence?.specialNote,
                    localized.specialNote,
                ),
            };

            const nextStoreUpdate: any = {
                businessCopyMeta: buildBusinessCopyGeneratedMeta({
                    existingMeta: storeDetails?.businessCopyMeta,
                    includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                    projectId: projectContext?.projectId,
                    sourceLanguage: contentLanguage,
                    storeDetails,
                }),
                keywords: mergeLocalizedKeywordField(storeDetails?.keywords, localized.keywords),
                metaDescription: mergeLocalizedField(storeDetails?.metaDescription, localized.metaDescription),
                metaTitle: mergeLocalizedField(storeDetails?.metaTitle, localized.metaTitle),
                ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                    ? {
                        pwaSettings: {
                            ...(storeDetails?.pwaSettings || {}),
                            pwaShortName: mergeLocalizedField(
                                storeDetails?.pwaSettings?.pwaShortName,
                                localized.pwaShortName,
                            ),
                        },
                    }
                    : {}),
                publicPresence: nextPublicPresence,
                storeId: storeDetails.storeId,
                tagline: mergeLocalizedField(storeDetails?.tagline, localized.tagline),
            };
            await updateStore(nextStoreUpdate);

            setStoreDetails((previous: any) => ({
                ...previous,
                keywords: nextStoreUpdate.keywords,
                businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                metaDescription: nextStoreUpdate.metaDescription,
                metaTitle: nextStoreUpdate.metaTitle,
                publicPresence: nextPublicPresence,
                pwaSettings: {
                    ...(previous?.pwaSettings || {}),
                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && generated.pwaShortName.trim()
                        ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                        : {}),
                },
                tagline: nextStoreUpdate.tagline,
            }));

            Toast.show({ content: t('businessCopySuccess'), duration: 1500 });
        } catch (error: any) {
            Toast.show({ content: error?.message || t('businessCopyFailed'), duration: 2000 });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateMissingTranslations = async () => {
        if (!storeDetails?.storeId) return;

        try {
            setIsGeneratingTranslations(true);
            const projectContext = await getDefaultProjectAiContext(storeDetails);
            const localized = await syncMissingBusinessCopyTranslations({
                includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA,
                projectId: projectContext?.projectId,
                storeDetails,
            });

            if (!localized) {
                Toast.show({ content: t('businessCopyCoverageGenerateNoMissing'), duration: 1500 });
                return;
            }

            const nextPublicPresence = {
                ...(storeDetails?.publicPresence || {}),
                descriptor: mergeLocalizedField(
                    storeDetails?.publicPresence?.descriptor,
                    localized.descriptor,
                ),
                knownFor: mergeLocalizedField(
                    storeDetails?.publicPresence?.knownFor,
                    localized.knownFor,
                ),
                specialNote: mergeLocalizedField(
                    storeDetails?.publicPresence?.specialNote,
                    localized.specialNote,
                ),
            };

            const nextStoreUpdate: any = {
                businessCopyMeta: buildBusinessCopyRepairMeta({
                    coverageFields: coverage.fields,
                    existingMeta: storeDetails?.businessCopyMeta,
                    referenceLanguage: coverage.referenceLanguage,
                }),
                keywords: mergeLocalizedKeywordField(storeDetails?.keywords, localized.keywords),
                metaDescription: mergeLocalizedField(storeDetails?.metaDescription, localized.metaDescription),
                metaTitle: mergeLocalizedField(storeDetails?.metaTitle, localized.metaTitle),
                ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                    ? {
                        pwaSettings: {
                            ...(storeDetails?.pwaSettings || {}),
                            pwaShortName: mergeLocalizedField(
                                storeDetails?.pwaSettings?.pwaShortName,
                                localized.pwaShortName,
                            ),
                        },
                    }
                    : {}),
                publicPresence: nextPublicPresence,
                storeId: storeDetails.storeId,
                tagline: mergeLocalizedField(storeDetails?.tagline, localized.tagline),
            };
            await updateStore(nextStoreUpdate);

            setStoreDetails((previous: any) => ({
                ...previous,
                keywords: nextStoreUpdate.keywords,
                businessCopyMeta: nextStoreUpdate.businessCopyMeta,
                metaDescription: nextStoreUpdate.metaDescription,
                metaTitle: nextStoreUpdate.metaTitle,
                publicPresence: nextPublicPresence,
                pwaSettings: {
                    ...(previous?.pwaSettings || {}),
                    ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA
                        ? { pwaShortName: nextStoreUpdate.pwaSettings.pwaShortName }
                        : {}),
                },
                tagline: nextStoreUpdate.tagline,
            }));

            Toast.show({ content: t('businessCopyCoverageGenerateSuccess'), duration: 1500 });
        } catch (error: any) {
            Toast.show({ content: error?.message || t('businessCopyCoverageGenerateFailed'), duration: 2000 });
        } finally {
            setIsGeneratingTranslations(false);
        }
    };

    if (!FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION) {
        return null;
    }

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('businessCopySetupDesc')}
                infoContent={infoContent}
                onBack={onBack}
                title={t('businessCopySetup')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card
                    style={{
                        backgroundColor: hasCoverageGaps ? token.colorFillAlter : token.colorSuccessBg,
                    }}
                >
                    <Flex gap={12} vertical>
                        {isGeneratingTranslations ? (
                            <AiActionProgressPanel
                                detail={repairTargetLanguagesLabel || undefined}
                                helperText={tMenu('keepScreenOpen')}
                                labels={[
                                    tMenu('checkingLanguagesStep'),
                                    tMenu('preparingTranslationStep'),
                                    tMenu('applyingTranslationsStep'),
                                ]}
                                title={t('businessCopyCoverageGenerateMissing')}
                            />
                        ) : null}
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
                        <Text type="secondary">
                            {t('businessCopyCoverageSummary', {
                                languages: managedLanguages.map(getStoreLanguageLabel).join(', '),
                            })}
                        </Text>
                        <List>
                            {coverage.fields.map((field) => (
                                <List.Item
                                    key={field.key}
                                    prefix={field.status === 'ok'
                                        ? <LuCheckCircle color={token.colorSuccess} size={16} />
                                        : <LuAlertCircle color={field.status === 'warning' ? token.colorWarning : token.colorTextTertiary} size={16} />}
                                    title={t(`businessCopyCoverageFields.${field.key}`)}
                                    description={field.status === 'ok'
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
                                />
                            ))}
                        </List>
                        {coverage.repairableGapCount > 0 ? (
                            <Button
                                block
                                loading={isGeneratingTranslations}
                                onClick={() => void handleGenerateMissingTranslations()}
                                size="large"
                            >
                                {t('businessCopyCoverageGenerateMissing')}
                            </Button>
                        ) : null}
                    </Flex>
                </Card>

                {businessCopyMeta?.lastGeneratedAt || businessCopyMeta?.lastRepairedAt || businessCopyMeta?.lastManualOverrideAt ? (
                    <Card>
                        <Flex gap={6} vertical>
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
                    <Button
                        block
                        color="primary"
                        loading={isGenerating}
                        onClick={() => void handleGenerate()}
                        size="large"
                    >
                        <Flex align="center" gap={8} justify="center">
                            <LuSparkles size={18} />
                            <span>{fullGenerationLabel}</span>
                        </Flex>
                    </Button>
                ) : null}
            </Flex>
        </Flex>
    );
}
