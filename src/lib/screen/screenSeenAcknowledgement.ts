import { screenTimestampToDate } from "./screenTimestamp";
import type {
    DigitalScreenDisplayMode,
    DigitalScreenModeSeenReceipt,
} from "@type/campaigns";

export type DigitalScreenSeenWriteDecision =
    | "already_seen"
    | "recorded"
    | "stale_version";

export function isDigitalScreenDisplayMode(
    value: unknown,
): value is DigitalScreenDisplayMode {
    return value === "menu_board" || value === "highlights";
}

export function getUtcScreenDateKey(value: unknown): string | null {
    const date = screenTimestampToDate(value);
    return date ? date.toISOString().slice(0, 10) : null;
}

export function getDigitalScreenSeenWriteDecision(input: {
    currentContentVersion: number;
    lastSeenAt?: unknown;
    mode?: DigitalScreenDisplayMode;
    modeReceipt?: DigitalScreenModeSeenReceipt;
    nowMs?: number;
    requestedContentVersion?: number;
}): DigitalScreenSeenWriteDecision {
    const nowMs = input.nowMs ?? Date.now();
    const today = new Date(nowMs).toISOString().slice(0, 10);
    const hasMode = input.mode !== undefined;
    const hasRequestedVersion = input.requestedContentVersion !== undefined;

    if (hasMode !== hasRequestedVersion) return "stale_version";

    if (input.mode && input.requestedContentVersion !== undefined) {
        if (input.requestedContentVersion !== input.currentContentVersion) {
            return "stale_version";
        }
        if (
            input.modeReceipt?.contentVersion === input.requestedContentVersion
            && getUtcScreenDateKey(input.modeReceipt.seenAt) === today
        ) {
            return "already_seen";
        }
        return "recorded";
    }

    return getUtcScreenDateKey(input.lastSeenAt) === today
        ? "already_seen"
        : "recorded";
}
