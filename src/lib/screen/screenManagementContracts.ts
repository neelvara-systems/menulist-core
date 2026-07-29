import type { ScreenSlide } from "@type/campaigns";

export type DigitalScreenOwnerSlideTransport = Omit<ScreenSlide, "validUntil"> & {
    validUntilMs?: number;
};

export interface DigitalScreenOwnerStateTransport {
    contentVersion: number;
    currentMinConfidence: number;
    enabled: boolean;
    lastContentChangeAtMs: number;
    lastRefreshedMs: number;
    ownerOverrideEnabled: boolean;
    pinnedSlides: DigitalScreenOwnerSlideTransport[];
    screenLastSeenAtMs?: number;
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
