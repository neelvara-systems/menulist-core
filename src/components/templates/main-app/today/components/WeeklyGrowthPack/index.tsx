import { logCampaignFailure } from '@lib/campaigns/campaignDiagnostics';
import {
    copyTodayGrowthPackText,
    getTodayGrowthPackCopyLogContext,
    TodayReadyActionKind,
    TodayWeeklyGrowthPack,
    type TodayGrowthPackAsset,
} from '@lib/today/weeklyGrowthPack';
import { Button, Card, Typography, notification } from 'antd';
import { LuAlertTriangle, LuCopy, LuMegaphone, LuShieldCheck } from 'react-icons/lu';
import styles from '../../styles.module.scss';

const { Text } = Typography;

interface WeeklyGrowthPackProps {
    pack: TodayWeeklyGrowthPack;
}

const actionKindLabel: Record<TodayReadyActionKind, string> = {
    critical_fix: 'Fix',
    growth_move: 'Growth',
    trust_move: 'Trust',
};

const actionKindIcon = {
    critical_fix: <LuAlertTriangle />,
    growth_move: <LuMegaphone />,
    trust_move: <LuShieldCheck />,
};

const WeeklyGrowthPack = ({ pack }: WeeklyGrowthPackProps) => {
    const handleCopy = async (asset: TodayGrowthPackAsset) => {
        const copied = await copyTodayGrowthPackText(asset.copy, {
            onFailure: (failureStage, error) => {
                logCampaignFailure(
                    'today_weekly_growth_pack_copy_failed',
                    error,
                    getTodayGrowthPackCopyLogContext(pack, asset, failureStage),
                );
            },
        });
        if (copied) {
            notification.success({
                message: `${asset.title} copied`,
                placement: 'bottomRight',
            });
            return;
        }

        notification.error({
            message: 'Could not copy',
            description: 'Select the text and copy it manually.',
            placement: 'bottomRight',
        });
    };

    return (
        <Card className={styles.weeklyGrowthPackCard} bordered={false}>
            <div className={styles.weeklyGrowthPackHeader}>
                <div>
                    <p className={styles.cardEyebrow}>Ready this week</p>
                    <h3 className={styles.weeklyGrowthPackTitle}>Weekly pack</h3>
                </div>
                <Text type="secondary">{pack.primarySubject}</Text>
            </div>

            <Text className={styles.weeklyGrowthPackSummary} type="secondary">
                {pack.summary}
            </Text>

            <div className={styles.readyActionList}>
                {pack.readyActions.slice(0, 3).map((action) => (
                    <div className={styles.readyActionRow} key={action.id}>
                        <div className={styles.readyActionIcon}>
                            {actionKindIcon[action.kind]}
                        </div>
                        <div className={styles.readyActionBody}>
                            <div className={styles.readyActionTitleRow}>
                                <Text strong>{action.title}</Text>
                                <span className={styles.readyActionBadge}>{actionKindLabel[action.kind]}</span>
                            </div>
                            <Text type="secondary">{action.description}</Text>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.weeklyAssetList}>
                {pack.assets.map((asset) => (
                    <div className={styles.weeklyAssetRow} key={asset.id}>
                        <div className={styles.weeklyAssetContent}>
                            <div className={styles.weeklyAssetTitleRow}>
                                <Text strong>{asset.title}</Text>
                                <Text type="secondary">{asset.destination}</Text>
                            </div>
                            <pre className={styles.weeklyAssetCopy}>{asset.copy}</pre>
                        </div>
                        <Button
                            icon={<LuCopy />}
                            onClick={() => void handleCopy(asset)}
                        >
                            Copy
                        </Button>
                    </div>
                ))}
            </div>
        </Card>
    );
};

export default WeeklyGrowthPack;
