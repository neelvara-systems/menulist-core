import { Button, Card, Empty, Space, Tag, Typography, message } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useRouter } from 'next/navigation';
import { LuCheckCheck, LuExternalLink, LuX } from 'react-icons/lu';
import type { OwnerBusinessHealthCheck } from '@lib/ownerBusinessAssistant/types';
import { useOwnerBusinessAssistantAction } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAction';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthPriorityChecks({ checks, projectId }: {
  checks?: OwnerBusinessHealthCheck[];
  projectId?: string;
}) {
  const router = useRouter();
  const { runAction, isLoading } = useOwnerBusinessAssistantAction(projectId);
  const canNavigate = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION;
  const canUpdateChecks = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW;

  if (!checks?.length) {
    return (
      <Card title="Checks" className={styles.dashboardCard}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No checks need attention" />
      </Card>
    );
  }

  const handleAction = async (check: OwnerBusinessHealthCheck, operation: 'mark_reviewed' | 'dismiss') => {
    try {
      await runAction({
        operation,
        actionType: operation === 'dismiss' ? 'dismiss_health_check' : 'mark_health_check_reviewed',
        targetKind: 'store',
        targetId: check.id,
        payload: { checkId: check.id },
      });
      message.success(operation === 'dismiss' ? 'Dismissed' : 'Marked as reviewed');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Action failed');
    }
  };

  const handleOpen = async (check: OwnerBusinessHealthCheck) => {
    if (!check.actionType) return;

    try {
      const result = await runAction({
        operation: 'navigate',
        actionType: check.actionType,
        targetKind: 'store',
        targetId: check.id,
      });
      if (result.href) router.push(result.href);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Screen could not be opened');
    }
  };

  return (
    <Card title="Checks" className={styles.dashboardCard}>
      <div className={styles.checkList}>
        {checks.map((check) => (
          <div className={styles.checkItem} key={check.id}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text strong>{check.title}</Text>
                <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'default'}>
                  {check.priority}
                </Tag>
              </Space>
              <Text>{check.message}</Text>
              <Space wrap>
                {check.actionType && canNavigate ? (
                  <Button size="small" icon={<LuExternalLink />} loading={isLoading} onClick={() => handleOpen(check)}>
                    Open
                  </Button>
                ) : null}
                {canUpdateChecks ? (
                  <>
                    <Button size="small" icon={<LuCheckCheck />} onClick={() => handleAction(check, 'mark_reviewed')} loading={isLoading}>
                      Reviewed
                    </Button>
                    <Button size="small" icon={<LuX />} onClick={() => handleAction(check, 'dismiss')} loading={isLoading}>
                      Dismiss
                    </Button>
                  </>
                ) : null}
              </Space>
            </Space>
          </div>
        ))}
      </div>
    </Card>
  );
}
