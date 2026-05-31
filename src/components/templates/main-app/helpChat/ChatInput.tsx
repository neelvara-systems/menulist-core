'use client'

import { useDragAndDrop } from '@hook/useDragAndDrop';
import {
    ANSWERLATTICE_CHAT_IMAGE_ACCEPT,
    ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL,
    ANSWERLATTICE_CHAT_IMAGE_ALLOWED_MIME_TYPES,
    ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
    isAllowedAnswerlatticeChatImageMimeType,
    normalizeAnswerlatticeChatImageMimeType,
} from '@lib/answerlattice/chatImagePolicy';
import { UserUploadedFileType } from '@type/common';
import { getBase64 } from '@util/utils';
import { Button, Flex, Image, Input, message, Tag, theme, Tooltip, Typography, Upload } from 'antd';
import { RcFile } from 'antd/es/upload';
import { useEffect, useRef, useState } from 'react';
import { LuImage, LuMessageSquarePlus, LuSend, LuX } from 'react-icons/lu';
import { ChatMode } from './types';

const { TextArea } = Input;

const MAX_INPUT_LENGTH = 2000; // Character limit for input (industry standard for chat apps)

interface ChatInputProps {
    onSendMessage: (message: string, image?: UserUploadedFileType) => void;
    onInputChange?: (value: string) => void;
    onImageUpload?: (file: File) => void;
    placeholder?: string;
    mode: ChatMode;
    disabled?: boolean;
    sessionId?: string | null; // Used to detect session changes
    value?: string; // External control from parent (for clearing on New Chat)
    hasMessages?: boolean; // Whether conversation has started
    // QnA Post-Answer Actions
    showQnAActions?: boolean; // Show action buttons instead of input after first QnA answer
    onStartFollowUp?: () => void; // Switch to assistant mode with context
    onNewQuestion?: () => void; // Start new QnA session
    isMobile?: boolean;
}

const ChatInput = ({ onSendMessage, onInputChange, onImageUpload, placeholder, mode, disabled, sessionId, value, hasMessages = false, showQnAActions = false, onStartFollowUp, onNewQuestion, isMobile = false }: ChatInputProps) => {
    const { token } = theme.useToken();
    const [inputValue, setInputValue] = useState('');
    const [selectedImage, setSelectedImage] = useState<UserUploadedFileType | null>(null);
    const inputRef = useRef<any>(null);
    const hasShownLimitWarning = useRef(false);
    const previousValueRef = useRef<string | undefined>(value);

    // Generate draft key based on session
    const draftKey = `chat-draft-${sessionId || 'new'}`;
    const imageDraftKey = `chat-draft-image-${sessionId || 'new'}`;

    const validateImageFile = (file: File): { valid: boolean; error?: string } => {
        if (file.size > ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES) {
            return {
                valid: false,
                error: `Image size must be less than ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / (1024 * 1024)}MB`,
            };
        }

        if (!isAllowedAnswerlatticeChatImageMimeType(file.type)) {
            return {
                valid: false,
                error: `Only ${ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL} images are allowed`,
            };
        }

        return { valid: true };
    };

    // Drag & drop hook
    const { isDragging, dragHandlers } = useDragAndDrop({
        onFilesDrop: (files) => {
            if (files.length > 0) {
                handleImageUpload(files[0]);
            }
        },
        accept: [...ANSWERLATTICE_CHAT_IMAGE_ALLOWED_MIME_TYPES],
        maxFiles: 1,
        maxSize: ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES,
        disabled,
        validateFile: (file) => validateImageFile(file),
    });

    const handleSend = () => {
        // Require text input for accurate KB search (image is context, not query)
        if (inputValue.trim()) {
            onSendMessage(inputValue.trim(), selectedImage || undefined);
            setInputValue('');
            hasShownLimitWarning.current = false;
            // Clear selected image after sending (no URL revocation needed for base64)
            setSelectedImage(null);
            
            // Clear draft after sending
            try {
                localStorage.removeItem(draftKey);
                localStorage.removeItem(imageDraftKey);
            } catch (error) {
                console.warn('Failed to clear draft from localStorage:', error);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Submit on Ctrl+Enter (Windows/Linux) or Cmd+Enter (Mac)
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSend();
        }
        // Enter alone just creates new line (default textarea behavior)
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;

        // Show warning when at limit (only once)
        if (value.length >= MAX_INPUT_LENGTH && !hasShownLimitWarning.current) {
            message.warning(`Maximum ${MAX_INPUT_LENGTH} characters allowed`);
            hasShownLimitWarning.current = true;
        } else if (value.length < MAX_INPUT_LENGTH * 0.9) {
            // Reset flag when user deletes enough characters
            hasShownLimitWarning.current = false;
        }

        setInputValue(value);
        onInputChange?.(value);
    };

    const handleImageUpload = async (file: File): Promise<boolean> => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            message.error(validation.error || 'Unsupported image');
            return false;
        }

        // Convert to base64 (same pattern as ticket flow)
        const base64 = await getBase64(file as RcFile);
        const normalizedType = normalizeAnswerlatticeChatImageMimeType(file.type);
        setSelectedImage({
            url: base64,  // Base64 string for both preview and sending
            source: base64,  // Alias for backward compatibility
            name: file.name,
            size: file.size,
            type: normalizedType
        });
        onImageUpload?.(file);

        // Auto-focus input and suggest prompt after image upload
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);

        return false; // Prevent default upload behavior
    };

    const handleRemoveImage = () => {
        // No URL revocation needed for base64
        setSelectedImage(null);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        // Look for image in clipboard
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault(); // Prevent default paste behavior for images
                const file = items[i].getAsFile();
                if (file) {
                    // Use the same validation logic
                    handleImageUpload(file);
                }
                break;
            }
        }
        // If no image found, allow normal text paste
    };

    // Dynamic conversational placeholders based on mode and context
    // Image upload takes priority over passed placeholder
    const getPlaceholder = () => {
        // When image is selected, always show image-specific placeholder
        if (selectedImage) {
            return mode === 'qna'
                ? 'What would you like to know about this image?'
                : 'How can I help you with this image?';
        }

        // Use passed placeholder if provided
        if (placeholder) return placeholder;

        // Contextual placeholders based on mode and conversation state
        if (mode === 'qna') {
            return 'Ask a question...';
        } else {
            // Assistant mode - different placeholder for new vs existing conversation
            return hasMessages
                ? 'Continue the conversation...'
                : 'How can I assist you today?';
        }
    };

    // Clear image when session changes (new chat or switching conversations)
    useEffect(() => {
        // No URL revocation needed for base64
        setSelectedImage(null);
    }, [sessionId]);

    // Sync with parent's value prop (for clearing on New Chat)
    // Only clear when value transitions to empty (not on every keystroke)
    useEffect(() => {
        const previousValue = previousValueRef.current;
        
        // Only clear if value explicitly changed to empty string
        if (value === '' && previousValue !== '') {
            setInputValue('');
            setSelectedImage(null);
            // Clear drafts from localStorage
            localStorage.removeItem(draftKey);
            localStorage.removeItem(imageDraftKey);
        }
        
        // Update ref for next comparison
        previousValueRef.current = value;
    }, [value, draftKey, imageDraftKey]);

    // Load draft from localStorage when component mounts or session changes
    useEffect(() => {
        try {
            const savedDraft = localStorage.getItem(draftKey);
            const savedImage = localStorage.getItem(imageDraftKey);

            if (savedDraft) {
                setInputValue(savedDraft);
            }

            if (savedImage) {
                localStorage.removeItem(imageDraftKey);
            }
        } catch (error) {
            console.warn('Failed to load draft from localStorage:', error);
        }
        // Only load on mount or session change, NOT on value changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draftKey, imageDraftKey]);

    // Auto-save draft to localStorage when input changes
    useEffect(() => {
        try {
            if (inputValue.trim()) {
                localStorage.setItem(draftKey, inputValue);
            } else {
                localStorage.removeItem(draftKey);
            }
        } catch (error) {
            console.warn('Failed to save draft to localStorage:', error);
        }
    }, [inputValue, draftKey]);

    // Image screenshots can contain private customer data, so they are never
    // persisted as base64 drafts. Keep a cleanup path for legacy drafts.
    useEffect(() => {
        try {
            localStorage.removeItem(imageDraftKey);
        } catch {
            // Draft cleanup is best-effort only.
        }
    }, [selectedImage, imageDraftKey]);

    // QnA Post-Answer Actions View
    if (showQnAActions) {
        return (
            <div
                style={{
                    padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom))' : '12px 20px',
                    borderTop: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgContainer
                }}
            >
                <Flex vertical gap={8} align="center">
                    <Flex gap={10} style={{ maxWidth: 480, width: '100%' }}>
                        <Button
                            type="primary"
                            icon={<LuMessageSquarePlus size={16} />}
                            onClick={onStartFollowUp}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                height: isMobile ? 44 : 36,
                                fontSize: isMobile ? 14 : 13,
                                fontWeight: 500,
                                borderRadius: isMobile ? 10 : 8
                            }}
                        >
                            {isMobile ? 'Follow up' : 'Follow-up Question'}
                        </Button>
                        
                        <Button
                            icon={<LuSend size={16} />}
                            onClick={onNewQuestion}
                            style={{
                                flex: 1,
                                minWidth: 0,
                                height: isMobile ? 44 : 36,
                                fontSize: isMobile ? 14 : 13,
                                fontWeight: 500,
                                borderRadius: isMobile ? 10 : 8
                            }}
                        >
                            {isMobile ? 'New question' : 'New Question'}
                        </Button>
                    </Flex>
                    
                    <Typography.Text
                        type="secondary"
                        style={{
                            fontSize: isMobile ? 10 : 11,
                            textAlign: 'center',
                            lineHeight: '16px'
                        }}
                    >
                        Continue with context or start fresh
                    </Typography.Text>
                </Flex>
            </div>
        );
    }

    // Normal Input View
    return (
        <div
            {...dragHandlers}
            style={{
                padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom))' : '12px 16px',
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer
            }}
        >
            {/* Compact Image Preview - Inline like DeepSeek */}
            {selectedImage && (
                <div style={{ marginBottom: 8 }}>
                    <Flex
                        gap={8}
                        align="center"
                        style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            background: token.colorFillQuaternary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            width: isMobile ? '100%' : 'fit-content',
                            maxWidth: '100%'
                        }}
                    >
                        <Image
                            src={selectedImage.source}
                            alt="Upload preview"
                            preview={{
                                mask: <div style={{ fontSize: 11 }}>Preview</div>
                            }}
                            style={{
                                width: 32,
                                height: 32,
                                objectFit: 'cover',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        />
                        <span style={{ fontSize: 12, fontWeight: 500, color: token.colorText, maxWidth: isMobile ? 160 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedImage.name || 'Image'}
                        </span>
                        <span style={{ fontSize: 11, color: token.colorTextTertiary }}>
                            {selectedImage.size ? (selectedImage.size / 1024).toFixed(0) : '0'} KB
                        </span>
                        <Button
                            type="text"
                            icon={<LuX size={14} />}
                            onClick={handleRemoveImage}
                            size="small"
                            style={{
                                padding: 2,
                                height: isMobile ? 32 : 20,
                                width: isMobile ? 32 : 20,
                                minWidth: isMobile ? 32 : 20,
                                borderRadius: 4,
                                color: token.colorTextTertiary
                            }}
                        />
                    </Flex>
                </div>
            )}

            {/* Input Container with All Buttons Embedded */}
            <div style={{ position: 'relative' }}>
                <TextArea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    placeholder={getPlaceholder()}
                    autoSize={{ minRows: 1, maxRows: 4 }}
                    disabled={disabled}
                    maxLength={MAX_INPUT_LENGTH}
                    showCount={false}
                    aria-label="Type your message"
                    aria-describedby="chat-input-description"
                    style={{
                        width: '100%',
                        resize: 'none',
                        borderRadius: 24,
                        padding: isMobile ? '12px 128px 12px 14px' : '10px 130px 10px 16px',
                        fontSize: isMobile ? 16 : 14,
                        border: `1px solid ${isDragging ? token.colorPrimary : token.colorBorder}`,
                        background: isDragging ? token.colorPrimaryBg : token.colorBgElevated,
                        transition: 'all 0.2s ease'
                    }}
                />

                {/* Drag & Drop Overlay */}
                {isDragging && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: `${token.colorPrimary}10`,
                            border: `2px dashed ${token.colorPrimary}`,
                            borderRadius: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            pointerEvents: 'none',
                            zIndex: 10
                        }}
                    >
                        <Typography.Text style={{ color: token.colorPrimary, fontWeight: 600 }}>
                            Drop image here
                        </Typography.Text>
                    </div>
                )}

                {/* Character Counter - Show when near limit */}
                {inputValue.length >= MAX_INPUT_LENGTH - 10 && (
                    <Tag
                        color="error"
                        style={{
                            position: 'absolute',
                            right: 6,
                            top: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            margin: 0,
                            zIndex: 5
                        }}
                    >
                        {inputValue.length}/{MAX_INPUT_LENGTH}
                    </Tag>
                )}

                {/* Action Buttons Container - Right Side */}
                <div style={{
                    position: 'absolute',
                    right: 6,
                    bottom: isMobile ? 4 : 6,
                    display: 'flex',
                    gap: 4,
                    alignItems: 'center'
                }}>
                    <Tooltip title={`Upload ${ANSWERLATTICE_CHAT_IMAGE_ALLOWED_LABEL} image (max ${ANSWERLATTICE_CHAT_IMAGE_MAX_BYTES / (1024 * 1024)}MB)`}>
                        <Upload
                            accept={ANSWERLATTICE_CHAT_IMAGE_ACCEPT}
                            beforeUpload={handleImageUpload}
                            showUploadList={false}
                            disabled={disabled}
                            maxCount={1}
                        >
                            <Button
                                icon={<LuImage size={16} />}
                                disabled={disabled}
                                shape="circle"
                                type="text"
                                aria-label="Upload image"
                                style={{
                                    height: isMobile ? 44 : 32,
                                    width: isMobile ? 44 : 32,
                                    minWidth: isMobile ? 44 : 32,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    color: token.colorTextSecondary
                                }}
                            />
                        </Upload>
                    </Tooltip>

                    {/* Send Button - Embedded */}
                    <Tooltip title={selectedImage && !inputValue.trim()
                        ? 'Please describe what you need help with'
                        : `${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to send`
                    }>
                        <Button
                            type="primary"
                            shape="round"
                            icon={<LuSend size={16} />}
                            onClick={handleSend}
                            disabled={!inputValue.trim() || disabled}
                            aria-label="Send message to help assistant"
                            style={{
                                height: isMobile ? 44 : 32,
                                fontSize: isMobile ? 14 : 13,
                                fontWeight: 500,
                                paddingLeft: isMobile ? 10 : 12,
                                paddingRight: isMobile ? 10 : 12
                            }}
                        >
                            {isMobile ? 'Ask' : 'Ask a Question'}
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* Keyboard Shortcut Hint - Below input, subtle and compact */}
            {!isMobile && (
                <Flex justify="center" align="center" gap={3} style={{ marginTop: 4, opacity: 0.5 }}>
                    <Typography.Text type="secondary" style={{ fontSize: 10 }}>
                        {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter to send
                    </Typography.Text>
                </Flex>
            )}
        </div>
    );
};

export default ChatInput;
