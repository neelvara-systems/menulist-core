import { Checkbox, Col, Form, Input, Row } from 'antd';
import { useTranslations } from 'next-intl';

const features = [
  'Account access',
  'Billing and invoices',
  'Onboarding and setup',
  'Team roles and permissions',
  'Settings and configuration',
  'Integrations',
  'Data import or export',
  'Notifications and email',
  'Reports and analytics',
  'Performance or reliability',
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
