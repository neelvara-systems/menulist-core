'use client'

import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import TIMEZONES_LIST from '@data/timeZones';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import {
    DATE_FORMATS,
    TIME_FORMATS,
    defaultDateFormatString,
    defaultTimeFormatString,
} from '@lib/localization/config';
import { getUTCDate } from '@util/dateTime';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuClock, LuDollarSign, LuGlobe, LuLanguages } from 'react-icons/lu';
import { Button, Card, Checkbox, DotLoading, Flex, NavBar, Picker, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileLocaleSettingsScreenProps {
    onBack: () => void;
}

export default function MobileLocaleSettingsScreen({ onBack }: MobileLocaleSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = useMemo(() => getUTCDate().newDate, []);
    const { storeDetails, setStoreDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [showTzPicker, setShowTzPicker] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showDefaultLanguagePicker, setShowDefaultLanguagePicker] = useState(false);
    const [formData, setFormData] = useState({
        activeLanguages: storeDetails?.activeLanguages || [],
        currencyCode: tenantDetails?.currencyCode || 'INR',
        currencySymbol: tenantDetails?.currencySymbol || '₹',
        defaultLanguage: storeDetails?.defaultLanguage || 'en',
        timeFormat: storeDetails?.timeFormat || defaultTimeFormatString,
        timeZone: storeDetails?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: storeDetails?.dateFormat || defaultDateFormatString,
    });

    const languageOptions = useMemo(() => GlobalLanguagesList.map((lang) => ({
        label: lang.nativeName !== lang.name ? `${lang.nativeName} (${lang.name})` : lang.name,
        value: lang.code,
    })), []);

    const availableDefaultLanguages = useMemo(() => {
        const active = formData.activeLanguages.length > 0 ? formData.activeLanguages : ['en'];
        return languageOptions.filter((option) => active.includes(option.value));
    }, [formData.activeLanguages, languageOptions]);

    const getLabel = (list: { label: string; value: string }[], value: string) => list.find((item) => item.value === value)?.label || value;

    const toggleLanguage = (languageCode: string, checked: boolean) => {
        setFormData((previous) => {
            const nextLanguages = checked
                ? Array.from(new Set([...previous.activeLanguages, languageCode])).slice(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT)
                : previous.activeLanguages.filter((code) => code !== languageCode);

            const nextDefaultLanguage = nextLanguages.includes(previous.defaultLanguage)
                ? previous.defaultLanguage
                : (nextLanguages[0] || 'en');

            return {
                ...previous,
                activeLanguages: nextLanguages,
                defaultLanguage: nextDefaultLanguage,
            };
        });
    };

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        const payload = {
            ...storeDetails,
            activeLanguages: formData.activeLanguages.length > 0 ? formData.activeLanguages : ['en'],
            defaultLanguage: formData.defaultLanguage || 'en',
            timeFormat: formData.timeFormat,
            timeZone: formData.timeZone,
            dateFormat: formData.dateFormat,
        };

        setStoreDetails((previous: any) => ({ ...previous, ...payload }));
        Toast.show({ content: t('saved'), duration: 1000 });

        try {
            await updateStore(payload as any);
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                activeLanguages: storeDetails.activeLanguages,
                defaultLanguage: storeDetails.defaultLanguage,
                timeFormat: storeDetails.timeFormat,
                timeZone: storeDetails.timeZone,
                dateFormat: storeDetails.dateFormat,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [formData, setStoreDetails, storeDetails, t]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{tBusiness('localeSettings')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle="Set language, time zone, date, and time defaults for your business."
                    title={tBusiness('localeSettings')}
                />
                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuClock size={14} />
                            <Text type="secondary">{tBusiness('timeZone')}</Text>
                        </Flex>
                        <Button block fill="outline" onClick={() => setShowTzPicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(TIMEZONES_LIST.map((item) => ({ label: item.label, value: item.tzCode })), formData.timeZone)}
                        </Button>
                        <Picker
                            columns={[TIMEZONES_LIST.map((item) => ({ label: item.label, value: item.tzCode }))]}
                            onClose={() => setShowTzPicker(false)}
                            onConfirm={(value) => value[0] && setFormData((previous) => ({ ...previous, timeZone: value[0] as string }))}
                            searchPlaceholder={tBusiness('selectTimeZone')}
                            title={tBusiness('timeZone')}
                            value={[formData.timeZone]}
                            visible={showTzPicker}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('dateFormat')}</Text>
                        <Button block fill="outline" onClick={() => setShowDatePicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(DATE_FORMATS.map((item) => ({ label: format.dateTime(now, item.value), value: item.label })), formData.dateFormat)}
                        </Button>
                        <Picker
                            columns={[DATE_FORMATS.map((item) => ({ label: format.dateTime(now, item.value), value: item.label }))]}
                            onClose={() => setShowDatePicker(false)}
                            onConfirm={(value) => value[0] && setFormData((previous) => ({ ...previous, dateFormat: value[0] as string }))}
                            searchPlaceholder={tBusiness('selectDateFormat')}
                            title={tBusiness('dateFormat')}
                            value={[formData.dateFormat]}
                            visible={showDatePicker}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('timeFormat')}</Text>
                        <Button block fill="outline" onClick={() => setShowTimePicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(TIME_FORMATS.map((item) => ({ label: `${format.dateTime(now, item.value)} (${item.labelHelper})`, value: item.label })), formData.timeFormat)}
                        </Button>
                        <Picker
                            columns={[TIME_FORMATS.map((item) => ({ label: `${format.dateTime(now, item.value)} (${item.labelHelper})`, value: item.label }))]}
                            onClose={() => setShowTimePicker(false)}
                            onConfirm={(value) => value[0] && setFormData((previous) => ({ ...previous, timeFormat: value[0] as string }))}
                            searchPlaceholder={tBusiness('selectTimeFormat')}
                            title={tBusiness('timeFormat')}
                            value={[formData.timeFormat]}
                            visible={showTimePicker}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuLanguages size={14} />
                            <Text type="secondary">{tBusiness('availableLanguages')}</Text>
                        </Flex>
                        <Text type="secondary">{tBusiness('languageSettingsDesc')}</Text>
                        <Flex gap={8} vertical>
                            {languageOptions.map((language) => (
                                <Checkbox
                                    checked={formData.activeLanguages.includes(language.value)}
                                    key={language.value}
                                    onChange={(checked) => toggleLanguage(language.value, checked)}
                                    disabled={!formData.activeLanguages.includes(language.value) && formData.activeLanguages.length >= LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT}
                                >
                                    {language.label}
                                </Checkbox>
                            ))}
                        </Flex>
                        <Text type="secondary">{tBusiness('availableLanguagesTooltip', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuGlobe size={14} />
                            <Text type="secondary">{tBusiness('defaultLanguage')}</Text>
                        </Flex>
                        <Button block fill="outline" onClick={() => setShowDefaultLanguagePicker(true)} style={{ justifyContent: 'flex-start', minHeight: 44 }}>
                            {getLabel(availableDefaultLanguages, formData.defaultLanguage)}
                        </Button>
                        <Picker
                            columns={[availableDefaultLanguages]}
                            onClose={() => setShowDefaultLanguagePicker(false)}
                            onConfirm={(value) => value[0] && setFormData((previous) => ({ ...previous, defaultLanguage: value[0] as string }))}
                            searchPlaceholder={tBusiness('selectDefaultLanguage')}
                            title={tBusiness('defaultLanguage')}
                            value={[formData.defaultLanguage]}
                            visible={showDefaultLanguagePicker}
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
