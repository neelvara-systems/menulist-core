import { Button, Card, Skeleton, Space, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { useContext } from 'react';
import { LuActivity, LuArrowRight } from 'react-icons/lu';
import { useFormatter, useTranslations } from 'next-intl';
import { useOwnerBusinessHealthCurrent } from '@hook/ownerBusinessAssistant/useOwnerBusinessHealthCurrent';
import { getOwnerBusinessHealthDashboardPresentation } from '@lib/ownerBusinessAssistant/dashboardPresentation';
import type { OwnerBusinessHealthCurrentDoc } from '@lib/ownerBusinessAssistant/types';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import styles from './OwnerBusinessAssistant.module.scss';

const { Paragraph, Text, Title } = Typography;

export function BusinessHealthDashboardCard({ current: providedCurrent, isLoading: providedIsLoading, projectId, storeScopeKey }: {
  current?: OwnerBusinessHealthCurrentDoc | null;
  isLoading?: boolean;
  projectId?: string;
  storeScopeKey?: string | number;
}) {
  const router = useRouter();
  const formatter = useFormatter();
  const t = useTranslations('Dashboard.owner');
  const { storeDetails } = useContext(PlatformGlobalDataContext);
  const usesProvidedCurrent = providedCurrent !== undefined || providedIsLoading !== undefined;
  const fallback = useOwnerBusinessHealthCurrent(undefined, storeScopeKey || storeDetails?.storeId, { enabled: !usesProvidedCurrent });
  const current = usesProvidedCurrent ? providedCurrent || null : fallback.current;
  const isLoading = usesProvidedCurrent ? Boolean(providedIsLoading) : fallback.isLoading;
  const healthHref = projectId ? `/business-health?projectId=${encodeURIComponent(projectId)}` : '/business-health';

  if (isLoading && !current) {
    return <Card className={styles.dashboardCard}><Skeleton active paragraph={{ rows: 2 }} /></Card>;
  }

  if (!current) return null;
  const presentation = getOwnerBusinessHealthDashboardPresentation(current, formatter, t);

  return (
    <Card className={styles.dashboardCard}>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Space align="start" size={12}>
          <span className={styles.statusIcon}><LuActivity size={22} /></span>
          <div>
            <Text type="secondary">{presentation.title} · {presentation.statusLabel}</Text>
            <Title level={4} style={{ margin: '4px 0' }}>{presentation.headline}</Title>
            <Paragraph style={{ margin: 0 }}>{presentation.message}</Paragraph>
            {presentation.firstSignal ? (
              <div className={styles.dashboardInlineSignal}>
                <Text strong>{presentation.firstSignal.action}</Text>
                <Text>{presentation.firstSignal.message}</Text>
              </div>
            ) : null}
            {presentation.feedbackLine ? <Text type="secondary">{presentation.feedbackLine}</Text> : null}
            <Text type="secondary">{presentation.freshnessNote}</Text>
          </div>
        </Space>
        <Button icon={<LuArrowRight />} onClick={() => router.push(healthHref)}>
          {t('businessHealth.open')}
        </Button>
      </Space>
    </Card>
  );
}
