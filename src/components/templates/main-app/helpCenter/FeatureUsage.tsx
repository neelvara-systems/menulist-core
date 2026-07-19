import { Checkbox, Col, Form, Input, Row } from 'antd';
import {
  ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES,
  ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH,
} from '@lib/answerlattice/feedbackBoundary';
import { useTranslations } from 'next-intl';

const features = ANSWERLATTICE_FEEDBACK_FEATURE_ISSUES;

const FeatureUsage = () => {
  const t = useTranslations('HelpCenter');
  const form = Form.useFormInstance();
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
              <Col xs={24} sm={12} key={feature}>
                <Checkbox
                  value={feature}
                  style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}
                >
                  {feature}
                </Checkbox>
              </Col>
            ))}
          </Row>
        </Checkbox.Group>
      </Form.Item>

      <Form.Item
        label={t('featureUsageMore')}
        name="featureComment"
        style={{ paddingTop: 24 }}
        rules={[{
          validator: async (_, value) => {
            const hasComment = String(value || '').trim().length > 0;
            const hasIssue = (form.getFieldValue('featureIssues') || []).length > 0;
            if (hasComment || hasIssue) return;
            throw new Error(t('feedbackRequired'));
          },
        }]}
      >
        <Input.TextArea
          maxLength={ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH}
          showCount
          rows={4}
          placeholder={t('featureUsagePlaceholder')}
        />
      </Form.Item>
    </>
  );
};

export default FeatureUsage;
