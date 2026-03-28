import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, ExecutionSurface, ExportMethod, SURFACE_BUTTON_COPY, TodayCampaignSummary } from "@type/campaigns";
import { getExportMethod, getMealName } from "@util/campaignUtils";
import { Button, Card } from "antd";
import { useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import styles from "../../styles.module.scss";

interface PrimaryCardProps {
    campaign: TodayCampaignSummary;
    onComplete: (campaignId: string, projectId: string, campaignType: CampaignType, surface: ExecutionSurface, method: ExportMethod) => void;
    onSkip: (campaignId: string, campaignType: CampaignType) => void;
    isProcessing: boolean;
}

/**
 * Primary Campaign Card
 * The main action for today - one card only
 * 
 * Philosophy:
 * - One action, no scrolling
 * - Affirmative, present tense
 * - No explanations, no metrics
 */
const PrimaryCard = ({ campaign, onComplete, onSkip, isProcessing }: PrimaryCardProps) => {
    const { campaignId, projectId, type, subject, primarySurface } = campaign;

    // Desktop detection for WhatsApp hint (ChatGPT Review Fix #6)
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        setIsDesktop(window.innerWidth > 768);
    }, []);

    const isWhatsAppSurface = primarySurface === 'whatsapp_status' || primarySurface === 'whatsapp_message';

    const mealName = getMealName();
    const actionTitle = ACTION_TITLES[type]
        .replace('{itemName}', subject.itemName || 'Item')
        .replace('{mealName}', mealName)
        .replace('{festivalName}', 'the occasion'); // Generic - festivals are rare

    const contextText = CONTEXT_TEMPLATES[type]
        .replace('{mealName}', mealName.toLowerCase())
        .replace('{festivalName}', 'the occasion');

    const buttonText = SURFACE_BUTTON_COPY[primarySurface];

    const handlePrimaryAction = () => {
        const method = getExportMethod(primarySurface);
        // Pass all data we already have - no refetch needed
        onComplete(campaignId, projectId, type, primarySurface, method);
    };

    const handleSkip = () => {
        // Pass campaignType - no refetch needed
        onSkip(campaignId, type);
    };

    return (
        <Card className={styles.primaryCard} bordered={false}>
            {/* Action Title - Affirmative, present tense */}
            <div className={styles.actionTitle}>
                <LuCheck />
                {actionTitle}
            </div>

            {/* Item Name - Largest text, anchor */}
            <h3 className={styles.itemName}>
                {subject.itemName || 'Menu Item'}
            </h3>

            {/* Context - Quiet, operational, no numbers */}
            <p className={styles.context}>
                {contextText}
            </p>

            {/* Action Buttons */}
            <div className={styles.actionButtons}>
                <Button
                    type="primary"
                    size="large"
                    block
                    loading={isProcessing}
                    onClick={handlePrimaryAction}
                >
                    {buttonText}
                </Button>

                {/* Desktop WhatsApp hint (ChatGPT Review Fix #6) */}
                {isDesktop && isWhatsAppSurface && (
                    <p className={styles.desktopHint}>WhatsApp opens on your phone.</p>
                )}

                <Button
                    type="text"
                    block
                    className={styles.skipButton}
                    disabled={isProcessing}
                    onClick={handleSkip}
                >
                    Skip
                </Button>
            </div>
        </Card>
    );
};

export default PrimaryCard;
