import { Checkbox, Col, Form, Input, Row } from 'antd';
import { useTranslations } from 'next-intl';

const features = [
  'Menu Creation & Editing',
  'Automatic Data Extraction (OCR)',
  'Multi-language Translation',
  'Photo Generation',
  'Digital Menu Display',
  'QR Code Menu Sharing',
  'Knowledge Base & Help Articles',
  'Help Assistant Support',
  'Billing & Subscriptions',
  'Analytics Dashboard',
];

const FeatureUsage = () => {
  const t = useTranslations('HelpCenter');
  return (
    <>
      <Form.Item
        label={t('featureUsageLabel')}
        name="featureIssues"
        help={t('featureUsageHelp')}
      >
        <Checkbox.Group style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            {features.map((feature) => (
              <Col span={12} key={feature}>
                <Checkbox value={feature}>{feature}</Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Form.Item>

      <Form.Item
        label={t('featureUsageMore')}
        name="featureComment"
        style={{ paddingTop: 24 }}
      >
        <Input.TextArea
          rows={4}
          placeholder={t('featureUsagePlaceholder')}
        />
      </Form.Item>
    </>
  );
};

export default FeatureUsage;
