import { Form, Input, Rate } from 'antd';
import { ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH } from '@lib/answerlattice/feedbackBoundary';
import { useTranslations } from 'next-intl';

const GeneralFeedback = () => {
  const t = useTranslations('HelpCenter');
  return (
    <>
      <Form.Item
        label={t('ratingLabel')}
        name="rating"
        rules={[{ required: true, message: t('ratingRequired') }]}
      >
        <Rate />
      </Form.Item>
      <Form.Item
        label={t('feedbackLabel')}
        name="comment" // Changed from 'feedback' to 'comment'
        rules={[{ required: true, message: t('feedbackRequired') }]}
      >
        <Input.TextArea
          maxLength={ANSWERLATTICE_FEEDBACK_TEXT_MAX_LENGTH}
          showCount
          rows={4}
          placeholder={t('feedbackPlaceholder')}
        />
      </Form.Item>
    </>
  );
};

export default GeneralFeedback;
