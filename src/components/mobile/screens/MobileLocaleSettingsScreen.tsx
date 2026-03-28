'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, NavBar, Picker, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuClock, LuDollarSign, LuGlobe } from 'react-icons/lu';

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

const CURRENCIES = [
    { label: '₹ INR (Indian Rupee)', value: 'INR', symbol: '₹' },
    { label: '$ USD (US Dollar)', value: 'USD', symbol: '$' },
    { label: '€ EUR (Euro)', value: 'EUR', symbol: '€' },
    { label: '£ GBP (Pound)', value: 'GBP', symbol: '£' },
    { label: 'د.إ AED (Dirham)', value: 'AED', symbol: 'د.إ' },
    { label: '$ SGD (Singapore Dollar)', value: 'SGD', symbol: 'S$' },
    { label: '$ AUD (Australian Dollar)', value: 'AUD', symbol: 'A$' },
];

export default function MobileLocaleSettingsScreen({ onBack }: MobileLocaleSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const { storeDetails, setStoreDetails, tenantDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);

    const [showLangPicker, setShowLangPicker] = useState(false);
    const [showTzPicker, setShowTzPicker] = useState(false);

    const [formData, setFormData] = useState({
        language: storeDetails?.language || 'en-US',
        timeZone: storeDetails?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        currencyCode: tenantDetails?.currencyCode || 'INR',
        currencySymbol: tenantDetails?.currencySymbol || '₹',
    });

    const getLabel = (list: { label: string; value: string }[], value: string) =>
        list.find(item => item.value === value)?.label || value;

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        // Optimistic update
        setStoreDetails((prev: any) => ({
            ...prev,
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
            setStoreDetails((prev: any) => ({
                ...prev,
                language: storeDetails.language,
                timeZone: storeDetails.timeZone,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [storeDetails, formData, setStoreDetails]);

    if (!storeDetails) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('languageRegion')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
                {/* Language */}
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <LuGlobe size={12} />
                            {t('language')}
                        </label>
                        <div
                            className="py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-[15px] text-gray-900 dark:text-gray-100 min-h-[44px] flex items-center"
                            onClick={() => setShowLangPicker(true)}
                        >
                            {getLabel(LANGUAGES, formData.language)}
                        </div>
                        <Picker
                            columns={[LANGUAGES]}
                            visible={showLangPicker}
                            onClose={() => setShowLangPicker(false)}
                            onConfirm={(val) => {
                                if (val[0]) setFormData(prev => ({ ...prev, language: val[0] as string }));
                            }}
                            value={[formData.language]}
                        />
                    </div>
                </Card>

                {/* Timezone */}
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <LuClock size={12} />
                            {t('timezone')}
                        </label>
                        <div
                            className="py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-[15px] text-gray-900 dark:text-gray-100 min-h-[44px] flex items-center"
                            onClick={() => setShowTzPicker(true)}
                        >
                            {getLabel(TIMEZONES, formData.timeZone)}
                        </div>
                        <Picker
                            columns={[TIMEZONES]}
                            visible={showTzPicker}
                            onClose={() => setShowTzPicker(false)}
                            onConfirm={(val) => {
                                if (val[0]) setFormData(prev => ({ ...prev, timeZone: val[0] as string }));
                            }}
                            value={[formData.timeZone]}
                        />
                    </div>
                </Card>

                {/* Currency (read-only on mobile — tenant-level setting) */}
                <Card className="rounded-xl">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <LuDollarSign size={12} />
                            {t('currency')}
                        </label>
                        <div className="py-2.5 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-[15px] text-gray-900 dark:text-gray-100 min-h-[44px] flex items-center">
                            {formData.currencySymbol} {formData.currencyCode}
                        </div>
                        <p className="text-xs text-gray-400">{t('currencyDesktopNote')}</p>
                    </div>
                </Card>

                {/* Save */}
                <Button
                    block
                    color="primary"
                    fill="solid"
                    size="large"
                    loading={isSaving}
                    onClick={handleSave}
                    style={{ minHeight: '44px' }}
                >
                    {t('saveChanges')}
                </Button>
            </div>
        </div>
    );
}
