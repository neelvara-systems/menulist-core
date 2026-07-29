const MAX_PUBLIC_BUSINESS_PHOTOS = 64;
const MAX_PUBLIC_PHOTO_URL_LENGTH = 4_096;

export function normalizeOBPPublicPhotoUrls(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    let length: number;
    try {
        const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
        length = lengthDescriptor && 'value' in lengthDescriptor
            && typeof lengthDescriptor.value === 'number'
            && Number.isSafeInteger(lengthDescriptor.value)
            && lengthDescriptor.value >= 0
            ? Math.min(lengthDescriptor.value, MAX_PUBLIC_BUSINESS_PHOTOS)
            : 0;
    } catch {
        return [];
    }

    const photos: string[] = [];
    const seen = new Set<string>();
    for (let index = 0; index < length; index += 1) {
        let candidate: unknown;
        try {
            const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
            candidate = descriptor && 'value' in descriptor ? descriptor.value : undefined;
        } catch {
            return [];
        }
        if (typeof candidate !== 'string') continue;

        const photoUrl = candidate.trim();
        if (
            !photoUrl
            || photoUrl.length > MAX_PUBLIC_PHOTO_URL_LENGTH
            || seen.has(photoUrl)
        ) {
            continue;
        }
        seen.add(photoUrl);
        photos.push(photoUrl);
    }

    return photos;
}
