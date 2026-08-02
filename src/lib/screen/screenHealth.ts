import {
    screenTimestampToDate,
    type DigitalScreenSeenTimestamp,
} from "./screenTimestamp";
import type { DigitalScreenModeSeenReceipt } from "@type/campaigns";

const RECENT_SCREEN_WINDOW_MS = 36 * 60 * 60 * 1000;
const MAX_SCREEN_CLOCK_SKEW_MS = 5 * 60 * 1000;

export type DigitalScreenHealthState = "link_ready" | "recent" | "stale";

export interface DigitalScreenHealth {
    detail: string;
    state: DigitalScreenHealthState;
    summary: string;
}

export type DigitalScreenModeHealthState =
    | "current"
    | "link_ready"
    | "pending"
    | "stale";

export interface DigitalScreenModeHealth {
    detail: string;
    state: DigitalScreenModeHealthState;
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

function formatOpenedDetail(date: Date, nowMs: number): string {
    return formatSeenDetail(date, nowMs).replace(/^Seen/, "Opened");
}

export function getDigitalScreenModeHealth(
    receipt: DigitalScreenModeSeenReceipt | undefined,
    currentContentVersion: number,
    nowMs = Date.now(),
): DigitalScreenModeHealth {
    if (!receipt) {
        return {
            detail: "Waiting for this TV link",
            state: "link_ready",
            summary: "Waiting for TV",
        };
    }

    const date = screenTimestampToDate(receipt.seenAt);
    if (
        !date
        || !Number.isSafeInteger(receipt.contentVersion)
        || receipt.contentVersion < 1
        || receipt.contentVersion > currentContentVersion
    ) {
        return {
            detail: "TV status needs checking",
            state: "stale",
            summary: "Check TV",
        };
    }

    if (receipt.contentVersion < currentContentVersion) {
        return {
            detail: "Open the TV link to load the latest update",
            state: "pending",
            summary: "Update not seen",
        };
    }

    const ageMs = nowMs - date.getTime();
    if (ageMs < -MAX_SCREEN_CLOCK_SKEW_MS) {
        return {
            detail: "TV time needs checking",
            state: "stale",
            summary: "Check TV",
        };
    }

    const detail = formatOpenedDetail(date, nowMs);
    if (ageMs <= RECENT_SCREEN_WINDOW_MS) {
        return {
            detail,
            state: "current",
            summary: "Latest update seen",
        };
    }

    return {
        detail,
        state: "stale",
        summary: "Check TV",
    };
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

    const ageMs = nowMs - date.getTime();
    if (ageMs < -MAX_SCREEN_CLOCK_SKEW_MS) {
        return {
            detail: "TV time needs checking",
            state: "stale",
            summary: "Check TV",
        };
    }

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
