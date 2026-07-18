import { parseStoragePath } from '@lib/storage/pathGenerator';

const MAX_PWA_ICON_BYTES = 5 * 1024 * 1024;

export function assertPreparedPWAIconFile(file: unknown): asserts file is File {
    if (!file || typeof file !== 'object') throw new TypeError('pwa_icon_file_invalid');
    const candidate = file as { name?: unknown; size?: unknown; type?: unknown };
    if (
        typeof candidate.name !== 'string'
        || !candidate.name.trim()
        || typeof candidate.size !== 'number'
        || !Number.isFinite(candidate.size)
        || candidate.size <= 0
        || candidate.size > MAX_PWA_ICON_BYTES
        || candidate.type !== 'image/png'
    ) throw new TypeError('pwa_icon_file_invalid');
}

export const isPWAIconStoragePath = (
    path: unknown,
    scope: { tenantId: number | string; storeId: number | string },
): boolean => {
    const parsed = typeof path === 'string' ? parseStoragePath(path) : null;
    return Boolean(
        parsed
        && parsed.collection === 'stores'
        && parsed.fileType === 'pwa-icons'
        && parsed.tId === String(scope.tenantId)
        && parsed.sId === String(scope.storeId)
    );
};
