'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuClock, LuDollarSign, LuGlobe } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Picker, Text, Toast } from '../antd';

interface MobileLocaleSettingsScreenProps {
    onBack: () => void;
}

const LANGUAGES = [
    { label: 'English (US)', value: 'en-US' },
    { label: 'English (UK)', value: 'en-GB' },
    { label: 'Hindi', value: 'hi-IN' },
    { label: 'French', value: 'fr-FR' },
    { label: 'Arabic', value: 'ar-SA' },
    { label: 'Spanish', value: 'es-ES' },
    { label: 'Portuguese', value: 'pt-BR' },
    { label: 'German', value: 'de-DE' },
    { label: 'Gujarati', value: 'gu-IN' },
];

const TIMEZONES = [
    { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
    { label: 'America/New_York (EST)', value: 'America/New_York' },
    { label: 'America/Chicago (CST)', value: 'America/Chicago' },
    { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
    { label: 'Europe/London (GMT)', value: 'Europe/London' },
    { label: 'Europe/Paris (CET)', value: 'Europe/Paris' },
    { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
    { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
    { label: 'Australia/Sydney (AEST)', value: 'Australia/Sydney' },
];

export default function MobileLocaleSettingsScreen({ onBack }: MobileLocaleSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showTzPicker, setShowTzPicker] = useState(false);
    const [formData, setFormData] = useState({
        currencyCode: tenantDetails?.currencyCode || 'INR',
        currencySymbol: tenantDetails?.currencySymbol || '₹',
        language: storeDetails?.language || 'en-US',
        timeZone: storeDetails?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    const getLabel = (list: { label: string; value: string }[], value: string) => list.find((item) => item.value === value)?.label || value;

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        setStoreDetails((previous: any) => ({
            ...previous,
            language: formData.language,
            timeZone: formData.timeZone,
        }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore({
                ...storeDetails,
                language: formData.language,
                timeZone: formData.timeZone,
            } as any);
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                language: storeDetails.language,
                timeZone: storeDetails.timeZone,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [formData.language, formData.timeZone, setStoreDetails, storeDetails, t]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{t('languageRegion')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuGlobe size={14} />
                            <Text type="secondary">{t('language')}</Text>
                        </Flex>
                        <Button block fill="outline" onClick={() => setShowLangPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(LANGUAGES, formData.language)}
                        </Button>
                        <Picker
                            columns={[LANGUAGES]}
                            onClose={() => setShowLangPicker(false)}
                            onConfirm={(value) => {
                                if (value[0]) {
                                    setFormData((previous) => ({ ...previous, language: value[0] as string }));
                                }
                            }}
                            value={[formData.language]}
                            visible={showLangPicker}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuClock size={14} />
                            <Text type="secondary">{t('timezone')}</Text>
                        </Flex>
                        <Button block fill="outline" onClick={() => setShowTzPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(TIMEZONES, formData.timeZone)}
                        </Button>
                        <Picker
                            columns={[TIMEZONES]}
                            onClose={() => setShowTzPicker(false)}
                            onConfirm={(value) => {
                                if (value[0]) {
                                    setFormData((previous) => ({ ...previous, timeZone: value[0] as string }));
                                }
                            }}
                            value={[formData.timeZone]}
                            visible={showTzPicker}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuDollarSign size={14} />
                            <Text type="secondary">{t('currency')}</Text>
                        </Flex>
                        <Text strong>{formData.currencySymbol} {formData.currencyCode}</Text>
                        <Text type="secondary">{t('currencyDesktopNote')}</Text>
                    </Flex>
                </Card>

                <Button block loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                    {t('saveChanges')}
                </Button>
            </Flex>
        </Flex>
    );
}
