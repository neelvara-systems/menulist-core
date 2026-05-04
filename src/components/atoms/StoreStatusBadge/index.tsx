"use client";

import {
    getMinutesUntilStoreStatusChange,
    getStoreStatus,
    StoreStatus,
} from "@lib/hours";
import { Tag } from "antd";
import { useEffect, useState } from "react";

interface StoreStatusBadgeProps {
    workingHours?: Record<string, string>;
    timezone?: string;
    showNextChange?: boolean;
    urgentOnly?: boolean;
    urgencyWindowMinutes?: number;
}

/**
 * StoreStatusBadge - Displays "Open" / "Closed" status based on workingHours
 *
 * Feature #2A: Hours Status Display (P0)
 * Uses existing workingHours and timeZone fields from StoreDataType
 *
 * @see __docs__/hours-holiday-accuracy/hours-holiday-accuracy_impl.md
 */
export function StoreStatusBadge({
    workingHours,
    timezone,
    showNextChange = true,
    urgentOnly = false,
    urgencyWindowMinutes = 5,
}: StoreStatusBadgeProps) {
    const [status, setStatus] = useState<StoreStatus | null>(null);
    const [minutesUntilChange, setMinutesUntilChange] = useState<number | null>(
        null,
    );

    useEffect(() => {
        const computeStatus = () => {
            const result = getStoreStatus(workingHours, timezone);
            setStatus(result);
            setMinutesUntilChange(
                getMinutesUntilStoreStatusChange(workingHours, timezone),
            );
        };

        computeStatus();
        const interval = setInterval(computeStatus, 30000);
        return () => clearInterval(interval);
    }, [workingHours, timezone]);

    if (!status) return null;
    if (!workingHours || Object.keys(workingHours).length === 0) return null;

    const isUrgentStatusChange =
        minutesUntilChange !== null &&
        minutesUntilChange >= 0 &&
        minutesUntilChange <= urgencyWindowMinutes;

    if (urgentOnly && !isUrgentStatusChange) return null;

    const colorMap: Record<string, string> = {
        Open: "green",
        Closed: "red",
    };

    const displayText =
        showNextChange && status.nextChange
            ? `${status.statusText} · ${status.nextChange}`
            : status.statusText;

    return (
        <Tag color={colorMap[status.statusText] || "default"}>{displayText}</Tag>
    );
}

export default StoreStatusBadge;
