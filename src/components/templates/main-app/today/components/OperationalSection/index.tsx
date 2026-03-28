import { ACTION_TITLES, CampaignType, ExecutionSurface, ExportMethod, TodayCampaignSummary } from "@type/campaigns";
import { getExportMethod, getShortButtonText } from "@util/campaignUtils";
import { Button, Card } from "antd";
import { LuCheck } from "react-icons/lu";
import styles from "../../styles.module.scss";

interface OperationalSectionProps {
    campaigns: TodayCampaignSummary[];
    onComplete: (campaignId: string, projectId: string, campaignType: CampaignType, surface: ExecutionSurface, method: ExportMethod) => void;
    onSkip: (campaignId: string, campaignType: CampaignType) => void;
    isProcessing: boolean;
}

/**
 * Operational Section
 * Shows passive campaigns below the primary action
 * 
 * Rules from ChatGPT:
 * - No more than 2
 * - Smaller visual weight
 * - No urgency language
 */
const OperationalSection = ({ campaigns, onComplete, onSkip, isProcessing }: OperationalSectionProps) => {
    // Only show max 2 operational campaigns
    const displayCampaigns = campaigns.slice(0, 2);

    return (
        <div className={styles.operationalSection}>
            <div className={styles.sectionTitle}>Operational</div>

            <div className={styles.operationalCards}>
                {displayCampaigns.map((campaign) => {
                    const { campaignId, projectId, type, subject, primarySurface } = campaign;

                    // Simplified title for operational cards
                    const title = type === 'now_available'
                        ? `Now Available: ${subject.itemName || 'Item'}`
                        : ACTION_TITLES[type].replace('{itemName}', subject.itemName || 'Item');

                    return (
                        <Card key={campaignId} className={styles.operationalCard} bordered={false}>
                            <div className={styles.cardContent}>
                                <div className={styles.cardInfo}>
                                    <LuCheck className={styles.checkMark} />
                                    <div className={styles.cardText}>
                                        <p className={styles.cardTitle}>{title}</p>
                                        {subject.itemName && (
                                            <p className={styles.cardSubtitle}>{subject.itemName}</p>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.cardActions}>
                                    <Button
                                        type="primary"
                                        size="small"
                                        loading={isProcessing}
                                        onClick={() => onComplete(
                                            campaignId,
                                            projectId,
                                            type,
                                            primarySurface,
                                            getExportMethod(primarySurface)
                                        )}
                                    >
                                        {getShortButtonText(primarySurface)}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default OperationalSection;
