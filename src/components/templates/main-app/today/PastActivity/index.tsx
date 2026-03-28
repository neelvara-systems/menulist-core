"use client";

import { getCampaignHistory } from "@database/campaigns";
import { Campaign } from "@type/campaigns";
import { Button, Spin, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LuArrowLeft, LuCheck, LuX } from "react-icons/lu";
import styles from "../styles.module.scss";

const { Title, Text } = Typography;

/**
 * Past Activity Screen
 * 
 * Per Strategy Doc:
 * - Read-only list
 * - Date grouped
 * - No filters
 * - No metrics
 * - No exports
 * 
 * "This is memory, not management."
 * 
 * HARD CONSTRAINTS (ChatGPT Review Fix #2):
 * - Max 7 days visible (prevents analysis behavior)
 * - No sorting options
 * - No filters
 * - No grouping labels like "Completed 5 times"
 * - No counts or statistics
 * - Must feel like "a memory, not a report"
 */
const PastActivityScreen = () => {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                // HARD LIMIT: Max 7 days of history (prevents analysis behavior)
                const history = await getCampaignHistory(20); // ~3 per day max

                // Filter to last 7 days only
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const recentHistory = history.filter(c => {
                    if (!c.resolvedAt) return false;
                    const resolvedDate = c.resolvedAt.toDate();
                    return resolvedDate >= sevenDaysAgo;
                });

                setCampaigns(recentHistory);
            } catch (error) {
                console.error("Failed to load history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, []);

    // Group campaigns by date (simple display, NO counts, NO statistics)
    // HARD RULE: No "Completed X times" labels ever
    const groupedByDate = campaigns.reduce((acc, campaign) => {
        const date = campaign.resolvedAt
            ? new Date(campaign.resolvedAt.toDate()).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            })
            : 'Unknown';

        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(campaign);
        return acc;
    }, {} as Record<string, Campaign[]>);

    // Get display title for campaign (no "campaign" word)
    const getCampaignTitle = (campaign: Campaign): string => {
        switch (campaign.type) {
            case 'todays_special':
                return "Today's Special";
            case 'weekend_pick':
                return "Weekend Pick";
            case 'now_available':
                return `Now Available: ${campaign.subject.itemName || 'Item'}`;
            case 'menu_highlight':
                return "Menu Highlight";
            case 'meal_push':
                return "Meal Push";
            case 'bestseller_boost':
                return "Bestseller";
            case 'slow_item_rescue':
                return "Item Highlight";
            case 'festival':
                return "Festival Special";
            case 'new_item':
                return "New Item";
            default:
                return campaign.subject.itemName || 'Item';
        }
    };

    if (isLoading) {
        return (
            <div className={styles.pastActivityContainer}>
                <div className={styles.header}>
                    <Button
                        type="text"
                        icon={<LuArrowLeft />}
                        onClick={() => router.back()}
                        className={styles.backButton}
                    />
                    <Title level={3}>Past activity</Title>
                </div>
                <div className={styles.loadingState}>
                    <Spin size="large" />
                </div>
            </div>
        );
    }

    if (campaigns.length === 0) {
        return (
            <div className={styles.pastActivityContainer}>
                <div className={styles.header}>
                    <Button
                        type="text"
                        icon={<LuArrowLeft />}
                        onClick={() => router.back()}
                        className={styles.backButton}
                    />
                    <Title level={3}>Past activity</Title>
                </div>
                <div className={styles.emptyState}>
                    <Text type="secondary">No activity yet.</Text>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.pastActivityContainer}>
            <div className={styles.header}>
                <Button
                    type="text"
                    icon={<LuArrowLeft />}
                    onClick={() => router.back()}
                    className={styles.backButton}
                />
                <Title level={3}>Past activity</Title>
            </div>

            <div className={styles.activityList}>
                {Object.entries(groupedByDate).map(([date, dateCampaigns]) => (
                    <div key={date} className={styles.dateGroup}>
                        <div className={styles.dateLabel}>{date}</div>
                        {dateCampaigns.map((campaign) => (
                            <div key={campaign.id} className={styles.activityItem}>
                                {campaign.status === 'completed' ? (
                                    <LuCheck className={`${styles.statusIcon} ${styles.completed}`} />
                                ) : (
                                    <LuX className={`${styles.statusIcon} ${styles.skipped}`} />
                                )}
                                <span className={styles.activityText}>
                                    {getCampaignTitle(campaign)}
                                    {campaign.status === 'skipped' && ' — Skipped'}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PastActivityScreen;
