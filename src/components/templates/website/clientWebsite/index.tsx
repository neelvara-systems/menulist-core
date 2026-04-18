"use client";
import { StoreStatusBadge } from "@atoms/StoreStatusBadge";
import { FEATURE_FLAGS } from "@config/features";
import { DEVICE_TYPES_LIST } from "@constant/builder";
import {
    DeviceTypes,
    PageType,
} from "@template/main-app/projects/b2cView/types";
import { StoreDataType } from "@type/platform/store";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import MainContentRenderer from "../mainContentRenderer";
import GoogleSearchConsole from "./GoogleSearchConsole";
import UnifiedAnalyticsTracking from "./UnifiedAnalyticsTracking";

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
    precomputedBlocks?: any | null; // Precomputed Decision Blocks from Cloud Function
    projectId?: string; // Required for project-wise analytics
}

function ClientMenuRenderer({
    projectData,
    storeDetails,
    precomputedBlocks,
    projectId,
}: ClientMenuRendererProps) {
    const [activePage, setActivePage] = useState<PageType>(PageType.HOME);
    const [activeLanguage, setActiveLanguage] = useState<string>(
        projectData?.languages?.[0]?.code || "en",
    );
    const [activeDeviceType, setActiveDeviceType] = useState<DeviceTypes>(
        DEVICE_TYPES_LIST.MOBILE,
    );

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

            {/* Store Status Badge - Feature #2A
                When ENABLE_OUTPUT_CONTROL is ON, TrustSignals (rendered above by page.tsx)
                becomes the single hours truth surface. StoreStatusBadge is hidden to avoid
                two competing hours displays on the same screen.
                @see __docs__/constitution/18-silent-correction-doctrine.md */}
            {FEATURE_FLAGS.ENABLE_HOURS_STATUS_DISPLAY && !FEATURE_FLAGS.ENABLE_OUTPUT_CONTROL && (
                <div
                    style={{
                        position: "fixed",
                        top: "12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                    }}
                >
                    <StoreStatusBadge
                        workingHours={storeDetails?.workingHours}
                        timezone={storeDetails?.timeZone}
                    />
                </div>
            )}

            <UnifiedAnalyticsTracking
                storeDetails={storeDetails}
                projectId={projectId}
            >
                <MainContentRenderer
                    fromPage="main-website"
                    activeDeviceType={activeDeviceType}
                    projectData={projectData}
                    storeDetails={storeDetails}
                    activePage={activePage}
                    setActivePage={setActivePage}
                    activeLanguage={activeLanguage}
                    setActiveLanguage={setActiveLanguage}
                    businessType={storeDetails?.businessType}
                    precomputedBlocks={precomputedBlocks}
                />
            </UnifiedAnalyticsTracking>

            {/* Customer App (PWA) — install prompt + standalone/shortcut analytics.
                Renders nothing unless feature flag + store-level opt-in + visit threshold
                are all satisfied. Fixed-position overlay; does not affect menu layout. */}
            {storeDetails?.storeId && (
                <CustomerAppController
                    storeId={storeDetails.storeId}
                    tenantId={storeDetails.tenantId}
                    storeName={storeDetails.name || "Menu"}
                    promoteInstallation={
                        (storeDetails as any)?.pwaSettings?.promoteInstallation !== false
                    }
                    trackingEnabled={storeDetails?.analytics?.trackMenuViews !== false}
                />
            )}
        </>
    );
}

export default ClientMenuRenderer;
