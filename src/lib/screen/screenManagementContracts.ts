import { FEATURE_FLAGS } from "@config/features";
import { normalizeScreenImageUrl } from "@lib/screen/screenContent";
import { FIRESTORE_TIMESTAMP_MAX_MILLISECONDS } from "@lib/screen/screenTimestamp";
import { isValidScreenToken } from "@lib/screen/utils";
import type {
    DigitalScreenDisplayMode,
    ScreenSlide,
} from "@type/campaigns";

export { FIRESTORE_TIMESTAMP_MAX_MILLISECONDS } from "@lib/screen/screenTimestamp";

export type DigitalScreenOwnerSlideTransport = Omit<ScreenSlide, "validUntil"> & {
    validUntilMs?: number;
};

export function serializeDigitalScreenOwnerSlideForMutation(
    slide: ScreenSlide,
    validUntilMs: number,
): DigitalScreenOwnerSlideTransport {
    const { validUntil: _validUntil, ...slideTransport } = slide;
    return { ...slideTransport, validUntilMs };
}

export interface DigitalScreenModeSeenReceiptTransport {
    contentVersion: number;
    seenAtMs: number;
}

export type DigitalScreenSeenByModeTransport = Partial<
    Record<DigitalScreenDisplayMode, DigitalScreenModeSeenReceiptTransport>
>;

export interface DigitalScreenOwnerStateTransport {
    contentVersion: number;
    currentMinConfidence: number;
    enabled: boolean;
    lastContentChangeAtMs: number;
    lastRefreshedMs: number;
    ownerOverrideEnabled: boolean;
    pinnedSlides: DigitalScreenOwnerSlideTransport[];
    screenLastSeenAtMs?: number;
    screenSeenByMode?: DigitalScreenSeenByModeTransport;
    screenToken: string;
}

export type DigitalScreenManagementMutation =
    | { action: "initialize" }
    | { action: "update_settings"; ownerOverrideEnabled: boolean }
    | { action: "add_slide"; slide: DigitalScreenOwnerSlideTransport }
    | { action: "remove_slide"; slideId: string }
    | { action: "update_caption"; caption: string; slideId: string };

export interface DigitalScreenManagementResponse {
    screen: DigitalScreenOwnerStateTransport | null;
    success: true;
}

const isValidTimestampMilliseconds = (value: unknown): value is number => (
    Number.isSafeInteger(value)
    && Number(value) > 0
    && Number(value) <= FIRESTORE_TIMESTAMP_MAX_MILLISECONDS
);

const isDigitalScreenOwnerSlideTransport = (
    value: unknown,
): value is DigitalScreenOwnerSlideTransport => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const slide = value as Partial<DigitalScreenOwnerSlideTransport>;
    return typeof slide.id === "string"
        && slide.id.length > 0
        && slide.id.length <= 128
        && slide.source === "pinned"
        && slide.type === "owner_upload"
        && typeof slide.imageUrl === "string"
        && slide.imageUrl.length > 0
        && slide.imageUrl.length <= 4096
        && normalizeScreenImageUrl(slide.imageUrl) === slide.imageUrl
        && (slide.caption === undefined || (
            typeof slide.caption === "string"
            && slide.caption.length <= 48
        ))
        && typeof slide.confidenceScore === "number"
        && Number.isFinite(slide.confidenceScore)
        && slide.confidenceScore >= 0
        && slide.confidenceScore <= 1
        && slide.availabilityLinked === false
        && slide.availabilityReliability === "high"
        && isValidTimestampMilliseconds(slide.validUntilMs);
};

const DIGITAL_SCREEN_DISPLAY_MODES: DigitalScreenDisplayMode[] = [
    "menu_board",
    "highlights",
];

const isDigitalScreenModeSeenReceiptTransport = (
    value: unknown,
): value is DigitalScreenModeSeenReceiptTransport => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const receipt = value as Partial<DigitalScreenModeSeenReceiptTransport>;
    return Number.isSafeInteger(receipt.contentVersion)
        && Number(receipt.contentVersion) >= 1
        && isValidTimestampMilliseconds(receipt.seenAtMs);
};

const isDigitalScreenSeenByModeTransport = (
    value: unknown,
): value is DigitalScreenSeenByModeTransport => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return Object.keys(record).every((key) => (
        DIGITAL_SCREEN_DISPLAY_MODES.includes(key as DigitalScreenDisplayMode)
        && isDigitalScreenModeSeenReceiptTransport(record[key])
    ));
};

export function isDigitalScreenOwnerStateTransport(
    value: unknown,
): value is DigitalScreenOwnerStateTransport {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const screen = value as Partial<DigitalScreenOwnerStateTransport>;
    return Number.isSafeInteger(screen.contentVersion)
        && Number(screen.contentVersion) >= 1
        && typeof screen.currentMinConfidence === "number"
        && Number.isFinite(screen.currentMinConfidence)
        && screen.currentMinConfidence >= 0
        && screen.currentMinConfidence <= 1
        && typeof screen.enabled === "boolean"
        && isValidTimestampMilliseconds(screen.lastContentChangeAtMs)
        && isValidTimestampMilliseconds(screen.lastRefreshedMs)
        && typeof screen.ownerOverrideEnabled === "boolean"
        && Array.isArray(screen.pinnedSlides)
        && screen.pinnedSlides.length <= FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS
        && screen.pinnedSlides.every(isDigitalScreenOwnerSlideTransport)
        && (screen.screenLastSeenAtMs === undefined
            || isValidTimestampMilliseconds(screen.screenLastSeenAtMs))
        && (screen.screenSeenByMode === undefined
            || (
                isDigitalScreenSeenByModeTransport(screen.screenSeenByMode)
                && Object.values(screen.screenSeenByMode).every((receipt) => (
                    receipt.contentVersion <= Number(screen.contentVersion)
                ))
            ))
        && typeof screen.screenToken === "string"
        && isValidScreenToken(screen.screenToken);
}

export function isDigitalScreenManagementResponse(
    value: unknown,
): value is DigitalScreenManagementResponse {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const response = value as Partial<DigitalScreenManagementResponse>;
    return response.success === true
        && (response.screen === null || isDigitalScreenOwnerStateTransport(response.screen));
}

export type DigitalScreenManagementClientError = {
    error: string;
    status: 400 | 409;
};

export function getDigitalScreenManagementClientError(
    error: unknown,
): DigitalScreenManagementClientError | null {
    const code = error instanceof Error ? error.message : "";
    if (code === "digital_screen_slide_invalid") {
        return { error: "Invalid request", status: 400 };
    }
    if (code === "digital_screen_slide_limit_reached") {
        return { error: "Slide limit reached", status: 409 };
    }
    if (
        code === "digital_screen_slide_not_found"
        || code === "digital_screen_slide_id_conflict"
    ) {
        return { error: "Digital Screen changed. Refresh and try again.", status: 409 };
    }
    return null;
}
