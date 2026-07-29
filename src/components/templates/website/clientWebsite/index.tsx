"use client";
import { CUSTOMER_MENU_REFRESH_EVENT, useMenuFreshness } from "@/hooks/useMenuFreshness";
import { StoreStatusBadge } from "@atoms/StoreStatusBadge";
import { FEATURE_FLAGS } from "@config/features";
import { DEVICE_TYPES_LIST } from "@constant/builder";
import GlobalLanguagesList from "@data/languages";
import { getResolvedAnalyticsPreferences } from "@lib/analytics/preferences";
import { resolvePublicBusinessType } from "@lib/businessIdentity/publicBusinessType";
import { getStoreContextName } from "@lib/businessIdentity/names";
import { normalizePublicLanguageCode, resolveProjectPublicLanguage } from "@lib/localization/publicRenderLanguage";
import { createPublicCustomerTranslator } from "@lib/localization/publicCustomerMessages";
import { getProjectDefaultLanguage } from "@lib/localization/projectContent";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import {
    getPublicMenuSessionStateKey,
    parsePublicMenuScrollY,
} from "@lib/localization/publicMenuSessionState";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import {
    DeviceTypes,
    PageType,
} from "@template/main-app/projects/b2cView/types";
import type { PrecomputedDecisionBlocks } from "@template/main-app/projects/types";
import { StoreDataType } from "@type/platform/store";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import MainContentRenderer from "../mainContentRenderer";
import GoogleSearchConsole from "./GoogleSearchConsole";
import UnifiedAnalyticsTracking from "./UnifiedAnalyticsTracking";
import { APP_THEME_COLOR } from "@constant/common";

// #34: Lazy-load third-party analytics scripts — they are non-critical and should not
// block the initial menu render. Only loaded after hydration (ssr: false).
const GoogleAnalytics = dynamic(() => import("./GoogleAnalytics"), { ssr: false });
const FacebookPixel = dynamic(() => import("./FacebookPixel"), { ssr: false });
const EnhancedEcommerce = dynamic(() => import("./EnhancedEcommerce"), { ssr: false });

// Customer App (Installable PWA) — install prompt + standalone/shortcut analytics.
// Lazy-loaded to keep the menu render lean; the controller itself renders nothing
// when the feature flag is off or the customer is already in standalone mode.
const CustomerAppController = dynamic(
    () => import("@/components/customerApp/CustomerAppController"),
    { ssr: false },
);

interface ClientMenuRendererProps {
    projectData: any;
    storeDetails: StoreDataType;
    precomputedBlocks?: PrecomputedDecisionBlocks | null;
    projectId?: string; // Required for project-wise analytics
    initialLanguage?: string;
    // T5-N-01: R5 Layer resolution analytics — 'layer1' for claimed-slug match,
    // 'layer2' for /menu universal alias fallback. Passed to AnalyticsContext.
    menuResolutionLayer?: 'layer1' | 'layer2';
}

type PublicMenuSessionStorageOperation = "read" | "remove" | "write";
const reportedPublicMenuSessionStorageFailures = new Set<PublicMenuSessionStorageOperation>();

function readSessionValue(key: string | null): string | null {
    if (!key || typeof window === "undefined") return null;
    try {
        return window.sessionStorage.getItem(key);
    } catch (error) {
        if (!reportedPublicMenuSessionStorageFailures.has("read")) {
            reportedPublicMenuSessionStorageFailures.add("read");
            logRuntimeFailure("public_menu_session_state_read_failed", error, {
                keyLength: key.length,
            });
        }
        return null;
    }
}

function removeSessionValue(key: string | null): void {
    if (!key || typeof window === "undefined") return;
    try {
        window.sessionStorage.removeItem(key);
    } catch (error) {
        if (!reportedPublicMenuSessionStorageFailures.has("remove")) {
            reportedPublicMenuSessionStorageFailures.add("remove");
            logRuntimeFailure("public_menu_session_state_remove_failed", error, {
                keyLength: key.length,
            });
        }
    }
}

function writeSessionValue(key: string | null, value: string): void {
    if (!key || typeof window === "undefined") return;
    try {
        window.sessionStorage.setItem(key, value);
    } catch (error) {
        if (!reportedPublicMenuSessionStorageFailures.has("write")) {
            reportedPublicMenuSessionStorageFailures.add("write");
            logRuntimeFailure("public_menu_session_state_write_failed", error, {
                keyLength: key.length,
                valueLength: value.length,
            });
        }
    }
}

function ClientMenuRenderer({
    projectData,
    storeDetails,
    precomputedBlocks,
    projectId,
    initialLanguage,
    menuResolutionLayer,
}: ClientMenuRendererProps) {
    const router = useRouter();
    const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
    const tenantId = storeDetails?.tenantId;
    const storeId = storeDetails?.storeId;
    const brandAccentColor = projectData?.config?.design?.brand?.accentColor || APP_THEME_COLOR;
    const publicBusinessType = resolvePublicBusinessType(
        storeDetails?.businessType,
        storeDetails?.businessIndustry,
    );
    const requestedInitialLanguage = normalizePublicLanguageCode(initialLanguage);
    const defaultLanguage = requestedInitialLanguage
        ? resolveProjectPublicLanguage(projectData, storeDetails, requestedInitialLanguage)
        : getProjectDefaultLanguage(projectData, storeDetails);
    const shouldTrackLanguageUsage = Array.isArray(projectData?.languages) && projectData.languages.length > 1;
    const projectStorageId = projectId || projectData?.projectId;
    const pageStorageKey = getPublicMenuSessionStateKey(tenantId, storeId, projectStorageId, "activePage");
    const languageStorageKey = getPublicMenuSessionStateKey(tenantId, storeId, projectStorageId, "activeLanguage");
    const scrollStorageKey = getPublicMenuSessionStateKey(tenantId, storeId, projectStorageId, "scrollY");

    // G-02 (§11 PUBLIC-ROUTING-DOCTRINE): public path opens directly to the menu.
    // The old intro screen is retired from the public surface per D-01.
    // Default to MENU unconditionally; ignore any legacy stored HOME value.
    const [activePage, setActivePage] = useState<PageType>(PageType.MENU);
    const [activeLanguage, setActiveLanguage] = useState<string>(() => {
        if (requestedInitialLanguage) return defaultLanguage;

        const storedLanguage = readSessionValue(languageStorageKey);
        return storedLanguage
            ? resolveProjectPublicLanguage(projectData, storeDetails, storedLanguage)
            : defaultLanguage;
    });
    const [restoredLanguageStorageKey, setRestoredLanguageStorageKey] = useState(languageStorageKey);
    const customerT = createPublicCustomerTranslator(activeLanguage);
    const storeDisplayName = getStoreContextName(storeDetails, customerT('menu.menuOffering'));
    const handleActiveLanguageChange = useCallback((language: string) => {
        const resolvedLanguage = resolveProjectPublicLanguage(projectData, storeDetails, language);
        setActiveLanguage(resolvedLanguage);

        if (typeof window === "undefined") return;

        try {
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set("lang", resolvedLanguage);
            router.replace(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, { scroll: false });
        } catch {
            // URL state is secondary; visible language state remains updated.
        }
    }, [projectData, router, storeDetails]);
    const activeLanguageName = GlobalLanguagesList.find((language) => language.code === activeLanguage)?.name || activeLanguage.toUpperCase();
    const [activeDeviceType, setActiveDeviceType] = useState<DeviceTypes>(
        DEVICE_TYPES_LIST.MOBILE,
    );

    // Menu Freshness (frozen policy — customer-app_spec.md § Menu Update Behavior)
    // Refresh server components when the tab returns after ≥60s hidden,
    // or when the network reconnects. No listeners, no polling, no new
    // Firestore reads — relies on existing unstable_cache + revalidateTag.
    useMenuFreshness();

    // Persist top-level client state so a router.refresh() remount does not
    // drop the current page/language or bounce the user back to the top.
    useEffect(() => {
        if (restoredLanguageStorageKey === languageStorageKey) return;

        const storedLanguage = requestedInitialLanguage
            ? null
            : readSessionValue(languageStorageKey);
        setActiveLanguage(storedLanguage
            ? resolveProjectPublicLanguage(projectData, storeDetails, storedLanguage)
            : defaultLanguage);
        setRestoredLanguageStorageKey(languageStorageKey);
    }, [
        defaultLanguage,
        languageStorageKey,
        projectData,
        requestedInitialLanguage,
        restoredLanguageStorageKey,
        storeDetails,
    ]);

    useEffect(() => {
        if (requestedInitialLanguage) {
            setActiveLanguage(defaultLanguage);
        }
    }, [requestedInitialLanguage, defaultLanguage]);

    useEffect(() => {
        writeSessionValue(pageStorageKey, activePage);
    }, [pageStorageKey, activePage]);

    useEffect(() => {
        if (restoredLanguageStorageKey !== languageStorageKey) return;
        writeSessionValue(languageStorageKey, activeLanguage);
    }, [activeLanguage, languageStorageKey, restoredLanguageStorageKey]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const saveScrollPosition = () => {
            writeSessionValue(scrollStorageKey, String(window.scrollY));
        };

        const restoreScrollPosition = () => {
            const raw = readSessionValue(scrollStorageKey);
            if (!raw) return;
            const scrollY = parsePublicMenuScrollY(raw);
            if (scrollY === null) {
                removeSessionValue(scrollStorageKey);
                return;
            }
            window.requestAnimationFrame(() => {
                window.scrollTo({ top: scrollY, behavior: "auto" });
            });
        };

        restoreScrollPosition();
        window.addEventListener("scroll", saveScrollPosition, { passive: true });
        window.addEventListener(CUSTOMER_MENU_REFRESH_EVENT, saveScrollPosition);

        return () => {
            window.removeEventListener("scroll", saveScrollPosition);
            window.removeEventListener(CUSTOMER_MENU_REFRESH_EVENT, saveScrollPosition);
        };
    }, [scrollStorageKey]);

    // Effect for device type
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setActiveDeviceType(DEVICE_TYPES_LIST.MOBILE);
            } else if (width < 1024) {
                setActiveDeviceType(DEVICE_TYPES_LIST.TABLET);
            } else {
                setActiveDeviceType(DEVICE_TYPES_LIST.DESKTOP);
            }
        };

        // Set initial device type
        handleResize();

        // Add event listener for window resize
        window.addEventListener("resize", handleResize);

        // Clean up event listener on component unmount
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    return (
        <>
            <GoogleSearchConsole storeDetails={storeDetails} />
            <GoogleAnalytics storeDetails={storeDetails} />
            <FacebookPixel storeDetails={storeDetails} />
            <EnhancedEcommerce storeDetails={storeDetails} />

            {/* Store Status Urgency Badge - Feature #2A
                When ENABLE_OUTPUT_CONTROL is ON, TrustSignals (rendered above by page.tsx)
                becomes the single hours truth surface. StoreStatusBadge is hidden to avoid
                two competing hours displays on the same screen. When output control is off,
                keep the fixed badge for the 5-minute open/close boundary only. It belongs at
                bottom-center so it never competes with the business identity or sticky search.
                @see __docs__/constitution/18-silent-correction-doctrine.md */}
            {FEATURE_FLAGS.ENABLE_HOURS_STATUS_DISPLAY && !FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL && (
                <div
                    style={{
                        position: "fixed",
                        bottom: "calc(16px + env(safe-area-inset-bottom))",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 80,
                        maxWidth: "calc(100vw - 32px)",
                        pointerEvents: "none",
                    }}
                >
                    <StoreStatusBadge
                        activeLanguage={activeLanguage}
                        workingHours={storeDetails?.workingHours}
                        timezone={storeDetails?.timeZone}
                        urgentOnly
                        urgencyWindowMinutes={5}
                    />
                </div>
            )}

            <UnifiedAnalyticsTracking
                storeDetails={storeDetails}
                projectId={projectId}
                activeLanguage={shouldTrackLanguageUsage ? activeLanguage : undefined}
                activeLanguageName={shouldTrackLanguageUsage ? activeLanguageName : undefined}
                menuResolutionLayer={menuResolutionLayer}
            >
                <MainContentRenderer
                    fromPage="main-website"
                    activeDeviceType={activeDeviceType}
                    projectData={projectData}
                    storeDetails={storeDetails}
                    activePage={activePage}
                    setActivePage={setActivePage}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={handleActiveLanguageChange}
                    businessType={publicBusinessType || storeDetails?.businessType}
                    precomputedBlocks={precomputedBlocks}
                    restoreStoredLanguage={!requestedInitialLanguage}
                />
            </UnifiedAnalyticsTracking>

            {/* Customer App (PWA) — install prompt + standalone/shortcut analytics.
                Renders nothing unless feature flag + store-level opt-in + visit threshold
                are all satisfied. Fixed-position overlay; does not affect menu layout. */}
            {storeId && (
                <CustomerAppController
                    activeLanguage={activeLanguage}
                    storeId={storeId}
                    tenantId={storeDetails.tenantId}
                    storeName={storeDisplayName}
                    storeTimeZone={storeDetails.timeZone}
                    businessDayEndTime={storeDetails.businessDayEndTime}
                    themeColor={brandAccentColor}
                    promoteInstallation={
                        (storeDetails as any)?.pwaSettings?.promoteInstallation !== false
                    }
                    trackingEnabled={analyticsPreferences.trackCustomerApp}
                    locationTrackingEnabled={analyticsPreferences.trackLocation}
                />
            )}
        </>
    );
}

export default ClientMenuRenderer;
