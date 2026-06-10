import { Button, Card, Empty, Space, Tag, Typography, message } from 'antd';
import { FEATURE_FLAGS } from '@config/features';
import { useRouter } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import { LuCheckCheck, LuExternalLink, LuX } from 'react-icons/lu';
import type { OwnerBusinessHealthCheck } from '@lib/ownerBusinessAssistant/types';
import { buildOwnerBusinessHealthCheckStateKey } from '@lib/ownerBusinessAssistant/checkStateStorage';
import {
  getOwnerBusinessCheckActionLabel,
  getOwnerBusinessCheckOwnerMessage,
} from '@lib/ownerBusinessAssistant/businessSignals';
import { useOwnerBusinessAssistantAction } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAction';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function BusinessHealthPriorityChecks({ checks, localDate, projectId, storeScopeKey }: {
  checks?: OwnerBusinessHealthCheck[];
  localDate?: string;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const router = useRouter();
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const effectiveStoreScopeKey = storeScopeKey || storeDetails?.storeId;
  const { runAction, isLoading } = useOwnerBusinessAssistantAction(projectId, effectiveStoreScopeKey);
  const [suppressedCheckIds, setSuppressedCheckIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    return new Set((checks || [])
      .filter((check) => window.localStorage.getItem(buildOwnerBusinessHealthCheckStateKey({
        checkId: check.id,
        localDate,
        projectId,
        storeId: effectiveStoreScopeKey,
      })))
      .map((check) => check.id));
  });
  const canNavigate = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_NAVIGATION;
  const canUpdateChecks = FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT
    && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_CHECK_WORKFLOW;
  const visibleChecks = useMemo(
    () => (checks || []).filter((check) => !suppressedCheckIds.has(check.id)),
    [checks, suppressedCheckIds],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSuppressedCheckIds(new Set((checks || [])
      .filter((check) => window.localStorage.getItem(buildOwnerBusinessHealthCheckStateKey({
        checkId: check.id,
        localDate,
        projectId,
        storeId: effectiveStoreScopeKey,
      })))
      .map((check) => check.id)));
  }, [checks, effectiveStoreScopeKey, localDate, projectId]);

  if (!visibleChecks.length) {
    return (
      <Card title="Needs attention" className={styles.dashboardCard}>
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No action needed" />
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
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(buildOwnerBusinessHealthCheckStateKey({
          checkId: check.id,
          localDate,
          projectId,
          storeId: effectiveStoreScopeKey,
        }), operation);
      }
      setSuppressedCheckIds((previous) => new Set(previous).add(check.id));
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
    <Card title="Needs attention" className={styles.dashboardCard}>
      <div className={styles.checkList}>
        {visibleChecks.map((check) => (
          <div className={styles.checkItem} key={check.id}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space align="start" style={{ justifyContent: 'space-between', width: '100%' }}>
                <Text strong>{check.title}</Text>
                <Tag color={check.priority === 'high' ? 'error' : check.priority === 'medium' ? 'warning' : 'processing'}>
                  {getOwnerBusinessCheckActionLabel(check)}
                </Tag>
              </Space>
              <Text>{getOwnerBusinessCheckOwnerMessage(check)}</Text>
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
