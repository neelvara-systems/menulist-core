'use client'

import { FEATURE_FLAGS } from '@config/features';
import { updateStore } from '@database/stores';
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import generateBusinessCopyViaAPI from '@services/ai/businessCopy/generateBusinessCopyViaAPI';
import localizeBusinessCopyResult, { mergeLocalizedField } from '@services/ai/businessCopy/localizeBusinessCopyResult';
import { firstText, getActiveBusinessAttributeLabels } from '@services/ai/businessCopy/utils';
import getDefaultProjectAiContext from '@services/ai/shared/getDefaultProjectAiContext';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, List, NavBar, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileBusinessCopySetupScreenProps {
    onBack: () => void;
}

export default function MobileBusinessCopySetupScreen({ onBack }: MobileBusinessCopySetupScreenProps) {
    const t = useTranslations('BusinessSettings');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isGenerating, setIsGenerating] = useState(false);
    const contentLanguage = storeDetails?.defaultLanguage || storeDetails?.activeLanguages?.[0] || storeDetails?.language || 'en';
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
                    description: storeDetails?.description || '',
                    name: storeDetails.name,
                    publicPresence: {
                        accentColor: storeDetails?.publicPresence?.accentColor || '',
                        descriptor: getLocalizedText(storeDetails?.publicPresence?.descriptor, storeDetails?.defaultLanguage || 'en', getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.descriptor, 'en'), ''),
                        displayName: getLocalizedText(storeDetails?.publicPresence?.displayName, storeDetails?.defaultLanguage || 'en', getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.displayName, 'en'), ''),
                        establishedYear: typeof storeDetails?.publicPresence?.establishedYear === 'number' ? storeDetails.publicPresence.establishedYear : undefined,
                        googleMapsUrl: storeDetails?.publicPresence?.googleMapsUrl || '',
                        googleReviewUrl: storeDetails?.publicPresence?.googleReviewUrl || '',
                        knownFor: getLocalizedText(storeDetails?.publicPresence?.knownFor, storeDetails?.defaultLanguage || 'en', getPrimaryLocalizedLanguage(storeDetails?.publicPresence?.knownFor, 'en'), ''),
                        orderUrl: storeDetails?.publicPresence?.orderUrl || '',
                        reservationUrl: storeDetails?.publicPresence?.reservationUrl || '',
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
                displayName: mergeLocalizedField(
                    storeDetails?.publicPresence?.displayName,
                    localized.displayName,
                ),
                descriptor: mergeLocalizedField(
                    storeDetails?.publicPresence?.descriptor,
                    localized.descriptor,
                ),
                knownFor: mergeLocalizedField(
                    storeDetails?.publicPresence?.knownFor,
                    localized.knownFor,
                ),
            };

            const nextStoreUpdate: any = {
                keywords: generated.keywords,
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
                keywords: generated.keywords,
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
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('businessCopySetupDesc')}
                    title={t('businessCopySetup')}
                />

                <Card>
                    <Flex gap={12} vertical>
                        <Text>{t('businessCopySourceHint')}</Text>
                        <List>
                            <List.Item prefix="1.">{t('businessCopyUpdatesOfficialPage')}</List.Item>
                            <List.Item prefix="2.">{t('businessCopyUpdatesSeo')}</List.Item>
                            <List.Item prefix="3.">{t('businessCopyUpdatesCustomerApp')}</List.Item>
                        </List>
                        <Text type="secondary">{t('businessCopyApplyNote')}</Text>
                    </Flex>
                </Card>

                <Button
                    block
                    color="primary"
                    loading={isGenerating}
                    onClick={() => void handleGenerate()}
                    size="large"
                >
                    <Flex align="center" gap={8} justify="center">
                        <LuSparkles size={18} />
                        <span>{t('generateBusinessCopy')}</span>
                    </Flex>
                </Button>
            </Flex>
        </Flex>
    );
}
