'use client';
import PhoneNumberInput from '@atoms/phoneNumberInput';
import { BUSINESS_CATEGORIES, BUSINESS_TYPES, resolveStoreBusinessCategory } from '@constant/common';
import { Card, Col, Divider, Form, Input, Row, Select, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef, memo, useMemo } from 'react';
import { LuBuilding2, LuMail, LuMapPin } from 'react-icons/lu';

const { Title } = Typography;

interface BasicInfoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const BasicInfoTab = forwardRef<HTMLDivElement, BasicInfoTabProps>(({ scrollRef }, ref) => {
    const t = useTranslations('BusinessSettings');
    const form = Form.useFormInstance();
    const businessTypeOptions = useMemo(() => {
        const grouped: Array<{ label: string; options: Array<{ label: string; value: string }> }> = [];

        BUSINESS_CATEGORIES.forEach(category => {
            grouped.push({
                label: category.label,
                options: []
            });
        });

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

        return grouped.filter(group => group.options.length > 0);
    }, []);

    const handleBusinessTypeChange = (businessType?: string) => {
        form.setFieldsValue({
            businessCategory: resolveStoreBusinessCategory(
                businessType,
                form.getFieldValue('businessCategory'),
            ),
        });
    };

    return (
        <Card size='small' ref={ref || scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('basicInformation')}</Title>
            <Divider />

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="tenantName"
                        label="Brand name"
                        extra="Shown across your locations and public business page."
                        rules={[{ required: true, whitespace: true, message: 'Please enter brand name' }]}
                    >
                        <Input prefix={<LuBuilding2 />} placeholder="Brand / chain name" />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="name"
                        label="Location name"
                        extra="Use Main Store for a single location, or a branch name for outlets."
                        rules={[{ required: true, whitespace: true, message: 'Please enter location name' }]}
                    >
                        <Input prefix={<LuMapPin />} placeholder="Main Store / MG Road" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
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
                            options={businessTypeOptions}
                            onChange={handleBusinessTypeChange}
                        />
                    </Form.Item>
                    <Form.Item name="businessCategory" hidden>
                        <Input type="hidden" />
                    </Form.Item>
                </Col>
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
                    <Form.Item name="countryCode" hidden>
                        <Input type="hidden" />
                    </Form.Item>
                    <Form.Item name="dialCode" hidden>
                        <Input type="hidden" />
                    </Form.Item>
                    <Form.Item name="phoneNumber" hidden>
                        <Input type="hidden" />
                    </Form.Item>
                    <Form.Item
                        label={t('phoneNumber')}
                        rules={[{ message: t('phonePlaceholder') }]}
                    >
                        <Form.Item noStyle shouldUpdate={(previous, current) => (
                            previous.countryCode !== current.countryCode
                            || previous.dialCode !== current.dialCode
                            || previous.phoneNumber !== current.phoneNumber
                        )}>
                            {() => (
                                <PhoneNumberInput
                                    countryCode={form.getFieldValue('countryCode') || 'IN'}
                                    dialCode={form.getFieldValue('dialCode') || ''}
                                    phoneNumber={form.getFieldValue('phoneNumber') || ''}
                                    onChange={(value) => form.setFieldsValue(value)}
                                />
                            )}
                        </Form.Item>
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
