'use client';

/**
 * OBP Customer-App Mount — wraps CustomerAppController for OBP surfaces.
 *
 * T2-N-07 / A-10 PUBLIC-ROUTING-DOCTRINE: before this mount the install
 * prompt only appeared on menu pages (ClientMenuRenderer wired the
 * controller inside the menu tree). Owners who disabled
 * `pwaSettings.promoteInstallation` were therefore effectively opting out
 * of something that never applied to OBP surfaces in the first place,
 * and owners who ENABLED it could not prompt customers who were still on
 * the OBP. This mount closes the gap so the flag is respected across ALL
 * three install surfaces (obp | outlet | project).
 *
 * Server-side OBPContent is a server component and cannot call `dynamic()`;
 * this wrapper is a client boundary that defers to the shared
 * CustomerAppController code path.
 *
 * @see __docs__/client-menu/public-routing-doctrine.md §A-10, T2-N-07
 * @see src/components/customerApp/CustomerAppController.tsx
 */

import dynamic from 'next/dynamic';

const CustomerAppController = dynamic(
    () => import('@/components/customerApp/CustomerAppController'),
    { ssr: false },
);

interface Props {
    storeId: string | number;
    tenantId: string | number;
    storeName: string;
    storeTimeZone?: string;
    promoteInstallation: boolean;
    trackingEnabled: boolean;
    themeColor?: string;
}

export default function OBPCustomerAppMount(props: Props) {
    return <CustomerAppController {...props} />;
}
