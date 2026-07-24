'use client';

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import TiptapEditor from '@atoms/TiptapEditor';
import {
    assertChatSessionInternalNoteUpdateSucceeded,
    type AnswerlatticeChatSessionScope,
    updateSessionInternalNote,
} from '@database/chatSessions';
import { Button, Flex, message, Modal, Typography } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { LuClock, LuPencil, LuSave, LuStickyNote, LuUser } from 'react-icons/lu';

const { Text } = Typography;

interface TeamNoteModalProps {
    open: boolean;
    onClose: () => void;
    sessionId: string | null;
    scope: AnswerlatticeChatSessionScope;
    initialNote?: any; // TipTap JSON content
    noteMetadata?: {
        lastEditedBy?: string;
        lastEditedByName?: string;
        lastEditedAt?: Timestamp;
    };
    onSave?: (noteJson: any) => void; // Callback to update parent state
}

function TeamNoteModal({ open, onClose, sessionId, scope, initialNote, noteMetadata, onSave }: TeamNoteModalProps) {
    const [noteContent, setNoteContent] = useState<any>(null);
    const [savingNote, setSavingNote] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const saveOwnerRef = useRef(0);
    const saveInProgressRef = useRef(false);
    const activeContextKey = `${scope.tId}:${scope.sId}:${sessionId || ''}:${open ? 'open' : 'closed'}`;
    const activeContextKeyRef = useRef(activeContextKey);
    activeContextKeyRef.current = activeContextKey;

    // Initialize note content and editing mode when modal opens
    useEffect(() => {
        if (open) {
            // If note exists → Show in readonly mode
            // If no note → Show editor directly
            setIsEditing(!initialNote);

            if (initialNote) {
                // Use the TipTap JSON directly
                setNoteContent(initialNote);
            } else {
                // Empty note - start editing
                setNoteContent({
                    type: 'doc',
                    content: [{ type: 'paragraph' }]
                });
            }
        } else {
            // Reset state when modal closes
            setIsEditing(false);
            setNoteContent(null);
        }
    }, [open, initialNote]);

    const handleSaveNote = async () => {
        if (!sessionId || saveInProgressRef.current) return;

        saveInProgressRef.current = true;
        const actionOwner = ++saveOwnerRef.current;
        const expectedContextKey = activeContextKey;
        const expectedSessionId = sessionId;
        setSavingNote(true);
        try {
            const noteUpdateResult = await updateSessionInternalNote(expectedSessionId, noteContent, scope);
            assertChatSessionInternalNoteUpdateSucceeded(
                noteUpdateResult,
                expectedSessionId,
                'platform_chat_team_note_update_rejected',
            );
            if (
                saveOwnerRef.current !== actionOwner
                || activeContextKeyRef.current !== expectedContextKey
            ) return;

            // Update parent component's state
            if (onSave) {
                onSave(noteContent);
            }

            message.success('Your team note has been saved successfully');
            onClose();
        } catch {
            if (
                saveOwnerRef.current === actionOwner
                && activeContextKeyRef.current === expectedContextKey
            ) {
                message.error('Unable to save your note. Please check your connection and try again');
            }
        } finally {
            if (saveOwnerRef.current === actionOwner) {
                saveInProgressRef.current = false;
                setSavingNote(false);
            }
        }
    };

    const hasChanges = () => {
        // Compare TipTap JSON content
        return JSON.stringify(noteContent) !== JSON.stringify(initialNote);
    };

    return (
        <Modal
            title={
                <Flex gap={8} align="center">
                    <LuStickyNote size={18} />
                    <span>Internal Notes</span>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 'normal' }}>
                        (Private - only visible to admins and team members)
                    </Text>
                </Flex>
            }
            open={open}
            onCancel={() => {
                setIsEditing(false);
                onClose();
            }}
            footer={
                !isEditing && initialNote ? (
                    // Readonly mode - only Close button
                    <Button onClick={() => {
                        setIsEditing(false);
                        onClose();
                    }}>
                        Close
                    </Button>
                ) : (
                    // Edit mode - Save and Cancel buttons
                    <>
                        <Button onClick={() => {
                            if (initialNote) {
                                setIsEditing(false); // Go back to view mode if note exists
                            } else {
                                onClose(); // Close modal if new note
                            }
                        }}>
                            Cancel
                        </Button>
                        <Button
                            type="primary"
                            icon={<LuSave />}
                            onClick={handleSaveNote}
                            loading={savingNote}
                            disabled={!hasChanges()}
                        >
                            Save Note
                        </Button>
                    </>
                )
            }
            width={800}
            destroyOnHidden
        >
            <Flex vertical gap={12} style={{ paddingTop: 16 }}>
                {!isEditing && initialNote ? (
                    /* Readonly View Mode */
                    <>
                        <Flex justify="space-between" align="center">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Internal note for this conversation
                            </Text>
                            <Button
                                icon={<LuPencil size={14} />}
                                onClick={() => setIsEditing(true)}
                                size="small"
                            >
                                Edit Note
                            </Button>
                        </Flex>

                        {/* Metadata - Last Edited Info */}
                        {noteMetadata && noteMetadata.lastEditedAt && (
                            <Flex gap={16} style={{ padding: '8px 12px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: 6 }}>
                                <Flex gap={6} align="center">
                                    <LuUser size={14} style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        {noteMetadata.lastEditedByName || 'Unknown User'}
                                    </Text>
                                </Flex>
                                <Flex gap={6} align="center">
                                    <LuClock size={14} style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        <DateTimeDisplay value={noteMetadata.lastEditedAt} mode="datetime" />
                                    </Text>
                                </Flex>
                            </Flex>
                        )}

                        {/* Readonly TipTap View */}
                        <div style={{ minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
                            <TiptapEditor
                                key={`readonly-${sessionId}-${open}`}
                                value={noteContent}
                                onChange={() => { }}
                                isEditable={false}
                                editorBoxHeight={450}
                                hideCharactersCount={true}
                            />
                        </div>
                    </>
                ) : (
                    /* Edit Mode */
                    <>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                            {initialNote ? 'Edit your internal note' : 'Add private notes about this conversation'}. These notes are only visible to admins and team members.
                        </Text>

                        {/* Editable TipTap Editor */}
                        <div style={{ minHeight: 400 }}>
                            <TiptapEditor
                                key={`editable-${sessionId}-${isEditing}`}
                                value={noteContent}
                                onChange={setNoteContent}
                                placeholder="e.g., Customer mentioned pricing concerns, follow up needed, escalate to product team..."
                                isEditable={true}
                                editorBoxHeight={380}

                            />
                        </div>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                            💡 <strong>Tip:</strong> Use <strong>bold</strong>, <em>italic</em>, lists, and links to format your notes.
                        </Text>
                    </>
                )}
            </Flex>
        </Modal>
    );
}

export default TeamNoteModal;
