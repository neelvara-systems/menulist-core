"use client";

import {
    getMinutesUntilStoreStatusChange,
    getStoreStatus,
    StoreStatus,
} from "@lib/hours";
import { createPublicCustomerTranslator } from "@lib/localization/publicCustomerMessages";
import { localizePublicHoursText } from "@lib/localization/publicHoursText";
import { Tag } from "antd";
import { useEffect, useState } from "react";
import type { StoreSpecialHours } from "@type/platform/store";

interface StoreStatusBadgeProps {
    activeLanguage?: string;
    workingHours?: Record<string, string>;
    specialHours?: StoreSpecialHours;
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
    activeLanguage,
    workingHours,
    specialHours,
    timezone,
    showNextChange = true,
    urgentOnly = false,
    urgencyWindowMinutes = 5,
}: StoreStatusBadgeProps) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const [status, setStatus] = useState<StoreStatus | null>(null);
    const [minutesUntilChange, setMinutesUntilChange] = useState<number | null>(
        null,
    );

    useEffect(() => {
        const computeStatus = () => {
            const result = getStoreStatus(workingHours, timezone, undefined, new Date(), specialHours);
            setStatus(result);
            setMinutesUntilChange(
                getMinutesUntilStoreStatusChange(workingHours, timezone, new Date(), specialHours),
            );
        };

        computeStatus();
        const interval = setInterval(computeStatus, 30000);
        return () => clearInterval(interval);
    }, [specialHours, workingHours, timezone]);

    if (!status) return null;
    if (
        (!workingHours || Object.keys(workingHours).length === 0)
        && (!specialHours || Object.keys(specialHours).length === 0)
    ) return null;

    const isUrgentStatusChange =
        minutesUntilChange !== null &&
        minutesUntilChange >= 0 &&
        minutesUntilChange <= urgencyWindowMinutes;

    if (urgentOnly && !isUrgentStatusChange) return null;

    const colorMap: Record<string, string> = {
        Open: "green",
        Closed: "red",
    };

    const localizedStatus = localizePublicHoursText(status.statusText, t);
    const localizedNextChange = localizePublicHoursText(status.nextChange, t);
    const displayText =
        showNextChange && status.nextChange
            ? `${localizedStatus} · ${localizedNextChange}`
            : localizedStatus;

    return (
        <Tag color={colorMap[status.statusText] || "default"} style={{ marginInlineEnd: 0 }}>
            {displayText}
        </Tag>
    );
}

export default StoreStatusBadge;
