import { Alert, Card, message } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessHealthCurrentDoc, OwnerBusinessHealthQuestion } from '@lib/ownerBusinessAssistant/types';
import { useOwnerBusinessAssistantAnswer } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAnswer';
import { useOwnerBusinessAssistantThread } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantThread';
import { BusinessHealthSuggestedQuestions } from './BusinessHealthSuggestedQuestions';
import { OwnerAssistantInput } from './OwnerAssistantInput';
import { OwnerAssistantMessageList } from './OwnerAssistantMessageList';
import styles from './OwnerBusinessAssistant.module.scss';
import { isEnglishDashboardLocale } from '@lib/analytics/ownerDashboardPresentation';
import { useLocale, useTranslations } from 'next-intl';

export function OwnerAssistantPanel({ current, projectId, questions, storeScopeKey }: {
  current?: OwnerBusinessHealthCurrentDoc | null;
  projectId?: string;
  questions?: OwnerBusinessHealthQuestion[];
  storeScopeKey?: string | number;
}) {
  const locale = useLocale();
  const t = useTranslations('Dashboard.owner');
  const { answer, ask, threadId, lastQuestion, isLoading } = useOwnerBusinessAssistantAnswer(projectId, {
    currentRoute: typeof window !== 'undefined' ? window.location.pathname : undefined,
    selectedProjectId: projectId,
  }, storeScopeKey);
  const { messages, refresh: refreshThread } = useOwnerBusinessAssistantThread(threadId, storeScopeKey);
  const isHealthReady = Boolean(current && current.status !== 'not_ready' && current.sourceRefs?.length);
  const canAskSuggested = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS && isHealthReady;
  const canAskFreeText = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT && isHealthReady;
  const showStarterQuestions = !answer && !messages.length;

  const handleAsk = async (question: string, suggestedQuestionId?: string) => {
    if (!isHealthReady) {
      message.info(t('businessHealth.assistant.notReady'));
      return;
    }
    if (suggestedQuestionId && !canAskSuggested) {
      message.info(t('businessHealth.assistant.suggestedUnavailable'));
      return;
    }
    if (!suggestedQuestionId && !canAskFreeText) {
      message.info(t('businessHealth.assistant.freeTextUnavailable'));
      return;
    }
    try {
      const result = await ask(question, suggestedQuestionId);
      if (threadId || result?.threadId) void refreshThread();
    } catch (error) {
      message.error(t('businessHealth.assistant.answerError'));
    }
  };

  const askSuggested = (question: OwnerBusinessHealthQuestion) => {
    handleAsk(question.question, question.id);
  };

  if (!isHealthReady && showStarterQuestions) {
    return null;
  }

  if (!isEnglishDashboardLocale(locale)) {
    return (
      <Card title={t('businessHealth.assistant.title')} className={styles.dashboardCard}>
        <Alert
          message={t('businessHealth.assistant.englishOnlyTitle')}
          description={t('businessHealth.assistant.englishOnlyDescription')}
          showIcon
          type="info"
        />
      </Card>
    );
  }

  return (
    <Card title={t('businessHealth.assistant.title')} className={styles.dashboardCard}>
      <div className={styles.assistantPanel}>
        <OwnerAssistantMessageList
          answer={answer}
          disabledFollowUps={!canAskSuggested}
          loading={isLoading}
          messages={messages}
          onSuggestedQuestion={askSuggested}
          pendingQuestion={lastQuestion?.question}
        />
        {showStarterQuestions ? (
          <BusinessHealthSuggestedQuestions
            disabled={!canAskSuggested}
            loading={isLoading}
            onAsk={askSuggested}
            questions={questions}
          />
        ) : null}
        <OwnerAssistantInput
          onAsk={(question) => handleAsk(question)}
          loading={isLoading}
          disabled={!canAskFreeText}
        />
      </div>
    </Card>
  );
}
