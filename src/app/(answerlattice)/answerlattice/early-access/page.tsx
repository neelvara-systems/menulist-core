import { NAVIGARIONS_ROUTINGS } from '@constant/navigations';
import { requirePlatformAdminRouteAccess } from '@lib/auth/platformRouteGuard';
import { redirect } from 'next/navigation';

export default async function AnswerlatticeEarlyAccessPage() {
    await requirePlatformAdminRouteAccess('/unauthorized?product=answerlattice');
    redirect(NAVIGARIONS_ROUTINGS.PLATFORM_ANSWERLATTICE_EARLY_ACCESS);
}
