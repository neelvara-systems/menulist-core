const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const resolveExactSessionRoleAlias = (
    session: unknown,
    field: 'platformRole' | 'role',
): string | null => {
    if (!isRecord(session)) return null;
    const user = isRecord(session.user) ? session.user : {};
    const supplied = [session[field], user[field]]
        .filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return '';
    if (
        supplied.some((value) => typeof value !== 'string' || value.length === 0)
    ) {
        return null;
    }

    const [role] = supplied as string[];
    return supplied.every((value) => value === role) ? role : null;
};

export const resolveExactSessionPlatformRole = (session: unknown): string | null => (
    resolveExactSessionRoleAlias(session, 'platformRole')
);

export const resolveExactSessionStoreRole = (session: unknown): string | null => (
    resolveExactSessionRoleAlias(session, 'role')
);
