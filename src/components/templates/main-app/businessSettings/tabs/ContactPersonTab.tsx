import { Card, Col, Divider, Form, Input, Row, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { LuMail, LuPhone, LuUser } from 'react-icons/lu';

const { Title } = Typography;

interface ContactPersonTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
}

const ContactPersonTab: React.FC<ContactPersonTabProps> = ({ scrollRef }) => {
    const t = useTranslations('BusinessSettings');
    return (
        <Card size='small' ref={scrollRef}>
            <Title level={5} style={{ margin: "unset" }}>{t('contactPerson')}</Title>
            <Divider />
            <Row gutter={[16, 0]}>
                <Col xs={24} md={8}>
                    <Form.Item
                        name="contactPersonName"
                        label={t('contactPersonName')}
                        rules={[{ message: t('contactPersonNameRequired') }]}
                    >
                        <Input prefix={<LuUser />} placeholder={t('fullName')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item
                        name="contactPersonEmail"
                        label={t('contactPersonEmail')}
                        rules={[{ type: 'email', message: t('validEmailRequired') }]}
                    >
                        <Input prefix={<LuMail />} placeholder={t('emailPlaceholder')} />
                    </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                    <Form.Item
                        name="contactPersonNumber"
                        label={t('contactPersonNumber')}
                        rules={[{ message: t('contactNumberRequired') }]}
                    >
                        <Input prefix={<LuPhone />} placeholder={t('phonePlaceholder')} />
                    </Form.Item>
                </Col>
            </Row>
        </Card>
    );
};

export default ContactPersonTab;
