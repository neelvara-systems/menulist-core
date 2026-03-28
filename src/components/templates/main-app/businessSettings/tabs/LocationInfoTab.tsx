'use client';
import { Card, Col, Divider, Form, Input, Row, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { forwardRef, memo } from 'react';

const { Title } = Typography;
const { TextArea } = Input;

interface LocationInfoTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
}

const LocationInfoTab = forwardRef<HTMLDivElement, LocationInfoTabProps>(({ scrollRef }, ref) => {
    const t = useTranslations('BusinessSettings');
    return (
        <Card size='small' ref={ref || scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('locationInformation')}</Title>
            <Divider />

            <Row gutter={[16, 0]}>
                <Col xs={24}>
                    <Form.Item
                        name="address"
                        label={t('streetAddress')}
                        rules={[{ message: t('streetAddressRequired') }]}
                    >
                        <TextArea
                            placeholder={t('streetAddressPlaceholder')}
                            rows={2}
                            autoSize={{ minRows: 2 }}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="city"
                        label={t('city')}
                        rules={[{ message: t('cityRequired') }]}
                    >
                        <Input placeholder={t('city')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="state"
                        label={t('state')}
                        rules={[{ message: t('stateRequired') }]}
                    >
                        <Input placeholder={t('state')} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="country"
                        label={t('country')}
                        rules={[{ message: t('countryRequired') }]}
                    >
                        <Input placeholder={t('country')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="pincode"
                        label={t('postalCode')}
                        rules={[{ message: t('postalCodeRequired') }]}
                    >
                        <Input placeholder={t('postalCode')} />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="latitude"
                        label={t('latitude')}
                    >
                        <Input placeholder={t('latitude')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                    <Form.Item
                        name="longitude"
                        label={t('longitude')}
                    >
                        <Input placeholder={t('longitude')} />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
});

LocationInfoTab.displayName = 'LocationInfoTab';
export default memo(LocationInfoTab);
