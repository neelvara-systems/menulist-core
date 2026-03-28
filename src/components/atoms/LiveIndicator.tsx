import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Timestamp } from "firebase/firestore";
import React, { useEffect, useState } from "react";

dayjs.extend(relativeTime);

interface LiveIndicatorProps {
    modifiedOn?: Timestamp | Date | string | null;
    style?: React.CSSProperties;
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
function formatUpdateTime(dateObj: Date): string | null {
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
        return "updated just now";
    } else if (diffMinutes < 60) {
        return `updated ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffHours < 24 && updated.isSame(now, 'day')) {
        return `updated today at ${updated.format('h:mm A')}`;
    } else {
        return `updated ${updated.fromNow()}`;
    }
}

/**
 * Normalizes various timestamp formats to a JS Date
 */
function normalizeTimestamp(value: Timestamp | Date | string | null | undefined): Date | null {
    if (!value) return null;

    if (value instanceof Timestamp) {
        return value.toDate();
    } else if (typeof value === "string") {
        return dayjs(value).toDate();
    } else if (typeof value === "object" && value !== null) {
        const seconds = (value as any).seconds || (value as any)._seconds;
        const nanoseconds = (value as any).nanoseconds || (value as any)._nanoseconds;

        if (seconds !== undefined) {
            return new Date(seconds * 1000 + (nanoseconds || 0) / 1000000);
        } else if (value instanceof Date) {
            return value;
        }
        return new Date(value as any);
    }
    return value as Date;
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({ modifiedOn, style }) => {
    const [updateText, setUpdateText] = useState<string | null>("");
    const [hasValidDate, setHasValidDate] = useState(false);

    useEffect(() => {
        const dateObj = normalizeTimestamp(modifiedOn);
        if (!dateObj) {
            setUpdateText(null);
            setHasValidDate(false);
            return;
        }

        setHasValidDate(true);

        // Initial update
        setUpdateText(formatUpdateTime(dateObj));

        // Update every 30 seconds to keep "just now" / "X minutes ago" fresh
        const interval = setInterval(() => {
            setUpdateText(formatUpdateTime(dateObj));
        }, 30000);

        return () => clearInterval(interval);
    }, [modifiedOn]);

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
            <span style={{ fontWeight: 500, color: '#22c55e' }}>Live</span>
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
