import {
    screenTimestampToDate,
    type DigitalScreenSeenTimestamp,
} from "./screenTimestamp";

const RECENT_SCREEN_WINDOW_MS = 36 * 60 * 60 * 1000;

export type DigitalScreenHealthState = "link_ready" | "recent" | "stale";

export interface DigitalScreenHealth {
    detail: string;
    state: DigitalScreenHealthState;
    summary: string;
}

function formatSeenDetail(date: Date, nowMs: number): string {
    const minutes = Math.max(0, Math.floor((nowMs - date.getTime()) / 60_000));
    if (minutes < 1) return "Seen just now";
    if (minutes < 60) return `Seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Seen ${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    return `Seen ${days} day${days === 1 ? "" : "s"} ago`;
}

export function getDigitalScreenHealth(
    value?: DigitalScreenSeenTimestamp,
    nowMs = Date.now(),
): DigitalScreenHealth {
    const date = screenTimestampToDate(value);
    if (!date) {
        return {
            detail: "Waiting for first TV",
            state: "link_ready",
            summary: "Link ready",
        };
    }

    const ageMs = Math.max(0, nowMs - date.getTime());
    const detail = formatSeenDetail(date, nowMs);
    if (ageMs <= RECENT_SCREEN_WINDOW_MS) {
        return {
            detail,
            state: "recent",
            summary: "Seen recently",
        };
    }

    return {
        detail,
        state: "stale",
        summary: "Check TV",
    };
}
