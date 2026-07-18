export type CampaignCueCueLayerImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export interface CampaignCueCueLayerImageMetadata {
    height: number;
    mimeType: CampaignCueCueLayerImageMimeType;
    width: number;
}

const hasBytes = (buffer: Buffer, offset: number, values: readonly number[]) => (
    offset >= 0
    && offset + values.length <= buffer.length
    && values.every((value, index) => buffer[offset + index] === value)
);

function readPngMetadata(buffer: Buffer): CampaignCueCueLayerImageMetadata | null {
    if (!hasBytes(buffer, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return null;
    let metadata: CampaignCueCueLayerImageMetadata | null = null;
    let offset = 8;
    while (offset + 12 <= buffer.length) {
        const chunkSize = buffer.readUInt32BE(offset);
        const chunkType = buffer.toString("ascii", offset + 4, offset + 8);
        const dataOffset = offset + 8;
        const nextOffset = dataOffset + chunkSize + 4;
        if (nextOffset > buffer.length) return null;
        if (!metadata) {
            if (chunkType !== "IHDR" || chunkSize !== 13) return null;
            metadata = {
                height: buffer.readUInt32BE(dataOffset + 4),
                mimeType: "image/png",
                width: buffer.readUInt32BE(dataOffset),
            };
        }
        if (chunkType === "IEND") return chunkSize === 0 && nextOffset === buffer.length ? metadata : null;
        offset = nextOffset;
    }
    return null;
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpegMetadata(buffer: Buffer): CampaignCueCueLayerImageMetadata | null {
    if (!hasBytes(buffer, 0, [0xff, 0xd8, 0xff])) return null;
    if (!hasBytes(buffer, buffer.length - 2, [0xff, 0xd9])) return null;
    let offset = 2;
    while (offset + 3 < buffer.length) {
        while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
        if (offset >= buffer.length) return null;
        const marker = buffer[offset];
        offset += 1;
        if (marker === 0xd9 || marker === 0xda) return null;
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
        if (offset + 2 > buffer.length) return null;
        const segmentLength = buffer.readUInt16BE(offset);
        if (segmentLength < 2 || offset + segmentLength > buffer.length) return null;
        if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
            if (segmentLength < 7) return null;
            return {
                height: buffer.readUInt16BE(offset + 3),
                mimeType: "image/jpeg",
                width: buffer.readUInt16BE(offset + 5),
            };
        }
        offset += segmentLength;
    }
    return null;
}

const readUInt24LE = (buffer: Buffer, offset: number) => (
    buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
);

function readWebpMetadata(buffer: Buffer): CampaignCueCueLayerImageMetadata | null {
    if (
        buffer.length < 20
        || buffer.toString("ascii", 0, 4) !== "RIFF"
        || buffer.toString("ascii", 8, 12) !== "WEBP"
    ) return null;
    const declaredSize = buffer.readUInt32LE(4) + 8;
    if (declaredSize !== buffer.length) return null;
    let offset = 12;
    while (offset + 8 <= declaredSize) {
        const chunkType = buffer.toString("ascii", offset, offset + 4);
        const chunkSize = buffer.readUInt32LE(offset + 4);
        const dataOffset = offset + 8;
        if (dataOffset + chunkSize > declaredSize) return null;
        if (chunkType === "VP8X" && chunkSize >= 10) {
            return {
                height: readUInt24LE(buffer, dataOffset + 7) + 1,
                mimeType: "image/webp",
                width: readUInt24LE(buffer, dataOffset + 4) + 1,
            };
        }
        if (chunkType === "VP8L" && chunkSize >= 5 && buffer[dataOffset] === 0x2f) {
            const bits = buffer.readUInt32LE(dataOffset + 1);
            return {
                height: ((bits >> 14) & 0x3fff) + 1,
                mimeType: "image/webp",
                width: (bits & 0x3fff) + 1,
            };
        }
        if (
            chunkType === "VP8 "
            && chunkSize >= 10
            && hasBytes(buffer, dataOffset + 3, [0x9d, 0x01, 0x2a])
        ) {
            return {
                height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
                mimeType: "image/webp",
                width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
            };
        }
        offset = dataOffset + chunkSize + (chunkSize % 2);
    }
    return null;
}

export function readCampaignCueCueLayerImageMetadata(buffer: Buffer): CampaignCueCueLayerImageMetadata {
    const metadata = readPngMetadata(buffer) || readJpegMetadata(buffer) || readWebpMetadata(buffer);
    if (!metadata || !Number.isSafeInteger(metadata.width) || !Number.isSafeInteger(metadata.height) || metadata.width < 1 || metadata.height < 1) {
        throw new Error("Image bytes are invalid or unsupported.");
    }
    return metadata;
}

export function assertCampaignCueCueLayerImageLimits(
    metadata: CampaignCueCueLayerImageMetadata,
    limits: { maxLongEdge: number; maxPixels?: number },
) {
    if (metadata.width > limits.maxLongEdge || metadata.height > limits.maxLongEdge) {
        throw new Error("Image dimensions are too large.");
    }
    if (limits.maxPixels && metadata.width * metadata.height > limits.maxPixels) {
        throw new Error("Image pixel count is too large.");
    }
}
