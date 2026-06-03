"use client";

import PublicMenuListAttribution from "@/components/customer/PublicMenuListAttribution";

interface ScreenAttributionProps {
    activePlanType?: string | null;
}

export default function ScreenAttribution({ activePlanType }: ScreenAttributionProps) {
    return (
        <PublicMenuListAttribution
            activePlanType={activePlanType}
            mode="compact"
            mutedColor="rgba(226, 232, 240, 0.58)"
            containerStyle={{
                bottom: 18,
                marginTop: 0,
                paddingBottom: 0,
                pointerEvents: "none",
                position: "fixed",
                right: 24,
                zIndex: 95,
            }}
        />
    );
}
