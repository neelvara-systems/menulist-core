export type MessagingUploadContentValidation =
  | { valid: true }
  | { valid: false; reason: "empty_file" | "file_signature_mismatch" };

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return bytes.length >= signature.length
    && signature.every((value, index) => bytes[index] === value);
}

function containsAsciiBrand(bytes: Uint8Array, brands: ReadonlySet<string>): boolean {
  if (bytes.length < 12 || !startsWith(bytes.subarray(4), [0x66, 0x74, 0x79, 0x70])) return false;
  for (let offset = 8; offset + 4 <= Math.min(bytes.length, 64); offset += 4) {
    const brand = String.fromCharCode(
      bytes[offset],
      bytes[offset + 1],
      bytes[offset + 2],
      bytes[offset + 3],
    );
    if (brands.has(brand)) return true;
  }
  return false;
}

function isWebp(bytes: Uint8Array): boolean {
  return startsWith(bytes, [0x52, 0x49, 0x46, 0x46])
    && bytes.length >= 12
    && startsWith(bytes.subarray(8), [0x57, 0x45, 0x42, 0x50]);
}

function hasPdfEof(bytes: Uint8Array): boolean {
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048));
  return Buffer.from(tail).includes(Buffer.from("%%EOF", "ascii"));
}

export function validateMessagingUploadContent(
  bytes: Uint8Array,
  expectedMimeType: string,
): MessagingUploadContentValidation {
  if (bytes.length === 0) return { valid: false, reason: "empty_file" };

  let valid = false;
  switch (expectedMimeType) {
    case "image/jpeg":
      valid = startsWith(bytes, [0xff, 0xd8, 0xff]);
      break;
    case "image/png":
      valid = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      break;
    case "image/webp":
      valid = isWebp(bytes);
      break;
    case "image/heic":
      valid = containsAsciiBrand(bytes, new Set(["heic", "heix", "hevc", "hevx"]));
      break;
    case "image/heif":
      valid = containsAsciiBrand(bytes, new Set(["mif1", "msf1", "heic", "heix", "hevc", "hevx"]));
      break;
    case "application/pdf":
      valid = startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]) && hasPdfEof(bytes);
      break;
    default:
      valid = false;
  }

  return valid
    ? { valid: true }
    : { valid: false, reason: "file_signature_mismatch" };
}
