import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { normalizeOwnerSlideCaption, normalizeScreenImageUrl } from "./screenContent";
import {
    generatePrivateScreenToken,
    getPrivateScreenControlDocId,
    type PrivateScreenControlDocument,
} from "./privateScreenControl";
import type {
    DigitalScreenManagementMutation,
    DigitalScreenOwnerSlideTransport,
    DigitalScreenOwnerStateTransport,
} from "./screenManagementContracts";
import { getPublicScreenStateDocId } from "./publicScreenState";
import { isValidScreenToken } from "./utils";
import type { DigitalScreenState, ScreenSlide } from "@type/campaigns";

const MAX_UPLOADS = FEATURE_FLAGS.DIGITAL_SCREENS_MAX_UPLOADS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

interface ScreenManagementScope {
    storeId: string;
    tenantId: string;
}

function timestampToMillis(value: unknown): number | null {
    if (!value || typeof value !== "object") return null;
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== "function") return null;
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) && millis > 0 ? millis : null;
}

function isActiveOwnerSlide(value: unknown, nowMs = Date.now()): value is ScreenSlide {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const slide = value as Partial<ScreenSlide>;
    const expiryMs = timestampToMillis(slide.validUntil);
    return typeof slide.id === "string"
        && slide.id.length > 0
        && slide.id.length <= 128
        && slide.source === "pinned"
        && slide.type === "owner_upload"
        && typeof slide.imageUrl === "string"
        && normalizeScreenImageUrl(slide.imageUrl) === slide.imageUrl
        && typeof slide.confidenceScore === "number"
        && Number.isFinite(slide.confidenceScore)
        && slide.confidenceScore >= 0
        && slide.confidenceScore <= 1
        && slide.availabilityLinked === false
        && slide.availabilityReliability === "high"
        && expiryMs !== null
        && expiryMs > nowMs;
}

function getActiveOwnerSlides(value: unknown): ScreenSlide[] {
    if (!Array.isArray(value)) return [];
    return value.filter(isActiveOwnerSlide).slice(0, MAX_UPLOADS);
}

function normalizeExistingScreen(value: unknown): DigitalScreenState | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const screen = value as Partial<DigitalScreenState>;
    if (
        typeof screen.enabled !== "boolean"
        || timestampToMillis(screen.lastRefreshed) === null
        || !Number.isSafeInteger(screen.contentVersion)
        || Number(screen.contentVersion) < 1
        || timestampToMillis(screen.lastContentChangeAt) === null
        || typeof screen.currentMinConfidence !== "number"
        || !Number.isFinite(screen.currentMinConfidence)
        || screen.currentMinConfidence < 0
        || screen.currentMinConfidence > 1
        || typeof screen.ownerOverrideEnabled !== "boolean"
    ) {
        return null;
    }

    if (screen.screenToken !== undefined && !isValidScreenToken(screen.screenToken)) {
        return null;
    }

    return {
        ...screen,
        pinnedSlides: getActiveOwnerSlides(screen.pinnedSlides),
    } as DigitalScreenState;
}

function serializeOwnerSlide(slide: ScreenSlide): DigitalScreenOwnerSlideTransport {
    const validUntilMs = timestampToMillis(slide.validUntil);
    const { validUntil: _validUntil, ...transport } = slide;
    return {
        ...transport,
        ...(validUntilMs ? { validUntilMs } : {}),
    };
}

function serializeOwnerState(
    screen: DigitalScreenState,
    screenToken: string,
): DigitalScreenOwnerStateTransport {
    const lastRefreshedMs = timestampToMillis(screen.lastRefreshed);
    const lastContentChangeAtMs = timestampToMillis(screen.lastContentChangeAt);
    if (!lastRefreshedMs || !lastContentChangeAtMs || !isValidScreenToken(screenToken)) {
        throw new Error("digital_screen_owner_state_invalid");
    }

    const screenLastSeenAtMs = timestampToMillis(screen.screenLastSeenAt);
    return {
        contentVersion: screen.contentVersion,
        currentMinConfidence: screen.currentMinConfidence,
        enabled: screen.enabled,
        lastContentChangeAtMs,
        lastRefreshedMs,
        ownerOverrideEnabled: screen.ownerOverrideEnabled,
        pinnedSlides: getActiveOwnerSlides(screen.pinnedSlides).map(serializeOwnerSlide),
        ...(screenLastSeenAtMs ? { screenLastSeenAtMs } : {}),
        screenToken,
    };
}

function buildPublicState(storeId: string, screen: DigitalScreenState, now: FirebaseFirestore.Timestamp) {
    return {
        contentVersion: Math.max(1, Math.floor(Number(screen.contentVersion || 1))),
        enabled: screen.enabled === true,
        lastContentChangeAt: screen.lastContentChangeAt || now,
        storeId,
        updatedAt: now,
    };
}

function buildInitialScreen(now: FirebaseFirestore.Timestamp): DigitalScreenState {
    return {
        contentVersion: 1,
        currentMinConfidence: 0,
        enabled: true,
        lastContentChangeAt: now as never,
        lastRefreshed: now as never,
        ownerOverrideEnabled: false,
        pinnedSlides: [],
    };
}

function buildOwnerSlide(slide: DigitalScreenOwnerSlideTransport): ScreenSlide {
    const validUntilMs = Number(slide.validUntilMs);
    const imageUrl = normalizeScreenImageUrl(slide.imageUrl);
    if (
        typeof slide.id !== "string"
        || slide.id.length < 1
        || slide.id.length > 128
        || slide.source !== "pinned"
        || slide.type !== "owner_upload"
        || !imageUrl
        || !Number.isFinite(validUntilMs)
        || validUntilMs <= Date.now()
    ) {
        throw new Error("digital_screen_slide_invalid");
    }

    return {
        id: slide.id,
        source: "pinned",
        type: "owner_upload",
        imageUrl,
        caption: normalizeOwnerSlideCaption(slide.caption),
        confidenceScore: 1,
        availabilityLinked: false,
        availabilityReliability: "high",
        validUntil: admin.firestore.Timestamp.fromMillis(validUntilMs) as never,
    };
}

export async function mutateDigitalScreenOwnerStateServer(
    scope: ScreenManagementScope,
    mutation?: DigitalScreenManagementMutation,
): Promise<DigitalScreenOwnerStateTransport | null> {
    const summaryRef = firestoreAdmin
        .collection(PLATFORM_SUMMARY)
        .doc(`campaigns_${scope.storeId}`);
    const controlRef = firestoreAdmin
        .collection(PLATFORM_SUMMARY)
        .doc(getPrivateScreenControlDocId(scope.storeId));
    const publicRef = firestoreAdmin
        .collection(PLATFORM_SUMMARY)
        .doc(getPublicScreenStateDocId(scope.storeId));

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [summarySnap, controlSnap] = await Promise.all([
            transaction.get(summaryRef),
            transaction.get(controlRef),
        ]);
        const currentRaw = summarySnap.exists ? summarySnap.data()?.screen : null;
        const current = normalizeExistingScreen(currentRaw);
        if (currentRaw && !current) {
            throw new Error("digital_screen_state_invalid");
        }
        if (!current && !controlSnap.exists && mutation?.action !== "initialize") {
            return null;
        }
        if (!current && controlSnap.exists) {
            throw new Error("digital_screen_control_without_state");
        }

        const control = controlSnap.exists
            ? controlSnap.data() as Partial<PrivateScreenControlDocument>
            : null;
        const legacyToken = typeof current?.screenToken === "string" ? current.screenToken : "";
        const existingToken = typeof control?.screenToken === "string" ? control.screenToken : "";
        if (
            controlSnap.exists
            && (
                !isValidScreenToken(existingToken)
                || String(control?.storeId || "") !== scope.storeId
                || String(control?.tenantId || "") !== scope.tenantId
            )
        ) {
            throw new Error("digital_screen_control_scope_invalid");
        }
        if (
            current
            && !controlSnap.exists
            && !isValidScreenToken(legacyToken)
            && mutation?.action !== "initialize"
        ) {
            throw new Error("digital_screen_control_missing");
        }
        const screenToken = isValidScreenToken(existingToken)
            ? existingToken
            : isValidScreenToken(legacyToken)
                ? legacyToken
                : generatePrivateScreenToken();
        const now = admin.firestore.Timestamp.now();
        const { screenToken: _legacyToken, ...screenWithoutToken } = current || buildInitialScreen(now);
        let nextScreen: DigitalScreenState = {
            ...screenWithoutToken,
            pinnedSlides: getActiveOwnerSlides(screenWithoutToken.pinnedSlides),
        };
        const sourceSlideCount = Array.isArray(currentRaw?.pinnedSlides)
            ? currentRaw.pinnedSlides.length
            : 0;
        const expiredSlidesPruned = Boolean(current)
            && sourceSlideCount !== nextScreen.pinnedSlides.length;
        if (expiredSlidesPruned) {
            nextScreen = {
                ...nextScreen,
                contentVersion: nextScreen.contentVersion + 1,
                lastContentChangeAt: now as never,
            };
        }

        if (mutation?.action === "initialize") {
            // The state creation above is the explicit setup mutation.
        } else if (mutation?.action === "update_settings") {
            if (nextScreen.ownerOverrideEnabled !== mutation.ownerOverrideEnabled) {
                nextScreen = {
                    ...nextScreen,
                    contentVersion: nextScreen.contentVersion + 1,
                    lastContentChangeAt: now as never,
                    ownerOverrideEnabled: mutation.ownerOverrideEnabled,
                };
            }
        } else if (mutation?.action === "add_slide") {
            const slide = buildOwnerSlide(mutation.slide);
            const existing = nextScreen.pinnedSlides.find((candidate) => candidate.id === slide.id);
            if (!existing) {
                if (nextScreen.pinnedSlides.length >= MAX_UPLOADS) {
                    throw new Error("digital_screen_slide_limit_reached");
                }
                nextScreen = {
                    ...nextScreen,
                    contentVersion: nextScreen.contentVersion + 1,
                    lastContentChangeAt: now as never,
                    pinnedSlides: [...nextScreen.pinnedSlides, slide],
                };
            }
        } else if (mutation?.action === "remove_slide") {
            const filtered = nextScreen.pinnedSlides.filter((slide) => slide.id !== mutation.slideId);
            if (filtered.length !== nextScreen.pinnedSlides.length) {
                nextScreen = {
                    ...nextScreen,
                    contentVersion: nextScreen.contentVersion + 1,
                    lastContentChangeAt: now as never,
                    pinnedSlides: filtered,
                };
            }
        } else if (mutation?.action === "update_caption") {
            const target = nextScreen.pinnedSlides.find((slide) => slide.id === mutation.slideId);
            if (!target) throw new Error("digital_screen_slide_not_found");
            const caption = normalizeOwnerSlideCaption(mutation.caption);
            if ((target.caption || "") !== caption) {
                nextScreen = {
                    ...nextScreen,
                    contentVersion: nextScreen.contentVersion + 1,
                    lastContentChangeAt: now as never,
                    pinnedSlides: nextScreen.pinnedSlides.map((slide) => (
                        slide.id === mutation.slideId ? { ...slide, caption } : slide
                    )),
                };
            }
        }

        const needsPersistence = Boolean(mutation)
            || !current
            || !controlSnap.exists
            || Boolean(legacyToken)
            || expiredSlidesPruned;
        if (!needsPersistence) {
            return serializeOwnerState(nextScreen, screenToken);
        }

        transaction.set(summaryRef, { screen: nextScreen }, { merge: true });
        transaction.set(controlRef, {
            createdAt: control?.createdAt || now,
            screenToken,
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            updatedAt: now,
        } satisfies PrivateScreenControlDocument, { merge: false });
        transaction.set(publicRef, buildPublicState(scope.storeId, nextScreen, now), { merge: false });

        return serializeOwnerState(nextScreen, screenToken);
    });
}
