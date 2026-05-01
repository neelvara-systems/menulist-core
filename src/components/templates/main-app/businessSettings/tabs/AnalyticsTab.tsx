'use client';

import { QuestionCircleOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Collapse, Form, Input, Space, Switch, Tooltip, Typography } from 'antd';
import { ANALYTICS_SETTINGS_GROUPING_NOTE, ANALYTICS_TRACKING_CATEGORY_DISCLOSURES } from '@lib/analytics/settingsDisclosure';
import { useTranslations } from 'next-intl';
import { memo, useState } from 'react';
import AnalyticsGuideModal from './AnalyticsGuideModal';
import AnalyticsSetupWizard from './AnalyticsSetupWizard';

const { Text, Title } = Typography;

interface AnalyticsTabProps {
    scrollRef?: any;
    form: any;
}

const AnalyticsTab = ({ scrollRef, form }: AnalyticsTabProps) => {
    const t = useTranslations('Analytics');
    const [showGuide, setShowGuide] = useState(false);
    const [showSetupWizard, setShowSetupWizard] = useState(false);
    // Using form from parent component

    const validateGA4Id = (rule: any, value: string) => {
        if (!value) {
            return Promise.reject('GA4 Measurement ID is required');
        }
        return Promise.resolve();
    };

    return (
        <>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card ref={scrollRef}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                            <Title level={4} style={{ margin: 0 }}>
                                <Space>
                                    <SettingOutlined />
                                    {t('title')}
                                </Space>
                            </Title>
                            <Space>
                                <Tooltip title={t('setupWizardTooltip')}>
                                    <Button
                                        type="primary"
                                        icon={<RocketOutlined />}
                                        onClick={() => setShowSetupWizard(true)}
                                    >
                                        {t('setupWizard')}
                                    </Button>
                                </Tooltip>
                                <Button
                                    type="link"
                                    icon={<QuestionCircleOutlined />}
                                    onClick={() => setShowGuide(true)}
                                >
                                    {t('viewGuide')}
                                </Button>
                            </Space>
                        </Space>

                        <Alert
                            message={t('trackSuccess')}
                            description={t('trackSuccessDesc')}
                            type="info"
                            showIcon
                        />
                    </Space>
                </Card>

                <Card size="small">
                    <Text type="secondary">
                        MenuList does not use this analytics data for its own marketing. It is connected only so you can see how your menu is performing.
                    </Text>
                </Card>

                <Card title={t('essentialTracking')} size="small">
                    <Form.Item
                        label={(
                            <Space>
                                <span>{t('googleAnalyticsId')}</span>
                                <Tooltip title={t('googleAnalyticsIdTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "googleAnalyticsId"]}
                        extra={<Text type="secondary">{t('googleAnalyticsIdHelp')}</Text>}
                        rules={[{ validator: validateGA4Id }]}
                    >
                        <Input placeholder="G-XXXXXXXXXX" />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>{t('googleSearchConsole')}</span>
                                <Tooltip title={t('googleSearchConsoleTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "searchConsoleVerification"]}
                        extra={<Text type="secondary">{t('googleSearchConsoleHelp')}</Text>}
                    >
                        <Input placeholder="<meta name='google-site-verification' content='...' />" />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>{t('facebookPixelId')}</span>
                                <Tooltip title={t('facebookPixelIdTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "facebookPixelId"]}
                        extra={<Text type="secondary">{t('facebookPixelIdHelp')}</Text>}
                    >
                        <Input placeholder="XXXXXXXXXXXXXXXXXX" />
                    </Form.Item>
                </Card>

                <Card title={t('trackingFeatures')} size="small" style={{ marginTop: '16px' }}>
                    <Alert
                        style={{ marginBottom: 16 }}
                        message="Tracked by default"
                        description="Client-facing screens currently record menu opens, item detail opens, anonymous session milestones, category interest from item views and taps, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, recommendation block impressions and taps, OBP views and CTA taps, customer-app prompt and install events, device/session totals, entry source tags for action-rate-by-source reporting, and approximate location unless you switch a category off below. We do not collect customer names, emails, payment details, exact GPS coordinates, scroll heatmaps, hover activity, or per-keystroke tracking in this analytics flow."
                        type="info"
                        showIcon
                    />
                    <Alert
                        style={{ marginBottom: 16 }}
                        message="How these switches work"
                        description={ANALYTICS_SETTINGS_GROUPING_NOTE}
                        type="info"
                        showIcon
                    />
                    <Collapse
                        ghost
                        items={ANALYTICS_TRACKING_CATEGORY_DISCLOSURES.map((category) => ({
                            key: category.key,
                            label: category.title,
                            children: (
                                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                    <Text type="secondary">{category.description}</Text>
                                    <Text strong>Included signals</Text>
                                    <Space direction="vertical" size={4}>
                                        {category.details.map((detail) => (
                                            <Text key={detail}>• {detail}</Text>
                                        ))}
                                    </Space>
                                    {category.note ? (
                                        <Text type="secondary">{category.note}</Text>
                                    ) : null}
                                </Space>
                            ),
                        }))}
                        style={{ marginBottom: 16 }}
                    />
                    <Form.Item
                        label={(
                            <Space>
                                <span>{t('enhancedEcommerce')}</span>
                                <Tooltip title={t('enhancedEcommerceTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "enhancedEcommerce"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">{t('enhancedEcommerceHelp')}</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>Menu activity</span>
                                <Tooltip title="Tracks menu opens, item detail opens, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, entry source, and session totals across the client menu.">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackMenuViews"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">Tracks menu opens, item detail opens, de-duplicated search queries including no-result searches, unavailable-item taps, final menu CTA clicks, entry source, and session totals across the client menu.</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>Recommendation analytics</span>
                                <Tooltip title="Tracks smart recommendation block impressions and taps when decision blocks appear on the customer menu.">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackDecisionBlocks"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">Tracks smart recommendation block impressions and taps when decision blocks appear on the customer menu.</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>Official business page activity</span>
                                <Tooltip title="Tracks official business page views, CTA taps, menu CTA clicks, social/review link clicks, and owner share actions.">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackOfficialBusinessPage"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">Tracks official business page views, CTA taps, menu CTA clicks, social/review link clicks, and owner share actions.</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>Customer app activity</span>
                                <Tooltip title="Tracks customer app install prompts, installs, standalone opens, and shortcut launches.">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackCustomerApp"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">Tracks customer app install prompts, installs, standalone opens, and shortcut launches.</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>Approximate location</span>
                                <Tooltip title="Adds approximate location to analytics reports using rounded geolocation or timezone region when available.">
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackLocation"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">Adds approximate location to analytics reports using rounded geolocation or timezone region when available.</Text>}
                    >
                        <Switch />
                    </Form.Item>
                </Card>
            </Space>

            <AnalyticsGuideModal
                open={showGuide}
                onClose={() => setShowGuide(false)}
            />

            <AnalyticsSetupWizard
                open={showSetupWizard}
                onClose={() => setShowSetupWizard(false)}
                form={form}
            />
        </>
    );
}

export default memo(AnalyticsTab);
