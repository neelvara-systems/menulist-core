import { CAMPAIGNCUE_PRODUCT_CODE } from "@constant/campaigncue/product";
import {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/scopeDocumentId";
import type { CampaignCueBusinessBrain, CampaignCueWorkspace } from "@type/campaigncue";

const CAMPAIGNCUE_WORKSPACE_ROLES = new Set<CampaignCueWorkspace["defaultRole"]>([
    "owner",
    "admin",
    "marketer",
    "agency_member",
    "reviewer",
    "local_manager",
    "billing_admin",
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value && typeof value === "object" && !Array.isArray(value))
);

const exactScopeAliases = (
    values: unknown[],
    expected: unknown,
    required: boolean,
) => {
    const expectedScope = normalizeStorePermissionScopeDocumentId(expected);
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (!expectedScope || (required && supplied.length === 0)) return false;
    return supplied.every((value) => (
        normalizeStorePermissionScopeDocumentId(value)?.documentId === expectedScope.documentId
    ));
};

const resolveExactStringAliases = (values: unknown[], maxLength: number) => {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;
    const normalized = supplied.map((value) => (
        typeof value === "string" || typeof value === "number" ? String(value) : ""
    ));
    const [first] = normalized;
    return (
        first
        && first.length <= maxLength
        && first.trim() === first
        && normalized.every((value) => value === first)
    ) ? first : null;
};

export class CampaignCueWorkspaceScopeError extends Error {
    constructor() {
        super("CampaignCue workspace access denied.");
        this.name = "CampaignCueWorkspaceScopeError";
    }
}

export function resolveCampaignCueSessionIdentity(
    session: unknown,
): { sId: string; tId: string; userId: string } | null {
    if (!isRecord(session)) return null;
    const workspaceScope = resolveStorePermissionSessionScope(session);
    const user = isRecord(session.user) ? session.user : null;
    const userId = resolveExactStringAliases([session.uId, user?.id], 160);
    return workspaceScope && userId ? {
        sId: workspaceScope.storeScope.documentId,
        tId: workspaceScope.tenantScope.documentId,
        userId,
    } : null;
}

export function resolveCampaignCueSessionStoreRole(
    session: unknown,
    expectedStoreId: unknown,
): string | null {
    if (!isRecord(session)) return null;
    const expectedStoreScope = normalizeStorePermissionScopeDocumentId(expectedStoreId);
    if (!expectedStoreScope) return null;
    const user = isRecord(session.user) ? session.user : null;
    const roleAliases: unknown[] = [session.role, user?.role];

    if (Array.isArray(user?.stores)) {
        user.stores.forEach((candidate) => {
            if (!isRecord(candidate)) return;
            const storeScope = normalizeStorePermissionScopeDocumentId(candidate.storeId);
            if (storeScope?.documentId === expectedStoreScope.documentId) {
                roleAliases.push(candidate.role);
            }
        });
    }

    return resolveExactStringAliases(roleAliases, 64);
}

export function assertCampaignCueStoreRecordScope(
    value: unknown,
    expected: { sId: unknown; tId: unknown },
): Record<string, unknown> {
    if (
        !isRecord(value)
        || !exactScopeAliases([value.tenantId, value.tId], expected.tId, true)
        || !exactScopeAliases([value.storeId, value.sId], expected.sId, false)
        || value.active === false
        || value.deleted === true
        || value.blocked === true
        || value.tenantBlocked === true
        || (isRecord(value.blockDetails) && value.blockDetails.blocked === true)
    ) {
        throw new CampaignCueWorkspaceScopeError();
    }
    return value;
}

export function assertCampaignCueWorkspaceRecordScope(
    value: unknown,
    expected: { sId: unknown; tId: unknown; userId: string; workspaceId: string },
): CampaignCueWorkspace {
    if (!isRecord(value) || !isRecord(value.members)) {
        throw new CampaignCueWorkspaceScopeError();
    }
    const member = value.members[expected.userId];
    if (
        value.id !== expected.workspaceId
        || value.workspaceId !== expected.workspaceId
        || value.productId !== CAMPAIGNCUE_PRODUCT_CODE
        || !exactScopeAliases([value.tId], expected.tId, true)
        || !exactScopeAliases([value.sId], expected.sId, true)
        || !isRecord(member)
        || !CAMPAIGNCUE_WORKSPACE_ROLES.has(member.role as CampaignCueWorkspace["defaultRole"])
        || value.status !== "active"
    ) {
        throw new CampaignCueWorkspaceScopeError();
    }
    return value as unknown as CampaignCueWorkspace;
}

export function assertCampaignCueBusinessBrainRecordScope(
    value: unknown,
    workspaceId: string,
): CampaignCueBusinessBrain {
    if (
        !isRecord(value)
        || value.id !== "default"
        || value.businessBrainId !== "default"
        || value.workspaceId !== workspaceId
    ) {
        throw new CampaignCueWorkspaceScopeError();
    }
    return value as unknown as CampaignCueBusinessBrain;
}
