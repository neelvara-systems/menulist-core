/**
 * Usage Examples for useDragAndDrop Hook
 * 
 * This file contains examples of how to use the reusable drag & drop hook
 * in different scenarios throughout the application.
 */

import { Button, Card, Typography } from 'antd';
import { useState } from 'react';
import { useDragAndDrop } from './useDragAndDrop';

// ============================================
// Example 1: Simple Image Upload Zone
// ============================================
export const SimpleImageUpload = () => {
    const [images, setImages] = useState<File[]>([]);

    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: (files) => setImages([...images, ...files]),
        accept: ['image/*'],
        maxFiles: 5,
        maxSize: 5 * 1024 * 1024 // 5MB
    });

    return (
        <div
            {...dragHandlers}
            style={{
                border: isDragging ? '2px dashed blue' : '2px dashed gray',
                padding: 32,
                textAlign: 'center',
                background: isDragging ? '#f0f8ff' : 'white'
            }}
        >
            {isDragging ? (
                <Typography.Text>Drop images here</Typography.Text>
            ) : (
                <Typography.Text>Drag images here or click to upload</Typography.Text>
            )}
            <div>
                {images.map((file, idx) => (
                    <p key={idx}>{file.name}</p>
                ))}
            </div>
        </div>
    );
};

// ============================================
// Example 2: PDF Document Upload
// ============================================
export const PDFUpload = () => {
    const [pdfs, setPdfs] = useState<File[]>([]);

    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: (files) => setPdfs([...pdfs, ...files]),
        accept: ['application/pdf'],
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024 // 10MB
    });

    return (
        <Card
            {...dragHandlers}
            style={{
                borderColor: isDragging ? 'blue' : undefined,
                background: isDragging ? '#f0f8ff' : undefined
            }}
        >
            <Typography.Title level={5}>
                {isDragging ? 'Drop PDF here' : 'Upload PDF Document'}
            </Typography.Title>
            {pdfs.length > 0 && <p>Uploaded: {pdfs[0].name}</p>}
        </Card>
    );
};

// ============================================
// Example 3: Multiple File Types with Custom Validation
// ============================================
export const MultiFileUpload = () => {
    const [files, setFiles] = useState<File[]>([]);

    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: (files) => setFiles([...files, ...files]),
        accept: ['image/*', 'application/pdf', 'text/*'],
        maxFiles: 10,
        maxSize: 20 * 1024 * 1024, // 20MB
        validateFile: (file) => {
            // Custom validation: reject files with certain names
            if (file.name.includes('temp')) {
                return { valid: false, error: 'Temporary files are not allowed' };
            }
            return { valid: true };
        }
    });

    return (
        <div
            {...dragHandlers}
            style={{
                minHeight: 200,
                border: '2px dashed gray',
                padding: 24,
                borderRadius: 8,
                background: isDragging ? '#f0f8ff' : 'white'
            }}
        >
            <Typography.Title level={4}>
                {isDragging ? '📁 Drop files here' : '📁 Drag files here'}
            </Typography.Title>
            <Typography.Text type="secondary">
                Accepts images, PDFs, and text files (max 20MB, up to 10 files)
            </Typography.Text>

            <div style={{ marginTop: 16 }}>
                {files.map((file, idx) => (
                    <Card key={idx} size="small" style={{ marginBottom: 8 }}>
                        {file.name} - {(file.size / 1024).toFixed(1)} KB
                    </Card>
                ))}
            </div>
        </div>
    );
};

// ============================================
// Example 4: Inline Drop Zone (like ChatInput)
// ============================================
export const InlineDropZone = () => {
    const [file, setFile] = useState<File | null>(null);

    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: (files) => setFile(files[0]),
        accept: ['image/*'],
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024
    });

    return (
        <div
            style={{
                position: 'relative',
                border: `1px solid ${isDragging ? 'blue' : 'gray'}`,
                borderRadius: 8,
                padding: 16
            }}
            {...dragHandlers}
        >
            <input
                type="text"
                placeholder="Type here or drop an image..."
                style={{
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    background: isDragging ? '#f0f8ff' : 'transparent'
                }}
            />

            {isDragging && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                    }}
                >
                    <Typography.Text strong>Drop image here</Typography.Text>
                </div>
            )}

            {file && <p>Uploaded: {file.name}</p>}
        </div>
    );
};

// ============================================
// Example 5: Disabled State
// ============================================
export const DisabledDropZone = () => {
    const [isEnabled, setIsEnabled] = useState(false);

    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: () => undefined,
        accept: ['image/*'],
        maxFiles: 1,
        disabled: !isEnabled
    });

    return (
        <div>
            <Button onClick={() => setIsEnabled(!isEnabled)}>
                {isEnabled ? 'Disable' : 'Enable'} Drop Zone
            </Button>

            <div
                {...dragHandlers}
                style={{
                    marginTop: 16,
                    padding: 32,
                    border: '2px dashed gray',
                    opacity: isEnabled ? 1 : 0.5,
                    pointerEvents: isEnabled ? 'auto' : 'none'
                }}
            >
                {isDragging ? 'Drop here' : 'Drag files here'}
                {!isEnabled && <p>(Disabled)</p>}
            </div>
        </div>
    );
};
