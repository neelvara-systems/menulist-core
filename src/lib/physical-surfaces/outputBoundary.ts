import { validateMenuUrl } from '@lib/menu-kit/types';

const MAX_PHYSICAL_SURFACE_QR_URL_LENGTH = 4_096;

export function normalizePhysicalSurfaceQrUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized || normalized.length > MAX_PHYSICAL_SURFACE_QR_URL_LENGTH) {
        return null;
    }
    return validateMenuUrl(normalized);
}
