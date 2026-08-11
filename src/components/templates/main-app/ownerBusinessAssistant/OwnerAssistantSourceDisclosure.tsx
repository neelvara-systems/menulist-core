import { Collapse, Typography } from 'antd';
import type { OwnerBusinessHealthSourceRef } from '@lib/ownerBusinessAssistant/types';
import styles from './OwnerBusinessAssistant.module.scss';
import { getOwnerBusinessHealthSourcePresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import { useFormatter, useTranslations } from 'next-intl';

const { Text } = Typography;

export function OwnerAssistantSourceDisclosure({ sources }: { sources?: OwnerBusinessHealthSourceRef[] }) {
  const formatter = useFormatter();
  const t = useTranslations('Dashboard.owner');
  if (!sources?.length) return null;

  return (
    <Collapse
      className={styles.sourceList}
      size="small"
      ghost
      items={[{
        key: 'sources',
        label: t('businessHealth.sources.title'),
        children: (
          <div>
            {sources.slice(0, 6).map((source) => {
              const presentation = getOwnerBusinessHealthSourcePresentation(source, formatter, t);
              return <div key={source.id}>
                <Text type="secondary">{presentation.label} · {presentation.freshness}</Text>
              </div>;
            })}
          </div>
        ),
      }]}
    />
  );
}
