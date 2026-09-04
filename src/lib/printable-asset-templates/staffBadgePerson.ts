import type { StaffUserSummary } from '@lib/staffManagement/types';
import type { StoreRoleDataType } from '@type/platform/roles';

export type PrintableStaffBadgePerson = {
    id: string;
    name: string;
    role?: string;
};

const PLACEHOLDER_NAME = /^(name|staff|staff member|staff name|team member|your name)$/i;

function normalizeBadgeText(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maxLength).trim();
    return normalized || undefined;
}
export function resolvePrintableStaffBadgePerson(
    user: StaffUserSummary,
    storeId: number,
    roles: readonly StoreRoleDataType[],
): PrintableStaffBadgePerson | null {
    if (
        !Number.isSafeInteger(storeId)
        || storeId <= 0
        || user.active === false
        || user.authDisabled === true
        || user.deleted === true
    ) {
        return null;
    }

    const name = normalizeBadgeText(user.name, 80);
    if (!name || PLACEHOLDER_NAME.test(name)) return null;

    const mapping = Array.isArray(user.stores)
        ? user.stores.find((candidate) => candidate.storeId === storeId)
        : undefined;
    if (!mapping) return null;

    const roleId = normalizeBadgeText(mapping.role, 120);
    const roleDefinition = roleId
        ? roles.find((role) => role.id === roleId && role.active !== false)
        : undefined;
    const role = normalizeBadgeText(roleDefinition?.name, 80);

    return {
        id: user.id,
        name,
        ...(role ? { role } : {}),
    };
}

export function resolvePrintableStaffBadgePeople(
    users: readonly StaffUserSummary[],
    storeId: number,
    roles: readonly StoreRoleDataType[],
): PrintableStaffBadgePerson[] {
    return users
        .map((user) => resolvePrintableStaffBadgePerson(user, storeId, roles))
        .filter((person): person is PrintableStaffBadgePerson => Boolean(person))
        .sort((left, right) => left.name.localeCompare(right.name));
}
