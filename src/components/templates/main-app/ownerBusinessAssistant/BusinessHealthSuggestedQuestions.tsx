import { Button, Space, Typography } from 'antd';
import type { OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';
import { getOwnerBusinessHealthQuestionLabel } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { useTranslations } from 'next-intl';

const { Text } = Typography;

export function BusinessHealthSuggestedQuestions({ questions, onAsk, loading, disabled, label, limit = 6 }: {
  questions?: OwnerBusinessHealthQuestion[];
  onAsk: (question: OwnerBusinessHealthQuestion) => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  limit?: number;
}) {
  const t = useTranslations('Dashboard.owner');
  if (!questions?.length) return null;

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Text type="secondary">{label || t('businessHealth.assistant.suggestedQuestions')}</Text>
      <div className={styles.questionGrid}>
        {questions.slice(0, limit).map((question) => (
          <Button
            key={question.id}
            className={styles.questionButton}
            onClick={() => onAsk(question)}
            loading={loading}
            disabled={disabled}
          >
            {getOwnerBusinessHealthQuestionLabel(question, t)}
          </Button>
        ))}
      </div>
    </Space>
  );
}
