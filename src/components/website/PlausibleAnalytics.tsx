'use client';

import PlausibleAnalyticsScript from '@/components/shared/analytics/PlausibleAnalyticsScript';

const MENULIST_PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN;
const MENULIST_PLAUSIBLE_SCRIPT_SRC = process.env.NEXT_PUBLIC_MENULIST_PLAUSIBLE_SCRIPT_SRC;

export default function PlausibleAnalytics() {
    return (
        <PlausibleAnalyticsScript
            domain={MENULIST_PLAUSIBLE_DOMAIN}
            scriptId="menulist-plausible-analytics"
            scriptSrc={MENULIST_PLAUSIBLE_SCRIPT_SRC}
        />
    );
}
