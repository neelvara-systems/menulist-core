"use client";

import { FEATURE_FLAGS } from "@config/features";
import { getTodayCampaigns } from "@database/campaigns";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

/**
 * Context to track if Today has a pending action
 * Used by sidebar to show dot indicator
 * 
 * Per Strategy Doc:
 * - A small dot on "Today" tab when action exists
 * - No badge count, no animation
 * - Disappears after completion or skip
 * 
 * ⚠️ HARD RULE (ChatGPT Review Fix #7):
 * The sidebar indicator MUST ONLY show a DOT, NEVER a number.
 * 
 * If a number ever appears, the product starts rotting:
 * - Counts create backlog anxiety
 * - Counts create guilt
 * - Counts create task mentality
 * 
 * DOT = presence (calm)
 * NUMBER = debt (anxiety)
 * 
 * This line must NEVER be crossed. No exceptions.
 */

interface TodayActionContextType {
    hasAction: boolean;
    isLoading: boolean;
    refresh: () => void;
}

const TodayActionContext = createContext<TodayActionContextType>({
    hasAction: false,
    isLoading: true,
    refresh: () => { }
});

export const useTodayAction = () => useContext(TodayActionContext);

export function TodayActionProvider({ children }: { children: ReactNode }) {
    const [hasAction, setHasAction] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const checkTodayAction = async () => {
        // Don't check if feature is disabled
        if (!FEATURE_FLAGS.SOCIAL_CONTENT_ENABLED) {
            setHasAction(false);
            setIsLoading(false);
            return;
        }

        try {
            const todayData = await getTodayCampaigns();
            const hasPending = todayData?.today &&
                !todayData.today.isEmpty &&
                (todayData.today.primary || todayData.today.operational.length > 0);

            setHasAction(!!hasPending);
        } catch (error) {
            console.error("Failed to check today action:", error);
            setHasAction(false);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkTodayAction();

        // Refresh every 5 minutes (low frequency, cheap)
        const interval = setInterval(checkTodayAction, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const refresh = () => {
        setIsLoading(true);
        checkTodayAction();
    };

    return (
        <TodayActionContext.Provider value={{ hasAction, isLoading, refresh }}>
            {children}
        </TodayActionContext.Provider>
    );
}
