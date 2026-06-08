import { Button, Space, Typography } from 'antd';
import type { OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthSuggestedQuestions({ questions, onAsk, loading }: {
  questions?: OwnerBusinessHealthQuestion[];
  onAsk: (question: OwnerBusinessHealthQuestion) => void;
  loading?: boolean;
}) {
  if (!questions?.length) return null;

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Text type="secondary">Suggested questions</Text>
      <div className={styles.questionGrid}>
        {questions.slice(0, 6).map((question) => (
          <Button
            key={question.id}
            className={styles.questionButton}
            onClick={() => onAsk(question)}
            loading={loading}
          >
            {question.label}
          </Button>
        ))}
      </div>
    </Space>
  );
}
