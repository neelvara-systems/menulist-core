import { Tag, Tooltip } from 'antd';
import { LuClock } from 'react-icons/lu';
import { useTranslations } from 'next-intl';

export function OwnerAssistantFreshnessLabel({ label }: { label?: string }) {
  const t = useTranslations('Dashboard.owner');
  if (!label) return null;

  return (
    <Tooltip title={t('businessHealth.assistant.cachedFacts')}>
      <Tag icon={<LuClock />} color="default">{label}</Tag>
    </Tooltip>
  );
}
