import dayjs from "dayjs";
import React, { useEffect, useMemo, useState } from "react";
import { toDate, type DateLike } from "@util/dateTime";
import {
    createPublicCustomerTranslator,
    getPublicCustomerLocale,
    type PublicCustomerTranslator,
} from "@lib/localization/publicCustomerMessages";

interface LiveIndicatorProps {
    activeLanguage?: string;
    modifiedOn?: DateLike;
    style?: React.CSSProperties;
    label?: string;
}

/**
 * Formats the modifiedOn timestamp into a human-readable string
 * 
 * DECAY RULE (prevents visual noise):
 * - < 1 minute: "updated just now"
 * - 1-59 minutes: "updated X minutes ago"
 * - Same day: "updated today at 3:40 PM"
 * - 1-3 days: "updated X days ago"
 * - > 3 days: null (show only "Live" without time - scarcity creates meaning)
 */
function formatUpdateTime(
    dateObj: Date,
    t: PublicCustomerTranslator,
    activeLanguage?: string,
): string | null {
    const now = dayjs();
    const updated = dayjs(dateObj);
    const diffMinutes = now.diff(updated, 'minute');
    const diffHours = now.diff(updated, 'hour');
    const diffDays = now.diff(updated, 'day');

    // > 3 days: hide update time (keeps "Live" but removes stale timestamp)
    if (diffDays > 3) {
        return null;
    }

    if (diffMinutes < 1) {
        return t('menu.updatedJustNow');
    } else if (diffMinutes < 60) {
        return diffMinutes === 1
            ? t('menu.updatedMinuteAgo')
            : t('menu.updatedMinutesAgo', { count: diffMinutes });
    } else if (diffHours < 24 && updated.isSame(now, 'day')) {
        return t('menu.updatedTodayAt', {
            time: new Intl.DateTimeFormat(getPublicCustomerLocale(activeLanguage), {
                hour: 'numeric',
                minute: '2-digit',
            }).format(dateObj),
        });
    } else {
        return diffDays === 1
            ? t('menu.updatedDayAgo')
            : t('menu.updatedDaysAgo', { count: diffDays });
    }
}

/**
 * Normalizes various timestamp formats to a JS Date
 */
export function normalizeLiveIndicatorTimestamp(value: DateLike, nowMs = Date.now()): Date | null {
    const normalized = toDate(value);
    const timestampMs = normalized.getTime();
    if (!Number.isFinite(timestampMs) || !Number.isFinite(nowMs) || timestampMs > nowMs) return null;
    return normalized;
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({
    activeLanguage,
    modifiedOn,
    style,
    label,
}) => {
    const t = useMemo(
        () => createPublicCustomerTranslator(activeLanguage),
        [activeLanguage],
    );
    const resolvedLabel = label || t('menu.live');
    const [updateText, setUpdateText] = useState<string | null>("");
    const [hasValidDate, setHasValidDate] = useState(false);

    useEffect(() => {
        const dateObj = normalizeLiveIndicatorTimestamp(modifiedOn);
        if (!dateObj) {
            setUpdateText(null);
            setHasValidDate(false);
            return;
        }

        setHasValidDate(true);

        // Initial update
        setUpdateText(formatUpdateTime(dateObj, t, activeLanguage));

        // Update every 30 seconds to keep "just now" / "X minutes ago" fresh
        const interval = setInterval(() => {
            setUpdateText(formatUpdateTime(dateObj, t, activeLanguage));
        }, 30000);

        return () => clearInterval(interval);
    }, [activeLanguage, modifiedOn, t]);

    // No valid date = don't show indicator at all
    if (!hasValidDate) return null;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: '#666',
                ...style
            }}
        >
            {/* Pulsing green dot */}
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#22c55e',
                    animation: 'livePulse 2s ease-in-out infinite',
                }}
            />
            <span style={{ fontWeight: 500, color: '#22c55e' }}>{resolvedLabel}</span>
            {/* Only show separator and time if updateText exists (< 3 days old) */}
            {updateText && (
                <>
                    <span style={{ color: '#999' }}>·</span>
                    <span>{updateText}</span>
                </>
            )}

            {/* CSS animation for pulse */}
            <style>{`
                @keyframes livePulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
};

export default LiveIndicator;
