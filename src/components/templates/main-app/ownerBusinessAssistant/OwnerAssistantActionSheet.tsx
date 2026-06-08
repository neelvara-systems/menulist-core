import { Button, Space, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { LuArrowRight, LuFileEdit } from 'react-icons/lu';
import type { OwnerBusinessAssistantActionOption } from '@lib/ownerBusinessAssistant/types';
import { useOwnerBusinessAssistantAction } from '@hook/ownerBusinessAssistant/useOwnerBusinessAssistantAction';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function OwnerAssistantActionSheet({ actions, projectId }: {
  actions?: OwnerBusinessAssistantActionOption[];
  projectId?: string;
}) {
  const router = useRouter();
  const { runAction, isLoading } = useOwnerBusinessAssistantAction(projectId);

  if (!actions?.length) return null;

  const handleAction = async (action: OwnerBusinessAssistantActionOption) => {
    try {
      if (action.href || action.riskLevel === 'navigate') {
        const result = await runAction({
          operation: 'navigate',
          actionType: action.actionType,
          targetKind: action.targetKind,
          targetId: action.targetId,
        });
        if (result.href) router.push(result.href);
        return;
      }

      const result = await runAction({
        operation: 'prepare',
        actionType: action.actionType,
        targetKind: action.targetKind,
        targetId: action.targetId,
      });
      message.info(result.message);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Action failed');
    }
  };

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Text type="secondary">Actions</Text>
      <div className={styles.actionRow}>
        {actions.slice(0, 4).map((action) => (
          <Button
            key={`${action.actionType}-${action.targetId || 'store'}`}
            icon={action.riskLevel === 'navigate' ? <LuArrowRight /> : <LuFileEdit />}
            onClick={() => handleAction(action)}
            loading={isLoading}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </Space>
  );
}
