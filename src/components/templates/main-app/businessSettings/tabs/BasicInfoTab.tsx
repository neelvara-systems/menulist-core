'use client';
import PhoneNumberInput from '@atoms/phoneNumberInput';
import { BUSINESS_CATEGORIES, BUSINESS_TYPES, resolveStoreBusinessCategory } from '@data/shared/businessTypes';
import { Card, Col, Divider, Form, Input, Row, Select, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef, memo, useMemo } from 'react';
import { LuBuilding2, LuMail, LuMapPin } from 'react-icons/lu';

const { Text, Title } = Typography;

interface BasicInfoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
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

            <Form.Item
                noStyle
                shouldUpdate={(previous, current) => (
                    previous.tenantName !== current.tenantName
                    || previous.name !== current.name
                    || previous.phoneNumber !== current.phoneNumber
                    || previous.dialCode !== current.dialCode
                )}
            >
                {({ getFieldValue }) => {
                    const brandName = getFieldValue('tenantName') || 'Brand name';
                    const locationName = getFieldValue('name') || 'Location name';
                    const dialCode = getFieldValue('dialCode') || '';
                    const phoneNumber = getFieldValue('phoneNumber') || '';
                    const publicPhone = [dialCode, phoneNumber].filter(Boolean).join(' ') || 'Phone not set';

                    return (
                        <div style={{
                            background: 'rgba(0,0,0,0.02)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 8,
                            marginBottom: 16,
                            padding: 12,
                        }}>
                            <Text strong>Customer preview</Text>
                            <div style={{ marginTop: 6 }}>
                                <Text>{brandName} - {locationName}</Text>
                            </div>
                            <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                                Public phone: {publicPhone}
                            </Text>
                        </div>
                    );
                }}
            </Form.Item>

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
