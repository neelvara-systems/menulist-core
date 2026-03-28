'use client';

import { FEATURE_FLAGS } from '@config/features';
import { Card, Col, Divider, Form, Row, Switch, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import React, { forwardRef } from 'react';

const { Title, Text } = Typography;

interface BusinessAttributesTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const BusinessAttributesTab = forwardRef<HTMLDivElement, BusinessAttributesTabProps>(
    ({ scrollRef }, ref) => {
        const t = useTranslations('BusinessSettings');
        if (!FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES) return null;

        const ATTRIBUTE_GROUPS = [
            {
                label: t('dietaryOptions'),
                fields: [
                    { name: 'vegetarian', label: t('attrVegetarian') },
                    { name: 'vegan', label: t('attrVegan') },
                    { name: 'halal', label: t('attrHalal') },
                    { name: 'glutenFree', label: t('attrGlutenFree') },
                ],
            },
            {
                label: t('amenities'),
                fields: [
                    { name: 'wifi', label: t('attrWifi') },
                    { name: 'outdoorSeating', label: t('attrOutdoorSeating') },
                    { name: 'parking', label: t('attrParking') },
                    { name: 'airConditioning', label: t('attrAirConditioning') },
                    { name: 'liveMusic', label: t('attrLiveMusic') },
                    { name: 'petFriendly', label: t('attrPetFriendly') },
                ],
            },
            {
                label: t('serviceModes'),
                fields: [
                    { name: 'dineIn', label: t('attrDineIn') },
                    { name: 'takeaway', label: t('attrTakeaway') },
                    { name: 'delivery', label: t('attrDelivery') },
                    { name: 'driveThrough', label: t('attrDriveThrough') },
                ],
            },
            {
                label: t('paymentMethods'),
                fields: [
                    { name: 'acceptsCards', label: t('attrAcceptsCards') },
                    { name: 'acceptsUPI', label: t('attrAcceptsUPI') },
                    { name: 'acceptsCash', label: t('attrAcceptsCash') },
                ],
            },
        ];

        return (
            <Card size="small" ref={ref || scrollRef}>
                <Title level={5} style={{ margin: 'unset' }}>
                    {t('businessAttributes')}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    {t('businessAttributesDesc')}
                </Text>

                {ATTRIBUTE_GROUPS.map((group, groupIndex) => (
                    <React.Fragment key={group.label}>
                        <Divider orientation="left" orientationMargin={0}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {group.label}
                            </Text>
                        </Divider>
                        <Row gutter={[16, 8]}>
                            {group.fields.map((field) => (
                                <Col xs={12} md={8} lg={6} key={field.name}>
                                    <Form.Item
                                        name={['businessAttributes', field.name]}
                                        label={field.label}
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
            </Card>
        );
    },
);

BusinessAttributesTab.displayName = 'BusinessAttributesTab';

export default BusinessAttributesTab;
