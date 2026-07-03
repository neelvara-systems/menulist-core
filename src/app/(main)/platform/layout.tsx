import type { ReactNode } from 'react';
import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';

type PlatformLayoutProps = {
    children: ReactNode;
};

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
    await requirePlatformAdminRouteAccess();

    return <>{children}</>;
}
