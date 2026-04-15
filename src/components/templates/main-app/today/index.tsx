"use client";

import { FEATURE_FLAGS } from "@config/features";
import { useTodayCampaigns } from "@hook/useTodayCampaigns";
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from "@providers/platformProviders/platformGlobalDataProvider";
import { CampaignType, ExecutionSurface, ExportMethod } from "@type/campaigns";
import { Button, Divider, Spin, Typography } from "antd";
import { useContext, useEffect, useState } from "react";
import { LuCalendarOff } from "react-icons/lu";
import OBPLinkCard from "../businessSettings/OBPLinkCard";
import TempStatusCard from "../businessSettings/TempStatusCard";
import EmptyState from "./components/EmptyState";
import OperationalSection from "./components/OperationalSection";
import PostActionState from "./components/PostActionState";
import PrimaryCard from "./components/PrimaryCard";
import StaffPromptSection from "./components/StaffPromptSection";
import StickerSection from "./components/StickerSection";
import TentCardSection from "./components/TentCardSection";
import { useCampaignActions } from "./hooks/useCampaignActions";
import styles from "./styles.module.scss";

const { Title, Text } = Typography;

type ScreenState = "loading" | "action" | "empty" | "post-action";

const TodayScreen = () => {
    const [screenState, setScreenState] = useState<ScreenState>("loading");
    const [lastAction, setLastAction] = useState<"shared" | "skipped" | null>(null);

    const { todayCampaigns, staffPrompt, physicalSurfaces, isLoading, mutate } = useTodayCampaigns();
    const { completeCampaign, skipCampaign, isProcessing } = useCampaignActions();
    const { storeDetails, setStoreDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);

    // Check if feature is enabled
    const isEnabled = FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED;

    useEffect(() => {
        if (isLoading) {
            setScreenState("loading");
            return;
        }

        if (!todayCampaigns || todayCampaigns.isEmpty) {
            setScreenState("empty");
            return;
        }

        if (todayCampaigns.primary || todayCampaigns.operational.length > 0) {
            setScreenState("action");
        } else {
            setScreenState("empty");
        }
    }, [todayCampaigns, isLoading]);

    const handleComplete = async (
        campaignId: string,
        projectId: string,
        campaignType: CampaignType,
        surface: ExecutionSurface,
        method: ExportMethod
    ) => {
        try {
            await completeCampaign(campaignId, projectId, campaignType, surface, method);
            setLastAction("shared");
            setScreenState("post-action");

            // Auto-transition back to empty/action state after 2 seconds
            setTimeout(() => {
                mutate();
                setLastAction(null);
            }, 2000);
        } catch (error) {
            console.error("Failed to complete campaign:", error);
        }
    };

    const handleSkip = async (campaignId: string, campaignType: CampaignType) => {
        try {
            await skipCampaign(campaignId, campaignType);
            // Skip removes immediately, refresh the data
            mutate();
        } catch (error) {
            console.error("Failed to skip campaign:", error);
        }
    };

    // Feature not enabled state
    if (!isEnabled) {
        return (
            <div className={styles.todayContainer}>
                <Title level={2}>Today</Title>
                <div className={styles.emptyState}>
                    <LuCalendarOff className={styles.emptyIcon} />
                    <Text type="secondary">
                        This feature is coming soon.
                    </Text>
                </div>
            </div>
        );
    }

    // Loading state
    if (screenState === "loading") {
        return (
            <div className={styles.todayContainer}>
                <Title level={2}>Today</Title>
                <div className={styles.loadingState}>
                    <Spin size="large" />
                    <Text type="secondary">Preparing...</Text>
                </div>
            </div>
        );
    }

    // Post-action state
    if (screenState === "post-action" && lastAction) {
        return (
            <div className={styles.todayContainer}>
                <Title level={2}>Today</Title>
                <PostActionState action={lastAction} />
            </div>
        );
    }

    // Empty state
    if (screenState === "empty" || !todayCampaigns) {
        return (
            <div className={styles.todayContainer}>
                <Title level={2}>Today</Title>
                <EmptyState />
            </div>
        );
    }

    // Action state
    return (
        <div className={styles.todayContainer}>
            <Title level={2}>Today</Title>

            {/* Primary Campaign */}
            {todayCampaigns.primary && (
                <PrimaryCard
                    campaign={todayCampaigns.primary}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    isProcessing={isProcessing}
                />
            )}

            {/* Staff Prompt Section - Per spec: Read-only, appears below primary card */}
            <StaffPromptSection staffPrompt={staffPrompt} />

            {/* Physical Surfaces - Per spec: Read-only, download only */}
            {physicalSurfaces?.tentCard?.eligible && (
                <TentCardSection
                    tentCard={physicalSurfaces.tentCard}
                    brandName={todayCampaigns.primary?.subject?.itemName}
                />
            )}
            {physicalSurfaces?.counterSticker?.eligible && (
                <StickerSection sticker={physicalSurfaces.counterSticker} />
            )}

            {/* Operational Campaigns (Passive) */}
            {todayCampaigns.operational.length > 0 && (
                <OperationalSection
                    campaigns={todayCampaigns.operational}
                    onComplete={handleComplete}
                    onSkip={handleSkip}
                    isProcessing={isProcessing}
                />
            )}

            {/* Past Activity Link */}
            <Button
                type="link"
                className={styles.historyLink}
                href="/today/history"
            >
                View past activity →
            </Button>

            {/* Operational cards — always visible regardless of campaign state */}
            {storeDetails && (
                <>
                    <Divider />
                    {FEATURE_FLAGS.ENABLE_TEMP_STATUS && (
                        <TempStatusCard
                            storeDetails={storeDetails}
                            setStoreDetails={setStoreDetails}
                        />
                    )}
                    <OBPLinkCard storeDetails={storeDetails} />
                </>
            )}
        </div>
    );
};

export default TodayScreen;
