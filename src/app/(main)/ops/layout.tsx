import type { ReactNode } from 'react';
import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';

type OpsLayoutProps = {
    children: ReactNode;
};

export default async function OpsLayout({ children }: OpsLayoutProps) {
    await requirePlatformAdminRouteAccess();

    return <>{children}</>;
}
