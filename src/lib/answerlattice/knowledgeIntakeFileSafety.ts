export const ANSWERLATTICE_MAX_DOCX_XML_BYTES = 4 * 1024 * 1024;
export const ANSWERLATTICE_MAX_DOCX_COMPRESSION_RATIO = 200;

type ZipEntrySizeMetadata = {
    compressedSize?: unknown;
    uncompressedSize?: unknown;
};

export function assertAnswerlatticeDocxEntryIsBounded(
    metadata: ZipEntrySizeMetadata | null | undefined,
) {
    let compressedSize: unknown;
    let uncompressedSize: unknown;
    try {
        compressedSize = metadata?.compressedSize;
        uncompressedSize = metadata?.uncompressedSize;
    } catch {
        throw new Error('DOCX size metadata is not available.');
    }
    if (
        typeof compressedSize !== 'number'
        || typeof uncompressedSize !== 'number'
        || !Number.isSafeInteger(compressedSize)
        || !Number.isSafeInteger(uncompressedSize)
        || compressedSize < 0
        || uncompressedSize <= 0
    ) {
        throw new Error('DOCX size metadata is not available.');
    }
    if (uncompressedSize > ANSWERLATTICE_MAX_DOCX_XML_BYTES) {
        throw new Error('DOCX document text is too large for browser-side extraction.');
    }
    if (
        compressedSize === 0
        || uncompressedSize / compressedSize > ANSWERLATTICE_MAX_DOCX_COMPRESSION_RATIO
    ) {
        throw new Error('DOCX compression ratio is not safe for browser-side extraction.');
    }
}

export function isValidAnswerlatticeMediaSignature(bytesInput: Uint8Array, mimeType: string): boolean {
    const bytes = bytesInput.subarray(0, 16);
    const normalized = String(mimeType || '').trim().toLowerCase();
    const asciiAt = (start: number, end: number) => Array.from(bytes.subarray(start, end))
        .map(value => String.fromCharCode(value))
        .join('');
    const text4 = asciiAt(0, 4);
    const text8 = asciiAt(4, 12);
    const container = asciiAt(8, 12);

    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length >= 8
        && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
            .every((value, index) => bytes[index] === value);
    const isGif = text4 === 'GIF8';
    const isWebp = text4 === 'RIFF' && container === 'WEBP';
    const isMpegAudio = text4.startsWith('ID3')
        || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x06) !== 0);
    const isAacAdts = bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
    const isWave = text4 === 'RIFF' && container === 'WAVE';
    const isOgg = text4 === 'OggS';
    const isWebm = bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    const isMp4Like = text8.includes('ftyp');

    switch (normalized) {
        case 'image/jpeg': return isJpeg;
        case 'image/png': return isPng;
        case 'image/gif': return isGif;
        case 'image/webp': return isWebp;
        case 'audio/mpeg':
        case 'audio/mp3': return isMpegAudio;
        case 'audio/wav':
        case 'audio/x-wav': return isWave;
        case 'audio/aac': return isAacAdts;
        case 'audio/mp4':
        case 'audio/m4a':
        case 'audio/x-m4a':
        case 'video/mp4':
        case 'video/x-m4v':
        case 'video/quicktime': return isMp4Like;
        case 'audio/webm':
        case 'video/webm': return isWebm;
        case 'audio/ogg':
        case 'video/ogg': return isOgg;
        default: return false;
    }
}
