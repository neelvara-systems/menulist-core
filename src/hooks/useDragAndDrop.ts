import { message } from 'antd';
import { useState } from 'react';
import { getSafeUiErrorMessage } from '@lib/errors/uiErrorMessages';

const DROP_FILE_FALLBACK_ERROR = 'File could not be uploaded.';
const DROP_FILE_TYPE_ERROR = 'File type is not allowed.';

function getDropFileSizeError(maxSize: number): string {
    const sizeMB = (maxSize / (1024 * 1024)).toFixed(1);
    return `File is too large. Maximum size is ${sizeMB}MB.`;
}

export interface UseDragAndDropOptions {
    onFilesDrop: (files: File[]) => void;
    accept?: string[]; // e.g., ['image/*', 'application/pdf']
    maxFiles?: number; // Maximum number of files allowed
    maxSize?: number; // Maximum file size in bytes
    disabled?: boolean;
    validateFile?: (file: File) => { valid: boolean; error?: string };
}

export interface UseDragAndDropReturn {
    isDragging: boolean;
    dragHandlers: {
        onDragEnter: (e: React.DragEvent) => void;
        onDragLeave: (e: React.DragEvent) => void;
        onDragOver: (e: React.DragEvent) => void;
        onDrop: (e: React.DragEvent) => void;
    };
}

/**
 * Reusable hook for drag & drop file upload functionality
 * 
 * @example
 * ```tsx
 * const { isDragging, dragHandlers } = useDragAndDrop({
 *   onFilesDrop: (files) => setFiles(files),
 *   accept: ['image/*'],
 *   maxFiles: 1,
 *   maxSize: 5 * 1024 * 1024 // 5MB
 * });
 * 
 * <div {...dragHandlers}>
 *   {isDragging ? 'Drop here' : 'Drag files here'}
 * </div>
 * ```
 */
export const useDragAndDrop = ({
    onFilesDrop,
    accept = ['*/*'],
    maxFiles = 1,
    maxSize,
    disabled = false,
    validateFile
}: UseDragAndDropOptions): UseDragAndDropReturn => {
    const [isDragging, setIsDragging] = useState(false);

    const validateFileType = (file: File): boolean => {
        if (accept.includes('*/*')) return true;

        return accept.some(acceptType => {
            if (acceptType.endsWith('/*')) {
                // Handle wildcards like 'image/*'
                const prefix = acceptType.split('/')[0];
                return file.type.startsWith(prefix + '/');
            }
            // Exact match
            return file.type === acceptType;
        });
    };

    const validateFileSize = (file: File): boolean => {
        if (!maxSize) return true;
        return file.size <= maxSize;
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Only set to false if leaving the drop zone completely
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled) return;

        const droppedFiles = Array.from(e.dataTransfer?.files || []);

        if (droppedFiles.length === 0) {
            return;
        }

        // Validate number of files
        if (droppedFiles.length > maxFiles) {
            message.warning(`You can only upload up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}`);
            return;
        }

        // Validate each file
        const validFiles: File[] = [];
        const errors: string[] = [];

        for (const file of droppedFiles) {
            // Custom validation
            if (validateFile) {
                const validation = validateFile(file);
                if (!validation.valid) {
                    errors.push(getSafeUiErrorMessage(validation.error, DROP_FILE_FALLBACK_ERROR, { allowTrustedPlainText: true }));
                    continue;
                }
            }

            // Type validation
            if (!validateFileType(file)) {
                errors.push(DROP_FILE_TYPE_ERROR);
                continue;
            }

            // Size validation
            if (!validateFileSize(file)) {
                errors.push(getDropFileSizeError(maxSize!));
                continue;
            }

            validFiles.push(file);
        }

        // Show errors if any
        if (errors.length > 0) {
            errors.forEach((safeError) => message.error(safeError));
        }

        // Call callback with valid files
        if (validFiles.length > 0) {
            onFilesDrop(validFiles);
        }
    };

    return {
        isDragging,
        dragHandlers: {
            onDragEnter: handleDragEnter,
            onDragLeave: handleDragLeave,
            onDragOver: handleDragOver,
            onDrop: handleDrop
        }
    };
};
