'use client';

import { getBusinessOfferingKind } from '@data/shared/businessTypes';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useContext, useMemo } from 'react';

export interface DashboardOfferingLabels {
    offeringLower: string;
    scansLabel: string;
    scansTooltip: string;
    thisMonthLabel: string;
}

/** Dashboard-only terminology that follows both the business type and owner locale. */
export function useDashboardOfferingLabels(): DashboardOfferingLabels {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const t = useTranslations('Dashboard.owner.offering');
    const offeringKind = getBusinessOfferingKind(
        storeDetails?.businessType,
        storeDetails?.businessCategory,
    );

    return useMemo(() => {
        const key = offeringKind === 'menuItem'
            ? 'menu'
            : offeringKind === 'product'
                ? 'product'
                : 'service';

        return {
            offeringLower: t(`${key}.singular`),
            scansLabel: t(`${key}.viewsLabel`),
            scansTooltip: t(`${key}.viewsTooltip`),
            thisMonthLabel: t(`${key}.thisMonthLabel`),
        };
    }, [offeringKind, t]);
}
