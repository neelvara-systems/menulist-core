import { getDataUrlMimeType } from './imageProfiles';
import { getBase64FileSize } from '../security/magicBytesValidator';

export interface LegacyImageValidationInput {
    base64: string;
    mimeType: string;
    size: number;
}

export function buildLegacyImageValidationInput(
    dataUrl: string,
    declaredMimeType: string,
): LegacyImageValidationInput {
    const size = getBase64FileSize(dataUrl);
    if (size <= 0) {
        throw new TypeError('legacy_image_upload_data_url_invalid');
    }

    const mimeType = getDataUrlMimeType(dataUrl, declaredMimeType)
        .trim()
        .toLowerCase();
    if (!mimeType) {
        throw new TypeError('legacy_image_upload_mime_type_invalid');
    }

    return {
        base64: dataUrl,
        mimeType,
        size,
    };
}
