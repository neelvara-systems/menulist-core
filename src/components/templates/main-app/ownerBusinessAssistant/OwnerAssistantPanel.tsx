import { Card, Space, message } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import { useOwnerBusinessAssistantAnswer } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer';
import { useOwnerBusinessAssistantThread } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantThread';
import { BusinessHealthSuggestedQuestions } from './BusinessHealthSuggestedQuestions';
import { OwnerAssistantActionSheet } from './OwnerAssistantActionSheet';
import { OwnerAssistantInput } from './OwnerAssistantInput';
import { OwnerAssistantMessageList } from './OwnerAssistantMessageList';
import styles from './OwnerBusinessAssistant.module.scss';

export function OwnerAssistantPanel({ projectId, questions }: {
  projectId?: string;
  questions?: OwnerBusinessHealthQuestion[];
}) {
  const { answer, ask, threadId, isLoading } = useOwnerBusinessAssistantAnswer(projectId, {
    currentRoute: typeof window !== 'undefined' ? window.location.pathname : undefined,
    selectedProjectId: projectId,
  });
  const { messages, refresh: refreshThread } = useOwnerBusinessAssistantThread(threadId);

  const handleAsk = async (question: string, suggestedQuestionId?: string) => {
    try {
      await ask(question, suggestedQuestionId);
      if (threadId) void refreshThread();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Business Health could not answer that');
    }
  };

  const askSuggested = (question: OwnerBusinessHealthQuestion) => {
    handleAsk(question.question, question.id);
  };

  return (
    <Card title="Assistant" className={styles.dashboardCard}>
      <div className={styles.assistantPanel}>
        <OwnerAssistantMessageList answer={answer} messages={messages} />
        <OwnerAssistantActionSheet actions={answer?.actions} projectId={projectId} />
        <BusinessHealthSuggestedQuestions
          questions={questions}
          onAsk={askSuggested}
          loading={isLoading}
        />
        <OwnerAssistantInput
          onAsk={(question) => handleAsk(question)}
          loading={isLoading}
          disabled={!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT}
        />
      </div>
    </Card>
  );
}
