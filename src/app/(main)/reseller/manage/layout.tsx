import type { ReactNode } from 'react';
import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';

type ResellerManageLayoutProps = {
    children: ReactNode;
};

export default async function ResellerManageLayout({ children }: ResellerManageLayoutProps) {
    await requirePlatformAdminRouteAccess('/dashboard');

    return <>{children}</>;
}
