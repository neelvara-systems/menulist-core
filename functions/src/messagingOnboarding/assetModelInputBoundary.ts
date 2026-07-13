const INLINE_ASSET_VALIDATION_REQUEST_MAX_BYTES = 18 * 1024 * 1024;
const INLINE_PART_JSON_OVERHEAD_BYTES = 256;

function getBase64EncodedLength(byteLength: number): number {
  return Math.ceil(byteLength / 3) * 4;
}

export function estimateInlineAssetValidationRequestBytes(
  prompt: string,
  fileByteLengths: readonly number[],
): number {
  let estimatedBytes = Buffer.byteLength(prompt, "utf8") + INLINE_PART_JSON_OVERHEAD_BYTES;
  for (const byteLength of fileByteLengths) {
    if (!Number.isSafeInteger(byteLength) || byteLength < 0) return Number.POSITIVE_INFINITY;
    estimatedBytes += getBase64EncodedLength(byteLength) + INLINE_PART_JSON_OVERHEAD_BYTES;
  }
  return estimatedBytes;
}

export function shouldInlineAssetValidationFiles(
  prompt: string,
  fileByteLengths: readonly number[],
): boolean {
  return estimateInlineAssetValidationRequestBytes(prompt, fileByteLengths)
    <= INLINE_ASSET_VALIDATION_REQUEST_MAX_BYTES;
}
