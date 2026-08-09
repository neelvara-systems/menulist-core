import { Button, Space, Typography } from 'antd';
import type { OwnerBusinessAssistantAnswer, OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import type { ReactNode } from 'react';
import { LuActivity, LuSparkles, LuUser } from 'react-icons/lu';
import { OwnerAssistantFreshnessLabel } from './OwnerAssistantFreshnessLabel';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text } = Typography;

type ThreadMessage = {
  id?: string;
  role?: 'user' | 'assistant' | string;
  content?: string;
  answerId?: string;
  confidence?: OwnerBusinessAssistantAnswer['confidence'];
  createdAt?: string;
  freshnessLabel?: string;
  suggestedQuestions?: OwnerBusinessHealthQuestion[];
};

function FollowUpQuestions({ disabled, loading, onAsk, questions }: {
  disabled?: boolean;
  loading?: boolean;
  onAsk?: (question: OwnerBusinessHealthQuestion) => void;
  questions?: OwnerBusinessHealthQuestion[];
}) {
  if (!questions?.length || !onAsk) return null;

  return (
    <div className={styles.followUpBlock}>
      <div className={styles.followUpHeader}>
        <LuSparkles size={14} aria-hidden />
        <Text type="secondary">You can ask next</Text>
      </div>
      <div className={styles.followUpGrid}>
        {questions.slice(0, 3).map((question) => (
          <Button
            className={styles.followUpButton}
            disabled={disabled}
            key={question.id}
            loading={loading}
            onClick={() => onAsk(question)}
            type="text"
          >
            {question.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function OwnerAssistantBubble({
  children,
  content,
  role,
}: {
  children?: ReactNode;
  content?: string;
  role: 'user' | 'assistant';
}) {
  const isUser = role === 'user';

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAssistant}`}>
      {!isUser ? (
        <span className={`${styles.messageAvatar} ${styles.messageAvatarAssistant}`} aria-hidden>
          <LuActivity size={16} />
        </span>
      ) : null}
      <div className={`${styles.messageBubble} ${isUser ? styles.userMessage : styles.assistantMessage}`}>
        <div className={styles.messageMeta}>
          {isUser ? <LuUser size={13} aria-hidden /> : <LuActivity size={13} aria-hidden />}
          <Text type="secondary">{isUser ? 'You' : 'Business Health'}</Text>
        </div>
        {content ? <Paragraph className={styles.messageText}>{content}</Paragraph> : null}
        {children}
      </div>
    </div>
  );
}

export function OwnerAssistantMessageList({ answer, disabledFollowUps, loading, messages, onSuggestedQuestion, pendingQuestion }: {
  answer: OwnerBusinessAssistantAnswer | null;
  disabledFollowUps?: boolean;
  loading?: boolean;
  messages?: ThreadMessage[];
  onSuggestedQuestion?: (question: OwnerBusinessHealthQuestion) => void;
  pendingQuestion?: string | null;
}) {
  const visibleMessages = (messages || []).slice(-8);
  const hasPendingQuestion = Boolean(pendingQuestion?.trim())
    && !visibleMessages.some((message) => message.role === 'user' && message.content === pendingQuestion);
  const hasAnswerInMessages = Boolean(answer?.answerId)
    && visibleMessages.some((message) => message.answerId === answer?.answerId);
  const displayMessages: ThreadMessage[] = [
    ...visibleMessages,
    ...(hasPendingQuestion ? [{
      id: 'pending-user-question',
      role: 'user',
      content: pendingQuestion || '',
    }] : []),
    ...(answer && !hasAnswerInMessages ? [{
      id: `answer-${answer.answerId}`,
      role: 'assistant',
      content: answer.text,
      answerId: answer.answerId,
      confidence: answer.confidence,
      freshnessLabel: answer.freshnessLabel,
      suggestedQuestions: answer.suggestedQuestions,
    }] : []),
  ];

  if (displayMessages.length) {
    const displayLatestAssistantIndex = displayMessages.reduce((latest, message, index) => (
      message.role === 'user' ? latest : index
    ), -1);

    return (
      <div className={styles.messageBox}>
        <div className={styles.messageStack}>
          {displayMessages.map((message, index) => (
            <OwnerAssistantBubble
              content={message.content}
              key={message.id || `${message.role || 'message'}-${index}`}
              role={message.role === 'user' ? 'user' : 'assistant'}
            >
              {message.freshnessLabel ? (
                <Space wrap className={styles.answerMeta}>
                  <OwnerAssistantFreshnessLabel label={message.freshnessLabel} />
                </Space>
              ) : null}
              {index === displayLatestAssistantIndex ? (
                <FollowUpQuestions
                  disabled={disabledFollowUps}
                  loading={loading}
                  onAsk={onSuggestedQuestion}
                  questions={message.suggestedQuestions}
                />
              ) : null}
            </OwnerAssistantBubble>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.messageBox}>
      {answer ? (
        <OwnerAssistantBubble content={answer.text} role="assistant">
          <Space wrap className={styles.answerMeta}>
            <OwnerAssistantFreshnessLabel label={answer.freshnessLabel} />
          </Space>
          <FollowUpQuestions
            disabled={disabledFollowUps}
            loading={loading}
            onAsk={onSuggestedQuestion}
            questions={answer.suggestedQuestions}
          />
        </OwnerAssistantBubble>
      ) : (
        <div className={styles.assistantEmpty}>
          <span className={styles.emptyIcon} aria-hidden>
            <LuSparkles size={18} />
          </span>
          <Text type="secondary">Choose a question or ask about your business.</Text>
        </div>
      )}
    </div>
  );
}
