import { FILE_SIGNATURES } from "@lib/security/fileSignatures";

export const PROJECT_UPLOAD_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROJECT_UPLOAD_MAX_PDF_BYTES = 50 * 1024 * 1024;

export type ProjectUploadMimeType =
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp";

const PROJECT_UPLOAD_TYPE_ALIASES: Readonly<Record<string, ProjectUploadMimeType>> = {
    "application/pdf": "application/pdf",
    "image/jpeg": "image/jpeg",
    "image/jpg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    pdf: "application/pdf",
    png: "image/png",
    webp: "image/webp",
};

const normalizeProjectUploadMimeType = (value: unknown): ProjectUploadMimeType | null => {
    if (typeof value !== "string") return null;
    return PROJECT_UPLOAD_TYPE_ALIASES[value.trim().toLowerCase()] || null;
};

const getDecodedBase64Size = (payload: string): number => {
    if (!payload || payload.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
        throw new Error("project_file_upload_base64_invalid");
    }

    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    return (payload.length / 4) * 3 - padding;
};

const decodeBase64Prefix = (payload: string): Uint8Array => {
    const prefixLength = Math.min(payload.length, 24);
    const encodedPrefix = payload.slice(0, prefixLength - (prefixLength % 4));
    try {
        const binary = atob(encodedPrefix);
        return Uint8Array.from(binary, (character) => character.charCodeAt(0));
    } catch {
        throw new Error("project_file_upload_base64_invalid");
    }
};

const startsWithSignature = (
    bytes: Uint8Array,
    signatures: readonly (readonly number[])[],
): boolean => signatures.some((signature) => (
    bytes.length >= signature.length
    && signature.every((byte, index) => bytes[index] === byte)
));

const matchesProjectUploadSignature = (
    bytes: Uint8Array,
    mimeType: ProjectUploadMimeType,
): boolean => {
    if (mimeType === "image/webp") {
        return bytes.length >= 12
            && bytes[0] === 0x52
            && bytes[1] === 0x49
            && bytes[2] === 0x46
            && bytes[3] === 0x46
            && bytes[8] === 0x57
            && bytes[9] === 0x45
            && bytes[10] === 0x42
            && bytes[11] === 0x50;
    }

    return startsWithSignature(bytes, FILE_SIGNATURES[mimeType]);
};

export const validateProjectUploadDataUrl = ({
    claimedType,
    dataUrl,
}: {
    claimedType: unknown;
    dataUrl: unknown;
}): { byteSize: number; mimeType: ProjectUploadMimeType } => {
    if (typeof dataUrl !== "string") throw new Error("project_file_upload_data_url_invalid");

    const separatorIndex = dataUrl.indexOf(",");
    if (separatorIndex < 0 || separatorIndex > 64) {
        throw new Error("project_file_upload_data_url_invalid");
    }

    const headerMatch = /^data:([^;,]+);base64$/i.exec(dataUrl.slice(0, separatorIndex));
    const dataUrlMimeType = normalizeProjectUploadMimeType(headerMatch?.[1]);
    const claimedMimeType = normalizeProjectUploadMimeType(claimedType);
    if (!dataUrlMimeType || !claimedMimeType) throw new Error("project_file_upload_type_invalid");
    if (dataUrlMimeType !== claimedMimeType) throw new Error("project_file_upload_type_mismatch");

    const payload = dataUrl.slice(separatorIndex + 1);
    const maxBytes = dataUrlMimeType === "application/pdf"
        ? PROJECT_UPLOAD_MAX_PDF_BYTES
        : PROJECT_UPLOAD_MAX_IMAGE_BYTES;
    if (payload.length > Math.ceil(maxBytes / 3) * 4 + 4) {
        throw new Error("project_file_upload_too_large");
    }

    const byteSize = getDecodedBase64Size(payload);
    if (byteSize <= 0) throw new Error("project_file_upload_empty");
    if (byteSize > maxBytes) throw new Error("project_file_upload_too_large");
    if (!matchesProjectUploadSignature(decodeBase64Prefix(payload), dataUrlMimeType)) {
        throw new Error("project_file_upload_signature_mismatch");
    }

    return { byteSize, mimeType: dataUrlMimeType };
};
