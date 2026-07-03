import { IMAGE_COMPRESSION_LIMIT } from "@constant/common";
import type { MediaImageType } from "@lib/media/imageProfiles";
import { getMediaProfileAcceptAttribute } from "@lib/media/imageProfiles";
import { prepareMediaImage, toPreparedUploadName } from "@lib/media/prepareMediaImage";
import { validateImageFile } from "@lib/security/magicBytesValidator";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { getBoundedSecurityStringContext, logSecurityDiagnostic } from "@lib/security/securityDiagnostics";
import { getBase64, getBase64Length, getCompressedImage } from "@util/utils";
import { message } from "antd";
import { useState } from "react";

const IMAGE_PREPARE_FAILED_MESSAGE = 'Could not prepare image.';
const IMAGE_INVALID_TYPE_MESSAGE = 'Use a JPG, PNG, WebP, or GIF image.';
const IMAGE_INVALID_FILE_MESSAGE = 'Use a valid image file.';

type PropsType = {
    onUploadFile: Function
    fileInputRef: any
    compression?: boolean
    cropperConfiguarations?: {
        cropBoxResizable: boolean;
        ratio: any;
        active: boolean;
    };
    maxSizeMB?: number; // Maximum file size in MB (default: 10MB)
    mediaImageType?: MediaImageType;
    multiple?: boolean; // Allow multiple file selection (default: false)
    onUploadProgress?: (progress: { current: number; total: number; fileName: string }) => void;
    onUploadCancel?: () => void;
}
function ImageUploadInput({
    onUploadFile,
    fileInputRef,
    compression = true,
    maxSizeMB = 10,
    mediaImageType,
    multiple = false,
    onUploadProgress,
    onUploadCancel,
    cropperConfiguarations = {
        active: false,
        ratio: 1,
        cropBoxResizable: false
    } }: PropsType) {

    const [showCropperModal, setShowCropperModal] = useState<{ active: boolean, url: string, data: any }>({ active: false, url: null, data: null })
    const [abortController, setAbortController] = useState<AbortController | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    const handleFileChange = async (event: any) => {
        const files = Array.from(event.target.files || []) as File[];

        if (files.length === 0) return;

        // Create abort controller for cancellation
        const controller = new AbortController();
        setAbortController(controller);
        setIsUploading(true);

        try {
            const validatedFiles = [];

            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Check if upload was cancelled
                if (controller.signal.aborted) {
                    message.info('Upload cancelled');
                    return;
                }

                // Report progress
                if (onUploadProgress) {
                    onUploadProgress({
                        current: i + 1,
                        total: files.length,
                        fileName: file.name
                    });
                }

                const result = await processSingleFile(file, maxSizeMB, compression, cropperConfiguarations, controller.signal, mediaImageType);

                if (result) {
                    validatedFiles.push(result);
                }
            }

            // Upload all validated files
            if (validatedFiles.length > 0) {
                if (multiple) {
                    // For multiple uploads, pass array
                    onUploadFile(validatedFiles);
                } else {
                    // For single upload, pass first file
                    onUploadFile(validatedFiles[0]);
                }
                message.success(`${validatedFiles.length} file(s) uploaded successfully`);
            }

        } catch (error) {
            if (error.name === 'AbortError') {
                message.info('Upload cancelled');
            } else {
                logRuntimeFailure('image_upload_batch_failed', error, {
                    fileCount: files.length,
                    maxSizeMB,
                    multiple,
                    compressionEnabled: compression,
                    hasMediaImageType: Boolean(mediaImageType),
                });
                message.error('Failed to upload image. Please try again.');
            }
        } finally {
            setIsUploading(false);
            setAbortController(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const processSingleFile = async (
        file: File,
        maxSizeMB: number,
        compression: boolean,
        cropperConfiguarations: any,
        signal: AbortSignal,
        mediaImageType?: MediaImageType
    ) => {

        // Check for cancellation
        if (signal.aborted) {
            throw new DOMException('Upload cancelled', 'AbortError');
        }

        if (mediaImageType) {
            try {
                const prepared = await prepareMediaImage(file, mediaImageType);
                return {
                    crop: prepared.crop,
                    name: toPreparedUploadName(file.name, prepared.mimeType, file.name),
                    size: prepared.sizeBytes,
                    sourceDataUrl: prepared.sourceDataUrl,
                    sourceName: prepared.sourceName,
                    type: prepared.mimeType,
                    url: prepared.dataUrl,
                };
            } catch (error) {
                logRuntimeFailure('image_upload_prepare_media_failed', error, {
                    ...getBoundedRuntimeStringContext('fileType', file.type),
                    ...getBoundedRuntimeStringContext('mediaImageType', mediaImageType),
                    fileSizeBytes: file.size,
                    maxSizeMB,
                });
                message.error(IMAGE_PREPARE_FAILED_MESSAGE);
                return null;
            }
        }

        // 1️⃣ CLIENT-SIDE VALIDATION: MIME Type Whitelist
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            message.error(IMAGE_INVALID_TYPE_MESSAGE);
            return null;
        }

        // 2️⃣ CLIENT-SIDE VALIDATION: File Size Check (before compression)
        if (file.size > maxSizeMB * 1024 * 1024) {
            message.error(`Image must be ${maxSizeMB}MB or smaller.`);
            return null;
        }

        if (file.size === 0) {
            message.error(IMAGE_INVALID_FILE_MESSAGE);
            return null;
        }

        try {
            // Check for cancellation before processing
            if (signal.aborted) {
                throw new DOMException('Upload cancelled', 'AbortError');
            }
            let base64: any = null;
            let compressed: {};

            // Compress if needed
            if (compression && file.size > IMAGE_COMPRESSION_LIMIT) {
                base64 = await getCompressedImage(file, 0.4);
                compressed = {
                    size: getBase64Length(base64),
                    url: base64,
                };
            } else {
                base64 = await getBase64(file);
            }

            if (!base64) {
                message.error(IMAGE_PREPARE_FAILED_MESSAGE);
                return null;
            }

            // Check for cancellation after compression
            if (signal.aborted) {
                throw new DOMException('Upload cancelled', 'AbortError');
            }

            // 3️⃣ CRITICAL SECURITY: Magic Bytes Validation
            // This validates the ACTUAL file content, not just the MIME type
            const validation = await validateImageFile({
                base64: base64,
                mimeType: file.type,
                size: file.size,
                maxSizeMB: maxSizeMB
            });

            if (!validation.valid) {
                message.error(IMAGE_INVALID_FILE_MESSAGE);
                logSecurityDiagnostic('image_upload_magic_bytes_validation_rejected', {
                    ...getBoundedSecurityStringContext('fileType', file.type),
                    ...getBoundedSecurityStringContext('validationError', validation.error),
                    fileSizeBytes: file.size,
                    maxSizeMB,
                });
                return null;
            }

            // ✅ All validations passed
            const data = {
                name: file.name,
                size: file.size,
                type: file.type,
                url: base64,
                compressed,
            };

            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw error; // Re-throw abort errors
            }
            logRuntimeFailure('image_upload_file_process_failed', error, {
                ...getBoundedRuntimeStringContext('fileType', file.type),
                fileSizeBytes: file.size,
                maxSizeMB,
                compressionEnabled: compression,
            });
            message.error('Failed to upload image.');
            return null;
        }
    };

    const cancelUpload = () => {
        if (abortController) {
            abortController.abort();
            if (onUploadCancel) {
                onUploadCancel();
            }
        }
    };

    const onCropImage = (cropedImage) => {
        onUploadFile({ ...showCropperModal.data, url: cropedImage })
        setShowCropperModal({ active: false, url: null, data: null })
    }

    return (
        <>
            <input
                tabIndex={0}
                aria-hidden="true"
                data-sentinel="end"
                type="file"
                style={{
                    display: "none",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                    outline: "none",
                    position: "absolute",
                }}
                accept={mediaImageType ? getMediaProfileAcceptAttribute(mediaImageType) : "image/*"}
                multiple={multiple}
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
            />
            {/* {cropperConfiguarations.active && <ImageCropper
                ratio={cropperConfiguarations.ratio}
                cropBoxResizable={cropperConfiguarations.cropBoxResizable}
                onReplaceImage={() => fileInputRef.current.click()}
                onCancel={() => setShowCropperModal({ active: false, url: null, data: null })}
                modalData={showCropperModal}
                onSave={onCropImage}
            />} */}

        </>
    );
}

export default ImageUploadInput;
