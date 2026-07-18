import { FILE_SIGNATURES_WITH_WILDCARDS } from '@lib/security/fileSignatures';
import { message, Modal, Upload } from 'antd';
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_IMAGE_SIZE,
  MAX_PDF_SIZE,
  MAX_TOTAL_UPLOAD_SIZE,
  WARN_FILE_SIZE
} from './constants';
import { ProjectFileType } from './types';

// ============================
// FILE SIZE VALIDATION
// ============================

/**
 * Validates individual file size based on file type
 * - Images (JPG, PNG, WebP): Max 10MB
 * - PDFs: Max 50MB
 * 
 * Also shows warnings for large files (>30MB) to inform users
 * about potential processing time.
 */
export const validateFileSize = (file: File, fileList: File[]): boolean | typeof Upload.LIST_IGNORE => {
  const isPDF = file.type === 'application/pdf';
  const maxSize = isPDF ? MAX_PDF_SIZE : MAX_IMAGE_SIZE;
  const maxSizeLabel = isPDF ? '50MB' : '10MB';

  // Check individual file size
  if (file.size > maxSize) {
    message.error({
      content: `${file.name} is too large. Maximum size for ${isPDF ? 'PDFs' : 'images'}: ${maxSizeLabel}`,
      duration: 5
    });
    return Upload.LIST_IGNORE;
  }

  // Show warning for large files (but don't block)
  if (file.size > WARN_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    message.warning({
      content: `${file.name} (${sizeMB}MB) is quite large. Processing may take longer.`,
      duration: 6
    });
  }

  // Check total upload size
  const totalSize = fileList.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
    const totalMB = (totalSize / (1024 * 1024)).toFixed(1);
    const maxMB = (MAX_TOTAL_UPLOAD_SIZE / (1024 * 1024)).toFixed(0);
    message.error({
      content: `Total upload size (${totalMB}MB) exceeds the ${maxMB}MB limit. Please upload files in smaller batches.`,
      duration: 6
    });
    return Upload.LIST_IGNORE;
  }

  return false; // Don't auto-upload
};

// ============================
// FILE TYPE VALIDATION
// ============================

/**
 * Validates file type using:
 * 1. MIME type check (file.type)
 * 2. Extension check (prevents spoofed MIME types)
 * 
 * Only allows: JPG, PNG, WebP, PDF
 * Blocks: EXE, ZIP, SVG (XSS risk), and other types
 */
export const validateFileType = (file: File): boolean | typeof Upload.LIST_IGNORE => {
  // Check MIME type
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.type);

  // Check file extension (defense against MIME type spoofing)
  const fileExtension = `.${file.name.toLowerCase().split('.').pop()}` as any;
  const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(fileExtension as any);

  if (!isMimeAllowed || !isExtensionAllowed) {
    message.error({
      content: `"${file.name}" has an invalid file type. Please upload only: JPG, PNG, WebP, or PDF files.`,
      duration: 5
    });
    return Upload.LIST_IGNORE;
  }

  return false;
};

// ============================
// MAGIC BYTES VALIDATION (Client-Side)
// ============================

/**
 * Reads the first few bytes of a file to verify its true type.
 * This prevents malicious files disguised with wrong extensions.
 * 
 * Example: virus.exe renamed to menu.pdf will be detected because
 * PDFs must start with "%PDF" (hex: 25 50 44 46)
 * 
 * Note: Full validation should also happen on backend for security.
 */
export const validateFileMagicBytes = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve(false);
        return;
      }

      const arr = new Uint8Array(e.target.result as ArrayBuffer);
      const signatures = FILE_SIGNATURES_WITH_WILDCARDS[file.type as keyof typeof FILE_SIGNATURES_WITH_WILDCARDS];

      if (!signatures) {
        // Unknown type
        resolve(false);
        return;
      }

      // Check if file starts with any of the expected signatures
      const matches = signatures.some(signature => {
        if (arr.length < signature.length) return false;
        return signature.every((byte, i) => {
          // null in signature means "any byte" (wildcard for RIFF format)
          if (byte === null) return true; // Wildcard - any byte matches
          return arr[i] === byte;
        });
      });

      if (!matches) {
        message.error({
          content: `"${file.name}" appears to be corrupted or is not a valid ${file.type.split('/')[1].toUpperCase()} file.`,
          duration: 5
        });
      }

      resolve(matches);
    };

    reader.onerror = () => resolve(false);

    // Read first 8 bytes (enough for all our signatures)
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
};

// ============================
// DUPLICATE FILE DETECTION
// ============================

/**
 * Detects duplicate files based on name and size.
 * Shows confirmation modal asking user if they want to upload anyway.
 * 
 * Prevents accidentally processing the same file twice.
 */
export const detectDuplicateFile = (
  file: File,
  existingFiles: ProjectFileType[]
): Promise<boolean> => {
  return new Promise((resolve) => {
    const isDuplicate = existingFiles.some(existing =>
      existing.name === file.name &&
      existing.size === file.size
    );

    if (isDuplicate) {
      Modal.confirm({
        title: 'Duplicate File Detected',
        content: `"${file.name}" already exists in this project. Uploading it again will repeat menu processing. Do you want to continue?`,
        okText: 'Upload Anyway',
        cancelText: 'Skip',
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    } else {
      resolve(true);
    }
  });
};

// ============================
// COMBINED VALIDATION
// ============================

/**
 * Master validation function that runs all checks:
 * 1. File type validation
 * 2. File size validation
 * 3. Magic bytes validation
 * 4. Duplicate detection
 * 
 * Use this in Upload component's beforeUpload prop.
 */
export const validateFile = async (
  file: File,
  fileList: File[],
  existingFiles: ProjectFileType[] = []
): Promise<boolean | typeof Upload.LIST_IGNORE> => {
  // 1. Type validation
  const typeValid = validateFileType(file);
  if (typeValid === Upload.LIST_IGNORE) {
    return Upload.LIST_IGNORE;
  }

  // 2. Size validation
  const sizeValid = validateFileSize(file, fileList);
  if (sizeValid === Upload.LIST_IGNORE) {
    return Upload.LIST_IGNORE;
  }

  // 3. Magic bytes validation (async)
  const magicBytesValid = await validateFileMagicBytes(file);
  if (!magicBytesValid) {
    return Upload.LIST_IGNORE;
  }

  // 4. Duplicate detection (async)
  const shouldUpload = await detectDuplicateFile(file, existingFiles);
  if (!shouldUpload) {
    return Upload.LIST_IGNORE;
  }

  return false; // All checks passed, don't auto-upload
};

// ============================
// UTILITY FUNCTIONS
// ============================

/**
 * Formats file size to human-readable string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Gets file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
};

/**
 * Checks if file is a PDF
 */
export const isPDFFile = (file: File): boolean => {
  return file.type === 'application/pdf' || getFileExtension(file.name) === 'pdf';
};

/**
 * Checks if file is an image
 */
export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};
