import { LANGUAGE_CONSTANTS } from '@constant/languages';
import GlobalLanguagesList from '@data/languages';
import TIMEZONES_LIST from '@data/timeZones';
import { DATE_FORMATS, TIME_FORMATS } from '@lib/localization/config';
import { getUTCDate } from '@util/dateTime';
import { Card, Col, Divider, Form, Row, Select, Typography } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';

const { Title, Text } = Typography;

interface LocaleSettingsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const LocaleSettingsTab: React.FC<LocaleSettingsTabProps> = ({ scrollRef }) => {
    const t = useTranslations('BusinessSettings');
    const format = useFormatter();
    const now = getUTCDate().newDate;

    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('localeSettings')}</Title>
            <Divider />
            <Row gutter={[16, 0]}>
                <Col xs={24} md={8}>
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
                <Col xs={24} md={8}>
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
                <Col xs={24} md={8}>
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
                    <Form.Item
                        name="defaultLanguage"
                        label={t('defaultLanguage')}
                        tooltip={t('defaultLanguageTooltip')}
                        dependencies={['activeLanguages']}
                    >
                        {({ getFieldValue }) => {
                            const activeLanguages = getFieldValue('activeLanguages') || [];
                            const availableOptions = activeLanguages.length > 0
                                ? GlobalLanguagesList.filter(lang => activeLanguages.includes(lang.code))
                                : GlobalLanguagesList;

                            return (
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
                            );
                        }}
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
};

export default LocaleSettingsTab;
