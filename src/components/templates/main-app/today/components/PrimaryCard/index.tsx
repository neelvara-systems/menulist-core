import { ACTION_TITLES, CampaignType, CONTEXT_TEMPLATES, ExecutionSurface, ExportMethod, SURFACE_BUTTON_COPY, TodayCampaignSummary } from "@type/campaigns";
import { getExportMethod, getMealName } from "@util/campaignUtils";
import { Button, Card } from "antd";
import { useEffect, useState } from "react";
import { LuCheck } from "react-icons/lu";
import styles from "../../styles.module.scss";

interface PrimaryCardProps {
    campaign: TodayCampaignSummary;
    onComplete: (campaignId: string, projectId: string, campaignType: CampaignType, surface: ExecutionSurface, method: ExportMethod, itemName?: string) => void;
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
    const surfaceOutcomeText = {
        whatsapp_status: "What you get: a ready update to share on WhatsApp Status today.",
        whatsapp_message: "What you get: a ready WhatsApp message you can send without writing it yourself.",
        print_poster: "What you get: a ready poster to place in-store today.",
        qr_tent: "What you get: a ready table tent customers can scan today.",
        digital_screen: "What you get: a ready screen image to show in-store today.",
    }[primarySurface];

    const handlePrimaryAction = () => {
        const method = getExportMethod(primarySurface);
        // Pass all data we already have - no refetch needed
        onComplete(campaignId, projectId, type, primarySurface, method, subject.itemName);
    };

    const handleSkip = () => {
        // Pass campaignType - no refetch needed
        onSkip(campaignId, type);
    };

    return (
        <Card className={styles.primaryCard} bordered={false}>
            <p className={styles.cardEyebrow}>Main action for today</p>

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

            <p className={styles.cardHelpText}>
                This is the main thing MenuList prepared for today. Tap the button to open the ready output and mark this action as done for today.
            </p>

            <p className={styles.cardOutcomeText}>
                {surfaceOutcomeText}
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
