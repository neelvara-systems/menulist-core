import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { normalizeAnswerlatticeScopeDocumentId } from './sessionScope';

export type AnswerlatticePlatformWorkspaceOption = {
    label: string;
    name: string;
    sId: number;
    tId: number;
};

export function isCurrentAnswerlatticePlatformWorkspaceOperator(
    value: unknown,
    expectedEmail: string,
): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const user = value as Record<string, unknown>;
    const email = expectedEmail.toLowerCase().trim();
    const documentId = typeof user.id === 'string' ? user.id.trim() : '';
    const userId = user.uId === undefined
        ? documentId
        : typeof user.uId === 'string'
            ? user.uId.trim()
            : '';
    const productIds = [user.pId, user.productId].filter((entry) => entry !== undefined);
    return Boolean(email && documentId && documentId === user.id && userId === documentId)
        && String(user.email || '').toLowerCase().trim() === email
        && productIds.length > 0
        && productIds.every((entry) => entry === 'AL')
        && user.active === true
        && user.isVerified === true
        && user.deleted !== true
        && user.authDisabled !== true
        && user.blocked !== true
        && user.tenantBlocked !== true
        && user.platformRole === 'PLATFORM';
}

const normalizeLabelText = (value: unknown, maxLength: number): string => {
    if (typeof value !== 'string') return '';
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized.slice(0, maxLength);
};

export function buildAnswerlatticePlatformWorkspaceOptions(
    summary: unknown,
): AnswerlatticePlatformWorkspaceOption[] {
    const stores = parseSummaryStores(summary);

    return Object.entries(stores)
        .map(([documentId, value]) => {
            const sId = normalizeAnswerlatticeScopeDocumentId(documentId);
            const tId = normalizeAnswerlatticeScopeDocumentId(value.tId);
            if (!sId || !tId || value.active === false) return null;
            const name = normalizeLabelText(value.name, 120) || `Workspace ${sId}`;
            const tenantName = normalizeLabelText(value.tenantName, 120);
            return {
                label: `${name}${tenantName ? ` · ${tenantName}` : ''} · T${tId} / S${sId}`,
                name,
                sId,
                tId,
            };
        })
        .filter((option): option is AnswerlatticePlatformWorkspaceOption => Boolean(option))
        .sort((a, b) => a.label.localeCompare(b.label));
}

export function parseAnswerlatticePlatformWorkspaceOptionsResponse(
    value: unknown,
): AnswerlatticePlatformWorkspaceOption[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('answerlattice_platform_workspaces_response_invalid');
    }
    const response = value as Record<string, unknown>;
    if (
        Object.keys(response).some((key) => key !== 'workspaces')
        || !Array.isArray(response.workspaces)
        || response.workspaces.length > 10_000
    ) {
        throw new Error('answerlattice_platform_workspaces_response_invalid');
    }

    const seen = new Set<number>();
    return response.workspaces.map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new Error('answerlattice_platform_workspaces_response_invalid');
        }
        const option = entry as Record<string, unknown>;
        const tId = normalizeAnswerlatticeScopeDocumentId(option.tId);
        const sId = normalizeAnswerlatticeScopeDocumentId(option.sId);
        if (
            Object.keys(option).some((key) => !['label', 'name', 'sId', 'tId'].includes(key))
            || !tId
            || !sId
            || seen.has(sId)
            || typeof option.name !== 'string'
            || option.name.length < 1
            || option.name.length > 120
            || typeof option.label !== 'string'
            || option.label.length < 1
            || option.label.length > 300
        ) {
            throw new Error('answerlattice_platform_workspaces_response_invalid');
        }
        seen.add(sId);
        return { label: option.label, name: option.name, sId, tId };
    });
}
