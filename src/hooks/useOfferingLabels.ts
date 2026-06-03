/**
 * useOfferingLabels — React hook for businessType-aware labels
 *
 * Reads storeDetails.businessType from PlatformGlobalDataContext
 * and returns appropriate offering labels (menu/services/catalog).
 *
 * Usage:
 *   const labels = useOfferingLabels();
 *   <Text>{labels.scansLabel}</Text>  // "Menu Scans" or "Page Views"
 *
 * @see src/lib/menu-kit/businessTypeLabels.ts
 */

import { getOfferingLabels, type OfferingLabels } from '@lib/menu-kit/businessTypeLabels';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext, useMemo } from 'react';

/**
 * Hook that returns businessType-aware labels from the current store context.
 * Falls back to food/restaurant labels if no store context is available.
 */
export function useOfferingLabels(): OfferingLabels {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    return useMemo(
        () => getOfferingLabels(storeDetails?.businessType, storeDetails?.businessCategory),
        [storeDetails?.businessType, storeDetails?.businessCategory]
    );
}
