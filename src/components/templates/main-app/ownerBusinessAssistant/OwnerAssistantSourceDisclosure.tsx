import { Collapse, Typography } from 'antd';
import type { OwnerBusinessHealthSourceRef } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';

const { Text } = Typography;

export function OwnerAssistantSourceDisclosure({ sources }: { sources?: OwnerBusinessHealthSourceRef[] }) {
  if (!sources?.length) return null;

  return (
    <Collapse
      className={styles.sourceList}
      size="small"
      ghost
      items={[{
        key: 'sources',
        label: 'Sources',
        children: (
          <div>
            {sources.slice(0, 6).map((source) => (
              <div key={source.id}>
                <Text type="secondary">{source.source}{source.freshnessLabel ? ` · ${source.freshnessLabel}` : ''}</Text>
              </div>
            ))}
          </div>
        ),
      }]}
    />
  );
}
