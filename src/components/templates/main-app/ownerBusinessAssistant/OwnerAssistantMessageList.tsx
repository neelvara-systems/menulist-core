import { Space, Typography } from 'antd';
import type { OwnerBusinessAssistantAnswer } from '@lib/ownerBusinessAssistant/types';
import { OwnerAssistantFreshnessLabel } from './OwnerAssistantFreshnessLabel';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text } = Typography;

type ThreadMessage = {
  id?: string;
  role?: 'user' | 'assistant' | string;
  content?: string;
  createdAt?: string;
};

export function OwnerAssistantMessageList({ answer, messages }: {
  answer: OwnerBusinessAssistantAnswer | null;
  messages?: ThreadMessage[];
}) {
  if (messages?.length) {
    return (
      <div className={styles.messageBox}>
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          {messages.slice(-8).map((message, index) => (
            <div
              className={message.role === 'user' ? styles.userMessage : styles.assistantMessage}
              key={message.id || `${message.role || 'message'}-${index}`}
            >
              <Text type="secondary">{message.role === 'user' ? 'You' : 'Business Health'}</Text>
              <Paragraph style={{ margin: '4px 0 0' }}>{message.content}</Paragraph>
            </div>
          ))}
        </Space>
      </div>
    );
  }

  return (
    <div className={styles.messageBox}>
      {answer ? (
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <Paragraph style={{ margin: 0 }}>{answer.text}</Paragraph>
          <Space wrap>
            <OwnerAssistantFreshnessLabel label={answer.freshnessLabel} />
            <Text type="secondary">Confidence: {answer.confidence}</Text>
          </Space>
        </Space>
      ) : (
        <Text type="secondary">Choose a question or ask about your business.</Text>
      )}
    </div>
  );
}
