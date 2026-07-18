import type { ResellerProfile } from '@type/reseller';

const normalizeIdentity = (value: unknown): string => (
    typeof value === 'string' ? value.trim() : ''
);

const normalizeEmail = (value: unknown): string => (
    typeof value === 'string' ? value.toLowerCase().trim() : ''
);

/**
 * Reseller profiles historically used either the Auth UID or a generated
 * document ID. Accept both shapes, but only when the current email and session
 * profile claim still point at the same active profile.
 */
export function isActiveResellerProfileForSession(params: {
    actorId: unknown;
    profile: ResellerProfile | null | undefined;
    sessionEmail: unknown;
    sessionProfileId?: unknown;
}): boolean {
    const actorId = normalizeIdentity(params.actorId);
    const profile = params.profile;
    const profileId = normalizeIdentity(profile?.id);
    const authUserId = normalizeIdentity(profile?.authUserId);
    const sessionProfileId = normalizeIdentity(params.sessionProfileId);
    const sessionEmail = normalizeEmail(params.sessionEmail);
    const profileEmail = normalizeEmail(profile?.email);

    if (
        !profile
        || profile.active !== true
        || !actorId
        || !profileId
        || !sessionEmail
        || profileEmail !== sessionEmail
    ) {
        return false;
    }

    if (
        sessionProfileId
        && sessionProfileId !== profileId
        && sessionProfileId !== authUserId
    ) {
        return false;
    }

    return actorId === profileId
        || actorId === authUserId
        || sessionProfileId === profileId;
}
