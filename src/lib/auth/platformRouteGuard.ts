import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { authOptions } from '@lib/auth';
import { getCurrentPlatformUser } from '@lib/auth/currentPlatformUser';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

const getPlatformRoleFromSession = (session: any) => (
    (session as any)?.platformRole || (session?.user as any)?.platformRole
);

export async function requirePlatformRoleRouteAccess(
    allowedPlatformRoles: readonly string[],
    redirectPath = '/unauthorized',
) {
    const session = await getServerSession(authOptions);

    if (!allowedPlatformRoles.includes(getPlatformRoleFromSession(session))) {
        redirect(redirectPath);
    }

    return session;
}

export async function requirePlatformAdminRouteAccess(redirectPath = '/unauthorized') {
    const session = await requirePlatformRoleRouteAccess([ECOMSAI_PLATFORM_USER_ROLE], redirectPath);
    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) redirect(redirectPath);
    return session;
}
