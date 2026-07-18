import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const POS_SYNC_SECRET_RESPONSE_JSON_MAX_BYTES = 4 * 1024;

export const POS_SYNC_SECRET_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};

export type PosSyncSecretResponse = {
    secret: string;
    version: number;
};

export function isPosSyncSecretResponse(value: unknown): value is PosSyncSecretResponse {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const response = value as Record<string, unknown>;
    return typeof response.secret === 'string'
        && response.secret.length > 0
        && response.secret.length <= 512
        && typeof response.version === 'number'
        && Number.isSafeInteger(response.version)
        && response.version > 0;
}

export async function readPosSyncSecretResponse(response: Response): Promise<PosSyncSecretResponse> {
    const payload = await readJsonResponseWithLimit<unknown>(response, POS_SYNC_SECRET_RESPONSE_JSON_MAX_BYTES);
    if (!response.ok || !isPosSyncSecretResponse(payload)) {
        const error = new Error('pos_sync_secret_request_rejected') as Error & { status?: number };
        error.status = response.status;
        throw error;
    }
    return payload;
}

export async function requestPosSyncSecret(params: {
    action: 'ensure' | 'read' | 'rotate';
    storeId: string | number;
    tenantId: string | number;
}): Promise<PosSyncSecretResponse> {
    const response = params.action === 'read'
        ? await fetch(
            `/api/pos-sync/secret?storeId=${encodeURIComponent(String(params.storeId))}&tenantId=${encodeURIComponent(String(params.tenantId))}`,
            POS_SYNC_SECRET_REQUEST_POLICY,
        )
        : await fetch('/api/pos-sync/secret', {
            ...POS_SYNC_SECRET_REQUEST_POLICY,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: params.action,
                storeId: Number(params.storeId),
                tenantId: Number(params.tenantId),
            }),
        });
    return readPosSyncSecretResponse(response);
}
