'use client'

import { APP_LANGUAGES, DARK_COLORS, LIGHT_COLORS } from '@constant/common';
import TIMEZONES_LIST from '@data/timeZones';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useAppSelector } from '@hook/useAppSelector';
import { useFullscreen } from '@hook/useFullscreen';
import { setUserDateFormat, setUserLocale, setUserTimeFormat, setUserTimezone } from '@lib/localization';
import {
    APP_DATE_FORMAT_COOKIES_KEY,
    APP_TIME_FORMAT_COOKIES_KEY,
    DATE_FORMATS,
    defaultDateFormatString,
    defaultLocale,
    defaultTimeFormatString,
    defaultTimezone,
    Locale,
    TIME_FORMATS,
} from '@lib/localization/config';
import {
    getDarkColorState,
    getDarkModeState,
    getFullscreenModeState,
    getLightColorState,
    getRTLDirectionState,
    toggleDarkMode,
    toggleRTLDirection,
    updateDarkThemeColor,
    updateLightThemeColor,
} from '@reduxSlices/clientThemeConfig';
import { getCookie } from 'cookies-next';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { LuCalendarRange, LuClock3, LuGlobe, LuMoon, LuPalette, LuSun, LuType, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Picker, Popup, Switch, Text, Title } from '../antd';
import { useFormatter, useLocale, useTimeZone, useTranslations } from 'next-intl';

interface AppSettingsSheetProps {
    visible: boolean;
    onClose: () => void;
}

export default function AppSettingsSheet({ visible, onClose }: AppSettingsSheetProps) {
    const t = useTranslations('AppSettings');
    const tSettings = useTranslations('Settings');
    const dispatch = useAppDispatch();
    const isDarkMode = useAppSelector(getDarkModeState);
    const lightThemeColor = useAppSelector(getLightColorState);
    const darkThemeColor = useAppSelector(getDarkColorState);
    const isRTL = useAppSelector(getRTLDirectionState);
    const isFullscreen = useAppSelector(getFullscreenModeState);
    const { toggleFullscreen } = useFullscreen();
    const format = useFormatter();
    const locale = useLocale();
    const activeTimeZone = useTimeZone();
    const [isLocalePickerOpen, setIsLocalePickerOpen] = useState(false);
    const [isTimezonePickerOpen, setIsTimezonePickerOpen] = useState(false);
    const [isDateFormatPickerOpen, setIsDateFormatPickerOpen] = useState(false);
    const [isTimeFormatPickerOpen, setIsTimeFormatPickerOpen] = useState(false);
    const [isLocalePending, startLocaleTransition] = useTransition();
    const [selectedDateFormat, setSelectedDateFormat] = useState(defaultDateFormatString);
    const [selectedTimeFormat, setSelectedTimeFormat] = useState(defaultTimeFormatString);

    const activeThemeColor = isDarkMode ? darkThemeColor : lightThemeColor;
    const availableColors = useMemo(() => (isDarkMode ? DARK_COLORS : LIGHT_COLORS), [isDarkMode]);
    const previewDate = useMemo(() => new Date(), []);
    const languageOptions = useMemo(() => APP_LANGUAGES.map((option) => {
        const labelMatch = option.label.match(/^(.+?)\s+\((.+)\)$/);
        const left = labelMatch?.[1]?.trim() || option.label;
        const right = labelMatch?.[2]?.trim();
        const hasNonAsciiLeft = /[^\x00-\x7F]/.test(left);
        const displayLabel = right
            ? hasNonAsciiLeft
                ? `${right} (${left})`
                : option.label
            : option.label;
        const previewLabel = right
            ? hasNonAsciiLeft
                ? right
                : left
            : option.label;

        return {
            label: displayLabel,
            preview: previewLabel,
            value: option.value,
        };
    }), []);

    useEffect(() => {
        const currentDateFormat = getCookie(APP_DATE_FORMAT_COOKIES_KEY);
        const currentTimeFormat = getCookie(APP_TIME_FORMAT_COOKIES_KEY);

        if (typeof currentDateFormat === 'string' && currentDateFormat) {
            setSelectedDateFormat(currentDateFormat);
        }

        if (typeof currentTimeFormat === 'string' && currentTimeFormat) {
            setSelectedTimeFormat(currentTimeFormat);
        }
    }, []);

    const selectedLanguageOption = languageOptions.find((option) => option.value === locale);
    const selectedLanguageLabel = selectedLanguageOption?.label || tSettings('selectLanguage');
    const selectedTimezoneLabel = TIMEZONES_LIST.find((option) => option.tzCode === activeTimeZone)?.label || activeTimeZone || defaultTimezone;
    const selectedDateFormatLabel = useMemo(() => {
        const option = DATE_FORMATS.find((item) => item.label === selectedDateFormat);
        if (!option) return selectedDateFormat;
        return format.dateTime(previewDate, option.value);
    }, [format, previewDate, selectedDateFormat]);
    const selectedTimeFormatLabel = useMemo(() => {
        const option = TIME_FORMATS.find((item) => item.label === selectedTimeFormat);
        if (!option) return selectedTimeFormat;
        return `${format.dateTime(previewDate, option.value)} (${option.labelHelper})`;
    }, [format, previewDate, selectedTimeFormat]);
    const selectedTimezonePreview = useMemo(() => {
        try {
            return new Intl.DateTimeFormat(locale, {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: activeTimeZone || defaultTimezone,
            }).format(previewDate);
        } catch {
            return '';
        }
    }, [activeTimeZone, locale, previewDate]);

    const handleDarkMode = useCallback((checked: boolean) => {
        dispatch(toggleDarkMode(checked));
    }, [dispatch]);

    const handleRTL = useCallback((checked: boolean) => {
        dispatch(toggleRTLDirection(checked));
    }, [dispatch]);

    const handleThemeColor = useCallback((color: string) => {
        if (isDarkMode) {
            dispatch(updateDarkThemeColor(color));
            return;
        }
        dispatch(updateLightThemeColor(color));
    }, [dispatch, isDarkMode]);

    const handleLocaleChange = useCallback((value: string[]) => {
        const nextLocale = (value[0] || defaultLocale) as Locale;
        startLocaleTransition(() => {
            setUserLocale(nextLocale);
        });
    }, []);

    const handleTimezoneChange = useCallback((value: string[]) => {
        const nextTimezone = value[0] || defaultTimezone;
        startLocaleTransition(() => {
            setUserTimezone(nextTimezone);
        });
    }, []);

    const handleDateFormatChange = useCallback((value: string[]) => {
        const nextValue = value[0] || defaultDateFormatString;
        startLocaleTransition(() => {
            setUserDateFormat(nextValue);
            setSelectedDateFormat(nextValue);
        });
    }, []);

    const handleTimeFormatChange = useCallback((value: string[]) => {
        const nextValue = value[0] || defaultTimeFormatString;
        startLocaleTransition(() => {
            setUserTimeFormat(nextValue);
            setSelectedTimeFormat(nextValue);
        });
    }, []);

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80vh' }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex gap={16} vertical>
                <Flex align="center" justify="space-between">
                    <Title level={4} style={{ margin: 0 }}>{t('title')}</Title>
                    <Button fill="none" onClick={onClose} size="small" style={{ paddingInline: 4 }}>
                        <LuX size={18} />
                    </Button>
                </Flex>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {isDarkMode ? <LuMoon size={16} /> : <LuSun size={16} />}
                            <Text strong>{t('darkMode')}</Text>
                        </Flex>
                        <Switch checked={isDarkMode} onChange={handleDarkMode} />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuPalette size={16} />
                            <Text strong>{t('themeColors')}</Text>
                        </Flex>
                        <Flex gap={8} wrap>
                            {availableColors.map((color) => (
                                <Button
                                    key={color}
                                    fill={activeThemeColor === color ? 'solid' : 'outline'}
                                    onClick={() => handleThemeColor(color)}
                                    size="small"
                                    style={{
                                        backgroundColor: color,
                                        borderColor: color,
                                        color: '#fff',
                                        minWidth: 44,
                                    }}
                                >
                                    {activeThemeColor === color ? '•' : ' '}
                                </Button>
                            ))}
                        </Flex>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuGlobe size={16} />
                            <Text strong>{`Language (${selectedLanguageOption?.preview || selectedLanguageLabel})`}</Text>
                        </Flex>
                        <Button
                            block
                            fill="outline"
                            loading={isLocalePending}
                            onClick={() => setIsLocalePickerOpen(true)}
                            style={{ justifyContent: 'flex-start', minHeight: 44 }}
                        >
                            {selectedLanguageLabel}
                        </Button>
                        <Picker
                            columns={[languageOptions.map((option) => ({ label: option.label, value: option.value }))]}
                            onClose={() => setIsLocalePickerOpen(false)}
                            onConfirm={handleLocaleChange}
                            searchPlaceholder={tSettings('selectLanguage')}
                            title={tSettings('language')}
                            value={[locale]}
                            visible={isLocalePickerOpen}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuGlobe size={16} />
                            <Text strong>{`${tSettings('timezone')} (${selectedTimezonePreview || selectedTimezoneLabel})`}</Text>
                        </Flex>
                        <Button
                            block
                            fill="outline"
                            loading={isLocalePending}
                            onClick={() => setIsTimezonePickerOpen(true)}
                            style={{ justifyContent: 'flex-start', minHeight: 44 }}
                        >
                            {selectedTimezoneLabel}
                        </Button>
                        <Picker
                            columns={[TIMEZONES_LIST.map((option) => ({ label: option.label, value: option.tzCode }))]}
                            onClose={() => setIsTimezonePickerOpen(false)}
                            onConfirm={handleTimezoneChange}
                            searchPlaceholder={tSettings('selectTimezone')}
                            title={tSettings('timezone')}
                            value={[activeTimeZone || defaultTimezone]}
                            visible={isTimezonePickerOpen}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuCalendarRange size={16} />
                            <Text strong>{`${tSettings('dateFormat')} (${selectedDateFormatLabel})`}</Text>
                        </Flex>
                        <Button
                            block
                            fill="outline"
                            loading={isLocalePending}
                            onClick={() => setIsDateFormatPickerOpen(true)}
                            style={{ justifyContent: 'flex-start', minHeight: 44 }}
                        >
                            {selectedDateFormatLabel}
                        </Button>
                        <Picker
                            columns={[DATE_FORMATS.map((option) => ({
                                label: format.dateTime(previewDate, option.value),
                                value: option.label,
                            }))]}
                            onClose={() => setIsDateFormatPickerOpen(false)}
                            onConfirm={handleDateFormatChange}
                            searchPlaceholder={tSettings('selectDateFormat')}
                            title={tSettings('dateFormat')}
                            value={[selectedDateFormat]}
                            visible={isDateFormatPickerOpen}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" gap={8}>
                            <LuClock3 size={16} />
                            <Text strong>{`${tSettings('timeFormat')} (${selectedTimeFormatLabel})`}</Text>
                        </Flex>
                        <Button
                            block
                            fill="outline"
                            loading={isLocalePending}
                            onClick={() => setIsTimeFormatPickerOpen(true)}
                            style={{ justifyContent: 'flex-start', minHeight: 44 }}
                        >
                            {selectedTimeFormatLabel}
                        </Button>
                        <Picker
                            columns={[TIME_FORMATS.map((option) => ({
                                label: `${format.dateTime(previewDate, option.value)} (${option.labelHelper})`,
                                value: option.label,
                            }))]}
                            onClose={() => setIsTimeFormatPickerOpen(false)}
                            onConfirm={handleTimeFormatChange}
                            searchPlaceholder={tSettings('selectTimeFormat')}
                            title={tSettings('timeFormat')}
                            value={[selectedTimeFormat]}
                            visible={isTimeFormatPickerOpen}
                        />
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            <LuType size={16} />
                            <Text strong>{t('rtlToggle')}</Text>
                        </Flex>
                        <Switch checked={isRTL} onChange={handleRTL} />
                    </Flex>
                </Card>

                <Card>
                    <Flex align="center" justify="space-between">
                        <Text strong>{t('useFullScreen')}</Text>
                        <Switch checked={isFullscreen} onChange={() => void toggleFullscreen()} />
                    </Flex>
                </Card>
            </Flex>
        </Popup>
    );
}
