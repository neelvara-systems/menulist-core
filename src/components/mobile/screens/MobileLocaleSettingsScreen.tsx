'use client'

import { LANGUAGE_CONSTANTS } from '@constant/languages';
import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import TIMEZONES_LIST from '@data/timeZones';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { StoreDataType } from '@type/platform/store';
import countryData from '@atoms/phoneNumberInput/countryData';
import { normalizeStoreLanguagePolicy } from '@lib/localization/languagePolicy';
import { resolveBusinessDayEndTime } from '@lib/analytics/businessDay';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { theme } from 'antd';
import {
    DATE_FORMATS,
    TIME_FORMATS,
    defaultDateFormatString,
    defaultTimeFormatString,
} from '@lib/localization/config';
import { getUTCDate } from '@util/dateTime';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuClock, LuDollarSign, LuGlobe, LuLanguages } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, NavBar, Select, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { MOBILE_BOTTOM_NAV_CLEARANCE } from '../MobileNavigation';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

const BUSINESS_DAY_END_OPTIONS = [
    { label: 'Calendar day (12:00 AM)', value: '00:00' },
    { label: 'Late service day (3:00 AM)', value: '03:00' },
    { label: 'Very late service (4:00 AM)', value: '04:00' },
    { label: 'Morning close (5:00 AM)', value: '05:00' },
];

interface MobileLocaleSettingsScreenProps {
    onBack: () => void;
    onOpenBusinessCopySetup?: () => void;
}

function getInitialLocaleForm(storeDetails: StoreDataType | null) {
    const normalizedLanguagePolicy = normalizeStoreLanguagePolicy(storeDetails);
    return {
        activeLanguages: normalizedLanguagePolicy.activeLanguages,
        currencyCode: storeDetails?.currencyCode || 'INR',
        currencySymbol: storeDetails?.currencySymbol || '₹',
        dateFormat: storeDetails?.dateFormat || defaultDateFormatString,
        defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
        timeFormat: storeDetails?.timeFormat || defaultTimeFormatString,
        timeZone: storeDetails?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        businessDayEndTime: resolveBusinessDayEndTime(storeDetails?.businessType, storeDetails?.businessDayEndTime, storeDetails?.businessCategory),
    };
}

function MobileLocaleSettingsScreenContent({ onBack, onOpenBusinessCopySetup }: MobileLocaleSettingsScreenProps) {
    const t = useTranslations('MobileSettings');
    const tBusiness = useTranslations('BusinessSettings');
    const format = useFormatter();
    const { token } = theme.useToken();
    const now = useMemo(() => getUTCDate().newDate, []);
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState(getInitialLocaleForm(storeDetails));
    const [originalFormData, setOriginalFormData] = useState(() => getInitialLocaleForm(storeDetails));
    const componentActiveRef = useRef(true);
    const localeSaveInFlightRef = useRef(false);
    const isDirty = JSON.stringify(formData) !== JSON.stringify(originalFormData);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    const languageOptions = useMemo(() => GlobalLanguagesList.map((lang) => ({
        label: lang.nativeName !== lang.name ? `${lang.nativeName} (${lang.name})` : lang.name,
        value: lang.code,
    })), []);

    const availableDefaultLanguages = useMemo(() => {
        const active = normalizeStoreLanguagePolicy({
            activeLanguages: formData.activeLanguages,
            defaultLanguage: formData.defaultLanguage,
        }).activeLanguages;
        return languageOptions.filter((option) => active.includes(option.value));
    }, [formData.activeLanguages, formData.defaultLanguage, languageOptions]);
    const prospectiveCoverage = useMemo(
        () => computeBusinessCopyCoverage({
            ...storeDetails,
            ...normalizeStoreLanguagePolicy({
                activeLanguages: formData.activeLanguages,
                defaultLanguage: formData.defaultLanguage,
            }),
        }, { includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA }),
        [formData.activeLanguages, formData.defaultLanguage, storeDetails],
    );

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
        const nextLanguages = normalizeStoreLanguagePolicy({
            activeLanguages: selectedLanguages.slice(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT),
            defaultLanguage: formData.defaultLanguage,
        }).activeLanguages;

        setFormData((previous) => ({
            ...previous,
            activeLanguages: nextLanguages,
            defaultLanguage: nextLanguages.includes(previous.defaultLanguage)
                ? previous.defaultLanguage
                : (nextLanguages[0] || 'en'),
        }));
    };

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId || !storeDetails?.tenantId || localeSaveInFlightRef.current) return;
        localeSaveInFlightRef.current = true;
        setIsSaving(true);
        const expectedStoreId = storeDetails.storeId;
        const expectedTenantId = storeDetails.tenantId;
        const previousLocale = getInitialLocaleForm(storeDetails);
        const normalizedLanguagePolicy = normalizeStoreLanguagePolicy({
            activeLanguages: formData.activeLanguages,
            defaultLanguage: formData.defaultLanguage,
        });

        const payload = {
            storeId: expectedStoreId,
            tenantId: expectedTenantId,
            activeLanguages: normalizedLanguagePolicy.activeLanguages,
            currencyCode: formData.currencyCode,
            currencySymbol: formData.currencySymbol,
            defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
            timeFormat: formData.timeFormat,
            timeZone: formData.timeZone,
            businessDayEndTime: formData.businessDayEndTime,
            dateFormat: formData.dateFormat,
        };

        setStoreDetails((previous: any) => (
            previous?.storeId === expectedStoreId && previous?.tenantId === expectedTenantId
                ? { ...previous, ...payload }
                : previous
        ));

        try {
            const writeResult = await updateStore(payload);
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_locale_settings_store_update_rejected',
            );
            if (!componentActiveRef.current) return;
            setFormData((previous) => ({
                ...previous,
                activeLanguages: normalizedLanguagePolicy.activeLanguages,
                defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
            }));
            setOriginalFormData((previous) => ({
                ...previous,
                ...formData,
                activeLanguages: normalizedLanguagePolicy.activeLanguages,
                defaultLanguage: normalizedLanguagePolicy.defaultLanguage,
            }));
            Toast.show({ content: t('saved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_locale_settings_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('defaultLanguage', normalizedLanguagePolicy.defaultLanguage),
                ...getBoundedMobileOwnerStringContext('timeZone', formData.timeZone),
                ...getBoundedMobileOwnerStringContext('currencyCode', formData.currencyCode),
                activeLanguageCount: normalizedLanguagePolicy.activeLanguages.length,
                previousActiveLanguageCount: Array.isArray(storeDetails.activeLanguages) ? storeDetails.activeLanguages.length : 0,
                defaultLanguageChanged: normalizedLanguagePolicy.defaultLanguage !== storeDetails.defaultLanguage,
                timeZoneChanged: formData.timeZone !== storeDetails.timeZone,
                currencyChanged: formData.currencyCode !== storeDetails.currencyCode || formData.currencySymbol !== storeDetails.currencySymbol,
                dateFormatChanged: formData.dateFormat !== storeDetails.dateFormat,
                timeFormatChanged: formData.timeFormat !== storeDetails.timeFormat,
                businessDayEndTimeChanged: formData.businessDayEndTime !== storeDetails.businessDayEndTime,
            });
            setStoreDetails((previous: any) => {
                const stillOwnsOptimisticState = (
                    previous?.storeId === expectedStoreId
                    && previous?.tenantId === expectedTenantId
                    && previous?.activeLanguages === payload.activeLanguages
                    && previous?.currencyCode === payload.currencyCode
                    && previous?.currencySymbol === payload.currencySymbol
                    && previous?.defaultLanguage === payload.defaultLanguage
                    && previous?.timeFormat === payload.timeFormat
                    && previous?.timeZone === payload.timeZone
                    && previous?.businessDayEndTime === payload.businessDayEndTime
                    && previous?.dateFormat === payload.dateFormat
                );
                return stillOwnsOptimisticState ? { ...previous, ...previousLocale } : previous;
            });
            if (componentActiveRef.current) {
                Toast.show({ content: t('failedToSave'), duration: 2000 });
            }
        } finally {
            localeSaveInFlightRef.current = false;
            if (componentActiveRef.current) setIsSaving(false);
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
            <MobileSettingsScreenHeader
                description={t('localeSubtitle')}
                onBack={onBack}
                title={tBusiness('localeSettings')}
            />
            <Flex
                gap={12}
                style={{
                    padding: 16,
                    paddingBottom: `calc(84px + ${MOBILE_BOTTOM_NAV_CLEARANCE})`,
                    scrollPaddingBottom: `calc(84px + ${MOBILE_BOTTOM_NAV_CLEARANCE})`,
                }}
                vertical
            >
                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuClock size={14} />
                            <Text type="secondary">{tBusiness('timeZone')}</Text>
                        </Flex>
                        <Text type="secondary">{tBusiness('timeZoneHelper')}</Text>
                        <Select
                            aria-label={tBusiness('timeZone')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, timeZone: value }))}
                            options={TIMEZONES_LIST.map((item) => ({ label: item.label, value: item.tzCode }))}
                            placeholder={tBusiness('selectTimeZone')}
                            value={formData.timeZone}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuClock size={14} />
                            <Text type="secondary">{tBusiness('businessDayEndTime')}</Text>
                        </Flex>
                        <Text type="secondary">{tBusiness('businessDayEndTimeHelper')}</Text>
                        <Select
                            aria-label={tBusiness('businessDayEndTime')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, businessDayEndTime: value }))}
                            options={BUSINESS_DAY_END_OPTIONS}
                            placeholder={tBusiness('selectBusinessDayEndTime')}
                            value={formData.businessDayEndTime}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('dateFormat')}</Text>
                        <Text type="secondary">{tBusiness('dateFormatHelper')}</Text>
                        <Select
                            aria-label={tBusiness('dateFormat')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, dateFormat: value }))}
                            options={DATE_FORMATS.map((item) => ({ label: `${format.dateTime(now, item.value)} (${item.labelHelper})`, value: item.label }))}
                            placeholder={tBusiness('selectDateFormat')}
                            value={formData.dateFormat}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={8} vertical>
                        <Text type="secondary">{tBusiness('timeFormat')}</Text>
                        <Text type="secondary">{tBusiness('timeFormatHelper')}</Text>
                        <Select
                            aria-label={tBusiness('timeFormat')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, timeFormat: value }))}
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
                        <Text type="secondary">{tBusiness('languageSettingsUsageHint')}</Text>
                        <Select
                            aria-label={tBusiness('availableLanguages')}
                            maxCount={LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT}
                            mode="multiple"
                            onChange={handleActiveLanguagesChange}
                            options={languageOptions}
                            placeholder={tBusiness('selectAvailableLanguages')}
                            value={formData.activeLanguages}
                        />
                        <Text type="secondary">{tBusiness('availableLanguagesTooltip', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}</Text>
                        <Text type="secondary">{tBusiness('languageSourcePolicyHint')}</Text>
                    </Flex>
                </Card>

                {prospectiveCoverage.repairableGapCount > 0 ? (
                    <Card>
                        <Flex gap={8} vertical>
                            <Text strong>{tBusiness('businessCopyLanguageNudgeTitle', { count: prospectiveCoverage.repairableGapCount })}</Text>
                            <Text type="secondary">
                                {isDirty
                                    ? tBusiness('businessCopyLanguageNudgePendingSave')
                                    : tBusiness('businessCopyLanguageNudgeReady')}
                            </Text>
                            {!isDirty && onOpenBusinessCopySetup ? (
                                <Button block onClick={onOpenBusinessCopySetup}>
                                    {tBusiness('businessCopyLanguageNudgeAction')}
                                </Button>
                            ) : null}
                        </Flex>
                    </Card>
                ) : null}

                <Card>
                    <Flex gap={8} vertical>
                        <Flex align="center" gap={6}>
                            <LuGlobe size={14} />
                            <Text type="secondary">{tBusiness('defaultLanguage')}</Text>
                        </Flex>
                        <Text type="secondary">{tBusiness('defaultLanguageHelper')}</Text>
                        <Select
                            aria-label={tBusiness('defaultLanguage')}
                            onChange={(value: string) => setFormData((previous) => ({ ...previous, defaultLanguage: value }))}
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
                        <Text type="secondary">{tBusiness('currencyHelper')}</Text>
                        <Select
                            aria-label={t('currency')}
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
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: MOBILE_BOTTOM_NAV_CLEARANCE,
                        marginInline: -16,
                        padding: '12px 16px',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                >
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large" style={{ minHeight: 44 }}>
                        {t('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                        {t('saveChanges')}
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}

export default function MobileLocaleSettingsScreen(props: MobileLocaleSettingsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileLocaleSettingsScreenContent key={scopeKey} {...props} />;
}
