'use client';

import { FEATURE_FLAGS } from '@config/features';
import { getBusinessAttributeGroupsForType } from '@lib/obp/businessAttributes';
import { Button, Card, Col, Divider, Form, Input, Row, Space, Switch, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef } from 'react';
import { LuPlus, LuTrash2 } from 'react-icons/lu';

const { Title, Text } = Typography;

interface BusinessAttributesTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const BusinessAttributesTab = forwardRef<HTMLDivElement, BusinessAttributesTabProps>(
    ({ scrollRef }, ref) => {
        const t = useTranslations('BusinessSettings');
        const businessType = Form.useWatch('businessType');
        const businessCategory = Form.useWatch('businessCategory');
        const { token } = theme.useToken();

        if (!FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES) return null;

        const attributeGroups = getBusinessAttributeGroupsForType(businessType, businessCategory);

        return (
            <Card size="small" ref={ref || scrollRef}>
                <Title level={5} style={{ margin: 'unset' }}>
                    {t('businessAttributes')}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('businessAttributesDesc')}
                </Text>

                {attributeGroups.map((group) => (
                    <React.Fragment key={group.group}>
                        <Divider orientation="left" orientationMargin={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {t(group.labelKey)}
                            </Text>
                        </Divider>
                        <Row gutter={[16, 8]}>
                            {group.fields.map((field) => (
                                <Col xs={12} md={8} lg={6} key={field.key}>
                                    <Form.Item
                                        name={['businessAttributes', field.key]}
                                        label={(
                                            <Space size={6}>
                                                <span style={{ color: token.colorTextTertiary, fontSize: 11, minWidth: 18 }}>{field.icon}</span>
                                                <span>{t(field.labelKey)}</span>
                                            </Space>
                                        )}
                                        valuePropName="checked"
                                        style={{ marginBottom: 8 }}
                                    >
                                        <Switch size="small" />
                                    </Form.Item>
                                </Col>
                            ))}
                        </Row>
                    </React.Fragment>
                ))}

                <Divider orientation="left" orientationMargin={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {t('customBusinessAttributes')}
                    </Text>
                </Divider>
                <Form.List name={['publicPresence', 'customAttributes']}>
                    {(fields, { add, remove }) => (
                        <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {fields.map((field) => (
                                <Row gutter={[8, 8]} key={field.key} align="middle">
                                    <Col xs={6} md={4}>
                                        <Form.Item name={[field.name, 'icon']} style={{ marginBottom: 0 }}>
                                            <Input placeholder="Icon" maxLength={8} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={14} md={16}>
                                        <Form.Item
                                            name={[field.name, 'label']}
                                            rules={[{ max: 32, message: t('customBusinessAttributeMax') }]}
                                            style={{ marginBottom: 0 }}
                                        >
                                            <Input placeholder={t('customBusinessAttributePlaceholder')} maxLength={32} />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={4}>
                                        <Button danger icon={<LuTrash2 size={14} />} onClick={() => remove(field.name)} />
                                    </Col>
                                </Row>
                            ))}
                            {fields.length < 6 ? (
                                <Button icon={<LuPlus size={14} />} onClick={() => add({ active: true })}>
                                    {t('addCustomBusinessAttribute')}
                                </Button>
                            ) : null}
                        </Space>
                    )}
                </Form.List>
            </Card>
        );
    },
);

BusinessAttributesTab.displayName = 'BusinessAttributesTab';

export default BusinessAttributesTab;
