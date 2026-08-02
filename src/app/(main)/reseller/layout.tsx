import type { ReactNode } from 'react';
import { FEATURE_FLAGS } from '@config/features';
import { MENULIST_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { requirePlatformRoleRouteAccess } from '@lib/auth/platformRouteGuard';
import { redirect } from 'next/navigation';

type ResellerLayoutProps = {
    children: ReactNode;
};

export default async function ResellerLayout({ children }: ResellerLayoutProps) {
    if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
        redirect('/dashboard');
    }

    await requirePlatformRoleRouteAccess(
        [MENULIST_PLATFORM_USER_ROLE, RESELLER_USER_ROLE],
        '/dashboard',
    );

    return <>{children}</>;
}
