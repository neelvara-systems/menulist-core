import { LANGUAGE_CONSTANTS } from '@constant/languages';
import { FEATURE_FLAGS } from '@config/features';
import GlobalLanguagesList from '@data/languages';
import TIMEZONES_LIST from '@data/timeZones';
import { normalizeStoreLanguagePolicy } from '@lib/localization/languagePolicy';
import { DATE_FORMATS, TIME_FORMATS } from '@lib/localization/config';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { getUTCDate } from '@util/dateTime';
import { Alert, Button, Card, Col, Divider, Form, Row, Select, Typography } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo } from 'react';

const { Title, Text } = Typography;

const BUSINESS_DAY_END_OPTIONS = [
    { label: 'Calendar day (12:00 AM)', value: '00:00' },
    { label: 'Late service day (3:00 AM)', value: '03:00' },
    { label: 'Very late service (4:00 AM)', value: '04:00' },
    { label: 'Morning close (5:00 AM)', value: '05:00' },
];

interface LocaleSettingsTabProps {
    onOpenSearchDiscovery?: () => void;
    scrollRef?: React.RefObject<HTMLDivElement>;
    storeDetails?: any;
}

const LocaleSettingsTab: React.FC<LocaleSettingsTabProps> = ({ onOpenSearchDiscovery, scrollRef, storeDetails }) => {
    const t = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = getUTCDate().newDate;
    const watchedActiveLanguages = Form.useWatch('activeLanguages') || [];
    const watchedDefaultLanguage = Form.useWatch('defaultLanguage');
    const nextStorePolicy = useMemo(() => {
        const normalized = normalizeStoreLanguagePolicy({
            ...storeDetails,
            activeLanguages: watchedActiveLanguages,
            defaultLanguage: watchedDefaultLanguage,
        });

        return {
            ...storeDetails,
            activeLanguages: normalized.activeLanguages,
            defaultLanguage: normalized.defaultLanguage,
        };
    }, [storeDetails, watchedActiveLanguages, watchedDefaultLanguage]);
    const businessCopyCoverage = useMemo(
        () => computeBusinessCopyCoverage(nextStorePolicy, { includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA }),
        [nextStorePolicy],
    );
    const hasLanguagePolicyChanges = JSON.stringify({
        activeLanguages: nextStorePolicy.activeLanguages,
        defaultLanguage: nextStorePolicy.defaultLanguage,
    }) !== JSON.stringify({
        activeLanguages: storeDetails?.activeLanguages?.length ? storeDetails.activeLanguages : ['en'],
        defaultLanguage: storeDetails?.defaultLanguage || 'en',
    });

    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('localeSettings')}</Title>
            <Divider />
            <Row gutter={[16, 0]}>
                <Col xs={24} md={6}>
                    <Form.Item
                        name="timeZone"
                        label={t('timeZone')}
                    >
                        <Select
                            placeholder={t('selectTimeZone')}
                            showSearch
                            filterOption={(input, option) =>
                                option?.label?.toLowerCase().includes(input.toLowerCase())
                            }
                            options={TIMEZONES_LIST.map((t) => ({ label: t.label, value: t.tzCode }))}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item
                        name="businessDayEndTime"
                        label={t('businessDayEndTime')}
                    >
                        <Select
                            placeholder={t('selectBusinessDayEndTime')}
                            options={BUSINESS_DAY_END_OPTIONS}
                        />
                    </Form.Item>
                    <Text type="secondary" style={{ display: 'block', marginTop: -16, marginBottom: 16, fontSize: 12 }}>
                        {t('businessDayEndTimeHelper')}
                    </Text>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item
                        name="dateFormat"
                        label={t('dateFormat')}
                    >
                        <Select
                            placeholder={t('selectDateFormat')}
                            options={DATE_FORMATS.map((t) => ({ label: format.dateTime(now, t.value), value: t.label }))}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                    <Form.Item
                        name="timeFormat"
                        label={t('timeFormat')}
                    >
                        <Select
                            placeholder={t('selectTimeFormat')}
                            options={TIME_FORMATS.map((t) => ({ label: `${format.dateTime(now, t.value)} (${t.labelHelper})`, value: t.label }))}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Divider />
            <Title level={5} style={{ margin: "unset", marginBottom: 8 }}>{t('languageSettings')}</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('languageSettingsDesc')}
            </Text>
            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('languageSettingsUsageHint')}
            </Text>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="activeLanguages"
                        label={t('availableLanguages')}
                        tooltip={t('availableLanguagesTooltip', { max: LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT })}
                    >
                        <Select
                            mode="multiple"
                            placeholder={t('selectAvailableLanguages')}
                            showSearch
                            maxCount={LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT}
                            filterOption={(input, option) =>
                                (option?.label?.toString().toLowerCase() || '').includes(input.toLowerCase())
                            }
                            options={GlobalLanguagesList.map((lang) => ({
                                label: lang.nativeName !== lang.name
                                    ? `${lang.nativeName} (${lang.name})`
                                    : lang.name,
                                value: lang.code
                            }))}
                        />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item noStyle dependencies={['activeLanguages']}>
                        {({ getFieldValue }) => {
                            const activeLanguages = normalizeStoreLanguagePolicy({
                                activeLanguages: getFieldValue('activeLanguages') || [],
                                defaultLanguage: getFieldValue('defaultLanguage'),
                            }).activeLanguages;
                            const availableOptions = activeLanguages.length > 0
                                ? GlobalLanguagesList.filter(lang => activeLanguages.includes(lang.code))
                                : GlobalLanguagesList;

                            return (
                                <Form.Item
                                    name="defaultLanguage"
                                    label={t('defaultLanguage')}
                                    tooltip={t('defaultLanguageTooltip')}
                                >
                                    <Select
                                        placeholder={t('selectDefaultLanguage')}
                                        showSearch
                                        filterOption={(input, option) =>
                                            (option?.label?.toString().toLowerCase() || '').includes(input.toLowerCase())
                                        }
                                        options={availableOptions.map((lang) => ({
                                            label: lang.nativeName !== lang.name
                                                ? `${lang.nativeName} (${lang.name})`
                                                : lang.name,
                                            value: lang.code
                                        }))}
                                    />
                                </Form.Item>
                            );
                        }}
                    </Form.Item>
                </Col>
            </Row>

            {businessCopyCoverage.repairableGapCount > 0 ? (
                <>
                    <Divider />
                    <Alert
                        action={!hasLanguagePolicyChanges && onOpenSearchDiscovery ? (
                            <Button onClick={onOpenSearchDiscovery} size="small" type="link">
                                {t('businessCopyLanguageNudgeAction')}
                            </Button>
                        ) : undefined}
                        description={hasLanguagePolicyChanges
                            ? t('businessCopyLanguageNudgePendingSave')
                            : t('businessCopyLanguageNudgeReady')}
                        message={t('businessCopyLanguageNudgeTitle', {
                            count: businessCopyCoverage.repairableGapCount,
                        })}
                        showIcon
                        type="info"
                    />
                </>
            ) : null}
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                {t('languageSourcePolicyHint')}
            </Text>
        </Card>
    );
};

export default LocaleSettingsTab;
