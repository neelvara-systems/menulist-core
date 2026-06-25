'use client';

import PlausibleAnalyticsScript from '@/components/shared/analytics/PlausibleAnalyticsScript';

const ANSWERLATTICE_PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN;
const ANSWERLATTICE_PLAUSIBLE_SCRIPT_SRC = process.env.NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_SCRIPT_SRC;

export default function AnswerlatticePlausibleAnalytics() {
    return (
        <PlausibleAnalyticsScript
            domain={ANSWERLATTICE_PLAUSIBLE_DOMAIN}
            scriptId="answerlattice-plausible-analytics"
            scriptSrc={ANSWERLATTICE_PLAUSIBLE_SCRIPT_SRC}
        />
    );
}
