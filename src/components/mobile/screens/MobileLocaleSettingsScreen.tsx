'use client'

import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import TIMEZONES_LIST from '@data/timeZones';
import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import countryData from '@atoms/phoneNumberInput/countryData';
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
import { Button, Card, DotLoading, Flex, NavBar, Select, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileLocaleSettingsScreenProps {
    onBack: () => void;
}

function getInitialLocaleForm(storeDetails: any) {
    return {
        activeLanguages: storeDetails?.activeLanguages || [],
        currencyCode: storeDetails?.currencyCode || 'INR',
        currencySymbol: storeDetails?.currencySymbol || '₹',
        dateFormat: storeDetails?.dateFormat || defaultDateFormatString,
        defaultLanguage: storeDetails?.defaultLanguage || 'en',
        timeFormat: storeDetails?.timeFormat || defaultTimeFormatString,
        timeZone: storeDetails?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

export default function MobileLocaleSettingsScreen({ onBack }: MobileLocaleSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = useMemo(() => getUTCDate().newDate, []);
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(getInitialLocaleForm(storeDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialLocaleForm(storeDetails));
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData);

    const languageOptions = useMemo(() => GlobalLanguagesList.map((lang) => ({
        label: lang.nativeName !== lang.name ? `${lang.nativeName} (${lang.name})` : lang.name,
        value: lang.code,
    })), []);

    const availableDefaultLanguages = useMemo(() => {
        const active = formData.activeLanguages.length > 0 ? formData.activeLanguages : ['en'];
        return languageOptions.filter((option) => active.includes(option.value));
    }, [formData.activeLanguages, languageOptions]);

    const currencyOptions = useMemo(() => {
        const uniqueCurrencies = new Map<string, { label: string; value: string }>();
        countryData.forEach((item) => {
            if (!uniqueCurrencies.has(item.currencyCode)) {
                uniqueCurrencies.set(item.currencyCode, {
                    label: `${item.currencyCode} (${item.currencySymbol})`,
                    value: item.currencyCode,
                });
            }
        });

        return Array.from(uniqueCurrencies.values()).sort((left, right) => left.label.localeCompare(right.label));
    }, []);

    const handleCurrencyChange = (value: string) => {
        const matchedCurrency = countryData.find((item) => item.currencyCode === value);
        setFormData((previous) => ({
            ...previous,
            currencyCode: value,
            currencySymbol: matchedCurrency?.currencySymbol || previous.currencySymbol,
        }));
    };

    const handleActiveLanguagesChange = (value: string | string[]) => {
        const selectedLanguages = Array.isArray(value) ? value : [value];
        const nextLanguages = selectedLanguages.slice(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT);

        setFormData((previous) => ({
            ...previous,
            activeLanguages: nextLanguages,
            defaultLanguage: nextLanguages.includes(previous.defaultLanguage)
                ? previous.defaultLanguage
                : (nextLanguages[0] || 'en'),
        }));
    };

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        const payload = {
            ...storeDetails,
            activeLanguages: formData.activeLanguages.length > 0 ? formData.activeLanguages : ['en'],
            currencyCode: formData.currencyCode,
            currencySymbol: formData.currencySymbol,
            defaultLanguage: formData.defaultLanguage || 'en',
            timeFormat: formData.timeFormat,
            timeZone: formData.timeZone,
            dateFormat: formData.dateFormat,
        };

        setStoreDetails((previous: any) => ({ ...previous, ...payload }));

        try {
            await updateStore(payload as any);
            setOriginalFormData(formData);
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch {
            setStoreDetails((previous: any) => ({
                ...previous,
                activeLanguages: storeDetails.activeLanguages,
                currencyCode: storeDetails.currencyCode,
                currencySymbol: storeDetails.currencySymbol,
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

    const handleReset = useCallback(() => {
        setFormData(originalFormData);
    }, [originalFormData]);

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
                    subtitle={t('localeSubtitle')}
                    title={tBusiness('localeSettings')}
                />
                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuClock size={14} />
                            <Text type="secondary">{tBusiness('timeZone')}</Text>
                        </Flex>
                        <Select
                            onChange={(value) => setFormData((previous) => ({ ...previous, timeZone: value }))}
                            options={TIMEZONES_LIST.map((item) => ({ label: item.label, value: item.tzCode }))}
                            placeholder={tBusiness('selectTimeZone')}
                            value={formData.timeZone}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('dateFormat')}</Text>
                        <Select
                            onChange={(value) => setFormData((previous) => ({ ...previous, dateFormat: value }))}
                            options={DATE_FORMATS.map((item) => ({ label: format.dateTime(now, item.value), value: item.label }))}
                            placeholder={tBusiness('selectDateFormat')}
                            value={formData.dateFormat}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('timeFormat')}</Text>
                        <Select
                            onChange={(value) => setFormData((previous) => ({ ...previous, timeFormat: value }))}
                            options={TIME_FORMATS.map((item) => ({ label: `${format.dateTime(now, item.value)} (${item.labelHelper})`, value: item.label }))}
                            placeholder={tBusiness('selectTimeFormat')}
                            value={formData.timeFormat}
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
                        <Text type="secondary">
                            These languages appear in your translation workflow and language dropdowns while editing menu content.
                        </Text>
                        <Select
                            maxCount={LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT}
                            mode="multiple"
                            onChange={handleActiveLanguagesChange}
                            options={languageOptions}
                            placeholder={tBusiness('selectAvailableLanguages')}
                            value={formData.activeLanguages}
                        />
                        <Text type="secondary">{tBusiness('availableLanguagesTooltip', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}</Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuGlobe size={14} />
                            <Text type="secondary">{tBusiness('defaultLanguage')}</Text>
                        </Flex>
                        <Select
                            onChange={(value) => setFormData((previous) => ({ ...previous, defaultLanguage: value }))}
                            options={availableDefaultLanguages}
                            placeholder={tBusiness('selectDefaultLanguage')}
                            value={formData.defaultLanguage}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuDollarSign size={14} />
                            <Text type="secondary">{t('currency')}</Text>
                        </Flex>
                        <Select
                            onChange={handleCurrencyChange}
                            options={currencyOptions}
                            placeholder={t('currency')}
                            value={formData.currencyCode}
                        />
                        <Text type="secondary">{`${formData.currencySymbol} ${formData.currencyCode}`}</Text>
                    </Flex>
                </Card>

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        background: 'var(--adm-color-background)',
                        borderTop: '1px solid var(--adm-color-border)',
                        bottom: 0,
                        marginInline: -16,
                        padding: '12px 16px',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                >
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large" style={{ minHeight: 44 }}>
                        {t('reset')}
                    </Button>
                    <Button block disabled={!isDirty} loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                        {t('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}
