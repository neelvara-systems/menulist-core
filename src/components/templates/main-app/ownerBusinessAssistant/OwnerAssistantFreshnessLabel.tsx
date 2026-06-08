import { Tag, Tooltip } from 'antd';
import { LuClock } from 'react-icons/lu';

export function OwnerAssistantFreshnessLabel({ label }: { label?: string }) {
  if (!label) return null;

  return (
    <Tooltip title="Based on cached MenuList business facts">
      <Tag icon={<LuClock />} color="default">{label}</Tag>
    </Tooltip>
  );
}
