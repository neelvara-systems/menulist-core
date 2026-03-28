'use client';

import { ADMIN_PRIORITY_OPTIONS, ADMIN_STATUS_OPTIONS, ADMIN_TAG_OPTIONS, ChatSession } from '@type/chatSession';
import { Button, Flex, Select, Space, Typography } from 'antd';
import { useState } from 'react';

const { Text } = Typography;

interface AdminMetadataPopoverProps {
    session: ChatSession;
    onSave: (updates: Partial<ChatSession>) => Promise<void>;
    onClose?: () => void;
}

function AdminMetadataPopover({ session, onSave, onClose }: AdminMetadataPopoverProps) {
    // Local state for editing (not saved until "Save" clicked)
    const [status, setStatus] = useState<ChatSession['adminStatus']>(session.adminStatus);
    const [priority, setPriority] = useState<ChatSession['priority']>(session.priority);
    const [tags, setTags] = useState<string[]>(session.adminTags || []);
    const [saving, setSaving] = useState(false);

    // Check if any changes were made
    const hasChanges =
        status !== session.adminStatus ||
        priority !== session.priority ||
        JSON.stringify(tags) !== JSON.stringify(session.adminTags || []);

    const handleSave = async () => {
        if (!hasChanges) {
            onClose?.();
            return;
        }

        setSaving(true);
        try {
            // Single database call with all updates
            await onSave({
                adminStatus: status,
                priority,
                adminTags: tags.length > 0 ? tags : undefined
            });
        } catch (error) {
        } finally {
            setSaving(false);
            // Close popover after setting loading to false
            onClose?.();
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setStatus(session.adminStatus);
        setPriority(session.priority);
        setTags(session.adminTags || []);
        onClose?.();
    };

    return (
        <Space direction="vertical" size={12} style={{ width: 320, maxWidth: '100%' }}>
            <div style={{ width: '100%', overflow: 'hidden' }}>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                    Organize Conversation
                </Text>
                <Text style={{
                    fontSize: 12,
                    lineHeight: 1.6,
                    wordBreak: 'break-word',
                    whiteSpace: 'normal',
                    overflowWrap: 'break-word'
                }}>
                    Track progress with <strong>Status</strong>, set urgency with <strong>Priority</strong>, and categorize with <strong>Tags</strong>.
                    Use these to filter conversations and collaborate with your team.
                </Text>
            </div>

            {/* Status */}
            <div>
                <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                    STATUS
                </Text>
                <Select
                    style={{ width: '100%' }}
                    size="small"
                    value={status || undefined}
                    placeholder="Set status"
                    onChange={setStatus}
                    options={ADMIN_STATUS_OPTIONS as any}
                    allowClear
                    onClear={() => setStatus(undefined)}
                />
            </div>

            {/* Priority */}
            <div>
                <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                    PRIORITY
                </Text>
                <Select
                    style={{ width: '100%' }}
                    size="small"
                    value={priority || undefined}
                    placeholder="Set priority"
                    onChange={setPriority}
                    options={ADMIN_PRIORITY_OPTIONS as any}
                    allowClear
                    onClear={() => setPriority(undefined)}
                />
            </div>

            {/* Tags */}
            <div>
                <Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 8 }}>
                    TAGS
                </Text>
                <Select
                    mode="multiple"
                    style={{ width: '100%' }}
                    size="small"
                    value={tags}
                    placeholder="Add tags"
                    onChange={setTags}
                    options={ADMIN_TAG_OPTIONS.map(tag => ({ label: tag, value: tag }))}
                    maxTagCount="responsive"
                />
            </div>

            {/* Actions */}
            <Flex gap={8} style={{ marginTop: 8 }}>
                <Button
                    size="small"
                    onClick={handleCancel}
                    block
                    disabled={saving}
                >
                    Cancel
                </Button>
                <Button
                    type="primary"
                    size="small"
                    onClick={handleSave}
                    loading={saving}
                    disabled={!hasChanges}
                    block
                >
                    {hasChanges ? 'Save Changes' : 'No Changes'}
                </Button>
            </Flex>
        </Space>
    );
}

export default AdminMetadataPopover;
