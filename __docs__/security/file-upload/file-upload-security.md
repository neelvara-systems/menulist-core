# 📁 File Upload Security Implementation

**Last Updated**: May 24, 2026
**Status**: Implementation guide; not current launch certification
**Priority**: P0 (Critical)

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, current upload-source review, Storage rules/deploy evidence where changed, browser/mobile upload QA, and provider/Storage smoke for the release target. This guide records implementation evidence; it is not production-launch approval.

---

## 📖 Overview

Server-side file upload validation using magic byte signatures (not just file extensions) to prevent malicious file uploads, XSS attacks, and server compromise.

### What's Implemented

| Feature                         | Status      | Location                             |
| ------------------------------- | ----------- | ------------------------------------ |
| **Magic Byte Verification**     | ✅ Complete | `fileValidation.ts`                  |
| **File Size Limits**            | ✅ Complete | `constants.ts` → `fileValidation.ts` |
| **Type Whitelist**              | ✅ Complete | `constants.ts` → `fileValidation.ts` |
| **Multiple Signature Variants** | ✅ Complete | 4 JPEG types, full PNG               |
| **Wildcard Support**            | ✅ Complete | For RIFF formats (WebP)              |
| **Filename Sanitization**       | ✅ Complete | Path traversal prevention            |
| **Type Mismatch Detection**     | ✅ Complete | Extension vs content                 |
| **Embedded Script Detection**   | ✅ Complete | HTML/JS in images                    |
| **Code Consolidation**          | ✅ Complete | Single source of truth               |

---

## 🎯 OWASP Coverage

- ✅ **A03: Injection** - Prevents script injection via files
- ✅ **A04: Insecure Design** - Magic byte validation, not just extension
- ✅ **A08: Software & Data Integrity** - Verifies file authenticity

---

## 🔐 Architecture

### File Structure

```
/src/components/templates/main-app/projects/
├── constants.ts              ← MASTER (file signatures, limits, types)
└── validation.ts            ← CLIENT-SIDE (UI feedback)

/src/lib/security/
└── fileValidation.ts        ← SERVER-SIDE (imports from constants.ts)
```

### Data Flow

```
constants.ts (MASTER SOURCE)
    ├─→ validation.ts (client-side UI validation)
    └─→ fileValidation.ts (server-side security validation)
```

**Benefits**:

- ✅ Single source of truth
- ✅ Consistent validation rules
- ✅ No duplication
- ✅ Easy to maintain

---

## 📊 Supported File Types

### Images

| Type     | Extensions  | Max Size | Signatures                    |
| -------- | ----------- | -------- | ----------------------------- |
| **JPEG** | .jpg, .jpeg | 10MB     | 4 variants (JFIF, Exif, etc.) |
| **PNG**  | .png        | 10MB     | Full 8-byte signature         |
| **WebP** | .webp       | 10MB     | RIFF format with wildcard     |

### Documents

| Type    | Extensions | Max Size | Signatures     |
| ------- | ---------- | -------- | -------------- |
| **PDF** | .pdf       | 50MB     | %PDF- (5-byte) |

---

## 🧾 Metadata and Privacy Controls

File validation prevents malicious uploads, but privacy handling depends on the upload purpose:

- **MenuList public media profiles** use `prepareMediaImage()` before profile-aware Storage writes. The source image is decoded and re-rendered into prepared Blob variants, so original EXIF metadata such as location, camera model, and source-device fields are stripped from the stored public media output.
- **MenuList legacy/raw upload fallbacks** may preserve source metadata when they bypass the media image system. New public image surfaces should route through media profiles instead of direct `uploadString(data_url)` or raw Blob uploads.
- **Answerlattice knowledge-source uploads** preserve source-file fidelity for generation. Those files are tenant-scoped source inputs, not public assets, and are deleted when the generation job is deleted. Images or screenshots may still contain source metadata, so the upload UI warns users to remove private customer data before upload.
- **Marketing reuse** is not part of normal upload processing. If MenuList or Answerlattice later reuses customer media for marketing, it must be a separate opt-in flow with consent logging, withdrawal, and policy text tied to that specific purpose.
- **Retention selectors** should not be added until a backend retention scheduler and deletion policy exist. UI copy must describe the actual lifecycle enforced by code.

### Storage Helper Diagnostics

- Shared Firebase Storage helpers, including `src/lib/firebase/storage.ts`, must not direct-console raw upload/download URLs, Storage full paths, caller-provided paths, file IDs, or provider error objects.
- Storage helper failures use `storageDiagnostics.ts` and record only normalized failure codes, provider error code/name, and bounded string presence/length metadata.
- Caller-facing Storage failure text stays generic. Return or throw `"Failed to upload file"` / `"Failed to delete file"` style messages instead of provider exception text.
- A resumable upload can complete before download-URL resolution fails. Callers that use attempt-unique object paths must opt into `cleanupOnDownloadUrlFailure`; the shared helper then awaits deletion of that exact completed upload, logs cleanup failure separately, and still returns only generic failure text. Deterministic/shared paths must not opt in because a later concurrent write could own the same path.

---

## 🔬 Magic Byte Signatures

### What Are Magic Bytes?

First few bytes of a file that identify its type, regardless of extension.

**Example**:

```
virus.exe renamed to menu.jpg
  ↓
Magic bytes: 4D 5A (EXE header)
  ↓
Validation: ❌ REJECTED (not a JPEG!)
```

### Comprehensive Signatures

```typescript
export const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff, 0xe0], // JPEG JFIF
    [0xff, 0xd8, 0xff, 0xe1], // JPEG Exif
    [0xff, 0xd8, 0xff, 0xe2], // JPEG
    [0xff, 0xd8, 0xff, 0xe3], // JPEG
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // Full 8-byte PNG
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50], // RIFF....WEBP
  ],
  "application/pdf": [
    [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
  ],
};
```

**Key Features**:

- ✅ Multiple variants per type (JPEG has 4)
- ✅ Full-length signatures (PNG uses all 8 bytes)
- ✅ Wildcard support (`null` = any byte for RIFF format)

---

## 🚀 Usage Patterns

### Pattern 1: Validate Upload (Server-Side) ⭐

```typescript
import { validateFileUpload } from "@lib/security/fileValidation";

export async function POST(request: Request) {
  // Get file from request
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // Convert to buffer
  const buffer = await file.arrayBuffer();

  // Validate
  const result = await validateFileUpload(buffer, file.type, file.size);

  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Safe to process file
  // ...
}
```

---

### Pattern 2: Detect File Type

```typescript
import { detectFileType } from "@lib/security/fileValidation";

// Detect actual type from content
const buffer = await file.arrayBuffer();
const detectedType = detectFileType(buffer);

if (detectedType !== file.type) {
  console.warn("Type mismatch!", {
    claimed: file.type,
    actual: detectedType,
  });
  // Reject or use detected type
}
```

---

### Pattern 3: Sanitize Filename

```typescript
import { sanitizeFilename } from "@lib/security/fileValidation";

const userFilename = file.name; // Could be: "../../etc/passwd.jpg"
const safeFilename = sanitizeFilename(userFilename);
// Result: "passwd.jpg" (path traversal removed)
```

---

### Pattern 4: Validate Extension

```typescript
import { validateFileExtension } from "@lib/security/fileValidation";

const isValid = validateFileExtension("menu.jpg", "image/jpeg");
// Returns: true (extension matches type)

const isInvalid = validateFileExtension("menu.jpg", "application/pdf");
// Returns: false (extension doesn't match type)
```

---

## 📋 Complete API Reference

### 1. `validateFileUpload(file, claimedType, claimedSize)`

**Purpose**: Comprehensive file validation

```typescript
const result = await validateFileUpload(
  fileBuffer, // ArrayBuffer | Uint8Array | Blob
  "image/jpeg", // Claimed MIME type
  1024000 // File size in bytes
);

if (!result.valid) {
  console.error(result.error);
  // Handle error
}
```

**Validation Steps**:

1. ✅ Check file type is in whitelist
2. ✅ Check file size within limits
3. ✅ Verify magic bytes match type
4. ✅ Scan for embedded scripts (images)

**Returns**:

```typescript
// Success
{ valid: true }

// Failure
{ valid: false, error: string }
```

---

### 2. `detectFileType(buffer)`

**Purpose**: Detect file type from magic bytes

```typescript
const detectedType = detectFileType(buffer);
// Returns: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf' | null
```

**Use Cases**:

- Verify claimed type matches content
- Detect spoofed files
- Auto-correct file type

---

### 3. `sanitizeFilename(filename)`

**Purpose**: Remove dangerous characters from filename

```typescript
const safe = sanitizeFilename("../../etc/passwd.jpg");
// Returns: 'passwd.jpg'

const safe2 = sanitizeFilename('<script>alert("xss")</script>.jpg');
// Returns: 'scriptalertxssscript.jpg'
```

**Protections**:

- ✅ Removes path traversal (`../`, `./`)
- ✅ Removes dangerous characters (`<`, `>`, `|`, `:`, etc.)
- ✅ Limits length to 255 characters
- ✅ Preserves extension

---

### 4. `getFileExtension(filename)`

**Purpose**: Extract file extension

```typescript
const ext = getFileExtension("menu.jpg");
// Returns: 'jpg'

const ext2 = getFileExtension("document.pdf");
// Returns: 'pdf'
```

---

### 5. `validateFileExtension(filename, mimeType)`

**Purpose**: Check if extension matches MIME type

```typescript
const valid = validateFileExtension("menu.jpg", "image/jpeg");
// Returns: true

const invalid = validateFileExtension("menu.jpg", "application/pdf");
// Returns: false
```

---

## 🛡️ Security Features

### 1. Magic Byte Verification

**Why Important**:

```
Attacker renames virus.exe → menu.jpg
  ↓
Client checks: .jpg extension → ✅ Looks good
  ↓
Server checks magic bytes:
  - Expected: FF D8 FF (JPEG)
  - Found: 4D 5A (EXE)
  ↓
❌ REJECTED!
```

**Code**:

```typescript
function matchesSignature(
  bytes: Uint8Array,
  signature: (number | null)[]
): boolean {
  if (bytes.length < signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    // null = wildcard (any byte)
    if (signature[i] !== null && bytes[i] !== signature[i]) {
      return false;
    }
  }

  return true;
}
```

---

### 2. Multiple Signature Variants

**Why**: Same file type can have different headers

```typescript
'image/jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // JPEG JFIF (most common)
    [0xFF, 0xD8, 0xFF, 0xE1], // JPEG Exif (from cameras)
    [0xFF, 0xD8, 0xFF, 0xE2], // JPEG variant
    [0xFF, 0xD8, 0xFF, 0xE3], // JPEG variant
]
```

**Benefit**: Accepts legitimate files from different sources (phones, cameras, editors)

---

### 3. Wildcard Support

**Use Case**: RIFF format (WebP)

```typescript
'image/webp': [
    [0x52, 0x49, 0x46, 0x46,  // "RIFF"
     null, null, null, null,   // File size (varies)
     0x57, 0x45, 0x42, 0x50]  // "WEBP"
]
```

**Why**: File size bytes change per file, but format is consistent

---

### 4. Embedded Script Detection

**Attack Vector**:

```html
<!-- Malicious SVG -->
<svg onload="alert('XSS')">
  <image href="javascript:alert('XSS')" />
</svg>
```

**Protection**:

```typescript
// Scan image files for script tags
const imageBuffer = new Uint8Array(buffer);
const text = new TextDecoder().decode(imageBuffer.slice(0, 1024));

if (
  text.includes("<script") ||
  text.includes("javascript:") ||
  text.includes("onerror=")
) {
  return {
    valid: false,
    error: "File contains potentially malicious content",
  };
}
```

---

## 📊 File Size Limits

```typescript
export const MAX_FILE_SIZES: Record<string, number> = {
  "image/jpeg": 10 * 1024 * 1024, // 10MB
  "image/png": 10 * 1024 * 1024, // 10MB
  "image/webp": 10 * 1024 * 1024, // 10MB
  "application/pdf": 50 * 1024 * 1024, // 50MB
};
```

**Why These Limits**:

- Images: 10MB sufficient for high-quality photos
- PDFs: 50MB allows multi-page menus with images
- DoS Prevention: Prevents huge file uploads

---

## 🔄 Code Consolidation (Nov 14, 2025)

### Problem Before

**Duplication**:

```
constants.ts:     FILE_SIGNATURES (simple)
fileValidation.ts: FILE_SIGNATURES (comprehensive) ← Duplicate!

constants.ts:     MAX_PDF_SIZE = 50MB
fileValidation.ts: MAX_PDF_SIZE = 20MB ← Conflict!
```

### Solution After

**Single Source**:

```
constants.ts:      FILE_SIGNATURES (comprehensive) ← MASTER
                  MAX_PDF_SIZE = 50MB ← MASTER
                  ↓
fileValidation.ts: import from constants.ts ← Uses master
validation.ts:     import from constants.ts ← Uses master
```

**See**: [5-refactor-file-validation.md](../../projects/development_done/5-refactor-file-validation.md)

---

## 🧪 Testing

### Test 1: Valid File

```typescript
const jpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0 /* ... */]);
const result = await validateFileUpload(jpegBuffer, "image/jpeg", 1000000);
// Expected: { valid: true }
```

---

### Test 2: Type Mismatch

```typescript
const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46 /* ... */]);
const result = await validateFileUpload(pdfBuffer, "image/jpeg", 1000000);
// Expected: { valid: false, error: 'File type does not match...' }
```

---

### Test 3: File Too Large

```typescript
const hugeBuffer = new Uint8Array(100 * 1024 * 1024); // 100MB
const result = await validateFileUpload(hugeBuffer, "image/jpeg", 100000000);
// Expected: { valid: false, error: 'File size exceeds...' }
```

---

### Test 4: Spoofed Extension

```typescript
const filename = "virus.exe.jpg"; // Disguised executable
const ext = getFileExtension(filename);
// Returns: 'jpg' (but magic bytes would reveal it's an .exe)
```

---

## 📈 Integration Examples

### Example 1: API Route with File Upload

```typescript
import {
  validateFileUpload,
  sanitizeFilename,
} from "@lib/security/fileValidation";
import { withAuth } from "@middleware/auth";

export const POST = withAuth(async (request, session) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // 1. Sanitize filename
  const safeFilename = sanitizeFilename(file.name);

  // 2. Validate file
  const buffer = await file.arrayBuffer();
  const validation = await validateFileUpload(buffer, file.type, file.size);

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // 3. Safe to process
  // Upload to storage, process with AI, etc.

  return NextResponse.json({ success: true });
});
```

---

### Example 2: Client-Side Pre-Validation

```typescript
import {
  FILE_SIGNATURES,
  MAX_IMAGE_SIZE,
} from "@template/main-app/projects/constants";
import {
  validateFileMagicBytes,
  validateFileSize,
} from "@template/main-app/projects/validation";

const handleFileSelect = async (file: File) => {
  // 1. Check size (fast, no reading)
  if (!validateFileSize(file)) {
    message.error("File too large");
    return;
  }

  // 2. Check type
  if (!validateFileType(file)) {
    message.error("File type not supported");
    return;
  }

  // 3. Check magic bytes
  if (!(await validateFileMagicBytes(file))) {
    message.error("File appears corrupted");
    return;
  }

  // 4. Upload (server will validate again)
  uploadFile(file);
};
```

---

## 🚨 Common Attack Vectors & Defenses

### Attack 1: Extension Spoofing

**Attack**:

```
virus.exe → rename → menu.jpg
Upload as "image/jpeg"
```

**Defense**:

```typescript
// Check magic bytes, not just extension
const actualType = detectFileType(buffer);
if (actualType !== claimedType) {
  return { valid: false, error: "Type mismatch" };
}
```

---

### Attack 2: Double Extension

**Attack**:

```
malware.php.jpg
Server processes as .jpg but executes as .php
```

**Defense**:

```typescript
// Sanitize filename removes dangerous extensions
sanitizeFilename("malware.php.jpg");
// Returns: 'malware.php.jpg' (safe, no execution)

// Only allow whitelisted extensions
const ext = getFileExtension(filename);
if (!ALLOWED_EXTENSIONS.includes(ext)) {
  reject();
}
```

---

### Attack 3: Path Traversal

**Attack**:

```
../../../../etc/passwd
Tries to overwrite system files
```

**Defense**:

```typescript
sanitizeFilename("../../../../etc/passwd");
// Returns: 'passwd' (path removed)
```

---

### Attack 4: XSS via SVG

**Attack**:

```html
<svg>
  <script>
    alert('XSS')
  </script>
</svg>
```

**Defense**:

```typescript
// Option 1: Block SVG entirely
ALLOWED_FILE_TYPES: [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
// SVG not in list → rejected

// Option 2: Scan for scripts
if (buffer.includes("<script")) {
  reject("Embedded script detected");
}
```

---

## 📋 Production Checklist

Before going live:

- [ ] All file upload routes use `validateFileUpload()`
- [ ] Client-side validation in place (UX)
- [ ] Server-side validation in place (security) ← **Critical**
- [ ] File size limits tested
- [ ] Magic byte detection tested
- [ ] Filename sanitization applied
- [ ] Error messages generic (don't leak info)
- [ ] Storage paths sanitized
- [ ] Storage helper diagnostics use bounded metadata, not raw URLs or full paths
- [ ] Rejected uploads logged
- [ ] Monitor logs for attack patterns

---

## 🔗 Related Documentation

- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [assessment-05-security.md](../../projects/assessments/assessment-05-security.md#3-no-file-upload-validation-) - Issue #3
- [5-refactor-file-validation.md](../../projects/development_done/5-refactor-file-validation.md) - Consolidation details

---

## 🎯 Best Practices

1. **Always Validate Server-Side** ⭐

   - Client validation is for UX only
   - Server validation is security
   - NEVER skip server validation

2. **Use Magic Bytes, Not Extensions**

   - Extensions can be spoofed
   - Magic bytes don't lie

3. **Whitelist, Don't Blacklist**

   - Allow only known-good types
   - Don't try to block all bad types

4. **Sanitize Everything**

   - Filenames
   - Storage paths
   - File contents (if displayed)

5. **Log Rejected Uploads**
   - Monitor for attack patterns
   - Alert on repeated rejections
   - Do not log raw Storage URLs, full paths, or provider exception payloads

---

**Status**: Implementation evidence documented; not current launch certification
**Consolidation**: ✅ Complete (Nov 14, 2025)  
**Diagnostics Hardening**: ✅ Storage helper diagnostics bounded (Jun 27, 2026)
**Maintenance**: Review signatures annually for new file types
