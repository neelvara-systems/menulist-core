'use client';

import { QuestionCircleOutlined, RocketOutlined, SettingOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Space, Switch, Tooltip, Typography } from 'antd';
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
                                <span>{t('menuItemViews')}</span>
                                <Tooltip title={t('menuItemViewsTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackMenuViews"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">{t('menuItemViewsHelp')}</Text>}
                    >
                        <Switch />
                    </Form.Item>

                    <Form.Item
                        label={(
                            <Space>
                                <span>{t('customerLocations')}</span>
                                <Tooltip title={t('customerLocationsTooltip')}>
                                    <QuestionCircleOutlined />
                                </Tooltip>
                            </Space>
                        )}
                        name={["analytics", "trackLocation"]}
                        valuePropName="checked"
                        extra={<Text type="secondary">{t('customerLocationsHelp')}</Text>}
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
