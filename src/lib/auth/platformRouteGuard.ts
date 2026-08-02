import { MENULIST_PLATFORM_USER_ROLE } from '@constant/user';
import { authOptions } from '@lib/auth';
import { getCurrentUser } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { getServerSession, type Session } from 'next-auth';
import { redirect } from 'next/navigation';

export async function requirePlatformRoleRouteAccess(
    allowedPlatformRoles: readonly string[],
    redirectPath = '/unauthorized',
) {
    const session = await getServerSession(authOptions);
    const sessionPlatformRole = resolveExactSessionPlatformRole(session);

    if (!sessionPlatformRole || !allowedPlatformRoles.includes(sessionPlatformRole)) {
        redirect(redirectPath);
    }
    const currentUser = await getCurrentUser(session);
    if (
        !currentUser
        || currentUser.userData.platformRole !== sessionPlatformRole
    ) {
        redirect(redirectPath);
    }

    return session;
}

export async function requirePlatformAdminRouteAccess(redirectPath = '/unauthorized') {
    return requirePlatformRoleRouteAccess([MENULIST_PLATFORM_USER_ROLE], redirectPath);
}
