import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    normalizeAnswerlatticeRolePermissions,
    type AnswerlatticeRoleDefinition,
    type AnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { createHash } from 'crypto';

export type AnswerlatticeRoleCreationInput = {
    active?: boolean;
    description?: string;
    name: string;
    permissions: Record<string, boolean>;
    requestId: string;
};

export const normalizeAnswerlatticeRoleInputPermissions = (
    permissions: Record<string, boolean>,
): Record<string, boolean> => {
    const knownPermissions: AnswerlatticeRolePermissions = {};
    ANSWERLATTICE_ALL_PERMISSIONS.forEach((permission) => {
        knownPermissions[permission] = permissions[permission] === true;
    });
    return normalizeAnswerlatticeRolePermissions(knownPermissions);
};

export const buildAnswerlatticeRoleCreationFingerprint = (
    input: AnswerlatticeRoleCreationInput,
    tenantId: number,
    storeId: number,
) => createHash('sha256').update(JSON.stringify({
    active: input.active ?? true,
    description: input.description || '',
    name: input.name,
    permissions: normalizeAnswerlatticeRoleInputPermissions(input.permissions),
    requestId: input.requestId,
    storeId,
    tenantId,
})).digest('hex');

export const classifyAnswerlatticeRoleCreationReplay = (
    existingRole: AnswerlatticeRoleDefinition | null,
    requestId: string,
    fingerprint: string,
): 'new' | 'replay' | 'conflict' => {
    if (!existingRole) return 'new';
    return existingRole.creationRequestId === requestId
        && existingRole.creationRequestFingerprint === fingerprint
        ? 'replay'
        : 'conflict';
};
