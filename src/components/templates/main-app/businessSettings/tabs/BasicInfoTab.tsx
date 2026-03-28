'use client';
import { BUSINESS_CATEGORIES, BUSINESS_TYPES } from '@constant/common';
import { Card, Col, Divider, Form, Input, Row, Select, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef, memo, useMemo } from 'react';
import { LuMail, LuPhoneCall } from 'react-icons/lu';

const { TextArea } = Input;
const { Title } = Typography;

interface BasicInfoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const BasicInfoTab = forwardRef<HTMLDivElement, BasicInfoTabProps>(({ scrollRef }, ref) => {
    const t = useTranslations('BusinessSettings');
    return (
        <Card size='small' ref={ref || scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('basicInformation')}</Title>
            <Divider />

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="name"
                        label={t('businessName')}
                        rules={[{ message: t('businessNameRequired') }]}
                    >
                        <Input placeholder={t('businessNamePlaceholder')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="businessType"
                        label={t('businessType')}
                    >
                        <Select
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label?.toLowerCase() || '').includes(input.toLowerCase())
                            }
                            placeholder={t('selectBusinessType')}
                            optionFilterProp="label"
                            options={useMemo(() => {
                                const grouped = [];

                                // Initialize groups based on BUSINESS_CATEGORIES
                                BUSINESS_CATEGORIES.forEach(category => {
                                    grouped.push({
                                        label: category.label,
                                        options: []
                                    });
                                });

                                // Add business types to their respective category groups
                                BUSINESS_TYPES.forEach(businessType => {
                                    const categoryValue = businessType.category || 'specialty';
                                    const categoryIndex = grouped.findIndex(group =>
                                        group.label === BUSINESS_CATEGORIES.find(cat => cat.value === categoryValue)?.label
                                    );

                                    if (categoryIndex !== -1) {
                                        grouped[categoryIndex].options.push({
                                            label: businessType.label,
                                            value: businessType.value
                                        });
                                    }
                                });

                                // Remove empty groups
                                return grouped.filter(group => group.options.length > 0);
                            }, [])}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24}>
                    <Form.Item
                        name="description"
                        label={t('businessDescription')}
                    >
                        <TextArea
                            placeholder={t('businessDescPlaceholder')}
                            rows={3}
                            autoSize={{ minRows: 3 }}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="email"
                        label={t('businessEmail')}
                        rules={[{ type: 'email', message: t('invalidEmail') }]}
                    >
                        <Input prefix={<LuMail />} placeholder={t('emailPlaceholder')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="phoneNumber"
                        label={t('phoneNumber')}
                        rules={[{ message: t('phonePlaceholder') }]}
                    >
                        <Input prefix={<LuPhoneCall />} placeholder={t('phonePlaceholder')} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="gstn"
                        label={t('gstin')}
                    >
                        <Input placeholder={t('gstPlaceholder')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="domain"
                        label={t('domain')}
                    >
                        <Input disabled placeholder={t('domainPlaceholder')} />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
});

BasicInfoTab.displayName = 'BasicInfoTab';
export default memo(BasicInfoTab);
